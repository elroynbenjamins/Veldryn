import {itemDef} from '../content/items';
import {itemRarity,type ItemRarity,rarityMeta} from './item-rarity';

export const CRAFTED_MYTHIC_CHANCE=.001;
export const CRAFTED_EPIC_CHANCE=.006;

const order:ItemRarity[]=['common','uncommon','rare','epic','legendary','mythic'];
export function higherRarity(a:ItemRarity,b:ItemRarity){return order.indexOf(a)>=order.indexOf(b)?a:b;}

/** Forge quality is an upward proc: a miss preserves the authored/base rarity. */
export function craftedGearRarity(itemId:string,roll:number):ItemRarity{
  if(roll<0||roll>=1)throw new Error('Invalid crafted rarity roll');
  const item=itemDef(itemId);if(item.type!=='gear')throw new Error('Crafted rarity only applies to equipment');
  const base=itemRarity(item);
  if(roll<CRAFTED_MYTHIC_CHANCE)return higherRarity(base,'mythic');
  if(roll<CRAFTED_MYTHIC_CHANCE+CRAFTED_EPIC_CHANCE)return higherRarity(base,'epic');
  return base;
}

/** Actual final rarity outcomes for the selected Forge recipe.
 * Upgrade procs never downgrade high-base-rarity equipment, so probability
 * mass from a lower proc is folded into its authored minimum rarity.
 */
export function craftedGearRarityOutcomes(itemId:string):Array<{rarity:ItemRarity;chance:number;statMultiplier:number}>{
  const item=itemDef(itemId);
  if(item.type!=='gear')throw new Error('Forge rarity odds require equipment');
  const base=itemRarity(item),chances=new Map<ItemRarity,number>();
  const record=(rarity:ItemRarity,chance:number)=>chances.set(rarity,(chances.get(rarity)??0)+chance);
  record(base,1-CRAFTED_EPIC_CHANCE-CRAFTED_MYTHIC_CHANCE);
  record(higherRarity(base,'epic'),CRAFTED_EPIC_CHANCE);
  record(higherRarity(base,'mythic'),CRAFTED_MYTHIC_CHANCE);
  return order.filter(rarity=>(chances.get(rarity)??0)>0).map(rarity=>({
    rarity,chance:chances.get(rarity)!,statMultiplier:craftedRarityStatMultiplier(itemId,rarity),
  }));
}

export function craftedRarityStatMultiplier(itemId:string,rarity:ItemRarity){
  const base=itemRarity(itemDef(itemId));
  const baseMultiplier=rarityMeta(base).statMultiplier||1;
  return Math.max(1,rarityMeta(rarity).statMultiplier/baseMultiplier);
}

export function deterministicCraftRarityRoll(seed:string){
  let hash=2166136261;
  for(const ch of seed){hash^=ch.charCodeAt(0);hash=Math.imul(hash,16777619)>>>0;}
  return (hash%1_000_000)/1_000_000;
}
