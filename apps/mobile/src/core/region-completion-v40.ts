import type {GameState} from './types';
import {WORLD_ZONES} from '../content/world-map';
import {MONSTERS} from '../content/monsters';
import {GATHERING} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {EQUIPMENT_SETS} from '../content/equipment-sets';
import {monsterMastery} from './monster-mastery';

export interface RegionCompletionInput{regionId:string;name:string;monsters:{done:number;total:number};mastery:{done:number;total:number};resources:{done:number;total:number};dungeons:{done:number;total:number};equipmentSets:{done:number;total:number};pets:{done:number;total:number};lore:{done:number;total:number}}
export interface RegionCompletionCategory{key:keyof Omit<RegionCompletionInput,'regionId'|'name'>;label:string;done:number;total:number;weight:number;percent:number}
export interface RegionCompletionView{regionId:string;name:string;percent:number;categories:RegionCompletionCategory[];nextMilestone?:number;reachedMilestones:number[]}
export const REGION_COMPLETION_MILESTONES=[25,50,75,90,100] as const;
const weights={monsters:25,mastery:15,resources:15,dungeons:15,equipmentSets:15,pets:10,lore:5} as const;
const labels={monsters:'Monsters',mastery:'Monster Mastery',resources:'Resources',dungeons:'Dungeons',equipmentSets:'Equipment Sets',pets:'Pets',lore:'Lore'} as const;
export function regionCompletionView(input:RegionCompletionInput):RegionCompletionView{
 const categories=(Object.keys(weights) as Array<keyof typeof weights>).map(key=>{const row=input[key],total=Math.max(0,row.total),done=Math.max(0,Math.min(row.done,total));return {key,label:labels[key],done,total,weight:weights[key],percent:total?done/total:1} as RegionCompletionCategory});
 const usable=categories.filter(c=>c.total>0),weightTotal=usable.reduce((sum,c)=>sum+c.weight,0)||1,percent=Math.round(usable.reduce((sum,c)=>sum+c.percent*c.weight,0)/weightTotal*100);
 const reached=REGION_COMPLETION_MILESTONES.filter(n=>percent>=n),next=REGION_COMPLETION_MILESTONES.find(n=>percent<n);
 return {regionId:input.regionId,name:input.name,percent,categories,nextMilestone:next,reachedMilestones:[...reached]};
}

function ownedItemIds(state:GameState){return new Set([...state.inventory.stacks,...state.bank.stacks,...state.overflow.stacks].filter(row=>row.quantity>0).map(row=>row.itemId).concat(Object.values(state.character?.equipment??{}).filter((id):id is string=>!!id)))}
export function regionCompletionFromGameState(state:GameState,regionId:string):RegionCompletionView{
 const zone=WORLD_ZONES.find(row=>row.id===regionId);if(!zone)throw new Error('unknown_region');
 const owned=ownedItemIds(state),monsters=MONSTERS.filter(row=>row.zone===zone.name),normal=monsters.filter(row=>!row.boss);
 const monsterDone=monsters.filter(row=>row.boss?state.defeatedBossIds.includes(row.id):state.unlockedMonsterIds.includes(row.id)).length;
 const masteryDone=normal.filter(row=>monsterMastery(state,row.id).rank>=10).length;
 const resources=[...GATHERING,...HERB_NODES].filter(row=>row.zoneId===zone.id);
 const resourceDone=resources.filter(row=>owned.has(row.itemId)).length;
 const regionSets=EQUIPMENT_SETS.filter(set=>set.source.toLowerCase().includes(zone.name.toLowerCase()));
 const setDone=regionSets.filter(set=>set.itemIds.every(id=>owned.has(id))).length;
 const regional=state.regionalProgressById?.[regionId]??{};
 const dungeonTotal=zone.id==='FROSTMARCH'?3:0,dungeonsDone=dungeonTotal?Math.min(dungeonTotal,regional.dungeonsCompleted??0):0;
 return regionCompletionView({regionId,name:zone.name,monsters:{done:monsterDone,total:monsters.length},mastery:{done:masteryDone,total:normal.length},resources:{done:resourceDone,total:resources.length},dungeons:{done:dungeonsDone,total:dungeonTotal},equipmentSets:{done:setDone,total:regionSets.length},pets:{done:0,total:0},lore:{done:0,total:0}});
}
