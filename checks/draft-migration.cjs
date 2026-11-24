const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');
const { sourceModule, frontend, dom } = require('./learning-load.cjs');
const { createLearningDraftStore } = sourceModule(path.join(frontend, 'src/lib/learningDraft.js'));
const { createCtDraftStore } = sourceModule(path.join(frontend, 'src/lib/ctDraft.js'));
const { draftSummary } = sourceModule(path.join(frontend, 'src/lib/draftStore.js'));
const key = (kind, id, hash) => 'kvant_draft_v1:' + kind + ':' + id + ':' + hash;
const storage = dom.window.localStorage;
const oldTime = Date.UTC(2026, 10, 7, 13);
const put = (key, value) => {
  const raw = JSON.stringify({ version: 1, value, updatedAt: oldTime });
  storage.setItem(key, raw);
  return raw;
};

test('real legacy quiz ids and card restore; reset does not resurrect the archived answers', () => {
  storage.clear();
  const slug = 'ravnouskorennoe-dvizhenie';
  const old = key('lesson', slug, '8ee0bed.da3148cf');
  const value = { cardId: 'idea', guess: '25', quiz: { idx: 0, results: { q1: { correct: true, answer: 2, given: 2, explanation: 'Разбор' } } },
    answers: { q1: { choice: 2, input: '' } } };
  const raw = put(old, value);
  const data = { slug, blocks: [{ id: 'idea' }], quiz: [{ id: slug + ':q1', kind: 'single', options: ['0,5', '1', '1,5', '2'] }],
    _assessment: { revision: 'a', legacy: { '8ee0bed.da3148cf': { ids: { q1: slug + ':q1' } } } } };
  const store = createLearningDraftStore('lesson', slug, data, storage);
  assert.equal(store.saved.cardId, 'idea');
  assert.equal(store.saved.quiz.results[slug + ':q1'].answer, 2);
  assert.equal(store.saved.answers[slug + ':q1'].choice, 2);
  assert.equal(store.savedAt, oldTime);
  assert.equal(store.write(null), null);
  assert.equal(createLearningDraftStore('lesson', slug, data, storage).saved, null);
  assert.equal(storage.getItem(old), raw);
});

test('a reset in a known previous revision also suppresses older draft previews', () => {
  storage.clear();
  const slug = 'topic';
  const old = key('trainer', slug, 'aa.bb');
  const newer = key('trainer', slug, 'rprevious');
  const value = { taskId: 'topic:t1', level: 0, answers: {}, results: {}, helpUsed: {} };
  const original = put(old, value);
  storage.setItem(newer, JSON.stringify({ version: 1, value: null, updatedAt: oldTime + 1000 }));
  const data = { tasks: [{ id: 'topic:t1', kind: 'number' }],
    _assessment: { revision: 'next', legacy: { 'aa.bb': {}, rprevious: {} } } };
  assert.equal(createLearningDraftStore('trainer', slug, data, storage).saved, null);
  assert.equal(draftSummary('trainer', slug, data._assessment, storage), null);
  assert.equal(storage.getItem(old), original);
});

test('blocked saved answers do not create a false resume link', () => {
  storage.clear();
  const slug = 'topic';
  const old = key('trainer', slug, 'aa.bb');
  const value = { taskId: 'topic:t1', level: 0,
    answers: { 'topic:t2': { input: '18', choice: null } }, results: {}, helpUsed: {} };
  const original = put(old, value);
  const data = { tasks: [{ id: 'topic:t1', kind: 'number' }, { id: 'topic:t2', kind: 'number' }],
    _assessment: { revision: 'next', legacy: { 'aa.bb': { blocked: ['topic:t2'] } } } };
  const store = createLearningDraftStore('trainer', slug, data, storage);
  assert.equal(store.saved, null);
  assert.ok(store.warning);
  assert.equal(draftSummary('trainer', slug, data._assessment, storage), null);
  assert.equal(storage.getItem(old), original);
});

test('trainer remaps marked answers and keeps the checked choice, help and location', () => {
  storage.clear();
  const slug = 'demo-topic';
  put(key('trainer', slug, 'aa.bb'), {
    taskId: 't1', level: 2, answers: { t1: { choice: [1, 3], input: '' } },
    results: { t1: { correct: false, answer: [1, 2], given: [1, 3], solution: [{ text: 'Решение' }] } },
    helpUsed: { t1: true },
  });
  const data = { tasks: [{ id: 'topic:t1', kind: 'multi', options: ['b', 'c', 'a'], level: 2 }],
    _assessment: { revision: 'b', legacy: { 'aa.bb': { ids: { t1: 'topic:t1' }, options: { t1: [3, 1, 2] } } } } };
  const draft = createLearningDraftStore('trainer', slug, data, storage).saved;
  assert.equal(draft.taskId, 'topic:t1');
  assert.deepEqual(Array.from(draft.answers['topic:t1'].choice), [2, 3]);
  assert.deepEqual(Array.from(draft.results['topic:t1'].answer), [1, 3]);
  assert.deepEqual(Array.from(draft.results['topic:t1'].given), [2, 3]);
  assert.equal(draft.helpUsed['topic:t1'], true);
});

test('old CT A1 moves from choice 4 to 5; time, task, flag and zero remain; stale writer is refused', () => {
  storage.clear();
  const old = key('ct', '01', 'a1147cbb.4cb808d1');
  const value = { startedAt: oldTime - 93000, skip: 18, currentTaskId: 'B1', flags: ['A1'], answers: { A1: 4, B1: '0' } };
  const raw = put(old, value);
  const data = { variantId: '01', minutes: 210, tasks: [
    { id: 'A1', part: 'A', kind: 'single', options: ['5 м', '16 м', '11 м', '9 м', '13 м'] }, { id: 'B1', part: 'B', kind: 'number' },
  ], _assessment: { revision: 'c', legacy: { 'a1147cbb.4cb808d1': { options: { A1: [1, 4, 3, 5, 2] } } } } };
  const current = createCtDraftStore(data, storage);
  const stale = createCtDraftStore(data, storage);
  const migrated = { ...value, answers: { A1: 5, B1: '0' } };
  assert.equal(JSON.stringify(current.saved), JSON.stringify(migrated));
  assert.equal(current.write(migrated), null);
  assert.ok(stale.write(null));
  assert.equal(JSON.stringify(createCtDraftStore(data, storage).saved), JSON.stringify(migrated));
  assert.equal(storage.getItem(old), raw);
});

test('unidentified draft remains intact and has an explicit warning', () => {
  storage.clear();
  const old = key('trainer', 'topic', 'aaaa.bbbb');
  const raw = put(old, { taskId: 'topic:t1', level: 0, answers: {}, results: {}, helpUsed: {} });
  const data = { tasks: [{ id: 'topic:t1', kind: 'number' }], _assessment: { revision: 'c', legacy: {} } };
  const draft = createLearningDraftStore('trainer', 'topic', data, storage);
  assert.equal(draft.saved, null);
  assert.match(draft.warning, /верси/);
  assert.equal(storage.getItem(old), raw);
});
