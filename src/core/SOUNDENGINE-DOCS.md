# SoundEngine

A lightweight, low-latency audio engine built on the Web Audio API for synthesizing piano sounds.

## Overview

The `SoundEngine` provides polyphonic sound synthesis for the application. It uses a custom oscillator-based synthesis engine to emulate an electric piano sound, optimized for low latency and minimal CPU usage.

## Features

-   **Polyphony:** Supports playing multiple notes simultaneously.
-   **Low Latency:** Direct Web Audio API usage for immediate response (<10ms).
-   **Synthesis:** Custom ADSR envelope and oscillator blending for a pleasant electric piano tone.
-   **Dynamics:** Velocity-sensitive volume control.
-   **Master Effects:** Includes a limiter to prevent clipping.

## Usage

```javascript
import { SoundEngine } from './src/core/SoundEngine.js';

// 1. Create engine
const soundEngine = new SoundEngine();

// 2. Initialize (requires user interaction)
await soundEngine.initialize();

// 3. Play a note
soundEngine.playNote(60, 100); // Middle C, velocity 100

// 4. Play a chord
soundEngine.playNotes([60, 64, 67], 1.0); // C Major, 1 second duration

// 5. Stop a note
soundEngine.stopNote(60);
```

## API Reference

-   `initialize()`: Resumes the AudioContext (must be called after user gesture).
-   `playNote(midiNote, velocity)`: Starts playing a note.
-   `stopNote(midiNote)`: Stops playing a note with a release phase.
-   `playNotes(midiNotes, duration)`: Plays a chord for a specific duration (preview).
-   `playSuccess()`: Plays a success sound effect.
-   `playError()`: Plays an error sound effect.
-   `setVolume(value)`: Sets master volume (0.0 to 1.0).
-   `dispose()`: Closes the AudioContext and releases resources.
