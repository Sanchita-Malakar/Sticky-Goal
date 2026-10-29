// Sticky Goal - Dashboard Controller

(function () {
  let allNotes = [];
  let currentSettings = {};
  let currentFilter = 'all';
  let currentPriority = 'all';
  let currentSort = 'deadline';
  let searchQuery = '';
  let areStickiesVisible = true;

  // DOM Elements
  const titlebarBtnMinimize = document.getElementById('titlebar-btn-minimize');
  const titlebarBtnMaximize = document.getElementById('titlebar-btn-maximize');
  const titlebarBtnClose = document.getElementById('titlebar-btn-close');
  const btnCloseToScreen = document.getElementById('btn-close-to-screen');
  const currentClock = document.getElementById('current-clock');
  const btnArrangeColumn = document.getElementById('btn-arrange-column');

  const btnCreateSticky = document.getElementById('btn-create-sticky');
  const btnTemplateToggle = document.getElementById('btn-template-toggle');
  const templateDropdown = document.getElementById('template-dropdown');

  const metricActiveCount = document.getElementById('metric-active-count');
  const metricDueCount = document.getElementById('metric-due-count');
  const metricOverdueCount = document.getElementById('metric-overdue-count');
  const metricCompletedCount = document.getElementById('metric-completed-count');
  const btnToggleStickies = document.getElementById('btn-toggle-stickies-visibility');
  const stickiesVisibilityText = document.getElementById('stickies-visibility-text');

  const searchInput = document.getElementById('search-input');
  const btnClearSearch = document.getElementById('btn-clear-search');
  const filterTabs = document.querySelectorAll('.filter-tab');
  const priorityFilterSelect = document.getElementById('priority-filter-select');
  const sortSelect = document.getElementById('sort-select');

  const notesGrid = document.getElementById('notes-grid');
  const emptyState = document.getElementById('empty-state');
  const btnEmptyNew = document.getElementById('btn-empty-new');
  const allNotesCountBadge = document.getElementById('all-notes-count-badge');
  const btnSectionAddSticky = document.getElementById('btn-section-add-sticky');

  const createModal = document.getElementById('create-modal');
  const btnCloseCreateModal = document.getElementById('btn-close-create-modal');
  const btnCancelCreate = document.getElementById('btn-cancel-create');
  const btnConfirmAddAllNotes = document.getElementById('btn-confirm-add-all-notes');
  const createTitleInput = document.getElementById('create-title-input');
  const createContentInput = document.getElementById('create-content-input');
  const createPrioritySelect = document.getElementById('create-priority-select');
  const createDeadlineInput = document.getElementById('create-deadline-input');
  const createPinToggle = document.getElementById('create-pin-toggle');
  const modalNoteId = document.getElementById('modal-note-id');
  const modalTitleHeading = document.getElementById('modal-title-heading');
  const modalTitleDesc = document.getElementById('modal-title-desc');
  const btnModalDelete = document.getElementById('btn-modal-delete');
  const btnModalIcon = document.getElementById('btn-modal-icon');
  const btnModalSubmitText = document.getElementById('btn-modal-submit-text');

  const btnCreateAddSubtask = document.getElementById('btn-create-add-subtask');
  const createSubtasksList = document.getElementById('create-subtasks-list');
  const modeOptFull = document.getElementById('mode-opt-full');
  const modeOptCompact = document.getElementById('mode-opt-compact');

  let selectedCreateColor = 'yellow';
  let selectedCreateMode = 'small';

  const btnOpenSettings = document.getElementById('btn-open-settings');
  const settingsModal = document.getElementById('settings-modal');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const btnSaveSettings = document.getElementById('btn-save-settings');

  const settingSoundToggle = document.getElementById('setting-sound-toggle');
  const settingVolume = document.getElementById('setting-volume');
  const volumeVal = document.getElementById('volume-val');
  const settingNotificationsToggle = document.getElementById('setting-notifications-toggle');
  const settingDefaultReminder = document.getElementById('setting-default-reminder');
  const settingPinDefault = document.getElementById('setting-pin-default');
  const settingWakeToggle = document.getElementById('setting-wake-toggle');
  const settingHourlyToggle = document.getElementById('setting-hourly-toggle');
  const settingHourlyInterval = document.getElementById('setting-hourly-interval');
  const btnTestWake = document.getElementById('btn-test-wake-sequence');
  const btnTestHourly = document.getElementById('btn-test-hourly-nudge');

  async function init() {
    setupTitlebar();
    setupClock();
    await loadData();
    setupEventListeners();
    setupIpcListeners();
  }

  function setupTitlebar() {
    if (titlebarBtnMinimize) {
      titlebarBtnMinimize.addEventListener('click', () => {
        window.electronAPI.minimizeDashboard();
      });
    }

    if (titlebarBtnMaximize) {
      titlebarBtnMaximize.addEventListener('click', async () => {
        if (window.electronAPI.toggleDashboardMaximize) {
          const isMax = await window.electronAPI.toggleDashboardMaximize();
          updateMaximizeIcon(isMax);
        }
      });
      // Check initial maximized state
      if (window.electronAPI.isDashboardMaximized) {
        window.electronAPI.isDashboardMaximized().then(isMax => updateMaximizeIcon(isMax));
      }
    }

    // Close button hides/closes dashboard so floating stickies remain!
    const closeDashboardAction = () => {
      if (window.SoundEngine) window.SoundEngine.playFold();
      window.electronAPI.closeDashboard();
    };

    if (titlebarBtnClose) titlebarBtnClose.addEventListener('click', closeDashboardAction);
    if (btnCloseToScreen) btnCloseToScreen.addEventListener('click', closeDashboardAction);

    // ESC key closes dashboard to screen or closes active modals
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (createModal && createModal.style.display === 'flex') {
          closeCreateModal();
        } else if (settingsModal.style.display === 'flex') {
          settingsModal.style.display = 'none';
        } else if (templateDropdown.style.display === 'block') {
          templateDropdown.style.display = 'none';
        } else {
          closeDashboardAction();
        }
      }
    });
  }

  function updateMaximizeIcon(isMaximized) {
    const icon = document.getElementById('titlebar-maximize-icon');
    if (!icon) return;
    if (isMaximized) {
      // restore icon
      icon.innerHTML = '<path fill="currentColor" d="M4 8H2V2h6v2H4v4zm10-6h6v6h-2V4h-4V2zM2 16h2v4h4v2H2v-6zm18 4h-4v2h6v-6h-2v4z"/>';
    } else {
      // maximize icon
      icon.innerHTML = '<path fill="currentColor" d="M4 4h16v16H4V4zm2 2v12h12V6H6z"/>';
    }
  }

  function setupClock() {
    const updateTime = () => {
      const now = new Date();
      currentClock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    updateTime();
    setInterval(updateTime, 1000);
  }

  async function loadData() {
    allNotes = await window.electronAPI.getNotes();
    currentSettings = await window.electronAPI.getSettings();

    // Sync sound engine settings
    if (window.SoundEngine) {
      window.SoundEngine.setEnabled(currentSettings.soundEnabled !== false);
      window.SoundEngine.setVolume(currentSettings.soundVolume || 0.8);
    }

    renderDashboard();
  }

  function renderDashboard() {
    renderMetrics();
    renderNotesGrid();
  }

  function renderMetrics() {
    const now = new Date();
    const active = allNotes.filter(n => !n.archived && !n.completed);
    const floating = allNotes.filter(n => !n.archived && n.visible !== false);
    const completed = allNotes.filter(n => n.completed);

    const dueToday = active.filter(n => {
      if (!n.deadline) return false;
      const d = new Date(n.deadline);
      return d.toDateString() === now.toDateString();
    });

    const overdue = active.filter(n => {
      if (!n.deadline) return false;
      return new Date(n.deadline) < now;
    });

    metricActiveCount.textContent = floating.length;
    metricDueCount.textContent = dueToday.length;
    metricOverdueCount.textContent = overdue.length;
    metricCompletedCount.textContent = completed.length;

    // Pulse overdue card if any overdue
    const overdueCard = document.getElementById('card-overdue');
    if (overdue.length > 0) {
      overdueCard.style.borderColor = 'rgba(239, 68, 68, 0.4)';
    } else {
      overdueCard.style.borderColor = '';
    }
  }

  function renderNotesGrid() {
    const now = new Date();
    let filtered = allNotes.filter(n => !n.archived);

    // Filter Tab
    if (currentFilter === 'floating') {
      filtered = filtered.filter(n => n.visible !== false && !n.completed);
    } else if (currentFilter === 'high') {
      filtered = filtered.filter(n => !n.completed && n.priority === 'high');
    } else if (currentFilter === 'low') {
      filtered = filtered.filter(n => !n.completed && n.priority === 'low');
    } else if (currentFilter === 'completed') {
      filtered = allNotes.filter(n => n.completed);
    }

    // Priority Filter
    if (currentPriority !== 'all') {
      filtered = filtered.filter(n => n.priority === currentPriority);
    }

    // Search Query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(n => {
        const titleMatch = (n.title || '').toLowerCase().includes(q);
        const contentMatch = (n.content || '').toLowerCase().includes(q);
        const checklistMatch = (n.checklist || []).some(item => (item.text || '').toLowerCase().includes(q));
        const tagsMatch = (n.tags || []).some(t => t.toLowerCase().includes(q));
        return titleMatch || contentMatch || checklistMatch || tagsMatch;
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      if (currentSort === 'deadline') {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline) - new Date(b.deadline);
      } else if (currentSort === 'priority') {
        const pWeights = { high: 2, low: 1 };
        return (pWeights[b.priority] || 1) - (pWeights[a.priority] || 1);
      } else if (currentSort === 'newest') {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      } else if (currentSort === 'title') {
        return (a.title || '').localeCompare(b.title || '');
      }
      return 0;
    });

    // Update All Notes badge count
    const totalGoals = allNotes.filter(n => !n.archived).length;
    if (allNotesCountBadge) {
      allNotesCountBadge.textContent = `${totalGoals} Goal${totalGoals === 1 ? '' : 's'}`;
    }

    notesGrid.innerHTML = '';

    if (filtered.length === 0) {
      emptyState.style.display = 'flex';
      notesGrid.style.display = 'none';
      return;
    }

    emptyState.style.display = 'none';
    notesGrid.style.display = 'grid';

    // Prominent Add Note tile as the first card in the All Notes section
    notesGrid.appendChild(createAddNoteCardElement());

    filtered.forEach(note => {
      const card = createNoteCardElement(note, now);
      notesGrid.appendChild(card);
    });
  }

  function createAddNoteCardElement() {
    const card = document.createElement('div');
    card.className = 'add-note-grid-card';
    card.id = 'card-add-new-note';
    card.title = 'Click to create and add a new sticky note to All Notes';
    card.innerHTML = `
      <div class="add-icon-circle">➕</div>
      <h3 class="add-card-title">Add New Sticky Goal</h3>
      <p class="add-card-desc">Set deadlines, checklist tasks, and pin a floating sticky to your screen.</p>
      <button type="button" class="btn btn-emerald btn-add-inline">
        <span>➕ Add to All Notes Section</span>
      </button>
    `;
    card.addEventListener('click', () => {
      openCreateModal();
    });
    return card;
  }

  function createNoteCardElement(note, now) {
    const card = document.createElement('div');
    card.className = `note-card c-${note.color || 'yellow'}`;

    // 2-Priority label (High: Floats over all apps | Low: Sticked on desktop screen)
    const isHigh = note.priority === 'high';
    const pLabel = isHigh ? '🔥 High Priority' : '🌱 Low Priority';
    const pClass = isHigh ? 'p-high' : 'p-low';
    const pBehavior = isHigh ? 'High Priority: Always floats over every tab and app' : 'Low Priority: Sticked on desktop home screen (hidden below other apps)';

    // Screen status
    const isFloating = !note.archived && note.visible !== false;
    const isPinned = note.pinned !== false;
    const isCompact = note.viewMode === 'compact' || note.folded === true;
    let screenBadgeHtml = '';
    if (!isFloating) {
      screenBadgeHtml = `<span class="card-screen-badge hidden-screen" title="Hidden from screen"><span class="screen-dot"></span> Hidden</span>`;
    } else if (isPinned && isHigh) {
      screenBadgeHtml = `<span class="card-screen-badge badge-top-float" title="Always on Top (Floats over all apps & tabs)"><span class="screen-dot dot-top"></span> Above Apps</span>`;
    } else {
      screenBadgeHtml = `<span class="card-screen-badge badge-desktop" title="Pinned on desktop home screen (hides below other apps & tabs)"><span class="screen-dot dot-desktop"></span> Desktop Only</span>`;
    }

    // Checklist progress
    const list = note.checklist || [];
    const doneCount = list.filter(i => i.done).length;
    const pct = list.length > 0 ? Math.round((doneCount / list.length) * 100) : 0;

    // Deadline chip
    let deadlineChipHtml = `<span class="card-deadline-chip">No deadline</span>`;
    if (note.deadline) {
      const d = new Date(note.deadline);
      const diffMs = d - now;
      const diffMins = Math.round(diffMs / 60000);

      if (diffMs <= 0) {
        deadlineChipHtml = `<span class="card-deadline-chip urgent">⚠️ Overdue ${Math.abs(diffMins)}m</span>`;
      } else if (diffMins <= 60) {
        deadlineChipHtml = `<span class="card-deadline-chip urgent">🔥 Due in ${diffMins}m</span>`;
      } else {
        const timeStr = d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        deadlineChipHtml = `<span class="card-deadline-chip">⏰ ${timeStr}</span>`;
      }
    }

    card.innerHTML = `
      <div class="card-tape"></div>
      <div class="card-header">
        <span class="card-priority ${pClass}" title="${pBehavior}">${pLabel}</span>
        <div class="card-mode-toggle no-drag" title="Switch size mode for this sticky">
          <button class="card-mode-btn ${isCompact ? 'active' : ''} btn-switch-compact" title="Goal Only (Compact)">🎯 Goal</button>
          <button class="card-mode-btn ${!isCompact ? 'active' : ''} btn-switch-full" title="Full Note with Todos">📋 Full</button>
        </div>
        ${screenBadgeHtml}
      </div>
      <h3 class="card-title">${escapeHtml(note.title || 'Untitled Goal')}</h3>
      <div class="card-content-preview">${escapeHtml(note.content || 'No description notes...')}</div>
      ${list.length > 0 ? `
        <div class="card-checklist-status">
          <div class="card-checklist-label">${doneCount}/${list.length} tasks completed (${pct}%)</div>
          <div class="checklist-bar-track">
            <div class="checklist-bar-fill" style="width: ${pct}%;"></div>
          </div>
        </div>
      ` : ''}
      <div class="card-footer">
        ${deadlineChipHtml}
        <div class="card-actions">
          <button class="card-btn btn-edit-note" title="Edit goal in App's All Notes Section">✏️ Edit</button>
          <button class="card-btn btn-focus" title="Bring to Focus / Float on Screen">📌 Focus</button>
          <button class="card-btn btn-toggle-done" title="${note.completed ? 'Mark uncompleted' : 'Mark accomplished'}">
            ${note.completed ? '↩️' : '✨'}
          </button>
          <button class="card-btn btn-del" title="Delete note">🗑️</button>
        </div>
      </div>
    `;

    // Mode toggle buttons on card
    card.querySelector('.btn-switch-compact').addEventListener('click', async (e) => {
      e.stopPropagation();
      await window.electronAPI.setStickyMode(note.id, 'compact');
      note.viewMode = 'compact';
      note.folded = true;
      renderDashboard();
    });

    card.querySelector('.btn-switch-full').addEventListener('click', async (e) => {
      e.stopPropagation();
      await window.electronAPI.setStickyMode(note.id, 'full');
      note.viewMode = 'full';
      note.folded = false;
      renderDashboard();
    });

    // Edit button on card
    card.querySelector('.btn-edit-note').addEventListener('click', (e) => {
      e.stopPropagation();
      openEditModal(note.id);
    });

    // Click on card opens edit modal for this note
    card.addEventListener('click', async (e) => {
      if (e.target.closest('.card-btn') || e.target.closest('.card-mode-toggle')) return;
      openEditModal(note.id);
    });

    card.querySelector('.btn-focus').addEventListener('click', async (e) => {
      e.stopPropagation();
      await window.electronAPI.focusSticky(note.id);
    });

    card.querySelector('.btn-toggle-done').addEventListener('click', async (e) => {
      e.stopPropagation();
      note.completed = !note.completed;
      note.completedAt = note.completed ? new Date().toISOString() : null;

      if (note.completed && window.SoundEngine) {
        window.SoundEngine.playCelebration();
      }

      await window.electronAPI.saveNote(note);
      renderDashboard();
    });

    card.querySelector('.btn-del').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm(`Delete sticky goal "${note.title || 'Untitled'}"?`)) {
        await window.electronAPI.deleteNote(note.id);
        allNotes = allNotes.filter(n => n.id !== note.id);
        renderDashboard();
      }
    });

    return card;
  }

  function setupEventListeners() {
    // New Sticky Buttons - Open Create Modal with explicit Add button
    btnCreateSticky.addEventListener('click', () => {
      openCreateModal();
    });

    btnEmptyNew.addEventListener('click', () => {
      openCreateModal();
    });

    if (btnSectionAddSticky) {
      btnSectionAddSticky.addEventListener('click', () => {
        openCreateModal();
      });
    }

    // Modal close and cancel
    if (btnCloseCreateModal) {
      btnCloseCreateModal.addEventListener('click', () => {
        closeCreateModal();
      });
    }

    if (btnCancelCreate) {
      btnCancelCreate.addEventListener('click', () => {
        closeCreateModal();
      });
    }

    if (createModal) {
      createModal.addEventListener('click', (e) => {
        if (e.target === createModal) {
          closeCreateModal();
        }
      });
    }

    // Modal Paper Color Selector
    document.querySelectorAll('.create-color-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        document.querySelectorAll('.create-color-dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        selectedCreateColor = dot.dataset.color || 'yellow';
        if (window.SoundEngine) window.SoundEngine.playCheck();
      });
    });

    // Modal Initial Size Switcher (Full Note vs Goal Only)
    if (modeOptFull && modeOptCompact) {
      modeOptFull.addEventListener('click', () => {
        modeOptFull.classList.add('active');
        modeOptCompact.classList.remove('active');
        selectedCreateMode = 'full';
        if (window.SoundEngine) window.SoundEngine.playFold();
      });

      modeOptCompact.addEventListener('click', () => {
        modeOptCompact.classList.add('active');
        modeOptFull.classList.remove('active');
        selectedCreateMode = 'small';
        if (window.SoundEngine) window.SoundEngine.playFold();
      });
    }

    // Add subtask button in create modal
    if (btnCreateAddSubtask) {
      btnCreateAddSubtask.addEventListener('click', () => {
        addSubtaskInputRow();
      });
    }

    // Remove subtask or press Enter in subtask input
    if (createSubtasksList) {
      createSubtasksList.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-remove-subtask')) {
          const item = e.target.closest('.create-subtask-item');
          if (item) {
            item.remove();
          }
        }
      });

      createSubtasksList.addEventListener('keydown', (e) => {
        if (e.target.classList.contains('create-subtask-input') && e.key === 'Enter') {
          e.preventDefault();
          addSubtaskInputRow();
        }
      });
    }

    // Confirm Add Note to All Notes Section
    if (btnConfirmAddAllNotes) {
      btnConfirmAddAllNotes.addEventListener('click', handleConfirmAddNoteToAllNotes);
    }

    // Delete Note from Modal when editing
    if (btnModalDelete) {
      btnModalDelete.addEventListener('click', async () => {
        const idToDelete = modalNoteId ? modalNoteId.value : '';
        if (idToDelete) {
          const n = allNotes.find(item => item.id === idToDelete);
          if (confirm(`Delete goal "${(n && n.title) || 'Untitled'}" from All Notes?`)) {
            await window.electronAPI.deleteNote(idToDelete);
            allNotes = allNotes.filter(item => item.id !== idToDelete);
            renderDashboard();
            closeCreateModal();
          }
        }
      });
    }

    // Pressing Enter in title input submits
    if (createTitleInput) {
      createTitleInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleConfirmAddNoteToAllNotes();
        }
      });
    }

    // Template Dropdown
    btnTemplateToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = templateDropdown.style.display === 'block';
      templateDropdown.style.display = isOpen ? 'none' : 'block';
    });

    document.querySelectorAll('[data-template]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const template = btn.dataset.template;
        templateDropdown.style.display = 'none';
        await createFromPreset(template);
      });
    });

    document.addEventListener('click', () => {
      templateDropdown.style.display = 'none';
    });

    // Arrange Stickies in neat vertical column without overlap
    if (btnArrangeColumn) {
      btnArrangeColumn.addEventListener('click', async () => {
        if (window.SoundEngine) window.SoundEngine.playRip();
        if (window.electronAPI.arrangeStickiesColumn) {
          await window.electronAPI.arrangeStickiesColumn();
        }
      });
    }

    // Toggle Floating Stickies Visibility
    btnToggleStickies.addEventListener('click', async () => {
      if (areStickiesVisible) {
        await window.electronAPI.hideAllStickies();
        areStickiesVisible = false;
        stickiesVisibilityText.textContent = 'Show All';
      } else {
        await window.electronAPI.showAllStickies();
        areStickiesVisible = true;
        stickiesVisibilityText.textContent = 'Hide All';
      }
      renderDashboard();
    });

    // Search Box
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value.trim();
      btnClearSearch.style.display = searchQuery ? 'block' : 'none';
      renderNotesGrid();
    });

    btnClearSearch.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      btnClearSearch.style.display = 'none';
      renderNotesGrid();
    });

    // Filter Tabs
    filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentFilter = tab.dataset.filter;
        renderNotesGrid();
      });
    });

    // Priority Filter
    priorityFilterSelect.addEventListener('change', () => {
      currentPriority = priorityFilterSelect.value;
      renderNotesGrid();
    });

    // Sort Select
    sortSelect.addEventListener('change', () => {
      currentSort = sortSelect.value;
      renderNotesGrid();
    });

    // Settings Modal
    btnOpenSettings.addEventListener('click', () => {
      populateSettingsModal();
      settingsModal.style.display = 'flex';
    });

    btnCloseSettings.addEventListener('click', () => {
      settingsModal.style.display = 'none';
    });

    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        settingsModal.style.display = 'none';
      }
    });

    settingVolume.addEventListener('input', () => {
      volumeVal.textContent = `${Math.round(settingVolume.value * 100)}%`;
      if (window.SoundEngine) {
        window.SoundEngine.setVolume(parseFloat(settingVolume.value));
      }
    });

    // Chime Preview Buttons
    document.querySelectorAll('.test-sound-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const soundType = btn.dataset.sound;
        if (window.SoundEngine) {
          window.SoundEngine.play(soundType);
        }
      });
    });

    // Test Reopen Sequence Button
    if (btnTestWake) {
      btnTestWake.addEventListener('click', async () => {
        await window.electronAPI.triggerWakeSequence();
      });
    }

    // Test Hourly Nudge Button
    if (btnTestHourly) {
      btnTestHourly.addEventListener('click', async () => {
        await window.electronAPI.triggerHourlyNudge();
      });
    }

    btnSaveSettings.addEventListener('click', async () => {
      const updated = {
        soundEnabled: settingSoundToggle.checked,
        soundVolume: parseFloat(settingVolume.value),
        notificationsEnabled: settingNotificationsToggle.checked,
        remindMinutesBefore: 15,
        defaultAlwaysOnTop: settingPinDefault.checked,
        wakeAnnouncementEnabled: settingWakeToggle.checked,
        hourlyNudgeEnabled: settingHourlyToggle.checked,
        hourlyNudgeIntervalMinutes: parseInt(settingHourlyInterval.value, 10)
      };

      currentSettings = await window.electronAPI.updateSettings(updated);
      if (window.SoundEngine) {
        window.SoundEngine.setEnabled(currentSettings.soundEnabled);
        window.SoundEngine.setVolume(currentSettings.soundVolume);
        window.SoundEngine.playCheck();
      }
      settingsModal.style.display = 'none';
    });
  }

  function populateSettingsModal() {
    settingSoundToggle.checked = currentSettings.soundEnabled !== false;
    settingVolume.value = currentSettings.soundVolume || 0.8;
    volumeVal.textContent = `${Math.round((currentSettings.soundVolume || 0.8) * 100)}%`;
    settingNotificationsToggle.checked = currentSettings.notificationsEnabled !== false;
    settingPinDefault.checked = currentSettings.defaultAlwaysOnTop !== false;
    if (settingWakeToggle) settingWakeToggle.checked = currentSettings.wakeAnnouncementEnabled !== false;
    if (settingHourlyToggle) settingHourlyToggle.checked = currentSettings.hourlyNudgeEnabled !== false;
    if (settingHourlyInterval) settingHourlyInterval.value = currentSettings.hourlyNudgeIntervalMinutes || 60;
  }

  async function createFromPreset(type) {
    const now = new Date();

    if (type === 'standup') {
      const endOfDay = new Date(now);
      endOfDay.setHours(18, 0, 0, 0);
      await window.electronAPI.createNewSticky({
        title: '🎯 Daily Top 3 Focus',
        content: 'Win the day by finishing these 3 non-negotiables before 6 PM!',
        color: 'yellow',
        priority: 'high',
        tapeStyle: 'tape',
        deadline: endOfDay.toISOString(),
        checklist: [
          { id: '1', text: 'Top priority milestone 1', done: false },
          { id: '2', text: 'Important client / team task 2', done: false },
          { id: '3', text: 'High-leverage deliverable 3', done: false }
        ]
      });
    } else if (type === 'sprint') {
      const in90m = new Date(now.getTime() + 90 * 60000);
      await window.electronAPI.createNewSticky({
        title: '⏱️ 90-Min Deep Work Sprint',
        content: 'Zero distractions. Phone on silent. Laser focus on one task.',
        color: 'mint',
        priority: 'high',
        tapeStyle: 'pin',
        deadline: in90m.toISOString(),
        checklist: [
          { id: '1', text: 'Complete draft / code implementation', done: false },
          { id: '2', text: 'Self-review and polish', done: false }
        ]
      });
    } else if (type === 'urgent') {
      const in2h = new Date(now.getTime() + 2 * 3600000);
      await window.electronAPI.createNewSticky({
        title: '🔥 Urgent Bug / Blocker',
        content: 'Critical issue needing immediate resolution.',
        color: 'peach',
        priority: 'high',
        tapeStyle: 'pin',
        deadline: in2h.toISOString(),
        reminderTime: 15,
        checklist: [
          { id: '1', text: 'Isolate root cause', done: false },
          { id: '2', text: 'Deploy hotfix & verify', done: false }
        ]
      });
    } else if (type === 'habit') {
      const in4h = new Date(now.getTime() + 4 * 3600000);
      await window.electronAPI.createNewSticky({
        title: '💧 Health & Wellness Pause',
        content: 'Take care of your mind & body during long screen hours.',
        color: 'blue',
        priority: 'low',
        tapeStyle: 'tape',
        deadline: in4h.toISOString(),
        checklist: [
          { id: '1', text: 'Drink a full glass of water', done: false },
          { id: '2', text: 'Stand up & stretch shoulders/neck', done: false },
          { id: '3', text: '20-20-20 eye rest (look 20ft away for 20s)', done: false }
        ]
      });
    } else if (type === 'idea') {
      await window.electronAPI.createNewSticky({
        title: '💡 Quick Idea Scratchpad',
        content: 'Capture breakthrough insights before they fade!',
        color: 'lavender',
        priority: 'low',
        tapeStyle: 'tape',
        deadline: null,
        checklist: []
      });
    }

    if (window.SoundEngine) window.SoundEngine.playCheck();
  }

  function openCreateModal() {
    if (modalNoteId) modalNoteId.value = '';
    if (modalTitleHeading) modalTitleHeading.textContent = '➕ Create & Add New Sticky Goal';
    if (modalTitleDesc) modalTitleDesc.textContent = 'Set your goal, todos, paper color, and deadline. Then add it directly to your All Notes section.';

    createTitleInput.value = '';
    createContentInput.value = '';
    selectedCreateColor = 'yellow';
    selectedCreateMode = 'small';

    // Set default deadline to 4 hours from now
    const now = new Date();
    const in4h = new Date(now.getTime() + 4 * 3600000);
    const tzOffset = in4h.getTimezoneOffset() * 60000;
    createDeadlineInput.value = (new Date(in4h.getTime() - tzOffset)).toISOString().slice(0, 16);

    createPrioritySelect.value = 'high';
    if (createPinToggle) createPinToggle.checked = true;

    // Reset color dots
    document.querySelectorAll('.create-color-dot').forEach(dot => {
      dot.classList.toggle('active', dot.dataset.color === 'yellow');
    });

    // Reset mode switcher - default to small size
    if (modeOptFull && modeOptCompact) {
      modeOptCompact.classList.add('active');
      modeOptFull.classList.remove('active');
    }

    // Reset subtasks with 1 clean item
    if (createSubtasksList) {
      createSubtasksList.innerHTML = `
        <div class="create-subtask-item">
          <span class="subtask-icon">▫</span>
          <input type="text" class="form-input create-subtask-input" placeholder="Subtask 1..." />
          <button type="button" class="btn-remove-subtask" title="Remove subtask">&times;</button>
        </div>
      `;
    }

    if (btnModalDelete) btnModalDelete.style.display = 'none';
    if (btnModalIcon) btnModalIcon.textContent = '➕';
    if (btnModalSubmitText) btnModalSubmitText.textContent = 'Add Note to All Notes Section & Float on Screen';

    createModal.style.display = 'flex';
    setTimeout(() => {
      createTitleInput.focus();
    }, 50);
  }

  function openEditModal(noteId) {
    const note = allNotes.find(n => n.id === noteId);
    if (!note) return;

    if (modalNoteId) modalNoteId.value = note.id;
    if (modalTitleHeading) modalTitleHeading.textContent = '✏️ Edit Sticky Goal';
    if (modalTitleDesc) modalTitleDesc.textContent = 'Update your goal, checklist tasks, paper color, pin state, and deadline.';

    createTitleInput.value = note.title || '';
    createContentInput.value = note.content || '';
    selectedCreateColor = note.color || 'yellow';
    selectedCreateMode = note.viewMode || 'small';

    if (note.deadline) {
      const d = new Date(note.deadline);
      const tzOffset = d.getTimezoneOffset() * 60000;
      createDeadlineInput.value = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
    } else {
      createDeadlineInput.value = '';
    }

    createPrioritySelect.value = (note.priority === 'low') ? 'low' : 'high';
    if (createPinToggle) createPinToggle.checked = note.pinned !== false;

    // Set color dot
    document.querySelectorAll('.create-color-dot').forEach(dot => {
      dot.classList.toggle('active', dot.dataset.color === selectedCreateColor);
    });

    // Set size mode
    if (modeOptFull && modeOptCompact) {
      if (selectedCreateMode === 'full') {
        modeOptFull.classList.add('active');
        modeOptCompact.classList.remove('active');
      } else {
        modeOptCompact.classList.add('active');
        modeOptFull.classList.remove('active');
      }
    }

    // Populate subtasks
    if (createSubtasksList) {
      createSubtasksList.innerHTML = '';
      const list = note.checklist || [];
      if (list.length > 0) {
        list.forEach(item => {
          addSubtaskInputRow(item.text || '');
        });
      } else {
        addSubtaskInputRow('');
      }
    }

    if (btnModalDelete) btnModalDelete.style.display = 'block';
    if (btnModalIcon) btnModalIcon.textContent = '💾';
    if (btnModalSubmitText) btnModalSubmitText.textContent = 'Save Changes to All Notes & Floating Sticky';

    createModal.style.display = 'flex';
    setTimeout(() => {
      createTitleInput.focus();
    }, 50);
  }

  function closeCreateModal() {
    createModal.style.display = 'none';
  }

  function addSubtaskInputRow(initialText = '') {
    if (!createSubtasksList) return;
    const item = document.createElement('div');
    item.className = 'create-subtask-item';
    item.innerHTML = `
      <span class="subtask-icon">▫</span>
      <input type="text" class="form-input create-subtask-input" value="${escapeHtml(initialText)}" placeholder="Next subtask..." />
      <button type="button" class="btn-remove-subtask" title="Remove subtask">&times;</button>
    `;
    createSubtasksList.appendChild(item);
    const input = item.querySelector('.create-subtask-input');
    input.focus();
    return item;
  }

  async function handleConfirmAddNoteToAllNotes() {
    const titleVal = createTitleInput.value.trim();
    if (!titleVal) {
      createTitleInput.focus();
      createTitleInput.style.borderColor = '#ef4444';
      setTimeout(() => {
        createTitleInput.style.borderColor = '';
      }, 1500);
      return;
    }

    const subtasks = [];
    document.querySelectorAll('.create-subtask-input').forEach((input, idx) => {
      const text = input.value.trim();
      if (text) {
        subtasks.push({
          id: 'item-' + (idx + 1),
          text: text,
          done: false
        });
      }
    });

    if (subtasks.length === 0) {
      subtasks.push({
        id: 'item-1',
        text: 'Define key milestone',
        done: false
      });
    }

    let deadlineIso = null;
    if (createDeadlineInput.value) {
      const d = new Date(createDeadlineInput.value);
      if (!isNaN(d.getTime())) {
        deadlineIso = d.toISOString();
      }
    }

    const isPinned = createPinToggle ? createPinToggle.checked : true;
    const editingId = modalNoteId ? modalNoteId.value : '';
    const chosenPriority = (createPrioritySelect.value === 'low') ? 'low' : 'high';

    if (editingId) {
      // EDIT existing note
      const existing = allNotes.find(n => n.id === editingId);
      if (existing) {
        existing.title = titleVal;
        existing.content = createContentInput.value.trim();
        existing.color = selectedCreateColor;
        existing.priority = chosenPriority;
        existing.deadline = deadlineIso;
        existing.pinned = isPinned;
        existing.viewMode = selectedCreateMode;
        existing.folded = selectedCreateMode === 'small' || selectedCreateMode === 'compact';

        existing.checklist = subtasks.map((st, i) => {
          const oldMatch = (existing.checklist || [])[i];
          return {
            id: st.id,
            text: st.text,
            done: oldMatch ? oldMatch.done : false
          };
        });
        existing.updatedAt = new Date().toISOString();

        await window.electronAPI.saveNote(existing);
        if (window.SoundEngine) window.SoundEngine.playCheck();

        allNotes = await window.electronAPI.getNotes();
        renderDashboard();
        closeCreateModal();
        return;
      }
    }

    // CREATE new note
    const notePreset = {
      title: titleVal,
      content: createContentInput.value.trim(),
      color: selectedCreateColor,
      priority: chosenPriority,
      deadline: deadlineIso,
      pinned: isPinned,
      viewMode: selectedCreateMode,
      folded: selectedCreateMode === 'small' || selectedCreateMode === 'compact',
      checklist: subtasks
    };

    if (btnConfirmAddAllNotes) {
      btnConfirmAddAllNotes.disabled = true;
      const originalText = btnConfirmAddAllNotes.innerHTML;
      btnConfirmAddAllNotes.innerHTML = '<span>✔ Added to All Notes!</span>';
      setTimeout(() => {
        btnConfirmAddAllNotes.disabled = false;
        btnConfirmAddAllNotes.innerHTML = originalText;
      }, 1500);
    }

    try {
      await window.electronAPI.createNewSticky(notePreset);
      if (window.SoundEngine) window.SoundEngine.playCheck();

      // Refresh dashboard
      allNotes = await window.electronAPI.getNotes();
      renderDashboard();
      closeCreateModal();
    } catch (err) {
      console.error('Failed to create sticky note:', err);
    }
  }

  function setupIpcListeners() {
    window.electronAPI.onNoteUpdated(async () => {
      allNotes = await window.electronAPI.getNotes();
      renderDashboard();
    });

    window.electronAPI.onNoteDeleted(async (id) => {
      allNotes = allNotes.filter(n => n.id !== id);
      renderDashboard();
    });

    if (window.electronAPI.onOpenNoteEditor) {
      window.electronAPI.onOpenNoteEditor((noteId) => {
        openEditModal(noteId);
      });
    }

    window.electronAPI.onSettingsUpdated((newSettings) => {
      currentSettings = newSettings;
      if (window.SoundEngine) {
        window.SoundEngine.setEnabled(currentSettings.soundEnabled !== false);
        window.SoundEngine.setVolume(currentSettings.soundVolume || 0.8);
      }
    });
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
