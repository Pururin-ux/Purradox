const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createRequire}=require('node:module'),{test}=require('node:test');
const frontend=path.resolve(__dirname,'../source/frontend'),req=createRequire(path.join(frontend,'package.json'));
const {transformSync}=req('@babel/core');
const react={useSyncExternalStore:(_,snapshot)=>snapshot()};
function load(name,globals={},cache=new Map()) {
  const filename=path.join(frontend,'src',name);
  if(cache.has(filename))return cache.get(filename).exports;
  const code=transformSync(fs.readFileSync(filename,'utf8'),{filename,babelrc:false,configFile:false,plugins:[req.resolve('@babel/plugin-transform-modules-commonjs')]}).code;
  const module={exports:{}}; cache.set(filename,module);
  vm.runInNewContext(code,{module,exports:module.exports,...globals,require(id){
    if(id==='react')return react;
    if(id.startsWith('@/'))return load(id.slice(2)+'.js',globals,cache);
    if(id.startsWith('.'))return load(path.posix.join(path.posix.dirname(name),id)+'.js',globals,cache);
    return req(id);
  }},{filename});
  return module.exports;
}
function memory() { const values=new Map();return {values,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)}; }
function game(storage=memory()) {return {...load('lib/game.js',{localStorage:storage}),storage};}
const KEY='kvant_game_v1',oldSlug='ravnouskorennoe-dvizhenie';
test('old completion migrates without payment; each new lesson pays once across reloads',()=>{
  const storage=memory();storage.setItem(KEY,JSON.stringify({joules:450,xp:100,lessonDone:true,solved:['t1']}));
  const a=game(storage),before=a.useGame();
  assert.deepEqual([...before.completedLessons],[oldSlug]);assert.equal(before.joules,450);
  assert.equal(a.completeLesson(100),false);assert.equal(a.useGame().xp,100);
  assert.equal(a.completeLesson(100,'gazovye-zakony'),true);const paid=storage.getItem(KEY);
  const b=game(storage);assert.equal(b.completeLesson(100,'gazovye-zakony'),false);
  assert.equal(storage.getItem(KEY),paid);assert.equal(b.useGame().xp,200);
  assert.equal(b.completeLesson(100,'tonkie-linzy'),true);assert.equal(b.useGame().xp,300);
  assert.ok(b.useGame().solved.includes(oldSlug + ':t1'));
});
test('daily tasks use the full course when the last visited topic is exhausted',()=>{
  const a=game(),day=a.dayKey();
  a.storage.setItem(KEY,JSON.stringify({joules:200,solved:['t1'],lessonDone:true,quests:{day,ids:['solve3','nohint','lesson'],progress:{},claimed:[]}}));
  a.syncCourseCatalog({lessonSlugs:[oldSlug,'other'],taskIds:['t1','other:1','other:2','other:3']});
  a.syncQuestTasks(['t1']);
  assert.deepEqual([...a.useGame().quests.ids],['solve3','nohint','lesson']);
});
test('two stale game instances preserve spending and per-topic rewards',()=>{
  const storage=memory(),a=game(storage),b=game(storage);
  assert.equal(a.buy('tuning').ok,true);assert.equal(b.completeLesson(100,'new'),true);
  assert.ok(b.useGame().owned.includes('tuning'));assert.ok(b.useGame().joules<300);
  assert.equal(a.completeLesson(100,'new'),false);
});
test('exam rewards and watch unlock are first-only, profile edits do not award',()=>{
  const a=game();a.recordCt({correct:20,id:'01',full:true});
  assert.ok(a.useGame().owned.includes('watch'));const paid=a.storage.getItem(KEY);
  a.recordCt({correct:20,id:'01',full:true});assert.equal(a.storage.getItem(KEY),paid);
  const before={xp:a.useGame().xp,joules:a.useGame().joules,capsules:a.useGame().capsules};
  assert.equal(a.saveProfile({avatar:'girl',nickname:'  Саша  '}),true);
  assert.equal(a.useGame().nickname,'Саша');for(const [key,value] of Object.entries(before))assert.equal(a.useGame()[key],value);
  assert.equal(a.saveProfile({avatar:'alien',nickname:'x'}),false);
});
test('finished CT report survives reload atomically with its first-only reward',()=>{
  const storage=memory(),a=game(storage);
  const result={correct:1,total:1,elapsed_sec:44,review:[{id:'A1',code:'А1',section:'mechanics',given:2,answer:2,correct:true,solution:[{text:'Путь равен 13 м.'}]}],by_section:[{id:'mechanics',title:'Механика',correct:1,total:1}]};
  assert.equal(a.recordCt({correct:1,id:'01',full:true,result}),true);
  const b=game(storage),paid=b.useGame().joules;
  assert.deepEqual(JSON.parse(JSON.stringify(b.useGame().examResults['01'])),result);
  assert.equal(b.recordCt({correct:1,id:'01',full:true,result}),true);
  assert.equal(b.useGame().joules,paid);
  assert.equal(b.recordCt({correct:1,id:'02',full:true,result:{correct:1,total:30}}),false);
  assert.equal(b.useGame().examResults['02'],undefined);
});
const learning=load('lib/learningDraft.js');
const ct=load('lib/ctDraft.js');
const data={variantId:'01',minutes:210,tasks:[{id:'A1',part:'A',kind:'multi',options:['a','b','c','d','e']},{id:'B1',part:'B',kind:'number'}]};
test('multi-choice CT draft restores exact place/time and stays separate from the other form',()=>{
  const storage=memory(),a=ct.createCtDraftStore(data,storage);
  const attempt={answers:{A1:[2,4],B1:'-15'},flags:['A1'],currentTaskId:'B1',startedAt:100000,skip:0};
  assert.equal(a.write(attempt),null);
  const restored=ct.createCtDraftStore(data,storage).saved;
  assert.deepEqual(JSON.parse(JSON.stringify(restored)),attempt);
  assert.equal(ct.createCtDraftStore({...data,variantId:'02'},storage).saved,null);
  assert.notEqual(ct.ctDraftKey({...data,variantId:'02'}),a.key);
  const invalid={...attempt,answers:{A1:[2,2]}};assert.ok(a.write(invalid));
  assert.ok(a.write({...attempt,answers:{A1:[6]}}));
  assert.deepEqual([...ct.createCtDraftStore(data,storage).saved.answers.A1],[2,4]);
});
test('legacy CT key and stale-tab protection survive the new forms',()=>{
  const legacy={minutes:210,tasks:[{id:'A1',part:'A',kind:'single',options:['1','2']}]};
  assert.equal(ct.ctDraftKey(legacy),learning.learningDraftKey('ct','demo',legacy));
  const storage=memory(),a=ct.createCtDraftStore(data,storage),b=ct.createCtDraftStore(data,storage);
  const attempt={answers:{A1:[1,3]},flags:[],currentTaskId:'A1',startedAt:100000,skip:0};
  assert.equal(a.write(attempt),null);assert.ok(b.write({...attempt,currentTaskId:'B1'}));
  assert.equal(ct.createCtDraftStore(data,storage).saved.currentTaskId,'A1');
});
const models=load('lib/studyModels.js');
test('blocked localStorage cannot crash the home draft links',()=>{
  const blocked={};Object.defineProperty(blocked,'localStorage',{get(){throw new Error('SecurityError');}});
  const course=load('lib/courseProgress.js',{window:blocked});
  assert.deepEqual([...course.recentDrafts([{slug:'x'}])],[]);
});
test('models honor units, energy/current balances and the focal boundary',()=>{
  assert.equal(models.gasState(300,10).pressureKpa,249.3);
  const series=models.circuitState(12,4,8,false),parallel=models.circuitState(12,4,8,true);
  assert.equal(series.current,1);assert.equal(series.u1+series.u2,12);assert.equal(parallel.i1+parallel.i2,parallel.current);
  assert.equal(models.lensState(20,20).atFocus,true);assert.equal(models.lensState(20,40).b,40);
  assert.ok(models.lensState(-20,40).b<0);assert.ok(models.lensState(-20,40).magnification>0);
  assert.equal(models.waveState(20,2).wavelength,10);assert.equal(models.waveState(20,2).period,.5);
});
