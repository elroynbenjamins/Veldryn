import {CLASSES} from '../content/classes';
import {GameState} from './types';
import {hash32} from './rng';

export type SeasonalPeriod='daily'|'weekly'|'monthly';
export type ContractTag='combat'|'gathering'|'crafting'|'exploration'|'equipment'|'boss';
export type QuestRarity='common'|'uncommon'|'rare'|'epic'|'legendary';
export const QUEST_RARITIES:Record<QuestRarity,{label:string;color:string;multiplier:number;cache:string}>={
  common:{label:'Common',color:'#93a4ba',multiplier:1,cache:'Field cache'},uncommon:{label:'Uncommon',color:'#7fc59b',multiplier:1.3,cache:'Explorer cache'},rare:{label:'Rare',color:'#7bb7df',multiplier:1.7,cache:'Aster cache'},epic:{label:'Epic',color:'#c79cff',multiplier:2.25,cache:'Oathbound cache'},legendary:{label:'Legendary',color:'#f0a24b',multiplier:3,cache:'Crown cache'},
};
export interface SeasonalQuest{ id:string;period:SeasonalPeriod;name:string;description:string;required:number;progress:number;rewardGold:number;rewardXp:number;rewardItemId:string;rewardItemQty:number;className:string;tag:ContractTag;rarity:QuestRarity;}
type Template=[string,string,number,ContractTag];
const roleTemplates:Record<'Tank'|'Support'|'Damage',Template[]>={
 Tank:[['Hold the Line','Defeat {n} monsters while staying battle-ready.',24,'combat'],['Iron Ration','Build toward {n} total skill levels for the next expedition.',12,'gathering'],['Arm the Bastion','Equip {n} pieces of gear.',6,'equipment'],['Roadwarden Survey','Unlock {n} monster encounters.',5,'exploration']],
 Support:[['Light the Way','Build toward {n} total skill levels through gathering.',30,'gathering'],['Mercy in Motion','Craft or equip {n} meaningful upgrades.',12,'crafting'],['Dawn Patrol','Earn progress from {n} combat milestones.',20,'combat'],['Safe Passage','Unlock {n} monster encounters.',5,'exploration']],
 Damage:[['Predator’s Circuit','Earn progress from {n} combat milestones.',18,'combat'],['Edge of Mastery','Craft or equip {n} meaningful upgrades.',14,'crafting'],['The Long Hunt','Earn progress from {n} combat milestones.',30,'combat'],['Forward Scout','Unlock {n} monster encounters.',5,'exploration']],
};
const classTemplates:Record<string,Template>={
 IRONWARDEN:['Steel Discipline','Equip {n} pieces of gear to reinforce the line.',6,'equipment'],BASTION:['Unbroken Wall','Earn progress from {n} combat milestones.',30,'combat'],DREADGUARD:['Chain of Command','Earn progress from {n} combat milestones.',28,'combat'],DAWNKEEPER:['Sunlamp Offering','Craft or equip {n} meaningful upgrades.',15,'crafting'],WAYFINDER:['Cartographer’s Eye','Unlock {n} additional monster encounters.',5,'exploration'],RAVAGER:['Break Their Line','Earn progress from {n} combat milestones.',40,'combat'],HEXWEAVER:['Runic Survey','Build toward {n} total skill levels through gathering.',22,'gathering'],KNIFE_DANCER:['Steps Unseen','Unlock {n} monster encounters.',6,'exploration'],STONECALLER:['Stone and Storm','Build toward {n} total skill levels through gathering.',24,'gathering'],
};
function periodKey(period:SeasonalPeriod,date=new Date()){
 const utc=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()));
 if(period==='daily')return utc.toISOString().slice(0,10);
 if(period==='weekly'){const day=utc.getUTCDay()||7;utc.setUTCDate(utc.getUTCDate()-day+1);const yearStart=Date.UTC(utc.getUTCFullYear(),0,1);return `${utc.getUTCFullYear()}-W${Math.ceil(((utc.getTime()-yearStart)/86400000+1)/7)}`;}
 return `${utc.getUTCFullYear()}-${utc.getUTCMonth()+1}`;
}
function pick<T>(list:readonly T[],seed:string,index:number){return list[hash32(`${seed}:${index}`)%list.length]}
function rarityFor(period:SeasonalPeriod,key:string,index:number,classId:string):QuestRarity{
 const roll=hash32(`${period}:${key}:${classId}:${index}:rarity`)%100;
 if(period==='daily')return roll<55?'common':roll<90?'uncommon':'rare';
 if(period==='weekly')return roll<45?'uncommon':roll<87?'rare':'epic';
 return roll<48?'rare':roll<88?'epic':'legendary';
}
function cacheFor(rarity:QuestRarity){return rarity==='common'?['MOSS_FIBER',4] as const:rarity==='uncommon'?['COPPER_ORE',5] as const:rarity==='rare'?['ASTER_IRON_ORE',4] as const:rarity==='epic'?['OATHGLASS_SHARD',3] as const:['OATHGLASS_SHARD',7] as const}
function contractProgress(state:GameState,tag:ContractTag){
 const character=state.character!;
 if(tag==='combat')return Math.floor(character.xp/80);
 if(tag==='gathering')return Math.floor(state.skills.reduce((sum,skill)=>sum+skill.xp,0)/40);
 if(tag==='crafting')return Object.values(character.equipment).filter(Boolean).length+(character.craftedNoviceItemIds??[]).length;
 if(tag==='equipment')return Object.values(character.equipment).filter(Boolean).length;
 if(tag==='exploration')return state.unlockedMonsterIds.length;
 return state.defeatedBossIds.length;
}
export function seasonalQuestBoard(state:GameState,period:SeasonalPeriod,date=new Date()):SeasonalQuest[]{
 const character=state.character;if(!character)return [];
 const classDef=CLASSES.find(item=>item.id===character.classId)!;const key=periodKey(period,date),count=period==='daily'?2:period==='weekly'?3:4;
 const role=roleTemplates[classDef.role],specific=classTemplates[character.classId];const rows=[specific,...Array.from({length:count},(_,index)=>pick(role,key,index))].slice(0,count);
 const volume=period==='daily'?.45:period==='weekly'?1:2;
 return rows.map((row,index)=>{const [name,description,base,tag]=row,rarity=rarityFor(period,key,index,character.classId),meta=QUEST_RARITIES[rarity],required=Math.max(1,Math.round(base*volume)),progress=Math.min(required,contractProgress(state,tag)),[rewardItemId,baseQty]=cacheFor(rarity);
   const baseGold=period==='daily'?Math.max(20,base*2):period==='weekly'?base*8:Math.max(300,base*20),baseXp=period==='daily'?Math.max(40,base*4):period==='weekly'?base*15:Math.max(600,base*40);
   return {id:`${period.toUpperCase()}_${key}_${index}`,period,name:name.replace('{n}',String(required)),description:description.replace('{n}',String(required)),required,progress,rewardGold:Math.round(baseGold*meta.multiplier),rewardXp:Math.round(baseXp*meta.multiplier),rewardItemId,rewardItemQty:Math.max(1,Math.round(baseQty*meta.multiplier)),className:classDef.name,tag,rarity};
 });
}
