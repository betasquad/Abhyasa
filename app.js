'use strict';
/* ════════════════════════════════════════════════════════
   APP — core logic
   Depends on: utils.js, planner.js
════════════════════════════════════════════════════════ */

/* ── IndexedDB (folder handles) ── */
const DBN = 'abhyasa_v1', DST = 'fh';
function odb(){ return new Promise((ok,er)=>{ const r=indexedDB.open(DBN,1); r.onupgradeneeded=e=>e.target.result.createObjectStore(DST); r.onsuccess=e=>ok(e.target.result); r.onerror=()=>er(new Error('IndexedDB open failed')); }); }
async function dbs(k,v){ const d=await odb(); return new Promise((ok,er)=>{ const t=d.transaction(DST,'readwrite'); t.objectStore(DST).put(v,k); t.oncomplete=ok; t.onerror=()=>er(new Error('IndexedDB write failed')); }); }
async function dbg(k){ const d=await odb(); return new Promise((ok,er)=>{ const r=d.transaction(DST,'readonly').objectStore(DST).get(k); r.onsuccess=e=>ok(e.target.result||null); r.onerror=()=>er(new Error('IndexedDB read failed')); }); }

/* ── State ── */
let ACT=null, FILES=[], FILT=[], IDX=0, BLOB=null, VTT=null, SORT='name', COLLAPSED={}, BANNER_VISIBLE=false;
let _scanCount=0, _scanLock=false;
const FILE_LIMIT=500;

/* ── Build topic sidebar ── */
(()=>{ ... 

})();

/* ── View switching ── */
function goInfo(){ ... }

function goProgress(){ ... }

function enterStudy(){ ... }

async function swCat(id){ ... }

/* ── File system ── */
async function pickFolder(){ ... }

async function scanDir(dir, chain=[], isRoot=false){ ... }

async function loadH(h){ ... }

/* ── Render file list ── */
function rndr(files){ ... }

function toggleGrp(key){ ... }
function filterFiles(q){ ... }
function applyFilt(q){ ... }
function sortFiles(f){ ... }
function applySort(){ ... }

function jumpUnseen(){ ... }

function pushRecent(cat,file){ ... }

/* ── Open file ── */
async function openF(idx){ ... }

function rfMeta(idx){ ... }
function fmt(s){ ... }
function nav(d){ ... }

function updNav(){ ... }

function updStats(){ ... }

function updBadge(){ ... }

function scrollA(){ ... }

function clrView(){ ... }

function tgDn(e,idx){ ... }

function rvBlob(){ ... }
function clrVT(){ ... }
function toggleSb(){ ... }

/* ── Theme ── */
function toggleTheme(){ ... }
function syncThemePanel(){ ... }
function toggleHeader(){ ... }

/* ── User panel ── */
function toggleUserPanel(){ ... }
function closeUserPanel(){ ... }
function openSettings(){ ... }
function signOut(){ ... }

/* ── Keyboard ── */
let _kT;
document.addEventListener('keydown',e=>{ ... });

/* ════════════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════════════ */
(async()=>{ ... 

})()