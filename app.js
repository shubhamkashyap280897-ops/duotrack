/**
 * DuoTrack - Activity & Habit Tracker for Two Friends
 * Modern Vanilla JS with LocalStorage persistence, Live Multi-device Server Sync,
 * Web Audio feedback, & Canvas Confetti.
 */

(function () {
  'use strict';

  // --- STORAGE KEYS & CONSTANTS ---
  const STORAGE_KEY = 'duotrack_data_v1';
  const THEME_KEY = 'duotrack_theme_v1';
  const isServerMode = window.location.protocol.startsWith('http');

  // --- DEFAULT DATA ---
  const DEFAULT_DATA = {
    profiles: {
      u1: { id: 'u1', name: 'You', avatar: '🚀' },
      u2: { id: 'u2', name: 'Friend', avatar: '🎯' }
    },
    activities: [
      {
        id: 'act_1',
        title: 'Morning Workout / 30m Walk',
        category: 'fitness',
        icon: '🏃‍♂️',
        desc: 'At least 30 mins cardio or strength',
        createdAt: '2026-01-01'
      },
      {
        id: 'act_2',
        title: 'Read 20 Pages',
        category: 'learning',
        icon: '📚',
        desc: 'Non-fiction book or tech articles',
        createdAt: '2026-01-01'
      },
      {
        id: 'act_3',
        title: 'Drink 2.5L Water',
        category: 'lifestyle',
        icon: '💧',
        desc: 'Stay hydrated throughout the day',
        createdAt: '2026-01-01'
      },
      {
        id: 'act_4',
        title: '1 Hour Deep Work / Skill Building',
        category: 'productivity',
        icon: '⚡',
        desc: 'No phone distractions',
        createdAt: '2026-01-01'
      }
    ],
    checkins: {} // keyed by 'YYYY-MM-DD': { [actId]: { u1: bool, u2: bool } }
  };

  // --- STATE ---
  let appData = loadData();
  let selectedDate = getTodayDateString();
  let currentView = 'duo'; // 'duo' | 'u1' | 'u2'
  let isEditingModalOpen = false;

  // --- DOM ELEMENTS ---
  const liveStatusPill = document.getElementById('liveStatusPill');
  const liveStatusText = document.getElementById('liveStatusText');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIcon = document.getElementById('themeIcon');
  const profileSettingsBtn = document.getElementById('profileSettingsBtn');
  const backupModalBtn = document.getElementById('backupModalBtn');
  const addActivityBtn = document.getElementById('addActivityBtn');
  const emptyAddBtn = document.getElementById('emptyAddBtn');

  const prevDayBtn = document.getElementById('prevDayBtn');
  const nextDayBtn = document.getElementById('nextDayBtn');
  const todayBtn = document.getElementById('todayBtn');
  const datePickerInput = document.getElementById('datePickerInput');
  const dateDisplayFormatted = document.getElementById('dateDisplayFormatted');

  const activityTableBody = document.getElementById('activityTableBody');
  const emptyState = document.getElementById('emptyState');

  // Modals
  const activityModal = document.getElementById('activityModal');
  const activityForm = document.getElementById('activityForm');
  const activityModalTitle = document.getElementById('activityModalTitle');
  const activityIdInput = document.getElementById('activityId');
  const actTitleInput = document.getElementById('actTitle');
  const actCategoryInput = document.getElementById('actCategory');
  const actIconInput = document.getElementById('actIcon');
  const actDescInput = document.getElementById('actDesc');

  const profileModal = document.getElementById('profileModal');
  const profileForm = document.getElementById('profileForm');
  const u1NameInput = document.getElementById('u1NameInput');
  const u1AvatarInput = document.getElementById('u1AvatarInput');
  const u2NameInput = document.getElementById('u2NameInput');
  const u2AvatarInput = document.getElementById('u2AvatarInput');

  const backupModal = document.getElementById('backupModal');
  const exportDataBtn = document.getElementById('exportDataBtn');
  const triggerImportBtn = document.getElementById('triggerImportBtn');
  const importFileInput = document.getElementById('importFileInput');
  const resetDataBtn = document.getElementById('resetDataBtn');

  const nudgeText = document.getElementById('nudgeText');
  const randomNudgeBtn = document.getElementById('randomNudgeBtn');
  const toastContainer = document.getElementById('toastContainer');

  // Referee Elephant Mascot DOM Elements
  const refereeWidget = document.getElementById('refereeWidget');
  const refereeBubble = document.getElementById('refereeBubble');
  const refereeSpeechText = document.getElementById('refereeSpeechText');
  const refereeAvatarBody = document.getElementById('refereeAvatarBody');
  let refereeBubbleTimer = null;

  // --- AUDIO SYNTHESIZERS ---
  function playChime(isMutual = false) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (isMutual) {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
        osc.frequency.setValueAtTime(1046.50, now + 0.3); // C6
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  // Realistic Sports Referee Whistle Synthesizer
  function playRefereeWhistle() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      // Tremolo LFO for referee whistle flutter
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      lfo.frequency.setValueAtTime(22, now);
      lfoGain.gain.setValueAtTime(260, now);
      lfo.connect(osc1.frequency);
      lfo.connect(osc2.frequency);

      osc1.frequency.setValueAtTime(2800, now);
      osc2.frequency.setValueAtTime(3100, now);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.04);
      gain.gain.setValueAtTime(0.18, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      lfo.start(now);
      osc1.start(now);
      osc2.start(now);

      lfo.stop(now + 0.33);
      osc1.stop(now + 0.33);
      osc2.stop(now + 0.33);
    } catch (e) {}
  }

  // Referee Commentary Engine
  function speakReferee(message, withWhistle = true, duration = 4500) {
    if (!refereeSpeechText || !refereeBubble) return;

    refereeSpeechText.textContent = message;
    refereeBubble.classList.remove('bubble-hidden');

    if (withWhistle) {
      playRefereeWhistle();
      if (refereeAvatarBody) {
        refereeAvatarBody.classList.remove('ref-jump');
        void refereeAvatarBody.offsetWidth;
        refereeAvatarBody.classList.add('ref-jump');
        setTimeout(() => refereeAvatarBody.classList.remove('ref-jump'), 600);
      }
    }

    if (refereeBubbleTimer) clearTimeout(refereeBubbleTimer);
    refereeBubbleTimer = setTimeout(() => {
      refereeBubble.classList.add('bubble-hidden');
    }, duration);
  }

  function handleRefereeClick() {
    const { u1, u2 } = appData.profiles;
    const { activities, checkins } = appData;
    const dayCheck = checkins[selectedDate] || {};

    let u1Count = 0;
    let u2Count = 0;
    activities.forEach(a => {
      const c = dayCheck[a.id] || {};
      if (c.u1) u1Count++;
      if (c.u2) u2Count++;
    });

    const total = activities.length;

    let remark = '';
    const randomPool = [
      `Ref Ellie Rule #1: Consistency beats talent! Keep showing up! 🐘`,
      `Fair play only! Ref Ellie is watching every tick! 👀🏁`,
      `Hydration timeout! Take a sip of water and keep moving! 💧`,
      `Accountability partners who train together win together! ⚡`,
      `Remember: Duo Synergy streak only grows when BOTH finish! 🔥`
    ];

    if (u1Count === total && u2Count === total && total > 0) {
      remark = `🏆 MATCH WON! Both ${u1.name} & ${u2.name} have finished 100% today! Flawless game! 🌟`;
    } else if (u1Count > u2Count) {
      remark = `Whistle blown! 🏁 ${u1.name} leads ${u1Count} to ${u2Count}! ${u2.name}, time to answer back! ⚡`;
    } else if (u2Count > u1Count) {
      remark = `Whistle blown! 🏁 ${u2.name} leads ${u2Count} to ${u1Count}! ${u1.name}, time for a counter-attack! 🚀`;
    } else if (u1Count === u2Count && u1Count > 0) {
      remark = `Tied game! Both on ${u1Count}/${total}! Who takes the lead next? ⏱️`;
    } else {
      remark = randomPool[Math.floor(Math.random() * randomPool.length)];
    }

    speakReferee(remark, true, 5000);
  }

  // --- INITIALIZATION ---
  function init() {
    initTheme();
    bindEvents();
    renderAll();

    if (isServerMode) {
      initServerSync();
    } else {
      liveStatusPill.classList.remove('online');
      liveStatusText.textContent = 'Local (Offline)';
    }

    // Welcome commentary from Ref Ellie
    setTimeout(() => {
      speakReferee(`Ref Ellie reporting for duty! 🐘 Tap me anytime for match updates! 🏁`, false, 4000);
    }, 1000);
  }

  // --- SERVER SYNC ENGINE ---
  async function initServerSync() {
    liveStatusPill.classList.add('online');
    liveStatusText.textContent = 'Live Synced 🟢';

    // Fetch initial data from server
    await fetchServerData();

    // Polling every 3.5s to pull changes made by friend
    setInterval(async () => {
      if (!isEditingModalOpen && document.visibilityState === 'visible') {
        await fetchServerData(true);
      }
    }, 3500);
  }

  async function fetchServerData(silent = false) {
    if (!isServerMode) return;
    try {
      const res = await fetch('/api/data', { cache: 'no-store' });
      if (res.ok) {
        const serverData = await res.json();
        const currentStr = JSON.stringify(appData);
        const serverStr = JSON.stringify(serverData);

        if (currentStr !== serverStr) {
          appData = serverData;
          saveLocalCache();
          renderAll();
          if (silent) {
            // Updated silently from friend's action
          }
        }
      }
    } catch (err) {
      if (!silent) console.warn('Sync connection check:', err);
    }
  }

  async function pushServerCheck(date, activityId, user, checked) {
    if (!isServerMode) return;
    try {
      await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, activityId, user, checked })
      });
    } catch (err) {
      console.error('Failed to sync check to server:', err);
    }
  }

  async function pushServerFullSync() {
    if (!isServerMode) return;
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appData)
      });
    } catch (err) {
      console.error('Failed to sync data to server:', err);
    }
  }

  // --- DATA LOADING & SAVING ---
  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          profiles: parsed.profiles || DEFAULT_DATA.profiles,
          activities: parsed.activities || DEFAULT_DATA.activities,
          checkins: parsed.checkins || {}
        };
      }
    } catch (e) {
      console.error('Error loading data from localStorage', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }

  function saveLocalCache() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
      updateStorageInfo();
    } catch (e) {
      console.error('Error saving data', e);
    }
  }

  function saveData() {
    saveLocalCache();
    if (isServerMode) {
      pushServerFullSync();
    }
  }

  // --- THEME HANDLING ---
  function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'theme-dark';
    document.body.className = savedTheme;
    updateThemeIcon();
  }

  function toggleTheme() {
    if (document.body.classList.contains('theme-dark')) {
      document.body.classList.remove('theme-dark');
      document.body.classList.add('theme-light');
      localStorage.setItem(THEME_KEY, 'theme-light');
    } else {
      document.body.classList.remove('theme-light');
      document.body.classList.add('theme-dark');
      localStorage.setItem(THEME_KEY, 'theme-dark');
    }
    updateThemeIcon();
  }

  function updateThemeIcon() {
    if (document.body.classList.contains('theme-dark')) {
      themeIcon.textContent = '☀️';
      themeToggleBtn.title = 'Switch to Light Mode';
    } else {
      themeIcon.textContent = '🌙';
      themeToggleBtn.title = 'Switch to Dark Mode';
    }
  }

  // --- DATE HELPERS ---
  function getTodayDateString() {
    const d = new Date();
    return formatDateKey(d);
  }

  function formatDateKey(dateObj) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function parseDateKey(dateKey) {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  function shiftDate(offsetDays) {
    const d = parseDateKey(selectedDate);
    d.setDate(d.getDate() + offsetDays);
    selectedDate = formatDateKey(d);
    renderAll();
  }

  // --- RENDER FUNCTIONS ---
  function renderAll() {
    renderDateToolbar();
    renderProfileHeaders();
    renderActivitiesTable();
    renderStatsAndStreaks();
    renderWeeklyGrid();
    updateStorageInfo();
  }

  function renderDateToolbar() {
    const dateObj = parseDateKey(selectedDate);
    const todayStr = getTodayDateString();

    const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    const formatted = dateObj.toLocaleDateString(undefined, options);

    if (selectedDate === todayStr) {
      dateDisplayFormatted.innerHTML = `<strong>Today</strong> (${formatted})`;
      todayBtn.classList.add('active');
    } else {
      dateDisplayFormatted.textContent = formatted;
      todayBtn.classList.remove('active');
    }

    datePickerInput.value = selectedDate;
  }

  function renderProfileHeaders() {
    const { u1, u2 } = appData.profiles;

    // Header previews
    document.getElementById('u1AvatarPreview').textContent = u1.avatar || '👤';
    document.getElementById('u1NamePreview').textContent = u1.name || 'User 1';

    document.getElementById('u2AvatarPreview').textContent = u2.avatar || '👤';
    document.getElementById('u2NamePreview').textContent = u2.name || 'User 2';

    // Table column headers
    document.getElementById('colU1Avatar').textContent = u1.avatar;
    document.getElementById('colU1Name').textContent = u1.name;
    document.getElementById('colU2Avatar').textContent = u2.avatar;
    document.getElementById('colU2Name').textContent = u2.name;

    // Segmented filters
    document.getElementById('filterU1Btn').textContent = u1.name;
    document.getElementById('filterU2Btn').textContent = u2.name;
  }

  function renderActivitiesTable() {
    const { activities, checkins } = appData;
    const dayCheckins = checkins[selectedDate] || {};

    activityTableBody.innerHTML = '';

    if (!activities || activities.length === 0) {
      emptyState.classList.remove('hidden');
      return;
    }
    emptyState.classList.add('hidden');

    activities.forEach(act => {
      const actCheck = dayCheckins[act.id] || { u1: false, u2: false };
      const tr = document.createElement('tr');

      const categoryEmoji = {
        fitness: '💪 Fitness',
        learning: '📚 Learning',
        mindfulness: '🧘 Mindfulness',
        productivity: '⚡ Work',
        lifestyle: '🌱 Lifestyle',
        other: '✨ Other'
      }[act.category] || act.category;

      let statusHtml = '';
      if (actCheck.u1 && actCheck.u2) {
        statusHtml = `<span class="status-badge status-synced">🤝 Both Done!</span>`;
      } else if (actCheck.u1 || actCheck.u2) {
        const who = actCheck.u1 ? appData.profiles.u1.name : appData.profiles.u2.name;
        statusHtml = `<span class="status-badge status-partial">${who} done</span>`;
      } else {
        statusHtml = `<span class="status-badge status-pending">Pending</span>`;
      }

      tr.innerHTML = `
        <td class="col-activity">
          <div class="activity-title-wrap">
            <div class="activity-icon-badge">${act.icon || '📌'}</div>
            <div>
              <div class="activity-name">${escapeHtml(act.title)}</div>
              ${act.desc ? `<div class="activity-desc">${escapeHtml(act.desc)}</div>` : ''}
            </div>
          </div>
        </td>
        <td class="col-category">
          <span class="category-badge">${categoryEmoji}</span>
        </td>
        <td class="col-check u1-col">
          <button class="check-toggle-btn ${actCheck.u1 ? 'u1-checked' : ''}" 
                  data-act-id="${act.id}" data-user="u1" title="Mark for ${escapeHtml(appData.profiles.u1.name)}">
            <span class="btn-avatar">${escapeHtml(appData.profiles.u1.avatar)}</span>
            <span class="btn-user-name">${escapeHtml(appData.profiles.u1.name)}</span>
            <span class="btn-state-text">${actCheck.u1 ? '✓ Done' : '○ Mark'}</span>
          </button>
        </td>
        <td class="col-check u2-col">
          <button class="check-toggle-btn ${actCheck.u2 ? 'u2-checked' : ''}" 
                  data-act-id="${act.id}" data-user="u2" title="Mark for ${escapeHtml(appData.profiles.u2.name)}">
            <span class="btn-avatar">${escapeHtml(appData.profiles.u2.avatar)}</span>
            <span class="btn-user-name">${escapeHtml(appData.profiles.u2.name)}</span>
            <span class="btn-state-text">${actCheck.u2 ? '✓ Done' : '○ Mark'}</span>
          </button>
        </td>
        <td class="col-status">
          ${statusHtml}
        </td>
        <td class="col-actions">
          <div class="action-btn-group">
            <button class="btn-icon-small edit" data-act-id="${act.id}" title="Edit Activity">✏️</button>
            <button class="btn-icon-small delete" data-act-id="${act.id}" title="Delete Activity">🗑️</button>
          </div>
        </td>
      `;

      if (currentView === 'u1') {
        tr.querySelector('.u2-col').style.display = 'none';
        tr.querySelector('.u1-col').style.display = '';
      } else if (currentView === 'u2') {
        tr.querySelector('.u1-col').style.display = 'none';
        tr.querySelector('.u2-col').style.display = '';
      } else {
        tr.querySelector('.u1-col').style.display = '';
        tr.querySelector('.u2-col').style.display = '';
      }

      activityTableBody.appendChild(tr);
    });

    const colHeaderU1 = document.getElementById('colHeaderU1');
    const colHeaderU2 = document.getElementById('colHeaderU2');
    if (currentView === 'u1') {
      colHeaderU1.style.display = '';
      colHeaderU2.style.display = 'none';
    } else if (currentView === 'u2') {
      colHeaderU1.style.display = 'none';
      colHeaderU2.style.display = '';
    } else {
      colHeaderU1.style.display = '';
      colHeaderU2.style.display = '';
    }
  }

  // --- STATS, PERCENTAGES & STREAKS ---
  function renderStatsAndStreaks() {
    const { activities, checkins } = appData;
    const totalCount = activities.length;
    const dayCheckins = checkins[selectedDate] || {};

    let u1Completed = 0;
    let u2Completed = 0;
    let bothCompleted = 0;

    activities.forEach(act => {
      const c = dayCheckins[act.id] || { u1: false, u2: false };
      if (c.u1) u1Completed++;
      if (c.u2) u2Completed++;
      if (c.u1 && c.u2) bothCompleted++;
    });

    const u1Pct = totalCount > 0 ? Math.round((u1Completed / totalCount) * 100) : 0;
    const u2Pct = totalCount > 0 ? Math.round((u2Completed / totalCount) * 100) : 0;

    document.getElementById('u1ProgressPct').textContent = `${u1Pct}%`;
    document.getElementById('u1ProgressBar').style.width = `${u1Pct}%`;
    document.getElementById('u1Meta').textContent = `${u1Completed} of ${totalCount} completed`;

    document.getElementById('u2ProgressPct').textContent = `${u2Pct}%`;
    document.getElementById('u2ProgressBar').style.width = `${u2Pct}%`;
    document.getElementById('u2Meta').textContent = `${u2Completed} of ${totalCount} completed`;

    const u1Streak = calculateUserStreak('u1');
    const u2Streak = calculateUserStreak('u2');
    const duoStreak = calculateDuoStreak();

    document.getElementById('u1Streak').textContent = `${u1Streak} days`;
    document.getElementById('u2Streak').textContent = `${u2Streak} days`;
    document.getElementById('duoStreakCount').textContent = duoStreak;

    const badge = document.getElementById('synergyBadge');
    if (duoStreak >= 7) {
      badge.textContent = '🌟 Legendary Duo!';
    } else if (duoStreak >= 3) {
      badge.textContent = '🔥 On Fire!';
    } else if (bothCompleted === totalCount && totalCount > 0) {
      badge.textContent = '✅ Today Complete!';
    } else {
      badge.textContent = 'Synced Power';
    }

    document.getElementById('totalHabitsCount').textContent = `${totalCount} habit${totalCount === 1 ? '' : 's'} tracked`;
  }

  function calculateUserStreak(userKey) {
    const { activities } = appData;
    if (!activities || activities.length === 0) return 0;

    let streak = 0;
    let datePointer = new Date();

    const todayStr = formatDateKey(datePointer);
    const todayDone = isDayFullyDoneForUser(todayStr, userKey);

    if (!todayDone) {
      datePointer.setDate(datePointer.getDate() - 1);
    }

    while (true) {
      const dateStr = formatDateKey(datePointer);
      if (isDayFullyDoneForUser(dateStr, userKey)) {
        streak++;
        datePointer.setDate(datePointer.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  function isDayFullyDoneForUser(dateStr, userKey) {
    const { activities, checkins } = appData;
    if (!activities || activities.length === 0) return false;
    const day = checkins[dateStr];
    if (!day) return false;

    return activities.every(act => day[act.id] && day[act.id][userKey]);
  }

  function calculateDuoStreak() {
    const { activities } = appData;
    if (!activities || activities.length === 0) return 0;

    let streak = 0;
    let datePointer = new Date();

    const todayStr = formatDateKey(datePointer);
    const todayBoth = isDayFullyDoneForBoth(todayStr);

    if (!todayBoth) {
      datePointer.setDate(datePointer.getDate() - 1);
    }

    while (true) {
      const dateStr = formatDateKey(datePointer);
      if (isDayFullyDoneForBoth(dateStr)) {
        streak++;
        datePointer.setDate(datePointer.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  function isDayFullyDoneForBoth(dateStr) {
    const { activities, checkins } = appData;
    if (!activities || activities.length === 0) return false;
    const day = checkins[dateStr];
    if (!day) return false;

    return activities.every(act => day[act.id] && day[act.id].u1 && day[act.id].u2);
  }

  // --- PAST 7 DAYS LOG / HEATMAP ---
  function renderWeeklyGrid() {
    const weeklyGrid = document.getElementById('weeklyGrid');
    weeklyGrid.innerHTML = '';

    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = formatDateKey(d);

      const dayCell = document.createElement('div');
      dayCell.className = `day-cell ${dateStr === selectedDate ? 'is-selected' : ''}`;
      dayCell.dataset.date = dateStr;

      const dayName = d.toLocaleDateString(undefined, { weekday: 'short' });
      const dayNum = d.getDate();

      const u1Done = isDayFullyDoneForUser(dateStr, 'u1');
      const u2Done = isDayFullyDoneForUser(dateStr, 'u2');
      const bothDone = isDayFullyDoneForBoth(dateStr);

      let dotsHtml = '';
      if (bothDone) {
        dotsHtml = `<div class="dot both-done" title="Both completed 100%!"></div>`;
      } else {
        dotsHtml = `
          <div class="dot ${u1Done ? 'u1-done' : ''}" title="${appData.profiles.u1.name}: ${u1Done ? 'Complete' : 'Pending'}"></div>
          <div class="dot ${u2Done ? 'u2-done' : ''}" title="${appData.profiles.u2.name}: ${u2Done ? 'Complete' : 'Pending'}"></div>
        `;
      }

      dayCell.innerHTML = `
        <div class="day-cell-name">${dayName}</div>
        <div class="day-cell-date">${dayNum}</div>
        <div class="day-cell-status-dots">${dotsHtml}</div>
      `;

      dayCell.addEventListener('click', () => {
        selectedDate = dateStr;
        renderAll();
      });

      weeklyGrid.appendChild(dayCell);
    }
  }

  // --- CHECK TOGGLE LOGIC & FUN ANIMATIONS ---
  function handleToggleCheck(actId, userKey, buttonEl) {
    if (!appData.checkins[selectedDate]) {
      appData.checkins[selectedDate] = {};
    }
    if (!appData.checkins[selectedDate][actId]) {
      appData.checkins[selectedDate][actId] = { u1: false, u2: false };
    }

    const currentVal = !!appData.checkins[selectedDate][actId][userKey];
    const newVal = !currentVal;
    appData.checkins[selectedDate][actId][userKey] = newVal;

    const actCheck = appData.checkins[selectedDate][actId];
    const isNowMutual = actCheck.u1 && actCheck.u2;

    saveLocalCache();
    pushServerCheck(selectedDate, actId, userKey, newVal);
    playChime(isNowMutual);

    if (newVal) {
      // 1. Fun Bouncy Jelly Pop & Micro Sparkles from Button
      if (buttonEl) {
        buttonEl.classList.add('bounce-pop');
        fireButtonSparkles(buttonEl, userKey);
        spawnFloatingXp(buttonEl);
        setTimeout(() => buttonEl.classList.remove('bounce-pop'), 450);
      }

      // 2. Card Celebration Glow
      const cardRow = buttonEl ? buttonEl.closest('tr') : null;
      if (cardRow) {
        cardRow.classList.add('card-glow-active');
        setTimeout(() => cardRow.classList.remove('card-glow-active'), 1200);
      }

      // 3. Mutual High-Five Overlay when both friends complete this habit
      if (isNowMutual) {
        showHighFiveBanner(getActivityTitle(actId));
        fireConfetti(false);
        speakReferee(`WHISTLE BLOWN! 🎺 Mutual goal on "${getActivityTitle(actId)}"! High five! 🤝`, true, 4500);
      } else {
        const whoScored = userKey === 'u1' ? appData.profiles.u1.name : appData.profiles.u2.name;
        const otherFriend = userKey === 'u1' ? appData.profiles.u2.name : appData.profiles.u1.name;
        speakReferee(`Point scored by ${whoScored}! 🚀 Over to you, ${otherFriend}! 🐘`, true, 3800);
      }

      // 4. Grand Confetti Finale if all goals completed today
      if (isDayFullyDoneForBoth(selectedDate)) {
        setTimeout(() => {
          fireConfetti(true);
          speakReferee(`🏆 MATCH WON! Both champions completed 100% today! Flawless victory! 🌟`, true, 5500);
          showToast(`🏆 ALL ACTIVITIES COMPLETED TODAY! Duo Champions! 🌟`, 'success');
        }, 400);
      }
    } else {
      // Unchecked
      speakReferee(`VAR Review! ⚠️ Point revoked for "${getActivityTitle(actId)}". Stay disciplined! 🧐`, true, 3200);
    }

    renderAll();
  }

  function fireButtonSparkles(buttonEl, userKey) {
    if (typeof confetti !== 'function' || !buttonEl) return;
    try {
      const rect = buttonEl.getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;

      confetti({
        particleCount: 28,
        spread: 60,
        startVelocity: 22,
        origin: { x, y },
        ticks: 65,
        scalar: 0.85,
        colors: userKey === 'u1'
          ? ['#6366f1', '#818cf8', '#a5b4fc', '#ffffff', '#fbbf24']
          : ['#06b6d4', '#22d3ee', '#67e8f9', '#ffffff', '#10b981']
      });
    } catch (e) {}
  }

  const XP_MESSAGES = [
    '+10 XP! 🔥',
    'Crushed it! ⚡',
    'Boom! 💥',
    'Awesome! 🌟',
    'Keep it up! 🚀',
    'Level up! 🏆',
    'Streak on! ✨'
  ];

  function spawnFloatingXp(buttonEl) {
    if (!buttonEl) return;
    try {
      const rect = buttonEl.getBoundingClientRect();
      const xpEl = document.createElement('div');
      xpEl.className = 'floating-xp';
      const randomText = XP_MESSAGES[Math.floor(Math.random() * XP_MESSAGES.length)];
      xpEl.textContent = randomText;

      xpEl.style.left = `${rect.left + rect.width / 2}px`;
      xpEl.style.top = `${rect.top}px`;

      document.body.appendChild(xpEl);
      setTimeout(() => xpEl.remove(), 1150);
    } catch (e) {}
  }

  function showHighFiveBanner(activityTitle) {
    const { u1, u2 } = appData.profiles;
    const existing = document.querySelector('.highfive-overlay');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.className = 'highfive-overlay';
    banner.innerHTML = `
      <span class="highfive-emoji">🤝</span>
      <div class="highfive-title">DUO HIGH-FIVE!</div>
      <div class="highfive-sub"><strong>${escapeHtml(u1.name)}</strong> & <strong>${escapeHtml(u2.name)}</strong> completed "${escapeHtml(activityTitle)}"!</div>
    `;

    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 2100);
  }

  function getActivityTitle(actId) {
    const act = appData.activities.find(a => a.id === actId);
    return act ? act.title : 'Activity';
  }

  // --- CONFETTI CELEBRATION ---
  function fireConfetti(isGrand = false) {
    if (typeof confetti === 'function') {
      if (isGrand) {
        const count = 200;
        const defaults = { origin: { y: 0.7 } };

        function fire(particleRatio, opts) {
          confetti(Object.assign({}, defaults, opts, {
            particleCount: Math.floor(count * particleRatio)
          }));
        }

        fire(0.25, { spread: 26, startVelocity: 55 });
        fire(0.2, { spread: 60 });
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
        fire(0.1, { spread: 120, startVelocity: 45 });
      } else {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 }
        });
      }
    }
  }

  // --- MOTIVATIONAL NUDGES ---
  const NUDGES = [
    "Teamwork makes the dream work! Let's get today's list done. ⚡",
    "Consistency beats talent every single time. Keep showing up! 🚀",
    "Accountability partners who build together, win together! 🤝",
    "Don't break the streak! One tick at a time. 🔥",
    "Small daily improvements over time lead to stunning results! 🌱",
    "High-fives waiting on the other side of these checkmarks! ✋"
  ];

  function rollRandomNudge() {
    const { u2 } = appData.profiles;
    const randomTemplate = NUDGES[Math.floor(Math.random() * NUDGES.length)];
    nudgeText.textContent = randomTemplate;

    const shareMessage = `Hey ${u2.name}! 👋 Just checking in on our DuoTrack daily activities! Let's crush today's streak together! 🔥 Check here: ${window.location.href}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareMessage).then(() => {
        showToast(`Copied WhatsApp/SMS nudge link for ${u2.name}! 📋`, 'info');
      }).catch(() => {
        showToast(randomTemplate, 'info');
      });
    } else {
      showToast(randomTemplate, 'info');
    }
  }

  // --- EVENT BINDINGS ---
  function bindEvents() {
    themeToggleBtn.addEventListener('click', toggleTheme);

    prevDayBtn.addEventListener('click', () => shiftDate(-1));
    nextDayBtn.addEventListener('click', () => shiftDate(1));
    todayBtn.addEventListener('click', () => {
      selectedDate = getTodayDateString();
      renderAll();
    });

    datePickerInput.addEventListener('change', (e) => {
      if (e.target.value) {
        selectedDate = e.target.value;
        renderAll();
      }
    });

    document.querySelectorAll('.segment-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.segment-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentView = e.target.dataset.view;
        renderActivitiesTable();
      });
    });

    activityTableBody.addEventListener('click', (e) => {
      const checkBtn = e.target.closest('.check-toggle-btn');
      if (checkBtn) {
        const actId = checkBtn.dataset.actId;
        const userKey = checkBtn.dataset.user;
        handleToggleCheck(actId, userKey, checkBtn);
        return;
      }

      const editBtn = e.target.closest('.btn-icon-small.edit');
      if (editBtn) {
        const actId = editBtn.dataset.actId;
        openEditActivityModal(actId);
        return;
      }

      const deleteBtn = e.target.closest('.btn-icon-small.delete');
      if (deleteBtn) {
        const actId = deleteBtn.dataset.actId;
        deleteActivity(actId);
        return;
      }
    });

    addActivityBtn.addEventListener('click', () => openAddActivityModal());
    emptyAddBtn.addEventListener('click', () => openAddActivityModal());

    profileSettingsBtn.addEventListener('click', () => openProfileModal());
    backupModalBtn.addEventListener('click', () => openBackupModal());

    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modalId = e.currentTarget.getAttribute('data-close');
        closeModal(modalId);
      });
    });

    [activityModal, profileModal, backupModal].forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal(modal.id);
        }
      });
    });

    activityForm.addEventListener('submit', handleActivityFormSubmit);
    profileForm.addEventListener('submit', handleProfileFormSubmit);

    exportDataBtn.addEventListener('click', exportData);
    triggerImportBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', handleImportFile);
    resetDataBtn.addEventListener('click', handleResetData);

    randomNudgeBtn.addEventListener('click', rollRandomNudge);

    // Referee Elephant Mascot Interactivity
    if (refereeWidget) {
      refereeWidget.addEventListener('click', (e) => {
        e.stopPropagation();
        handleRefereeClick();
      });
    }

    if (refereeBubble) {
      refereeBubble.addEventListener('click', (e) => {
        e.stopPropagation();
        refereeBubble.classList.add('bubble-hidden');
      });
    }
  }

  // --- ACTIVITY CRUD ---
  function openAddActivityModal() {
    isEditingModalOpen = true;
    activityModalTitle.textContent = 'Add New Activity';
    activityIdInput.value = '';
    actTitleInput.value = '';
    actCategoryInput.value = 'fitness';
    actIconInput.value = '⚡';
    actDescInput.value = '';

    openModal('activityModal');
    actTitleInput.focus();
  }

  function openEditActivityModal(actId) {
    const act = appData.activities.find(a => a.id === actId);
    if (!act) return;

    isEditingModalOpen = true;
    activityModalTitle.textContent = 'Edit Activity';
    activityIdInput.value = act.id;
    actTitleInput.value = act.title;
    actCategoryInput.value = act.category || 'other';
    actIconInput.value = act.icon || '📌';
    actDescInput.value = act.desc || '';

    openModal('activityModal');
    actTitleInput.focus();
  }

  function handleActivityFormSubmit(e) {
    e.preventDefault();
    const id = activityIdInput.value.trim();
    const title = actTitleInput.value.trim();
    const category = actCategoryInput.value;
    const icon = actIconInput.value.trim() || '📌';
    const desc = actDescInput.value.trim();

    if (!title) return;

    if (id) {
      const index = appData.activities.findIndex(a => a.id === id);
      if (index !== -1) {
        appData.activities[index].title = title;
        appData.activities[index].category = category;
        appData.activities[index].icon = icon;
        appData.activities[index].desc = desc;
        showToast('Activity updated! ✏️', 'success');
      }
    } else {
      const newAct = {
        id: 'act_' + Date.now(),
        title,
        category,
        icon,
        desc,
        createdAt: getTodayDateString()
      };
      appData.activities.push(newAct);
      showToast('New activity added! 🎯', 'success');
    }

    saveData();
    closeModal('activityModal');
    renderAll();
  }

  function deleteActivity(actId) {
    const act = appData.activities.find(a => a.id === actId);
    if (!act) return;

    if (confirm(`Are you sure you want to delete "${act.title}"?`)) {
      appData.activities = appData.activities.filter(a => a.id !== actId);
      Object.keys(appData.checkins).forEach(date => {
        if (appData.checkins[date][actId]) {
          delete appData.checkins[date][actId];
        }
      });
      saveData();
      renderAll();
      showToast('Activity removed', 'info');
    }
  }

  // --- PROFILE MODAL & LOGIC ---
  function openProfileModal() {
    isEditingModalOpen = true;
    u1NameInput.value = appData.profiles.u1.name;
    u1AvatarInput.value = appData.profiles.u1.avatar;
    u2NameInput.value = appData.profiles.u2.name;
    u2AvatarInput.value = appData.profiles.u2.avatar;
    openModal('profileModal');
  }

  function handleProfileFormSubmit(e) {
    e.preventDefault();
    appData.profiles.u1.name = u1NameInput.value.trim() || 'You';
    appData.profiles.u1.avatar = u1AvatarInput.value.trim() || '🚀';
    appData.profiles.u2.name = u2NameInput.value.trim() || 'Friend';
    appData.profiles.u2.avatar = u2AvatarInput.value.trim() || '🎯';

    saveData();
    closeModal('profileModal');
    renderAll();
    showToast('Profiles updated successfully! 👥', 'success');
  }

  // --- BACKUP & RESTORE ---
  function openBackupModal() {
    isEditingModalOpen = true;
    openModal('backupModal');
  }

  function exportData() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(appData, null, 2));
    const downloadAnchor = document.createElement('a');
    const filename = `duotrack_backup_${getTodayDateString()}.json`;
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Backup downloaded! 💾', 'success');
  }

  function handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!parsed.profiles || !parsed.activities) {
          throw new Error('Invalid format: missing required fields');
        }
        appData = parsed;
        saveData();
        renderAll();
        closeModal('backupModal');
        showToast('Data successfully imported and restored! 📥', 'success');
      } catch (err) {
        alert('Failed to import file. Please make sure it is a valid DuoTrack JSON export file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleResetData() {
    if (confirm('Are you sure you want to reset to initial sample activities? This will clear existing logs.')) {
      appData = JSON.parse(JSON.stringify(DEFAULT_DATA));
      saveData();
      renderAll();
      closeModal('backupModal');
      showToast('Reset to default sample activities', 'info');
    }
  }

  function updateStorageInfo() {
    try {
      const bytes = new Blob([localStorage.getItem(STORAGE_KEY) || '']).size;
      const kb = (bytes / 1024).toFixed(1);
      document.getElementById('storageSize').textContent = isServerMode 
        ? `Cloud & Local Synced (${kb} KB)`
        : `Local Storage (${kb} KB)`;
    } catch (e) {
      document.getElementById('storageSize').textContent = 'Storage synced';
    }
  }

  // --- MODAL UTILS ---
  function openModal(id) {
    document.getElementById(id).classList.remove('hidden');
  }

  function closeModal(id) {
    isEditingModalOpen = false;
    document.getElementById(id).classList.add('hidden');
  }

  // --- TOAST NOTIFICATIONS ---
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // --- SECURITY / ESCAPE ---
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Bootstrap
  init();
})();
