import {itemDef} from '../content/items';
import {T5_EQUIPMENT_AFFIX_BY_SLOT,type T5EquipmentAffixStat} from '../content/t5-equipment-affix-spec';
import {craftedGearDisplayQuality} from './crafted-gear-instances';
import {equippedCraftedInstance} from './equipment-enhancement';
import {itemRarity,type ItemRarity} from './item-rarity';
import type {CraftedGearInstance,GameState} from './types';

export {T5_EQUIPMENT_AFFIX_BY_SLOT};
export type {T5EquipmentAffixStat};

const RARITY_SCORE:Readonly<Record<ItemRarity,number>>=Object.freeze({
  common:0,uncommon:1,rare:2,epic:3,legendary:4,mythic:5,
});

/**
 * T5 affixes use percentage points. Epic Q50—the catalog/legacy baseline—is 3%.
 * Weak Common/low-quality copies land at 2%; exceptional rarity-quality pairs
 * reach 4%, with 5% reserved for the very strongest Legendary/Mythic results.
 */
export function t5EquipmentAffixPercent(rarity:ItemRarity,quality:number){
  const q=Math.max(0,Math.min(100,Math.floor(quality)));
  const qualityScore=q>=90?4:q>=75?3:q>=50?2:q>=25?1:0;
  const score=RARITY_SCORE[rarity]+qualityScore;
  return score>=8?.05:score>=6?.04:score>=3?.03:.02;
}

export interface T5EquipmentAffix{
  stat:T5EquipmentAffixStat;
  percent:number;
  rarity:ItemRarity;
  quality:number;
}

export function t5EquipmentAffixForItem(itemId:string,instance?:Pick<CraftedGearInstance,'rarity'|'quality'>):T5EquipmentAffix|undefined{
  const item=itemDef(itemId),stat=item.slot?T5_EQUIPMENT_AFFIX_BY_SLOT[item.slot]:undefined;
  if(item.type!=='gear'||!item.equipmentSetId?.startsWith('T5_')||!stat)return undefined;
  const rarity=instance?.rarity??itemRarity(item),quality=craftedGearDisplayQuality(instance??{});
  return {stat,percent:t5EquipmentAffixPercent(rarity,quality),rarity,quality};
}

export function equippedT5EquipmentAffixStats(state:GameState){
  const stats:Record<T5EquipmentAffixStat,number>={haste:0,critRate:0,evasion:0};
  if(!state.character)return stats;
  for(const itemId of Object.values(state.character.equipment)){
    if(!itemId)continue;
    const affix=t5EquipmentAffixForItem(itemId,equippedCraftedInstance(state,itemId));
    if(affix)stats[affix.stat]+=affix.percent;
  }
  return stats;
}
