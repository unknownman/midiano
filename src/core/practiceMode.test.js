import { describe, it, expect, beforeEach } from 'vitest';
import { PracticeSession, DIFFICULTY_LEVELS } from './practiceMode.js';

describe('PracticeMode', () => {
    describe('PracticeSession - Initialization', () => {
        it('should create a session with default parameters', () => {
            const session = new PracticeSession();
            expect(session.difficulty).toBe('beginner');
            expect(session.sessionLength).toBe(10);
            expect(session.tasks).toHaveLength(10);
        });

        it('should create a session with custom parameters', () => {
            const session = new PracticeSession('advanced', 5);
            expect(session.difficulty).toBe('advanced');
            expect(session.sessionLength).toBe(5);
            expect(session.tasks).toHaveLength(5);
        });

        it('should throw error for invalid difficulty', () => {
            expect(() => new PracticeSession('invalid')).toThrow();
        });
    });

    describe('PracticeSession - Task Generation', () => {
        it('should generate beginner tasks with only major/minor chords', () => {
            const session = new PracticeSession('beginner', 20);
            const chordTypes = session.tasks.map(t => t.chordType);
            const validTypes = ['major', 'minor'];

            expect(chordTypes.every(type => validTypes.includes(type))).toBe(true);
        });

        it('should generate intermediate tasks with more chord types', () => {
            const session = new PracticeSession('intermediate', 20);
            const chordTypes = new Set(session.tasks.map(t => t.chordType));

            // Should have variety
            expect(chordTypes.size).toBeGreaterThan(2);
        });

        it('should generate expert tasks with inversion requirements', () => {
            const session = new PracticeSession('expert', 20);
            const tasksWithInversions = session.tasks.filter(t => t.requireInversion);

            // At least some tasks should require inversions
            expect(tasksWithInversions.length).toBeGreaterThan(0);
        });

        it('should generate tasks with unique IDs', () => {
            const session = new PracticeSession('beginner', 10);
            const ids = session.tasks.map(t => t.id);
            const uniqueIds = new Set(ids);

            expect(uniqueIds.size).toBe(10);
        });
    });

    describe('PracticeSession - Session Flow', () => {
        let session;

        beforeEach(() => {
            session = new PracticeSession('beginner', 3);
        });

        it('should start session correctly', () => {
            session.start();
            expect(session.startTime).toBeTruthy();
            expect(session.currentTaskIndex).toBe(0);
            expect(session.results).toHaveLength(0);
            expect(session.score).toBe(0);
        });

        it('should get current task', () => {
            session.start();
            const task = session.getCurrentTask();
            expect(task).toBeTruthy();
            expect(task.id).toBe(1);
        });

        it('should move to next task', () => {
            session.start();
            const firstTask = session.getCurrentTask();
            const nextTask = session.nextTask();

            expect(nextTask.id).toBe(firstTask.id + 1);
        });

        it('should return null when session is complete', () => {
            session.start();
            session.nextTask();
            session.nextTask();
            const result = session.nextTask();

            expect(result).toBeNull();
            expect(session.isComplete()).toBe(true);
        });
    });

    describe('PracticeSession - Answer Checking', () => {
        let session;

        beforeEach(() => {
            session = new PracticeSession('beginner', 5);
            session.start();
            // Manually set first task to C major for predictable testing
            session.tasks[0] = {
                id: 1,
                root: 'C',
                chordType: 'major',
                requireInversion: false,
                targetInversion: 0
            };
        });

        it('should recognize correct chord', () => {
            const feedback = session.checkAnswer([60, 64, 67]); // C major
            expect(feedback.correct).toBe(true);
            expect(feedback.message).toContain('✓');
        });

        it('should reject incorrect chord', () => {
            const feedback = session.checkAnswer([60, 63, 67]); // C minor
            expect(feedback.correct).toBe(false);
            expect(feedback.message).toContain('✗');
        });

        it('should handle no chord detected', () => {
            const feedback = session.checkAnswer([60]); // Single note
            expect(feedback.correct).toBe(false);
            expect(feedback.message).toContain('Could not detect');
        });

        it('should update score on correct answer', () => {
            const initialScore = session.score;
            session.checkAnswer([60, 64, 67]); // C major
            expect(session.score).toBeGreaterThan(initialScore);
        });

        it('should not update score on incorrect answer', () => {
            const initialScore = session.score;
            session.checkAnswer([60, 63, 67]); // C minor (wrong)
            expect(session.score).toBe(initialScore);
        });

        it('should record result in history', () => {
            session.checkAnswer([60, 64, 67]);
            expect(session.results).toHaveLength(1);
            expect(session.results[0].taskId).toBe(1);
        });
    });

    describe('PracticeSession - Statistics', () => {
        let session;

        beforeEach(() => {
            session = new PracticeSession('beginner', 3);
            session.start();

            // Set predictable tasks
            session.tasks = [
                { id: 1, root: 'C', chordType: 'major', requireInversion: false, targetInversion: 0 },
                { id: 2, root: 'G', chordType: 'major', requireInversion: false, targetInversion: 0 },
                { id: 3, root: 'F', chordType: 'major', requireInversion: false, targetInversion: 0 }
            ];
        });

        it('should calculate accuracy correctly', () => {
            session.checkAnswer([60, 64, 67]); // Correct
            session.nextTask();
            session.checkAnswer([55, 59, 62]); // Correct (G major)
            session.nextTask();
            session.checkAnswer([60, 63, 67]); // Wrong (C minor instead of F major)
            session.nextTask();

            const stats = session.getStats();
            expect(stats.totalTasks).toBe(3);
            expect(stats.correctTasks).toBe(2);
            expect(stats.accuracy).toBe(67); // 2/3 = 66.67% rounded to 67
        });

        it('should track total time', () => {
            session.checkAnswer([60, 64, 67]);
            session.nextTask();
            session.checkAnswer([55, 59, 62]);
            session.nextTask();
            session.checkAnswer([53, 57, 60]);
            session.endSession();

            const stats = session.getStats();
            expect(stats.totalTime).toBeGreaterThan(0);
        });

        it('should calculate max score correctly', () => {
            const stats = session.getStats();
            expect(stats.maxScore).toBe(300); // 3 tasks * 100 points
        });

        it('should handle empty session stats', () => {
            const emptySession = new PracticeSession('beginner', 5);
            const stats = emptySession.getStats();

            expect(stats.totalTasks).toBe(0);
            expect(stats.accuracy).toBe(0);
            expect(stats.avgConfidence).toBe(0);
        });
    });

    describe('DIFFICULTY_LEVELS', () => {
        it('should have all required difficulty levels', () => {
            expect(DIFFICULTY_LEVELS).toHaveProperty('beginner');
            expect(DIFFICULTY_LEVELS).toHaveProperty('intermediate');
            expect(DIFFICULTY_LEVELS).toHaveProperty('advanced');
            expect(DIFFICULTY_LEVELS).toHaveProperty('expert');
        });

        it('should have increasing complexity', () => {
            const beginnerChords = DIFFICULTY_LEVELS.beginner.chordTypes.length;
            const intermediateChords = DIFFICULTY_LEVELS.intermediate.chordTypes.length;
            const advancedChords = DIFFICULTY_LEVELS.advanced.chordTypes.length;

            expect(intermediateChords).toBeGreaterThan(beginnerChords);
            expect(advancedChords).toBeGreaterThanOrEqual(beginnerChords);
        });
    });
});
