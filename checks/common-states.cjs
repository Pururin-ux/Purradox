// Targeted real Quests/Shell/store/kit behavior. No API, CSS or browser rendering.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createRequire}=require('node:module');
const {test}=require('node:test');
const project=path.resolve(__dirname,'..'),frontend=path.join(project,'source/frontend');
const before=process.argv[2]&&path.resolve(process.argv[2]);
const req=createRequire(path.join(frontend,'package.json'));
const {JSDOM}=req('jsdom'),dom=new JSDOM('<div id="root"></div>',{url:'http://common.test/'});
global.window=dom.window;global.document=dom.window.document;
for(const name of ['HTMLElement','HTMLInputElement','SVGElement','Element','Node','NodeFilter','CustomEvent','MutationObserver','DocumentFragment'])global[name]=dom.window[name];
global.getComputedStyle=dom.window.getComputedStyle.bind(dom.window);
global.requestAnimationFrame=callback=>setTimeout(callback,0);global.cancelAnimationFrame=clearTimeout;
global.IS_REACT_ACT_ENVIRONMENT=true;
window.matchMedia = query => ({ matches: query === '(prefers-reduced-motion: reduce)' });
const React=req('react'),{act}=React,{createRoot}=req('react-dom/client');
const {MemoryRouter,useLocation}=req('react-router-dom'),{transformSync}=req('@babel/core');
const KEY='kvant_game_v1';
const LINKS={textbook:'/learn',practice:'/practice',lesson:'/lesson/ravnouskorennoe-dvizhenie',trainer:'/trainer/ravnouskorennoe-dvizhenie',review:'/review',shop:'/shop',collection:'/shop?tab=collection',ct:'/ct'};
// Catalog transport is outside this fixture. Its cached metadata is already in
// the save so rendering the real Shell does not perform an unrelated migration.
const slug='ravnouskorennoe-dvizhenie';
const catalog={lessons:[{slug,taskIds:['t1','t2','t3'].map(id=>slug+':'+id)}]};
const motionTags=new Map();
const motion=new Proxy({},{get:(_,tag)=>{if(!motionTags.has(tag))motionTags.set(tag,React.forwardRef(({children,initial,animate,exit,transition,layout,whileTap,whileHover,...props},ref)=>React.createElement(tag,{...props,ref},children)));return motionTags.get(tag);}});

async function fixture(seed,run,time=new Date(2026,10,5,12).getTime()){
  const data=new Map(),sounds=[],vibrations=[],fx=[],timers=new Map();
  let failWrites=false,writes=0,timerId=0,now=time,location;
  class Clock extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
  const day=new Clock(),dayText=day.getFullYear()+'-'+String(day.getMonth()+1).padStart(2,'0')+'-'+String(day.getDate()).padStart(2,'0');
  const quests={day:dayText,ids:['nohint','ct5','play'],progress:{nohint:1,ct5:3,play:1},claimed:[]};
  data.set(KEY,JSON.stringify({joules:200,xp:0,owned:['cradle'],shelf:['cradle'],capsules:1,opened:0,lessonSlugs:catalog.lessons.map(row=>row.slug),allTaskIds:catalog.lessons.flatMap(row=>row.taskIds),quests,...seed}));
  const storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>{if(failWrites)throw new Error('quota');writes++;data.set(key,value);}};
  const modules=new Map();
  function sourceModule(input){
    const file=[input,input+'.jsx',input+'.js'].find(file=>fs.existsSync(file));assert.ok(file,'module '+input);
    if(modules.has(file))return modules.get(file).exports;
    const module={exports:{}};modules.set(file,module);
    const old=before&&path.join(before,path.relative(project,file)),source=old&&fs.existsSync(old)?old:file;
    const code=transformSync(fs.readFileSync(source,'utf8'),{filename:file,babelrc:false,configFile:false,presets:[[req.resolve('@babel/preset-react'),{runtime:'automatic'}]],plugins:[req.resolve('@babel/plugin-transform-modules-commonjs')]}).code;
    function resolve(name){
      if(name==='@/lib/sound')return {useSfx:()=>sound=>sounds.push(sound),haptic:pattern=>vibrations.push(pattern),useMuted:()=>true,toggleMute:()=>{}};
      if(name==='@/lib/nav')return {LINKS,NAV:[]};
      if(name==='@/lib/hooks')return {useCatalog:()=>({data:catalog})};
      if(name==='framer-motion')return {motion,AnimatePresence:({children})=>children,useReducedMotion:()=>true,useSpring:()=>React.useMemo(()=>({set:()=>{}}),[]),useMotionValueEvent:()=>{}};
      return name.startsWith('@/')?sourceModule(path.join(frontend,'src',name.slice(2))):name.startsWith('.')?sourceModule(path.resolve(path.dirname(file),name)):req(name);
    }
    vm.runInNewContext(code,{module,exports:module.exports,require:resolve,console,window,document,localStorage:storage,Date:Clock,requestAnimationFrame,cancelAnimationFrame,
      setTimeout:(callback,delay)=>{timers.set(++timerId,{callback,delay,due:now+delay});return timerId;},clearTimeout:id=>timers.delete(id),
      setInterval:(callback,delay)=>{timers.set(++timerId,{callback,delay,due:now+delay,interval:true});return timerId;},clearInterval:id=>timers.delete(id)
    },{filename:file});
    return module.exports;
  }
  const api=sourceModule(path.join(frontend,'src/lib/game.js'));
  const {ShellA}=sourceModule(path.join(frontend,'src/variants/a/ShellA.jsx'));
  const root=createRoot(document.getElementById('root'));
  api.onFx(event=>fx.push(event));
  function Location(){location=useLocation();return null;}
  const byId=id=>document.querySelector('[data-testid="'+id+'"]');
  const settle=()=>act(()=>new Promise(resolve=>setTimeout(resolve,0)));
  try{
    await act(()=>root.render(React.createElement(MemoryRouter,{initialEntries:['/shop'],future:{v7_startTransition:true,v7_relativeSplatPath:true}},React.createElement(React.Fragment,null,React.createElement(Location),React.createElement(ShellA,null,React.createElement('h1',null,'Проверка общих состояний'))))));
    await settle();
    await run({api,byId,sounds,vibrations,fx,quests,dayText,get writes(){return writes;},get timers(){return timers;},get location(){return location;},read:()=>JSON.parse(data.get(KEY)),raw:()=>data.get(KEY),fail:value=>{failWrites=value;},external:value=>data.set(KEY,JSON.stringify(value)),
      async click(id){const node=byId(id);assert.ok(node,'control '+id);await act(()=>node.click());await settle();},
      async rapid(id){const node=byId(id);assert.ok(node,'control '+id);await act(()=>{node.click();node.click();});await settle();},
      async escape(){await act(()=>document.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true})));await settle();},
      async tick(nextTime) {
        const due = [...timers].filter(([, timer]) => timer.due <= nextTime)
          .sort(([, a], [, b]) => a.due - b.due);
        assert.ok(due.length, 'clock has work due before the new time');
        for (const [id, timer] of due) {
          if (!timers.has(id)) continue;
          now = timer.due;
          if (timer.interval) timer.due += timer.delay;
          else timers.delete(id);
          await act(() => timer.callback());
        }
        now = nextTime;
        await settle();
      }, settle
    });
  }finally{await act(()=>root.unmount());await new Promise(resolve=>setTimeout(resolve,0));assert.equal(timers.size,0,'quest clock cleanup');}
}

test('quests use a named modal; close and Escape restore the HUD focus without awarding',async()=>{
  await fixture({},async h=>{
    const original=h.raw(), timersBeforeOpen = h.timers.size;
    await h.click('hud-quests-button');
    const dialog=document.querySelector('[role="dialog"]');assert.ok(dialog);assert.equal(dialog.getAttribute('aria-modal'),'true');
    assert.match(document.getElementById(dialog.getAttribute('aria-labelledby')).textContent,/Квесты дня/);
    assert.equal(document.activeElement.getAttribute('data-testid'),'quests-drawer-close-btn');
    await h.escape();assert.equal(document.querySelector('[role="dialog"]'),null);
    assert.equal(document.activeElement.getAttribute('data-testid'),'hud-quests-button');assert.equal(h.timers.size,timersBeforeOpen);
    await h.click('hud-quests-button');await h.click('quests-drawer-close-btn');
    assert.equal(document.activeElement.getAttribute('data-testid'),'hud-quests-button');assert.equal(h.raw(),original);assert.equal(h.writes,0);
  });
});

test('a refused claim preserves storage and emits no success; retry grants once and focuses its receipt',async()=>{
  await fixture({},async h=>{
    await h.click('hud-quests-button');h.sounds.length=0;const original=h.raw();h.fail(true);
    await h.click('quest-claim-reward-btn-nohint');assert.equal(h.raw(),original);assert.equal(h.writes,0);assert.equal(h.fx.length,0);
    assert.deepEqual(h.sounds,[]);assert.deepEqual(h.vibrations,[]);
    assert.match(h.byId('quest-claim-error-nohint').textContent,/не удалось.*сохран|не.*запис/i);
    assert.match(h.byId('progress-save-error').textContent,/не удалось записать прогресс/i);
    assert.equal(h.byId('quest-claim-reward-btn-nohint').disabled,false);
    h.fail(false);await h.rapid('quest-claim-reward-btn-nohint');
    assert.equal(h.read().joules,240);assert.equal(h.read().xp,20);assert.deepEqual(h.read().quests.claimed,['nohint']);assert.equal(h.writes,1);
    assert.deepEqual(h.sounds,['coin']);assert.equal(h.vibrations.length,1);assert.equal(h.byId('progress-save-error'),null);
    assert.equal(document.activeElement.getAttribute('data-testid'),'quest-receipt-nohint');assert.equal(h.byId('quest-claim-error-nohint'),null);
    await h.click('quests-drawer-close-btn');await h.click('hud-quests-button');
    assert.ok(h.byId('quest-receipt-nohint'));assert.equal(h.writes,1);
  });
});

test('a claim that was already taken in another tab reports unavailable without a second coin sound',async()=>{
  await fixture({},async h=>{
    await h.click('hud-quests-button');h.sounds.length=0;
    const saved=h.read();saved.joules+=40;saved.xp=20;saved.quests.claimed=['nohint'];h.external(saved);
    await h.click('quest-claim-reward-btn-nohint');
    assert.equal(h.read().joules,240);assert.equal(h.writes,0);assert.deepEqual(h.sounds,[]);assert.equal(h.fx.length,0);
    assert.ok(h.byId('quest-receipt-nohint'));assert.equal(h.byId('quest-claim-reward-btn-nohint'),null);
  });
});

test('the open clock refreshes the daily set at midnight without writing progress or rewards',async()=>{
  const time=new Date(2026,10,5,23,59,30).getTime();
  await fixture({},async h=>{
    await h.click('hud-quests-button');const original=h.raw();
    assert.match(h.byId('quest-reset-label').textContent,/1 мин/);
    assert.ok([...h.timers.values()].some(t=>t.delay<=30100));
    await h.tick(time+31000);
    assert.equal(h.byId('quest-reset-label').textContent.includes('1 мин'),false);
    const ids=[...document.querySelectorAll('[data-quest-id]')].map(el=>el.getAttribute('data-quest-id'));
    assert.equal(ids.length,3);assert.notDeepEqual(ids,h.quests.ids);
    for(const counter of document.querySelectorAll('[data-testid^="quest-progress-"]'))assert.match(counter.textContent,/^0\//);
    assert.equal(h.raw(),original);assert.equal(h.writes,0);assert.equal(h.fx.length,0);
  },time);
});

test('an unfinished quest links to its existing destination and closes the modal without claiming',async()=>{
  await fixture({},async h=>{
    await h.click('hud-quests-button');const original=h.raw();
    assert.equal(h.byId('quest-open-play').getAttribute('href'),LINKS.collection);
    await h.click('quest-open-play');assert.equal(h.location.pathname,'/shop');assert.equal(h.location.search,'?tab=collection');
    assert.equal(document.querySelector('[role="dialog"]'),null);assert.equal(h.raw(),original);assert.equal(h.writes,0);
  });
});

test('the store result distinguishes ineligible, stored and refused rewards without changing amounts',async()=>{
  await fixture({},async h=>{
    let result;await act(()=>{result=h.api.claimQuest('ct5');});assert.equal(result.ok,false);assert.equal(result.reason,'unavailable');
    h.fail(true);await act(()=>{result=h.api.claimQuest('nohint');});assert.equal(result.ok,false);assert.equal(result.reason,'storage');
    h.fail(false);await act(()=>{result=h.api.claimQuest('nohint');});assert.equal(result.ok,true);assert.equal(h.read().joules,240);assert.equal(h.read().xp,20);
    await act(()=>{result=h.api.claimQuest('nohint');});assert.equal(result.ok,false);assert.equal(result.reason,'unavailable');assert.equal(h.writes,1);
  });
});
