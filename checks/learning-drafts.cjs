const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');
const { withPage, enter, act, tick, sourceModule, frontend, dom, lesson, trainer } = require('./learning-load.cjs');
const { createLearningDraftStore, initialLearningDraft, learningDraftKey } = sourceModule(path.join(frontend, 'src/lib/learningDraft.js'));
const click = (h, id) => act(async () => {
  const element = h.host.querySelector(`[data-testid="${id}"]`) || document.querySelector(`[data-testid="${id}"]`);
  assert.ok(element, `Missing control: ${id}`);
  element.dispatchEvent(new dom.window.MouseEvent('mousedown', { bubbles: true, button: 0 }));
  element.focus();
  element.dispatchEvent(new dom.window.MouseEvent('mouseup', { bubbles: true, button: 0 }));
  element.click(); await tick();
});
const field = (h, id) => h.host.querySelector(`[data-testid="${id}"]`);
const memory = () => {
  const values = new Map();
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
};

if (!process.argv[2]) {
  test('draft storage separates routes/content and leaves game progress untouched', () => {
    const storage = memory();
    storage.setItem('kvant_game_v1', 'existing-progress');
    const store = createLearningDraftStore('lesson', 'review-topic', lesson, storage);
    const value = initialLearningDraft('lesson', lesson);
    value.answers.q1 = { input: '−2,5', choice: null };
    assert.equal(store.write(value), null);
    assert.equal(createLearningDraftStore('lesson', 'review-topic', lesson, storage).saved.answers.q1.input, '−2,5');
    assert.equal(createLearningDraftStore('trainer', 'review-topic', trainer, storage).saved, null);
    assert.equal(createLearningDraftStore('lesson', 'other-topic', lesson, storage).saved, null);
    assert.equal(createLearningDraftStore('lesson', 'review-topic', { ...lesson, title: 'Changed content' }, storage).saved, null);
    assert.equal(storage.getItem('kvant_game_v1'), 'existing-progress');
  });

  test('corrupt and failed writes keep original bytes instead of silently resetting', () => {
    const storage = memory();
    const key = learningDraftKey('lesson', 'review-topic', lesson);
    storage.setItem(key, '{broken');
    const corrupt = createLearningDraftStore('lesson', 'review-topic', lesson, storage);
    assert.equal(corrupt.saved, null);
    assert.ok(corrupt.error);
    assert.ok(corrupt.write(initialLearningDraft('lesson', lesson)));
    assert.ok(corrupt.write(null));
    assert.equal(storage.getItem(key), '{broken');
    storage.removeItem(key);
    const valid = createLearningDraftStore('lesson', 'review-topic', lesson, storage);
    assert.equal(valid.write(initialLearningDraft('lesson', lesson)), null);
    const old = storage.getItem(key);
    storage.setItem = () => { throw new Error('Quota'); };
    assert.ok(valid.write({ ...initialLearningDraft('lesson', lesson), guess: '12' }));
    assert.equal(storage.getItem(key), old);
    const denied = createLearningDraftStore('lesson', 'review-topic', lesson, { getItem: () => { throw new Error('Denied'); } });
    assert.ok(denied.error);
    assert.ok(denied.write(initialLearningDraft('lesson', lesson)));
  });

  test('stale tab cannot overwrite or delete another attempt', () => {
    const storage = memory();
    const first = createLearningDraftStore('lesson', 'review-topic', lesson, storage);
    const stale = createLearningDraftStore('lesson', 'review-topic', lesson, storage);
    assert.equal(first.write({ ...initialLearningDraft('lesson', lesson), guess: '12' }), null);
    const raw = storage.getItem(first.key);
    assert.ok(stale.write({ ...initialLearningDraft('lesson', lesson), guess: '99' }));
    assert.ok(stale.write(null));
    assert.equal(storage.getItem(first.key), raw);
    assert.equal(first.write({ ...initialLearningDraft('lesson', lesson), guess: '13' }), null);
  });

  test('invalid saved answer ids, result shapes and unfinished finish card are refused', () => {
    for (const patch of [
      { answers: { missing: { input: '7', choice: null } } },
      { cardId: 'finish' },
      { quiz: { idx: 0, results: { q1: { correct: true } } } },
      { quiz: { idx: 40, results: {} } },
    ]) {
      const storage = memory();
      const key = learningDraftKey('lesson', 'review-topic', lesson);
      const raw = JSON.stringify({ version: 1, value: { ...initialLearningDraft('lesson', lesson), ...patch } });
      storage.setItem(key, raw);
      const store = createLearningDraftStore('lesson', 'review-topic', lesson, storage);
      assert.equal(store.saved, null);
      assert.ok(store.error);
      assert.equal(storage.getItem(key), raw);
    }
  });
}

test('lesson resumes the actual card and guess after remount', async () => {
  const data = { ...lesson, blocks: [
    { id: 'hook', kind: 'hook', title: 'Прогноз', paragraphs: [], question: 'Сколько?', unit: 'м' },
    { id: 'idea', kind: 'text', title: 'Ускорение', paragraphs: [] },
    { id: 'check', kind: 'check' },
  ] };
  await withPage('lesson', true, async h => {
    await h.render();
    await click(h, 'lesson-next-btn');
    await enter(field(h, 'lesson-guess-input'), '27');
    await click(h, 'lesson-next-btn');
    assert.equal(field(h, 'lesson-card-counter').textContent, '3/5');
    await h.remount();
    assert.ok(field(h, 'draft-resume'));
    await click(h, 'draft-resume-btn');
    assert.equal(field(h, 'lesson-card-counter').textContent, '3/5');
    await click(h, 'lesson-prev-btn');
    assert.equal(field(h, 'lesson-guess-input').value, '27');
    assert.equal(h.state.posts.length, 0);
  }, { data });
});

test('lesson restores checked and unsubmitted answers; restart only clears its draft', async () => {
  const data = { ...lesson, quiz: [...lesson.quiz, { ...lesson.quiz[0], id: 'q2' }] };
  await withPage('lesson', true, async h => {
    dom.window.localStorage.setItem('kvant_game_v1', 'earned-progress');
    await h.render();
    await click(h, 'lesson-next-btn');
    await enter(field(h, 'lesson-q1-input'), '7');
    // The real lesson API has explanation but no solution array.
    h.state.response = { correct: true, answer: 7, explanation: 'Проверено сервером' };
    await click(h, 'lesson-q1-check-btn');
    await click(h, 'lesson-quiz-next-btn');
    await enter(field(h, 'lesson-q2-input'), '−2,5');
    await h.remount();
    await click(h, 'draft-resume-btn');
    assert.equal(field(h, 'lesson-q2-input').value, '−2,5');
    assert.equal(h.state.posts.length, 1, 'restoring must not submit anything');
    const saved = createLearningDraftStore('lesson', 'review-topic', data, dom.window.localStorage).saved;
    assert.equal(saved.quiz.results.q1.correct, true);
    assert.equal(field(h, 'draft-save-error'), null);
    await h.remount();
    const draftKey = learningDraftKey('lesson', 'review-topic', data);
    const beforeRestart = dom.window.localStorage.getItem(draftKey);
    await click(h, 'draft-restart-btn');
    assert.ok(document.querySelector('[data-testid="draft-restart-dialog"]'));
    assert.equal(dom.window.localStorage.getItem(draftKey), beforeRestart, 'opening the warning must preserve the attempt');
    assert.equal(document.activeElement.dataset.testid, 'draft-restart-cancel', 'safe action receives initial focus');
    await click(h, 'draft-restart-cancel');
    assert.equal(document.querySelector('[data-testid="draft-restart-dialog"]'), null);
    assert.equal(dom.window.localStorage.getItem(draftKey), beforeRestart, 'cancel must preserve all answers');
    await click(h, 'draft-restart-btn');
    await click(h, 'draft-restart-confirm');
    assert.equal(dom.window.localStorage.getItem(draftKey), null);
    await click(h, 'lesson-next-btn');
    assert.equal(field(h, 'lesson-q1-input').value, '');
    assert.equal(dom.window.localStorage.getItem('kvant_game_v1'), 'earned-progress');
  }, { data });
});

test('trainer resumes an answer and hint use without repeating a check or reward', async () => {
  await withPage('trainer', true, async h => {
    await h.render();
    await click(h, 'trainer-hint-toggle-btn');
    await enter(field(h, 'trainer-t1-input'), '+7,0');
    await click(h, 'trainer-t1-sign');
    assert.equal(field(h, 'trainer-t1-input').value, '-7,0');
    await h.remount();
    await click(h, 'draft-resume-btn');
    assert.equal(field(h, 'trainer-t1-input').value, '-7,0');
    assert.equal(field(h, 'trainer-t1-sign').getAttribute('aria-pressed'), 'true');
    await click(h, 'trainer-t1-sign');
    assert.equal(field(h, 'trainer-t1-input').value, '7,0');
    assert.equal(h.actions.solved.length, 0);
    await click(h, 'trainer-t1-check-btn');
    assert.equal(h.actions.solved.length, 1);
    assert.equal(h.actions.solved[0][1].hinted, true);
    await h.remount();
    await click(h, 'draft-resume-btn');
    assert.ok(field(h, 'trainer-verdict').textContent.includes('Верно'));
    assert.equal(field(h, 'trainer-t1-input').disabled, true);
    assert.equal(h.state.posts.length, 1);
    assert.equal(h.actions.solved.length, 1);
    assert.equal(field(h, 'draft-save-error'), null);
  });
});

test('trainer keeps per-task selections and honors an explicit task link', async () => {
  const first = 'review-topic:t1';
  const second = 'review-topic:t2';
  const data = { ...trainer, tasks: [{ ...trainer.tasks[0], id: first },
    { id: second, code: 'А2', part: 'A', kind: 'multi', options: ['A', 'B', 'C'], text: 'Выбери', level: 1 }] };
  const options = { data };
  await withPage('trainer', true, async h => {
    await h.render();
    await enter(field(h, `trainer-${first}-input`), '12');
    await click(h, `trainer-task-tab-${second}`);
    await click(h, `trainer-${second}-opt-1`);
    await click(h, `trainer-${second}-opt-3`);
    await h.remount();
    await click(h, 'draft-resume-btn');
    assert.equal(field(h, `trainer-${second}-opt-1`).getAttribute('data-state'), 'selected');
    assert.equal(field(h, `trainer-${second}-opt-3`).getAttribute('data-state'), 'selected');
    options.entry = `/trainer/review-topic?task=${encodeURIComponent(first)}`;
    await h.remount();
    assert.ok(!field(h, 'draft-resume'), 'an explicit task link opens the task immediately');
    assert.equal(field(h, `trainer-${first}-input`).value, '12');
    assert.equal(h.state.posts.length, 0);
  }, options);
});

test('a correct trainer answer can be saved after a failed progress write and reload', async () => {
  const id = 'review-topic:t1';
  const data = { ...trainer, tasks: [{ ...trainer.tasks[0], id }] };
  const storage = dom.window.localStorage;
  await withPage('trainer', true, async h => {
    await h.render();
    await click(h, 'trainer-hint-toggle-btn');
    await enter(field(h, `trainer-${id}-input`), '7');
    const prototype = dom.window.Storage.prototype;
    const setItem = prototype.setItem;
    prototype.setItem = function (key, value) {
      if (key === 'kvant_game_v1') throw new Error('progress quota');
      return setItem.call(this, key, value);
    };
    try {
      await click(h, `trainer-${id}-check-btn`);
      await h.waitFor(() => field(h, 'trainer-verdict')?.textContent.includes('Верно'));
      assert.equal(h.state.posts.length, 1);
      assert.deepEqual(JSON.parse(storage.getItem('kvant_game_v1')).solved, []);
      assert.ok(!field(h, 'trainer-next-btn'));
      assert.ok(field(h, 'trainer-save-solution'));
      await h.remount(); await click(h, 'draft-resume-btn');
      assert.ok(field(h, 'trainer-save-solution'));
    } finally { prototype.setItem = setItem; }
    await click(h, 'trainer-save-solution');
    assert.equal(field(h, 'trainer-save-solution'), null);
    assert.match(field(h, 'trainer-solved-count').textContent, /Решено 1 из 1/);
    const saved = JSON.parse(storage.getItem('kvant_game_v1'));
    assert.equal(saved.joules, 225);
    assert.equal(saved.xp, 20);
    assert.equal(saved.quests.progress.nohint, undefined);
    assert.equal(h.state.posts.length, 1);
  }, { data, realGame: true });
});

for (const fromReview of [false, true]) {
  test(`a checked correction survives reload with an existing reward (${fromReview ? 'review' : 'trainer'})`, async () => {
    const id = 'review-topic:t1';
    const data = { ...trainer, tasks: [{ ...trainer.tasks[0], id }] };
    const storage = dom.window.localStorage;
    const gameSave = { solved: [id], mistakes: [id], joules: 225, xp: 20 };
    const options = { data, realGame: true, gameSave };
    if (fromReview) options.entry = `/trainer/review-topic?task=${encodeURIComponent(id)}&from=review`;
    await withPage('trainer', true, async h => {
      await h.render();
      await enter(field(h, `trainer-${id}-input`), '7');
      const prototype = dom.window.Storage.prototype;
      const setItem = prototype.setItem;
      prototype.setItem = function (key, value) {
        if (key === 'kvant_game_v1') throw new Error('progress quota');
        return setItem.call(this, key, value);
      };
      try {
        await click(h, `trainer-${id}-check-btn`);
        await h.waitFor(() => field(h, 'trainer-save-solution'));
        await h.remount();
        if (!fromReview) await click(h, 'draft-resume-btn');
        assert.ok(field(h, 'trainer-save-solution'));
        assert.equal(field(h, `trainer-${id}-input`).value, '7');
      } finally { prototype.setItem = setItem; }
      await click(h, 'trainer-save-solution');
      const saved = JSON.parse(storage.getItem('kvant_game_v1'));
      assert.deepEqual(saved.mistakes, []);
      assert.equal(saved.joules, 225);
      assert.equal(saved.xp, 20);
      assert.equal(h.state.posts.length, 1);
    }, options);
  });
}

test('later review success is visible in the trainer while preserving its earlier attempt', async () => {
  const id = 'review-topic:t1';
  const other = 'review-topic:t2';
  const data = { ...trainer, tasks: [{ ...trainer.tasks[0], id },
    { ...trainer.tasks[0], id: other, code: 'В2' }] };
  const options = { data, realGame: true };
  await withPage('trainer', true, async h => {
    await h.render();
    await click(h, `trainer-task-tab-${other}`);
    await enter(field(h, `trainer-${other}-input`), '91');
    await click(h, `trainer-task-tab-${id}`);
    await enter(field(h, `trainer-${id}-input`), '17');
    h.state.response = { correct: false, answer: 24, solution: [] };
    await click(h, `trainer-${id}-check-btn`);
    await h.waitFor(() => field(h, 'trainer-verdict')?.textContent.includes('Есть ошибка'));
    const key = learningDraftKey('trainer', 'review-topic', data);
    const previous = dom.window.localStorage.getItem(key);

    options.entry = `/trainer/review-topic?task=${encodeURIComponent(id)}&from=review`;
    await h.remount();
    await enter(field(h, `trainer-${id}-input`), '24');
    h.state.response = { correct: true, answer: 24, solution: [] };
    await click(h, `trainer-${id}-check-btn`);
    await h.waitFor(() => field(h, 'trainer-verdict')?.textContent.includes('Верно'));
    assert.equal(dom.window.localStorage.getItem(key), previous);

    options.entry = '/trainer/review-topic';
    await h.remount();
    await click(h, 'draft-resume-btn');
    assert.match(field(h, `trainer-task-tab-${id}`).getAttribute('aria-label'), /решено/);
    assert.match(field(h, 'trainer-verdict').textContent, /Задача уже решена/);
    assert.equal(field(h, `trainer-${id}-input`).value, '17');
    assert.equal(dom.window.localStorage.getItem(key), previous);
    const save = JSON.parse(dom.window.localStorage.getItem('kvant_game_v1'));
    assert.equal(save.joules, 225);
    assert.deepEqual(save.mistakes, []);
    await click(h, 'trainer-next-btn');
    assert.equal(field(h, `trainer-${other}-input`).value, '91');
    assert.equal(h.state.posts.length, 2);
  }, options);
});

test('a visible stale-tab warning keeps both the typed answer and newer stored draft', async () => {
  await withPage('trainer', true, async h => {
    await h.render();
    await enter(field(h, 'trainer-t1-input'), '12');
    const other = createLearningDraftStore('trainer', 'review-topic', trainer, dom.window.localStorage);
    const next = { ...other.saved, answers: { t1: { input: '99', choice: null } } };
    assert.equal(other.write(next), null);
    const raw = dom.window.localStorage.getItem(other.key);
    await enter(field(h, 'trainer-t1-input'), '13');
    assert.ok(field(h, 'draft-save-error').textContent.includes('другой вкладке'));
    assert.equal(field(h, 'trainer-t1-input').value, '13');
    assert.equal(dom.window.localStorage.getItem(other.key), raw);
  });
});
