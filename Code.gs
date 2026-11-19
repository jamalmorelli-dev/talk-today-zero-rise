/**
 * TALK TODAY — ZERO RISE  ·  Code.gs  v4
 * ---------------------------------------------------------------------------
 * Backend for the zero-level (pre-literate) immersion app.
 *   • Saves ALL learner progress to a Google Sheet (Learners / Events / Mastery / Words / Dashboard)
 *   • Picture-code identity (no typing, no reading): 3 pictures = a learner's "password"
 *   • Speaking: receives a short recording from ANY microphone / browser, transcribes it with
 *     OpenAI (server-side, key never reaches the browser), scores it leniently, and logs it
 *   • Offline-first friendly: the app batches events and retries; every endpoint is idempotent-ish
 *
 * SETUP (5 minutes)
 *   1. Create a Google Sheet → Extensions → Apps Script → paste this file (replace Code.gs)
 *      and paste appsscript.json (Project Settings → "Show appsscript.json").
 *   2. Reload the Sheet. Menu "ZERO RISE" appears → "1. Set up sheets".
 *   3. Menu → "2. Set OpenAI key" (stored in Script Properties, never in code).
 *   4. Menu → "3. Set teacher token" (any secret word; used only for the stats endpoint).
 *   5. Deploy → New deployment → Web app → Execute as: Me · Who has access: Anyone → copy the /exec URL.
 *   6. Paste that URL into Index.html (CFG.API) — or open the app once with  ?api=THE_EXEC_URL
 *   Host Index.html + the v3/ folder on HTTPS (GitHub Pages). Microphones are blocked inside the
 *   Apps Script iframe, so the app must be hosted top-level.
 *
 * Script Properties used: OPENAI_API_KEY · TEACHER_TOKEN · SPREADSHEET_ID (only if not container-bound)
 *   · TRANSCRIBE_MODEL (default whisper-1) · SAVE_AUDIO (1 = keep recordings in Drive) · PASS_SCORE (default 0.7)
 */

/* =========================== CONFIG =========================== */
const Z = {
  TITLE: 'TT ZERO RISE — Progress',
  TAB: { L: 'Learners', E: 'Events', M: 'Mastery', W: 'Words', D: 'Dashboard' },
  HEAD: {
    L: ['id', 'code', 'name', 'class', 'created', 'lastSeen', 'xp', 'stars', 'wordsLearned', 'lessonsDone', 'streak', 'speakTries', 'speakOK', 'lastMic', 'userAgent', 'state'],
    E: ['ts', 'learnerId', 'name', 'class', 'session', 'lesson', 'type', 'word', 'correct', 'misses', 'ms', 'heard', 'score', 'engine', 'mic', 'audioUrl'],
    M: ['key', 'learnerId', 'word', 'attempts', 'correct', 'speakTries', 'speakOK', 'lastSeen', 'level']
  },
  WORDS: [
    'apple', 'ball', 'book', 'cat', 'dog', 'car', 'pen', 'pencil', 'bag', 'door', 'window', 'cup', 'bed', 'fish', 'tree', 'banana',
    'pizza', 'burger', 'chocolate', 'football', 'tennis', 'music', 'headphones', 'camera', 'computer', 'telephone', 'television', 'radio', 'sneakers', 'backpack', 'bicycle', 'jacket', 'robot',
    'taxi', 'bus', 'train', 'station', 'airport', 'passport', 'hotel', 'hospital', 'doctor', 'police', 'pharmacy', 'bank', 'coffee', 'water', 'money', 'tomato', 'orange'
  ],
  // 12 pictures used for the 3-picture learner code (1,728 combinations)
  PICS: ['pizza', 'banana', 'taxi', 'bus', 'doctor', 'police', 'football', 'camera', 'coffee', 'tomato', 'robot', 'radio'],
  LESSON_COUNT: 6,
  MAX_AUDIO_BYTES: 700 * 1024,
  MAX_EVENTS_PER_SYNC: 120,
  RATE: { SPEAK_PER_MIN: 14, SYNC_PER_MIN: 40, RESTORE_PER_MIN: 25 },
  DEFAULT_PASS: 0.7
};

/* =========================== MENU / SETUP =========================== */
function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('ZERO RISE')
      .addItem('1. Set up sheets', 'setup')
      .addItem('2. Set OpenAI key', 'menuSetKey')
      .addItem('3. Set teacher token', 'menuSetToken')
      .addSeparator()
      .addItem('Rebuild dashboard', 'buildDashboard')
      .addItem('Test OpenAI connection', 'menuTestOpenAI')
      .addItem('Show web-app health', 'menuHealth')
      .addToUi();
  } catch (e) { /* standalone script: no UI */ }
}

function setup() {
  const ss = ss_();
  ensureTab_(ss, Z.TAB.L, Z.HEAD.L);
  ensureTab_(ss, Z.TAB.E, Z.HEAD.E);
  ensureTab_(ss, Z.TAB.M, Z.HEAD.M);
  buildWordsTab_(ss);
  buildDashboard();
  const p = PropertiesService.getScriptProperties();
  if (!p.getProperty('TEACHER_TOKEN')) p.setProperty('TEACHER_TOKEN', Utilities.getUuid().slice(0, 8));
  if (!p.getProperty('SPREADSHEET_ID')) p.setProperty('SPREADSHEET_ID', ss.getId());
  toast_('Sheets ready. Next: ZERO RISE → Set OpenAI key.');
  return { ok: true, spreadsheet: ss.getUrl() };
}

function menuSetKey() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('OpenAI API key', 'Paste the key (starts with sk-). It is stored in Script Properties only.', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const k = String(r.getResponseText() || '').trim();
  if (!/^sk-/.test(k)) { ui.alert('That does not look like an OpenAI key.'); return; }
  PropertiesService.getScriptProperties().setProperty('OPENAI_API_KEY', k);
  ui.alert('Saved. You can change it any time.');
}
function menuSetToken() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('Teacher token', 'Any secret word. Needed for the teacher stats link.', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const t = String(r.getResponseText() || '').trim();
  if (t.length < 4) { ui.alert('Use at least 4 characters.'); return; }
  PropertiesService.getScriptProperties().setProperty('TEACHER_TOKEN', t);
  ui.alert('Saved.');
}
function menuTestOpenAI() {
  const ui = SpreadsheetApp.getUi();
  const key = prop_('OPENAI_API_KEY');
  if (!key) { ui.alert('No OpenAI key yet. Use "2. Set OpenAI key".'); return; }
  const res = UrlFetchApp.fetch('https://api.openai.com/v1/models', { headers: { Authorization: 'Bearer ' + key }, muteHttpExceptions: true });
  ui.alert(res.getResponseCode() === 200 ? 'OpenAI connection OK.' : 'OpenAI error ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 200));
}
function menuHealth() {
  const ui = SpreadsheetApp.getUi();
  const h = health_();
  ui.alert('Learners: ' + h.learners + '\nEvents: ' + h.events + '\nOpenAI key: ' + (h.hasKey ? 'yes' : 'NO') + '\nTranscribe model: ' + h.model);
}

/* =========================== WEB APP ENTRY =========================== */
function doGet(e) {
  const a = (e && e.parameter && e.parameter.action) || 'ping';
  try {
    if (a === 'ping') return json_({ ok: true, v: 4, t: Date.now(), hasKey: !!prop_('OPENAI_API_KEY') });
    if (a === 'stats') {
      if (!tokenOK_(e.parameter.token)) return json_({ ok: false, error: 'forbidden' });
      return json_({ ok: true, learners: learnersList_(), health: health_() });
    }
    if (a === 'app') { // optional: serve Index.html from Apps Script (mic will NOT work inside this iframe)
      return HtmlService.createHtmlOutputFromFile('Index').setTitle('ZERO RISE')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
    return json_({ ok: true, v: 4 });
  } catch (err) { return json_({ ok: false, error: String(err && err.message || err) }); }
}

function doPost(e) {
  let req;
  try { req = JSON.parse((e.postData && e.postData.contents) || '{}'); } catch (err) { return json_({ ok: false, error: 'bad_json' }); }
  try {
    switch (req.action) {
      case 'init': return json_(hInit_(req));
      case 'restore': return json_(hRestore_(req));
      case 'sync': return json_(hSync_(req));
      case 'speak': return json_(hSpeak_(req));
      case 'ping': return json_({ ok: true, v: 4, hasKey: !!prop_('OPENAI_API_KEY') });
      default: return json_({ ok: false, error: 'unknown_action' });
    }
  } catch (err) {
    console.error(err && err.stack || err);
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

/* =========================== HANDLERS =========================== */
/** Register (or adopt) a learner. Client generates id + code so it works offline; server only fixes collisions. */
function hInit_(r) {
  return withLock_(function () {
    const sh = tab_(Z.TAB.L);
    const id = cleanId_(r.id) || newId_();
    const found = findRow_(sh, 1, id);
    if (found) { touchLearner_(sh, found, { ua: r.ua, cls: r.cls }); const row = sh.getRange(found, 1, 1, Z.HEAD.L.length).getValues()[0]; return { ok: true, id: id, code: row[1], existing: true }; }
    let code = cleanCode_(r.code);
    if (!code || findRow_(sh, 2, code)) code = freshCode_(sh);
    const now = new Date();
    sh.appendRow([id, code, '', String(r.cls || '').slice(0, 40), now, now, 0, 0, 0, 0, 0, 0, 0, '', String(r.ua || '').slice(0, 160), '{}']);
    return { ok: true, id: id, code: code };
  });
}

/** Restore progress on another device from the 3-picture code. */
function hRestore_(r) {
  rate_('restore', 'all', Z.RATE.RESTORE_PER_MIN);
  const code = cleanCode_(r.code);
  if (!code) return { ok: false, error: 'bad_code' };
  const sh = tab_(Z.TAB.L);
  const row = findRow_(sh, 2, code);
  if (!row) return { ok: false, error: 'not_found' };
  const v = sh.getRange(row, 1, 1, Z.HEAD.L.length).getValues()[0];
  let state = {}; try { state = JSON.parse(v[15] || '{}'); } catch (e) {}
  return { ok: true, id: v[0], code: v[1], cls: v[3], xp: v[6], state: state };
}

/** Batch of events + a state snapshot from the app. */
function hSync_(r) {
  const id = cleanId_(r.id); if (!id) return { ok: false, error: 'no_id' };
  rate_('sync', id, Z.RATE.SYNC_PER_MIN);
  const evs = Array.isArray(r.events) ? r.events.slice(0, Z.MAX_EVENTS_PER_SYNC) : [];
  return withLock_(function () {
    const L = tab_(Z.TAB.L);
    let row = findRow_(L, 1, id);
    if (!row) { // unknown learner (e.g. sheet cleared) → auto-register
      hInitNoLock_(L, id, r);
      row = findRow_(L, 1, id);
    }
    const lv = L.getRange(row, 1, 1, Z.HEAD.L.length).getValues()[0];
    const name = lv[2], cls = lv[3];
    if (evs.length) {
      const E = tab_(Z.TAB.E);
      const rows = evs.map(function (x) {
        return [new Date(Number(x.ts) || Date.now()), id, name, cls, s_(x.session, 24), n_(x.lesson), s_(x.type, 12), s_(x.word, 24),
          x.correct ? 1 : 0, n_(x.misses), n_(x.ms), s_(x.heard, 60), num_(x.score), s_(x.engine, 12), s_(x.mic, 60), s_(x.audioUrl, 200)];
      });
      E.getRange(E.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
      updateMastery_(id, evs);
    }
    // learner row
    const st = r.state || {};
    const speakAgg = speakAgg_(evs);
    const upd = {
      lastSeen: new Date(), xp: n_(st.xp), stars: sumStars_(st.stars), learned: Array.isArray(st.learned) ? st.learned.length : 0,
      lessons: countLessons_(st.stars), streak: n_(st.streak), micLabel: s_(st.mic && st.mic.label, 60), state: JSON.stringify({ stars: st.stars || {}, learned: st.learned || [], streak: n_(st.streak), xp: n_(st.xp) }).slice(0, 4000)
    };
    L.getRange(row, 6).setValue(upd.lastSeen);
    L.getRange(row, 7).setValue(upd.xp);
    L.getRange(row, 8).setValue(upd.stars);
    L.getRange(row, 9).setValue(upd.learned);
    L.getRange(row, 10).setValue(upd.lessons);
    L.getRange(row, 11).setValue(upd.streak);
    if (speakAgg.tries) { L.getRange(row, 12).setValue(n_(lv[11]) + speakAgg.tries); L.getRange(row, 13).setValue(n_(lv[12]) + speakAgg.ok); }
    if (upd.micLabel) L.getRange(row, 14).setValue(upd.micLabel);
    if (!cls && r.cls) L.getRange(row, 4).setValue(s_(r.cls, 40));
    L.getRange(row, 16).setValue(upd.state);
    return { ok: true, saved: evs.length };
  });
}

/** Speaking: audio (base64) → OpenAI transcription → lenient score → logged. */
function hSpeak_(r) {
  const id = cleanId_(r.id) || 'anon';
  rate_('speak', id, Z.RATE.SPEAK_PER_MIN);
  const word = String(r.word || '').toLowerCase().replace(/[^a-z]/g, '');
  if (Z.WORDS.indexOf(word) < 0) return { ok: false, error: 'bad_word' };
  const b64 = String(r.audio || r.audioBase64 || '');
  if (!b64) return { ok: false, error: 'no_audio' };
  const bytes = Utilities.base64Decode(b64);
  if (bytes.length > Z.MAX_AUDIO_BYTES) return { ok: false, error: 'too_big' };
  if (bytes.length < 800) return { ok: true, heard: '', score: 0, pass: false, silent: true };
  const mime = String(r.mime || r.mimeType || 'audio/webm').split(';')[0].toLowerCase();
  const t = transcribe_(bytes, mime, word);
  if (t.error) return { ok: false, error: t.error };
  const sc = score_(word, t.text);
  const pass = sc >= passScore_();
  let url = '';
  if (prop_('SAVE_AUDIO') === '1') url = saveAudio_(bytes, mime, id, word);
  // log immediately so the Sheet sees every attempt even if the app never syncs again
  try {
    withLock_(function () {
      const L = tab_(Z.TAB.L); const row = findRow_(L, 1, id); let name = '', cls = '';
      if (row) { const v = L.getRange(row, 3, 1, 2).getValues()[0]; name = v[0]; cls = v[1]; }
      const E = tab_(Z.TAB.E);
      E.appendRow([new Date(), id, name, cls, s_(r.session, 24), n_(r.lesson), 'speak', word, pass ? 1 : 0, n_(r.try), n_(r.ms), s_(t.text, 60), Math.round(sc * 100) / 100, 'whisper', s_(r.mic, 60), url]);
      updateMastery_(id, [{ type: 'speak', word: word, correct: pass ? 1 : 0 }]);
      if (row) { L.getRange(row, 12).setValue(n_(L.getRange(row, 12).getValue()) + 1); if (pass) L.getRange(row, 13).setValue(n_(L.getRange(row, 13).getValue()) + 1); }
    });
  } catch (e) { console.warn('speak log failed', e); }
  return { ok: true, heard: t.text, score: Math.round(sc * 100) / 100, pass: pass };
}

/* =========================== SPEECH SCORING =========================== */
function norm_(s) { return String(s || '').toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim(); }
function lev_(a, b) {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = [], cur = [], i, j;
  for (j = 0; j <= n; j++) prev[j] = j;
  for (i = 1; i <= m; i++) { cur = [i]; for (j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
  return prev[n];
}
function sim_(a, b) { if (!a || !b) return 0; return 1 - lev_(a, b) / Math.max(a.length, b.length); }
/** Cheap phonetic key so "pitsa"≈"pizza", "tacksi"≈"taxi", "kofi"≈"coffee". */
function phon_(w) {
  w = norm_(w).replace(/\s/g, '');
  w = w.replace(/tz|ts/g, 's').replace(/ph/g, 'f').replace(/ck/g, 'k').replace(/tch/g, 'ch').replace(/x/g, 'ks').replace(/z/g, 's').replace(/c(?=[eiy])/g, 's').replace(/c/g, 'k').replace(/q/g, 'k').replace(/w/g, 'v').replace(/y/g, 'i');
  w = w.replace(/(.)\1+/g, '$1');
  return w.charAt(0) + w.slice(1).replace(/[aeiou]/g, '');
}
function score_(target, heard) {
  const t = norm_(target), h = norm_(heard);
  if (!h) return 0;
  if (h.split(' ').indexOf(t) >= 0) return 1;
  let best = 0;
  h.split(' ').concat([h.replace(/\s/g, '')]).forEach(function (tok) {
    const raw = sim_(t, tok); best = Math.max(best, raw);
    const p = sim_(phon_(t), phon_(tok)); if (p >= 0.8) best = Math.max(best, Math.min(raw + 0.4, 0.55 + 0.4 * p));
  });
  return Math.min(1, best);
}
function passScore_() { const v = parseFloat(prop_('PASS_SCORE')); return isNaN(v) ? Z.DEFAULT_PASS : v; }

function transcribe_(bytes, mime, word) {
  const key = prop_('OPENAI_API_KEY'); if (!key) return { error: 'no_key' };
  const ext = /mp4|m4a|aac|mpeg/.test(mime) ? 'm4a' : /ogg/.test(mime) ? 'ogg' : /wav|wave|x-wav/.test(mime) ? 'wav' : 'webm';
  const ctype = ext === 'm4a' ? 'audio/mp4' : ext === 'ogg' ? 'audio/ogg' : ext === 'wav' ? 'audio/wav' : 'audio/webm';
  const blob = Utilities.newBlob(bytes, ctype, 'speech.' + ext);
  const res = UrlFetchApp.fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'post', headers: { Authorization: 'Bearer ' + key }, muteHttpExceptions: true,
    payload: { file: blob, model: prop_('TRANSCRIBE_MODEL') || 'whisper-1', language: 'en', temperature: '0', response_format: 'json',
      prompt: 'A beginner says one English word. It is one of: ' + Z.WORDS.join(', ') + '.' }
  });
  const code = res.getResponseCode();
  if (code !== 200) { console.warn('openai ' + code + ' ' + res.getContentText().slice(0, 300)); return { error: code === 401 ? 'bad_key' : code === 429 ? 'rate' : 'asr_' + code }; }
  let txt = ''; try { txt = JSON.parse(res.getContentText()).text || ''; } catch (e) {}
  return { text: String(txt).trim().slice(0, 120) };
}

function saveAudio_(bytes, mime, id, word) {
  try {
    const it = DriveApp.getFoldersByName('ZERO RISE recordings');
    const f = it.hasNext() ? it.next() : DriveApp.createFolder('ZERO RISE recordings');
    const ext = /mp4|m4a/.test(mime) ? 'm4a' : /ogg/.test(mime) ? 'ogg' : /wav/.test(mime) ? 'wav' : 'webm';
    return f.createFile(Utilities.newBlob(bytes, mime, id + '_' + word + '_' + Date.now() + '.' + ext)).getUrl();
  } catch (e) { return ''; }
}

/* =========================== MASTERY =========================== */
function updateMastery_(id, evs) {
  const M = tab_(Z.TAB.M);
  const last = M.getLastRow();
  const keys = last > 1 ? M.getRange(2, 1, last - 1, 1).getValues().map(function (r) { return r[0]; }) : [];
  const idx = {}; keys.forEach(function (k, i) { idx[k] = i + 2; });
  const agg = {};
  evs.forEach(function (x) {
    const w = String(x.word || '').toLowerCase(); if (!w || Z.WORDS.indexOf(w) < 0) return;
    const a = agg[w] = agg[w] || { att: 0, ok: 0, st: 0, so: 0 };
    if (x.type === 'speak' || x.type === 'say') { a.st++; if (x.correct) a.so++; }
    else { a.att++; if (x.correct) a.ok++; }
  });
  Object.keys(agg).forEach(function (w) {
    const key = id + '|' + w, a = agg[w]; let row = idx[key];
    if (!row) { M.appendRow([key, id, w, 0, 0, 0, 0, new Date(), 0]); row = M.getLastRow(); }
    const v = M.getRange(row, 4, 1, 3 + 1).getValues()[0]; // attempts, correct, speakTries, speakOK
    const att = n_(v[0]) + a.att, ok = n_(v[1]) + a.ok, st = n_(v[2]) + a.st, so = n_(v[3]) + a.so;
    const acc = att ? ok / att : 0;
    const level = (att >= 2 && acc >= 0.8 ? 2 : att >= 1 && ok >= 1 ? 1 : 0) + (so >= 1 ? 1 : 0);
    M.getRange(row, 4, 1, 6).setValues([[att, ok, st, so, new Date(), Math.min(3, level)]]);
  });
}

function speakAgg_(evs) { let t = 0, o = 0; (evs || []).forEach(function (x) { if (x.type === 'say') { t++; if (x.correct) o++; } }); return { tries: t, ok: o }; }
function sumStars_(m) { let s = 0; if (m) Object.keys(m).forEach(function (k) { s += n_(m[k]); }); return s; }
function countLessons_(m) { let c = 0; if (m) Object.keys(m).forEach(function (k) { if (n_(m[k]) > 0) c++; }); return c; }

/* =========================== DASHBOARD =========================== */
function buildDashboard() {
  const ss = ss_();
  const D = ensureTab_(ss, Z.TAB.D, null);
  D.clear(); D.clearConditionalFormatRules();
  D.getRange('A1').setValue('ZERO RISE — live progress').setFontSize(18).setFontWeight('bold');
  D.getRange('A2').setFormula('="Learners: "&COUNTA(Learners!A2:A)&"   ·   Events: "&COUNTA(Events!A2:A)&"   ·   Updated: "&TEXT(NOW(),"yyyy-mm-dd hh:mm")');
  D.getRange('A4').setFormula('=IFERROR(QUERY(Learners!A:P,"select C, D, B, G, H, I, J, K, L, M, F where A is not null and A <> \'id\' order by F desc label C \'Name\', D \'Class\', B \'Code\', G \'XP\', H \'Stars\', I \'Words\', J \'Lessons\', K \'Streak\', L \'Speak tries\', M \'Speak OK\', F \'Last seen\'",1),"No learners yet")');
  D.getRange('A4:K4').setFontWeight('bold').setBackground('#ffd23f');
  D.setFrozenRows(4);
  D.autoResizeColumns(1, 11);
  const rule = SpreadsheetApp.newConditionalFormatRule().setGradientMaxpointWithValue('#22c55e', SpreadsheetApp.InterpolationType.NUMBER, '24')
    .setGradientMinpointWithValue('#fef3c7', SpreadsheetApp.InterpolationType.NUMBER, '0').setRanges([D.getRange('F5:F1000')]).build();
  D.setConditionalFormatRules([rule]);
  buildWordsTab_(ss);
  toast_('Dashboard rebuilt.');
}

function buildWordsTab_(ss) {
  const W = ensureTab_(ss, Z.TAB.W, ['word', 'learners practised', 'tap accuracy', 'speaking tries', 'speaking pass rate', 'avg speak score', 'hardest?']);
  W.getRange(2, 1, Z.WORDS.length, 1).setValues(Z.WORDS.map(function (w) { return [w]; }));
  const f = [];
  for (let i = 0; i < Z.WORDS.length; i++) {
    const r = i + 2;
    f.push([
      '=IFERROR(ROWS(UNIQUE(FILTER(Events!B:B,Events!H:H=A' + r + '))),0)',
      '=IFERROR(COUNTIFS(Events!H:H,A' + r + ',Events!G:G,"tap",Events!I:I,1)/COUNTIFS(Events!H:H,A' + r + ',Events!G:G,"tap"),"")',
      '=COUNTIFS(Events!H:H,A' + r + ',Events!G:G,"speak")+COUNTIFS(Events!H:H,A' + r + ',Events!G:G,"say")',
      '=IFERROR((COUNTIFS(Events!H:H,A' + r + ',Events!G:G,"speak",Events!I:I,1)+COUNTIFS(Events!H:H,A' + r + ',Events!G:G,"say",Events!I:I,1))/D' + r + ',"")',
      '=IFERROR(AVERAGEIFS(Events!M:M,Events!H:H,A' + r + ',Events!M:M,">=0"),"")',
      '=IF(AND(ISNUMBER(C' + r + '),C' + r + '<0.7),"review","")'
    ]);
  }
  W.getRange(2, 2, f.length, 6).setFormulas(f);
  W.getRange('C2:C51').setNumberFormat('0%'); W.getRange('E2:E51').setNumberFormat('0%'); W.getRange('F2:F51').setNumberFormat('0.00');
}

/* =========================== STATS FOR TEACHERS =========================== */
function learnersList_() {
  const sh = tab_(Z.TAB.L), last = sh.getLastRow(); if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, 15).getValues().map(function (v) {
    return { id: v[0], code: v[1], name: v[2], cls: v[3], lastSeen: v[5], xp: v[6], stars: v[7], words: v[8], lessons: v[9], streak: v[10], speakTries: v[11], speakOK: v[12] };
  });
}
function health_() {
  return { learners: Math.max(0, tab_(Z.TAB.L).getLastRow() - 1), events: Math.max(0, tab_(Z.TAB.E).getLastRow() - 1), hasKey: !!prop_('OPENAI_API_KEY'), model: prop_('TRANSCRIBE_MODEL') || 'whisper-1' };
}

/* =========================== INFRA HELPERS =========================== */
function ss_() {
  let ss = null;
  try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) {}
  if (ss) return ss;
  const p = PropertiesService.getScriptProperties();
  const id = p.getProperty('SPREADSHEET_ID');
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) {} }
  ss = SpreadsheetApp.create(Z.TITLE);
  p.setProperty('SPREADSHEET_ID', ss.getId());
  return ss;
}
function tab_(name) {
  const ss = ss_(); let sh = ss.getSheetByName(name);
  if (!sh) { setup(); sh = ss_().getSheetByName(name); }
  return sh;
}
function ensureTab_(ss, name, headers) {
  let sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (headers) {
    if (sh.getLastRow() === 0 || String(sh.getRange(1, 1).getValue()) !== headers[0]) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#ffd23f');
    sh.setFrozenRows(1);
  }
  return sh;
}
function findRow_(sh, col, value) {
  const last = sh.getLastRow(); if (last < 2) return 0;
  const vals = sh.getRange(2, col, last - 1, 1).getValues();
  for (let i = 0; i < vals.length; i++) if (String(vals[i][0]) === String(value)) return i + 2;
  return 0;
}
function touchLearner_(sh, row, o) { sh.getRange(row, 6).setValue(new Date()); if (o && o.cls && !sh.getRange(row, 4).getValue()) sh.getRange(row, 4).setValue(s_(o.cls, 40)); }
function hInitNoLock_(L, id, r) {
  let code = cleanCode_(r.code); if (!code || findRow_(L, 2, code)) code = freshCode_(L);
  const now = new Date(); L.appendRow([id, code, '', s_(r.cls, 40), now, now, 0, 0, 0, 0, 0, 0, 0, '', '', '{}']);
}
function freshCode_(sh) {
  for (let i = 0; i < 40; i++) {
    const c = [0, 0, 0].map(function () { return Z.PICS[Math.floor(Math.random() * Z.PICS.length)]; }).join('-');
    if (!findRow_(sh, 2, c)) return c;
  }
  return [0, 0, 0].map(function () { return Z.PICS[Math.floor(Math.random() * Z.PICS.length)]; }).join('-');
}
function cleanCode_(c) {
  const parts = (Array.isArray(c) ? c : String(c || '').split('-')).map(function (x) { return String(x).toLowerCase().replace(/[^a-z]/g, ''); });
  if (parts.length !== 3) return '';
  for (let i = 0; i < 3; i++) if (Z.PICS.indexOf(parts[i]) < 0) return '';
  return parts.join('-');
}
function cleanId_(x) { x = String(x || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 24); return x.length >= 4 ? x : ''; }
function newId_() { return Utilities.getUuid().replace(/-/g, '').slice(0, 10); }
function s_(v, n) { return String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').slice(0, n || 60); }
function n_(v) { const x = Number(v); return isFinite(x) ? x : 0; }
function num_(v) { const x = Number(v); return isFinite(x) ? Math.round(x * 100) / 100 : ''; }
function prop_(k) { return PropertiesService.getScriptProperties().getProperty(k); }
function tokenOK_(t) { const T = prop_('TEACHER_TOKEN'); return !!T && String(t || '') === T; }
function toast_(m) { try { ss_().toast(m, 'ZERO RISE', 6); } catch (e) {} }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function withLock_(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) throw new Error('busy');
  try { return fn(); } finally { lock.releaseLock(); }
}
function rate_(kind, who, max) {
  const c = CacheService.getScriptCache(), k = 'rl|' + kind + '|' + who + '|' + Math.floor(Date.now() / 60000);
  const n = Number(c.get(k) || 0) + 1; c.put(k, String(n), 90);
  if (n > max) throw new Error('slow_down');
}
