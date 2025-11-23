# SheetMusic Component

A Vue 3 component for rendering interactive sheet music using VexFlow.

## Overview

The `SheetMusic` component renders musical notation based on data provided by the `MusicXMLParser`. It supports responsive resizing, dynamic highlighting of active notes, and multiple staves (treble/bass).

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `vexFlowData` | `Object` | Yes | The pre-formatted VexFlow data object for the current phrase. |
| `activeNotes` | `Array` | No | Array of currently active MIDI note numbers for highlighting. |
| `width` | `Number` | No | Explicit width in pixels (defaults to container width). |
| `height` | `Number` | No | Explicit height in pixels (defaults to 200). |

## Usage

```vue
<template>
  <SheetMusic
    :vexFlowData="currentPhrase.vexFlowData"
    :activeNotes="activeNotes"
    class="sheet-music-container"
  />
</template>

<script setup>
import SheetMusic from './SheetMusic.vue';
// ...
</script>

<style>
.sheet-music-container {
  width: 100%;
  height: 300px;
}
</style>
```

## Features

-   **Responsive Rendering:** Automatically redraws when the container size changes.
-   **Real-time Feedback:** Highlights notes in green (correct) or red (incorrect) based on `activeNotes`.
-   **Grand Staff:** Supports standard piano grand staff layout.
-   **Clef & Key Signatures:** Renders standard musical symbols.

## Integration

This component is designed to work directly with the output from `MusicXMLParser`. The `vexFlowData` property in the lesson plan structure maps directly to the component's input.
