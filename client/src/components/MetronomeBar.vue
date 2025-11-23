/**
 * Metronome Bar Component
 * Tempo-synced visual pulse with beat markers
 */

<template>
  <div class="metronome-container">
    <div class="metronome-bar" ref="barRef">
      <!-- Moving pulse -->
      <div 
        class="metronome-pulse"
        :style="{ transform: `translateX(${pulsePosition}%)` }"
      ></div>
      
      <!-- Beat markers -->
      <div
        v-for="(position, index) in beatMarkers"
        :key="index"
        class="beat-marker"
        :class="{ active: index === activeBeat }"
        :style="{ left: `${position}%` }"
      ></div>
      
      <!-- Wave effects container -->
      <div class="wave-container"></div>
    </div>
    
    <!-- Controls -->
    <div class="metronome-controls">
      <button 
        @click="togglePlay" 
        class="btn btn-primary"
        :class="{ active: isPlaying }"
      >
        {{ isPlaying ? '⏸' : '▶' }}
      </button>
      
      <div class="bpm-control">
        <label>BPM:</label>
        <input 
          type="number" 
          v-model.number="bpm" 
          @change="updateBPM"
          min="40" 
          max="240" 
          step="1"
        />
        <input 
          type="range" 
          v-model.number="bpm" 
          @input="updateBPM"
          min="40" 
          max="240" 
          step="1"
        />
      </div>
      
      <div class="beat-display">
        <span class="current-beat">{{ currentBeat + 1 }}</span>
        <span class="separator">/</span>
        <span class="total-beats">{{ beatsPerMeasure }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useAnimationClock, useMetronomePulse } from '../composables/useAnimations';

interface Props {
  initialBPM?: number;
  beatsPerMeasure?: number;
  autoStart?: boolean;
}

interface Emits {
  (e: 'beat', beatNumber: number): void;
  (e: 'downbeat'): void;
  (e: 'bpmChange', bpm: number): void;
}

const props = withDefaults(defineProps<Props>(), {
  initialBPM: 120,
  beatsPerMeasure: 4,
  autoStart: false
});

const emit = defineEmits<Emits>();

// Refs
const barRef = ref<HTMLElement | null>(null);
const bpm = ref(props.initialBPM);

// Animation clock
const clock = useAnimationClock({
  bpm: bpm.value,
  beatsPerMeasure: props.beatsPerMeasure,
  onBeat: (beat) => {
    emit('beat', beat);
  },
  onDownbeat: () => {
    emit('downbeat');
  }
});

// Metronome pulse
const pulse = useMetronomePulse(clock);

// Computed
const isPlaying = clock.isPlaying;
const currentBeat = clock.currentBeat;
const pulsePosition = pulse.pulsePosition;
const beatMarkers = pulse.beatMarkers;
const activeBeat = pulse.activeBeat;

/**
 * Toggle play/pause
 */
function togglePlay() {
  if (isPlaying.value) {
    clock.stop();
    pulse.stop();
  } else {
    clock.start();
    pulse.start();
  }
}

/**
 * Update BPM
 */
function updateBPM() {
  clock.setBPM(bpm.value);
  emit('bpmChange', bpm.value);
}

// Auto-start if requested
onMounted(() => {
  if (props.autoStart) {
    clock.start();
    pulse.start();
  }
});

// Cleanup
onUnmounted(() => {
  clock.stop();
  pulse.stop();
});

// Expose methods
defineExpose({
  start: () => {
    clock.start();
    pulse.start();
  },
  stop: () => {
    clock.stop();
    pulse.stop();
  },
  setBPM: (newBPM: number) => {
    bpm.value = newBPM;
    updateBPM();
  }
});
</script>

<style scoped>
.metronome-container {
  width: 100%;
  padding: var(--space-lg);
  background: var(--bg-secondary);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
}

.metronome-bar {
  position: relative;
  width: 100%;
  height: 8px;
  background: linear-gradient(90deg, 
    hsla(220, 20%, 30%, 0.3) 0%, 
    hsla(220, 20%, 30%, 0.1) 100%);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: var(--space-lg);
}

.metronome-pulse {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, 
    transparent 0%, 
    hsla(45, 100%, 60%, 0.8) 50%, 
    transparent 100%);
  will-change: transform;
  transition: transform 50ms linear;
}

.beat-marker {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 4px;
  background: hsla(220, 20%, 50%, 0.5);
  border-radius: 50%;
  transition: all var(--tempo-sixteenth) var(--ease-spring);
}

.beat-marker.active {
  background: hsl(45, 100%, 60%);
  box-shadow: 0 0 20px hsl(45, 100%, 60%);
  transform: translateY(-50%) scale(2);
}

.wave-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.metronome-controls {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  flex-wrap: wrap;
}

.metronome-controls .btn {
  min-width: 60px;
  font-size: 1.25rem;
}

.metronome-controls .btn.active {
  background: var(--success);
}

.bpm-control {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  flex: 1;
}

.bpm-control label {
  font-weight: 600;
  color: var(--text-secondary);
}

.bpm-control input[type="number"] {
  width: 80px;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  text-align: center;
  font-weight: 600;
}

.bpm-control input[type="range"] {
  flex: 1;
  min-width: 150px;
}

.beat-display {
  display: flex;
  align-items: baseline;
  gap: var(--space-xs);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
}

.beat-display .current-beat {
  color: var(--primary-400);
}

.beat-display .separator {
  color: var(--text-tertiary);
}

.beat-display .total-beats {
  color: var(--text-secondary);
  font-size: 1.25rem;
}

@media (max-width: 768px) {
  .metronome-controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .bpm-control {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
