<template>
  <div class="app-container">
    <!-- Header -->
    <header class="header fade-in">
      <h1>🎹 MIDI Chord Trainer</h1>
      <p class="subtitle">Master piano chords with real-time feedback</p>
    </header>

    <!-- MIDI Connection Status -->
    <div class="card card-glass fade-in" style="animation-delay: 100ms">
      <div class="flex items-center justify-between">
        <div>
          <h3>MIDI Connection</h3>
          <p class="status-text">
            <span :class="['status-dot', connectionStatus]"></span>
            {{ connectionMessage }}
          </p>
        </div>
        <button 
          v-if="!midiConnected" 
          @click="connectMIDI" 
          class="btn btn-primary"
          :disabled="connecting"
        >
          {{ connecting ? 'Connecting...' : 'Connect MIDI' }}
        </button>
      </div>
      
      <div v-if="availableDevices.length > 0" class="device-list">
        <label for="device-select">Select Device:</label>
        <select 
          id="device-select" 
          v-model="selectedDevice" 
          class="input select"
          @change="connectToDevice"
        >
          <option value="">Choose a MIDI device...</option>
          <option v-for="device in availableDevices" :key="device" :value="device">
            {{ device }}
          </option>
        </select>
      </div>
    </div>

    <!-- Practice Mode Selection -->
    <div v-if="midiConnected && !sessionActive" class="card fade-in" style="animation-delay: 200ms">
      <h2>Start Practice Session</h2>
      
      <div class="form-group">
        <label for="difficulty">Difficulty Level</label>
        <select id="difficulty" v-model="difficulty" class="input select">
          <option value="beginner">🌱 Beginner - Major & Minor</option>
          <option value="intermediate">🎯 Intermediate - More Chord Types</option>
          <option value="advanced">🚀 Advanced - 7th Chords</option>
          <option value="expert">⭐ Expert - All Chords + Inversions</option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="session-length">Number of Chords</label>
        <input 
          id="session-length" 
          v-model.number="sessionLength" 
          type="number" 
          min="5" 
          max="50" 
          class="input"
        />
      </div>
      
      <button @click="startSession" class="btn btn-primary btn-large">
        Start Practice 🎵
      </button>
    </div>

    <!-- Active Practice Session -->
    <div v-if="sessionActive" class="practice-container fade-in">
      <!-- Progress Bar -->
      <div class="progress-container">
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :style="{ width: progressPercentage + '%' }"
          ></div>
        </div>
        <p class="progress-text">
          Task {{ currentTaskNumber }} of {{ totalTasks }}
        </p>
      </div>

      <!-- Current Task -->
      <div class="card task-card">
        <h2 class="task-title">Play this chord:</h2>
        <div class="chord-display">
          {{ currentChordName }}
        </div>
        <p v-if="currentTask?.requireInversion" class="inversion-hint">
          {{ getInversionText(currentTask.targetInversion) }}
        </p>
      </div>

      <!-- Current Notes Display -->
      <div class="card card-glass notes-display">
        <h3>Currently Playing</h3>
        <div class="notes-container">
          <div 
            v-for="note in activeNotes" 
            :key="note" 
            class="note-badge pulse"
          >
            {{ midiToNoteName(note) }}
          </div>
          <p v-if="activeNotes.length === 0" class="text-tertiary">
            Press keys on your MIDI keyboard...
          </p>
        </div>
      </div>

      <!-- Feedback -->
      <div v-if="feedback" class="card feedback-card" :class="feedbackClass">
        <div class="feedback-content">
          <span class="feedback-icon">{{ feedback.correct ? '✓' : '✗' }}</span>
          <div>
            <p class="feedback-message">{{ feedback.message }}</p>
            <p class="feedback-detail">
              Detected: <strong>{{ feedback.detected }}</strong> | 
              Expected: <strong>{{ feedback.expected }}</strong>
            </p>
          </div>
        </div>
        <button 
          v-if="feedback.correct" 
          @click="nextTask" 
          class="btn btn-success"
        >
          Next Chord →
        </button>
      </div>

      <!-- Score Display -->
      <div class="score-display">
        <div class="score-item">
          <span class="score-label">Score</span>
          <span class="score-value">{{ currentScore }}</span>
        </div>
        <div class="score-item">
          <span class="score-label">Correct</span>
          <span class="score-value">{{ correctCount }}</span>
        </div>
        <div class="score-item">
          <span class="score-label">Accuracy</span>
          <span class="score-value">{{ accuracy }}%</span>
        </div>
      </div>
    </div>

    <!-- Session Complete -->
    <div v-if="sessionComplete" class="card results-card fade-in">
      <h2>🎉 Session Complete!</h2>
      
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-value">{{ stats.score }}</span>
          <span class="stat-label">Final Score</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ stats.accuracy }}%</span>
          <span class="stat-label">Accuracy</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ stats.correctTasks }}/{{ stats.totalTasks }}</span>
          <span class="stat-label">Correct</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ stats.totalTime }}s</span>
          <span class="stat-label">Total Time</span>
        </div>
      </div>
      
      <button @click="resetSession" class="btn btn-primary btn-large">
        Practice Again 🔄
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useMIDI } from './composables/useMIDI.js';
import { PracticeSession } from './core/practiceMode.js';
import { midiToNoteName } from './core/chordDetector.js';

// MIDI Connection
const { 
  midiConnected, 
  connecting, 
  connectionMessage, 
  availableDevices,
  selectedDevice,
  activeNotes,
  connectMIDI,
  connectToDevice,
  onNotesChange
} = useMIDI();

// Practice Session State
const sessionActive = ref(false);
const sessionComplete = ref(false);
const difficulty = ref('beginner');
const sessionLength = ref(10);
const currentSession = ref(null);
const currentTask = ref(null);
const feedback = ref(null);
const currentScore = ref(0);
const correctCount = ref(0);
const stats = ref({});

// Computed Properties
const connectionStatus = computed(() => 
  midiConnected.value ? 'connected' : 'disconnected'
);

const currentTaskNumber = computed(() => 
  currentSession.value ? currentSession.value.currentTaskIndex + 1 : 0
);

const totalTasks = computed(() => 
  currentSession.value ? currentSession.value.sessionLength : 0
);

const progressPercentage = computed(() => 
  totalTasks.value > 0 ? (currentTaskNumber.value / totalTasks.value) * 100 : 0
);

const currentChordName = computed(() => {
  if (!currentTask.value) return '';
  const { root, chordType } = currentTask.value;
  return `${root} ${chordType}`;
});

const accuracy = computed(() => {
  const total = currentSession.value?.results.length || 0;
  return total > 0 ? Math.round((correctCount.value / total) * 100) : 0;
});

const feedbackClass = computed(() => 
  feedback.value?.correct ? 'feedback-success' : 'feedback-error'
);

// Methods
function startSession() {
  currentSession.value = new PracticeSession(difficulty.value, sessionLength.value);
  currentSession.value.start();
  currentTask.value = currentSession.value.getCurrentTask();
  sessionActive.value = true;
  sessionComplete.value = false;
  feedback.value = null;
  currentScore.value = 0;
  correctCount.value = 0;
}

function checkChord(notes) {
  if (!sessionActive.value || !currentSession.value || feedback.value?.correct) {
    return;
  }

  if (notes.length < 2) {
    return; // Need at least 2 notes for a chord
  }

  const result = currentSession.value.checkAnswer(notes);
  feedback.value = result;
  currentScore.value = currentSession.value.score;
  
  if (result.correct) {
    correctCount.value++;
  }
}

function nextTask() {
  feedback.value = null;
  const next = currentSession.value.nextTask();
  
  if (next) {
    currentTask.value = next;
  } else {
    // Session complete
    sessionActive.value = false;
    sessionComplete.value = true;
    stats.value = currentSession.value.getStats();
  }
}

function resetSession() {
  sessionActive.value = false;
  sessionComplete.value = false;
  currentSession.value = null;
  currentTask.value = null;
  feedback.value = null;
  currentScore.value = 0;
  correctCount.value = 0;
}

function getInversionText(inversion) {
  const texts = [
    'Play in root position',
    'Play in 1st inversion',
    'Play in 2nd inversion',
    'Play in 3rd inversion'
  ];
  return texts[inversion] || '';
}

// Watch for note changes
onNotesChange((notes) => {
  checkChord(notes);
});

onMounted(() => {
  // Auto-connect to MIDI if available
  connectMIDI();
});
</script>

<style scoped>
.app-container {
  max-width: 900px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: var(--space-2xl);
}

.subtitle {
  font-size: 1.25rem;
  color: var(--text-secondary);
  margin-top: var(--space-sm);
}

.status-text {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-top: var(--space-xs);
  font-size: 0.95rem;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.status-dot.connected {
  background: var(--success);
}

.status-dot.disconnected {
  background: var(--error);
}

.device-list {
  margin-top: var(--space-lg);
}

.device-list label {
  display: block;
  margin-bottom: var(--space-sm);
  color: var(--text-secondary);
  font-weight: 500;
}

.form-group {
  margin-bottom: var(--space-lg);
}

.form-group label {
  display: block;
  margin-bottom: var(--space-sm);
  color: var(--text-secondary);
  font-weight: 500;
}

.btn-large {
  width: 100%;
  padding: var(--space-lg) var(--space-xl);
  font-size: 1.125rem;
}

.practice-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.progress-container {
  margin-bottom: var(--space-md);
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
  transition: width var(--transition-slow);
}

.progress-text {
  text-align: center;
  margin-top: var(--space-sm);
  font-size: 0.875rem;
  color: var(--text-tertiary);
}

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
  font-size: clamp(2.5rem, 8vw, 4rem);
  font-weight: 800;
  background: linear-gradient(135deg, var(--primary-300), var(--primary-500));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: var(--space-xl) 0;
  letter-spacing: -0.02em;
}

.inversion-hint {
  font-size: 1.125rem;
  color: var(--warning);
  font-weight: 600;
  margin-top: var(--space-md);
}

.notes-display {
  min-height: 120px;
}

.notes-container {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  margin-top: var(--space-md);
}

.note-badge {
  padding: var(--space-sm) var(--space-lg);
  background: var(--primary-600);
  color: white;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 1.125rem;
  box-shadow: var(--shadow-md);
}

.feedback-card {
  border-width: 2px;
  animation: fadeIn var(--transition-base);
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

.feedback-message {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--gray-900);
  margin-bottom: var(--space-xs);
}

.feedback-detail {
  font-size: 0.95rem;
  color: var(--gray-700);
}

.score-display {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--space-md);
}

.score-item {
  background: var(--bg-tertiary);
  padding: var(--space-lg);
  border-radius: var(--radius-lg);
  text-align: center;
  border: 1px solid var(--border);
}

.score-label {
  display: block;
  font-size: 0.875rem;
  color: var(--text-tertiary);
  margin-bottom: var(--space-xs);
}

.score-value {
  display: block;
  font-size: 2rem;
  font-weight: 700;
  color: var(--primary-400);
}

.results-card {
  text-align: center;
  padding: var(--space-3xl);
  background: linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary));
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--space-lg);
  margin: var(--space-2xl) 0;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.stat-value {
  font-size: 2.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, var(--primary-300), var(--primary-500));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-label {
  font-size: 0.95rem;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

@media (max-width: 768px) {
  .chord-display {
    font-size: 2.5rem;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
