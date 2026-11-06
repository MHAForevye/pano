'use strict';
const $ = s => document.querySelector(s);
const view = $('#view'), world = $('#world'), svg = $('#strings'), cv = $('#draw'), ctx = cv.getContext('2d');
const NS = 'http://www.w3.org/2000/svg';
const T = { pol: '<div class="pin"></div><img alt=""><div class="cap" contenteditable spellcheck="false">Başlık</div>',
  note: '<div class="pin"></div><div contenteditable spellcheck="false">Aklında tut: önemli fikir</div>',
  news: '<div class="pin"></div><h3 contenteditable spellcheck="false">MANŞET BURADA</h3><p contenteditable spellcheck="false">Metni buraya yazın: ders özeti, haber, bilgi... Başlığı ve metni istediğiniz gibi değiştirebilirsiniz.</p>' };

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
  if (e.target.classList.contains('xdel')) return removeCard(e.target.parentNode);
  if (e.target.classList.contains('rz')) return startResize(e, e.target.parentNode);
  if (e.target.classList.contains('rt')) return startRotate(e, e.target.parentNode);
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
function geom(t) {
  const a = pin(t.a), b = pin(t.b), sag = Math.min(260, Math.hypot(b.x - a.x, b.y - a.y) * .22);
  return { a, b, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 + sag };
}
const ptOn = (g, p) => ({ x: (1 - p) ** 2 * g.a.x + 2 * p * (1 - p) * g.cx + p * p * g.b.x, y: (1 - p) ** 2 * g.a.y + 2 * p * (1 - p) * g.cy + p * p * g.b.y });
const el = n => document.createElementNS(NS, n), at = (e, o) => { for (const k in o) e.setAttribute(k, o[k]); return e; };

function editLabel(t) {
  world.querySelectorAll('.ted').forEach(n => n.remove());
  const q = ptOn(geom(t), t.p ?? .5), d = document.createElement('div'), i = document.createElement('input'), x = document.createElement('button');
  d.className = 'ted'; d.style.left = q.x + 'px'; d.style.top = q.y + 'px';
  i.value = t.label || ''; i.maxLength = 40; i.placeholder = 'Etiket yaz…'; x.textContent = '🗑'; x.title = 'İpi sil';
  let done = false;
  const end = del => { if (done) return; done = true; if (del) { const k = threads.indexOf(t); if (k >= 0) threads.splice(k, 1); } else t.label = i.value.trim(); d.remove(); drawThreads(); save(); };
  i.onkeydown = e => { if (e.key === 'Enter') end(); if (e.key === 'Escape') { done = true; d.remove(); } };
  i.onblur = () => end(); x.onpointerdown = e => { e.preventDefault(); e.stopPropagation(); end(true); };
  d.append(i, x); world.appendChild(d); i.focus(); i.select();
}

function drawThreads() {
  svg.innerHTML = '';
  threads.forEach((t, idx) => {
    const G = geom(t), { a, b, cx, cy } = G;
    const p = el('path'); at(p, { d: `M${a.x} ${a.y} Q${cx} ${cy} ${b.x} ${b.y}`, stroke: t.color, 'stroke-width': 4 });
    p.onclick = e => { if (e.shiftKey) { threads.splice(threads.indexOf(t), 1); drawThreads(); save(); } else editLabel(t); };
    svg.appendChild(p);
    if (!t.label) return;
    const q = ptOn(G, t.p ?? .5), g = el('g'), x = el('text');
    at(g, { class: 'lbl', transform: `translate(${q.x} ${q.y}) rotate(${(idx * 37) % 7 - 3})` });
    at(x, { 'text-anchor': 'middle', y: 6, 'font-size': 19, fill: '#1d3557', 'font-family': '"Segoe Print","Bradley Hand","Comic Sans MS",cursive', 'font-weight': 700 });
    x.textContent = t.label; g.appendChild(x); svg.appendChild(g);
    const w = x.getComputedTextLength() + 30;
    const paper = at(el('rect'), { x: -w / 2, y: -18, width: w, height: 34, rx: 2, fill: '#fffbe6', stroke: '#d8c98a' });
    const tape = at(el('rect'), { x: -24, y: -27, width: 48, height: 15, fill: 'rgba(235,215,140,.8)', transform: 'rotate(-4)' });
    const cx2 = at(el('circle'), { class: 'lx', cx: w / 2, cy: -18, r: 9, fill: '#c1121f', stroke: '#fff', 'stroke-width': 2 });
    const cx3 = at(el('text'), { class: 'lx', x: w / 2, y: -14, 'text-anchor': 'middle', 'font-size': 11, fill: '#fff', 'font-weight': 700, 'pointer-events': 'none' }); cx3.textContent = '✕';
    cx2.onclick = e => { e.stopPropagation(); threads.splice(threads.indexOf(t), 1); drawThreads(); save(); };
    g.insertBefore(paper, x); g.insertBefore(tape, x); g.append(cx2, cx3);
    g.onpointerdown = e => {                                   // sürükle: ip boyunca kaydır, tıkla: düzenle
      if (e.target.classList.contains('lx')) return; e.preventDefault(); e.stopPropagation();
      let moved = false; const sx = e.clientX, sy = e.clientY;
      const mv = m => {
        if (!moved && Math.hypot(m.clientX - sx, m.clientY - sy) < 5) return; moved = true;
        const w2 = toWorld(m), GG = geom(t); let best = .5, bd = 1e18;
        for (let s = .05; s <= .95; s += .01) { const P = ptOn(GG, s), d = (P.x - w2.x) ** 2 + (P.y - w2.y) ** 2; if (d < bd) { bd = d; best = s; } }
        t.p = best; drawThreads();
      };
      const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); if (moved) save(); else editLabel(t); };
      addEventListener('pointermove', mv); addEventListener('pointerup', up);
    };
  });
}

/* ---------- Kalem ---------- */
cv.addEventListener('pointerdown', e => {
  if (!['pen', 'marker', 'eraser'].includes(mode)) return;
  const m = mode === 'marker', er = mode === 'eraser';
  ctx.strokeStyle = $('#color').value; const sz = +$('#size').value; ctx.lineWidth = er ? sz * 10 : m ? sz * 6 : sz; ctx.lineCap = ctx.lineJoin = 'round';
  ctx.globalAlpha = m ? .4 : 1; ctx.globalCompositeOperation = er ? 'destination-out' : 'source-over';
  let l = toWorld(e); cv.setPointerCapture(e.pointerId);
  const mv = ev => { const q = toWorld(ev); ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(q.x, q.y); ctx.stroke(); l = q; };
  const up = () => { cv.removeEventListener('pointermove', mv); cv.removeEventListener('pointerup', up); };
  cv.addEventListener('pointermove', mv); cv.addEventListener('pointerup', up);
});

/* ---------- Kalem imleci (görsel) ---------- */
function updateCursor() {
  const c = $('#color').value, o = 'stroke="#222" stroke-width="1.4" stroke-linejoin="round"';
  const S = {
    pen: [`<polygon points="2,30 6,20 12,26" fill="#f1d9a8" ${o}/><polygon points="2,30 4,25 7,28" fill="${c}" ${o}/><polygon points="6,20 22,4 28,10 12,26" fill="${c}" ${o}/><polygon points="22,4 25,1 31,7 28,10" fill="#f4a6b6" ${o}/>`, 2, 30],
    marker: [`<polygon points="2,30 5,22 10,27" fill="${c}" ${o}/><polygon points="5,22 21,6 27,12 10,27" fill="#444" ${o}/><polygon points="21,6 24,3 30,9 27,12" fill="${c}" ${o}/>`, 2, 30],
    eraser: [`<rect x="5" y="12" width="22" height="16" rx="3" fill="#f4a6b6" ${o}/><rect x="5" y="12" width="9" height="16" rx="3" fill="#fff" ${o}/>`, 16, 20]
  }[mode];
  cv.style.cursor = S ? `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">${S[0]}</svg>`)}") ${S[1]} ${S[2]}, crosshair` : '';
}
$('#color').addEventListener('input', updateCursor);

/* ---------- Araç çubuğu ---------- */
function setMode(m) {
  mode = m; document.body.dataset.m = m;
  document.querySelectorAll('#modes button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
  if (from) { from.classList.remove('from'); from = null; }
  updateCursor();
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
  if (e.target.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
  const k = { v: 'select', t: 'thread', p: 'pen', m: 'marker', e: 'eraser', s: 'stamp' }[e.key.toLowerCase()];
  if (k) setMode(k);
  if ((e.key === 'Delete' || e.key === 'Backspace') && sel) removeCard(sel);
});

/* ---------- Mühür, belge, zaman çizelgesi ---------- */
Object.assign(T, {
  doc: '<div class="pin"></div><div contenteditable spellcheck="false"><b>DERS NOTU</b><br>Konu: ...<br>• Madde 1<br>• Madde 2<br>• Madde 3</div>',
  tick: '<div class="pin"></div><div contenteditable spellcheck="false">Etiket</div>' });
$('#addDoc').onclick = () => addCard('doc');

function addX(e) { if (!e.querySelector('.sx')) { const x = document.createElement('span'); x.className = 'sx'; x.textContent = '✕'; x.title = 'Sil'; e.appendChild(x); } }
world.addEventListener('click', e => { if (e.target.classList.contains('sx')) { e.target.parentNode.remove(); save(); } });
function stampAt(e) {
  const host = e.target.closest('.card') || world, s = document.createElement('div');
  s.className = 'stamp'; s.textContent = $('#stampType').value;
  let x, y;
  if (host === world) ({ x, y } = toWorld(e));
  else { const r = host.getBoundingClientRect(); x = (e.clientX - r.left) / v.k; y = (e.clientY - r.top) / v.k; }
  s.style.left = x + 'px'; s.style.top = y + 'px'; addX(s); host.appendChild(s); save();
}
world.addEventListener('dblclick', e => { const s = e.target.closest('.stamp'); if (s) { s.remove(); save(); } });

$('#addTl').onclick = () => {
  const p = toWorld({ clientX: innerWidth / 2, clientY: innerHeight * .8 }), x0 = p.x - 500;
  const bar = document.createElement('div'); bar.className = 'tl';
  bar.style.cssText = `left:${x0 - 60}px;top:${p.y + 40}px;width:1220px`; addX(bar); world.appendChild(bar);
  ['Başlangıç', 'Gelişme', 'Sonuç'].forEach((l, i) =>
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
const KEY = 'mantar-pano-v2', items = () => [...world.querySelectorAll(':scope > .card, :scope > .stamp, :scope > .tl')];
function snapshot() {
  const els = items();
  return { html: els.map(e => { const c = e.cloneNode(true); c.classList.remove('sel', 'from', 'dim'); return c.outerHTML; }),
    threads: threads.map(t => ({ a: els.indexOf(t.a), b: els.indexOf(t.b), color: t.color, label: t.label || '', p: t.p })), draw: cv.toDataURL() };
}
function restore(d) {
  items().forEach(e => e.remove());
  const h = document.createElement('div'); h.innerHTML = d.html.join(''); const els = [...h.children];
  els.forEach(e => { world.appendChild(e); if (e.matches('.stamp,.tl')) addX(e); e.querySelectorAll('.stamp').forEach(addX); if (e.classList.contains('card')) ensure(e); });
  threads = d.threads.filter(t => els[t.a] && els[t.b]).map(t => ({ a: els[t.a], b: els[t.b], color: t.color, label: t.label, p: t.p }));
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.clearRect(0, 0, 4000, 3000);
  if (d.draw) { const im = new Image(); im.onload = () => ctx.drawImage(im, 0, 0); im.src = d.draw; }
  sel = null; drawThreads(); legend();
}
let st;
function save() { legend(); clearTimeout(st); st = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(snapshot())); } catch (e) {} lensRefresh(); }, 600); }
addEventListener('pointerup', save); addEventListener('input', save);
$('#saveJson').onclick = () => { const a = document.createElement('a'); a.download = 'mantar-pano.json';
  a.href = URL.createObjectURL(new Blob([JSON.stringify(snapshot())], { type: 'application/json' })); a.click(); };
$('#openJson').onclick = () => $('#jsonFile').click();
$('#jsonFile').onchange = e => { const f = e.target.files[0]; if (!f) return;
  f.text().then(t => { restore(JSON.parse(t)); save(); }).catch(() => alert('Geçersiz proje dosyası.')); e.target.value = ''; };

/* ---------- PNG / PDF dışa aktarma ---------- */
function bounds() {
  const W = 4000, H = 3000, w0 = world.getBoundingClientRect();
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  const add = (a, b, c, d) => { x0 = Math.min(x0, a); y0 = Math.min(y0, b); x1 = Math.max(x1, c); y1 = Math.max(y1, d); };
  items().forEach(e => { const r = e.getBoundingClientRect(); add(r.left - w0.left, r.top - w0.top, r.right - w0.left, r.bottom - w0.top); });
  try { const b = svg.getBBox(); if (b.width) add(b.x, b.y, b.x + b.width, b.y + b.height); } catch (e) {}
  const d = ctx.getImageData(0, 0, W, H).data;           // çizimlerin kapladığı alan
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (d[(y * W + x) * 4 + 3]) add(x, y, x + 2, y + 2);
  if (x0 > x1) return { x: 0, y: 0, w: W, h: H };
  const p = 90; x0 = Math.max(0, x0 - p); y0 = Math.max(0, y0 - p); x1 = Math.min(W, x1 + p); y1 = Math.min(H, y1 + p);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
$('#png').onclick = async () => {
  if (!window.html2canvas) return alert('Dışa aktarma kütüphanesi yüklenemedi. İnternet bağlantınızı kontrol edin.');
  const f = $('#fmt').value, n = +$('#split').value, M0 = 6, P = { A4: [297, 210], A3: [420, 297], POSTER: [1000, 700] }[f];
  select(null); flt = null; legend(); const old = world.style.transform; world.style.transform = 'none'; const baked = [];
  try {
    if ('filter' in ctx) for (const im of world.querySelectorAll('.polaroid img')) {
      if (!im.src || !im.naturalWidth) continue;
      const k = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas'), x = c.getContext('2d');
      c.width = im.naturalWidth * k; c.height = im.naturalHeight * k; x.filter = FIL(im.closest('.card').dataset.br || 100); x.drawImage(im, 0, 0, c.width, c.height);
      baked.push([im, im.src, im.style.filter]); im.src = c.toDataURL('image/jpeg', .92); im.style.filter = 'none'; await im.decode().catch(() => {});
    }
    let b = $('#fit').checked ? bounds() : { x: 0, y: 0, w: 4000, h: 3000 }, pw, ph;
    const M = P ? M0 : 0, Q = P || (n > 1 ? [297, 210] : null);   // PNG bölmede de A4 oranı
    if (Q) {                                              // içeriğe göre yatay/dikey, sayfa oranına genişlet
      const land = b.w >= b.h; pw = land ? Q[0] : Q[1]; ph = land ? Q[1] : Q[0];
      const A = (pw - 2 * M) / (ph - 2 * M), cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      if (b.w / b.h < A) b.w = b.h * A; else b.h = b.w / A;
      b.x = b.w <= 4000 ? Math.min(Math.max(cx - b.w / 2, 0), 4000 - b.w) : cx - b.w / 2;
      b.y = b.h <= 3000 ? Math.min(Math.max(cy - b.h / 2, 0), 3000 - b.h) : cy - b.h / 2;
    }
    const sc = P ? Math.min(2, n * (pw - 2 * M) / 25.4 * 300 / b.w) : n > 1 ? Math.min(2.5, Math.max(+f.slice(3), n * 2480 / b.w)) : +f.slice(3);
    const big = await html2canvas(world, { scale: sc, backgroundColor: null, useCORS: true });
    const rw = Math.round(b.w * sc), rh = Math.round(b.h * sc), out = document.createElement('canvas');
    out.width = rw; out.height = rh; const o = out.getContext('2d');
    o.fillStyle = '#3a2a1c'; o.fillRect(0, 0, rw, rh); o.drawImage(big, -b.x * sc, -b.y * sc, 4000 * sc, 3000 * sc);
    if (!P) {                                             // PNG: her parça ayrı dosya
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        const t = document.createElement('canvas'); t.width = Math.round(rw / n); t.height = Math.round(rh / n);
        t.getContext('2d').drawImage(out, -c * rw / n, -r * rh / n);
        const a = document.createElement('a'); a.download = n > 1 ? `mantar-pano-parca-${r * n + c + 1}-${n * n}.png` : 'mantar-pano.png';
        a.href = t.toDataURL('image/png'); a.click(); await new Promise(z => setTimeout(z, 600));
      }
      return;
    }
    const d = new window.jspdf.jsPDF({ orientation: pw > ph ? 'landscape' : 'portrait', unit: 'mm', format: [pw, ph] }), tw = rw / n, th = rh / n;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const t = document.createElement('canvas'); t.width = Math.round(tw); t.height = Math.round(th);
      t.getContext('2d').drawImage(out, -c * tw, -r * th);
      if (r || c) d.addPage([pw, ph], pw > ph ? 'landscape' : 'portrait');
      d.addImage(t.toDataURL('image/jpeg', .92), 'JPEG', M, M, pw - 2 * M, ph - 2 * M);
      if (n > 1) { d.setFontSize(8); d.setTextColor(120); d.text(`Sayfa ${r * n + c + 1}/${n * n}  (satır ${r + 1}, sütun ${c + 1})`, M, M - 2); }
    }
    d.save(`mantar-pano-${f}${n > 1 ? '-' + n * n + 'sayfa' : ''}.pdf`);
  } catch (e) { alert('Dışa aktarma başarısız oldu. Bellek aşılmış olabilir; daha küçük bir boyut dene.'); }
  finally { baked.forEach(([im, s0, f]) => { im.src = s0; im.style.filter = f; }); world.style.transform = old; }
};

/* ---------- Boyut, sınıf, doku ---------- */
const CATS = { 'Önemli': '#c1121f', 'Fikir': '#d9730d', 'Soru': '#1d6fb8', 'Örnek': '#2a7f3e', 'Tarih': '#7b3fa0', 'Diğer': '#555' };
const DEF = { pol: 'Örnek', note: 'Fikir', news: 'Önemli', doc: 'Önemli', tick: 'Tarih' };
let flt = null;
const tf = c => c.style.transform = `rotate(${c.dataset.r || 0}deg) scale(${c.dataset.s || 1})`;

function ensure(c) {
  if (!c.querySelector('.rt')) { const r = document.createElement('div'); r.className = 'rt'; r.textContent = '↻'; r.title = 'Döndür (Shift: 15° adım)'; c.appendChild(r); }
  if (!c.querySelector('.xdel')) { const x = document.createElement('div'); x.className = 'xdel'; x.textContent = '✕'; x.title = 'Sil'; c.appendChild(x); }
  if (!c.querySelector('.rz')) { const z = document.createElement('div'); z.className = 'rz'; c.appendChild(z); }
  let t = c.querySelector('.tag');
  if (!t) { t = document.createElement('div'); t.className = 'tag'; c.appendChild(t); }
  const k = c.dataset.cat || 'Diğer';
  t.contentEditable = 'true'; t.spellcheck = false; t.textContent = k; t.style.background = c.dataset.cc || CATS[k] || '#555';
}
function startResize(e, c) {
  e.preventDefault(); const x0 = e.clientX, s0 = +c.dataset.s || 1, w = c.offsetWidth;
  const mv = m => { c.dataset.s = Math.min(3, Math.max(.4, s0 + (m.clientX - x0) / v.k / w)).toFixed(2); tf(c); drawThreads(); };
  const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); };
  addEventListener('pointermove', mv); addEventListener('pointerup', up);
}
function startRotate(e, c) {
  e.preventDefault(); select(c);
  const mv = m => {
    const q = toWorld(m), px = c.offsetLeft + c.offsetWidth / 2, py = c.offsetTop;
    let a = Math.atan2(q.x - px, -(q.y - py)) * 180 / Math.PI; if (m.shiftKey) a = Math.round(a / 15) * 15;
    c.dataset.r = a.toFixed(1); tf(c); syncRot(); drawThreads();
  };
  const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); };
  addEventListener('pointermove', mv); addEventListener('pointerup', up);
}
function syncRot() { const r = $('#rot'); r.disabled = !sel; r.value = sel ? ((((+sel.dataset.r || 0) + 180) % 360 + 360) % 360) - 180 : 0; }
$('#rot').oninput = e => { if (sel) { sel.dataset.r = e.target.value; tf(sel); drawThreads(); } };
$('#rot0').onclick = () => { if (sel) { sel.dataset.r = 0; tf(sel); syncRot(); drawThreads(); save(); } };
function nudge(ds, dr) {
  if (!sel) return;
  sel.dataset.s = Math.min(3, Math.max(.4, (+sel.dataset.s || 1) + ds)).toFixed(2); sel.dataset.r = (+sel.dataset.r || 0) + dr;
  tf(sel); syncRot(); drawThreads(); save();
}
$('#bigger').onclick = () => nudge(.1, 0); $('#smaller').onclick = () => nudge(-.1, 0);
addEventListener('keydown', e => {
  if (e.target.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) || !sel) return;
  ({ '+': () => nudge(.1, 0), '=': () => nudge(.1, 0), '-': () => nudge(-.1, 0), '[': () => nudge(0, -3), ']': () => nudge(0, 3) })[e.key]?.();
});

const FIL = b => `brightness(${b}%) contrast(1.05) saturate(.85) sepia(.12)`;
function syncBr() { const r = $('#bright'), im = sel && sel.querySelector('img'); r.disabled = !im; r.value = im ? (sel.dataset.br || 100) : 100; }
$('#bright').oninput = e => { const im = sel && sel.querySelector('img'); if (!im) return; sel.dataset.br = e.target.value; im.style.filter = FIL(e.target.value); };
function syncCat() { syncBr();
  syncRot(); const s = $('#cat'), cc = $('#catColor'); s.disabled = cc.disabled = !sel;
  if (sel) { const k = sel.dataset.cat || 'Diğer'; s.value = k; cc.value = sel.dataset.cc || CATS[k] || '#555555'; }
}
$('#cat').oninput = e => { if (!sel) return; const k = e.target.value.trim() || 'Diğer'; sel.dataset.cat = k; if (!sel.dataset.cc) $('#catColor').value = CATS[k] || '#555555'; ensure(sel); legend(); save(); };
$('#catColor').oninput = e => { if (sel) { sel.dataset.cc = e.target.value; ensure(sel); legend(); save(); } };
world.addEventListener('input', e => {                       // etiketi doğrudan kart üzerinde yazma
  if (!e.target.classList.contains('tag')) return;
  const c = e.target.parentNode, k = e.target.textContent.trim() || 'Diğer'; c.dataset.cat = k;
  if (!c.dataset.cc) e.target.style.background = CATS[k] || '#555'; $('#cat').value = k; legend();
});
world.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.classList.contains('tag')) { e.preventDefault(); e.target.blur(); } });
function legend() {
  const cards = [...world.querySelectorAll(':scope > .card')], n = {}, col = {}, L = $('#legend');
  cards.forEach(c => { const k = c.dataset.cat || 'Diğer'; n[k] = (n[k] || 0) + 1; col[k] = col[k] || c.dataset.cc || CATS[k] || '#555'; });
  L.textContent = '';
  [...new Set([...Object.keys(CATS), ...Object.keys(n)])].forEach(k => {
    const b = document.createElement('button'), i = document.createElement('i'), m = document.createElement('em');
    b.dataset.k = k; b.className = flt === k ? 'on' : ''; i.style.background = col[k] || CATS[k] || '#555'; m.textContent = n[k] || 0;
    b.append(i, k, m); L.appendChild(b);
  });
  cards.forEach(c => c.classList.toggle('dim', !!flt && (c.dataset.cat || 'Diğer') !== flt));
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
updateCursor();
