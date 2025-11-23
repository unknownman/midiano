# MIDI Keyboard Trainer

A comprehensive web-based application for practicing piano chords and scales using a MIDI keyboard. This application connects to your MIDI device via the Web MIDI API and provides real-time feedback, scoring, and progress tracking.

## Features

- **Real-time MIDI Input:** Connects directly to any MIDI keyboard via Web MIDI API.
- **Chord Detection:** Advanced chord recognition algorithm supporting triads, 7th chords, inversions, and slash chords.
- **Interactive Practice Mode:**
  - Guided practice sessions with immediate visual and audio feedback.
  - Scoring system based on accuracy and timing.
  - "Sustain Tolerance" feature to handle accidental finger lifts.
- **Visual Feedback:**
  - Virtual piano keyboard visualizing input and target notes.
  - Dynamic sheet music rendering using VexFlow.
  - Real-time status indicators for connection and latency.
- **Audio Engine:** Built-in low-latency sound engine (Web Audio API) for playback and reference.
- **Responsive Design:** Modern, dark-themed UI optimized for desktop and tablet use.

## Tech Stack

- **Frontend:** Vue 3 (Composition API), Vite
- **Language:** JavaScript / TypeScript
- **State Management:** Vue Reactivity System
- **Audio/MIDI:**
  - Web MIDI API (Input)
  - Web Audio API (Sound Generation)
- **Rendering:** VexFlow (Sheet Music)
- **Styling:** CSS Variables, Responsive Flexbox/Grid

## Prerequisites

- Node.js (v16 or higher)
- A MIDI Keyboard (USB or Bluetooth)
- A browser with Web MIDI support (Chrome, Edge, Opera)

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd "Keyboard Trainer"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open your browser and navigate to `http://localhost:5173` (or the port shown in your terminal).

3. Connect your MIDI keyboard. The application should automatically detect it.

4. Select a difficulty level and start a practice session.

## Project Structure

```
Keyboard Trainer/
├── client/                  # Frontend application
│   ├── src/
│   │   ├── components/      # Vue components (PianoKeyboard, SheetMusic, etc.)
│   │   ├── composables/     # Vue composables (usePracticeSession, etc.)
│   │   ├── core/            # Core logic (ChordDetector, PracticeEngine, etc.)
│   │   ├── midi/            # MIDI handling logic
│   │   ├── views/           # Page views
│   │   └── App-Integrated.vue # Main application entry
│   └── ...
├── public/                  # Static assets
├── tests/                   # Unit and integration tests
└── ...
```

## Documentation

Detailed documentation for specific modules can be found in the following files:

- **System Architecture:** `COMPLETE-SYSTEM-ARCHITECTURE.md`
- **Integration Guide:** `FINAL-INTEGRATION-SUMMARY.md`
- **Chord Detector:** `src/core/CHORD-DETECTOR-DOCS.md`
- **Practice Engine:** `src/core/PRACTICE-ENGINE-DOCS.md`
- **Sound Engine:** `src/core/SOUNDENGINE-DOCS.md`
- **MIDI Manager:** `src/midi/README.md`

## License

MIT License
