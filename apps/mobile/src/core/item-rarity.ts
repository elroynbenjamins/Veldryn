import {ItemDef} from '../content/items';
export type ItemRarity='common'|'uncommon'|'rare'|'epic'|'legendary'|'mythic';
export interface GearRarityMeta{id:ItemRarity;label:string;chance:number;color:string;surface:string;statMultiplier:number;borderWidth:number;glowOpacity:number;symbol:string;}
/** Familiar MMORPG rarity language, kept in one place for every equipment surface. */
export const GEAR_RARITIES:GearRarityMeta[]=[
 {id:'common',label:'Common',chance:.89,color:'#9aa4b2',surface:'rgba(154,164,178,.08)',statMultiplier:1,borderWidth:1,glowOpacity:0,symbol:'◆'},
 {id:'uncommon',label:'Uncommon',chance:.07,color:'#49c873',surface:'rgba(73,200,115,.10)',statMultiplier:1.12,borderWidth:1,glowOpacity:.08,symbol:'◆'},
 {id:'rare',label:'Rare',chance:.03,color:'#4b91ff',surface:'rgba(75,145,255,.11)',statMultiplier:1.28,borderWidth:2,glowOpacity:.12,symbol:'✦'},
 {id:'epic',label:'Epic',chance:.01,color:'#ad72ff',surface:'rgba(173,114,255,.12)',statMultiplier:1.5,borderWidth:2,glowOpacity:.18,symbol:'✦'},
 {id:'legendary',label:'Legendary',chance:.001,color:'#ff9f35',surface:'rgba(255,159,53,.13)',statMultiplier:1.8,borderWidth:2,glowOpacity:.24,symbol:'★'},
 {id:'mythic',label:'Mythic',chance:.0005,color:'#f25591',surface:'rgba(242,85,145,.15)',statMultiplier:2.2,borderWidth:3,glowOpacity:.3,symbol:'✧'},
];
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
