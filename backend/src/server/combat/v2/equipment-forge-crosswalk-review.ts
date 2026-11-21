/**
 * HIDDEN EQUIPMENT/COMBAT 2.0 SOURCE RECONCILIATION — REVIEW ONLY.
 *
 * This module audits the current, DIFFERENT-BRANCH Forge draft's frozen roll
 * shape against the 13-stat Combat V2 resolver. It does not issue trusted
 * combat affixes, read a DB, verify a persisted receipt, change RNG, or
 * mount into any live/staging handler. The caller owns the untrusted input.
 *
 * Historical Forge rules version: equipment-crafting-v2-draft-1.
 * For approval, cross-check this source mirror against the pinned original
 * backend/src/server/equipment/equipment-crafting-v2-rolls.ts on the intended
 * merged candidate; a copied old table is never source authority.
 */
import {EQUIPMENT_AFFIXES_V2,type EquipmentAffixIdV2} from './equipment-affixes';
import type {GearSlotV2} from './build-contract';

export const FROZEN_FORGE_AUDIT_VERSION_V2='forge-combat-crosswalk-review-20261122' as const;
export const AUDITED_FORGE_RULESET_V2='equipment-crafting-v2-draft-1' as const;
export type ForgeDraftRollIdV2=
 'armor'|'maxHp'|'ward'|'tenacity'|'critRate'|'critDamage'|'haste'|
 'penetration'|'accuracy'|'potency'|'abilityDamage'|'healingPower';
export type ForgeDraftRarityV2='common'|'uncommon'|'rare'|'epic'|'legendary'|'mythic';
export type ForgeDraftRoleV2='tank'|'damage'|'support';

export interface UntrustedForgeRollV2 {
 readonly stat:string;
 /** Forge stores human-readable percent, e.g. 2.5 == 2.5%, NOT 2.5x. */
 readonly percent:number;
 readonly grade:number;
}
export interface UntrustedForgeSnapshotV2 {
 readonly rulesVersion:string;
 readonly instanceId:string;
 readonly slot:GearSlotV2;
 readonly tier:number;
 readonly rarity:ForgeDraftRarityV2;
 readonly quality:number;
 /** Required flag only for audit; NO privilege is inferred from it. */
 readonly frozenPrimaryStatsAlreadyScaled:boolean;
 readonly rolls:readonly UntrustedForgeRollV2[];
}
export type CrosswalkIssueCodeV2=
 'snapshot_untrusted'|'ambiguous_semantics'|'engine_extension_pending'|
 'slot_ineligible'|'over_approved_count'|'unapproved_forge_version'|
 'primary_scaling_unverified'|'range_policy_unreconciled';

export interface ForgeCrosswalkIssueV2 {
 readonly code:CrosswalkIssueCodeV2;
 readonly stat?:string;
 readonly detail:string;
}
export interface CandidateForgeAffixV2 {
 readonly from:ForgeDraftRollIdV2;
 readonly id:EquipmentAffixIdV2;
 readonly value:number;
 readonly sourcePercent:number;
 readonly unit:'relative_percent'|'percentage_points';
}
export interface ForgeCombatAuditResultV2 {
 readonly auditVersion:typeof FROZEN_FORGE_AUDIT_VERSION_V2;
 readonly activateInCombat:false;
 readonly fromUnverifiedSnapshot:true;
 readonly candidates:readonly CandidateForgeAffixV2[];
 readonly issues:readonly ForgeCrosswalkIssueV2[];
}

/** The only five names currently compatible by apparent *stat meaning*.
 * These still require authoritative unit/receipt proof before execution.
 * DO NOT expand this list by treating a similarly named stat as equivalent.
 */
const DIRECT_MAP:Readonly<Partial<Record<ForgeDraftRollIdV2,EquipmentAffixIdV2>>>={
 critRate:'crit_rate_pp',critDamage:'crit_damage_pct',haste:'haste_pp',
 penetration:'penetration_pp',accuracy:'accuracy_pp',
};
const PENDING_ENGINE=new Set<ForgeDraftRollIdV2>(['tenacity','abilityDamage']);
const SEMANTIC_AMBIGUOUS=new Set<ForgeDraftRollIdV2>([
 'armor','maxHp','ward','potency','healingPower',
]);
export const FORGE_DRAFT_ROLE_ROLLS_V2:Readonly<Record<ForgeDraftRoleV2,readonly ForgeDraftRollIdV2[]>>={
 tank:['armor','maxHp','ward','tenacity'],
 damage:['critRate','critDamage','haste','penetration','abilityDamage','accuracy','potency'],
 support:['potency','healingPower','ward','haste','maxHp','tenacity'],
};
/** The Forge draft has a 70% preferred-slot / 30% full-role pool;
 * its fallback may roll any role ID in any slot. These preferences are
 * NOT eligibility constraints and MUST NOT be used to validate receipts.
 */
export const FORGE_DRAFT_SLOT_PREFERENCES_V2:Readonly<Record<GearSlotV2,readonly ForgeDraftRollIdV2[]>>={
 helmet:['armor','maxHp','ward','accuracy'],
 chest:['armor','maxHp','ward','tenacity'],
 gloves:['critRate','critDamage','haste','accuracy'],
 legs:['maxHp','armor','ward','tenacity'],
 boots:['haste','accuracy','tenacity','maxHp'],
 cape:['ward','potency','healingPower','maxHp'],
 weapon:['critRate','critDamage','penetration','abilityDamage','potency','healingPower'],
 offhand:['armor','maxHp','ward','potency'],
 amulet:['critDamage','abilityDamage','healingPower','maxHp'],
 ring:['critRate','haste','penetration','potency'],
};
/** Preserved rarity counts from the Forge draft, not a launch approval. */
const MAX_ROLLS:Readonly<Record<ForgeDraftRarityV2,readonly [number,number]>>={
 common:[1,1],uncommon:[1,1],rare:[1,1],
 epic:[1,2],legendary:[2,2],mythic:[2,3],
};
const isKnown=(x:string):x is ForgeDraftRollIdV2=>
 Object.prototype.hasOwnProperty.call(FORGE_DRAFT_ROLE_ROLLS_V2,'tank')&&(
  Object.values(FORGE_DRAFT_ROLE_ROLLS_V2).some(rows=>rows.includes(x as ForgeDraftRollIdV2))
 );
const validId=(value:unknown)=>typeof value==='string'&&
 /^[A-Za-z0-9:_-]{1,160}$/.test(value);
const validSlot=(slot:unknown):slot is GearSlotV2=>
 typeof slot==='string'&&Object.prototype.hasOwnProperty.call(FORGE_DRAFT_SLOT_PREFERENCES_V2,slot);
const fail=(code:string):never=>{throw Error('combat_v2_forge_audit_'+code);};

/** Server-read-only issue report, never a trusted runtime authorizer.
 * Returns NO candidate projection if any incompatibility is present.
 * It NEVER marks combat activation as allowed, even on the clean subset.
 */
export function auditUntrustedForgeRollCrosswalkV2(
 receipt:UntrustedForgeSnapshotV2,
):ForgeCombatAuditResultV2{
 if(!receipt||!validId(receipt.instanceId)||!validSlot(receipt.slot)||
   !Number.isInteger(receipt.tier)||receipt.tier<1||receipt.tier>4||
   !Object.prototype.hasOwnProperty.call(MAX_ROLLS,receipt.rarity)||
   !Number.isInteger(receipt.quality)||receipt.quality<0||receipt.quality>100||
   !Array.isArray(receipt.rolls)||receipt.rolls.length>3)
  fail('malformed_snapshot');
 const issues:ForgeCrosswalkIssueV2[]=[{
  code:'snapshot_untrusted',detail:'No privileged DB custody or immutable receipt verification supplied',
 }];
 if(receipt.rulesVersion!==AUDITED_FORGE_RULESET_V2)issues.push({
  code:'unapproved_forge_version',detail:'Unsupported frozen Forge ruleset',
 });
 if(receipt.frozenPrimaryStatsAlreadyScaled!==true)issues.push({
  code:'primary_scaling_unverified',detail:'Cannot reapply rarity or quality to primary stats',
 });
 const max=MAX_ROLLS[receipt.rarity][receipt.tier<=2?0:1];
 if(receipt.rolls.length>max)issues.push({
  code:'over_approved_count',detail:'Forge draft count differs from rarity/tier policy',
 });
 const candidates:CandidateForgeAffixV2[]=[];
 const seen=new Set<string>();
 for(const roll of receipt.rolls){
  if(!roll||typeof roll.stat!=='string'||!isKnown(roll.stat)||
     seen.has(roll.stat)||typeof roll.percent!=='number'||
     !Number.isFinite(roll.percent)||roll.percent<0||roll.percent>100||
     Math.abs(roll.percent*100-Math.round(roll.percent*100))>1e-6||
     !Number.isInteger(roll.grade)||roll.grade<0||roll.grade>100)
   fail('invalid_or_duplicate_roll');
  seen.add(roll.stat);
  const stat=roll.stat as ForgeDraftRollIdV2;
  if(SEMANTIC_AMBIGUOUS.has(stat)){
   issues.push({code:'ambiguous_semantics',stat,
    detail:'Meaning or eligible effect class differs; preserve frozen value, do not rename'});
   continue;
  }
  if(PENDING_ENGINE.has(stat)){
   issues.push({code:'engine_extension_pending',stat,
    detail:'No compatible 13-stat compiler channel; separate engine/source adapter required'});
   continue;
  }
  const id=DIRECT_MAP[stat];
  if(!id)fail('unmapped_roll');
  const definition=EQUIPMENT_AFFIXES_V2[id];
  if(!definition.slots.includes(receipt.slot)){
   issues.push({code:'slot_ineligible',stat,
    detail:'Forge 30% role fallback can mint this stat in a Combat-disallowed slot'});
   continue;
  }
  const value=Math.round(roll.percent*10000)/1000000;
  candidates.push({from:stat,id,value,sourcePercent:roll.percent,unit:definition.unit});
 }
 // Even an all-compatible candidate needs source-owned range, cap, semantic
 // version and total-loadout verification before it can be made trusted.
 issues.push({code:'range_policy_unreconciled',
  detail:'T4 Forge roll ranges, authored Combat bands and final legal totals have not been reconciled'});
 return {
  auditVersion:FROZEN_FORGE_AUDIT_VERSION_V2,activateInCombat:false,
  fromUnverifiedSnapshot:true,
  candidates:issues.some(issue=>issue.code!=='snapshot_untrusted'&&
    issue.code!=='range_policy_unreconciled')?[]:candidates,
  issues,
 };
}

export interface ForgeSlotExposureV2{
 readonly role:ForgeDraftRoleV2;
 readonly slot:GearSlotV2;
 readonly forgeStat:ForgeDraftRollIdV2;
 readonly combatStat:EquipmentAffixIdV2;
 readonly issue:'forge_may_roll_ineligible_slot';
}
/** Static proof of the systemic Forge -> Combat slot conflict. The 30%
 * fallback selects the full weighted role pool, not just preferred slots.
 * Every entry is a possible legal draft outcome but invalid Combat gear.
 */
export function findForgeCombatSlotConflictsV2():readonly ForgeSlotExposureV2[]{
 const problems:ForgeSlotExposureV2[]=[];
 for(const role of Object.keys(FORGE_DRAFT_ROLE_ROLLS_V2) as ForgeDraftRoleV2[])
  for(const slot of Object.keys(FORGE_DRAFT_SLOT_PREFERENCES_V2) as GearSlotV2[])
   for(const forgeStat of FORGE_DRAFT_ROLE_ROLLS_V2[role]){
    const combatStat=DIRECT_MAP[forgeStat];
    if(combatStat&&!EQUIPMENT_AFFIXES_V2[combatStat].slots.includes(slot))
     problems.push({role,slot,forgeStat,combatStat,
      issue:'forge_may_roll_ineligible_slot'});
   }
 return problems;
}
