/**
 * Sound Engine - Pure Web Audio API
 * 
 * Features:
 * - Polyphonic playback (multiple simultaneous notes)
 * - Electric Piano sound (Sine + Triangle oscillators)
 * - ADSR envelope
 * - Master gain and limiter
 * - Zero external dependencies
 * 
 * @author Web Audio API Expert
 * @version 1.0.0
 */

export class SoundEngine {
    /**
     * @private
     */
    #audioContext = null;
    #masterGain = null;
    #limiter = null;
    #activeVoices = new Map();
    #isInitialized = false;

    /**
     * ADSR Envelope settings
     * @private
     */
    #envelope = {
        attack: 0.01,   // 10ms - fast attack for piano
        decay: 0.2,     // 200ms - decay to sustain
        sustain: 0.3,   // 30% of peak volume
        release: 0.8    // 800ms - long release for piano
    };

    /**
     * Oscillator mix (Electric Piano character)
     * @private
     */
    #oscillatorMix = {
        sine: 0.7,      // 70% sine wave (fundamental)
        triangle: 0.3   // 30% triangle (harmonics)
    };

    /**
     * Initialize audio context and master chain
     * Must be called after user interaction
     */
    async initialize() {
        if (this.#isInitialized) {
            console.warn('SoundEngine already initialized');
            return;
        }

        try {
            // Create audio context
            this.#audioContext = new (window.AudioContext || window.webkitAudioContext)({
                latencyHint: 'interactive',
                sampleRate: 44100
            });

            // Create master gain (volume control)
            this.#masterGain = this.#audioContext.createGain();
            this.#masterGain.gain.value = 0.5; // 50% master volume

            // Create limiter (prevent clipping)
            this.#limiter = this.#audioContext.createDynamicsCompressor();
            this.#limiter.threshold.value = -10;  // Start compressing at -10dB
            this.#limiter.knee.value = 10;        // Smooth compression curve
            this.#limiter.ratio.value = 20;       // Heavy compression (acts as limiter)
            this.#limiter.attack.value = 0.003;   // Fast attack
            this.#limiter.release.value = 0.1;    // Quick release

            // Connect master chain: masterGain → limiter → destination
            this.#masterGain.connect(this.#limiter);
            this.#limiter.connect(this.#audioContext.destination);

            this.#isInitialized = true;
            console.log('✅ SoundEngine initialized');
            console.log(`   Sample rate: ${this.#audioContext.sampleRate}Hz`);
            console.log(`   Latency: ${this.#audioContext.baseLatency}s`);
        } catch (error) {
            console.error('Failed to initialize SoundEngine:', error);
            throw error;
        }
    }

    /**
     * Play multiple notes (chord)
     * @param {number[]} midiNotes Array of MIDI note numbers
     * @param {number} duration Duration in seconds (optional, for auto-release)
     */
    playNotes(midiNotes, duration = null) {
        if (!this.#isInitialized) {
            console.warn('SoundEngine not initialized. Call initialize() first.');
            return;
        }

        // Resume audio context if suspended (browser autoplay policy)
        if (this.#audioContext.state === 'suspended') {
            this.#audioContext.resume();
        }

        const now = this.#audioContext.currentTime;

        midiNotes.forEach(midiNote => {
            // Stop existing voice for this note (if any)
            this.#stopVoice(midiNote);

            // Create new voice
            const voice = this.#createVoice(midiNote, now);

            // Store voice
            this.#activeVoices.set(midiNote, voice);

            // Auto-release if duration specified
            if (duration !== null && duration > 0) {
                setTimeout(() => {
                    this.stopNote(midiNote);
                }, duration * 1000);
            }
        });
    }

    /**
     * Stop a specific note
     * @param {number} midiNote MIDI note number
     */
    stopNote(midiNote) {
        if (!this.#isInitialized) return;

        const voice = this.#activeVoices.get(midiNote);
        if (!voice) return;

        const now = this.#audioContext.currentTime;

        // Apply release envelope
        voice.gainNode.gain.cancelScheduledValues(now);
        voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, now);
        voice.gainNode.gain.exponentialRampToValueAtTime(0.001, now + this.#envelope.release);

        // Stop oscillators after release
        setTimeout(() => {
            this.#stopVoice(midiNote);
        }, this.#envelope.release * 1000 + 100);
    }

    /**
     * Stop all notes immediately
     */
    stopAll() {
        if (!this.#isInitialized) return;

        const now = this.#audioContext.currentTime;

        // Apply quick release to all active voices
        this.#activeVoices.forEach((voice, midiNote) => {
            voice.gainNode.gain.cancelScheduledValues(now);
            voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, now);
            voice.gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        });

        // Clean up after 100ms
        setTimeout(() => {
            this.#activeVoices.forEach((voice, midiNote) => {
                this.#stopVoice(midiNote);
            });
        }, 100);
    }

    /**
     * Create a voice (oscillators + envelope)
     * @private
     */
    #createVoice(midiNote, startTime) {
        const frequency = this.#midiToFrequency(midiNote);

        // Create oscillators
        const sineOsc = this.#audioContext.createOscillator();
        sineOsc.type = 'sine';
        sineOsc.frequency.value = frequency;

        const triangleOsc = this.#audioContext.createOscillator();
        triangleOsc.type = 'triangle';
        triangleOsc.frequency.value = frequency;

        // Create gain nodes for mixing
        const sineGain = this.#audioContext.createGain();
        sineGain.gain.value = this.#oscillatorMix.sine;

        const triangleGain = this.#audioContext.createGain();
        triangleGain.gain.value = this.#oscillatorMix.triangle;

        // Create envelope gain node
        const envelopeGain = this.#audioContext.createGain();
        envelopeGain.gain.value = 0;

        // Connect oscillators to mixer
        sineOsc.connect(sineGain);
        triangleOsc.connect(triangleGain);

        sineGain.connect(envelopeGain);
        triangleGain.connect(envelopeGain);

        // Connect to master
        envelopeGain.connect(this.#masterGain);

        // Apply ADSR envelope
        const peakLevel = 0.3; // Peak volume per voice (prevents clipping)
        const sustainLevel = peakLevel * this.#envelope.sustain;

        envelopeGain.gain.setValueAtTime(0, startTime);
        envelopeGain.gain.linearRampToValueAtTime(peakLevel, startTime + this.#envelope.attack);
        envelopeGain.gain.exponentialRampToValueAtTime(
            Math.max(sustainLevel, 0.001),
            startTime + this.#envelope.attack + this.#envelope.decay
        );

        // Start oscillators
        sineOsc.start(startTime);
        triangleOsc.start(startTime);

        return {
            sineOsc,
            triangleOsc,
            sineGain,
            triangleGain,
            gainNode: envelopeGain,
            frequency
        };
    }

    /**
     * Stop and clean up a voice
     * @private
     */
    #stopVoice(midiNote) {
        const voice = this.#activeVoices.get(midiNote);
        if (!voice) return;

        try {
            // Stop oscillators
            voice.sineOsc.stop();
            voice.triangleOsc.stop();

            // Disconnect nodes
            voice.sineOsc.disconnect();
            voice.triangleOsc.disconnect();
            voice.sineGain.disconnect();
            voice.triangleGain.disconnect();
            voice.gainNode.disconnect();
        } catch (error) {
            // Ignore errors (oscillator might already be stopped)
        }

        // Remove from active voices
        this.#activeVoices.delete(midiNote);
    }

    /**
     * Convert MIDI note to frequency
     * @private
     */
    #midiToFrequency(midiNote) {
        // A4 (MIDI 69) = 440 Hz
        return 440 * Math.pow(2, (midiNote - 69) / 12);
    }

    /**
     * Set master volume
     * @param {number} volume Volume (0.0 to 1.0)
     */
    setVolume(volume) {
        if (!this.#isInitialized) return;

        const clampedVolume = Math.max(0, Math.min(1, volume));
        const now = this.#audioContext.currentTime;

        this.#masterGain.gain.cancelScheduledValues(now);
        this.#masterGain.gain.setValueAtTime(this.#masterGain.gain.value, now);
        this.#masterGain.gain.linearRampToValueAtTime(clampedVolume, now + 0.05);
    }

    /**
     * Get current volume
     * @returns {number} Current volume (0.0 to 1.0)
     */
    getVolume() {
        if (!this.#isInitialized) return 0;
        return this.#masterGain.gain.value;
    }

    /**
     * Set ADSR envelope
     * @param {Object} envelope Envelope settings
     */
    setEnvelope(envelope) {
        this.#envelope = {
            ...this.#envelope,
            ...envelope
        };
    }

    /**
     * Get ADSR envelope
     * @returns {Object} Current envelope settings
     */
    getEnvelope() {
        return { ...this.#envelope };
    }

    /**
     * Get number of active voices
     * @returns {number} Number of currently playing notes
     */
    getActiveVoiceCount() {
        return this.#activeVoices.size;
    }

    /**
     * Check if initialized
     * @returns {boolean} True if initialized
     */
    isInitialized() {
        return this.#isInitialized;
    }

    /**
     * Get audio context state
     * @returns {string} Audio context state
     */
    getState() {
        if (!this.#audioContext) return 'closed';
        return this.#audioContext.state;
    }

    /**
     * Resume audio context (for autoplay policy)
     */
    async resume() {
        if (!this.#audioContext) return;

        if (this.#audioContext.state === 'suspended') {
            await this.#audioContext.resume();
            console.log('✅ Audio context resumed');
        }
    }

    /**
     * Dispose and clean up
     */
    dispose() {
        if (!this.#isInitialized) return;

        // Stop all voices
        this.stopAll();

        // Close audio context
        if (this.#audioContext) {
            this.#audioContext.close();
            this.#audioContext = null;
        }

        this.#masterGain = null;
        this.#limiter = null;
        this.#activeVoices.clear();
        this.#isInitialized = false;

        console.log('✅ SoundEngine disposed');
    }
}

/**
 * Usage Example:
 * 
 * const soundEngine = new SoundEngine();
 * 
 * // Initialize (after user interaction)
 * await soundEngine.initialize();
 * 
 * // Play a chord (C Major: C4, E4, G4)
 * soundEngine.playNotes([60, 64, 67]);
 * 
 * // Stop a specific note
 * soundEngine.stopNote(60);
 * 
 * // Stop all notes
 * soundEngine.stopAll();
 * 
 * // Adjust volume
 * soundEngine.setVolume(0.7);
 * 
 * // Cleanup
 * soundEngine.dispose();
 */
