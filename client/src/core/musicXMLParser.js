/**
 * Content Generator: MusicXML Parser & Exercise Generator
 * Parses MusicXML/MIDI files and produces practice chunks
 */

import { DOMParser } from 'xmldom';

/**
 * Parse MusicXML file and extract practice exercises
 * @param {string} musicXMLContent - Raw MusicXML file content
 * @returns {Array} Array of exercise objects
 */
export function parseMusicXMLToExercises(musicXMLContent) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(musicXMLContent, 'text/xml');

    const exercises = [];
    const metadata = extractMetadata(doc);

    // Extract measures
    const measures = doc.getElementsByTagName('measure');
    const measureData = [];

    for (let i = 0; i < measures.length; i++) {
        const measure = measures[i];
        const chords = extractChordsFromMeasure(measure, i + 1);
        const notes = extractNotesFromMeasure(measure);

        measureData.push({
            number: i + 1,
            chords,
            notes,
            duration: calculateMeasureDuration(measure, metadata.timeSignature)
        });
    }

    // Chunk measures into practice exercises (1-8 measures each)
    const chunks = chunkMeasures(measureData, metadata);

    // Generate exercises from chunks
    chunks.forEach((chunk, index) => {
        const exercise = generateExerciseFromChunk(chunk, index, metadata);
        exercises.push(exercise);
    });

    return exercises;
}

/**
 * Extract metadata from MusicXML
 */
function extractMetadata(doc) {
    const workTitle = doc.getElementsByTagName('work-title')[0]?.textContent || 'Untitled';
    const composer = doc.getElementsByTagName('creator')[0]?.textContent || 'Unknown';

    // Time signature
    const beats = doc.getElementsByTagName('beats')[0]?.textContent || '4';
    const beatType = doc.getElementsByTagName('beat-type')[0]?.textContent || '4';

    // Key signature
    const fifths = doc.getElementsByTagName('fifths')[0]?.textContent || '0';
    const mode = doc.getElementsByTagName('mode')[0]?.textContent || 'major';

    // Tempo
    const tempo = doc.getElementsByTagName('sound')[0]?.getAttribute('tempo') || '120';

    return {
        title: workTitle,
        composer,
        timeSignature: { beats: parseInt(beats), beatType: parseInt(beatType) },
        keySignature: { fifths: parseInt(fifths), mode },
        tempo: parseInt(tempo)
    };
}

/**
 * Extract chords from a measure using harmonic analysis
 */
function extractChordsFromMeasure(measure, measureNumber) {
    const notes = measure.getElementsByTagName('note');
    const chords = [];
    const simultaneousNotes = [];

    let currentBeat = 0;

    for (let i = 0; i < notes.length; i++) {
        const note = notes[i];
        const isChord = note.getElementsByTagName('chord').length > 0;

        if (isChord) {
            // Part of current chord
            simultaneousNotes.push(extractNoteData(note));
        } else {
            // New chord or single note
            if (simultaneousNotes.length > 0) {
                const chord = analyzeChord(simultaneousNotes, currentBeat, measureNumber);
                if (chord) chords.push(chord);
                simultaneousNotes.length = 0;
            }

            simultaneousNotes.push(extractNoteData(note));
            currentBeat += getDuration(note);
        }
    }

    // Handle last chord
    if (simultaneousNotes.length > 0) {
        const chord = analyzeChord(simultaneousNotes, currentBeat, measureNumber);
        if (chord) chords.push(chord);
    }

    return chords;
}

/**
 * Extract note data from MusicXML note element
 */
function extractNoteData(noteElement) {
    const step = noteElement.getElementsByTagName('step')[0]?.textContent;
    const octave = noteElement.getElementsByTagName('octave')[0]?.textContent;
    const alter = noteElement.getElementsByTagName('alter')[0]?.textContent || '0';

    if (!step || !octave) return null;

    const midiNote = stepToMIDI(step, parseInt(octave), parseInt(alter));
    const duration = getDuration(noteElement);

    return { step, octave: parseInt(octave), alter: parseInt(alter), midiNote, duration };
}

/**
 * Convert step/octave/alter to MIDI note number
 */
function stepToMIDI(step, octave, alter) {
    const stepValues = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    return (octave + 1) * 12 + stepValues[step] + alter;
}

/**
 * Get duration of note in beats
 */
function getDuration(noteElement) {
    const duration = noteElement.getElementsByTagName('duration')[0]?.textContent;
    const divisions = noteElement.ownerDocument.getElementsByTagName('divisions')[0]?.textContent || '1';
    return duration ? parseInt(duration) / parseInt(divisions) : 0;
}

/**
 * Analyze simultaneous notes to identify chord
 */
function analyzeChord(notes, beat, measureNumber) {
    if (notes.length < 2) return null;

    const midiNotes = notes.map(n => n.midiNote).filter(n => n !== null);
    if (midiNotes.length < 2) return null;

    // Normalize to pitch classes
    const pitchClasses = [...new Set(midiNotes.map(n => n % 12))].sort((a, b) => a - b);

    // Simple chord recognition (can be enhanced)
    const intervals = pitchClasses.map((pc, i) => i === 0 ? 0 : pc - pitchClasses[0]);

    const chordType = identifyChordType(intervals);
    const root = midiNoteToName(Math.min(...midiNotes));

    return {
        root,
        type: chordType,
        notes: midiNotes,
        beat,
        measureNumber,
        duration: Math.max(...notes.map(n => n.duration))
    };
}

/**
 * Identify chord type from intervals
 */
function identifyChordType(intervals) {
    const patterns = {
        'major': [0, 4, 7],
        'minor': [0, 3, 7],
        'diminished': [0, 3, 6],
        'augmented': [0, 4, 8],
        'major7': [0, 4, 7, 11],
        'minor7': [0, 3, 7, 10],
        'dominant7': [0, 4, 7, 10]
    };

    for (const [type, pattern] of Object.entries(patterns)) {
        if (arraysEqual(intervals, pattern)) {
            return type;
        }
    }

    return 'unknown';
}

function arraysEqual(a, b) {
    return a.length === b.length && a.every((val, i) => val === b[i]);
}

function midiNoteToName(midi) {
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return names[midi % 12];
}

/**
 * Extract all notes from measure (for melody practice)
 */
function extractNotesFromMeasure(measure) {
    const notes = measure.getElementsByTagName('note');
    const result = [];

    for (let i = 0; i < notes.length; i++) {
        const noteData = extractNoteData(notes[i]);
        if (noteData) result.push(noteData);
    }

    return result;
}

/**
 * Calculate measure duration in beats
 */
function calculateMeasureDuration(measure, timeSignature) {
    return timeSignature.beats;
}

/**
 * Chunk measures into manageable practice segments
 */
function chunkMeasures(measures, metadata) {
    const chunks = [];
    const chunkSizes = [4, 8, 2]; // Prefer 4-measure chunks, then 8, then 2

    let i = 0;
    while (i < measures.length) {
        // Determine chunk size based on complexity
        const remainingMeasures = measures.length - i;
        let chunkSize = 4;

        if (remainingMeasures >= 8) chunkSize = 8;
        else if (remainingMeasures >= 4) chunkSize = 4;
        else chunkSize = remainingMeasures;

        const chunk = measures.slice(i, i + chunkSize);
        chunks.push(chunk);
        i += chunkSize;
    }

    return chunks;
}

/**
 * Generate exercise object from measure chunk
 */
function generateExerciseFromChunk(chunk, index, metadata) {
    const startMeasure = chunk[0].number;
    const endMeasure = chunk[chunk.length - 1].number;

    // Collect all unique chords in chunk
    const allChords = chunk.flatMap(m => m.chords);
    const uniqueChordTypes = [...new Set(allChords.map(c => c.type))];

    // Determine difficulty
    const difficulty = calculateDifficulty(allChords, uniqueChordTypes);

    // Generate fingering hints
    const fingeringHints = generateFingeringHints(allChords);

    return {
        id: `exercise-${index + 1}`,
        title: `${metadata.title} - Measures ${startMeasure}-${endMeasure}`,
        type: 'chord_progression',
        measures: {
            start: startMeasure,
            end: endMeasure,
            data: chunk
        },
        chordTargets: allChords.map(c => ({
            root: c.root,
            type: c.type,
            measureNumber: c.measureNumber,
            beat: c.beat
        })),
        expectedTempo: metadata.tempo,
        successCriteria: {
            minAccuracy: difficulty === 'beginner' ? 75 : difficulty === 'intermediate' ? 80 : 85,
            consecutiveCorrect: difficulty === 'beginner' ? 2 : 3,
            tempoTolerance: 10 // ±10 BPM
        },
        hints: {
            fingering: fingeringHints,
            practiceNotes: generatePracticeNotes(allChords, difficulty),
            keySignature: metadata.keySignature,
            timeSignature: metadata.timeSignature
        },
        difficulty,
        estimatedDuration: Math.ceil(chunk.length * (60 / metadata.tempo) * 4) // seconds
    };
}

/**
 * Calculate difficulty based on chord complexity
 */
function calculateDifficulty(chords, uniqueTypes) {
    const complexChords = ['major7', 'minor7', 'dominant7', 'diminished7', 'augmented'];
    const hasComplexChords = uniqueTypes.some(t => complexChords.includes(t));

    const avgChordsPerMeasure = chords.length / new Set(chords.map(c => c.measureNumber)).size;

    if (hasComplexChords || avgChordsPerMeasure > 3) return 'advanced';
    if (uniqueTypes.length > 4 || avgChordsPerMeasure > 2) return 'intermediate';
    return 'beginner';
}

/**
 * Generate fingering hints
 */
function generateFingeringHints(chords) {
    return chords.map(chord => ({
        chord: `${chord.root} ${chord.type}`,
        rightHand: '1-3-5 (thumb-middle-pinky)',
        leftHand: '5-3-1 (pinky-middle-thumb)',
        measure: chord.measureNumber
    }));
}

/**
 * Generate practice notes
 */
function generatePracticeNotes(chords, difficulty) {
    const notes = [];

    if (difficulty === 'beginner') {
        notes.push('Practice each chord separately before combining');
        notes.push('Focus on clean note attacks - all notes should sound together');
    } else if (difficulty === 'intermediate') {
        notes.push('Work on smooth transitions between chords');
        notes.push('Maintain steady tempo throughout');
    } else {
        notes.push('Pay attention to voice leading between chords');
        notes.push('Practice hands separately first, then together');
    }

    return notes;
}

// Example output format
export const EXAMPLE_OUTPUT = [
    {
        "id": "exercise-1",
        "title": "Für Elise - Measures 1-4",
        "type": "chord_progression",
        "measures": { "start": 1, "end": 4 },
        "chordTargets": [
            { "root": "A", "type": "minor", "measureNumber": 1, "beat": 0 },
            { "root": "E", "type": "major", "measureNumber": 2, "beat": 0 }
        ],
        "expectedTempo": 120,
        "successCriteria": {
            "minAccuracy": 80,
            "consecutiveCorrect": 3,
            "tempoTolerance": 10
        },
        "hints": {
            "fingering": [
                { "chord": "A minor", "rightHand": "1-3-5", "leftHand": "5-3-1", "measure": 1 }
            ],
            "practiceNotes": ["Work on smooth transitions", "Maintain steady tempo"],
            "keySignature": { "fifths": 0, "mode": "minor" },
            "timeSignature": { "beats": 3, "beatType": 8 }
        },
        "difficulty": "intermediate",
        "estimatedDuration": 8
    }
];
