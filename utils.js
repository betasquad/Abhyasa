'use strict';
/* ── Shared constants & helpers ── */

const CATS = [
  { id:'reasoning',   label:'Reasoning',        icon:'🧠' },
  { id:'mathematics', label:'Mathematics',       icon:'➗' },
  { id:'general',     label:'General Awareness', icon:'🌍' },
  { id:'english',     label:'English',           icon:'✍️' },
  { id:'computer',    label:'Computer',          icon:'💻' },
];

const MEDIA   = /\.(pdf|html|mp4|mkv|webm|avi|mov|mp3|m4a|m4v|ogg|wav)$/i;
const VID_EXT = /\.(mp4|mkv|webm|avi|mov|mp3|m4a|m4v|ogg|wav)$/i;
const HTML_EXT= /\.html$/i;

const LS = {
  g:(k,d=null)=>{try{const v=localStorage.getItem(k);return v!==null?JSON.parse(v):d;}catch{return d;}},
  s:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}}
};

let _tT;
function toast(msg, type=''){
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'show' + (type ? ' '+type : '');
  clearTimeout(_tT);
  _tT = setTimeout(()=>el.className='', 2200);
}

function fadeIn(el, ms=250){
  if(!el) return;
  el.style.opacity = '0';
  el.style.display = '';
  el.style.transition = `opacity ${ms}ms`;
  requestAnimationFrame(()=>requestAnimationFrame(()=>el.style.opacity='1'));
}

function fadeOut(el, ms=180, cb){
  if(!el) return;
  el.style.transition = `opacity ${ms}ms`;
  el.style.opacity = '0';
  setTimeout(()=>{ el.style.display='none'; el.style.transition=''; if(cb)cb(); }, ms);
}

function esc(s){
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
