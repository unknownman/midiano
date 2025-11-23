/**
 * MidiInputManager Tests
 * Comprehensive test suite with WebMIDI API mocking
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MidiInputManager, detectChord } from './MidiInputManager.js';

// Mock WebMIDI API
class MockMIDIInput {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.manufacturer = 'Mock Manufacturer';
        this.type = 'input';
        this.state = 'connected';
        this.connection = 'open';
        this.onmidimessage = null;
    }

    simulateNoteOn(note, velocity = 100) {
        if (this.onmidimessage) {
            const event = {
                data: [0x90, note, velocity], // Note On, channel 1
                timeStamp: performance.now()
            };
            this.onmidimessage(event);
        }
    }

    simulateNoteOff(note) {
        if (this.onmidimessage) {
            const event = {
                data: [0x80, note, 0], // Note Off, channel 1
                timeStamp: performance.now()
            };
            this.onmidimessage(event);
        }
    }

    simulateControlChange(controller, value) {
        if (this.onmidimessage) {
            const event = {
                data: [0xb0, controller, value], // Control Change, channel 1
                timeStamp: performance.now()
            };
            this.onmidimessage(event);
        }
    }
}

class MockMIDIAccess {
    constructor() {
        this.inputs = new Map();
        this.outputs = new Map();
        this.onstatechange = null;

        // Add a default mock device
        const mockInput = new MockMIDIInput('mock-device-1', 'Mock MIDI Keyboard');
        this.inputs.set(mockInput.id, mockInput);
    }

    simulateDeviceConnection(id, name) {
        const input = new MockMIDIInput(id, name);
        this.inputs.set(id, input);

        if (this.onstatechange) {
            this.onstatechange({
                port: { ...input, state: 'connected' }
            });
        }
    }

    simulateDeviceDisconnection(id) {
        const input = this.inputs.get(id);
        if (input && this.onstatechange) {
            this.onstatechange({
                port: { ...input, state: 'disconnected' }
            });
        }
        this.inputs.delete(id);
    }
}

// Mock navigator.requestMIDIAccess
const mockMIDIAccess = new MockMIDIAccess();
global.navigator = {
    requestMIDIAccess: vi.fn().mockResolvedValue(mockMIDIAccess)
};

describe('MidiInputManager', () => {
    let manager;
    let mockInput;

    beforeEach(async () => {
        manager = new MidiInputManager({ debounceDelay: 40 });
        await manager.initialize();
        mockInput = mockMIDIAccess.inputs.get('mock-device-1');
    });

    afterEach(() => {
        manager.dispose();
        vi.clearAllTimers();
    });

    describe('Initialization', () => {
        it('should initialize successfully', async () => {
            expect(manager.isConnected()).toBe(true);
        });

        it('should throw error if WebMIDI not supported', async () => {
            const originalRequestMIDIAccess = global.navigator.requestMIDIAccess;
            delete global.navigator.requestMIDIAccess;

            const newManager = new MidiInputManager();
            await expect(newManager.initialize()).rejects.toThrow('WebMIDI API not supported');

            global.navigator.requestMIDIAccess = originalRequestMIDIAccess;
        });

        it('should list available devices', () => {
            const devices = manager.getAvailableDevices();
            expect(devices).toHaveLength(1);
            expect(devices[0].name).toBe('Mock MIDI Keyboard');
        });
    });

    describe('Note Tracking', () => {
        it('should track note on events', () => {
            const noteOnSpy = vi.fn();
            manager.on('noteOn', noteOnSpy);

            mockInput.simulateNoteOn(60, 100); // C4

            expect(noteOnSpy).toHaveBeenCalledWith({
                note: 60,
                velocity: 100,
                timestamp: expect.any(Number)
            });

            expect(manager.getActiveNotes()).toContain(60);
        });

        it('should track note off events', () => {
            const noteOffSpy = vi.fn();
            manager.on('noteOff', noteOffSpy);

            mockInput.simulateNoteOn(60, 100);
            mockInput.simulateNoteOff(60);

            expect(noteOffSpy).toHaveBeenCalledWith({
                note: 60,
                timestamp: expect.any(Number)
            });

            expect(manager.getActiveNotes()).not.toContain(60);
        });

        it('should track multiple simultaneous notes', () => {
            mockInput.simulateNoteOn(60, 100); // C
            mockInput.simulateNoteOn(64, 100); // E
            mockInput.simulateNoteOn(67, 100); // G

            const activeNotes = manager.getActiveNotes();
            expect(activeNotes).toHaveLength(3);
            expect(activeNotes).toContain(60);
            expect(activeNotes).toContain(64);
            expect(activeNotes).toContain(67);
        });

        it('should store note velocities', () => {
            mockInput.simulateNoteOn(60, 80);
            mockInput.simulateNoteOn(64, 120);

            expect(manager.getNoteVelocity(60)).toBe(80);
            expect(manager.getNoteVelocity(64)).toBe(120);
        });
    });

    describe('Stability Buffer (Debounce)', () => {
        it('should debounce chord detection', async () => {
            const chordDetectedSpy = vi.fn();
            manager.on('chordDetected', chordDetectedSpy);

            // Simulate user pressing chord notes quickly
            mockInput.simulateNoteOn(60, 100); // C
            await new Promise(resolve => setTimeout(resolve, 10));
            mockInput.simulateNoteOn(64, 100); // E
            await new Promise(resolve => setTimeout(resolve, 10));
            mockInput.simulateNoteOn(67, 100); // G

            // Should not emit immediately
            expect(chordDetectedSpy).not.toHaveBeenCalled();

            // Wait for debounce delay
            await new Promise(resolve => setTimeout(resolve, 50));

            // Should emit after stability
            expect(chordDetectedSpy).toHaveBeenCalledTimes(1);
            expect(chordDetectedSpy).toHaveBeenCalledWith({
                notes: [60, 64, 67],
                velocities: [100, 100, 100],
                timestamp: expect.any(Number)
            });
        });

        it('should not emit chord for single note', async () => {
            const chordDetectedSpy = vi.fn();
            manager.on('chordDetected', chordDetectedSpy);

            mockInput.simulateNoteOn(60, 100);

            await new Promise(resolve => setTimeout(resolve, 50));

            expect(chordDetectedSpy).not.toHaveBeenCalled();
        });

        it('should emit stableNotes for single note', async () => {
            const stableNotesSpy = vi.fn();
            manager.on('stableNotes', stableNotesSpy);

            mockInput.simulateNoteOn(60, 100);

            await new Promise(resolve => setTimeout(resolve, 50));

            expect(stableNotesSpy).toHaveBeenCalledWith({
                notes: [60],
                velocities: [100],
                timestamp: expect.any(Number)
            });
        });

        it('should reset debounce timer on new note', async () => {
            const chordDetectedSpy = vi.fn();
            manager.on('chordDetected', chordDetectedSpy);

            mockInput.simulateNoteOn(60, 100);
            await new Promise(resolve => setTimeout(resolve, 30));

            // Add another note before debounce completes
            mockInput.simulateNoteOn(64, 100);
            await new Promise(resolve => setTimeout(resolve, 30));

            // Should not have emitted yet
            expect(chordDetectedSpy).not.toHaveBeenCalled();

            // Wait for full debounce
            await new Promise(resolve => setTimeout(resolve, 50));

            // Should emit once with both notes
            expect(chordDetectedSpy).toHaveBeenCalledTimes(1);
            expect(chordDetectedSpy).toHaveBeenCalledWith({
                notes: expect.arrayContaining([60, 64]),
                velocities: expect.any(Array),
                timestamp: expect.any(Number)
            });
        });

        it('should emit notesCleared when all notes released', async () => {
            const notesClearedSpy = vi.fn();
            manager.on('notesCleared', notesClearedSpy);

            mockInput.simulateNoteOn(60, 100);
            mockInput.simulateNoteOn(64, 100);
            await new Promise(resolve => setTimeout(resolve, 50));

            mockInput.simulateNoteOff(60);
            mockInput.simulateNoteOff(64);
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(notesClearedSpy).toHaveBeenCalled();
        });
    });

    describe('Stable Notes', () => {
        it('should return stable notes after debounce', async () => {
            mockInput.simulateNoteOn(60, 100);
            mockInput.simulateNoteOn(64, 100);
            mockInput.simulateNoteOn(67, 100);

            // Immediately after, stable notes should be empty
            expect(manager.getStableNotes()).toHaveLength(0);

            // Wait for debounce
            await new Promise(resolve => setTimeout(resolve, 50));

            // Now stable notes should be populated
            const stableNotes = manager.getStableNotes();
            expect(stableNotes).toHaveLength(3);
            expect(stableNotes).toContain(60);
            expect(stableNotes).toContain(64);
            expect(stableNotes).toContain(67);
        });

        it('should differentiate active vs stable notes', async () => {
            mockInput.simulateNoteOn(60, 100);
            await new Promise(resolve => setTimeout(resolve, 50));

            // Add new note
            mockInput.simulateNoteOn(64, 100);

            // Active notes should include both
            expect(manager.getActiveNotes()).toHaveLength(2);

            // Stable notes should only have first note
            expect(manager.getStableNotes()).toHaveLength(1);
            expect(manager.getStableNotes()).toContain(60);

            // Wait for debounce
            await new Promise(resolve => setTimeout(resolve, 50));

            // Now stable notes should match active notes
            expect(manager.getStableNotes()).toHaveLength(2);
        });
    });

    describe('Event Listeners', () => {
        it('should register and call event listeners', () => {
            const callback = vi.fn();
            manager.on('noteOn', callback);

            mockInput.simulateNoteOn(60, 100);

            expect(callback).toHaveBeenCalled();
        });

        it('should unregister event listeners', () => {
            const callback = vi.fn();
            manager.on('noteOn', callback);
            manager.off('noteOn', callback);

            mockInput.simulateNoteOn(60, 100);

            expect(callback).not.toHaveBeenCalled();
        });

        it('should handle multiple listeners for same event', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();

            manager.on('noteOn', callback1);
            manager.on('noteOn', callback2);

            mockInput.simulateNoteOn(60, 100);

            expect(callback1).toHaveBeenCalled();
            expect(callback2).toHaveBeenCalled();
        });

        it('should handle errors in listeners gracefully', () => {
            const errorCallback = vi.fn(() => {
                throw new Error('Test error');
            });
            const normalCallback = vi.fn();

            manager.on('noteOn', errorCallback);
            manager.on('noteOn', normalCallback);

            // Should not throw
            expect(() => {
                mockInput.simulateNoteOn(60, 100);
            }).not.toThrow();

            // Normal callback should still be called
            expect(normalCallback).toHaveBeenCalled();
        });
    });

    describe('Device Management', () => {
        it('should handle device connection', () => {
            const deviceConnectedSpy = vi.fn();
            manager.on('deviceConnected', deviceConnectedSpy);

            mockMIDIAccess.simulateDeviceConnection('new-device', 'New Keyboard');

            expect(deviceConnectedSpy).toHaveBeenCalledWith({
                id: 'new-device',
                name: 'New Keyboard',
                manufacturer: 'Mock Manufacturer'
            });
        });

        it('should handle device disconnection', () => {
            const deviceDisconnectedSpy = vi.fn();
            manager.on('deviceDisconnected', deviceDisconnectedSpy);

            mockMIDIAccess.simulateDeviceDisconnection('mock-device-1');

            expect(deviceDisconnectedSpy).toHaveBeenCalled();
            expect(manager.isConnected()).toBe(false);
        });

        it('should disconnect cleanly', () => {
            mockInput.simulateNoteOn(60, 100);

            manager.disconnect();

            expect(manager.isConnected()).toBe(false);
            expect(manager.getActiveNotes()).toHaveLength(0);
            expect(manager.getStableNotes()).toHaveLength(0);
        });
    });

    describe('Configuration', () => {
        it('should get and set debounce delay', () => {
            expect(manager.getDebounceDelay()).toBe(40);

            manager.setDebounceDelay(50);
            expect(manager.getDebounceDelay()).toBe(50);
        });

        it('should warn for invalid debounce delay', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

            manager.setDebounceDelay(5); // Too low
            expect(warnSpy).toHaveBeenCalled();

            manager.setDebounceDelay(150); // Too high
            expect(warnSpy).toHaveBeenCalled();

            warnSpy.mockRestore();
        });
    });

    describe('Memory Management', () => {
        it('should clean up on dispose', () => {
            mockInput.simulateNoteOn(60, 100);

            manager.dispose();

            expect(manager.isConnected()).toBe(false);
            expect(manager.getActiveNotes()).toHaveLength(0);
        });

        it('should not leak event listeners', () => {
            const callback = vi.fn();

            for (let i = 0; i < 100; i++) {
                manager.on('noteOn', callback);
            }

            manager.dispose();

            // After dispose, no listeners should be called
            mockInput.simulateNoteOn(60, 100);
            expect(callback).not.toHaveBeenCalled();
        });
    });

    describe('Control Change Events', () => {
        it('should emit control change events', () => {
            const ccSpy = vi.fn();
            manager.on('controlChange', ccSpy);

            mockInput.simulateControlChange(64, 127); // Sustain pedal

            expect(ccSpy).toHaveBeenCalledWith({
                controller: 64,
                value: 127
            });
        });
    });
});

describe('detectChord (mock)', () => {
    it('should return null for single note', () => {
        const result = detectChord([60]);
        expect(result).toBeNull();
    });

    it('should return mock chord for multiple notes', () => {
        const result = detectChord([60, 64, 67]);
        expect(result).toEqual({
            notes: [60, 64, 67],
            name: 'Mock Chord',
            type: 'major',
            root: 60,
            confidence: 1.0
        });
    });
});
