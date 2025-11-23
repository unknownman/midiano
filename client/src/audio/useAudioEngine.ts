/**
 * Enhanced Audio Engine with Dual-Channel System
 * TypeScript implementation for Vue 3
 * 
 * Features:
 * - Channel A: Reference (target chord) - Electric Piano timbre
 * - Channel B: User input - Acoustic Piano timbre
 * - <15ms latency with sample preloading
 * - Velocity-sensitive dynamics
 * - Separate mixer channels with distinct processing
 */

import * as Tone from 'tone';
import { ref, computed } from 'vue';

export interface AudioConfig {
    sampleRate: number;
    latencyHint: AudioContextLatencyCategory;
    lookAhead: number;
}

export interface NoteEvent {
    note: number;
    velocity: number;
    timestamp: number;
}

export interface TimingFeedback {
    rating: 'perfect' | 'good' | 'okay' | 'early' | 'late' | 'miss';
    offset: number;
    score: number;
    color: string;
}

export class DualChannelAudioEngine {
    private initialized = false;

    // Channel A: Reference (target)
    private referenceChannel: Tone.Channel;
    private referenceSynth: Tone.FMSynth;

    // Channel B: User input
    private userChannel: Tone.Channel;
    private userSampler: Tone.Sampler | null = null;

    // Master chain
    private masterCompressor: Tone.Compressor;
    private masterLimiter: Tone.Limiter;

    // Feedback sounds
    private feedbackSynth: Tone.Synth;

    // Latency tracking
    public latencyMs = ref(0);
    private latencyLog: number[] = [];

    constructor(config: Partial<AudioConfig> = {}) {
        const defaultConfig: AudioConfig = {
            sampleRate: 48000,
            latencyHint: 'interactive',
            lookAhead: 0.01,
            ...config
        };

        // Will initialize on user interaction
    }

    /**
     * Initialize audio system (call after user gesture)
     */
    async init(): Promise<void> {
        if (this.initialized) return;

        console.log('🎵 Initializing dual-channel audio engine...');

        // Start Tone.js with proper context options
        await Tone.start();

        // Note: Tone.context properties are read-only
        // The context is already optimized for low latency
        console.log('Audio context latency hint:', Tone.context.latencyHint);
        console.log('Audio context sample rate:', Tone.context.sampleRate);

        // Create master chain
        this.masterCompressor = new Tone.Compressor({
            threshold: -20,
            ratio: 3,
            attack: 0.003,
            release: 0.1
        });

        this.masterLimiter = new Tone.Limiter(-0.1);

        // Channel A: Reference (Electric Piano sound)
        this.referenceChannel = new Tone.Channel({
            volume: -6, // Quieter than user
            pan: -0.15  // Slightly left
        }).connect(this.masterCompressor);

        this.referenceSynth = new Tone.FMSynth({
            harmonicity: 3,
            modulationIndex: 10,
            oscillator: { type: 'sine' },
            envelope: {
                attack: 0.01,
                decay: 0.2,
                sustain: 0.3,
                release: 0.8
            },
            modulation: { type: 'square' },
            modulationEnvelope: {
                attack: 0.01,
                decay: 0.1,
                sustain: 0.2,
                release: 0.5
            }
        }).connect(this.referenceChannel);

        // Add subtle reverb to reference
        const refReverb = new Tone.Reverb({
            decay: 1.5,
            wet: 0.2
        }).connect(this.referenceChannel);
        this.referenceSynth.connect(refReverb);

        // Channel B: User (Acoustic Piano samples)
        this.userChannel = new Tone.Channel({
            volume: 0,   // Full volume
            pan: 0.15    // Slightly right
        }).connect(this.masterCompressor);

        // Load piano samples
        this.userSampler = await this.loadPianoSamples();
        this.userSampler.connect(this.userChannel);

        // Add light reverb to user
        const userReverb = new Tone.Reverb({
            decay: 1.0,
            wet: 0.1
        }).connect(this.userChannel);
        this.userSampler.connect(userReverb);

        // Feedback synth
        this.feedbackSynth = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.2 }
        }).toDestination();

        // Connect master chain to output
        this.masterCompressor.connect(this.masterLimiter);
        this.masterLimiter.toDestination();

        this.initialized = true;
        console.log('✅ Audio engine ready');
    }

    /**
     * Load piano samples with strategic preloading
     */
    private async loadPianoSamples(): Promise<Tone.Sampler> {
        const baseUrl = 'https://tonejs.github.io/audio/salamander/';

        // Preload every 3rd note for balance of quality and load time
        const sampler = new Tone.Sampler({
            urls: {
                A0: 'A0.mp3', C1: 'C1.mp3', 'D#1': 'Ds1.mp3', 'F#1': 'Fs1.mp3',
                A1: 'A1.mp3', C2: 'C2.mp3', 'D#2': 'Ds2.mp3', 'F#2': 'Fs2.mp3',
                A2: 'A2.mp3', C3: 'C3.mp3', 'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3',
                A3: 'A3.mp3', C4: 'C4.mp3', 'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3',
                A4: 'A4.mp3', C5: 'C5.mp3', 'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3',
                A5: 'A5.mp3', C6: 'C6.mp3', 'D#6': 'Ds6.mp3', 'F#6': 'Fs6.mp3',
                A6: 'A6.mp3', C7: 'C7.mp3', 'D#7': 'Ds7.mp3', 'F#7': 'Fs7.mp3',
                A7: 'A7.mp3'
            },
            baseUrl,
            attack: 0.001,
            release: 0.5
        });

        return new Promise((resolve) => {
            Tone.loaded().then(() => {
                console.log('✅ Piano samples loaded');
                resolve(sampler);
            });
        });
    }

    /**
     * Play reference chord (what user should play)
     */
    playReferenceChord(notes: number[], duration: number = 1.0): void {
        if (!this.initialized) {
            console.warn('Audio not initialized');
            return;
        }

        const noteNames = notes.map(n => Tone.Frequency(n, 'midi').toNote());
        const now = Tone.now();

        this.referenceSynth.triggerAttackRelease(noteNames, duration, now, 0.7);
    }

    /**
     * Handle user MIDI note on with latency tracking
     */
    handleUserNoteOn(midiNote: number, velocity: number): void {
        if (!this.initialized || !this.userSampler) return;

        const t0 = performance.now();

        const noteName = Tone.Frequency(midiNote, 'midi').toNote();
        const gain = this.velocityCurve(velocity);

        // Schedule immediately using AudioContext time
        this.userSampler.triggerAttack(noteName, Tone.now(), gain);

        const t1 = performance.now();
        this.trackLatency(t1 - t0);
    }

    /**
     * Handle user MIDI note off
     */
    handleUserNoteOff(midiNote: number): void {
        if (!this.initialized || !this.userSampler) return;

        const noteName = Tone.Frequency(midiNote, 'midi').toNote();
        this.userSampler.triggerRelease(noteName, Tone.now());
    }

    /**
     * Velocity curve for natural dynamics
     */
    private velocityCurve(velocity: number): number {
        const normalized = velocity / 127;
        return Math.pow(normalized, 1.5); // Slight compression
    }

    /**
     * Track and report latency
     */
    private trackLatency(latency: number): void {
        this.latencyLog.push(latency);

        if (this.latencyLog.length >= 50) {
            const avg = this.latencyLog.reduce((a, b) => a + b) / this.latencyLog.length;
            this.latencyMs.value = Math.round(avg * 10) / 10;
            this.latencyLog = [];
        }
    }

    /**
     * Play success feedback
     */
    async playSuccess(): Promise<void> {
        const now = Tone.now();
        const synth = this.feedbackSynth;

        synth.triggerAttackRelease('C5', '16n', now);
        synth.triggerAttackRelease('E5', '16n', now + 0.1);
        synth.triggerAttackRelease('G5', '16n', now + 0.2);
        synth.triggerAttackRelease('C6', '8n', now + 0.3);
    }

    /**
     * Play error feedback (gentle)
     */
    async playError(): Promise<void> {
        this.feedbackSynth.triggerAttackRelease('F3', '8n', Tone.now(), 0.3);
    }

    /**
     * Play streak milestone
     */
    async playStreak(count: number): Promise<void> {
        const octaveShift = Math.min(count, 12);
        const note = Tone.Frequency('C4').transpose(octaveShift).toNote();
        this.feedbackSynth.triggerAttackRelease(note, '16n', Tone.now(), 0.5);
    }

    /**
     * Calculate timing feedback
     */
    calculateTiming(playedTime: number, expectedTime: number): TimingFeedback {
        const offset = playedTime - expectedTime;

        if (Math.abs(offset) <= 30) {
            return { rating: 'perfect', offset, score: 100, color: '#10b981' };
        } else if (Math.abs(offset) <= 60) {
            return { rating: 'good', offset, score: 80, color: '#84cc16' };
        } else if (Math.abs(offset) <= 100) {
            return { rating: 'okay', offset, score: 50, color: '#eab308' };
        } else if (offset < -100) {
            return { rating: 'early', offset, score: 30, color: '#f97316' };
        } else if (offset > 100) {
            return { rating: 'late', offset, score: 30, color: '#a855f7' };
        } else {
            return { rating: 'miss', offset, score: 0, color: '#ef4444' };
        }
    }

    /**
     * Cleanup
     */
    dispose(): void {
        this.referenceSynth?.dispose();
        this.userSampler?.dispose();
        this.referenceChannel?.dispose();
        this.userChannel?.dispose();
        this.masterCompressor?.dispose();
        this.masterLimiter?.dispose();
        this.feedbackSynth?.dispose();
        this.initialized = false;
    }
}

/**
 * Vue composable for audio engine
 */
export function useAudioEngine() {
    const engine = new DualChannelAudioEngine();
    const isReady = ref(false);
    const latency = computed(() => engine.latencyMs.value);

    async function initialize() {
        await engine.init();
        isReady.value = true;
    }

    return {
        engine,
        isReady,
        latency,
        initialize,
        playReferenceChord: (notes: number[], duration?: number) =>
            engine.playReferenceChord(notes, duration),
        handleNoteOn: (note: number, velocity: number) =>
            engine.handleUserNoteOn(note, velocity),
        handleNoteOff: (note: number) =>
            engine.handleUserNoteOff(note),
        playSuccess: () => engine.playSuccess(),
        playError: () => engine.playError(),
        playStreak: (count: number) => engine.playStreak(count),
        calculateTiming: (played: number, expected: number) =>
            engine.calculateTiming(played, expected)
    };
}
