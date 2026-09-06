import {CLASSES} from '../content/classes';
import {MONSTERS} from '../content/monsters';
import {GameState,SkillId} from './types';

export type SeasonalPeriod='weekly'|'monthly';
export interface SeasonalQuest{ id:string;period:SeasonalPeriod;name:string;description:string;required:number;progress:number;rewardGold:number;rewardXp:number;className:string;tag:'combat'|'gathering'|'crafting'|'exploration';}
type Template=[string,string,number,SeasonalQuest['tag']];
const roleTemplates:Record<'Tank'|'Support'|'Damage',Template[]>={
 Tank:[['Hold the Line','Defeat {n} monsters while staying battle-ready.',24,'combat'],['Iron Ration','Collect {n} cooked meals for the next expedition.',12,'gathering'],['Arm the Bastion','Equip {n} pieces of gear.',6,'crafting']],
 Support:[['Light the Way','Gather {n} resources from any skill.',30,'gathering'],['Mercy in Motion','Reach skill level {n} in Cooking.',12,'crafting'],['Dawn Patrol','Defeat {n} monsters in unlocked regions.',20,'combat']],
 Damage:[['Predator’s Circuit','Defeat {n} monsters above your current level band.',18,'combat'],['Edge of Mastery','Reach skill level {n} in Smithing.',14,'crafting'],['The Long Hunt','Earn {n} combat XP.',1800,'combat']],
};
const classTemplates:Partial<Record<string,Template[]>>={
 BASTION:[['Unbroken Wall','Defeat {n} monsters without stopping an activity.',30,'combat']],
 WAYFINDER:[['Cartographer’s Eye','Unlock {n} additional monster encounters.',5,'exploration']],
 RAVAGER:[['Break Their Line','Defeat {n} monsters in one uninterrupted hunt.',40,'combat']],
 DAWNKEEPER:[['Sunlamp Offering','Cook {n} meals and claim a chapter reward.',15,'crafting']],
};
function periodKey(period:SeasonalPeriod,date=new Date()){if(period==='weekly'){const copy=new Date(date);copy.setHours(0,0,0,0);copy.setDate(copy.getDate()-copy.getDay()+1);return `${copy.getFullYear()}-W${Math.ceil(copy.getDate()/7)}`}return `${date.getFullYear()}-${date.getMonth()+1}`;}
function pick<T>(list:readonly T[],seed:string,index:number){let hash=0;for(const char of `${seed}:${index}`)hash=(hash*31+char.charCodeAt(0))>>>0;return list[hash%list.length]}
export function seasonalQuestBoard(state:GameState,period:SeasonalPeriod,date=new Date()):SeasonalQuest[]{
 const character=state.character;if(!character)return [];
 const classDef=CLASSES.find(item=>item.id===character.classId)!;const key=periodKey(period,date),count=period==='weekly'?3:4;
 const role=roleTemplates[classDef.role];const specific=classTemplates[character.classId]??[];const rows=[...specific,...Array.from({length:count},(_,index)=>pick(role,key,index))].slice(0,count);
 return rows.map((row,index)=>{const [name,description,base,tag]=row;const multiplier=period==='monthly'?2:1;const required=typeof base==='number'?base*multiplier:base;let progress=0;
   if(tag==='combat')progress=character.xp>0?Math.min(required,Math.floor(character.xp/80)):0;
   if(tag==='gathering')progress=Math.min(required,state.skills.reduce((sum,skill)=>sum+skill.level,0));
   if(tag==='crafting')progress=Math.min(required,Object.values(character.equipment).filter(Boolean).length+((character.craftedNoviceItemIds??[]).length));
   if(tag==='exploration')progress=Math.min(required,state.unlockedMonsterIds.length);
   return {id:`${period.toUpperCase()}_${key}_${index}`,period,name:name.replace('{n}',String(required)),description:description.replace('{n}',String(required)),required,progress,rewardGold:period==='monthly'?base*20:base*8,rewardXp:period==='monthly'?base*40:base*15,className:classDef.name,tag};});
}
