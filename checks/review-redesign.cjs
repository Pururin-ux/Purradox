const assert = require('node:assert/strict');
const { test } = require('node:test');
const { withPage, act, tick, trainer } = require('./learning-load.cjs');
const get = (h,id) => h.host.querySelector('[data-testid="'+id+'"]');
const data = { ...trainer, tasks:[
  { ...trainer.tasks[0], id:'t / 1', text:'Первая задача', lessonSlug:'svobodnoe-padenie', lessonTitle:'Свободное падение', chapter:'Механика' },
  { ...trainer.tasks[0], id:'t2', code:'В2', text:'Вторая задача', lessonSlug:'svobodnoe-padenie', lessonTitle:'Свободное падение', chapter:'Механика' },
  { ...trainer.tasks[0], id:'other-topic:t3', code:'А3', text:'Задача из другого раздела', lessonSlug:'zaryad-i-zakon-kulona', lessonTitle:'Заряд и закон Кулона', chapter:'Электродинамика' },
] };

test('review lists only unresolved tasks, encodes the task link and keeps cached rows after a background error', async () => {
  const mistakes = ['t / 1','other-topic:t3','not-in-current-topic'];
  await withPage('review',false,async h=>{
    await h.render();
    await h.waitFor(()=>get(h,'review-task-t / 1'));
    const row=get(h,'review-task-t / 1');
    assert.ok(row);
    assert.equal(row.getAttribute('href'),'/trainer/svobodnoe-padenie?task=t%20%2F%201&from=review');
    assert.ok(row.textContent.includes('Свободное падение'));
    const other=get(h,'review-task-other-topic:t3');
    assert.equal(other.getAttribute('href'),'/trainer/zaryad-i-zakon-kulona?task=other-topic%3At3&from=review');
    assert.ok(other.textContent.includes('Заряд и закон Кулона'));
    assert.equal(get(h,'review-task-t2'),null);
    await h.waitFor(()=>get(h,'review-unavailable'));
    assert.equal(get(h,'review-empty'),null);
    h.state.reviewStatus=503;
    await act(async()=>{await h.client.refetchQueries({queryKey:h.key});await tick();});
    await h.waitFor(()=>get(h,'review-load-error'));
    assert.equal(get(h,'review-task-t / 1'),row);
    assert.ok(get(h,'review-load-error').textContent.includes('Список не обновился'));
    assert.deepEqual(mistakes,['t / 1','other-topic:t3','not-in-current-topic']);
    assert.equal(h.state.gets,0);
    assert.deepEqual(h.state.reviewPosts[0].ids,[...mistakes].sort());
    assert.equal(h.state.posts.length,0);
    assert.equal(h.actions.failed.length+h.actions.solved.length,0);
  },{data,game:{mistakes},reviewItems:[data.tasks[0],data.tasks[2]]});
});

test('review empty state gives real trainer and lesson routes without altering progress', async()=>{
  await withPage('review',false,async h=>{
    await h.render();
    assert.ok(get(h,'review-empty'));
    assert.equal(get(h,'review-count'),null);
    assert.equal(get(h,'review-tasks'),null);
    assert.equal(get(h,'review-to-trainer-btn').getAttribute('href'),'/practice');
    assert.equal(get(h,'review-to-lesson-btn').getAttribute('href'),'/learn');
    assert.ok(get(h,'review-empty').querySelector('img').getAttribute('src').endsWith('/review-empty-tray-v1.webp'));
    assert.equal(h.state.gets,0);
    assert.equal(h.state.reviewPosts.length,0);
    assert.equal(h.state.posts.length,0);
    assert.equal(h.actions.failed.length+h.actions.solved.length,0);
  },{data,game:{mistakes:[]}});
});

test('review loading and initial error never masquerade as empty; retry recovers without reset',async()=>{
  const mistakes=['t / 1'];
  await withPage('review',false,async h=>{
    let release;
    h.state.holdReview=new Promise(resolve=>{release=resolve;});
    h.state.reviewStatus=503;
    await h.render();
    assert.ok(get(h,'review-loading'));
    assert.equal(get(h,'review-empty'),null);
    await act(async()=>{release();await tick();});
    await h.waitFor(()=>get(h,'review-load-error'));
    assert.equal(get(h,'review-empty'),null);
    h.state.reviewStatus=200;
    h.state.holdReview=new Promise(resolve=>{release=resolve;});
    await act(async()=>{get(h,'review-reload-btn').click();await tick();});
    assert.ok(!get(h,'review-reload-btn')||get(h,'review-reload-btn').disabled);
    await act(async()=>{release();await tick();});
    await h.waitFor(()=>get(h,'review-task-t / 1'));
    assert.equal(get(h,'review-load-error'),null);
    assert.equal(h.state.gets,0);
    assert.equal(h.state.reviewPosts.length,2);
    assert.equal(h.state.posts.length,0);
    assert.deepEqual(mistakes,['t / 1']);
  },{data,game:{mistakes},reviewItems:[data.tasks[0]]});
});

test('review preserves unmatched marks and reports unavailable tasks instead of a false all-clear',async()=>{
  const mistakes=['retired-id'];
  await withPage('review',true,async h=>{
    await h.render();
    assert.equal(get(h,'review-empty'),null);
    await h.waitFor(()=>get(h,'review-unavailable'));
    assert.ok(get(h,'review-unavailable').textContent.includes('1 отметка сохранена'));
    assert.equal(h.host.querySelectorAll('[data-testid^="review-task-"]').length,0);
    assert.equal(get(h,'review-count').textContent,'1 ошибка');
    assert.deepEqual(mistakes,['retired-id']);
    assert.equal(h.state.gets,0);
    assert.equal(h.state.posts.length,0);
  },{data,game:{mistakes}});
});

test('a failed review request has its own retry and quiz links open a single question', async () => {
  const id = 'quiz:review-topic:q1';
  await withPage('review', false, async h => {
    h.state.reviewStatus = 503;
    await h.render();
    await h.waitFor(() => get(h, 'review-load-error'));
    assert.match(get(h, 'review-load-error').textContent, /Задачи не загрузились/);
    assert.equal(get(h, 'review-unavailable'), null);
    h.state.reviewStatus = 200;
    await act(() => get(h, 'review-reload-btn').click());
    await h.waitFor(() => get(h, 'review-task-' + id));
    assert.equal(get(h, 'review-task-' + id).getAttribute('href'), '/lesson/review-topic?question=review-topic%3Aq1');
    const record = get(h, 'review-task-' + id).closest('.review-record');
    assert.doesNotMatch(record.textContent, /Разбор|Верно|7/);
    const previous = record.querySelector('details');
    assert.equal(previous.open, false);
    assert.match(previous.textContent, /Прежний ответ5/);
    assert.equal(h.state.reviewPosts.length, 2);
    assert.equal(h.state.gets,0);
  }, { data, game: { mistakes: [id], mistakeAt: { [id]: { given: '5' } } }, reviewItems: [{ id, kind: 'number', lessonSlug: 'review-topic',
    lessonTitle: 'Тема', text: 'Сколько?', answer: 7, explanation: 'Разбор' }] });
});

test('an older review response keeps the saved t1 link and fetches only its lesson and trainer', async () => {
  const slug = 'ravnouskorennoe-dvizhenie';
  const task = { ...data.tasks[0], id: slug + ':t1', lessonSlug: slug, code: 'А1',
    graph: { points: [[0, 0], [4, 4]], tmax: 4, vmax: 4 } };
  const { code, chapter, graph, ...withoutMetadata } = task;
  await withPage('review', false, async h => {
    await h.render();
    await h.waitFor(() => get(h,'review-task-t1')?.textContent.includes('А1'));
    const row = get(h, 'review-task-t1');
    assert.equal(row.getAttribute('href'), '/trainer/' + slug + '?task=t1&from=review');
    assert.match(row.closest('.review-record').querySelector('details').textContent, /Прежний ответ5/);
    assert.equal(row.closest('.review-chapter-group').querySelector('h3').textContent, 'Механика');
    assert.ok(row.querySelector('.review-task-graph'));
    assert.equal(h.state.reviewPosts.length, 1);
    assert.deepEqual(h.state.getPaths.sort(), ['/lessons/' + slug, '/trainer/' + slug]);
  }, { getData: { ['/lessons/' + slug]: { chapter }, ['/trainer/' + slug]: { tasks: [task] } },
    game: { mistakes: ['t1'], mistakeAt: { t1: { given: '5' } } },
    reviewItems: [{ ...withoutMetadata, id: 't1' }] });
});

test('a wide older history downloads the bank once instead of starting six topic requests', async () => {
  const rows = ['first', 'second', 'third'].map((slug, index) =>
    ({ ...data.tasks[0], id: slug + ':t1', lessonSlug: slug, code: 'А' + (index + 1) }));
  const reviewItems = rows.map(({ chapter, code, ...item }) => item);
  await withPage('review', false, async h => {
    await h.render();
    await h.waitFor(() => get(h, 'review-task-third:t1')?.textContent.includes('А3'));
    assert.deepEqual(h.state.getPaths, ['/tasks']);
    assert.equal(h.state.reviewPosts.length, 1);
  }, { reviewItems, data: { tasks: rows }, game: { mistakes: rows.map(row => row.id) } });
});
