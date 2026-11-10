import {itemDef} from '../content/items';
import {itemRarity,type ItemRarity,rarityMeta} from './item-rarity';

/** Rates for new timed Forge equipment only. Preserve the Epic/Mythic 0.60%/0.10% chances. */
export const CRAFTED_MYTHIC_CHANCE=.001;
export const CRAFTED_LEGENDARY_CHANCE=.002;
export const CRAFTED_EPIC_CHANCE=.006;
export const CRAFTED_RARE_CHANCE=.03;
export const CRAFTED_UNCOMMON_CHANCE=.07;
export const CRAFTED_COMMON_CHANCE=1-(CRAFTED_MYTHIC_CHANCE+CRAFTED_LEGENDARY_CHANCE+CRAFTED_EPIC_CHANCE+CRAFTED_RARE_CHANCE+CRAFTED_UNCOMMON_CHANCE);

/** A single authoritative roll table drives both Forge outcomes and the player-facing odds guide. */
const forgeRarityRolls:ReadonlyArray<{rarity:ItemRarity;chance:number}>=[
  {rarity:'mythic',chance:CRAFTED_MYTHIC_CHANCE},
  {rarity:'legendary',chance:CRAFTED_LEGENDARY_CHANCE},
  {rarity:'epic',chance:CRAFTED_EPIC_CHANCE},
  {rarity:'rare',chance:CRAFTED_RARE_CHANCE},
  {rarity:'uncommon',chance:CRAFTED_UNCOMMON_CHANCE},
  {rarity:'common',chance:CRAFTED_COMMON_CHANCE},
];
const order:ItemRarity[]=['common','uncommon','rare','epic','legendary','mythic'];
export function higherRarity(a:ItemRarity,b:ItemRarity){return order.indexOf(a)>=order.indexOf(b)?a:b;}

/** Every equipment tier uses the same Forge roll table. Tier identity controls gear stats, not rarity odds. */
export function craftedGearRarity(itemId:string,roll:number):ItemRarity{
  if(!Number.isFinite(roll)||roll<0||roll>=1)throw new Error('Invalid crafted rarity roll');
  const item=itemDef(itemId);if(item.type!=='gear')throw new Error('Crafted rarity only applies to equipment');
  // Integer buckets avoid floating-point drift at exact rarity cutoffs (e.g. 0.009).
  const sample=Math.floor(roll*1_000_000);
  let cutoff=0;
  for(const outcome of forgeRarityRolls){
    cutoff+=Math.round(outcome.chance*1_000_000);
    if(sample<cutoff)return outcome.rarity;
  }
  return 'common'; // Floating point rounding fallback at the upper endpoint.
}

/** Rarity odds for timed Forge are identical for every tier and recipe. */
export function craftedGearRarityOutcomes(itemId:string):Array<{rarity:ItemRarity;chance:number;statMultiplier:number}>{
  const item=itemDef(itemId);
  if(item.type!=='gear')throw new Error('Forge rarity odds require equipment');
  return order.map(rarity=>{
    const chance=forgeRarityRolls.find(outcome=>outcome.rarity===rarity)!.chance;
    return {rarity,chance,statMultiplier:craftedRarityStatMultiplier(itemId,rarity)};
  });
}

/** Retain 75% of the recent higher-tier rarity uplift, without nerfing T1.
 * This moderates Chapter 1/T2 and later dungeons without buffing monsters
 * against Common-geared players. All rarity odds and quality rolls stay intact. */
export const CRAFTED_HIGHER_TIER_RARITY_UPLIFT_RETENTION=.75;
export function craftedRarityStatMultiplier(itemId:string,rarity:ItemRarity){
  const item=itemDef(itemId);
  if(item.type!=='gear')throw new Error('Forged rarity requires equipment');
  const rolled=rarityMeta(rarity).statMultiplier;
  const catalogBase=rarityMeta(itemRarity(item)).statMultiplier;
  const beforeRecentBuff=Math.max(1,rolled/catalogBase);
  return beforeRecentBuff+(rolled-beforeRecentBuff)*CRAFTED_HIGHER_TIER_RARITY_UPLIFT_RETENTION;
}

export function deterministicCraftRarityRoll(seed:string){
  let hash=2166136261;
  for(const ch of seed){hash^=ch.charCodeAt(0);hash=Math.imul(hash,16777619)>>>0;}
  return (hash%1_000_000)/1_000_000;
}
