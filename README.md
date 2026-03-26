# Abhyasa SSC — StudyDesk

Single-file offline study desk for SSC CGL. No server, no install — open `index.html` in Chrome or Edge.

## Structure
```
abhyasa-ssc/
├── index.html
├── css/style.css
├── js/
│   ├── utils.js      ← shared constants & helpers
│   ├── planner.js    ← Your Progress / daily tracker
│   └── app.js        ← core study view logic
├── README.md
├── .gitignore
└── subjects/         ← your local files (gitignored)
    ├── reasoning/
    ├── mathematics/
    ├── general/
    ├── english/
    └── computer/
```

## Requirements
**Chrome or Edge (desktop) only** — uses File System Access API.

## HTML study files
Must be fully self-contained (inline CSS/JS or CDN). Relative asset paths won't resolve inside the sandboxed iframe.

## Contact Us setup
1. Create a free form at [formspree.io](https://formspree.io)
2. Replace `YOUR_FORM_ID` in `index.html` with your form ID

## Excel schedule format
| date | general/ga | english/eng | reason/rsn | math | computer/comp |
|------|-----------|-------------|------------|------|---------------|
| 2025-06-01 | Polity Ch.3 | Reading | Syllogism | Algebra | MS Office |

## Data storage
All progress is in browser `localStorage` + `IndexedDB`. Nothing leaves your device except Contact Us submissions.
