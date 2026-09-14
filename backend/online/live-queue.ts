import {createHash} from 'node:crypto';
import type {GameState} from '../../apps/mobile/src/core/types';
import type {CoopRunRequest} from '../src/shared/coop-types';
import {EXPEDITIONS} from '../src/server/expeditions/content/launch-content';
import {coopRequiredLevel} from '../src/server/coop/config';
import {resolveAndFreezeLoadout} from '../src/server/coop/loadout-snapshots';
import {deriveOnlineCoopLoadout,ONLINE_COOP_BALANCE_VERSION} from './coop-loadout';
import {GameplayError,type GameplayServices} from './gameplay';
import {OnlineLiveReady} from './live-ready';

type Services=Pick<GameplayServices,'rpc'|'randomId'>;
/** Live admission reuses matchmaking_tickets. The selected loadout is a reference,
 * never a source of client-supplied stats, role, readiness, owner or time. */
export class OnlineLiveQueue {
 constructor(private readonly services:Services){}
 async join(accountId:string,request:CoopRunRequest){
  if(request.mode!=='live')throw new GameplayError('invalid_mode');
  const hash=createHash('sha256').update(JSON.stringify(request)).digest('hex');
  const replay=async()=>{
   const prior=await this.services.rpc<{requestHash:string;response:unknown}|null>('read_online_coop_receipt_server_v1',{p_account_id:accountId,p_operation:'live_queue_v1',p_resource_id:accountId,p_request_id:request.requestId});
   if(prior&&prior.requestHash!==hash)throw new GameplayError('idempotency_key_conflict',409);
   return prior;
  };
  const prior=await replay();if(prior)return prior.response;
  const definition=EXPEDITIONS[request.dungeonId];
  if(!definition?.coopImplemented)throw new GameplayError('dungeon_unavailable');
  const game=await this.services.rpc<{state:GameState|null;version:number}>('load_online_game_server_v1',{p_account_id:accountId});
  if(!game.state?.character)throw new GameplayError('character_required');
  if(game.state.character.id!==request.characterId||request.loadoutId!=='current')throw new GameplayError('loadout_not_owned',403);
  if(game.version!==request.loadoutRevision){const receipt=await replay();if(receipt)return receipt.response;throw new GameplayError('stale_game_version',409);}
  const record=deriveOnlineCoopLoadout(accountId,game.state,game.version);
  const snapshot=resolveAndFreezeLoadout({accountId,characterId:request.characterId,loadoutId:'current',expectedRevision:game.version,minLevel:coopRequiredLevel(definition.minLevel,request.tier),syncLevel:definition.recommendedLevel,repository:{getOwnedLoadout:()=>record}});
  return this.services.rpc('join_online_live_queue_server_v1',{
   p_account_id:accountId,p_game_version:game.version,p_request_id:request.requestId,p_request_hash:hash,
   p_ticket_id:this.services.randomId(),p_expedition_id:definition.id,p_tier:request.tier,
   p_content_version:ONLINE_COOP_BALANCE_VERSION,p_snapshot:snapshot,
  });
 }
 async state(accountId:string){
  await new OnlineLiveReady(this.services).match(accountId);
  return this.services.rpc('online_live_queue_state_server_v1',{p_account_id:accountId});
 }
 command(accountId:string,ticketId:string,action:'heartbeat'|'cancel',requestId:string){
  return this.services.rpc('command_online_live_queue_server_v1',{p_account_id:accountId,p_ticket_id:ticketId,p_action:action,p_request_id:requestId});
 }
}
