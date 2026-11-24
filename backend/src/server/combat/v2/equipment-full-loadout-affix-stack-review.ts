/**
 * HIDDEN SOURCE-ONLY: full wearable EQ2 candidate affix accumulation envelope.
 *
 * This is NOT combat power, a build simulator, a final cap, an affix grant or
 * a player-owned loadout. It counts only VALID source slots for actual class
 * hands and canonical equipment identity. Each row's maximum is the maximum
 * *for that ONE affix type* when eligible pieces roll it; the maxima across
 * different affixes are mutually competing within each item's 1–3 roll slots.
 *
 * Innates, sets, gems, skills, companions and consumables are intentionally
 * excluded until separately approved. Never sum per-stat maxima into a CP.
 */
import {V2_SERVER_PIECES,type V2ServerPiece}
 from '../../equipment/equipment-crafting-v2-manifest';
import {V2_SERVER_RARITY_BANDS,type V2Rarity,type V2Tier}
 from '../../equipment/equipment-crafting-v2-rolls';
import {CLASS_ROLES_V2,GEAR_SLOTS_V2,type ClassIdV2,type GearSlotV2}
 from './build-contract';
import {reviewNextMintAffixPieceV2}
 from './equipment-forge-next-mint-roll-policy-review';
import type {EquipmentAffixIdV2} from './equipment-affixes';

export const EQ2_FULL_LOADOUT_STACK_REVIEW_V2=
 'eq2-hidden-full-loadout-affix-stack-review-v1' as const;

export interface LoadoutSourceSlotV2{
 readonly slot:GearSlotV2;
 readonly sourcePieceId:string;
 readonly classRestriction:string|null;
 readonly hands:'one'|'two'|'dual'|null;
 readonly sourceSetId:string|null;
 readonly possibleRollCount:number;
 readonly bonusCandidateCount:number;
}
export interface PotentialAffixStackV2{
 readonly combatAffixId:EquipmentAffixIdV2;
 readonly eligibleSourceSlots:readonly GearSlotV2[];
 readonly distinctItemSlots:number;
 readonly minimumSumPercentIfEveryEligibleItemRolledStat:number;
 readonly maximumSumPercentIfEveryEligibleItemRolledStat:number;
 readonly simultaneousWithOtherStatMaxima:false;
 readonly approvedFinalStackCap:null;
 readonly actualEquippedRollTotal:null;
 readonly sourceUnit:'PERCENT_OR_PERCENTAGE_POINTS_PER_STAT_DEFINITION';
}
export interface SourceLoadoutStackEnvelopeV2{
 readonly classId:ClassIdV2;
 readonly tier:V2Tier;
 readonly rarity:V2Rarity;
 readonly weaponHands:'one'|'two'|'dual';
 readonly slotCount:9|10;
 readonly absentOffhandDueToHands:boolean;
 readonly totalRandomRollBudget:number;
 readonly sourceSlots:readonly LoadoutSourceSlotV2[];
 readonly byAffix:readonly PotentialAffixStackV2[];
 readonly innatePercentEffectsExcluded:true;
 readonly setBonusesExcluded:true;
 readonly noSyntheticCombatPower:true;
 readonly canEquip:false;
 readonly canModifyItems:false;
 readonly status:'POTENTIAL_BOUNDS_NOT_REAL_SIMULTANEOUS_STATS';
}
export interface FullLoadoutStackAuditV2{
 readonly version:typeof EQ2_FULL_LOADOUT_STACK_REVIEW_V2;
 readonly scenarios:216;
 readonly classCount:9;
 readonly tierCount:4;
 readonly rarityCount:6;
 readonly tenSlotScenarios:number;
 readonly nineSlotScenarios:number;
 readonly maximumIndividualSourceRolls:number;
 readonly calculatedFinalCombatPower:false;
 readonly approvedStackCaps:0;
 readonly releaseReady:false;
 readonly rows:readonly SourceLoadoutStackEnvelopeV2[];
}
function fail(x:string):never{throw Error('eq2_full_loadout_stack_'+x);}
const round2=(x:number)=>Math.round(x*100)/100;
const assertPiece=(p:V2ServerPiece|undefined,slot:GearSlotV2,
 classId:ClassIdV2,tier:V2Tier)=> {
 if(!p||p.slot!==slot||p.tier!==tier||
    p.role!==CLASS_ROLES_V2[classId]||
    (p.classRestriction&&p.classRestriction!==classId))
  fail('missing_exact_source_piece_for_class_tier_slot');
 return p;
};
function chooseOriginalPiece(
 classId:ClassIdV2,tier:V2Tier,slot:GearSlotV2,
):V2ServerPiece {
 const choices=V2_SERVER_PIECES.filter(p=>
  p.tier===tier&&p.slot===slot&&
  p.role===CLASS_ROLES_V2[classId]&&
  (!p.classRestriction||p.classRestriction===classId));
 // Weapons and class offhands MUST be the original class item; never
 // accidentally choose another class's shield or two-handed weapon.
 const specific=slot==='weapon'||slot==='offhand';
 const ordered=choices.filter(p=>specific?
  p.classRestriction===classId:!p.classRestriction)
  .sort((a,b)=>Number(Boolean(a.setId))-Number(Boolean(b.setId))||
    a.id.localeCompare(b.id));
 return assertPiece(ordered[0],slot,classId,tier);
}
export function reviewSourceLoadoutAffixStacksV2(
 classId:ClassIdV2,tier:V2Tier,rarity:V2Rarity,
):SourceLoadoutStackEnvelopeV2{
 if(!Object.prototype.hasOwnProperty.call(CLASS_ROLES_V2,classId)||
    ![1,2,3,4].includes(tier)||
    !V2_SERVER_RARITY_BANDS.some(r=>r.rarity===rarity))
  fail('unknown_source_class_tier_or_rarity');
 const weapon=chooseOriginalPiece(classId,tier,'weapon');
 if(!weapon.hands)fail('source_weapon_hands_missing');
 const occupiesOffhand=weapon.hands==='two'||weapon.hands==='dual';
 const slots=GEAR_SLOTS_V2.filter(s=>!(s==='offhand'&&occupiesOffhand));
 const sourceSlots=slots.map(slot=>{
  const piece=slot==='weapon'?weapon:chooseOriginalPiece(classId,tier,slot);
  const preview=reviewNextMintAffixPieceV2(piece.id,rarity);
  if(preview.classOrRoleBiasedPool||preview.permittedToMint||
     preview.slot!==slot||preview.role!==CLASS_ROLES_V2[classId]||
     preview.tier!==tier)
   fail('untrusted_source_candidate');
  return Object.freeze({
   slot,sourcePieceId:piece.id,classRestriction:piece.classRestriction??null,
   hands:piece.hands??null,sourceSetId:piece.setId??null,
   possibleRollCount:preview.exactExistingRarityCount,
   bonusCandidateCount:preview.candidates.length,
  });
 });
 if(sourceSlots.length!==(occupiesOffhand?9:10)||
    new Set(sourceSlots.map(x=>x.slot)).size!==sourceSlots.length)
  fail('invalid_hands_or_duplicate_slot');
 const byStat=new Map<EquipmentAffixIdV2,{
  slots:GearSlotV2[];low:number;high:number}>();
 const band=V2_SERVER_RARITY_BANDS.find(b=>b.rarity===rarity)!;
 for(const slot of sourceSlots){
  const pool=reviewNextMintAffixPieceV2(slot.sourcePieceId,rarity);
  for(const row of pool.candidates){
   const [low,high]=row.originalPercentRange;
   const entry=byStat.get(row.combatAffixId)??{slots:[],low:0,high:0};
   if(entry.slots.includes(slot.slot))
    fail('duplicate_stat_on_one_item_slot');
   entry.slots.push(slot.slot);
   entry.low+=round2(low+(high-low)*band.low);
   entry.high+=round2(low+(high-low)*band.high);
   byStat.set(row.combatAffixId,entry);
  }
 }
 const byAffix=[...byStat.entries()].sort(([a],[b])=>a.localeCompare(b))
  .map(([combatAffixId,entry])=>Object.freeze({
   combatAffixId,eligibleSourceSlots:Object.freeze(entry.slots),
   distinctItemSlots:entry.slots.length,
   minimumSumPercentIfEveryEligibleItemRolledStat:round2(entry.low),
   maximumSumPercentIfEveryEligibleItemRolledStat:round2(entry.high),
   simultaneousWithOtherStatMaxima:false as const,
   approvedFinalStackCap:null,actualEquippedRollTotal:null,
   sourceUnit:'PERCENT_OR_PERCENTAGE_POINTS_PER_STAT_DEFINITION' as const,
  }));
 const totalRandomRollBudget=sourceSlots.reduce((n,x)=>n+x.possibleRollCount,0);
 if(!byAffix.length||!totalRandomRollBudget||
    sourceSlots.some(x=>x.possibleRollCount>x.bonusCandidateCount))
  fail('incomplete_source_budget');
 return Object.freeze({
  classId,tier,rarity,weaponHands:weapon.hands,
  slotCount:(occupiesOffhand?9:10) as 9|10,
  absentOffhandDueToHands:occupiesOffhand,totalRandomRollBudget,
  sourceSlots:Object.freeze(sourceSlots),
  byAffix:Object.freeze(byAffix),
  innatePercentEffectsExcluded:true as const,
  setBonusesExcluded:true as const,
  noSyntheticCombatPower:true as const,
  canEquip:false as const,canModifyItems:false as const,
  status:'POTENTIAL_BOUNDS_NOT_REAL_SIMULTANEOUS_STATS' as const,
 });
}
export function reviewFullLoadoutAffixStacksV2():FullLoadoutStackAuditV2{
 if(V2_SERVER_PIECES.length!==169)fail('source_catalogue_changed');
 const rows=(Object.keys(CLASS_ROLES_V2) as ClassIdV2[]).flatMap(classId=>
  ([1,2,3,4] as const).flatMap(tier=>
   V2_SERVER_RARITY_BANDS.map(b=>reviewSourceLoadoutAffixStacksV2(
    classId,tier,b.rarity))));
 if(rows.length!==216)fail('missing_class_tier_rarity_rows');
 return Object.freeze({
  version:EQ2_FULL_LOADOUT_STACK_REVIEW_V2,scenarios:216 as const,
  classCount:9 as const,tierCount:4 as const,rarityCount:6 as const,
  tenSlotScenarios:rows.filter(x=>x.slotCount===10).length,
  nineSlotScenarios:rows.filter(x=>x.slotCount===9).length,
  maximumIndividualSourceRolls:Math.max(...rows.map(x=>x.totalRandomRollBudget)),
  calculatedFinalCombatPower:false as const,
  approvedStackCaps:0 as const,releaseReady:false as const,
  rows:Object.freeze(rows),
 });
}
