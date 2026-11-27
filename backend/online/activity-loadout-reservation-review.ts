/** Hidden pre-reservation bridge. Never writes the live character, creates an
 * encounter, awards loot, or authorizes Combat 2.0. All state is server-sourced. */
import {createHash} from 'node:crypto';
import type {GameState} from '../../apps/mobile/src/core/types';
import {prepareSettledActivityLoadoutReview,type ReviewConfig} from '../../apps/mobile/src/core/activity-loadout-transition-review';
import {auditCraftedGearOwnership} from '../../apps/mobile/src/core/crafted-gear-ownership';
import {effectiveStats} from '../../apps/mobile/src/core/game';
import {deriveOnlineCoopLoadout,onlineCoopLoadoutHash} from './coop-loadout';
export const ACTIVITY_LOADOUT_RESERVATION_LIVE=false as const;
export type LoadoutEncounterKind='dungeon'|'guild_boss'|'world_boss'|'party_event'|'regional_final_boss';
const kinds:readonly LoadoutEncounterKind[]=['dungeon','guild_boss','world_boss','party_event','regional_final_boss'];
const validId=(x:unknown):x is string=>typeof x==='string'&&/^[A-Za-z0-9:_-]{1,180}$/.test(x);
function canonical(v:unknown):string{
 if(v===null||typeof v==='string'||typeof v==='boolean')return JSON.stringify(v);
 if(typeof v==='number'&&Number.isFinite(v))return JSON.stringify(v);
 if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';
 if(v&&typeof v==='object')return '{'+Object.entries(v).filter(([,x])=>x!==undefined).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,x])=>JSON.stringify(k)+':'+canonical(x)).join(',')+'}';
 throw Error('loadout_snapshot_invalid_value');
}
export const activityLoadoutSnapshotDigest=(v:unknown)=>createHash('sha256').update(canonical(v)).digest('hex');
export type LoadoutReservationScope={
 readonly accountId:string;readonly characterId:string;readonly sourceRevision:number;
 readonly encounterKind:LoadoutEncounterKind;readonly reservationId:string;
};
export function reviewCombatLoadoutReservation(input:{
 readonly state:GameState;readonly nowMs:number;readonly scope:LoadoutReservationScope;
 readonly config:ReviewConfig;
 readonly verifyPersistedState:(scope:LoadoutReservationScope,stateDigest:string)=>boolean;
 /** Must check ALL active encounter locks and physical copy custody, including
  * current gathering and other characters. Not an equipment grant. */
 readonly verifyReservationCustody:(scope:LoadoutReservationScope,exactCopyIds:readonly string[])=>boolean;
}){
 const {state,scope,nowMs,config}=input;
 if(!scope||!validId(scope.accountId)||!validId(scope.characterId)||!validId(scope.reservationId)||
 !kinds.includes(scope.encounterKind)||!Number.isSafeInteger(scope.sourceRevision)||scope.sourceRevision<1||
 state.character?.id!==scope.characterId||!Number.isSafeInteger(nowMs)||nowMs<0||
 nowMs<(state.activity?.lastClaimAtMs??0)||typeof input.verifyPersistedState!=='function'||
 typeof input.verifyReservationCustody!=='function'||typeof config.verifyNoFrozenEncounter!=='function'||
 config.verifyNoFrozenEncounter(scope.characterId)!==true)throw Error('loadout_reservation_invalid_scope');
 // Only a genuinely settled idle state is eligible for this first bridge.
 // Background gathering remains untouched; no concurrent copy policy assumed.
 if(state.activity||state.character.classTraining)throw Error('loadout_reservation_requires_idle_boundary');
 const sourceDigest=activityLoadoutSnapshotDigest(state),scopeDigest=activityLoadoutSnapshotDigest(scope);
 if(input.verifyPersistedState(Object.freeze({...scope}),sourceDigest)!==true||
  activityLoadoutSnapshotDigest(state)!==sourceDigest||activityLoadoutSnapshotDigest(scope)!==scopeDigest)
  throw Error('loadout_reservation_unverified_state');
 const prepared=prepareSettledActivityLoadoutReview(state,'combat',nowMs,config);
 const next=prepared.state,character=next.character!;
 if(config.autoSwitch&&prepared.route.decision!=='candidate')throw Error('loadout_reservation_combat_preset_required');
 const audit=auditCraftedGearOwnership(next);
 if(audit.problems.length)throw Error('loadout_reservation_ownership_conflict');
 const exactCopyIds=Object.values(character.equipmentInstanceIds??{}).sort();
 if(new Set(exactCopyIds).size!==exactCopyIds.length||exactCopyIds.some(id=>!audit.linked.some(row=>row.instanceId===id&&row.holderCharacterId===character.id&&row.place==='equipped')))
  throw Error('loadout_reservation_invalid_exact_copies');
 if(input.verifyReservationCustody(Object.freeze({...scope}),Object.freeze([...exactCopyIds]))!==true||
 activityLoadoutSnapshotDigest(state)!==sourceDigest||activityLoadoutSnapshotDigest(scope)!==scopeDigest)
  throw Error('loadout_reservation_custody_rejected');
 const projection={scope:{...scope},sourceDigest,presetId:prepared.route.presetId,
  classId:character.classId,equipment:{...character.equipment},equipmentInstanceIds:{...character.equipmentInstanceIds},
  exactCopyIds,petId:character.selectedCosmeticPetId??null,faithSelections:{...character.faith?.selectedBlessingIds},
  companionId:character.equippedCombatCompanionId??null,foodId:character.equippedFoodId??null,
  effectiveStats:effectiveStats(next),preparedStateDigest:activityLoadoutSnapshotDigest(next)};
 // Existing dungeon compiler is V1 and is used only as a review comparison.
 // No legacy dungeon record is reused as a World Boss or V2 actor authority.
 const dungeonRecord=scope.encounterKind==='dungeon'?deriveOnlineCoopLoadout(scope.accountId,next,scope.sourceRevision):null;
 if(dungeonRecord&&!dungeonRecord.legalEquipment)throw Error('loadout_reservation_illegal_dungeon_gear');
 return {projection,digest:activityLoadoutSnapshotDigest(projection),
  dungeonRecord,dungeonRecordHash:dungeonRecord?onlineCoopLoadoutHash(dungeonRecord):null,
  persisted:false as const,canReserve:false as const,canAuthorizeCombat:false as const,releaseReady:false as const};
}
