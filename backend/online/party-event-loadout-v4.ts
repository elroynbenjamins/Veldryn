/**
 * Party Events v4: private/test-only trusted-state -> verified frozen actor adapter.
 * Reuses the CURRENT online dungeon loadout calculations. No HTTP entry point,
 * migrations or reward code imports this file. Never pass client-submitted
 * GameState to this helper: the caller must have loaded it from authenticated
 * online_game_states after server command settlement.
 */
import type {GameState,GearSlot} from '../../apps/mobile/src/core/types';
import {itemDef} from '../../apps/mobile/src/content/items';
import {characterLevelFromXp} from '../../apps/mobile/src/core/progression';
import {deriveOnlineCoopLoadout,onlineCoopLoadoutHash} from './coop-loadout';
import {freezePartyEventBossLoadout,type FrozenPartyBossLoadout} from '../src/server/party/weekly-party-boss-v2';
import type {AuthoritativeLoadoutRecord,LoadoutRepository} from '../src/server/coop/loadout-snapshots';

export const PARTY_EVENT_VERIFIED_LOADOUT_V4_RELEASED=false;
export interface PartyEventTrustedSnapshotV4 {
 frozen:FrozenPartyBossLoadout;
 onlineLoadoutHash:string;
 verifiedGameVersion:number;
}
/** Require each claimed forged copy in an equipped slot to be the exact
 * character-owned and slot-matching receipt; unmarked legacy gear keeps
 * the existing dungeon item-ID treatment. */
export function verifyPartyEventEquippedCopyOwnershipV4(state:GameState):void{
 const character=state.character;
 if(!character)throw new Error('party_event_character_required');
 const derivedLevel=characterLevelFromXp(character.xp);
 const seen=new Set<string>();
 const instances=new Map((state.account.craftedGearInstances??[]).map(x=>[x.id,x]));
 for(const [slot,itemId] of Object.entries(character.equipment) as [GearSlot,string][]){
  if(!itemId)continue;
  const item=itemDef(itemId);
  if(item.type!=='gear'||item.slot!==slot||item.classRestriction&&item.classRestriction!==character.classId)
   throw new Error('party_event_illegal_equipment');
  if(item.requiredLevel!==undefined&&derivedLevel<item.requiredLevel)
   throw new Error('party_event_equipment_level_locked');
  const copyId=character.equipmentInstanceIds?.[slot];
  if(!copyId)continue;
  if(seen.has(copyId))throw new Error('party_event_duplicate_equipped_copy');
  seen.add(copyId);
  const copy=instances.get(copyId);
  if(!copy||copy.ownerCharacterId!==character.id||copy.itemId!==itemId)
   throw new Error('party_event_equipment_copy_not_owned');
 }
}
/** Server revision is authoritative. Selection supplies only owned character,
 * current loadout and optimistic revision; never arbitrary equipment stats. */
export function freezeTrustedPartyEventLoadoutV4(input:{
 accountId:string;serverLoadedState:GameState;serverGameVersion:number;
 expectedGameVersion:number;characterId:string;eventStartsAtMs:number;
 eventEndsAtMs:number;nowMs:number;
}):PartyEventTrustedSnapshotV4{
 const {accountId,serverLoadedState,serverGameVersion,expectedGameVersion,characterId}=input;
 if(!accountId||!Number.isSafeInteger(serverGameVersion)||serverGameVersion<1
  ||serverGameVersion!==expectedGameVersion)throw new Error('party_event_game_version_mismatch');
 if(!characterId||serverLoadedState.character?.id!==characterId)
  throw new Error('party_event_character_not_owned');
 verifyPartyEventEquippedCopyOwnershipV4(serverLoadedState);
 const record:AuthoritativeLoadoutRecord=deriveOnlineCoopLoadout(accountId,serverLoadedState,serverGameVersion);
 if(!record.legalEquipment)throw new Error('party_event_illegal_equipment');
 const repository:LoadoutRepository={getOwnedLoadout:(a,c,loadoutId)=>
  a===accountId&&c===characterId&&loadoutId==='current'?record:undefined};
 const frozen=freezePartyEventBossLoadout({selection:{
  accountId,characterId,loadoutId:'current',expectedRevision:serverGameVersion,
 },repository,eventStartsAtMs:input.eventStartsAtMs,eventEndsAtMs:input.eventEndsAtMs,nowMs:input.nowMs});
 return {frozen,onlineLoadoutHash:onlineCoopLoadoutHash(record),verifiedGameVersion:serverGameVersion};
}
