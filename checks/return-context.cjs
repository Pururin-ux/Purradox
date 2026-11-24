const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');
const { sourceModule, frontend, lesson } = require('./learning-load.cjs');
const { createLearningDraftStore, initialLearningDraft, learningDraftKey } = sourceModule(path.join(frontend, 'src/lib/learningDraft.js'));
const { returnVoice, CAT_NAME } = sourceModule(path.join(frontend, 'src/lib/returnVoice.js'));
const memory = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
};
const DAY = 86400000;

test('legacy and invalid timestamp metadata cannot reset saved answers or write during a read', () => {
  const storage = memory();
  const key = learningDraftKey('lesson', 'voice-fixture', lesson);
  const value = { ...initialLearningDraft('lesson', lesson), guess: '12' };
  for (const updatedAt of [undefined, 'yesterday', -1, Date.now() + DAY]) {
    const raw = JSON.stringify({ version: 1, value, updatedAt });
    storage.setItem(key, raw);
    const loaded = createLearningDraftStore('lesson', 'voice-fixture', lesson, storage);
    assert.equal(JSON.stringify(loaded.saved), JSON.stringify(value));
    assert.equal(loaded.savedAt, null);
    assert.equal(loaded.error, null);
    assert.equal(storage.getItem(key), raw);
  }
});

test('only a successful new save adds a timestamp; stale writes leave it and answers intact', () => {
  const storage = memory();
  const writer = createLearningDraftStore('lesson', 'voice-fixture', lesson, storage);
  const stale = createLearningDraftStore('lesson', 'voice-fixture', lesson, storage);
  const before = Date.now();
  const value = { ...initialLearningDraft('lesson', lesson), guess: '24' };
  assert.equal(writer.write(value), null);
  const loaded = createLearningDraftStore('lesson', 'voice-fixture', lesson, storage);
  assert.ok(loaded.savedAt >= before && loaded.savedAt <= Date.now());
  const raw = storage.getItem(writer.key);
  assert.ok(stale.write({ ...value, guess: '99' }));
  assert.equal(storage.getItem(writer.key), raw);
  assert.equal(JSON.stringify(loaded.saved), JSON.stringify(value));
});

test('voice never invents an absence for missing/future dates or a break under three full days', () => {
  const now = 100 * DAY;
  for (const savedAt of [undefined, null, -1, now + DAY, now - 3 * DAY + 1]) {
    const voice = returnVoice({ savedAt, now });
    assert.equal(voice.state, 'return');
    assert.ok(!/\d/.test(voice.text));
    assert.equal(voice.text, "Ну что, продолжим?");
  }
});

test('dated copy reports saved revision age without inventing absence, with correct day endings', () => {
  const now = 100 * DAY;
  for (const [days, words] of [[3,'3 дня'],[4,'4 дня'],[11,'11 дней'],[21,'21 день']]) {
    const voice = returnVoice({ savedAt: now - days * DAY, now });
    assert.equal(voice.state, 'aged-draft');
    assert.ok(voice.text.endsWith(words + '.'));
    assert.ok(voice.text.includes(CAT_NAME));
    assert.ok(!/без этой|без этого|тебя не было/.test(voice.text));
  }
});

test('several-errors voice counts only explicit mistakes in this draft, without a made-up streak', () => {
  assert.equal(returnVoice({ results: { a: { correct: true }, b: {}, c: { correct: false } } }).state, 'return');
  const voice = returnVoice({ results: { a: { correct: false }, b: { correct: true }, c: { correct: false } } });
  assert.equal(voice.state, 'several-errors');
  assert.ok(!/подряд|снова ошиб|опять ошиб/.test(voice.text));
});
