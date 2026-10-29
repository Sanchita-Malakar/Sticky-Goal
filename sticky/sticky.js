// Sticky Goal - Floating Sticky Note Controller (View-Only Screen Sticky)

(function () {
  let currentNote = null;
  let countdownInterval = null;

  // DOM Elements
  const stickyCard = document.getElementById('sticky-card');
  const noteTitle = document.getElementById('note-title');
  const noteContent = document.getElementById('note-content');

  // Mini Size Toggle Button (Small vs Full)
  const btnModeToggle = document.getElementById('btn-mode-toggle');
  const miniToggleIcon = document.getElementById('mini-toggle-icon');
  const miniToggleText = document.getElementById('mini-toggle-text');

  // Header and Action Buttons
  const btnEditInApp = document.getElementById('btn-edit-in-app');
  const btnClose = document.getElementById('btn-close');

  // Small Mode Status Bar
  const smallModeBar = document.getElementById('small-mode-bar');
  const smallDeadlineChip = document.getElementById('small-deadline-chip');
  const btnSmallTodosHint = document.getElementById('btn-small-todos-hint');
  const smallTodosLabel = document.getElementById('small-todos-label');
  const btnSmallEdit = document.getElementById('btn-small-edit');

  // Full Mode Sections
  const deadlineBar = document.getElementById('deadline-bar');
  const deadlineText = document.getElementById('deadline-text');
  const countdownChip = document.getElementById('countdown-chip');

  const checklistSection = document.getElementById('checklist-section');
  const checklistItems = document.getElementById('checklist-items');
  const checklistProgress = document.getElementById('checklist-progress');

  const stickyFooter = document.getElementById('sticky-footer');
  const btnFooterEdit = document.getElementById('btn-footer-edit');
  const btnCompleteGoal = document.getElementById('btn-complete-goal');
  const accomplishedStamp = document.getElementById('accomplished-stamp');
  const confettiCanvas = document.getElementById('confetti-canvas');
  const btnOpenDashboard = document.getElementById('btn-open-dashboard');

  // Sequential Popup & Wake/Hourly Reminder Toast Banner
  const popupBanner = document.getElementById('popup-reminder-banner');
  const popupText = document.getElementById('popup-reminder-text');
  const popupIcon = document.getElementById('popup-reminder-icon');
  let bannerTimer = null;

  // Initialize
  async function init() {
    const noteId = window.electronAPI.getNoteIdFromUrl();
    if (!noteId) {
      console.error('No note id in URL');
      return;
    }

    currentNote = await window.electronAPI.getNote(noteId);
    if (!currentNote) {
      console.warn('Note not found, closing');
      window.close();
      return;
    }

    // Default mode to 'small' if not set
    if (!currentNote.viewMode) {
      currentNote.viewMode = 'small';
      currentNote.folded = true;
    }

    renderNote();
    setupEventListeners();
    startCountdown();

    // IPC Listeners
    window.electronAPI.onNoteUpdated((updated) => {
      if (updated && updated.id === currentNote.id) {
        currentNote = { ...currentNote, ...updated };
        renderNote();
      }
    });

    window.electronAPI.onDeadlineAlert((alertData) => {
      if (alertData.note && alertData.note.id === currentNote.id) {
        triggerUrgencyFlash();
      }
    });

    window.electronAPI.onNotePopHighlight((data) => {
      if (data && data.noteId === currentNote.id) {
        triggerAttentionPop(data);
      }
    });

    window.electronAPI.onAudioPlay((soundType) => {
      if (window.SoundEngine) {
        window.SoundEngine.play(soundType);
      }
    });
  }

  function renderNote() {
    if (!currentNote) return;

    const isSmall = currentNote.viewMode === 'small' || currentNote.viewMode === 'compact' || currentNote.folded === true;

    // Apply color, font, top-accent, and mode classes to body
    document.body.className = `color-${currentNote.color || 'yellow'} font-${currentNote.fontStyle || 'handwriting'} top-${currentNote.tapeStyle || 'tape'} ${isSmall ? 'mode-small' : 'mode-full'}`;

    // Update Mini Mode Toggle Button
    if (miniToggleIcon && miniToggleText) {
      miniToggleIcon.textContent = isSmall ? '🎯' : '📋';
      miniToggleText.textContent = isSmall ? 'Small' : 'Full';
    }

    // Populate title & description (Read-only view)
    noteTitle.value = currentNote.title || 'Untitled Goal';
    noteTitle.readOnly = true;

    noteContent.value = currentNote.content || '';
    noteContent.readOnly = true;

    // Checklist
    renderChecklist();

    // Deadline & Countdown
    updateDeadlineUI();

    // Completed state
    if (currentNote.completed) {
      accomplishedStamp.style.display = 'block';
      btnCompleteGoal.classList.add('completed');
      document.getElementById('complete-btn-text').textContent = 'Accomplished! (Undo)';
    } else {
      accomplishedStamp.style.display = 'none';
      btnCompleteGoal.classList.remove('completed');
      document.getElementById('complete-btn-text').textContent = 'Accomplished';
    }
  }

  function renderChecklist() {
    checklistItems.innerHTML = '';
    const list = currentNote.checklist || [];
    let doneCount = 0;

    list.forEach((item, index) => {
      if (item.done) doneCount++;

      const li = document.createElement('li');
      li.className = `checklist-item ${item.done ? 'item-done' : ''}`;
      li.innerHTML = `
        <input type="checkbox" class="custom-checkbox" ${item.done ? 'checked' : ''} data-index="${index}" title="Check off task" />
        <span class="item-text-view ${item.done ? 'done-text' : ''}" data-index="${index}">${escapeHtml(item.text)}</span>
      `;
      checklistItems.appendChild(li);
    });

    checklistProgress.textContent = `${doneCount}/${list.length}`;
    if (smallTodosLabel) {
      smallTodosLabel.textContent = list.length > 0 ? `📋 ${doneCount}/${list.length} tasks` : '📋 0 tasks';
    }
  }

  function updateDeadlineUI() {
    stickyCard.classList.remove('urgency-warning', 'urgency-critical');

    if (!currentNote.deadline) {
      deadlineText.textContent = 'No deadline';
      countdownChip.textContent = 'No deadline';
      countdownChip.className = 'countdown-chip';
      if (smallDeadlineChip) {
        smallDeadlineChip.textContent = '⏰ No deadline';
        smallDeadlineChip.className = 'small-deadline-chip';
      }
      return;
    }

    const d = new Date(currentNote.deadline);
    const timeStr = d.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    deadlineText.textContent = timeStr;

    const now = new Date();
    const diffMs = d - now;
    const diffMins = Math.round(diffMs / 60000);

    if (diffMs <= 0) {
      const displayStr = `⚠️ Overdue ${Math.abs(diffMins)}m`;
      countdownChip.textContent = displayStr;
      countdownChip.className = 'countdown-chip status-red';
      if (smallDeadlineChip) {
        smallDeadlineChip.innerHTML = displayStr;
        smallDeadlineChip.className = 'small-deadline-chip status-red';
      }
      if (!currentNote.completed) {
        stickyCard.classList.add('urgency-critical');
      }
    } else if (diffMins <= 60) {
      const displayStr = `🔥 Due in ${diffMins}m`;
      countdownChip.textContent = displayStr;
      countdownChip.className = 'countdown-chip status-amber';
      if (smallDeadlineChip) {
        smallDeadlineChip.innerHTML = displayStr;
        smallDeadlineChip.className = 'small-deadline-chip status-amber';
      }
      if (!currentNote.completed) {
        stickyCard.classList.add('urgency-warning');
      }
    } else if (diffMins < 1440) {
      const h = Math.floor(diffMins / 60);
      const m = diffMins % 60;
      const displayStr = `⏰ Due in ${h}h ${m}m`;
      countdownChip.textContent = displayStr;
      countdownChip.className = 'countdown-chip status-green';
      if (smallDeadlineChip) {
        smallDeadlineChip.innerHTML = displayStr;
        smallDeadlineChip.className = 'small-deadline-chip status-green';
      }
    } else {
      const days = Math.round(diffMins / 1440);
      const displayStr = `📅 Due in ${days} day${days === 1 ? '' : 's'}`;
      countdownChip.textContent = displayStr;
      countdownChip.className = 'countdown-chip status-green';
      if (smallDeadlineChip) {
        smallDeadlineChip.innerHTML = displayStr;
        smallDeadlineChip.className = 'small-deadline-chip status-green';
      }
    }
  }

  function startCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
      updateDeadlineUI();
    }, 15000);
  }

  async function switchViewMode(mode) {
    if (currentNote.viewMode === mode) return;
    currentNote.viewMode = mode;
    currentNote.folded = mode === 'small' || mode === 'compact';
    if (window.SoundEngine) window.SoundEngine.playFold();
    await window.electronAPI.setStickyMode(currentNote.id, mode);
    renderNote();
  }

  // Opens the note in the Dashboard All Notes Editor
  async function openEditInApp() {
    if (currentNote && window.electronAPI.openDashboardAndEdit) {
      if (window.SoundEngine) window.SoundEngine.playPop();
      await window.electronAPI.openDashboardAndEdit(currentNote.id);
    }
  }

  function setupEventListeners() {
    // Mini Mode Toggle Button: Small vs Full
    if (btnModeToggle) {
      btnModeToggle.addEventListener('click', () => {
        const nextMode = (currentNote.viewMode === 'small' || currentNote.viewMode === 'compact') ? 'full' : 'small';
        switchViewMode(nextMode);
      });
    }

    if (btnSmallTodosHint) {
      btnSmallTodosHint.addEventListener('click', () => switchViewMode('full'));
    }

    // Double-click top attachment or note body to switch sizes or open edit
    const topAttachment = document.getElementById('top-attachment');
    if (topAttachment) {
      topAttachment.addEventListener('dblclick', () => {
        const nextMode = (currentNote.viewMode === 'small' || currentNote.viewMode === 'compact') ? 'full' : 'small';
        switchViewMode(nextMode);
      });
    }

    // Double clicking note title or content opens the full editor in the app
    noteTitle.addEventListener('dblclick', () => openEditInApp());
    noteContent.addEventListener('dblclick', () => openEditInApp());

    // Edit in App Buttons (Header, Small Mode bar, and Footer)
    if (btnEditInApp) btnEditInApp.addEventListener('click', () => openEditInApp());
    if (btnSmallEdit) btnSmallEdit.addEventListener('click', () => openEditInApp());
    if (btnFooterEdit) btnFooterEdit.addEventListener('click', () => openEditInApp());

    // Close Button (Hides window from screen, stays saved in All Notes)
    btnClose.addEventListener('click', async () => {
      await window.electronAPI.closeStickyWindow(currentNote.id);
    });

    // Checkbox completion toggle (allowed on screen sticky)
    checklistItems.addEventListener('change', async (e) => {
      if (e.target.classList.contains('custom-checkbox')) {
        const idx = parseInt(e.target.dataset.index, 10);
        const isDone = e.target.checked;
        if (currentNote.checklist && currentNote.checklist[idx]) {
          currentNote.checklist[idx].done = isDone;

          if (isDone && window.SoundEngine) {
            window.SoundEngine.playCheck();
          } else if (!isDone && window.SoundEngine) {
            window.SoundEngine.playUncheck();
          }

          renderChecklist();
          await window.electronAPI.saveNote(currentNote);
        }
      }
    });

    // Complete Goal Button (Celebration + Confetti)
    btnCompleteGoal.addEventListener('click', async () => {
      currentNote.completed = !currentNote.completed;
      currentNote.completedAt = currentNote.completed ? new Date().toISOString() : null;

      if (currentNote.completed) {
        if (window.SoundEngine) window.SoundEngine.playCelebration();
        launchConfetti();
        accomplishedStamp.style.display = 'block';
        document.getElementById('complete-btn-text').textContent = 'Accomplished! (Undo)';
        btnCompleteGoal.classList.add('completed');
      } else {
        accomplishedStamp.style.display = 'none';
        document.getElementById('complete-btn-text').textContent = 'Accomplished';
        btnCompleteGoal.classList.remove('completed');
      }

      await window.electronAPI.saveNote(currentNote);
    });

    // Open Dashboard Button
    if (btnOpenDashboard) {
      btnOpenDashboard.addEventListener('click', async () => {
        await window.electronAPI.openDashboard();
      });
    }
  }

  function triggerUrgencyFlash() {
    stickyCard.classList.remove('urgency-critical');
    void stickyCard.offsetWidth;
    stickyCard.classList.add('urgency-critical');
  }

  function triggerAttentionPop(data) {
    if (window.SoundEngine) {
      window.SoundEngine.playPop();
    }

    stickyCard.classList.remove('attention-pop');
    void stickyCard.offsetWidth;
    stickyCard.classList.add('attention-pop');

    if (data.message && popupBanner) {
      popupText.textContent = data.message;
      popupIcon.textContent = data.type === 'wake' ? '💻' : (data.type === 'hourly' ? '⏰' : '🎯');
      popupBanner.style.display = 'flex';

      if (bannerTimer) clearTimeout(bannerTimer);
      bannerTimer = setTimeout(() => {
        popupBanner.style.display = 'none';
        stickyCard.classList.remove('attention-pop');
      }, 4500);
    }
  }

  // Pure Canvas Confetti Shower
  function launchConfetti() {
    const canvas = confettiCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth || 340;
    canvas.height = canvas.offsetHeight || 440;

    const particles = [];
    const colors = ['#f43f5e', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ffd700'];

    for (let i = 0; i < 65; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height * 0.35,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.7) * 9,
        size: Math.random() * 6 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        life: 1.0,
        decay: Math.random() * 0.015 + 0.012
      });
    }

    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let active = false;

      particles.forEach(p => {
        if (p.life > 0) {
          active = true;
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.22;
          p.rotation += p.rotationSpeed;
          p.life -= p.decay;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();
        }
      });

      if (active) {
        requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    render();
  }

  function escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
