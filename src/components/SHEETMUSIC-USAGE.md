# SheetMusic Component - Usage Guide

## Overview

A reactive Vue 3 component for rendering musical notation using VexFlow with real-time note highlighting.

---

## Installation

```bash
# Install VexFlow
npm install vexflow
```

---

## Basic Usage

```vue
<template>
  <div class="app">
    <SheetMusic 
      :phrase="currentPhrase" 
      :activeNotes="highlightedNotes"
      highlightColor="#4CAF50"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import SheetMusic from './src/components/SheetMusic.vue';

const currentPhrase = ref({
  id: 'phrase-1',
  events: [
    {
      type: 'note',
      hand: 'right',
      noteName: 'C',
      octave: 5,
      type: 'quarter'
    },
    {
      type: 'chord',
      hand: 'left',
      notes: [60, 64, 67],
      noteNames: ['C', 'E', 'G']
    }
  ],
  vexFlowData: [
    {
      staves: [
        {
          clef: 'treble',
          keySignature: 'C',
          timeSignature: '4/4',
          notes: [
            { keys: ['C/5'], duration: 'q' }
          ]
        },
        {
          clef: 'bass',
          notes: [
            { keys: ['C/3', 'E/3', 'G/3'], duration: 'q' }
          ]
        }
      ]
    }
  ]
});

const highlightedNotes = ref([0]); // Highlight first note
</script>
```

---

## Props

### `phrase`
- **Type:** `Object`
- **Default:** `null`
- **Description:** Phrase data from MusicXMLParser

**Structure:**
```javascript
{
  id: 'phrase-1',
  startMeasure: 1,
  endMeasure: 4,
  events: [...],
  vexFlowData: [
    {
      staves: [
        {
          clef: 'treble',
          keySignature: 'C',
          timeSignature: '4/4',
          notes: [
            { keys: ['C/5'], duration: 'q' }
          ]
        },
        {
          clef: 'bass',
          notes: [...]
        }
      ]
    }
  ]
}
```

---

### `activeNotes`
- **Type:** `Array<number>`
- **Default:** `[]`
- **Description:** Array of note indices to highlight

**Example:**
```javascript
// Highlight first and third notes
activeNotes: [0, 2]
```

---

### `highlightColor`
- **Type:** `String`
- **Default:** `'#4CAF50'`
- **Description:** Color for highlighted notes

**Examples:**
```javascript
highlightColor: '#4CAF50'  // Green (correct)
highlightColor: '#ef4444'  // Red (wrong)
highlightColor: '#3b82f6'  // Blue (current)
```

---

## Integration with Practice Engine

```vue
<template>
  <div class="practice-view">
    <SheetMusic 
      :phrase="currentPhrase" 
      :activeNotes="activeNoteIndices"
      :highlightColor="feedbackColor"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import SheetMusic from './src/components/SheetMusic.vue';
import { PracticeEngine } from './src/core/PracticeEngine.js';

const props = defineProps(['lessonPlan']);

// Current phrase from lesson plan
const currentPhrase = ref(props.lessonPlan.phrases[0]);

// Active notes based on user input
const activeNoteIndices = ref([]);

// Feedback color based on state
const feedbackColor = computed(() => {
  if (engineState.value?.state === 'SUCCESS_FEEDBACK') {
    return '#4CAF50'; // Green
  } else if (engineState.value?.state === 'FAIL_FEEDBACK') {
    return '#ef4444'; // Red
  } else if (engineState.value?.state === 'EVALUATING') {
    return '#3b82f6'; // Blue
  }
  return '#4CAF50'; // Default
});

// Practice engine state
const engineState = ref(null);

// Subscribe to practice engine
const engine = new PracticeEngine(midiManager, props.lessonPlan);

engine.subscribe((state) => {
  engineState.value = state;
  
  // Update current phrase
  if (state.session.currentPhrase) {
    currentPhrase.value = state.session.currentPhrase;
  }
  
  // Update highlighted notes based on user input
  if (state.input.detectedChord) {
    // Find note indices that match detected chord
    activeNoteIndices.value = findMatchingNoteIndices(
      state.input.detectedChord.notes
    );
  } else {
    activeNoteIndices.value = [];
  }
});

function findMatchingNoteIndices(notes) {
  // Logic to find which notes in the score match the played notes
  // This is simplified - you'd implement based on your needs
  return notes.map((note, index) => index);
}
</script>
```

---

## Integration with MusicXML Parser

```vue
<template>
  <div>
    <input type="file" @change="loadMusicXML" accept=".xml,.musicxml" />
    
    <SheetMusic 
      v-if="currentPhrase"
      :phrase="currentPhrase" 
      :activeNotes="[]"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import SheetMusic from './src/components/SheetMusic.vue';
import { parseMusicXMLToLessonPlan } from './src/core/MusicXMLParser.js';

const currentPhrase = ref(null);

async function loadMusicXML(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const text = await file.text();
  const lessonPlan = parseMusicXMLToLessonPlan(text);
  
  // Display first phrase
  currentPhrase.value = lessonPlan.phrases[0];
}
</script>
```

---

## Advanced Usage

### Programmatic Control

```vue
<template>
  <div>
    <SheetMusic ref="sheetMusicRef" :phrase="phrase" />
    
    <button @click="highlightFirstNote">Highlight First Note</button>
    <button @click="clearHighlights">Clear Highlights</button>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import SheetMusic from './src/components/SheetMusic.vue';

const sheetMusicRef = ref(null);
const phrase = ref({...});

function highlightFirstNote() {
  sheetMusicRef.value?.highlightNotes([0], '#4CAF50');
}

function clearHighlights() {
  sheetMusicRef.value?.highlightNotes([], '#000');
}
</script>
```

---

### Custom Styling

```vue
<template>
  <SheetMusic 
    :phrase="phrase"
    class="custom-sheet-music"
  />
</template>

<style>
.custom-sheet-music {
  min-height: 400px;
  background: linear-gradient(to bottom, #f9fafb, #ffffff);
  border: 2px solid #e5e7eb;
  border-radius: 12px;
}
</style>
```

---

### Responsive Sizing

The component automatically resizes based on container size:

```vue
<template>
  <div class="container">
    <!-- Full width on desktop, stacked on mobile -->
    <div class="score-container">
      <SheetMusic :phrase="phrase" />
    </div>
  </div>
</template>

<style>
.score-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .score-container {
    padding: 16px;
  }
}
</style>
```

---

## Troubleshooting

### "VexFlow is not defined"

**Solution:** Install VexFlow:
```bash
npm install vexflow
```

### "Container element not found"

**Solution:** Ensure component is mounted:
```vue
<script setup>
import { onMounted } from 'vue';

onMounted(() => {
  // Component is now mounted
});
</script>
```

### Notes not rendering

**Solution:** Check phrase data structure:
```javascript
console.log('Phrase data:', phrase.value);
console.log('VexFlow data:', phrase.value?.vexFlowData);
```

### Highlights not working

**Solution:** Ensure note indices are valid:
```javascript
// activeNotes should be array of numbers
activeNotes.value = [0, 1, 2]; // ✓ Correct
activeNotes.value = ['0', '1']; // ✗ Wrong
```

---

## Performance Tips

### 1. Debounce activeNotes updates

```javascript
import { debounce } from 'lodash-es';

const updateHighlights = debounce((notes) => {
  activeNotes.value = notes;
}, 50);
```

### 2. Memoize phrase data

```javascript
import { computed } from 'vue';

const memoizedPhrase = computed(() => {
  // Only re-compute when phrase ID changes
  return props.phrase;
});
```

### 3. Lazy load component

```javascript
import { defineAsyncComponent } from 'vue';

const SheetMusic = defineAsyncComponent(() =>
  import('./src/components/SheetMusic.vue')
);
```

---

## Examples

### Example 1: Score Follower

```vue
<template>
  <SheetMusic 
    :phrase="currentPhrase"
    :activeNotes="currentNoteIndex !== -1 ? [currentNoteIndex] : []"
    highlightColor="#3b82f6"
  />
</template>

<script setup>
import { ref, onMounted } from 'vue';

const currentNoteIndex = ref(-1);

onMounted(() => {
  // Simulate score following
  let index = 0;
  setInterval(() => {
    currentNoteIndex.value = index;
    index = (index + 1) % 8; // Cycle through 8 notes
  }, 500);
});
</script>
```

### Example 2: Practice Feedback

```vue
<template>
  <SheetMusic 
    :phrase="phrase"
    :activeNotes="playedNotes"
    :highlightColor="isCorrect ? '#4CAF50' : '#ef4444'"
  />
</template>

<script setup>
import { ref } from 'vue';

const playedNotes = ref([]);
const isCorrect = ref(false);

function handleMIDIInput(notes) {
  playedNotes.value = notes;
  isCorrect.value = checkIfCorrect(notes);
}
</script>
```

---

**Built by a Senior Vue.js Developer for production use** 🎼✨
