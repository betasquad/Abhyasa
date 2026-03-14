/* ── SSC CGL Hub – app.js ── */

// ─── Constants ────────────────────────────────────
const SUBJECTS = [
  { id: 1, name: 'English Comprehension',          icon: '📖', color: '#58a6ff',
    subs: ['Grammar', 'Vocabulary'] },
  { id: 2, name: 'Quantitative Aptitude',           icon: '📐', color: '#f0a500',
    subs: ['Arithmetic', 'Algebra', 'Geometry', 'Data Interpretation'] },
  { id: 3, name: 'General Awareness',               icon: '🌐', color: '#3fb950',
    subs: ['Current Affairs', 'History', 'Geography', 'Polity', 'Economics', 'Science'] },
  { id: 4, name: 'General Intelligence & Reasoning',icon: '🧩', color: '#bc8cff',
    subs: ['Verbal Reasoning', 'Non-Verbal Reasoning', 'Logical Deduction'] },
  { id: 5, name: 'Computer Knowledge',              icon: '💻', color: '#79c0ff',
    subs: ['Fundamentals', 'MS Office', 'Internet & Networks', 'Cyber Security'] },
];

// ─── Auth ──────────────────────────────────────────
const Auth = {
  isLoggedIn() { return !!localStorage.getItem('ssc_user'); },
  getUser()    { try { return JSON.parse(localStorage.getItem('ssc_user')); } catch { return null; } },
  login(name, email) {
    localStorage.setItem('ssc_user', JSON.stringify({ name, email, joinedAt: Date.now() }));
    document.body.classList.add('authenticated');
    this.applyUser();
  },
  logout() {
    localStorage.removeItem('ssc_user');
    document.body.classList.remove('authenticated');
    location.reload();
  },
  applyUser() {
    const user = this.getUser(); if (!user) return;
    const initials = user.name.trim().split(' ').map(w => w[0]).join('').substring(0,2).toUpperCase();
    document.querySelectorAll('.avatar').forEach(el => el.textContent = initials);
    document.querySelectorAll('.user-label').forEach(el => el.textContent = user.name);
    document.querySelectorAll('.dropdown-name').forEach(el => el.textContent = user.name);
    document.querySelectorAll('.dropdown-email').forEach(el => el.textContent = user.email);
  }
};

// ─── Study Time ────────────────────────────────────
const StudyTimer = {
  key: 'ssc_study_sessions',
  todayKey() { return new Date().toISOString().slice(0,10); },
  getAll()   { try { return JSON.parse(localStorage.getItem(this.key)) || {}; } catch { return {}; } },
  addMinutes(mins) {
    const all = this.getAll();
    const k = this.todayKey();
    all[k] = (all[k] || 0) + mins;
    localStorage.setItem(this.key, JSON.stringify(all));
  },
  getToday()  { return this.getAll()[this.todayKey()] || 0; },
  getTotal()  { return Object.values(this.getAll()).reduce((a,b)=>a+b,0); },
  getStreak() {
    const all = this.getAll();
    let streak = 0, d = new Date();
    while (true) {
      const k = d.toISOString().slice(0,10);
      if (!all[k]) break;
      streak++; d.setDate(d.getDate()-1);
    }
    return streak;
  }
};

// ─── Progress ──────────────────────────────────────
const Progress = {
  key: 'ssc_progress',
  get()  { try { return JSON.parse(localStorage.getItem(this.key)) || {}; } catch { return {}; } },
  markDone(fileId) {
    const p = this.get(); p[fileId] = Date.now();
    localStorage.setItem(this.key, JSON.stringify(p));
    StudyTimer.addMinutes(12); // avg 12 min per topic
  },
  isDone(fileId) { return !!this.get()[fileId]; },
  subjectPct(subjectId) {
    // count done topics for this subject
    const p = this.get();
    const keys = Object.keys(p).filter(k => k.startsWith(subjectId+'.'));
    const total = this._totalTopics(subjectId);
    return total ? Math.round(keys.length / total * 100) : 0;
  },
  _totalTopics(subjectId) {
    // Read from localStorage topics map, fallback to 10 per subject
    try {
      const map = JSON.parse(localStorage.getItem('ssc_topic_counts')) || {};
      return map[subjectId] || 10;
    } catch { return 10; }
  },
  getNextTopic(subjectId) {
    const p = this.get();
    const sub = SUBJECTS.find(s=>s.id===subjectId);
    if (!sub) return null;
    // Try subsections in order
    for (let si = 1; si <= sub.subs.length; si++) {
      for (let t = 1; t <= 20; t++) {
        const id = `${subjectId}.${si}.${String(t).padStart(2,'0')}`;
        if (!p[id]) return { id, subject: sub.name, subsection: sub.subs[si-1], topic: t };
      }
    }
    return null;
  }
};

// ─── Exam Goal ─────────────────────────────────────
const ExamGoal = {
  key: 'ssc_exam_date',
  get()  { return localStorage.getItem(this.key); },
  set(d) { localStorage.setItem(this.key, d); },
  daysLeft() {
    const d = this.get(); if (!d) return null;
    const diff = new Date(d) - new Date();
    return Math.max(0, Math.ceil(diff / 86400000));
  }
};

// ─── Heatmap ───────────────────────────────────────
function buildHeatmap(container) {
  const sessions = StudyTimer.getAll();
  const today = new Date();
  const WEEKS = 52;
  const grid = document.createElement('div');
  grid.className = 'heatmap-grid';

  // Find starting Sunday
  const start = new Date(today);
  start.setDate(today.getDate() - (WEEKS * 7) + 1);
  // rewind to Sunday
  start.setDate(start.getDate() - start.getDay());

  for (let w = 0; w < WEEKS; w++) {
    const col = document.createElement('div');
    col.className = 'heatmap-col';
    for (let d = 0; d < 7; d++) {
      const date = new Date(start);
      date.setDate(start.getDate() + w*7 + d);
      const key = date.toISOString().slice(0,10);
      const mins = sessions[key] || 0;
      const level = mins === 0 ? 0 : mins < 30 ? 1 : mins < 60 ? 2 : mins < 120 ? 3 : 4;
      const cell = document.createElement('div');
      cell.className = 'heatmap-cell';
      if (level) cell.dataset.level = level;
      cell.title = `${key}: ${mins} min`;
      col.appendChild(cell);
    }
    grid.appendChild(col);
  }
  container.innerHTML = '';
  container.appendChild(grid);
}

// ─── Countdown ─────────────────────────────────────
function updateCountdown() {
  const days = ExamGoal.daysLeft();
  if (days === null) return;
  const d = document.getElementById('cd-days');
  const h = document.getElementById('cd-hours');
  const m = document.getElementById('cd-mins');
  const s = document.getElementById('cd-secs');
  function tick() {
    const target = new Date(ExamGoal.get()).getTime();
    const now = Date.now();
    const diff = Math.max(0, target - now);
    const td = Math.floor(diff / 86400000);
    const th = Math.floor((diff % 86400000) / 3600000);
    const tm = Math.floor((diff % 3600000) / 60000);
    const ts = Math.floor((diff % 60000) / 1000);
    if (d) d.textContent = String(td).padStart(2,'0');
    if (h) h.textContent = String(th).padStart(2,'0');
    if (m) m.textContent = String(tm).padStart(2,'0');
    if (s) s.textContent = String(ts).padStart(2,'0');
  }
  tick(); setInterval(tick, 1000);
}

// ─── User Dropdown ─────────────────────────────────
function initDropdown() {
  document.querySelectorAll('.user-menu').forEach(menu => {
    const trigger = menu.querySelector('.avatar, .user-trigger');
    if (!trigger) return;
    trigger.addEventListener('click', e => {
      e.stopPropagation();
      menu.classList.toggle('open');
    });
  });
  document.addEventListener('click', () => {
    document.querySelectorAll('.user-menu.open').forEach(m => m.classList.remove('open'));
  });
  document.querySelectorAll('[data-action=signout]').forEach(btn => {
    btn.addEventListener('click', () => Auth.logout());
  });
  document.querySelectorAll('[data-action=settings]').forEach(btn => {
    btn.addEventListener('click', () => location.href = 'settings.html');
  });
}

// ─── Auth Modal ────────────────────────────────────
function initAuthModal() {
  const overlay = document.getElementById('authModal');
  const loginForm = document.getElementById('loginForm');
  const regForm   = document.getElementById('regForm');

  document.querySelectorAll('[data-open-auth]').forEach(btn => {
    btn.addEventListener('click', () => overlay?.classList.add('open'));
  });
  document.querySelectorAll('[data-close-auth]').forEach(btn => {
    btn.addEventListener('click', () => overlay?.classList.remove('open'));
  });
  overlay?.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });

  loginForm?.addEventListener('submit', e => {
    e.preventDefault();
    const name  = document.getElementById('loginName').value.trim();
    const email = document.getElementById('loginEmail').value.trim();
    if (name && email) { Auth.login(name, email); overlay.classList.remove('open'); initDashboard(); }
  });

  document.getElementById('switchToReg')?.addEventListener('click', e => {
    e.preventDefault();
    loginForm.style.display = 'none';
    regForm.style.display   = 'block';
  });
  document.getElementById('switchToLogin')?.addEventListener('click', e => {
    e.preventDefault();
    regForm.style.display   = 'none';
    loginForm.style.display = 'block';
  });
}

// ─── Dashboard Init ────────────────────────────────
function initDashboard() {
  if (!Auth.isLoggedIn()) return;

  // Stats
  const todayEl  = document.getElementById('stat-today');
  const streakEl = document.getElementById('stat-streak');
  const totalEl  = document.getElementById('stat-total');
  if (todayEl)  todayEl.textContent  = StudyTimer.getToday() + 'm';
  if (streakEl) streakEl.textContent = StudyTimer.getStreak() + ' days';
  if (totalEl)  totalEl.textContent  = Math.round(StudyTimer.getTotal()/60) + 'h';

  // Next topics
  const container = document.getElementById('next-topics-list');
  if (container) {
    container.innerHTML = '';
    SUBJECTS.forEach(s => {
      const next = Progress.getNextTopic(s.id);
      if (!next) return;
      const file = `${next.id}.html`;
      const a = document.createElement('a');
      a.className = 'topic-item';
      a.href = `content/${file}`;
      a.innerHTML = `
        <div class="topic-icon" style="background:${s.color}22;color:${s.color}">${s.icon}</div>
        <div class="topic-meta">
          <div class="topic-name">${next.subsection} – Topic ${next.topic}</div>
          <div class="topic-sub">${s.name}</div>
        </div>
        <svg class="topic-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
      container.appendChild(a);
    });
  }

  // Progress bars
  const barsContainer = document.getElementById('progress-bars');
  if (barsContainer) {
    barsContainer.innerHTML = '';
    SUBJECTS.forEach(s => {
      const pct = Progress.subjectPct(s.id);
      barsContainer.innerHTML += `
        <div class="progress-wrap">
          <div class="progress-row">
            <span class="progress-label">${s.icon} ${s.name.replace(' & ', ' &amp; ')}</span>
            <span class="progress-pct">${pct}%</span>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
        </div>`;
    });
  }

  // Heatmap
  const heatEl = document.getElementById('heatmap-grid');
  if (heatEl) buildHeatmap(heatEl);

  // Exam goal
  const examInput = document.getElementById('examDateInput');
  const saved = ExamGoal.get();
  if (examInput && saved) { examInput.value = saved; updateCountdown(); }
  document.getElementById('examDateForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const val = examInput?.value;
    if (val) { ExamGoal.set(val); updateCountdown(); }
  });
}

// ─── Subject Cards (logged-out view) ───────────────
function buildSubjectCards() {
  const grid = document.getElementById('subjects-grid');
  if (!grid) return;
  grid.innerHTML = '';
  SUBJECTS.forEach(s => {
    const div = document.createElement('a');
    div.className = 'subject-card fade-up';
    div.href = `content/${s.id}.1.01.html`;
    div.innerHTML = `
      <div class="subject-icon">${s.icon}</div>
      <div class="subject-title">${s.name}</div>
      <div class="subject-count">${s.subs.length} subsections</div>
      <div class="subject-subs">${s.subs.map(sub=>`<span class="sub-chip">${sub}</span>`).join('')}</div>`;
    grid.appendChild(div);
  });
}

// ─── Page Init ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Apply auth state
  if (Auth.isLoggedIn()) {
    document.body.classList.add('authenticated');
    Auth.applyUser();
  }
  initDropdown();
  initAuthModal();
  buildSubjectCards();
  if (Auth.isLoggedIn()) initDashboard();
});

// Export for use in content pages
window.SSC = { Auth, Progress, StudyTimer, ExamGoal, SUBJECTS };
