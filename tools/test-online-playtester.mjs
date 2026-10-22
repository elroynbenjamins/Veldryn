/** Hosted player journey against a disposable, admin-created account.
 * Requires ONLINE_PLAYTEST_CONFIRM=I_UNDERSTAND_LIVE_WRITES.
 * Never run against an existing player account.
 */
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {writeFileSync,unlinkSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {api,backend,project,projectKeys,root} from './online-context.mjs';

if(process.env.ONLINE_PLAYTEST_CONFIRM!=='I_UNDERSTAND_LIVE_WRITES')throw new Error('Set ONLINE_PLAYTEST_CONFIRM=I_UNDERSTAND_LIVE_WRITES for a disposable hosted test account.');
const keys=projectKeys(),checks=[];
const fixture={id:null,token:null,email:`veldryn-playtest-${randomUUID()}@example.invalid`,password:`${randomUUID()}aA1!`};
const report={project,runAt:new Date().toISOString(),checks};
const note=(name,detail)=>{checks.push({name,status:'PASS',...(detail?{detail}:{})});console.log(`PASS ${name}${detail?` — ${detail}`:''}`)};
const expect=(name,condition,detail)=>{assert.ok(condition,`${name}${detail?`: ${detail}`:''}`);note(name,detail)};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const game=async(method='GET',body)=>api('/functions/v1/gameplay',keys.anon,{token:fixture.token,method,body});
let current;
async function command(type,args={},requestId=randomUUID()){
 const body={requestId,expectedVersion:current.version,command:{type,args}};
 const response=await game('POST',body);
 if(!response.ok)throw new Error(`${type}: HTTP ${response.status} ${String(response.data.error??response.data.message??'unknown')}`);
 const previous=current.version;current=response.data;
 assert.equal(current.version,previous+1,`${type} must commit one version`);
 return {body,response};
}
async function rejected(name,type,args,status=400){
 const before=current.version;
 const response=await game('POST',{requestId:randomUUID(),expectedVersion:before,command:{type,args}});
 expect(name,response.status===status,`HTTP ${response.status}`);
 const read=await game();assert.equal(read.data.version,before,`${name} must not mutate the account`);
}
function cleanupSql(){
 const id=fixture.id;
 if(!id||!/^[0-9a-f-]{36}$/.test(id))return false;
 const file=path.join(root,'tools','.codex-tmp',`playtester-cleanup-${randomUUID()}.sql`);
 mkdirSync(path.dirname(file),{recursive:true});
 writeFileSync(file,`begin;
delete from public.echo_profiles where character_id in (select id from public.characters where account_id='${id}'::uuid);
delete from public.parties where leader_account_id='${id}'::uuid;
delete from public.online_game_states where account_id='${id}'::uuid;
delete from public.player_profiles where account_id='${id}'::uuid;
delete from public.characters where account_id='${id}'::uuid;
delete from auth.users where id='${id}'::uuid;
commit;\n`);
 try{execFileSync(process.execPath,['node_modules/supabase/dist/supabase.js','db','query','--linked','--file',file],{cwd:backend,stdio:['ignore','pipe','pipe'],windowsHide:true});return true;}
 catch{return false;}finally{unlinkSync(file);}
}
try{
 const created=await api('/auth/v1/admin/users',keys.service,{method:'POST',body:{email:fixture.email,password:fixture.password,email_confirm:true}});
 assert.ok(created.ok&&created.data.id,'Disposable Auth account creation failed');fixture.id=created.data.id;
 note('disposable confirmed account created');
 const login=await api('/auth/v1/token?grant_type=password',keys.anon,{method:'POST',body:{email:fixture.email,password:fixture.password}});
 assert.ok(login.ok&&login.data.user?.id===fixture.id,'Real player sign-in failed');fixture.token=login.data.access_token;
 note('real password sign-in');
 const initial=await game();assert.ok(initial.ok&&initial.data.accountId===fixture.id);current=initial.data;
 expect('fresh account starts empty',current.version===0&&!current.state.character);
 await command('create',{name:`Tester ${randomUUID().slice(0,8).replace(/[0-9]/g,d=>String.fromCharCode(103+Number(d)))}`,classId:'WAYFINDER'});
 expect('server-owned character created',Boolean(current.state.character?.id)&&current.state.currentRegionId==='GREENFIELDS');
 const createdCharacter=current.state.character.id;
 const starterRations=current.state.inventory.stacks.find(row=>row.itemId==='TRAVEL_RATION')?.quantity??0;
 expect('starter supplies arrive online',starterRations>=2);
 await command('deposit',{id:'TRAVEL_RATION',quantity:1});
 expect('inventory to bank transfer persists',current.state.bank.stacks.some(row=>row.itemId==='TRAVEL_RATION'&&row.quantity>=1));
 await command('withdraw',{id:'TRAVEL_RATION',quantity:1});
 expect('bank withdrawal restores starter item',current.state.inventory.stacks.find(row=>row.itemId==='TRAVEL_RATION')?.quantity===starterRations);
 const goldBeforeSale=current.state.character.gold;
 await command('sell',{id:'TRAVEL_RATION',quantity:1});
 expect('selling an item updates authoritative Gold and inventory',current.state.character.gold>goldBeforeSale&&current.state.inventory.stacks.find(row=>row.itemId==='TRAVEL_RATION')?.quantity===starterRations-1);
 await rejected('locked regional travel is denied','travel',{id:'SILVERBROOK'});

 await rejected('already reached skill goal is rejected','queue_add',{kind:'gathering',id:'GREENWOOD_TREE',goal:{kind:'skill_level',value:1}});
 await rejected('remote region is rejected','queue_add',{kind:'gathering',id:'SILVERBROOK_SHOAL',goal:{kind:'duration_seconds',value:30}});
 await command('queue_add',{kind:'processing',id:'SMELT_COPPER_INGOT'});
 expect('future Smithing may be planned',current.state.character.activityQueue?.[0]?.kind==='processing');
 await rejected('unfunded Smithing cannot start','queue_start',{});
 await command('queue_clear');
 expect('clear removes waiting work',current.state.character.activityQueue?.length===0);

 await command('queue_add',{kind:'gathering',id:'GREENWOOD_TREE',goal:{kind:'duration_seconds',value:30}});
 await command('queue_add',{kind:'gathering',id:'MEADOW_PERCH_POOL',goal:{kind:'duration_seconds',value:45}});
 await rejected('base account queue capacity is enforced','queue_add',{kind:'combat',id:'MOSS_RAT',goal:{kind:'duration_seconds',value:30}});
 await command('queue_move',{index:1,direction:'up'});
 expect('queued work can be reordered',current.state.character.activityQueue?.[0]?.targetId==='MEADOW_PERCH_POOL');
 await command('queue_move',{index:0,direction:'down'});
 expect('reorder persists both entries',current.state.character.activityQueue?.map(row=>row.targetId).join(',')==='GREENWOOD_TREE,MEADOW_PERCH_POOL');
 await command('queue_start');
 expect('queued woodcutting starts',current.state.activity?.targetId==='GREENWOOD_TREE'&&current.state.character.activityQueue?.length===1);
 const reloaded=await game();expect('queue survives server reload',reloaded.ok&&reloaded.data.state.activity?.targetId==='GREENWOOD_TREE'&&reloaded.data.state.character.activityQueue?.length===1);
 console.log('Waiting 82 seconds for two genuine queue activity intervals.');await wait(82000);
 const claimBody={requestId:randomUUID(),expectedVersion:current.version,command:{type:'claim'}};
 const claims=await Promise.all([game('POST',claimBody),game('POST',claimBody)]);
 expect('concurrent identical claim settles once',claims.every(row=>row.ok&&row.data.version===current.version+1)&&JSON.stringify(claims[0].data)===JSON.stringify(claims[1].data));
 current=claims[0].data;
 const segments=current.reward?.activityResults??[];
 expect('woodcutting hands off to fishing',segments.some(row=>row.activity?.targetId==='GREENWOOD_TREE')&&segments.some(row=>row.activity?.targetId==='MEADOW_PERCH_POOL'));
 expect('both queued entries are consumed',current.state.character.activityQueue?.length===0);
 const awarded=current.reward?.items??[];
 expect('gathering grants server-owned items',awarded.some(row=>row.itemId==='MEADOW_PERCH')&&current.state.inventory.stacks.some(row=>row.itemId==='MEADOW_PERCH'),awarded.map(row=>`${row.itemId}:${row.quantity}`).join(','));
 const replay=await game('POST',claimBody);
 expect('lost-response retry returns exact receipt',replay.ok&&JSON.stringify(replay.data)===JSON.stringify(current));
 const relogin=await api('/auth/v1/token?grant_type=password',keys.anon,{method:'POST',body:{email:fixture.email,password:fixture.password}});
 assert.ok(relogin.ok);fixture.token=relogin.data.access_token;
 const resumed=await game();expect('relogin restores queued rewards',resumed.ok&&resumed.data.version===current.version&&resumed.data.state.character.id===createdCharacter);
 current=resumed.data;

 await command('stop');
 await command('start',{kind:'gathering',id:'GREENWOOD_TREE'});
 await command('queue_add',{kind:'gathering',id:'MEADOW_PERCH_POOL',goal:{kind:'duration_seconds',value:30},handoffGoal:{kind:'duration_seconds',value:30},handoffTargetId:'GREENWOOD_TREE'});
 expect('atomic current activity handoff is armed',current.state.activity?.queueGoal?.value===30&&current.state.character.activityQueue?.length===1);
 console.log('Waiting 36 seconds for the active-to-queued handoff.');await wait(36000);
 await command('claim');
 expect('active gathering hands off to fishing',current.state.activity?.targetId==='MEADOW_PERCH_POOL'&&current.state.character.activityQueue?.length===0);
 await command('stop');

 await command('start',{kind:'combat',id:'MOSS_RAT'});
 console.log('Waiting 35 seconds for real combat progress.');await wait(35000);
 await command('claim');
 expect('combat earns real server XP',Number(current.reward?.kills)>0&&Number(current.state.character.xp)>0);
 await command('stop');
 const final=await game();expect('final server state stays idle and versioned',final.ok&&!final.data.state.activity&&final.data.version===current.version);
 report.status='PASS';
}catch(error){report.status='FAIL';report.error=error instanceof Error?error.message:String(error);console.error(`FAIL ${report.error}`);process.exitCode=1;}
finally{
 let clean=cleanupSql();
 if(!clean&&fixture.id){
  const response=await api(`/auth/v1/admin/users/${fixture.id}`,keys.service,{method:'DELETE'});clean=response.ok;
 }
 report.cleanup=clean?'PASS':'FAIL';console.log(`${clean?'PASS':'FAIL'} disposable account cleanup`);
 if(!clean)process.exitCode=1;
 const output=path.join(root,'tools','.codex-tmp','online-playtester-report.json');
 writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 console.log(`Report: ${output}`);
}
