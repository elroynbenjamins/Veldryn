import {createHash} from 'node:crypto';
import type {GameState} from '../../apps/mobile/src/core/types';
import {EXPEDITIONS} from '../src/server/expeditions/content/launch-content';
import {highestEligibleCoopTier} from '../src/server/coop/config';
import {assessOnlineCoopLoadout,deriveOnlineCoopLoadout} from './coop-loadout';
import {GameplayError,type GameplayServices} from './gameplay';

type Services=Pick<GameplayServices,'rpc'>;
export interface CoopLiveLfgPost{
 id:string;dungeonId:string;ownerName:string;role:'tank'|'damage'|'support';maxTier:number;note:string;createdAtMs:number;expiresAtMs:number;mine:boolean;
}
export interface CoopLiveLfgPublishRequest{requestId:string;dungeonId:string;note?:string;}
export interface CoopLiveLfgCloseRequest{requestId:string;}

export class OnlineCoopLfg{
 constructor(private readonly services:Services){}
 browse(accountId:string){return this.services.rpc<CoopLiveLfgPost[]>('browse_online_coop_lfg_server_v1',{p_account_id:accountId});}
 async publish(accountId:string,request:CoopLiveLfgPublishRequest){
  if(!/^[a-zA-Z0-9_-]{8,128}$/.test(request.requestId)||typeof request.dungeonId!=='string')throw new GameplayError('invalid_request');
  const note=(request.note??'').trim();if(note.length>140)throw new GameplayError('invalid_note');
  const definition=EXPEDITIONS[request.dungeonId];if(!definition?.coopImplemented)throw new GameplayError('dungeon_unavailable');
  const game=await this.services.rpc<{state:GameState|null;version:number}>('load_online_game_server_v1',{p_account_id:accountId});
  if(!game.state?.character)throw new GameplayError('character_required');
  const record=deriveOnlineCoopLoadout(accountId,game.state,game.version),{readiness}=assessOnlineCoopLoadout(record);
  if(!readiness.ready)throw new GameplayError('role_not_ready');
  const maxTier=highestEligibleCoopTier(definition.minLevel,game.state.character.level);if(!maxTier)throw new GameplayError('dungeon_level_requirement');
  const hash=createHash('sha256').update(JSON.stringify({dungeonId:definition.id,note})).digest('hex');
  return this.services.rpc<CoopLiveLfgPost>('publish_online_coop_lfg_server_v1',{p_account_id:accountId,p_request_id:request.requestId,p_request_hash:hash,p_character_id:game.state.character.id,p_dungeon_id:definition.id,p_role:readiness.role,p_max_tier:maxTier,p_note:note});
 }
 close(accountId:string,request:CoopLiveLfgCloseRequest){
  if(!/^[a-zA-Z0-9_-]{8,128}$/.test(request.requestId))throw new GameplayError('invalid_request');
  const hash=createHash('sha256').update('close').digest('hex');
  return this.services.rpc<{closed:boolean}>('close_online_coop_lfg_server_v1',{p_account_id:accountId,p_request_id:request.requestId,p_request_hash:hash});
 }
}
