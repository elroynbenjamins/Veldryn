import {ItemDef} from '../content/items';
export type ItemRarity='common'|'uncommon'|'rare'|'epic'|'legendary'|'mythic';
export const GEAR_RARITIES:{id:ItemRarity;label:string;chance:number;color:string;statMultiplier:number}[]=[{id:'common',label:'Common',chance:.89,color:'#93a4ba',statMultiplier:1},{id:'uncommon',label:'Uncommon',chance:.07,color:'#7fc59b',statMultiplier:1.12},{id:'rare',label:'Rare',chance:.03,color:'#7bb7df',statMultiplier:1.28},{id:'epic',label:'Epic',chance:.01,color:'#c79cff',statMultiplier:1.5},{id:'legendary',label:'Legendary',chance:.001,color:'#f0a24b',statMultiplier:1.8},{id:'mythic',label:'Mythic',chance:.0005,color:'#f06c9b',statMultiplier:2.2}];
export function itemRarity(item:ItemDef):ItemRarity{
  if(item.rarity)return item.rarity;
  if(item.type!=='gear')return 'common';
  if(item.value>=1500)return 'mythic';
  if(item.value>=800)return 'legendary';
  if(item.value>=400||item.readiness&&item.readiness>=10)return 'epic';
  if(item.value>=150||item.readiness&&item.readiness>=7)return 'rare';
  if(item.value>=50||item.readiness&&item.readiness>=3)return 'uncommon';
  return 'common';
}
export const rarityLabel=(item:ItemDef)=>itemRarity(item).toUpperCase();
export const rarityMeta=(rarity:ItemRarity)=>GEAR_RARITIES.find(entry=>entry.id===rarity)!;
/** Offline preview only. Online servers must roll and persist rarity authoritatively. */
export function rollGearRarity(seed:string):ItemRarity{let hash=0;for(const char of seed)hash=(hash*31+char.charCodeAt(0))>>>0;const roll=(hash%100000)/100000;let cursor=0;for(const entry of GEAR_RARITIES.slice().reverse()){cursor+=entry.chance;if(roll<cursor)return entry.id;}return 'common';}
