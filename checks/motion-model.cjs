// Actual kinematics + React clock hook. Only scheduling/media and unused
// presentation imports are isolated; rendered Slider/geometry are browser QA.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { createRequire } = require('node:module');
const frontend = path.resolve(__dirname, '../source/frontend');
const req = createRequire(path.join(frontend, 'package.json'));
const { JSDOM } = req('jsdom');
const dom = new JSDOM('<div id="root"></div>', { url: 'http://model.test/' });
global.window = dom.window;
global.document = dom.window.document;
global.IS_REACT_ACT_ENVIRONMENT = true;
const React = req('react');
const { act } = React;
const { createRoot } = req('react-dom/client');
let now = 0, nextFrame = 0, reduce = false;
const frames = new Map();
window.matchMedia = () => ({ matches: reduce });
const filename = path.join(frontend, 'src/components/shared/MotionModel.jsx');
const code = req('@babel/core').transformSync(fs.readFileSync(filename, 'utf8'), {
  filename, babelrc: false, configFile: false,
  presets: [[req.resolve('@babel/preset-react'), { runtime: 'automatic' }]],
  plugins: [req.resolve('@babel/plugin-transform-modules-commonjs')],
}).code;
const moduleValue = { exports: {} };
vm.runInNewContext(code, { module: moduleValue, exports: moduleValue.exports, window,
  performance: { now: () => now }, requestAnimationFrame: fn => { frames.set(++nextFrame, fn); return nextFrame; },
  cancelAnimationFrame: id => frames.delete(id),
  require: name => name === 'react' || name === 'react/jsx-runtime' ? req(name)
    : name === '@/lib/format' ? { fmt: String } : {},
}, { filename });
const { useClock, kin, T, PRESETS } = moduleValue.exports;

async function withClock(options, run, reduced = false) {
  now = 0; frames.clear(); reduce = reduced;
  const root = createRoot(document.getElementById('root'));
  let current;
  function Probe({ deps }) { current = useClock(deps, options); return null; }
  const render = deps => act(() => root.render(React.createElement(Probe, { deps })));
  const frame = async milliseconds => {
    now = milliseconds;
    const pending = [...frames.values()]; frames.clear();
    await act(() => { for (const callback of pending) callback(now); });
  };
  await render([0, 0.5]);
  try { await run({ get: () => current, render, frame, change: action => act(() => action(current)) }); }
  finally { await act(() => root.unmount()); frames.clear(); }
}

test('legacy animation still loops and resets when its parameters change', async () => {
  await withClock(undefined, async h => {
    assert.equal(h.get().playing, true);
    await h.frame(5000); assert.equal(h.get().t, 5);
    await h.change(c => c.setPlaying(false));
    await h.render([0, 1]); assert.equal(h.get().t, 0);
    await h.change(c => c.restart());
    await h.frame(18000); assert.equal(h.get().t, 0);
  });
});

test('study preserves a paused measurement time when acceleration changes', async () => {
  await withClock({ loop: false, resetOnChange: false, autoPlay: false }, async h => {
    await h.change(c => c.setPlaying(true));
    await h.frame(5000); await h.change(c => c.setPlaying(false));
    assert.equal(h.get().t, 5);
    await h.render([0, 1]);
    assert.equal(h.get().t, 5, 'parameter comparison must retain the selected instant');
    assert.equal(h.get().playing, false);
  });
});

test('seeking pauses and clamps, then playback continues from the selected instant', async () => {
  await withClock({ loop: false, resetOnChange: false, autoPlay: false }, async h => {
    assert.equal(h.get().playing, false);
    assert.equal(typeof h.get().seek, 'function');
    await h.change(c => c.seek(4.5));
    assert.equal(h.get().t, 4.5); assert.equal(h.get().playing, false);
    await h.change(c => c.setPlaying(true));
    await h.frame(1000); assert.equal(h.get().t, 5.5);
    await h.change(c => c.seek(-1)); assert.equal(h.get().t, 0);
    await h.change(c => c.seek(12)); assert.equal(h.get().t, T);
    await h.change(c => c.seek(NaN)); assert.equal(h.get().t, T, 'invalid input must not corrupt the chosen time');
  });
});

test('study stops at ten seconds and keeps its final measurement', async () => {
  await withClock({ loop: false, resetOnChange: false, autoPlay: true }, async h => {
    await h.frame(10500);
    assert.equal(h.get().t, T); assert.equal(h.get().playing, false);
    await h.frame(25000);
    assert.equal(h.get().t, T); assert.equal(frames.size, 0);
    await h.change(c => c.setPlaying(true));
    assert.equal(h.get().t, 0, 'play at the end starts a new run');
    await h.frame(26000); assert.equal(h.get().t, 1);
  });
});

test('reduced-motion study starts paused and allows an explicit chosen instant', async () => {
  await withClock({ loop: false, resetOnChange: false, autoPlay: false }, async h => {
    assert.equal(h.get().playing, false); assert.equal(frames.size, 0);
    await h.change(c => c.seek(5)); assert.equal(h.get().t, 5);
  }, true);
});

test('study draws each frame and publishes values only on the measurement scale', async () => {
  const framesSeen = [];
  const drawFrame = { current: seconds => framesSeen.push(seconds) };
  await withClock({ loop: false, resetOnChange: false, autoPlay: false, drawFrame }, async h => {
    await h.change(c => c.setPlaying(true));
    await h.frame(16); assert.equal(h.get().t, 0);
    await h.frame(33); assert.equal(h.get().t, 0);
    await h.frame(104); assert.equal(h.get().t, 0.1);
    assert.deepEqual(framesSeen, [0.016, 0.033, 0.104]);
    await h.change(c => c.setPlaying(false));
    assert.equal(h.get().t, 0.1);
    assert.equal(framesSeen.at(-1), 0.1);
    await h.change(c => c.seek(2.5));
    assert.equal(h.get().t, 2.5);
    assert.equal(framesSeen.at(-1), 2.5);
  });
});

test('named presets retain their analytical distances and do not reverse after braking', () => {
  const expected = { train: [10, 25, 5], scooter: [10, 70, 12], ice: [10, 75, 0], asphalt: [2.5, 18.75, 0] };
  for (const p of PRESETS) {
    const k = kin(p.v0, p.a), e = expected[p.id];
    assert.equal(k.tStop, e[0]); assert.equal(k.xAt(T), e[1]); assert.equal(k.vAt(T), e[2]);
  }
  assert.equal(kin(15,-6).xAt(8),18.75);
  assert.equal(kin(15,-6).vAt(8),0);
  assert.equal(kin(0,-6).xAt(8),0);
  assert.equal(kin(0,0).vAt(8),0);
});
