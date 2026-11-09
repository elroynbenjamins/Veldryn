import type {GameState} from '../../apps/mobile/src/core/types';
import {freezeCoopRosterAtCommit} from '../src/server/coop/loadout-snapshots';
import {coopRequiredLevel,newDungeonTierAllowed,type CoopTier} from '../src/server/coop/config';
import {EXPEDITIONS} from '../src/server/expeditions/content/launch-content';
import {regularDungeonEntryError} from '../src/server/coop/dungeon-entry-policy';
import {deriveOnlineCoopLoadout} from './coop-loadout';
import {GameplayError,type GameplayServices} from './gameplay';
import {OnlineLiveRuntime} from './live-runtime';

type Services=Pick<GameplayServices,'rpc'|'randomId'>;
interface RematchSources{
 dungeonId:string;tier:CoopTier;
 members:Array<{accountId:string;characterId:string;loadoutId:string;loadoutRevision:number;version:number;state:GameState}>;
}
export interface LiveRematchState {
 status:'open'|'committed'|'declined'|'expired';
 readyCheckId?:string|null;runId?:string|null;closesAtMs?:number|null;serverNow:number;
 members:Array<{accountId:string;characterId:string;role:'tank'|'damage'|'support';self:boolean;accepted:boolean}>;
}

/** Rematches are new Live runs, never a replay or client requeue. Four separate
 * authenticated accounts approve the original roster. Current equipment is
 * rechecked and frozen server-side before creating any new run. */
export class OnlineLiveRematch {
 constructor(private readonly services:Services){}
 private async ensureStarted(accountId:string,state:LiveRematchState):Promise<LiveRematchState>{
  if(state.status==='committed'&&state.readyCheckId&&!state.runId){
   const runId=await new OnlineLiveRuntime(this.services).startFromReady(accountId,state.readyCheckId);
   return {...state,runId};
  }
  return state;
 }
 async load(accountId:string,runId:string):Promise<LiveRematchState>{
  const state=await this.services.rpc<LiveRematchState>('online_live_rematch_state_server_v1',{p_account_id:accountId,p_run_id:runId});
  return this.ensureStarted(accountId,state);
 }
 async respond(accountId:string,runId:string,body:{requestId:string;accept:boolean}):Promise<LiveRematchState>{
  if(!/^[a-zA-Z0-9_-]{8,128}$/.test(body.requestId))throw new GameplayError('invalid_request');
  // Previous consent is already recorded; retries must not reroll someone's
  // gear or turn an accepted vote into a second vote.
  const previous=await this.load(accountId,runId);
  if(previous.status!=='open')return previous;
  const myVote=previous.members.find(member=>member.self);
  if(myVote?.accepted)return previous;
  let frozen:unknown=null;
  if(body.accept){
   const source=await this.services.rpc<RematchSources>('online_live_rematch_sources_server_v1',{p_account_id:accountId,p_run_id:runId});
   const definition=EXPEDITIONS[source.dungeonId];
   if(!definition)throw new GameplayError('dungeon_unavailable');
   // Legacy Tier 4/5 runs still finish; fresh rematches use the three-tier ladder.
   if(!newDungeonTierAllowed(source.tier))throw new GameplayError('invalid_dungeon_tier');
   const records=source.members.map(member=>deriveOnlineCoopLoadout(member.accountId,member.state,member.version));
   source.members.forEach((member,index)=>{const issue=regularDungeonEntryError(definition,member.state,records[index].characterLevel);if(issue)throw new GameplayError(issue);});
   frozen=freezeCoopRosterAtCommit({
    minLevel:coopRequiredLevel(definition.minLevel,source.tier),syncLevel:definition.recommendedLevel,
    selections:source.members.map(member=>({accountId:member.accountId,characterId:member.characterId,loadoutId:member.loadoutId,expectedRevision:member.loadoutRevision})),
    repository:{getOwnedLoadout:(owner,character,loadout)=>records.find(record=>record.accountId===owner&&record.characterId===character&&record.loadoutId===loadout)},
   });
  }
  const state=await this.services.rpc<LiveRematchState>('online_live_rematch_respond_server_v1',{
   p_account_id:accountId,p_run_id:runId,p_request_id:body.requestId,p_accept:body.accept,
   p_check_id:this.services.randomId(),p_frozen_roster:frozen,
  });
  return this.ensureStarted(accountId,state);
 }
}
