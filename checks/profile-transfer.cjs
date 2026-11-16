const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');
const { sourceModule, frontend, dom } = require('./learning-load.cjs');
const { exportProfile, importProfile, saveProfile, solveTask } = sourceModule(path.join(frontend, 'src/lib/game.js'));
const { createLearningDraftStore, initialLearningDraft, learningDraftKey } = sourceModule(path.join(frontend, 'src/lib/learningDraft.js'));
const storage = dom.window.localStorage;
const lesson = { blocks: [{ id: 'hook' }], quiz: [{ id: 'q1', kind: 'number' }] };
const localKey = learningDraftKey('lesson', 'local-topic', lesson);
const incomingKey = learningDraftKey('lesson', 'incoming-topic', lesson);
const wrap = value => JSON.stringify({ version: 1, value, updatedAt: Date.now() });
const profile = (game, drafts = {}) => JSON.stringify({ app: 'purradox', schema: 1, game, drafts });
const localDraft = { ...initialLearningDraft('lesson', lesson), cardId: 'hook', guess: '12' };
const incomingDraft = { ...localDraft, guess: '25' };

test('profile transfer is all-or-nothing, notices a changed confirmation, and survives subsequent editing', () => {
  storage.clear();
  storage.setItem(localKey, wrap(localDraft)); // Draft-only profile still needs confirmation.
  const incoming = profile({ nickname: 'Ада', avatar: 'moon', joules: 275 }, { [incomingKey]: wrap(incomingDraft) });
  const first = importProfile(incoming);
  assert.equal(first.needsConfirm, true);
  assert.equal(first.current.drafts, 1);
  const stale = createLearningDraftStore('lesson', 'local-topic', lesson);
  storage.setItem(localKey, wrap({ ...localDraft, guess: '14' }));
  const later = importProfile(incoming, { replace: first.confirmation });
  assert.equal(later.needsConfirm, true);
  const before = exportProfile();
  const prototype = dom.window.Storage.prototype;
  const setItem = prototype.setItem;
  prototype.setItem = function () { throw new Error('quota'); };
  try {
    assert.equal(importProfile(incoming, { replace: later.confirmation }).ok, false);
  } finally { prototype.setItem = setItem; }
  assert.equal(JSON.stringify(JSON.parse(exportProfile().json).drafts), JSON.stringify(JSON.parse(before.json).drafts));
  const imported = importProfile(incoming, { replace: later.confirmation });
  assert.equal(imported.ok, true);
  assert.equal(imported.profile.nickname, 'Ада');
  assert.equal(imported.profile.avatar, 'moon');
  assert.ok(stale.write(localDraft));
  assert.equal(createLearningDraftStore('lesson', 'local-topic', lesson).saved, null);
  const newStore = createLearningDraftStore('lesson', 'incoming-topic', lesson);
  assert.equal(newStore.saved.guess, '25');
  assert.equal(newStore.write({ ...incomingDraft, guess: '27' }), null);
  assert.equal(saveProfile({ avatar: 'girl', nickname: 'Яна' }), true);
  const output = JSON.parse(exportProfile().json);
  assert.equal(output.game.nickname, 'Яна');
  assert.equal(JSON.parse(output.drafts[incomingKey]).value.guess, '27');
  assert.equal(output.drafts[localKey], undefined);
});

test('legacy solved ids stay earned; export refuses damaged data and import rejects malformed drafts', () => {
  storage.clear();
  storage.setItem('kvant_game_v1', JSON.stringify({ joules: 312, xp: 110, solved: ['t1'], mistakes: ['quiz:q1'],
    mistakeAt: { 'quiz:q1': '2026-11-09T10:00:00.000Z' }, quests: null }));
  const current = JSON.parse(exportProfile().json).game;
  const topic = 'ravnouskorennoe-dvizhenie:';
  assert.equal(current.solved[0], topic + 't1');
  assert.equal(current.mistakes[0], 'quiz:' + topic + 'q1');
  assert.equal(solveTask(topic + 't1'), false);
  assert.equal(JSON.parse(exportProfile().json).game.joules, 312);
  assert.equal(importProfile(profile({ nickname: 'new' }, { [incomingKey]: '{bad' })).ok, false);
  assert.equal(importProfile(profile({ nickname: 'new' }, { [incomingKey]: wrap({ guess: [] }) })).ok, false);
  storage.setItem('kvant_game_v1', '{bad');
  assert.equal(exportProfile().ok, false);
  assert.equal(storage.getItem('kvant_game_v1'), '{bad');
});

test('the code identifies the exact transferred file and imported storage remains usable after an empty profile', () => {
  storage.clear();
  const original = exportProfile();
  assert.equal(original.ok, true);
  const imported = importProfile(original.json);
  assert.equal(imported.ok, true);
  assert.equal(imported.code, original.code);
});

test('export keeps valid drafts transferable and reports damaged drafts in the source browser', () => {
  storage.clear();
  storage.setItem(localKey, wrap(localDraft));
  storage.setItem(incomingKey, '{damaged draft');
  const trainer = { tasks: [{ id: 't1', kind: 'number' }] };
  const trainerKey = learningDraftKey('trainer', 'broken-result', trainer);
  const broken = wrap({ ...initialLearningDraft('trainer', trainer), results: { t1: { correct: true } } });
  storage.setItem(trainerKey, broken);
  const exported = exportProfile();
  assert.equal(exported.ok, true);
  assert.equal(exported.skippedDrafts, 2);
  assert.equal(exported.summary.drafts, 1);
  assert.equal(storage.getItem(incomingKey), '{damaged draft');
  assert.equal(storage.getItem(trainerKey), broken);
  storage.clear(); // A separate destination represented by empty synthetic storage.
  assert.equal(importProfile(exported.json).ok, true);
  assert.equal(createLearningDraftStore('lesson', 'local-topic', lesson).saved.guess, '12');
});

test('a damaged local progress record can be replaced only after confirming its current bytes', () => {
  storage.clear();
  const gameKey = 'kvant_game_v1';
  const incoming = profile({ nickname: 'Ада', joules: 275 }, { [incomingKey]: wrap(incomingDraft) });
  storage.setItem(gameKey, '{damaged game');
  const first = importProfile(incoming);
  assert.equal(first.needsConfirm, true);
  assert.equal(first.damaged, true);
  storage.setItem(gameKey, '{changed since confirmation');
  const next = importProfile(incoming, { replace: first.confirmation });
  assert.equal(next.needsConfirm, true);
  assert.notEqual(next.confirmation, first.confirmation);
  assert.equal(importProfile(incoming, { replace: next.confirmation }).ok, true);
  assert.equal(storage.getItem(gameKey), '{changed since confirmation');
  assert.equal(JSON.parse(exportProfile().json).game.joules, 275);
  assert.equal(createLearningDraftStore('lesson', 'incoming-topic', lesson).saved.guess, '25');
});

test('recovery of a corrupted imported profile keeps an exact copy of its bytes', () => {
  storage.clear();
  const key = 'purradox_profile_v2';
  const damaged = '{previous transfer';
  storage.setItem(key, damaged);
  const incoming = profile({ nickname: 'Ада' });
  const first = importProfile(incoming);
  assert.equal(first.needsConfirm, true);
  assert.equal(storage.getItem(key), damaged);
  const recovered = importProfile(incoming, { replace: first.confirmation });
  assert.equal(recovered.ok, true);
  const backups = Array.from({ length: storage.length }, (_, index) => storage.key(index))
    .filter(id => id.startsWith(key + ':recovery:'));
  assert.equal(backups.length, 1);
  assert.equal(storage.getItem(backups[0]), damaged);
  assert.equal(JSON.parse(exportProfile().json).game.nickname, 'Ада');
});

test('replacing an imported profile preserves its damaged draft bytes even if the game is readable', () => {
  storage.clear();
  const key = 'purradox_profile_v2';
  const damaged = JSON.stringify({ id: 'imported', game: '{"xp":50}', drafts: { [localKey]: '{damaged draft' } });
  storage.setItem(key, damaged);
  const incoming = profile({ nickname: 'Ада' });
  const pending = importProfile(incoming);
  assert.equal(pending.damaged, true);
  assert.equal(pending.current.xp, 50);
  assert.equal(importProfile(incoming, { replace: pending.confirmation }).ok, true);
  const backup = Array.from({ length: storage.length }, (_, index) => storage.key(index))
    .find(id => id.startsWith(key + ':recovery:'));
  assert.equal(storage.getItem(backup), damaged);
});
