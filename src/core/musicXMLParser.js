/**
 * Advanced MusicXML Parser with Score Following
 * 
 * Features:
 * - VexFlow-ready data structure
 * - Beat-aligned timing (absolute ticks/beats)
 * - Smart chunking (double bars, key changes, rests)
 * - Voice separation (bass/harmony vs melody)
 * - Score follower support
 * 
 * @author Music Education App Developer
 * @version 2.0.0
 */

/**
 * Parse MusicXML to structured lesson plan
 * @param {string} musicXMLContent Raw MusicXML content
 * @returns {Object} Structured lesson plan
 */
export function parseMusicXMLToLessonPlan(musicXMLContent) {
    // Use native browser DOMParser (works in Vite)
    const parser = new window.DOMParser();
    const doc = parser.parseFromString(musicXMLContent, 'text/xml');

    // Extract metadata
    const metadata = extractMetadata(doc);

    // Extract parts (voices/instruments)
    const parts = extractParts(doc, metadata);

    // Separate bass/harmony from melody
    const { bassHarmony, melody } = separateVoices(parts);

    // Generate beat-aligned timeline
    const timeline = generateTimeline(bassHarmony, melody, metadata);

    // Smart chunking into phrases
    const phrases = smartChunkIntoPhrases(timeline, metadata);

    // Generate lesson plan
    return {
        metadata,
        parts,
        bassHarmony,
        melody,
        timeline,
        phrases,
        vexFlowData: generateVexFlowData(phrases, metadata)
    };
}

/**
 * Extract metadata from MusicXML
 * @private
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

    // Divisions (ticks per quarter note)
    const divisions = doc.getElementsByTagName('divisions')[0]?.textContent || '480';

    return {
        title: workTitle,
        composer,
        timeSignature: {
            beats: parseInt(beats),
            beatType: parseInt(beatType),
            beatsPerMeasure: parseInt(beats)
        },
        keySignature: {
            fifths: parseInt(fifths),
            mode,
            key: fifthsToKey(parseInt(fifths), mode)
        },
        tempo: parseInt(tempo),
        divisions: parseInt(divisions),
        ticksPerBeat: parseInt(divisions),
        ticksPerMeasure: parseInt(divisions) * parseInt(beats)
    };
}

/**
 * Convert fifths to key name
 * @private
 */
function fifthsToKey(fifths, mode) {
    const majorKeys = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'F', 'Bb', 'Eb', 'Ab', 'Db'];
    const minorKeys = ['A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#', 'D', 'G', 'C', 'F', 'Bb'];

    const index = fifths + (fifths >= 0 ? 0 : 12);
    return mode === 'major' ? majorKeys[index] : minorKeys[index];
}

/**
 * Extract parts (voices/instruments) from MusicXML
 * @private
 */
function extractParts(doc, metadata) {
    const partElements = doc.getElementsByTagName('part');
    const parts = [];

    for (let i = 0; i < partElements.length; i++) {
        const partElement = partElements[i];
        const partId = partElement.getAttribute('id');

        // Get part name
        const partList = doc.getElementsByTagName('part-list')[0];
        const scorePart = Array.from(partList.getElementsByTagName('score-part'))
            .find(sp => sp.getAttribute('id') === partId);
        const partName = scorePart?.getElementsByTagName('part-name')[0]?.textContent || `Part ${i + 1}`;

        // Extract measures
        const measures = extractMeasures(partElement, metadata, i);

        parts.push({
            id: partId,
            name: partName,
            index: i,
            measures,
            isLeftHand: partName.toLowerCase().includes('left') ||
                partName.toLowerCase().includes('bass') ||
                i === 1, // Assume second part is left hand for piano
            isRightHand: partName.toLowerCase().includes('right') ||
                partName.toLowerCase().includes('melody') ||
                i === 0 // Assume first part is right hand for piano
        });
    }

    return parts;
}

/**
 * Extract measures from part
 * @private
 */
function extractMeasures(partElement, metadata, partIndex) {
    const measureElements = partElement.getElementsByTagName('measure');
    const measures = [];
    let absoluteTick = 0;

    for (let i = 0; i < measureElements.length; i++) {
        const measureElement = measureElements[i];
        const measureNumber = parseInt(measureElement.getAttribute('number') || (i + 1));

        // Check for attributes (key change, time change, etc.)
        const attributes = extractAttributes(measureElement, metadata);

        // Extract notes and chords
        const { notes, chords } = extractNotesAndChords(measureElement, metadata, absoluteTick, measureNumber);

        // Check for barline (double bar, repeat, etc.)
        const barline = extractBarline(measureElement);

        // Calculate measure duration
        const measureDuration = calculateMeasureDuration(measureElement, metadata);

        measures.push({
            number: measureNumber,
            absoluteTick,
            absoluteBeat: absoluteTick / metadata.ticksPerBeat,
            absoluteTime: (absoluteTick / metadata.ticksPerBeat) * (60 / metadata.tempo),
            duration: measureDuration,
            attributes,
            notes,
            chords,
            barline,
            hasKeyChange: attributes.keyChange !== null,
            hasTimeChange: attributes.timeChange !== null,
            hasDoubleBar: barline?.type === 'double' || barline?.type === 'end',
            hasRepeat: barline?.repeat !== null
        });

        absoluteTick += measureDuration;
    }

    return measures;
}

/**
 * Extract attributes (clef, key, time signature changes)
 * @private
 */
function extractAttributes(measureElement, metadata) {
    const attributesElement = measureElement.getElementsByTagName('attributes')[0];

    if (!attributesElement) {
        return {
            clef: null,
            keyChange: null,
            timeChange: null
        };
    }

    // Clef
    const clefElement = attributesElement.getElementsByTagName('clef')[0];
    const clef = clefElement ? {
        sign: clefElement.getElementsByTagName('sign')[0]?.textContent || 'G',
        line: parseInt(clefElement.getElementsByTagName('line')[0]?.textContent || '2')
    } : null;

    // Key change
    const keyElement = attributesElement.getElementsByTagName('key')[0];
    const keyChange = keyElement ? {
        fifths: parseInt(keyElement.getElementsByTagName('fifths')[0]?.textContent || '0'),
        mode: keyElement.getElementsByTagName('mode')[0]?.textContent || 'major'
    } : null;

    // Time signature change
    const timeElement = attributesElement.getElementsByTagName('time')[0];
    const timeChange = timeElement ? {
        beats: parseInt(timeElement.getElementsByTagName('beats')[0]?.textContent || '4'),
        beatType: parseInt(timeElement.getElementsByTagName('beat-type')[0]?.textContent || '4')
    } : null;

    return { clef, keyChange, timeChange };
}

/**
 * Extract notes and chords from measure
 * @private
 */
function extractNotesAndChords(measureElement, metadata, measureStartTick, measureNumber) {
    const noteElements = measureElement.getElementsByTagName('note');
    const notes = [];
    const chords = [];

    let currentTick = measureStartTick;
    let chordNotes = [];

    for (let i = 0; i < noteElements.length; i++) {
        const noteElement = noteElements[i];

        // Check if rest
        const isRest = noteElement.getElementsByTagName('rest').length > 0;

        // Check if part of chord
        const isChordNote = noteElement.getElementsByTagName('chord').length > 0;

        // Extract note data
        const noteData = extractNoteData(noteElement, currentTick, metadata, measureNumber);

        if (isRest) {
            // Add rest
            notes.push({
                ...noteData,
                isRest: true,
                type: 'rest'
            });
            currentTick += noteData.durationTicks;
        } else if (isChordNote) {
            // Part of current chord (same tick as previous note)
            chordNotes.push(noteData);
        } else {
            // New note or start of new chord
            if (chordNotes.length > 0) {
                // Process previous chord
                const chord = analyzeChord(chordNotes, metadata);
                if (chord) {
                    chords.push(chord);
                }
                chordNotes = [];
            }

            chordNotes.push(noteData);
            notes.push(noteData);
            currentTick += noteData.durationTicks;
        }
    }

    // Process last chord
    if (chordNotes.length > 1) {
        const chord = analyzeChord(chordNotes, metadata);
        if (chord) {
            chords.push(chord);
        }
    }

    return { notes, chords };
}

/**
 * Extract note data
 * @private
 */
function extractNoteData(noteElement, absoluteTick, metadata, measureNumber) {
    const pitch = noteElement.getElementsByTagName('pitch')[0];

    let step, octave, alter, midiNote;

    if (pitch) {
        step = pitch.getElementsByTagName('step')[0]?.textContent;
        octave = parseInt(pitch.getElementsByTagName('octave')[0]?.textContent || '4');
        alter = parseInt(pitch.getElementsByTagName('alter')[0]?.textContent || '0');
        midiNote = stepToMIDI(step, octave, alter);
    }

    // Duration
    const duration = parseInt(noteElement.getElementsByTagName('duration')[0]?.textContent || '0');

    // Type (whole, half, quarter, etc.)
    const type = noteElement.getElementsByTagName('type')[0]?.textContent || 'quarter';

    // Dot
    const dotted = noteElement.getElementsByTagName('dot').length > 0;

    // Stem direction
    const stem = noteElement.getElementsByTagName('stem')[0]?.textContent || 'up';

    // Voice
    const voice = parseInt(noteElement.getElementsByTagName('voice')[0]?.textContent || '1');

    // Staff (1 = treble, 2 = bass for piano)
    const staff = parseInt(noteElement.getElementsByTagName('staff')[0]?.textContent || '1');

    return {
        step,
        octave,
        alter,
        midiNote,
        noteName: midiNote ? midiToNoteName(midiNote) : null,
        noteNameWithOctave: midiNote ? `${midiToNoteName(midiNote)}${octave}` : null,
        durationTicks: duration,
        durationBeats: duration / metadata.ticksPerBeat,
        type,
        dotted,
        stem,
        voice,
        staff,
        absoluteTick,
        absoluteBeat: absoluteTick / metadata.ticksPerBeat,
        absoluteTime: (absoluteTick / metadata.ticksPerBeat) * (60 / metadata.tempo),
        measureNumber
    };
}

/**
 * Convert step/octave/alter to MIDI note
 * @private
 */
function stepToMIDI(step, octave, alter) {
    const stepValues = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    return (octave + 1) * 12 + stepValues[step] + alter;
}

/**
 * Convert MIDI to note name
 * @private
 */
function midiToNoteName(midi) {
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return names[midi % 12];
}

/**
 * Analyze chord from simultaneous notes
 * @private
 */
function analyzeChord(notes, metadata) {
    if (notes.length < 2) return null;

    const midiNotes = notes.map(n => n.midiNote);
    const absoluteTick = notes[0].absoluteTick;

    return {
        notes: midiNotes,
        noteNames: notes.map(n => n.noteName),
        absoluteTick,
        absoluteBeat: absoluteTick / metadata.ticksPerBeat,
        absoluteTime: (absoluteTick / metadata.ticksPerBeat) * (60 / metadata.tempo),
        durationTicks: Math.max(...notes.map(n => n.durationTicks)),
        durationBeats: Math.max(...notes.map(n => n.durationBeats)),
        measureNumber: notes[0].measureNumber,
        staff: notes[0].staff
    };
}

/**
 * Extract barline information
 * @private
 */
function extractBarline(measureElement) {
    const barlineElement = measureElement.getElementsByTagName('barline')[0];

    if (!barlineElement) return null;

    const barStyle = barlineElement.getElementsByTagName('bar-style')[0]?.textContent || 'regular';
    const repeat = barlineElement.getElementsByTagName('repeat')[0];

    return {
        type: barStyle, // 'regular', 'double', 'end', 'light-heavy', etc.
        repeat: repeat ? {
            direction: repeat.getAttribute('direction') // 'forward' or 'backward'
        } : null
    };
}

/**
 * Calculate measure duration in ticks
 * @private
 */
function calculateMeasureDuration(measureElement, metadata) {
    const noteElements = measureElement.getElementsByTagName('note');
    let totalDuration = 0;

    for (let i = 0; i < noteElements.length; i++) {
        const noteElement = noteElements[i];
        const isChord = noteElement.getElementsByTagName('chord').length > 0;

        if (!isChord) {
            const duration = parseInt(noteElement.getElementsByTagName('duration')[0]?.textContent || '0');
            totalDuration += duration;
        }
    }

    return totalDuration || metadata.ticksPerMeasure;
}

/**
 * Separate voices into bass/harmony and melody
 * @private
 */
function separateVoices(parts) {
    const bassHarmony = parts.filter(p => p.isLeftHand || p.index === 1);
    const melody = parts.filter(p => p.isRightHand || p.index === 0);

    return { bassHarmony, melody };
}

/**
 * Generate beat-aligned timeline
 * @private
 */
function generateTimeline(bassHarmony, melody, metadata) {
    const events = [];

    // Add bass/harmony events
    bassHarmony.forEach(part => {
        part.measures.forEach(measure => {
            measure.chords.forEach(chord => {
                events.push({
                    type: 'chord',
                    part: part.name,
                    partIndex: part.index,
                    ...chord,
                    hand: 'left'
                });
            });
        });
    });

    // Add melody events
    melody.forEach(part => {
        part.measures.forEach(measure => {
            measure.notes.forEach(note => {
                if (!note.isRest) {
                    events.push({
                        type: 'note',
                        part: part.name,
                        partIndex: part.index,
                        ...note,
                        hand: 'right'
                    });
                }
            });
        });
    });

    // Sort by absolute tick
    events.sort((a, b) => a.absoluteTick - b.absoluteTick);

    return events;
}

/**
 * Smart chunking into musical phrases
 * @private
 */
function smartChunkIntoPhrases(timeline, metadata) {
    const phrases = [];
    let currentPhrase = [];
    let phraseStartTick = 0;

    // Get all measures from timeline
    const measures = [...new Set(timeline.map(e => e.measureNumber))].sort((a, b) => a - b);

    for (let i = 0; i < measures.length; i++) {
        const measureNumber = measures[i];
        const measureEvents = timeline.filter(e => e.measureNumber === measureNumber);

        currentPhrase.push(...measureEvents);

        // Check for phrase boundaries
        const isDoubleBar = measureEvents.some(e => e.hasDoubleBar);
        const isKeyChange = measureEvents.some(e => e.hasKeyChange);
        const hasLongRest = measureEvents.some(e => e.isRest && e.durationBeats >= 2);
        const isEndOfSection = (i + 1) % 8 === 0; // Every 8 measures

        if (isDoubleBar || isKeyChange || hasLongRest || isEndOfSection || i === measures.length - 1) {
            // End current phrase
            if (currentPhrase.length > 0) {
                const phraseEndTick = Math.max(...currentPhrase.map(e => e.absoluteTick + (e.durationTicks || 0)));

                phrases.push({
                    id: `phrase-${phrases.length + 1}`,
                    startMeasure: Math.min(...currentPhrase.map(e => e.measureNumber)),
                    endMeasure: Math.max(...currentPhrase.map(e => e.measureNumber)),
                    startTick: phraseStartTick,
                    endTick: phraseEndTick,
                    startBeat: phraseStartTick / metadata.ticksPerBeat,
                    endBeat: phraseEndTick / metadata.ticksPerBeat,
                    startTime: (phraseStartTick / metadata.ticksPerBeat) * (60 / metadata.tempo),
                    endTime: (phraseEndTick / metadata.ticksPerBeat) * (60 / metadata.tempo),
                    events: currentPhrase,
                    chords: currentPhrase.filter(e => e.type === 'chord'),
                    notes: currentPhrase.filter(e => e.type === 'note'),
                    reason: isDoubleBar ? 'double_bar' :
                        isKeyChange ? 'key_change' :
                            hasLongRest ? 'long_rest' :
                                'section_end'
                });

                phraseStartTick = phraseEndTick;
                currentPhrase = [];
            }
        }
    }

    return phrases;
}

/**
 * Generate VexFlow-ready data
 * @private
 */
function generateVexFlowData(phrases, metadata) {
    return phrases.map(phrase => ({
        id: phrase.id,
        measures: [],
        staves: [
            {
                clef: 'treble',
                keySignature: metadata.keySignature.key,
                timeSignature: `${metadata.timeSignature.beats}/${metadata.timeSignature.beatType}`,
                notes: phrase.notes.map(note => ({
                    keys: [`${note.noteName}/${note.octave}`],
                    duration: note.type,
                    dotted: note.dotted
                }))
            },
            {
                clef: 'bass',
                keySignature: metadata.keySignature.key,
                timeSignature: `${metadata.timeSignature.beats}/${metadata.timeSignature.beatType}`,
                notes: phrase.chords.map(chord => ({
                    keys: chord.noteNames.map((name, i) => `${name}/${Math.floor(chord.notes[i] / 12) - 1}`),
                    duration: 'q', // Default to quarter note
                    isChord: true
                }))
            }
        ]
    }));
}

/**
 * Legacy API (backward compatibility)
 */
export function parseMusicXMLToExercises(musicXMLContent) {
    const lessonPlan = parseMusicXMLToLessonPlan(musicXMLContent);

    // Convert to old format
    return lessonPlan.phrases.map((phrase, index) => ({
        id: phrase.id,
        title: `${lessonPlan.metadata.title} - Measures ${phrase.startMeasure}-${phrase.endMeasure}`,
        type: 'chord_progression',
        measures: {
            start: phrase.startMeasure,
            end: phrase.endMeasure
        },
        chordTargets: phrase.chords.map(chord => ({
            notes: chord.notes,
            absoluteTick: chord.absoluteTick,
            absoluteBeat: chord.absoluteBeat,
            absoluteTime: chord.absoluteTime,
            measureNumber: chord.measureNumber
        })),
        expectedTempo: lessonPlan.metadata.tempo,
        difficulty: 'intermediate'
    }));
}
