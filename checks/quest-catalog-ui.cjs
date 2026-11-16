// Real Trainer -> React Query -> real game/store integration. Only transport,
// visual dependencies and Shell are isolated; no mocked catalog assertions.
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {withPage,enter,act,tick,dom}=require('./learning-load.cjs');
const KEY='kvant_game_v1';
const canonicalId='ravnouskorennoe-dvizhenie:t1';
const read=()=>JSON.parse(dom.window.localStorage.getItem(KEY));
const date=new Date(),day=date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');
const seed=()=>({joules:345,xp:80,capsules:2,owned:['cradle'],shelf:['cradle'],solved:['t1','retired-task'],lessonDone:true,trainerTaskIds:null,
  quests:{day,ids:['solve3','nohint','model'],progress:{},claimed:[]}});

test('a topic-only Trainer catalog preserves quests until the whole course arrives, without changing an answer',async()=>{
  await withPage('trainer',true,async h=>{
    await h.render();
    assert.deepEqual(read().trainerTaskIds,[canonicalId]);
    assert.ok(read().quests.ids.includes('solve3') && read().quests.ids.includes('nohint'));
    assert.equal(read().joules,345);assert.equal(read().xp,80);assert.equal(read().capsules,2);
    assert.deepEqual(read().solved,[canonicalId,'retired-task']);assert.equal(h.state.posts.length,0);
    const input=h.host.querySelector('[data-testid="trainer-t1-input"]');await enter(input,'17');
    const stored=dom.window.localStorage.getItem(KEY);
    await act(async()=>{await h.client.refetchQueries({queryKey:h.key});await tick();});
    assert.equal(dom.window.localStorage.getItem(KEY),stored,'same catalog must not write or award again');
    assert.equal(h.host.querySelector('[data-testid="trainer-t1-input"]'),input);assert.equal(input.value,'17');
    await h.remount();assert.ok(h.host.querySelector('[data-testid="draft-resume"]'));
    assert.equal(dom.window.localStorage.getItem(KEY),stored,'return screen preserves the game save');
    await act(()=>h.host.querySelector('[data-testid="draft-resume-btn"]').click());
    assert.equal(h.host.querySelector('[data-testid="trainer-t1-input"]').value,'17');assert.equal(h.state.posts.length,0);
  },{realGame:true,gameSave:seed()});
});

test('an initial Trainer fetch failure preserves an unknown catalog until real data arrives',async()=>{
  await withPage('trainer',false,async h=>{
    h.state.getStatus=503;const stored=dom.window.localStorage.getItem(KEY);
    await h.render();await h.waitFor(()=>h.host.querySelector('[data-testid="trainer-load-error"]'));
    assert.equal(dom.window.localStorage.getItem(KEY),stored);assert.equal(read().trainerTaskIds,null);
    h.state.getStatus=200;
    await act(()=>h.host.querySelector('[data-testid="trainer-load-retry"]').click());
    await h.waitFor(()=>h.host.querySelector('[data-testid="trainer-t1-input"]'));
    assert.deepEqual(read().trainerTaskIds,[canonicalId]);assert.equal(read().joules,345);assert.equal(read().xp,80);assert.equal(h.state.posts.length,0);
  },{realGame:true,gameSave:seed()});
});
