# MusicXMLParser

A utility for parsing MusicXML files into structured lesson plans for the Keyboard Trainer.

## Overview

The `MusicXMLParser` reads standard MusicXML files and converts them into a JSON format optimized for the application's practice engine. It handles beat alignment, phrase chunking, and VexFlow data generation.

## Features

-   **Beat Alignment:** Converts XML timing (measures/divisions) into absolute time (beats/seconds).
-   **Smart Chunking:** Automatically segments the score into musical phrases based on measures, rests, and key changes.
-   **Voice Separation:** Distinguishes between melody (right hand) and harmony (left hand) tracks.
-   **VexFlow Integration:** Generates pre-formatted data structures for rendering sheet music with VexFlow.

## Usage

```javascript
import { parseMusicXMLToLessonPlan } from './src/core/MusicXMLParser.js';

const xmlContent = `...`; // Load XML string
const lessonPlan = parseMusicXMLToLessonPlan(xmlContent);

console.log(lessonPlan);
```

## Output Structure

The parser returns a `LessonPlan` object:

```javascript
{
  metadata: {
    title: "Song Title",
    composer: "Composer Name",
    tempo: 120,
    timeSignature: "4/4",
    keySignature: "C"
  },
  phrases: [
    {
      id: "phrase-1",
      startMeasure: 1,
      endMeasure: 4,
      chords: [
        {
          notes: [60, 64, 67], // MIDI numbers
          noteNames: ["C", "E", "G"],
          absoluteBeat: 0,
          duration: 4
        }
      ],
      vexFlowData: [ ... ] // Data for ScoreRenderer
    }
  ]
}
```

## Supported XML Elements

-   `<note>`: Pitch, duration, voice, staff
-   `<measure>`: Boundaries
-   `<attributes>`: Key, time, divisions
-   `<direction>`: Tempo markings
-   `<backup>` / `<forward>`: Time manipulation
