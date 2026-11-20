/* ZERO RISE lesson engine. Pure functions. English only. No DOM. */
const TT = {
  PICS: ['pizza', 'banana', 'taxi', 'bus', 'doctor', 'police', 'football', 'camera', 'coffee', 'tomato', 'robot', 'radio'],
  BOOKS: [
    { id: 'kids', name: 'Super Minds 1', code: 'SM1', series: 'Cambridge Super Minds', level: 'Kids Level Zero', icon: '📘' },
    { id: 'teens', name: 'Gateway to the World', code: 'GTTW', series: 'Macmillan Gateway', level: 'Teens A1–A1+', icon: '🌍' },
    { id: 'adults', name: 'Talk Keynote', code: 'KEYNOTE', series: 'National Geographic Keynote & Voices', level: 'Adults A1–A2', icon: '💼' }
  ],
  CEFR: [
    { id: 'pre-a1', code: 'PRE-A1', label: 'PRE-A1', name: 'Starter Foundations', icon: '📘', book: 'Super Minds 1', publisher: 'Cambridge', cohort: 'Kids 4–8 · Zero Level' },
    { id: 'pre-a1-a1', code: 'PRE-A1–A1', label: 'PRE-A1 → A1', name: 'Elementary Bridge', icon: '🌍', book: 'Gateway to the World', publisher: 'Macmillan', cohort: 'Upper Kids & Teens 9–14' },
    { id: 'a1-a1plus', code: 'A1–A1+', label: 'A1 → A1+', name: 'Everyday Fluency', icon: '💼', book: 'Talk Keynote', publisher: 'National Geographic', cohort: 'Teens 15+ & Adults' }
  ],
  SETS: [
    {
      id: 'class',
      cefrId: 'pre-a1',
      cefr: 'PRE-A1',
      bookId: 'kids',
      book: 'Super Minds 1',
      bookCode: 'SM1',
      unit: 'Unit 1: At School',
      lpTitle: 'Schoolbag Treasures & Classroom Objects',
      lpCode: 'TT-LP-01',
      teacher: 'Douae / Meriam',
      cohort: 'PRE-A1 | KIDS 4–8',
      name: 'School',
      words: ['apple', 'banana', 'pen', 'pencil']
    },
    {
      id: 'outside',
      cefrId: 'pre-a1',
      cefr: 'PRE-A1',
      bookId: 'kids',
      book: 'Super Minds 1',
      bookCode: 'SM1',
      unit: 'Unit 2: Animals & Nature',
      lpTitle: 'Animals, Pets & Nature Adventure',
      lpCode: 'TT-LP-02',
      teacher: 'Meriam / Douae',
      cohort: 'PRE-A1 | KIDS 6–9',
      name: 'Animals & Nature',
      words: ['ball', 'cat', 'dog', 'fish', 'tree', 'car']
    },
    {
      id: 'home',
      cefrId: 'pre-a1',
      cefr: 'PRE-A1',
      bookId: 'kids',
      book: 'Super Minds 1',
      bookCode: 'SM1',
      unit: 'Unit 3: House & Home',
      lpTitle: 'My Magical House & Rooms',
      lpCode: 'TT-LP-03',
      teacher: 'Lamiae / Douae',
      cohort: 'PRE-A1 | KIDS 6–11',
      name: 'House & Home',
      words: ['door', 'window', 'cup', 'bed', 'bag', 'book']
    },
    {
      id: 'food',
      cefrId: 'pre-a1-a1',
      cefr: 'PRE-A1–A1',
      bookId: 'teens',
      book: 'Gateway to the World',
      bookCode: 'GTTW',
      unit: 'Unit 3: Snacks & Food',
      lpTitle: 'Food, Drinks & The Restaurant Challenge',
      lpCode: 'TT-LP-04',
      teacher: 'Zineb / Lamiae',
      cohort: 'PRE-A1–A1 | TEENS 12–14',
      name: 'Snacks & Food',
      words: ['pizza', 'burger', 'chocolate', 'tomato', 'orange', 'water']
    },
    {
      id: 'play',
      cefrId: 'pre-a1-a1',
      cefr: 'PRE-A1–A1',
      bookId: 'teens',
      book: 'Gateway to the World',
      bookCode: 'GTTW',
      unit: 'Unit 4: Sports & Sounds',
      lpTitle: 'Sports, Sounds & Multimedia Adventure',
      lpCode: 'TT-LP-05',
      teacher: 'Adnane / Lamiae',
      cohort: 'PRE-A1–A1 | UPPER KIDS 9–11',
      name: 'Sports & Sounds',
      words: ['football', 'tennis', 'music', 'camera', 'robot', 'radio']
    },
    {
      id: 'tech',
      cefrId: 'pre-a1-a1',
      cefr: 'PRE-A1–A1',
      bookId: 'teens',
      book: 'Gateway to the World',
      bookCode: 'GTTW',
      unit: 'Unit 1: Everyday Tech',
      lpTitle: 'Everyday Tech & Streetwear Essentials',
      lpCode: 'TT-LP-06',
      teacher: 'Adnane / Souhir',
      cohort: 'PRE-A1–A1 | TEENS 13–16',
      name: 'Tech & Streetwear',
      words: ['headphones', 'computer', 'telephone', 'television', 'sneakers', 'backpack', 'bicycle', 'jacket']
    },
    {
      id: 'city',
      cefrId: 'a1-a1plus',
      cefr: 'A1–A1+',
      bookId: 'adults',
      book: 'Talk Keynote',
      bookCode: 'KEYNOTE',
      unit: 'Unit 1: Transit & Travel',
      lpTitle: 'Transit, Travel & Exploring Our City',
      lpCode: 'TT-LP-07',
      teacher: 'Souhir / Adnane',
      cohort: 'A1–A1+ | TEENS & ADULTS',
      name: 'Transit & Travel',
      words: ['taxi', 'bus', 'train', 'station', 'airport', 'hotel']
    },
    {
      id: 'town',
      cefrId: 'a1-a1plus',
      cefr: 'A1–A1+',
      bookId: 'adults',
      book: 'Talk Keynote',
      bookCode: 'KEYNOTE',
      unit: 'Unit 2: City Services',
      lpTitle: 'Places in Town, Healthcare & City Services',
      lpCode: 'TT-LP-08',
      teacher: 'Souhir / Meriam',
      cohort: 'A1–A1+ | ADULTS 18+',
      name: 'City Services',
      words: ['hospital', 'doctor', 'police', 'pharmacy', 'bank', 'passport', 'coffee', 'money']
    }
  ],
  GROUPS: {
    food: ['apple', 'banana', 'pizza', 'burger', 'chocolate', 'tomato', 'orange', 'water', 'coffee'],
    animals: ['cat', 'dog', 'fish'],
    school: ['book', 'pen', 'pencil', 'bag', 'backpack'],
    home: ['door', 'window', 'cup', 'bed'],
    ride: ['car', 'taxi', 'bus', 'train', 'bicycle'],
    place: ['hotel', 'hospital', 'pharmacy', 'bank', 'station', 'airport'],
    people: ['doctor', 'police'],
    tech: ['computer', 'telephone', 'television', 'radio', 'headphones', 'camera'],
    sport: ['football', 'tennis', 'ball'],
    wear: ['sneakers', 'jacket'],
    other: ['robot', 'music', 'money', 'passport', 'tree']
  },
  /* These files exist as s_ (slow word) and f_ ("Where is the …?"). Text must match that recording. */
  QUESTION: ['banana', 'burger', 'bus', 'camera', 'chocolate', 'coffee', 'computer', 'doctor', 'football', 'hotel', 'money', 'music', 'orange', 'pizza', 'police', 'radio', 'robot', 'taxi', 'telephone', 'television', 'tennis', 'tomato', 'train', 'water']
};

TT.WORDS = TT.SETS.reduce((a, s) => a.concat(s.words), []);
TT.QSET = {};
TT.QUESTION.forEach(w => { TT.QSET[w] = 1; });

TT.setById = function (id) {
  for (let i = 0; i < TT.SETS.length; i++) if (TT.SETS[i].id === id) return TT.SETS[i];
  return TT.SETS[0];
};

TT.bookById = function (bookId) {
  for (let i = 0; i < TT.BOOKS.length; i++) if (TT.BOOKS[i].id === bookId) return TT.BOOKS[i];
  return TT.BOOKS[0];
};

TT.bookOfSet = function (setId) {
  const s = TT.setById(setId);
  return TT.bookById(s.bookId);
};

TT.setsByBook = function (bookId) {
  return TT.SETS.filter(s => s.bookId === bookId);
};

TT.cefrById = function (cefrId) {
  for (let i = 0; i < TT.CEFR.length; i++) if (TT.CEFR[i].id === cefrId) return TT.CEFR[i];
  return TT.CEFR[0];
};

TT.cefrOfSet = function (setId) {
  const s = TT.setById(setId);
  return TT.cefrById(s.cefrId);
};

TT.setsByCefr = function (cefrId) {
  return TT.SETS.filter(s => s.cefrId === cefrId);
};

TT.groupOf = function (word) {
  const keys = Object.keys(TT.GROUPS);
  for (let i = 0; i < keys.length; i++) if (TT.GROUPS[keys[i]].indexOf(word) >= 0) return keys[i];
  return '';
};

TT.hasQuestion = function (word) { return !!TT.QSET[word]; };

TT.article = function (word) { return /^[aeiou]/.test(word) ? 'an' : 'a'; };

TT.sentence = function (word) {
  if (TT.hasQuestion(word)) return 'Where is the ' + word + '?';
  return 'It is ' + TT.article(word) + ' ' + word + '.';
};

/* Extra English, shown on screen after a hit. Not a recording. */
TT.USE = {
  door: 'You open a door.',
  window: 'You look through a window.',
  cup: 'A cup holds a drink.',
  bed: 'You sleep in a bed.',
  bag: 'A bag holds your things.',
  book: 'You read a book.',
  ball: 'You throw a ball.',
  cat: 'A cat is an animal.',
  dog: 'A dog is an animal.',
  fish: 'A fish lives in water.',
  tree: 'A tree has leaves.',
  car: 'A car takes you places.',
  apple: 'An apple is a fruit.',
  banana: 'You peel a banana.',
  pen: 'You write with a pen.',
  pencil: 'You write with a pencil.',
  pizza: 'Pizza is food.',
  burger: 'A burger is food.',
  chocolate: 'Chocolate is sweet.',
  tomato: 'A tomato is red.',
  orange: 'An orange is a fruit.',
  water: 'You drink water.',
  football: 'You kick a football.',
  tennis: 'You play tennis.',
  music: 'You listen to music.',
  camera: 'A camera takes a picture.',
  robot: 'A robot is a machine.',
  radio: 'A radio plays sound.',
  headphones: 'Headphones go on your ears.',
  computer: 'You type on a computer.',
  telephone: 'You talk on a telephone.',
  television: 'You watch television.',
  sneakers: 'Sneakers go on your feet.',
  backpack: 'A backpack holds books.',
  bicycle: 'You ride a bicycle.',
  jacket: 'A jacket keeps you warm.',
  taxi: 'A taxi takes you places.',
  bus: 'A bus carries people.',
  train: 'A train runs on tracks.',
  station: 'You catch a train at a station.',
  airport: 'Planes leave from an airport.',
  hotel: 'You sleep at a hotel.',
  hospital: 'A hospital helps sick people.',
  doctor: 'A doctor helps sick people.',
  police: 'The police keep people safe.',
  pharmacy: 'A pharmacy has medicine.',
  bank: 'A bank keeps money safe.',
  passport: 'A passport is for travel.',
  coffee: 'Coffee is a hot drink.',
  money: 'You pay with money.'
};

TT.useLine = function (word) { return TT.USE[word] || ''; };

TT.blankMastery = function () { return { taps: 0, ok: 0, says: 0, sayOK: 0, next: 0, heard: 0 }; };

TT.levelOf = function (m) {
  m = m || {};
  const taps = m.taps || 0, ok = m.ok || 0, sayOK = m.sayOK || 0;
  const acc = taps ? ok / taps : 0;
  let lv = 0;
  if (ok >= 1) lv = 1;
  if (ok >= 2 && acc >= 0.6) lv = 2;
  if (sayOK >= 1 && lv >= 1) lv = Math.min(3, lv + 1);
  return lv;
};

/* Hours until the word is due again. Inside a session the queue also rotates. */
TT.delayMs = function (level) {
  return [0, 12 * 60 * 1000, 24 * 3600000, 72 * 3600000][level] || 0;
};

TT.gearOf = function (words, mastery) {
  let strong = 0;
  for (let i = 0; i < words.length; i++) if (TT.levelOf(mastery[words[i]]) >= 2) strong++;
  if (words.length >= 4 && strong >= Math.ceil(words.length * 0.7)) return 3;
  if (strong >= 2) return 2;
  return 1;
};

TT.bpmOf = function (gear) { return gear >= 3 ? 132 : gear === 2 ? 122 : 110; };

TT.gearLabel = function (gear) {
  if (gear >= 3) return 'Say it';
  if (gear === 2) return 'Question';
  return 'Listen';
};

TT.stimulus = function (word, mastery, gear) {
  const lv = TT.levelOf(mastery);
  if (gear >= 3 && TT.hasQuestion(word)) return 'f';
  if (gear <= 1 && lv === 0 && TT.hasQuestion(word)) return 's';
  return 'w';
};

TT.pickFoil = function (target, pool, rnd) {
  const g = TT.groupOf(target);
  let cands = pool.filter(w => w !== target && TT.groupOf(w) === g);
  if (!cands.length) cands = pool.filter(w => w !== target);
  if (!cands.length) return target;
  return cands[Math.floor(rnd() * cands.length)];
};

TT.orderWords = function (words, mastery, now) {
  return words.slice().sort((a, b) => {
    const ma = mastery[a] || {};
    const mb = mastery[b] || {};
    const da = !ma.next || ma.next <= now ? 0 : 1;
    const db = !mb.next || mb.next <= now ? 0 : 1;
    if (da !== db) return da - db;
    const la = TT.levelOf(ma), lb = TT.levelOf(mb);
    if (la !== lb) return la - lb;
    return (ma.next || 0) - (mb.next || 0);
  });
};

TT.knownCount = function (words, mastery) {
  let n = 0;
  for (let i = 0; i < words.length; i++) if ((mastery[words[i]] || {}).ok >= 1) n++;
  return n;
};

TT.setComplete = function (words, mastery) {
  return TT.knownCount(words, mastery) === words.length && words.length > 0;
};

TT.newId = function (rnd) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < 10; i++) s += alphabet[Math.floor(rnd() * alphabet.length)];
  return s;
};

TT.codeFrom = function (pics) {
  if (!pics || pics.length !== 3) return '';
  for (let i = 0; i < 3; i++) if (TT.PICS.indexOf(pics[i]) < 0) return '';
  return pics.join('-');
};

TT.migrate = function (raw) {
  const base = {
    v: 5, id: '', code: '', cls: '', coins: 0, streak: 0, setId: 'food',
    mastery: {}, setCleared: {}, soundOn: true, beatOn: false, mode: 'drill',
    events: [], session: '', greeted: false
  };
  if (!raw || typeof raw !== 'object') return base;
  if (raw.v === 5) {
    base.id = raw.id || '';
    base.code = raw.code || '';
    base.cls = raw.cls || '';
    base.coins = Number(raw.coins) || 0;
    base.streak = Number(raw.streak) || 0;
    base.setId = raw.setId || 'food';
    base.mastery = raw.mastery || {};
    base.setCleared = raw.setCleared || {};
    base.soundOn = raw.soundOn !== false;
    base.beatOn = !!raw.beatOn;
    base.mode = raw.mode || 'drill';
    base.events = Array.isArray(raw.events) ? raw.events.slice(-120) : [];
    base.session = raw.session || '';
    base.greeted = !!raw.greeted;
    return base;
  }
  /* Old arcade save: keep real taps, drop farmed coins. */
  const discovered = raw.discovered || {};
  Object.keys(discovered).forEach(w => {
    if (TT.WORDS.indexOf(w) >= 0) base.mastery[w] = { taps: 1, ok: 1, says: 0, sayOK: 0, next: 0, heard: 1 };
  });
  base.coins = TT.knownCount(TT.WORDS, base.mastery);
  if (raw.mode === 'radar') base.mode = 'find';
  else if (raw.mode === 'speak' || raw.mode === 'memory' || raw.mode === 'drill') base.mode = raw.mode;
  return base;
};

if (typeof module !== 'undefined' && module.exports) module.exports = TT;
