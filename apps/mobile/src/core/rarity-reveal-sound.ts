import type {ItemRarity} from './item-rarity';

/** Escalating stingers for gear that reaches Epic or above. Lower rarities keep their normal sounds. */
export type RarityRevealSoundId='rarity_epic'|'rarity_legendary'|'rarity_mythic';
const ORDER:readonly ItemRarity[]=['common','uncommon','rare','epic','legendary','mythic'];

export function rarityRevealSound(rarity:ItemRarity|null|undefined):RarityRevealSoundId|null{
  return rarity==='mythic'?'rarity_mythic':rarity==='legendary'?'rarity_legendary':rarity==='epic'?'rarity_epic':null;
}

export function highestRarity(rarities:readonly ItemRarity[]):ItemRarity|null{
  return rarities.reduce<ItemRarity|null>((best,rarity)=>best===null||ORDER.indexOf(rarity)>ORDER.indexOf(best)?rarity:best,null);
}

/**
 * The stinger plays once the rarity is on screen: after the modal fade (about 300 ms) and the reveal card's pop.
 * With reduced motion there is no animation to wait for. `after` pushes it back behind another sound
 * that plays first, such as the level-up fanfare.
 */
export function rarityRevealDelayMs({reduceMotion,after=0}:{reduceMotion:boolean;after?:number}){
  return (reduceMotion?150:560)+after;
}
