export interface GoalSource{kind:string;id:string;label:string;available:boolean;reason?:string}
import type {GameState,SkillId} from './types';
import {GATHERING,RECIPES} from '../content/skills';
import {HERB_NODES,HERBALISM_ESSENCE_BY_ZONE} from '../content/herbalism';
import {MONSTERS} from '../content/monsters';
import {WORLD_ZONES} from '../content/world-map';
import {dungeonMaterialSourceById,dungeonMaterialSourcesForItem} from '../content/dungeon-material-sources';
import {ITEMS} from '../content/items';
import {gatheringToolDef} from '../content/gathering-tools';
import {regionTravelAvailability,regionTravelLockReason} from './world-navigation';

export type ActivitySourceDestination=
 |{kind:'combat';monsterId:string;zoneName:string;regionId?:string;button:string;detail:string}
 |{kind:'skills';skillId?:SkillId;mode?:'gathering'|'crafting'|'faith';actionId?:string;recipeId?:string;regionId?:string;button:string;detail:string}
 |{kind:'contracts';button:string;detail:string}
 |{kind:'inventory';button:string;detail:string}
 |{kind:'world';regionId:string;button:string;detail:string}
 |{kind:'dungeon';dungeonId?:string;button:string;detail:string}
 |{kind:'info';button:string;detail:string};

const gatherDefs=[...GATHERING,...HERB_NODES];
function quantities(state:GameState){
 const out:Record<string,number>={};
 for(const stack of [...state.inventory.stacks,...state.bank.stacks])out[stack.itemId]=(out[stack.itemId]??0)+stack.quantity;
 return out;
}
const skillLabel=(id:string)=>id.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
const regionForZoneName=(name:string)=>WORLD_ZONES.find(zone=>zone.name===name);
const skillLevel=(state:GameState,id:string)=>state.skills.find(row=>row.skillId===id)?.level??1;
const sourceChanceLabel=(chance:number)=>chance>=.1?`${Math.round(chance*100)}%`:`${(chance*100).toFixed(chance<.01?2:1)}%`;


export function activitySourceAvailability(state:GameState,source:ActivitySourceDestination):GoalSource|undefined{
 if(source.kind==='combat'){
  const monster=MONSTERS.find(row=>row.id===source.monsterId);
  const available=!!monster&&(state.unlockedMonsterIds.includes(monster.id)||state.character!.level>=monster.unlockLevel);
  return {kind:'monster',id:source.monsterId,label:monster?.name??source.monsterId,available,reason:available?undefined:`Requires Level ${monster?.unlockLevel??'?'}.`};
 }
 if(source.kind==='skills'){
  if(source.recipeId){
   const recipe=RECIPES.find(row=>row.id===source.recipeId),owned=quantities(state),tool=recipe?gatheringToolDef(recipe.output.itemId):undefined;
   const skillReady=!!recipe&&skillLevel(state,recipe.skillId)>=recipe.level;
   const characterReady=!!recipe&&(recipe.characterLevel===undefined||(state.character?.level??1)>=recipe.characterLevel);
   const toolSkillReady=!tool||skillLevel(state,tool.skillId)>=tool.unlockLevel;
   const knowledgeReady=!recipe?.requiredKnowledgeId||(state.account.unlockedKnowledgeIds??[]).includes(recipe.requiredKnowledgeId)||!!recipe.knowledgeItemId&&(owned[recipe.knowledgeItemId]??0)>0;
   const available=!!recipe&&skillReady&&characterReady&&toolSkillReady&&knowledgeReady;
   const reason=!recipe?'Recipe is not in the current catalog.'
    :!characterReady?`Requires Level ${recipe.characterLevel}.`
    :!toolSkillReady&&tool?`Requires ${skillLabel(tool.skillId)} ${tool.unlockLevel}.`
    :!skillReady?`Requires ${skillLabel(recipe.skillId)} ${recipe.level}.`
    :!knowledgeReady&&recipe.knowledgeItemId?`Find ${ITEMS.find(item=>item.id===recipe.knowledgeItemId)?.name??'the required blueprint'} first.`
    :undefined;
   return {kind:'recipe',id:source.recipeId,label:recipe?.name??source.recipeId,available,reason};
  }
  if(source.actionId){
   const gather=gatherDefs.find(row=>row.id===source.actionId);
   if(gather){const available=skillLevel(state,gather.skillId)>=gather.unlockLevel;return {kind:'skill',id:gather.skillId,label:gather.name,available,reason:available?undefined:`Requires ${skillLabel(gather.skillId)} ${gather.unlockLevel}.`};}
  }
  return {kind:'skill',id:source.skillId??'skills',label:source.skillId?skillLabel(source.skillId):'Skills',available:true};
 }
 if(source.kind==='contracts')return {kind:'weekly_order',id:'contract-board',label:'Contract Board',available:true};
 if(source.kind==='dungeon'){
  const dungeon=source.dungeonId?dungeonMaterialSourceById(source.dungeonId):undefined,required=dungeon?.minLevel??1,available=(state.character?.level??1)>=required;
  return {kind:'dungeon',id:source.dungeonId??'dungeon',label:dungeon?.dungeonName??'Dungeon',available,reason:available?undefined:`Requires Level ${required}.`};
 }
 if(source.kind==='world'){const region=WORLD_ZONES.find(row=>row.id===source.regionId);const available=!!region&&regionTravelAvailability(state,region)==='available';return {kind:'region',id:source.regionId,label:region?.name??source.regionId,available,reason:region?regionTravelLockReason(state,region):'Unknown region'};}
 if(source.kind==='inventory')return {kind:'item',id:'inventory',label:'Inventory & Bank',available:true};
 return undefined;
}

export type ActivitySourceAvailabilityStatus='ready'|'travel'|'locked'|'info';
export interface ActivitySourceDestinationAvailability{status:ActivitySourceAvailabilityStatus;label:string;detail:string;canNavigate:boolean;}

export function activitySourceDestinationAvailability(state:GameState,source:ActivitySourceDestination):ActivitySourceDestinationAvailability{
 const base=activitySourceAvailability(state,source);
 if(source.kind==='info')return {status:'info',label:'INFO',detail:source.detail,canNavigate:false};
 if(source.kind==='inventory'||source.kind==='contracts')return {status:'ready',label:'READY',detail:'Available now.',canNavigate:true};
 if(source.kind==='dungeon'){
  if(base&&!base.available)return {status:'locked',label:'LOCKED',detail:base.reason??'This dungeon is not available yet.',canNavigate:true};
  return {status:'ready',label:'READY',detail:'Dungeon available now.',canNavigate:true};
 }
 const regionId='regionId' in source?source.regionId:undefined,region=regionId?WORLD_ZONES.find(row=>row.id===regionId):undefined;
 if(region&&regionTravelAvailability(state,region)!=='available')return {status:'locked',label:'LOCKED',detail:regionTravelLockReason(state,region)??'This region is not available yet.',canNavigate:true};
 if(base&&!base.available)return {status:'locked',label:'LOCKED',detail:base.reason??'This source is not available yet.',canNavigate:true};
 if(regionId&&regionId!==state.currentRegionId)return {status:'travel',label:'TRAVEL',detail:`Travel to ${region?.name??regionId} first.`,canNavigate:true};
 const recipeSource=source.kind==='skills'&&!!source.recipeId;
 return {status:'ready',label:recipeSource?'AVAILABLE':'READY',detail:recipeSource?'Recipe unlocked.':'Available now.',canNavigate:true};
}

export type ActivitySourceItemSourceType='gathering'|'crafting'|'monster_drop'|'dungeon';
export interface ActivitySourceItemSourceEntry{
 type:ActivitySourceItemSourceType;
 typeLabel:'Gathering'|'Crafting'|'Monster Drop'|'Dungeon';
 title:string;
 destination:ActivitySourceDestination;
 availability:ActivitySourceDestinationAvailability;
 progressionLevel:number;
}

interface RankedItemSource extends ActivitySourceItemSourceEntry{typePriority:number;}

const sourceStatusPriority:Record<ActivitySourceAvailabilityStatus,number>={ready:0,travel:1,locked:2,info:3};

export function activitySourceItemSourceEntries(state:GameState,itemId:string):ActivitySourceItemSourceEntry[]{
 const candidates:RankedItemSource[]=[];
 for(const gather of gatherDefs.filter(row=>row.itemId===itemId)){
  const zone=WORLD_ZONES.find(row=>row.id===gather.zoneId),yieldText=gather.min===gather.max?`${gather.min}/action`:`${gather.min}–${gather.max}/action`,destination:ActivitySourceDestination={kind:'skills',skillId:gather.skillId as SkillId,mode:'gathering',actionId:gather.id,regionId:gather.zoneId,button:`Gather ${gather.name}`,detail:`${gather.name} in ${zone?.name??gather.zoneId} · ${yieldText}.`};
  candidates.push({type:'gathering',typeLabel:'Gathering',title:gather.name,destination,availability:activitySourceDestinationAvailability(state,destination),typePriority:0,progressionLevel:gather.unlockLevel});
 }
 for(const [zoneId,essence] of Object.entries(HERBALISM_ESSENCE_BY_ZONE).filter(([,source])=>source.itemId===itemId)){
  const zone=WORLD_ZONES.find(row=>row.id===zoneId);
  for(const herb of HERB_NODES.filter(row=>row.zoneId===zoneId)){
   const destination:ActivitySourceDestination={kind:'skills',skillId:'herbalism',mode:'gathering',actionId:herb.id,regionId:zoneId,button:`Harvest ${herb.name}`,detail:`Rare secondary find from Herbalism in ${zone?.name??zoneId}. Careful Harvest improves the chance.`};
   candidates.push({type:'gathering',typeLabel:'Gathering',title:herb.name,destination,availability:activitySourceDestinationAvailability(state,destination),typePriority:0,progressionLevel:herb.unlockLevel});
  }
 }
 for(const recipe of RECIPES.filter(row=>row.output.itemId===itemId)){
  const destination:ActivitySourceDestination={kind:'skills',skillId:recipe.skillId as SkillId,mode:'crafting',recipeId:recipe.id,button:`Craft ${recipe.name}`,detail:`${recipe.name} · makes ${recipe.output.quantity} per craft · ${skillLabel(recipe.skillId)} Lv ${recipe.level}.`};
  candidates.push({type:'crafting',typeLabel:'Crafting',title:recipe.name,destination,availability:activitySourceDestinationAvailability(state,destination),typePriority:1,progressionLevel:recipe.level});
 }
 for(const monster of MONSTERS.filter(row=>row.drops.some(drop=>drop.itemId===itemId))){
  const drop=monster.drops.find(row=>row.itemId===itemId)!,region=regionForZoneName(monster.zone),quantity=drop.min===drop.max?`${drop.min}`:`${drop.min}–${drop.max}`,destination:ActivitySourceDestination={kind:'combat',monsterId:monster.id,zoneName:monster.zone,regionId:region?.id,button:`Hunt ${monster.name}`,detail:`${monster.name} in ${monster.zone} · ${sourceChanceLabel(drop.chance)} drop · ${quantity} on hit.`};
  candidates.push({type:'monster_drop',typeLabel:'Monster Drop',title:monster.name,destination,availability:activitySourceDestinationAvailability(state,destination),typePriority:2,progressionLevel:monster.unlockLevel});
 }
 for(const dungeon of dungeonMaterialSourcesForItem(itemId)){
  const chance=Math.round(dungeon.chance*100),destination:ActivitySourceDestination={kind:'dungeon',dungeonId:dungeon.dungeonId,button:`Open ${dungeon.dungeonName}`,detail:`${dungeon.dungeonName} · ${chance}% boss reward chance.`};
  candidates.push({type:'dungeon',typeLabel:'Dungeon',title:dungeon.dungeonName,destination,availability:activitySourceDestinationAvailability(state,destination),typePriority:3,progressionLevel:dungeon.minLevel});
 }
 return candidates.sort((a,b)=>sourceStatusPriority[a.availability.status]-sourceStatusPriority[b.availability.status]||a.typePriority-b.typePriority||a.progressionLevel-b.progressionLevel||a.destination.button.localeCompare(b.destination.button)).map(({typePriority,...row})=>row);
}

export function activitySourceItemSources(state:GameState,itemId:string):ActivitySourceDestination[]{
 return activitySourceItemSourceEntries(state,itemId).map(row=>row.destination);
}

export function activitySourceItemSource(state:GameState,itemId:string):ActivitySourceDestination{
 return activitySourceItemSourceEntries(state,itemId)[0]?.destination??{kind:'inventory',button:'Open Inventory',detail:'No direct activity source is currently registered; review your stored materials.'};
}
