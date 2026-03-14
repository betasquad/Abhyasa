# SSC CGL Hub

A complete, GitHub Pages–hosted study website for SSC CGL aspirants.

---

## 📁 Folder Structure

```
ssc-cgl/
├── index.html               ← Homepage (dashboard + subjects)
├── settings.html            ← User settings page
├── assets/
│   ├── css/
│   │   └── style.css        ← All shared styles
│   └── js/
│       ├── app.js           ← Auth, dashboard, heatmap, progress logic
│       └── content.js       ← Prev/Next nav + Quiz engine for content pages
└── content/
    ├── 1.1.01.html          ← English Comprehension > Grammar > Topic 1
    ├── 1.1.02.html          ← English Comprehension > Grammar > Topic 2
    ├── 1.2.01.html          ← English Comprehension > Vocabulary > Topic 1
    ├── 2.1.01.html          ← Quantitative Aptitude > Arithmetic > Topic 1
    │   ...
    └── 5.4.01.html          ← Computer Knowledge > Cyber Security > Topic 1
```

---

## 🔢 Naming Convention

Content HTML files follow: `[Subject].[Subsection].[Topic].html`

| Subject ID | Subject |
|------------|---------|
| 1 | English Comprehension |
| 2 | Quantitative Aptitude |
| 3 | General Awareness |
| 4 | General Intelligence & Reasoning |
| 5 | Computer Knowledge / Proficiency |

**Subsection IDs** (per subject, in order):

| Subject | Sub-1 | Sub-2 | Sub-3 | Sub-4 | Sub-5 | Sub-6 |
|---------|-------|-------|-------|-------|-------|-------|
| English (1) | Grammar | Vocabulary | _(add later)_ | | | |
| Quant (2) | Arithmetic | Algebra | Geometry | Data Interpretation | | |
| GK (3) | Current Affairs | History | Geography | Polity | Economics | Science |
| Reasoning (4) | Verbal | Non-Verbal | Logical Deduction | | | |
| Computer (5) | Fundamentals | MS Office | Internet & Networks | Cyber Security | | |

**Example:** `1.1.03.html` = English Comprehension > Grammar > Topic 3

**Topic numbers** are zero-padded to 2 digits: `01`, `02`, ... `09`, `10`, `11`, ...

---

## 📄 Creating a New Content Page

1. Copy `content/1.1.01.html` as a template.
2. Rename it following the naming convention (e.g., `content/1.2.01.html`).
3. Update:
   - `<title>` tag
   - Breadcrumb links and text
   - `.badge` labels (subject, subsection)
   - `<h1>` and description
   - `<iframe src>` — paste your YouTube embed URL
   - Content body (text, tables, highlight boxes)
   - Quiz questions — set `data-answer="a/b/c/d"` on `.question` and `data-value="a/b/c/d"` on each `.option`
4. The Prev/Next buttons auto-detect neighbours via `fetch` HEAD requests — **no manual linking needed**.

---

## 🎯 Adding Quiz Questions

```html
<div class="quiz-section" id="quiz1" data-quiz>
  <div class="quiz-header">📝 Practice Quiz – Topic Name</div>

  <div class="question" data-answer="b">   <!-- correct answer: b -->
    <div class="question-text">1. Question text here?</div>
    <div class="options">
      <div class="option" data-value="a"><span class="option-letter">A</span> Option A</div>
      <div class="option" data-value="b"><span class="option-letter">B</span> Option B (correct)</div>
      <div class="option" data-value="c"><span class="option-letter">C</span> Option C</div>
      <div class="option" data-value="d"><span class="option-letter">D</span> Option D</div>
    </div>
  </div>

  <button class="quiz-submit">Submit Answers</button>
  <div class="quiz-result"></div>
</div>
```

---

## 📢 Updating "What's New!"

Edit the `NEWS` array in `index.html` (near the bottom `<script>` block):

```js
const NEWS = [
  { type: 'new',   title: 'New topic added: ...',         date: '2025-06-15' },
  { type: 'quiz',  title: '📝 Quiz coming up on June 20', date: '2025-06-12' },
  { type: 'notif', title: 'Official notification: ...',   date: '2025-06-10' },
];
```

Types: `new` (green border), `quiz` (blue border), `notif` (amber border)

---

## 🚀 Deploy to GitHub Pages

1. Push this folder to a GitHub repository (e.g., `ssc-cgl`).
2. Go to **Settings → Pages**.
3. Set source to **main branch / root**.
4. Your site will be live at `https://yourusername.github.io/ssc-cgl/`.

---

## 💾 Data Storage

All user data (auth, progress, study time, exam date) is stored in **localStorage** — no backend required. Data lives in the user's browser.

---

## 🎨 Customisation

All colors are CSS variables in `assets/css/style.css`:

```css
--amber: #f0a500;   /* Primary accent */
--green: #3fb950;   /* Success / activity */
--blue:  #58a6ff;   /* Info */
--bg:    #0d1117;   /* Page background */
```
