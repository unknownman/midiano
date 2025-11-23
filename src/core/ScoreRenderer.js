/**
 * Score Renderer using VexFlow
 * 
 * Features:
 * - Renders musical notation from phrase data
 * - Real-time note highlighting
 * - Responsive resizing
 * - Grand staff (treble + bass)
 * 
 * @author Senior Vue.js Developer
 * @version 1.0.0
 */

import Vex from 'vexflow';

const VF = Vex.Flow;

export class ScoreRenderer {
    /**
     * @private
     */
    #container = null;
    #renderer = null;
    #context = null;
    #currentPhrase = null;
    #staves = [];
    #noteElements = [];
    #resizeObserver = null;

    /**
     * Initialize Score Renderer
     * @param {HTMLElement} container Container element
     */
    constructor(container) {
        if (!container) {
            throw new Error('Container element is required');
        }

        this.#container = container;
        this.#setupRenderer();
        this.#setupResizeObserver();
    }

    /**
     * Setup VexFlow renderer
     * @private
     */
    #setupRenderer() {
        // Clear container
        this.#container.innerHTML = '';

        // Create renderer
        this.#renderer = new VF.Renderer(
            this.#container,
            VF.Renderer.Backends.SVG
        );

        // Resize to container
        const { width, height } = this.#getContainerSize();
        this.#renderer.resize(width, height);

        // Get context
        this.#context = this.#renderer.getContext();
        this.#context.setFont('Arial', 10);
    }

    /**
     * Setup resize observer
     * @private
     */
    #setupResizeObserver() {
        this.#resizeObserver = new ResizeObserver(() => {
            if (this.#currentPhrase) {
                this.render(this.#currentPhrase);
            }
        });

        this.#resizeObserver.observe(this.#container);
    }

    /**
     * Get container size
     * @private
     */
    #getContainerSize() {
        const rect = this.#container.getBoundingClientRect();
        return {
            width: rect.width || 800,
            height: rect.height || 400
        };
    }

    /**
     * Render phrase
     * @param {Object} phraseData Phrase data from MusicXMLParser
     */
    render(phraseData) {
        if (!phraseData) {
            console.warn('No phrase data provided');
            return;
        }

        this.#currentPhrase = phraseData;

        // Clear previous render
        this.#clear();

        // Setup renderer with current size
        this.#setupRenderer();

        // Get VexFlow data
        const vexFlowData = phraseData.vexFlowData || this.#convertToVexFlow(phraseData);

        if (!vexFlowData || vexFlowData.length === 0) {
            console.warn('No VexFlow data available');
            return;
        }

        // Render grand staff
        this.#renderGrandStaff(vexFlowData[0]);
    }

    /**
     * Convert phrase data to VexFlow format
     * @private
     */
    #convertToVexFlow(phraseData) {
        const trebleNotes = [];
        const bassNotes = [];

        // Separate notes by hand/staff
        phraseData.events?.forEach(event => {
            if (event.type === 'note' && event.hand === 'right') {
                trebleNotes.push({
                    keys: [`${event.noteName}/${event.octave}`],
                    duration: this.#getDuration(event.type || 'q')
                });
            } else if (event.type === 'chord' && event.hand === 'left') {
                const keys = event.notes.map((note, i) => {
                    const octave = Math.floor(note / 12) - 1;
                    const noteName = event.noteNames[i];
                    return `${noteName}/${octave}`;
                });

                bassNotes.push({
                    keys,
                    duration: 'q'
                });
            }
        });

        return [{
            staves: [
                {
                    clef: 'treble',
                    notes: trebleNotes.length > 0 ? trebleNotes : [{ keys: ['B/4'], duration: 'qr' }]
                },
                {
                    clef: 'bass',
                    notes: bassNotes.length > 0 ? bassNotes : [{ keys: ['D/3'], duration: 'qr' }]
                }
            ]
        }];
    }

    /**
     * Get VexFlow duration from note type
     * @private
     */
    #getDuration(type) {
        const durationMap = {
            'whole': 'w',
            'half': 'h',
            'quarter': 'q',
            'eighth': '8',
            'sixteenth': '16',
            'q': 'q',
            'h': 'h',
            'w': 'w'
        };

        return durationMap[type] || 'q';
    }

    /**
     * Render grand staff (treble + bass)
     * @private
     */
    #renderGrandStaff(vexFlowData) {
        const { width, height } = this.#getContainerSize();

        const staveWidth = width - 40;
        const staveX = 20;
        const trebleY = 40;
        const bassY = 140;

        // Create treble stave
        const trebleStave = new VF.Stave(staveX, trebleY, staveWidth);
        trebleStave.addClef(vexFlowData.staves[0].clef || 'treble');

        if (vexFlowData.staves[0].keySignature) {
            trebleStave.addKeySignature(vexFlowData.staves[0].keySignature);
        }

        if (vexFlowData.staves[0].timeSignature) {
            trebleStave.addTimeSignature(vexFlowData.staves[0].timeSignature);
        }

        trebleStave.setContext(this.#context).draw();

        // Create bass stave
        const bassStave = new VF.Stave(staveX, bassY, staveWidth);
        bassStave.addClef(vexFlowData.staves[1].clef || 'bass');

        if (vexFlowData.staves[1].keySignature) {
            bassStave.addKeySignature(vexFlowData.staves[1].keySignature);
        }

        bassStave.setContext(this.#context).draw();

        // Add brace
        const brace = new VF.StaveConnector(trebleStave, bassStave);
        brace.setType(VF.StaveConnector.type.BRACE);
        brace.setContext(this.#context).draw();

        // Add line connector
        const lineLeft = new VF.StaveConnector(trebleStave, bassStave);
        lineLeft.setType(VF.StaveConnector.type.SINGLE_LEFT);
        lineLeft.setContext(this.#context).draw();

        const lineRight = new VF.StaveConnector(trebleStave, bassStave);
        lineRight.setType(VF.StaveConnector.type.SINGLE_RIGHT);
        lineRight.setContext(this.#context).draw();

        // Render treble notes
        if (vexFlowData.staves[0].notes && vexFlowData.staves[0].notes.length > 0) {
            this.#renderNotes(vexFlowData.staves[0].notes, trebleStave, 'treble');
        }

        // Render bass notes
        if (vexFlowData.staves[1].notes && vexFlowData.staves[1].notes.length > 0) {
            this.#renderNotes(vexFlowData.staves[1].notes, bassStave, 'bass');
        }

        this.#staves = [trebleStave, bassStave];
    }

    /**
     * Render notes on stave
     * @private
     */
    #renderNotes(notesData, stave, clef) {
        try {
            const notes = notesData.map((noteData, index) => {
                const staveNote = new VF.StaveNote({
                    keys: noteData.keys,
                    duration: noteData.duration,
                    clef: clef
                });

                // Store reference for highlighting
                staveNote.setAttribute('data-note-index', index);
                this.#noteElements.push(staveNote);

                return staveNote;
            });

            // Create voice
            const voice = new VF.Voice({
                num_beats: 4,
                beat_value: 4
            });

            voice.addTickables(notes);

            // Format and draw
            const formatter = new VF.Formatter();
            formatter.joinVoices([voice]).format([voice], stave.getWidth() - 20);

            voice.draw(this.#context, stave);
        } catch (error) {
            console.error('Error rendering notes:', error);
        }
    }

    /**
     * Highlight notes
     * @param {number[]} noteIndices Array of note indices to highlight
     * @param {string} color Highlight color (default: '#4CAF50')
     */
    highlightNotes(noteIndices = [], color = '#4CAF50') {
        if (!this.#context) return;

        // Clear previous highlights
        this.#clearHighlights();

        // Highlight specified notes
        noteIndices.forEach(index => {
            const noteElement = this.#noteElements[index];

            if (noteElement) {
                try {
                    // Get note head elements
                    const noteHeads = noteElement.getNoteHeads();

                    noteHeads.forEach(noteHead => {
                        // Change color
                        noteHead.setStyle({
                            fillStyle: color,
                            strokeStyle: color
                        });
                    });

                    // Redraw the note
                    noteElement.draw();
                } catch (error) {
                    console.error('Error highlighting note:', error);
                }
            }
        });
    }

    /**
     * Clear highlights
     * @private
     */
    #clearHighlights() {
        this.#noteElements.forEach(noteElement => {
            try {
                const noteHeads = noteElement.getNoteHeads();

                noteHeads.forEach(noteHead => {
                    noteHead.setStyle({
                        fillStyle: '#000',
                        strokeStyle: '#000'
                    });
                });

                noteElement.draw();
            } catch (error) {
                // Ignore errors
            }
        });
    }

    /**
     * Clear renderer
     * @private
     */
    #clear() {
        if (this.#container) {
            this.#container.innerHTML = '';
        }

        this.#staves = [];
        this.#noteElements = [];
    }

    /**
     * Dispose renderer
     */
    dispose() {
        if (this.#resizeObserver) {
            this.#resizeObserver.disconnect();
            this.#resizeObserver = null;
        }

        this.#clear();
        this.#container = null;
        this.#renderer = null;
        this.#context = null;
        this.#currentPhrase = null;
    }
}
