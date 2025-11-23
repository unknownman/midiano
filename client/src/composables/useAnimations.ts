/**
 * Animation Clock & Key Animation Composables
 * Vue 3 Composition API for tempo-synced, velocity-reactive animations
 */

import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import * as Tone from 'tone';

/* ============================================================================
   useAnimationClock - Tempo-synced animation timing
   ============================================================================ */

export interface AnimationClockConfig {
    bpm: number;
    beatsPerMeasure: number;
    onBeat?: (beatNumber: number) => void;
    onDownbeat?: () => void;
}

export function useAnimationClock(config: AnimationClockConfig) {
    const bpm = ref(config.bpm || 120);
    const beatsPerMeasure = ref(config.beatsPerMeasure || 4);
    const isPlaying = ref(false);
    const currentBeat = ref(0);
    const currentMeasure = ref(0);

    // Calculate timing
    const beatDuration = computed(() => (60 / bpm.value) * 1000); // ms
    const measureDuration = computed(() => beatDuration.value * beatsPerMeasure.value);

    let animationFrameId: number | null = null;
    let lastBeatTime = 0;
    let nextBeatTime = 0;

    /**
     * Start the animation clock
     */
    function start() {
        if (isPlaying.value) return;

        isPlaying.value = true;
        lastBeatTime = performance.now();
        nextBeatTime = lastBeatTime + beatDuration.value;
        currentBeat.value = 0;
        currentMeasure.value = 0;

        tick();
    }

    /**
     * Stop the animation clock
     */
    function stop() {
        isPlaying.value = false;
        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    }

    /**
     * Animation loop (RAF for precise timing)
     */
    function tick() {
        if (!isPlaying.value) return;

        const now = performance.now();

        // Check if we've hit the next beat
        if (now >= nextBeatTime) {
            currentBeat.value = (currentBeat.value + 1) % beatsPerMeasure.value;

            // Downbeat (first beat of measure)
            if (currentBeat.value === 0) {
                currentMeasure.value++;
                config.onDownbeat?.();
            }

            // Any beat
            config.onBeat?.(currentBeat.value);

            // Schedule next beat
            lastBeatTime = nextBeatTime;
            nextBeatTime += beatDuration.value;
        }

        animationFrameId = requestAnimationFrame(tick);
    }

    /**
     * Sync with WebAudio clock (for ultra-precise timing)
     */
    function syncWithAudioContext() {
        if (!Tone.context) return;

        const audioTime = Tone.context.currentTime;
        const performanceTime = performance.now();

        // Calculate offset between clocks
        const offset = audioTime * 1000 - performanceTime;

        // Adjust next beat time
        nextBeatTime += offset;
    }

    /**
     * Update BPM dynamically
     */
    function setBPM(newBPM: number) {
        bpm.value = newBPM;

        // Update CSS variable
        document.documentElement.style.setProperty('--current-bpm', String(newBPM));
        document.documentElement.style.setProperty(
            '--beat-duration',
            `${(60 / newBPM) * 1000}ms`
        );
    }

    // Cleanup
    onUnmounted(() => {
        stop();
    });

    return {
        bpm,
        beatsPerMeasure,
        isPlaying,
        currentBeat,
        currentMeasure,
        beatDuration,
        measureDuration,
        start,
        stop,
        setBPM,
        syncWithAudioContext
    };
}

/* ============================================================================
   useKeyAnimation - Velocity-reactive key animations
   ============================================================================ */

export interface KeyAnimationState {
    isPressed: boolean;
    isTarget: boolean;
    velocity: number;
    feedbackState: 'perfect' | 'good' | 'okay' | 'early' | 'late' | 'wrong' | null;
}

export function useKeyAnimation(note: number) {
    const state = ref<KeyAnimationState>({
        isPressed: false,
        isTarget: false,
        velocity: 0,
        feedbackState: null
    });

    // Computed CSS variables based on velocity
    const keyStyle = computed(() => {
        if (!state.value.isPressed) {
            return {};
        }

        // Velocity curve: 0-127 → 0.95-1.15 scale, 0.8-1.5 brightness
        const velocityNorm = state.value.velocity / 127;
        const scale = 0.95 + (velocityNorm * 0.2);
        const brightness = 0.8 + (velocityNorm * 0.7);
        const glowIntensity = velocityNorm;

        return {
            '--key-scale': scale,
            '--key-brightness': brightness,
            '--key-glow-intensity': glowIntensity
        };
    });

    // CSS classes based on state
    const keyClasses = computed(() => {
        const classes: string[] = ['piano-key'];

        if (state.value.isTarget) classes.push('target');
        if (state.value.isPressed) classes.push('pressed');
        if (state.value.feedbackState) {
            classes.push(`feedback-${state.value.feedbackState}`);
        }

        return classes;
    });

    /**
     * Trigger note-on animation
     */
    function pressKey(velocity: number) {
        state.value.isPressed = true;
        state.value.velocity = velocity;

        // Trigger blast effect for high velocity
        if (velocity > 100) {
            triggerBlast();
        }
    }

    /**
     * Trigger note-off animation
     */
    function releaseKey() {
        state.value.isPressed = false;
        state.value.velocity = 0;
        state.value.feedbackState = null;
    }

    /**
     * Set target state (preview)
     */
    function setTarget(isTarget: boolean) {
        state.value.isTarget = isTarget;
    }

    /**
     * Set feedback state (accuracy)
     */
    function setFeedback(feedback: KeyAnimationState['feedbackState']) {
        state.value.feedbackState = feedback;

        // Auto-clear feedback after animation
        setTimeout(() => {
            if (state.value.feedbackState === feedback) {
                state.value.feedbackState = null;
            }
        }, 400);
    }

    /**
     * Trigger velocity blast effect
     */
    function triggerBlast() {
        // Add blast class temporarily
        const element = document.querySelector(`[data-note="${note}"]`);
        if (!element) return;

        element.classList.add('blast');
        setTimeout(() => {
            element.classList.remove('blast');
        }, 125); // Duration of blast animation
    }

    /**
     * Create particle burst effect
     */
    function createParticleBurst(x: number, y: number, count: number = 12) {
        const container = document.querySelector('.particle-container');
        if (!container) return;

        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.className = 'success-particle';

            // Random direction
            const angle = (Math.PI * 2 * i) / count;
            const distance = 50 + Math.random() * 50;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance;

            particle.style.cssText = `
        left: ${x}px;
        top: ${y}px;
        --tx: ${tx}px;
        --ty: ${ty}px;
      `;

            container.appendChild(particle);

            // Remove after animation
            setTimeout(() => {
                particle.remove();
            }, 800);
        }
    }

    /**
     * Create ripple effect
     */
    function createRipple(x: number, y: number) {
        const container = document.querySelector('.particle-container');
        if (!container) return;

        const ripple = document.createElement('div');
        ripple.className = 'success-ripple';
        ripple.style.cssText = `left: ${x}px; top: ${y}px;`;

        container.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    return {
        state,
        keyStyle,
        keyClasses,
        pressKey,
        releaseKey,
        setTarget,
        setFeedback,
        createParticleBurst,
        createRipple
    };
}

/* ============================================================================
   useMetronomePulse - Tempo-synced metronome bar animation
   ============================================================================ */

export function useMetronomePulse(animationClock: ReturnType<typeof useAnimationClock>) {
    const pulsePosition = ref(0);
    const beatMarkers = ref<number[]>([]);
    const activeBeat = ref(-1);

    let animationFrameId: number | null = null;

    /**
     * Initialize beat markers
     */
    function initBeatMarkers() {
        const count = animationClock.beatsPerMeasure.value;
        beatMarkers.value = Array.from({ length: count }, (_, i) => (i / count) * 100);
    }

    /**
     * Start pulse animation
     */
    function start() {
        initBeatMarkers();
        animate();
    }

    /**
     * Stop pulse animation
     */
    function stop() {
        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    }

    /**
     * Animation loop
     */
    function animate() {
        if (!animationClock.isPlaying.value) return;

        const beatDuration = animationClock.beatDuration.value;
        const now = performance.now();

        // Calculate position within current beat (0-1)
        const beatProgress = ((now % beatDuration) / beatDuration);

        // Calculate position within measure (0-100)
        const measureProgress = (
            (animationClock.currentBeat.value + beatProgress) /
            animationClock.beatsPerMeasure.value
        ) * 100;

        pulsePosition.value = measureProgress;

        animationFrameId = requestAnimationFrame(animate);
    }

    /**
     * Handle beat event
     */
    function onBeat(beatNumber: number) {
        activeBeat.value = beatNumber;

        // Create wave effect on downbeat
        if (beatNumber === 0) {
            createWaveEffect();
        }

        // Deactivate after short delay
        setTimeout(() => {
            activeBeat.value = -1;
        }, 100);
    }

    /**
     * Create expanding wave effect
     */
    function createWaveEffect() {
        const container = document.querySelector('.metronome-bar');
        if (!container) return;

        const wave = document.createElement('div');
        wave.className = 'beat-wave active';
        wave.style.left = '0%';

        container.appendChild(wave);

        setTimeout(() => {
            wave.remove();
        }, animationClock.beatDuration.value / 4);
    }

    // Watch for beat changes
    watch(() => animationClock.currentBeat.value, onBeat);

    // Cleanup
    onUnmounted(() => {
        stop();
    });

    return {
        pulsePosition,
        beatMarkers,
        activeBeat,
        start,
        stop
    };
}

/* ============================================================================
   Animation Batching - Optimize multiple simultaneous animations
   ============================================================================ */

export class AnimationBatcher {
    private pendingAnimations: Map<string, () => void> = new Map();
    private rafId: number | null = null;

    /**
     * Schedule an animation to run on next frame
     */
    schedule(key: string, fn: () => void) {
        this.pendingAnimations.set(key, fn);

        if (this.rafId === null) {
            this.rafId = requestAnimationFrame(() => this.flush());
        }
    }

    /**
     * Execute all pending animations
     */
    private flush() {
        this.pendingAnimations.forEach(fn => fn());
        this.pendingAnimations.clear();
        this.rafId = null;
    }

    /**
     * Cancel all pending animations
     */
    cancel() {
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        this.pendingAnimations.clear();
    }
}

export const globalAnimationBatcher = new AnimationBatcher();
