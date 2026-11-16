const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { test } = require('node:test');
const frontend = path.resolve(__dirname, '../source/frontend');
const req = createRequire(path.join(frontend, 'package.json'));
const React = req('react');
const { act } = React;
const { createRoot } = req('react-dom/client');
const { JSDOM } = req('jsdom');
const { transformSync } = req('@babel/core');
const DATA = { minutes: 2, total: 30, sections: [{ id: 'mechanics', title: 'Механика' }], tasks: [
  { id: 'A1', code: 'А1', part: 'A', section: 'mechanics', text: 'Первый вопрос', options: ['1', '2', '3', '4'] },
  { id: 'A2', code: 'А2', part: 'A', section: 'mechanics', text: 'Второй вопрос', options: ['1', '2', '3', '4'] },
  { id: 'B1', code: 'В1', part: 'B', section: 'mechanics', text: 'Числовой вопрос', unit: 'м' },
] };
const plain = value => JSON.parse(JSON.stringify(value));

// Real hook + persistence modules. Only clock, browser storage and HTTP boundary
// are controlled; React effects and all state transitions remain production code.
async function fixture(run, submit = async () => ({ correct: 1, total: 3 })) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://ct-resume.test/' });
  const prior = { window: global.window, document: global.document, act: global.IS_REACT_ACT_ENVIRONMENT };
  global.window = dom.window; global.document = dom.window.document; global.IS_REACT_ACT_ENVIRONMENT = true;
  let now = 1_000_000, latest, root, timerId = 0, answerEvents = 0, failWrites = false;
  const raw = new Map([['unrelated-lesson', 'original answers']]);
  const storage = { getItem: key => raw.get(key) ?? null,
    setItem(key, value) { if (failWrites) throw new Error('quota'); raw.set(key, value); },
    removeItem(key) { if (failWrites) throw new Error('quota'); raw.delete(key); } };
  Object.defineProperty(dom.window, 'localStorage', { value: storage });
  const timers = new Map(), modules = new Map(), submissions = [];
  function load(file) {
    const filename = [file, file + '.js', file + '.jsx'].find(candidate => fs.existsSync(candidate));
    assert.ok(filename, `production module exists: ${file}`);
    if (modules.has(filename)) return modules.get(filename).exports;
    const module = { exports: {} }; modules.set(filename, module);
    const code = transformSync(fs.readFileSync(filename, 'utf8'), { filename, babelrc: false, configFile: false,
      plugins: [req.resolve('@babel/plugin-transform-modules-commonjs')] }).code;
    vm.runInNewContext(code, { module, exports: module.exports,
      require(name) {
        if (name === 'react') return React;
        if (name === '@/lib/hooks') return { assessmentChanged: error => error?.response?.status === 409, submitCt: async (answers, elapsed) => {
          submissions.push({ answers: plain(answers), elapsed }); return submit(answers, elapsed);
        } };
        if (name.startsWith('@/')) return load(path.join(frontend, 'src', name.slice(2)));
        if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), name));
        return req(name);
      }, window: dom.window, Date: { now: () => now },
      setInterval(callback) { const id = ++timerId; timers.set(id, callback); return id; },
      clearInterval(id) { timers.delete(id); }, console,
    }, { filename });
    return module.exports;
  }
  const { useCtExam } = load(path.join(frontend, 'src/components/shared/useCtExam.js'));
  const f = {
    get exam() { return latest; }, get submissions() { return submissions; }, get answerEvents() { return answerEvents; },
    get entries() { return [...raw].filter(([key]) => key !== 'unrelated-lesson'); },
    get now() { return now; },
    storage, raw,
    async mount(data = DATA, strict = false) {
      function Harness() { latest = useCtExam(data, { onAnswer: () => { answerEvents++; } }); return null; }
      root = createRoot(dom.window.document.getElementById('root'));
      await act(() => root.render(strict ? React.createElement(React.StrictMode, null, React.createElement(Harness)) : React.createElement(Harness)));
    },
    async unmount() { if (root) { await act(() => root.unmount()); root = null; } assert.equal(timers.size, 0); },
    async action(callback) { await act(async () => callback(latest)); },
    async advance(milliseconds, tick = false) { now += milliseconds; if (tick) await act(() => [...timers.values()].forEach(callback => callback())); },
    failWrites(value) { failWrites = value; },
  };
  try { await f.mount(); await run(f); assert.equal(raw.get('unrelated-lesson'), 'original answers'); }
  finally { await f.unmount(); dom.window.close(); global.window = prior.window; global.document = prior.document; global.IS_REACT_ACT_ENVIRONMENT = prior.act; }
}

test('cold return restores answers, unfinished numeric input, current task and flags without stopping time or replaying answer events', async () => {
  await fixture(async f => {
    await f.action(exam => exam.start());
    await f.action(exam => { exam.setAnswer('A1', 3); exam.setAnswer('B1', '-'); exam.toggleFlag('B1'); exam.setCurrent(2); });
    const events = f.answerEvents;
    await f.unmount(); await f.advance(25_000); await f.mount();
    assert.equal(f.exam.stage, 'resume');
    assert.deepEqual(plain(f.exam.answers), { A1: 3, B1: '-' });
    assert.equal(f.exam.current, 2); assert.deepEqual(plain(f.exam.flags), ['B1']);
    assert.equal(f.exam.timer.getRemaining(), 95, '25 seconds away are deducted from the original two minutes');
    assert.equal(f.answerEvents, events); assert.equal(f.submissions.length, 0);
    await f.advance(5_000, true); assert.equal(f.exam.timer.getRemaining(), 90, 'resume screen is not a pause');
    await f.action(exam => exam.resume());
    assert.equal(f.exam.stage, 'exam'); assert.equal(f.exam.timer.getRemaining(), 90); assert.equal(f.answerEvents, events);
  });
});

test('expired return waits for the learner then submits once at the original limit and never reopens a completed draft', async () => {
  await fixture(async f => {
    await f.action(exam => exam.start()); await f.action(exam => exam.setAnswer('A1', 2));
    await f.unmount(); await f.advance(125_000); await f.mount(DATA, true);
    assert.equal(f.exam.stage, 'resume'); assert.equal(f.exam.expired, true); assert.equal(f.exam.timer.getRemaining(), 0); assert.equal(f.submissions.length, 0);
    await f.action(exam => exam.resume());
    assert.deepEqual(f.submissions, [{ answers: { A1: 2 }, elapsed: 120 }]);
    assert.equal(f.exam.stage, 'result'); assert.equal(f.entries.length, 0);
    await f.unmount(); await f.mount();
    assert.equal(f.exam.stage, 'intro'); assert.equal(f.submissions.length, 1);
  });
});

test('failed submit keeps a recoverable snapshot and retries do not change the original start time', async () => {
  let calls = 0;
  await fixture(async f => {
    await f.action(exam => exam.start()); await f.action(exam => exam.setAnswer('A1', 2));
    await f.advance(10_000); await f.action(exam => exam.finish());
    assert.equal(f.exam.error, "network"); assert.equal(f.entries.length, 1);
    await f.unmount(); await f.advance(20_000); await f.mount();
    assert.equal(f.exam.stage, 'resume'); assert.equal(f.exam.answers.A1, 2); assert.equal(f.exam.timer.getRemaining(), 90);
    await f.action(exam => exam.resume()); await f.action(exam => exam.finish());
    assert.equal(f.exam.stage, 'result'); assert.equal(f.entries.length, 0);
    assert.deepEqual(f.submissions.map(x => x.elapsed), [10, 30]);
  }, async () => { if (++calls === 1) throw new Error('offline'); return { correct: 1, total: 3 }; });
});

test('a write refusal keeps in-memory answers and retry saves the current snapshot', async () => {
  await fixture(async f => {
    f.failWrites(true); await f.action(exam => exam.start());
    await f.action(exam => { exam.setAnswer('A1', 4); exam.setCurrent(1); });
    assert.ok(f.exam.saveError); assert.equal(f.exam.answers.A1, 4); assert.equal(f.entries.length, 0);
    f.failWrites(false); await f.action(exam => exam.retrySave());
    assert.equal(f.exam.saveError, null); assert.equal(f.entries.length, 1);
    await f.unmount(); await f.mount();
    assert.equal(f.exam.stage, 'resume'); assert.equal(f.exam.current, 1); assert.equal(f.exam.answers.A1, 4);
  });
});

test('a stale writer cannot overwrite a different tab snapshot, including when starting again', async () => {
  await fixture(async f => {
    await f.action(exam => exam.start());
    assert.equal(f.entries.length, 1);
    const [key, value] = f.entries[0], external = JSON.parse(value);
    external.value.answers.A1 = 1;
    const otherTab = JSON.stringify(external); f.storage.setItem(key, otherTab);
    await f.action(exam => exam.setAnswer('A1', 4));
    assert.equal(f.exam.answers.A1, 4); assert.ok(f.exam.saveError); assert.equal(f.storage.getItem(key), otherTab);
    assert.equal(f.answerEvents, 0, 'an answer refused by the draft store cannot advance quests');
    await f.action(exam => exam.start());
    assert.equal(f.storage.getItem(key), otherTab); assert.ok(f.exam.saveError);
  });
});

test('corrupt and old-content records are preserved instead of silently becoming a new attempt', async () => {
  await fixture(async f => {
    await f.action(exam => exam.start()); assert.equal(f.entries.length, 1);
    const [key, initial] = f.entries[0];
    await f.unmount();
    const changed = plain(DATA); changed.tasks[0].text = 'Уже другое условие';
    await f.mount(changed); assert.equal(f.exam.stage, 'intro'); assert.equal(f.storage.getItem(key), initial);
    await f.unmount();
    const corrupt = '{"version":1,"value":{"answers":{"A1":3},"currentTaskId":"not-a-task"}}';
    f.storage.setItem(key, corrupt); await f.mount();
    assert.equal(f.exam.stage, 'intro'); assert.ok(f.exam.saveError); assert.equal(f.storage.getItem(key), corrupt);
    await f.action(exam => exam.start()); assert.equal(f.storage.getItem(key), corrupt);
  });
});
