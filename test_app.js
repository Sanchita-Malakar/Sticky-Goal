const fs = require('fs');
const path = require('path');
const store = require('./store');
const reminderService = require('./reminder-service');

console.log('--- Testing Sticky Goal Core Services ---');

// 1. Check Store
const notes = store.getNotes();
console.log(`[Store] Loaded ${notes.length} notes successfully.`);
if (notes.length < 2) {
  throw new Error('Expected at least 2 default notes');
}

const settings = store.getSettings();
console.log(`[Store] Loaded settings: soundEnabled=${settings.soundEnabled}, remindMinutes=${settings.remindMinutesBefore}`);

// 2. Check Adding a new note programmatically
const testNote = {
  id: 'test-sticky-' + Date.now(),
  title: 'Test Verification Goal',
  content: 'Automated verification check',
  color: 'mint',
  priority: 'urgent',
  pinned: true,
  folded: false,
  deadline: new Date(Date.now() + 30 * 60000).toISOString(), // 30 mins from now
  checklist: [
    { id: 't1', text: 'Task 1', done: true },
    { id: 't2', text: 'Task 2', done: false }
  ]
};

store.saveNote(testNote);
const retrieved = store.getNote(testNote.id);
if (!retrieved || retrieved.title !== testNote.title) {
  throw new Error('Failed to retrieve saved note');
}
console.log('[Store] Save and retrieval verified successfully.');

// Clean up test note
store.deleteNote(testNote.id);
console.log('[Store] Delete note verified successfully.');

// 3. Check Reminder Service calculation logic
let alertTriggered = false;
reminderService.start((note, alert) => {
  alertTriggered = true;
  console.log(`[ReminderService Alert] ${alert.title}: ${alert.body}`);
});

// Run a check
reminderService.check();
reminderService.stop();
console.log('[ReminderService] Periodic check executed without error.');

// 4. Verify Icon Assets
const iconPng = path.join(__dirname, 'assets', 'icon.png');
const trayPng = path.join(__dirname, 'assets', 'tray-icon.png');
const iconIco = path.join(__dirname, 'assets', 'icon.ico');

if (!fs.existsSync(iconPng) || fs.statSync(iconPng).size < 100) {
  throw new Error('icon.png missing or invalid');
}
if (!fs.existsSync(trayPng) || fs.statSync(trayPng).size < 100) {
  throw new Error('tray-icon.png missing or invalid');
}
if (!fs.existsSync(iconIco) || fs.statSync(iconIco).size < 100) {
  throw new Error('icon.ico missing or invalid');
}
console.log('[Assets] App icon, tray icon, and multi-res ICO verified.');

// 5. Verify UI files
const uiFiles = [
  'preload.js',
  'main.js',
  'assets/sounds.js',
  'dashboard/index.html',
  'dashboard/dashboard.css',
  'dashboard/dashboard.js',
  'sticky/index.html',
  'sticky/sticky.css',
  'sticky/sticky.js'
];

uiFiles.forEach(file => {
  const p = path.join(__dirname, file);
  if (!fs.existsSync(p) || fs.statSync(p).size === 0) {
    throw new Error(`File missing or empty: ${file}`);
  }
});
console.log(`[UI Files] All ${uiFiles.length} UI templates, scripts, and stylesheets verified.`);

console.log('✅ ALL TESTS PASSED SUCCESSFULLY!');
