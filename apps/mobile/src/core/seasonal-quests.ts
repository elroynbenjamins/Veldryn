import {CLASSES} from '../content/classes';
import type {GameState} from './types';
import {hash32} from './rng';

export type SeasonalPeriod='daily'|'weekly'|'monthly';
export type ContractTag='combat'|'gathering'|'crafting'|'exploration'|'equipment'|'boss';
export type SeasonalActivity=Exclude<ContractTag,'equipment'>;
export type SeasonalProgress=Partial<Record<SeasonalPeriod,{key:string;counts:Partial<Record<SeasonalActivity,number>>}>>;
const periods:SeasonalPeriod[]=['daily','weekly','monthly'];
const activityTags:SeasonalActivity[]=['combat','gathering','crafting','exploration','boss'];

/** Additive save field: legacy saves start at zero rather than inheriting lifetime XP. */
export function normalizeSeasonalProgress(raw:unknown):SeasonalProgress{
 const result:SeasonalProgress={};
 if(!raw||typeof raw!=='object')return result;
 for(const period of periods){
  const row=(raw as Record<string,any>)[period];
  if(!row||typeof row.key!=='string'||row.key.length>32)continue;
  const counts:Partial<Record<SeasonalActivity,number>>={};
  for(const tag of activityTags){const value=row.counts?.[tag];if(typeof value==='number'&&Number.isFinite(value)&&value>=0)counts[tag]=Math.min(Number.MAX_SAFE_INTEGER,Math.floor(value));}
  result[period]={key:row.key,counts};
 }
 return result;
}

/** Credit completed actions on settlement, matching the game's reward-claim timing. */
export function recordSeasonalActivity(state:GameState,tag:SeasonalActivity,units:number,nowMs:number):GameState{
 if(!state.character||!Number.isFinite(units)||units<1)return state;
 const progress=normalizeSeasonalProgress(state.account.seasonalContractProgress),date=new Date(nowMs);
 for(const period of periods){
  const key=periodKey(period,date),old=progress[period],counts=old?.key===key?{...old.counts}:{};
  counts[tag]=Math.min(Number.MAX_SAFE_INTEGER,(counts[tag]??0)+Math.floor(units));
  progress[period]={key,counts};
 }
 return {...state,account:{...state.account,seasonalContractProgress:progress}};
}
export type QuestRarity='common'|'uncommon'|'rare'|'epic'|'legendary';
export const QUEST_RARITIES:Record<QuestRarity,{label:string;color:string;multiplier:number;cache:string}>={
  common:{label:'Common',color:'#93a4ba',multiplier:1,cache:'Field cache'},uncommon:{label:'Uncommon',color:'#7fc59b',multiplier:1.3,cache:'Explorer cache'},rare:{label:'Rare',color:'#7bb7df',multiplier:1.7,cache:'Aster cache'},epic:{label:'Epic',color:'#c79cff',multiplier:2.25,cache:'Oathbound cache'},legendary:{label:'Legendary',color:'#f0a24b',multiplier:3,cache:'Crown cache'},
};
export interface SeasonalQuestReward {id:string;rewardItemId?:string;rewardItemQty?:number;rewardCompanionEssence?:number;rewardBondstones?:number;}
export interface SeasonalQuest{ id:string;period:SeasonalPeriod;name:string;description:string;required:number;progress:number;rewardGold:number;rewardXp:number;rewardItemId?:string;rewardItemQty?:number;rewardCompanionEssence?:number;rewardOptions:SeasonalQuestReward[];className:string;tag:ContractTag;rarity:QuestRarity;}
type Template=[string,string,number,ContractTag];
const roleTemplates:Record<'Tank'|'Support'|'Damage',Template[]>={
 Tank:[['Hold the Line','Defeat {n} monsters while staying battle-ready.',24,'combat'],['Iron Ration','Build toward {n} total skill levels for the next expedition.',12,'gathering'],['Marching Vigil','Defeat {n} monsters on patrol.',28,'combat'],['Roadwarden Survey','Unlock {n} monster encounters.',5,'exploration']],
 Support:[['Light the Way','Build toward {n} total skill levels through gathering.',30,'gathering'],['Mercy in Motion','Craft or equip {n} meaningful upgrades.',12,'crafting'],['Dawn Patrol','Earn progress from {n} combat milestones.',20,'combat'],['Safe Passage','Unlock {n} monster encounters.',5,'exploration']],
 Damage:[['Predator’s Circuit','Earn progress from {n} combat milestones.',18,'combat'],['Edge of Mastery','Craft or equip {n} meaningful upgrades.',14,'crafting'],['The Long Hunt','Earn progress from {n} combat milestones.',30,'combat'],['Forward Scout','Unlock {n} monster encounters.',5,'exploration']],
};
const classTemplates:Record<string,Template>={
 IRONWARDEN:['Steel Discipline','Defeat {n} monsters to reinforce the line.',26,'combat'],BASTION:['Unbroken Wall','Earn progress from {n} combat milestones.',30,'combat'],DREADGUARD:['Chain of Command','Earn progress from {n} combat milestones.',28,'combat'],DAWNKEEPER:['Sunlamp Offering','Craft or equip {n} meaningful upgrades.',15,'crafting'],WAYFINDER:['Cartographer’s Eye','Unlock {n} additional monster encounters.',5,'exploration'],RAVAGER:['Break Their Line','Earn progress from {n} combat milestones.',40,'combat'],HEXWEAVER:['Runic Survey','Build toward {n} total skill levels through gathering.',22,'gathering'],KNIFE_DANCER:['Steps Unseen','Unlock {n} monster encounters.',6,'exploration'],STONECALLER:['Stone and Storm','Build toward {n} total skill levels through gathering.',24,'gathering'],
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
/** Contract rewards are useful progression currency or targeted upgrade materials.
 * Rarity is selected before this table; claims use the same deterministic projection.
 * Reward amounts are deliberately modest because there are 2 daily, 3 weekly and 4 monthly challenges.
 */
export function seasonalQuestCache(period:SeasonalPeriod,rarity:QuestRarity):Pick<SeasonalQuest,'rewardItemId'|'rewardItemQty'|'rewardCompanionEssence'>{
 if(period==='daily'){
  if(rarity==='common')return {rewardCompanionEssence:5};
  if(rarity==='uncommon')return {rewardCompanionEssence:8};
  // Rare daily challenges help with the first rank of equipment upgrading.
  return {rewardItemId:'TEMPERING_DUST',rewardItemQty:8};
 }
 if(period==='weekly'){
  if(rarity==='epic'||rarity==='legendary')return {rewardItemId:'ASTERFALL_MINERAL_ESSENCE',rewardItemQty:1};
  if(rarity==='rare')return {rewardItemId:'TEMPERING_CORE',rewardItemQty:1};
  return {rewardCompanionEssence:15};
 }
 if(rarity==='legendary')return {rewardItemId:'TEMPERING_CORE',rewardItemQty:4};
 if(rarity==='epic')return {rewardItemId:'TEMPERING_CORE',rewardItemQty:2};
 return {rewardCompanionEssence:35};
}
/** Choice IDs and amounts are authored here and recomputed at claim time. The client
 * sends only an ID; it cannot supply arbitrary quantities or bypass unlocks.
 * Daily / weekly / monthly goals, Gold and XP are unaffected by reward selection.
 * Endgame catalysts and regional reagents remain gated; Trial-exclusive rewards stay in Trials.
 */
export function seasonalQuestRewardOptions(state:GameState,period:SeasonalPeriod,rarity:QuestRarity):SeasonalQuestReward[]{
 const base=seasonalQuestCache(period,rarity),options:SeasonalQuestReward[]=[];
 const add=(reward:Omit<SeasonalQuestReward,'id'>)=>{
  const id=reward.rewardItemId?'item:'+reward.rewardItemId:reward.rewardBondstones?'bondstones':'essence';
  if(!options.some(option=>option.id===id))options.push({id,...reward});
 };
 const item=(id:string,amount:number)=>add({rewardItemId:id,rewardItemQty:amount});
 add(base);
 const level=state.character?.level??1,enchanting=state.skills.find(s=>s.skillId==='enchanting')?.level??1;
 if(period==='daily'){
  if(rarity==='rare'){item('GEM_DUST',5);add({rewardCompanionEssence:5});}
 }else if(period==='weekly'){
  if(rarity==='uncommon'){item('GEM_DUST',6);item('ASTERFALL_BOTANICAL_ESSENCE',1);}
  else if(rarity==='rare'){item('GEM_DUST',10);item('ECHO_QUARTZ',2);}
  else if(rarity==='epic'||rarity==='legendary'){item('ASTERFALL_BOTANICAL_ESSENCE',2);item('OATHGLASS_FRAGMENT',2);}
 }else if(period==='monthly'){
  if(rarity==='rare'){item('ECHO_QUARTZ',3);item('RUNEBOUND_CORE',3);}
  else if(rarity==='epic'){
   item('OATHGLASS_FRAGMENT',3);
   if(level>=40&&enchanting>=40)item('REGIONAL_CATALYST',1);
   else item('ASTERFALL_BOTANICAL_ESSENCE',2);
  }else if(rarity==='legendary'){
   add({rewardBondstones:1});
   const regional=state.currentRegionId==='SUNSCAR'&&level>=45?'ASTRAL_SCRIPT'
     :state.currentRegionId==='FROSTMARCH'&&level>=60?'CHOIR_BLOOM'
     :state.currentRegionId==='ASHLANDS'&&level>=75?'CINDER_HEART':undefined;
   if(regional)item(regional,1);else item('GEM_DUST',15);
  }
 }
 return options;
}
function contractProgress(state:GameState,tag:ContractTag,period:SeasonalPeriod,key:string){
 if(tag==='equipment')return Object.values(state.character!.equipment).filter(Boolean).length;
 const progress=state.account.seasonalContractProgress?.[period];
 return progress?.key===key?progress.counts[tag]??0:0;
}
export function seasonalQuestBoard(state:GameState,period:SeasonalPeriod,date=new Date()):SeasonalQuest[]{
 const character=state.character;if(!character)return [];
 const classDef=CLASSES.find(item=>item.id===character.classId)!;const key=periodKey(period,date),count=period==='daily'?2:period==='weekly'?3:4;
 const role=roleTemplates[classDef.role],specific=classTemplates[character.classId];const rows=[specific,...Array.from({length:count},(_,index)=>pick(role,key,index))].slice(0,count);
 // Scale actual repeatable action targets: 2× daily, 3× weekly, 4× monthly.
 // No slot-limited equipment objective may appear; equipping is not a repeatable task.
 const volume=period==='daily'?.9:period==='weekly'?3:8;
 return rows.map((row,index)=>{const [name,templateDescription,base,tag]=row,rarity=rarityFor(period,key,index,character.classId),meta=QUEST_RARITIES[rarity],required=Math.min(tag==='equipment'?10:Infinity,Math.max(1,Math.round(base*volume))),progress=Math.min(required,contractProgress(state,tag,period,key)),reward=seasonalQuestCache(period,rarity),rewardOptions=seasonalQuestRewardOptions(state,period,rarity);
   const description=tag==='combat'?'Defeat {n} monsters this period.':tag==='gathering'?'Complete {n} gathering actions this period.':tag==='crafting'?'Complete {n} crafts this period.':tag==='exploration'?'Complete {n} exploration route actions this period.':templateDescription;
   const baseGold=period==='daily'?Math.max(20,base*2):period==='weekly'?base*8:Math.max(300,base*20),baseXp=period==='daily'?Math.max(40,base*4):period==='weekly'?base*15:Math.max(600,base*40);
   return {id:`${period.toUpperCase()}_${key}_${index}`,period,name:name.replace('{n}',String(required)),description:description.replace('{n}',String(required)),required,progress,rewardGold:Math.round(baseGold*meta.multiplier*1.1),rewardXp:Math.round(baseXp*meta.multiplier*1.1),...reward,rewardOptions,className:classDef.name,tag,rarity};
 });
}
