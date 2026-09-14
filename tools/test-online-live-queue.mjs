// Real Auth + HTTP + concurrent PostgreSQL writes on the disposable project only.
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {randomUUID,randomBytes} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {root,backend,project as production} from './online-context.mjs';
const target=JSON.parse(fs.readFileSync(root+'/tools/.codex-tmp/fresh-project.json','utf8'));
if(target.deletedAt||target.id===production||!['xsztafgbtexxsfqkfgge','qoaqrqpxtrhjyzsrifsq'].includes(target.id)||target.name!=='Veldryn Migration Validation 20260913')throw new Error('Refusing non-test project');
const readyMode=process.argv.includes('--ready');
const cli=args=>execFileSync(process.execPath,['node_modules/supabase/dist/supabase.js',...args],{cwd:backend,windowsHide:true,encoding:'utf8',stdio:['ignore','pipe','pipe']});
const keys=JSON.parse(cli(['projects','api-keys','--project-ref',target.id,'--output','json']));
const service=keys.find(row=>row.name==='service_role').api_key,anon=keys.find(row=>row.name==='anon').api_key,base=`https://${target.id}.supabase.co`;
async function api(path,body,token=service,method='POST'){
 const response=await fetch(base+path,{method,headers:{apikey:token===service?service:anon,authorization:'Bearer '+token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await response.json();if(!response.ok)throw new Error(typeof data.error==='string'?data.error:data.message??data.msg??'request_failed');return data;
}
const rpc=(name,args)=>api('/rest/v1/rpc/'+name,args);
const require=createRequire(backend+'/package.json');
const {createCharacter,newGame}=require('./dist/online/apps/mobile/src/core/game.js');
const {noviceItemId,noviceSetFor}=require('./dist/online/apps/mobile/src/content/novice-sets.js');
const accounts=[],report={checkedAt:new Date().toISOString(),project:target.id,checks:[],status:'RUNNING'};
const pass=check=>{report.checks.push({check,status:'PASS'});console.log('PASS '+check);};
async function rejects(action,code){await assert.rejects(action,error=>error.message.toLowerCase().includes(code));}
try{
 for(const classId of (readyMode?['IRONWARDEN','WAYFINDER','RAVAGER','DAWNKEEPER','STONECALLER','IRONWARDEN','WAYFINDER','RAVAGER','DAWNKEEPER']:['IRONWARDEN','WAYFINDER','RAVAGER','DAWNKEEPER'])){
  const email=`live-queue-${randomUUID()}@example.invalid`,password=randomBytes(24).toString('hex');
  const user=await api('/auth/v1/admin/users',{email,password,email_confirm:true});
  const actor={id:user.id,email};accounts.push(actor);
  const auth=await api('/auth/v1/token?grant_type=password',{email,password},anon);actor.token=auth.access_token;
  const state=createCharacter(newGame(Date.now()),classId,'Live Test');state.character.id=randomUUID();state.character.level=25;
  state.character.equipment=Object.fromEntries(noviceSetFor(classId).slots.map(slot=>[slot,noviceItemId(classId,slot)]));
  await rpc('load_online_game_server_v1',{p_account_id:actor.id});
  await rpc('commit_online_game_server_v1',{p_account_id:actor.id,p_expected_version:0,p_expected_gold:null,p_request_id:'fixture-create-01',p_request_hash:'f'.repeat(64),p_response:{state,version:1,accountId:actor.id,serverNow:Date.now()},p_contributions:[]});
  actor.request={requestId:'live-queue-start-01',dungeonId:'EXP_001',tier:1,characterId:state.character.id,loadoutId:'current',loadoutRevision:1};
 }
 const start=actor=>api('/functions/v1/coop/queue',actor.request,actor.token);
 const actor=accounts[0];
 if(readyMode){
  const queue=member=>api('/functions/v1/coop/queue',undefined,member.token,'GET');
  const view=(member,id)=>api('/functions/v1/coop/ready/'+id,undefined,member.token,'GET');
  const respond=(member,id,revision,accept=true,key='ready-accept-01')=>api('/functions/v1/coop/ready/'+id,{requestId:key,rosterRevision:revision,accept},member.token);
  for(const member of accounts.slice(0,4))await start(member);
  const polls=await Promise.all(accounts.slice(0,4).flatMap(member=>[queue(member),queue(member)]));
  const id=polls.find(row=>row.ticket.reservationId)?.ticket.reservationId;assert.ok(id);
  const initial=await view(actor,id);assert.equal(initial.status,'open');assert.equal(initial.members.length,4);
  assert.deepEqual(initial.members.map(x=>x.role).sort(),['damage','damage','support','tank']);
  await rejects(()=>view(accounts[4],id),'not_ready_member');
  assert.ok(!JSON.stringify(initial).includes('loadoutSnapshotHash'));
  pass('concurrent authenticated queue polling opens one persisted exact-role ready roster; foreign/private reads denied');
  await Promise.all(accounts.slice(0,3).map(member=>respond(member,id,1)));
  assert.equal((await respond(accounts[3],id,1,false,'ready-decline-01')).status,'refilling');
  await start(accounts[4]);const replacement=await queue(accounts[4]);const nextId=replacement.ticket.reservationId;assert.ok(nextId&&nextId!==id);
  const next=await view(actor,nextId);assert.equal(next.rosterRevision,2);assert.ok(next.members.every(x=>!x.accepted));
  const retained=[accounts[0],accounts[1],accounts[2],accounts[4]];
  const accepted=await Promise.all(retained.flatMap(member=>[respond(member,nextId,2),respond(member,nextId,2)]));
  for(let i=0;i<accepted.length;i+=2)assert.deepEqual(accepted[i],accepted[i+1]);
  assert.equal((await view(actor,nextId)).status,'committed');
  const raw=await api('/rest/v1/coop_ready_checks?id=eq.'+nextId+'&select=frozen_roster_json',undefined,service,'GET');
  assert.equal(raw[0].frozen_roster_json.length,4);
  assert.deepEqual(await api('/rest/v1/coop_ready_checks?id=eq.'+nextId,undefined,actor.token,'GET'),[]);
  pass('decline/refill preserves three players, resets consent, freezes four server loadouts and survives concurrent acceptance retries');
  // New fixtures exercise the real database deadline with no gameplay requests.
  const idle=accounts.slice(5);for(const member of idle)await start(member);
  const idleId=(await queue(idle[0])).ticket.reservationId;assert.ok(idleId);
  await respond(idle[0],idleId,1);
  let row;const deadline=Date.now()+45000;
  do{row=(await api('/rest/v1/coop_ready_checks?id=eq.'+idleId+'&select=status',undefined,service,'GET'))[0];if(row.status==='refilling')break;await new Promise(resolve=>setTimeout(resolve,1500));}while(Date.now()<deadline);
  assert.equal(row.status,'refilling');
  const waiting=await api('/rest/v1/matchmaking_tickets?reservation_id=eq.'+idleId+'&select=status',undefined,service,'GET');assert.equal(waiting.length,1);assert.equal(waiting[0].status,'reserved');
  pass('pg_cron expires an unattended real 20-second ready deadline; only the accepting player remains reserved');
 }else{
 const unauth=await fetch(base+'/functions/v1/coop/queue',{headers:{apikey:anon}});assert.equal(unauth.status,401);
 await rejects(()=>api('/functions/v1/coop/queue',{...actor.request,role:'damage'},actor.token),'invalid_request');
 pass('real Auth bearer required; client role override rejected');
 for(const member of accounts){
  const pair=await Promise.all([start(member),start(member)]);assert.deepEqual(pair[0],pair[1]);member.ticket=pair[0].ticket.ticketId;
 }
 assert.deepEqual((await api('/rest/v1/matchmaking_tickets?select=role',undefined,service,'GET')).map(x=>x.role).sort(),['damage','damage','support','tank']);
 pass('four real accounts: concurrent join retries produce one ticket each and exact derived roles');
 await rejects(()=>api('/functions/v1/coop/queue',{...actor.request,tier:2},actor.token),'idempotency_key_conflict');
 await rejects(()=>api('/functions/v1/coop/queue',{...actor.request,requestId:'another-join-01'},actor.token),'account_already_participating');
 await rejects(()=>api('/functions/v1/coop/queue/'+accounts[1].ticket+'/cancel',{requestId:'foreign-cancel-01'},actor.token),'ticket_not_owned');
 const raw=await fetch(base+'/rest/v1/matchmaking_tickets?select=*',{headers:{apikey:anon,authorization:'Bearer '+actor.token}});assert.equal(raw.status,403);
 pass('conflicting/duplicate admission, foreign cancellation and raw queue reads rejected');
 const heartbeat=()=>api('/functions/v1/coop/queue/'+actor.ticket+'/heartbeat',{requestId:'heartbeat-live-01'},actor.token);
 const beats=await Promise.all([heartbeat(),heartbeat()]);assert.deepEqual(beats[0],beats[1]);
 pass('concurrent heartbeat replay preserves one database deadline');
 const ticketIds=accounts.map(x=>x.ticket),reserve=()=>rpc('reserve_online_live_match_server_v1',{p_ticket_ids:ticketIds,p_reservation_id:randomUUID()});
 const matches=await Promise.allSettled([reserve(),reserve()]);
 assert.equal(matches.filter(x=>x.status==='fulfilled').length,1);assert.equal(matches.filter(x=>x.status==='rejected').length,1);
 const rows=await api('/rest/v1/coop_account_reservations?select=reservation_kind',undefined,service,'GET');assert.equal(rows.length,4);assert.ok(rows.every(x=>x.reservation_kind==='ready'));
 pass('concurrent match attempts: exactly one atomic handoff; all four reservations retained');
 }
 report.status='PASS';
}catch(error){report.status='FAIL';report.error=error.message;console.error(error.message);process.exitCode=1;}
finally{
 for(const actor of accounts){
  try{
   const user=await api('/auth/v1/admin/users/'+actor.id,undefined,service,'GET');
   if(user.id!==actor.id||user.email!==actor.email||!user.email.startsWith('live-queue-')||!user.email.endsWith('@example.invalid'))throw new Error('Fixture identity mismatch');
   await api('/auth/v1/admin/users/'+actor.id,undefined,service,'DELETE');
  }catch(error){report.status='FAIL';report.cleanupError=error.message;process.exitCode=1;}
 }
 report.fixturesRemoved=!report.cleanupError;
 fs.writeFileSync(root+'/docs/implementation/online-verification/'+(readyMode?'hosted-live-ready.json':'hosted-live-queue.json'),JSON.stringify(report,null,2)+'\n');
}
