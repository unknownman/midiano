/**
 * MidiInputManager - Robust MIDI Input Handler with Stability Buffer
 * 
 * Features:
 * - Tracks active notes (NoteOn/NoteOff)
 * - Stability buffer (debounce) to prevent partial chord detection
 * - Event-driven architecture
 * - Memory leak prevention
 * - Privacy-first (all data local)
 * 
 * @author Senior Audio Engineer
 * @version 1.0.0
 */

export class MidiInputManager {
    /**
     * @private
     * @type {Set<number>} Currently active MIDI notes
     */
    #activeNotes = new Set();

    /**
     * @private
     * @type {Set<number>} Stable notes (after debounce)
     */
    #stableNotes = new Set();

    /**
     * @private
     * @type {number|null} Debounce timer ID
     */
    #debounceTimer = null;

    /**
     * @private
     * @type {number} Debounce delay in milliseconds
     */
    #debounceDelay = 40; // 40ms sweet spot for chord detection

    /**
     * @private
     * @type {Map<string, Function>} Event listeners
     */
    #eventListeners = new Map();

    /**
     * @private
     * @type {MIDIInput|null} Active MIDI input device
     */
    #midiInput = null;

    /**
     * @private
     * @type {MIDIAccess|null} WebMIDI access object
     */
    #midiAccess = null;

    /**
     * @private
     * @type {boolean} Connection state
     */
    #isConnected = false;

    /**
     * @private
     * @type {Map<number, number>} Note velocities
     */
    #noteVelocities = new Map();

    /**
     * Initialize MIDI Input Manager
     * @param {Object} options Configuration options
     * @param {number} options.debounceDelay Stability buffer delay (ms)
     */
    constructor(options = {}) {
        this.#debounceDelay = options.debounceDelay || 40;
    }

    /**
     * Initialize WebMIDI API and connect to first available device
     * @returns {Promise<boolean>} Success status
     */
    async initialize() {
        if (!navigator.requestMIDIAccess) {
            throw new Error('WebMIDI API not supported in this browser');
        }

        try {
            this.#midiAccess = await navigator.requestMIDIAccess();

            // Listen for device connections/disconnections
            this.#midiAccess.onstatechange = this.#handleStateChange.bind(this);

            // Auto-connect to first available input
            const inputs = Array.from(this.#midiAccess.inputs.values());
            if (inputs.length > 0) {
                await this.connect(inputs[0].id);
                return true;
            }

            return false;
        } catch (error) {
            console.error('MIDI initialization failed:', error);
            throw error;
        }
    }

    /**
     * Connect to a specific MIDI input device
     * @param {string} deviceId MIDI device ID
     * @returns {Promise<void>}
     */
    async connect(deviceId) {
        // Disconnect existing input
        if (this.#midiInput) {
            this.disconnect();
        }

        const input = this.#midiAccess.inputs.get(deviceId);
        if (!input) {
            throw new Error(`MIDI device not found: ${deviceId}`);
        }

        this.#midiInput = input;
        this.#midiInput.onmidimessage = this.#handleMidiMessage.bind(this);
        this.#isConnected = true;

        this.#emit('connected', { deviceId, deviceName: input.name });
    }

    /**
     * Disconnect from current MIDI device
     */
    disconnect() {
        if (this.#midiInput) {
            this.#midiInput.onmidimessage = null;
            this.#midiInput = null;
        }

        this.#isConnected = false;
        this.#activeNotes.clear();
        this.#stableNotes.clear();
        this.#noteVelocities.clear();
        this.#clearDebounceTimer();

        this.#emit('disconnected');
    }

    /**
     * Handle MIDI message events
     * @private
     * @param {MIDIMessageEvent} event MIDI message event
     */
    #handleMidiMessage(event) {
        const [command, note, velocity] = event.data;
        const messageType = command & 0xf0;

        // Note On (velocity > 0)
        if (messageType === 0x90 && velocity > 0) {
            this.#handleNoteOn(note, velocity, event.timeStamp);
        }
        // Note Off (or Note On with velocity 0)
        else if (messageType === 0x80 || (messageType === 0x90 && velocity === 0)) {
            this.#handleNoteOff(note, event.timeStamp);
        }
        // Control Change (optional, for future use)
        else if (messageType === 0xb0) {
            this.#emit('controlChange', { controller: note, value: velocity });
        }
    }

    /**
     * Handle Note On event
     * @private
     * @param {number} note MIDI note number
     * @param {number} velocity Note velocity (0-127)
     * @param {number} timestamp Event timestamp
     */
    #handleNoteOn(note, velocity, timestamp) {
        // Add to active notes
        this.#activeNotes.add(note);
        this.#noteVelocities.set(note, velocity);

        // Emit immediate note event
        this.#emit('noteOn', { note, velocity, timestamp });

        // Trigger stability check
        this.#triggerStabilityCheck();
    }

    /**
     * Handle Note Off event
     * @private
     * @param {number} note MIDI note number
     * @param {number} timestamp Event timestamp
     */
    #handleNoteOff(note, timestamp) {
        // Remove from active notes
        this.#activeNotes.delete(note);
        this.#noteVelocities.delete(note);

        // Emit immediate note event
        this.#emit('noteOff', { note, timestamp });

        // Trigger stability check
        this.#triggerStabilityCheck();
    }

    /**
     * Trigger stability check with debounce
     * @private
     */
    #triggerStabilityCheck() {
        // Clear existing timer
        this.#clearDebounceTimer();

        // Set new timer
        this.#debounceTimer = setTimeout(() => {
            this.#checkStability();
        }, this.#debounceDelay);
    }

    /**
     * Check if notes are stable and emit chord detection
     * @private
     */
    #checkStability() {
        const currentNotes = new Set(this.#activeNotes);

        // Check if notes have changed
        const notesChanged = !this.#setsEqual(currentNotes, this.#stableNotes);

        if (notesChanged) {
            this.#stableNotes = currentNotes;

            // Emit stable notes event
            if (this.#stableNotes.size > 0) {
                const notes = Array.from(this.#stableNotes);
                const velocities = notes.map(note => this.#noteVelocities.get(note));

                this.#emit('stableNotes', {
                    notes,
                    velocities,
                    timestamp: performance.now()
                });

                // Emit chord detection event (if 2+ notes)
                if (notes.length >= 2) {
                    this.#emit('chordDetected', {
                        notes,
                        velocities,
                        timestamp: performance.now()
                    });
                }
            } else {
                // All notes released
                this.#emit('notesCleared');
            }
        }
    }

    /**
     * Clear debounce timer
     * @private
     */
    #clearDebounceTimer() {
        if (this.#debounceTimer !== null) {
            clearTimeout(this.#debounceTimer);
            this.#debounceTimer = null;
        }
    }

    /**
     * Check if two sets are equal
     * @private
     * @param {Set} setA First set
     * @param {Set} setB Second set
     * @returns {boolean} True if sets are equal
     */
    #setsEqual(setA, setB) {
        if (setA.size !== setB.size) return false;
        for (const item of setA) {
            if (!setB.has(item)) return false;
        }
        return true;
    }

    /**
     * Handle MIDI device state changes
     * @private
     * @param {MIDIConnectionEvent} event State change event
     */
    #handleStateChange(event) {
        const port = event.port;

        if (port.type === 'input') {
            if (port.state === 'connected') {
                this.#emit('deviceConnected', {
                    id: port.id,
                    name: port.name,
                    manufacturer: port.manufacturer
                });
            } else if (port.state === 'disconnected') {
                this.#emit('deviceDisconnected', {
                    id: port.id,
                    name: port.name
                });

                // If current device disconnected, clean up
                if (this.#midiInput && this.#midiInput.id === port.id) {
                    this.disconnect();
                }
            }
        }
    }

    /**
     * Register event listener
     * @param {string} event Event name
     * @param {Function} callback Callback function
     */
    on(event, callback) {
        if (!this.#eventListeners.has(event)) {
            this.#eventListeners.set(event, []);
        }
        this.#eventListeners.get(event).push(callback);
    }

    /**
     * Unregister event listener
     * @param {string} event Event name
     * @param {Function} callback Callback function
     */
    off(event, callback) {
        if (!this.#eventListeners.has(event)) return;

        const listeners = this.#eventListeners.get(event);
        const index = listeners.indexOf(callback);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    }

    /**
     * Emit event to all registered listeners
     * @private
     * @param {string} event Event name
     * @param {*} data Event data
     */
    #emit(event, data) {
        if (!this.#eventListeners.has(event)) return;

        const listeners = this.#eventListeners.get(event);
        listeners.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in ${event} listener:`, error);
            }
        });
    }

    /**
     * Get currently active notes (real-time)
     * @returns {number[]} Array of active MIDI note numbers
     */
    getActiveNotes() {
        return Array.from(this.#activeNotes);
    }

    /**
     * Get stable notes (after debounce)
     * @returns {number[]} Array of stable MIDI note numbers
     */
    getStableNotes() {
        return Array.from(this.#stableNotes);
    }

    /**
     * Get velocity for a specific note
     * @param {number} note MIDI note number
     * @returns {number|null} Velocity (0-127) or null if note not active
     */
    getNoteVelocity(note) {
        return this.#noteVelocities.get(note) || null;
    }

    /**
     * Get all available MIDI input devices
     * @returns {Array<Object>} Array of device info objects
     */
    getAvailableDevices() {
        if (!this.#midiAccess) return [];

        return Array.from(this.#midiAccess.inputs.values()).map(input => ({
            id: input.id,
            name: input.name,
            manufacturer: input.manufacturer,
            state: input.state,
            connection: input.connection
        }));
    }

    /**
     * Check if MIDI is connected
     * @returns {boolean} Connection status
     */
    isConnected() {
        return this.#isConnected;
    }

    /**
     * Get current debounce delay
     * @returns {number} Delay in milliseconds
     */
    getDebounceDelay() {
        return this.#debounceDelay;
    }

    /**
     * Set debounce delay
     * @param {number} delay Delay in milliseconds (10-100 recommended)
     */
    setDebounceDelay(delay) {
        if (delay < 10 || delay > 100) {
            console.warn('Debounce delay should be between 10-100ms');
        }
        this.#debounceDelay = delay;
    }

    /**
     * Clean up and dispose of all resources
     */
    dispose() {
        this.disconnect();
        this.#eventListeners.clear();

        if (this.#midiAccess) {
            this.#midiAccess.onstatechange = null;
            this.#midiAccess = null;
        }
    }
}

/**
 * Generic chord detection interface (mock for now)
 * @param {number[]} notes Array of MIDI note numbers
 * @returns {Object|null} Detected chord or null
 */
export function detectChord(notes) {
    // This will be replaced with actual chord detection logic
    // For now, return a mock result
    if (notes.length < 2) return null;

    return {
        notes,
        name: 'Mock Chord',
        type: 'major',
        root: notes[0],
        confidence: 1.0
    };
}
