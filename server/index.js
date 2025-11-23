/**
 * WebSocket MIDI Bridge Server
 * Relays MIDI messages from native Node MIDI devices to browser clients
 * Fallback for environments without Web MIDI API support
 */

import { WebSocketServer } from 'ws';
import easymidi from 'easymidi';

const PORT = 3001;
const wss = new WebSocketServer({ port: PORT });

let midiInput = null;
let clients = new Set();

console.log(`🎹 MIDI Bridge Server starting on port ${PORT}...`);

// Discover MIDI devices
function listMIDIDevices() {
    try {
        const inputs = easymidi.getInputs();
        const outputs = easymidi.getOutputs();

        console.log('\n📱 Available MIDI Devices:');
        console.log('Inputs:', inputs.length > 0 ? inputs : 'None');
        console.log('Outputs:', outputs.length > 0 ? outputs : 'None');

        return { inputs, outputs };
    } catch (error) {
        console.error('❌ Error listing MIDI devices:', error.message);
        return { inputs: [], outputs: [] };
    }
}

// Initialize MIDI input
function initMIDI(deviceName) {
    try {
        if (midiInput) {
            midiInput.close();
        }

        midiInput = new easymidi.Input(deviceName);
        console.log(`✅ Connected to MIDI device: ${deviceName}`);

        // Listen for note on/off events
        midiInput.on('noteon', (msg) => {
            broadcast({
                type: 'noteon',
                note: msg.note,
                velocity: msg.velocity,
                channel: msg.channel,
                timestamp: Date.now()
            });
        });

        midiInput.on('noteoff', (msg) => {
            broadcast({
                type: 'noteoff',
                note: msg.note,
                velocity: msg.velocity,
                channel: msg.channel,
                timestamp: Date.now()
            });
        });

        // Listen for control change (sustain pedal, etc.)
        midiInput.on('cc', (msg) => {
            broadcast({
                type: 'cc',
                controller: msg.controller,
                value: msg.value,
                channel: msg.channel,
                timestamp: Date.now()
            });
        });

        return true;
    } catch (error) {
        console.error(`❌ Error connecting to MIDI device "${deviceName}":`, error.message);
        return false;
    }
}

// Broadcast message to all connected clients
function broadcast(message) {
    const data = JSON.stringify(message);
    clients.forEach(client => {
        if (client.readyState === 1) { // WebSocket.OPEN
            client.send(data);
        }
    });
}

// WebSocket server
wss.on('connection', (ws) => {
    console.log('🔌 Client connected');
    clients.add(ws);

    // Send current device list on connection
    const devices = listMIDIDevices();
    ws.send(JSON.stringify({
        type: 'devices',
        inputs: devices.inputs,
        outputs: devices.outputs
    }));

    // Handle client messages
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            switch (data.type) {
                case 'connect':
                    if (data.deviceName) {
                        const success = initMIDI(data.deviceName);
                        ws.send(JSON.stringify({
                            type: 'connected',
                            success,
                            deviceName: data.deviceName
                        }));
                    }
                    break;

                case 'list':
                    const devs = listMIDIDevices();
                    ws.send(JSON.stringify({
                        type: 'devices',
                        inputs: devs.inputs,
                        outputs: devs.outputs
                    }));
                    break;

                default:
                    console.log('Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    });

    ws.on('close', () => {
        console.log('🔌 Client disconnected');
        clients.delete(ws);
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// Auto-connect to first available MIDI device
const devices = listMIDIDevices();
if (devices.inputs.length > 0) {
    console.log(`\n🎹 Auto-connecting to: ${devices.inputs[0]}`);
    initMIDI(devices.inputs[0]);
} else {
    console.log('\n⚠️  No MIDI devices found. Waiting for client connection...');
}

console.log(`\n✅ Server ready! Connect your browser to ws://localhost:${PORT}\n`);

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    if (midiInput) {
        midiInput.close();
    }
    wss.close();
    process.exit(0);
});
