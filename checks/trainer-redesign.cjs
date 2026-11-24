const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');
const { withPage, enter, act, tick, sourceModule, frontend, dom, trainer, setReducedMotion, portraitFrames } = require('./learning-load.cjs');
const { createLearningDraftStore } = sourceModule(path.join(frontend, 'src/lib/learningDraft.js'));
const field = (h, id) => h.host.querySelector('[data-testid="' + id + '"]');
const assertGraphicReaction = (h, pose) => {
  const figure = field(h, 'trainer-reaction');
  assert.ok(figure, 'A fresh checked answer gets its reaction');
  assert.equal(figure.getAttribute('data-pose'), pose);
  assert.equal(figure.querySelector('img').getAttribute('src'), '/art/cast-reactions/20261106-graphic/' + pose + '.png');
};
const click = (h, id) => act(async () => {
  const element = field(h, id);
  assert.ok(element, 'Missing control: ' + id);
  element.dispatchEvent(new dom.window.MouseEvent('mousedown', { bubbles: true, button: 0 }));
  element.focus();
  element.dispatchEvent(new dom.window.MouseEvent('mouseup', { bubbles: true, button: 0 }));
  element.click();
  await tick();
});

test('difficulty switches persist the displayed task and keep per-task answers through reload', async () => {
  const data = { ...trainer, tasks: [trainer.tasks[0],
    { id: 't2', code: 'А2', part: 'A', kind: 'multi', options: ['A', 'B', 'C'], text: 'Выбери', level: 2 },
    { ...trainer.tasks[0], id: 't3', code: 'В3', level: 3 },
  ] };
  await withPage('trainer', true, async h => {
    await h.render();
    await enter(field(h, 'trainer-t1-input'), '12');
    await click(h, 'trainer-level-2');
    assert.equal(field(h, 'trainer-task-code').textContent, 'А2');
    await click(h, 'trainer-t2-opt-1');
    await click(h, 'trainer-t2-opt-3');
    const stored = createLearningDraftStore('trainer', 'review-topic', data, dom.window.localStorage).saved;
    assert.equal(stored.level, 2);
    assert.equal(stored.taskId, 't2');
    await h.remount();
    await click(h, 'draft-resume-btn');
    assert.equal(field(h, 'trainer-task-code').textContent, 'А2');
    assert.equal(field(h, 'trainer-t2-opt-1').getAttribute('aria-pressed'), 'true');
    assert.equal(field(h, 'trainer-t2-opt-3').getAttribute('aria-pressed'), 'true');
    await click(h, 'trainer-level-0');
    assert.equal(field(h, 'trainer-task-code').textContent, 'А2');
    await click(h, 'trainer-task-tab-t1');
    assert.equal(field(h, 'trainer-t1-input').value, '12');
    assert.equal(h.state.posts.length, 0);
    assert.equal(h.actions.solved.length, 0);
  }, { data });
});

test('a wrong answer opens the explanation and retry keeps the viewed-solution reward restriction', async () => {
  await withPage('trainer', true, async h => {
    await h.render();
    await enter(field(h, 'trainer-t1-input'), '11');
    h.state.response = { correct: false, answer: 7, solution: [{ text: 'Сравни числа.' }] };
    await click(h, 'trainer-t1-check-btn');
    assertGraphicReaction(h, 'girl-focus');
    assert.ok(field(h, 'trainer-verdict').textContent.includes('Есть ошибка'));
    assert.ok(field(h, 'trainer-solution'));
    assert.equal(h.actions.failed.length, 1);
    await h.remount();
    await click(h, 'draft-resume-btn');
    assert.equal(field(h, 'trainer-reaction'), null);
    await click(h, 'trainer-retry-btn');
    assert.equal(field(h, 'trainer-t1-input').value, '');
    assert.equal(field(h, 'trainer-t1-input').disabled, false);
    await enter(field(h, 'trainer-t1-input'), '7');
    h.state.response = { correct: true, answer: 7, solution: [] };
    await click(h, 'trainer-t1-check-btn');
    assertGraphicReaction(h, 'cat-blink');
    assert.equal(h.state.posts.length, 2);
    assert.equal(h.actions.solved.length, 1);
    assert.equal(h.actions.solved[0][1].hinted, true);
  });
});

test('a failed check leaves the typed answer and can be retried without a second reward', async () => {
  await withPage('trainer', true, async h => {
    await h.render();
    await enter(field(h, 'trainer-t1-input'), '7');
    h.state.postStatus = 503;
    await click(h, 'trainer-t1-check-btn');
    assert.ok(field(h, 'trainer-t1-error'));
    assert.equal(field(h, 'trainer-t1-input').value, '7');
    assert.equal(field(h, 'trainer-t1-input').disabled, false);
    assert.equal(h.actions.solved.length, 0);
    h.state.postStatus = 200;
    await click(h, 'trainer-t1-check-btn');
    assert.equal(h.state.posts.length, 2);
    assert.equal(h.actions.solved.length, 1);
    assert.ok(field(h, 'trainer-verdict').textContent.includes('Верно'));
  });
});

test('the return portrait stops when hidden and becomes static on a live reduced-motion change', async () => {
  setReducedMotion(false);
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  try {
    await withPage('trainer', true, async h => {
      await h.render();
      await enter(field(h, 'trainer-t1-input'), '12');
      await h.remount();
      const figure = () => h.host.querySelector('.companion-portrait');
      const img = figure().querySelector('img');
      Object.defineProperty(img, 'complete', { configurable: true, value: true });
      Object.defineProperty(img, 'naturalWidth', { configurable: true, value: 1448 });
      await act(async () => { img.dispatchEvent(new dom.window.Event('load')); await tick(); });
      const lids = figure().querySelector('img[aria-hidden="true"]');
      Object.defineProperty(lids, 'complete', { configurable:true, value:true });
      await act(async () => { lids.dispatchEvent(new dom.window.Event('load')); await tick(); });
      assert.equal(figure().getAttribute('data-playing'), 'true');
      assert.equal(field(h, 'companion-motion-toggle'), null);
      await act(async () => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.dispatchEvent(new dom.window.Event('visibilitychange'));
        await tick();
      });
      assert.equal(figure().getAttribute('data-playing'), null);
      const stopped = portraitFrames.length;
      await new Promise(resolve => setTimeout(resolve, 70));
      assert.equal(portraitFrames.length, stopped);
      await act(async () => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: false });
        document.dispatchEvent(new dom.window.Event('visibilitychange'));
        await tick();
      });
      const portrait = figure(), position = field(h, 'draft-resume-position').textContent;
      assert.equal(portrait.getAttribute('data-playing'), 'true');
      await act(async () => { setReducedMotion(true); await tick(); });
      assert.equal(figure(), portrait);
      assert.equal(field(h, 'draft-resume-position').textContent, position);
      assert.equal(figure().getAttribute('data-playing'), null);
      assert.equal(figure().getAttribute('data-motion'), null);
      assert.equal(figure().getAttribute('data-rig-status'), 'static');
      assert.equal(figure().querySelector('canvas'), null);
      assert.equal(field(h, 'companion-motion-toggle'), null);
      assert.equal(h.state.posts.length, 0);
    });
  } finally { delete document.hidden; setReducedMotion(true); }
});

test('a fresh correct result uses the graphic reaction once and restore does not replay it', async () => {
    await withPage('trainer', true, async h => {
      await h.render();
      assert.equal(field(h, 'trainer-reaction'), null);
      assert.equal(h.host.querySelector('.study-companion'), null);
      await enter(field(h, 'trainer-t1-input'), '7');
      await click(h, 'trainer-t1-check-btn');
      assertGraphicReaction(h, 'girl-win');
      assert.equal(field(h, 'trainer-verdict').getAttribute('data-illustrated'), 'true');
      assert.ok(field(h, 'trainer-next-btn'));
      await h.remount();
      await click(h, 'draft-resume-btn');
      assert.ok(field(h, 'trainer-verdict'));
      assert.equal(field(h, 'trainer-reaction'), null);
      assert.equal(h.state.posts.length, 1);
      assert.equal(h.actions.solved.length, 1);
    });
});

test('repeated mistakes use the curious cat and keep retry and explanation available', async () => {
  await withPage('trainer', true, async h => {
    await h.render();
    h.state.response = { correct:false, answer:7, solution:[] };
    await enter(field(h,'trainer-t1-input'),'11');
    await click(h,'trainer-t1-check-btn');
    assertGraphicReaction(h, 'girl-focus');
    assert.equal(field(h,'trainer-retry-btn').getAttribute('aria-label'),'Ещё раз');
    await click(h,'trainer-retry-btn');
    await enter(field(h,'trainer-t1-input'),'10');
    await click(h,'trainer-t1-check-btn');
    assertGraphicReaction(h, 'cat-curious');
    assert.equal(h.state.posts.length,2);
    assert.equal(h.actions.failed.length,2);
    assert.equal(h.actions.solved.length,0);
  });
});
