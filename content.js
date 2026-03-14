/* ── content.js – Navigation + Quiz logic for content pages ── */

// ─── Parse file ID from current URL ───────────────────────────
// Expects filename like: 1.1.03.html → [subject, subsection, topic]
function parseCurrentFile() {
  const path = location.pathname.split('/').pop().replace('.html', '');
  const parts = path.split('.');
  if (parts.length !== 3) return null;
  return {
    subject:    parseInt(parts[0]),
    subsection: parseInt(parts[1]),
    topic:      parseInt(parts[2]),
    raw:        path,
    full:       `${parts[0]}.${parts[1]}.${String(parts[2]).padStart(2,'0')}`
  };
}

// ─── Build file path ───────────────────────────────────────────
function filePath(subject, subsection, topic) {
  return `${subject}.${subsection}.${String(topic).padStart(2,'0')}.html`;
}

// ─── Check if a sibling file exists ───────────────────────────
async function fileExists(name) {
  try {
    const res = await fetch(name, { method: 'HEAD' });
    return res.ok;
  } catch { return false; }
}

// ─── Navigation ───────────────────────────────────────────────
async function initContentNav() {
  const current = parseCurrentFile();
  if (!current) return;

  const prevBtn = document.getElementById('nav-prev');
  const nextBtn = document.getElementById('nav-next');
  const progressFill = document.getElementById('content-progress-fill');

  // Try same subsection prev/next first, then wrap to next/prev subsection
  async function getPrev() {
    if (current.topic > 1) {
      return filePath(current.subject, current.subsection, current.topic - 1);
    }
    if (current.subsection > 1) {
      // Find last topic of previous subsection
      for (let t = 30; t >= 1; t--) {
        const f = filePath(current.subject, current.subsection - 1, t);
        if (await fileExists(f)) return f;
      }
    }
    return null;
  }

  async function getNext() {
    const f = filePath(current.subject, current.subsection, current.topic + 1);
    if (await fileExists(f)) return f;
    // Try next subsection topic 1
    const f2 = filePath(current.subject, current.subsection + 1, 1);
    if (await fileExists(f2)) return f2;
    return null;
  }

  const [prevFile, nextFile] = await Promise.all([getPrev(), getNext()]);

  if (prevBtn) {
    if (prevFile) {
      prevBtn.href = prevFile;
      prevBtn.classList.remove('disabled');
    } else {
      prevBtn.classList.add('disabled');
    }
  }
  if (nextBtn) {
    if (nextFile) {
      nextBtn.href = nextFile;
      nextBtn.classList.remove('disabled');
    } else {
      nextBtn.classList.add('disabled');
    }
  }

  // Progress estimate (rough: topic / 20 within subsection)
  if (progressFill) {
    const pct = Math.min(100, (current.topic / 20) * 100);
    progressFill.style.width = pct + '%';
  }
}

// ─── Mark as done ─────────────────────────────────────────────
function initMarkDone() {
  const btn = document.getElementById('btn-mark-done');
  const current = parseCurrentFile();
  if (!btn || !current) return;

  const id = current.full;
  if (window.SSC?.Progress?.isDone(id)) {
    btn.textContent = '✓ Completed';
    btn.disabled = true;
    btn.style.opacity = '0.5';
  }

  btn.addEventListener('click', () => {
    window.SSC?.Progress?.markDone(id);
    btn.textContent = '✓ Completed';
    btn.disabled = true;
    btn.style.opacity = '0.5';
  });
}

// ─── Quiz Engine ──────────────────────────────────────────────
function initQuiz(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const questions = container.querySelectorAll('.question');
  const submitBtn = container.querySelector('.quiz-submit');
  const resultEl  = container.querySelector('.quiz-result');

  let submitted = false;

  questions.forEach(q => {
    q.querySelectorAll('.option').forEach((opt, idx) => {
      opt.addEventListener('click', () => {
        if (submitted) return;
        q.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
      });
    });
  });

  submitBtn?.addEventListener('click', () => {
    if (submitted) return;
    submitted = true;

    let correct = 0, total = questions.length;
    questions.forEach(q => {
      const selected = q.querySelector('.option.selected');
      const answer   = q.dataset.answer; // e.g. "b"
      q.querySelectorAll('.option').forEach((opt, idx) => {
        const letter = opt.dataset.value;
        if (letter === answer) opt.classList.add('correct');
        if (selected === opt && letter !== answer) opt.classList.add('wrong');
      });
      if (selected && selected.dataset.value === answer) correct++;
    });

    if (resultEl) {
      const pct = Math.round(correct / total * 100);
      const color = pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--amber)' : 'var(--red)';
      resultEl.innerHTML = `<span style="color:${color};font-weight:600">
        ${correct}/${total} correct (${pct}%)
      </span> ${pct >= 70 ? '🎉 Great job!' : pct >= 40 ? 'Keep practising!' : 'Review the material and try again.'}`;
    }
    submitBtn.textContent = 'Submitted';
    submitBtn.disabled = true;
  });
}

// ─── Boot ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initContentNav();
  initMarkDone();
  // Auto-init any quiz sections
  document.querySelectorAll('[data-quiz]').forEach(el => initQuiz(el.id));
});
