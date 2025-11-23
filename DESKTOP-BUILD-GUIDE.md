# 🖥️ Desktop App Build Guide - Electron Packaging

## Quick Start

```bash
# Install Electron dependencies
npm install --save-dev electron electron-builder concurrently wait-on cross-env

# Install native MIDI library
npm install midi

# Install TypeScript types
npm install --save-dev @types/node @types/electron
```

---

## Project Setup

### 1. Update `package.json`

```json
{
  "name": "midi-keyboard-trainer",
  "version": "1.0.0",
  "description": "Melodics-style MIDI keyboard training application",
  "main": "electron/main.js",
  "author": "Your Name",
  "license": "MIT",
  "scripts": {
    "dev": "vite",
    "dev:electron": "concurrently \"cross-env BROWSER=none npm run dev\" \"wait-on http://localhost:5173 && electron .\"",
    "build": "vite build",
    "build:electron": "npm run build && electron-builder",
    "build:mac": "npm run build && electron-builder --mac",
    "build:win": "npm run build && electron-builder --win",
    "build:linux": "npm run build && electron-builder --linux",
    "build:all": "npm run build && electron-builder -mwl"
  },
  "build": {
    "appId": "com.yourcompany.midi-trainer",
    "productName": "MIDI Keyboard Trainer",
    "directories": {
      "output": "dist-electron",
      "buildResources": "build"
    },
    "files": [
      "electron/**/*",
      "client/dist/**/*",
      "package.json"
    ],
    "mac": {
      "category": "public.app-category.music",
      "target": ["dmg", "zip"],
      "icon": "build/icon.icns",
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "build/entitlements.mac.plist",
      "entitlementsInherit": "build/entitlements.mac.plist"
    },
    "win": {
      "target": ["nsis", "portable"],
      "icon": "build/icon.ico"
    },
    "linux": {
      "target": ["AppImage", "deb", "rpm"],
      "category": "Audio;Music;Education",
      "icon": "build/icon.png"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  }
}
```

### 2. Create Electron Files

Create `electron/main.js`:

```javascript
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const midi = require('midi');

let mainWindow;
let midiInput;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1a1a2e',
    show: false
  });

  // Load app
  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../client/dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Setup MIDI
  setupMIDI();
}

function setupMIDI() {
  midiInput = new midi.Input();
  
  midiInput.on('message', (deltaTime, message) => {
    mainWindow.webContents.send('midi:message', {
      data: message,
      timestamp: Date.now()
    });
  });
}

// IPC Handlers
ipcMain.handle('midi:get-devices', () => {
  const deviceCount = midiInput.getPortCount();
  const devices = [];
  
  for (let i = 0; i < deviceCount; i++) {
    devices.push(midiInput.getPortName(i));
  }
  
  return devices;
});

ipcMain.handle('midi:connect', (event, deviceName) => {
  const deviceCount = midiInput.getPortCount();
  
  for (let i = 0; i < deviceCount; i++) {
    if (midiInput.getPortName(i) === deviceName) {
      midiInput.openPort(i);
      return true;
    }
  }
  
  return false;
});

ipcMain.handle('midi:disconnect', () => {
  midiInput.closePort();
});

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('quit', () => {
  if (midiInput) {
    midiInput.closePort();
  }
});
```

Create `electron/preload.js`:

```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getMIDIDevices: () => ipcRenderer.invoke('midi:get-devices'),
  connectMIDI: (deviceName) => ipcRenderer.invoke('midi:connect', deviceName),
  disconnectMIDI: () => ipcRenderer.invoke('midi:disconnect'),
  onMIDIMessage: (callback) => {
    ipcRenderer.on('midi:message', (event, data) => callback(data));
  }
});
```

### 3. Update Vite Config

Edit `vite.config.js`:

```javascript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  base: process.env.ELECTRON === 'true' ? './' : '/',
  build: {
    outDir: 'client/dist',
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src')
    }
  }
});
```

### 4. Create Icons

You need icons for each platform:

```
build/
├── icon.icns      # macOS (512x512 PNG → convert to .icns)
├── icon.ico       # Windows (256x256 PNG → convert to .ico)
└── icon.png       # Linux (512x512 PNG)
```

**Generate icons:**
```bash
# Install icon generator
npm install --save-dev electron-icon-builder

# Generate from a single 1024x1024 PNG
npx electron-icon-builder --input=./icon.png --output=./build
```

---

## Building

### Development Mode

```bash
# Run Electron in development
npm run dev:electron

# This will:
# 1. Start Vite dev server
# 2. Wait for it to be ready
# 3. Launch Electron
# 4. Enable hot reload
```

### Production Build

```bash
# Build for current platform
npm run build:electron

# Build for macOS
npm run build:mac

# Build for Windows
npm run build:win

# Build for Linux
npm run build:linux

# Build for all platforms
npm run build:all
```

### Output

```
dist-electron/
├── mac/
│   ├── MIDI Keyboard Trainer.app
│   ├── MIDI Keyboard Trainer.dmg
│   └── MIDI Keyboard Trainer-mac.zip
├── win-unpacked/
│   └── MIDI Keyboard Trainer.exe
├── MIDI Keyboard Trainer Setup.exe
├── MIDI Keyboard Trainer.exe (portable)
└── linux/
    ├── midi-keyboard-trainer.AppImage
    ├── midi-keyboard-trainer.deb
    └── midi-keyboard-trainer.rpm
```

---

## Code Signing (Optional but Recommended)

### macOS

```bash
# Get your Developer ID
security find-identity -v -p codesigning

# Sign the app
electron-builder --mac --sign
```

Add to `package.json`:
```json
{
  "build": {
    "mac": {
      "identity": "Developer ID Application: Your Name (TEAM_ID)"
    }
  }
}
```

### Windows

```bash
# Get a code signing certificate
# Sign with electron-builder
electron-builder --win --sign
```

---

## Auto-Updater (Optional)

Install:
```bash
npm install electron-updater
```

Add to `electron/main.js`:
```javascript
const { autoUpdater } = require('electron-updater');

app.whenReady().then(() => {
  createWindow();
  
  // Check for updates
  autoUpdater.checkForUpdatesAndNotify();
});

autoUpdater.on('update-available', () => {
  mainWindow.webContents.send('update-available');
});

autoUpdater.on('update-downloaded', () => {
  mainWindow.webContents.send('update-downloaded');
});
```

---

## Distribution

### macOS

**Option 1: Direct Download**
- Upload `.dmg` to your website
- Users drag to Applications folder

**Option 2: Mac App Store**
- Requires Apple Developer account ($99/year)
- Use `electron-builder` with `mas` target

### Windows

**Option 1: Direct Download**
- Provide both installer (`.exe`) and portable version

**Option 2: Microsoft Store**
- Package as MSIX
- Submit to Microsoft Partner Center

### Linux

**Option 1: Direct Download**
- Provide AppImage (universal)
- Provide .deb (Debian/Ubuntu)
- Provide .rpm (Fedora/RedHat)

**Option 2: Package Managers**
- Snap Store
- Flathub

---

## Testing Checklist

```
□ Test on macOS (10.13+)
□ Test on Windows (10+)
□ Test on Linux (Ubuntu, Fedora)
□ Verify MIDI devices detected
□ Test audio playback
□ Test all animations
□ Check file size (<100MB ideal)
□ Verify auto-updates work
□ Test installer/uninstaller
□ Check app signing
```

---

## Troubleshooting

### "App can't be opened" (macOS)
```bash
# Remove quarantine flag
xattr -cr "/Applications/MIDI Keyboard Trainer.app"
```

### MIDI not working
- Check native module compilation
- Rebuild for Electron:
```bash
npm rebuild --runtime=electron --target=<electron-version>
```

### Large bundle size
```javascript
// In vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          tone: ['tone']
        }
      }
    }
  }
});
```

---

## Performance Optimization

### Reduce App Size

```json
{
  "build": {
    "compression": "maximum",
    "asar": true,
    "asarUnpack": ["**/*.node"]
  }
}
```

### Faster Startup

```javascript
// In electron/main.js
app.commandLine.appendSwitch('disable-gpu-vsync');
app.commandLine.appendSwitch('disable-frame-rate-limit');
```

---

**🖥️ Your Desktop App is Ready to Ship!**

Build once, run everywhere! 🚀
