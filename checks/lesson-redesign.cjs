const assert = require('node:assert/strict');
const { test } = require('node:test');
const { withPage, enter, act, tick, dom, lesson } = require('./learning-load.cjs');
const get = (h,id) => h.host.querySelector('[data-testid="'+id+'"]');
const click = (h,id) => act(async () => { get(h,id).click(); await tick(); });
const data = {...lesson,blocks:[
  {id:'hook',kind:'hook',title:'Начало',paragraphs:[],question:'Сколько?',unit:'м'},
  {id:'idea',kind:'text',title:'Ускорение',paragraphs:[]},
  {id:'check',kind:'check'},
]};

test('contents changes the actual saved card and cannot bypass the unfinished quiz',async () => {
  await withPage('lesson',true,async h => {
    await h.render();
    await click(h,'lesson-next-btn');
    await enter(get(h,'lesson-guess-input'),'27');
    assert.equal(get(h,'lesson-section-finish').disabled,true);
    await click(h,'lesson-section-finish');
    assert.ok(get(h,'lesson-card-hook'));
    await click(h,'lesson-section-check');
    assert.ok(get(h,'lesson-card-check'));
    assert.equal(h.host.ownerDocument.activeElement,get(h,'lesson-card-check'));
    assert.equal(get(h,'lesson-next-btn'),null,'quiz has its own single primary action');
    await h.remount();
    await click(h,'draft-resume-btn');
    assert.ok(get(h,'lesson-card-check'));
    assert.equal(h.host.ownerDocument.activeElement,get(h,'lesson-card-check'));
    await click(h,'lesson-section-hook');
    assert.equal(get(h,'lesson-guess-input').value,'27');
    assert.equal(h.state.posts.length,0);
  },{data});
});

test('arrow keys in lesson controls and editable answers do not change cards',async () => {
  await withPage('lesson',true,async h => {
    await h.render();
    await click(h,'lesson-next-btn');
    const key = target => target.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
    await act(async () => {key(get(h,'lesson-guess-input'));key(get(h,'lesson-next-btn'));await tick();});
    assert.ok(get(h,'lesson-card-hook'));
    await act(async () => {key(get(h,'lesson-card-hook'));await tick();});
    assert.ok(get(h,'lesson-card-idea'));
    assert.equal(h.state.posts.length,0);
  },{data});
});

test('answered questions reopen their saved explanation without another check or reward',async () => {
  const quizData = {...lesson,quiz:[lesson.quiz[0],{...lesson.quiz[0],id:'q2'}]};
  await withPage('lesson',true,async h => {
    await h.render();
    await click(h,'lesson-next-btn');
    assert.equal(get(h,'lesson-quiz-review-q2').disabled,true);
    await enter(get(h,'lesson-q1-input'),'7');
    h.state.response = {correct:true,answer:7,explanation:'Первый разбор'};
    await click(h,'lesson-q1-check-btn');
    await click(h,'lesson-quiz-next-btn');
    await enter(get(h,'lesson-q2-input'),'11');
    h.state.response = {correct:false,answer:7,explanation:'Второй разбор ошибки'};
    await click(h,'lesson-q2-check-btn');
    await click(h,'lesson-quiz-review-q1');
    assert.ok(get(h,'lesson-quiz-verdict').textContent.includes('Первый разбор'));
    await click(h,'lesson-quiz-review-q2');
    assert.ok(get(h,'lesson-quiz-verdict').textContent.includes('Второй разбор ошибки'));
    await h.remount();
    await click(h,'draft-resume-btn');
    assert.ok(get(h,'lesson-quiz-verdict').textContent.includes('Второй разбор ошибки'));
    assert.equal(h.state.posts.length,2);
    assert.equal(get(h,'lesson-joules-reward'),null);
  },{data:quizData});
});
