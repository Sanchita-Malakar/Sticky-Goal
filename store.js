const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class DataStore {
  constructor() {
    this.userDataPath = app ? app.getPath('userData') : path.join(__dirname, 'data');
    if (!fs.existsSync(this.userDataPath)) {
      try {
        fs.mkdirSync(this.userDataPath, { recursive: true });
      } catch (e) {
        console.error('Failed to create userData directory', e);
      }
    }
    this.filePath = path.join(this.userDataPath, 'sticky-goals.json');
    this.backupPath = path.join(this.userDataPath, 'sticky-goals.backup.json');
    this.state = this.load();
    if (!fs.existsSync(this.filePath)) {
      this.save();
    }
  }

  getDefaultSettings() {
    return {
      soundEnabled: true,
      soundVolume: 0.85,
      soundTheme: 'gentle', // 'gentle', 'bell', 'cosmic'
      notificationsEnabled: true,
      defaultColor: 'yellow',
      defaultFontStyle: 'handwriting',
      defaultTapeStyle: 'tape',
      defaultAlwaysOnTop: true,
      remindMinutesBefore: 15,
      wakeAnnouncementEnabled: true,
      hourlyNudgeEnabled: true,
      hourlyNudgeIntervalMinutes: 60,
      autoLaunch: false,
      globalShortcutNew: 'CommandOrControl+Alt+N',
      globalShortcutToggle: 'CommandOrControl+Alt+S',
      globalShortcutDashboard: 'CommandOrControl+Alt+D',
      theme: 'dark' // dashboard theme: dark, light, warm
    };
  }

  getDefaultNotes() {
    const now = new Date();
    const todayEvening = new Date(now);
    todayEvening.setHours(18, 0, 0, 0);
    if (todayEvening <= now) {
      todayEvening.setDate(todayEvening.getDate() + 1);
    }

    const tomorrowNoon = new Date(now);
    tomorrowNoon.setDate(tomorrowNoon.getDate() + 1);
    tomorrowNoon.setHours(12, 0, 0, 0);

    return [
      {
        id: 'welcome-sticky-1',
        title: '🎯 Welcome to Sticky Goal!',
        content: 'Your real paper sticky notes right on your laptop screen.\n\n• Drag me anywhere by the header bar\n• Toggle pin 📌 to keep floating\n• Fold 🔼 to save screen space\n• Check off items to complete goals!',
        checklist: [
          { id: 'item-1', text: 'Drag this sticky note to your favorite screen spot', done: true },
          { id: 'item-2', text: 'Click ➕ to create your first personal goal', done: false },
          { id: 'item-3', text: 'Set a deadline & hear the reminder chime', done: false }
        ],
        color: 'yellow',
        priority: 'high',
        pinned: true,
        folded: true,
        viewMode: 'small',
        tapeStyle: 'tape',
        fontStyle: 'handwriting',
        tags: ['Welcome', 'Guide'],
        bounds: { width: 320, height: 180 },
        deadline: todayEvening.toISOString(),
        reminderTime: 30,
        reminded: false,
        completed: false,
        completedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        archived: false,
        visible: true
      },
      {
        id: 'welcome-sticky-2',
        title: '⚡ Today\'s Top Priority',
        content: 'The primary objective is to NEVER forget what matters today. Keep this floating above your work apps!',
        checklist: [
          { id: 'item-2-1', text: 'Review quarterly deliverables', done: false },
          { id: 'item-2-2', text: 'Submit project proposal', done: false }
        ],
        color: 'peach',
        priority: 'low',
        pinned: true,
        folded: true,
        viewMode: 'small',
        tapeStyle: 'pin',
        fontStyle: 'handwriting',
        tags: ['Work', 'Priority'],
        bounds: { width: 320, height: 180 },
        deadline: tomorrowNoon.toISOString(),
        reminderTime: 60,
        reminded: false,
        completed: false,
        completedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        archived: false,
        visible: true
      }
    ];
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        const notesList = Array.isArray(parsed.notes) ? parsed.notes : this.getDefaultNotes();
        // Ensure all notes default to small mode & 2-priority system (high vs low)
        notesList.forEach(n => {
          if (!n.viewMode) {
            n.viewMode = 'small';
            n.folded = true;
          }
          n.priority = (n.priority === 'urgent' || n.priority === 'high') ? 'high' : 'low';
        });
        return {
          settings: { ...this.getDefaultSettings(), ...(parsed.settings || {}) },
          notes: notesList
        };
      }
    } catch (e) {
      console.warn('Error reading sticky-goals.json, checking backup...', e.message);
      try {
        if (fs.existsSync(this.backupPath)) {
          const raw = fs.readFileSync(this.backupPath, 'utf-8');
          const parsed = JSON.parse(raw);
          return {
            settings: { ...this.getDefaultSettings(), ...(parsed.settings || {}) },
            notes: Array.isArray(parsed.notes) ? parsed.notes : this.getDefaultNotes()
          };
        }
      } catch (err2) {
        console.error('Failed reading backup', err2);
      }
    }

    return {
      settings: this.getDefaultSettings(),
      notes: this.getDefaultNotes()
    };
  }

  save() {
    try {
      const data = JSON.stringify(this.state, null, 2);
      // Atomic write using a temp file
      const tempPath = this.filePath + '.tmp';
      fs.writeFileSync(tempPath, data, 'utf-8');

      if (fs.existsSync(this.filePath)) {
        try {
          fs.copyFileSync(this.filePath, this.backupPath);
        } catch (_) {}
      }

      fs.renameSync(tempPath, this.filePath);
      return true;
    } catch (e) {
      console.error('Failed to save state to disk', e);
      return false;
    }
  }

  getNotes() {
    return this.state.notes;
  }

  getNote(id) {
    return this.state.notes.find(n => n.id === id);
  }

  saveNote(noteData) {
    const index = this.state.notes.findIndex(n => n.id === noteData.id);
    const now = new Date().toISOString();
    if (index >= 0) {
      this.state.notes[index] = {
        ...this.state.notes[index],
        ...noteData,
        updatedAt: now
      };
    } else {
      this.state.notes.push({
        createdAt: now,
        updatedAt: now,
        checklist: [],
        completed: false,
        archived: false,
        visible: true,
        pinned: this.state.settings.defaultAlwaysOnTop,
        color: this.state.settings.defaultColor,
        fontStyle: this.state.settings.defaultFontStyle,
        tapeStyle: this.state.settings.defaultTapeStyle,
        ...noteData
      });
    }
    this.save();
    return this.getNote(noteData.id);
  }

  deleteNote(id) {
    const index = this.state.notes.findIndex(n => n.id === id);
    if (index >= 0) {
      this.state.notes.splice(index, 1);
      this.save();
      return true;
    }
    return false;
  }

  updateNoteBounds(id, bounds) {
    const note = this.getNote(id);
    if (note) {
      note.bounds = { ...note.bounds, ...bounds };
      this.save();
    }
  }

  getSettings() {
    return this.state.settings;
  }

  updateSettings(newSettings) {
    this.state.settings = { ...this.state.settings, ...newSettings };
    this.save();
    return this.state.settings;
  }
}

module.exports = new DataStore();
