const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const source=fs.readFileSync(path.join(__dirname,'../src/online/social.ts'),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
function load(client){const box={exports:{},require:name=>name==='./supabase'?{supabase:client}:{}};vm.runInNewContext(code,box);return box.exports}
const input={backgroundId:'plain',bannerId:'world_tree_green',borderId:'classic',nameColorId:'name_ivory',tagColorId:'tag_silver',nameplateId:'classic',motto:'Together.'};
(async()=>{
 let calls=[];const good=load({rpc:async(name,args)=>{calls.push({name,args});return {data:[{background_id:args.p_background_id}],error:null}}});
 assert.equal((await good.updateGuildAppearance({...input,backgroundId:'forest_sanctum'})).background_id,'forest_sanctum');assert.equal(calls.length,1);assert.equal(calls[0].name,'update_guild_appearance_with_background_v3');
 calls=[];const old=load({rpc:async name=>{calls.push(name);return name.endsWith('_v52')?{data:[{banner_id:'world_tree_green'}],error:null}:{data:null,error:{code:'PGRST202'}}}});
 await assert.rejects(()=>old.updateGuildAppearance(input));assert.equal(calls.length,1,'Missing current RPC must fail closed, never bypass event entitlement checks through legacy RPC');
 calls=[];await assert.rejects(()=>old.updateGuildAppearance({...input,backgroundId:'forest_sanctum'}));assert.equal(calls.length,1,'never silently drop a scenic background save');
 const empty=load({rpc:async()=>({data:[],error:null})});await assert.rejects(()=>empty.updateGuildAppearance(input),/not confirmed/);
 const selects=[];
 const mockTable={select(fields){
  selects.push(fields);
  return {order:()=>({limit:async()=>fields.includes('background_id')
   ?{error:{code:'42703',message:'column background_id does not exist'}}
   :{data:[{id:'guild'}],error:null}})};
 }};
 const read=load({from:()=>mockTable});
 assert.equal((await read.browseGuilds())[0].id,'guild');assert.equal(selects.length,2);assert.ok(!selects[1].includes('background_id'));
 console.log('PASS: guild background RPC round trip, missing-deployment rejection and no false save success');
})().catch(error=>{console.error(error);process.exitCode=1});
