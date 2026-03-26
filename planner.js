'use strict';
/* ════════════════════════════════════════════════════════
   PLANNER — Your Progress daily tracker
   Depends on: utils.js (LS, CATS, toast, esc)
════════════════════════════════════════════════════════ */

const HM_SUBJECTS = [
  {key:'RSN', label:'Reasoning',        color:'#bc8cff'},
  {key:'MATH',label:'Mathematics',      color:'#f78166'},
  {key:'GA',  label:'General Awareness',color:'#388bfd'},
  {key:'ENG', label:'English',          color:'#3fb950'},
  {key:'COMP',label:'Computer',         color:'#e3b341'},
];
const HM_KEY = 'abhyasa_ssc_v1';
let HM = { schedule:{}, log:{}, minSubjects:3, goal:null };

const hmSave = () => localStorage.setItem(HM_KEY, JSON.stringify(HM));
const hmLoad = () => {
  try {
    let r = localStorage.getItem(HM_KEY);
    if(!r){
      /* migrate from old key if it exists */
      const old = localStorage.getItem('ssc_cgl_v3');
      if(old){ localStorage.setItem(HM_KEY, old); r = old; }
    }
    if(r) Object.assign(HM, JSON.parse(r));
  } catch(e){}
};

const todayKey   = () => new Date().toISOString().split('T')[0];
const hmCountStudied = (min=HM.minSubjects) =>
  Object.values(HM.log).filter(v => HM_SUBJECTS.filter(s=>v[s.key]).length >= min).length;

function hmCalcStreak(){
  let streak = 0;
  const d = new Date();
  while(true){
    const k = d.toISOString().split('T')[0];
    const v = HM.log[k] || {};
    if(HM_SUBJECTS.filter(s=>v[s.key]).length < HM.minSubjects) break;
    streak++;
    d.setDate(d.getDate()-1);
  }
  return streak;
}

/* ── Render functions ── */
function hmRenderBanner(){
  const now = new Date();
  document.getElementById('hmDayNum').textContent  = now.getDate();
  document.getElementById('hmDayName').textContent = now.toLocaleDateString('en-IN',{weekday:'long'});
  document.getElementById('hmDayFull').textContent = now.toLocaleDateString('en-IN',{month:'long',year:'numeric'});
  document.getElementById('hmHeaderStudied').textContent = hmCountStudied();
  const streak = hmCalcStreak();
  const sel = document.getElementById('hmHeaderStreak');
  if(sel){
    sel.textContent = streak + (streak > 0 ? ' 🔥' : '');
    sel.style.animation = streak > 0 ? 'flicker 1.5s ease-in-out infinite' : '';
  }
}

function hmRenderGoal(){
  const g = HM.goal;
  document.getElementById('hmGoalName').value = g?.name || '';
  document.getElementById('hmGoalDate').value = g?.date || '';
  const cd = document.getElementById('hmGoalCountdown');
  if(!g?.date){ cd.innerHTML = ''; return; }
  const now = new Date(), exam = new Date(g.date);
  exam.setHours(23,59,59);
  const diff = exam - now;
  if(diff < 0){ cd.innerHTML = `<p class="hm-no-topics" style="color:var(--pink);margin-top:10px">Exam date has passed!</p>`; return; }
  const days = Math.ceil(diff/86400000);
  cd.innerHTML = `<div style="margin-top:10px"><div class="hm-goal-name">📋 ${esc(g.name)}</div><div class="hm-goal-countdown">
    <div class="hm-goal-box"><div class="hm-goal-num">${days}</div><div class="hm-goal-unit">Days Left</div></div>
    <div class="hm-goal-box"><div class="hm-goal-num">${Math.floor(days/7)}</div><div class="hm-goal-unit">Weeks</div></div>
    <div class="hm-goal-box"><div class="hm-goal-num">${Math.floor(days/30)}</div><div class="hm-goal-unit">Months</div></div>
  </div></div>`;
}

function saveGoal(){
  const name = document.getElementById('hmGoalName').value.trim();
  const date = document.getElementById('hmGoalDate').value;
  if(!date){ toast('Pick an exam date','warn'); return; }
  HM.goal = { name: name || 'Abhyasa SSC', date };
  hmSave(); hmRenderGoal(); toast('🎯 Goal saved!');
}

function fmtTime(secs){
  if(!secs) return '0m';
  const h = Math.floor(secs/3600), m = Math.floor((secs%3600)/60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

function addStudyTime(secs){
  const times = LS.g('study_time',{});
  const k = todayKey();
  times[k] = (times[k]||0) + secs;
  LS.s('study_time', times);
}

function hmRenderStudyTime(){
  const times = LS.g('study_time',{});
  const today = todayKey();
  const todaySecs  = times[today] || 0;
  const totalSecs  = Object.values(times).reduce((a,b)=>a+b, 0);
  document.getElementById('hmTimeRow').innerHTML = [
    {n:fmtTime(todaySecs),  l:'Today',       c:'var(--purple)'},
    {n:fmtTime(totalSecs),  l:'All Time',     c:'var(--acc)'},
    {n:Object.keys(times).length, l:'Days Tracked', c:'var(--green)'},
  ].map(({n,l,c})=>`<div class="hm-time-box"><div class="hm-time-num" style="color:${c}">${n}</div><div class="hm-time-lbl">${l}</div></div>`).join('');
}

function hmRenderTopics(){
  const el = document.getElementById('hmTopicsBody');
  const d  = HM.schedule[todayKey()];
  if(!d || !Object.keys(d).length){
    el.innerHTML = '<p class="hm-no-topics">Upload your Excel schedule (.xlsx) via the 📂 button to see today\'s topics.</p>';
    return;
  }
  el.innerHTML = HM_SUBJECTS.map(s=>{
    if(!d[s.key]) return '';
    const lines = d[s.key].split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
    let headings=[], entries=[];
    lines.forEach(line=>{
      const ci = line.indexOf(':');
      if(ci>0 && ci<line.length-1) entries.push({label:line.slice(0,ci).trim(), pages:line.slice(ci+1).trim()});
      else headings.push(line);
    });
    if(!headings.length && !entries.length) headings = [d[s.key]];
    const hH = headings.map(h=>`<div class="hm-topic-head">${h}</div>`).join('');
    const eH = entries.length ? `<div class="hm-topic-entries">`+entries.map(e=>`<div class="hm-topic-entry"><span class="hm-entry-lbl">${e.label}</span><span class="hm-entry-pages" style="background:${s.color}18;color:${s.color};border:1px solid ${s.color}30">${e.pages}</span></div>`).join('')+`</div>` : '';
    return `<div class="hm-topic-row"><div class="hm-topic-dot" style="background:${s.color};box-shadow:0 0 4px ${s.color}60"></div><div class="hm-topic-subj">${s.label}</div><div class="hm-topic-vals">${hH}${eH}</div></div>`;
  }).join('');
}

function hmRenderMediaCounts(){
  const el = document.getElementById('hmMediaGrid');
  el.innerHTML = '<div class="hm-media-grid">'+CATS.map(c=>{
    const done  = LS.g('dn_'+c.id, {});
    const names = Object.keys(done);
    const pdfs  = names.filter(n=>n.toLowerCase().endsWith('.pdf')).length;
    const htmls = names.filter(n=>HTML_EXT.test(n)).length;
    const vids  = names.filter(n=>VID_EXT.test(n)).length;
    const total = pdfs + htmls + vids;
    const pills = total
      ? (pdfs  ? `<span class="hm-media-pill pdf">📄 ${pdfs} PDF${pdfs!==1?'s':''}</span>`  : '')
       +(htmls ? `<span class="hm-media-pill html">🌐 ${htmls} HTML${htmls!==1?'s':''}</span>` : '')
       +(vids  ? `<span class="hm-media-pill vid">🎬 ${vids} Video${vids!==1?'s':''}</span>` : '')
      : `<span class="hm-media-zero">Nothing yet</span>`;
    return `<div class="hm-media-card"><div class="hm-media-subj"><span class="hm-media-subj-icon">${c.icon}</span>${c.label}</div><div class="hm-media-counts">${pills}</div></div>`;
  }).join('')+'</div>';
}

function hmRenderChecklist(){
  const grid   = document.getElementById('hmCheckGrid');
  const dayLog = HM.log[todayKey()] || {};
  grid.innerHTML = HM_SUBJECTS.map(s=>{
    const done = !!dayLog[s.key];
    return `<label class="hm-check-item" style="border-color:${done?s.color+'55':'var(--bdr)'};background:${done?s.color+'12':'var(--c2)'}">
      <input type="checkbox" data-key="${s.key}" ${done?'checked':''}>
      <div class="hm-check-box" style="${done?`background:${s.color};border-color:${s.color};color:#fff`:''}">
        ${done?'✓':''}
      </div>
      <div style="width:5px;height:5px;border-radius:2px;flex-shrink:0;background:${s.color}"></div>
      <div class="hm-check-label">${s.label}</div>
    </label>`;
  }).join('');
  grid.querySelectorAll('input[type="checkbox"]').forEach(input=>{
    input.addEventListener('change',()=>{
      const k = input.dataset.key;
      if(!HM.log[todayKey()]) HM.log[todayKey()] = {};
      HM.log[todayKey()][k] = input.checked;
      hmSave(); hmRenderChecklist(); hmRenderBanner();
      hmRenderProgress(); hmRenderSubjects(); hmRenderAlmost(); hmRenderHeatmap();
      toast('✓ Saved');
    });
  });
}

function hmRenderProgress(){
  const studied = hmCountStudied();
  const total   = Object.keys(HM.log).length;
  const streak  = hmCalcStreak();
  const pct     = total ? Math.round(studied/total*100) : 0;
  document.getElementById('hmStatRow').innerHTML = [
    {n:studied, l:'Days Studied',   c:'var(--acc)'},
    {n:streak,  l:'Current Streak', c:'var(--green)'},
    {n:pct+'%', l:'Completion',     c:'var(--yellow)'},
  ].map(({n,l,c})=>`<div class="hm-stat-box"><div class="hm-stat-num" style="color:${c}">${n}</div><div class="hm-stat-lbl">${l}</div></div>`).join('');
  document.getElementById('hmProgressBars').innerHTML = `
    <div class="hm-plbl"><span>Overall</span><strong>${studied} / ${total} days</strong></div>
    <div class="hm-pbar-wrap"><div class="hm-pbar-fill" style="width:${pct}%;background:linear-gradient(90deg,var(--green),var(--acc))"></div></div>`;
}

function hmRenderSubjects(){
  const totals = {};
  HM_SUBJECTS.forEach(s => totals[s.key] = 0);
  const days = Object.values(HM.log);
  days.forEach(d => HM_SUBJECTS.forEach(s=>{ if(d[s.key]) totals[s.key]++; }));
  const total = days.length || 1;
  document.getElementById('hmSubjectGrid').innerHTML = HM_SUBJECTS.map(s=>{
    const n = totals[s.key], pct = Math.round(n/total*100);
    return `<div class="hm-subj-card" style="border-color:${s.color}28">
      <div class="hm-subj-head"><div class="hm-subj-pip" style="background:${s.color}"></div><div class="hm-subj-name">${s.label}</div></div>
      <div class="hm-subj-count" style="color:${s.color}">${n}</div>
      <div class="hm-subj-of">/ ${total} days · ${pct}%</div>
      <div class="hm-pbar-wrap" style="margin-top:8px"><div class="hm-pbar-fill" style="width:${pct}%;background:${s.color}"></div></div>
    </div>`;
  }).join('');
}

function hmRenderAlmost(){
  const min  = HM.minSubjects;
  const hits = Object.entries(HM.log).filter(([,v])=>{
    const n = HM_SUBJECTS.filter(s=>v[s.key]).length;
    return n>0 && n<min;
  });
  const el = document.getElementById('hmAlmostBody');
  if(!hits.length){ el.innerHTML='<p class="hm-no-topics" style="font-size:.76rem">No near-miss days found.</p>'; return; }
  el.innerHTML = '<div class="hm-almost-list">'+hits.map(([date,v])=>{
    const done = HM_SUBJECTS.filter(s=>v[s.key]).map(s=>s.label.slice(0,3));
    return `<div class="hm-almost-chip"><strong>${date}</strong> · ${done.join(', ')}</div>`;
  }).join('')+'</div>';
}

function hmRenderHeatmap(){
  const wrap  = document.getElementById('hmHeatWrap');
  const WEEKS = 16;
  const today = new Date(); today.setHours(0,0,0,0);
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay() - (WEEKS-1)*7);
  const cells = [];
  for(let i=0; i<WEEKS*7; i++){
    const d = new Date(start); d.setDate(start.getDate()+i); cells.push(d);
  }
  function intensity(d){
    const k = d.toISOString().split('T')[0];
    const v = HM.log[k] || {};
    const n = HM_SUBJECTS.filter(s=>v[s.key]).length;
    return Math.min(n, 4);
  }
  const isDark  = document.documentElement.getAttribute('data-theme') === 'dark';
  const colors  = isDark
    ? ['#161b22','#0d4429','#006d32','#26a641','#39d353']
    : ['#ebedf0','#9be9a8','#40c463','#30a14e','#216e39'];
  let monthHtml = '';
  let lastMonth = -1;
  for(let w=0; w<WEEKS; w++){
    const d = new Date(start); d.setDate(start.getDate()+w*7);
    const mo = d.getMonth();
    monthHtml += `<div class="hm-heat-month" style="width:16px">${mo!==lastMonth ? d.toLocaleDateString('en-IN',{month:'short'}) : ''}</div>`;
    lastMonth = mo;
  }
  const todayStr = today.toISOString().split('T')[0];
  const cellHtml = cells.map(d=>{
    const k  = d.toISOString().split('T')[0];
    const lv = intensity(d);
    const isToday = k === todayStr;
    const label = d.toLocaleDateString('en-IN',{weekday:'short',day:'2-digit',month:'short'})
      + (lv ? ' · '+HM_SUBJECTS.filter(s=>(HM.log[k]||{})[s.key]).map(s=>s.label).join(', ') : '');
    return `<div class="hm-heat-cell" style="background:${colors[lv]};${isToday?'outline:2px solid var(--acc);':''}" title="${label}"></div>`;
  }).join('');
  const legendHtml = '<div class="hm-heat-legend">Less <div class="hm-heat-legend-cells">'+colors.map(c=>`<div class="hm-heat-cell" style="background:${c}"></div>`).join('')+'</div> More</div>';
  wrap.innerHTML = `<div class="hm-heat-months">${monthHtml}</div><div class="hm-heat-grid">${cellHtml}</div>${legendHtml}`;
}

function relTime(ts){
  const d=Date.now()-ts, m=Math.floor(d/60000), h=Math.floor(d/3600000), dy=Math.floor(d/86400000);
  if(m<1) return 'Just now';
  if(m<60) return `${m}m ago`;
  if(h<24) return `${h}h ago`;
  return `${dy}d ago`;
}

function hmRenderRecent(){
  const arr = LS.g('recent_files',[]);
  const el  = document.getElementById('hmRecentBody');
  if(!arr.length){ el.innerHTML='<p class="hm-no-topics">No files opened yet.</p>'; return; }
  const cat = id => CATS.find(c=>c.id===id);
  el.innerHTML = '<div class="hm-recent-list">'+arr.slice(0,8).map(r=>{
    const c    = cat(r.cat);
    const icon = r.ext==='pdf' ? '📄' : r.ext==='html' ? '🌐' : '🎬';
    const name = r.name.replace(/\.[^.]+$/,'');
    const ago  = relTime(r.ts);
    return `<div class="hm-recent-item" onclick="swCat('${r.cat}')">
      <span class="hm-recent-icon">${icon}</span>
      <div class="hm-recent-info">
        <div class="hm-recent-name">${esc(name)}</div>
        <div class="hm-recent-meta">${r.ext.toUpperCase()} · ${ago}</div>
      </div>
      <span class="hm-recent-cat">${c?.icon||''} ${c?.label||r.cat}</span>
    </div>`;
  }).join('')+'</div>';
}

function hmRenderAll(){
  hmRenderBanner(); hmRenderGoal(); hmRenderStudyTime(); hmRenderTopics();
  hmRenderMediaCounts(); hmRenderChecklist(); hmRenderProgress();
  hmRenderSubjects(); hmRenderAlmost(); hmRenderHeatmap(); hmRenderRecent();
}

/* ── Event listeners ── */
document.addEventListener('DOMContentLoaded', ()=>{
  document.getElementById('hmSaveToday')?.addEventListener('click',()=>{
    hmSave();
    const m = document.getElementById('hmSaveMsg');
    m.classList.add('show');
    hmRenderProgress(); hmRenderSubjects(); hmRenderAlmost(); hmRenderHeatmap();
    setTimeout(()=>m.classList.remove('show'), 2000);
    toast('Today saved!');
  });

  document.getElementById('hmMinSubjects')?.addEventListener('change', e=>{
    HM.minSubjects = parseInt(e.target.value);
    hmSave(); hmRenderAll();
  });

  document.getElementById('fileInput')?.addEventListener('change', function(e){
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = function(ev){
      try{
        const wb   = XLSX.read(ev.target.result, {type:'binary',cellDates:true});
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, {header:1});
        const hdr  = (rows[0]||[]).map(h=>String(h||'').toLowerCase().trim());
        const colDate = hdr.findIndex(h=>h.includes('date'));
        const colMap  = {
          GA:  hdr.findIndex(h=>h.includes('general')||h.includes('ga')||h.includes('aware')),
          ENG: hdr.findIndex(h=>h.includes('english')||h.includes('eng')),
          RSN: hdr.findIndex(h=>h.includes('reason')||h.includes('rsn')),
          MATH:hdr.findIndex(h=>h.includes('math')),
          COMP:hdr.findIndex(h=>h.includes('computer')||h.includes('comp')),
        };
        const schedule = {};
        for(let i=1; i<rows.length; i++){
          const row = rows[i]; if(!row||!row[colDate]) continue;
          let dt = row[colDate];
          if(typeof dt==='number'){dt=XLSX.SSF.parse_date_code(dt);dt=new Date(dt.y,dt.m-1,dt.d);}
          else if(!(dt instanceof Date)){dt=new Date(dt);}
          if(isNaN(dt)) continue;
          const k = dt.toISOString().split('T')[0];
          const entry = {};
          Object.entries(colMap).forEach(([subj,col])=>{ if(col>=0&&row[col]) entry[subj]=String(row[col]).trim(); });
          if(Object.keys(entry).length) schedule[k] = entry;
        }
        HM.schedule = schedule; hmSave(); hmRenderAll();
        toast(`Schedule loaded: ${Object.keys(schedule).length} days`);
      }catch(err){ toast('Error reading file.','warn'); console.error(err); }
    };
    reader.readAsBinaryString(file);
    this.value = '';
  });
});
