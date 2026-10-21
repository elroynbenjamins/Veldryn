const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ts=require('typescript'),React=require('react'),{act,create}=require('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject}};
function load(file,dependencies){
 const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const sandbox={exports:{},Error,Promise,console:{warn:()=>{}},require:name=>dependencies[name]??(name==='react'?React:name==='react/jsx-runtime'?require(name):{})};
 vm.runInNewContext(code,sandbox);return sandbox.exports;
}
const native={Pressable:'Pressable',Text:'Text',ActivityIndicator:'ActivityIndicator',StyleSheet:{create:styles=>styles},AppState:{currentState:'active',addEventListener:()=>({remove(){}})}};
const theme={'react-native':native,'../theme/ThemeContext':{useGameTheme:()=>({text:'#fff',bg:'#000',good:'#0f0',primaryButtonText:'#fff'})},'../theme/theme':{radii:{},spacing:{},typography:{}}};
async function buttons(){
 for(const [name,label,busy] of [['GameButton','title','loading'],['SocialActionButton','label','busy']]){
  const Button=load(`src/components/${name}.tsx`,theme)[name];let renderer,pending=deferred(),calls=0;
  const props={[label]:'Save',onPress:()=>{calls++;return pending.promise}};
  await act(async()=>{renderer=create(React.createElement(Button,props))});
  const press=()=>renderer.root.findByType('Pressable').props;
  await act(async()=>{const handler=press().onPress;handler();handler()});
  assert.equal(calls,1,`${name} rejects same-tick duplicate presses`);
  assert.equal(press().accessibilityState.busy,true);assert.equal(press().disabled,true);
  assert.equal(renderer.root.findAllByType('ActivityIndicator').length,1);
  await act(async()=>{pending.resolve();await pending.promise});
  assert.equal(press().accessibilityState.busy,false);assert.equal(press().disabled,false);
  pending=deferred();await act(async()=>press().onPress());
  await act(async()=>{pending.reject(Error('offline'));await pending.promise.catch(()=>{})});
  assert.equal(press().disabled,false,`${name} recovers after rejection`);
  await act(async()=>renderer.update(React.createElement(Button,{...props,[busy]:true})));
  assert.equal(renderer.root.findAllByType('ActivityIndicator').length,1);
  await act(async()=>press().onPress());assert.equal(calls,2,'Explicit busy cannot submit again');
  await act(async()=>renderer.unmount());
 }
}
async function commandBusy(){
 let latest,request=deferred(),calls=0;
 const snapshot={accountId:'a',version:1,state:null};
 const repo={accountId:'a',snapshot,refresh:async()=>snapshot,hasPending:async()=>false,execute:()=>{calls++;return request.promise}};
 const {useOnlineGame}=load('src/online/useOnlineGame.ts',{
  'react-native':native,'./AuthSessionProvider':{useAuthSession:()=>({session:{user:{id:'a'}}})},
  './gameplay':{serverGameplayEnabled:true,createOnlineGameRepository:()=>repo},'./supabase':{supabase:null},
 });
 function Harness(){latest=useOnlineGame();return null;}
 let renderer;await act(async()=>{renderer=create(React.createElement(Harness))});
 let saving;await act(async()=>{saving=latest.execute({type:'claim'});await assert.rejects(latest.execute({type:'claim'}),/already being saved/)});
 assert.equal(calls,1);assert.equal(latest.busy,true,'Rejected overlap cannot clear the first request spinner');
 await act(async()=>{request.resolve(snapshot);await saving});assert.equal(latest.busy,false);
 request=deferred();let failure;await act(async()=>{failure=latest.execute({type:'claim'}).catch(error=>error)});
 await act(async()=>{request.reject(Error('offline'));await failure});assert.equal(latest.busy,false);assert.equal(latest.error,'offline');
 await act(async()=>renderer.unmount());
}
function wiring(){
 const files=[];function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else if(file.endsWith('.tsx'))files.push(file);}}
 walk(path.join(__dirname,'../src'));files.push(path.join(__dirname,'../App.tsx'));
 for(const file of files){const source=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);function visit(node){
  if(ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node)){
   const tag=node.tagName.getText(ast),attrs=node.attributes.properties;
   if(['GameButton','SocialActionButton'].includes(tag)){
    const press=attrs.find(prop=>prop.name?.getText(ast)==='onPress')?.initializer?.expression;
    if(press&&ts.isArrowFunction(press)&&ts.isVoidExpression(press.body))assert.ok(attrs.some(prop=>prop.name?.getText(ast)===(tag==='GameButton'?'loading':'busy')),`${file} discards its action promise without loading feedback`);
   }
  }ts.forEachChild(node,visit);
 }visit(ast);}
 const app=fs.readFileSync(path.join(__dirname,'../App.tsx'),'utf8');
 assert.ok(!app.includes("pointerEvents={serverGameplayEnabled&&online.busy?'none':'auto'}"),'Network saves must not freeze scrolling and navigation');
 assert.ok(!app.includes("showAlert('Online action'"),'Routine command failures use inline feedback');
 assert.ok(app.includes('message={onlineActionError}'),'Online failures remain visible inline');
}
(async()=>{await buttons();await commandBusy();wiring();console.log('PASS: online loading indicators, duplicate suppression, rejection recovery, overlapping-command busy state and non-blocking app feedback');})().catch(error=>{console.error(error);process.exitCode=1});
