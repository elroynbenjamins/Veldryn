import assert from 'node:assert/strict';
import {createCharacter,newGame} from '../../../apps/mobile/src/core/game';
import {noviceItemId,noviceSetFor} from '../../../apps/mobile/src/content/novice-sets';
import {deriveOnlineCoopLoadout} from '../coop-loadout';
import {resolveAndFreezeLoadout} from '../../src/server/coop/loadout-snapshots';
import {chooseBoundedCoopMatch,type CoopQueueTicket} from '../../src/server/coop/queue-service';
import {OnlineLiveReady} from '../live-ready';
import {coopHandler} from '../coop';

async function main(){
 const members=(['IRONWARDEN','WAYFINDER','RAVAGER','DAWNKEEPER'] as const).map((classId,index)=>{
  const accountId=`00000000-0000-4000-8000-00000000000${index+1}`,state=createCharacter(newGame(0),classId,'Ready Test');state.character!.level=25;
  state.character!.id='ready-character-'+index;
  state.character!.equipment=Object.fromEntries(noviceSetFor(classId).slots.map(slot=>[slot,noviceItemId(classId,slot)]));
  const record=deriveOnlineCoopLoadout(accountId,state,1),snapshot=resolveAndFreezeLoadout({accountId,characterId:state.character!.id,loadoutId:'current',expectedRevision:1,minLevel:15,syncLevel:25,repository:{getOwnedLoadout:()=>record}});
  return {accountId,characterId:record.characterId,loadoutId:'current',loadoutRevision:1,loadoutSnapshotHash:snapshot.snapshotHash,state,version:1,role:snapshot.readiness.role};
 });
 const maxTiers=[5,3,4,3] as const;const tickets:CoopQueueTicket[]=members.map((row,index)=>({id:'ticket-'+index,accountId:row.accountId,characterId:row.characterId,role:row.role,normalizedReadiness:1,loadoutId:'current',loadoutRevision:1,loadoutSnapshotHash:row.loadoutSnapshotHash,expeditionId:'EXP_001',tier:maxTiers[index],contentVersion:'v1',balanceVersion:'v1',serviceRegion:'default',enqueuedAtMs:0,heartbeatExpiresAtMs:30000,status:'queued'}));
 const replacement={...tickets[3],id:'replacement',accountId:'replacement',characterId:'replacement',enqueuedAtMs:100};
 assert.equal(chooseBoundedCoopMatch([...tickets,replacement],1000,8,['replacement'])!.ticketIds.includes('replacement'),true);
 assert.equal(chooseBoundedCoopMatch(tickets,1000,8,['missing']),null);
 assert.equal(chooseBoundedCoopMatch(tickets,1000,8,[],()=>false),null);
 const checkId='11111111-1111-4111-8111-111111111111',calls:Array<{name:string;args:Record<string,unknown>}>=[];
 let prior:{requestHash:string;response:unknown}|null=null,sourceFailsAfterCommit=false;
 const services={randomId:()=>checkId,randomRoll:()=>0,authenticate:async(token:string)=>token==='valid'?members[0].accountId:null,
  rpc:async<T>(name:string,args:Record<string,unknown>):Promise<T>=>{
   calls.push({name,args});
   if(name==='online_live_candidates_server_v1')return {tickets,serverNow:1000,refillId:null,requiredTicketIds:['ticket-0']} as T;
   if(name==='open_online_live_ready_server_v1')return checkId as T;
   if(name==='read_online_coop_receipt_server_v1')return prior as T;
   if(name==='online_live_ready_sources_server_v1'){
    if(sourceFailsAfterCommit){prior={requestHash:'[1,true]',response:{status:'committed'}};throw new Error('ready_check_closed');}
    return {dungeonId:'EXP_001',tier:1,members} as T;
   }
   if(name==='respond_online_live_ready_server_v1')return {status:'open'} as T;
   if(name==='online_live_ready_state_server_v1')return {status:'open'} as T;
   throw new Error('unexpected_rpc:'+name);
  }};
 const service=new OnlineLiveReady(services);
 await service.match(members[0].accountId);assert.equal((calls.find(x=>x.name==='open_online_live_ready_server_v1')!.args.p_ticket_ids as string[]).length,4,'mixed maximum tiers should share one live dungeon queue');
 const command={requestId:'ready-accept-01',rosterRevision:1,accept:true};
 await service.respond(members[0].accountId,checkId,command);
 const frozen=calls.find(x=>x.name==='respond_online_live_ready_server_v1')!.args.p_frozen_roster as Array<{snapshotHash:string}>;
 assert.equal(frozen.length,4);assert.deepEqual(frozen.map(x=>x.snapshotHash),members.map(x=>x.loadoutSnapshotHash));
 members[1].version=2;await assert.rejects(()=>service.respond(members[0].accountId,checkId,command),/invalid_loadout_revision/);members[1].version=1;
 sourceFailsAfterCommit=true;
 assert.deepEqual(await service.respond(members[0].accountId,checkId,command),{status:'committed'},'commit arriving after first receipt lookup must replay');
 await assert.rejects(()=>service.respond(members[0].accountId,checkId,{...command,accept:false}),/idempotency_key_conflict/);
 const handler=coopHandler(services),request=(body:unknown,token='valid')=>new Request('https://test.invalid/coop/ready/'+checkId,{method:'POST',headers:{authorization:'Bearer '+token},body:JSON.stringify(body)});
 assert.equal((await handler(request(command,'bad'))).status,401);
 assert.equal((await handler(request({...command,stats:{}}))).status,400);
 assert.equal((await handler(request(command))).status,200);
 console.log('PASS Live ready bounded retained-roster matching, authoritative four-player freeze, stale gear, concurrent receipt recovery and authenticated strict HTTP');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
