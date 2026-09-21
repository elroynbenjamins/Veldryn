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
