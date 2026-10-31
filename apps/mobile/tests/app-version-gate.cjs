const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
function load(file,mocks,extra={}){
 const module={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,{module,exports:module.exports,require:name=>{if(name in mocks)return mocks[name];throw new Error('Unexpected import '+name);},setTimeout,clearTimeout,AbortController,Headers,Request,process:{env:{EXPO_PUBLIC_SUPABASE_URL:'https://test.invalid',EXPO_PUBLIC_SUPABASE_ANON_KEY:'test',EXPO_PUBLIC_COOP_API_URL:'https://test.invalid',EXPO_PUBLIC_COOP_ROGUELITE_V1:'true'}},...extra},{filename:file});
 return module.exports;
}
async function main(){
 const core=load('src/core/app-release-policy.ts',{});
 const store=new Map();let offline=false,reads=0;
 let row={latest_version:'1.0.0',minimum_version:'1.0.0',force_after:null,maintenance_mode:false};
 const mocks={
  'react-native':{Platform:{OS:'android'},Linking:{}},
  '@react-native-async-storage/async-storage':{getItem:async key=>store.get(key)??null,setItem:async(key,value)=>{store.set(key,value);}},
  './supabase':{supabasePublicEndpoint:'https://test.invalid',supabase:{from:()=>{const query={select:()=>query,eq:()=>query,abortSignal:()=>query,maybeSingle:async()=>{reads++;if(offline)throw new Error('offline');return {data:row};}};return query;}}},
  '../app-build':{APP_BUILD_INFO:{version:'0.9.5',releaseChannel:'production'}},
  '../core/app-release-policy':core,
 };
 let gate=load('src/online/app-version-gate.ts',mocks);
 assert.equal((await gate.fetchAppVersionGate()).updateRequired,true);
 assert.equal(store.size,1);
 offline=true;gate=load('src/online/app-version-gate.ts',mocks);
 let result=await gate.fetchAppVersionGate();assert.equal(result.updateRequired,true,'restart + failed network cannot bypass remembered minimum');assert.equal(result.verificationFailed,true);
 store.clear();gate=load('src/online/app-version-gate.ts',mocks);result=await gate.fetchAppVersionGate();assert.equal(result.policy,null);assert.equal(result.verificationFailed,true,'fresh install must show retry');
 offline=false;row={...row,minimum_version:'0.1.0'};result=await gate.fetchAppVersionGate();assert.equal(result.updateRequired,false,'verified rollback clears remembered block');
 const before=reads;await Promise.all([gate.fetchAppVersionGate(),gate.fetchAppVersionGate()]);assert.equal(reads,before+1,'overlapping checks share a request');
 await gate.rememberAppPolicy({...row,minimum_version:'1.0.0'});offline=true;assert.equal((await gate.fetchAppVersionGate()).updateRequired,true,'server rejection also persists');
 assert.throws(()=>core.appPolicyFromRow({...row,minimum_version:'bad'}));
 const policy=core.appPolicyFromRow({...row,force_after:new Date(1000).toISOString()});assert.equal(core.evaluateAppPolicy('0.9.5',policy,999).updateRequired,false);assert.equal(core.evaluateAppPolicy('0.9.5',policy,1000).updateRequired,true);assert.equal(core.requiredAppVersion(policy,1000),'1.0.0');
 let sent;const transport=load('src/online/versioned-fetch.ts',{'react-native':mocks['react-native'],'../app-build':mocks['../app-build']},{fetch:async(input,init)=>{sent=init.headers;return new Response(JSON.stringify({error:'app_update_required',policy:row}),{status:426});}});
 let blocks=0;const remove=transport.onReleaseBlocked(()=>blocks++);await transport.versionedFetch('https://test.invalid',{headers:{authorization:'Bearer valid'}});assert.equal(sent.get('x-app-version'),'0.9.5');assert.equal(sent.get('x-app-platform'),'android');assert.equal(sent.get('authorization'),'Bearer valid');assert.equal(blocks,1);remove();
 // HTTP 426 must retain durable command receipts for retry after updating.
 class CommandError extends Error{constructor(message,definitive){super(message);this.definitive=definitive;}}
 const session={user:{id:'account'},access_token:'valid'};
 const services={
  './versioned-fetch':{versionedFetch:async()=>new Response(JSON.stringify({error:'app_update_required'}),{status:426})},
  './supabase':{supabase:{auth:{getSession:async()=>({data:{session}})}}},
  '@react-native-async-storage/async-storage':mocks['@react-native-async-storage/async-storage'],
  '../core/online-snapshot-cache':{peekOnlineSnapshot:()=>null},
  '../core/session-pending-store':{SessionPendingStore:class{constructor(storage){this.storage=storage;}read(){return this.storage.read();}write(value){return this.storage.write(value);}}},
 };
 const gameplay=load('src/online/gameplay.ts',{...services,'../core/online-game-repository':{OnlineCommandError:CommandError,OnlineGameRepository:class{constructor(account,transport){this.transport=transport;}}}});
 await assert.rejects(gameplay.createOnlineGameRepository('account').transport.send({}),error=>error.definitive===false);
 const coop=load('src/online/coop-client.ts',{...services,'../core/coop-command-journal':{CoopRequestError:CommandError,CoopCommandJournal:class{}}});
 await assert.rejects(coop.coopClient.entry(),error=>error.definitive===false);
 const releaseCoop=load('src/online/coop-client.ts',{...services,'./supabase':{...services['./supabase'],supabasePublicEndpoint:'https://production.invalid'},'../core/coop-command-journal':{CoopRequestError:CommandError,CoopCommandJournal:class{}}},{__DEV__:false,process:{env:{}}});
 assert.equal(releaseCoop.coopOnlineConfigured,true,'release builds retain the deployed co-op endpoint when EAS variables are absent');
 assert.equal(releaseCoop.coopLiveReadyEnabled,true,'release builds retain deployed Live matchmaking when EAS variables are absent');
 // A delayed older policy read cannot undo a newer backend rejection.
 offline=false;row={...row,minimum_version:'0.1.0'};gate=load('src/online/app-version-gate.ts',mocks);
 await gate.fetchAppVersionGate();
 const previous=mocks['./supabase'].supabase.from;let release;
 mocks['./supabase'].supabase.from=()=>{const query={select:()=>query,eq:()=>query,abortSignal:()=>query,maybeSingle:()=>new Promise(resolve=>{release=resolve;})};return query;};
 const stale=gate.fetchAppVersionGate();await new Promise(setImmediate);
 await gate.rememberAppPolicy({...row,minimum_version:'1.0.0'});release({data:row});assert.equal((await stale).updateRequired,true);mocks['./supabase'].supabase.from=previous;
 const React=require('react'),{act,create}=require('react-test-renderer');global.IS_REACT_ACT_ENVIRONMENT=true;
 const native={SafeAreaView:'SafeAreaView',View:'View',Text:'Text',Pressable:'Pressable',ActivityIndicator:'ActivityIndicator',StyleSheet:{create:styles=>styles}};
 const uiMocks={react:React,'react/jsx-runtime':require('react/jsx-runtime'),'react-native':native,'../theme/theme':{C:{},radii:{},spacing:{},typography:{}},'../theme/ThemeContext':{useGameTheme:()=>({})},'../i18n/GameLanguageProvider':{useGameLanguage:()=> 'en'},'../i18n/shared':{sharedText:(_,text)=>text}};
 const button=load('src/components/GameButton.tsx',uiMocks);
 const {UpdateRequiredScreen}=load('src/components/UpdateRequiredScreen.tsx',{...uiMocks,'./GameButton':button});
 let tree,finish,calls=0;const retry=new Promise(resolve=>{finish=resolve;});
 await act(async()=>{tree=create(React.createElement(UpdateRequiredScreen,{verificationError:true,title:'Unable to check for updates',message:'Retry online',currentVersion:'0.9.5',onUpdate:()=>{throw Error('No store button on failed verification');},onRetry:()=>{calls++;return retry;}}));});
 assert.equal(tree.root.findAllByType('Pressable').length,1,'verification retry offers no continue/dismiss');
 await act(async()=>{tree.root.findByType('Pressable').props.onPress();});assert.equal(calls,1);assert.equal(tree.root.findByType('Pressable').props.accessibilityState.busy,true);assert.equal(tree.root.findAllByType('ActivityIndicator').length,1);
 await act(async()=>{finish();await retry;});assert.equal(tree.root.findByType('Pressable').props.disabled,false);await act(async()=>{tree.unmount();});
 console.log('app version gate: persisted enforcement, fresh-install retry, rollback, concurrency, forced date and transport passed');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
