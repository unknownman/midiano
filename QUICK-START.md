# Quick Start Guide

This guide provides instructions for setting up and running the MIDI Keyboard Trainer application.

## Prerequisites

- Node.js 16+ installed
- MIDI keyboard connected
- Web MIDI supported browser (Chrome, Edge, Opera)

## Setup Instructions

1.  **Install Dependencies**

    Navigate to the project directory and install the required packages:

    ```bash
    npm install
    ```

2.  **Start the Application**

    Run the development server:

    ```bash
    npm run dev
    ```

    The application will be available at `http://localhost:5173` (check terminal for exact port).

## Using the Application

1.  **Connect MIDI Device**
    - Connect your MIDI keyboard to your computer.
    - Allow MIDI access when prompted by the browser.
    - Verify the connection status indicator in the app header turns green.

2.  **Initialize Audio**
    - Click anywhere on the page to initialize the audio engine (required by browser autoplay policies).

3.  **Start Practice**
    - Select your difficulty level (Beginner, Intermediate, Advanced).
    - Choose the number of chords for the session.
    - Click "Start Practice".

4.  **Practice Flow**
    - **View:** Look at the target chord name and notes on the screen.
    - **Play:** Press the corresponding notes on your MIDI keyboard.
    - **Feedback:**
        - **Green:** Correct chord. Hold for the required duration to complete.
        - **Red:** Incorrect notes. Adjust your hand position.
    - **Progress:** The session advances automatically upon successful completion of a chord.

## Troubleshooting

-   **MIDI Not Detected:** Ensure your browser supports Web MIDI and the device is connected before opening the page. Reload the page if necessary.
-   **No Sound:** Check your system volume and ensure you've interacted with the page to unlock the audio context.
-   **Visual Glitches:** Ensure hardware acceleration is enabled in your browser for optimal rendering of the virtual keyboard and animations.
