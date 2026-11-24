// Exercise the real quest store, lesson cards, motion controls and CtA events.
// JSDOM verifies event/state behavior only, not rendered appearance.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { test } = require('node:test');
const frontend = path.resolve(__dirname, '../source/frontend');
const before = process.argv[2] && path.resolve(process.argv[2]);
const req = createRequire(path.join(frontend, 'package.json'));
const { JSDOM } = req('jsdom');
const dom = new JSDOM('<div id="root"></div>', { url: 'http://quest.test/' });
global.window = dom.window; global.document = dom.window.document;
for (const name of ['HTMLElement','HTMLInputElement','SVGElement','Element','Node','NodeFilter','CustomEvent','MutationObserver','DocumentFragment']) global[name] = dom.window[name];
global.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
// Size observation is unavailable in JSDOM. Keep the real Radix controls;
// these checks exercise keyboard/input events, not their pixel geometry.
global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
window.ResizeObserver = global.ResizeObserver;
global.requestAnimationFrame = () => 0; global.cancelAnimationFrame = () => {};
global.IS_REACT_ACT_ENVIRONMENT = true;
window.matchMedia = query => Object.assign(new window.EventTarget(), {
  matches: query === '(prefers-reduced-motion: reduce)', media: query,
});
const React = req('react');
const { act } = React;
const { createRoot } = req('react-dom/client');
const { MemoryRouter } = req('react-router-dom');
const { transformSync } = req('@babel/core');
const KEY = 'kvant_game_v1';
const silent = () => null;
const Fragment = ({ children }) => React.createElement(React.Fragment, null, children);
const ctData = { minutes: 210, total: 5, sections: [{ id: 'mechanics', title: 'Механика', full: 5 }], tasks: [
  ...['A1', 'A2', 'A3'].map(id => ({ id, code: id, part: 'A', kind:'single', section: 'mechanics', text: 'Выбери ответ', options: ['1 м', '2 м', '3 м'] })),
  ...['B1', 'B2'].map(id => ({ id, code: id, part: 'B', kind:'number', section: 'mechanics', text: 'Впиши число', unit: 'м' })),
] };

function environment(storage) {
  const values = new Map();
  const env = { time: new Date(2026, 9, 31, 12).getTime(), writes: 0, fail: false };
  env.storage = storage || {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { if (env.fail) throw new Error('quota'); env.writes++; values.set(key, value); },
  };
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [env.time])); } static now() { return env.time; } }
  const modules = new Map();
  const timers = new Map();
  let timer = 0;
  function load(relative) {
    const filename = [relative, relative + '.jsx', relative + '.js'].map(p => path.resolve(frontend, p)).find(p => fs.existsSync(p));
    if (!filename) throw new Error('Missing ' + relative);
    if (modules.has(filename)) return modules.get(filename).exports;
    const snapshot = before && path.join(before, 'frontend', path.relative(frontend, filename));
    const text = fs.readFileSync(snapshot && fs.existsSync(snapshot) ? snapshot : filename, 'utf8');
    const code = transformSync(text, { filename, babelrc: false, configFile: false,
      presets: [[req.resolve('@babel/preset-react'), { runtime: 'automatic' }]],
      plugins: [req.resolve('@babel/plugin-transform-dynamic-import'), req.resolve('@babel/plugin-transform-modules-commonjs')],
    }).code;
    const module = { exports: {} }; modules.set(filename, module);
    const resolve = name => {
      if (name.endsWith('.css')) return {};
      if (name === 'react' && filename.endsWith(path.join('lib', 'game.js'))) return { ...React, useSyncExternalStore: (_, snapshot) => snapshot() };
      if (name === '@/lib/sound') return { useSfx: () => () => {}, haptic: () => {} };
      if (name === '@/lib/hooks') return { useCtVariant: () => ({ data: ctData }), submitCt: async () => ({ correct: 0, review: [] }), submitVariant: () => async () => ({ correct: 0, review: [] }), checkLesson: async () => ({}) };
      if (name === './ShellA') return { ShellA: Fragment, LoadingA: silent };
      if (name === './Companion') return { CompanionPortrait: silent };
      if (name === '@/components/shared/Tex') return { Rich: ({ text }) => React.createElement(React.Fragment, null, text), Tex: silent, Equation: silent };
      if (name === 'framer-motion') return { useReducedMotion: () => true, useInView: () => false };
      return name.startsWith('@/') ? load('src/' + name.slice(2)) : name.startsWith('.') ? load(path.resolve(path.dirname(filename), name)) : req(name);
    };
    vm.runInNewContext(code, { module, exports: module.exports, require: resolve, console,
      localStorage: env.storage, window, document, Node: window.Node, Date: Clock, performance, ResizeObserver,
      requestAnimationFrame: () => 0, cancelAnimationFrame: () => {},
      setInterval: cb => { timers.set(++timer, cb); return timer; }, clearInterval: id => timers.delete(id),
    }, { filename });
    return module.exports;
  }
  const api = load('src/lib/game.js');
  env.api = api; env.load = load;
  env.seed = patch => env.storage.setItem(KEY, JSON.stringify({ ...api.useGame(), quests: { day: api.dayKey(), ids: ['formula', 'model', 'ct5'], progress: {}, claimed: [] }, ...patch }));
  env.saved = () => JSON.parse(env.storage.getItem(KEY));
  env.progress = id => env.saved()?.quests.progress[id] || 0;
  env.timers = timers;
  return env;
}

async function withUI(run) {
  dom.window.localStorage.clear();
  const env = environment(); env.seed();
  const host = document.getElementById('root');
  const root = createRoot(host);
  const render = async (Component, props = {}) => act(() => root.render(React.createElement(MemoryRouter, { future: { v7_startTransition: true, v7_relativeSplatPath: true } }, React.createElement(Component, props))));
  // Confirmation controls use a real Radix portal outside #root.
  const pick = id => { const node = document.querySelector(`[data-testid="${id}"]`); assert.ok(node, 'Missing ' + id); return node; };
  const click = async id => act(() => {
    const node=pick(id),control=node.matches('button,a')?node:node.querySelector('button');
    assert.ok(control,'Interactive control inside '+id);control.click();
  });
  const key = async (id,value) => act(() => {
    const node=pick(id);node.focus();node.dispatchEvent(new window.KeyboardEvent('keydown',{key:value,bubbles:true}));
  });
  const enter = async (id, value) => act(() => {
    const input = pick(id);
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
  try { await run({ ...env, host, render, pick, click, key, enter }); }
  finally { await act(() => root.unmount()); assert.equal(env.timers.size, 0); }
}

test('distinct sources count once, persist across reload and stop at the target', () => {
  const env = environment(); env.seed();
  env.api.trackUnique('formula', 'lesson:one');
  const reloaded = environment(env.storage);
  reloaded.api.trackUnique('formula', 'lesson:one');
  assert.equal(env.progress('formula'), 1);
  reloaded.api.trackUnique('formula', 'lesson:two');
  reloaded.api.trackUnique('formula', 'lesson:three');
  const writes = env.writes;
  for (let i = 0; i < 20; i++) reloaded.api.trackUnique('formula', 'extra:' + i);
  assert.equal(env.progress('formula'), 3);
  assert.equal(env.writes, writes, 'finished quests must not accumulate unlimited source ids');
  assert.equal(env.saved().quests.seen.formula.length, 3);
  reloaded.api.claimQuest('formula');
  const earned = env.saved();
  environment(env.storage).api.claimQuest('formula');
  assert.equal(env.saved().joules, earned.joules);
  assert.equal(env.saved().xp, earned.xp);
});

test('two stale instances deduplicate sources without refunding a purchase', () => {
  const env = environment(); env.seed();
  const other = environment(env.storage);
  env.api.buy('tuning');
  env.api.trackUnique('formula', 'one');
  other.api.trackUnique('formula', 'one');
  other.api.trackUnique('formula', 'two');
  assert.equal(env.progress('formula'), 2);
  assert.equal(env.saved().joules, 80);
  assert.ok(env.saved().owned.includes('tuning'));
});

test('failed writes do not consume a source; retry succeeds once', () => {
  const env = environment(); env.seed(); env.fail = true;
  env.api.trackUnique('formula', 'one');
  assert.equal(env.progress('formula'), 0);
  assert.ok(env.api.useSaveError());
  env.fail = false;
  env.api.trackUnique('formula', 'one');
  env.api.trackUnique('formula', 'one');
  assert.equal(env.progress('formula'), 1);
  assert.equal(env.api.useSaveError(), null);
});

test('older saves without source ids work; malformed source data stays untouched', () => {
  const env = environment(); env.seed();
  env.api.trackUnique('ct_answer', 'A1');
  assert.equal(env.progress('ct5'), 1);
  const bad = JSON.stringify({ ...env.saved(), quests: { ...env.saved().quests, seen: { ct5: 'broken' } } });
  env.storage.setItem(KEY, bad);
  env.api.trackUnique('ct_answer', 'A2');
  assert.equal(env.storage.getItem(KEY), bad);
  assert.ok(env.api.useSaveError());
});

test('unique events are scoped by quest and day; empty or inactive events do not write', () => {
  const env = environment(); env.seed();
  const writes = env.writes;
  env.api.trackUnique('formula', ''); env.api.trackUnique('unknown', 'one');
  assert.equal(env.writes, writes);
  env.api.trackUnique('formula', 'same'); env.api.trackUnique('ct_answer', 'same');
  assert.equal(env.progress('formula'), 1); assert.equal(env.progress('ct5'), 1);
  env.time += 864e5;
  // New calendar days receive their normal deterministic three quests.
  for (let i = 0; i < 10; i++) {
    env.api.trackUnique('formula', 'same');
    if (env.api.useGame().quests.ids.includes('formula')) break;
    env.time += 864e5;
  }
  assert.ok(env.api.useGame().quests.ids.includes('formula'));
  assert.equal(env.progress('formula'), 1, 'same source is eligible on a new day');
  assert.equal(env.saved().quests.seen.formula.length, 1);
});

test('real formula cards count three distinct openings, not closing or remounting', async () => {
  await withUI(async f => {
    const Card = f.load('src/variants/a/cardsA.jsx').CARDS.formulas;
    const props = { lesson: { slug: 'motion' }, block: { id: 'formulas', title: 'Формулы', items: ['v', 'x', 'a'].map(tex => ({ tex, label: tex, when: 'Условие' })) } };
    await f.render(Card, props);
    assert.equal(f.progress('formula'), 0);
    await f.click('formula-tile-0'); assert.equal(f.progress('formula'), 1);
    await f.click('formula-tile-0'); await f.click('formula-tile-0');
    assert.equal(f.progress('formula'), 1);
    await f.render(silent); await f.render(Card, props);
    await f.click('formula-tile-0'); assert.equal(f.progress('formula'), 1);
    await f.click('formula-tile-1'); await f.click('formula-tile-2');
    assert.equal(f.progress('formula'), 3);
  });
});

test('real motion model counts a changed parameter, not mount or playback buttons', async () => {
  await withUI(async f => {
    const Card = f.load('src/variants/a/cardsA.jsx').CARDS.model;
    await f.render(Card, { lesson: { slug: 'motion' }, block: { id: 'model', title: 'Модель', paragraphs: [] } });
    await f.click('sim-play-pause-btn'); await f.click('sim-restart-btn'); await f.click('sim-settings'); await f.click('sim-preset-train');
    assert.equal(f.progress('model'), 0);
    assert.equal(f.pick('sim-slider-v0').getAttribute('aria-valuenow'),'0');
    for(let i=0;i<8;i++) await f.key('sim-slider-v0','ArrowRight');
    assert.equal(f.pick('sim-slider-v0').getAttribute('aria-valuenow'),'8');
    assert.equal(f.progress('model'), 1);
    await f.click('sim-preset-scooter');
    assert.equal(f.progress('model'), 1);
    assert.doesNotMatch(f.api.QUESTS.find(q => q.id === 'model').title, /3D/);
  });
});

test('real CtA counts five distinct complete answers; edits, clearing and partial signs cannot farm it', async () => {
  await withUI(async f => {
    const Page = f.load('src/variants/a/CtA.jsx').default;
    await f.render(Page); await f.click('ct-start-btn');
    await f.click('ct-option-a1-1'); await f.click('ct-option-a1-1'); await f.click('ct-option-a1-2');
    assert.equal(f.progress('ct5'), 1);
    await f.click('ct-next-btn'); await f.click('ct-option-a2-1');
    await f.click('ct-next-btn'); await f.click('ct-option-a3-1');
    await f.click('ct-next-btn');
    await f.enter('ct-answer-input-b1', '-');
    assert.equal(f.progress('ct5'), 3);
    assert.equal(f.pick('ct-answered-count').textContent, '3/5');
    await f.enter('ct-answer-input-b1', '2,5'); assert.equal(f.progress('ct5'), 3);
    await f.enter('ct-answer-input-b1', '0');
    await f.enter('ct-answer-input-b1', '10'); await f.enter('ct-answer-input-b1', '');
    assert.equal(f.progress('ct5'), 4);
    await f.click('ct-next-btn'); await f.enter('ct-answer-input-b2', '−8');
    assert.equal(f.progress('ct5'), 5);
    await f.render(silent); await f.render(Page);
    assert.ok(f.pick('ct-resume'));
    await f.click('ct-resume-btn');
    assert.equal(f.pick('ct-answer-input-b2').value,'−8');
    await f.click('ct-answer-sheet-slot-a1');await f.click('ct-option-a1-1');
    assert.equal(f.progress('ct5'), 5);
    // The same source must also stay deduplicated in a genuinely new attempt,
    // reached through the current protected restart flow rather than a stub.
    await f.render(silent);await f.render(Page);
    await f.click('ct-resume-restart');
    assert.ok(document.querySelector('[role="alertdialog"]'));
    assert.equal(f.progress('ct5'),5);
    await f.click('ct-restart-confirm');
    assert.equal(f.pick('ct-option-a1-1').getAttribute('aria-checked'),'false');
    await f.click('ct-option-a1-1');
    assert.equal(f.progress('ct5'),5);
  });
});
