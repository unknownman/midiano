/**
 * Practice Mode Logic
 * Manages chord practice sessions with task selection, feedback, and scoring
 */

import { detectChord, formatChordName } from './chordDetector.js';

/**
 * Difficulty levels with corresponding chord types
 */
export const DIFFICULTY_LEVELS = {
    beginner: {
        name: 'Beginner',
        chordTypes: ['major', 'minor'],
        roots: ['C', 'G', 'F', 'D', 'A']
    },
    intermediate: {
        name: 'Intermediate',
        chordTypes: ['major', 'minor', 'diminished', 'augmented', 'sus2', 'sus4'],
        roots: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    },
    advanced: {
        name: 'Advanced',
        chordTypes: ['major7', 'minor7', 'dominant7', 'diminished7', 'major6', 'minor6'],
        roots: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    },
    expert: {
        name: 'Expert',
        chordTypes: ['major', 'minor', 'major7', 'minor7', 'dominant7', 'diminished', 'augmented', 'diminished7'],
        roots: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
        requireInversions: true
    }
};

export class PracticeSession {
    constructor(difficulty = 'beginner', sessionLength = 10) {
        this.difficulty = difficulty;
        this.sessionLength = sessionLength;
        this.currentTaskIndex = 0;
        this.tasks = [];
        this.results = [];
        this.score = 0;
        this.startTime = null;
        this.endTime = null;

        this.generateTasks();
    }

    /**
     * Generate practice tasks based on difficulty
     */
    generateTasks() {
        const config = DIFFICULTY_LEVELS[this.difficulty];
        if (!config) {
            throw new Error(`Invalid difficulty level: ${this.difficulty}`);
        }

        this.tasks = [];
        for (let i = 0; i < this.sessionLength; i++) {
            const root = config.roots[Math.floor(Math.random() * config.roots.length)];
            const chordType = config.chordTypes[Math.floor(Math.random() * config.chordTypes.length)];

            const task = {
                id: i + 1,
                root,
                chordType,
                requireInversion: config.requireInversions ? Math.random() > 0.5 : false,
                targetInversion: config.requireInversions && Math.random() > 0.5 ?
                    Math.floor(Math.random() * 2) + 1 : 0
            };

            this.tasks.push(task);
        }
    }

    /**
     * Start the practice session
     */
    start() {
        this.startTime = Date.now();
        this.currentTaskIndex = 0;
        this.results = [];
        this.score = 0;
    }

    /**
     * Get current task
     */
    getCurrentTask() {
        if (this.currentTaskIndex >= this.tasks.length) {
            return null;
        }
        return this.tasks[this.currentTaskIndex];
    }

    /**
     * Check if played notes match the current task
     * @param {number[]} midiNotes - Array of MIDI note numbers
     * @returns {Object} Feedback object with correct, detected chord, and message
     */
    checkAnswer(midiNotes) {
        const currentTask = this.getCurrentTask();
        if (!currentTask) {
            return {
                correct: false,
                message: 'No active task'
            };
        }

        const detected = detectChord(midiNotes);

        if (!detected) {
            return {
                correct: false,
                detected: null,
                expected: formatChordName(currentTask),
                message: 'Could not detect a valid chord. Try playing at least 2 notes together.',
                confidence: 0
            };
        }

        // Check if chord type and root match
        const rootMatch = detected.root === currentTask.root;
        const typeMatch = detected.chordType === currentTask.chordType;

        // Check inversion if required
        let inversionMatch = true;
        if (currentTask.requireInversion && currentTask.targetInversion > 0) {
            inversionMatch = detected.inversion === currentTask.targetInversion;
        }

        const correct = rootMatch && typeMatch && inversionMatch;

        // Build feedback message
        let message = '';
        if (correct) {
            message = detected.confidence >= 0.95 ?
                '✓ Perfect! Exactly right!' :
                '✓ Correct! (with some extra notes)';
        } else {
            const issues = [];
            if (!rootMatch) issues.push(`wrong root (expected ${currentTask.root}, got ${detected.root})`);
            if (!typeMatch) issues.push(`wrong type (expected ${currentTask.chordType}, got ${detected.chordType})`);
            if (!inversionMatch) issues.push(`wrong inversion (expected ${currentTask.targetInversion}, got ${detected.inversion})`);
            message = `✗ Not quite. You played ${formatChordName(detected)}, but ${issues.join(', ')}.`;
        }

        // Record result
        const result = {
            taskId: currentTask.id,
            expected: currentTask,
            detected,
            correct,
            confidence: detected.confidence,
            timestamp: Date.now(),
            timeTaken: this.startTime ? Date.now() - this.startTime : 0
        };

        this.results.push(result);

        if (correct) {
            this.score += Math.round(detected.confidence * 100);
        }

        return {
            correct,
            detected: formatChordName(detected),
            expected: formatChordName(currentTask),
            message,
            confidence: detected.confidence,
            result
        };
    }

    /**
     * Move to next task
     */
    nextTask() {
        this.currentTaskIndex++;
        if (this.currentTaskIndex >= this.tasks.length) {
            this.endSession();
            return null;
        }
        return this.getCurrentTask();
    }

    /**
     * End the practice session
     */
    endSession() {
        this.endTime = Date.now();
    }

    /**
     * Get session statistics
     */
    getStats() {
        const totalTasks = this.results.length;
        const correctTasks = this.results.filter(r => r.correct).length;
        const accuracy = totalTasks > 0 ? (correctTasks / totalTasks) * 100 : 0;
        const avgConfidence = totalTasks > 0 ?
            this.results.reduce((sum, r) => sum + r.confidence, 0) / totalTasks : 0;
        const totalTime = this.endTime && this.startTime ?
            (this.endTime - this.startTime) / 1000 : 0;

        return {
            totalTasks,
            correctTasks,
            incorrectTasks: totalTasks - correctTasks,
            accuracy: Math.round(accuracy),
            avgConfidence: Math.round(avgConfidence * 100) / 100,
            score: this.score,
            maxScore: this.sessionLength * 100,
            totalTime: Math.round(totalTime),
            avgTimePerTask: totalTasks > 0 ? Math.round(totalTime / totalTasks) : 0
        };
    }

    /**
     * Check if session is complete
     */
    isComplete() {
        return this.currentTaskIndex >= this.tasks.length;
    }
}
