# Audio/Signal Engineer: Low-Latency MIDI & Audio Input Processing

## Architecture Overview

```
┌─────────────────┐
│  MIDI Keyboard  │
└────────┬────────┘
         │
    ┌────▼─────┐
    │ WebMIDI  │ (Preferred: <10ms latency)
    │   API    │
    └────┬─────┘
         │
    ┌────▼──────────────────────────┐
    │  Main Thread (UI)             │
    │  - Receive MIDI events        │
    │  - Quick validation           │
    │  - Post to Worker             │
    └────┬──────────────────────────┘
         │
    ┌────▼──────────────────────────┐
    │  Web Worker (Chord Detection) │
    │  - Parse note arrays          │
    │  - Match chord patterns       │
    │  - Return result              │
    └────┬──────────────────────────┘
         │
    ┌────▼──────────────────────────┐
    │  Main Thread (Feedback)       │
    │  - Update UI (RAF)            │
    │  - Trigger audio feedback     │
    └───────────────────────────────┘

FALLBACK (No MIDI):
┌─────────────────┐
│  Microphone     │
└────────┬────────┘
         │
    ┌────▼─────┐
    │ WebAudio │
    │ Analyser │
    └────┬─────┘
         │
    ┌────▼──────────────────────────┐
    │  AudioWorklet / Worker        │
    │  - FFT / Autocorrelation      │
    │  - Pitch detection (YIN)      │
    │  - Note onset detection       │
    └────┬──────────────────────────┘
         │
    ┌────▼──────────────────────────┐
    │  Chord Detection Worker       │
    └───────────────────────────────┘
```

## Latency Budget (Target: <50ms total)

| Stage | Target | Notes |
|-------|--------|-------|
| MIDI Input → Browser | <10ms | Hardware + OS driver |
| WebMIDI Event → Handler | <5ms | Browser event loop |
| Validation + Worker Post | <5ms | Lightweight check |
| Worker Processing | <15ms | Chord detection algorithm |
| Worker → Main Thread | <5ms | postMessage overhead |
| UI Update (RAF) | <10ms | Single frame at 60fps |
| **TOTAL (MIDI)** | **<50ms** | Acceptable for practice |
| Audio Input (fallback) | +50-100ms | FFT + pitch detection |

## Implementation

### 1. MIDI Input (Preferred Path)

```javascript
// midi-processor.worker.js
import { detectChord } from './chordDetector.js';

self.onmessage = (e) => {
  const { type, notes, timestamp } = e.data;
  
  if (type === 'detect') {
    const startTime = performance.now();
    
    // Run chord detection
    const result = detectChord(notes);
    
    const processingTime = performance.now() - startTime;
    
    self.postMessage({
      type: 'result',
      chord: result,
      processingTimeMs: processingTime,
      timestamp
    });
  }
};
```

### 2. Audio Input Fallback (Microphone)

```javascript
// audio-pitch-detector.worklet.js
class PitchDetectorWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096; // ~93ms at 44.1kHz
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
    this.sampleRate = 44100;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    
    const samples = input[0];
    
    // Fill buffer
    for (let i = 0; i < samples.length; i++) {
      this.buffer[this.bufferIndex++] = samples[i];
      
      if (this.bufferIndex >= this.bufferSize) {
        // Buffer full, detect pitch
        const pitch = this.detectPitchYIN(this.buffer);
        
        if (pitch > 0) {
          const midiNote = this.frequencyToMIDI(pitch);
          this.port.postMessage({
            type: 'pitch',
            frequency: pitch,
            midiNote: midiNote,
            confidence: 0.8 // YIN confidence
          });
        }
        
        this.bufferIndex = 0;
      }
    }
    
    return true;
  }

  /**
   * YIN pitch detection algorithm
   * Fast autocorrelation-based method
   */
  detectPitchYIN(buffer) {
    const threshold = 0.1;
    const bufferSize = buffer.length;
    const halfSize = bufferSize / 2;
    const yinBuffer = new Float32Array(halfSize);
    
    // Step 1: Difference function
    yinBuffer[0] = 1;
    for (let tau = 1; tau < halfSize; tau++) {
      let sum = 0;
      for (let i = 0; i < halfSize; i++) {
        const delta = buffer[i] - buffer[i + tau];
        sum += delta * delta;
      }
      yinBuffer[tau] = sum;
    }
    
    // Step 2: Cumulative mean normalized difference
    let runningSum = 0;
    for (let tau = 1; tau < halfSize; tau++) {
      runningSum += yinBuffer[tau];
      yinBuffer[tau] *= tau / runningSum;
    }
    
    // Step 3: Absolute threshold
    let tau = 2;
    while (tau < halfSize) {
      if (yinBuffer[tau] < threshold) {
        while (tau + 1 < halfSize && yinBuffer[tau + 1] < yinBuffer[tau]) {
          tau++;
        }
        return this.sampleRate / tau;
      }
      tau++;
    }
    
    return -1; // No pitch detected
  }

  frequencyToMIDI(frequency) {
    return Math.round(69 + 12 * Math.log2(frequency / 440));
  }
}

registerProcessor('pitch-detector', PitchDetectorWorklet);
```

### 3. Main Thread Integration

```javascript
// audio-input-manager.js
export class AudioInputManager {
  constructor() {
    this.audioContext = null;
    this.workletNode = null;
    this.activeNotes = new Map(); // midiNote -> { onset, offset }
    this.noteThreshold = 0.7;
  }

  async init() {
    this.audioContext = new AudioContext({ latencyHint: 'interactive' });
    
    // Load AudioWorklet
    await this.audioContext.audioWorklet.addModule('/audio-pitch-detector.worklet.js');
    
    // Request microphone
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        latency: 0
      }
    });
    
    const source = this.audioContext.createMediaStreamSource(stream);
    this.workletNode = new AudioWorkletNode(this.audioContext, 'pitch-detector');
    
    // Listen for pitch events
    this.workletNode.port.onmessage = (e) => {
      this.handlePitchDetection(e.data);
    };
    
    source.connect(this.workletNode);
  }

  handlePitchDetection({ midiNote, confidence }) {
    const now = performance.now();
    
    if (confidence > this.noteThreshold) {
      // Note onset
      if (!this.activeNotes.has(midiNote)) {
        this.activeNotes.set(midiNote, { onset: now, offset: null });
        this.onNoteOn(midiNote);
      }
    } else {
      // Note offset (silence or different note)
      if (this.activeNotes.has(midiNote)) {
        const note = this.activeNotes.get(midiNote);
        note.offset = now;
        this.onNoteOff(midiNote);
        this.activeNotes.delete(midiNote);
      }
    }
  }

  onNoteOn(midiNote) {
    // Override in implementation
  }

  onNoteOff(midiNote) {
    // Override in implementation
  }
}
```

## Optimization Tips

### 1. Reduce Main Thread Work
- Move chord detection to Web Worker
- Use `requestAnimationFrame` for UI updates
- Batch multiple note events if >10/sec

### 2. Minimize Worker Communication
- Only send changed notes, not full state
- Use Transferable objects for large buffers
- Consider SharedArrayBuffer for real-time data

### 3. Audio Worklet Best Practices
- Keep buffer size small (2048-4096 samples)
- Avoid allocations in `process()` method
- Use pre-allocated typed arrays

### 4. WASM for Heavy DSP (Optional)
```javascript
// Compile Rust/C++ pitch detector to WASM
// 2-5x faster than JS for FFT/autocorrelation
import init, { detect_pitch_wasm } from './pitch_detector.wasm';

await init();
const pitch = detect_pitch_wasm(audioBuffer);
```

### 5. Latency Monitoring
```javascript
class LatencyMonitor {
  constructor() {
    this.samples = [];
    this.maxSamples = 100;
  }

  record(latencyMs) {
    this.samples.push(latencyMs);
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }

  getStats() {
    const sorted = [...this.samples].sort((a, b) => a - b);
    return {
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      avg: sorted.reduce((a, b) => a + b, 0) / sorted.length
    };
  }
}
```

## Library Recommendations

### MIDI (Preferred)
- **WebMIDI API** (native, best latency)
- **easymidi** (Node.js fallback for Electron)

### Audio Pitch Detection
- **Pitchy** (lightweight, YIN algorithm, 5KB)
- **Meyda** (comprehensive audio features, 50KB)
- **Aubio.js** (WASM port, very accurate, 200KB)

### Performance
- **Comlink** (simplify Worker communication)
- **Tone.js** (WebAudio wrapper, audio feedback)

## Fallback Flow

```
1. Try WebMIDI API
   ├─ Success → Use direct MIDI
   └─ Fail → Check reason
       ├─ Not supported → Offer WebSocket bridge
       ├─ Permission denied → Show instructions
       └─ No devices → Offer audio input

2. Try Audio Input
   ├─ Success → Use pitch detection
   └─ Fail → Show error + download Electron app

3. WebSocket Bridge (last resort)
   └─ Connect to local server running easymidi
```

## Testing Latency

```javascript
// Measure round-trip latency
function measureLatency() {
  const start = performance.now();
  
  // Simulate MIDI event
  const notes = [60, 64, 67];
  
  // Post to worker
  worker.postMessage({ type: 'detect', notes, timestamp: start });
  
  // Worker responds
  worker.onmessage = (e) => {
    const end = performance.now();
    const totalLatency = end - start;
    console.log(`Latency: ${totalLatency.toFixed(2)}ms`);
  };
}
```
