import assert from 'node:assert/strict';
import {createCharacter,newGame} from '../../../apps/mobile/src/core/game';
import {legacyCharacterTotalXpAtLevel} from '../../../apps/mobile/src/core/progression';
import {noviceItemId,noviceSetFor} from '../../../apps/mobile/src/content/novice-sets';
import {OnlineLiveRematch,type LiveRematchState} from '../live-rematch';
import {coopHandler} from '../coop';

async function main(){
 const classes=['IRONWARDEN','WAYFINDER','RAVAGER','DAWNKEEPER'] as const;
 const members=classes.map((classId,index)=>{
  const accountId=`00000000-0000-4000-8000-00000000000${index+1}`;
  const state=createCharacter(newGame(0),classId,'Rematch Test');state.character!.level=40;state.character!.xp=legacyCharacterTotalXpAtLevel(40);state.defeatedBossIds.push('FALLEN_KNIGHT');
  state.character!.id=`rematch-character-${index}`;
  state.character!.equipment=Object.fromEntries(noviceSetFor(classId).slots.map(slot=>[slot,noviceItemId(classId,slot)]));
  return {accountId,characterId:state.character!.id,loadoutId:'current',loadoutRevision:1,version:1,state};
 });
 const sourceId='11111111-1111-4111-8111-111111111111';
 const winningId='22222222-2222-4222-8222-222222222222';
 const calls:Array<{name:string;args:Record<string,unknown>}>=[];
 let current:LiveRematchState={
  status:'open',serverNow:1000,closesAtMs:121000,
  members:members.map((member,index)=>({accountId:member.accountId,characterId:member.characterId,role:(index===0?'tank':index===3?'support':'damage') as 'tank'|'support'|'damage',self:index===0,accepted:false})),
 };
 let errorOnSources=false;
 const services={
  randomId:()=>sourceId,
  rpc:async<T>(name:string,args:Record<string,unknown>):Promise<T>=>{
   calls.push({name,args});
   if(name==='online_live_rematch_state_server_v1')return current as T;
   if(name==='online_live_rematch_sources_server_v1'){
    if(errorOnSources)throw new Error('rematch_roster_unavailable');
    return {dungeonId:'EXP_004',tier:1,members} as T;
   }
   if(name==='online_live_rematch_respond_server_v1')return current as T;
   throw new Error('unexpected_rpc:'+name);
  },
 };
 const rematch=new OnlineLiveRematch(services);
 await rematch.respond(members[0].accountId,sourceId,{requestId:'rematch-accept-01',accept:true});
 const accepted=calls.find(row=>row.name==='online_live_rematch_respond_server_v1');
 assert(accepted,'Rematch consent must go through its server-owned RPC');
 const frozen=accepted.args.p_frozen_roster as Array<{accountId:string;readiness:{ready:boolean;role:string}}>;
 assert.equal(frozen.length,4,'Exactly four original members must be re-frozen at consent');
 assert(frozen.every(x=>x.readiness.ready),'All four snapshots must pass role readiness before voting');
 assert.deepEqual(frozen.map(x=>x.readiness.role).sort(),['damage','damage','support','tank']);
 assert.equal(accepted.args.p_account_id,members[0].accountId,'Actor identity must be supplied by the authenticated edge');
 calls.length=0;
 current={...current,members:current.members.map((m,i)=>i===0?{...m,accepted:true}:m)};
 await rematch.respond(members[0].accountId,sourceId,{requestId:'rematch-accept-01',accept:true});
 assert.equal(calls.filter(x=>x.name==='online_live_rematch_respond_server_v1').length,0,'A saved acceptance never submits a second vote');
 calls.length=0;
 await rematch.respond(members[0].accountId,sourceId,{requestId:'rematch-decline-01',accept:false});
 assert.equal(calls.filter(x=>x.name==='online_live_rematch_respond_server_v1').length,0,'A committed member vote cannot be reversed');
 calls.length=0;
 current={...current,status:'committed',readyCheckId:sourceId,runId:winningId};
 assert.equal((await rematch.load(members[0].accountId,sourceId)).runId,winningId,'Reconnection returns server-owned winning run');
 assert.equal(calls.filter(x=>x.name==='online_live_committed_sources_server_v1').length,0,'Existing committed rematch must never recreate the dungeon');
 calls.length=0;current={...current,status:'open',runId:null,members:current.members.map(m=>({...m,accepted:false}))};
 errorOnSources=true;
 await assert.rejects(()=>rematch.respond(members[0].accountId,sourceId,{requestId:'rematch-invalid-01',accept:true}),/rematch_roster_unavailable/);
 assert.equal(calls.filter(x=>x.name==='online_live_rematch_respond_server_v1').length,0,'Failed roster validation cannot cast a ready vote');
 console.log('PASS Live same-party rematch: authoritative four-person freeze, saved votes, no rollback, recovery and failed roster safety');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
