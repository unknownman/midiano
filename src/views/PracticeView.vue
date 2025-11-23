<template>
  <div class="practice-view">
    <!-- Header -->
    <header class="practice-header">
      <div class="header-left">
        <h1>{{ lessonPlan.metadata?.title || 'Practice Session' }}</h1>
        <p class="composer">{{ lessonPlan.metadata?.composer }}</p>
      </div>
      
      <div class="header-right">
        <div class="score-display">
          <span class="label">Score</span>
          <span class="value">{{ gameState.score }}</span>
        </div>
        
        <div class="streak-display" :class="{ 'has-streak': gameState.streak > 0 }">
          <span class="label">Streak</span>
          <span class="value">{{ gameState.streak }} 🔥</span>
        </div>
      </div>
    </header>

    <!-- Progress Bar -->
    <div class="progress-container">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
      </div>
      <div class="progress-text">
        {{ gameState.correctChords }} / {{ gameState.totalChords }} chords
        <span v-if="gameState.accuracy > 0">({{ gameState.accuracy }}%)</span>
      </div>
    </div>

    <!-- Main Content -->
    <div class="practice-content">
      <!-- Sheet Music -->
      <div class="sheet-music-container">
        <SheetMusic 
          v-if="gameState.currentPhrase"
          :phrase="gameState.currentPhrase"
          :activeNotes="highlightedNotes"
          :highlightColor="highlightColor"
        />
        
        <div v-else class="no-score">
          <p>No score available</p>
        </div>
      </div>

      <!-- Target Chord Display -->
      <div class="target-chord-panel">
        <div v-if="isPlaying" class="target-chord">
          <h2>Play This Chord</h2>
          <div class="chord-name">
            {{ formatChordName(gameState.currentTargetChord) }}
          </div>
          
          <button 
            class="hear-it-button"
            @click="playTargetChord"
            :disabled="!soundEngineReady"
          >
            🔊 Hear It
          </button>
          
          <div v-if="gameState.isHolding" class="hold-indicator">
            <div class="hold-progress">
              <div 
                class="hold-fill" 
                :style="{ width: `${holdProgress}%` }"
              ></div>
            </div>
            <p class="hold-text">Hold... {{ gameState.holdDuration }}ms</p>
          </div>
        </div>
        
        <div v-else-if="!gameState.isInitialized" class="loading">
          <div class="spinner"></div>
          <p>Initializing...</p>
        </div>
        
        <div v-else-if="!gameState.isConnected" class="no-midi">
          <p>⚠️ No MIDI device connected</p>
          <button @click="refreshDevices" class="btn-secondary">
            Refresh Devices
          </button>
        </div>
        
        <div v-else-if="gameState.state === 'IDLE'" class="ready">
          <p>Ready to start!</p>
          <button @click="startSession" class="btn-primary">
            ▶️ Start Practice
          </button>
        </div>
      </div>

      <!-- Virtual Keyboard (Placeholder) -->
      <div class="virtual-keyboard">
        <div class="keyboard-placeholder">
          <p>Virtual Keyboard</p>
          <div class="keys">
            <div 
              v-for="note in [60, 62, 64, 65, 67, 69, 71, 72]" 
              :key="note"
              class="key"
              :class="{ 
                active: gameState.stableNotes.includes(note),
                target: isTargetNote(note)
              }"
            >
              {{ midiToNoteName(note) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Feedback Overlay -->
    <Transition name="feedback">
      <div 
        v-if="gameState.feedbackType" 
        class="feedback-overlay"
        :class="gameState.feedbackType"
      >
        <div class="feedback-content">
          <div class="feedback-icon">
            {{ gameState.feedbackType === 'success' ? '✅' : '❌' }}
          </div>
          <h2 class="feedback-message">{{ gameState.feedbackMessage }}</h2>
          <p v-if="gameState.timingRating" class="timing-rating">
            Timing: {{ gameState.timingRating }}
          </p>
        </div>
      </div>
    </Transition>

    <!-- Completion Modal -->
    <Transition name="modal">
      <div v-if="isCompleted" class="completion-modal">
        <div class="modal-content">
          <h1>🎉 Session Complete!</h1>
          
          <div class="stats-grid">
            <div class="stat">
              <span class="stat-label">Final Score</span>
              <span class="stat-value">{{ gameState.score }}</span>
            </div>
            
            <div class="stat">
              <span class="stat-label">Accuracy</span>
              <span class="stat-value">{{ gameState.accuracy }}%</span>
            </div>
            
            <div class="stat">
              <span class="stat-label">Max Streak</span>
              <span class="stat-value">{{ gameState.maxStreak }} 🔥</span>
            </div>
            
            <div class="stat">
              <span class="stat-label">Total Time</span>
              <span class="stat-value">{{ Math.round(gameState.totalTime) }}s</span>
            </div>
          </div>
          
          <div class="modal-actions">
            <button @click="restartSession" class="btn-primary">
              🔄 Play Again
            </button>
            <button @click="$router.push('/')" class="btn-secondary">
              🏠 Home
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Controls -->
    <div class="practice-controls">
      <button 
        v-if="isPlaying"
        @click="pauseSession" 
        class="btn-control"
      >
        ⏸️ Pause
      </button>
      
      <button 
        v-if="isPaused"
        @click="resumeSession" 
        class="btn-control"
      >
        ▶️ Resume
      </button>
      
      <button 
        v-if="isPlaying"
        @click="skipChord" 
        class="btn-control"
      >
        ⏭️ Skip
      </button>
      
      <button 
        @click="restartSession" 
        class="btn-control btn-danger"
      >
        🔄 Restart
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { usePracticeSession } from '../composables/usePracticeSession.js';
import SheetMusic from '../components/SheetMusic.vue';
import { SoundEngine } from '../core/SoundEngine.js';
import { parseMusicXMLToLessonPlan } from '../core/MusicXMLParser.js';

// ============================================================================
// PROPS
// ============================================================================

const props = defineProps({
  lessonPlan: {
    type: Object,
    required: true
  }
});

// ============================================================================
// COMPOSABLES
// ============================================================================

const {
  gameState,
  isPlaying,
  isPaused,
  isCompleted,
  progress,
  canStart,
  startSession,
  pauseSession,
  resumeSession,
  restartSession,
  skipChord,
  refreshDevices
} = usePracticeSession(props.lessonPlan);

// ============================================================================
// SOUND ENGINE
// ============================================================================

const soundEngine = new SoundEngine();
const soundEngineReady = ref(false);

onMounted(async () => {
  try {
    await soundEngine.initialize();
    soundEngineReady.value = true;
  } catch (error) {
    console.error('Failed to initialize sound engine:', error);
  }
});

onUnmounted(() => {
  soundEngine.dispose();
});

/**
 * Play target chord
 */
function playTargetChord() {
  if (!soundEngineReady.value || !gameState.currentTargetChord) return;
  
  const notes = gameState.currentTargetChord.notes;
  soundEngine.playNotes(notes, 1.5); // Play for 1.5 seconds
}

// ============================================================================
// COMPUTED
// ============================================================================

const highlightedNotes = computed(() => {
  if (gameState.detectedChord && gameState.isHolding) {
    // Highlight detected notes
    return gameState.stableNotes.map((note, index) => index);
  }
  return [];
});

const highlightColor = computed(() => {
  if (gameState.feedbackType === 'success') {
    return '#4CAF50'; // Green
  } else if (gameState.feedbackType === 'fail') {
    return '#ef4444'; // Red
  } else if (gameState.isHolding) {
    return '#3b82f6'; // Blue
  }
  return '#4CAF50';
});

const holdProgress = computed(() => {
  const minHold = 500; // 500ms minimum
  return Math.min((gameState.holdDuration / minHold) * 100, 100);
});

// ============================================================================
// METHODS
// ============================================================================

function formatChordName(chord) {
  if (!chord) return '';
  return chord.noteNames?.join('-') || 'Unknown';
}

function isTargetNote(midiNote) {
  if (!gameState.currentTargetChord) return false;
  return gameState.currentTargetChord.notes.includes(midiNote);
}

function midiToNoteName(midi) {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return names[midi % 12];
}
</script>

<style scoped>
.practice-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-primary, #0f172a);
  color: var(--text-primary, #f1f5f9);
}

/* Header */
.practice-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px;
  background: var(--bg-secondary, #1e293b);
  border-bottom: 1px solid var(--border-color, #334155);
}

.header-left h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
}

.composer {
  margin: 4px 0 0;
  font-size: 14px;
  color: var(--text-secondary, #94a3b8);
}

.header-right {
  display: flex;
  gap: 24px;
}

.score-display, .streak-display {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.score-display .label, .streak-display .label {
  font-size: 12px;
  color: var(--text-secondary, #94a3b8);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.score-display .value, .streak-display .value {
  font-size: 28px;
  font-weight: 700;
  color: var(--primary-500, #3b82f6);
}

.streak-display.has-streak .value {
  color: #f59e0b;
}

/* Progress */
.progress-container {
  padding: 16px 32px;
  background: var(--bg-secondary, #1e293b);
}

.progress-bar {
  height: 8px;
  background: var(--bg-tertiary, #334155);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary-500, #3b82f6), var(--primary-600, #2563eb));
  transition: width 0.3s ease;
}

.progress-text {
  margin-top: 8px;
  font-size: 14px;
  color: var(--text-secondary, #94a3b8);
  text-align: center;
}

/* Content */
.practice-content {
  flex: 1;
  display: grid;
  grid-template-columns: 2fr 1fr;
  grid-template-rows: 1fr auto;
  gap: 24px;
  padding: 24px 32px;
  overflow: hidden;
}

.sheet-music-container {
  grid-column: 1;
  grid-row: 1 / 3;
  min-height: 0;
}

.target-chord-panel {
  grid-column: 2;
  grid-row: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary, #1e293b);
  border-radius: 12px;
  padding: 32px;
}

.target-chord {
  text-align: center;
  width: 100%;
}

.target-chord h2 {
  margin: 0 0 16px;
  font-size: 18px;
  color: var(--text-secondary, #94a3b8);
}

.chord-name {
  font-size: 48px;
  font-weight: 700;
  color: var(--primary-500, #3b82f6);
  margin: 24px 0;
}

.hear-it-button {
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  background: var(--primary-500, #3b82f6);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.hear-it-button:hover:not(:disabled) {
  background: var(--primary-600, #2563eb);
  transform: translateY(-2px);
}

.hear-it-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hold-indicator {
  margin-top: 24px;
}

.hold-progress {
  height: 8px;
  background: var(--bg-tertiary, #334155);
  border-radius: 4px;
  overflow: hidden;
}

.hold-fill {
  height: 100%;
  background: var(--primary-500, #3b82f6);
  transition: width 0.1s linear;
}

.hold-text {
  margin-top: 8px;
  font-size: 14px;
  color: var(--text-secondary, #94a3b8);
}

/* Virtual Keyboard */
.virtual-keyboard {
  grid-column: 2;
  grid-row: 2;
  background: var(--bg-secondary, #1e293b);
  border-radius: 12px;
  padding: 16px;
}

.keyboard-placeholder {
  text-align: center;
}

.keyboard-placeholder p {
  margin: 0 0 12px;
  font-size: 14px;
  color: var(--text-secondary, #94a3b8);
}

.keys {
  display: flex;
  gap: 4px;
  justify-content: center;
}

.key {
  width: 40px;
  height: 60px;
  background: white;
  border: 2px solid #cbd5e1;
  border-radius: 4px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 8px;
  font-size: 12px;
  color: #1e293b;
  font-weight: 600;
  transition: all 0.2s;
}

.key.active {
  background: var(--primary-500, #3b82f6);
  border-color: var(--primary-600, #2563eb);
  color: white;
  transform: translateY(2px);
}

.key.target {
  border-color: var(--primary-500, #3b82f6);
  border-width: 3px;
}

/* Feedback Overlay */
.feedback-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.8);
  z-index: 1000;
  pointer-events: none;
}

.feedback-content {
  text-align: center;
  animation: feedbackPulse 0.5s ease;
}

.feedback-icon {
  font-size: 120px;
  margin-bottom: 24px;
}

.feedback-message {
  font-size: 48px;
  font-weight: 700;
  margin: 0;
}

.feedback-overlay.success .feedback-message {
  color: #4CAF50;
}

.feedback-overlay.fail .feedback-message {
  color: #ef4444;
}

.timing-rating {
  margin-top: 16px;
  font-size: 24px;
  color: var(--text-secondary, #94a3b8);
  text-transform: capitalize;
}

@keyframes feedbackPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

/* Completion Modal */
.completion-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.9);
  z-index: 2000;
}

.modal-content {
  background: var(--bg-secondary, #1e293b);
  border-radius: 16px;
  padding: 48px;
  max-width: 600px;
  text-align: center;
}

.modal-content h1 {
  margin: 0 0 32px;
  font-size: 36px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  margin-bottom: 32px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary, #94a3b8);
  text-transform: uppercase;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--primary-500, #3b82f6);
}

.modal-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}

/* Controls */
.practice-controls {
  display: flex;
  gap: 12px;
  justify-content: center;
  padding: 24px 32px;
  background: var(--bg-secondary, #1e293b);
  border-top: 1px solid var(--border-color, #334155);
}

.btn-control {
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  background: var(--bg-tertiary, #334155);
  color: var(--text-primary, #f1f5f9);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-control:hover {
  background: var(--bg-quaternary, #475569);
  transform: translateY(-2px);
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
}

.btn-primary {
  padding: 12px 32px;
  font-size: 18px;
  font-weight: 700;
  background: var(--primary-500, #3b82f6);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: var(--primary-600, #2563eb);
  transform: translateY(-2px);
}

.btn-secondary {
  padding: 12px 32px;
  font-size: 18px;
  font-weight: 600;
  background: var(--bg-tertiary, #334155);
  color: var(--text-primary, #f1f5f9);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: var(--bg-quaternary, #475569);
}

/* Transitions */
.feedback-enter-active, .feedback-leave-active {
  transition: opacity 0.3s;
}

.feedback-enter-from, .feedback-leave-to {
  opacity: 0;
}

.modal-enter-active, .modal-leave-active {
  transition: opacity 0.3s;
}

.modal-enter-from, .modal-leave-to {
  opacity: 0;
}

/* Loading/States */
.loading, .no-midi, .ready {
  text-align: center;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--bg-tertiary, #334155);
  border-top: 4px solid var(--primary-500, #3b82f6);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 1024px) {
  .practice-content {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto;
  }
  
  .sheet-music-container {
    grid-column: 1;
    grid-row: 1;
  }
  
  .target-chord-panel {
    grid-column: 1;
    grid-row: 2;
  }
  
  .virtual-keyboard {
    grid-column: 1;
    grid-row: 3;
  }
}
</style>
