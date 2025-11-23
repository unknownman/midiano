/**
 * Practice Engine - Core Game Loop
 * 
 * Connects:
 * - MidiInputManager (input)
 * - ChordDetector (analysis)
 * - LessonPlan (targets)
 * 
 * Features:
 * - State machine (IDLE → WAITING → EVALUATING → FEEDBACK → NEXT)
 * - Hold duration validation (500ms default)
 * - Reactive state updates (subscribe pattern)
 * - Timing analysis
 * - Score calculation
 * 
 * @author Lead Frontend Engineer
 * @version 1.0.0
 */

import { MidiInputManager } from '../midi/MidiInputManager.js';
import { ChordDetector } from './ChordDetector.js';

/**
 * Practice Engine States
 */
export const PracticeState = {
    IDLE: 'IDLE',
    WAITING_FOR_INPUT: 'WAITING_FOR_INPUT',
    EVALUATING: 'EVALUATING',
    SUCCESS_FEEDBACK: 'SUCCESS_FEEDBACK',
    FAIL_FEEDBACK: 'FAIL_FEEDBACK',
    NEXT_CHORD: 'NEXT_CHORD',
    COMPLETED: 'COMPLETED',
    PAUSED: 'PAUSED'
};

/**
 * Practice Engine Class
 */
export class PracticeEngine {
    /**
     * @private
     */
    #midiManager;
    #chordDetector;
    #lessonPlan;
    #currentPhraseIndex = 0;
    #currentChordIndex = 0;
    #state = PracticeState.IDLE;
    #subscribers = new Set();

    // Configuration
    #config = {
        minHoldDuration: 500,      // ms - minimum chord hold time
        sustainTolerance: 150,     // ms - grace period for accidental finger lifts
        maxTimingError: 200,       // ms - acceptable timing error
        feedbackDuration: 1000,    // ms - how long to show feedback
        autoAdvance: true,         // auto-advance to next chord
        requirePerfectMatch: false // allow close matches
    };

    // Session state
    #sessionState = {
        startTime: null,
        currentPhrase: null,
        currentTargetChord: null,
        currentTargetIndex: 0,
        totalChords: 0,
        correctChords: 0,
        score: 0,
        streak: 0,
        maxStreak: 0,
        attempts: 0,
        history: []
    };

    // Timing state
    #timingState = {
        chordStartTime: null,
        chordHoldStart: null,
        lastEvaluationTime: null
    };

    // Current input state
    #inputState = {
        stableNotes: [],
        detectedChord: null,
        isHolding: false,
        holdDuration: 0
    };

    // Grace period state (sustain tolerance)
    #graceState = {
        isInGracePeriod: false,
        graceTimer: null,
        lastCorrectNotes: null,
        lastCorrectChord: null
    };

    /**
     * Initialize Practice Engine
     * @param {MidiInputManager} midiManager MIDI input manager
     * @param {Object} lessonPlan Parsed lesson plan
     * @param {Object} config Configuration options
     */
    constructor(midiManager, lessonPlan, config = {}) {
        this.#midiManager = midiManager;
        this.#chordDetector = new ChordDetector();
        this.#lessonPlan = lessonPlan;
        this.#config = { ...this.#config, ...config };

        // Setup MIDI listeners
        this.#setupMIDIListeners();

        // Initialize session
        this.#initializeSession();
    }

    /**
     * Setup MIDI event listeners
     * @private
     */
    #setupMIDIListeners() {
        // Listen for stable notes (after debounce)
        this.#midiManager.on('stableNotes', ({ notes }) => {
            this.#handleStableNotes(notes);
        });

        // Listen for notes cleared
        this.#midiManager.on('notesCleared', () => {
            this.#handleNotesCleared();
        });
    }

    /**
     * Initialize session
     * @private
     */
    #initializeSession() {
        if (!this.#lessonPlan.phrases || this.#lessonPlan.phrases.length === 0) {
            throw new Error('Lesson plan has no phrases');
        }

        const firstPhrase = this.#lessonPlan.phrases[0];
        const totalChords = this.#lessonPlan.phrases.reduce(
            (sum, phrase) => sum + phrase.chords.length,
            0
        );

        this.#sessionState = {
            ...this.#sessionState,
            currentPhrase: firstPhrase,
            currentTargetChord: firstPhrase.chords[0],
            currentTargetIndex: 0,
            totalChords,
            startTime: null
        };
    }

    /**
     * Start practice session
     */
    start() {
        if (this.#state !== PracticeState.IDLE && this.#state !== PracticeState.PAUSED) {
            console.warn('Session already started');
            return;
        }

        this.#sessionState.startTime = performance.now();
        this.#timingState.chordStartTime = performance.now();
        this.#setState(PracticeState.WAITING_FOR_INPUT);
    }

    /**
     * Pause practice session
     */
    pause() {
        if (this.#state === PracticeState.IDLE || this.#state === PracticeState.COMPLETED) {
            return;
        }

        this.#setState(PracticeState.PAUSED);
    }

    /**
     * Resume practice session
     */
    resume() {
        if (this.#state !== PracticeState.PAUSED) {
            return;
        }

        this.#setState(PracticeState.WAITING_FOR_INPUT);
    }

    /**
     * Handle stable notes from MIDI
     * @private
     */
    #handleStableNotes(notes) {
        if (this.#state !== PracticeState.WAITING_FOR_INPUT &&
            this.#state !== PracticeState.EVALUATING) {
            return;
        }

        // Update input state
        this.#inputState.stableNotes = notes;
        this.#inputState.detectedChord = this.#chordDetector.detectChord(notes);

        // Check if we're in EVALUATING state
        if (this.#state === PracticeState.EVALUATING) {
            // Check if notes changed during evaluation
            const notesChanged = !this.#arraysEqual(
                notes.sort((a, b) => a - b),
                (this.#graceState.lastCorrectNotes || []).sort((a, b) => a - b)
            );

            if (notesChanged) {
                // Notes changed - check if still correct
                const target = this.#sessionState.currentTargetChord;
                const isStillCorrect = this.#inputState.detectedChord &&
                    this.#checkChordMatch(target, this.#inputState.detectedChord);

                if (isStillCorrect) {
                    // Chord is still correct - cancel grace period if active
                    this.#cancelGracePeriod();

                    // Update last correct state
                    this.#graceState.lastCorrectNotes = [...notes];
                    this.#graceState.lastCorrectChord = this.#inputState.detectedChord;
                } else if (!this.#graceState.isInGracePeriod) {
                    // Chord became incorrect - start grace period
                    this.#startGracePeriod();
                }
                // If already in grace period, let it continue
            } else {
                // Notes restored to correct chord - cancel grace period
                if (this.#graceState.isInGracePeriod) {
                    const target = this.#sessionState.currentTargetChord;
                    const isCorrect = this.#inputState.detectedChord &&
                        this.#checkChordMatch(target, this.#inputState.detectedChord);

                    if (isCorrect) {
                        this.#cancelGracePeriod();
                    }
                }
            }
        }

        // Start hold timer if not already holding
        if (!this.#inputState.isHolding && notes.length > 0) {
            this.#inputState.isHolding = true;
            this.#timingState.chordHoldStart = performance.now();

            // Store initial correct state
            const target = this.#sessionState.currentTargetChord;
            if (this.#inputState.detectedChord && this.#checkChordMatch(target, this.#inputState.detectedChord)) {
                this.#graceState.lastCorrectNotes = [...notes];
                this.#graceState.lastCorrectChord = this.#inputState.detectedChord;
            }
        }

        // Update hold duration
        if (this.#inputState.isHolding) {
            this.#inputState.holdDuration = performance.now() - this.#timingState.chordHoldStart;
        }

        // Transition to evaluating
        if (this.#state === PracticeState.WAITING_FOR_INPUT) {
            this.#setState(PracticeState.EVALUATING);
        }

        // Check if held long enough (and not in grace period)
        if (this.#inputState.holdDuration >= this.#config.minHoldDuration &&
            !this.#graceState.isInGracePeriod) {
            this.#evaluateInput();
        }
    }

    /**
     * Handle notes cleared (all keys released)
     * @private
     */
    #handleNotesCleared() {
        // Cancel any active grace period
        this.#cancelGracePeriod();

        // Reset hold state
        this.#inputState.isHolding = false;
        this.#inputState.holdDuration = 0;
        this.#inputState.stableNotes = [];
        this.#inputState.detectedChord = null;

        // Reset grace state
        this.#graceState.lastCorrectNotes = null;
        this.#graceState.lastCorrectChord = null;

        // If evaluating and notes released too early, go back to waiting
        if (this.#state === PracticeState.EVALUATING) {
            this.#setState(PracticeState.WAITING_FOR_INPUT);
        }
    }

    /**
     * Start grace period (sustain tolerance)
     * @private
     */
    #startGracePeriod() {
        if (this.#graceState.isInGracePeriod) return;

        this.#graceState.isInGracePeriod = true;

        // Set timer to fail if grace period expires
        this.#graceState.graceTimer = setTimeout(() => {
            // Grace period expired - fail the attempt
            this.#handleFailure('Chord changed during hold');
            this.#cancelGracePeriod();
        }, this.#config.sustainTolerance);
    }

    /**
     * Cancel grace period
     * @private
     */
    #cancelGracePeriod() {
        if (!this.#graceState.isInGracePeriod) return;

        // Clear timer
        if (this.#graceState.graceTimer) {
            clearTimeout(this.#graceState.graceTimer);
            this.#graceState.graceTimer = null;
        }

        this.#graceState.isInGracePeriod = false;
    }

    /**
     * Evaluate user input against target
     * @private
     */
    #evaluateInput() {
        const target = this.#sessionState.currentTargetChord;
        const detected = this.#inputState.detectedChord;

        if (!detected) {
            this.#handleFailure('No chord detected');
            return;
        }

        // Check chord match
        const isCorrect = this.#checkChordMatch(target, detected);

        // Calculate timing
        const timingError = this.#calculateTimingError();
        const timingRating = this.#getTimingRating(timingError);

        // Record attempt
        const attempt = {
            targetChord: target,
            detectedChord: detected,
            correct: isCorrect,
            timingError,
            timingRating,
            holdDuration: this.#inputState.holdDuration,
            timestamp: performance.now()
        };

        this.#sessionState.attempts++;
        this.#sessionState.history.push(attempt);

        if (isCorrect) {
            this.#handleSuccess(attempt);
        } else {
            this.#handleFailure('Wrong chord', attempt);
        }
    }

    /**
     * Check if detected chord matches target
     * @private
     */
    #checkChordMatch(target, detected) {
        // Get target notes from chord
        const targetNotes = target.notes.map(n => n % 12).sort((a, b) => a - b);
        const detectedNotes = detected.notes.map(n => n % 12).sort((a, b) => a - b);

        // Perfect match
        if (this.#arraysEqual(targetNotes, detectedNotes)) {
            return true;
        }

        // Allow close matches if configured
        if (!this.#config.requirePerfectMatch) {
            // Check if detected chord contains all target notes
            const hasAllTargetNotes = targetNotes.every(note =>
                detectedNotes.includes(note)
            );

            if (hasAllTargetNotes && detected.confidence >= 0.8) {
                return true;
            }
        }

        return false;
    }

    /**
     * Calculate timing error
     * @private
     */
    #calculateTimingError() {
        const expectedTime = this.#sessionState.currentTargetChord.absoluteTime * 1000;
        const actualTime = performance.now() - this.#sessionState.startTime;
        return Math.abs(actualTime - expectedTime);
    }

    /**
     * Get timing rating
     * @private
     */
    #getTimingRating(error) {
        if (error < 50) return 'perfect';
        if (error < 100) return 'good';
        if (error < 200) return 'okay';
        if (error < 300) return 'late';
        return 'miss';
    }

    /**
     * Handle successful chord
     * @private
     */
    #handleSuccess(attempt) {
        // Update score
        const baseScore = 100;
        const timingBonus = attempt.timingRating === 'perfect' ? 50 :
            attempt.timingRating === 'good' ? 25 : 0;
        const streakBonus = this.#sessionState.streak * 10;

        const score = baseScore + timingBonus + streakBonus;

        this.#sessionState.score += score;
        this.#sessionState.correctChords++;
        this.#sessionState.streak++;
        this.#sessionState.maxStreak = Math.max(
            this.#sessionState.maxStreak,
            this.#sessionState.streak
        );

        // Transition to success feedback
        this.#setState(PracticeState.SUCCESS_FEEDBACK, {
            attempt,
            score,
            message: this.#getSuccessMessage(attempt.timingRating)
        });

        // Auto-advance after feedback duration
        if (this.#config.autoAdvance) {
            setTimeout(() => {
                this.#advanceToNextChord();
            }, this.#config.feedbackDuration);
        }
    }

    /**
     * Handle failed chord
     * @private
     */
    #handleFailure(reason, attempt = null) {
        // Reset streak
        this.#sessionState.streak = 0;

        // Transition to fail feedback
        this.#setState(PracticeState.FAIL_FEEDBACK, {
            attempt,
            reason,
            message: this.#getFailureMessage(reason, attempt)
        });

        // Return to waiting after feedback
        setTimeout(() => {
            this.#setState(PracticeState.WAITING_FOR_INPUT);
            this.#timingState.chordStartTime = performance.now();
        }, this.#config.feedbackDuration);
    }

    /**
     * Advance to next chord
     * @private
     */
    #advanceToNextChord() {
        this.#setState(PracticeState.NEXT_CHORD);

        // Move to next chord in phrase
        this.#currentChordIndex++;

        // Check if phrase complete
        if (this.#currentChordIndex >= this.#sessionState.currentPhrase.chords.length) {
            this.#advanceToNextPhrase();
            return;
        }

        // Update current target
        this.#sessionState.currentTargetChord =
            this.#sessionState.currentPhrase.chords[this.#currentChordIndex];
        this.#sessionState.currentTargetIndex++;

        // Reset timing
        this.#timingState.chordStartTime = performance.now();

        // Back to waiting
        this.#setState(PracticeState.WAITING_FOR_INPUT);
    }

    /**
     * Advance to next phrase
     * @private
     */
    #advanceToNextPhrase() {
        this.#currentPhraseIndex++;

        // Check if session complete
        if (this.#currentPhraseIndex >= this.#lessonPlan.phrases.length) {
            this.#completeSession();
            return;
        }

        // Update current phrase
        this.#currentChordIndex = 0;
        this.#sessionState.currentPhrase = this.#lessonPlan.phrases[this.#currentPhraseIndex];
        this.#sessionState.currentTargetChord = this.#sessionState.currentPhrase.chords[0];
        this.#sessionState.currentTargetIndex++;

        // Reset timing
        this.#timingState.chordStartTime = performance.now();

        // Back to waiting
        this.#setState(PracticeState.WAITING_FOR_INPUT);
    }

    /**
     * Complete session
     * @private
     */
    #completeSession() {
        const totalTime = (performance.now() - this.#sessionState.startTime) / 1000;
        const accuracy = (this.#sessionState.correctChords / this.#sessionState.totalChords) * 100;

        this.#setState(PracticeState.COMPLETED, {
            totalTime,
            accuracy,
            finalScore: this.#sessionState.score,
            correctChords: this.#sessionState.correctChords,
            totalChords: this.#sessionState.totalChords,
            maxStreak: this.#sessionState.maxStreak,
            attempts: this.#sessionState.attempts
        });
    }

    /**
     * Get success message
     * @private
     */
    #getSuccessMessage(timingRating) {
        const messages = {
            perfect: ['Perfect! 🎯', 'Excellent timing!', 'Flawless! ✨'],
            good: ['Great! 👍', 'Well done!', 'Nice! 🎵'],
            okay: ['Good! ✓', 'Keep going!', 'Not bad!']
        };

        const options = messages[timingRating] || messages.okay;
        return options[Math.floor(Math.random() * options.length)];
    }

    /**
     * Get failure message
     * @private
     */
    #getFailureMessage(reason, attempt) {
        if (reason === 'No chord detected') {
            return 'No chord detected. Try again!';
        }

        if (attempt && attempt.detectedChord) {
            return `Wrong chord. Expected ${this.#formatChordName(this.#sessionState.currentTargetChord)}, got ${attempt.detectedChord.name}`;
        }

        return 'Try again!';
    }

    /**
     * Format chord name
     * @private
     */
    #formatChordName(chord) {
        if (chord.noteNames) {
            return chord.noteNames.join('-');
        }
        return 'Unknown';
    }

    /**
     * Check array equality
     * @private
     */
    #arraysEqual(a, b) {
        return a.length === b.length && a.every((val, i) => val === b[i]);
    }

    /**
     * Set state and notify subscribers
     * @private
     */
    #setState(newState, data = {}) {
        const previousState = this.#state;
        this.#state = newState;

        const stateData = {
            state: newState,
            previousState,
            timestamp: performance.now(),
            session: { ...this.#sessionState },
            input: { ...this.#inputState },
            timing: { ...this.#timingState },
            ...data
        };

        // Notify all subscribers
        this.#subscribers.forEach(callback => {
            try {
                callback(stateData);
            } catch (error) {
                console.error('Error in state subscriber:', error);
            }
        });
    }

    /**
     * Subscribe to state changes
     * @param {Function} callback Callback function
     * @returns {Function} Unsubscribe function
     */
    subscribe(callback) {
        this.#subscribers.add(callback);

        // Return unsubscribe function
        return () => {
            this.#subscribers.delete(callback);
        };
    }

    /**
     * Get current state
     * @returns {Object} Current state
     */
    getState() {
        return {
            state: this.#state,
            session: { ...this.#sessionState },
            input: { ...this.#inputState },
            timing: { ...this.#timingState },
            config: { ...this.#config }
        };
    }

    /**
     * Get session statistics
     * @returns {Object} Session stats
     */
    getStats() {
        const totalTime = this.#sessionState.startTime
            ? (performance.now() - this.#sessionState.startTime) / 1000
            : 0;

        const accuracy = this.#sessionState.totalChords > 0
            ? (this.#sessionState.correctChords / this.#sessionState.totalChords) * 100
            : 0;

        return {
            score: this.#sessionState.score,
            accuracy: Math.round(accuracy),
            correctChords: this.#sessionState.correctChords,
            totalChords: this.#sessionState.totalChords,
            streak: this.#sessionState.streak,
            maxStreak: this.#sessionState.maxStreak,
            attempts: this.#sessionState.attempts,
            totalTime: Math.round(totalTime)
        };
    }

    /**
     * Skip current chord
     */
    skipChord() {
        if (this.#state !== PracticeState.WAITING_FOR_INPUT &&
            this.#state !== PracticeState.EVALUATING) {
            return;
        }

        this.#sessionState.streak = 0;
        this.#advanceToNextChord();
    }

    /**
     * Restart session
     */
    restart() {
        this.#currentPhraseIndex = 0;
        this.#currentChordIndex = 0;
        this.#initializeSession();
        this.#sessionState.score = 0;
        this.#sessionState.correctChords = 0;
        this.#sessionState.streak = 0;
        this.#sessionState.maxStreak = 0;
        this.#sessionState.attempts = 0;
        this.#sessionState.history = [];
        this.#setState(PracticeState.IDLE);
    }

    /**
     * Clean up
     */
    dispose() {
        this.#subscribers.clear();
        this.#setState(PracticeState.IDLE);
    }
}
