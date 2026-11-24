const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { test } = require('node:test');
const frontend = path.resolve(__dirname, '../source/frontend');
const req = createRequire(path.join(frontend, 'package.json'));
const { JSDOM } = req('jsdom');
const { transformSync } = req('@babel/core');
const React = req('react');
const { act, createElement, Profiler } = React;
const { createRoot } = req('react-dom/client');
const { window } = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://trial.test/' });
global.window = window;
global.document = window.document;
global.IS_REACT_ACT_ENVIRONMENT = true;
global.ResizeObserver = class { observe() {} unobserve() {} };

const frames = new Map();
let nextFrame = 0;
let reducedMotion = false;
window.matchMedia = query => ({ matches: reducedMotion && query === '(prefers-reduced-motion: reduce)' });
const modules = new Map();
function source(input) {
  const filename = [input, input + '.jsx', input + '.js'].find(file => fs.existsSync(file));
  if (modules.has(filename)) return modules.get(filename).exports;
  const module = { exports: {} };
  modules.set(filename, module);
  const code = transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, babelrc: false, configFile: false,
    presets: [[req.resolve('@babel/preset-react'), { runtime: 'automatic' }]],
    plugins: [req.resolve('@babel/plugin-transform-modules-commonjs')],
  }).code;
  vm.runInNewContext(code, {
    module, exports: module.exports, window, document, Node: window.Node,
    requestAnimationFrame: callback => { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame: id => frames.delete(id),
    require: name => {
      if (name === 'framer-motion') return { useReducedMotion: () => reducedMotion };
      if (name === '@/components/shared/Tex') return { Tex: () => null };
      if (name.startsWith('@/')) return source(path.join(frontend, 'src', name.slice(2)));
      if (name.startsWith('.')) return source(path.resolve(path.dirname(filename), name));
      return req(name);
    },
  }, { filename });
  return module.exports;
}

const load = name => source(path.join(frontend, 'src/variants/a', name))[name];
const DropComparison = load('DropComparison');
const CollisionBench = source(path.join(frontend, 'src/variants/a/LessonWorkbenches')).CollisionBench;
const PowerLifts = source(path.join(frontend, 'src/variants/a/LessonDemonstrations')).PowerLifts;
const WallPressureTrial = source(path.join(frontend, 'src/variants/a/LessonExperiments')).WallPressureTrial;
const host = document.getElementById('root');
const nodes = selector => [...host.querySelectorAll(selector)];
const texts = selector => nodes(selector).map(node => node.textContent.replace(/\s+/g, ' '));

async function withTrial(Component, run, reduce = false) {
  frames.clear();
  reducedMotion = reduce;
  const root = createRoot(host);
  let commits = 0;
  await act(() => root.render(createElement(Profiler, { id: 'trial', onRender: () => commits++ }, createElement(Component))));
  try {
    await run({
      commits: () => commits,
      click: selector => act(() => host.querySelector(selector).click()),
      key: (selector, key) => act(() => host.querySelector(selector).dispatchEvent(
        new window.KeyboardEvent('keydown', { key, bubbles: true }),
      )),
      frame: time => act(() => {
        const callbacks = [...frames.values()];
        frames.clear();
        for (const callback of callbacks) callback(time);
      }),
    });
  } finally {
    await act(() => root.unmount());
    assert.equal(frames.size, 0, 'leaving a card cancels the outstanding frame');
  }
}

async function simulate(trial, duration) {
  for (let frame = 0; frame <= duration * 60; frame++) await trial.frame(frame * 1000 / 60);
}

test('fall keeps both balls level and finishes at the original measurement with only phase renders', async t => {
  await withTrial(DropComparison, async trial => {
    await trial.click('.drop-launch');
    const start = trial.commits();
    for (let frame = 0; frame <= 75; frame++) await trial.frame(frame * 1000 / 60);
    const moving = nodes('.drop-ball:not([data-echo])');
    const sharedFall = host.querySelector('.drop-flight-zone > .drop-motion-layer');
    const verticalOffset = () => Number(sharedFall.style.transform.match(/^translateY\(([-.\d]+)%\)$/)[1]);
    assert.equal(moving[0].style.top, moving[1].style.top);
    assert.ok(moving.every(ball => sharedFall.contains(ball)), 'both balls use the same vertical motion');
    assert.ok(verticalOffset() > 0, 'both balls travel between reports');
    assert.deepEqual(texts('.drop-readings dd'), ['0,20 с', '1,05 м', '0,40 м']);
    for (let frame = 76; frame <= 150; frame++) await trial.frame(frame * 1000 / 60);
    assert.equal(parseFloat(moving[0].style.top) + verticalOffset(), 93.1);
    assert.deepEqual(texts('.drop-readings dd'), ['0,50 с', '0,00 м', '1,00 м']);
    assert.equal(nodes('.drop-ball[data-echo]:not([hidden])').length, 5);
    const renders = trial.commits() - start;
    t.diagnostic(`${renders} React commits during 151 fall frames`);
    assert.ok(renders <= 2, `${renders} React commits during 151 fall frames`);
    await trial.click('.drop-launch');
    assert.equal(parseFloat(moving[0].style.top) + verticalOffset(), 33.1);
    assert.equal(nodes('.drop-ball[data-echo]:not([hidden])').length, 0);
  });
});

test('carts show the impact at its first frame and hold the original final energy', async t => {
  await withTrial(CollisionBench, async trial => {
    await trial.click('.impact-options button:last-child');
    await trial.click('.impact-launch');
    const start = trial.commits();
    await trial.frame(0);
    const cart = host.querySelector('.impact-rail > g');
    const atRest = cart.getAttribute('transform');
    for (let frame = 1; frame < 30; frame++) await trial.frame(frame * 1000 / 60);
    assert.notEqual(cart.getAttribute('transform'), atRest, 'carts keep moving while the ledger stays unchanged');
    assert.deepEqual(texts('.impact-velocities b'), ['2 м/с', '0 м/с']);
    assert.deepEqual(texts('.impact-ledger td:last-child'), ['—', '—']);
    await trial.frame(500);
    assert.deepEqual(texts('.impact-velocities b'), ['1 м/с', '1 м/с']);
    assert.deepEqual(texts('.impact-ledger td:last-child'), ['1,00 кг·м/с', '0,50 Дж']);
    for (let frame = 31; frame <= 126; frame++) await trial.frame(frame * 1000 / 60);
    assert.equal(frames.size, 0);
    const renders = trial.commits() - start;
    t.diagnostic(`${renders} React commits during 127 cart frames`);
    assert.ok(renders <= 3, `${renders} React commits during 127 cart frames`);
  });
});

test('lifts paint continuously and update the slider only when it reaches another step', async t => {
  await withTrial(PowerLifts, async trial => {
    assert.deepEqual(texts('.lift-reading tr:first-child td'), ['2 м', '1 м']);
    await trial.click('.lift-launch');
    const start = trial.commits();
    await trial.frame(0);
    for (let frame = 1; frame <= 16; frame++) await trial.frame(frame * 1000 / 60);
    assert.equal(host.querySelector('.lift-rail').style.getPropertyValue('--lift-height'), String((16 / 60) / 2));
    assert.deepEqual(texts('.lift-reading tr:last-child td'), ['50 Вт', '25 Вт']);
    assert.deepEqual(texts('.lift-reading tr:first-child td'), ['0,27 м', '0,13 м']);
    assert.equal(host.querySelector('[role=slider]').getAttribute('aria-valuenow'), '0');
    for (let frame = 17; frame <= 240; frame++) await trial.frame(frame * 1000 / 60);
    assert.deepEqual(texts('.lift-reading tr:nth-child(2) td'), ['100 Дж', '100 Дж']);
    assert.deepEqual(texts('.lift-reading tr:nth-child(3) td'), ['50 Вт', '25 Вт']);
    assert.equal(frames.size, 0);
    const renders = trial.commits() - start;
    t.diagnostic(`${renders} React commits during 241 lift frames`);
    assert.ok(renders <= 18, `${renders} React commits during 241 lift frames`);

    await trial.click('.lift-launch');
    await trial.frame(0);
    await trial.frame(400);
    await trial.key('[role=slider]', 'ArrowRight');
    assert.equal(frames.size, 0, 'manually moving the slider stops the trial');
    assert.deepEqual(texts('.lift-clock output'), ['0,5 с']);
    assert.deepEqual(texts('.lift-reading tr:first-child td'), ['0,5 м', '0,25 м']);
  });
});

test('wall counts the first contact exactly and preserves both recorded samples', async t => {
  await withTrial(WallPressureTrial, async trial => {
    await trial.click('.wall-launch');
    const start = trial.commits();
    await trial.frame(0);
    await trial.frame(189);
    assert.deepEqual(texts('.wall-live b'), ['0']);
    await trial.frame(190);
    assert.deepEqual(texts('.wall-live b'), ['1']);
    assert.ok(host.querySelector('.wall-lane[data-contact]'));
    for (let frame = 12; frame <= 120; frame++) await trial.frame(frame * 1000 / 60);
    assert.deepEqual(texts('.wall-measures td'), ['6', '—', '6', '—']);
    const renders = trial.commits() - start;
    t.diagnostic(`${renders} React commits during 112 wall frames`);
    assert.ok(renders <= 3, `${renders} React commits during 112 wall frames`);
    await trial.click('.wall-speed button:last-child');
    await trial.click('.wall-launch');
    await simulate(trial, 2);
    assert.deepEqual(texts('.wall-measures td'), ['6', '12', '6', '24']);
  });
});

test('reduced motion presents the exact measurement immediately', async () => {
  await withTrial(DropComparison, async trial => {
    await trial.click('.drop-launch');
    assert.equal(frames.size, 0);
    assert.deepEqual(texts('.drop-readings dd'), ['0,50 с', '0,00 м', '1,00 м']);
  }, true);
});
