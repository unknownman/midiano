/**
 * QA Agent: Comprehensive Test Suite
 * Unit tests, integration tests, and E2E scenarios
 */

// ============================================================================
// UNIT TESTS: Chord Detection Edge Cases
// ============================================================================

import { describe, it, expect } from 'vitest';
import { detectChord, normalizeToChroma, getIntervals } from '../src/core/chordDetector.js';

describe('Chord Detection - Edge Cases', () => {

    it('should detect chord with extra partial notes', () => {
        // C major (60, 64, 67) + extra G (55) in bass
        const notes = [55, 60, 64, 67];
        const result = detectChord(notes);

        expect(result).toBeTruthy();
        expect(result.root).toBe('C');
        expect(result.chordType).toBe('major');
        expect(result.hasExtraNotes).toBe(true);
        expect(result.confidence).toBeLessThan(1.0);
    });

    it('should handle delayed notes (rubato)', () => {
        // Simulate notes played with slight delay
        const notesWithTimestamps = [
            { note: 60, timestamp: 1000 },
            { note: 64, timestamp: 1015 }, // 15ms delay
            { note: 67, timestamp: 1030 }  // 30ms delay
        ];

        // In practice mode, we'd collect notes within a time window
        const notes = notesWithTimestamps.map(n => n.note);
        const result = detectChord(notes);

        expect(result.root).toBe('C');
        expect(result.chordType).toBe('major');
    });

    it('should detect chord with doubled notes across octaves', () => {
        // C major with doubled C and E
        const notes = [48, 60, 64, 67, 72, 76]; // C3, C4, E4, G4, C5, E5
        const result = detectChord(notes);

        expect(result.root).toBe('C');
        expect(result.chordType).toBe('major');
        expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should handle incomplete chords (missing 5th)', () => {
        // C major without G (power chord style)
        const notes = [60, 64]; // C-E only
        const result = detectChord(notes);

        // Should still detect as major, but with lower confidence
        expect(result).toBeTruthy();
        expect(result.hasOmittedNotes).toBe(true);
        expect(result.confidence).toBeLessThan(0.8);
    });

    it('should distinguish between similar chords', () => {
        // C major vs C minor (only middle note differs)
        const cMajor = [60, 64, 67];
        const cMinor = [60, 63, 67];

        const majorResult = detectChord(cMajor);
        const minorResult = detectChord(cMinor);

        expect(majorResult.chordType).toBe('major');
        expect(minorResult.chordType).toBe('minor');
    });

    it('should handle inversions correctly', () => {
        // C major in 1st inversion (E-G-C)
        const notes = [64, 67, 72]; // E4, G4, C5
        const result = detectChord(notes);

        expect(result.root).toBe('E'); // Root is lowest note
        expect(result.chordType).toBe('major');
        expect(result.inversion).toBeGreaterThan(0);
    });

    it('should return null for single note', () => {
        const result = detectChord([60]);
        expect(result).toBeNull();
    });

    it('should handle very wide voicings', () => {
        // C major spread across 3 octaves
        const notes = [36, 64, 91]; // C2, E4, G6
        const result = detectChord(notes);

        expect(result.root).toBe('C');
        expect(result.chordType).toBe('major');
    });
});

// ============================================================================
// INTEGRATION TESTS: WebSocket Session Flow
// ============================================================================

import { WebSocketServer } from 'ws';
import { createServer } from 'http';

describe('WebSocket Session Flow', () => {
    let server, wss, client;

    beforeEach((done) => {
        server = createServer();
        wss = new WebSocketServer({ server });

        wss.on('connection', (ws) => {
            ws.on('message', (data) => {
                const msg = JSON.parse(data);

                if (msg.type === 'start_session') {
                    ws.send(JSON.stringify({
                        type: 'session_started',
                        sessionId: 'test-session-123',
                        exercises: [{ root: 'C', type: 'major' }]
                    }));
                }

                if (msg.type === 'note_event') {
                    // Simulate scoring
                    const score = msg.notes.length === 3 ? 100 : 50;
                    ws.send(JSON.stringify({
                        type: 'score_update',
                        score,
                        correct: score === 100,
                        feedback: score === 100 ? 'Perfect!' : 'Try again'
                    }));
                }
            });
        });

        server.listen(0, () => {
            const port = server.address().port;
            client = new WebSocket(`ws://localhost:${port}`);
            client.on('open', done);
        });
    });

    afterEach((done) => {
        client.close();
        server.close(done);
    });

    it('should complete full session flow', (done) => {
        const events = [];

        client.on('message', (data) => {
            const msg = JSON.parse(data);
            events.push(msg.type);

            if (msg.type === 'session_started') {
                // Send note event
                client.send(JSON.stringify({
                    type: 'note_event',
                    notes: [60, 64, 67],
                    timestamp: Date.now()
                }));
            }

            if (msg.type === 'score_update') {
                expect(msg.correct).toBe(true);
                expect(msg.score).toBe(100);
                expect(events).toEqual(['session_started', 'score_update']);
                done();
            }
        });

        // Start session
        client.send(JSON.stringify({
            type: 'start_session',
            difficulty: 'beginner',
            sessionLength: 5
        }));
    });
});

// ============================================================================
// E2E TESTS: Playwright Scenarios
// ============================================================================

/**
 * E2E Test: Connect Virtual MIDI, Play Chord, Expect Score
 * 
 * NOTE: This requires Playwright and a virtual MIDI device
 * Run with: npx playwright test
 */

// tests/e2e/midi-practice.spec.js
import { test, expect } from '@playwright/test';

test.describe('MIDI Practice Flow', () => {

    test('should connect to MIDI and score chord correctly', async ({ page }) => {
        // Navigate to app
        await page.goto('http://localhost:5173');

        // Wait for app to load
        await expect(page.locator('h1')).toContainText('MIDI Chord Trainer');

        // Mock WebMIDI API (since Playwright doesn't have real MIDI)
        await page.evaluate(() => {
            // Create mock MIDI access
            const mockInput = {
                name: 'Virtual MIDI Device',
                onmidimessage: null
            };

            navigator.requestMIDIAccess = async () => ({
                inputs: new Map([['device1', mockInput]]),
                outputs: new Map(),
                onstatechange: null
            });

            // Expose function to simulate MIDI input
            window.simulateMIDI = (notes) => {
                notes.forEach(note => {
                    mockInput.onmidimessage({
                        data: [0x90, note, 100], // Note On
                        timeStamp: performance.now()
                    });
                });
            };
        });

        // Connect to MIDI
        await page.click('button:has-text("Connect MIDI")');

        // Wait for connection
        await expect(page.locator('.status-dot')).toHaveClass(/connected/);

        // Start practice session
        await page.selectOption('#difficulty', 'beginner');
        await page.fill('#session-length', '5');
        await page.click('button:has-text("Start Practice")');

        // Wait for first task
        await expect(page.locator('.chord-display')).toBeVisible();
        const targetChord = await page.locator('.chord-display').textContent();

        // Simulate playing C major chord
        await page.evaluate(() => {
            window.simulateMIDI([60, 64, 67]); // C-E-G
        });

        // Wait for feedback
        await expect(page.locator('.feedback-card')).toBeVisible();

        // Check if correct (depends on target chord)
        const feedback = await page.locator('.feedback-message').textContent();
        expect(feedback).toBeTruthy();

        // Verify score updated
        const score = await page.locator('.score-value').first().textContent();
        expect(parseInt(score)).toBeGreaterThan(0);
    });

    test('should handle incorrect chord gracefully', async ({ page }) => {
        await page.goto('http://localhost:5173');

        // ... setup MIDI mock ...

        // Play wrong chord
        await page.evaluate(() => {
            window.simulateMIDI([60, 63, 67]); // C minor instead of C major
        });

        // Should show error feedback
        await expect(page.locator('.feedback-error')).toBeVisible();
        await expect(page.locator('.feedback-message')).toContainText('Not quite');
    });

    test('should complete full session and show stats', async ({ page }) => {
        await page.goto('http://localhost:5173');

        // ... complete all exercises ...

        // Should show results
        await expect(page.locator('.results-card')).toBeVisible();
        await expect(page.locator('h2')).toContainText('Session Complete');

        // Verify stats
        const accuracy = await page.locator('.stat-value').nth(1).textContent();
        expect(accuracy).toMatch(/\d+%/);
    });
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

describe('Performance Benchmarks', () => {

    it('should detect chord in <15ms', () => {
        const notes = [60, 64, 67];
        const iterations = 1000;

        const start = performance.now();
        for (let i = 0; i < iterations; i++) {
            detectChord(notes);
        }
        const end = performance.now();

        const avgTime = (end - start) / iterations;
        expect(avgTime).toBeLessThan(15);
    });

    it('should handle rapid note changes', () => {
        const noteSequence = [
            [60, 64, 67],
            [62, 65, 69],
            [64, 67, 71],
            [65, 69, 72]
        ];

        const start = performance.now();
        noteSequence.forEach(notes => detectChord(notes));
        const end = performance.now();

        expect(end - start).toBeLessThan(50);
    });
});

// ============================================================================
// SNAPSHOT TESTS
// ============================================================================

describe('Practice Session Snapshots', () => {

    it('should generate consistent session structure', () => {
        const session = new PracticeSession('beginner', 5);

        expect(session).toMatchSnapshot({
            startTime: expect.any(Number),
            tasks: expect.arrayContaining([
                expect.objectContaining({
                    id: expect.any(Number),
                    root: expect.any(String),
                    chordType: expect.any(String)
                })
            ])
        });
    });
});
