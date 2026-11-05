'use strict';
const $ = s => document.querySelector(s);
const view = $('#view'), world = $('#world'), svg = $('#strings'), cv = $('#draw'), ctx = cv.getContext('2d');
const NS = 'http://www.w3.org/2000/svg';
const T = { pol: '<div class="pin"></div><img alt=""><div class="cap" contenteditable spellcheck="false">ŞÜPHELİ A</div>',
  note: '<div class="pin"></div><div contenteditable spellcheck="false">Saat 22:00\'de görüldü</div>',
  news: '<div class="pin"></div><h3 contenteditable spellcheck="false">GİZEMLİ KAYIP</h3><p contenteditable spellcheck="false">Haber metnini buraya yazın. Başlığı ve metni istediğiniz gibi değiştirebilirsiniz.</p>' };

let v = { x: -900, y: -600, k: .8 }, mode = 'select', threads = [], from = null, sel = null, zTop = 1;

const place = () => world.style.transform = `translate(${v.x}px,${v.y}px) scale(${v.k})`;
const toWorld = e => ({ x: (e.clientX - v.x) / v.k, y: (e.clientY - v.y) / v.k });
place();

/* ---------- Gezinme (zoom / pan) ---------- */
view.addEventListener('wheel', e => {
  e.preventDefault();
  const k = Math.min(3, Math.max(.2, v.k * (e.deltaY < 0 ? 1.1 : .9)));
  v.x = e.clientX - (e.clientX - v.x) * k / v.k;
  v.y = e.clientY - (e.clientY - v.y) * k / v.k;
  v.k = k; place();
}, { passive: false });

view.addEventListener('pointerdown', e => {
  const onBg = e.target === view || e.target === world;
  if (!(onBg && mode !== 'pen' && mode !== 'marker') && e.button !== 1) return;
  if (onBg) select(null);
  const sx = e.clientX - v.x, sy = e.clientY - v.y;
  view.classList.add('pan'); view.setPointerCapture(e.pointerId);
  const mv = m => { v.x = m.clientX - sx; v.y = m.clientY - sy; place(); };
  const up = () => { view.classList.remove('pan'); view.removeEventListener('pointermove', mv); view.removeEventListener('pointerup', up); };
  view.addEventListener('pointermove', mv); view.addEventListener('pointerup', up);
});

/* ---------- Kartlar ---------- */
function addCard(type, img, pos) {
  const c = document.createElement('div');
  c.className = 'card ' + ({ pol: 'polaroid', note: 'note', news: 'news', doc: 'doc', tick: 'tick' })[type];
  c.innerHTML = T[type]; c.dataset.cat = DEF[type]; ensure(c);
  if (img) c.querySelector('img').src = img;
  const p = toWorld({ clientX: innerWidth / 2, clientY: innerHeight / 2 });
  c.style.left = p.x - 100 + (Math.random() * 120 - 60) + 'px';
  c.style.top = p.y - 120 + (Math.random() * 120 - 60) + 'px';
  c.dataset.r = (Math.random() * 8 - 4).toFixed(1); c.dataset.s = 1; tf(c);
  c.style.zIndex = ++zTop % 1 ? 1 : 1;
  if (pos) { c.style.left = pos[0] + 'px'; c.style.top = pos[1] + 'px'; }
  world.appendChild(c); select(c); save(); return c;
}

function select(c) { if (sel) sel.classList.remove('sel'); sel = c; if (c) c.classList.add('sel'); syncCat(); }

world.addEventListener('pointerdown', e => {
  if (e.target.classList.contains('rz')) return startResize(e, e.target.parentNode);
  if (mode === 'stamp' && !e.target.closest('.stamp')) return stampAt(e);
  const c = e.target.closest('.card'); if (!c) return;
  if (mode === 'thread') return threadClick(c);
  if (mode !== 'select') return;
  select(c);
  if (e.target.isContentEditable) return;
  select(c);
  const p = toWorld(e), ox = p.x - c.offsetLeft, oy = p.y - c.offsetTop;
  const mv = m => { const q = toWorld(m); c.style.left = q.x - ox + 'px'; c.style.top = q.y - oy + 'px'; drawThreads(); };
  const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); };
  addEventListener('pointermove', mv); addEventListener('pointerup', up);
});

function removeCard(c) {
  threads = threads.filter(t => t.a !== c && t.b !== c);
  c.remove(); if (sel === c) sel = null; drawThreads(); save();
}

/* ---------- İpler ---------- */
function threadClick(c) {
  if (!from) { from = c; c.classList.add('from'); return; }
  if (from !== c) threads.push({ a: from, b: c, color: $('#color').value });
  from.classList.remove('from'); from = null; drawThreads();
}

const pin = c => ({ x: c.offsetLeft + c.offsetWidth / 2, y: c.offsetTop + 2 });

function drawThreads() {
  svg.innerHTML = '';
  threads.forEach((t, i) => {
    const a = pin(t.a), b = pin(t.b), sag = Math.min(260, Math.hypot(b.x - a.x, b.y - a.y) * .22);
    const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2 + sag;
    const click = e => {
      if (e.shiftKey) threads.splice(i, 1);
      else { const s = prompt('İp etiketi (boş bırakırsan kalkar):', t.label || ''); if (s === null) return; t.label = s; }
      drawThreads(); save();
    };
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', `M${a.x} ${a.y} Q${cx} ${cy} ${b.x} ${b.y}`);
    p.setAttribute('stroke', t.color); p.setAttribute('stroke-width', 4); p.onclick = click;
    svg.appendChild(p);
    if (t.label) {                                            // bantlı not etiketi
      const w = t.label.length * 9 + 22, g = document.createElementNS(NS, 'g'), r = document.createElementNS(NS, 'rect'), x = document.createElementNS(NS, 'text');
      g.setAttribute('transform', `translate(${(a.x + 2 * cx + b.x) / 4} ${(a.y + 2 * cy + b.y) / 4}) rotate(-3)`);
      g.style.cssText = 'pointer-events:auto;cursor:pointer'; g.onclick = click;
      r.setAttribute('x', -w / 2); r.setAttribute('y', -16); r.setAttribute('width', w); r.setAttribute('height', 32);
      r.setAttribute('fill', '#fff3a8'); r.setAttribute('stroke', '#c9b458'); r.setAttribute('opacity', '.95');
      x.setAttribute('text-anchor', 'middle'); x.setAttribute('y', 5); x.setAttribute('font-size', 15); x.setAttribute('font-weight', 700);
      x.setAttribute('font-family', 'Courier New,monospace'); x.textContent = t.label;
      g.append(r, x); svg.appendChild(g);
    }
  });
}

/* ---------- Kalem ---------- */
cv.addEventListener('pointerdown', e => {
  if (!['pen', 'marker', 'eraser'].includes(mode)) return;
  const m = mode === 'marker', er = mode === 'eraser';
  ctx.strokeStyle = $('#color').value; ctx.lineWidth = er ? 30 : m ? 18 : 3; ctx.lineCap = ctx.lineJoin = 'round';
  ctx.globalAlpha = m ? .4 : 1; ctx.globalCompositeOperation = er ? 'destination-out' : 'source-over';
  let l = toWorld(e); cv.setPointerCapture(e.pointerId);
  const mv = ev => { const q = toWorld(ev); ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(q.x, q.y); ctx.stroke(); l = q; };
  const up = () => { cv.removeEventListener('pointermove', mv); cv.removeEventListener('pointerup', up); };
  cv.addEventListener('pointermove', mv); cv.addEventListener('pointerup', up);
});

/* ---------- Araç çubuğu ---------- */
function setMode(m) {
  mode = m; document.body.dataset.m = m;
  document.querySelectorAll('#modes button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
  if (from) { from.classList.remove('from'); from = null; }
}
$('#modes').addEventListener('click', e => e.target.dataset.m && setMode(e.target.dataset.m));
$('#addNote').onclick = () => addCard('note');
$('#addNews').onclick = () => addCard('news');
$('#addPolaroid').onclick = () => $('#file').click();
$('#file').onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader(); r.onload = () => addCard('pol', r.result); r.readAsDataURL(f); e.target.value = '';
};
$('#del').onclick = () => sel && removeCard(sel);
$('#clear').onclick = () => confirm('Tüm çizimler silinsin mi?') && ctx.clearRect(0, 0, cv.width, cv.height);

addEventListener('keydown', e => {
  if (e.target.isContentEditable) return;
  const k = { v: 'select', t: 'thread', p: 'pen', m: 'marker', e: 'eraser', s: 'stamp' }[e.key.toLowerCase()];
  if (k) setMode(k);
  if ((e.key === 'Delete' || e.key === 'Backspace') && sel) removeCard(sel);
});

/* ---------- Mühür, belge, zaman çizelgesi ---------- */
Object.assign(T, {
  doc: '<div class="pin"></div><div contenteditable spellcheck="false"><b>OTOPSİ RAPORU</b><br>Dosya No: 0042<br>Ölüm saati: 21:40 - 22:15<br>Neden: künt travma<br>Not: Boğuşma izi yok.</div>',
  tick: '<div class="pin"></div><div contenteditable spellcheck="false">Etiket</div>' });
$('#addDoc').onclick = () => addCard('doc');

function stampAt(e) {
  const host = e.target.closest('.card') || world, s = document.createElement('div');
  s.className = 'stamp'; s.textContent = $('#stampType').value;
  let x, y;
  if (host === world) ({ x, y } = toWorld(e));
  else { const r = host.getBoundingClientRect(); x = (e.clientX - r.left) / v.k; y = (e.clientY - r.top) / v.k; }
  s.style.left = x + 'px'; s.style.top = y + 'px'; host.appendChild(s); save();
}
world.addEventListener('dblclick', e => { const s = e.target.closest('.stamp'); if (s) { s.remove(); save(); } });

$('#addTl').onclick = () => {
  const p = toWorld({ clientX: innerWidth / 2, clientY: innerHeight * .8 }), x0 = p.x - 500;
  const bar = document.createElement('div'); bar.className = 'tl';
  bar.style.cssText = `left:${x0 - 60}px;top:${p.y + 40}px;width:1220px`; world.appendChild(bar);
  ['1 Gün Önce', 'Olay Günü', 'Cinayet Anı'].forEach((l, i) =>
    addCard('tick', null, [x0 + i * 500, p.y]).querySelector('div:not(.pin)').textContent = l);
  select(null); save();
};

/* ---------- Büyüteç ---------- */
const lens = $('#lens'), lw = $('#lw'); let lensOn = false;
function lensRefresh() {
  if (!lensOn) return;
  lw.innerHTML = ''; const c = world.cloneNode(true); c.removeAttribute('id'); c.className = 'wc'; c.style.transform = 'none';
  const im = new Image(); im.src = cv.toDataURL(); im.style.cssText = 'position:absolute;left:0;top:0;z-index:3';
  c.querySelector('#draw').replaceWith(im);
  c.querySelectorAll('.sel,.from').forEach(n => n.classList.remove('sel', 'from')); lw.appendChild(c);
}
$('#lensBtn').onclick = e => { lensOn = !lensOn; e.target.classList.toggle('on', lensOn); lens.hidden = !lensOn; lensRefresh(); };
addEventListener('pointermove', e => {
  if (!lensOn) return;
  const p = toWorld(e), s = v.k * 2.5;
  lens.style.left = e.clientX - 130 + 'px'; lens.style.top = e.clientY - 130 + 'px';
  lw.style.transform = `translate(${130 - p.x * s}px,${130 - p.y * s}px) scale(${s})`;
});

/* ---------- Kayıt (otomatik + JSON) ---------- */
const KEY = 'kanit-panosu-v1', items = () => [...world.querySelectorAll(':scope > .card, :scope > .stamp, :scope > .tl')];
function snapshot() {
  const els = items();
  return { html: els.map(e => { const c = e.cloneNode(true); c.classList.remove('sel', 'from', 'dim'); return c.outerHTML; }),
    threads: threads.map(t => ({ a: els.indexOf(t.a), b: els.indexOf(t.b), color: t.color, label: t.label || '' })), draw: cv.toDataURL() };
}
function restore(d) {
  items().forEach(e => e.remove());
  const h = document.createElement('div'); h.innerHTML = d.html.join(''); const els = [...h.children];
  els.forEach(e => { world.appendChild(e); if (e.classList.contains('card')) ensure(e); });
  threads = d.threads.filter(t => els[t.a] && els[t.b]).map(t => ({ a: els[t.a], b: els[t.b], color: t.color, label: t.label }));
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.clearRect(0, 0, 4000, 3000);
  if (d.draw) { const im = new Image(); im.onload = () => ctx.drawImage(im, 0, 0); im.src = d.draw; }
  sel = null; drawThreads(); legend();
}
let st;
function save() { legend(); clearTimeout(st); st = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(snapshot())); } catch (e) {} lensRefresh(); }, 600); }
addEventListener('pointerup', save); addEventListener('input', save);
$('#saveJson').onclick = () => { const a = document.createElement('a'); a.download = 'pano.json';
  a.href = URL.createObjectURL(new Blob([JSON.stringify(snapshot())], { type: 'application/json' })); a.click(); };
$('#openJson').onclick = () => $('#jsonFile').click();
$('#jsonFile').onchange = e => { const f = e.target.files[0]; if (!f) return;
  f.text().then(t => { restore(JSON.parse(t)); save(); }).catch(() => alert('Geçersiz proje dosyası.')); e.target.value = ''; };

/* ---------- PNG / PDF dışa aktarma (300 DPI) ---------- */
$('#png').onclick = async () => {
  if (!window.html2canvas) return alert('Dışa aktarma kütüphanesi yüklenemedi. İnternet bağlantınızı kontrol edin.');
  const f = $('#fmt').value, P = { A4: [297, 210], A3: [420, 297], POSTER: [1000, 700] }[f];   // mm, yatay
  const sc = P ? Math.min(P[0] / 25.4 * 300 / 4000, P[1] / 25.4 * 300 / 3000) : +f.slice(3);
  select(null); flt = null; legend(); const old = world.style.transform; world.style.transform = 'none';
  try {
    const c = await html2canvas(world, { scale: sc, backgroundColor: null, useCORS: true });
    if (!P) { const a = document.createElement('a'); a.download = 'kanit-panosu.png'; a.href = c.toDataURL('image/png'); a.click(); }
    else {
      const d = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: P }), w = 4000 * sc / 300 * 25.4, h = 3000 * sc / 300 * 25.4;
      d.setFillColor(58, 42, 28); d.rect(0, 0, P[0], P[1], 'F');
      d.addImage(c.toDataURL('image/jpeg', .92), 'JPEG', (P[0] - w) / 2, (P[1] - h) / 2, w, h); d.save(`kanit-panosu-${f}.pdf`);
    }
  } catch (e) { alert('Dışa aktarma başarısız oldu. Poster boyutu tarayıcı belleğini aşmış olabilir; A3 veya PNG 2x dene.'); }
  finally { world.style.transform = old; }
};

/* ---------- Boyut, sınıf, doku ---------- */
const CATS = { 'Şüpheli': '#c1121f', 'Mekan': '#1d6fb8', 'Delil': '#2a7f3e', 'Tanık': '#d9730d', 'Zaman': '#7b3fa0', 'Diğer': '#555' };
const DEF = { pol: 'Şüpheli', note: 'Tanık', news: 'Delil', doc: 'Delil', tick: 'Zaman' };
let flt = null;
const tf = c => c.style.transform = `rotate(${c.dataset.r || 0}deg) scale(${c.dataset.s || 1})`;

function ensure(c) {
  if (!c.querySelector('.rz')) { const z = document.createElement('div'); z.className = 'rz'; c.appendChild(z); }
  let t = c.querySelector('.tag');
  if (!t) { t = document.createElement('div'); t.className = 'tag'; c.appendChild(t); }
  const k = CATS[c.dataset.cat] ? c.dataset.cat : 'Diğer';
  t.textContent = k; t.style.background = CATS[k];
}
function startResize(e, c) {
  e.preventDefault(); const x0 = e.clientX, s0 = +c.dataset.s || 1, w = c.offsetWidth;
  const mv = m => { c.dataset.s = Math.min(3, Math.max(.4, s0 + (m.clientX - x0) / v.k / w)).toFixed(2); tf(c); drawThreads(); };
  const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); };
  addEventListener('pointermove', mv); addEventListener('pointerup', up);
}
function nudge(ds, dr) {
  if (!sel) return;
  sel.dataset.s = Math.min(3, Math.max(.4, (+sel.dataset.s || 1) + ds)).toFixed(2); sel.dataset.r = (+sel.dataset.r || 0) + dr;
  tf(sel); drawThreads(); save();
}
$('#bigger').onclick = () => nudge(.1, 0); $('#smaller').onclick = () => nudge(-.1, 0);
addEventListener('keydown', e => {
  if (e.target.isContentEditable || !sel) return;
  ({ '+': () => nudge(.1, 0), '=': () => nudge(.1, 0), '-': () => nudge(-.1, 0), '[': () => nudge(0, -3), ']': () => nudge(0, 3) })[e.key]?.();
});

function syncCat() { const s = $('#cat'); s.disabled = !sel; if (sel) s.value = CATS[sel.dataset.cat] ? sel.dataset.cat : 'Diğer'; }
$('#cat').onchange = e => { if (sel) { sel.dataset.cat = e.target.value; ensure(sel); legend(); save(); } };
function legend() {
  const n = {}; world.querySelectorAll(':scope > .card').forEach(c => { const k = c.dataset.cat || 'Diğer'; n[k] = (n[k] || 0) + 1; });
  $('#legend').innerHTML = Object.keys(CATS).map(k => `<button data-k="${k}" class="${flt === k ? 'on' : ''}"><i style="background:${CATS[k]}"></i>${k}<em>${n[k] || 0}</em></button>`).join('');
  world.querySelectorAll(':scope > .card').forEach(c => c.classList.toggle('dim', !!flt && (c.dataset.cat || 'Diğer') !== flt));
}
$('#legend').onclick = e => { const b = e.target.closest('button'); if (b) { flt = flt === b.dataset.k ? null : b.dataset.k; legend(); } };

/* Metne ilk tıklamada tüm yazı seçilir: tek tuşla silinir ya da üstüne yazılır */
world.addEventListener('focusin', e => {
  const t = e.target; if (!t.isContentEditable || t.dataset.d) return;
  setTimeout(() => { const r = document.createRange(); r.selectNodeContents(t); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }, 0);
});
world.addEventListener('input', e => { if (e.target.isContentEditable) e.target.dataset.d = 1; });

/* ---------- Başlangıç ---------- */
try { const d = JSON.parse(localStorage.getItem(KEY)); if (d) restore(d); else throw 0; } catch (e) { addCard('news'); addCard('note'); }
