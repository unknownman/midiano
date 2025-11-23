# 🎨 Customization Guide - Make It Your Own!

## Color Themes

### Quick Theme Change

Edit `client/src/style.css`:

```css
:root {
  /* === CHANGE THESE FOR INSTANT THEME UPDATE === */
  
  /* Primary Color (main accent) */
  --primary-500: hsl(240, 75%, 55%);  /* Default: Blue */
  /* Try: 
     hsl(142, 76%, 45%)  - Green
     hsl(280, 70%, 60%)  - Purple
     hsl(0, 84%, 60%)    - Red
     hsl(200, 80%, 50%)  - Cyan
  */
  
  /* Success Color (correct answers) */
  --success: hsl(142, 76%, 45%);
  
  /* Error Color (wrong answers) */
  --error: hsl(0, 84%, 60%);
  
  /* Background Colors */
  --bg-primary: hsl(220, 18%, 12%);    /* Dark mode
  --bg-secondary: hsl(220, 16%, 16%);
  --bg-tertiary: hsl(220, 14%, 20%);
}
```

### Pre-made Themes

#### 🌊 Ocean Theme
```css
:root {
  --primary-500: hsl(200, 80%, 50%);
  --success: hsl(170, 76%, 45%);
  --error: hsl(0, 84%, 60%);
  --bg-primary: hsl(200, 30%, 10%);
  --bg-secondary: hsl(200, 25%, 14%);
}
```

#### 🌸 Sakura Theme
```css
:root {
  --primary-500: hsl(330, 70%, 60%);
  --success: hsl(142, 76%, 45%);
  --error: hsl(0, 84%, 60%);
  --bg-primary: hsl(330, 20%, 12%);
  --bg-secondary: hsl(330, 15%, 16%);
}
```

#### 🌅 Sunset Theme
```css
:root {
  --primary-500: hsl(25, 90%, 55%);
  --success: hsl(45, 100%, 50%);
  --error: hsl(0, 84%, 60%);
  --bg-primary: hsl(25, 30%, 10%);
  --bg-secondary: hsl(25, 25%, 14%);
}
```

#### 🌲 Forest Theme
```css
:root {
  --primary-500: hsl(142, 70%, 45%);
  --success: hsl(120, 76%, 45%);
  --error: hsl(0, 84%, 60%);
  --bg-primary: hsl(142, 30%, 10%);
  --bg-secondary: hsl(142, 25%, 14%);
}
```

---

## Animation Customization

### Speed Adjustments

Edit `client/src/styles/animations.css`:

```css
:root {
  /* Make animations faster */
  --motion-fast: 100ms;      /* Default: 150ms */
  --motion-medium: 200ms;    /* Default: 250ms */
  --motion-slow: 300ms;      /* Default: 350ms */
  
  /* Or slower for more dramatic effect */
  --motion-fast: 200ms;
  --motion-medium: 350ms;
  --motion-slow: 500ms;
}
```

### Particle Effects

```css
/* More particles on success */
.success-particle {
  width: 8px;    /* Default: 6px - bigger particles */
  height: 8px;
}

/* Change particle color */
.success-particle {
  background: hsl(45, 100%, 60%);  /* Gold instead of green */
}
```

### Keyboard Glow Intensity

```css
/* Stronger glow on target notes */
.piano-key.target {
  box-shadow: 
    0 0 30px hsla(200, 80%, 60%, 0.6),  /* Increase from 0.4 */
    0 0 60px hsla(200, 80%, 60%, 0.4);  /* Increase from 0.2 */
}

/* Brighter pressed keys */
.piano-key.pressed {
  filter: brightness(1.5);  /* Default: 1.2 */
}
```

---

## Sound Customization

### Change Reference Sound

Edit `client/src/audio/useAudioEngine.ts`:

```typescript
// === ELECTRIC PIANO (Current) ===
this.referenceSynth = new Tone.FMSynth({
  harmonicity: 3,
  modulationIndex: 10,
  // ...
});

// === SOFT SYNTH PAD ===
this.referenceSynth = new Tone.Synth({
  oscillator: { type: 'sine' },
  envelope: {
    attack: 0.5,
    decay: 0.2,
    sustain: 0.8,
    release: 1.0
  }
});

// === PLUCKED STRING ===
this.referenceSynth = new Tone.PluckSynth({
  attackNoise: 1,
  dampening: 4000,
  resonance: 0.7
});

// === MARIMBA ===
this.referenceSynth = new Tone.MetalSynth({
  frequency: 200,
  envelope: {
    attack: 0.001,
    decay: 0.4,
    release: 0.2
  },
  harmonicity: 5.1,
  modulationIndex: 32,
  resonance: 4000,
  octaves: 1.5
});
```

### Change User Piano Sound

```typescript
// Use different sample library
const baseUrl = 'https://your-custom-samples.com/piano/';

// Or use a synth instead of samples
this.userSampler = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: 'triangle' },
  envelope: {
    attack: 0.005,
    decay: 0.1,
    sustain: 0.3,
    release: 1
  }
});
```

### Feedback Sounds

```typescript
// Success sound - change to your preference
async playSuccess(): Promise<void> {
  const now = Tone.now();
  
  // === CURRENT: Arpeggio ===
  synth.triggerAttackRelease('C5', '16n', now);
  synth.triggerAttackRelease('E5', '16n', now + 0.1);
  synth.triggerAttackRelease('G5', '16n', now + 0.2);
  synth.triggerAttackRelease('C6', '8n', now + 0.3);
  
  // === OPTION 1: Single Chime ===
  synth.triggerAttackRelease('C6', '4n', now);
  
  // === OPTION 2: Power Chord ===
  synth.triggerAttackRelease(['C5', 'G5', 'C6'], '8n', now);
  
  // === OPTION 3: Descending ===
  synth.triggerAttackRelease('C6', '16n', now);
  synth.triggerAttackRelease('G5', '16n', now + 0.1);
  synth.triggerAttackRelease('E5', '16n', now + 0.2);
  synth.triggerAttackRelease('C5', '8n', now + 0.3);
}
```

---

## UI Customization

### Keyboard Size

Edit `client/src/components/PianoKeyboard.vue`:

```css
.piano-keyboard {
  height: 250px;  /* Default: 200px - taller keys */
}

.piano-keyboard.compact {
  height: 120px;  /* Default: 150px - smaller compact mode */
}
```

### Font Changes

Edit `client/src/style.css`:

```css
:root {
  /* Change to your preferred font */
  --font-sans: 'Poppins', 'Inter', sans-serif;
  
  /* Or use system fonts for better performance */
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Import custom font */
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
```

### Chord Display Size

Edit `client/src/components/TrainerPanel.vue`:

```css
.chord-name {
  font-size: clamp(3rem, 10vw, 5rem);  /* Default: 2.5rem, 8vw, 4rem */
}
```

---

## Advanced Customization

### Add Custom Chord Types

Edit `src/core/practiceMode.js`:

```javascript
const CHORD_POOLS = {
  custom: [
    { root: 'C', type: 'maj9' },
    { root: 'D', type: 'min11' },
    { root: 'E', type: '7#9' },
    // Add your chords here
  ]
};
```

### Change Difficulty Levels

Edit `client/src/App-Integrated.vue`:

```vue
<select id="difficulty" v-model="difficulty">
  <option value="beginner">🌱 Beginner - Triads</option>
  <option value="intermediate">🎯 Intermediate - 7ths</option>
  <option value="advanced">🚀 Advanced - Extensions</option>
  <option value="expert">⭐ Expert - Jazz Voicings</option>
  <option value="custom">🎨 Custom - Your Chords</option>
</select>
```

### Add Background Music

```typescript
// In useAudioEngine.ts
private backgroundMusic: Tone.Player;

async init() {
  // ... existing code ...
  
  // Add ambient background
  this.backgroundMusic = new Tone.Player({
    url: "https://your-music-url.com/ambient.mp3",
    loop: true,
    volume: -20  // Very quiet
  }).toDestination();
  
  this.backgroundMusic.start();
}
```

---

## Quick Customization Checklist

```
□ Choose a color theme
□ Adjust animation speeds
□ Change success/error sounds
□ Customize keyboard size
□ Update fonts
□ Add custom chords
□ Test on your MIDI keyboard
□ Save your changes
```

---

## Example: Complete Custom Theme

Here's a complete "Neon Nights" theme:

```css
/* client/src/style.css */
:root {
  /* Neon Colors */
  --primary-500: hsl(280, 100%, 60%);
  --success: hsl(120, 100%, 50%);
  --error: hsl(0, 100%, 60%);
  
  /* Dark Background */
  --bg-primary: hsl(280, 30%, 5%);
  --bg-secondary: hsl(280, 25%, 8%);
  --bg-tertiary: hsl(280, 20%, 12%);
  
  /* Neon Glow */
  --shadow-glow: 0 0 30px rgba(200, 0, 255, 0.6);
}

/* Extra neon glow on keys */
.piano-key.pressed {
  box-shadow: 
    0 0 20px hsla(280, 100%, 60%, 0.8),
    0 0 40px hsla(280, 100%, 60%, 0.4),
    0 0 60px hsla(280, 100%, 60%, 0.2);
}
```

---

**🎨 Your MIDI Trainer, Your Style!**

Experiment with these settings to create the perfect training environment for you! 🎹✨
