const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');
const { sourceModule, frontend, dom } = require('./learning-load.cjs');
const game = sourceModule(path.join(frontend, 'src/lib/game.js'));
const storage = dom.window.localStorage;
const saved = () => JSON.parse(game.exportProfile().json).game;
const old = () => Date.now() - 1000;
const outcome = (startedAt, review) => ({
  attempt: JSON.stringify({ startedAt, answers: Object.fromEntries(review.map(row => [row.id, row.given])) }),
  correct: review.filter(row => row.correct).length, total: review.length, elapsed_sec: 100,
  by_section: [{ id: 'mechanics', title: 'Механика', correct: 1, total: review.length }], review,
});
const row = (i, trainerTaskId, given, correct = false) => ({
  id: 'B' + i, trainerTaskId, given, correct, answer: 4, solution: [{ text: 'Разбор' }],
});
const complete = (result) => game.recordCt({ correct: result.correct, id: '01', full: true, result });

test('quiz errors can be fixed without counting as trainer tasks, XP, joules, or quest credit', () => {
  storage.clear();
  const before = saved();
  game.recordQuizAnswer('q1', { correct: false, given: 3 });
  assert.equal(saved().mistakes[0], 'quiz:ravnouskorennoe-dvizhenie:q1');
  game.recordQuizAnswer('q1', { correct: true, given: 2 });
  const after = saved();
  for (const key of ['xp', 'joules', 'solved', 'quests']) assert.equal(JSON.stringify(after[key]), JSON.stringify(before[key]));
  assert.equal(after.mistakes.length, 0);
});

test('full CT gives its own reward once; blanks do not become errors and zero does', () => {
  storage.clear();
  const result = outcome(old(), [row(1, 'some:t1', null), row(2, 'some:t2', '0'), row(3, 'some:t3', '4', true)]);
  assert.equal(complete(result), true);
  const first = saved();
  assert.equal(first.solved.length, 0);
  assert.equal(first.mistakes.length, 1);
  assert.equal(first.mistakes[0], 'some:t2');
  assert.equal(first.mistakeAt['some:t2'].given, '0');
  assert.equal(first.joules, 215);
  assert.equal(first.xp, 20);
  game.solveTask('some:t2');
  assert.equal(complete(result), true);
  assert.equal(saved().mistakes.length, 0);
  assert.equal(saved().joules, 240);
});

test('a blank trial does not consume the variant reward or unlock its artifact', () => {
  storage.clear();
  assert.equal(complete(outcome(old(), [row(1, 'some:t1', null)])), true);
  assert.deepEqual(saved().completedExams, ['01']);
  assert.equal(saved().joules, 200);
  assert.ok(!saved().owned.includes('watch'));
  const result = outcome(old() + 5, [row(1, 'some:t1', '4', true)]);
  assert.equal(complete(result), true);
  assert.equal(saved().joules, 215);
  assert.ok(saved().owned.includes('watch'));
  assert.equal(complete(outcome(old() + 10, [row(1, 'some:t1', '4', true)])), true);
  assert.equal(saved().joules, 215);
});

test('a legacy completion preserves its previously paid reward on later attempts', () => {
  storage.clear();
  storage.setItem('kvant_game_v1', JSON.stringify({ completedExams: ['01'], xp: 20, joules: 215 }));
  assert.equal(complete(outcome(old(), [row(1, 'some:t1', '4', true)])), true);
  assert.equal(saved().joules, 215);
  assert.equal(saved().xp, 20);
});

test('a delayed CT completion cannot re-add a trainer mistake fixed during the attempt', () => {
  storage.clear();
  const result = outcome(old(), [row(1, 'some:t1', '3')]);
  game.failTask('some:t1', '3');
  game.solveTask('some:t1');
  assert.equal(complete(result), true);
  assert.equal(saved().mistakes.length, 0);
  const newer = outcome(Date.now() + 1, [row(1, 'some:t1', '3')]);
  assert.equal(complete(newer), true);
  assert.equal(saved().mistakes.length, 1);
  assert.equal(saved().solved.length, 1);
});

test('an older or divergent CT sheet cannot be acknowledged as a saved result', () => {
  storage.clear();
  const startedAt = old();
  const current = outcome(startedAt, [row(1, 'some:t1', '4', true)]);
  assert.equal(complete(current), true);
  assert.equal(complete(current), true);
  for (const earlier of [startedAt, startedAt - 1]) {
    assert.equal(complete(outcome(earlier, [row(1, 'some:t1', '7')])), false);
  }
  assert.deepEqual(saved().examResults['01'], current);
  assert.equal(saved().joules, 215);
});

test('an exam callback from before profile replacement cannot change the imported profile', () => {
  storage.clear();
  const file = JSON.stringify({ app: 'purradox', schema: 1, game: { nickname: 'Ада', xp: 50 } });
  assert.equal(game.importProfile(file).ok, true);
  const original = storage.getItem('purradox_profile_v2');
  game.trackUnique('ct_answer', 'ct-demo:A1', null);
  const result = outcome(old(), [row(1, 'some:t1', '4', true)]);
  assert.equal(game.recordCt({ correct: 1, result, profileGeneration: null }), false);
  assert.equal(storage.getItem('purradox_profile_v2'), original);
});
