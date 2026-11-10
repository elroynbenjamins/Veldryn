const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/online/coop-entry-source.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
let account='A',calls=0,revision=0,returnRun=false;
const saved=new Map();
class MemoryBackedCatalog{
 async read(key){return saved.get(key);}
 async save(key,dungeons){saved.set(key,{savedAtMs:Date.now(),dungeons});}
}
const supabase={auth:{getSession:async()=>({data:{session:{user:{id:account}}}})}};
const coopClient={entry:async()=>{calls++;return {dungeons:[{id:'EXP_001',name:'Vault',minLevel:25,syncLevel:25,available:true}],loadouts:[{id:'equipped',characterId:'CHAR_1'}],rewardBudget:{charges:2},...(returnRun?{activeRun:{runId:'live-run'}}:{})};}};
const mocks={
 '@react-native-async-storage/async-storage':{getItem:async()=>null,setItem:async()=>{}},
 './coop-client':{coopClient},'./supabase':{supabase,supabasePublicEndpoint:'https://production'},
 '../core/coop-dungeon-browse-cache':{CoopDungeonBrowseCache:MemoryBackedCatalog,coopEntryMutationRevision:()=>revision},
 '../core/coop-qmode':{presentQModeRun:value=>value},
 '../core/coop-event-expeditions':{presentEventExpeditionRun:value=>value},
};
const output={};
vm.runInNewContext(code,{exports:output,require:name=>{if(!(name in mocks))throw Error('Unexpected import '+name);return mocks[name]},Promise,Map,Date,console});
const source=output.realCoopEntrySource;
async function test(){
 const key={characterId:'CHAR_1',characterLevel:25};
 const first=await source.load(key);
 assert.equal(calls,1);
 assert.equal(first.loadouts.length,1);
 const cache=await source.cachedDungeons('CHAR_1');
 assert.equal(cache.dungeons.length,1);
 assert.equal(saved.size,1);
 assert.equal(JSON.stringify(cache).includes('loadouts'),false,'disk cache must not contain verified loadouts');
 await source.load(key);assert.equal(calls,1,'reopen within freshness window avoids GET /coop/entry');
 await source.load({...key,force:true});assert.equal(calls,2,'explicit refresh bypasses memory');
 revision++;await source.load(key);assert.equal(calls,3,'game mutation invalidates entry snapshot');
 await source.load({...key,characterLevel:26});assert.equal(calls,4,'level-up refreshes dungeon availability');
 account='B';assert.equal(await source.cachedDungeons('CHAR_1'),undefined,'account B cannot view account A cache');
 await source.load(key);assert.equal(calls,5,'new account cannot reuse another account entry');
 account='A';returnRun=true;revision++;
 await source.load({...key,force:true});assert.equal(calls,6);
 await source.load(key);assert.equal(calls,7,'active run requires a new authorized entry read');
 console.log('PASS co-op entry warm cache, forced refresh, account isolation, level-up and mutation invalidation');
}
test().catch(error=>{console.error(error);process.exitCode=1});
