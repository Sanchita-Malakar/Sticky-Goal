const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Store methods
  getNotes: () => ipcRenderer.invoke('notes:getAll'),
  getNote: (id) => ipcRenderer.invoke('notes:get', id),
  saveNote: (noteData) => ipcRenderer.invoke('notes:save', noteData),
  deleteNote: (id) => ipcRenderer.invoke('notes:delete', id),
  archiveNote: (id) => ipcRenderer.invoke('notes:archive', id),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (settings) => ipcRenderer.invoke('settings:update', settings),

  // Window & action controls
  createNewSticky: (preset) => ipcRenderer.invoke('sticky:create', preset),
  openDashboard: () => ipcRenderer.invoke('dashboard:open'),
  closeDashboard: () => ipcRenderer.invoke('dashboard:close'),
  minimizeDashboard: () => ipcRenderer.invoke('dashboard:minimize'),
  toggleDashboardMaximize: () => ipcRenderer.invoke('dashboard:toggleMaximize'),
  isDashboardMaximized: () => ipcRenderer.invoke('dashboard:isMaximized'),
  closeStickyWindow: (id) => ipcRenderer.invoke('sticky:closeWindow', id),
  toggleStickyPin: (id) => ipcRenderer.invoke('sticky:togglePin', id),
  toggleStickyFold: (id, isFolded) => ipcRenderer.invoke('sticky:toggleFold', id, isFolded),
  setStickyMode: (id, mode) => ipcRenderer.invoke('sticky:setMode', id, mode),
  focusSticky: (id) => ipcRenderer.invoke('sticky:focus', id),
  showAllStickies: () => ipcRenderer.invoke('sticky:showAll'),
  hideAllStickies: () => ipcRenderer.invoke('sticky:hideAll'),
  arrangeStickiesColumn: () => ipcRenderer.invoke('sticky:arrangeColumn'),

  // Audio & Notification
  playChime: (type) => ipcRenderer.invoke('audio:play', type),
  triggerNotification: (title, body, noteId) => ipcRenderer.invoke('notify:send', { title, body, noteId }),
  triggerWakeSequence: () => ipcRenderer.invoke('system:triggerWake'),
  triggerHourlyNudge: () => ipcRenderer.invoke('system:triggerHourlyNudge'),

  // Subscriptions / Events from main process
  onAudioPlay: (callback) => {
    const handler = (_event, soundType) => callback(soundType);
    ipcRenderer.on('audio:play', handler);
    return () => ipcRenderer.removeListener('audio:play', handler);
  },
  onNotePopHighlight: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('note:pop-highlight', handler);
    return () => ipcRenderer.removeListener('note:pop-highlight', handler);
  },
  onNoteUpdated: (callback) => {
    const handler = (_event, note) => callback(note);
    ipcRenderer.on('note:updated', handler);
    return () => ipcRenderer.removeListener('note:updated', handler);
  },
  onNoteDeleted: (callback) => {
    const handler = (_event, id) => callback(id);
    ipcRenderer.on('note:deleted', handler);
    return () => ipcRenderer.removeListener('note:deleted', handler);
  },
  onSettingsUpdated: (callback) => {
    const handler = (_event, settings) => callback(settings);
    ipcRenderer.on('settings:updated', handler);
    return () => ipcRenderer.removeListener('settings:updated', handler);
  },
  onDeadlineAlert: (callback) => {
    const handler = (_event, alertData) => callback(alertData);
    ipcRenderer.on('deadline:alert', handler);
    return () => ipcRenderer.removeListener('deadline:alert', handler);
  },

  // Subscriptions / Events from main process
  onOpenNoteEditor: (callback) => {
    const handler = (_event, noteId) => callback(noteId);
    ipcRenderer.on('dashboard:editNote', handler);
    return () => ipcRenderer.removeListener('dashboard:editNote', handler);
  },
  openDashboardAndEdit: (noteId) => ipcRenderer.invoke('dashboard:openAndEdit', noteId),

  // Note context query (returns note ID if inside sticky note window)
  getNoteIdFromUrl: () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
  }
});
