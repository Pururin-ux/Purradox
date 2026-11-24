const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');
const { sourceModule, frontend, dom } = require('./learning-load.cjs');

const game = sourceModule(path.join(frontend, 'src/lib/game.js'));
const storage = dom.window.localStorage;
const task = 'ravnouskorennoe-dvizhenie:t1';
const quiz = 'ravnouskorennoe-dvizhenie:q1';
const mark = 'quiz:' + quiz;
const before = Date.now() - 2000;
const result = (correct, offset, attemptId, given = 3) => ({ correct, given, checkedAt: before + offset, attemptId });
const save = (id, outcome, extra = {}) => game.saveLearningResult(id, outcome, extra);
const saved = () => JSON.parse(game.exportProfile().json).game;

test('a delayed wrong trainer answer cannot undo a newer correct answer and reward', () => {
  storage.clear();
  assert.equal(save(task, result(true, 2, 'b', 2)), 'saved');
  assert.equal(save(task, result(false, 1, 'a')), 'stale');
  const profile = saved();
  assert.equal(profile.mistakes.length, 0);
  assert.equal(profile.solved.includes(task), true);
  assert.equal(profile.joules, 225);
});

test('a delayed correct trainer answer cannot erase a newer mistake or award points', () => {
  storage.clear();
  assert.equal(save(task, result(false, 2, 'b')), 'saved');
  assert.equal(save(task, result(true, 1, 'a', 2)), 'stale');
  const profile = saved();
  assert.deepEqual(profile.mistakes, [task]);
  assert.equal(profile.mistakeAt[task].given, 3);
  assert.equal(profile.solved.includes(task), false);
  assert.equal(profile.joules, 200);
});

test('quiz repeat honors attempt order across the quiz card and the review route', () => {
  storage.clear();
  assert.equal(save(mark, result(false, 1, 'a')), 'saved');
  assert.equal(save(mark, result(true, 3, 'c', 2)), 'saved');
  assert.equal(save(mark, result(false, 2, 'b')), 'stale');
  assert.deepEqual(saved().mistakes, []);
  assert.equal(saved().joules, 200);
});

test('a repeated confirmation for the same checked attempt does not earn twice', () => {
  storage.clear();
  const outcome = result(true, 1, 'a', 2);
  assert.equal(save(task, outcome), 'saved');
  assert.equal(save(task, outcome), 'saved');
  assert.equal(saved().joules, 225);
  assert.equal(saved().xp, 20);
});

test('profile fields edited independently both survive', () => {
  storage.clear();
  game.saveProfile({ nickname: 'Ада' });
  game.saveProfile({ avatar: 'prism' });
  assert.equal(saved().nickname, 'Ада');
  assert.equal(saved().avatar, 'prism');
});

test('overlapping edits to the same field require a decision', () => {
  storage.clear();
  assert.equal(game.saveProfile({ nickname: 'Саша' }), true);
  assert.equal(game.saveProfile({ nickname: 'Дима', expected: { nickname: '' } }), 'conflict');
  assert.equal(saved().nickname, 'Саша');
  assert.equal(game.saveProfile({ nickname: 'Дима' }), true);
  assert.equal(saved().nickname, 'Дима');
});

test('repeated shelf actions keep their original direction', () => {
  storage.clear();
  assert.equal(game.toggleShelf('cradle', false), true);
  assert.equal(game.toggleShelf('cradle', false), true);
  assert.deepEqual(saved().shelf, []);
  assert.equal(game.toggleShelf('cradle', true), true);
  assert.equal(game.toggleShelf('cradle', true), true);
  assert.deepEqual(saved().shelf, ['cradle']);
});

test('an old skipped alias cannot mask a more recent actual answer', () => {
  storage.clear();
  storage.setItem('kvant_game_v1', JSON.stringify({ mistakes: ['t1', task], mistakeAt: {
    t1: { at: '2026-11-01T10:00:00Z', given: '' },
    [task]: { at: '2026-11-02T10:00:00Z', given: 3 },
  } }));
  assert.deepEqual(saved().mistakes, [task]);
  assert.equal(saved().mistakeAt[task].given, 3);
});

test('a successful correction extends a streak without paying for the task again', () => {
  storage.clear();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  storage.setItem('kvant_game_v1', JSON.stringify({ streak: 6, lastDay: game.dayKey(yesterday),
    solved: [task], mistakes: [task], joules: 340, xp: 120 }));
  assert.equal(save(task, result(true, 1, 'a')), 'saved');
  const profile = saved();
  assert.deepEqual(profile.mistakes, []);
  assert.equal(profile.streak, 7);
  assert.equal(profile.lastDay, game.dayKey());
  assert.equal(profile.joules, 340);
  assert.equal(profile.xp, 120);
  assert.ok(profile.owned.includes('shard'));
});

test('awards at the largest supported balance keep the profile readable', () => {
  storage.clear();
  const max = Number.MAX_SAFE_INTEGER;
  storage.setItem('kvant_game_v1', JSON.stringify({ joules: max - 4, xp: max - 2 }));
  assert.equal(save(task, result(true, 1, 'a')), 'saved');
  assert.equal(saved().joules, max);
  assert.equal(saved().xp, max);
  assert.equal(game.saveProfile({ nickname: 'Ада' }), true);
});

test('a broken saved CT result never reaches the report route', () => {
  storage.clear();
  storage.setItem('kvant_game_v1', JSON.stringify({ examResults: { demo: { draftKey: 'kvant_draft_v1:ct:demo:abc.abc' } } }));
  assert.equal(game.readCtResult('demo'), null);
});


test('a worked correction keeps the original error until another unseen question checks the same block', () => {
  storage.clear();
  const related = 'ravnouskorennoe-dvizhenie:t7';
  const other = 'ravnouskorennoe-dvizhenie:t9';
  const skill = { lessonBlock: 'graph' };
  save(task, result(false, 1, 'miss'), skill);
  save(task, result(true, 2, 'correction'), { ...skill, hinted: true });
  assert.equal(saved().learningChecks[task].method, 'assisted');
  assert.ok(saved().mistakes.includes(task));
  save(other, result(true, 3, 'different'), { lessonBlock: 'idea', transferFrom: task });
  assert.ok(saved().mistakes.includes(task));
  save(related, result(true, 4, 'transfer'), { ...skill, transferFrom: task });
  assert.equal(saved().learningChecks[related].method, 'independent');
  assert.ok(!saved().mistakes.includes(task));
});
