/**
 * Core chord detection logic
 * Detects chords from MIDI note arrays with support for inversions,
 * octave shifts, and extra/omitted notes
 */

// Note number to name mapping (C4 = 60)
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Chord definitions: intervals from root (in semitones)
 */
export const CHORD_PATTERNS = {
    'major': [0, 4, 7],
    'minor': [0, 3, 7],
    'diminished': [0, 3, 6],
    'augmented': [0, 4, 8],
    'major7': [0, 4, 7, 11],
    'minor7': [0, 3, 7, 10],
    'dominant7': [0, 4, 7, 10],
    'diminished7': [0, 3, 6, 9],
    'sus2': [0, 2, 7],
    'sus4': [0, 5, 7],
    'major6': [0, 4, 7, 9],
    'minor6': [0, 3, 7, 9]
};

/**
 * Convert MIDI note number to note name (without octave)
 */
export function midiToNoteName(midiNote) {
    return NOTE_NAMES[midiNote % 12];
}

/**
 * Normalize notes to a single octave (0-11 semitones)
 */
export function normalizeToChroma(midiNotes) {
    return midiNotes.map(note => note % 12);
}

/**
 * Get intervals from the lowest note
 */
export function getIntervals(chromaNotes) {
    if (chromaNotes.length === 0) return [];

    const sorted = [...chromaNotes].sort((a, b) => a - b);
    const root = sorted[0];

    return sorted.map(note => {
        let interval = note - root;
        // Handle wrapping (e.g., if we have [11, 0, 4], normalize to [0, 1, 5])
        if (interval < 0) interval += 12;
        return interval;
    });
}

/**
 * Match intervals against chord patterns
 * Returns { chordType, root, inversion, confidence }
 */
export function matchChordPattern(intervals, originalNotes) {
    const matches = [];

    // Try each chord pattern
    for (const [chordType, pattern] of Object.entries(CHORD_PATTERNS)) {
        // Check for exact match
        if (arraysEqualIgnoreOrder(intervals, pattern)) {
            const root = midiToNoteName(Math.min(...originalNotes));
            matches.push({
                chordType,
                root,
                inversion: 0,
                confidence: 1.0,
                notes: originalNotes
            });
        }

        // Check for inversions
        for (let inv = 1; inv < pattern.length; inv++) {
            const inverted = getInversion(pattern, inv);
            if (arraysEqualIgnoreOrder(intervals, inverted)) {
                const root = midiToNoteName(Math.min(...originalNotes));
                matches.push({
                    chordType,
                    root,
                    inversion: inv,
                    confidence: 0.95,
                    notes: originalNotes
                });
            }
        }

        // Check for subset match (extra notes)
        if (isSubset(pattern, intervals)) {
            const root = midiToNoteName(Math.min(...originalNotes));
            const extraNotes = intervals.length - pattern.length;
            matches.push({
                chordType,
                root,
                inversion: 0,
                confidence: 0.7 - (extraNotes * 0.1),
                notes: originalNotes,
                hasExtraNotes: true
            });
        }

        // Check for superset match (omitted notes)
        if (isSubset(intervals, pattern) && intervals.length >= 2) {
            const root = midiToNoteName(Math.min(...originalNotes));
            const omittedNotes = pattern.length - intervals.length;
            matches.push({
                chordType,
                root,
                inversion: 0,
                confidence: 0.6 - (omittedNotes * 0.1),
                notes: originalNotes,
                hasOmittedNotes: true
            });
        }
    }

    // Return best match
    matches.sort((a, b) => b.confidence - a.confidence);
    return matches[0] || null;
}

/**
 * Get chord inversion
 */
function getInversion(pattern, inversionNum) {
    const inverted = [...pattern];
    for (let i = 0; i < inversionNum; i++) {
        const note = inverted.shift();
        inverted.push(note + 12);
    }

    // Normalize back to 0-11 range
    const root = inverted[0];
    return inverted.map(n => {
        let interval = n - root;
        while (interval >= 12) interval -= 12;
        return interval;
    });
}

/**
 * Check if two arrays are equal (ignoring order)
 */
function arraysEqualIgnoreOrder(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    const sorted1 = [...arr1].sort((a, b) => a - b);
    const sorted2 = [...arr2].sort((a, b) => a - b);
    return sorted1.every((val, idx) => val === sorted2[idx]);
}

/**
 * Check if arr1 is a subset of arr2
 */
function isSubset(arr1, arr2) {
    return arr1.every(val => arr2.includes(val));
}

/**
 * Main chord detection function
 * @param {number[]} midiNotes - Array of MIDI note numbers
 * @returns {Object|null} Detected chord or null
 */
export function detectChord(midiNotes) {
    if (!midiNotes || midiNotes.length < 2) {
        return null;
    }

    // Remove duplicates across octaves
    const uniqueChroma = [...new Set(normalizeToChroma(midiNotes))];

    // Get intervals
    const intervals = getIntervals(uniqueChroma);

    // Match against patterns
    return matchChordPattern(intervals, midiNotes);
}

/**
 * Format chord name for display
 */
export function formatChordName(chordInfo) {
    if (!chordInfo) return 'Unknown';

    const { root, chordType, inversion } = chordInfo;
    let name = `${root} ${chordType}`;

    if (inversion > 0) {
        name += ` (${getInversionName(inversion)})`;
    }

    return name;
}

function getInversionName(inv) {
    const names = ['root position', '1st inversion', '2nd inversion', '3rd inversion'];
    return names[inv] || `${inv}th inversion`;
}
