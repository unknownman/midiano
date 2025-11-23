/**
 * Main App Component - Integrated Melodics-Style MIDI Trainer
 * Combines all components: Piano, Metronome, Trainer Panel, Audio Engine
 */

<template>
  <div class="app-container">
    <!-- Header -->
    <header class="header fade-in">
      <h1>🎹 MIDI Keyboard Trainer</h1>
      <p class="subtitle">Master piano chords with real-time feedback</p>
    </header>

    <!-- MIDI Connection Card -->
    <div class="card card-glass fade-in" style="animation-delay: 100ms">
      <div class="flex items-center justify-between">
        <div>
          <h3>MIDI Connection</h3>
          <p class="status-text">
            <span :class="['status-dot', connectionStatus]"></span>
            {{ connectionMessage }}
            <span v-if="audioLatency > 0" class="latency-badge">
              {{ audioLatency }}ms
            </span>
          </p>
        </div>
        <button 
          v-if="!midiConnected" 
          @click="initializeApp" 
          class="btn btn-primary"
          :disabled="connecting"
        >
          {{ connecting ? 'Connecting...' : 'Connect & Start' }}
        </button>
      </div>
    </div>

    <!-- Metronome Bar (always visible when connected) -->
    <MetronomeBar
      v-if="midiConnected && showMetronome"
      :initialBPM="120"
      :beatsPerMeasure="4"
      @beat="onBeat"
      @downbeat="onDownbeat"
      @bpmChange="onBPMChange"
      class="fade-in"
      style="animation-delay: 200ms"
    />

    <!-- Session Setup (before starting) -->
    <div v-if="midiConnected && !sessionActive" class="card fade-in" style="animation-delay: 300ms">
      <h2>Start Practice Session</h2>
      
      <div class="form-grid">
        <div class="form-group">
          <label for="difficulty">Difficulty Level</label>
          <select id="difficulty" v-model="difficulty" class="input select">
            <option value="beginner">🌱 Beginner - Major & Minor</option>
            <option value="intermediate">🎯 Intermediate - 7th Chords</option>
            <option value="advanced">🚀 Advanced - Extended Chords</option>
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
      </div>
      
      <button @click="startSession" class="btn btn-primary btn-large">
        Start Practice 🎵
      </button>
    </div>

    <!-- Active Practice Session -->
    <div v-if="sessionActive" class="practice-layout fade-in">
      <!-- Trainer Panel (Chord Info + Feedback) -->
      <TrainerPanel
        :currentTask="currentTaskNumber"
        :totalTasks="totalTasks"
        :currentChord="currentChordName"
        :currentInversion="currentInversion"
        :targetNotes="targetNotes"
        :fingeringHint="fingeringHint"
        :feedback="feedback"
        :currentScore="currentScore"
        :correctCount="correctCount"
        :streak="streak"
        :sessionStats="sessionStats"
        :showResults="showResults"
        :canPlayReference="true"
        :canSkip="true"
        :canNext="canProceed"
        :canComplete="isLastTask"
        @playReference="playReferenceChord"
        @skipTask="skipCurrentTask"
        @nextTask="nextTask"
        @completeSession="completeSession"
        @restartSession="restartSession"
        @closeResults="closeResults"
      />

      <!-- Piano Keyboard -->
      <PianoKeyboard
        ref="keyboardRef"
        :startNote="36"
        :endNote="96"
        :targetNotes="targetNotes"
        :compact="false"
        :showLabels="true"
        :enableMouse="false"
        @noteOn="handleNoteOn"
        @noteOff="handleNoteOff"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import PianoKeyboard from './components/PianoKeyboard.vue';
import MetronomeBar from './components/MetronomeBar.vue';
import TrainerPanel from './components/TrainerPanel.vue';
import { useAudioEngine } from './audio/useAudioEngine';
import { PracticeSession } from './core/practiceMode.js';
import { midiToNoteName } from './core/chordDetector.js';

// Audio Engine
const audioEngine = useAudioEngine();
const audioLatency = computed(() => audioEngine.latency.value);

// MIDI State
const midiConnected = ref(false);
const connecting = ref(false);
const connectionMessage = ref('MIDI not connected');
const connectionStatus = ref('disconnected');
const availableDevices = ref<string[]>([]);
const selectedDevice = ref('');
const activeNotes = ref<Set<number>>(new Set());

// Session State
const sessionActive = ref(false);
const difficulty = ref('beginner');
const sessionLength = ref(10);
const session = ref<any>(null);
const currentTaskNumber = ref(0);
const totalTasks = ref(0);
const currentScore = ref(0);
const correctCount = ref(0);
const streak = ref(0);
const canProceed = ref(false);
const isLastTask = ref(false);
const showResults = ref(false);
const showMetronome = ref(true);

// Current Task
const currentChordName = ref('');
const currentInversion = ref('');
const targetNotes = ref<number[]>([]);
const fingeringHint = ref('');

// Feedback
const feedback = ref<any>(null);

// Session Stats
const sessionStats = ref({
  score: 0,
  accuracy: 0,
  correctTasks: 0,
  totalTasks: 0,
  totalTime: 0
});

// Refs
const keyboardRef = ref<any>(null);

// Computed
const progressPercentage = computed(() => {
  return totalTasks.value > 0 ? (currentTaskNumber.value / totalTasks.value) * 100 : 0;
});

/**
 * Initialize app (MIDI + Audio)
 */
async function initializeApp() {
  connecting.value = true;
  connectionMessage.value = 'Initializing...';
  
  try {
    // Initialize audio engine
    await audioEngine.initialize();
    console.log('✅ Audio engine ready');
    
    // Initialize MIDI
    await initWebMIDI();
    
    midiConnected.value = true;
    connectionStatus.value = 'connected';
    connectionMessage.value = 'Connected and ready!';
  } catch (error) {
    console.error('Initialization failed:', error);
    connectionMessage.value = 'Failed to initialize';
    connectionStatus.value = 'error';
  } finally {
    connecting.value = false;
  }
}

/**
 * Initialize WebMIDI
 */
async function initWebMIDI() {
  if (!navigator.requestMIDIAccess) {
    throw new Error('WebMIDI not supported');
  }

  const access = await navigator.requestMIDIAccess();
  
  // List devices
  const inputs = Array.from(access.inputs.values());
  availableDevices.value = inputs.map((input: any) => input.name);
  
  // Auto-connect to first device
  if (inputs.length > 0) {
    const firstInput = inputs[0] as any;
    firstInput.onmidimessage = handleMIDIMessage;
    selectedDevice.value = firstInput.name;
    console.log(`✅ Connected to: ${firstInput.name}`);
  }
}

/**
 * Handle MIDI message
 */
function handleMIDIMessage(event: any) {
  const [command, note, velocity] = event.data;
  const messageType = command & 0xf0;
  
  if (messageType === 0x90 && velocity > 0) {
    // Note On
    activeNotes.value.add(note);
    audioEngine.handleNoteOn(note, velocity);
    
    // Update keyboard visual
    keyboardRef.value?.pressKey(note, velocity);
    
    // Check answer if in session
    if (sessionActive.value && session.value) {
      checkAnswer();
    }
  } else if (messageType === 0x80 || (messageType === 0x90 && velocity === 0)) {
    // Note Off
    activeNotes.value.delete(note);
    audioEngine.handleNoteOff(note);
    
    // Update keyboard visual
    keyboardRef.value?.releaseKey(note);
  }
}

/**
 * Handle note on from keyboard component
 */
function handleNoteOn(note: number, velocity: number) {
  // This is for mouse/touch input (if enabled)
  activeNotes.value.add(note);
  audioEngine.handleNoteOn(note, velocity);
}

/**
 * Handle note off from keyboard component
 */
function handleNoteOff(note: number) {
  activeNotes.value.delete(note);
  audioEngine.handleNoteOff(note);
}

/**
 * Start practice session
 */
function startSession() {
  session.value = new PracticeSession(difficulty.value, sessionLength.value);
  sessionActive.value = true;
  totalTasks.value = session.value.tasks.length;
  currentTaskNumber.value = 1;
  currentScore.value = 0;
  correctCount.value = 0;
  streak.value = 0;
  
  loadCurrentTask();
}

/**
 * Load current task
 */
function loadCurrentTask() {
  const task = session.value.getCurrentTask();
  if (!task) {
    console.warn('No current task available');
    return;
  }
  
  console.log('Loading task:', task); // Debug
  
  currentChordName.value = `${task.root} ${task.chordType}`;
  currentInversion.value = task.requireInversion ? getInversionText(task.targetInversion) : '';
  targetNotes.value = task.targetNotes || [];
  fingeringHint.value = getFingeringHint(task);
  
  feedback.value = null;
  canProceed.value = false;
  isLastTask.value = session.value.currentTaskIndex >= session.value.tasks.length - 1;
  
  // Play reference chord
  setTimeout(() => {
    playReferenceChord();
  }, 500);
}

/**
 * Check answer
 */
function checkAnswer() {
  if (!session.value) return;
  
  const notes = Array.from(activeNotes.value);
  if (notes.length === 0) return;
  
  const result = session.value.checkAnswer(notes);
  
  feedback.value = {
    correct: result.correct,
    message: result.message,
    detected: result.detected,
    expected: result.expected,
    score: result.score || 0,
    rating: result.correct ? 'perfect' : null
  };
  
  // Update score
  if (result.correct) {
    currentScore.value += result.score || 100;
    correctCount.value++;
    streak.value++;
    canProceed.value = true;
    
    // Play success sound
    audioEngine.playSuccess();
    
    // Visual feedback on keyboard
    targetNotes.value.forEach(note => {
      keyboardRef.value?.setKeyFeedback(note, 'perfect');
    });
  } else {
    streak.value = 0;
    
    // Play error sound
    audioEngine.playError();
    
    // Visual feedback
    notes.forEach(note => {
      keyboardRef.value?.setKeyFeedback(note, 'wrong');
    });
  }
  
  // Play streak sound
  if (streak.value > 0 && streak.value % 3 === 0) {
    audioEngine.playStreak(streak.value);
  }
}

/**
 * Play reference chord
 */
function playReferenceChord() {
  if (targetNotes.value.length > 0) {
    audioEngine.playReferenceChord(targetNotes.value, 1.5);
  }
}

/**
 * Skip current task
 */
function skipCurrentTask() {
  nextTask();
}

/**
 * Next task
 */
function nextTask() {
  session.value.nextTask();
  
  if (session.value.isComplete) {
    completeSession();
  } else {
    currentTaskNumber.value++;
    loadCurrentTask();
  }
}

/**
 * Complete session
 */
function completeSession() {
  const stats = session.value.getStats();
  
  sessionStats.value = {
    score: currentScore.value,
    accuracy: Math.round(stats.accuracy),
    correctTasks: correctCount.value,
    totalTasks: totalTasks.value,
    totalTime: Math.round(stats.totalTime / 1000)
  };
  
  showResults.value = true;
}

/**
 * Restart session
 */
function restartSession() {
  showResults.value = false;
  sessionActive.value = false;
  session.value = null;
}

/**
 * Close results
 */
function closeResults() {
  showResults.value = false;
  sessionActive.value = false;
  session.value = null;
}

/**
 * Metronome callbacks
 */
function onBeat(beatNumber: number) {
  // Could trigger visual pulse
}

function onDownbeat() {
  // Could trigger special effect
}

function onBPMChange(bpm: number) {
  console.log('BPM changed:', bpm);
}

/**
 * Get inversion text
 */
function getInversionText(inversion: number): string {
  const texts = ['Root Position', '1st Inversion', '2nd Inversion', '3rd Inversion'];
  return texts[inversion] || '';
}

/**
 * Get fingering hint
 */
function getFingeringHint(task: any): string {
  // Simple fingering hints
  if (task.chordType === 'major' || task.chordType === 'minor') {
    return 'RH: 1-3-5';
  }
  return 'RH: 1-2-3-5';
}

// Initialize on mount
onMounted(() => {
  console.log('🎹 MIDI Keyboard Trainer loaded');
});

// Cleanup
onUnmounted(() => {
  audioEngine.engine.dispose();
});
</script>

<style scoped>
.app-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--space-xl);
  min-height: 100vh;
}

.header {
  text-align: center;
  margin-bottom: var(--space-2xl);
}

.subtitle {
  color: var(--text-secondary);
  font-size: 1.125rem;
  margin-top: var(--space-sm);
}

.status-text {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  color: var(--text-secondary);
  margin-top: var(--space-xs);
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
}

.status-dot.disconnected {
  background: var(--gray-500);
}

.status-dot.connecting {
  background: var(--warning);
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.status-dot.connected {
  background: var(--success);
}

.status-dot.error {
  background: var(--error);
}

.latency-badge {
  display: inline-block;
  padding: var(--space-xs) var(--space-sm);
  background: var(--primary-100);
  color: var(--primary-600);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 700;
  margin-left: var(--space-sm);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--space-lg);
  margin-bottom: var(--space-xl);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.form-group label {
  font-weight: 600;
  color: var(--text-secondary);
}

.btn-large {
  padding: var(--space-lg) var(--space-2xl);
  font-size: 1.125rem;
  width: 100%;
}

.practice-layout {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xl);
}

@media (max-width: 768px) {
  .app-container {
    padding: var(--space-md);
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
