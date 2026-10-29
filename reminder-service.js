const electron = require('electron');
const Notification = electron && typeof electron === 'object' ? electron.Notification : null;
const store = require('./store');

class ReminderService {
  constructor() {
    this.timer = null;
    this.overdueNotified = new Set();
    this.onAlertCallback = null;
  }

  start(onAlert) {
    this.onAlertCallback = onAlert;
    this.check();
    if (this.timer) clearInterval(this.timer);
    // Check every 20 seconds
    this.timer = setInterval(() => this.check(), 20000);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  check() {
    const settings = store.getSettings();
    const notes = store.getNotes();
    const now = new Date();

    notes.forEach(note => {
      if (note.completed || note.archived || !note.deadline) return;

      const deadline = new Date(note.deadline);
      const diffMs = deadline - now;
      const diffMins = Math.round(diffMs / 60000);

      // Overdue Check
      if (diffMs <= 0) {
        if (!this.overdueNotified.has(note.id)) {
          this.overdueNotified.add(note.id);
          this.fireAlert(note, {
            type: 'overdue',
            title: `⚠️ Goal Overdue: "${note.title || 'Untitled Goal'}"`,
            body: `Deadline was ${Math.abs(diffMins)} minute${Math.abs(diffMins) === 1 ? '' : 's'} ago. Let's finish it!`,
            sound: 'alert'
          });
        }
      } else {
        // Approaching deadline check
        const reminderThreshold = note.reminderTime !== undefined ? note.reminderTime : settings.remindMinutesBefore;
        if (diffMins <= reminderThreshold && !note.reminded) {
          note.reminded = true;
          store.save(); // persist reminded flag

          let timeStr;
          if (diffMins < 60) {
            timeStr = `${diffMins} minute${diffMins === 1 ? '' : 's'}`;
          } else {
            const hours = Math.round(diffMins / 60);
            timeStr = `${hours} hour${hours === 1 ? '' : 's'}`;
          }

          this.fireAlert(note, {
            type: 'approaching',
            title: `⏰ Upcoming Deadline: "${note.title || 'Untitled Goal'}"`,
            body: `Due in ${timeStr}! Stay focused on your goal.`,
            sound: 'bell'
          });
        }
      }
    });
  }

  fireAlert(note, alertData) {
    const settings = store.getSettings();

    // 1. Windows native Notification
    if (settings.notificationsEnabled && Notification && Notification.isSupported && Notification.isSupported()) {
      try {
        const notif = new Notification({
          title: alertData.title,
          body: alertData.body,
          silent: !settings.soundEnabled, // we handle custom sound in app
          urgency: alertData.type === 'overdue' ? 'critical' : 'normal'
        });
        notif.show();
      } catch (err) {
        console.error('Failed to show notification', err);
      }
    }

    // 2. Main process callback to dispatch to windows
    if (this.onAlertCallback) {
      this.onAlertCallback(note, alertData);
    }
  }

  resetOverdue(noteId) {
    this.overdueNotified.delete(noteId);
  }
}

module.exports = new ReminderService();
