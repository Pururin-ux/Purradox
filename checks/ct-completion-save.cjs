const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createRequire}=require('node:module'),{test}=require('node:test');
const frontend=path.resolve(__dirname,'../source/frontend'),req=createRequire(path.join(frontend,'package.json'));
const {transformSync}=req('@babel/core'),React=req('react'),{act}=React,{createRoot}=req('react-dom/client'),{JSDOM}=req('jsdom');
test('failed completion save keeps the answer sheet; retry persists without another submit or restart',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'http://ct-save.test/'}),prior={window:global.window,document:global.document,act:global.IS_REACT_ACT_ENVIRONMENT};
 global.window=dom.window;global.document=dom.window.document;global.IS_REACT_ACT_ENVIRONMENT=true;
 const modules=new Map();let latest,requests=0,attempts=0,allowed=false;
 function source(relative){
  if(modules.has(relative))return modules.get(relative).exports;
  const filename=path.join(frontend,'src',relative),module={exports:{}};modules.set(relative,module);
  const code=transformSync(fs.readFileSync(filename,'utf8'),{filename,babelrc:false,configFile:false,plugins:[req.resolve('@babel/plugin-transform-modules-commonjs')]}).code;
  const requires=name=>name==='react'?React:name==='@/lib/hooks'?{}:name.startsWith('@/')?source(name.slice(2)+'.js'):name.startsWith('./')?source(path.posix.join(path.posix.dirname(relative),name)+'.js'):req(name);
  vm.runInNewContext(code,{module,exports:module.exports,require:requires,window,document,setInterval,clearInterval,Date},{filename});return module.exports;
 }
 const {useCtExam}=source('components/shared/useCtExam.js');
 const data={variantId:'01',minutes:210,tasks:[{id:'A1',code:'А1',part:'A',kind:'single',options:['1','2','3','4','5']}]};
 const submit=async()=>{requests++;return{correct:1,total:1};};
 const onFinish=()=>{attempts++;return allowed;};
 const Probe=()=>{latest=useCtExam(data,{submit,onFinish});return null;};
 const root=createRoot(document.getElementById('root'));
 try{
  await act(()=>root.render(React.createElement(Probe)));await act(()=>latest.start());await act(()=>latest.setAnswer('A1',2));await act(()=>latest.finish());
  assert.equal(latest.stage,'result');assert.equal(latest.completionPending,true);assert.ok(latest.saveError);
  const key=window.localStorage.key(0);assert.equal(JSON.parse(window.localStorage.getItem(key)).value.answers.A1,2);
  await act(()=>latest.restart());assert.equal(latest.stage,'result');assert.ok(window.localStorage.getItem(key));
  allowed=true;await act(()=>latest.retrySave());assert.equal(latest.saveError,null);assert.equal(latest.completionPending,false);assert.equal(window.localStorage.getItem(key),null);
  assert.equal(requests,1);assert.equal(attempts,2);
 }finally{await act(()=>root.unmount());dom.window.close();global.window=prior.window;global.document=prior.document;global.IS_REACT_ACT_ENVIRONMENT=prior.act;}
});
