// Focused tests for saved capsule rewards and the real React answer hook.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { test, before, after } = require('node:test');
const root = path.resolve(__dirname, '../source/frontend');
const req = createRequire(path.join(root, 'package.json'));
const { transformSync } = req('@babel/core');
const React = req('react');
const { act } = React;
const { createRoot } = req('react-dom/client');
const { JSDOM } = req('jsdom');

function compile(relative, mocks, globals = {}, cache = new Map()) {
  const filename = path.join(root, relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const code = transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, babelrc: false, configFile: false,
    plugins: [req.resolve('@babel/plugin-transform-modules-commonjs')],
  }).code;
  const module = { exports: {} }; cache.set(filename, module);
  vm.runInNewContext(code, { module, exports: module.exports, ...globals, require(name) {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith('@/')) return compile('src/' + name.slice(2) + '.js', mocks, globals, cache);
    if (name.startsWith('.')) return compile(path.posix.join(path.posix.dirname(relative), name) + '.js', mocks, globals, cache);
    return req(name);
  } }, { filename });
  return module.exports;
}
const KEY = 'kvant_game_v1';
function game(storage = new Map()) {
  const api = compile('src/lib/game.js', { react: { useSyncExternalStore: (_, snapshot) => snapshot() } }, {
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
  });
  return { ...api, storage };
}

test('first capsule saves both rewards before any modal callback or reload', () => {
  const first = game();
  const result = first.openCapsule();
  assert.ok(result.art);
  const saved = JSON.parse(first.storage.get(KEY));
  assert.equal(saved.capsules, 0);
  assert.equal(saved.opened, 1);
  assert.ok(saved.owned.includes(result.art.id));
  assert.ok(saved.owned.includes('quark'), 'first-capsule bonus must be in the same saved result');
  const reloaded = game(first.storage).useGame();
  assert.ok(reloaded.owned.includes(result.art.id));
  assert.ok(reloaded.owned.includes('quark'));
  assert.ok(reloaded.shelf.length <= first.SHELF_MAX);
});

test('a previously lost first-capsule bonus is restored without charging or opening again', () => {
  const original = game().useGame();
  const storage = new Map([[KEY, JSON.stringify({ ...original, capsules: 0, opened: 1, owned: ['cradle', 'tuning'], shelf: ['cradle', 'tuning'] })]]);
  const restored = game(storage).useGame();
  assert.ok(restored.owned.includes('quark'));
  assert.equal(restored.capsules, 0);
  assert.equal(restored.opened, 1);
  assert.equal(restored.joules, original.joules);
});

test('capsule opening never enlarges a full shelf or grants the same bonus twice', () => {
  const initial = game().useGame();
  const full = ['cradle', 'tuning', 'magnet', 'lava', 'bird', 'radiometer'];
  const storage = new Map([[KEY, JSON.stringify({ ...initial, owned: full, shelf: full, capsules: 2 })]]);
  const api = game(storage);
  api.openCapsule(); api.openCapsule();
  assert.deepEqual([...api.useGame().shelf], full);
  assert.equal(api.useGame().owned.filter(id => id === 'quark').length, 1);
  assert.equal(api.useGame().capsules, 0);
});

test('assisted solutions do not fulfill the no-hint quest', () => {
  const initial = game().useGame();
  const storage = new Map([[KEY, JSON.stringify({ ...initial, quests: { day: game().dayKey(), ids: ['nohint','solve3','lesson'], progress: {}, claimed: [] } })]]);
  const api = game(storage);
  api.solveTask('t1', { hinted: true });
  assert.equal(api.questView(api.useGame()).find(q => q.id === 'nohint').progress, 0);
  api.solveTask('t2', { hinted: false });
  assert.equal(api.questView(api.useGame()).find(q => q.id === 'nohint').progress, 1);
});

test('repeating a solved task after reload clears mistakes without rewards or quest progress', () => {
  const api = game();
  api.solveTask('t1', { hinted: true });
  const earned = api.useGame();
  assert.equal(earned.xp, 20);
  assert.equal(earned.joules, 225);
  const restored = game(api.storage);
  const events = [];
  restored.onFx(event => events.push(event));
  restored.failTask('t1');
  for (let i = 0; i < 100; i++) assert.equal(restored.solveTask('t1'), false);
  const repeated = restored.useGame();
  for (const field of ['xp', 'joules', 'capsules', 'streak', 'lastDay']) assert.equal(repeated[field], earned[field], field);
  assert.equal(JSON.stringify(repeated.quests), JSON.stringify(earned.quests));
  assert.deepEqual([...repeated.solved], ['ravnouskorennoe-dvizhenie:t1']);
  assert.deepEqual([...repeated.mistakes], []);
  assert.equal(events.length, 0);
  assert.equal(restored.solveTask('t2'), true);
  assert.equal(restored.useGame().xp, 40);
  assert.equal(restored.useGame().joules, 250);
});

test('repeating a completed lesson cannot mint experience, levels or capsules', () => {
  const api = game();
  assert.equal(api.completeLesson(80), true);
  const earned = api.useGame();
  assert.equal(earned.xp, 100);
  assert.ok(earned.owned.includes('train'));
  const restored = game(api.storage);
  for (let i = 0; i < 100; i++) assert.equal(restored.completeLesson(80), false);
  assert.equal(JSON.stringify(restored.useGame()), JSON.stringify(earned));
});

let dom;
before(() => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://unit.test' });
  global.window = dom.window; global.document = dom.window.document;
  global.IS_REACT_ACT_ENVIRONMENT = true;
});
after(() => { dom.window.close(); delete global.window; delete global.document; delete global.IS_REACT_ACT_ENVIRONMENT; });
async function answerFixture(check) {
  const { useAnswer } = compile('src/components/shared/useAnswer.js', {
    react: React, '@/lib/hooks': { assessmentChanged: error => error?.response?.status === 409 },
  });
  const host = document.createElement('div'); document.body.append(host);
  const renderer = createRoot(host);
  let current;
  function Fixture() { current = useAnswer({ id:'decimal', kind:'number' }, check); return null; }
  await act(() => renderer.render(React.createElement(Fixture)));
  return { read: () => current, dispose: async () => { await act(() => renderer.unmount()); host.remove(); } };
}

test('decimal comma, decimal point and Unicode minus keep their value', async () => {
  for (const input of ['0,5', '0.5', '−2,5']) {
    let sent;
    const fixture = await answerFixture(async (_, answer) => { sent = answer; return { correct:true, answer:0.5 }; });
    try {
      await act(() => fixture.read().setInput(input));
      assert.equal(fixture.read().input, input);
      assert.equal(fixture.read().ready, true);
      await act(() => fixture.read().submit());
      assert.equal(Number(sent.replace(',', '.')), Number(input.replace('−','-').replace(',','.')));
    } finally { await fixture.dispose(); }
  }
});

test('malformed numeric input is not silently reinterpreted as a different answer', async () => {
  for (const input of ['3 м', '1-2', '1,2,3', '--3', '']) {
    let count = 0;
    const fixture = await answerFixture(async () => { count++; return {correct:true}; });
    try {
      await act(() => fixture.read().setInput(input));
      assert.equal(fixture.read().input, input);
      assert.equal(fixture.read().ready, false, input);
      await act(() => fixture.read().submit());
      assert.equal(count, 0);
    } finally { await fixture.dispose(); }
  }
});

test('two submissions in the same event tick produce one request and one result', async () => {
  let count = 0, release;
  const pending = new Promise(resolve => { release = resolve; });
  const fixture = await answerFixture(() => { count++; return pending; });
  try {
    await act(() => fixture.read().setInput('3'));
    let one, two;
    await act(async () => {
      const submit = fixture.read().submit;
      one = submit(); two = submit();
      release({correct:true, answer:3});
      await Promise.all([one,two]);
    });
    assert.equal(count, 1);
    assert.ok(await one);
    assert.equal(await two, null);
  } finally { await fixture.dispose(); }
});

test('failed checks can be retried, but successful checks cannot award twice', async () => {
  let count=0;
  const fixture = await answerFixture(async () => { if (++count===1) throw new Error('offline'); return {correct:true,answer:3}; });
  try {
    await act(() => fixture.read().setInput('3'));
    await act(() => fixture.read().submit());
    assert.equal(fixture.read().error, 'network');
    await act(() => fixture.read().submit());
    assert.equal(fixture.read().result.correct, true);
    await act(() => fixture.read().submit());
    assert.equal(count, 2);
  } finally { await fixture.dispose(); }
});
