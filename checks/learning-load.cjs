// Real route components, cards, AnswerA, hooks, React Query and Axios.
// Visuals, transport and reward commands are isolated by default; selected
// integration checks opt into the real game store with disposable JSDOM storage.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { test } = require('node:test');
const frontend = path.resolve(__dirname, '../source/frontend');
const req = createRequire(path.join(frontend, 'package.json'));
const beforeDirectory = process.argv[2] && path.resolve(process.argv[2]);
const { JSDOM } = req('jsdom');
const dom = new JSDOM('<div id="root"></div>', { url: 'http://unit.test/' });
global.window = dom.window;
global.document = dom.window.document;
// Radix confirmation renders in a portal and manages native focus.
for (const name of ['HTMLElement', 'HTMLInputElement', 'Element', 'Node', 'NodeFilter', 'CustomEvent', 'MutationObserver', 'DocumentFragment']) {
  global[name] = dom.window[name];
}
global.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
global.requestAnimationFrame = callback => setTimeout(() => callback(Date.now()), 0);
global.cancelAnimationFrame = clearTimeout;
global.IS_REACT_ACT_ENVIRONMENT = true;
const React = req('react');
const { act } = React;
const { createRoot } = req('react-dom/client');
const { MemoryRouter, Routes, Route } = req('react-router-dom');
const { QueryClient, QueryClientProvider } = req('@tanstack/react-query');
const { transformSync } = req('@babel/core');
const modules = new Map();
const asFragment = ({ children }) => React.createElement(React.Fragment, null, children);
const visual = () => null;
const motionArticle = React.forwardRef(({ children, className, onPointerDown, ...rest }, ref) =>
  React.createElement('article', { ref, className, onPointerDown, tabIndex: rest.tabIndex, 'data-testid': rest['data-testid'], 'data-card-id': rest['data-card-id'] }, children));
// Route tests exercise the kit Button and its handlers, not animation timing.
const motionCreate = Component => React.forwardRef(({ whileHover, whileTap, transition, ...props }, ref) =>
  React.createElement(Component, { ...props, ref }));
let gameActions;
let gameSnapshot = {};
let realGameMode = false;
let reduceMotion = true;
const motionPreference = new dom.window.EventTarget();
Object.defineProperty(motionPreference, 'matches', { get: () => reduceMotion });
dom.window.matchMedia = query => query === '(prefers-reduced-motion: reduce)' ? motionPreference : { matches: false };
const setReducedMotion = value => {
  if (value === reduceMotion) return;
  reduceMotion = value;
  motionPreference.dispatchEvent(new dom.window.Event('change'));
};
const portraitFrames = [];

function sourceModule(input) {
  const filename = [input, input + '.jsx', input + '.js'].find(file => fs.existsSync(file));
  if (!filename) throw new Error('Missing module ' + input);
  if (modules.has(filename)) return modules.get(filename).exports;
  const module = { exports: {} };
  modules.set(filename, module);
  const isTarget = /[\\/]variants[\\/]a[\\/](LessonA|TrainerA|ReviewA)\.jsx$/.test(filename);
  const snapshot = beforeDirectory && path.join(beforeDirectory, 'frontend', path.relative(frontend, filename));
  const source = snapshot && fs.existsSync(snapshot) ? snapshot
    : beforeDirectory && isTarget && fs.existsSync(path.join(beforeDirectory, path.basename(filename)))
      ? path.join(beforeDirectory, path.basename(filename)) : filename;
  const code = transformSync(fs.readFileSync(source, 'utf8'), {
    filename, babelrc: false, configFile: false,
    presets: [[req.resolve('@babel/preset-react'), { runtime: 'automatic' }]],
    plugins: [req.resolve('@babel/plugin-transform-dynamic-import'), req.resolve('@babel/plugin-transform-modules-commonjs')],
  }).code;
  const requireModule = name => {
    if (name.endsWith('.css')) return {};
    if (name === '@/lib/sound') return { useSfx: () => () => {}, haptic: () => {} };
    if (name === '@/lib/companionRenderer') return {
      createCompanionRenderer: () => ({ render: seconds => { portraitFrames.push(seconds); return true; }, dispose() {} }),
    };
    if (name === '@/lib/game') return {
      useProfileGeneration: () => realGameMode ? sourceModule(path.join(frontend, 'src/lib/game.js')).useProfileGeneration() : null,
      dayKey: (...args) => sourceModule(path.join(frontend, 'src/lib/game.js')).dayKey(...args),
      mistakeTime: (...args) => sourceModule(path.join(frontend, 'src/lib/game.js')).mistakeTime(...args),
      mistakeGiven: (...args) => sourceModule(path.join(frontend, 'src/lib/game.js')).mistakeGiven(...args),
      recordQuizAnswer: (...args) => { if (realGameMode) return sourceModule(path.join(frontend, 'src/lib/game.js')).recordQuizAnswer(...args); },
      learningResultStatus: (...args) => sourceModule(path.join(frontend, 'src/lib/game.js')).learningResultStatus(...args),
      saveLearningResult: (id, result, options) => {
        if (realGameMode) return sourceModule(path.join(frontend, 'src/lib/game.js')).saveLearningResult(id, result, options);
        if (!id.startsWith('quiz:')) (result.correct ? gameActions.solved : gameActions.failed).push([id, options]);
        const canonical = sourceModule(path.join(frontend, 'src/lib/progressIds.js')).canonicalProgressId(id);
        gameActions.learningChecks[canonical] = { checkedAt: result.checkedAt, attemptId: result.attemptId };
        return 'saved';
      },
      useGame: () => realGameMode ? sourceModule(path.join(frontend, 'src/lib/game.js')).useGame() : ({ joules: 200, mistakes: [], ...gameSnapshot, learningChecks: gameActions.learningChecks,
        solved: [...(gameSnapshot.solved ?? []), ...gameActions.solved.map(([id]) => sourceModule(path.join(frontend, 'src/lib/progressIds.js')).canonicalTaskId(id))] }),
      trainerProgressAt: (...args) => sourceModule(path.join(frontend, 'src/lib/game.js')).trainerProgressAt(...args),
      saveTrainerSolution: (...args) => realGameMode ? sourceModule(path.join(frontend, 'src/lib/game.js')).saveTrainerSolution(...args) : gameActions.solved.push(args) > 0,
      failTask: (...args) => realGameMode ? sourceModule(path.join(frontend, 'src/lib/game.js')).failTask(...args) : gameActions.failed.push(args),
      syncQuestTasks: (...args) => { if (realGameMode) return sourceModule(path.join(frontend, 'src/lib/game.js')).syncQuestTasks(...args); },
      completeLesson: (...args) => { if (realGameMode) return sourceModule(path.join(frontend, 'src/lib/game.js')).completeLesson(...args); throw new Error('Unrelated finish card reached'); },
    };
    if (name === './ShellA') return { ShellA: asFragment, Logo: visual, LoadingA: () => React.createElement('div', null, 'Загрузка') };
    if (name === './Chars') return { Char: visual, Avatar: visual, Bubble: visual };
    if (name === './Scene') return { Scene: visual };
    if (name === '@/components/shared/Tex') return {
      Rich: ({ text }) => React.createElement(React.Fragment, null, text), Tex: visual, Equation: visual,
      preloadReviewFormulas: () => {},
    };
    if (name === '@/components/shared/MotionModel') return { MotionModel: visual };
    if (name === '@/components/shared/VtGraph') return { VtGraph: visual };
    if (name === '@/components/shared/Vectors') return { Vectors: visual };
    if (name === 'framer-motion') return { AnimatePresence: asFragment, motion: { article: motionArticle, create: motionCreate }, useReducedMotion: () => reduceMotion, useInView: () => true, useDragControls: () => ({ start() {} }) };
    return name.startsWith('@/') ? sourceModule(path.join(frontend, 'src', name.slice(2)))
      : name.startsWith('.') ? sourceModule(path.resolve(path.dirname(filename), name)) : req(name);
  };
  vm.runInNewContext(code, { module, exports: module.exports, require: requireModule, console, window, document, process, TextEncoder, localStorage: dom.window.localStorage,
    requestAnimationFrame: global.requestAnimationFrame, cancelAnimationFrame: global.cancelAnimationFrame, setTimeout, clearTimeout }, { filename });
  return module.exports;
}

const Lesson = sourceModule(path.join(frontend, 'src/variants/a/LessonA.jsx')).default;
const Trainer = sourceModule(path.join(frontend, 'src/variants/a/TrainerA.jsx')).default;
const Review = sourceModule(path.join(frontend, 'src/variants/a/ReviewA.jsx')).default;
const { api } = sourceModule(path.join(frontend, 'src/lib/hooks.js'));
const slug = 'review-topic';
const question = { id: 'q1', text: 'Введите число', kind: 'number', unit: 'м' };
const lesson = { slug, title: 'Проверочный урок', grade: 9, chapter: 'Механика', blocks: [{ id: 'check', kind: 'check' }], quiz: [question] };
const trainer = { title: 'Проверочный тренажёр', grade: 9, tasks: [{ ...question, id: 't1', code: 'В1', part: 'B', level: 1, hint: 'Подсказка' }] };
const failure = status => Object.assign(new Error('Simulated HTTP ' + status), { response: { status } });
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

async function withPage(kind, seed, run, options = {}) {
  dom.window.localStorage.clear();
  realGameMode = Boolean(options.realGame);
  if (options.gameSave) dom.window.localStorage.setItem('kvant_game_v1', JSON.stringify(options.gameSave));
  const host = document.getElementById('root');
  let root = createRoot(host);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: Infinity, refetchOnWindowFocus: false } } });
  const reviewIds = [...new Set(options.game?.mistakes ?? [])].sort();
  const reviewData = { items: options.reviewItems ?? [] };
  const key = kind === 'review' ? ['review', reviewIds] : [kind, slug];
  const data = options.data ?? (kind === 'lesson' ? lesson : trainer);
  const state = { getStatus: 200, postStatus: 200, gets: 0, getPaths: [], posts: [], reviewPosts: [], reviewStatus: 200, holdGet: null, holdReview: null };
  gameActions = { solved: [], failed: [], learningChecks: {} };
  gameSnapshot = options.game ?? {};
  api.defaults.adapter = async config => {
    if (config.method === 'post') {
      if (config.url === '/review') {
        state.reviewPosts.push(JSON.parse(config.data));
        if (state.holdReview) await state.holdReview;
        if (state.reviewStatus !== 200) throw failure(state.reviewStatus);
        return { data: reviewData, status: 200, config, headers: {} };
      }
      state.posts.push(JSON.parse(config.data));
      if (state.postStatus !== 200) throw failure(state.postStatus);
      return { data: state.response ?? { correct: true, answer: 7, solution: [], explanation: 'Верный ответ' }, status: 200, config, headers: {} };
    }
    state.gets++;
    state.getPaths.push(config.url);
    if (state.holdGet) await state.holdGet;
    if (state.getStatus !== 200) throw failure(state.getStatus);
    return { data: options.getData?.[config.url] ?? data, status: 200, config, headers: {} };
  };
  if (seed) client.setQueryData(key, kind === 'review' ? reviewData : data);
  const route = kind === 'review' ? Review : kind === 'lesson' ? Lesson : Trainer;
  const routePath = kind === 'review' ? '/review' : `/${kind}/:slug`;
  const render = () => act(async () => {
    root.render(React.createElement(QueryClientProvider, { client },
      React.createElement(MemoryRouter, { initialEntries: [options.entry ?? (kind === 'review' ? '/review' : `/${kind}/${slug}`)], future: { v7_startTransition: true, v7_relativeSplatPath: true } },
        React.createElement(Routes, null, React.createElement(Route, { path: routePath, element: React.createElement(route) })))));
    await tick();
  });
  const flush = () => act(async () => { await tick(); });
  const waitFor = async predicate => {
    for (let i = 0; i < 30; i++) { await flush(); if (predicate()) return; }
    assert.ok(predicate(), 'Expected rendered state was not reached: ' + host.textContent);
  };
  const remount = async () => {
    await act(() => root.unmount());
    root = createRoot(host);
    await render();
  };
  try { await run({ host, client, key, state, render, remount, flush, waitFor, actions: gameActions, data }); }
  finally { await act(() => root.unmount()); client.clear(); }
}

async function enter(input, value) {
  const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set;
  await act(() => { setter.call(input, value); input.dispatchEvent(new dom.window.Event('input', { bubbles: true })); });
}

if (require.main === module) {
for (const kind of ['lesson', 'trainer']) {
  const tid = kind === 'lesson' ? 'lesson-q1' : 'trainer-t1';
  test(`${kind}: a failed background GET keeps the exact card and typed answer`, async () => {
    await withPage(kind, true, async h => {
      await h.render();
      if (kind === 'lesson') await act(() => h.host.querySelector('[data-testid="lesson-next-btn"]').click());
      const input = h.host.querySelector(`[data-testid="${tid}-input"]`);
      await enter(input, '7');
      h.state.getStatus = 503;
      await act(async () => { await h.client.refetchQueries({ queryKey: h.key }); await tick(); });
      await h.flush();
      assert.equal(h.client.getQueryState(h.key).status, 'error');
      assert.equal(h.host.querySelector(`[data-testid="${tid}-input"]`), input, 'must not unmount the active answer');
      assert.equal(input.value, '7');
      assert.equal(h.state.posts.length, 0);
      assert.equal(h.actions.solved.length, 0);
      h.state.getStatus = 200;
      await act(async () => { await h.client.refetchQueries({ queryKey: h.key }); await tick(); });
      await h.flush();
      assert.equal(h.host.querySelector(`[data-testid="${tid}-input"]`), input);
      assert.equal(input.value, '7');
    });
  });

  test(`${kind}: initial GET error can recover without a page reload`, async () => {
    await withPage(kind, false, async h => {
      h.state.getStatus = 503;
      await h.render();
      await h.waitFor(() => h.host.textContent.includes(kind === 'lesson' ? 'Урок не загрузился' : 'Задачи не загрузились'));
      const retry = [...h.host.querySelectorAll('button')].find(b => /снова|загрузку/.test(b.textContent));
      assert.ok(retry);
      h.state.getStatus = 200;
      let release;
      h.state.holdGet = new Promise(resolve => { release = resolve; });
      await act(() => retry.click());
      await h.flush();
      assert.ok(!h.host.contains(retry) || retry.disabled, 'retry cannot submit again while loading');
      await act(async () => { release(); await tick(); });
      if (kind === 'lesson') { await h.waitFor(() => h.host.querySelector('[data-testid="lesson-next-btn"]')); await act(() => h.host.querySelector('[data-testid="lesson-next-btn"]').click()); }
      await h.waitFor(() => h.host.querySelector(`[data-testid="${tid}-input"]`));
      assert.equal(h.state.gets, 2);
    });
  });

  test(`${kind}: POST failure preserves the answer and retry submits it once`, async () => {
    await withPage(kind, true, async h => {
      await h.render();
      if (kind === 'lesson') await act(() => h.host.querySelector('[data-testid="lesson-next-btn"]').click());
      const input = h.host.querySelector(`[data-testid="${tid}-input"]`);
      await enter(input, '7');
      h.state.postStatus = 503;
      await act(async () => { h.host.querySelector(`[data-testid="${tid}-check-btn"]`).click(); await tick(); });
      await h.waitFor(() => h.host.querySelector(`[data-testid="${tid}-error"]`));
      assert.equal(input.value, '7');
      assert.equal(input.disabled, false);
      assert.equal(h.actions.solved.length + h.actions.failed.length, 0);
      assert.equal(h.host.querySelector('[data-testid$="verdict"]'), null);
      h.state.postStatus = 200;
      await act(async () => { h.host.querySelector(`[data-testid="${tid}-check-btn"]`).click(); await tick(); });
      await h.waitFor(() => h.host.querySelector('[data-testid$="verdict"]'));
      assert.equal(h.state.posts.length, 2);
      assert.deepEqual(h.state.posts.map(p => p.answer), ['7', '7']);
      assert.equal(h.actions.solved.length, kind === 'trainer' ? 1 : 0);
    });
  });
}

test('lesson: a genuine initial 404 still shows the unavailable-topic screen', async () => {
  await withPage('lesson', false, async h => {
    h.state.getStatus = 404;
    await h.render();
    await h.waitFor(() => h.host.textContent.includes('Этой темы пока нет'));
    assert.equal(h.host.querySelector('a').getAttribute('href'), '/trainer/ravnouskorennoe-dvizhenie');
    assert.equal(h.host.querySelector('button'), null);
  });
});

test('trainer: an obsolete topic offers a way back to the catalog without retrying the URL', async () => {
  await withPage('trainer', false, async h => {
    h.state.getStatus = 404;
    await h.render();
    await h.waitFor(() => h.host.querySelector('[data-testid="trainer-topic-not-found"]'));
    assert.equal(h.host.querySelector('a').getAttribute('href'), '/practice');
    assert.equal(h.host.querySelector('button'), null);
    assert.equal(h.state.gets, 1);
  });
});
}

module.exports = { withPage, enter, act, tick, sourceModule, frontend, dom, lesson, trainer, setReducedMotion, portraitFrames };
