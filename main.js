const { app, BrowserWindow, Tray, Menu, ipcMain, globalShortcut, screen, nativeImage, Notification, powerMonitor } = require('electron');
const path = require('path');
const store = require('./store');
const reminderService = require('./reminder-service');

let dashboardWindow = null;
const stickyWindows = new Map(); // id -> BrowserWindow
let tray = null;
let isQuitting = false;
let areStickiesVisible = true;

const ICON_PATH = path.join(__dirname, 'assets', 'icon.png');
const TRAY_ICON_PATH = path.join(__dirname, 'assets', 'tray-icon.png');

// Prevent multiple instances and focus existing if launched again
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('Sticky Goal is already running. Bringing windows to front...');
  app.quit();
} else {
  app.on('second-instance', () => {
    if (dashboardWindow && !dashboardWindow.isDestroyed()) {
      if (dashboardWindow.isMinimized()) dashboardWindow.restore();
      dashboardWindow.show();
      dashboardWindow.focus();
    } else {
      showDashboard();
    }
    // Also bring all floating stickies to front
    stickyWindows.forEach(win => {
      if (win && !win.isDestroyed()) {
        win.show();
      }
    });
  });
}

function createDashboardWindow() {
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    if (dashboardWindow.isMinimized()) dashboardWindow.restore();
    dashboardWindow.show();
    dashboardWindow.focus();
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const winWidth = Math.min(1080, Math.floor(width * 0.85));
  const winHeight = Math.min(760, Math.floor(height * 0.85));

  dashboardWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    minWidth: 720,
    minHeight: 520,
    center: true,
    show: true, // Display immediately
    frame: false, // Custom sleek titlebar
    backgroundColor: '#0f172a',
    icon: ICON_PATH,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  dashboardWindow.loadFile(path.join(__dirname, 'dashboard', 'index.html'));

  dashboardWindow.once('ready-to-show', () => {
    dashboardWindow.maximize(); // By default, app opens in full size as requested!
    dashboardWindow.show();
    dashboardWindow.focus();
  });

  // When user clicks close on the temporary dashboard:
  // We do NOT quit the app! We simply hide or close the dashboard window,
  // allowing the user to continue working on their laptop with floating stickies!
  dashboardWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      dashboardWindow.hide();
    }
  });
}

function showDashboard() {
  if (!dashboardWindow || dashboardWindow.isDestroyed()) {
    createDashboardWindow();
  } else {
    if (dashboardWindow.isMinimized()) dashboardWindow.restore();
    dashboardWindow.show();
    dashboardWindow.focus();
  }
}

function getColumnSlotBounds(slotIndex, isSmall = true) {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenW, height: screenH } = primaryDisplay.workAreaSize;

  const noteW = 320;
  const noteH = isSmall ? 180 : 430;
  const gapY = 16;
  const gapX = 20;
  const rightMargin = 28;
  const topMargin = 32;

  // Calculate how many small notes fit vertically in one column
  const availableH = screenH - topMargin - 40;
  const slotHeight = 180 + gapY; // 196px per slot
  const maxPerCol = Math.max(1, Math.floor(availableH / slotHeight));

  const colIndex = Math.floor(slotIndex / maxPerCol);
  const rowIndex = slotIndex % maxPerCol;

  // Column 0 is rightmost column, Column 1 is immediately adjacent to the left
  const x = Math.max(20, screenW - (colIndex + 1) * (noteW + gapX) + gapX - rightMargin);
  const y = topMargin + rowIndex * slotHeight;

  return { x, y, width: noteW, height: noteH };
}

function arrangeActiveStickiesInColumn() {
  const activeNotes = store.getNotes().filter(n => !n.archived && n.visible !== false);
  activeNotes.forEach((note, index) => {
    const isSmall = note.viewMode === 'small' || note.viewMode === 'compact' || note.folded === true;
    const targetBounds = getColumnSlotBounds(index, isSmall);
    note.bounds = targetBounds;
    store.updateNoteBounds(note.id, targetBounds);

    const win = stickyWindows.get(note.id);
    if (win && !win.isDestroyed()) {
      win.setBounds(targetBounds);
    }
  });
  store.save();
  broadcastNotesUpdate();
}

function applyStickyWindowZOrder(win, note) {
  if (!win || win.isDestroyed() || !note) return;
  const isPinned = note.pinned !== false;
  const isHighPriority = note.priority === 'high';

  if (isPinned && isHighPriority) {
    // High priority + pinned: always at the top floating over every tab and app
    win.setAlwaysOnTop(true, 'screen-saver');
  } else {
    // Low priority + pinned: only sticked on desktop home screen (hidden below other apps/tabs)
    // Or unpinned: normal z-index below other apps
    win.setAlwaysOnTop(false);
  }
}

function createStickyWindow(note, slotIndex = null) {
  if (stickyWindows.has(note.id)) {
    const existing = stickyWindows.get(note.id);
    if (!existing.isDestroyed()) {
      existing.show();
      existing.focus();
      return existing;
    }
    stickyWindows.delete(note.id);
  }

  if (note.archived || note.visible === false) {
    return null;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenW, height: screenH } = primaryDisplay.workAreaSize;

  // 2-Size Dimensions: Small (Heading + Description) vs Full Note (Heading + Description + Todos)
  const isSmall = note.viewMode === 'small' || note.viewMode === 'compact' || note.folded === true;
  const defaultW = 320;
  const defaultH = isSmall ? 180 : 430;

  const currentW = (note.bounds && note.bounds.width) || defaultW;
  const currentH = isSmall ? 180 : ((note.bounds && note.bounds.fullHeight) || (note.bounds && note.bounds.height) || defaultH);

  let targetX, targetY;
  if (slotIndex !== null) {
    const colBounds = getColumnSlotBounds(slotIndex, isSmall);
    targetX = colBounds.x;
    targetY = colBounds.y;
  } else if (note.bounds && note.bounds.x !== undefined && note.bounds.y !== undefined) {
    targetX = Math.min(screenW - currentW - 20, Math.max(20, note.bounds.x));
    targetY = Math.min(screenH - currentH - 20, Math.max(20, note.bounds.y));
  } else {
    const colBounds = getColumnSlotBounds(stickyWindows.size, isSmall);
    targetX = colBounds.x;
    targetY = colBounds.y;
  }

  const isPinned = note.pinned !== false;
  const isHighPriority = note.priority === 'high';
  const shouldFloatOnTop = isPinned && isHighPriority;

  const win = new BrowserWindow({
    width: currentW,
    height: currentH,
    x: targetX,
    y: targetY,
    minWidth: 260,
    minHeight: 160,
    maxWidth: 600,
    maxHeight: 900,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: true,
    alwaysOnTop: shouldFloatOnTop,
    skipTaskbar: true,
    icon: ICON_PATH,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, 'sticky', 'index.html'), {
    query: { id: note.id }
  });

  win.once('ready-to-show', () => {
    applyStickyWindowZOrder(win, note);
    win.show();
  });

  // Track position and size changes to auto-persist
  let saveDebounce = null;
  const onMoveOrResize = () => {
    if (win.isDestroyed()) return;
    if (saveDebounce) clearTimeout(saveDebounce);
    saveDebounce = setTimeout(() => {
      if (win.isDestroyed()) return;
      const bounds = win.getBounds();
      const currentNote = store.getNote(note.id);
      if (currentNote) {
        if (currentNote.viewMode === 'small' || currentNote.viewMode === 'compact') {
          store.updateNoteBounds(note.id, { x: bounds.x, y: bounds.y, width: bounds.width });
        } else {
          store.updateNoteBounds(note.id, { ...bounds, fullHeight: bounds.height });
        }
      }
    }, 250);
  };

  win.on('move', onMoveOrResize);
  win.on('resize', onMoveOrResize);

  win.on('closed', () => {
    stickyWindows.delete(note.id);
  });

  stickyWindows.set(note.id, win);
  return win;
}

function openAllActiveStickies() {
  const notes = store.getNotes().filter(n => !n.archived && n.visible !== false);
  notes.forEach((note, index) => {
    // Default to small mode so heading + work description are visible
    if (!note.viewMode) {
      note.viewMode = 'small';
      note.folded = true;
    }
    createStickyWindow(note, index);
  });
}

function updateTrayMenu() {
  if (!tray) return;

  const notes = store.getNotes();
  const activeCount = notes.filter(n => !n.archived && !n.completed).length;
  const overdueCount = notes.filter(n => {
    if (n.archived || n.completed || !n.deadline) return false;
    return new Date(n.deadline) < new Date();
  }).length;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `📌 Sticky Goal (${activeCount} active${overdueCount > 0 ? `, ⚠️ ${overdueCount} overdue` : ''})`,
      enabled: false
    },
    { type: 'separator' },
    {
      label: '📊 Open Dashboard',
      accelerator: 'CmdOrCtrl+Alt+D',
      click: () => showDashboard()
    },
    {
      label: '➕ New Sticky Note',
      accelerator: 'CmdOrCtrl+Alt+N',
      click: () => createNewSticky()
    },
    { type: 'separator' },
    {
      label: areStickiesVisible ? '🙈 Hide Floating Stickies' : '👁️ Show Floating Stickies',
      accelerator: 'CmdOrCtrl+Alt+S',
      click: () => toggleAllStickies()
    },
    {
      label: '📌 Pin All Stickies',
      click: () => {
        const currentNotes = store.getNotes();
        currentNotes.forEach(n => {
          n.pinned = true;
          const win = stickyWindows.get(n.id);
          if (win && !win.isDestroyed()) applyStickyWindowZOrder(win, n);
        });
        store.save();
        broadcastNotesUpdate();
      }
    },
    {
      label: '🔔 Check Deadlines Now',
      click: () => reminderService.check()
    },
    { type: 'separator' },
    {
      label: '❌ Quit Sticky Goal',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  try {
    tray.setContextMenu(contextMenu);
    tray.setToolTip(`Sticky Goal - ${activeCount} Goals Active`);
  } catch (err) {
    console.warn('Tray update warning:', err.message);
  }
}

function createTray() {
  try {
    let trayImage = nativeImage.createFromPath(TRAY_ICON_PATH);
    if (trayImage.isEmpty()) {
      trayImage = nativeImage.createFromPath(ICON_PATH);
    }

    tray = new Tray(trayImage);
    tray.setToolTip('Sticky Goal - Paper Stickies on Screen');

    tray.on('click', () => {
      showDashboard();
    });

    tray.on('double-click', () => {
      showDashboard();
    });

    updateTrayMenu();
  } catch (err) {
    console.warn('Tray initialization warning:', err.message);
  }
}

function createNewSticky(preset = {}) {
  const colors = ['yellow', 'peach', 'mint', 'blue', 'lavender', 'rose'];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];

  const now = new Date();
  const defaultDeadline = new Date(now.getTime() + 4 * 3600000); // 4 hours from now

  const slotIndex = stickyWindows.size;
  const isSmall = preset.viewMode ? (preset.viewMode === 'small' || preset.viewMode === 'compact') : true;
  const slotBounds = getColumnSlotBounds(slotIndex, isSmall);

  const newNoteData = {
    id: 'sticky-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
    title: preset.title || 'New Goal',
    content: preset.content || '',
    checklist: preset.checklist || [
      { id: 'item-1', text: 'Define key milestone', done: false }
    ],
    color: preset.color || randomColor,
    priority: (preset.priority === 'low') ? 'low' : 'high',
    pinned: preset.pinned !== undefined ? preset.pinned : true,
    folded: isSmall,
    viewMode: isSmall ? 'small' : 'full',
    tapeStyle: preset.tapeStyle || 'tape',
    fontStyle: preset.fontStyle || 'handwriting',
    tags: preset.tags || ['Goal'],
    bounds: slotBounds,
    deadline: preset.deadline || defaultDeadline.toISOString(),
    reminderTime: 15,
    reminded: false,
    completed: false,
    completedAt: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    archived: false,
    visible: true
  };

  const created = store.saveNote(newNoteData);
  createStickyWindow(created, slotIndex);
  updateTrayMenu();
  broadcastNotesUpdate();
  return created;
}

function toggleAllStickies() {
  areStickiesVisible = !areStickiesVisible;
  stickyWindows.forEach((win) => {
    if (win && !win.isDestroyed()) {
      if (areStickiesVisible) {
        win.show();
      } else {
        win.hide();
      }
    }
  });
  updateTrayMenu();
}

function broadcastNotesUpdate(updatedNote = null) {
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    dashboardWindow.webContents.send('note:updated', updatedNote);
  }
  stickyWindows.forEach((win) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('note:updated', updatedNote);
    }
  });
  updateTrayMenu();
}

function setupIpcHandlers() {
  // Store retrieval
  ipcMain.handle('notes:getAll', () => {
    return store.getNotes();
  });

  ipcMain.handle('notes:get', (_event, id) => {
    return store.getNote(id);
  });

  ipcMain.handle('notes:save', (_event, noteData) => {
    const updated = store.saveNote(noteData);
    broadcastNotesUpdate(updated);

    const win = stickyWindows.get(noteData.id);
    if (win && !win.isDestroyed()) {
      applyStickyWindowZOrder(win, updated);
    }

    // If deadline was changed, reset overdue in reminderService
    if (noteData.deadline) {
      reminderService.resetOverdue(noteData.id);
    }
    return updated;
  });

  ipcMain.handle('notes:delete', (_event, id) => {
    const win = stickyWindows.get(id);
    if (win && !win.isDestroyed()) {
      win.close();
    }
    stickyWindows.delete(id);
    const result = store.deleteNote(id);
    if (dashboardWindow && !dashboardWindow.isDestroyed()) {
      dashboardWindow.webContents.send('note:deleted', id);
    }
    updateTrayMenu();
    return result;
  });

  ipcMain.handle('notes:archive', (_event, id) => {
    const note = store.getNote(id);
    if (note) {
      note.archived = true;
      note.visible = false;
      store.save();
      const win = stickyWindows.get(id);
      if (win && !win.isDestroyed()) {
        win.close();
      }
      stickyWindows.delete(id);
      broadcastNotesUpdate(note);
      updateTrayMenu();
      return true;
    }
    return false;
  });

  // Settings
  ipcMain.handle('settings:get', () => {
    return store.getSettings();
  });

  ipcMain.handle('settings:update', (_event, settings) => {
    const updated = store.updateSettings(settings);
    if (dashboardWindow && !dashboardWindow.isDestroyed()) {
      dashboardWindow.webContents.send('settings:updated', updated);
    }
    stickyWindows.forEach((win) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('settings:updated', updated);
      }
    });
    return updated;
  });

  // Windows and Stickies controls
  ipcMain.handle('sticky:create', (_event, preset) => {
    return createNewSticky(preset);
  });

  ipcMain.handle('dashboard:open', () => {
    showDashboard();
    return true;
  });

  ipcMain.handle('dashboard:openAndEdit', (_event, noteId) => {
    showDashboard();
    if (dashboardWindow && !dashboardWindow.isDestroyed()) {
      dashboardWindow.webContents.send('dashboard:editNote', noteId);
    }
    return true;
  });

  ipcMain.handle('dashboard:close', () => {
    if (dashboardWindow && !dashboardWindow.isDestroyed()) {
      dashboardWindow.hide();
    }
    return true;
  });

  ipcMain.handle('dashboard:minimize', () => {
    if (dashboardWindow && !dashboardWindow.isDestroyed()) {
      dashboardWindow.minimize();
    }
    return true;
  });

  ipcMain.handle('sticky:closeWindow', (_event, id) => {
    const win = stickyWindows.get(id);
    if (win && !win.isDestroyed()) {
      win.close();
    }
    stickyWindows.delete(id);
    const note = store.getNote(id);
    if (note) {
      note.visible = false;
      store.save();
      broadcastNotesUpdate(note);
    }
    return true;
  });

  ipcMain.handle('sticky:togglePin', (_event, id) => {
    const note = store.getNote(id);
    if (note) {
      note.pinned = !note.pinned;
      store.save();
      const win = stickyWindows.get(id);
      if (win && !win.isDestroyed()) {
        applyStickyWindowZOrder(win, note);
      }
      broadcastNotesUpdate(note);
      return note.pinned;
    }
    return false;
  });

  ipcMain.handle('sticky:toggleFold', (_event, id, requestedFoldState) => {
    const note = store.getNote(id);
    if (note) {
      const isFolded = requestedFoldState !== undefined ? requestedFoldState : !note.folded;
      note.folded = isFolded;
      store.save();

      const win = stickyWindows.get(id);
      if (win && !win.isDestroyed()) {
        const bounds = win.getBounds();
        if (isFolded) {
          // Fold into compact ribbon
          win.setResizable(false);
          win.setBounds({
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: 68
          });
        } else {
          // Unfold to previous height
          const savedH = (note.bounds && note.bounds.height) || 390;
          win.setResizable(true);
          win.setBounds({
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: Math.max(260, savedH)
          });
        }
      }
      broadcastNotesUpdate(note);
      return note.folded;
    }
    return false;
  });

  ipcMain.handle('sticky:setMode', (_event, id, mode) => {
    const note = store.getNote(id);
    if (note) {
      const isSmall = mode === 'small' || mode === 'compact';
      note.viewMode = isSmall ? 'small' : 'full';
      note.folded = isSmall;
      store.save();

      const win = stickyWindows.get(id);
      if (win && !win.isDestroyed()) {
        const bounds = win.getBounds();
        if (isSmall) {
          win.setBounds({
            x: bounds.x,
            y: bounds.y,
            width: Math.max(300, bounds.width),
            height: 180
          });
        } else {
          const fullH = (note.bounds && note.bounds.fullHeight) || 430;
          win.setBounds({
            x: bounds.x,
            y: bounds.y,
            width: Math.max(320, bounds.width),
            height: Math.max(380, fullH)
          });
        }
      }
      broadcastNotesUpdate(note);
      return note.viewMode;
    }
    return 'small';
  });

  ipcMain.handle('dashboard:toggleMaximize', () => {
    if (!dashboardWindow || dashboardWindow.isDestroyed()) return false;
    if (dashboardWindow.isMaximized()) {
      dashboardWindow.unmaximize();
      return false;
    } else {
      dashboardWindow.maximize();
      return true;
    }
  });

  ipcMain.handle('dashboard:isMaximized', () => {
    if (!dashboardWindow || dashboardWindow.isDestroyed()) return false;
    return dashboardWindow.isMaximized();
  });

  ipcMain.handle('sticky:arrangeColumn', () => {
    arrangeActiveStickiesInColumn();
    return true;
  });

  ipcMain.handle('sticky:focus', (_event, id) => {
    let win = stickyWindows.get(id);
    const note = store.getNote(id);
    if (!win || win.isDestroyed()) {
      if (note) {
        note.visible = true;
        store.save();
        win = createStickyWindow(note);
      }
    }
    if (win && !win.isDestroyed()) {
      win.show();
      applyStickyWindowZOrder(win, note);
      win.focus();
      return true;
    }
    return false;
  });

  ipcMain.handle('sticky:showAll', () => {
    areStickiesVisible = true;
    const notes = store.getNotes();
    notes.forEach(note => {
      if (!note.archived) {
        note.visible = true;
        let win = stickyWindows.get(note.id);
        if (!win || win.isDestroyed()) {
          win = createStickyWindow(note);
        } else {
          win.show();
        }
      }
    });
    store.save();
    updateTrayMenu();
    return true;
  });

  ipcMain.handle('sticky:hideAll', () => {
    areStickiesVisible = false;
    stickyWindows.forEach((win) => {
      if (win && !win.isDestroyed()) {
        win.hide();
      }
    });
    updateTrayMenu();
    return true;
  });

  // Audio & Notification IPC
  ipcMain.handle('audio:play', (_event, type) => {
    // Forward audio cue to all active sticky windows or dashboard
    stickyWindows.forEach((win) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('audio:play', type);
      }
    });
    return true;
  });

  ipcMain.handle('notify:send', (_event, { title, body, noteId }) => {
    const settings = store.getSettings();
    if (settings.notificationsEnabled && Notification.isSupported()) {
      const notif = new Notification({ title, body, icon: ICON_PATH });
      if (noteId) {
        notif.on('click', () => {
          const win = stickyWindows.get(noteId);
          if (win && !win.isDestroyed()) {
            win.show();
            win.focus();
          }
        });
      }
      notif.show();
    }
    return true;
  });

  // Manual trigger for testing Wake sequence & Hourly nudge
  ipcMain.handle('system:triggerWake', () => {
    runWakePopupSequence();
    return true;
  });

  ipcMain.handle('system:triggerHourlyNudge', () => {
    runHourlyNudge();
    return true;
  });
}

let hourlyNudgeTimer = null;

function broadcastAudioCue(soundType) {
  stickyWindows.forEach((win) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('audio:play', soundType);
    }
  });
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    dashboardWindow.webContents.send('audio:play', soundType);
  }
}

function runWakePopupSequence() {
  const settings = store.getSettings();
  if (settings.wakeAnnouncementEnabled === false) return;

  const notes = store.getNotes();
  const activeNotes = notes.filter(n => !n.archived && !n.completed);
  if (activeNotes.length === 0) return;

  console.log(`[Sticky Goal] Laptop reopened / unlocked. Starting wake sequence for ${activeNotes.length} goals...`);

  // 1. Play radiant sunrise welcome chime
  broadcastAudioCue('wake');

  // 2. Windows Native Notification
  if (settings.notificationsEnabled && Notification.isSupported()) {
    const sampleTitles = activeNotes.slice(0, 3).map(n => `"${n.title || 'Goal'}"`).join(', ');
    const notif = new Notification({
      title: `💻 Welcome Back! ${activeNotes.length} Goal${activeNotes.length === 1 ? '' : 's'} on Screen`,
      body: `Reviewing your goals: ${sampleTitles}... Let's make progress!`,
      icon: ICON_PATH
    });
    notif.show();
  }

  // 3. Staggered sequence: pop each sticky note to front with attention animation
  activeNotes.forEach((note, index) => {
    setTimeout(() => {
      let win = stickyWindows.get(note.id);
      if (!win || win.isDestroyed()) {
        note.visible = true;
        win = createStickyWindow(note);
      }
      if (win && !win.isDestroyed()) {
        win.show();
        win.focus();
        win.webContents.send('note:pop-highlight', {
          noteId: note.id,
          step: index + 1,
          total: activeNotes.length,
          type: 'wake',
          message: `🎯 Goal ${index + 1}/${activeNotes.length}: ${note.title || 'Goal'}`
        });
      }
    }, index * 1200 + 400); // 1.2s delay between each note popup
  });
}

function runHourlyNudge() {
  const settings = store.getSettings();
  if (settings.hourlyNudgeEnabled === false) return;

  const notes = store.getNotes();
  const activeNotes = notes.filter(n => !n.archived && !n.completed);
  if (activeNotes.length === 0) return;

  const now = new Date();
  const notesWithDeadlines = activeNotes.filter(n => !!n.deadline);
  let targetNote = null;
  let nudgeText = '';

  if (notesWithDeadlines.length > 0) {
    // Sort soonest deadline first
    notesWithDeadlines.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    targetNote = notesWithDeadlines[0];

    const deadline = new Date(targetNote.deadline);
    const diffMs = deadline - now;
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / (24 * 3600000));

    if (diffMs <= 0) {
      const overdueDays = Math.abs(diffDays);
      nudgeText = overdueDays > 0 
        ? `⚠️ Overdue by ${overdueDays} day${overdueDays === 1 ? '' : 's'} to finish "${targetNote.title}"!`
        : `⚠️ Overdue by ${Math.abs(diffMins)} minutes to finish "${targetNote.title}"!`;
    } else if (diffDays > 1) {
      nudgeText = `only ${diffDays} days remained to finish "${targetNote.title}"`;
    } else if (diffDays === 1 || diffHours > 12) {
      nudgeText = `only 1 day remained to finish "${targetNote.title}"!`;
    } else if (diffHours > 1) {
      nudgeText = `only ${diffHours} hours remained to finish "${targetNote.title}"`;
    } else {
      nudgeText = `only ${Math.max(1, diffMins)} minutes remained to finish "${targetNote.title}"`;
    }
  } else {
    // Pick top priority note
    targetNote = activeNotes[0];
    nudgeText = `don't forget your goal: "${targetNote.title}"`;
  }

  console.log(`[Sticky Goal] Hourly nudge triggered: ... ${nudgeText}`);

  // 1. Play hourly nudge chime
  broadcastAudioCue('hourly');

  // 2. Windows Native Notification
  if (settings.notificationsEnabled && Notification.isSupported()) {
    const notif = new Notification({
      title: `⏰ Don't forget your goal!`,
      body: `... ${nudgeText} ✨`,
      icon: ICON_PATH
    });
    if (targetNote) {
      notif.on('click', () => {
        let win = stickyWindows.get(targetNote.id);
        if (win && !win.isDestroyed()) {
          win.show();
          win.focus();
        }
      });
    }
    notif.show();
  }

  // 3. Highlight specific sticky note on screen
  if (targetNote) {
    let win = stickyWindows.get(targetNote.id);
    if (!win || win.isDestroyed()) {
      targetNote.visible = true;
      win = createStickyWindow(targetNote);
    }
    if (win && !win.isDestroyed()) {
      win.show();
      win.focus();
      win.webContents.send('note:pop-highlight', {
        noteId: targetNote.id,
        type: 'hourly',
        message: `⏰ ... ${nudgeText}`
      });
    }
  }
}

function startHourlyNudgeScheduler() {
  if (hourlyNudgeTimer) clearInterval(hourlyNudgeTimer);
  const settings = store.getSettings();
  const intervalMins = settings.hourlyNudgeIntervalMinutes || 60;
  hourlyNudgeTimer = setInterval(() => {
    runHourlyNudge();
  }, intervalMins * 60000);
}

function registerShortcuts() {
  // Global Shortcut: New Sticky Note
  try {
    globalShortcut.register('CommandOrControl+Alt+N', () => {
      createNewSticky();
    });

    // Global Shortcut: Toggle all stickies visibility
    globalShortcut.register('CommandOrControl+Alt+S', () => {
      toggleAllStickies();
    });

    // Global Shortcut: Open / Toggle Dashboard
    globalShortcut.register('CommandOrControl+Alt+D', () => {
      if (dashboardWindow && !dashboardWindow.isDestroyed() && dashboardWindow.isVisible()) {
        dashboardWindow.hide();
      } else {
        showDashboard();
      }
    });
  } catch (err) {
    console.warn('Failed to register global shortcut', err);
  }
}

app.whenReady().then(() => {
  setupIpcHandlers();
  createTray();
  registerShortcuts();

  // Open active stickies so they float on screen immediately!
  openAllActiveStickies();

  // Show dashboard on first launch so user sees the welcome & dashboard experience
  showDashboard();

  // Start background deadline & reminder monitoring
  reminderService.start((note, alertData) => {
    // Notify all windows of deadline alert
    if (dashboardWindow && !dashboardWindow.isDestroyed()) {
      dashboardWindow.webContents.send('deadline:alert', { note, alertData });
    }
    stickyWindows.forEach((win) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('deadline:alert', { note, alertData });
        win.webContents.send('audio:play', alertData.sound || 'bell');
      }
    });
  });

  // Start hourly goal mindfulness reminder
  startHourlyNudgeScheduler();

  // Laptop reopen & screen unlock detector
  if (powerMonitor) {
    powerMonitor.on('resume', () => {
      console.log('[powerMonitor] System resumed from sleep (laptop reopened).');
      setTimeout(() => {
        runWakePopupSequence();
      }, 1200);
    });

    powerMonitor.on('unlock-screen', () => {
      console.log('[powerMonitor] Screen unlocked.');
      setTimeout(() => {
        runWakePopupSequence();
      }, 1200);
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      showDashboard();
      openAllActiveStickies();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  reminderService.stop();
  if (hourlyNudgeTimer) clearInterval(hourlyNudgeTimer);
});
