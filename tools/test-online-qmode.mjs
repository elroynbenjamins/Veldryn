// Full engine + actual PostgreSQL transactions, only on the disposable project.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {randomUUID,randomBytes} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {root,backend,project as production} from './online-context.mjs';
const target=JSON.parse(fs.readFileSync(path.join(root,'tools/.codex-tmp/fresh-project.json'),'utf8'));
if(target.id===production||target.id!=='byxmmiobxaphcozutotq'||target.name!=='Veldryn Migration Validation 20260912')throw new Error('Refusing non-test project');
const cli=(args)=>execFileSync(process.execPath,['node_modules/supabase/dist/supabase.js',...args],{cwd:backend,windowsHide:true,encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:8*1024*1024});
const keys=JSON.parse(cli(['projects','api-keys','--project-ref',target.id,'--output','json']));
const service=keys.find(row=>row.name==='service_role').api_key,anon=keys.find(row=>row.name==='anon').api_key;
const base=`https://${target.id}.supabase.co`;
async function api(url,body,token=service,method='POST'){
 const response=await fetch(base+url,{method,headers:{apikey:token===service?service:anon,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await response.json();if(!response.ok)throw new Error(data.message??data.msg??data.error_description??(typeof data.error==='string'?data.error:'request_failed'));return data;
}
const rpc=(name,args)=>api('/rest/v1/rpc/'+name,args);
const require=createRequire(path.join(backend,'package.json'));
const {OnlineQModeRuntime}=require('./dist/online/backend/online/qmode-runtime.js');
const {createCharacter,newGame}=require('./dist/online/apps/mobile/src/core/game.js');
const {noviceItemId,noviceSetFor}=require('./dist/online/apps/mobile/src/content/novice-sets.js');
const {deriveOnlineCoopLoadout,onlineCoopLoadoutHash,assessOnlineCoopLoadout}=require('./dist/online/backend/online/coop-loadout.js');
const report={checkedAt:new Date().toISOString(),project:target.id,checks:[],status:'RUNNING'};
const accounts=[];
function pass(check){report.checks.push({check,status:'PASS'});console.log('PASS '+check);}
async function rejects(action,expected){let message;try{await action();}catch(error){message=error.message;}assert.ok(message?.toLowerCase().includes(expected.toLowerCase()),`Expected ${expected}, got ${message??'success'}`);}
function testQuery(sql){const file=path.join(root,'tools/.codex-tmp/qmode-test.sql');fs.writeFileSync(file,sql);return cli(['db','query','--linked','--project-ref',target.id,'--file',file,'--output','json']);}
try{
 for(const [index,classId] of ['IRONWARDEN','WAYFINDER','RAVAGER','DAWNKEEPER'].entries()){
  const email=`qmode-${randomUUID()}@example.invalid`,password=randomBytes(24).toString('hex');
  const account=await api('/auth/v1/admin/users',{email,password,email_confirm:true});accounts.push(account.id);
  const auth=await api('/auth/v1/token?grant_type=password',{email,password},anon);
  const state=createCharacter(newGame(Date.now()),classId,'Qmode '+String.fromCharCode(65+index));state.character.id=randomUUID();state.character.level=25;
  state.character.equipment=Object.fromEntries(noviceSetFor(classId).slots.map(slot=>[slot,noviceItemId(classId,slot)]));
  await rpc('load_online_game_server_v1',{p_account_id:account.id});
  await rpc('commit_online_game_server_v1',{p_account_id:account.id,p_expected_version:0,p_expected_gold:null,p_request_id:'fixture-create-01',p_request_hash:'f'.repeat(64),p_response:{state,version:1,accountId:account.id,serverNow:Date.now()},p_contributions:[]});
  const record=deriveOnlineCoopLoadout(account.id,state,1);
  if(index)await rpc('publish_online_coop_loadout_server_v1',{p_account_id:account.id,p_game_version:1,p_record:record,p_snapshot_hash:onlineCoopLoadoutHash(record),p_readiness:assessOnlineCoopLoadout(record).readiness,p_share_echo:true,p_request_id:'fixture-publish-01'});
  if(!index)Object.assign(report,{controllerCharacter:state.character.id});
  accounts[index]={id:account.id,token:auth.access_token,state};
 }
 const actor=accounts[0],http=process.argv.includes('--http');
 const tokenFor=id=>accounts.find(row=>row.id===id)?.token;
 const runtime=http?{
  start:(id,request)=>{const {mode,...body}=request;return api('/functions/v1/coop/qmode',body,tokenFor(id));},
  load:(id,runId)=>api('/functions/v1/coop/runs/'+runId,undefined,tokenFor(id),'GET'),
  choose:(id,runId,body)=>api('/functions/v1/coop/runs/'+runId+'/choose',body,tokenFor(id)),
 }:new OnlineQModeRuntime({rpc,randomId:randomUUID});
 report.transport=http?'deployed authenticated HTTP':'domain + real RPC';
 if(http){
  const unauth=await fetch(base+'/functions/v1/coop/entry',{headers:{apikey:anon}});assert.equal(unauth.status,401);
  const entry=await api('/functions/v1/coop/entry',undefined,actor.token,'GET');assert.equal(entry.loadouts[0].characterId,actor.state.character.id);
  await rejects(()=>api('/functions/v1/coop/qmode',{role:'tank'},actor.token),'invalid_request');pass('deployed handler authentication and client-authority rejection');
 }
 const start={requestId:'start-qmode-test-01',mode:'qmode',dungeonId:'EXP_001',tier:1,characterId:actor.state.character.id,loadoutId:'current',loadoutRevision:1};
 const [first,replay]=await Promise.all([runtime.start(actor.id,start),runtime.start(actor.id,start)]);
 assert.deepEqual(first,replay);assert.equal(first.team.length,4);pass('concurrent starts return one persisted run');
 await rejects(()=>runtime.start(actor.id,{...start,tier:2}),'idempotency_key_conflict');
 await rejects(()=>runtime.start(actor.id,{...start,requestId:'start-another-run'}),'account_already_participating');
 await rejects(()=>runtime.load(accounts[1].id,first.runId),'NOT_PARTICIPANT');pass('start conflicts, active reservation and Echo-owner access denial');
 const raw=await api('/rest/v1/expedition_runs?id=eq.'+first.runId,undefined,actor.token,'GET');assert.equal(raw.length,0);
 const members=await api('/rest/v1/expedition_run_members?run_id=eq.'+first.runId,undefined,actor.token,'GET');assert.equal(members.length,0);
 const visible=await api('/rest/v1/coop_run_client_snapshots?run_id=eq.'+first.runId,undefined,actor.token,'GET');assert.equal(visible.length,1);
 assert.ok(!JSON.stringify(visible).includes('sourceAccountId'));pass('raw route/loadout privacy with authorized sanitized snapshot');
 let current=first;
 for(let room=0;room<6&&current.phase==='awaiting_choice';room++){
  const option=current.options.find(row=>row.kind===(room===0?'battle':'camp'))??current.options[0];
  const command={requestId:'choose-node-test-'+room,decisionId:current.decisionId,decisionRevision:current.decisionRevision,optionId:option.nodeId};
  const [pending,again]=await Promise.all([runtime.choose(actor.id,current.runId,command),runtime.choose(actor.id,current.runId,command)]);
  assert.deepEqual(pending,again);assert.equal(pending.phase,'resolving_node');assert.equal(pending.options.length,0);
  await rejects(()=>runtime.choose(actor.id,current.runId,{...command,optionId:'different'}),'idempotency_key_conflict');
  if(pending.resolvesAtMs>Date.now()+1000){assert.equal((await runtime.load(actor.id,current.runId)).phase,'resolving_node');}
  if(room===0){
   // Observe a real scheduled completion without calling load/finalize/worker.
   // Authenticated raw snapshot reads cannot settle the room themselves.
   console.log('Waiting for database scheduler to complete the first room at its real deadline');
   const timeout=Math.max(Date.now(),pending.resolvesAtMs)+45000;
   let scheduled;
   do{await new Promise(resolve=>setTimeout(resolve,3000));scheduled=(await api('/rest/v1/coop_run_client_snapshots?run_id=eq.'+current.runId,undefined,actor.token,'GET'))[0].projection_json;}while(scheduled.phase==='resolving_node'&&Date.now()<timeout);
   assert.notEqual(scheduled.phase,'resolving_node');pass('real-time pg_cron completion while controller makes no gameplay requests');
  }else{
   // Other rooms use explicit test-only advancement on the guarded test project.
   testQuery(`update public.coop_run_private_state set state_json=jsonb_set(state_json,'{pending,resolvesAtMs}','1'::jsonb) where run_id='${current.runId}'::uuid; update public.coop_due_jobs set due_at=now()-interval '1 second' where resource_id='${current.runId}' and status='pending';`);
  }
  if(room>0&&room%2===0){
   await Promise.all([rpc('process_online_qmode_jobs_server_v1',{p_limit:16}),rpc('process_online_qmode_jobs_server_v1',{p_limit:16})]);
   const offline=await api('/rest/v1/coop_run_client_snapshots?run_id=eq.'+current.runId,undefined,actor.token,'GET');
   assert.notEqual(offline[0].projection_json.phase,'resolving_node');
  }
  const [settled,settledAgain]=await Promise.all([runtime.load(actor.id,current.runId),runtime.load(actor.id,current.runId)]);
  assert.deepEqual(settled,settledAgain);current=settled;
 }
 assert.ok(['completed','failed'].includes(current.phase));pass('persisted choices, database-clock pacing, offline worker and concurrent node finalization');
 const entitlements=await api('/rest/v1/coop_reward_entitlements?run_id=eq.'+current.runId,undefined,actor.token,'GET');assert.equal(entitlements.length,1);
 const entitlement=entitlements[0].id;
 const rewards=await Promise.all([api('/rest/v1/rpc/claim_coop_reward',{p_entitlement_id:entitlement,p_request_id:'claim-qmode-test-01'},actor.token),api('/rest/v1/rpc/claim_coop_reward',{p_entitlement_id:entitlement,p_request_id:'claim-qmode-test-01'},actor.token)]);
 assert.equal(rewards[0].marks,rewards[1].marks);assert.equal(rewards.filter(row=>row.idempotent_replay===false).length,1);
 const ledger=await api('/rest/v1/expedition_currency_ledger?run_id=eq.'+current.runId,undefined,actor.token,'GET');assert.equal(ledger.length,1);pass('one entitlement and ledger credit under concurrent reward claims');
 const reservations=JSON.parse(testQuery(`select count(*)::int as count from public.coop_account_reservations where account_id='${actor.id}'::uuid;`));
 assert.equal(reservations.rows[0].count,0);pass('terminal run releases the controller reservation');
 report.terminalPhase=current.phase;report.status='PASS';
}catch(error){report.status='FAIL';report.error=error.message;console.error(error.message);process.exitCode=1;}
finally{
 for(const account of accounts){const id=typeof account==='string'?account:account.id;try{
  // Existing Echo ownership uses a restrictive FK; remove only this fixture's
  // profiles before deleting its disposable Auth account.
  if(typeof account!=='string')testQuery(`delete from public.echo_profiles where character_id='${account.state.character.id}'::uuid;`);
  await api('/auth/v1/admin/users/'+id,undefined,service,'DELETE');
 }catch(error){report.checks.push({check:'fixture cleanup',status:'FAIL',error:error.message});report.status='FAIL';process.exitCode=1;}}
 fs.writeFileSync(path.join(root,'docs/implementation/online-verification/hosted-qmode.json'),JSON.stringify(report,null,2)+'\n');
}
