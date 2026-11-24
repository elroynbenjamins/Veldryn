/**
 * HIDDEN Equipment 2.0 next-generation BONUS ROLL proposal.
 *
 * Class/role/slot independence is for RANDOM BONUS STAT identity only.
 * The original Forge piece's authored intrinsic stats, classRestriction,
 * role and weapon-hand requirements remain unchanged. This does not replace
 * the existing original Forge 2.0 persisted roll schema/rules version.
 *
 * REVIEW-ONLY non-mintable candidate. No public route, ledger, combat
 * authorization, item creation, RNG write, Bank custody or marketplace.
 */
import {v2ServerRecipeAndPiece} from './equipment-crafting-v2-manifest';
import {V2_SERVER_RARITY_BANDS,V2_SERVER_RARITY_BASE_MULTIPLIER,
 V2_SERVER_AFFIX_RANGES,type V2Affix,type V2Rarity,
 type V2Slot,type V2Role,type V2Tier} from './equipment-crafting-v2-rolls';

export const UNIVERSAL_FORGE_AFFIX_REVIEW_VERSION=
 'eq2-universal-class-independent-bonus-proposal-v1' as const;

/** Explicitly mapped to existing Combat channels. Original Forge 'potency'
 * is excluded until it has one approved and mechanically exact meaning. */
export const UNIVERSAL_FORGE_BONUS_STAT_POOL_V2:readonly V2Affix[]=[
 'armor','maxHp','ward','tenacity','critRate','critDamage',
 'haste','penetration','accuracy','abilityDamage','healingPower',
];
export interface ClassIndependentBonusPreviewV2{
 readonly scope:'NON_MINTABLE_CLASS_INDEPENDENT_AFFIX_PREVIEW';
 readonly proposalVersion:typeof UNIVERSAL_FORGE_AFFIX_REVIEW_VERSION;
 readonly originalManifestPieceId:string;
 readonly originalRecipeId:string;
 readonly tier:V2Tier;
 /** Verifies the *authored* item identity, not a random-bonus restriction. */
 readonly originalSlot:V2Slot;
 readonly originalRole:V2Role;
 readonly originalClassRestriction?:string;
 readonly rarity:V2Rarity;
 readonly quality:number;
 readonly baseStatMultiplier:number;
 readonly bonusStats:readonly {
  readonly stat:V2Affix;readonly percent:number;readonly grade:number;
 }[];
 readonly independentOfClassAndRole:true;
 readonly originalInnateStatsUnchanged:true;
 readonly canMint:false;
 readonly canEquip:false;
 readonly canAuthorizeCombat:false;
 readonly canListOnMarket:false;
 readonly grantsRewards:false;
 readonly releaseApproved:false;
}
const fail=(reason:string):never=>{throw Error('eq2_universal_bonus_'+reason);};
const take=(source:(max:number)=>number,max:number)=>{
 if(!Number.isSafeInteger(max)||max<1)fail('invalid_draw_range');
 const unit=source(max);
 if(!Number.isSafeInteger(unit)||unit<0||unit>=max)
  fail('invalid_server_draw');
 return unit;
};
/**
 * Deterministic only with the supplied TEST RNG. This function is a
 * specification, NOT a minting authority or approved cryptographic draw.
 * No client-supplied value may be injected into a production transaction.
 */
export function previewClassIndependentOriginalForgeAffixesV2(
 pieceId:string,recipeId:string,drawInt:(exclusiveMax:number)=>number,
):ClassIndependentBonusPreviewV2{
 if(typeof drawInt!=='function')fail('trusted_test_draw_required');
 const linked=v2ServerRecipeAndPiece(recipeId);
 const piece=linked?.piece,recipe=linked?.recipe;
 if(!piece||!recipe||piece.id!==pieceId||
  !Number.isSafeInteger(piece.tier)||piece.tier<1||piece.tier>4||
  recipe.pieceId!==pieceId||recipe.tier!==piece.tier)
  fail('unknown_or_mismatched_original_forge_recipe');
 if(UNIVERSAL_FORGE_BONUS_STAT_POOL_V2.length!==11||
  new Set(UNIVERSAL_FORGE_BONUS_STAT_POOL_V2).size!==11||
  UNIVERSAL_FORGE_BONUS_STAT_POOL_V2.includes('potency'))
  fail('unsupported_or_duplicate_bonus_pool');
 const rarityRoll=take(drawInt,1000000);
 let cumulative=0;
 const band=V2_SERVER_RARITY_BANDS.find(b=>{
  cumulative+=b.buckets;return rarityRoll<cumulative;
 });
 if(!band)fail('missing_original_rarity_band');
 // Keep the original Forge distribution and Q0-Q100 curve as-is.
 const qualityUnit=take(drawInt,1000000)/1000000;
 const quality=Math.min(100,Math.floor(Math.pow(qualityUnit,1.25)*101));
 const count=piece.tier>=3?band.affixesHighTier:band.affixesLowTier;
 if(!Number.isSafeInteger(count)||count<1||count>3)fail('invalid_roll_count');
 const remaining=[...UNIVERSAL_FORGE_BONUS_STAT_POOL_V2];
 const bonusStats:ClassIndependentBonusPreviewV2['bonusStats'][number][]=[];
 for(let index=0;index<count;index++){
  // Same pool, same relative selection probabilities and same roll count for
  // EVERY item class, role and slot. Distinct stats per individual item.
  const [stat]=remaining.splice(take(drawInt,remaining.length),1);
  if(!stat)fail('no_available_bonus_stat');
  const [min,max]=V2_SERVER_AFFIX_RANGES[stat][piece.tier-1];
  const unit=take(drawInt,10001)/10000;
  const sampled=band.low+(band.high-band.low)*unit;
  const percent=Math.round((min+(max-min)*sampled)*100)/100;
  const grade=Math.max(0,Math.min(100,Math.round(
   (percent-min)/(max-min)*100)));
  bonusStats.push({stat,percent,grade});
 }
 return {
  scope:'NON_MINTABLE_CLASS_INDEPENDENT_AFFIX_PREVIEW',
  proposalVersion:UNIVERSAL_FORGE_AFFIX_REVIEW_VERSION,
  originalManifestPieceId:piece.id,originalRecipeId:recipe.id,
  tier:piece.tier,originalSlot:piece.slot,originalRole:piece.role,
  ...(piece.classRestriction?{originalClassRestriction:piece.classRestriction}:{}),
  rarity:band.rarity,quality,
  baseStatMultiplier:V2_SERVER_RARITY_BASE_MULTIPLIER[band.rarity]*
   (.75+quality*.005),
  bonusStats,
  independentOfClassAndRole:true,originalInnateStatsUnchanged:true,
  canMint:false,canEquip:false,canAuthorizeCombat:false,
  canListOnMarket:false,grantsRewards:false,releaseApproved:false,
 };
}
