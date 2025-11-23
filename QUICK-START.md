# 🚀 QUICK START GUIDE

## Get Your MIDI Training App Running in 5 Minutes!

---

## Prerequisites

- ✅ Node.js 16+ installed
- ✅ MIDI keyboard connected
- ✅ Chrome, Edge, or Opera browser (WebMIDI support)

---

## Step 1: Install Dependencies

```bash
cd "/Users/alijoder/Desktop/Code/Keyboard Trainer"

# Install VexFlow (for sheet music)
npm install vexflow

# Verify installation
npm list vexflow
```

---

## Step 2: Create a Test Lesson

Create `public/test-lesson.json`:

```json
{
  "metadata": {
    "title": "C Major Chord Practice",
    "composer": "Practice",
    "tempo": 120,
    "ticksPerBeat": 480
  },
  "phrases": [
    {
      "id": "phrase-1",
      "startMeasure": 1,
      "endMeasure": 3,
      "chords": [
        {
          "notes": [60, 64, 67],
          "noteNames": ["C", "E", "G"],
          "absoluteTick": 0,
          "absoluteBeat": 0,
          "absoluteTime": 0,
          "measureNumber": 1
        },
        {
          "notes": [65, 69, 72],
          "noteNames": ["F", "A", "C"],
          "absoluteTick": 1920,
          "absoluteBeat": 4,
          "absoluteTime": 2,
          "measureNumber": 2
        },
        {
          "notes": [67, 71, 74],
          "noteNames": ["G", "B", "D"],
          "absoluteTick": 3840,
          "absoluteBeat": 8,
          "absoluteTime": 4,
          "measureNumber": 3
        }
      ],
      "vexFlowData": [
        {
          "staves": [
            {
              "clef": "treble",
              "keySignature": "C",
              "timeSignature": "4/4",
              "notes": [
                { "keys": ["C/5"], "duration": "w" },
                { "keys": ["F/5"], "duration": "w" },
                { "keys": ["G/5"], "duration": "w" }
              ]
            },
            {
              "clef": "bass",
              "keySignature": "C",
              "timeSignature": "4/4",
              "notes": [
                { "keys": ["C/3", "E/3", "G/3"], "duration": "w" },
                { "keys": ["F/3", "A/3", "C/4"], "duration": "w" },
                { "keys": ["G/3", "B/3", "D/4"], "duration": "w" }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

---

## Step 3: Update Your App Entry Point

Update `src/main.js` (or create if doesn't exist):

```javascript
import { createApp } from 'vue';
import PracticeView from './views/PracticeView.vue';

// Load test lesson
fetch('/test-lesson.json')
  .then(res => res.json())
  .then(lessonPlan => {
    const app = createApp(PracticeView, {
      lessonPlan
    });
    
    app.mount('#app');
  })
  .catch(error => {
    console.error('Failed to load lesson:', error);
  });
```

---

## Step 4: Update index.html

Ensure your `index.html` has:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MIDI Keyboard Trainer</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

---

## Step 5: Run the App

```bash
npm run dev
```

Open browser to: **http://localhost:3000**

---

## Step 6: Test the Flow

### 1. **Connect MIDI Keyboard**
- Plug in your MIDI keyboard
- Browser will ask for permission
- Click "Allow"

### 2. **Initialize Audio**
- Click anywhere on the page (browser autoplay policy)
- Audio engine will initialize

### 3. **Start Practice**
- Click "▶️ Start Practice" button
- First chord will display: **C-E-G**

### 4. **Play the Chord**
- Press C, E, and G on your MIDI keyboard
- Hold for 500ms
- You'll see:
  - ✅ Success feedback
  - Score increment
  - Auto-advance to next chord

### 5. **Complete Session**
- Play all 3 chords (C, F, G)
- Completion modal shows
- View your stats!

---

## 🎯 Expected Behavior

### When You Play Correctly:
```
1. Press C-E-G keys
2. Hold for 500ms
3. See: "Perfect! 🎯" (green overlay)
4. Score: +150 points
5. Auto-advance to F-A-C
```

### When You Play Wrong:
```
1. Press wrong notes
2. See: "Wrong chord" (red overlay)
3. Streak resets to 0
4. Try again (same chord)
```

---

## 🐛 Troubleshooting

### "MIDI not detected"

**Check:**
```javascript
// In browser console
navigator.requestMIDIAccess()
  .then(access => {
    console.log('MIDI supported!');
    console.log('Inputs:', Array.from(access.inputs.values()));
  })
  .catch(err => console.error('MIDI not supported:', err));
```

**Solution:**
- Use Chrome, Edge, or Opera
- Check MIDI keyboard is powered on
- Try unplugging and replugging

---

### "No sound"

**Check:**
```javascript
// In browser console
window.AudioContext || window.webkitAudioContext
```

**Solution:**
- Click anywhere on page first (autoplay policy)
- Check browser volume
- Check system volume

---

### "Sheet music not showing"

**Check:**
```bash
npm list vexflow
```

**Solution:**
```bash
npm install vexflow
npm run dev
```

---

### "Module not found"

**Check file paths:**
```javascript
// All imports should use relative paths
import { PracticeEngine } from './src/core/PracticeEngine.js';
import { MidiInputManager } from './src/midi/MidiInputManager.js';
```

---

## 🎨 Customize

### Change Colors

In `src/views/PracticeView.vue`:

```css
:root {
  --primary-500: #10b981; /* Green instead of blue */
  --bg-primary: #1a1a1a;  /* Darker background */
}
```

### Change Hold Duration

In `src/composables/usePracticeSession.js`:

```javascript
const { gameState, ... } = usePracticeSession(lessonPlan, {
  minHoldDuration: 300  // Faster (300ms instead of 500ms)
});
```

### Change Sounds

In `src/core/SoundEngine.js`:

```javascript
#envelope = {
  attack: 0.001,  // Faster attack (pluck sound)
  decay: 0.3,
  sustain: 0.0,   // No sustain (short notes)
  release: 0.2
};
```

---

## 📊 Test Checklist

- [ ] MIDI keyboard connects
- [ ] Audio initializes on click
- [ ] Start button works
- [ ] Sheet music displays
- [ ] Target chord shows
- [ ] "Hear It" button plays sound
- [ ] Playing correct chord shows success
- [ ] Playing wrong chord shows fail
- [ ] Score increments
- [ ] Streak tracks correctly
- [ ] Auto-advances to next chord
- [ ] Completion modal shows
- [ ] Restart works

---

## 🚀 Next Steps

### Add More Lessons

Create more JSON files in `public/`:
- `beginner-scales.json`
- `jazz-chords.json`
- `classical-pieces.json`

### Add Lesson Selector

```vue
<template>
  <select v-model="selectedLesson" @change="loadLesson">
    <option value="test-lesson">C Major Practice</option>
    <option value="beginner-scales">Beginner Scales</option>
    <option value="jazz-chords">Jazz Chords</option>
  </select>
  
  <PracticeView v-if="lessonPlan" :lessonPlan="lessonPlan" />
</template>
```

### Add Router

```bash
npm install vue-router@4

# Create router/index.js
# Add routes for different lessons
```

---

## 📚 Documentation

- **Complete System:** `COMPLETE-SYSTEM-ARCHITECTURE.md`
- **Integration:** `FINAL-INTEGRATION-SUMMARY.md`
- **Components:**
  - MIDI: `src/midi/README.md`
  - Chord Detector: `src/core/CHORD-DETECTOR-DOCS.md`
  - Parser: `src/core/MUSICXML-PARSER-DOCS.md`
  - Engine: `src/core/PRACTICE-ENGINE-DOCS.md`
  - Sound: `src/core/SOUNDENGINE-DOCS.md`
  - Sheet Music: `src/components/SHEETMUSIC-USAGE.md`

---

## 🎉 You're Ready!

Your MIDI keyboard training app is now running with:

✅ MIDI input with stability buffer  
✅ Chord detection (30 types)  
✅ Practice engine with scoring  
✅ Sound engine (electric piano)  
✅ Sheet music display  
✅ Complete UI with feedback  

**Happy practicing! 🎹✨**

---

## 💡 Pro Tips

1. **Use headphones** for better audio experience
2. **Start with slow tempo** to build accuracy
3. **Watch the hold indicator** to ensure proper timing
4. **Use "Hear It" button** to learn new chords
5. **Track your streak** for motivation

---

## 🆘 Need Help?

Check the documentation files or console logs:

```javascript
// Enable debug mode
localStorage.setItem('debug', 'true');

// Check state
console.log(gameState);

// Check MIDI
console.log(midiManager.value?.getAvailableDevices());

// Check audio
console.log(soundEngine.getState());
```

---

**Built with ❤️ by expert engineers**
