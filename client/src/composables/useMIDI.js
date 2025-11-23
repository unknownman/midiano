/**
 * Frontend Engineer: useMIDI Composable
 * Handles WebMIDI connection, device listing, and note event streaming
 * Provides reactive state for UI components
 */

import { ref, computed, onUnmounted } from 'vue';

// Connection states
export const MIDIState = {
  DISCONNECTED: 'disconnected',
  REQUESTING_PERMISSION: 'requesting_permission',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  LISTENING: 'listening',
  ERROR: 'error'
};

export function useMIDI() {
  // Reactive state
  const state = ref(MIDIState.DISCONNECTED);
  const midiAccess = ref(null);
  const activeInput = ref(null);
  const availableDevices = ref([]);
  const selectedDevice = ref('');
  const activeNotes = ref(new Set());
  const latencyMs = ref(0);
  const errorMessage = ref('');
  
  // Event listeners
  const noteChangeListeners = new Set();
  
  // Computed properties
  const midiConnected = computed(() => state.value === MIDIState.CONNECTED || state.value === MIDIState.LISTENING);
  const connecting = computed(() => state.value === MIDIState.REQUESTING_PERMISSION || state.value === MIDIState.CONNECTING);
  
  const connectionMessage = computed(() => {
    switch (state.value) {
      case MIDIState.DISCONNECTED:
        return 'MIDI not connected';
      case MIDIState.REQUESTING_PERMISSION:
        return 'Requesting MIDI access...';
      case MIDIState.CONNECTING:
        return 'Connecting to device...';
      case MIDIState.CONNECTED:
        return `Connected to ${selectedDevice.value}`;
      case MIDIState.LISTENING:
        return `Listening (latency: ${latencyMs.value}ms)`;
      case MIDIState.ERROR:
        return `Error: ${errorMessage.value}`;
      default:
        return 'Unknown state';
    }
  });

  /**
   * Initialize WebMIDI API
   */
  async function initWebMIDI() {
    if (!navigator.requestMIDIAccess) {
      state.value = MIDIState.ERROR;
      errorMessage.value = 'WebMIDI not supported. Use Chrome/Edge or enable WebSocket fallback.';
      return false;
    }

    try {
      state.value = MIDIState.REQUESTING_PERMISSION;
      midiAccess.value = await navigator.requestMIDIAccess({ sysex: false });
      
      // List available devices
      updateDeviceList();
      
      // Listen for device changes (hot-plug)
      midiAccess.value.onstatechange = updateDeviceList;
      
      // Auto-connect to first available device
      if (availableDevices.value.length > 0) {
        await connectToDevice(availableDevices.value[0]);
      } else {
        state.value = MIDIState.DISCONNECTED;
      }
      
      return true;
    } catch (error) {
      state.value = MIDIState.ERROR;
      errorMessage.value = error.message;
      console.error('WebMIDI initialization failed:', error);
      return false;
    }
  }

  /**
   * Update list of available MIDI devices
   */
  function updateDeviceList() {
    if (!midiAccess.value) return;
    
    const inputs = Array.from(midiAccess.value.inputs.values());
    availableDevices.value = inputs.map(input => input.name);
  }

  /**
   * Connect to specific MIDI device
   */
  async function connectToDevice(deviceName) {
    if (!midiAccess.value) {
      await initWebMIDI();
    }
    
    state.value = MIDIState.CONNECTING;
    
    // Find device by name
    const inputs = Array.from(midiAccess.value.inputs.values());
    const input = inputs.find(i => i.name === deviceName);
    
    if (!input) {
      state.value = MIDIState.ERROR;
      errorMessage.value = `Device "${deviceName}" not found`;
      return false;
    }
    
    // Disconnect previous device
    if (activeInput.value) {
      activeInput.value.onmidimessage = null;
    }
    
    // Connect to new device
    activeInput.value = input;
    selectedDevice.value = deviceName;
    input.onmidimessage = handleMIDIMessage;
    
    state.value = MIDIState.CONNECTED;
    return true;
  }

  /**
   * Handle incoming MIDI messages
   * @param {MIDIMessageEvent} event
   */
  function handleMIDIMessage(event) {
    const [command, note, velocity] = event.data;
    const timestamp = event.timeStamp || performance.now();
    
    // Calculate latency (time from MIDI event to processing)
    const processingStart = performance.now();
    
    // Parse MIDI command
    const messageType = command & 0xf0;
    const channel = command & 0x0f;
    
    switch (messageType) {
      case 0x90: // Note On
        if (velocity > 0) {
          activeNotes.value.add(note);
          state.value = MIDIState.LISTENING;
          notifyListeners(Array.from(activeNotes.value));
        } else {
          // Note On with velocity 0 = Note Off
          activeNotes.value.delete(note);
          notifyListeners(Array.from(activeNotes.value));
        }
        break;
        
      case 0x80: // Note Off
        activeNotes.value.delete(note);
        notifyListeners(Array.from(activeNotes.value));
        break;
        
      case 0xb0: // Control Change (sustain pedal, etc.)
        // Handle CC events if needed
        break;
    }
    
    // Update latency metric
    const processingEnd = performance.now();
    latencyMs.value = Math.round(processingEnd - processingStart);
  }

  /**
   * Notify all registered listeners of note changes
   */
  function notifyListeners(notes) {
    noteChangeListeners.forEach(callback => {
      try {
        callback(notes);
      } catch (error) {
        console.error('Error in note change listener:', error);
      }
    });
  }

  /**
   * Register callback for note changes
   */
  function onNotesChange(callback) {
    noteChangeListeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      noteChangeListeners.delete(callback);
    };
  }

  /**
   * Manual connect trigger
   */
  async function connectMIDI() {
    return await initWebMIDI();
  }

  /**
   * Disconnect from MIDI
   */
  function disconnect() {
    if (activeInput.value) {
      activeInput.value.onmidimessage = null;
      activeInput.value = null;
    }
    activeNotes.value.clear();
    selectedDevice.value = '';
    state.value = MIDIState.DISCONNECTED;
  }

  // Cleanup on component unmount
  onUnmounted(() => {
    disconnect();
    noteChangeListeners.clear();
  });

  return {
    // State
    state,
    midiConnected,
    connecting,
    connectionMessage,
    availableDevices,
    selectedDevice,
    activeNotes: computed(() => Array.from(activeNotes.value)),
    latencyMs,
    errorMessage,
    
    // Methods
    connectMIDI,
    connectToDevice,
    disconnect,
    onNotesChange
  };
}

/**
 * INTEGRATION NOTES:
 * 
 * 1. WebAudio Integration:
 *    - Use Tone.js for audio feedback
 *    - Create PolySynth in AudioContext with low latency
 *    - Example: const synth = new Tone.PolySynth().toDestination();
 *    - On note events: synth.triggerAttack/Release(Tone.Frequency(note, "midi"))
 * 
 * 2. WebWorker Usage (for heavy processing):
 *    - Move chord detection to worker if >100 chords/sec
 *    - Worker receives: { type: 'detect', notes: [60, 64, 67] }
 *    - Worker returns: { type: 'result', chord: {...} }
 *    - Use Comlink library for easier worker communication
 * 
 * 3. Latency Optimization:
 *    - Target: <30ms for WebMIDI direct, <100ms for WebSocket
 *    - Use requestAnimationFrame for UI updates (60fps)
 *    - Batch note events if >10/sec to avoid UI thrashing
 *    - Use CSS transforms for animations (GPU accelerated)
 * 
 * 4. Fallback Strategy:
 *    - Check navigator.requestMIDIAccess availability
 *    - If unavailable, show WebSocket bridge option
 *    - Provide download link for Electron app (native MIDI)
 */
