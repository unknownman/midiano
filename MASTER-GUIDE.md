# Documentation Index

This document serves as a central index for all documentation available in the MIDI Keyboard Trainer project.

## Core Documentation

-   **[README.md](./README.md)**: Project overview, installation, and basic usage.
-   **[QUICK-START.md](./QUICK-START.md)**: Step-by-step guide to getting up and running quickly.
-   **[COMPLETE-SYSTEM-ARCHITECTURE.md](./COMPLETE-SYSTEM-ARCHITECTURE.md)**: High-level system architecture and component design.
-   **[FINAL-INTEGRATION-SUMMARY.md](./FINAL-INTEGRATION-SUMMARY.md)**: Details on how system components are integrated and data flow.

## Technical Guides

-   **[CUSTOMIZATION-GUIDE.md](./CUSTOMIZATION-GUIDE.md)**: Instructions for customizing themes, sounds, and settings.
-   **[DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)**: Guide for deploying the web application.
-   **[DESKTOP-BUILD-GUIDE.md](./DESKTOP-BUILD-GUIDE.md)**: Instructions for building the Electron desktop application.

## Component Documentation

Detailed documentation for specific modules:

-   **MIDI Input:** `src/midi/README.md`
-   **Chord Detector:** `src/core/CHORD-DETECTOR-DOCS.md`
-   **MusicXML Parser:** `src/core/MUSICXML-PARSER-DOCS.md`
-   **Practice Engine:** `src/core/PRACTICE-ENGINE-DOCS.md`
-   **Sound Engine:** `src/core/SOUNDENGINE-DOCS.md`
-   **Sustain Tolerance:** `src/core/SUSTAIN-TOLERANCE-DOCS.md`
-   **Sheet Music:** `src/components/SHEETMUSIC-USAGE.md`

## Quick Command Reference

### Development

```bash
npm run dev                 # Start development server
npm run dev:electron        # Start Electron development mode
```

### Building

```bash
npm run build               # Build web application
npm run build:electron      # Build desktop application
npm run build:mac           # Build for macOS
npm run build:win           # Build for Windows
npm run build:linux         # Build for Linux
```

### Testing

```bash
npm test                    # Run unit tests
npm run test:ui             # Run tests with UI
npm run test:coverage       # Run tests with coverage report
```
