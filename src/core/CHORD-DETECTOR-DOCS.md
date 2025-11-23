# ChordDetector

A high-performance chord detection system using bitmask matching for real-time MIDI analysis.

## Overview

The `ChordDetector` class analyzes arrays of MIDI note numbers to identify musical chords. It supports a wide range of chord types, inversions, and slash chords, optimized for zero-allocation in hot paths.

## Features

-   **Bitmask Matching:** Uses bitwise operations for fast pattern matching.
-   **Slash Chord Support:** Detects inversions and bass notes that differ from the root.
-   **Voicing Analysis:** Categorizes voicings as close, open, or wide.
-   **Noise Tolerance:** Identifies the core chord even with extra non-chord tones.

## Supported Chord Types

The detector recognizes 30 distinct chord types:

-   **Triads:** Major, Minor, Diminished, Augmented, Sus2, Sus4
-   **7th Chords:** Major7, Minor7, Dominant7, Diminished7, Half-Diminished7 (m7b5), Augmented7, Minor-Major7
-   **6th Chords:** Major6, Minor6
-   **Extended:** 9th, 11th, 13th (Major, Minor, Dominant variations)
-   **Altered:** Dominant7b9, Dominant7#9, Dominant7b5, Dominant7#5

## Usage

```javascript
import { ChordDetector } from './src/core/ChordDetector.js';

const detector = new ChordDetector();
const notes = [60, 64, 67]; // C Major

const result = detector.detectChord(notes);

console.log(result);
/*
{
  name: 'C',
  root: 'C',
  type: 'major',
  notes: [60, 64, 67],
  inversion: 0,
  confidence: 1.0
}
*/
```

## API Reference

### `detectChord(notes)`

Analyzes an array of MIDI note numbers.

-   **Parameters:**
    -   `notes` (number[]): Array of MIDI note numbers (e.g., `[60, 64, 67]`).
-   **Returns:**
    -   `Object`: Detection result containing:
        -   `name` (string): Full chord name (e.g., "Cmaj7").
        -   `root` (string): Root note name (e.g., "C").
        -   `type` (string): Chord quality (e.g., "major7").
        -   `bassNote` (string): Bass note name (if different from root).
        -   `inversion` (number): 0, 1, 2, or 3.
        -   `voicing` (string): 'close', 'open', 'wide'.
        -   `confidence` (number): 0.0 to 1.0.
        -   `extraNotes` (string[]): Notes not fitting the chord pattern.

## Performance

-   **Speed:** <1ms per detection.
-   **Memory:** Zero allocation during detection (reuses internal buffers).
-   **Optimization:** Uses pre-calculated bitmasks for all 12 transpositions of each chord shape.
