/**
 * Practice Engine Usage Example
 * Simulates a user playing through a 3-chord progression
 */

import { MidiInputManager } from '../midi/MidiInputManager.js';
import { PracticeEngine, PracticeState } from './PracticeEngine.js';

// ============================================================================
// MOCK LESSON PLAN (3-chord progression: C → F → G)
// ============================================================================

const mockLessonPlan = {
    metadata: {
        title: "Simple Progression",
        tempo: 120,
        ticksPerBeat: 480
    },
    phrases: [
        {
            id: "phrase-1",
            startMeasure: 1,
            endMeasure: 3,
            chords: [
                {
                    notes: [60, 64, 67],      // C Major (C, E, G)
                    noteNames: ['C', 'E', 'G'],
                    absoluteTick: 0,
                    absoluteBeat: 0,
                    absoluteTime: 0,
                    measureNumber: 1
                },
                {
                    notes: [65, 69, 72],      // F Major (F, A, C)
                    noteNames: ['F', 'A', 'C'],
                    absoluteTick: 1920,
                    absoluteBeat: 4,
                    absoluteTime: 2,
                    measureNumber: 2
                },
                {
                    notes: [67, 71, 74],      // G Major (G, B, D)
                    noteNames: ['G', 'B', 'D'],
                    absoluteTick: 3840,
                    absoluteBeat: 8,
                    absoluteTime: 4,
                    measureNumber: 3
                }
            ]
        }
    ]
};

// ============================================================================
// SETUP
// ============================================================================

async function runExample() {
    console.log('🎹 Practice Engine Example\n');
    console.log('='.repeat(60));

    // 1. Initialize MIDI Manager
    const midiManager = new MidiInputManager({ debounceDelay: 40 });

    // Note: In real app, you would call await midiManager.initialize()
    // For this example, we'll simulate MIDI events

    // 2. Create Practice Engine
    const engine = new PracticeEngine(midiManager, mockLessonPlan, {
        minHoldDuration: 500,
        autoAdvance: true,
        requirePerfectMatch: false
    });

    // 3. Subscribe to state changes
    const unsubscribe = engine.subscribe((state) => {
        console.log(`\n[${new Date().toISOString().substr(11, 12)}] STATE: ${state.state}`);

        switch (state.state) {
            case PracticeState.WAITING_FOR_INPUT:
                const target = state.session.currentTargetChord;
                console.log(`  → Waiting for: ${target.noteNames.join('-')}`);
                console.log(`  → Progress: ${state.session.currentTargetIndex + 1}/${state.session.totalChords}`);
                break;

            case PracticeState.EVALUATING:
                console.log(`  → Detected: ${state.input.detectedChord?.name || 'None'}`);
                console.log(`  → Hold duration: ${state.input.holdDuration}ms`);
                break;

            case PracticeState.SUCCESS_FEEDBACK:
                console.log(`  ✅ ${state.message}`);
                console.log(`  → Score: +${state.score} (Total: ${state.session.score})`);
                console.log(`  → Streak: ${state.session.streak} 🔥`);
                break;

            case PracticeState.FAIL_FEEDBACK:
                console.log(`  ❌ ${state.message}`);
                console.log(`  → Streak reset`);
                break;

            case PracticeState.NEXT_CHORD:
                console.log(`  → Advancing to next chord...`);
                break;

            case PracticeState.COMPLETED:
                console.log(`\n${'='.repeat(60)}`);
                console.log('🎉 SESSION COMPLETE!');
                console.log(`${'='.repeat(60)}`);
                console.log(`  Final Score: ${state.finalScore}`);
                console.log(`  Accuracy: ${state.accuracy.toFixed(1)}%`);
                console.log(`  Correct: ${state.correctChords}/${state.totalChords}`);
                console.log(`  Max Streak: ${state.maxStreak} 🔥`);
                console.log(`  Total Time: ${state.totalTime.toFixed(1)}s`);
                console.log(`  Attempts: ${state.attempts}`);
                break;
        }
    });

    // 4. Start session
    console.log('\n▶️  Starting practice session...\n');
    engine.start();

    // ============================================================================
    // SIMULATE USER PLAYING
    // ============================================================================

    await simulateUserPlaying(midiManager);

    // ============================================================================
    // CLEANUP
    // ============================================================================

    unsubscribe();
    engine.dispose();

    console.log('\n✨ Example complete!\n');
}

/**
 * Simulate user playing through the progression
 */
async function simulateUserPlaying(midiManager) {
    // Helper to simulate stable notes
    const playChord = (notes, holdTime = 600) => {
        return new Promise((resolve) => {
            // Simulate stable notes event
            midiManager['#emit']('stableNotes', {
                notes,
                velocities: notes.map(() => 100),
                timestamp: performance.now()
            });

            // Hold for specified time
            setTimeout(() => {
                // Simulate notes cleared
                midiManager['#emit']('notesCleared');

                // Wait a bit before resolving
                setTimeout(resolve, 100);
            }, holdTime);
        });
    };

    console.log('\n👤 User starts playing...\n');

    // Wait for engine to be ready
    await sleep(100);

    // ============================================================================
    // CHORD 1: C Major (PERFECT)
    // ============================================================================
    console.log('\n🎵 Playing C Major (C-E-G)...');
    await sleep(200);
    await playChord([60, 64, 67], 600); // Perfect hold
    await sleep(1200); // Wait for feedback + auto-advance

    // ============================================================================
    // CHORD 2: F Major (GOOD - slightly early)
    // ============================================================================
    console.log('\n🎵 Playing F Major (F-A-C)...');
    await sleep(100); // Play slightly early
    await playChord([65, 69, 72], 550); // Good hold
    await sleep(1200);

    // ============================================================================
    // CHORD 3: G Major (WRONG FIRST, THEN CORRECT)
    // ============================================================================
    console.log('\n🎵 Playing wrong chord first (D Major)...');
    await sleep(200);
    await playChord([62, 66, 69], 600); // D Major (wrong)
    await sleep(1200);

    console.log('\n🎵 Trying again with G Major (G-B-D)...');
    await sleep(200);
    await playChord([67, 71, 74], 600); // G Major (correct)
    await sleep(1500); // Wait for completion
}

/**
 * Sleep helper
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// ALTERNATIVE: REACT/VUE INTEGRATION EXAMPLE
// ============================================================================

/**
 * React Hook Example
 */
export function usePracticeEngine(lessonPlan) {
    const [state, setState] = React.useState(null);
    const engineRef = React.useRef(null);

    React.useEffect(() => {
        // Initialize
        const midiManager = new MidiInputManager();
        const engine = new PracticeEngine(midiManager, lessonPlan);

        engineRef.current = engine;

        // Subscribe to state changes
        const unsubscribe = engine.subscribe((newState) => {
            setState(newState);
        });

        // Initialize MIDI
        midiManager.initialize().then(() => {
            engine.start();
        });

        // Cleanup
        return () => {
            unsubscribe();
            engine.dispose();
            midiManager.dispose();
        };
    }, [lessonPlan]);

    return {
        state,
        engine: engineRef.current,
        stats: engineRef.current?.getStats(),
        skip: () => engineRef.current?.skipChord(),
        restart: () => engineRef.current?.restart(),
        pause: () => engineRef.current?.pause(),
        resume: () => engineRef.current?.resume()
    };
}

/**
 * Vue Composable Example
 */
export function usePracticeEngineVue(lessonPlan) {
    const state = ref(null);
    const engine = ref(null);
    const stats = computed(() => engine.value?.getStats());

    onMounted(async () => {
        // Initialize
        const midiManager = new MidiInputManager();
        engine.value = new PracticeEngine(midiManager, lessonPlan);

        // Subscribe to state changes
        engine.value.subscribe((newState) => {
            state.value = newState;
        });

        // Initialize MIDI
        await midiManager.initialize();
        engine.value.start();
    });

    onUnmounted(() => {
        engine.value?.dispose();
    });

    return {
        state,
        stats,
        skip: () => engine.value?.skipChord(),
        restart: () => engine.value?.restart(),
        pause: () => engine.value?.pause(),
        resume: () => engine.value?.resume()
    };
}

/**
 * React Component Example
 */
export function PracticeView({ lessonPlan }) {
    const { state, stats, skip, restart } = usePracticeEngine(lessonPlan);

    if (!state) return <div>Loading...</div>;

    return (
        <div className="practice-view">
            {/* Progress */}
            <div className="progress">
                <div className="progress-bar" style={{ width: `${(stats.correctChords / stats.totalChords) * 100}%` }} />
                <span>{stats.correctChords} / {stats.totalChords}</span>
            </div>

            {/* Current Target */}
            {state.state === 'WAITING_FOR_INPUT' && (
                <div className="target-chord">
                    <h2>Play: {state.session.currentTargetChord.noteNames.join('-')}</h2>
                </div>
            )}

            {/* Feedback */}
            {state.state === 'SUCCESS_FEEDBACK' && (
                <div className="feedback success">
                    <h2>{state.message}</h2>
                    <p>+{state.score} points</p>
                </div>
            )}

            {state.state === 'FAIL_FEEDBACK' && (
                <div className="feedback fail">
                    <h2>{state.message}</h2>
                </div>
            )}

            {/* Stats */}
            <div className="stats">
                <div>Score: {stats.score}</div>
                <div>Accuracy: {stats.accuracy}%</div>
                <div>Streak: {stats.streak} 🔥</div>
            </div>

            {/* Controls */}
            <div className="controls">
                <button onClick={skip}>Skip</button>
                <button onClick={restart}>Restart</button>
            </div>

            {/* Completion */}
            {state.state === 'COMPLETED' && (
                <div className="completion">
                    <h1>🎉 Complete!</h1>
                    <p>Final Score: {state.finalScore}</p>
                    <p>Accuracy: {state.accuracy.toFixed(1)}%</p>
                    <button onClick={restart}>Play Again</button>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// RUN EXAMPLE
// ============================================================================

// Uncomment to run:
// runExample().catch(console.error);

export { runExample };
