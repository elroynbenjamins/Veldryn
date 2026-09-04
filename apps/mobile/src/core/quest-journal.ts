import {QUESTS,QuestDef} from '../content/quests';
import {MONSTERS} from '../content/monsters';
import {WORLD_ZONES} from '../content/world-map';
import {GATHERING} from '../content/skills';
import {GameState} from './types';

export type JournalFilter='current'|'all'|'claimed'|'locked';
export type QuestDestination={tab:'World'|'Skills'|'Inventory';zoneId?:string;label:string;hint:string};
export function questDestination(def:QuestDef):QuestDestination{
  const monster=MONSTERS.find(item=>item.id===def.targetId);
  if((def.kind==='kills'||def.kind==='boss')&&monster)return {tab:'World',zoneId:WORLD_ZONES.find(zone=>zone.name===monster.zone)?.id,label:`Visit ${monster.zone}`,hint:`${monster.name} · character level ${monster.unlockLevel}. Collect hunt rewards on Home to update kill objectives.`};
  if(def.kind==='equip')return {tab:'Inventory',label:'Open equipment',hint:'Equip gear from Inventory. Items in Bank must be withdrawn first.'};
  if(def.kind==='item'){
    const gathering=GATHERING.find(item=>item.itemId===def.targetId);
    return {tab:gathering?'Skills':'Inventory',label:gathering?'Find gathering activities':'Check Inventory',hint:gathering?`${gathering.name} · ${gathering.skillId} level ${gathering.unlockLevel}. Item objectives count carried Inventory items, not Bank storage.`:'Item objectives count carried Inventory items, not Bank storage.'};
  }
  if(def.kind==='skillLevel'||def.kind==='craft')return {tab:'Skills',label:'Open skills & crafting',hint:'Gather materials and collect their rewards, or craft eligible recipes, to increase skill XP.'};
  return {tab:'World',label:'Explore Asterfall',hint:'Character XP is awarded when combat rewards are collected on Home.'};
}
export function journalEntries(state:GameState,filter:JournalFilter,query:string){
  const search=query.trim().toLowerCase();
  return QUESTS.flatMap((def,index)=>{
    const quest=state.quests.find(item=>item.questId===def.id);
    if(!quest)return [];
    const matches=filter==='all'||(filter==='current'?quest.status==='active'||quest.status==='complete':quest.status===filter);
    return matches&&`${def.name} ${def.description}`.toLowerCase().includes(search)?[{def,quest,chapter:index+1,remaining:Math.max(0,def.required-quest.progress),previous:QUESTS[index-1]?.name}]:[];
  });
}
