/**
 * Practice Session Composable
 * 
 * Wires together:
 * - MidiInputManager (input)
 * - PracticeEngine (game loop)
 * - Reactive state management
 * - Lifecycle management
 * 
 * @author Vue 3 Architecture Expert
 * @version 1.0.0
 */

import { ref, shallowRef, reactive, computed, onMounted, onUnmounted } from 'vue';
import { MidiInputManager } from '../midi/MidiInputManager.js';
import { PracticeEngine, PracticeState } from '../core/PracticeEngine.js';

/**
 * Practice Session Composable
 * @param {Object} lessonPlan Parsed lesson plan from MusicXMLParser
 * @param {Object} config Configuration options
 */
export function usePracticeSession(lessonPlan, config = {}) {
    // ============================================================================
    // INSTANCES (shallowRef for performance - don't need deep reactivity)
    // ============================================================================

    const midiManager = shallowRef(null);
    const practiceEngine = shallowRef(null);

    // ============================================================================
    // REACTIVE STATE
    // ============================================================================

    const gameState = reactive({
        // Session state
        state: PracticeState.IDLE,
        previousState: null,
        isInitialized: false,
        isConnected: false,

        // Current progress
        currentPhrase: null,
        currentTargetChord: null,
        currentTargetIndex: 0,
        totalChords: 0,

        // Score & stats
        score: 0,
        accuracy: 0,
        correctChords: 0,
        streak: 0,
        maxStreak: 0,
        attempts: 0,

        // Input state
        detectedChord: null,
        stableNotes: [],
        isHolding: false,
        holdDuration: 0,

        // Feedback
        feedbackMessage: '',
        feedbackType: null, // 'success' | 'fail' | null
        timingRating: null, // 'perfect' | 'good' | 'okay' | 'late' | 'miss'

        // MIDI
        midiDevices: [],
        selectedDevice: null,

        // Timing
        sessionStartTime: null,
        totalTime: 0
    });

    // ============================================================================
    // COMPUTED
    // ============================================================================

    const isPlaying = computed(() => {
        return gameState.state === PracticeState.WAITING_FOR_INPUT ||
            gameState.state === PracticeState.EVALUATING;
    });

    const isPaused = computed(() => {
        return gameState.state === PracticeState.PAUSED;
    });

    const isCompleted = computed(() => {
        return gameState.state === PracticeState.COMPLETED;
    });

    const progress = computed(() => {
        if (gameState.totalChords === 0) return 0;
        return Math.round((gameState.correctChords / gameState.totalChords) * 100);
    });

    const canStart = computed(() => {
        return gameState.isInitialized &&
            gameState.isConnected &&
            (gameState.state === PracticeState.IDLE || gameState.state === PracticeState.PAUSED);
    });

    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    /**
     * Initialize MIDI and Practice Engine
     */
    async function initialize() {
        try {
            console.log('🎹 Initializing practice session...');

            // Create MIDI manager
            midiManager.value = new MidiInputManager({
                debounceDelay: config.debounceDelay || 40
            });

            // Initialize MIDI
            const connected = await midiManager.value.initialize();
            gameState.isConnected = connected;

            // Get available devices
            gameState.midiDevices = midiManager.value.getAvailableDevices();
            if (gameState.midiDevices.length > 0) {
                gameState.selectedDevice = gameState.midiDevices[0];
            }

            // Create practice engine
            practiceEngine.value = new PracticeEngine(
                midiManager.value,
                lessonPlan,
                {
                    minHoldDuration: config.minHoldDuration || 500,
                    autoAdvance: config.autoAdvance !== false,
                    requirePerfectMatch: config.requirePerfectMatch || false
                }
            );

            // Subscribe to engine state changes
            practiceEngine.value.subscribe(handleStateChange);

            gameState.isInitialized = true;
            console.log('✅ Practice session initialized');

            return true;
        } catch (error) {
            console.error('Failed to initialize practice session:', error);
            gameState.isInitialized = false;
            gameState.isConnected = false;
            throw error;
        }
    }

    /**
     * Handle practice engine state changes
     */
    function handleStateChange(state) {
        // Update state
        gameState.state = state.state;
        gameState.previousState = state.previousState;

        // Update session data
        if (state.session) {
            gameState.currentPhrase = state.session.currentPhrase;
            gameState.currentTargetChord = state.session.currentTargetChord;
            gameState.currentTargetIndex = state.session.currentTargetIndex;
            gameState.totalChords = state.session.totalChords;
            gameState.score = state.session.score;
            gameState.correctChords = state.session.correctChords;
            gameState.streak = state.session.streak;
            gameState.maxStreak = state.session.maxStreak;
            gameState.attempts = state.session.attempts;

            // Calculate accuracy
            if (state.session.totalChords > 0) {
                gameState.accuracy = Math.round(
                    (state.session.correctChords / state.session.totalChords) * 100
                );
            }
        }

        // Update input state
        if (state.input) {
            gameState.detectedChord = state.input.detectedChord;
            gameState.stableNotes = state.input.stableNotes;
            gameState.isHolding = state.input.isHolding;
            gameState.holdDuration = state.input.holdDuration;
        }

        // Update feedback
        if (state.state === PracticeState.SUCCESS_FEEDBACK) {
            gameState.feedbackMessage = state.message || 'Correct!';
            gameState.feedbackType = 'success';
            gameState.timingRating = state.attempt?.timingRating || null;
        } else if (state.state === PracticeState.FAIL_FEEDBACK) {
            gameState.feedbackMessage = state.message || 'Try again!';
            gameState.feedbackType = 'fail';
            gameState.timingRating = null;
        } else {
            gameState.feedbackType = null;
        }

        // Update timing
        if (state.state === PracticeState.WAITING_FOR_INPUT && !gameState.sessionStartTime) {
            gameState.sessionStartTime = performance.now();
        }

        if (state.state === PracticeState.COMPLETED) {
            gameState.totalTime = state.totalTime || 0;
        }
    }

    // ============================================================================
    // SESSION CONTROL
    // ============================================================================

    /**
     * Start practice session
     */
    function startSession() {
        if (!practiceEngine.value) {
            console.warn('Practice engine not initialized');
            return;
        }

        if (!canStart.value) {
            console.warn('Cannot start session in current state');
            return;
        }

        practiceEngine.value.start();
    }

    /**
     * Pause practice session
     */
    function pauseSession() {
        if (!practiceEngine.value) return;
        practiceEngine.value.pause();
    }

    /**
     * Resume practice session
     */
    function resumeSession() {
        if (!practiceEngine.value) return;
        practiceEngine.value.resume();
    }

    /**
     * Restart practice session
     */
    function restartSession() {
        if (!practiceEngine.value) return;
        practiceEngine.value.restart();
        gameState.sessionStartTime = null;
        gameState.totalTime = 0;
    }

    /**
     * Skip current chord
     */
    function skipChord() {
        if (!practiceEngine.value) return;
        practiceEngine.value.skipChord();
    }

    // ============================================================================
    // MIDI CONTROL
    // ============================================================================

    /**
     * Connect to MIDI device
     */
    async function connectDevice(deviceId) {
        if (!midiManager.value) return;

        try {
            await midiManager.value.connect(deviceId);
            gameState.isConnected = true;

            const device = gameState.midiDevices.find(d => d.id === deviceId);
            gameState.selectedDevice = device;

            console.log(`✅ Connected to: ${device?.name}`);
        } catch (error) {
            console.error('Failed to connect to MIDI device:', error);
            gameState.isConnected = false;
        }
    }

    /**
     * Disconnect MIDI
     */
    function disconnectMidi() {
        if (!midiManager.value) return;
        midiManager.value.disconnect();
        gameState.isConnected = false;
    }

    /**
     * Refresh MIDI devices
     */
    function refreshDevices() {
        if (!midiManager.value) return;
        gameState.midiDevices = midiManager.value.getAvailableDevices();
    }

    // ============================================================================
    // LIFECYCLE
    // ============================================================================

    onMounted(async () => {
        await initialize();
    });

    onUnmounted(() => {
        // Clean up practice engine
        if (practiceEngine.value) {
            practiceEngine.value.dispose();
            practiceEngine.value = null;
        }

        // Clean up MIDI manager
        if (midiManager.value) {
            midiManager.value.dispose();
            midiManager.value = null;
        }

        console.log('✅ Practice session cleaned up');
    });

    // ============================================================================
    // RETURN API
    // ============================================================================

    return {
        // State
        gameState,

        // Computed
        isPlaying,
        isPaused,
        isCompleted,
        progress,
        canStart,

        // Session control
        startSession,
        pauseSession,
        resumeSession,
        restartSession,
        skipChord,

        // MIDI control
        connectDevice,
        disconnectMidi,
        refreshDevices,

        // Direct access (for advanced usage)
        midiManager,
        practiceEngine
    };
}
