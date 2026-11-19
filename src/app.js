/* ZERO RISE — Talk Today. English only.
   Drill, Find, Speak, Match. Coins move only after a real correct answer.
   Recorded English cues (l_), slow words (s_), words (w_), questions (f_). */
'use strict';

const CFG = {
  API: localStorage.getItem('ttzr4_api') || 'https://script.google.com/macros/s/AKfycbxfpqk1dZHafL62IxuPGJARi0EWk-2LW8JIhvEAXO39lOOWWZZZ3VzvkiIyT12FM7jddg/exec',
  ASSET: 'v3/'
};

const $ = id => document.getElementById(id);
const LEARNER = { id: 'jamalmorelli', name: 'Jamal Morelli' };
const stage = $('stage');
const sheet = $('sheet');
const sheetCard = $('sheetCard');
const live = $('live');

let S = TT.migrate((() => { try { return JSON.parse(localStorage.getItem('ttzr4_state') || 'null'); } catch (e) { return null; } })());
S.id = LEARNER.id;
S.name = LEARNER.name;
if (!S.session) S.session = 's' + TT.newId(Math.random).slice(0, 8);
try { localStorage.setItem('ttzr4_state', JSON.stringify(S)); } catch (e) {}
(function readQuery() {
  const q = new URLSearchParams(location.search);
  if (q.get('api')) { CFG.API = q.get('api'); localStorage.setItem('ttzr4_api', CFG.API); }
  if (q.get('cls')) S.cls = String(q.get('cls')).replace(/[^\w .|+-]/g, '').slice(0, 40);
})();

function save(push) {
  try { localStorage.setItem('ttzr4_state', JSON.stringify(S)); } catch (e) {}
  renderHUD();
  if (push !== false) syncSoon();
}
function mOf(word) {
  if (!S.mastery[word]) S.mastery[word] = TT.blankMastery();
  return S.mastery[word];
}
/* Coins only when a real level goes up. Repeating a word pays nothing. */
function noteTap(word, correct) {
  const m = mOf(word);
  const before = TT.levelOf(m);
  m.taps++;
  if (correct) { m.ok++; m.heard++; }
  const after = TT.levelOf(m);
  if (correct) m.next = Date.now() + TT.delayMs(after);
  let gained = 0;
  if (correct && before < 1 && after >= 1) gained += 1;
  if (correct && before < 2 && after >= 2) gained += 1;
  return { m: m, before: before, after: after, gained: gained };
}
function pay(n) {
  if (n > 0) { sfxCoin(); coinRain(); earn(n); }
  else save();
}
function showTeach(word) {
  const plate = $('wordPlate');
  const line = $('sentenceLine');
  const mean = $('meaningLine');
  if (plate) plate.textContent = word;
  if (line) line.textContent = TT.sentence(word);
  if (mean) mean.textContent = TT.useLine(word);
}
function clearTeach() {
  const mean = $('meaningLine');
  if (mean) mean.textContent = '';
}
function curSet() { return TT.setById(S.setId); }
function setPrompt(text) {
  if (live) live.textContent = text;
}

/* ---------- audio: one voice at a time ---------- */
let seq = 0;
let talking = [];
function stopTalk() {
  seq++;
  endKind('voice');
  talking.forEach(a => { try { a.pause(); a.src = ''; } catch (e) {} });
  talking = [];
}
function playUrls(urls) {
  if (!S.soundOn || !urls.length) return Promise.resolve();
  const my = ++seq;
  talking.forEach(a => { try { a.pause(); } catch (e) {} });
  talking = [];
  endKind('voice');
  const job = beginLoad(null, 'voice');
  return new Promise(resolve => {
    let i = 0;
    const total = urls.length;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      endLoad(job);
      resolve();
    };
    const step = () => {
      if (my !== seq) return finish();
      if (i >= total) return finish();
      const index = i;
      const a = new Audio(CFG.ASSET + urls[i++]);
      a.preload = 'auto';
      talking.push(a);
      let moved = false;
      const next = () => { if (moved) return; moved = true; step(); };
      const tick = () => {
        if (my !== seq) return;
        const d = a.duration;
        const part = d && isFinite(d) && d > 0 ? Math.min(1, a.currentTime / d) : 0;
        setLoad(job, (index + part) / total);
      };
      a.ontimeupdate = tick;
      a.onloadedmetadata = tick;
      a.onended = next;
      a.onerror = next;
      const started = a.play();
      if (started && started.catch) started.catch(next);
    };
    step();
  });
}
let loads = [];
let loadN = 0;
function paintLoad() {
  const el = $('load');
  const bar = $('loadBar');
  if (!el || !bar) return;
  if (!loads.length) {
    el.classList.remove('on', 'busy');
    bar.style.width = '0%';
    return;
  }
  el.classList.add('on');
  const known = loads.filter(x => x.p >= 0);
  if (known.length) {
    el.classList.remove('busy');
    const p = known.reduce((sum, x) => sum + x.p, 0) / known.length;
    bar.style.width = Math.max(0, Math.min(100, p * 100)) + '%';
  } else {
    el.classList.add('busy');
    bar.style.width = '36%';
  }
}
function beginLoad(p, kind) {
  const id = ++loadN;
  loads.push({ id: id, p: p == null ? -1 : p, kind: kind || '' });
  paintLoad();
  return id;
}
function setLoad(id, p) {
  for (let i = 0; i < loads.length; i++) if (loads[i].id === id) loads[i].p = p;
  paintLoad();
}
function endLoad(id) {
  loads = loads.filter(x => x.id !== id);
  paintLoad();
}
function endKind(kind) {
  loads = loads.filter(x => x.kind !== kind);
  paintLoad();
}
function watchImages(root) {
  if (!root) return;
  const pending = [...root.querySelectorAll('img')].filter(img => !img.complete);
  if (!pending.length) return;
  const job = beginLoad(0, 'img');
  let done = 0;
  const tick = () => {
    done++;
    setLoad(job, done / pending.length);
    if (done >= pending.length) endLoad(job);
  };
  pending.forEach(img => {
    img.addEventListener('load', tick, { once: true });
    img.addEventListener('error', tick, { once: true });
  });
}
function file(kind, word) { return 'audio/' + kind + '_' + word + '.mp3'; }
function cue(name) { return 'audio/l_' + name + '.mp3'; }
function voiceClip(word) { return file(TT.hasQuestion(word) ? 'f' : 'w', word); }

const fx = $('fx');
const fxc = fx.getContext('2d');
let sparks = [];
let liveStops = [];
let voices = 0;
let lastBounce = 0;
let noiseBuf = null;
const WORLD_INK = {
  home: ['#fde68a', '#fb923c', '#fff7ed', '#f59e0b'],
  outside: ['#bbf7d0', '#4ade80', '#ecfccb', '#86efac'],
  class: ['#bfdbfe', '#60a5fa', '#fff', '#22d3ee'],
  food: ['#fed7aa', '#fb923c', '#fff', '#fde047'],
  play: ['#f5d0fe', '#e879f9', '#fff', '#f472b6'],
  tech: ['#a5f3fc', '#22d3ee', '#fff', '#67e8f9'],
  city: ['#fde68a', '#facc15', '#fff', '#f59e0b'],
  town: ['#fecdd3', '#fb7185', '#fff', '#fda4af']
};
function ink() {
  const id = curSet().id;
  return WORLD_INK[id] || WORLD_INK.food;
}
function sizeFx() {
  const r = fx.parentElement.getBoundingClientRect();
  const d = window.devicePixelRatio || 1;
  fx.width = Math.max(1, r.width * d);
  fx.height = Math.max(1, r.height * d);
  fxc.setTransform(d, 0, 0, d, 0, 0);
}
window.addEventListener('resize', sizeFx);
function pushSpark(p) {
  sparks.push(p);
  if (sparks.length > 220) sparks.splice(0, sparks.length - 220);
}
function placeOf(el) {
  const app = $('app').getBoundingClientRect();
  const b = el.getBoundingClientRect();
  return { x: b.left + b.width / 2 - app.left, y: b.top + b.height / 2 - app.top };
}
function burstAt(el) {
  if (!el) return;
  sizeFx();
  const p = placeOf(el);
  const colors = ink();
  for (let i = 0; i < 56; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 120 + Math.random() * 420;
    pushSpark({
      kind: i % 5 === 0 ? 'star' : 'dot',
      x: p.x, y: p.y,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s - 90,
      life: 0.85 + Math.random() * 0.35,
      color: colors[i % colors.length],
      z: 4 + Math.random() * 8
    });
  }
  pushSpark({ kind: 'ring', x: p.x, y: p.y, vx: 0, vy: 0, life: 1, color: colors[0], z: Math.max(48, el.offsetWidth * 0.35) });
  pushSpark({ kind: 'ring', x: p.x, y: p.y, vx: 0, vy: 0, life: 0.72, color: '#fff', z: Math.max(28, el.offsetWidth * 0.2) });
}
function dropTrail(el) {
  const p = placeOf(el);
  const colors = ink();
  pushSpark({
    kind: 'dot', x: p.x, y: p.y + el.offsetHeight * 0.22,
    vx: (Math.random() - 0.5) * 24, vy: 16,
    life: 0.38, color: colors[Math.floor(Math.random() * colors.length)], z: 3
  });
}
function coinRain() {
  const el = $('hudCoins');
  if (!el) return;
  sizeFx();
  const p = placeOf(el);
  for (let i = 0; i < 16; i++) {
    pushSpark({
      kind: 'star', x: p.x, y: p.y,
      vx: (Math.random() - 0.5) * 260,
      vy: -160 - Math.random() * 240,
      life: 0.9, color: i % 2 ? '#fde047' : '#fff7ed', z: 4 + Math.random() * 4
    });
  }
}
function starPath(x, y, r) {
  fxc.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + i * (Math.PI * 2 / 5);
    const b = a + Math.PI / 5;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) fxc.moveTo(px, py); else fxc.lineTo(px, py);
    fxc.lineTo(x + Math.cos(b) * r * 0.42, y + Math.sin(b) * r * 0.42);
  }
  fxc.closePath();
}
function fxLoop() {
  const dpr = window.devicePixelRatio || 1;
  const w = fx.width / dpr;
  const h = fx.height / dpr;
  fxc.clearRect(0, 0, w, h);
  sparks = sparks.filter(p => p.life > 0);
  sparks.forEach(p => {
    p.life -= p.kind === 'ring' ? 0.02 : 0.018;
    if (p.life <= 0) return;
    p.x += p.vx * 0.016;
    p.y += p.vy * 0.016;
    if (p.kind !== 'ring') p.vy += 480 * 0.016;
    fxc.globalAlpha = Math.max(0, Math.min(1, p.life));
    fxc.fillStyle = p.color;
    fxc.strokeStyle = p.color;
    if (p.kind === 'ring') {
      fxc.lineWidth = 3 * Math.max(0.2, p.life);
      fxc.beginPath();
      fxc.arc(p.x, p.y, Math.max(1, p.z * (1.55 - Math.min(1.2, p.life))), 0, Math.PI * 2);
      fxc.stroke();
    } else if (p.kind === 'star') {
      starPath(p.x, p.y, Math.max(0.5, p.z * p.life));
      fxc.fill();
    } else {
      fxc.beginPath();
      fxc.arc(p.x, p.y, Math.max(0.4, p.z * p.life), 0, Math.PI * 2);
      fxc.fill();
    }
  });
  fxc.globalAlpha = 1;
  requestAnimationFrame(fxLoop);
}
requestAnimationFrame(fxLoop);
function tone(opts) {
  const ctx = ensureAudio();
  if (!ctx || !S.soundOn || voices > 16) return;
  const now = ctx.currentTime + (opts.at || 0);
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = opts.type || 'sine';
  o.frequency.setValueAtTime(Math.max(40, opts.f0), now);
  if (opts.f1) o.frequency.exponentialRampToValueAtTime(Math.max(40, opts.f1), now + opts.dur);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(opts.gain || 0.05, now + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, now + opts.dur);
  o.connect(g); g.connect(ctx.destination);
  voices++;
  o.onended = () => { voices = Math.max(0, voices - 1); };
  o.start(now); o.stop(now + opts.dur + 0.02);
}
function noise(opts) {
  const ctx = ensureAudio();
  if (!ctx || !S.soundOn || voices > 16) return;
  if (!noiseBuf) {
    const n = Math.floor(ctx.sampleRate * 0.4);
    noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
  }
  const now = ctx.currentTime + (opts.at || 0);
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = opts.q || 0.7;
  f.frequency.setValueAtTime(opts.f0 || 800, now);
  if (opts.f1) f.frequency.exponentialRampToValueAtTime(Math.max(40, opts.f1), now + opts.dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(opts.gain || 0.04, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + opts.dur);
  src.connect(f); f.connect(g); g.connect(ctx.destination);
  voices++;
  src.onended = () => { voices = Math.max(0, voices - 1); };
  src.start(now); src.stop(now + opts.dur);
}
function sfxHit() {
  tone({ type: 'triangle', f0: 523, f1: 880, dur: 0.14, gain: 0.05 });
  tone({ type: 'sine', f0: 784, f1: 1318, dur: 0.18, gain: 0.035, at: 0.03 });
  tone({ type: 'sine', f0: 1568, dur: 0.1, gain: 0.025, at: 0.05 });
  noise({ f0: 1800, f1: 5200, dur: 0.09, gain: 0.03, q: 0.6 });
}
function sfxMiss() {
  tone({ type: 'sine', f0: 196, f1: 52, dur: 0.24, gain: 0.07 });
  noise({ f0: 240, f1: 70, dur: 0.16, gain: 0.05, q: 0.8 });
}
function sfxWhoosh() {
  noise({ f0: 320, f1: 2200, dur: 0.28, gain: 0.05, q: 0.45 });
}
function sfxCoin() {
  [880, 1175, 1568].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.12, gain: 0.04, at: i * 0.07 }));
}
function sfxFanfare() {
  [523, 659, 784, 1046].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.22, gain: 0.05, at: i * 0.08 }));
  noise({ f0: 2400, f1: 6400, dur: 0.18, gain: 0.02, at: 0.3 });
}
function sfxBounce() {
  const t = performance.now();
  if (t - lastBounce < 120) return;
  lastBounce = t;
  tone({ type: 'sine', f0: 280 + Math.random() * 90, dur: 0.045, gain: 0.018 });
}
function sfxArm() {
  tone({ type: 'sine', f0: 660, f1: 1046, dur: 0.16, gain: 0.04 });
}
function sfxSpark() {
  tone({ type: 'sine', f0: 1318, f1: 1976, dur: 0.09, gain: 0.02 });
}
function blip(up) {
  if (up) { sfxHit(); flash(); }
  else sfxMiss();
}
function shake() {
  const app = $('app');
  app.classList.remove('shake');
  void app.offsetWidth;
  app.classList.add('shake');
}
function flash() {
  const app = $('app');
  app.classList.remove('flash');
  void app.offsetWidth;
  app.classList.add('flash');
}
function poke(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }
function stopLive() {
  liveStops.forEach(fn => fn());
  liveStops = [];
}
function chase(box, selector) {
  stopLive();
  if (!box) return;
  sizeFx();
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  box.querySelectorAll(selector).forEach((card, i) => {
    card.classList.add('running');
    const bw = box.clientWidth || 320;
    const bh = box.clientHeight || 420;
    const cw = card.offsetWidth || bw * 0.42;
    const ch = card.offsetHeight || cw;
    let x = Math.random() * Math.max(8, bw - cw - 8);
    let y = Math.random() * Math.max(8, bh - ch - 8);
    let vx = reduce ? 0 : (52 + Math.random() * 70) * (i % 2 ? 1 : -1);
    let vy = reduce ? 0 : (40 + Math.random() * 56) * (Math.random() < 0.5 ? -1 : 1);
    let last = performance.now();
    let trail = 0;
    let dead = false;
    let raf = 0;
    const step = (now) => {
      if (dead || !card.isConnected) return;
      if (card.classList.contains('win') || card.classList.contains('yeet') || card.classList.contains('show-answer')) return;
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      const W = box.clientWidth, H = box.clientHeight;
      const ww = card.offsetWidth, hh = card.offsetHeight;
      vx += Math.sin(now / 700 + i) * 18 * dt;
      vy += Math.cos(now / 900 + i) * 14 * dt;
      x += vx * dt; y += vy * dt;
      let hit = false;
      if (x < 0) { x = 0; vx = Math.abs(vx); hit = true; }
      if (y < 0) { y = 0; vy = Math.abs(vy); hit = true; }
      if (x > W - ww) { x = Math.max(0, W - ww); vx = -Math.abs(vx); hit = true; }
      if (y > H - hh) { y = Math.max(0, H - hh); vy = -Math.abs(vy); hit = true; }
      if (hit) sfxBounce();
      card.style.left = x + 'px';
      card.style.top = y + 'px';
      card.style.right = 'auto';
      card.style.transform = 'rotate(' + Math.max(-14, Math.min(14, vx * 0.08)) + 'deg)';
      if (!reduce) {
        trail += dt;
        if (trail > 0.07) { trail = 0; dropTrail(card); }
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    liveStops.push(() => { dead = true; cancelAnimationFrame(raf); });
  });
}

let audioCtx = null;
function ensureAudio() {
  const C = window.AudioContext || window.webkitAudioContext;
  if (C && !audioCtx) audioCtx = new C();
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
let beatTimer = null;
function stopBeat() { if (beatTimer) { clearInterval(beatTimer); beatTimer = null; } }
function startBeat() {
  stopBeat();
  if (!S.beatOn || !S.soundOn) return;
  const gear = TT.gearOf(curSet().words, S.mastery);
  const half = Math.round(60000 / TT.bpmOf(gear) / 2);
  let step = 0;
  beatTimer = setInterval(() => {
    if (talking.length) return;
    const ctx = ensureAudio();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    if (step++ % 2 === 0) {
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);
      g.gain.setValueAtTime(0.08, now);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(900, now);
      g.gain.setValueAtTime(0.04, now);
    }
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.start(now); osc.stop(now + 0.1);
  }, half);
}

/* ---------- hud ---------- */
function renderHUD() {
  const set = curSet();
  const gear = TT.gearOf(set.words, S.mastery);
  S.gear = gear;
  $('coinVal').textContent = S.coins;
  $('streakVal').textContent = S.streak;
  $('gearVal').textContent = String(gear);
  $('gearName').textContent = TT.gearLabel(gear);
  $('hudStreak').classList.toggle('lit', S.streak >= 2);
  $('hudStreak').style.transform = 'scale(' + (1 + Math.min(S.streak, 10) * 0.045) + ')';
  const app = $('app');
  [...app.classList].forEach(c => { if (c.indexOf('world-') === 0) app.classList.remove(c); });
  app.classList.add('world-' + set.id);
  app.classList.toggle('hot', S.streak >= 3);
  app.classList.toggle('blaze', S.streak >= 6);
  $('hudGear').classList.toggle('on', S.beatOn);
  $('hudGear').setAttribute('aria-label', (S.beatOn ? 'Beat on. ' : 'Beat off. ') + 'Gear ' + gear + '. ' + TT.gearLabel(gear));
  $('btnSound').classList.toggle('muted', !S.soundOn);
  $('btnSound').setAttribute('aria-label', S.soundOn ? 'Sound on' : 'Sound off');
  document.querySelectorAll('.mode-tab').forEach(b => b.classList.toggle('active', b.dataset.mode === S.mode));
}
function earn(n) {
  if (n <= 0) return;
  S.coins += n;
  const pill = $('hudCoins');
  pill.classList.remove('bump'); void pill.offsetWidth; pill.classList.add('bump');
  save();
}
function logEvent(partial) {
  const idx = TT.SETS.findIndex(s => s.id === S.setId);
  S.events.push(Object.assign({ ts: Date.now(), session: S.session, lesson: idx + 1 }, partial));
  if (S.events.length > 200) S.events = S.events.slice(-120);
}
function learnedList() {
  return TT.WORDS.filter(w => (S.mastery[w] || {}).ok >= 1);
}
function starMap() {
  const m = {};
  TT.SETS.forEach((s, i) => {
    if (TT.knownCount(s.words, S.mastery) > 0) m[String(i + 1)] = TT.gearOf(s.words, S.mastery);
  });
  return m;
}

let syncTimer = null;
let syncBlockedUntil = 0;
function syncSoon() {
  clearTimeout(syncTimer);
  if (Date.now() < syncBlockedUntil) return;
  syncTimer = setTimeout(syncNow, 600);
}
function setSync(kind) {
  const dot = $('syncDot');
  dot.className = 'sync-dot ' + kind;
  dot.title = kind === 'synced' ? 'Synced' : 'Saved on this phone';
}
async function postAPI(body, ms) {
  const job = beginLoad();
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = setTimeout(() => { if (ctrl) ctrl.abort(); }, ms || 15000);
  try {
    const res = await fetch(CFG.API, {
      method: 'POST',
      body: JSON.stringify(body),
      signal: ctrl ? ctrl.signal : undefined
    });
    return await res.json();
  } finally {
    clearTimeout(timer);
    endLoad(job);
  }
}
async function syncNow() {
  if (!CFG.API || !S.id) { setSync('phone'); return; }
  const batch = S.events.slice(0, 120);
  try {
    const data = await postAPI({
      action: 'sync', id: S.id, cls: S.cls || '', events: batch,
      state: { xp: S.coins, stars: starMap(), learned: learnedList(), streak: S.streak, mic: { label: '' } }
    });
    if (data && data.ok) {
      S.events = S.events.slice(batch.length);
      try { localStorage.setItem('ttzr4_state', JSON.stringify(S)); } catch (e) {}
      setSync('synced');
    } else {
      setSync('phone');
      syncBlockedUntil = Date.now() + 20000;
    }
  } catch (e) {
    setSync('phone');
    syncBlockedUntil = Date.now() + 20000;
  }
}

/* ---------- sheet + code ---------- */
function hideSheet() { sheet.classList.add('hidden'); sheetCard.innerHTML = ''; }
function showSheet(html) {
  sheetCard.innerHTML = html;
  sheet.classList.remove('hidden');
  watchImages(sheetCard);
  const next = sheetCard.querySelector('[data-act=next]');
  if (next) next.focus();
}
sheet.addEventListener('click', e => { if (e.target === sheet) hideSheet(); });

function register() {
  postAPI({ action: 'init', id: S.id, code: S.code, cls: S.cls || '', ua: navigator.userAgent.slice(0, 160) })
    .then(data => {
      if (data && data.ok && data.code && data.code !== S.code) { S.code = data.code; save(false); }
      if (data && data.ok) setSync('synced');
    })
    .catch(() => setSync('phone'));
}

/* ---------- shared chrome inside a mode ---------- */
let viewGen = 0;
let boardGen = 0;
function speakBoard(words) {
  const my = ++boardGen;
  const root = sheetCard;
  (async () => {
    await playUrls([cue('wow')]);
    for (let i = 0; i < words.length; i++) {
      if (my !== boardGen || sheet.classList.contains('hidden')) return;
      root.querySelectorAll('.done-pic').forEach(n => n.classList.toggle('on', n.dataset.word === words[i]));
      const lit = root.querySelector('.done-pic.on');
      if (lit) { burstAt(lit); sfxSpark(); }
      await playUrls([voiceClip(words[i])]);
    }
    if (my === boardGen) root.querySelectorAll('.done-pic').forEach(n => n.classList.remove('on'));
  })();
}
function chrome(extra) {
  const set = curSet();
  const curBook = TT.bookOfSet(set.id) || TT.BOOKS[0];

  const bookTabs = TT.BOOKS.map(b => {
    const active = b.id === curBook.id ? ' active' : '';
    return '<button type="button" class="book-pill' + active + '" data-book="' + b.id + '">' +
      '<span class="book-icon">' + b.icon + '</span><span class="book-title">' + b.name + '</span>' +
    '</button>';
  }).join('');

  const chips = TT.SETS.map(s => {
    const icon = s.words[0];
    const done = S.setCleared[s.id] ? ' done' : '';
    const active = s.id === set.id ? ' active' : '';
    const inBook = s.bookId === curBook.id ? ' in-book' : ' other-book';
    const tag = s.unit ? s.unit.split(':')[0].replace('Unit ', 'U') : '';
    return '<button type="button" class="set-chip' + active + done + inBook + '" data-set="' + s.id + '" title="' + s.book + ' · ' + s.unit + '" aria-label="' + s.name + '">' +
      '<img src="' + CFG.ASSET + 'img/' + icon + '.jpg" alt="">' +
      (tag ? '<span class="set-chip-tag">' + tag + '</span>' : '') +
      '</button>';
  }).join('');

  const pips = set.words.map(w => {
    const lv = TT.levelOf(S.mastery[w]);
    return '<i class="pip' + (lv >= 2 ? ' strong' : lv >= 1 ? ' ok' : '') + '"></i>';
  }).join('');

  return '<div class="coursebook-nav">' +
    '<div class="book-pills">' + bookTabs + '</div>' +
    '<div class="unit-badge"><strong>' + curBook.icon + ' ' + set.book + '</strong> · <span>' + set.unit + '</span></div>' +
    '<div class="set-bar">' + chips + '</div>' +
    '</div>' +
    '<div class="pips">' + pips + '</div>' +
    (extra || '');
}
function bindSets(render) {
  watchImages(stage);
  stage.querySelectorAll('.book-pill').forEach(b => b.onclick = () => {
    const targetBook = b.dataset.book;
    const sets = TT.setsByBook(targetBook);
    if (sets.length > 0) {
      S.setId = sets[0].id;
      save(false);
      render();
    }
  });
  stage.querySelectorAll('.set-chip').forEach(b => b.onclick = () => {
    if (b.dataset.set === S.setId && S.setCleared[b.dataset.set]) { showDone(curSet(), false); return; }
    S.setId = b.dataset.set;
    save(false);
    render();
  });
}
function showDone(set, advance) {
  const pics = set.words.map(w =>
    '<button type="button" class="done-pic" data-word="' + w + '" aria-label="Hear it"><img src="' + CFG.ASSET + 'img/' + w + '.jpg" alt=""></button>'
  ).join('');
  showSheet(
    '<div class="done-grid">' + pics + '</div>' +
    '<button class="btn-next icon-next" type="button" data-act="next" aria-label="Next">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 11h12.2l-4.6-4.6L13 5l8 7-8 7-1.4-1.4L16.2 13H4z"/></svg>' +
    '</button>'
  );
  sheetCard.querySelectorAll('.done-pic').forEach(b => b.onclick = () => {
    boardGen++;
    sheetCard.querySelectorAll('.done-pic').forEach(n => n.classList.toggle('on', n === b));
    playUrls([voiceClip(b.dataset.word)]);
  });
  speakBoard(set.words);
  sheetCard.querySelector('[data-act=next]').onclick = () => {
    boardGen++;
    stopTalk();
    hideSheet();
    if (!advance) return;
    const i = TT.SETS.findIndex(s => s.id === S.setId);
    for (let k = 1; k <= TT.SETS.length; k++) {
      const nxt = TT.SETS[(i + k) % TT.SETS.length];
      if (!S.setCleared[nxt.id]) { S.setId = nxt.id; break; }
    }
    save(false);
    renderMode();
  };
}
function maybeClearSet() {
  const set = curSet();
  if (S.setCleared[set.id] || !TT.setComplete(set.words, S.mastery)) return false;
  S.setCleared[set.id] = true;
  S.coins += 3;
  const pill = $('hudCoins');
  if (pill) { pill.classList.remove('bump'); void pill.offsetWidth; pill.classList.add('bump'); }
  logEvent({ type: 'tap', word: set.words[0], correct: 1, misses: 0, ms: 0 });
  save();
  showDone(set, true);
  sfxFanfare();
  flash();
  sheetCard.querySelectorAll('.done-pic').forEach((pic, i) => {
    setTimeout(() => { if (pic.isConnected) burstAt(pic); }, 80 + i * 90);
  });
  return true;
}

/* ---------- DRILL ---------- */
let drill = null;
function renderDrill() {
  const gen = ++viewGen;
  stopTalk();
  const set = curSet();
  const word = TT.orderWords(set.words, S.mastery, Date.now())[0];
  const gear = TT.gearOf(set.words, S.mastery);
  const kind = TT.stimulus(word, S.mastery[word], gear);
  const crowd = set.words.filter(w => w !== word);
  for (let i = crowd.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = crowd[i]; crowd[i] = crowd[j]; crowd[j] = t;
  }
  const foilN = crowd.length >= 4 ? 4 : crowd.length;
  const pack = [word].concat(crowd.slice(0, foilN));
  for (let i = pack.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = pack[i]; pack[i] = pack[j]; pack[j] = t;
  }
  S.currentWord = word;
  drill = { gen, word, kind, misses: 0, phase: 'play' };
  stopLive();
  const cards = pack.map(w =>
    '<button type="button" class="pillar-card" data-word="' + w + '" aria-label="Picture"><img src="' + CFG.ASSET + 'img/' + w + '.jpg" alt=""></button>'
  ).join('');
  stage.innerHTML = '<div class="drill-view">' + chrome(
    '<div class="arena' + (pack.length >= 5 ? ' pack-5' : '') + '" id="arena">' + cards +
      '<button type="button" class="play-orb" id="hearBtn" aria-label="Hear the word"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></button>' +
    '</div></div>'
  );
  bindSets(renderDrill);
  renderHUD();
  $('hearBtn').onclick = () => hearDrill(true);
  stage.querySelectorAll('.pillar-card').forEach(card => card.onclick = () => answerDrill(card));
  setPrompt(gear >= 3 && kind === 'f' ? 'Where is it?' : (TT.levelOf(S.mastery[word]) >= 1 ? 'You know this one.' : 'Listen.'));
  if (!holdAutoplay) hearDrill(false, gen);
}
async function hearDrill(manual, gen) {
  if (!drill) return;
  const g = gen || drill.gen;
  const btn = $('hearBtn');
  if (btn) btn.classList.add('speaking');
  await playUrls([file(drill.kind, drill.word)]);
  if (g !== viewGen) return;
  const btn2 = $('hearBtn');
  if (btn2) btn2.classList.remove('speaking');
  if (!manual) {
    drill.phase = 'answer';
    chase($('arena'), '.pillar-card');
    sfxArm();
    setPrompt('Tap the picture.');
  }
}
async function answerDrill(card) {
  if (!drill || drill.phase !== 'answer') return;
  const picked = card.dataset.word;
  if (picked === drill.word) {
    drill.phase = 'next';
    const noted = noteTap(drill.word, true);
    S.streak++;
    stopLive();
    card.style.transform = '';
    card.classList.add('win');
    stage.querySelectorAll('.pillar-card').forEach(c => {
      if (c === card) return;
      c.style.transform = '';
      c.classList.add('yeet');
    });
    burstAt(card);
    blip(true);
    sfxWhoosh();
    poke(16);
    setPrompt('Nice.');
    logEvent({ type: 'tap', word: drill.word, correct: 1, misses: drill.misses, ms: 0 });
    pay(noted.gained);
    const urls = [voiceClip(drill.word)];
    if (S.streak > 0 && S.streak % 3 === 0) urls.push(cue(S.streak % 6 === 0 ? 'wow' : 'yay'));
    await playUrls(urls);
    if (drill.gen !== viewGen) return;
    if (!maybeClearSet()) setTimeout(() => { if (drill && drill.gen === viewGen) renderDrill(); }, 140);
  } else {
    noteTap(drill.word, false);
    S.streak = 0;
    drill.misses++;
    card.classList.add('miss-snap');
    shake();
    blip(false);
    poke(28);
    setPrompt('Try again.');
    logEvent({ type: 'tap', word: drill.word, correct: 0, misses: drill.misses, ms: 0 });
    save();
    if (drill.misses >= 2) {
      stopLive();
      stage.querySelectorAll('.pillar-card').forEach(c => {
        c.style.transform = '';
        if (c.dataset.word === drill.word) c.classList.add('show-answer');
        else c.classList.add('yeet');
      });
      sfxWhoosh();
    }
    setTimeout(() => card.classList.remove('miss-snap'), 360);
    await playUrls([cue('oops'), file(drill.kind, drill.word)]);
  }
}

/* ---------- FIND ---------- */
let findRound = null;
function renderFind() {
  const gen = ++viewGen;
  stopTalk();
  const set = curSet();
  const words = set.words.slice().sort(() => Math.random() - 0.5);
  findRound = { gen, words, cursor: 0, found: {}, phase: 'play' };
  const tiles = words.map(w =>
    '<button type="button" class="find-tile" data-word="' + w + '" aria-label="Picture"><img src="' + CFG.ASSET + 'img/' + w + '.jpg" alt=""></button>'
  ).join('');
  stage.innerHTML = '<div class="find-view">' + chrome(
    '<button type="button" class="play-orb" id="hearBtn" aria-label="Hear the word"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></button>' +
    '<div class="find-grid">' + tiles + '</div></div>'
  );
  bindSets(renderFind);
  renderHUD();
  $('hearBtn').onclick = () => hearFind(true);
  stage.querySelectorAll('.find-tile').forEach(t => t.onclick = () => answerFind(t));
  setPrompt('Listen. Then tap.');
  if (!holdAutoplay) hearFind(false);
}
async function hearFind(manual) {
  if (!findRound || findRound.cursor >= findRound.words.length) return;
  const word = findRound.words[findRound.cursor];
  S.currentWord = word;
  const gear = TT.gearOf(curSet().words, S.mastery);
  const kind = TT.stimulus(word, S.mastery[word], gear);
  findRound.kind = kind;
  const btn = $('hearBtn');
  if (btn) btn.classList.add('speaking');
  await playUrls([file(kind, word)]);
  if (!findRound || findRound.gen !== viewGen) return;
  const btn2 = $('hearBtn');
  if (btn2) btn2.classList.remove('speaking');
  if (!manual) {
    findRound.phase = 'answer';
    stage.querySelectorAll('.find-tile').forEach(t => { if (!t.classList.contains('found')) t.classList.add('ready'); });
    sfxArm();
    setPrompt('Tap the picture.');
  }
}
function answerFind(tile) {
  if (!findRound || findRound.phase !== 'answer') return;
  const word = findRound.words[findRound.cursor];
  const picked = tile.dataset.word;
  if (findRound.found[picked]) return;
  if (picked !== word) {
    tile.classList.add('miss-snap');
    shake();
    blip(false);
    noteTap(word, false);
    setPrompt('Try again.');
    S.streak = 0;
    logEvent({ type: 'tap', word: word, correct: 0, misses: 1, ms: 0 });
    save();
    setTimeout(() => tile.classList.remove('miss-snap'), 360);
    playUrls([cue('oops'), file(findRound.kind, word)]);
    return;
  }
  findRound.phase = 'next';
  findRound.found[word] = 1;
  const noted = noteTap(word, true);
  S.streak++;
  tile.classList.add('found', 'good-snap');
  tile.classList.remove('ready');
  burstAt(tile);
  blip(true);
  poke(12);
  setPrompt(TT.sentence(word));
  logEvent({ type: 'tap', word: word, correct: 1, misses: 0, ms: 0 });
  pay(noted.gained);
  playUrls([voiceClip(word)]).then(() => {
    if (!findRound || findRound.gen !== viewGen) return;
    findRound.cursor++;
    if (findRound.cursor >= findRound.words.length) {
      setPrompt('You found them.');
      playUrls([cue('great')]);
      if (!maybeClearSet()) setTimeout(() => { if (findRound && findRound.gen === viewGen) renderFind(); }, 700);
      return;
    }
    findRound.phase = 'play';
    hearFind(false);
  });
}

/* ---------- SPEAK ---------- */
let speak = null;
let rec = { on: false, busy: false, stop: null, stream: null, timer: null, unmeter: null, startedAt: 0 };
const REC_MS = 3200;
const MIC_AUDIO = { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: { ideal: 1 } };
function renderSpeak() {
  const gen = ++viewGen;
  stopTalk();
  releaseMic();
  const set = curSet();
  const order = TT.orderWords(set.words, S.mastery, Date.now());
  const ready = order.filter(w => (S.mastery[w] || {}).ok >= 1);
  const word = ready[0] || order[0];
  S.currentWord = word;
  speak = { gen, word, heardModel: false };
  stage.innerHTML = '<div class="speak-view">' + chrome(
    '<button type="button" class="hero" id="hero" aria-label="Hear the word"><img src="' + CFG.ASSET + 'img/' + word + '.jpg" alt=""></button>' +
    '<div class="mic-ring" id="micRing" style="--p:0">' +
      '<button type="button" class="mic-orb" id="micBtn" aria-label="Say the word" disabled><svg viewBox="0 0 24 24"><path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/></svg></button>' +
    '</div>' +
    '<p class="sr-only" id="speakStatus"></p></div>'
  );
  bindSets(renderSpeak);
  renderHUD();
  $('hero').onclick = () => modelSpeak(true);
  $('micBtn').onclick = toggleMic;
  setPrompt('Listen.');
  if (!holdAutoplay) modelSpeak();
}
async function modelSpeak() {
  if (!speak) return;
  const g = speak.gen;
  speak.heardModel = false;
  const btn = $('micBtn');
  if (btn) btn.disabled = true;
  const urls = [file('w', speak.word)];
  if (TT.hasQuestion(speak.word)) urls.push(file('f', speak.word));
  urls.push(cue('yourturn'));
  await playUrls(urls);
  if (!speak || speak.gen !== g) return;
  speak.heardModel = true;
  const mic = $('micBtn');
  const hero = $('hero');
  if (mic) mic.disabled = false;
  if (hero) hero.classList.add('ready');
  sfxArm();
  setPrompt('Your turn.');
}
function dropTracks(stream) {
  if (!stream) return;
  if (rec.stream === stream) rec.stream = null;
  stream.getTracks().forEach(t => { try { t.stop(); } catch (e) {} });
}
function releaseMic() {
  rec.on = false;
  if (rec.timer) { clearTimeout(rec.timer); rec.timer = null; }
  if (rec.unmeter) { try { rec.unmeter(); } catch (e) {} rec.unmeter = null; }
  const stop = rec.stop;
  const stream = rec.stream;
  rec.stop = null;
  endKind('mic');
  const btn = $('micBtn');
  if (btn) btn.classList.remove('recording', 'arming');
  const ring = $('micRing');
  if (ring) ring.style.setProperty('--p', '0');
  if (stop) {
    try { stop(); } catch (e) {}
    setTimeout(() => dropTracks(stream), 70);
  } else dropTracks(stream);
}
function meter(stream) {
  const ctx = ensureAudio();
  if (!ctx) return function () {};
  let src, an, dead = false;
  try {
    src = ctx.createMediaStreamSource(stream);
    an = ctx.createAnalyser();
    an.fftSize = 512;
    src.connect(an);
  } catch (e) { return function () {}; }
  const buf = new Uint8Array(an.fftSize);
  const tick = () => {
    if (dead) return;
    an.getByteTimeDomainData(buf);
    let s = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = (buf[i] - 128) / 128;
      s += v * v;
    }
    const btn = $('micBtn');
    if (btn) btn.style.setProperty('--level', Math.min(1, Math.sqrt(s / buf.length) * 12).toFixed(3));
    requestAnimationFrame(tick);
  };
  if (ctx.state === 'suspended') ctx.resume();
  tick();
  return function () { dead = true; try { src.disconnect(); } catch (e) {} };
}
async function openMic() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('no_mic');
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: MIC_AUDIO });
  } catch (e) {
    if (e && (e.name === 'OverconstrainedError' || e.name === 'ConstraintNotSatisfiedError')) {
      return navigator.mediaDevices.getUserMedia({ audio: true });
    }
    throw e;
  }
}
async function toggleMic() {
  if (!speak || !speak.heardModel) return;
  if (rec.on) {
    if (performance.now() - rec.startedAt < 420) return;
    if (rec.stop) rec.stop();
    return;
  }
  if (rec.busy) return;
  rec.busy = true;
  const gen = speak.gen;
  const word = speak.word;
  stopTalk();
  ensureAudio();
  const btn = $('micBtn');
  if (btn) btn.classList.add('arming');
  const arm = beginLoad(null, 'mic');
  try {
    const stream = await openMic();
    if (!speak || speak.gen !== gen) {
      stream.getTracks().forEach(t => { try { t.stop(); } catch (e) {} });
      endLoad(arm);
      return;
    }
    endLoad(arm);
    rec.stream = stream;
    rec.on = true;
    rec.startedAt = performance.now();
    stream.getTracks().forEach(t => {
      t.addEventListener('ended', () => { if (rec.on && rec.stop) rec.stop(); });
    });
    if (btn) { btn.classList.remove('arming'); btn.classList.add('recording'); }
    $('speakStatus').textContent = 'Listening…';
    rec.unmeter = meter(stream);
    const job = beginLoad(0, 'mic');
    let raf = 0;
    const pump = () => {
      if (!rec.on) return;
      const p = Math.min(1, (performance.now() - rec.startedAt) / REC_MS);
      setLoad(job, p);
      const ring = $('micRing');
      if (ring) ring.style.setProperty('--p', p.toFixed(3));
      raf = requestAnimationFrame(pump);
    };
    raf = requestAnimationFrame(pump);
    const stopPump = () => { cancelAnimationFrame(raf); endLoad(job); };
    let result = null;
    const mime = pickMime();
    if (window.MediaRecorder && mime) result = await recordMime(stream, mime);
    if (!result || result.fallback) {
      if (rec.on && rec.stream) result = await recordWav(rec.stream, Math.max(500, REC_MS - (performance.now() - rec.startedAt)));
    }
    stopPump();
    releaseMic();
    if (!speak || speak.gen !== gen) return;
    if (!result || result.empty || !result.b64) {
      setPrompt('Try again.');
      if ($('speakStatus')) $('speakStatus').textContent = 'We did not hear you. Come closer and say the word.';
      playUrls([cue('goodtry'), file('w', word)]);
      return;
    }
    await judge(result.b64, result.mime, word, gen);
  } catch (e) {
    endKind('mic');
    releaseMic();
    if (!speak || speak.gen !== gen) return;
    const mic = $('micBtn');
    if (mic) mic.classList.add('blocked');
    setPrompt('The microphone is blocked.');
    playUrls([cue('oops')]);
  } finally {
    rec.busy = false;
    const b = $('micBtn');
    if (b) b.classList.remove('recording', 'arming');
  }
}
function pickMime() {
  if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return '';
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/ogg'].find(t => {
    try { return MediaRecorder.isTypeSupported(t); } catch (e) { return false; }
  }) || '';
}
function recordMime(stream, mime) {
  return new Promise(resolve => {
    let mr;
    try { mr = new MediaRecorder(stream, { mimeType: mime }); }
    catch (e) { resolve({ fallback: true }); return; }
    const chunks = [];
    let settled = false;
    let fallback = false;
    const settle = (payload) => { if (settled) return; settled = true; resolve(payload); };
    mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    mr.onerror = () => {
      fallback = true;
      try { if (mr.state !== 'inactive') mr.stop(); } catch (e) {}
      settle({ fallback: true });
    };
    mr.onstop = async () => {
      if (fallback) { settle({ fallback: true }); return; }
      try {
        const blob = new Blob(chunks, { type: mime });
        if (blob.size < 800) { settle({ empty: true }); return; }
        const b64 = await blobToB64(blob);
        settle({ b64: b64, mime: mime.split(';')[0] });
      } catch (e) { settle({ fallback: true }); }
    };
    rec.stop = () => {
      try { if (mr.state === 'recording') mr.requestData(); } catch (e) {}
      try { if (mr.state !== 'inactive') mr.stop(); } catch (e) { settle({ fallback: true }); }
    };
    try { mr.start(100); }
    catch (e) { settle({ fallback: true }); return; }
    if (rec.timer) clearTimeout(rec.timer);
    rec.timer = setTimeout(() => { if (rec.on && rec.stop) rec.stop(); }, REC_MS);
  });
}
function recordWav(stream, ms) {
  return new Promise(resolve => {
    const ctx = ensureAudio();
    if (!ctx) { resolve({ empty: true }); return; }
    const run = () => {
      let src, proc, silent;
      try {
        src = ctx.createMediaStreamSource(stream);
        proc = ctx.createScriptProcessor(4096, 1, 1);
        silent = ctx.createGain();
        silent.gain.value = 0.00001;
      } catch (e) { resolve({ empty: true }); return; }
      const pieces = [];
      src.connect(proc); proc.connect(silent); silent.connect(ctx.destination);
      proc.onaudioprocess = e => pieces.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        try { proc.disconnect(); src.disconnect(); silent.disconnect(); } catch (e) {}
        if (!pieces.length) { resolve({ empty: true }); return; }
        resolve({ b64: wavB64(pieces, ctx.sampleRate), mime: 'audio/wav' });
      };
      rec.stop = finish;
      if (rec.timer) clearTimeout(rec.timer);
      rec.timer = setTimeout(() => { if (rec.on) finish(); }, Math.max(400, ms));
    };
    if (ctx.state === 'suspended') ctx.resume().then(run).catch(() => resolve({ empty: true }));
    else run();
  });
}
function blobToB64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}
function wavB64(pieces, rate) {
  let n = 0;
  pieces.forEach(p => { n += p.length; });
  const samples = new Float32Array(n);
  let o = 0;
  pieces.forEach(p => { samples.set(p, o); o += p.length; });
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const str = (off, s) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, samples.length * 2, true);
  let q = 44;
  for (let i = 0; i < samples.length; i++, q += 2) {
    const x = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(q, x < 0 ? x * 0x8000 : x * 0x7fff, true);
  }
  let bin = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
async function judge(b64, mime, word, gen) {
  if (!speak || speak.gen !== gen || speak.word !== word) return;
  const status = $('speakStatus');
  if (status) status.textContent = 'Checking…';
  const m = mOf(word);
  m.says++;
  try {
    const data = await postAPI({
      action: 'speak', id: S.id, word: word, audio: b64, mime: mime,
      session: S.session, lesson: TT.SETS.findIndex(s => s.id === S.setId) + 1,
      try: m.says, ms: REC_MS, mic: ''
    }, 22000);
    if (!speak || speak.gen !== gen) return;
    if (data && data.silent) {
      setPrompt('Try again.');
      status.textContent = 'We did not hear you. Come closer and say the word.';
      logEvent({ type: 'say', word: word, correct: 0, heard: '', score: 0, engine: 'whisper' });
      save();
      playUrls([cue('goodtry'), file('w', word)]);
      return;
    }
    if (data && data.ok && data.pass) {
      const before = TT.levelOf(m);
      m.sayOK++;
      const after = TT.levelOf(m);
      m.next = Date.now() + TT.delayMs(after);
      S.streak++;
      const hero = $('hero');
      if (hero) { hero.classList.add('good-snap'); burstAt(hero); }
      blip(true);
      poke(20);
      setPrompt('Nice.');
      status.textContent = 'We heard “' + (data.heard || word) + '”.';
      logEvent({ type: 'say', word: word, correct: 1, heard: data.heard || '', score: data.score, engine: 'whisper' });
      pay(after > before ? 2 : 0);
      await playUrls([cue('great')]);
      if (speak && speak.gen === gen && !maybeClearSet()) renderSpeak();
      return;
    }
    setPrompt('Try again.');
    status.textContent = data && data.heard ? 'We heard “' + data.heard + '”.' : 'Not the word yet.';
    logEvent({ type: 'say', word: word, correct: 0, heard: (data && data.heard) || '', score: data && data.score, engine: 'whisper' });
    save();
    playUrls([cue('goodtry'), file('w', word)]);
  } catch (e) {
    if (!speak || speak.gen !== gen) return;
    setPrompt('Not scored yet.');
    if (status) status.textContent = 'Saved on this phone. The teacher line is offline. Say it again.';
    logEvent({ type: 'say', word: word, correct: 0, heard: '', engine: 'offline' });
    save();
    playUrls([cue('oops')]);
  }
}

/* ---------- MATCH ---------- */
function renderMemory() {
  const gen = ++viewGen;
  stopTalk();
  const set = curSet();
  let words = TT.orderWords(set.words, S.mastery, Date.now()).slice(0, 4);
  if (words.length < 2) words = set.words.slice(0, 2);
  const deck = [];
  words.forEach(w => { deck.push({ id: w, type: 'snd' }); deck.push({ id: w, type: 'pic' }); });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = deck[i]; deck[i] = deck[j]; deck[j] = t;
  }
  const cards = deck.map((c, i) =>
    '<button type="button" class="mem-card ' + (c.type === 'snd' ? 'snd' : 'pic') + '" data-i="' + i + '" aria-label="' + (c.type === 'snd' ? 'Sound card' : 'Picture card') + '">' +
    (c.type === 'snd'
      ? '<svg viewBox="0 0 24 24"><path d="M3 10v4h4l5 5V5L7 10H3zm13.5 2c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 13.5l2.5 3 3.5-4.5L19 18H5l3.5-4.5z"/></svg>') +
    '</button>'
  ).join('');
  stage.innerHTML = '<div class="mem-view">' + chrome(
    '<div class="mem-grid' + (deck.length > 6 ? ' cols-4' : '') + '">' + cards + '</div></div>'
  );
  bindSets(renderMemory);
  renderHUD();
  setPrompt('Match the sound and the picture.');
  let open = [];
  let lock = false;
  const matched = {};
  stage.querySelectorAll('.mem-card').forEach(card => card.onclick = async () => {
    const i = +card.dataset.i;
    const c = deck[i];
    if (lock || matched[i] || open.indexOf(i) >= 0) return;
    card.classList.add('up');
    if (c.type === 'snd') {
      card.innerHTML = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 10v4h4l5 5V5L7 10H3zm13.5 2c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>';
      playUrls([file('w', c.id)]);
    } else {
      card.innerHTML = '<img src="' + CFG.ASSET + 'img/' + c.id + '.jpg" alt="">';
    }
    open.push(i);
    if (open.length < 2) return;
    const a = deck[open[0]], b = deck[open[1]];
    if (a.id === b.id && a.type !== b.type) {
      matched[open[0]] = matched[open[1]] = 1;
      const noted = noteTap(a.id, true);
      S.streak++;
      setPrompt(TT.sentence(a.id));
      burstAt(card);
      blip(true);
      logEvent({ type: 'tap', word: a.id, correct: 1, misses: 0, ms: 0 });
      pay(noted.gained);
      playUrls([voiceClip(a.id)]);
      open = [];
      if (Object.keys(matched).length === deck.length) {
        if (!maybeClearSet()) {
          playUrls([cue('great')]).then(() => { if (gen === viewGen) renderMemory(); });
        }
      }
    } else {
      lock = true;
      S.streak = 0;
      save();
      setPrompt('Try again.');
      setTimeout(() => {
        if (gen !== viewGen) return;
        open.forEach(idx => {
          const el = stage.querySelector('[data-i="' + idx + '"]');
          const item = deck[idx];
          if (!el) return;
          el.classList.remove('up');
          el.innerHTML = item.type === 'snd'
            ? '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 10v4h4l5 5V5L7 10H3zm13.5 2c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>'
            : '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 13.5l2.5 3 3.5-4.5L19 18H5l3.5-4.5z"/></svg>';
        });
        open = [];
        lock = false;
      }, 900);
    }
  });
}

/* ---------- boot ---------- */
function renderMode() {
  if (S.mode === 'find') renderFind();
  else if (S.mode === 'speak') renderSpeak();
  else if (S.mode === 'memory') renderMemory();
  else { S.mode = 'drill'; renderDrill(); }
}
let holdAutoplay = false;
async function bootLesson() {
  renderHUD();
  const greet = !S.greeted && S.soundOn;
  if (greet) {
    S.greeted = true;
    save(false);
  }
  holdAutoplay = greet;
  renderMode();
  holdAutoplay = false;
  let seen = '';
  try { seen = sessionStorage.getItem('ttzr4_board') || ''; } catch (e) {}
  if (S.setCleared[S.setId] && seen !== S.setId) {
    try { sessionStorage.setItem('ttzr4_board', S.setId); } catch (e) {}
    showDone(curSet(), true);
    return;
  }
  if (!greet) return;
  await playUrls([cue('hello')]);
  if (S.mode === 'drill' && drill) hearDrill(false, drill.gen);
  else if (S.mode === 'find' && findRound) hearFind(false);
  else if (S.mode === 'speak' && speak) modelSpeak();
}
document.querySelectorAll('.mode-tab').forEach(b => b.onclick = () => {
  S.mode = b.dataset.mode;
  save(false);
  renderMode();
});
$('btnReplay').onclick = () => {
  ensureAudio();
  if (S.currentWord) {
    const gear = TT.gearOf(curSet().words, S.mastery);
    const kind = TT.stimulus(S.currentWord, S.mastery[S.currentWord], gear);
    playUrls([file(kind, S.currentWord)]);
  }
};
$('btnSound').onclick = () => {
  S.soundOn = !S.soundOn;
  if (!S.soundOn) { stopBeat(); stopTalk(); }
  else if (S.beatOn) startBeat();
  save(false);
};
$('hudGear').onclick = () => {
  ensureAudio();
  S.beatOn = !S.beatOn;
  if (S.beatOn && S.soundOn) startBeat(); else stopBeat();
  save(false);
};
document.addEventListener('keydown', e => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  if (e.key === ' ' && S.currentWord) { e.preventDefault(); $('btnReplay').click(); }
  if ((e.key === '1' || e.key === '2') && S.mode === 'drill') {
    const cards = stage.querySelectorAll('.pillar-card');
    const card = cards[e.key === '1' ? 0 : 1];
    if (card) card.click();
  }
});

renderHUD();
register();
bootLesson();
