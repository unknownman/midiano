# PracticeEngine

The core logic engine for managing practice sessions, scoring, and state transitions.

## Overview

The `PracticeEngine` manages the lifecycle of a practice session. It handles the state machine (Idle, Waiting, Evaluating, Feedback), validates user input against target chords, enforces hold durations, and calculates scores.

## Features

-   **State Machine:** Robust state management for the practice loop.
-   **Hold Validation:** Ensures chords are held for a specific duration (default 500ms) before counting as success.
-   **Sustain Tolerance:** Provides a grace period (default 150ms) for accidental finger lifts.
-   **Scoring System:** Calculates points based on accuracy, timing, and streaks.
-   **Reactive State:** Uses a subscription model to broadcast state changes to the UI.

## Usage

```javascript
import { PracticeEngine } from './src/core/PracticeEngine.js';
import { MidiInputManager } from './src/midi/MidiInputManager.js';

// 1. Initialize dependencies
const midiManager = new MidiInputManager();
const lessonPlan = { ... }; // Load lesson plan

// 2. Create engine
const engine = new PracticeEngine(midiManager, lessonPlan, {
  minHoldDuration: 500,
  sustainTolerance: 150
});

// 3. Subscribe to updates
engine.subscribe((state) => {
  console.log('Current State:', state.status);
  console.log('Score:', state.session.score);
});

// 4. Start session
engine.start();
```

## Configuration

Options passed to the constructor:

-   `minHoldDuration` (number): Time in ms a chord must be held (default: 500).
-   `sustainTolerance` (number): Grace period in ms for released notes (default: 150).
-   `autoAdvance` (boolean): Whether to automatically move to the next chord (default: true).
-   `restartOnMistake` (boolean): Whether to reset the current task on error (default: false).

## State Flow

1.  **IDLE:** Engine is initialized but not started.
2.  **WAITING_FOR_INPUT:** Waiting for user to play the target chord.
3.  **EVALUATING:** User is holding the correct chord; timer is running.
4.  **FEEDBACK:** Success or failure feedback is active.
5.  **NEXT_CHORD:** Transitioning to the next task.
6.  **COMPLETED:** Session finished.

## API Reference

-   `start()`: Begins the practice session.
-   `pause()`: Pauses the session timer.
-   `resume()`: Resumes the session.
-   `skip()`: Skips the current task.
-   `restart()`: Resets the session to the beginning.
-   `dispose()`: Cleans up resources.
