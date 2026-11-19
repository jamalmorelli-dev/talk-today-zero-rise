/* Lesson model. Run: node test/engine_test.js */
const TT = require('../src/engine.js');
const assert = require('assert');
let pass = 0, fail = 0;
function t(name, cond) {
  if (cond) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name); }
}

const words = TT.WORDS;
t('50 words', words.length === 50);
t('words unique', new Set(words).size === 50);
t('eight sets', TT.SETS.length === 8);
words.forEach(w => {
  t('use line ' + w, typeof TT.useLine(w) === 'string' && TT.useLine(w).length > 8 && !/[^\x00-\x7F]/.test(TT.useLine(w)));
  const s = TT.sentence(w);
  t('english sentence ' + w, TT.hasQuestion(w) ? s === 'Where is the ' + w + '?' : s === 'It is ' + TT.article(w) + ' ' + w + '.');
});
t('apple article', TT.sentence('apple') === 'It is an apple.');
t('door article', TT.sentence('door') === 'It is a door.');
t('question audio words', TT.QUESTION.length === 24);

const m = TT.blankMastery();
t('level 0', TT.levelOf(m) === 0);
m.taps = 1; m.ok = 1;
t('level 1 after one hit', TT.levelOf(m) === 1);
m.taps = 2; m.ok = 2;
t('level 2 after two clean hits', TT.levelOf(m) === 2);
m.sayOK = 1;
t('level 3 after a speak pass', TT.levelOf(m) === 3);
const sloppy = { taps: 4, ok: 2, sayOK: 0 };
t('accuracy blocks level 2', TT.levelOf(sloppy) === 1);

t('new word slow stimulus', TT.stimulus('pizza', {}, 1) === 's');
t('gear 2 uses the word', TT.stimulus('pizza', { taps: 1, ok: 1 }, 2) === 'w');
t('gear 3 asks the question', TT.stimulus('pizza', { taps: 2, ok: 2 }, 3) === 'f');
t('no question file stays a word', TT.stimulus('door', {}, 1) === 'w');
t('gear 3 without a question file stays a word', TT.stimulus('apple', { taps: 2, ok: 2 }, 3) === 'w');

const food = TT.setById('food').words;
const foil = TT.pickFoil('pizza', food, () => 0);
t('foil is in the set', food.indexOf(foil) >= 0 && foil !== 'pizza');
t('foil prefers the same group', TT.groupOf(foil) === TT.groupOf('pizza'));

const mastery = { pizza: { taps: 2, ok: 2, next: Date.now() + 999999 } };
const order = TT.orderWords(['pizza', 'burger'], mastery, Date.now());
t('due word comes first', order[0] === 'burger');

t('delays', TT.delayMs(0) === 0 && TT.delayMs(1) === 12 * 60 * 1000 && TT.delayMs(2) === 24 * 3600000 && TT.delayMs(3) === 72 * 3600000);
t('bpm follows gear', TT.bpmOf(1) === 110 && TT.bpmOf(2) === 122 && TT.bpmOf(3) === 132);
t('gear names', TT.gearLabel(1) === 'Listen' && TT.gearLabel(2) === 'Question' && TT.gearLabel(3) === 'Say it');

const fresh = {};
food.forEach(w => { fresh[w] = { ok: 2, taps: 2 }; });
t('set gear 3 at 100 percent strong', TT.gearOf(food, fresh) === 3);
t('set complete', TT.setComplete(food, fresh));
t('code needs three pictures', TT.codeFrom(['pizza', 'taxi', 'bus']) === 'pizza-taxi-bus');
t('bad code rejected', TT.codeFrom(['pizza', 'nope', 'bus']) === '');
t('id length', TT.newId(() => 0).length === 10);

const old = TT.migrate({ coins: 500, discovered: { taxi: 1, nope: 1 }, mode: 'radar', streak: 9 });
t('old coins dropped', old.coins === 1 && old.v === 5);
t('old radar becomes find', old.mode === 'find');
t('fake word dropped', !old.mastery.nope && old.mastery.taxi.ok === 1);
const kept = TT.migrate({ v: 5, coins: 3, setId: 'home', mastery: { door: TT.blankMastery() }, beatOn: true });
t('v5 kept', kept.coins === 3 && kept.setId === 'home' && kept.beatOn === true);

const blob = JSON.stringify(TT);
t('engine stays english', !/darija|دارجة|العربية/i.test(blob));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
