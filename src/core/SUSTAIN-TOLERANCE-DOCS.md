# Sustain Tolerance System

Technical documentation for the sustain tolerance (grace period) feature in the Practice Engine.

## Overview

The Sustain Tolerance system allows users to briefly release notes during a hold requirement without failing the task. This mimics the behavior of a sustain pedal or natural finger movement, improving the user experience by preventing frustration from minor execution errors.

## Problem

In strict MIDI evaluation, a "Note Off" event immediately clears the note from the active set. If a user is required to hold a chord for 500ms but accidentally lifts a finger for 10ms, a strict system would fail the attempt.

## Solution

The system implements a "grace period" state. When a correct note is released:

1.  The note is not immediately removed from the *evaluated* set.
2.  A timer starts (default 150ms).
3.  If the note is re-pressed within this window, the timer is cancelled, and the hold continues uninterrupted.
4.  If the timer expires, the note is considered released, and the task fails if the hold duration was not met.

## Implementation Details

The logic is handled within `PracticeEngine.js`:

-   **`#graceState`**: Tracks currently released notes that are within the grace period.
-   **`#handleStableNotes`**: Checks if missing notes are covered by the grace period.
-   **`#handleNotesCleared`**: Initiates the grace timer when notes are released.

## Configuration

The tolerance duration is configurable via the `PracticeEngine` options:

```javascript
const engine = new PracticeEngine(midi, lesson, {
  sustainTolerance: 150 // 150ms grace period
});
```

## Edge Cases

-   **Wrong Notes:** Playing a wrong note during the grace period immediately invalidates the grace state and fails the task.
-   **Multiple Releases:** Each note is tracked individually, but typically the grace period applies to the chord as a unit.
-   **Completion:** If the hold duration requirement is met *during* a grace period (i.e., the user held it long enough before releasing), the task is considered successful.
