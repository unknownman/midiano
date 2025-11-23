/**
 * Trainer Panel Component
 * Complete training interface with chord info, feedback, and progress
 */

<template>
  <div class="trainer-panel">
    <!-- Current Task Card -->
    <div class="card task-card" :class="{ 'lesson-start': isStarting }">
      <h2 class="task-title">{{ taskTitle }}</h2>
      
      <!-- Chord Display -->
      <div class="chord-display" :class="{ 'chord-enter': chordChanged }">
        <div class="chord-name">{{ currentChord }}</div>
        <div v-if="currentInversion" class="chord-inversion">
          {{ currentInversion }}
        </div>
      </div>
      
      <!-- Chord Diagram -->
      <div v-if="showDiagram" class="chord-diagram">
        <div class="diagram-keys">
          <div 
            v-for="note in chordNotes" 
            :key="note"
            class="diagram-key"
            :class="{ active: targetNotes.includes(note) }"
          >
            {{ midiToNoteName(note) }}
          </div>
        </div>
        
        <!-- Fingering Hint -->
        <div v-if="fingeringHint" class="fingering-hint">
          <span class="hint-label">Fingering:</span>
          <span class="hint-value">{{ fingeringHint }}</span>
        </div>
      </div>
    </div>

    <!-- Feedback Panel -->
    <transition name="feedback-slide">
      <div 
        v-if="feedback" 
        class="card feedback-card"
        :class="feedbackClass"
      >
        <div class="feedback-content">
          <span class="feedback-icon">{{ feedbackIcon }}</span>
          <div class="feedback-text">
            <p class="feedback-message">{{ feedback.message }}</p>
            <p v-if="feedback.timing !== undefined" class="feedback-detail">
              Timing: {{ feedback.timing > 0 ? '+' : '' }}{{ feedback.timing }}ms
              <span class="timing-badge" :class="feedback.rating">
                {{ feedback.rating }}
              </span>
            </p>
            <p v-if="feedback.detected" class="feedback-detail">
              Detected: <strong>{{ feedback.detected }}</strong>
            </p>
          </div>
        </div>
        
        <div class="feedback-score">
          <span class="score-label">Score</span>
          <span class="score-value">+{{ feedback.score }}</span>
        </div>
      </div>
    </transition>

    <!-- Progress Section -->
    <div class="progress-section">
      <!-- Progress Bar -->
      <div class="progress-container">
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :style="{ width: `${progressPercentage}%` }"
          ></div>
        </div>
        <p class="progress-text">
          Task {{ currentTask }} of {{ totalTasks }}
        </p>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-value">{{ currentScore }}</span>
          <span class="stat-label">Score</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ accuracy }}%</span>
          <span class="stat-label">Accuracy</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">
            <span v-if="streak > 0">🔥</span>
            {{ streak }}
          </span>
          <span class="stat-label">Streak</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ correctCount }}/{{ totalTasks }}</span>
          <span class="stat-label">Correct</span>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="action-buttons">
      <button 
        v-if="canPlayReference" 
        @click="playReference" 
        class="btn btn-secondary"
      >
        🔊 Play Reference
      </button>
      
      <button 
        v-if="canSkip" 
        @click="skipTask" 
        class="btn btn-secondary"
      >
        ⏭️ Skip
      </button>
      
      <button 
        v-if="canNext" 
        @click="nextTask" 
        class="btn btn-primary"
      >
        Next Chord →
      </button>
      
      <button 
        v-if="canComplete" 
        @click="completeSession" 
        class="btn btn-success btn-large"
      >
        ✓ Complete Session
      </button>
    </div>

    <!-- Session Complete Modal -->
    <transition name="modal-fade">
      <div v-if="showResults" class="modal-overlay" @click="closeResults">
        <div class="card results-card lesson-complete" @click.stop>
          <h2>🎉 Session Complete!</h2>
          
          <div class="stats-grid-large">
            <div class="stat-item-large">
              <span class="stat-value-large">{{ sessionStats.score }}</span>
              <span class="stat-label-large">Final Score</span>
            </div>
            <div class="stat-item-large">
              <span class="stat-value-large">{{ sessionStats.accuracy }}%</span>
              <span class="stat-label-large">Accuracy</span>
            </div>
            <div class="stat-item-large">
              <span class="stat-value-large">{{ sessionStats.correctTasks }}/{{ sessionStats.totalTasks }}</span>
              <span class="stat-label-large">Correct</span>
            </div>
            <div class="stat-item-large">
              <span class="stat-value-large">{{ sessionStats.totalTime }}s</span>
              <span class="stat-label-large">Time</span>
            </div>
          </div>
          
          <div class="action-buttons">
            <button @click="restartSession" class="btn btn-primary btn-large">
              🔄 Practice Again
            </button>
            <button @click="closeResults" class="btn btn-secondary">
              Close
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

interface Feedback {
  correct: boolean;
  message: string;
  detected?: string;
  expected?: string;
  timing?: number;
  rating?: 'perfect' | 'good' | 'okay' | 'early' | 'late';
  score: number;
}

interface SessionStats {
  score: number;
  accuracy: number;
  correctTasks: number;
  totalTasks: number;
  totalTime: number;
}

interface Props {
  currentTask: number;
  totalTasks: number;
  currentChord: string;
  currentInversion?: string;
  targetNotes: number[];
  fingeringHint?: string;
  feedback: Feedback | null;
  currentScore: number;
  correctCount: number;
  streak: number;
  sessionStats?: SessionStats;
  showResults: boolean;
  showDiagram?: boolean;
  canPlayReference?: boolean;
  canSkip?: boolean;
  canNext?: boolean;
  canComplete?: boolean;
}

interface Emits {
  (e: 'playReference'): void;
  (e: 'skipTask'): void;
  (e: 'nextTask'): void;
  (e: 'completeSession'): void;
  (e: 'restartSession'): void;
  (e: 'closeResults'): void;
}

const props = withDefaults(defineProps<Props>(), {
  showDiagram: true,
  canPlayReference: true,
  canSkip: true,
  canNext: false,
  canComplete: false
});

const emit = defineEmits<Emits>();

// Local state
const isStarting = ref(false);
const chordChanged = ref(false);

// Computed
const taskTitle = computed(() => {
  return props.currentTask === 0 ? 'Get Ready!' : 'Play this chord:';
});

const progressPercentage = computed(() => {
  return props.totalTasks > 0 ? (props.currentTask / props.totalTasks) * 100 : 0;
});

const accuracy = computed(() => {
  return props.totalTasks > 0 
    ? Math.round((props.correctCount / props.currentTask) * 100) || 0
    : 0;
});

const feedbackClass = computed(() => {
  if (!props.feedback) return '';
  return props.feedback.correct ? 'feedback-success' : 'feedback-error';
});

const feedbackIcon = computed(() => {
  if (!props.feedback) return '';
  return props.feedback.correct ? '✓' : '✗';
});

const chordNotes = computed(() => {
  // Generate visual representation of chord notes
  return props.targetNotes;
});

// Methods
function midiToNoteName(midi: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return names[midi % 12];
}

function playReference() {
  emit('playReference');
}

function skipTask() {
  emit('skipTask');
}

function nextTask() {
  emit('nextTask');
}

function completeSession() {
  emit('completeSession');
}

function restartSession() {
  emit('restartSession');
}

function closeResults() {
  emit('closeResults');
}

// Watch for chord changes
watch(() => props.currentChord, () => {
  chordChanged.value = true;
  setTimeout(() => {
    chordChanged.value = false;
  }, 500);
});

// Trigger start animation on mount
isStarting.value = true;
setTimeout(() => {
  isStarting.value = false;
}, 1000);
</script>

<style scoped>
.trainer-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
  max-width: 900px;
  margin: 0 auto;
}

/* Task Card */
.task-card {
  text-align: center;
  padding: var(--space-3xl) var(--space-xl);
  background: linear-gradient(135deg, var(--primary-900), var(--bg-secondary));
  border: 2px solid var(--primary-700);
}

.task-title {
  font-size: 1.5rem;
  margin-bottom: var(--space-lg);
  color: var(--text-secondary);
}

.chord-display {
  margin: var(--space-xl) 0;
}

.chord-name {
  font-size: clamp(2.5rem, 8vw, 4rem);
  font-weight: 800;
  background: linear-gradient(135deg, var(--primary-300), var(--primary-500));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.02em;
}

.chord-inversion {
  font-size: 1.125rem;
  color: var(--warning);
  font-weight: 600;
  margin-top: var(--space-md);
}

/* Chord Diagram */
.chord-diagram {
  margin-top: var(--space-xl);
}

.diagram-keys {
  display: flex;
  justify-content: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.diagram-key {
  padding: var(--space-md) var(--space-lg);
  background: var(--bg-tertiary);
  border: 2px solid var(--border);
  border-radius: var(--radius-md);
  font-weight: 600;
  opacity: 0.5;
  transition: all var(--motion-medium) var(--ease-spring);
}

.diagram-key.active {
  opacity: 1;
  background: var(--primary-600);
  border-color: var(--primary-400);
  color: white;
  transform: scale(1.1);
}

.fingering-hint {
  margin-top: var(--space-lg);
  padding: var(--space-md);
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  display: inline-block;
}

.hint-label {
  color: var(--text-tertiary);
  margin-right: var(--space-sm);
}

.hint-value {
  color: var(--text-primary);
  font-weight: 600;
}

/* Feedback Card */
.feedback-card {
  border-width: 2px;
}

.feedback-success {
  background: var(--success-light);
  border-color: var(--success);
}

.feedback-error {
  background: var(--error-light);
  border-color: var(--error);
}

.feedback-content {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.feedback-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.feedback-text {
  flex: 1;
}

.feedback-message {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--gray-900);
  margin-bottom: var(--space-xs);
}

.feedback-detail {
  font-size: 0.95rem;
  color: var(--gray-700);
  margin-top: var(--space-xs);
}

.timing-badge {
  display: inline-block;
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  margin-left: var(--space-sm);
}

.timing-badge.perfect { background: hsl(142, 76%, 55%); color: white; }
.timing-badge.good { background: hsl(84, 76%, 55%); color: white; }
.timing-badge.okay { background: hsl(38, 92%, 55%); color: white; }
.timing-badge.early { background: hsl(38, 92%, 55%); color: white; }
.timing-badge.late { background: hsl(280, 70%, 60%); color: white; }

.feedback-score {
  text-align: right;
}

.score-label {
  display: block;
  font-size: 0.875rem;
  color: var(--gray-600);
  margin-bottom: var(--space-xs);
}

.score-value {
  display: block;
  font-size: 2rem;
  font-weight: 700;
  color: var(--success);
}

/* Progress Section */
.progress-container {
  margin-bottom: var(--space-lg);
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary-500), var(--primary-400));
  transition: width var(--motion-slow) var(--ease-out-quad);
}

.progress-text {
  text-align: center;
  margin-top: var(--space-sm);
  font-size: 0.875rem;
  color: var(--text-tertiary);
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--space-md);
}

.stat-item {
  background: var(--bg-tertiary);
  padding: var(--space-lg);
  border-radius: var(--radius-lg);
  text-align: center;
  border: 1px solid var(--border);
}

.stat-value {
  display: block;
  font-size: 2rem;
  font-weight: 700;
  color: var(--primary-400);
}

.stat-label {
  display: block;
  font-size: 0.875rem;
  color: var(--text-tertiary);
  margin-top: var(--space-xs);
}

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: var(--space-md);
  flex-wrap: wrap;
  justify-content: center;
}

.btn-large {
  padding: var(--space-lg) var(--space-2xl);
  font-size: 1.125rem;
}

/* Results Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-xl);
}

.results-card {
  max-width: 600px;
  width: 100%;
  text-align: center;
  padding: var(--space-3xl);
}

.stats-grid-large {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--space-lg);
  margin: var(--space-2xl) 0;
}

.stat-item-large {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.stat-value-large {
  font-size: 2.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, var(--primary-300), var(--primary-500));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-label-large {
  font-size: 0.95rem;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Transitions */
.feedback-slide-enter-active,
.feedback-slide-leave-active {
  transition: all var(--motion-medium) var(--ease-spring);
}

.feedback-slide-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.feedback-slide-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity var(--motion-medium);
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .action-buttons {
    flex-direction: column;
  }
}
</style>
