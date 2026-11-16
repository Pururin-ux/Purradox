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
const filename = path.join(frontend, 'src/components/shared/useCtExam.js');
const code = transformSync(fs.readFileSync(filename, 'utf8'), {
  filename, babelrc: false, configFile: false,
  plugins: [req.resolve('@babel/plugin-transform-modules-commonjs')],
}).code;

async function withExam(submitCt, run) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://unit.test/' });
  const prior = { window: global.window, document: global.document, act: global.IS_REACT_ACT_ENVIRONMENT };
  global.window = dom.window; global.document = dom.window.document; global.IS_REACT_ACT_ENVIRONMENT = true;
  let now = 100_000, latest, nextTimer = 0;
  const timers = new Map();
  const modules = new Map();
  function load(file) {
    const resolved = [file, file + '.js'].find(candidate => fs.existsSync(candidate));
    if (modules.has(resolved)) return modules.get(resolved).exports;
    const module = { exports: {} }; modules.set(resolved, module);
    const source = resolved === filename ? code : transformSync(fs.readFileSync(resolved, 'utf8'), {
      filename: resolved, babelrc: false, configFile: false, plugins: [req.resolve('@babel/plugin-transform-modules-commonjs')],
    }).code;
    vm.runInNewContext(source, {
    module, exports: module.exports, window: dom.window,
    require(name) {
      if (name === 'react') return React;
      if (name === '@/lib/hooks') return { submitCt, assessmentChanged: error => error?.response?.status === 409 };
      return load(name.startsWith('@/') ? path.join(frontend, 'src', name.slice(2)) : path.resolve(path.dirname(resolved), name));
    },
    Date: { now: () => now },
    setInterval: callback => { const id = ++nextTimer; timers.set(id, callback); return id; },
    clearInterval: id => timers.delete(id),
    }, { filename: resolved });
    return module.exports;
  }
  const examModule = load(filename);
  function ClockReadout({ timer }) {
    const seconds = React.useSyncExternalStore(timer.subscribe, timer.getRemaining);
    return React.createElement('output', null, seconds);
  }
  function Harness() { latest = examModule.useCtExam({ minutes: 1, tasks: [
    { id: 'A1', part: 'A', options: ['1','2','3','4'] }, { id: 'B1', part: 'B', unit: 'м' },
  ] }); return React.createElement(ClockReadout, { timer: latest.timer }); }
  const root = createRoot(dom.window.document.getElementById('root'));
  await act(() => root.render(React.createElement(Harness)));
  const fixture = {
    get exam() { return latest; },
    get readout() { return Number(dom.window.document.querySelector('output').textContent); },
    get timerCount() { return timers.size; },
    async action(callback) { await act(async () => callback(latest)); },
    advance(milliseconds, tick = false) { now += milliseconds; if (tick) [...timers.values()].forEach(callback => callback()); },
  };
  try { await run(fixture); }
  finally {
    await act(() => root.unmount());
    assert.equal(timers.size, 0, 'unmount clears the exam timer');
    dom.window.close();
    global.window = prior.window; global.document = prior.document; global.IS_REACT_ACT_ENVIRONMENT = prior.act;
  }
}

test('countdown ticks update the readout without rendering exam controls', async () => {
  await withExam(async () => { throw new Error('unexpected submit'); }, async f => {
    await f.action(exam => exam.start());
    const controls = f.exam;
    for (let seconds = 59; seconds >= 55; seconds--) {
      await f.action(() => f.advance(1_000, true));
      assert.equal(f.readout, seconds);
      assert.equal(f.exam, controls);
    }
  });
});

test('two same-tick finishes send one answer snapshot; pending answers stay unchanged', async () => {
  let release, count = 0, sent;
  const response = new Promise(resolve => { release = resolve; });
  await withExam((answers, elapsed) => { count++; sent = { answers, elapsed }; return response; }, async f => {
    await f.action(exam => exam.start());
    await f.action(exam => exam.setAnswer('A1', 2));
    let first, second;
    await f.action(exam => { first = exam.finish(); second = exam.finish(); exam.setAnswer('A1', 4); });
    assert.equal(count, 1);
    assert.equal(sent.answers.A1, 2);
    assert.equal(f.exam.answers.A1, 2);
    assert.equal(f.exam.sending, true);
    await f.action(async () => { release({ correct: 1 }); await Promise.all([first, second]); });
    assert.equal(f.exam.stage, 'result');
    assert.equal(f.timerCount, 0);
  });
});

test('a network failure preserves answers and permits retry; a result cannot be submitted twice', async () => {
  let count = 0;
  const sent = [];
  await withExam(async answers => {
    sent.push({ ...answers });
    if (++count === 1) throw new Error('offline');
    return { correct: 1 };
  }, async f => {
    await f.action(exam => exam.start());
    await f.action(exam => exam.setAnswer('A1', 2));
    await f.action(exam => exam.finish());
    assert.equal(f.exam.error, 'network');
    assert.equal(f.exam.stage, 'exam');
    assert.equal(f.exam.sending, false);
    assert.equal(f.exam.answers.A1, 2);
    await f.action(exam => exam.finish());
    await f.action(exam => exam.finish());
    assert.equal(count, 2);
    assert.deepEqual(sent, [{ A1: 2 }, { A1: 2 }]);
    assert.equal(f.exam.error, false);
    assert.equal(f.exam.stage, 'result');
    await f.action(exam => exam.restart());
    await f.action(exam => exam.start());
    assert.equal(Object.keys(f.exam.answers).length, 0);
    assert.equal(f.exam.error, false);
  });
});

test('finish reads wall-clock elapsed time even when the interval was throttled, and caps it at the limit', async () => {
  const elapsed = [];
  await withExam(async (_, seconds) => { elapsed.push(seconds); return { correct: 0 }; }, async f => {
    await f.action(exam => exam.start());
    f.advance(12_400);
    assert.equal(f.readout, 60, 'the rendered timer has not received an interval tick');
    await f.action(exam => exam.finish());
    await f.action(exam => exam.restart());
    await f.action(exam => exam.start());
    f.advance(90_000);
    await f.action(exam => exam.finish());
    assert.deepEqual(elapsed, [12, 60]);
  });
});

test('timeout submits once, rejects late edits, and allows a deliberate retry after failure', async () => {
  let count = 0;
  const sent = [];
  await withExam(async (answers, elapsed) => {
    sent.push({ answers: { ...answers }, elapsed });
    if (++count === 1) throw new Error('offline');
    return { correct: 1 };
  }, async f => {
    await f.action(exam => exam.start());
    await f.action(exam => exam.setAnswer('A1', 2));
    await f.action(() => f.advance(61_000, true));
    assert.equal(count, 1);
    assert.equal(f.readout, 0);
    assert.equal(f.exam.expired, true);
    assert.equal(f.timerCount, 0);
    assert.equal(f.exam.error, 'network');
    await f.action(exam => { exam.setAnswer('A1', 4); f.advance(1_000, true); });
    assert.equal(count, 1, 'no automatic retry loop');
    assert.equal(f.exam.answers.A1, 2);
    await f.action(exam => exam.finish());
    assert.equal(count, 2);
    assert.deepEqual(sent, [{ answers: { A1: 2 }, elapsed: 60 }, { answers: { A1: 2 }, elapsed: 60 }]);
    assert.equal(f.exam.stage, 'result');
  });
});
