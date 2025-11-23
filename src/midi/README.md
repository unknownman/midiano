# MidiInputManager

A robust MIDI input manager for web applications, featuring stability buffering (debounce) to prevent partial chord detection.

## Features

-   **Stability Buffer:** Configurable debounce delay (default 40ms) to ensure chords are fully pressed before triggering events.
-   **Event-Driven:** Emits events for notes, chords, and device connection status.
-   **Hotplug Support:** Automatically handles device connection and disconnection.
-   **Resource Management:** Proper cleanup of event listeners to prevent memory leaks.

## Installation

```javascript
import { MidiInputManager } from './src/midi/MidiInputManager.js';
```

## Quick Start

```javascript
// 1. Create manager instance
const midiManager = new MidiInputManager({
  debounceDelay: 40 // 40ms stability buffer
});

// 2. Initialize WebMIDI
await midiManager.initialize();

// 3. Listen for stable chord detection
midiManager.on('chordDetected', ({ notes, velocities, timestamp }) => {
  console.log('Chord detected:', notes);
});

// 4. Listen for real-time note events
midiManager.on('noteOn', ({ note, velocity }) => {
  console.log(`Note On: ${note}`);
});

// 5. Clean up
midiManager.dispose();
```

## API Reference

### Constructor

```javascript
new MidiInputManager(options)
```

-   `options.debounceDelay` (number): Stability buffer delay in milliseconds (default: 40).

### Methods

-   `async initialize()`: Initializes the Web MIDI API and connects to available devices.
-   `async connect(deviceId)`: Connects to a specific MIDI input device.
-   `disconnect()`: Disconnects from the current device.
-   `getActiveNotes()`: Returns an array of currently pressed MIDI note numbers (real-time).
-   `getStableNotes()`: Returns an array of stable MIDI note numbers (after debounce).
-   `getAvailableDevices()`: Returns a list of available MIDI input devices.
-   `dispose()`: Cleans up resources and removes event listeners.

### Events

-   `noteOn`: Fired immediately when a note is pressed.
-   `noteOff`: Fired immediately when a note is released.
-   `stableNotes`: Fired after the debounce period when the set of held notes stabilizes.
-   `chordDetected`: Fired after stability when 2 or more notes are held.
-   `deviceConnected`: Fired when a new MIDI device is connected.
-   `deviceDisconnected`: Fired when a MIDI device is disconnected.

## Performance

The manager uses a `Set` for active notes and a single timeout for debouncing, ensuring minimal memory overhead (<1KB) and negligible CPU usage.
