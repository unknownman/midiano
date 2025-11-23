import { describe, it, expect } from 'vitest';
import {
    detectChord,
    midiToNoteName,
    normalizeToChroma,
    getIntervals,
    formatChordName,
    CHORD_PATTERNS
} from './chordDetector.js';

describe('ChordDetector', () => {
    describe('midiToNoteName', () => {
        it('should convert MIDI numbers to note names', () => {
            expect(midiToNoteName(60)).toBe('C');
            expect(midiToNoteName(61)).toBe('C#');
            expect(midiToNoteName(62)).toBe('D');
            expect(midiToNoteName(72)).toBe('C'); // C5
        });
    });

    describe('normalizeToChroma', () => {
        it('should normalize notes to 0-11 range', () => {
            expect(normalizeToChroma([60, 64, 67])).toEqual([0, 4, 7]);
            expect(normalizeToChroma([72, 76, 79])).toEqual([0, 4, 7]);
        });
    });

    describe('getIntervals', () => {
        it('should calculate intervals from root', () => {
            expect(getIntervals([0, 4, 7])).toEqual([0, 4, 7]);
            expect(getIntervals([7, 0, 4])).toEqual([0, 5, 9]); // Sorted from lowest
        });
    });

    describe('detectChord - Basic Triads', () => {
        it('should detect C major chord', () => {
            const result = detectChord([60, 64, 67]); // C, E, G
            expect(result).toBeTruthy();
            expect(result.chordType).toBe('major');
            expect(result.root).toBe('C');
            expect(result.confidence).toBe(1.0);
        });

        it('should detect A minor chord', () => {
            const result = detectChord([57, 60, 64]); // A, C, E
            expect(result).toBeTruthy();
            expect(result.chordType).toBe('minor');
            expect(result.root).toBe('A');
        });

        it('should detect D diminished chord', () => {
            const result = detectChord([62, 65, 68]); // D, F, Ab
            expect(result).toBeTruthy();
            expect(result.chordType).toBe('diminished');
            expect(result.root).toBe('D');
        });

        it('should detect C augmented chord', () => {
            const result = detectChord([60, 64, 68]); // C, E, G#
            expect(result).toBeTruthy();
            expect(result.chordType).toBe('augmented');
            expect(result.root).toBe('C');
        });
    });

    describe('detectChord - Seventh Chords', () => {
        it('should detect Cmaj7 chord', () => {
            const result = detectChord([60, 64, 67, 71]); // C, E, G, B
            expect(result).toBeTruthy();
            expect(result.chordType).toBe('major7');
            expect(result.root).toBe('C');
        });

        it('should detect Gm7 chord', () => {
            const result = detectChord([55, 58, 62, 65]); // G, Bb, D, F
            expect(result).toBeTruthy();
            expect(result.chordType).toBe('minor7');
            expect(result.root).toBe('G');
        });

        it('should detect G7 (dominant) chord', () => {
            const result = detectChord([55, 59, 62, 65]); // G, B, D, F
            expect(result).toBeTruthy();
            expect(result.chordType).toBe('dominant7');
            expect(result.root).toBe('G');
        });
    });

    describe('detectChord - Inversions', () => {
        it('should detect C major 1st inversion (E-G-C)', () => {
            const result = detectChord([64, 67, 72]); // E, G, C
            expect(result).toBeTruthy();
            expect(result.chordType).toBe('major');
            expect(result.inversion).toBeGreaterThan(0);
        });

        it('should detect C major 2nd inversion (G-C-E)', () => {
            const result = detectChord([67, 72, 76]); // G, C, E
            expect(result).toBeTruthy();
            expect(result.chordType).toBe('major');
            expect(result.inversion).toBeGreaterThan(0);
        });

        it('should detect Am7 1st inversion', () => {
            const result = detectChord([60, 64, 67, 69]); // C, E, G, A
            expect(result).toBeTruthy();
            expect(result.chordType).toBe('minor7');
        });
    });

    describe('detectChord - Octave Shifts', () => {
        it('should detect C major across different octaves', () => {
            const result1 = detectChord([60, 64, 67]); // C4, E4, G4
            const result2 = detectChord([48, 52, 55]); // C3, E3, G3
            const result3 = detectChord([72, 76, 79]); // C5, E5, G5

            expect(result1.chordType).toBe('major');
            expect(result2.chordType).toBe('major');
            expect(result3.chordType).toBe('major');
        });

        it('should detect chord with notes spread across octaves', () => {
            const result = detectChord([48, 64, 79]); // C3, E4, G5
            expect(result).toBeTruthy();
            expect(result.chordType).toBe('major');
        });
    });

    describe('detectChord - Extra Notes', () => {
        it('should detect chord with doubled root', () => {
            const result = detectChord([60, 64, 67, 72]); // C, E, G, C (octave)
            expect(result).toBeTruthy();
            expect(result.chordType).toBe('major');
            expect(result.confidence).toBeGreaterThan(0.6);
        });

        it('should detect chord with extra non-chord tone', () => {
            const result = detectChord([60, 62, 64, 67]); // C, D, E, G (D is extra)
            expect(result).toBeTruthy();
            expect(result.hasExtraNotes).toBe(true);
            expect(result.confidence).toBeLessThan(1.0);
        });
    });

    describe('detectChord - Omitted Notes', () => {
        it('should detect power chord (root + fifth)', () => {
            const result = detectChord([60, 67]); // C, G (omitted third)
            expect(result).toBeTruthy();
            expect(result.confidence).toBeLessThan(1.0);
        });

        it('should detect chord with omitted fifth', () => {
            const result = detectChord([60, 64]); // C, E (omitted G)
            expect(result).toBeTruthy();
            expect(result.hasOmittedNotes).toBe(true);
        });
    });

    describe('detectChord - Edge Cases', () => {
        it('should return null for single note', () => {
            const result = detectChord([60]);
            expect(result).toBeNull();
        });

        it('should return null for empty array', () => {
            const result = detectChord([]);
            expect(result).toBeNull();
        });

        it('should return null for null input', () => {
            const result = detectChord(null);
            expect(result).toBeNull();
        });

        it('should handle unrecognized chord patterns', () => {
            const result = detectChord([60, 61, 62]); // C, C#, D (chromatic)
            // Should either return null or low confidence match
            if (result) {
                expect(result.confidence).toBeLessThan(0.7);
            }
        });
    });

    describe('detectChord - Sus Chords', () => {
        it('should detect Csus2 chord', () => {
            const result = detectChord([60, 62, 67]); // C, D, G
            expect(result).toBeTruthy();
            expect(result.chordType).toBe('sus2');
        });

        it('should detect Csus4 chord', () => {
            const result = detectChord([60, 65, 67]); // C, F, G
            expect(result).toBeTruthy();
            expect(result.chordType).toBe('sus4');
        });
    });

    describe('formatChordName', () => {
        it('should format chord name correctly', () => {
            const chord = {
                root: 'C',
                chordType: 'major',
                inversion: 0
            };
            expect(formatChordName(chord)).toBe('C major');
        });

        it('should include inversion in name', () => {
            const chord = {
                root: 'C',
                chordType: 'major',
                inversion: 1
            };
            expect(formatChordName(chord)).toContain('1st inversion');
        });

        it('should handle null input', () => {
            expect(formatChordName(null)).toBe('Unknown');
        });
    });
});
