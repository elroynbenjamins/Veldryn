/**
 * Hidden Veldryn 2.0 instant crafting Career XP proof projector.
 * This is intentionally NOT used by live crafting, DB settlement or 1.x UI.
 *
 * Inputs must be populated by the authenticated executeGameCommand result,
 * canonical server recipes and actual before/after character skill states.
 * No award from queued Forge starts, cancellations, marketplace orders or
 * client-submitted estimated XP. Timed craft_claim requires a separate proof.
 */
type CraftSkillV2='smithing'|'tailoring'|'cooking'|'alchemy'|'enchanting';
const SKILLS:ReadonlySet<string>=new Set(['smithing','tailoring','cooking','alchemy','enchanting']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HASH=/^[0-9a-f]{64}$/;
const TOKEN=/^[A-Za-z0-9_:-]{3,128}$/;
const REQUEST=/^[A-Za-z0-9_-]{8,128}$/;
const safeInt=(value:unknown,lo:number,hi:number):value is number=>
  typeof value==='number'&&Number.isSafeInteger(value)&&value>=lo&&value<=hi;
export interface InstantCraftRecipeV2 {
  readonly id:string;
  readonly skillId:CraftSkillV2;
  readonly level:number;
  readonly seconds:number;
  readonly isTimed:boolean;
}
export interface CraftingContributionV2{
  readonly kind:string;
  readonly contentId:string;
  readonly units:number;
}
export interface TrustedInstantCraftV2 {
  readonly accountId:string;
  readonly requestId:string;
  readonly requestHash:string;
  readonly commandType:string;
  readonly expectedGameRevision:number;
  readonly adminQa:boolean;
  readonly originalCharacterId:string|null;
  readonly committedCharacterId:string|null;
  readonly requestedRecipeId:string;
  readonly requestedQuantity:number;
  readonly contributions:readonly CraftingContributionV2[];
  readonly recipes:readonly InstantCraftRecipeV2[];
  readonly owningSkillLevel:number;
  readonly owningSkillXpBefore:number;
  readonly owningSkillXpAfter:number;
}
export interface PendingInstantCraftCareerProofV2 {
  readonly sourceKind:'craft_claim';
  readonly sourceId:string;
  readonly accountId:string;
  readonly requestId:string;
  readonly requestHash:string;
  readonly segmentIndex:0;
  readonly characterId:string;
  readonly professionId:CraftSkillV2;
  readonly baseEffortSeconds:number;
  readonly difficultyBasisPoints:2500|5000|10000;
  readonly expectedGameRevision:number;
  readonly sourceCompletedAtMs:null;
}
async function digest(input:string):Promise<string>{
  const raw=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input)));
  return Array.from(raw,byte=>byte.toString(16).padStart(2,'0')).join('');
}
export async function projectPendingInstantCraftCareerProofV2(
 source:TrustedInstantCraftV2,
):Promise<PendingInstantCraftCareerProofV2|null>{
  if(!source||!UUID.test(source.accountId)||!REQUEST.test(source.requestId)||
    !HASH.test(source.requestHash)||!safeInt(source.expectedGameRevision,1,Number.MAX_SAFE_INTEGER)||
    !safeInt(source.requestedQuantity,1,999)||!TOKEN.test(source.requestedRecipeId)||
    !safeInt(source.owningSkillLevel,1,100)||
    !safeInt(source.owningSkillXpBefore,0,Number.MAX_SAFE_INTEGER)||
    !safeInt(source.owningSkillXpAfter,0,Number.MAX_SAFE_INTEGER)||
    typeof source.adminQa!=='boolean'||!Array.isArray(source.contributions)||
    source.contributions.length>16||!Array.isArray(source.recipes)||source.recipes.length>2000)
    throw Error('instant_craft_v2_invalid_context');
  if(source.adminQa||source.commandType!=='craft')return null;
  if(!source.originalCharacterId||!UUID.test(source.originalCharacterId)||
    !source.committedCharacterId||!UUID.test(source.committedCharacterId)||
    source.originalCharacterId.toLowerCase()!==source.committedCharacterId.toLowerCase())
    throw Error('instant_craft_v2_character_switch');
  const known=new Map<string,InstantCraftRecipeV2>();
  for(const recipe of source.recipes){
    if(!recipe||!TOKEN.test(recipe.id)||!SKILLS.has(recipe.skillId)||
      !safeInt(recipe.level,1,100)||!safeInt(recipe.seconds,1,108000)||
      typeof recipe.isTimed!=='boolean'||known.has(recipe.id))
      throw Error('instant_craft_v2_invalid_catalogue');
    known.set(recipe.id,recipe);
  }
  const recipe=known.get(source.requestedRecipeId);
  if(!recipe)throw Error('instant_craft_v2_unknown_recipe');
  if(recipe.isTimed)return null; // queued job start is not a completed craft
  if(source.owningSkillLevel<recipe.level)throw Error('instant_craft_v2_skill_locked');
  // A single 'craft' command requests one canonical recipe. A second crafted
  // item in the same source envelope makes XP attribution ambiguous: fail
  // closed instead of awarding Character XP for an unrelated work product.
  if(source.contributions.some(c=>!c||typeof c.kind!=='string'||
      typeof c.contentId!=='string'||!safeInt(c.units,0,999999)))
    throw Error('instant_craft_v2_invalid_contributions');
  const crafted=source.contributions.filter(c=>c.kind==='crafting');
  if(crafted.some(c=>c.contentId!==recipe.id))
    throw Error('instant_craft_v2_mixed_crafting_sources');
  const matched=crafted.filter(c=>c.contentId===recipe.id);
  if(matched.length!==1||!safeInt(matched[0].units,1,999)||
     matched[0].units!==source.requestedQuantity)
    throw Error('instant_craft_v2_incomplete_work');
  if(source.owningSkillXpAfter<source.owningSkillXpBefore)
    throw Error('instant_craft_v2_skill_xp_regressed');
  if(source.owningSkillLevel<100 &&
     source.owningSkillXpAfter===source.owningSkillXpBefore)
    throw Error('instant_craft_v2_no_earned_skill_xp');
  // No unlimited character XP via a single instant bulk action. Tune before
  // release with resource sinks and the Player Market; this is NOT recipe XP.
  const baseEffortSeconds=Math.min(10800,recipe.seconds*source.requestedQuantity);
  const overlevel=source.owningSkillLevel-recipe.level;
  const difficultyBasisPoints:2500|5000|10000=overlevel>=40?2500:overlevel>=20?5000:10000;
  return {
    sourceKind:'craft_claim',sourceId:await digest(
      'career-v2:'+source.accountId.toLowerCase()+':'+
      source.requestId+':'+source.requestHash+':0',
    ),
    accountId:source.accountId.toLowerCase(),requestId:source.requestId,
    requestHash:source.requestHash,segmentIndex:0,
    characterId:source.originalCharacterId.toLowerCase(),
    professionId:recipe.skillId,
    baseEffortSeconds,difficultyBasisPoints,
    expectedGameRevision:source.expectedGameRevision,sourceCompletedAtMs:null,
  };
}
