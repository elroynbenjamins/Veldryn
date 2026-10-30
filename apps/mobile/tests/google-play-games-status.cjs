const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');

const source=fs.readFileSync(path.join(__dirname,'../src/online/play-games.ts'),'utf8');
const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function instance({platform='android',projectId='1011264688445',native=null}={}){
 const calls={status:0,signIn:0};
 const wrapped=native===null?null:{
  getStatus:async()=>{calls.status++;return native.getStatus();},
  signIn:async()=>{calls.signIn++;return native.signIn();},
 };
 const ctx={exports:{},process:{env:{EXPO_PUBLIC_GOOGLE_PLAY_GAMES_PROJECT_ID:projectId}},
  require:name=>{
   if(name==='expo')return {requireOptionalNativeModule:()=>wrapped};
   if(name==='react-native')return {Platform:{OS:platform}};
   throw Error('Unexpected module '+name);
  }};
 vm.runInNewContext(output,ctx,{filename:'play-games.js'});
 return {...ctx.exports,calls};
}
(async()=>{
 let count=0;
 const unsupported=instance({platform:'ios'});
 assert.equal((await unsupported.inspectPlayGamesConnection()).reason,'platform');count++;
 const notConfigured=instance({projectId:''});
 assert.equal((await notConfigured.inspectPlayGamesConnection()).reason,'configuration');count++;
 const missingNative=instance();
 assert.equal((await missingNative.inspectPlayGamesConnection()).reason,'native');count++;
 const connected=instance({native:{getStatus:async()=>({authenticated:true,playerId:'p123',displayName:'Aster'}),signIn:async()=>({authenticated:true})}});
 const yes=await connected.inspectPlayGamesConnection();
 assert.equal(yes.status,'connected');assert.equal(yes.playerId,'p123');assert.equal(yes.displayName,'Aster');
 assert.equal(connected.calls.signIn,0,'status read must never prompt for Play Games login');
 assert.equal(connected.calls.status,1);count++;
 const disconnected=instance({native:{getStatus:async()=>({authenticated:false}),signIn:async()=>({authenticated:true})}});
 assert.equal((await disconnected.inspectPlayGamesConnection()).status,'disconnected');
 assert.equal(disconnected.calls.signIn,0);
 assert.equal((await disconnected.signInPlayGames()).authenticated,true);
 assert.equal(disconnected.calls.signIn,1,'only explicit connect requests should initiate sign-in');count++;
 const failed=instance({native:{getStatus:async()=>{throw Error('service unavailable');},signIn:async()=>({authenticated:false})}});
 const error=await failed.inspectPlayGamesConnection();
 assert.equal(error.status,'error');assert.match(error.message,/unavailable/);count++;
 console.log(`PASS: ${count} Google Play Games status, configuration and no-prompt checks`);
})().catch(error=>{console.error(error);process.exitCode=1;});
