/**
 * Interactive Piano Keyboard Component
 * 88-key piano with velocity-reactive animations
 * Melodics-style visual feedback
 */

<template>
  <div class="piano-keyboard-container">
    <!-- Particle container for effects -->
    <div class="particle-container"></div>
    
    <!-- Piano keyboard -->
    <div 
      ref="keyboardRef"
      class="piano-keyboard"
      :class="{ 'compact': compact }"
    >
      <!-- Render all 88 keys (A0 to C8) -->
      <div
        v-for="key in keys"
        :key="key.note"
        :ref="el => setKeyRef(key.note, el)"
        :class="getKeyClasses(key)"
        :style="getKeyStyle(key)"
        :data-note="key.note"
        @mousedown="handleMouseDown(key)"
        @mouseup="handleMouseUp(key)"
        @mouseleave="handleMouseUp(key)"
        @touchstart.prevent="handleMouseDown(key)"
        @touchend.prevent="handleMouseUp(key)"
      >
        <!-- Key label (note name) -->
        <span v-if="showLabels" class="key-label">
          {{ key.noteName }}
        </span>
        
        <!-- Velocity indicator -->
        <div 
          v-if="key.isPressed" 
          class="velocity-indicator"
          :style="{ height: `${(key.velocity / 127) * 100}%` }"
        ></div>
      </div>
    </div>
    
    <!-- Range selector (optional) -->
    <div v-if="showRangeSelector" class="range-selector">
      <label>
        Range:
        <select v-model="selectedRange" @change="updateRange">
          <option value="full">Full (A0-C8)</option>
          <option value="standard">Standard (C2-C7)</option>
          <option value="compact">Compact (C3-C6)</option>
        </select>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useKeyAnimation } from '../composables/useAnimations';

interface PianoKey {
  note: number;           // MIDI note number (21-108 for A0-C8)
  noteName: string;       // Note name (e.g., "C4")
  isBlack: boolean;       // Black or white key
  octave: number;         // Octave number
  position: number;       // Position in octave (0-11)
  isPressed: boolean;     // Currently pressed
  isTarget: boolean;      // Target note (preview)
  velocity: number;       // MIDI velocity (0-127)
  feedbackState: 'perfect' | 'good' | 'okay' | 'early' | 'late' | 'wrong' | null;
  left?: string;          // Left position for black keys (%)
}

interface Props {
  startNote?: number;     // Starting MIDI note (default: 21 = A0)
  endNote?: number;       // Ending MIDI note (default: 108 = C8)
  targetNotes?: number[]; // Notes to highlight as targets
  compact?: boolean;      // Compact mode (smaller keys)
  showLabels?: boolean;   // Show note labels
  showRangeSelector?: boolean; // Show range selector
  enableMouse?: boolean;  // Enable mouse/touch interaction
}

interface Emits {
  (e: 'noteOn', note: number, velocity: number): void;
  (e: 'noteOff', note: number): void;
}

const props = withDefaults(defineProps<Props>(), {
  startNote: 21,  // A0
  endNote: 108,   // C8
  targetNotes: () => [],
  compact: false,
  showLabels: true,
  showRangeSelector: false,
  enableMouse: true
});

const emit = defineEmits<Emits>();

// Refs
const keyboardRef = ref<HTMLElement | null>(null);
const keyRefs = new Map<number, HTMLElement>();
const keys = ref<PianoKey[]>([]);
const selectedRange = ref('full');

// Note names
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Black key positions in octave
const BLACK_KEYS = [1, 3, 6, 8, 10]; // C#, D#, F#, G#, A#

/**
 * Initialize keyboard keys
 */
function initializeKeys() {
  const keyList: PianoKey[] = [];
  
  // First count white keys to calculate percentages
  let whiteKeyCount = 0;
  for (let note = props.startNote; note <= props.endNote; note++) {
    const position = note % 12;
    if (!BLACK_KEYS.includes(position)) {
      whiteKeyCount++;
    }
  }
  
  let currentWhiteIndex = 0;
  
  for (let note = props.startNote; note <= props.endNote; note++) {
    const position = note % 12;
    const octave = Math.floor(note / 12) - 1;
    const noteName = NOTE_NAMES[position] + octave;
    const isBlack = BLACK_KEYS.includes(position);
    
    let left = undefined;
    if (isBlack) {
      // Position black key at the boundary of the previous white key
      // currentWhiteIndex is the index of the NEXT white key
      // So the boundary is at currentWhiteIndex
      left = `${(currentWhiteIndex / whiteKeyCount) * 100}%`;
    } else {
      currentWhiteIndex++;
    }
    
    keyList.push({
      note,
      noteName,
      isBlack,
      octave,
      position,
      isPressed: false,
      isTarget: props.targetNotes.includes(note),
      velocity: 0,
      feedbackState: null,
      left
    });
  }
  
  keys.value = keyList;
}

/**
 * Set key ref for direct DOM access
 */
function setKeyRef(note: number, el: any) {
  if (el) {
    keyRefs.set(note, el as HTMLElement);
  }
}

/**
 * Get CSS classes for key
 */
function getKeyClasses(key: PianoKey): string[] {
  const classes = ['piano-key'];
  
  classes.push(key.isBlack ? 'black' : 'white');
  
  if (key.isTarget) classes.push('target');
  if (key.isPressed) classes.push('pressed');
  if (key.feedbackState) classes.push(`feedback-${key.feedbackState}`);
  
  // Add GPU acceleration hint
  classes.push('gpu-accelerated');
  
  return classes;
}

/**
 * Get inline styles for key (velocity-reactive + positioning)
 */
function getKeyStyle(key: PianoKey): Record<string, any> {
  const style: Record<string, any> = {};
  
  // Position for black keys
  if (key.isBlack && key.left) {
    style.left = key.left;
  }
  
  if (!key.isPressed) return style;
  
  // Velocity curve
  const velocityNorm = key.velocity / 127;
  const scale = 0.95 + (velocityNorm * 0.2);
  const brightness = 0.8 + (velocityNorm * 0.7);
  const glowIntensity = velocityNorm;
  
  return {
    ...style,
    '--key-scale': scale,
    '--key-brightness': brightness,
    '--key-glow-intensity': glowIntensity
  };
}

/**
 * Handle mouse/touch down
 */
function handleMouseDown(key: PianoKey) {
  if (!props.enableMouse) return;
  
  const velocity = 100; // Default velocity for mouse
  pressKey(key.note, velocity);
}

/**
 * Handle mouse/touch up
 */
function handleMouseUp(key: PianoKey) {
  if (!props.enableMouse) return;
  
  releaseKey(key.note);
}

/**
 * Press key (from MIDI or mouse)
 */
function pressKey(note: number, velocity: number) {
  const key = keys.value.find(k => k.note === note);
  if (!key) return;
  
  key.isPressed = true;
  key.velocity = velocity;
  
  // Trigger blast effect for high velocity
  if (velocity > 100) {
    const element = keyRefs.get(note);
    if (element) {
      element.classList.add('blast');
      setTimeout(() => {
        element.classList.remove('blast');
      }, 125);
    }
  }
  
  emit('noteOn', note, velocity);
}

/**
 * Release key
 */
function releaseKey(note: number) {
  const key = keys.value.find(k => k.note === note);
  if (!key) return;
  
  key.isPressed = false;
  key.velocity = 0;
  key.feedbackState = null;
  
  emit('noteOff', note);
}

/**
 * Set target notes (preview)
 */
function setTargetNotes(notes: number[]) {
  keys.value.forEach(key => {
    key.isTarget = notes.includes(key.note);
  });
}

/**
 * Set feedback state for a key
 */
function setKeyFeedback(note: number, state: PianoKey['feedbackState']) {
  const key = keys.value.find(k => k.note === note);
  if (!key) return;
  
  key.feedbackState = state;
  
  // Auto-clear after animation
  setTimeout(() => {
    if (key.feedbackState === state) {
      key.feedbackState = null;
    }
  }, 400);
  
  // Create particle burst for perfect/good
  if (state === 'perfect' || state === 'good') {
    const element = keyRefs.get(note);
    if (element) {
      const rect = element.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      createParticleBurst(x, y, state === 'perfect' ? 12 : 8);
      
      if (state === 'perfect') {
        createRipple(x, y);
      }
    }
  }
}

/**
 * Create particle burst effect
 */
function createParticleBurst(x: number, y: number, count: number) {
  const container = document.querySelector('.particle-container');
  if (!container) return;
  
  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    particle.className = 'success-particle';
    
    const angle = (Math.PI * 2 * i) / count;
    const distance = 50 + Math.random() * 50;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;
    
    particle.style.cssText = `
      left: ${x}px;
      top: ${y}px;
      --tx: ${tx}px;
      --ty: ${ty}px;
    `;
    
    container.appendChild(particle);
    
    setTimeout(() => particle.remove(), 800);
  }
}

/**
 * Create ripple effect
 */
function createRipple(x: number, y: number) {
  const container = document.querySelector('.particle-container');
  if (!container) return;
  
  const ripple = document.createElement('div');
  ripple.className = 'success-ripple';
  ripple.style.cssText = `left: ${x}px; top: ${y}px;`;
  
  container.appendChild(ripple);
  
  setTimeout(() => ripple.remove(), 600);
}

/**
 * Update range
 */
function updateRange() {
  const ranges = {
    full: { start: 21, end: 108 },    // A0-C8
    standard: { start: 36, end: 96 }, // C2-C7
    compact: { start: 48, end: 84 }   // C3-C6
  };
  
  const range = ranges[selectedRange.value as keyof typeof ranges];
  // Would need to emit event to parent to update props
}

// Watch for target notes changes
watch(() => props.targetNotes, (newTargets) => {
  setTargetNotes(newTargets);
});

// Initialize on mount
onMounted(() => {
  initializeKeys();
});

// Expose methods for parent components
defineExpose({
  pressKey,
  releaseKey,
  setTargetNotes,
  setKeyFeedback
});
</script>

<style scoped>
.piano-keyboard-container {
  position: relative;
  width: 100%;
  padding: var(--space-xl) 0;
}

.particle-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1000;
}

.piano-keyboard {
  position: relative;
  display: flex;
  height: 200px;
  background: linear-gradient(180deg, 
    hsl(220, 20%, 15%) 0%, 
    hsl(220, 20%, 10%) 100%);
  border-radius: var(--radius-xl);
  padding: var(--space-md);
  box-shadow: var(--shadow-xl);
  overflow-x: auto;
  overflow-y: hidden;
}

.piano-keyboard.compact {
  height: 150px;
}

/* Piano Key Base Styles */
.piano-key {
  position: relative;
  cursor: pointer;
  user-select: none;
  transition: transform var(--motion-fast) var(--ease-out-quad),
              box-shadow var(--motion-fast) var(--ease-out-quad);
  will-change: transform, box-shadow, filter;
  transform-origin: center bottom;
}

/* White Keys */
.piano-key.white {
  flex: 1;
  min-width: 40px;
  height: 100%;
  background: linear-gradient(180deg, 
    hsl(0, 0%, 98%) 0%, 
    hsl(0, 0%, 92%) 100%);
  border: 1px solid hsl(220, 10%, 80%);
  border-radius: 0 0 var(--radius-sm) var(--radius-sm);
  box-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.1),
    inset 0 -2px 4px rgba(0, 0, 0, 0.05);
  margin: 0; /* Removed margin for precise alignment */
  box-sizing: border-box;
}

/* Black Keys */
.piano-key.black {
  position: absolute;
  width: 30px; /* Fixed width might be an issue on small screens, but okay for now */
  height: 60%;
  background: linear-gradient(180deg, 
    hsl(220, 20%, 20%) 0%, 
    hsl(220, 20%, 10%) 100%);
  border: 1px solid hsl(220, 20%, 5%);
  border-radius: 0 0 var(--radius-sm) var(--radius-sm);
  box-shadow: 
    0 4px 8px rgba(0, 0, 0, 0.4),
    inset 0 -2px 4px rgba(255, 255, 255, 0.1);
  z-index: 2;
  transform: translateX(-50%);
  top: 0; /* Ensure it starts from top */
}

/* Key Labels */
.key-label {
  position: absolute;
  bottom: var(--space-sm);
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.75rem;
  font-weight: 600;
  color: hsl(220, 20%, 40%);
  pointer-events: none;
}

.piano-key.black .key-label {
  color: hsl(0, 0%, 80%);
}

/* Velocity Indicator */
.velocity-indicator {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  background: linear-gradient(180deg, 
    hsla(200, 80%, 60%, 0.3) 0%, 
    hsla(200, 80%, 60%, 0.6) 100%);
  pointer-events: none;
  transition: height var(--motion-instant);
}

/* Range Selector */
.range-selector {
  margin-top: var(--space-lg);
  text-align: center;
}

.range-selector label {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  color: var(--text-secondary);
}

.range-selector select {
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
}

/* Responsive */
@media (max-width: 768px) {
  .piano-keyboard {
    height: 120px;
  }
  
  .piano-key.white {
    min-width: 30px;
  }
  
  .piano-key.black {
    width: 20px;
  }
}
</style>
