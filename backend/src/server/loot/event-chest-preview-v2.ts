/**
 * Hidden read-only reward-panel contract for upcoming mobile chest screens.
 * Render previews only: no player request can create an entitlement, a
 * sealed chest, a rolled gear item, or a currency debit through these models.
 */
import {
 PARTY_EVENT_CHESTS_V51,PARTY_EVENT_PIECE_EXCHANGE_SIGILS_V51,
 partyChestGearChanceV51,previewVerifiedPartyChestsV51,
 type PartyEventChestKindV51,type VerifiedPartyChestEvidenceV51,
} from '../party/weekly-party-event-chests-v51';
import {
 partyEventSetsForFamilyV51,partyEventGearForFamilyV51,
} from '../party/weekly-party-event-gear-v51';
import {
 previewVerifiedWorldBossChestsV58,WORLD_BOSS_GEAR_SLOTS_V58,
 WORLD_BOSS_CHEST_GEAR_CHANCE_BPS_V58,
 WORLD_BOSS_GEAR_CHOICE_COST_SIGILS_V58,
 WORLD_BOSS_GATHERING_SET_POLICY_V58,
 type WorldBossChestKindV58,type VerifiedWorldBossChestEvidenceV58,
 type WorldBossGearSlotV58,
} from '../combat/world-boss-chests-v58';

export const EVENT_CHEST_REWARD_PANEL_V2_RELEASED=false;
const partyKinds:readonly PartyEventChestKindV51[]=[
 'participation','preparation','finale',
];
const worldKinds:readonly WorldBossChestKindV58[]=[
 'donations_goal','three_attempts','community_damage_goal',
];
export interface EventChestPanelRowV2{
 readonly kind:string;
 readonly title:string;
 readonly unlocked:boolean;
 readonly gearChancePercent:number;
 readonly showOpenButton:false;
 readonly showClaimButton:false;
}
export interface PartyEventTreasurePanelV2{
 readonly mode:'preview_only';
 readonly context:'party_event';
 readonly chests:readonly EventChestPanelRowV2[];
 readonly totalPossibleChests:3;
 readonly sets:readonly {
  id:string;name:string;size:2|3;collected:number;
  pieces:readonly {id:string;slot:string;owned:boolean}[];
  bonuses:readonly {threshold:2|3;activeIfEquipped:boolean}[];
 }[];
 readonly totalCollectiblePieces:5;
 readonly partySigilsBalance:number;
 readonly targetedExchangeCost:60;
 readonly exchangeButtonEnabled:false;
 readonly day8RewardChoicesRemainSeparate:true;
}
export interface WorldBossTreasurePanelV2{
 readonly mode:'preview_only';
 readonly context:'world_boss';
 readonly chests:readonly EventChestPanelRowV2[];
 readonly totalPossibleChests:3;
 readonly gatheringSkill:string;
 readonly totalCollectiblePieces:10;
 readonly pieces:readonly {slot:WorldBossGearSlotV58;owned:boolean}[];
 readonly worldSigilsBalance:number;
 readonly targetedExchangeCost:80;
 readonly exchangeButtonEnabled:false;
 readonly existingBossEquipmentUnchanged:true;
}
function checkedWallet(balance:number):void{
 if(!Number.isSafeInteger(balance)||balance<0)
  throw Error('event_chest_preview_v2_invalid_wallet');
}
/** Account data must be fetched from server-owned roster and inventory rows. */
export function previewPartyEventTreasurePanelV2(input:{
 evidence:VerifiedPartyChestEvidenceV51;
 ownedPieceIds:readonly string[];
 trustedPartySigilsBalance:number;
}):PartyEventTreasurePanelV2{
 checkedWallet(input.trustedPartySigilsBalance);
 if(!Array.isArray(input.ownedPieceIds))
  throw Error('event_chest_preview_v2_invalid_collection');
 const available=previewVerifiedPartyChestsV51(input.evidence);
 const sets=partyEventSetsForFamilyV51(input.evidence.family);
 const pool=partyEventGearForFamilyV51(input.evidence.family);
 return {
  mode:'preview_only',context:'party_event',
  chests:partyKinds.map(kind=>{
   const def=PARTY_EVENT_CHESTS_V51.find(x=>x.kind===kind)!;
   return {kind,title:def.name,
    unlocked:available.some(x=>x.kind===kind),
    gearChancePercent:partyChestGearChanceV51(kind,input.evidence.difficulty)/100,
    showOpenButton:false,showClaimButton:false};
  }),
  totalPossibleChests:3,
  sets:sets.map(set=>{
   const pieces=pool.filter(x=>x.setId===set.id).map(x=>({
    id:x.id,slot:x.slot,owned:input.ownedPieceIds.includes(x.id),
   }));
   return {id:set.id,name:set.name,size:set.size,
    collected:pieces.filter(x=>x.owned).length,pieces,
    bonuses:set.bonuses.map(x=>({threshold:x.threshold,
     activeIfEquipped:false as const}))};
  }),
  totalCollectiblePieces:5,
  partySigilsBalance:input.trustedPartySigilsBalance,
  targetedExchangeCost:PARTY_EVENT_PIECE_EXCHANGE_SIGILS_V51,
  exchangeButtonEnabled:false,
  day8RewardChoicesRemainSeparate:true,
 };
}
/** Existing boss gear instances stay owned by the live gathering catalog. */
export function previewWorldBossTreasurePanelV2(input:{
 evidence:VerifiedWorldBossChestEvidenceV58;
 ownedGatheringGearSlots:readonly WorldBossGearSlotV58[];
 trustedWorldSigilsBalance:number;
}):WorldBossTreasurePanelV2{
 checkedWallet(input.trustedWorldSigilsBalance);
 if(!Array.isArray(input.ownedGatheringGearSlots)||
  input.ownedGatheringGearSlots.some(slot=>!WORLD_BOSS_GEAR_SLOTS_V58.includes(slot)))
  throw Error('event_chest_preview_v2_invalid_collection');
 const available=previewVerifiedWorldBossChestsV58(input.evidence);
 const name:Readonly<Record<WorldBossChestKindV58,string>>={
  donations_goal:'War Camp Chest',
  three_attempts:'Warrior Chest',
  community_damage_goal:'Realm Victory Chest',
 };
 return {
  mode:'preview_only',context:'world_boss',
  chests:worldKinds.map(kind=>({
   kind,title:name[kind],unlocked:available.some(x=>x.kind===kind),
   gearChancePercent:WORLD_BOSS_CHEST_GEAR_CHANCE_BPS_V58/100,
   showOpenButton:false,showClaimButton:false,
  })),
  totalPossibleChests:3,
  gatheringSkill:WORLD_BOSS_GATHERING_SET_POLICY_V58[input.evidence.bossId].skill,
  totalCollectiblePieces:10,
  pieces:WORLD_BOSS_GEAR_SLOTS_V58.map(slot=>({
   slot,owned:input.ownedGatheringGearSlots.includes(slot),
  })),
  worldSigilsBalance:input.trustedWorldSigilsBalance,
  targetedExchangeCost:WORLD_BOSS_GEAR_CHOICE_COST_SIGILS_V58,
  exchangeButtonEnabled:false,existingBossEquipmentUnchanged:true,
 };
}
