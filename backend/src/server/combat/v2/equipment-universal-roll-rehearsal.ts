/**
 * HIDDEN / REVIEW ONLY: source-pinned, class-neutral future EQ2 roll rehearsal.
 *
 * This is a deterministic *PREVIEW*, NOT an item mint, receipt, trade,
 * inventory/equipment writer, combat stat authority, or shipping RNG policy.
 * It deliberately never returns an instance ID, owner, custody or an item.
 * It uses the original hidden rarity/quality/grade distributions as a model;
 * the NEW uniform distinct-bonus draw is a proposed distribution that has not
 * been approved for actual minting. Original role-biased Forge RNG untouched.
 */
import {randomInt} from 'node:crypto';
import {v2ServerPiece} from '../../equipment/equipment-crafting-v2-manifest';
import {
 EQUIPMENT_V2_SERVER_RULES_VERSION,
 V2_SERVER_RARITY_BANDS,V2_SERVER_AFFIX_RANGES,
 type V2Affix,type V2Rarity,type V2Tier,
} from '../../equipment/equipment-crafting-v2-rolls';
import {
 PROPOSED_FORGE_NEXT_MINT_ROLL_POLICY_V2,
 reviewNextMintAffixPieceV2,
} from './equipment-forge-next-mint-roll-policy-review';
import type {EquipmentAffixIdV2} from './equipment-affixes';

export const UNIVERSAL_EQ2_ROLL_REHEARSAL_V2=
 'eq2-hidden-class-neutral-roll-rehearsal-v1' as const;
export interface UniversalRollCandidateV2{
 readonly forgeStat:Exclude<V2Affix,'potency'>;
 readonly combatAffixId:EquipmentAffixIdV2;
 /** Source-authored percent, not fractional bonus. No final CP implied. */
 readonly sourcePercent:number;
 readonly grade:number;
 readonly originalTierRange:readonly [number,number];
 readonly randomAffixNotInnate:true;
}
export interface UniversalRollRehearsalV2{
 readonly version:typeof UNIVERSAL_EQ2_ROLL_REHEARSAL_V2;
 readonly candidatePolicy:typeof PROPOSED_FORGE_NEXT_MINT_ROLL_POLICY_V2;
 readonly originalSourceRules:typeof EQUIPMENT_V2_SERVER_RULES_VERSION;
 readonly pieceId:string;
 readonly tier:V2Tier;
 readonly rarity:V2Rarity;
 readonly quality:number;
 readonly gradePolicy:'SOURCE_RARITY_BAND_UNCHANGED';
 readonly randomBonusSelection:'PROPOSED_UNIFORM_WITHOUT_REPLACEMENT';
 readonly rollCount:number;
 readonly randomRolls:readonly UniversalRollCandidateV2[];
 readonly classOrRoleInfluencesRng:false;
 readonly innateEffectIncluded:false;
 readonly canMint:false;
 readonly canPersist:false;
 readonly canEquip:false;
 readonly canTrade:false;
 readonly status:'REVIEW_ONLY_NONISSUABLE';
}
export type RehearsalDrawV2=(exclusiveMax:number)=>number;
function fail(x:string):never{throw Error('eq2_universal_roll_rehearsal_'+x);}
function drawInt(draw:RehearsalDrawV2,max:number){
 if(!Number.isSafeInteger(max)||max<1)fail('invalid_draw_upper_bound');
 const value=draw(max);
 if(!Number.isSafeInteger(value)||value<0||value>=max)
  fail('untrusted_or_invalid_rng');
 return value;
}
const round2=(x:number)=>Math.round(x*100)/100;

/**
 * Preview-only deterministic rehearsal with an injectable RNG for source QA.
 * Real deployment must use an approved and versioned server-only draw and
 * privileged item provenance: NEVER call this as an item creation handler.
 */
export function rehearseUniversalForgeRollV2(
 pieceId:string,draw:RehearsalDrawV2=randomInt,
):UniversalRollRehearsalV2{
 if(typeof pieceId!=='string'||pieceId.length>128)
  fail('unknown_pinned_equipment');
 const piece=v2ServerPiece(pieceId);
 if(!piece||typeof draw!=='function')fail('unknown_pinned_equipment_or_rng');
 const bands=V2_SERVER_RARITY_BANDS;
 if(bands.length!==6||bands.reduce((sum,b)=>sum+b.buckets,0)!==1000000)
  fail('source_rarity_distribution_drift');
 let marker=drawInt(draw,1000000);
 let band:typeof bands[number]|undefined;
 for(const candidate of bands){
  if(marker<candidate.buckets){band=candidate;break;}
  marker-=candidate.buckets;
 }
 if(!band)fail('unreachable_rarity');
 const qualityDraw=drawInt(draw,1000000);
 const quality=Math.min(100,Math.floor(Math.pow(qualityDraw/1000000,1.25)*101));
 const pool=reviewNextMintAffixPieceV2(piece.id,band.rarity);
 if(pool.classOrRoleBiasedPool||pool.slotRulesChanged||pool.permittedToMint)
  fail('new_mint_policy_not_review_only');
 const expectedCount=pool.exactExistingRarityCount;
 if(expectedCount<1||expectedCount>3||pool.candidates.length<expectedCount)
  fail('invalid_rarity_bonus_count');
 const choices=[...pool.candidates];
 const randomRolls:UniversalRollCandidateV2[]=[];
 // Every stat is equip-slot eligible. No role or class is read or applied
 // to selection weights; draw uniformly WITHOUT replacement.
 for(let i=0;i<expectedCount;i++){
  const candidate=choices.splice(drawInt(draw,choices.length),1)[0];
  if(!candidate)fail('depleted_source_affix_pool');
  const [min,max]=V2_SERVER_AFFIX_RANGES[candidate.forgeStat][piece.tier-1];
  const unit=drawInt(draw,10001)/10000;
  const rarityScaled=band.low+(band.high-band.low)*unit;
  const percent=round2(min+(max-min)*rarityScaled);
  const grade=Math.max(0,Math.min(100,Math.round(
   (percent-min)/(max-min)*100)));
  if(!Number.isFinite(percent)||!Number.isFinite(grade)||
     percent<min-0.0051||percent>max+0.0051)
   fail('invalid_percent_or_grade');
  randomRolls.push(Object.freeze({
   forgeStat:candidate.forgeStat,combatAffixId:candidate.combatAffixId,
   sourcePercent:percent,grade,
   originalTierRange:Object.freeze([min,max]) as readonly [number,number],
   randomAffixNotInnate:true as const,
  }));
 }
 if(randomRolls.length!==expectedCount||
    new Set(randomRolls.map(x=>x.forgeStat)).size!==expectedCount)
  fail('duplicate_or_extra_bonus_roll');
 return Object.freeze({
  version:UNIVERSAL_EQ2_ROLL_REHEARSAL_V2,
  candidatePolicy:PROPOSED_FORGE_NEXT_MINT_ROLL_POLICY_V2,
  originalSourceRules:EQUIPMENT_V2_SERVER_RULES_VERSION,
  pieceId:piece.id,tier:piece.tier,rarity:band.rarity,quality,
  gradePolicy:'SOURCE_RARITY_BAND_UNCHANGED' as const,
  randomBonusSelection:'PROPOSED_UNIFORM_WITHOUT_REPLACEMENT' as const,
  rollCount:expectedCount,
  randomRolls:Object.freeze(randomRolls),
  classOrRoleInfluencesRng:false as const,innateEffectIncluded:false as const,
  canMint:false as const,canPersist:false as const,
  canEquip:false as const,canTrade:false as const,
  status:'REVIEW_ONLY_NONISSUABLE' as const,
 });
}
