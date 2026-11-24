// Real Shop/Artifact/Capsule + game/storage + project kit. Transport-free scope.
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
for (const name of ['HTMLElement','HTMLInputElement','SVGElement','Element','Node','NodeFilter','CustomEvent','MutationObserver','DocumentFragment']) global[name] = dom.window[name];
global.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
global.requestAnimationFrame = callback => setTimeout(callback,0);
global.cancelAnimationFrame = clearTimeout;
global.IS_REACT_ACT_ENVIRONMENT = true;
const React = req('react');
const { act } = React;
const { createRoot } = req('react-dom/client');
const { MemoryRouter, useLocation } = req('react-router-dom');
const { transformSync } = req('@babel/core');
const KEY='kvant_game_v1';
const play=()=>{};
const motionTags=new Map();
const motion=new Proxy({}, {get:(_,tag)=>{
  if(!motionTags.has(tag)) motionTags.set(tag,React.forwardRef(({children,initial,animate,exit,transition,layout,whileTap,whileHover,...props},ref)=>React.createElement(tag,{...props,ref},children)));
  return motionTags.get(tag);
}});

async function fixture(seed,run,route='/shop') {
  const stored=new Map();
  let failWrites=false, writes=0;
  const storage={getItem:key=>stored.get(key)??null,setItem:(key,value)=>{if(failWrites)throw new Error('quota');writes++;stored.set(key,value);}};
  const modules=new Map();
  function sourceModule(input){
    const filename=[input,input+'.jsx',input+'.js'].find(file=>fs.existsSync(file));
    assert.ok(filename,'module '+input);
    if(modules.has(filename))return modules.get(filename).exports;
    const module={exports:{}};modules.set(filename,module);
    const code=transformSync(fs.readFileSync(filename,'utf8'),{filename,babelrc:false,configFile:false,presets:[[req.resolve('@babel/preset-react'),{runtime:'automatic'}]],plugins:[req.resolve('@babel/plugin-transform-modules-commonjs')]}).code;
    function fromSource(name){
      if(name==='@/lib/sound')return {useSfx:()=>play,haptic:play};
      if(name==='@/lib/nav')return {LINKS:{trainer:'/trainer/ravnouskorennoe-dvizhenie'}};
      if(name==='framer-motion')return {motion,AnimatePresence:({children})=>children,useReducedMotion:()=>true,useSpring:()=>({set:play})};
      if(name==='./ShellA')return {ShellA:({children})=>React.createElement('main',null,children)};
      if(name==='./GameFx')return {burst:play};
      if(name==='./Chars')return {Char:()=>null,Bubble:()=>null,Avatar:()=>null};
      return name.startsWith('@/')?sourceModule(path.join(frontend,'src',name.slice(2))):name.startsWith('.')?sourceModule(path.resolve(path.dirname(filename),name)):req(name);
    }
    vm.runInNewContext(code,{module,exports:module.exports,require:fromSource,console,window,document,localStorage:storage,setTimeout,clearTimeout,requestAnimationFrame,cancelAnimationFrame},{filename});
    return module.exports;
  }
  const artifacts=sourceModule(path.join(frontend,'src/lib/artifacts.js'));
  stored.set(KEY,JSON.stringify({joules:200,owned:['cradle'],shelf:['cradle'],capsules:1,opened:0,...(typeof seed==='function'?seed(artifacts):seed)}));
  const Shop=sourceModule(path.join(frontend,'src/variants/a/ShopA.jsx')).default;
  const host=document.getElementById('root'),root=createRoot(host);
  let location;
  function Location(){location=useLocation();return null;}
  const byId=id=>document.querySelector('[data-testid="'+id+'"]');
  try{
    await act(()=>root.render(React.createElement(MemoryRouter,{initialEntries:[route],future:{v7_startTransition:true,v7_relativeSplatPath:true}},React.createElement(React.Fragment,null,React.createElement(Location),React.createElement(Shop)))));
    await run({host,byId,artifacts,read:()=>JSON.parse(stored.get(KEY)),get writes(){return writes;},get location(){return location;},fail(value){failWrites=value;},
      async click(id){const node=byId(id);assert.ok(node,'control '+id);await act(()=>{
        // Radix Tabs activates on primary mousedown, which HTMLElement.click omits.
        if(node.getAttribute('role')==='tab')node.dispatchEvent(new dom.window.MouseEvent('mousedown',{bubbles:true,button:0,ctrlKey:false}));
        node.click();
      });await act(()=>new Promise(resolve=>setTimeout(resolve,0)));},
      async rapid(id){const node=byId(id);assert.ok(node,'control '+id);await act(()=>{node.click();node.click();});await act(()=>new Promise(resolve=>setTimeout(resolve,0)));}
    });
  }finally{await act(()=>root.unmount());await new Promise(resolve=>setTimeout(resolve,0));}
}

test('collection URL exposes the saved shelf; inspection closes to its own trigger without spending',async()=>{
  await fixture({owned:['cradle','train'],shelf:['cradle','train']},async h=>{
    assert.equal(h.byId('shop-tab-collection').getAttribute('aria-selected'),'true');
    assert.match(h.byId('shelf-count').textContent,/2\s*\/\s*6/);
    await h.click('collection-shelf-cradle');
    const dialog=document.querySelector('[role="dialog"]');assert.ok(dialog);assert.equal(dialog.getAttribute('aria-modal'),'true');
    assert.match(dialog.textContent,/Маятник Ньютона/);
    await h.click('artifact-modal-close-btn');
    assert.equal(document.querySelector('[role="dialog"]'),null);
    assert.equal(document.activeElement.getAttribute('data-testid'),'collection-shelf-cradle');
    assert.equal(h.read().joules,200);assert.deepEqual(h.read().shelf,['cradle','train']);
  },'/shop?tab=collection');
});

test('the featured prism opens its experiment without a purchase and returns keyboard focus',async()=>{
  await fixture({},async h=>{
    await h.click('shop-prism-experiment');
    const dialog=document.querySelector('[role="dialog"]');
    assert.equal(dialog.querySelector('[aria-selected="true"]').textContent,'Опыт с призмой');
    assert.ok(dialog.querySelector('[role="slider"]'));
    await h.click('artifact-modal-close-btn');
    assert.equal(document.activeElement.getAttribute('data-testid'),'shop-prism-experiment');
    await h.click('shop-item-card-prism');
    assert.equal(document.querySelector('[role="dialog"] [aria-selected="true"]').textContent,'Предмет');
    assert.equal(h.writes,0);
  });
});

test('purchase is saved once; a storage refusal keeps the item unowned and offers retry',async()=>{
  await fixture({},async h=>{
    await h.click('shop-item-card-tuning');h.fail(true);await h.click('shop-buy-btn');
    assert.equal(h.read().joules,200);assert.deepEqual(h.read().owned,['cradle']);
    assert.match(h.byId('artifact-action-status').textContent,/не.*сохран|не удалось/i);
    h.fail(false);await h.rapid('shop-buy-btn');
    assert.equal(h.read().joules,80);assert.deepEqual(h.read().owned,['cradle','tuning']);
    assert.ok(h.byId('artifact-shelf-toggle-btn'));assert.ok(!h.byId('shop-buy-btn'));
    await h.click('artifact-shelf-toggle-btn');assert.deepEqual(h.read().shelf,['cradle']);
    await h.click('artifact-shelf-toggle-btn');assert.deepEqual(h.read().shelf,['cradle','tuning']);
  });
});

test('rapid capsule opening saves one draw plus the first bonus, and closing cannot grant more',async()=>{
  await fixture({capsules:2},async h=>{
    await h.rapid('capsule-open-trigger');
    const saved=h.read();assert.equal(saved.capsules,1);assert.equal(saved.opened,1);assert.ok(saved.owned.includes('quark'));assert.equal(saved.owned.length,3);
    assert.ok(document.querySelector('[role="dialog"]'));assert.ok(h.byId('capsule-first-bonus'));
    const draw=saved.owned.find(id=>id!=='cradle'&&id!=='quark');
    assert.equal(h.byId('capsule-reveal-name').textContent,h.artifacts.ART_BY_ID[draw].name);
    await h.click('capsule-claim-btn');
    assert.equal(document.querySelector('[role="dialog"]'),null);assert.equal(h.read().owned.length,3);assert.equal(h.read().capsules,1);
    assert.equal(document.activeElement.getAttribute('data-testid'),'capsule-open-trigger');
  });
});

test('a failed capsule write opens no reward dialog and can be retried without losing a capsule',async()=>{
  await fixture({},async h=>{
    h.fail(true);await h.click('capsule-open-trigger');
    assert.equal(h.read().capsules,1);assert.equal(h.read().opened,0);assert.equal(document.querySelector('[role="dialog"]'),null);
    assert.match(h.byId('shop-notice').textContent,/не открылась/);
    h.fail(false);await h.click('capsule-open-trigger');assert.equal(h.read().capsules,0);assert.equal(h.read().opened,1);
    await h.click('capsule-close-btn');assert.equal(h.read().capsules,0);assert.equal(h.read().owned.length,3);
    assert.equal(h.byId('capsule-open-trigger').disabled,true);
  });
});

test('an exhausted pool credits the actual refund once, with no first-capsule bonus screen',async()=>{
  await fixture(arts=>({owned:arts.ARTIFACTS.filter(a=>a.rarity!=='legendary').map(a=>a.id),shelf:[],opened:3}),async h=>{
    await h.rapid('capsule-open-trigger');assert.equal(h.read().joules,500);assert.equal(h.read().capsules,0);assert.equal(h.read().opened,4);
    assert.equal(h.byId('capsule-reveal-name').textContent,'+300 Дж');assert.equal(h.byId('capsule-first-bonus'),null);
    const saved=JSON.stringify(h.read());await h.click('capsule-claim-btn');assert.equal(JSON.stringify(h.read()),saved);assert.equal(h.writes,1);
    assert.equal(document.activeElement.getAttribute('data-testid'),'shop-tab-collection','last capsule needs an enabled focus destination');
  });
});

test('a full shelf cannot grow; removing an existing item makes room without removing ownership',async()=>{
  const six=['cradle','tuning','magnet','lava','bird','radiometer'];
  await fixture({owned:[...six,'plasma'],shelf:six,capsules:0,opened:2},async h=>{
    await h.click('collection-artifact-slot-plasma');assert.equal(h.byId('artifact-shelf-toggle-btn').disabled,true);assert.equal(h.read().shelf.length,6);
    await h.click('artifact-modal-close-btn');await h.click('collection-shelf-cradle');await h.click('artifact-shelf-toggle-btn');
    assert.equal(h.read().shelf.length,5);assert.ok(h.read().owned.includes('cradle'));
    await h.click('artifact-modal-close-btn');await h.click('collection-artifact-slot-plasma');assert.equal(h.byId('artifact-shelf-toggle-btn').disabled,false);
    await h.click('artifact-shelf-toggle-btn');assert.equal(h.read().shelf.length,6);assert.ok(h.read().shelf.includes('plasma'));assert.equal(h.read().joules,200);
  },'/shop?tab=collection');
});

test('URL-backed tabs, collection empty state and rarity filters preserve balances and ownership',async()=>{
  await fixture({owned:[],shelf:[],capsules:0},async h=>{
    await h.click('collection-filter-owned');assert.ok(h.byId('collection-empty'));assert.match(h.byId('collection-empty').querySelector('img').src,/20261106-graphic\/cat-blink.png$/);
    await h.click('collection-filter-missing');assert.equal(h.host.querySelectorAll('[data-testid^="collection-artifact-slot-"]').length,19);
    await h.click('shop-tab-store');assert.equal(h.location.search,'');assert.equal(h.byId('shop-tab-store').getAttribute('aria-selected'),'true');
    await h.click('shop-filter-rare');assert.equal(h.host.querySelectorAll('[data-testid^="shop-item-card-"]').length,4);
    await h.click('shop-item-card-stirling');assert.equal(h.byId('shop-buy-btn').disabled,true);assert.match(h.byId('shop-lack').textContent,/280 Дж/);
    assert.equal(h.read().joules,200);assert.deepEqual(h.read().owned,[]);assert.equal(h.writes,0);
  },'/shop?tab=collection');
});

test('shelf inspection counts different objects once toward the existing quest and grants nothing by itself',async()=>{
  const now=new Date(),day=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
  await fixture({owned:['cradle','tuning','magnet'],shelf:['cradle','tuning','magnet'],capsules:0,quests:{day,ids:['play','formula','model'],progress:{},claimed:[]}},async h=>{
    for(const id of ['cradle','cradle','tuning','magnet']){await h.click('collection-shelf-'+id);await h.click('artifact-modal-close-btn');}
    assert.equal(h.read().quests.progress.play,3);assert.equal(h.read().quests.seen.play.length,3);assert.equal(h.read().joules,200);assert.equal(h.read().xp,0);
  },'/shop?tab=collection');
});

test('buying through the missing filter restores focus when its old card disappears',async()=>{
  await fixture({},async h=>{
    await h.click('collection-filter-missing');await h.click('collection-artifact-slot-tuning');await h.click('shop-buy-btn');
    assert.equal(h.byId('collection-artifact-slot-tuning'),null);await h.click('artifact-modal-close-btn');
    assert.equal(document.activeElement.getAttribute('data-testid'),'shop-tab-collection');assert.equal(h.read().joules,80);
  },'/shop?tab=collection');
});
