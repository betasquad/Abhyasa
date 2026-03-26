'use strict';
/* ════════════════════════════════════════════════════════
   APP — core logic
   Depends on: utils.js, planner.js
════════════════════════════════════════════════════════ */

/* ── IndexedDB (folder handles) ── */
const DBN = 'abhyasa_v1', DST = 'fh';
function odb(){ return new Promise((ok,er)=>{ const r=indexedDB.open(DBN,1); r.onupgradeneeded=e=>e.target.result.createObjectStore(DST); r.onsuccess=e=>ok(e.target.result); r.onerror=er; }); }
async function dbs(k,v){ const d=await odb(); return new Promise((ok,er)=>{ const t=d.transaction(DST,'readwrite'); t.objectStore(DST).put(v,k); t.oncomplete=ok; t.onerror=er; }); }
async function dbg(k){ const d=await odb(); return new Promise(ok=>{ const r=d.transaction(DST,'readonly').objectStore(DST).get(k); r.onsuccess=e=>ok(e.target.result||null); r.onerror=()=>ok(null); }); }

/* ── State ── */
let ACT=null, FILES=[], FILT=[], IDX=0, BLOB=null, VTT=null, SORT='name', COLLAPSED={}, BANNER_VISIBLE=false;
let _scanCount=0;
const FILE_LIMIT=500;

/* ── Build topic sidebar ── */
(()=>{
  const tb  = document.getElementById('topicBar');
  const uw  = document.querySelector('.tsb-user-wrap');

  // Section label above subjects
  const lbl = document.createElement('div');
  lbl.className = 'tsb-section-lbl';
  lbl.textContent = 'Subjects';
  tb.insertBefore(lbl, uw);

  CATS.forEach(c=>{
    const b = document.createElement('button');
    b.className = 'tsb-btn';
    b.id = 'tsb_'+c.id;
    b.title = c.label;
    b.innerHTML = `<span class="tsb-ic">${c.icon}</span><span class="tsb-lbl">${c.label}</span><span class="tsb-badge" id="tsbg_${c.id}"></span>`;
    b.onclick = ()=>swCat(c.id);
    tb.insertBefore(b, uw);
  });
})();

/* ── View switching ── */
function goInfo(){
  document.body.classList.remove('view-progress');
  document.body.classList.add('view-info');
  document.getElementById('studyView').classList.remove('active');
  CATS.forEach(c=>document.getElementById('tsb_'+c.id)?.classList.remove('on'));
  document.getElementById('tsb_progress')?.classList.remove('on');
  LS.s('lastView','info');
}

function goProgress(){
  document.body.classList.remove('view-info');
  document.body.classList.add('view-progress');
  document.getElementById('studyView').classList.remove('active');
  CATS.forEach(c=>document.getElementById('tsb_'+c.id)?.classList.remove('on'));
  document.getElementById('tsb_progress')?.classList.add('on');
  LS.s('lastView','progress');
  hmRenderAll();
}

function enterStudy(){
  document.body.classList.remove('view-info','view-progress');
  document.getElementById('studyView').classList.add('active');
  document.getElementById('tsb_progress')?.classList.remove('on');
  LS.s('lastView','study');
}

async function swCat(id){
  // Same subject clicked again → toggle subject banner in bottom nav
  if(ACT===id && !document.body.classList.contains('view-info') && !document.body.classList.contains('view-progress')){
    BANNER_VISIBLE = !BANNER_VISIBLE;
    const vs = document.getElementById('vnSubject');
    if(BANNER_VISIBLE) fadeIn(vs,220); else fadeOut(vs,180);
    return;
  }
  enterStudy();
  ACT=id; FILES=[]; FILT=[]; IDX=0; SORT='name'; rvBlob(); clrVT();
  document.getElementById('sortSel').value='name';
  CATS.forEach(c=>{
    document.getElementById('tsb_'+c.id)?.classList.toggle('on', c.id===id);
  });
  // Update bottom nav subject
  const cat = CATS.find(c=>c.id===id);
  BANNER_VISIBLE = true;
  document.getElementById('vnSubjIcon').textContent = cat?cat.icon:'';
  document.getElementById('vnSubjName').textContent = cat?cat.label:'—';
  const vs = document.getElementById('vnSubject');
  vs.style.display='none'; fadeIn(vs,300);
  LS.s('lcat',id);
  // Also keep compat elements in sync
  if(document.getElementById('subjBannerIcon')) document.getElementById('subjBannerIcon').textContent=cat?cat.icon:'';
  if(document.getElementById('subjBannerName')) document.getElementById('subjBannerName').textContent=cat?cat.label:'';
  rndr([]); clrView(); updStats();
  // Auto-restore stored folder
  const h = await dbg(id);
  if(h){
    try{
      let perm = await h.queryPermission({mode:'read'});
      if(perm!=='granted') perm = await h.requestPermission({mode:'read'});
      if(perm==='granted'){ await loadH(h); return; }
    }catch(e){}
  }
}

/* ── File system ── */
async function pickFolder(){
  if(!ACT){ toast('⚠ Select a subject first','warn'); return; }
  if(!window.showDirectoryPicker){ alert('Use Chrome or Edge desktop.'); return; }
  try{
    const h = await window.showDirectoryPicker({mode:'read'});
    await dbs(ACT,h);
    await loadH(h);
  }catch(e){ if(e.name!=='AbortError') console.error(e); }
}

async function scanDir(dir, chain=[], isRoot=false){
  if(isRoot) _scanCount=0;
  const out=[];
  try{
    for await(const e of dir.values()){
      if(_scanCount >= FILE_LIMIT){ toast(`⚠ Folder capped at ${FILE_LIMIT} files`,'warn'); break; }
      if(e.kind==='file' && MEDIA.test(e.name)){
        out.push({handle:e, name:e.name, path:chain.length?chain.join(' › '):'', ext:e.name.split('.').pop().toLowerCase(), folder:chain[chain.length-1]||dir.name});
        _scanCount++;
      } else if(e.kind==='directory'){
        out.push(...await scanDir(e, [...chain,e.name]));
      }
    }
  }catch(e){ console.warn(e); }
  return out;
}

async function loadH(h){
  document.getElementById('fl').innerHTML='<div class="nof">⏳ Scanning files…</div>';
  let files = await scanDir(h,[h.name],true);
  files.sort((a,b)=>(a.path+'/'+a.name).localeCompare(b.path+'/'+b.name,undefined,{numeric:true,sensitivity:'base'}));
  FILES=files; FILT=[...files];
  const sv=LS.g('idx_'+ACT,0);
  IDX=Math.min(Math.max(0,sv), Math.max(0,files.length-1));
  applyFilt(); updStats();
  if(files.length) openF(IDX);
}

/* ── Render file list ── */
function rndr(files){
  const fl = document.getElementById('fl');
  if(!files.length){
    const cat = CATS.find(c=>c.id===ACT);
    fl.innerHTML = FILES.length
      ? `<div class="nof"><strong>No matches</strong>Try a different search or filter.</div>`
      : `<div class="cf-wrap">
           <div class="cf-icon">📂</div>
           <div class="cf-subj">${cat ? cat.icon+' '+cat.label : 'No subject'}</div>
           <p class="cf-hint">Choose your local study folder for this subject.</p>
           <button class="cf-btn" onclick="pickFolder()">Choose Folder</button>
         </div>`;
    return;
  }
  const done = LS.g('dn_'+ACT, {});
  const grps = {};
  files.forEach(f=>{ const g=f.path||'—'; (grps[g]||(grps[g]=[])).push(f); });
  const multi = Object.keys(grps).length>1;
  let html='';
  Object.entries(grps).forEach(([g,items])=>{
    const col = COLLAPSED[ACT+'_'+g];
    if(multi){
      const dc  = items.filter(f=>done[f.name]).length;
      const pct = items.length ? Math.round(dc/items.length*100) : 0;
      html += `<div class="glbl${col?' gc':''}" onclick="toggleGrp('${CSS.escape(ACT+'_'+g)}')">📁 ${g} <span style="color:var(--t2);font-size:.6rem;margin-left:4px">${dc}/${items.length}</span><span class="garr">▾</span></div>`;
      html += `<div class="grp-prog"><div class="grp-prog-fill" style="width:${pct}%"></div></div>`;
    }
    html += `<div class="grp-items${col?' gh':''}" id="grp_${(ACT+'_'+g).replace(/[^a-z0-9]/gi,'_')}">`;
    items.forEach(f=>{
      const ri    = FILES.indexOf(f);
      const act   = ri===IDX, isDn=!!done[f.name];
      const icon  = f.ext==='pdf' ? '📄' : f.ext==='html' ? '🌐' : '🎬';
      const short = f.name.replace(/\.[^.]+$/,'');
      const vt    = LS.g('vt_'+ACT+'_'+f.name,0);
      const vth   = vt>2 ? ` · ${fmt(vt)}` : '';
      const doneTs= done[f.name];
      const dateStr=doneTs ? `<div class="fi-done-date">✓ ${new Date(doneTs).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'})}</div>` : '';
      html += `<div class="fi${act?' on':''}${isDn?' dn':''}" id="fi_${ri}" onclick="openF(${ri})"><span class="fi-ic">${icon}</span><div class="fi-in"><div class="fi-nm">${esc(short)}</div><div class="fi-mt">${f.ext.toUpperCase()}${vth}</div>${dateStr}</div><span class="fi-nu">${ri+1}</span><button class="ck${isDn?' tk':''}" onclick="tgDn(event,${ri})" title="Mark complete">${isDn?'✓':''}</button></div>`;
    });
    html += `</div>`;
  });
  fl.innerHTML=html; scrollA();
}

function toggleGrp(key){ COLLAPSED[key]=!COLLAPSED[key]; applyFilt(); }
function filterFiles(q){ applyFilt(q); }
function applyFilt(q){
  q = q!==undefined ? q : document.getElementById('si').value;
  let f=[...FILES];
  if(q&&q.trim()) f=f.filter(x=>x.name.toLowerCase().includes(q.toLowerCase())||x.path.toLowerCase().includes(q.toLowerCase()));
  f = sortFiles(f);
  FILT=f; rndr(FILT);
}
function sortFiles(f){
  const done = LS.g('dn_'+ACT,{});
  if(SORT==='namez') return [...f].sort((a,b)=>(b.path+'/'+b.name).localeCompare(a.path+'/'+a.name,undefined,{numeric:true,sensitivity:'base'}));
  if(SORT==='undone') return [...f].sort((a,b)=>(!!done[a.name])-(!!done[b.name]));
  if(SORT==='type'){ const o={'pdf':0,'html':1}; return [...f].sort((a,b)=>(o[a.ext]??2)-(o[b.ext]??2)); }
  return [...f].sort((a,b)=>(a.path+'/'+a.name).localeCompare(b.path+'/'+b.name,undefined,{numeric:true,sensitivity:'base'}));
}
function applySort(){ SORT=document.getElementById('sortSel').value; applyFilt(); }

function jumpUnseen(){
  if(!FILES.length) return;
  const done = LS.g('dn_'+ACT,{});
  const idx  = FILES.findIndex(f=>!done[f.name]);
  if(idx>=0){ openF(idx); toast('⬇ Jumped to first unseen'); }
  else toast('All files marked done!');
}

function pushRecent(cat,file){
  const key='recent_files';
  let arr=LS.g(key,[]);
  arr=arr.filter(r=>!(r.cat===cat&&r.name===file.name));
  arr.unshift({cat,name:file.name,ext:file.ext,ts:Date.now()});
  if(arr.length>12) arr=arr.slice(0,12);
  LS.s(key,arr);
}

/* ── Open file ── */
async function openF(idx){
  if(!FILES.length||idx<0||idx>=FILES.length) return;
  IDX=idx; LS.s('idx_'+ACT,idx); clrVT(); rvBlob();
  rndr(FILT); updNav(); updStats(); updBadge();
  const f=FILES[idx]; let file;
  try{ file=await f.handle.getFile(); }
  catch(e){ document.getElementById('vc').innerHTML=`<div class="vph"><div class="vphi">⚠️</div><div class="vpht">Cannot Open</div><div class="vphs">${e.message}</div></div>`; return; }
  BLOB=URL.createObjectURL(file);
  const displayName=f.name.replace(/\.[^.]+$/,'');
  const vf=document.getElementById('vnFilename');
  fadeOut(vf,150,()=>{ vf.textContent=displayName; vf.classList.remove('empty'); fadeIn(vf,250); });
  document.getElementById('vlbl').innerHTML=`${esc(displayName)} <small>.${f.ext.toUpperCase()}</small>`;
  pushRecent(ACT,f);
  const vc=document.getElementById('vc');
  if(f.ext==='pdf'){
    vc.innerHTML=`<iframe src="${BLOB}#toolbar=1" title="${esc(f.name)}"></iframe>`;
  } else if(f.ext==='html'){
    vc.innerHTML=`<iframe src="${BLOB}" title="${esc(f.name)}" sandbox="allow-scripts allow-same-origin allow-modals"></iframe>`;
  } else {
    const st=LS.g('vt_'+ACT+'_'+f.name,0);
    vc.innerHTML=`<video controls src="${BLOB}" id="mv"></video>`;
    const vid=document.getElementById('mv');
    if(st>2) vid.addEventListener('loadedmetadata',()=>{ vid.currentTime=st; },{once:true});
    VTT=setInterval(()=>{ if(vid&&!vid.paused&&!vid.ended){ LS.s('vt_'+ACT+'_'+f.name,Math.floor(vid.currentTime)); rfMeta(idx); } },5000);
    vid.addEventListener('pause',()=>{ LS.s('vt_'+ACT+'_'+f.name,Math.floor(vid.currentTime)); rfMeta(idx); });
    vid.addEventListener('ended',()=>{
      LS.s('vt_'+ACT+'_'+f.name,0); rfMeta(idx);
      const done=LS.g('dn_'+ACT,{});
      if(!done[f.name]){ done[f.name]=Date.now(); LS.s('dn_'+ACT,done); rndr(FILT); updStats(); updBadge(); hmRenderMediaCounts(); toast('✓ Marked as done'); }
    });
  }
  toast('✓ Progress saved');
}

function rfMeta(idx){ const el=document.getElementById('fi_'+idx); if(!el)return; const f=FILES[idx]; const vt=LS.g('vt_'+ACT+'_'+f.name,0); const m=el.querySelector('.fi-mt'); if(m) m.textContent=f.ext.toUpperCase()+(vt>2?` · ${fmt(vt)}`:''); }
function fmt(s){ const m=Math.floor(s/60),sc=s%60; return `${m}:${String(sc).padStart(2,'0')}`; }
function nav(d){ const n=IDX+d; if(n>=0&&n<FILES.length) openF(n); }

function updNav(){
  const t=FILES.length;
  document.getElementById('bprev').disabled=IDX<=0;
  document.getElementById('bnext').disabled=IDX>=t-1;
  document.getElementById('pp').textContent=t?`${IDX+1} / ${t}`:'—';
  document.getElementById('pgf').style.width=(t>1?(IDX/(t-1))*100:0)+'%';
  const cat=ACT&&CATS.find(c=>c.id===ACT);
  if(cat){
    document.getElementById('vnSubjIcon').textContent=cat.icon;
    document.getElementById('vnSubjName').textContent=cat.label;
    const vs=document.getElementById('vnSubject');
    if(vs&&(vs.style.display==='none'||vs.style.opacity==='0')) fadeIn(vs,220);
  }
  if(t>0&&FILES[IDX]){
    const fname=FILES[IDX].name.replace(/\.[^.]+$/,'');
    const vf=document.getElementById('vnFilename');
    fadeOut(vf,120,()=>{ vf.textContent=fname; vf.classList.remove('empty'); fadeIn(vf,220); });
  }
}

function updStats(){
  const st  = document.getElementById('sst');
  const sbHd= document.getElementById('sbHd');
  const sbFt= document.getElementById('sbFoot');
  const jb  = document.getElementById('bjump');
  const ju  = document.getElementById('bjumpUnseen');
  if(!FILES.length){
    if(st) st.style.display='none';
    if(sbHd) sbHd.classList.remove('vis');
    if(sbFt) sbFt.classList.remove('vis');
    if(jb) jb.classList.remove('vis');
    if(ju) ju.classList.remove('vis');
    const fill=document.getElementById('sbProgFill'); if(fill) fill.style.width='0%';
    return;
  }
  if(st) st.style.display='flex';
  if(sbHd) sbHd.classList.add('vis');
  if(sbFt) sbFt.classList.add('vis');
  const done=LS.g('dn_'+ACT,{});
  const dc=FILES.filter(f=>done[f.name]).length;
  document.getElementById('stot').textContent=FILES.length+' files';
  document.getElementById('sdn').textContent=dc+' done';
  const pct=FILES.length?Math.round(dc/FILES.length*100):0;
  const fill=document.getElementById('sbProgFill'); if(fill) fill.style.width=pct+'%';
  if(jb) jb.classList.toggle('vis', FILES.length>0);
  if(ju) ju.classList.toggle('vis', dc<FILES.length);
}

function updBadge(){
  if(!ACT) return;
  const done=LS.g('dn_'+ACT,{});
  const dc=FILES.filter(f=>done[f.name]).length;
  const tb=document.getElementById('tsbg_'+ACT);
  if(tb){ tb.textContent=dc||''; tb.classList.toggle('vis',dc>0); }
}

function scrollA(){ requestAnimationFrame(()=>document.getElementById('fi_'+IDX)?.scrollIntoView({block:'nearest',behavior:'smooth'})); }

function clrView(){
  rvBlob(); clrVT();
  document.getElementById('vc').innerHTML=`<div class="vph"><div class="vphi">🎓</div><div class="vpht">Ready to Study</div><div class="vphs">Select a subject from the left panel to get started.</div></div>`;
  document.getElementById('bprev').disabled=true;
  document.getElementById('bnext').disabled=true;
  document.getElementById('pp').textContent='—';
  document.getElementById('pgf').style.width='0%';
  const vf=document.getElementById('vnFilename');
  if(vf){ vf.textContent='No file open'; vf.classList.add('empty'); }
}

function tgDn(e,idx){
  e.stopPropagation();
  const f=FILES[idx]; if(!f) return;
  const done=LS.g('dn_'+ACT,{});
  if(done[f.name]){ delete done[f.name]; } else { done[f.name]=Date.now(); }
  LS.s('dn_'+ACT,done); rndr(FILT); updStats(); updBadge(); hmRenderMediaCounts();
}

function rvBlob(){ if(BLOB){ URL.revokeObjectURL(BLOB); BLOB=null; } }
function clrVT(){ if(VTT){ clearInterval(VTT); VTT=null; } }
function toggleSb(){ document.body.classList.toggle('sbh'); LS.s('sbh',document.body.classList.contains('sbh')); }

/* ── Theme ── */
function toggleTheme(){
  const dk=document.documentElement.getAttribute('data-theme')==='dark';
  document.documentElement.setAttribute('data-theme',dk?'light':'dark');
  LS.s('th',dk?'light':'dark');
  syncThemePanel();
}
function syncThemePanel(){
  const dk=document.documentElement.getAttribute('data-theme')==='dark';
  const tog=document.getElementById('upThemeToggle');
  const lbl=document.getElementById('upThemeLabel');
  const ico=document.getElementById('upThemeIcon');
  if(tog) tog.classList.toggle('on',dk);
  if(lbl) lbl.textContent=dk?'Dark Mode':'Light Mode';
  if(ico) ico.textContent=dk?'🌙':'☀️';
}
function toggleHeader(){ document.body.classList.toggle('hdh'); LS.s('hdh',document.body.classList.contains('hdh')); }

/* ── User panel ── */
function toggleUserPanel(){
  document.getElementById('userPanel').classList.toggle('open');
  document.getElementById('userOverlay').classList.toggle('open');
}
function closeUserPanel(){
  document.getElementById('userPanel').classList.remove('open');
  document.getElementById('userOverlay').classList.remove('open');
}
function openSettings(){ toast('⚙️ Settings coming soon'); closeUserPanel(); }
function signOut(){ if(confirm('Sign out of Abhyasa SSC?')){ toast('👋 Signed out'); closeUserPanel(); } }

/* ── Keyboard ── */
let _kT;
function shKbd(){ const h=document.getElementById('kbh'); h.classList.add('on'); clearTimeout(_kT); _kT=setTimeout(()=>h.classList.remove('on'),4000); }
document.addEventListener('keydown',e=>{
  const t=document.activeElement?.tagName;
  if(t==='TEXTAREA'||t==='INPUT'||t==='SELECT') return;
  if(e.key==='s'||e.key==='S') toggleSb();
  else if(e.key==='h'||e.key==='H') toggleHeader();
  else if(e.key===' '){ e.preventDefault(); if(FILES[IDX]) tgDn({stopPropagation:()=>{}},IDX); }
  else if(e.key==='?') shKbd();
  else if(e.key>='1'&&e.key<='5'){ const c=CATS[parseInt(e.key)-1]; if(c) swCat(c.id); }
});

/* ════════════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════════════ */
(async()=>{
  /* Theme */
  const th=LS.g('th','dark');
  document.documentElement.setAttribute('data-theme',th);
  syncThemePanel();

  /* Collapsed sidebar */
  if(LS.g('sbh',false)) document.body.classList.add('sbh');

  /* Planner data */
  hmLoad();
  const msEl=document.getElementById('hmMinSubjects');
  if(msEl) msEl.value=HM.minSubjects;

  /* Restore last view */
  const lastView=LS.g('lastView','info');
  if(lastView==='progress'){
    goProgress();
  } else if(lastView==='study'){
    const lc=LS.g('lcat','reasoning');
    const def=(lc&&CATS.find(c=>c.id===lc))?lc:'reasoning';
    await swCat(def);
  } else {
    goInfo();
  }

  /* Keyboard hint on first visit */
  if(!LS.g('hint1',false)){ setTimeout(shKbd,1600); LS.s('hint1',true); }
})();
