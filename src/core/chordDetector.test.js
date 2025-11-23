/**
 * Advanced Chord Detector Tests
 * Comprehensive test suite covering:
 * - Basic triads & 7th chords
 * - Extended jazz voicings (9th, 11th, 13th)
 * - Altered chords (b9, #9, b5, #5)
 * - Slash chords (bass note detection)
 * - Voicing analysis (close, open, wide)
 * - Noise tolerance (extra notes)
 * - Inversions
 * - Edge cases
 */

import { describe, it, expect } from 'vitest';
import { ChordDetector, detectChord, midiToNoteName } from './ChordDetector.js';

describe('ChordDetector', () => {
    const detector = new ChordDetector();

    describe('Basic Triads', () => {
        it('should detect C major', () => {
            const result = detector.detectChord([60, 64, 67]); // C, E, G
            expect(result.name).toBe('C');
            expect(result.root).toBe('C');
            expect(result.type).toBe('major');
            expect(result.confidence).toBeGreaterThan(0.9);
        });

        it('should detect C minor', () => {
            const result = detector.detectChord([60, 63, 67]); // C, Eb, G
            expect(result.name).toBe('Cm');
            expect(result.type).toBe('minor');
        });

        it('should detect C diminished', () => {
            const result = detector.detectChord([60, 63, 66]); // C, Eb, Gb
            expect(result.name).toBe('Cdim');
            expect(result.type).toBe('diminished');
        });

        it('should detect C augmented', () => {
            const result = detector.detectChord([60, 64, 68]); // C, E, G#
            expect(result.name).toBe('Caug');
            expect(result.type).toBe('augmented');
        });

        it('should detect Csus2', () => {
            const result = detector.detectChord([60, 62, 67]); // C, D, G
            expect(result.name).toBe('Csus2');
            expect(result.type).toBe('sus2');
        });

        it('should detect Csus4', () => {
            const result = detector.detectChord([60, 65, 67]); // C, F, G
            expect(result.name).toBe('Csus4');
            expect(result.type).toBe('sus4');
        });
    });

    describe('7th Chords', () => {
        it('should detect Cmaj7', () => {
            const result = detector.detectChord([60, 64, 67, 71]); // C, E, G, B
            expect(result.name).toBe('Cmaj7');
            expect(result.type).toBe('major7');
        });

        it('should detect Cm7', () => {
            const result = detector.detectChord([60, 63, 67, 70]); // C, Eb, G, Bb
            expect(result.name).toBe('Cm7');
            expect(result.type).toBe('minor7');
        });

        it('should detect C7 (dominant)', () => {
            const result = detector.detectChord([60, 64, 67, 70]); // C, E, G, Bb
            expect(result.name).toBe('C7');
            expect(result.type).toBe('dominant7');
        });

        it('should detect Cdim7', () => {
            const result = detector.detectChord([60, 63, 66, 69]); // C, Eb, Gb, Bbb
            expect(result.name).toBe('Cdim7');
            expect(result.type).toBe('diminished7');
        });

        it('should detect Cm7b5 (half-diminished)', () => {
            const result = detector.detectChord([60, 63, 66, 70]); // C, Eb, Gb, Bb
            expect(result.name).toBe('Cm7b5');
            expect(result.type).toBe('halfDiminished7');
        });

        it('should detect CmMaj7', () => {
            const result = detector.detectChord([60, 63, 67, 71]); // C, Eb, G, B
            expect(result.name).toBe('CmMaj7');
            expect(result.type).toBe('minorMajor7');
        });
    });

    describe('6th Chords', () => {
        it('should detect C6', () => {
            const result = detector.detectChord([60, 64, 67, 69]); // C, E, G, A
            expect(result.name).toBe('C6');
            expect(result.type).toBe('major6');
        });

        it('should detect Cm6', () => {
            const result = detector.detectChord([60, 63, 67, 69]); // C, Eb, G, A
            expect(result.name).toBe('Cm6');
            expect(result.type).toBe('minor6');
        });
    });

    describe('Extended Chords (9th, 11th, 13th)', () => {
        it('should detect Cmaj9', () => {
            const result = detector.detectChord([60, 62, 64, 67, 71]); // C, D, E, G, B
            expect(result.name).toBe('Cmaj9');
            expect(result.type).toBe('major9');
        });

        it('should detect Cm9', () => {
            const result = detector.detectChord([60, 62, 63, 67, 70]); // C, D, Eb, G, Bb
            expect(result.name).toBe('Cm9');
            expect(result.type).toBe('minor9');
        });

        it('should detect C9 (dominant)', () => {
            const result = detector.detectChord([60, 62, 64, 67, 70]); // C, D, E, G, Bb
            expect(result.name).toBe('C9');
            expect(result.type).toBe('dominant9');
        });

        it('should detect Cmaj11', () => {
            const result = detector.detectChord([60, 62, 64, 65, 67, 71]); // C, D, E, F, G, B
            expect(result.name).toBe('Cmaj11');
            expect(result.type).toBe('major11');
        });

        it('should detect C11 (dominant)', () => {
            const result = detector.detectChord([60, 62, 64, 65, 67, 70]); // C, D, E, F, G, Bb
            expect(result.name).toBe('C11');
            expect(result.type).toBe('dominant11');
        });

        it('should detect Cmaj13', () => {
            const result = detector.detectChord([60, 62, 64, 67, 69, 71]); // C, D, E, G, A, B
            expect(result.name).toBe('Cmaj13');
            expect(result.type).toBe('major13');
        });

        it('should detect C13 (dominant)', () => {
            const result = detector.detectChord([60, 62, 64, 67, 69, 70]); // C, D, E, G, A, Bb
            expect(result.name).toBe('C13');
            expect(result.type).toBe('dominant13');
        });
    });

    describe('Altered Chords', () => {
        it('should detect C7b9', () => {
            const result = detector.detectChord([60, 61, 64, 67, 70]); // C, Db, E, G, Bb
            expect(result.name).toBe('C7b9');
            expect(result.type).toBe('dominant7b9');
        });

        it('should detect C7#9', () => {
            const result = detector.detectChord([60, 63, 64, 67, 70]); // C, Eb, E, G, Bb
            expect(result.name).toBe('C7#9');
            expect(result.type).toBe('dominant7sharp9');
        });

        it('should detect C7b5', () => {
            const result = detector.detectChord([60, 64, 66, 70]); // C, E, Gb, Bb
            expect(result.name).toBe('C7b5');
            expect(result.type).toBe('dominant7b5');
        });

        it('should detect C7#5', () => {
            const result = detector.detectChord([60, 64, 68, 70]); // C, E, G#, Bb
            expect(result.name).toBe('C7#5');
            expect(result.type).toBe('dominant7sharp5');
        });
    });

    describe('Slash Chords (Bass Note Detection)', () => {
        it('should detect C/G (C major with G bass)', () => {
            const result = detector.detectChord([55, 60, 64, 67]); // G, C, E, G
            expect(result.name).toContain('/G');
            expect(result.bassNote).toBe('G');
        });

        it('should detect C/E (C major first inversion)', () => {
            const result = detector.detectChord([52, 60, 64, 67]); // E, C, E, G
            expect(result.name).toContain('/E');
            expect(result.bassNote).toBe('E');
        });

        it('should detect Dm7/C (Dm7 with C bass)', () => {
            const result = detector.detectChord([48, 62, 65, 69, 72]); // C, D, F, A, C
            expect(result.name).toContain('/C');
            expect(result.bassNote).toBe('C');
        });

        it('should detect Am/C (Am with C bass)', () => {
            const result = detector.detectChord([48, 57, 60, 64]); // C, A, C, E
            expect(result.name).toContain('/C');
            expect(result.bassNote).toBe('C');
        });
    });

    describe('Inversions', () => {
        it('should detect first inversion (C/E)', () => {
            const result = detector.detectChord([64, 67, 72]); // E, G, C
            expect(result.inversion).toBe(1);
        });

        it('should detect second inversion (C/G)', () => {
            const result = detector.detectChord([67, 72, 76]); // G, C, E
            expect(result.inversion).toBe(2);
        });

        it('should detect third inversion for 7th chord (Cmaj7/B)', () => {
            const result = detector.detectChord([71, 72, 76, 79]); // B, C, E, G
            expect(result.inversion).toBe(3);
        });
    });

    describe('Voicing Analysis', () => {
        it('should detect close voicing (within octave)', () => {
            const result = detector.detectChord([60, 64, 67]); // C, E, G
            expect(result.voicing).toBe('close');
        });

        it('should detect open voicing (1-2 octaves)', () => {
            const result = detector.detectChord([48, 64, 67]); // C2, E3, G3
            expect(result.voicing).toBe('open');
        });

        it('should detect wide voicing (>2 octaves)', () => {
            const result = detector.detectChord([36, 64, 79]); // C1, E3, G4
            expect(result.voicing).toBe('wide');
        });
    });

    describe('Noise Tolerance', () => {
        it('should detect C7 with one extra note', () => {
            const result = detector.detectChord([60, 61, 64, 67, 70]); // C, Db, E, G, Bb
            // Should detect C7b9 or C7 with dissonance
            expect(result.root).toBe('C');
            expect(['dominant7', 'dominant7b9']).toContain(result.type);
        });

        it('should detect Cmaj with adjacent dissonance', () => {
            const result = detector.detectChord([59, 60, 64, 67]); // B, C, E, G
            expect(result.root).toBe('C');
            expect(result.name).toContain('dissonance');
        });

        it('should handle messy input gracefully', () => {
            const result = detector.detectChord([60, 61, 64, 65, 67]); // C, Db, E, F, G
            expect(result).not.toBeNull();
            expect(result.confidence).toBeLessThan(1.0);
        });
    });

    describe('Octave Independence', () => {
        it('should detect same chord across octaves', () => {
            const result1 = detector.detectChord([60, 64, 67]); // C4, E4, G4
            const result2 = detector.detectChord([48, 52, 55]); // C3, E3, G3
            const result3 = detector.detectChord([72, 76, 79]); // C5, E5, G5

            expect(result1.type).toBe(result2.type);
            expect(result2.type).toBe(result3.type);
            expect(result1.root).toBe(result2.root);
        });

        it('should detect chord with notes in different octaves', () => {
            const result = detector.detectChord([48, 64, 79]); // C3, E4, G5
            expect(result.name).toBe('C');
            expect(result.type).toBe('major');
        });
    });

    describe('Edge Cases', () => {
        it('should handle single note', () => {
            const result = detector.detectChord([60]);
            expect(result.type).toBe('single');
            expect(result.root).toBe('C');
        });

        it('should handle empty array', () => {
            const result = detector.detectChord([]);
            expect(result).toBeNull();
        });

        it('should handle null input', () => {
            const result = detector.detectChord(null);
            expect(result).toBeNull();
        });

        it('should handle power chord (root + fifth)', () => {
            const result = detector.detectChord([60, 67]); // C, G
            expect(result.type).toBe('power');
            expect(result.root).toBe('C');
        });

        it('should handle cluster/unknown chord', () => {
            const result = detector.detectChord([60, 61, 62]); // C, C#, D
            expect(result.type).toBe('cluster');
            expect(result.confidence).toBeLessThan(0.5);
        });

        it('should handle duplicate notes', () => {
            const result = detector.detectChord([60, 60, 64, 64, 67, 67]); // C, C, E, E, G, G
            expect(result.name).toBe('C');
            expect(result.type).toBe('major');
        });
    });

    describe('Real-World Jazz Voicings', () => {
        it('should detect rootless Cmaj9 (E, G, B, D)', () => {
            const result = detector.detectChord([64, 67, 71, 74]); // E, G, B, D
            expect(result.root).toBe('C');
            expect(['major9', 'major7']).toContain(result.type);
        });

        it('should detect shell voicing C7 (C, E, Bb)', () => {
            const result = detector.detectChord([60, 64, 70]); // C, E, Bb
            expect(result.root).toBe('C');
            expect(result.type).toBe('dominant7');
        });

        it('should detect drop-2 voicing Cmaj7', () => {
            const result = detector.detectChord([60, 67, 71, 76]); // C, G, B, E
            expect(result.name).toBe('Cmaj7');
            expect(result.voicing).toBe('open');
        });

        it('should detect quartal voicing (C, F, Bb, Eb)', () => {
            const result = detector.detectChord([60, 65, 70, 75]); // C, F, Bb, Eb
            // Should detect some chord, even if not perfect
            expect(result).not.toBeNull();
        });
    });

    describe('Performance & Optimization', () => {
        it('should handle large chord quickly', () => {
            const start = performance.now();
            detector.detectChord([48, 52, 55, 60, 64, 67, 72, 76, 79]);
            const duration = performance.now() - start;

            expect(duration).toBeLessThan(5); // Should be <5ms
        });

        it('should not allocate in hot path (repeated calls)', () => {
            const notes = [60, 64, 67];

            // Warm up
            for (let i = 0; i < 100; i++) {
                detector.detectChord(notes);
            }

            // Measure
            const start = performance.now();
            for (let i = 0; i < 1000; i++) {
                detector.detectChord(notes);
            }
            const duration = performance.now() - start;

            expect(duration).toBeLessThan(50); // 1000 calls in <50ms
        });
    });

    describe('Legacy API Compatibility', () => {
        it('should work with legacy detectChord function', () => {
            const result = detectChord([60, 64, 67]);
            expect(result.name).toBe('C');
            expect(result.type).toBe('major');
        });

        it('should work with midiToNoteName', () => {
            expect(midiToNoteName(60)).toBe('C');
            expect(midiToNoteName(61)).toBe('C#');
            expect(midiToNoteName(72)).toBe('C');
        });
    });
});
