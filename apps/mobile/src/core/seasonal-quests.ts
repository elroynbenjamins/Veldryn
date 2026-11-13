import type {GameState} from './types';
import {hash32} from './rng';
import {RECIPES} from '../content/skills';

export type SeasonalPeriod='daily'|'weekly'|'monthly';
export type ContractTag='combat'|'gathering'|'crafting'|'exploration'|'faith'|'equipment'|'boss'|'cooking'|'alchemy'|'smithing'|'tailoring'|'enchanting'|'expedition'|'event';
export type SeasonalActivity=Exclude<ContractTag,'equipment'>;
export type SeasonalProgress=Partial<Record<SeasonalPeriod,{key:string;counts:Partial<Record<SeasonalActivity,number>>;tags?:SeasonalActivity[]}>>;
const periods:SeasonalPeriod[]=['daily','weekly','monthly'];
export const SEASONAL_ACTIVITY_TAGS:readonly SeasonalActivity[]=['combat','gathering','crafting','exploration','faith','boss','cooking','alchemy','smithing','tailoring','enchanting','expedition','event'];
const activityTags=SEASONAL_ACTIVITY_TAGS;

/** Additive save field: legacy saves start at zero rather than inheriting lifetime XP. */
export function normalizeSeasonalProgress(raw:unknown):SeasonalProgress{
 const result:SeasonalProgress={};
 if(!raw||typeof raw!=='object')return result;
 for(const period of periods){
  const row=(raw as Record<string,any>)[period];
  if(!row||typeof row.key!=='string'||row.key.length>32)continue;
  const counts:Partial<Record<SeasonalActivity,number>>={};
  for(const tag of activityTags){const value=row.counts?.[tag];if(typeof value==='number'&&Number.isFinite(value)&&value>=0)counts[tag]=Math.min(Number.MAX_SAFE_INTEGER,Math.floor(value));}
  const tags=Array.isArray(row.tags)&&row.tags.length===(period==='daily'?2:period==='weekly'?3:4)&&row.tags.every((tag:unknown)=>typeof tag==='string'&&activityTags.includes(tag as SeasonalActivity))&&new Set(row.tags).size===row.tags.length?row.tags as SeasonalActivity[]:undefined;
  result[period]={key:row.key,counts,...(tags?{tags:[...tags]}:{})};
 }
 return result;
}

/** Credit completed actions on settlement, matching the game's reward-claim timing. */
export function recordSeasonalActivity(state:GameState,tag:SeasonalActivity,units:number,nowMs:number):GameState{
 if(!state.character||!Number.isFinite(units)||units<1)return state;
 const progress=normalizeSeasonalProgress(state.account.seasonalContractProgress),date=new Date(nowMs);
 for(const period of periods){
  const key=periodKey(period,date),old=progress[period],counts=old?.key===key?{...old.counts}:{};
  // Freeze unlock-aware selections at the first credited action in a period.
  // Further character level-ups must not replace a quest someone was progressing.
  const tags=old?.key===key&&old.tags?.every(tag=>activityTags.includes(tag))?old.tags:selectSeasonalTags(state,period,key,nowMs);
  counts[tag]=Math.min(Number.MAX_SAFE_INTEGER,(counts[tag]??0)+Math.floor(units));
  progress[period]={key,counts,tags};
 }
 return {...state,account:{...state.account,seasonalContractProgress:progress}};
}
export type QuestRarity='common'|'uncommon'|'rare'|'epic'|'legendary';
export const QUEST_RARITIES:Record<QuestRarity,{label:string;color:string;multiplier:number;cache:string}>={
  common:{label:'Common',color:'#93a4ba',multiplier:1,cache:'Field cache'},uncommon:{label:'Uncommon',color:'#7fc59b',multiplier:1.3,cache:'Explorer cache'},rare:{label:'Rare',color:'#7bb7df',multiplier:1.7,cache:'Aster cache'},epic:{label:'Epic',color:'#c79cff',multiplier:2.25,cache:'Oathbound cache'},legendary:{label:'Legendary',color:'#f0a24b',multiplier:3,cache:'Crown cache'},
};
export interface SeasonalQuestReward {id:string;rewardItemId?:string;rewardItemQty?:number;rewardCompanionEssence?:number;rewardBondstones?:number;}
export interface SeasonalQuest{ id:string;period:SeasonalPeriod;name:string;description:string;required:number;progress:number;rewardGold:number;rewardXp:number;rewardItemId?:string;rewardItemQty?:number;rewardCompanionEssence?:number;rewardOptions:SeasonalQuestReward[];className:string;tag:ContractTag;rarity:QuestRarity;}
/** Only actions with authoritative settlement hooks can appear in rotating objectives. */
type Template={name:string;tag:SeasonalActivity;daily:number;weekly:number;monthly:number};
const TEMPLATES:readonly Template[]=[
 {name:'Field Patrol',tag:'combat',daily:30,weekly:150,monthly:450},
 {name:'Gathering Run',tag:'gathering',daily:30,weekly:150,monthly:450},
 {name:'Crafting Orders',tag:'crafting',daily:8,weekly:35,monthly:100},
 {name:'Trail Survey',tag:'exploration',daily:12,weekly:55,monthly:150},
 {name:'Faith Practice',tag:'faith',daily:3,weekly:15,monthly:40},
 {name:'Kitchen Duties',tag:'cooking',daily:5,weekly:24,monthly:70},
 {name:'Alchemist Orders',tag:'alchemy',daily:5,weekly:20,monthly:60},
 {name:'Forge Work',tag:'smithing',daily:5,weekly:20,monthly:60},
 {name:'Tailoring Commission',tag:'tailoring',daily:5,weekly:20,monthly:60},
 {name:'Enchanter Practice',tag:'enchanting',daily:4,weekly:15,monthly:40},
 {name:'Boss Hunt',tag:'boss',daily:0,weekly:1,monthly:3},
 {name:'Companion Expeditions',tag:'expedition',daily:0,weekly:2,monthly:7},
 {name:'Festival Service',tag:'event',daily:0,weekly:0,monthly:1},
];
const QUEST_DESCRIPTIONS:Record<SeasonalActivity,string>={
 combat:'Defeat {n} monsters this period.',
 gathering:'Complete {n} gathering actions this period.',
 crafting:'Complete {n} crafts this period.',
 exploration:'Complete {n} exploration route actions this period.',
 faith:'Complete {n} Faith practices this period.',
 cooking:'Complete {n} Cooking recipes this period.',
 alchemy:'Complete {n} Alchemy recipes this period.',
 smithing:'Complete {n} Smithing recipes this period.',
 tailoring:'Complete {n} Tailoring recipes this period.',
 enchanting:'Complete {n} Enchanting recipes this period.',
 boss:'Defeat {n} bosses this period.',
 expedition:'Claim {n} completed companion expeditions this period.',
 event:'Claim {n} completed event objective this period.',
};
const BASE_REWARD_ACTIONS=30;

function periodKey(period:SeasonalPeriod,date=new Date()){
 const utc=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()));
 if(period==='daily')return utc.toISOString().slice(0,10);
 if(period==='weekly'){const day=utc.getUTCDay()||7;utc.setUTCDate(utc.getUTCDate()-day+1);const yearStart=Date.UTC(utc.getUTCFullYear(),0,1);return `${utc.getUTCFullYear()}-W${Math.ceil(((utc.getTime()-yearStart)/86400000+1)/7)}`;}
 return `${utc.getUTCFullYear()}-${utc.getUTCMonth()+1}`;
}
function availableTemplate(state:GameState,tag:SeasonalActivity,atMs:number):boolean{
 const level=state.character?.level??1;
 if(['cooking','alchemy','smithing','tailoring','enchanting'].includes(tag)){
  const skill=state.skills.find(row=>row.skillId===tag)?.level??0;
  return RECIPES.some(recipe=>recipe.skillId===tag&&recipe.level<=skill&&(recipe.characterLevel??1)<=level&&(!recipe.classId||recipe.classId===state.character?.classId)&&(!recipe.requiresCraftedItemId||state.character?.craftedNoviceItemIds?.includes(recipe.requiresCraftedItemId))&&(!recipe.requiredKnowledgeId||state.account.unlockedKnowledgeIds?.includes(recipe.requiredKnowledgeId)||!!recipe.knowledgeItemId));
 }
 if(tag==='boss')return state.defeatedBossIds.includes('FALLEN_KNIGHT');
 if(tag==='event'){const event=state.account.liveEvent;return !!event?.enabled&&atMs>=event.startsAtMs&&atMs<event.endsAtMs&&event.endsAtMs-atMs>=86400_000;}
 if(tag==='expedition')return (state.account.companionSanctuary?.expeditionPensLevel??0)>0;
 return true;
}
function selectSeasonalTags(state:GameState,period:SeasonalPeriod,key:string,atMs:number):SeasonalActivity[]{
 const count=period==='daily'?2:period==='weekly'?3:4;
 const available=TEMPLATES.filter(row=>row[period]>0&&availableTemplate(state,row.tag,atMs));
 const pool=[...available],selected:SeasonalActivity[]=[];
 // The previous five accessible types always remain as fallbacks. Use a stable
 // period rotation; account progression never affects rarity or cache quality.
 for(let index=0;index<count&&pool.length;index++){
  const pick=hash32(`${period}:${key}:quest:${index}`)%pool.length;
  selected.push(pool.splice(pick,1)[0].tag);
 }
 return selected;
}
export function recordSeasonalCraftProfession(state:GameState,recipeId:string,units:number,nowMs:number,skillHint?:string):GameState{
 const skill=skillHint??RECIPES.find(row=>row.id===recipeId)?.skillId;
 const specialized=(['cooking','alchemy','smithing','tailoring','enchanting'] as const).find(tag=>tag===skill);
 return specialized?recordSeasonalActivity(state,specialized,units,nowMs):state;
}
function rarityFor(period:SeasonalPeriod,key:string,index:number):QuestRarity{
 const roll=hash32(`${period}:${key}:${index}:rarity`)%100;
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
  else if(rarity==='rare'){item('GEM_DUST',10);if(level>=16)item('ECHO_QUARTZ',2);else item('ASTERFALL_BOTANICAL_ESSENCE',1);}
  else if(rarity==='epic'||rarity==='legendary'){item('ASTERFALL_BOTANICAL_ESSENCE',2);if(level>=20)item('OATHGLASS_FRAGMENT',2);else item('GEM_DUST',15);}
 }else if(period==='monthly'){
  if(rarity==='rare'){if(level>=16)item('ECHO_QUARTZ',3);else item('ASTERFALL_BOTANICAL_ESSENCE',2);if(level>=20)item('RUNEBOUND_CORE',3);else item('GEM_DUST',15);}
  else if(rarity==='epic'){
   if(level>=20)item('OATHGLASS_FRAGMENT',3);else item('GEM_DUST',20);
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
 if(!state.character)return [];
 const key=periodKey(period,date),frozen=state.account.seasonalContractProgress?.[period],tags=frozen?.key===key&&frozen.tags?.length===(period==='daily'?2:period==='weekly'?3:4)&&frozen.tags.every(tag=>activityTags.includes(tag))?frozen.tags:selectSeasonalTags(state,period,key,date.getTime());
 const base=BASE_REWARD_ACTIONS;
 return tags.map((tag,index)=>{
  const template=TEMPLATES.find(row=>row.tag===tag)!;
  const required=template[period],rarity=rarityFor(period,key,index),meta=QUEST_RARITIES[rarity];
  const progress=Math.min(required,contractProgress(state,tag,period,key));
  const reward=seasonalQuestCache(period,rarity),rewardOptions=seasonalQuestRewardOptions(state,period,rarity);
  const baseGold=period==='daily'?Math.max(20,base*2):period==='weekly'?base*8:Math.max(300,base*20);
  const baseXp=period==='daily'?Math.max(40,base*4):period==='weekly'?base*15:Math.max(600,base*40);
  return {id:`${period.toUpperCase()}_${key}_${index}`,period,name:template.name,description:QUEST_DESCRIPTIONS[tag].replace('{n}',String(required)),required,progress,rewardGold:Math.round(baseGold*meta.multiplier*1.1),rewardXp:Math.round(baseXp*meta.multiplier*1.1),...reward,rewardOptions,className:'Adventurer',tag,rarity};
 });
}
