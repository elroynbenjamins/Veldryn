import type {GameState} from '../../apps/mobile/src/core/types';
import type {CoopReadyCommand} from '../src/shared/coop-types';
import {chooseBoundedCoopMatch,type CoopQueueTicket} from '../src/server/coop/queue-service';
import {freezeCoopRosterAtCommit} from '../src/server/coop/loadout-snapshots';
import {EXPEDITIONS} from '../src/server/expeditions/content/launch-content';
import {coopRequiredLevel,type CoopTier} from '../src/server/coop/config';
import {deriveOnlineCoopLoadout} from './coop-loadout';
import {GameplayError,type GameplayServices} from './gameplay';
type Services=Pick<GameplayServices,'rpc'|'randomId'>;
interface Candidates {tickets:CoopQueueTicket[];serverNow:number;refillId:string|null;requiredTicketIds:string[];blockedPairs?:Array<{blocker:string;blocked:string}>;}
interface ReadySources {dungeonId:string;tier:CoopTier;members:Array<{accountId:string;characterId:string;loadoutId:string;loadoutRevision:number;loadoutSnapshotHash:string;state:GameState;version:number}>;}

/** Live clients' queue polling drives bounded matching. The database owns ready
 * deadlines, membership and receipts; its cron worker also expires idle checks. */
export class OnlineLiveReady {
 constructor(private readonly services:Services){}
 async match(accountId:string){
  const pool=await this.services.rpc<Candidates>('online_live_candidates_server_v1',{p_account_id:accountId});
  const candidate=chooseBoundedCoopMatch(pool.tickets,pool.serverNow,8,pool.requiredTicketIds,roster=>!(pool.blockedPairs??[]).some(pair=>roster.some(row=>row.accountId===pair.blocker)&&roster.some(row=>row.accountId===pair.blocked)));
  if(!candidate)return;
  try{await this.services.rpc('open_online_live_ready_server_v1',{p_account_id:accountId,p_ticket_ids:candidate.ticketIds,p_check_id:this.services.randomId(),p_refill_id:pool.refillId});}
  catch(error){if(!/reservation_conflict|stale_ready_roster/i.test(error instanceof Error?error.message:''))throw error;}
 }
 load(accountId:string,checkId:string){return this.services.rpc('online_live_ready_state_server_v1',{p_account_id:accountId,p_check_id:checkId});}
 async respond(accountId:string,checkId:string,request:CoopReadyCommand){
  // Receipt lookup precedes equipment reads so committed requests can replay
  // after unrelated gameplay changes or a ready deadline passes.
  const intent=JSON.stringify([request.rosterRevision,request.accept]);
  const replay=async()=>{
   const prior=await this.services.rpc<{requestHash:string;response:unknown}|null>('read_online_coop_receipt_server_v1',{p_account_id:accountId,p_operation:'live_ready_v1',p_resource_id:checkId,p_request_id:request.requestId});
   if(prior&&prior.requestHash!==intent)throw new GameplayError('idempotency_key_conflict',409);
   return prior;
  };
  const prior=await replay();if(prior)return prior.response;
  try{
  let frozen:unknown=null;
  if(request.accept){
   const source=await this.services.rpc<ReadySources>('online_live_ready_sources_server_v1',{p_account_id:accountId,p_check_id:checkId});
   const definition=EXPEDITIONS[source.dungeonId];if(!definition?.coopImplemented)throw new GameplayError('dungeon_unavailable');
   const records=source.members.map(member=>deriveOnlineCoopLoadout(member.accountId,member.state,member.version));
   frozen=freezeCoopRosterAtCommit({minLevel:coopRequiredLevel(definition.minLevel,source.tier),syncLevel:definition.recommendedLevel,
    selections:source.members.map(member=>({accountId:member.accountId,characterId:member.characterId,loadoutId:member.loadoutId,expectedRevision:member.loadoutRevision,queuedSnapshotHash:member.loadoutSnapshotHash})),
    repository:{getOwnedLoadout:(owner,character,loadout)=>records.find(record=>record.accountId===owner&&record.characterId===character&&record.loadoutId===loadout)},
   });
  }
  return await this.services.rpc('respond_online_live_ready_server_v1',{p_account_id:accountId,p_check_id:checkId,p_roster_revision:request.rosterRevision,p_accept:request.accept,p_request_id:request.requestId,p_request_hash:intent,p_frozen_roster:frozen});
  }catch(error){const receipt=await replay();if(receipt)return receipt.response;throw error;}
 }
}
