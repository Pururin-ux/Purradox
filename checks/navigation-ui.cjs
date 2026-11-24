// Real Shell/NAV/Shop/game/project kit/router. Transport is not used; motion and
// sound are isolated. JSDOM checks route/state behavior, not responsive CSS.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createRequire}=require('node:module'),{test}=require('node:test');
const frontend=path.resolve(__dirname,'../source/frontend'),req=createRequire(path.join(frontend,'package.json'));
const {JSDOM}=req('jsdom'),dom=new JSDOM('<div id="root"></div>',{url:'http://nav.test/'});
global.window=dom.window;global.document=dom.window.document;
for(const name of ['HTMLElement','HTMLInputElement','SVGElement','Element','Node','NodeFilter','CustomEvent','MutationObserver','DocumentFragment'])global[name]=dom.window[name];
global.getComputedStyle=dom.window.getComputedStyle.bind(dom.window);
global.requestAnimationFrame=callback=>setTimeout(callback,0);global.cancelAnimationFrame=clearTimeout;
global.IS_REACT_ACT_ENVIRONMENT=true;
const React=req('react'),{act}=React,{createRoot}=req('react-dom/client');
const {MemoryRouter,Routes,Route,useLocation,useNavigate}=req('react-router-dom'),{transformSync}=req('@babel/core');
const KEY='kvant_game_v1',silent=()=>{};
const slug='ravnouskorennoe-dvizhenie';
const catalog={lessons:[{slug,taskIds:['t1','t2','t3'].map(id=>slug+':'+id)}]};
const tags=new Map(),motion=new Proxy({},{get:(_,tag)=>{if(!tags.has(tag))tags.set(tag,React.forwardRef(({children,initial,animate,exit,transition,layout,whileTap,whileHover,...props},ref)=>React.createElement(tag,{...props,ref},children)));return tags.get(tag);}});

async function fixture(route,run,{bare=false}={}){
  const data=new Map(),fx=[];let writes=0,location,navigate;
  // Use a loaded catalog matching the saved metadata. Navigation itself must
  // not write or award; the catalog migration has its own integration checks.
  data.set(KEY,JSON.stringify({joules:345,xp:80,capsules:2,owned:['cradle','tuning'],shelf:['cradle','tuning'],lessonSlugs:catalog.lessons.map(row=>row.slug),allTaskIds:catalog.lessons.flatMap(row=>row.taskIds)}));
  const storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>{writes++;data.set(key,value);}};
  const modules=new Map();
  function sourceModule(input){
    const file=[input,input+'.jsx',input+'.js'].find(file=>fs.existsSync(file));assert.ok(file,'module '+input);
    if(modules.has(file))return modules.get(file).exports;
    const module={exports:{}};modules.set(file,module);
    const code=transformSync(fs.readFileSync(file,'utf8'),{filename:file,babelrc:false,configFile:false,presets:[[req.resolve('@babel/preset-react'),{runtime:'automatic'}]],plugins:[req.resolve('@babel/plugin-transform-modules-commonjs')]}).code;
    function resolve(name){
      if(name==='@/lib/sound')return {useSfx:()=>silent,haptic:silent,useMuted:()=>true,toggleMute:silent};
      if(name==='@/lib/hooks')return {LESSON_SLUG:slug,useCatalog:()=>({data:catalog})};
      if(name==='framer-motion')return {motion,AnimatePresence:({children})=>children,useReducedMotion:()=>true,useSpring:()=>React.useMemo(()=>({set:silent}),[]),useMotionValueEvent:silent};
      return name.startsWith('@/')?sourceModule(path.join(frontend,'src',name.slice(2))):name.startsWith('.')?sourceModule(path.resolve(path.dirname(file),name)):req(name);
    }
    vm.runInNewContext(code,{module,exports:module.exports,require:resolve,console,window,document,URLSearchParams:dom.window.URLSearchParams,localStorage:storage,setTimeout,clearTimeout,requestAnimationFrame,cancelAnimationFrame},{filename:file});
    return module.exports;
  }
  const Shop=sourceModule(path.join(frontend,'src/variants/a/ShopA.jsx')).default;
  const {ShellA}=sourceModule(path.join(frontend,'src/variants/a/ShellA.jsx'));
  sourceModule(path.join(frontend,'src/lib/game.js')).onFx(event=>fx.push(event));
  const root=createRoot(document.getElementById('root'));
  function Location(){location=useLocation();navigate=useNavigate();return null;}
  const byId=id=>document.querySelector('[data-testid="'+id+'"]');
  const flush=()=>act(()=>new Promise(resolve=>setTimeout(resolve,0)));
  try{
    await act(()=>root.render(React.createElement(MemoryRouter,{initialEntries:[route]},React.createElement(React.Fragment,null,React.createElement(Location),React.createElement(Routes,null,
      React.createElement(Route,{path:'/shop',element:React.createElement(Shop)}),
      React.createElement(Route,{path:'*',element:React.createElement(ShellA,{bare},React.createElement('h1',null,'Проверка маршрута'))})
    )))));await flush();
    await run({byId,fx,raw:()=>data.get(KEY),read:()=>JSON.parse(data.get(KEY)),get writes(){return writes;},get location(){return location;},
      async click(id) {
        const node = byId(id);
        assert.ok(node, 'control ' + id);
        await act(() => {
          if (node.getAttribute('role') === 'tab') {
            node.dispatchEvent(new dom.window.MouseEvent('mousedown', { bubbles: true, button: 0 }));
          }
          node.click();
        });
        await flush();
      },
      async history(delta){await act(()=>navigate(delta));await flush();}
    });
  }finally{await act(()=>root.unmount());await new Promise(resolve=>setTimeout(resolve,0));}
}

function selected(h,id){
  for(const prefix of ['nav','tab']){
    const surfaceId = prefix === 'tab' && id === 'collection' ? 'shop' : id;
    const node=h.byId(prefix+'-'+surfaceId+'-btn');assert.ok(node,'destination '+id);
    assert.equal(node.getAttribute('aria-current'),'page');assert.ok(node.classList.contains('active'));
    const nav=node.closest('nav');assert.equal(nav.querySelectorAll('[aria-current="page"]').length,1);
    assert.equal(nav.querySelectorAll('a.active').length,1);
  }
}

test('direct collection entry selects Collection on desktop and Shop on mobile',async()=>{
  await fixture('/shop?tab=collection',async h=>{
    const destinations = selector => [...document.querySelectorAll(selector + ' a')].map(link => link.getAttribute('href'));
    assert.deepEqual(destinations('.desktop-nav'), ['/learn','/practice','/review','/shop','/shop?tab=collection','/ct']);
    assert.deepEqual(destinations('.mobile-nav'), ['/learn','/practice','/review','/shop','/ct']);
    selected(h,'collection');assert.equal(h.byId('shop-tab-collection').getAttribute('aria-selected'),'true');
    assert.notEqual(h.byId('nav-shop-btn').getAttribute('aria-current'),'page');assert.equal(h.writes,0);
  });
});

test('shop and collection clicks plus history preserve tab, unique current state and all resources',async()=>{
  await fixture('/shop?tab=collection',async h=>{
    const original=h.raw();await h.click('nav-shop-btn');selected(h,'shop');assert.equal(h.location.search,'');
    assert.equal(h.byId('shop-tab-store').getAttribute('aria-selected'),'true');
    await h.click('nav-collection-btn');selected(h,'collection');assert.equal(h.location.search,'?tab=collection');
    await h.history(-1);selected(h,'shop');assert.equal(h.byId('shop-tab-store').getAttribute('aria-selected'),'true');
    await h.history(1);selected(h,'collection');assert.equal(h.byId('shop-tab-collection').getAttribute('aria-selected'),'true');
    assert.equal(h.raw(),original);assert.equal(h.writes,0);assert.equal(h.fx.length,0);
  });
});

test('short mobile labels retain full destination names and do not change progress when followed',async()=>{
  await fixture('/shop',async h=>{
    const original=h.raw();
    assert.equal(h.byId('tab-collection-btn'), null);
    assert.equal(h.byId('tab-shop-btn').textContent,'Магазин');
    assert.equal(h.byId('tab-textbook-btn').textContent,'Уроки');assert.equal(h.byId('tab-trainer-btn').textContent,'Задачи');
    await h.click('shop-tab-collection');selected(h,'collection');
    await h.click('tab-trainer-btn');selected(h,'trainer');assert.equal(h.location.pathname,'/practice');
    assert.equal(h.raw(),original);assert.equal(h.writes,0);assert.equal(h.fx.length,0);
  });
});

for(const [route,wanted]of [['/shop?tab=unknown','shop'],['/shop?tab=collection&filter=rare','collection'],['/shop?tab=%63ollection','collection'],['/ct','ct-demo']]){
  test('current destination matches the real page for '+route,async()=>{
    await fixture(route,async h=>{selected(h,wanted);if(wanted==='shop'||wanted==='collection')assert.equal(h.byId('shop-tab-'+(wanted==='shop'?'store':'collection')).getAttribute('aria-selected'),'true');assert.equal(h.writes,0);});
  });
}

test('a bare exam shell keeps navigation and HUD absent',async()=>{
  await fixture('/ct',async h=>{assert.equal(document.querySelector('header'),null);assert.equal(document.querySelector('nav'),null);assert.equal(h.byId('hud-quests-button'),null);assert.equal(h.writes,0);},{bare:true});
});
