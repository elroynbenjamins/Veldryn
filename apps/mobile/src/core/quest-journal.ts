import {QUESTS,QuestDef} from '../content/quests';
import {MONSTERS} from '../content/monsters';
import {WORLD_ZONES} from '../content/world-map';
import {GATHERING} from '../content/skills';
import {EXPLORATION_ROUTES} from '../content/exploration';
import {GameState,SkillId} from './types';

export type JournalFilter='current'|'all'|'claimed'|'locked';
export type QuestDestination={tab:'World'|'Skills'|'Inventory';zoneId?:string;skillId?:SkillId;label:string;hint:string};
export function questLockHint(state:Pick<GameState,'character'|'quests'>,def:QuestDef):string{
  if(def.requiredCharacterLevel&&(state.character?.level??0)<def.requiredCharacterLevel)return `Reach character level ${def.requiredCharacterLevel} through Combat to unlock this objective.`;
  const index=QUESTS.findIndex(row=>row.id===def.id),previous=index>0?QUESTS[index-1]:undefined;
  return previous?`Claim “${previous.name}” to unlock this objective. Progress is not tracked while locked.`:'Continue the story to unlock this objective.';
}
export function questDestination(def:QuestDef):QuestDestination{
  const monster=MONSTERS.find(item=>item.id===def.targetId);
  if((def.kind==='kills'||def.kind==='boss')&&monster)return {tab:'World',zoneId:WORLD_ZONES.find(zone=>zone.name===monster.zone)?.id,label:`Visit ${monster.zone}`,hint:`${monster.name} · character level ${monster.unlockLevel}. Collect hunt rewards on Home to update kill objectives.`};
  if(def.kind==='exploration'){
    const route=EXPLORATION_ROUTES.find(row=>row.id===def.targetId),zone=WORLD_ZONES.find(row=>row.id===route?.zoneId);
    return {tab:'World',zoneId:route?.zoneId,label:`Travel to ${zone?.name??'the scouting region'}`,hint:`Travel to ${zone?.name??'the scouting region'} first. Then open Skills → Exploration and scout ${route?.name??'the route'} to discover the encounter.`};
  }
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
  const hasCurrent=state.quests.some(quest=>quest.status==='active'||quest.status==='complete'),nextLocked=state.quests.find(quest=>quest.status==='locked')?.questId;
  return QUESTS.flatMap((def,index)=>{
    const quest=state.quests.find(item=>item.questId===def.id);
    if(!quest)return [];
    const matches=filter==='all'||(filter==='current'?quest.status==='active'||quest.status==='complete'||(!hasCurrent&&quest.questId===nextLocked):quest.status===filter);
    return matches&&`${def.name} ${def.description} ${def.location} ${def.story}`.toLowerCase().includes(search)?[{def,quest,chapter:index+1,remaining:Math.max(0,def.required-quest.progress),previous:QUESTS[index-1]?.name,lockedHint:quest.status==='locked'?questLockHint(state,def):undefined}]:[];
  });
}
