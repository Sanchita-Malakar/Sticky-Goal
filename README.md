# 🎯 Sticky Goal

<div align="center">

![Electron](https://img.shields.io/badge/Electron-41.7.1-47848F?style=for-the-badge&logo=electron&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge)

**The tactile, delightful experience of real paper sticky notes attached to your laptop screen — supercharged with automatic persistence, smart 2-priority floating/desktop z-ordering, live deadline countdowns, synthesized audio chimes, and checklist tasks.**

[Features](#-key-features) • [Screen Mechanics](#-smart-2-priority-screen-mechanics) • [Quick Start](#-quick-start) • [Shortcuts](#-global-shortcuts) • [Architecture](#-project-architecture)

</div>

---

## 🌟 Core Philosophy & Design

1. **The Main Dashboard is Temporary**:
   - Open the dashboard whenever you need a command center: manage your goal board, search/filter items, start from templates, or tweak sound & notification settings.
   - **Close it anytime or press <kbd>Esc</kbd>!** The dashboard closes or hides, and you continue your day without interruption.
2. **The Sticky Notes are Persistent**:
   - Your goals and reminders stay attached directly to your laptop screen.
   - Move them anywhere, fold them when you need space, switch sizes, or check off tasks.
   - Every single position `(x, y)`, dimension, color, text change, and deadline is automatically saved to disk in real time.
3. **Never Forget What Matters**:
   - The primary objective is to make sure users never forget their important goals, tasks, or deadlines during long screen hours.

---

## 📌 Smart 2-Priority Screen Mechanics

Sticky Goal introduces an intuitive two-tier window z-ordering system designed specifically for desktop workflows:

| Priority | Pinned Screen Behavior | Visibility When Other Apps / Tabs Open |
| :--- | :--- | :--- |
| **🔥 High Priority** | **Floats Above Everything** (`HWND_TOPMOST` / `screen-saver` level) | **Always visible on top** — floats over every browser tab, IDE, video call, and desktop app. |
| **🌱 Low Priority** | **Sticked to Desktop Home Screen** (`HWND_NOTOPMOST` with `skipTaskbar`) | **Hides below opened apps** — quietly rests on your desktop wallpaper. When you open or focus other apps or browser tabs, the sticky note stays safely underneath them. |

---

## ✨ Key Features

### 🪟 Two Distinct Note Size Modes
- **🎯 Small Mode (Goal Only)**: Minimal footprint showing only the goal heading, description, and status chip. Perfect for keeping multiple stickies visible without cluttering your screen.
- **📋 Full Note Mode**: Unfolds to reveal interactive subtask checklist, progress bar, deadline countdown, and accomplishment celebration actions.

### 📐 Automatic Column Stacking (No Overlap)
- Click **"Arrange in Column"** or press the column arrange button to instantly stack all active stickies in a neat vertical column along the right edge of your screen with zero overlapping.

### 💻 Laptop Reopen Wake-Up Sequence
- Automatically detects when you reopen your laptop lid or unlock your Windows screen (via Electron `powerMonitor`).
- Plays an uplifting sunrise wake welcome chime.
- Sequentially brings each active goal note to the foreground (with a 1.2s staggered delay, attention bounce animation, and gentle bubble pop sound) so you immediately remember what you're working toward.

### ⏰ Hourly Goal Mindfulness Nudges
- While your device is open and active, gently checks in every 1 hour (configurable: 30m, 1h, 2h).
- Calculates remaining time dynamically:
  - *"Only 12 days remained to finish 'Project Proposal'"*
  - *"Only 3 hours left today to finish 'Quarterly Review'"*
  - *"Don't forget your goal: 'Client Presentation'"*
- Plays a calm double chime, delivers a Windows desktop notification, and highlights the relevant sticky note on screen.

### 🎨 Realistic Paper Aesthetics
- Authentic paper palettes: Canary Yellow, Peach Pastel, Mint Green, Sky Breeze, Lilac Lavender, Soft Rose, Kraft Natural, and Cyber Slate.
- Multi-layered drop shadows with 3D bottom corner curl.
- Top accents: Choose between **Washi Tape**, **Pushpin**, or **Clean Top**.
- Authentic handwriting and clean modern typography.

### 🎵 Synthesized Web Audio API Sound Engine
- 100% code-generated audio sounds — zero external audio files, zero latency, and crystal clear fidelity:
  - 🌅 **Sunrise Wake Chime**: Uplifting multi-chord chime.
  - ⏰ **Hourly Nudge**: Soft meditative double chime.
  - ✨ **Celebration Fanfare**: Triumphant major-scale fanfare with colorful confetti shower.
  - 🖱️ **Pen Check Click**: Crisp woodblock tick when completing tasks.
  - 📄 **Paper Fold / Rip**: Tactile paper handling sound effects.

### 🔒 View-Only Screen Stickies & Safe Editing
- Sticked notes on screen are view-focused so you never accidentally erase your goals while clicking around your desktop.
- Double-click any note or click **"✏️ Edit in App"** to open and edit the goal directly from the App's All Notes Section in the Dashboard.

---

## ⌨️ Global Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>N</kbd> | Create a new sticky note anywhere on screen |
| <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>S</kbd> | Toggle show / hide all floating stickies on screen |
| <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>D</kbd> | Open / focus the temporary Dashboard |
| <kbd>Esc</kbd> | Instantly close Dashboard and return to desktop stickies |

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
- Windows 10 or 11

### 1. Clone the Repository
```bash
git clone https://github.com/Sanchita-Malakar/Sticky-Goal.git
cd Sticky-Goal
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Launch the Application
```bash
npm start
```
*Or double-click [Start-Sticky-Goal.bat](Start-Sticky-Goal.bat) on Windows.*

---

## 📂 Project Architecture

```
Sticky Goal/
├── assets/
│   ├── icon.ico            # Windows executable & taskbar multi-resolution icon
│   ├── icon.png            # High-resolution application logo
│   ├── tray-icon.png       # Minimalist tray icon
│   └── sounds.js           # Web Audio API synthesized sound generator
├── dashboard/
│   ├── index.html          # Temporary Dashboard UI (All Notes, Metrics, Templates)
│   ├── dashboard.css       # Premium glassmorphism dark theme styling
│   └── dashboard.js        # Dashboard controller, filter tabs, modal management
├── data/
│   └── sticky-goals.json   # Seed goals & initial user configuration
├── sticky/
│   ├── index.html          # View-only floating sticky note template
│   ├── sticky.css          # Realistic paper textures, curl, tape, and pushpins
│   └── sticky.js           # Frameless sticky window controller & animations
├── main.js                 # Electron main process (Z-order, IPC, Tray, PowerMonitor)
├── preload.js              # Secure ContextBridge IPC bridge
├── store.js                # Persistent atomic JSON storage with automatic backups
├── reminder-service.js     # Background deadline monitor & notification triggers
├── test_app.js             # Automated test suite for data store & services
├── package.json            # Project manifest & scripts
├── Start-Sticky-Goal.bat   # Windows one-click launcher
└── README.md               # Project documentation
```

---

## 🔒 Data Persistence & Privacy

- All goals, positions, subtasks, and preferences are saved locally on your machine in:
  ```
  %APPDATA%\sticky-goal\sticky-goals.json
  ```
- **100% Offline & Private**: Sticky Goal does not send your notes or data to any external server.
- **Atomic File Writes**: Prevents data corruption during sudden power losses or system reboots.

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
