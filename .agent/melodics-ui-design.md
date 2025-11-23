# 🎹 Melodics-Style MIDI Training UI - Complete Design Document

## Problem Statement

**Current Issues:**
1. ❌ Reference chord sound is unsatisfying (basic synth)
2. ❌ User MIDI input sounds dull or delayed
3. ❌ UI is too static, lacks musicality and timing feedback

**Solution:**
✅ Dual-channel audio system (reference vs user, distinct timbres)
✅ Interactive piano keyboard with velocity-sensitive highlights
✅ Timing grid with visual pulse
✅ Expressive animations for correct/incorrect hits
✅ <15ms total latency for MIDI → audio

---

## 🎨 Visual Design System

### **Color Palette**

```css
/* Reference (Target) Notes */
--target-idle: hsl(200, 70%, 50%);      /* Soft blue */
--target-active: hsl(200, 90%, 60%);    /* Bright blue */
--target-glow: hsl(200, 100%, 70%);     /* Cyan glow */

/* User Input Notes */
--user-correct: hsl(142, 76%, 55%);     /* Green */
--user-incorrect: hsl(0, 84%, 60%);     /* Red */
--user-early: hsl(38, 92%, 55%);        /* Orange */
--user-late: hsl(280, 70%, 60%);        /* Purple */

/* Timing Grid */
--grid-beat: hsl(220, 20%, 30%);        /* Dim gray */
--grid-pulse: hsl(45, 100%, 60%);       /* Gold pulse */

/* Piano Keys */
--key-white: hsl(0, 0%, 95%);
--key-black: hsl(220, 20%, 15%);
--key-pressed: hsl(200, 80%, 50%);      /* Blue when pressed */
--key-target: hsl(200, 70%, 50%, 0.3);  /* Ghost overlay */
```

### **Layout Components**

```
┌────────────────────────────────────────────────────────────────┐
│ Header: Score: 1250 | Accuracy: 94% | Streak: 🔥5 | ⚙️       │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Falling Notes Highway (Canvas)                           │ │
│  │                                                           │ │
│  │    Target Notes (Blue)     User Notes (Green/Red)        │ │
│  │         ▼                        ▼                        │ │
│  │    ┌────────┐              ┌────────┐                    │ │
│  │    │   C4   │              │   C4   │ ✓                  │ │
│  │    │   E4   │              │   E4   │ ✓                  │ │
│  │    │   G4   │              │   G4   │ ✓                  │ │
│  │    └────────┘              └────────┘                    │ │
│  │        │                        │                         │ │
│  │  ══════▼════════════════════════▼═══════  ← Hit Line     │ │
│  │  ┊  ┊  ┊  ┊  ┊  ┊  ┊  ┊  ┊  ┊  ┊  ┊  ┊  ← Timing Grid  │ │
│  │  ▲ Beat markers (pulse on downbeat)                      │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Interactive Piano Keyboard (Canvas + SVG)                │ │
│  │                                                           │ │
│  │  C   D   E   F   G   A   B   C   D   E   F   G   A   B  │ │
│  │ ┌─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┐ │ │
│  │ │ │#│ │#│ │ │#│ │#│ │#│ │ │#│ │#│ │ │#│ │#│ │#│ │ │  │ │
│  │ │ └─┘ └─┘ │ └─┘ └─┘ └─┘ │ └─┘ └─┘ │ └─┘ └─┘ └─┘ │ │  │ │
│  │ └───────────────────────────────────────────────────────┘ │ │
│  │                                                           │ │
│  │ Features:                                                 │ │
│  │ • Target keys: soft blue glow (ghost overlay)            │ │
│  │ • Pressed keys: bright glow (velocity = intensity)       │ │
│  │ • Correct: green flash + particle burst                  │ │
│  │ • Incorrect: red flash + shake animation                 │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌─────────────────────┐  ┌──────────────────────────────┐   │
│  │ Chord Info          │  │ Feedback Panel               │   │
│  │ ┌─────────────────┐ │  │ ┌──────────────────────────┐ │   │
│  │ │  C Major        │ │  │ │ ✓ Perfect Timing!        │ │   │
│  │ │  Root Position  │ │  │ │ +100 points              │ │   │
│  │ │                 │ │  │ │ 🎯 Accuracy: 98%         │ │   │
│  │ │ Fingering:      │ │  │ │ ⏱️  Timing: -2ms (early) │ │   │
│  │ │ RH: 1-3-5       │ │  │ └──────────────────────────┘ │   │
│  │ └─────────────────┘ │  └──────────────────────────────┘   │
│  └─────────────────────┘                                     │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Metronome / Timing Pulse                                 │ │
│  │ ●━━━○━━━○━━━○━━━  (visual pulse, synced to audio)       │ │
│  │ 1   2   3   4      BPM: 80                               │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

---

## 🎵 Dual-Channel Audio System

### **Channel A: Reference (Target) Sound**

**Instrument:** Soft Electric Piano (Rhodes-style)
- **Timbre:** Warm, bell-like, slightly detuned
- **Purpose:** Guide the user, non-intrusive
- **Volume:** -6dB (quieter than user input)

```javascript
// Reference Channel Configuration
const referenceInstrument = {
  type: 'FMSynth', // Frequency Modulation for EP sound
  harmonicity: 3,
  modulationIndex: 10,
  oscillator: { type: 'sine' },
  envelope: {
    attack: 0.01,
    decay: 0.2,
    sustain: 0.3,
    release: 0.8
  },
  modulation: {
    type: 'square'
  },
  modulationEnvelope: {
    attack: 0.01,
    decay: 0.1,
    sustain: 0.2,
    release: 0.5
  },
  volume: -6
};
```

### **Channel B: User Input Sound**

**Instrument:** Sampled Acoustic Piano (Salamander Grand)
- **Timbre:** Bright, clear, percussive
- **Purpose:** Immediate, satisfying feedback
- **Volume:** 0dB (full volume)
- **Velocity Layers:** 16 (for expressive dynamics)

```javascript
// User Channel Configuration
const userInstrument = {
  type: 'Sampler',
  urls: {
    // Preload every 3rd note for low latency
    C2: 'C2.mp3', 'D#2': 'Ds2.mp3', 'F#2': 'Fs2.mp3',
    A2: 'A2.mp3', C3: 'C3.mp3', 'D#3': 'Ds3.mp3',
    // ... (see AudioManager.js for full list)
  },
  attack: 0.001,  // Instant attack
  release: 0.5,   // Natural decay
  volume: 0,
  velocityCurve: (velocity) => Math.pow(velocity / 127, 1.5)
};
```

### **Audio Routing Diagram**

```
MIDI Input
    │
    ├──→ Reference Channel (Channel A)
    │    │
    │    ├──→ FMSynth (Electric Piano)
    │    │    └──→ Reverb (wet: 0.2)
    │    │         └──→ Pan (-0.2) ← Slightly left
    │    │              └──→ Master
    │
    └──→ User Channel (Channel B)
         │
         ├──→ Sampler (Acoustic Piano)
         │    └──→ Reverb (wet: 0.1)
         │         └──→ Pan (+0.2) ← Slightly right
         │              └──→ Master
         │
         └──→ Feedback Sounds
              ├──→ Success (arpeggio)
              ├──→ Error (soft thud)
              └──→ Streak (rising pitch)
                   └──→ Master

Master
  └──→ Compressor (threshold: -20dB)
       └──→ Limiter (threshold: -0.1dB)
            └──→ Speakers
```

---

## ⏱️ Timing System

### **Visual Timing Grid**

```javascript
const timingConfig = {
  bpm: 80,
  beatsPerMeasure: 4,
  subdivisions: 4, // 16th notes
  
  // Visual feedback windows (in milliseconds)
  perfect: 30,   // ±30ms = perfect (green)
  good: 60,      // ±60ms = good (light green)
  okay: 100,     // ±100ms = okay (yellow)
  early: -150,   // <-100ms = too early (orange)
  late: 150,     // >100ms = too late (purple)
  
  // Scoring
  perfectScore: 100,
  goodScore: 80,
  okayScore: 50,
  missScore: 0
};
```

### **Timing Feedback Visualization**

```javascript
// Calculate timing offset
function calculateTimingOffset(playedTime, expectedTime) {
  const offset = playedTime - expectedTime;
  
  if (Math.abs(offset) <= 30) {
    return { rating: 'perfect', color: 'green', score: 100 };
  } else if (Math.abs(offset) <= 60) {
    return { rating: 'good', color: 'lightgreen', score: 80 };
  } else if (Math.abs(offset) <= 100) {
    return { rating: 'okay', color: 'yellow', score: 50 };
  } else if (offset < -100) {
    return { rating: 'early', color: 'orange', score: 30 };
  } else {
    return { rating: 'late', color: 'purple', score: 30 };
  }
}
```

---

## 🎬 Animation States

### **Correct Hit Animation**

```css
@keyframes correctHit {
  0% {
    transform: scale(1);
    filter: brightness(1);
  }
  20% {
    transform: scale(1.1);
    filter: brightness(1.5) drop-shadow(0 0 20px var(--user-correct));
  }
  100% {
    transform: scale(1);
    filter: brightness(1);
  }
}

.key.correct {
  animation: correctHit 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Particle burst */
.particle-burst {
  position: absolute;
  width: 4px;
  height: 4px;
  background: var(--user-correct);
  border-radius: 50%;
  animation: particleExplode 0.6s ease-out forwards;
}

@keyframes particleExplode {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(var(--tx), var(--ty)) scale(0);
    opacity: 0;
  }
}
```

### **Incorrect Hit Animation**

```css
@keyframes incorrectShake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
  20%, 40%, 60%, 80% { transform: translateX(2px); }
}

.key.incorrect {
  animation: incorrectShake 0.4s ease-in-out;
  background: var(--user-incorrect);
  filter: brightness(1.2);
}
```

### **Timing Pulse Animation**

```css
@keyframes beatPulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.3);
    opacity: 0.7;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.beat-marker.active {
  animation: beatPulse 0.15s ease-out;
  background: var(--grid-pulse);
  box-shadow: 0 0 20px var(--grid-pulse);
}
```

---

## 📋 Implementation Checklist

### **Phase 1: Audio System (Priority 1)**
- [ ] Install Tone.js: `npm install tone`
- [ ] Create `AudioManager.js` (already done ✅)
- [ ] Implement dual-channel routing
- [ ] Add velocity curve for user input
- [ ] Test latency (target: <15ms)
- [ ] Preload piano samples (Salamander Grand)
- [ ] Create reference sound (FMSynth for EP)
- [ ] Add feedback sounds (success, error, streak)

### **Phase 2: Piano Keyboard Component (Priority 1)**
- [ ] Create `PianoKeyboard.vue` component
- [ ] Render 88 keys (A0-C8) using Canvas or SVG
- [ ] Implement key press visualization
- [ ] Add ghost overlay for target notes
- [ ] Connect to MIDI input events
- [ ] Add velocity-sensitive brightness
- [ ] Implement correct/incorrect animations

### **Phase 3: Falling Notes Highway (Priority 2)**
- [ ] Create `FallingNotesCanvas.vue` component
- [ ] Implement scrolling note highway
- [ ] Render target notes (blue)
- [ ] Render user notes (green/red)
- [ ] Add hit line with pulse effect
- [ ] Implement timing grid
- [ ] Calculate and display timing offset

### **Phase 4: Timing & Feedback (Priority 2)**
- [ ] Create `TimingEngine.js`
- [ ] Implement beat tracking
- [ ] Calculate timing offsets
- [ ] Add visual timing feedback
- [ ] Create metronome pulse
- [ ] Add score calculation
- [ ] Implement streak counter

### **Phase 5: UI Polish (Priority 3)**
- [ ] Add particle effects for correct hits
- [ ] Implement shake animation for errors
- [ ] Add smooth transitions between states
- [ ] Create feedback panel component
- [ ] Add chord info display
- [ ] Implement progress bar
- [ ] Add settings panel (volume, BPM, etc.)

### **Phase 6: Performance Optimization (Priority 3)**
- [ ] Measure MIDI → audio latency
- [ ] Optimize Canvas rendering (60fps)
- [ ] Implement object pooling for particles
- [ ] Add Web Worker for timing calculations
- [ ] Profile and optimize hot paths
- [ ] Test on low-end devices

---

## 💻 Code Snippets

### **1. WebAudio Sampler for Chords**

```javascript
// Play reference chord (target)
export function playReferenceChord(audioManager, notes, duration = 1.0) {
  const now = Tone.now();
  
  // Convert MIDI numbers to note names
  const noteNames = notes.map(midi => 
    Tone.Frequency(midi, 'midi').toNote()
  );
  
  // Play on reference channel (EP sound)
  audioManager.referenceSynth.triggerAttackRelease(
    noteNames,
    duration,
    now,
    0.7 // Velocity
  );
  
  // Visual feedback: highlight keys
  noteNames.forEach(note => {
    highlightKey(note, 'target', duration * 1000);
  });
}
```

### **2. Real-time MIDI → Audio (<15ms latency)**

```javascript
// In useMIDI.js composable
import { AudioManager } from '../audio/AudioManager.js';

const audioManager = new AudioManager();
let latencyLog = [];

function handleMIDIMessage(event) {
  const t0 = performance.now(); // Start timing
  
  const [command, note, velocity] = event.data;
  const messageType = command & 0xf0;
  
  if (messageType === 0x90 && velocity > 0) {
    // Note On
    audioManager.handleNoteOn(note, velocity);
    
    const t1 = performance.now(); // End timing
    const latency = t1 - t0;
    latencyLog.push(latency);
    
    // Log every 100 events
    if (latencyLog.length >= 100) {
      const avg = latencyLog.reduce((a, b) => a + b) / latencyLog.length;
      console.log(`Avg latency: ${avg.toFixed(2)}ms`);
      latencyLog = [];
    }
    
    // Update UI (non-blocking)
    requestAnimationFrame(() => {
      activeNotes.value.add(note);
      highlightKey(note, 'user', velocity);
    });
    
  } else if (messageType === 0x80 || (messageType === 0x90 && velocity === 0)) {
    // Note Off
    audioManager.handleNoteOff(note);
    
    requestAnimationFrame(() => {
      activeNotes.value.delete(note);
      unhighlightKey(note);
    });
  }
}
```

### **3. UI State Model (Target vs User)**

```javascript
// State management for notes
export const noteState = reactive({
  // Target notes (what should be played)
  target: {
    notes: [], // Array of MIDI note numbers
    timestamp: 0,
    duration: 1000,
    active: false
  },
  
  // User notes (what is being played)
  user: {
    notes: new Set(), // Set of currently pressed MIDI notes
    history: [], // Array of { note, timestamp, velocity }
    lastUpdate: 0
  },
  
  // Comparison result
  feedback: {
    correct: false,
    timing: 0, // Offset in ms
    rating: '', // 'perfect', 'good', 'okay', 'early', 'late'
    score: 0,
    message: ''
  }
});

// Compare user input to target
export function compareNotes() {
  const targetSet = new Set(noteState.target.notes);
  const userSet = noteState.user.notes;
  
  // Check if all target notes are played
  const allCorrect = [...targetSet].every(note => userSet.has(note));
  
  // Check if no extra notes
  const noExtra = [...userSet].every(note => targetSet.has(note));
  
  // Calculate timing offset
  const expectedTime = noteState.target.timestamp;
  const actualTime = noteState.user.lastUpdate;
  const timingOffset = actualTime - expectedTime;
  
  // Determine rating
  const timingResult = calculateTimingOffset(timingOffset, expectedTime);
  
  noteState.feedback = {
    correct: allCorrect && noExtra,
    timing: timingOffset,
    rating: timingResult.rating,
    score: timingResult.score,
    message: allCorrect && noExtra 
      ? `Perfect! ${timingResult.rating}` 
      : 'Try again'
  };
  
  return noteState.feedback;
}
```

---

## 🎯 Expected Results

### **Audio Quality**
- ✅ Reference sound: Warm, musical EP tone
- ✅ User sound: Bright, expressive piano
- ✅ Clear distinction between channels
- ✅ Velocity-sensitive dynamics
- ✅ <15ms MIDI → audio latency

### **Visual Feedback**
- ✅ Keys light up instantly on MIDI input
- ✅ Target keys show ghost overlay
- ✅ Correct hits: green flash + particles
- ✅ Incorrect hits: red flash + shake
- ✅ Timing feedback: color-coded (green/yellow/orange/purple)

### **User Experience**
- ✅ Feels responsive and musical
- ✅ Clear sense of timing and accuracy
- ✅ Satisfying audio feedback
- ✅ Engaging visual animations
- ✅ Melodics-level polish

---

## 📊 Performance Targets

| Metric | Target | How to Achieve |
|--------|--------|----------------|
| MIDI → Audio | <15ms | Tone.js with latencyHint: 'interactive' |
| MIDI → Visual | <16ms | requestAnimationFrame (60fps) |
| Canvas FPS | 60fps | Optimize rendering, use object pooling |
| Sample Load | <2s | Preload only essential notes |
| Memory Usage | <100MB | Limit polyphony, dispose unused objects |

---

**Next Steps:** Implement Phase 1 (Audio System) first, then Phase 2 (Piano Keyboard). I'll create the components now!
