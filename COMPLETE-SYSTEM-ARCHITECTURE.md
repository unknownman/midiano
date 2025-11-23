# System Architecture

This document provides a comprehensive overview of the MIDI Keyboard Trainer system architecture.

## Architecture Overview

The system is designed as a modular, event-driven application that processes real-time MIDI input, analyzes musical data, and provides immediate feedback to the user.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE (Vue)                         │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │  Piano       │  │  Sheet       │  │  Trainer     │               │
│  │  Keyboard    │  │  Music       │  │  Panel       │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
19: └──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        PRACTICE ENGINE                              │
│                     (State Machine + Game Loop)                     │
│                                                                     │
│  States: IDLE → WAITING → EVALUATING → FEEDBACK → NEXT              │
│  Features: Hold validation, Timing analysis, Scoring                │
28: └───────┬──────────────────────┬──────────────────────┬───────────────┘
        │                      │                      │
        ▼                      ▼                      ▼
┌───────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ MIDI Input    │    │ Chord Detector   │    │ Lesson Plan      │
│ Manager       │    │                  │    │ (MusicXML)       │
│               │    │                  │    │                  │
│ • Stability   │    │ • Bitmask        │    │ • Beat-aligned   │
│   buffer      │    │   matching       │    │ • Smart chunking │
│ • Event-      │    │ • 30 chord types │    │ • Voice          │
│   driven      │    │ • Slash chords   │    │   separation     │
│ • Device      │    │ • Voicing        │    │ • VexFlow data   │
│   hotplug     │    │   analysis       │    │                  │
41: └───────────────┘    └──────────────────┘    └──────────────────┘
        │                      │                      │
        ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        HARDWARE / DATA                              │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │  MIDI        │  │  Music       │  │  Audio       │               │
│  │  Keyboard    │  │  Theory      │  │  Engine      │               │
50: │  └──────────────┘  └──────────────┘  └──────────────┘               │
51: └─────────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. MidiInputManager (`src/midi/MidiInputManager.js`)

Handles raw MIDI input from hardware devices.

-   **Stability Buffer:** Implements a 40ms debounce to prevent partial chord detection (arpeggiated input).
-   **Event-Driven:** Emits `stableNotes` events only when input has settled.
-   **Hotplug Support:** Automatically detects connection and disconnection of MIDI devices.

### 2. ChordDetector (`src/core/ChordDetector.js`)

Analyzes sets of MIDI notes to identify musical chords.

-   **Bitmask Matching:** Uses bitwise operations for high-performance matching against a dictionary of chord shapes.
-   **Comprehensive Library:** Supports 30+ chord types including triads, 7ths, 9ths, 11ths, 13ths, and altered chords.
-   **Slash Chords:** Identifies inversions and slash chords (e.g., C/E).
-   **Voicing Analysis:** Determines if a voicing is close, open, or wide.

### 3. MusicXMLParser (`src/core/MusicXMLParser.js`)

Parses MusicXML files into a structured format suitable for the practice engine.

-   **Beat Alignment:** Converts XML timing to absolute beats and seconds.
-   **Smart Chunking:** Splits scores into musical phrases based on measures, rests, and key changes.
-   **Voice Separation:** Distinguishes between melody (right hand) and harmony/bass (left hand).
-   **VexFlow Integration:** Generates data structures ready for rendering with VexFlow.

### 4. PracticeEngine (`src/core/PracticeEngine.js`)

The central controller that manages the practice session lifecycle.

-   **State Machine:** Manages transitions between states (Idle, Waiting, Evaluating, Feedback).
-   **Hold Validation:** Enforces a minimum hold duration (default 500ms) to ensure intentional playing.
-   **Scoring:** Calculates scores based on accuracy, timing, and streaks.
-   **Reactive State:** Uses a subscription model to notify the UI of state changes.

## Data Flow

1.  **Input:** MIDI Keyboard sends `NoteOn` events.
2.  **Buffering:** `MidiInputManager` buffers events for 40ms.
3.  **Stability:** Once stable, a `stableNotes` event is emitted.
4.  **Detection:** `PracticeEngine` passes notes to `ChordDetector`.
5.  **Evaluation:** Detected chord is compared against the current target from the `LessonPlan`.
6.  **Update:** If correct and held for the required duration, the score is updated and the engine advances.
7.  **Feedback:** UI components subscribe to engine updates and re-render feedback.

## Performance Metrics

| Component | Latency | Memory | Allocation |
|-----------|---------|--------|------------|
| **MIDI Input** | <1ms | <1KB | Zero |
| **Chord Detector** | <1ms | ~200B | Zero |
| **Practice Engine** | <0.1ms | ~3KB | Minimal |
| **Total Pipeline** | ~45ms | ~5KB | Minimal |

**Total Latency Breakdown:**
- MIDI → Input Manager: ~1ms
- Stability buffer: 40ms (configurable)
- Chord detection: <1ms
- State update: <0.1ms
- UI render: ~3ms (Vue)
- **Total: ~45ms**
