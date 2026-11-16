const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { test } = require('node:test');
const frontend = path.resolve(__dirname, '../source/frontend');
const req = createRequire(path.join(frontend, 'package.json'));
const React = req('react');
const { act } = React;
const { createRoot } = req('react-dom/client');
const { JSDOM } = req('jsdom');
const { transformSync } = req('@babel/core');
const KEY = 'kvant_game_v1';
const DATA = { variantId:'01', minutes:210, title:'Variant 01', tasks:[
  {id:'A1',code:'A1',part:'A',kind:'multi',section:'mechanics',text:'Original A question',options:['one','two','three']},
  {id:'B1',code:'B1',part:'B',kind:'number',section:'mechanics',text:'Original numeric question',unit:'m'},
] };
const plain = value => JSON.parse(JSON.stringify(value));

// Independent review harness. Real game/hook/draft code, React effects and state;
// controlled HTTP response, clock and browser storage. No browser or source edit.
async function fixture(run, seed) {
  const dom = new JSDOM('<div id="root"></div>', {url:'http://ct-result-review.test/'});
  const prior = {window:global.window,document:global.document,act:global.IS_REACT_ACT_ENVIRONMENT};
  global.window=dom.window;global.document=dom.window.document;global.IS_REACT_ACT_ENVIRONMENT=true;
  const raw=new Map(seed ? [[KEY,JSON.stringify(seed)]] : []),events=[];
  let now=Date.UTC(2026,10,7,12),refuseGame=false,refuseRemove=false,root,exam,game,g,saveError,modules=new Map(),submissions=0;
  let beforeGrade;
  class Clock extends Date { constructor(...a){super(...(a.length?a:[now]));} static now(){return now;} }
  const storage={get length(){return raw.size;},key:i=>[...raw.keys()][i]??null,getItem:k=>raw.get(k)??null,
    setItem(k,v){events.push('write:'+k);if(refuseGame&&k===KEY)throw Error('progress write refused');raw.set(k,v);},
    removeItem(k){events.push('remove:'+k);if(refuseRemove&&k.startsWith('kvant_draft_v1:ct:'))throw Error('draft removal refused');raw.delete(k);}};
  Object.defineProperty(dom.window,'localStorage',{value:storage});
  function load(file,cache=modules){
    const filename=[file,file+'.js',file+'.jsx'].find(p=>fs.existsSync(p));
    if(cache.has(filename))return cache.get(filename).exports;
    const m={exports:{}};cache.set(filename,m);
    const code=transformSync(fs.readFileSync(filename,'utf8'),{filename,babelrc:false,configFile:false,plugins:[req.resolve('@babel/plugin-transform-modules-commonjs')]}).code;
    vm.runInNewContext(code,{module:m,exports:m.exports,window:dom.window,localStorage:storage,Date:Clock,setInterval:()=>1,clearInterval(){},console,
      require(n){if(n==='react')return React;if(n==='@/lib/hooks')return {submitCt:async()=>{throw Error('unexpected demo transport')}};
        if(n.startsWith('@/'))return load(path.join(frontend,'src',n.slice(2)),cache);
        if(n.startsWith('.'))return load(path.resolve(path.dirname(filename),n),cache);
        return req(n);}},{filename});
    return m.exports;
  }
  const f={
    get exam(){return exam;},get g(){return g;},get error(){return saveError;},get raw(){return raw;},get events(){return events;},
    get submissions(){return submissions;},get drafts(){return [...raw].filter(([k])=>k.startsWith('kvant_draft_v1:ct:'));},
    get savedGame(){return JSON.parse(raw.get(KEY)??'null');},
    failGame(v){refuseGame=v;},failRemove(v){refuseRemove=v;},advance(ms){now+=ms;},
    async action(fn){await act(async()=>fn(exam));},
    otherGame(){return load(path.join(frontend,'src/lib/game.js'),new Map());},
    otherDraft(data){return load(path.join(frontend,'src/lib/ctDraft.js'),new Map()).createCtDraftStore(data,storage);},
    beforeGrade(fn){beforeGrade=fn;},
    async mount(data=DATA,cold=false){
      if(cold)modules=new Map();
      game=load(path.join(frontend,'src/lib/game.js'));
      const {useCtExam}=load(path.join(frontend,'src/components/shared/useCtExam.js'));
      function Harness(){
        g=game.useGame();saveError=game.useSaveError();
        exam=useCtExam(data,{savedResult:g.examResults?.[data.variantId??'demo'],
          readResult:()=>game.readCtResult(data.variantId??'demo'),
          submit:async(answers,elapsed_sec)=>{submissions++;await beforeGrade?.();return {variantId:data.variantId,correct:2,total:2,full_total:30,elapsed_sec,
            by_section:[{id:'mechanics',title:'Mechanics',correct:2,total:2}],
            review:data.tasks.map(t=>({id:t.id,code:t.code,correct:true,section:t.section,given:answers[t.id],answer:t.id==='A1'?[1,3]:42,unit:t.unit,solution:[{text:'Original solution'}]}))};},
          onFinish:(r,previousResult)=>game.recordCt({id:data.variantId??'demo',correct:r.correct,full:Boolean(data.variantId),result:r,previousResult})});
        return null;
      }
      root=createRoot(dom.window.document.getElementById('root'));
      await act(()=>root.render(React.createElement(Harness)));
    },
    async unmount(){if(root){await act(()=>root.unmount());root=null;}},
    async complete(){await f.action(e=>e.start());await f.action(e=>{e.setAnswer('A1',[1,3]);e.setAnswer('B1','42');});f.advance(120000);await f.action(e=>e.finish());},
  };
  try{await f.mount();await run(f);}finally{await f.unmount();dom.window.close();global.window=prior.window;global.document=prior.document;global.IS_REACT_ACT_ENVIRONMENT=prior.act;}
}

test('result and first-only reward persist before draft deletion; cold return opens the report',async()=>{
  await fixture(async f=>{
    await f.complete();assert.equal(f.exam.stage,'result');assert.equal(f.exam.completionPending,false);assert.equal(f.drafts.length,0);
    const result=plain(f.exam.result),paid={xp:f.g.xp,joules:f.g.joules,capsules:f.g.capsules};
    assert.deepEqual(plain(f.savedGame.examResults['01']),result);
    const removed=f.events.findIndex(v=>v.startsWith('remove:kvant_draft_v1:ct:'));
    assert.ok(f.events.slice(0,removed).includes('write:'+KEY));
    await f.unmount();await f.mount(DATA,true);assert.equal(f.exam.stage,'result');assert.deepEqual(plain(f.exam.result),result);
    await f.action(e=>e.retrySave());assert.deepEqual({xp:f.g.xp,joules:f.g.joules,capsules:f.g.capsules},paid);assert.equal(f.submissions,1);
  });
});

test('game write refusal preserves the attempt; retry saves the report exactly once without a second submit',async()=>{
  await fixture(async f=>{
    f.failGame(true);await f.complete();assert.equal(f.exam.completionPending,true);assert.ok(f.exam.saveError);assert.equal(f.drafts.length,1);assert.equal(f.savedGame,null);
    await f.action(e=>e.restart());assert.equal(f.exam.stage,'result');assert.equal(f.drafts.length,1);
    f.failGame(false);await f.action(e=>e.retrySave());assert.equal(f.exam.completionPending,false);assert.equal(f.exam.saveError,null);assert.equal(f.drafts.length,0);assert.equal(f.savedGame.examResults['01'].correct,2);
    const xp=f.g.xp;await f.action(e=>e.retrySave());assert.equal(f.g.xp,xp);assert.equal(f.submissions,1);
  });
});

test('a genuinely new attempt takes precedence over the old saved result after cold return',async()=>{
  await fixture(async f=>{
    await f.complete();const xp=f.g.xp;await f.action(e=>e.restart());f.advance(1000);await f.action(e=>e.start());await f.action(e=>e.setAnswer('B1','7'));
    await f.unmount();await f.mount(DATA,true);assert.equal(f.exam.stage,'resume');assert.equal(f.exam.result,null);assert.equal(f.exam.answers.B1,'7');assert.equal(f.g.xp,xp);
  });
});

test('a stale demo tab cannot submit or erase the newer answer sheet', async () => {
  const demo = { ...DATA, variantId: undefined };
  await fixture(async f => {
    await f.unmount(); await f.mount(demo, true);
    await f.action(exam => exam.start());
    await f.action(exam => exam.setAnswer('B1', '7'));
    const other = f.otherDraft(demo);
    assert.equal(other.write({ ...other.saved, answers: { B1: '42' } }), null);
    await f.action(exam => exam.finish());
    assert.equal(f.exam.stage, 'exam');
    assert.equal(f.exam.error, 'conflict');
    assert.equal(f.submissions, 0);
    assert.equal(f.savedGame, null);
    await f.unmount(); await f.mount(demo, true);
    assert.equal(f.exam.answers.B1, '42');
    await f.action(exam => exam.resume()); await f.action(exam => exam.finish());
    await f.unmount(); await f.mount(demo, true);
    assert.equal(f.exam.stage, 'result');
    assert.equal(f.savedGame.examResults.demo.review[1].given, '42');
    assert.equal(f.savedGame.xp, 40);
  });
});

test('changing a full variant during grading prevents the old response from saving', async () => {
  await fixture(async f => {
    await f.action(exam => exam.start());
    const other = f.otherDraft(DATA);
    f.beforeGrade(() => {
      assert.equal(other.write({ ...other.saved, answers: { B1: '42' } }), null);
    });
    await f.action(exam => exam.finish());
    assert.equal(f.submissions, 1);
    assert.equal(f.exam.stage, 'exam');
    assert.equal(f.exam.error, 'conflict');
    assert.equal(f.savedGame, null);
    assert.equal(JSON.parse(f.drafts[0][1]).value.answers.B1, '42');
  });
});

test('retrying a refused report cannot save it over a changed answer sheet', async () => {
  await fixture(async f => {
    f.failGame(true);
    await f.complete();
    assert.equal(f.exam.completionPending, true);
    const other = f.otherDraft(DATA);
    assert.equal(other.write({ ...other.saved, answers: { B1: '84' } }), null);
    f.failGame(false);
    await f.action(exam => exam.retrySave());
    assert.equal(f.exam.stage, 'exam');
    assert.equal(f.exam.error, 'conflict');
    assert.equal(f.savedGame, null);
    assert.equal(f.submissions, 1);
    assert.equal(JSON.parse(f.drafts[0][1]).value.answers.B1, '84');
  });
});

test('old saves without examResults still load, preserving completion and legacy lesson migration',async()=>{
  await fixture(async f=>{
    assert.equal(f.error,null);assert.equal(f.exam.stage,'intro');assert.ok(f.g.completedLessons.includes('ravnouskorennoe-dvizhenie'));assert.ok(f.g.completedExams.includes('demo'));assert.equal(f.g.xp,100);assert.equal(f.g.joules,450);
  },{joules:450,xp:100,lessonDone:true,completedExams:['demo'],solved:['t1']});
});

test('sequential stale completion preserves another variant report, spending and first-only reward',async()=>{
  await fixture(async f=>{
    const b=f.otherGame();await f.action(()=>b.buy('tuning'));await f.complete();
    const first=f.savedGame;assert.ok(first.owned.includes('tuning'));
    const other={...plain(first.examResults['01']),variantId:'02'};await f.action(()=>b.recordCt({correct:2,id:'02',full:true,result:other}));
    const xp=f.savedGame.xp;await f.action(e=>e.retrySave());assert.equal(f.savedGame.xp,xp);assert.ok(f.savedGame.examResults['02']);assert.ok(f.savedGame.owned.includes('tuning'));
  });
});

test('a saved completion is reopened after a draft cleanup failure, rather than resuming the completed attempt',async()=>{
  await fixture(async f=>{
    f.failRemove(true);await f.complete();assert.ok(f.savedGame.examResults['01']);assert.equal(f.drafts.length,1);assert.ok(f.exam.saveError);
    const other = f.otherDraft(DATA);
    assert.equal(other.write({ ...other.saved, answers: { B1: '84' } }), null, 'simulate an older client editing the leftover draft');
    f.failRemove(false);await f.unmount();f.advance(600000);await f.mount(DATA,true);
    assert.equal(f.exam.stage,'result','the remaining draft belongs to the already-saved completion, not a new attempt');
  });
});

test('a different attempt can save after the clock moves back, without a second reward', async () => {
  await fixture(async f => {
    await f.complete();
    const previous = f.savedGame.examResults['01'];
    f.advance(-86400000);
    await f.action(exam => exam.restart());
    await f.action(exam => exam.start());
    await f.action(exam => exam.setAnswer('B1', '84'));
    await f.action(exam => exam.finish());
    const current = f.savedGame.examResults['01'];
    assert.equal(f.exam.completionPending, false);
    assert.equal(current.review[1].given, '84');
    assert.ok(JSON.parse(current.attempt).startedAt < JSON.parse(previous.attempt).startedAt);
    assert.notEqual(JSON.parse(current.attempt).runId, JSON.parse(previous.attempt).runId);
    assert.equal(f.savedGame.xp, 40);
  });
});

test('two replies for the same answer sheet display the saved elapsed time', async () => {
  await fixture(async f => {
    await f.action(exam => exam.start());
    await f.action(exam => exam.setAnswer('B1', '42'));
    const [draftKey, envelope] = f.drafts[0];
    const peer = f.otherGame();
    const result = { draftKey, attempt: JSON.stringify(JSON.parse(envelope).value), correct: 1, total: 2, elapsed_sec: 5,
      review: [{ id: 'A1', correct: false, solution: [] }, { id: 'B1', given: '42', correct: true, solution: [] }],
      by_section: [{ id: 'mechanics', title: 'Механика', correct: 1, total: 2 }] };
    f.beforeGrade(() => assert.equal(peer.recordCt({ id: '01', correct: 1, result }), true));
    f.advance(8000);
    await f.action(exam => exam.finish());
    assert.equal(f.exam.result.elapsed_sec, 5);
    assert.equal(f.exam.result.correct, f.savedGame.examResults['01'].correct);
    assert.equal(f.savedGame.joules, 215);
  });
});

test('a changed question cannot silently attach a previous report to the new condition',async()=>{
  await fixture(async f=>{
    await f.complete();await f.unmount();const changed=plain(DATA);changed.tasks[0].text='Changed A question, different condition';
    await f.mount(changed,true);
    assert.equal(f.exam.stage,'result');
    assert.equal(f.exam.result.correct,2);
    assert.equal(f.exam.result.review[0].historical,true,'show the archived score and solution without pairing it with the changed prompt');
  });
});

test('blocked localStorage getter no longer escapes recentDrafts',()=>{
  const filename=path.join(frontend,'src/lib/courseProgress.js'),m={exports:{}},blocked={};
  Object.defineProperty(blocked,'localStorage',{get(){throw Error('SecurityError');}});
  const code=transformSync(fs.readFileSync(filename,'utf8'),{filename,babelrc:false,configFile:false,plugins:[req.resolve('@babel/plugin-transform-modules-commonjs')]}).code;
  vm.runInNewContext(code,{module:m,exports:m.exports,window:blocked,require:()=>({})});
  assert.deepEqual(plain(m.exports.recentDrafts([{slug:'topic'}])),[]);
});

test('legacy topic catalog no longer drops solve quests before the full course loads',async()=>{
  await fixture(async f=>{
    assert.deepEqual(plain(f.g.quests.ids),['solve3','nohint','lesson']);
    const other=f.otherGame();await f.action(()=>other.syncCourseCatalog({lessonSlugs:['ravnouskorennoe-dvizhenie','new'],taskIds:['t1','t2','t3','new1','new2','new3']}));
    assert.deepEqual(f.savedGame.quests.ids,['solve3','nohint','lesson']);assert.equal(f.savedGame.quests.progress.solve3,1);
  },{trainerTaskIds:['t1','t2','t3'],solved:['t1','t2','t3'],quests:{day:'2026-11-07',ids:['solve3','nohint','lesson'],progress:{solve3:1},claimed:[]}});
});
