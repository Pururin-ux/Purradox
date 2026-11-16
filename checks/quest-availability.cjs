// Real game store, deterministic clock and two copies of the same storage.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { test } = require('node:test');
const root = path.resolve(__dirname, '../source/frontend');
const req = createRequire(path.join(root, 'package.json'));
const { transformSync } = req('@babel/core');
const snapshot = process.argv[2] && path.resolve(process.argv[2]);
const KEY = 'kvant_game_v1';
const taskIds = Array.from({ length: 10 }, (_, i) => `t${i + 1}`);
const values = api => JSON.parse(JSON.stringify(api.useGame()));
const copy = value => JSON.parse(JSON.stringify(value));

function environment(shared) {
  const data = new Map();
  const storage = shared || {
    writes: 0, fail: false,
    getItem: key => data.get(key) ?? null,
    setItem(key, value) { if (this.fail) throw new Error('quota'); this.writes++; data.set(key, value); },
  };
  const env = { storage, time: new Date(2026, 9, 31, 12).getTime() };
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [env.time])); } }
  const cache = new Map();
  function load(relative) {
    const file = path.join(root, relative);
    if (cache.has(file)) return cache.get(file).exports;
    const old = snapshot && path.join(snapshot, 'frontend', relative);
    const source = old && fs.existsSync(old) ? old : file;
    const code = transformSync(fs.readFileSync(source, 'utf8'), { filename: file, babelrc: false, configFile: false,
      plugins: [req.resolve('@babel/plugin-transform-modules-commonjs')],
    }).code;
    const module = { exports: {} }; cache.set(file, module);
    vm.runInNewContext(code, { module, exports: module.exports, Date: Clock, localStorage: storage,
      require: name => name === 'react' ? { useSyncExternalStore: (_, get) => get() }
        : name.startsWith('@/') ? load('src/' + name.slice(2) + '.js')
        : name.startsWith('.') ? load(path.posix.join(path.posix.dirname(relative), name) + '.js') : req(name),
    }, { filename: file });
    return module.exports;
  }
  env.api = load('src/lib/game.js');
  env.seed = patch => storage.setItem(KEY, JSON.stringify({ ...values(env.api), ...patch }));
  env.saved = () => JSON.parse(storage.getItem(KEY));
  env.quests = (ids, progress = {}, claimed = []) => ({ day: env.api.dayKey(), ids, progress, claimed });
  return env;
}

test('an unfinished lesson quest is replaced when the known lesson catalog is completed', () => {
  const e = environment();
  e.seed({ lessonDone: true, lessonSlugs:['ravnouskorennoe-dvizhenie'], quests: e.quests(['lesson', 'formula', 'model'], { formula: 1 }, []) });
  const raw = e.storage.getItem(KEY);
  const restored = environment(e.storage).api;
  const s = values(restored);
  assert.ok(!s.quests.ids.includes('lesson'));
  assert.ok(s.quests.ids.includes('formula') && s.quests.ids.includes('model'));
  assert.equal(s.quests.progress.formula, 1);
  assert.equal(s.quests.ids.length, 3);
  assert.equal(new Set(s.quests.ids).size, 3);
  assert.equal(e.storage.getItem(KEY), raw, 'reading must not write a replacement or reward');
  assert.equal(s.xp, 0);
});

test('completed and claimed lesson quests survive availability changes and pay once', () => {
  const e = environment();
  e.seed({ quests: e.quests(['lesson', 'formula', 'model']) });
  e.api.completeLesson(100);
  assert.equal(e.saved().quests.progress.lesson, 1);
  assert.ok(e.saved().quests.ids.includes('lesson'));
  const again = environment(e.storage).api;
  assert.ok(values(again).quests.ids.includes('lesson'));
  again.claimQuest('lesson');
  const earned = e.saved();
  again.claimQuest('lesson');
  assert.deepEqual(e.saved(), earned);
  assert.ok(earned.quests.claimed.includes('lesson'));
});

test('new daily sets use the actual remaining task ids, not a solved-item count', () => {
  const e = environment();
  e.seed({ lessonDone: true, lessonSlugs:['ravnouskorennoe-dvizhenie'], solved: [...taskIds, 'retired-task'], trainerTaskIds: taskIds, allTaskIds:taskIds });
  const api = environment(e.storage).api;
  const start = new Date(2026, 9, 31, 12).getTime();
  // Reload each simulated day: a new module reads the persisted catalog.
  for (let day = 1; day <= 32; day++) {
    const next = environment(e.storage); next.time = start + day * 86400000;
    next.api.track('unrelated');
    const s = values(next.api);
    assert.equal(s.quests.ids.length, 3);
    assert.ok(!s.quests.ids.some(id => ['lesson', 'solve3', 'nohint'].includes(id)));
    assert.equal(s.joules, 200);
    assert.equal(s.xp, 0);
  }
  assert.equal(values(api).trainerTaskIds.length, 10);
});

test('partial solve progress stays when the remaining catalog can finish it', () => {
  const e = environment();
  e.seed({ solved: taskIds.slice(0, 9), trainerTaskIds: taskIds, allTaskIds:taskIds,
    quests: e.quests(['solve3', 'nohint', 'formula'], { solve3: 2 }) });
  e.api.syncQuestTasks(taskIds);
  assert.ok(values(e.api).quests.ids.includes('solve3'));
  e.api.solveTask('t10', { hinted: true });
  const s = e.saved();
  assert.ok(s.quests.ids.includes('solve3'), 'the last task must complete the quest before eligibility is repaired');
  assert.equal(s.quests.progress.solve3, 3);
  assert.ok(!s.quests.ids.includes('nohint'), 'no unassisted new task remains');
  e.api.claimQuest('solve3');
  assert.ok(e.saved().quests.claimed.includes('solve3'));
});

test('task catalog updates replace only impossible rows and never reset a claim', () => {
  const e = environment();
  e.seed({ solved: ['t1', 't2'], quests: e.quests(['solve3', 'nohint', 'formula'], { formula: 3 }, ['formula']) });
  e.api.syncCourseCatalog({lessonSlugs:['ravnouskorennoe-dvizhenie'],taskIds:['t3','t2','t1','t3']});
  const s = e.saved();
  assert.deepEqual(s.allTaskIds, ['t1', 't2', 't3'].map(id => 'ravnouskorennoe-dvizhenie:' + id));
  assert.ok(!s.quests.ids.includes('solve3'));
  assert.ok(s.quests.ids.includes('nohint') && s.quests.ids.includes('formula'));
  assert.deepEqual(s.quests.claimed, ['formula']);
  assert.equal(s.quests.progress.formula, 3);
  const writes = e.storage.writes;
  e.api.syncCourseCatalog({lessonSlugs:['ravnouskorennoe-dvizhenie'],taskIds:['t1','t2','t3']});
  assert.equal(e.storage.writes, writes, 'unchanged query data must not repeatedly write');
});

test('stale catalog synchronization preserves a purchase and newer progress', () => {
  const e = environment(); e.seed({ quests: e.quests(['solve3', 'nohint', 'formula']) });
  const a = environment(e.storage).api, b = environment(e.storage).api;
  a.buy('tuning'); a.solveTask('t1', { hinted: true });
  b.syncQuestTasks(taskIds);
  const s = e.saved();
  assert.equal(s.joules, 105);
  assert.equal(s.xp, 20);
  assert.ok(s.owned.includes('tuning'));
  assert.deepEqual(s.solved, ['ravnouskorennoe-dvizhenie:t1']);
  assert.equal(s.quests.progress.solve3, 1);
});

test('unknown, malformed and failed catalog updates do not clear progress', () => {
  const e = environment(); e.seed({ quests: e.quests(['solve3', 'nohint', 'formula']) });
  const before = e.storage.getItem(KEY);
  for (const bad of [null, undefined, {}, [1], ['']]) e.api.syncQuestTasks(bad);
  assert.equal(e.storage.getItem(KEY), before);
  e.storage.fail = true; e.api.syncQuestTasks([]);
  assert.equal(e.storage.getItem(KEY), before);
  assert.equal(values(e.api).trainerTaskIds, null);
  assert.ok(e.api.useSaveError());
  e.storage.fail = false; e.api.syncQuestTasks([]);
  assert.deepEqual(e.saved().trainerTaskIds, []);
  e.api.syncCourseCatalog({lessonSlugs:['ravnouskorennoe-dvizhenie'],taskIds:[]});
  assert.ok(!e.saved().quests.ids.some(id => ['solve3', 'nohint'].includes(id)));
});

test('malformed saved catalogs stay byte-for-byte intact', () => {
  const e = environment();
  for (const bad of [5, {}, ['t1', false]]) {
    e.seed({ trainerTaskIds: bad });
    const raw = e.storage.getItem(KEY), api = environment(e.storage).api;
    assert.ok(api.useSaveError());
    api.syncQuestTasks(taskIds);
    assert.equal(e.storage.getItem(KEY), raw);
  }
});
