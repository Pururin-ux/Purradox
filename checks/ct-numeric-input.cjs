const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { test } = require('node:test');
const frontend = path.resolve(__dirname, '../source/frontend');
const req = createRequire(path.join(frontend, 'package.json'));
const { JSDOM } = req('jsdom');
const dom = new JSDOM('<div id="root"></div>', { url: 'http://unit.test/' });
global.window = dom.window; global.document = dom.window.document;
for (const name of ['HTMLElement','HTMLInputElement','Element','Node','NodeFilter','CustomEvent','MutationObserver','DocumentFragment']) global[name] = dom.window[name];
global.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
global.requestAnimationFrame = callback => setTimeout(callback,0);
global.cancelAnimationFrame = clearTimeout;
global.IS_REACT_ACT_ENVIRONMENT = true;
const React = req('react');
const { act } = React;
const { createRoot } = req('react-dom/client');
const { MemoryRouter } = req('react-router-dom');
const { transformSync } = req('@babel/core');
const modules = new Map();
const target = path.resolve(process.argv[2] || path.join(frontend, 'src/variants/a/CtA.jsx'));
let queryState = {};
let reports = {}, openedAttempts = 0;
let examState = { stage: 'intro' };
function withTimer({ left, ...exam }) {
  return { ...exam, expired: left <= 0, timer: { subscribe: () => () => {}, getRemaining: () => left } };
}
function sourceModule(input) {
  const filename = [input, input + '.jsx', input + '.js'].find(file => fs.existsSync(file));
  if (modules.has(filename)) return modules.get(filename).exports;
  const module = { exports: {} }; modules.set(filename, module);
  let code = transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, babelrc: false, configFile: false,
    presets: [[req.resolve('@babel/preset-react'), { runtime: 'automatic' }]],
    plugins: [req.resolve('@babel/plugin-transform-dynamic-import'), req.resolve('@babel/plugin-transform-modules-commonjs')],
  }).code;
  if (filename === target) code += '\nmodule.exports.TaskView = TaskView; module.exports.Exam = Exam;';
  const stub = name => {
    if (name === '@/lib/sound') return { useSfx: () => () => {}, haptic: () => {} };
    if (name === '@/components/shared/Tex') return { Rich: ({ text }) => React.createElement(React.Fragment, null, text) };
    if (name === './lines') return { TAHI: { end: '', ahead: [''], intro: '' } };
    if (name === './Chars') return { Char: () => null, Bubble: () => null };
    // JSDOM cannot create WebGL. The existing portrait renderer is unchanged;
    // this fixture checks CT controls; real browser evidence checks its rig.
    if (name === './Companion') return { CompanionPortrait: ({className}) => React.createElement('figure',{className},React.createElement('img',{alt:'Девушка и Мефистофель'})) };
    if (name === '@/lib/format') return sourceModule(path.join(frontend, 'src/lib/format.js'));
    if (name === '@/lib/ctDraft') return sourceModule(path.join(frontend, 'src/lib/ctDraft.js'));
    if (name === '@/lib/nav') return { LINKS: { textbook:'/learn',practice:'/practice',ct:'/ct',lesson:'/lesson/ravnouskorennoe-dvizhenie',trainer:'/trainer/ravnouskorennoe-dvizhenie' } };
    if (name === './BrandMark') return { BrandMark: () => React.createElement('svg') };
    if (name === './AnswerA') return sourceModule(path.join(frontend, 'src/variants/a/AnswerA.jsx'));
    if (name === './CtReview') return sourceModule(path.join(frontend, 'src/variants/a/CtReview.jsx'));
    if (name === '@/components/shared/Calculator') return sourceModule(path.join(frontend, 'src/components/shared/Calculator.jsx'));
    if (name === '@/components/shared/useCtExam') return { useCtExam: () => { openedAttempts++; return withTimer(examState); },
      hasAnswer: value => typeof value === 'string' ? /^[−-]?\d+$/.test(value) : value != null && !(Array.isArray(value) && !value.length) };
    if (name === '@/lib/hooks') return { useCtVariant: () => queryState, submitVariant: () => async () => {},
      submitCt: async () => {}, useUpdatedFeedback: (_, result) => ({ item: result }) };
    if (name === '@/lib/game') return { useGame: () => ({ examResults:reports }), useProfileGeneration: () => null, readCtResult: () => undefined, dayKey: () => "today", trackUnique: () => true, recordCt: () => true };
    if (name === './ShellA') return { ShellA: ({ children }) => React.createElement(React.Fragment, null, children), LoadingA: () => React.createElement('div', { 'data-testid': 'loading-stub' }, 'Загрузка') };
    if (filename === target && (name.startsWith('.') || (name.startsWith('@/') && !name.startsWith('@/components/ui/')))) return {};
    return name.startsWith('@/') ? sourceModule(path.join(frontend, 'src', name.slice(2)))
      : name.startsWith('.') ? sourceModule(path.resolve(path.dirname(filename), name)) : req(name);
  };
  vm.runInNewContext(code, { module, exports: module.exports, require: stub, console, URLSearchParams, window: dom.window }, { filename });
  return module.exports;
}
const TaskView = sourceModule(target).TaskView;
const Exam = sourceModule(target).Exam;
const CtA = sourceModule(target).default;
async function withInput(run) {
  const host = document.getElementById('root');
  const root = createRoot(host);
  let answers;
  const task = { id: 'B1', code: 'В1', part: 'B', unit: 'м', text: 'Проверочная задача' };
  function Harness() {
    const [values, setValues] = React.useState({ B1: '17' });
    answers = values;
    return React.createElement(TaskView, { task, section: 'Механика', exam: {
      answers: values, flags: [], current: 0, tasks: [task],
      setAnswer: (id, value) => setValues(current => ({ ...current, [id]: value })),
    } });
  }
  await act(() => root.render(React.createElement(Harness)));
  const input = host.querySelector('[data-testid="ct-answer-input-b1"]');
  const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set;
  try {
    await run({ host, input, get answer() { return answers.B1; }, async edit(value) {
      await act(() => { setter.call(input, value); input.dispatchEvent(new dom.window.Event('input', { bubbles: true })); });
    } });
  } finally { await act(() => root.unmount()); }
}

test('fractional, malformed and overlong edits never become a different submitted integer', async () => {
  await withInput(async h => {
    for (const invalid of ['2,5', '2.5', '1e3', '2 м', '1-2', '123456789', '-12345678']) {
      await h.edit(invalid);
      assert.equal(h.answer, '17', `preserve prior answer after ${invalid}`);
      assert.equal(h.input.value, '17');
      assert.equal(h.input.getAttribute('aria-invalid'), 'true');
      assert.match(h.host.querySelector('[role="status"]').textContent, /Ответ не изменён/);
    }
  });
});

test('valid integers, both minus signs and clearing remain editable', async () => {
  await withInput(async h => {
    await h.edit('2,5');
    for (const valid of ['25', '-12', '−12', '-1234567', '12345678', '', '-']) {
      await h.edit(valid);
      assert.equal(h.answer, valid);
      assert.equal(h.input.value, valid);
      assert.equal(h.input.getAttribute('aria-invalid'), 'false');
      assert.equal(h.host.querySelector('[role="status"]'), null);
    }
  });
});

test('sign button adds or removes a minus without truncating an answer', async () => {
  await withInput(async h => {
    const sign = h.host.querySelector('[data-testid="ct-answer-sign"]');
    const toggle = async () => await act(() => sign.click());
    await toggle();
    assert.equal(h.answer, '-17');
    assert.equal(sign.getAttribute('aria-pressed'), 'true');
    await h.edit('−17');
    await toggle();
    assert.equal(h.answer, '17');
    await h.edit('');
    await toggle();
    assert.equal(h.answer, '-');
    await toggle();
    assert.equal(h.answer, '');
    await h.edit('12345678');
    await toggle();
    assert.equal(h.answer, '12345678');
    assert.equal(h.input.getAttribute('aria-invalid'), 'true');
  });
});

async function withSubmissionUI(overrides, run) {
  const host = document.getElementById('root');
  const root = createRoot(host);
  let submissions = 0;
  const task = { id: 'B1', code: 'В1', part: 'B', unit: 'м', text: 'Проверочная задача' };
  let exam = { tasks: [task], answers: { B1: '17' }, flags: [], current: 0, left: 0,
    sending: false, error: 'network', answeredCount: 1,
    finish: () => { submissions++; }, setAnswer: () => {}, ...overrides };
  const render = async updates => {
    exam = { ...exam, ...updates };
    await act(() => root.render(React.createElement(MemoryRouter, {initialEntries:['/ct/demo']}, React.createElement(Exam, { data: { tasks: exam.tasks, sections: [], total: 30 }, exam: withTimer(exam) }))));
  };
  try {
    await render({});
    await run({ host, render, get submissions() { return submissions; },
      async click(testId) {
        await act(() => document.querySelector(`[data-testid="${testId}"]`).click());
        // Radix restores focus on the task after unmounting the modal scope.
        await act(() => new Promise(resolve => setTimeout(resolve, 0)));
      } });
  } finally { await act(() => root.unmount()); }
}

test('empty and bookmarked filters keep their counts and select only matching tasks', async () => {
  const tasks = [
    { id: 'A1', code: 'А1', part: 'A', options: ['Да', 'Нет'], text: 'Первый вопрос' },
    { id: 'A2', code: 'А2', part: 'A', options: ['Да', 'Нет'], text: 'Второй вопрос' },
    { id: 'B1', code: 'В1', part: 'B', unit: 'м', text: 'Числовой вопрос' },
  ];
  let picked;
  await withSubmissionUI({ tasks, left: 60, current: 2, error: false, answers: { A1: 1 }, flags: ['A1', 'B1'], goTo: id => { picked = id; } }, async h => {
    const slots = () => Array.from(h.host.querySelectorAll('[data-testid^="ct-answer-sheet-slot-"]'), node => node.dataset.testid);
    const sheet = h.host.querySelector('[data-testid="ct-answer-sheet"]');
    assert.deepEqual(slots(), ['ct-answer-sheet-slot-a1', 'ct-answer-sheet-slot-a2', 'ct-answer-sheet-slot-b1']);
    await h.click('ct-sheet-filter-blank');
    assert.deepEqual(slots(), ['ct-answer-sheet-slot-a2', 'ct-answer-sheet-slot-b1']);
    await h.click('ct-sheet-filter-flagged');
    assert.deepEqual(slots(), ['ct-answer-sheet-slot-a1', 'ct-answer-sheet-slot-b1']);
    assert.equal(sheet.querySelector('[aria-current="step"]').dataset.testid, 'ct-answer-sheet-slot-b1');
    await h.click('ct-answer-sheet-slot-a1');
    assert.equal(picked, 'A1');
    await h.render({ flags: [] });
    assert.match(sheet.querySelector('[role="status"]').textContent, /Закладок пока нет/);
    await h.click('ct-sheet-filter-all');
    assert.equal(slots().length, 3);
  });
});

test('the compact sheet mounts on demand, keeps its filter across a resize and returns focus to the task', async () => {
  const previousMatchMedia = window.matchMedia;
  const media = new window.EventTarget();
  media.matches = true;
  window.matchMedia = query => {
    if (query === '(max-width: 760px), (max-height: 580px)') return previousMatchMedia?.(query);
    assert.equal(query, '(max-width: 1100px)');
    return media;
  };
  let picked;
  try {
    await withSubmissionUI({ left: 60, error: false, flags: ['B1'], goTo: id => { picked = id; } }, async h => {
      const sheets = () => document.querySelectorAll('[data-testid="ct-answer-sheet"]');
      assert.equal(sheets().length, 0);
      await h.click('ct-sheet-toggle');
      assert.equal(sheets().length, 1);
      assert.ok(sheets()[0].closest('[role="dialog"]'));
      await h.click('ct-sheet-filter-flagged');
      await h.click('ct-answer-sheet-slot-b1');
      assert.equal(picked, 'B1');
      assert.equal(sheets().length, 0);
      assert.equal(document.activeElement.dataset.testid, 'ct-task-b1');

      await h.click('ct-sheet-toggle');
      await act(() => { media.matches = false; media.dispatchEvent(new window.Event('change')); });
      assert.equal(sheets().length, 1);
      assert.ok(sheets()[0].closest('[role="dialog"]'));
      await h.click('ct-sheet-close');
      assert.equal(sheets().length, 1);
      assert.ok(sheets()[0].closest('.ct-desktop-sheet'));
      assert.equal(sheets()[0].querySelector('[data-testid="ct-sheet-filter-flagged"]').getAttribute('aria-checked'), 'true');
      assert.equal(document.activeElement.dataset.testid, 'ct-task-b1');
    });
  } finally {
    window.matchMedia = previousMatchMedia;
  }
});

test('result jumps to the matching error, distinguishes extra and missing selections and returns focus to its number', async () => {
  const host = document.getElementById('root');
  const root = createRoot(host);
  const tasks = [
    { id: 'A1', code: 'А1', part: 'A', kind: 'multi', options: ['Первый', 'Второй', 'Третий'], text: 'Условие', section:'mech' },
    { id: 'B1', code: 'В1', part: 'B', kind: 'number', unit: 'м', text: 'Новая формулировка', section:'mech' },
  ];
  const result = { correct:0, total:2, elapsed_sec:60, by_section:[{id:'mech',title:'Механика',correct:0,total:2}],
    review:[
      {id:'A1',code:'А1',section:'mech',given:[1,2],answer:[1,3],correct:false,solution:[{text:'Первый и третий'}],
        guide:{title:'Два пункта',note:'Проверь второй пункт.'}},
      {id:'B1',code:'В1',section:'mech',given:null,answer:15,correct:false,historical:true,solution:[{text:'Сохранённое решение'}],
        guide:{title:'Подсказка для прежнего номера',note:'Устаревшая подсказка'}},
    ] };
  const { CtResult } = sourceModule(path.join(frontend, 'src/variants/a/CtReview.jsx'));
  const find = id => host.querySelector(`[data-testid="${id}"]`);
  const click = node => act(() => node.click());
  const panel = id => find(id).querySelector('button[aria-expanded]');
  try {
    await act(() => root.render(React.createElement(MemoryRouter, null, React.createElement(CtResult,
      {data:{variantId:'01',title:'Вариант 1'},exam:{tasks,result,restart:()=>{}}}))));
    await click(host.querySelector('.ct-jump-review'));
    assert.equal(document.activeElement, panel('ct-review-a1'));
    assert.equal(document.activeElement.getAttribute('aria-expanded'), 'true');
    assert.equal(find('ct-map-b1'), null);
    assert.match(find('ct-review-a1').textContent, /Совпало.*Лишний.*Не отмечено/);
    assert.equal(find('ct-review-note').textContent,'Проверь второй пункт.');
    await click([...find('ct-review-a1').querySelectorAll('button')].find(b=>b.textContent==='К номерам'));
    assert.equal(document.activeElement, find('ct-map-a1'));
    await click(find('ct-outcome-blank'));
    await click(find('ct-map-b1'));
    assert.equal(document.activeElement,panel('ct-review-b1'));
    assert.match(find('ct-review-b1').textContent,/Сохранённое решение/);
    assert.doesNotMatch(find('ct-review-b1').textContent,/Устаревшая подсказка|Новая формулировка/);
  } finally { await act(() => root.unmount()); }
});

test('submission UI: timeout failure is visible without opening confirmation, and permits retry', async () => {
  await withSubmissionUI({}, async h => {
    const alert = h.host.querySelector('[data-testid="ct-submission-status"]');
    assert.ok(alert, 'automatic failure must be visible outside the manual confirmation');
    assert.equal(alert.getAttribute('role'), 'alert');
    assert.match(alert.textContent, /Время вышло/);
    assert.match(alert.textContent, /Ответы остаются в этой вкладке/);
    assert.equal(h.host.querySelector('[data-testid="ct-answer-input-b1"]').disabled, true);
    await h.click('ct-retry-submit');
    assert.equal(h.submissions, 1);
    await h.render({ error: false, sending: true });
    assert.equal(h.host.querySelector('[data-testid="ct-submission-status"]').getAttribute('role'), 'status');
    assert.equal(h.host.querySelector('[data-testid="ct-retry-submit"]'), null);
    await h.render({ sending: false, left: 60 });
    assert.equal(h.host.querySelector('[data-testid="ct-submission-status"]'), null);
    assert.equal(h.host.querySelector('[data-testid="ct-answer-input-b1"]').disabled, false);
  });
});

test('submission UI: an early error stays visible when closing manual confirmation, without two alerts', async () => {
  await withSubmissionUI({ left: 60 }, async h => {
    await h.click('ct-finish-exam-btn');
    assert.equal(h.host.querySelector('[data-testid="ct-submission-status"]'), null);
    assert.match(document.querySelector('[data-testid="ct-submit-error"]').textContent, /Ответы остаются в этой вкладке/);
    assert.equal(document.querySelectorAll('[role="alert"]').length, 1);
    await h.click('ct-confirm-cancel-btn');
    assert.ok(h.host.querySelector('[data-testid="ct-submission-status"]'));
    assert.equal(document.querySelectorAll('[role="alert"]').length, 1);
  });
});

test('submission UI: choice answers are disabled while sending and after the deadline', async () => {
  const task = { id: 'A1', code: 'А1', part: 'A', text: 'Проверочная задача', options: ['Первый', 'Второй'] };
  await withSubmissionUI({ tasks: [task], answers: { A1: 1 }, error: false, left: 60, sending: true }, async h => {
    const choice = () => h.host.querySelector('[data-testid="ct-option-a1-1"]');
    assert.equal(choice().disabled, true);
    await h.render({ sending: false, left: 0 });
    assert.equal(choice().disabled, true);
    await h.render({ left: 60 });
    assert.equal(choice().disabled, false);
  });
});

async function withLoadUI(run) {
  const host = document.getElementById('root');
  const root = createRoot(host);
  let retries = 0;
  const refetch = () => { retries++; };
  queryState = { data: undefined, isError: true, isFetching: false, refetch };
  examState = { stage: 'intro', start: () => {} };
  const render = async updates => {
    queryState = { ...queryState, ...updates };
    await act(() => root.render(React.createElement(MemoryRouter, {future:{v7_startTransition:true,v7_relativeSplatPath:true}}, React.createElement(CtA))));
  };
  try {
    await render({});
    await run({ host, render, get retries() { return retries; },
      async retry() { await act(() => host.querySelector('[data-testid="ct-load-retry"]').click()); } });
  } finally { await act(() => root.unmount()); }
}

test('load UI: a failed initial request offers retry, and pending retry cannot be clicked twice', async () => {
  await withLoadUI(async h => {
    const alert = h.host.querySelector('[data-testid="ct-load-error"]');
    assert.ok(alert, 'a terminal load failure must not remain an indefinite spinner');
    assert.equal(alert.getAttribute('role'), 'alert');
    assert.equal(h.host.querySelector('[data-testid="ct-loading"]'), null);
    await h.retry();
    assert.equal(h.retries, 1);
    await h.render({ isFetching: true });
    assert.equal(h.host.querySelector('[data-testid="ct-load-retry"]').disabled, true);
    await h.retry();
    assert.equal(h.retries, 1);
  });
});

test('load UI: pending first request uses loading, then recovered data opens the intro', async () => {
  await withLoadUI(async h => {
    await h.render({ isError: false, isFetching: true });
    assert.ok(h.host.querySelector('[data-testid="ct-loading"]'));
    assert.equal(h.host.querySelector('[data-testid="ct-load-error"]'), null);
    await h.render({ data: { tasks: [{ id: 'A1' }], sections: [] }, isFetching: false });
    assert.ok(h.host.querySelector('[data-testid="ct-start-btn"]'));
    assert.equal(h.host.querySelector('[data-testid="ct-loading"]'), null);
  });
});

test('load UI: a background fetch failure preserves an exam with loaded tasks and answers', async () => {
  await withLoadUI(async h => {
    const task = { id: 'B1', code: 'В1', part: 'B', unit: 'м', text: 'Проверочная задача' };
    examState = { stage: 'exam', tasks: [task], answers: { B1: '17' }, flags: [], current: 0, left: 60,
      sending: false, error: false, answeredCount: 1, setAnswer: () => {} };
    await h.render({ data: { tasks: [task], sections: [] }, isError: true, isFetching: false });
    assert.equal(h.host.querySelector('[data-testid="ct-load-error"]'), null);
    assert.equal(h.host.querySelector('[data-testid="ct-answer-input-b1"]').value, '17');
  });
});

test('confirmation from header and last task cancels without submission and returns focus to its own control', async () => {
  await withSubmissionUI({left:60,error:false},async h=>{
    for(const origin of ['ct-finish-exam-btn','ct-next-btn']) {
      await h.click(origin);
      const dialog=document.querySelector('[role="dialog"]');
      assert.ok(dialog);
      assert.equal(dialog.getAttribute('aria-modal'),'true');
      assert.ok(dialog.textContent.includes('Завершить тест?'));
      assert.equal(document.activeElement.getAttribute('data-testid'),'ct-confirm-cancel-btn');
      await h.click('ct-confirm-cancel-btn');
      assert.equal(document.querySelector('[role="dialog"]'),null);
      assert.equal(document.activeElement.getAttribute('data-testid'),origin);
      assert.equal(h.submissions,0);
    }
  });
});

test('calculator window computes with real keys while the underlying answer can receive focus',async()=>{
  await withSubmissionUI({left:60,error:false},async h=>{
    await h.click('ct-calculator-toggle');
    const dialog=document.querySelector('[role="dialog"]');
    assert.ok(dialog);
    assert.notEqual(dialog.getAttribute('aria-modal'),'true');
    for(const key of ['2','plus','3','eq']) await h.click('calc-key-'+key);
    assert.equal(dialog.querySelector('output').textContent,'5');
    const answer=h.host.querySelector('[data-testid="ct-answer-input-b1"]');
    await act(async()=>{answer.focus();await new Promise(resolve=>setTimeout(resolve,0));});
    assert.equal(document.activeElement,answer);
    assert.equal(document.querySelector('[role="dialog"]'),dialog);
    assert.equal(answer.value,'17');
    await h.click('ct-calculator-close');
    assert.equal(document.querySelector('[role="dialog"]'),null);
    assert.equal(h.submissions,0);
  });
});

test('choice can be deselected and reselected without changing its numeric answer contract',async()=>{
  const host=document.getElementById('root'),root=createRoot(host);
  let latest;
  function Harness(){
    const [value,setValue]=React.useState(1);latest=value;
    const task={id:'A1',code:'А1',part:'A',text:'Выбор',options:['Первый','Второй']};
    return React.createElement(TaskView,{task,section:'Механика',exam:{tasks:[task],answers:{A1:value},flags:[],current:0,left:60,setAnswer:(_,next)=>setValue(next)}});
  }
  try{
    await act(()=>root.render(React.createElement(Harness)));
    const choice=n=>host.querySelector('[data-testid="ct-option-a1-'+n+'"]');
    await act(()=>choice(1).click());assert.equal(latest,undefined);
    await act(()=>choice(2).click());assert.equal(latest,2);
    assert.equal(choice(2).getAttribute('aria-checked'),'true');
    assert.equal(choice(1).getAttribute('aria-checked'),'false');
  }finally{await act(()=>root.unmount());}
});

async function withResumeUI(run) {
  const host=document.getElementById('root'),root=createRoot(host);
  let resumes=0,starts=0,retries=0;
  const tasks=[{id:'A1',code:'А1',part:'A',options:['1','2'],text:'Первый вопрос'},
    {id:'B1',code:'В1',part:'B',unit:'м',text:'Числовой вопрос'}];
  queryState={data:{tasks,sections:[],minutes:210,total:30}};
  examState={stage:'resume',tasks,answers:{A1:2,B1:'-'},current:1,flags:['B1'],left:61,answeredCount:1,
    saveError:null,resume:()=>{resumes++;},start:()=>{starts++;},retrySave:()=>{retries++;}};
  const render=async updates=>{
    examState={...examState,...updates};
    await act(()=>root.render(React.createElement(MemoryRouter,null,React.createElement(CtA))));
  };
  const click=async id=>{
    const control=document.querySelector(`[data-testid="${id}"]`);
    assert.ok(control,`missing user control: ${id}`);
    await act(()=>control.click());
    await act(()=>new Promise(resolve=>setTimeout(resolve,0)));
  };
  try{await render({});await run({host,render,click,get resumes(){return resumes;},get starts(){return starts;},get retries(){return retries;}});}
  finally{await act(()=>root.unmount());}
}

test('resume screen identifies saved task and remaining time, then continues the same attempt',async()=>{
  await withResumeUI(async h=>{
    assert.ok(h.host.querySelector('[data-testid="ct-resume"]'));
    assert.match(h.host.querySelector('[data-testid="ct-resume-place"]').textContent,/В1/);
    assert.match(h.host.querySelector('[data-testid="ct-resume-timer"]').textContent,/0:01:01/);
    assert.equal(h.host.querySelector('[data-testid="ct-start-btn"]'),null);
    assert.equal(h.host.querySelector('[data-testid="ct-answer-input-b1"]'),null);
    await h.click('ct-resume-btn');assert.equal(h.resumes,1);assert.equal(h.starts,0);
  });
});

test('resume restart protects the attempt with a cancellable confirmation and restores focus',async()=>{
  await withResumeUI(async h=>{
    await h.click('ct-resume-restart');
    assert.ok(document.querySelector('[role="alertdialog"]'));assert.equal(h.starts,0);
    await h.click('ct-restart-cancel');
    assert.equal(document.querySelector('[role="alertdialog"]'),null);assert.equal(h.starts,0);
    assert.equal(document.activeElement.getAttribute('data-testid'),'ct-resume-restart');
    await h.click('ct-resume-restart');await h.click('ct-restart-confirm');
    assert.equal(h.starts,1);assert.equal(h.resumes,0);
  });
});

test('expired resume offers checking saved answers, without an editable question or a fresh timer',async()=>{
  await withResumeUI(async h=>{
    await h.render({left:0});
    const timer=h.host.querySelector('[data-testid="ct-resume-timer"]');assert.ok(timer,'expired resume must expose remaining time');
    assert.match(timer.textContent,/0:00:00/);
    assert.match(h.host.querySelector('[data-testid="ct-resume-btn"]').textContent,/Проверить/);
    assert.equal(h.host.querySelector('input'),null);assert.equal(h.starts,0);assert.equal(h.resumes,0);
    await h.click('ct-resume-btn');assert.equal(h.resumes,1);
  });
});

test('save refusal is visible and retry is tied to saving rather than restarting',async()=>{
  await withResumeUI(async h=>{
    await h.render({saveError:'Сохранить попытку не удалось.'});
    const alert=h.host.querySelector('[data-testid="ct-save-error"]');assert.ok(alert,'save failure must be visible');
    assert.equal(alert.getAttribute('role'),'alert');
    await h.click('ct-retry-save');assert.equal(h.retries,1);assert.equal(h.starts,0);
    await h.render({saveError:null});assert.equal(h.host.querySelector('[data-testid="ct-save-error"]'),null);
  });
});

test('a previous diagnostic result opens without starting the exam and offers lesson and practice links', async () => {
  const host = document.getElementById('root');
  const root = createRoot(host);
  queryState = { data: { variantId: '03', independent: true, title: 'Диагностический вариант',
    sections: [{ id: 'mechanics' }], _assessment: { revision: 'current', legacy: {} },
    tasks: [{ id: 'A1', code: 'А1', part: 'A', kind: 'multi', section: 'mechanics', options: ['a', 'b'], text: 'Задание' }],
  } };
  reports = { '03': { draftKey: 'kvant_draft_v1:ct:03:rcurrent', correct: 0, total: 1, elapsed_sec: 30,
    by_section: [{ id: 'mechanics', title: 'Механика', correct: 0, total: 1 }],
    review: [{ id: 'A1', code: 'А1', answer: [1, 2], correct: false, section: 'mechanics',
      lessonSlug: 'izmereniya-i-vektory', lessonTitle: 'Измерения и векторы', solution: [{text:'Решение'}] }],
  } };
  const before = openedAttempts;
  try {
    await act(() => root.render(React.createElement(MemoryRouter, {
      initialEntries: ['/ct/variant/03?report=previous'],
    }, React.createElement(CtA))));
    assert.equal(host.querySelector('h1').textContent, 'Предыдущий результат');
    assert.equal(openedAttempts, before);
    assert.equal(host.querySelector('[data-testid="ct-restart-btn"]'), null);
    assert.match(host.querySelector('a[href="/ct/variant/03"]').textContent, /К текущей попытке/);
    const detail = [...host.querySelectorAll('button')].find(button => /^Разобрать /.test(button.textContent));
    await act(() => detail.click());
    assert.ok(host.querySelector('a[href="/lesson/izmereniya-i-vektory"]'));
    assert.match(host.querySelector('a[href="/trainer/izmereniya-i-vektory"]').textContent, /К задачам по теме/);
  } finally {
    await act(() => root.unmount());
    reports = {}; queryState = {};
  }
});
