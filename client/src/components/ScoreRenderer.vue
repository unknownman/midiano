/**
 * MusicXML Score Renderer Component
 * Uses OpenSheetMusicDisplay (OSMD) for beautiful score rendering
 */

<template>
  <div class="score-renderer-container">
    <div class="score-controls">
      <button @click="loadScore" class="btn btn-secondary">
        📄 Load Score
      </button>
      
      <button v-if="scoreLoaded" @click="playScore" class="btn btn-primary">
        {{ isPlaying ? '⏸ Pause' : '▶ Play' }}
      </button>
      
      <button v-if="scoreLoaded" @click="stopScore" class="btn btn-secondary">
        ⏹ Stop
      </button>
      
      <div v-if="scoreLoaded" class="tempo-control">
        <label>Tempo:</label>
        <input 
          type="range" 
          v-model.number="tempo" 
          min="40" 
          max="200" 
          step="5"
        />
        <span>{{ tempo }} BPM</span>
      </div>
    </div>

    <!-- Score display -->
    <div 
      ref="scoreContainer" 
      class="score-display"
      :class="{ 'score-loaded': scoreLoaded }"
    ></div>

    <!-- Cursor/playback indicator -->
    <div v-if="isPlaying" class="playback-cursor" :style="cursorStyle"></div>

    <!-- Measure navigation -->
    <div v-if="scoreLoaded" class="measure-navigation">
      <button 
        @click="previousMeasure" 
        class="btn btn-secondary"
        :disabled="currentMeasure === 0"
      >
        ← Previous
      </button>
      
      <span class="measure-display">
        Measure {{ currentMeasure + 1 }} / {{ totalMeasures }}
      </span>
      
      <button 
        @click="nextMeasure" 
        class="btn btn-secondary"
        :disabled="currentMeasure >= totalMeasures - 1"
      >
        Next →
      </button>
    </div>

    <!-- Practice mode controls -->
    <div v-if="practiceMode" class="practice-controls">
      <div class="practice-info">
        <h3>Practice Mode</h3>
        <p>Measures {{ practiceRange.start + 1 }} - {{ practiceRange.end + 1 }}</p>
      </div>
      
      <div class="practice-actions">
        <button @click="loopSection" class="btn btn-primary">
          🔁 Loop Section
        </button>
        <button @click="slowDown" class="btn btn-secondary">
          🐌 Slow Down ({{ Math.round(tempo * 0.75) }} BPM)
        </button>
      </div>
    </div>

    <!-- File input (hidden) -->
    <input 
      ref="fileInput" 
      type="file" 
      accept=".xml,.musicxml,.mxl"
      @change="handleFileUpload"
      style="display: none;"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
// Note: Install with: npm install opensheetmusicdisplay
// import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';

interface Props {
  musicXMLUrl?: string;
  practiceMode?: boolean;
  autoLoad?: boolean;
}

interface Emits {
  (e: 'scoreLoaded', measures: number): void;
  (e: 'measureChange', measure: number): void;
  (e: 'noteEvent', note: number, timestamp: number): void;
}

const props = withDefaults(defineProps<Props>(), {
  practiceMode: false,
  autoLoad: false
});

const emit = defineEmits<Emits>();

// Refs
const scoreContainer = ref<HTMLElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const osmd = ref<any | null>(null);

// State
const scoreLoaded = ref(false);
const isPlaying = ref(false);
const currentMeasure = ref(0);
const totalMeasures = ref(0);
const tempo = ref(120);
const cursorPosition = ref(0);

const practiceRange = ref({
  start: 0,
  end: 4
});

// Computed
const cursorStyle = computed(() => ({
  left: `${cursorPosition.value}%`
}));

/**
 * Initialize OSMD
 */
async function initOSMD() {
  if (!scoreContainer.value) return;

  try {
    // Dynamically import OSMD (reduces initial bundle size)
    const { OpenSheetMusicDisplay } = await import('opensheetmusicdisplay');
    
    osmd.value = new OpenSheetMusicDisplay(scoreContainer.value, {
      autoResize: true,
      backend: 'svg',
      drawTitle: true,
      drawComposer: true,
      drawPartNames: true,
      drawFingerings: true,
      coloringMode: 0, // XML coloring
      defaultColorNotehead: '#1a1a2e',
      defaultColorStem: '#1a1a2e'
    });

    console.log('✅ OSMD initialized');
  } catch (error) {
    console.error('Failed to initialize OSMD:', error);
  }
}

/**
 * Load score from URL or file
 */
async function loadScore(url?: string) {
  if (!osmd.value) {
    await initOSMD();
  }

  if (url) {
    await loadFromURL(url);
  } else {
    // Trigger file input
    fileInput.value?.click();
  }
}

/**
 * Load score from URL
 */
async function loadFromURL(url: string) {
  try {
    await osmd.value.load(url);
    await osmd.value.render();
    
    scoreLoaded.value = true;
    totalMeasures.value = osmd.value.GraphicSheet.MeasureList.length;
    
    emit('scoreLoaded', totalMeasures.value);
    console.log(`✅ Score loaded: ${totalMeasures.value} measures`);
  } catch (error) {
    console.error('Failed to load score:', error);
  }
}

/**
 * Handle file upload
 */
async function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  
  if (!file) return;

  try {
    const text = await file.text();
    await osmd.value.load(text);
    await osmd.value.render();
    
    scoreLoaded.value = true;
    totalMeasures.value = osmd.value.GraphicSheet.MeasureList.length;
    
    emit('scoreLoaded', totalMeasures.value);
  } catch (error) {
    console.error('Failed to load file:', error);
  }
}

/**
 * Play score
 */
function playScore() {
  if (!osmd.value) return;

  isPlaying.value = !isPlaying.value;
  
  if (isPlaying.value) {
    startPlayback();
  } else {
    pausePlayback();
  }
}

/**
 * Stop playback
 */
function stopScore() {
  isPlaying.value = false;
  currentMeasure.value = 0;
  cursorPosition.value = 0;
  osmd.value?.cursor?.reset();
}

/**
 * Start playback with cursor
 */
function startPlayback() {
  // This is a simplified version
  // In production, integrate with Tone.js Transport
  
  const beatDuration = (60 / tempo.value) * 1000; // ms per beat
  
  const playInterval = setInterval(() => {
    if (!isPlaying.value) {
      clearInterval(playInterval);
      return;
    }
    
    // Move cursor
    osmd.value?.cursor?.next();
    
    // Update position
    cursorPosition.value += 1;
    
    // Check if end of score
    if (cursorPosition.value >= 100) {
      stopScore();
      clearInterval(playInterval);
    }
  }, beatDuration);
}

/**
 * Pause playback
 */
function pausePlayback() {
  // Pause logic
}

/**
 * Navigate to previous measure
 */
function previousMeasure() {
  if (currentMeasure.value > 0) {
    currentMeasure.value--;
    jumpToMeasure(currentMeasure.value);
  }
}

/**
 * Navigate to next measure
 */
function nextMeasure() {
  if (currentMeasure.value < totalMeasures.value - 1) {
    currentMeasure.value++;
    jumpToMeasure(currentMeasure.value);
  }
}

/**
 * Jump to specific measure
 */
function jumpToMeasure(measureIndex: number) {
  if (!osmd.value) return;
  
  osmd.value.cursor?.reset();
  
  for (let i = 0; i < measureIndex; i++) {
    osmd.value.cursor?.next();
  }
  
  emit('measureChange', measureIndex);
}

/**
 * Loop a section
 */
function loopSection() {
  // Set practice range and enable looping
  console.log(`Looping measures ${practiceRange.value.start} - ${practiceRange.value.end}`);
}

/**
 * Slow down tempo
 */
function slowDown() {
  tempo.value = Math.round(tempo.value * 0.75);
}

// Auto-load if URL provided
onMounted(async () => {
  await initOSMD();
  
  if (props.autoLoad && props.musicXMLUrl) {
    await loadFromURL(props.musicXMLUrl);
  }
});

// Cleanup
onUnmounted(() => {
  osmd.value?.clear();
});

// Expose methods
defineExpose({
  loadScore,
  playScore,
  stopScore,
  jumpToMeasure
});
</script>

<style scoped>
.score-renderer-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  padding: var(--space-xl);
  background: var(--bg-secondary);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
}

.score-controls {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.tempo-control {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-left: auto;
}

.tempo-control label {
  font-weight: 600;
  color: var(--text-secondary);
}

.tempo-control input[type="range"] {
  width: 150px;
}

.tempo-control span {
  min-width: 80px;
  font-weight: 600;
  color: var(--text-primary);
}

.score-display {
  position: relative;
  min-height: 400px;
  background: white;
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  overflow-x: auto;
  overflow-y: hidden;
}

.score-display.score-loaded {
  border: 2px solid var(--primary-500);
}

.playback-cursor {
  position: absolute;
  top: 0;
  width: 2px;
  height: 100%;
  background: var(--error);
  pointer-events: none;
  transition: left 100ms linear;
  z-index: 10;
}

.measure-navigation {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-lg);
}

.measure-display {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
  min-width: 200px;
  text-align: center;
}

.practice-controls {
  background: var(--bg-tertiary);
  padding: var(--space-lg);
  border-radius: var(--radius-lg);
  border: 2px solid var(--warning);
}

.practice-info h3 {
  margin-bottom: var(--space-sm);
  color: var(--warning);
}

.practice-info p {
  color: var(--text-secondary);
  margin-bottom: var(--space-md);
}

.practice-actions {
  display: flex;
  gap: var(--space-md);
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .score-controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .tempo-control {
    margin-left: 0;
  }
}
</style>
