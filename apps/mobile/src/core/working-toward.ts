import type {GameState,SkillId} from './types';
import type {GoalContext,GoalSource,ProgressionGoal} from './progression-goals-v40';
import {professionMasteryRank} from './profession-mastery-v40';
import {GATHERING,RECIPES} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {MONSTERS} from '../content/monsters';
import {WORLD_ZONES} from '../content/world-map';
import {ITEMS} from '../content/items';

export type WorkingTowardDestination=
 |{kind:'combat';monsterId:string;zoneName:string;regionId?:string;button:string;detail:string}
 |{kind:'skills';skillId?:SkillId;mode?:'gathering'|'crafting'|'faith';actionId?:string;recipeId?:string;regionId?:string;button:string;detail:string}
 |{kind:'contracts';button:string;detail:string}
 |{kind:'inventory';button:string;detail:string}
 |{kind:'world';regionId:string;button:string;detail:string}
 |{kind:'dungeon';dungeonId?:string;button:string;detail:string}
 |{kind:'info';button:string;detail:string};

const gatherDefs=[...GATHERING,...HERB_NODES];
const skillLabel=(id:string)=>id.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
const regionForZoneName=(name:string)=>WORLD_ZONES.find(zone=>zone.name===name);
const skillLevel=(state:GameState,id:string)=>state.skills.find(row=>row.skillId===id)?.level??1;

function quantities(state:GameState){
 const out:Record<string,number>={};
 for(const stack of [...state.inventory.stacks,...state.bank.stacks])out[stack.itemId]=(out[stack.itemId]??0)+stack.quantity;
 return out;
}

export function workingTowardSourceAvailability(state:GameState,source:WorkingTowardDestination):GoalSource|undefined{
 if(source.kind==='combat'){
  const monster=MONSTERS.find(row=>row.id===source.monsterId);
  const available=!!monster&&(state.unlockedMonsterIds.includes(monster.id)||state.character!.level>=monster.unlockLevel);
  return {kind:'monster',id:source.monsterId,label:monster?.name??source.monsterId,available,reason:available?undefined:`Requires combat level ${monster?.unlockLevel??'?'}.`};
 }
 if(source.kind==='skills'){
  if(source.recipeId){
   const recipe=RECIPES.find(row=>row.id===source.recipeId),skillReady=!!recipe&&skillLevel(state,recipe.skillId)>=recipe.level,characterReady=!!recipe&&(recipe.characterLevel===undefined||state.character!.level>=recipe.characterLevel),available=!!recipe&&skillReady&&characterReady;
   const reason=!recipe?'Recipe is not in the current catalog.':!skillReady?`Requires ${skillLabel(recipe.skillId)} ${recipe.level}.`:!characterReady?`Requires character level ${recipe.characterLevel}.`:undefined;
   return {kind:'recipe',id:source.recipeId,label:recipe?.name??source.recipeId,available,reason};
  }
  if(source.actionId){
   const gather=gatherDefs.find(row=>row.id===source.actionId);
   if(gather){const available=skillLevel(state,gather.skillId)>=gather.unlockLevel;return {kind:'skill',id:gather.skillId,label:gather.name,available,reason:available?undefined:`Requires ${skillLabel(gather.skillId)} ${gather.unlockLevel}.`};}
  }
  return {kind:'skill',id:source.skillId??'skills',label:source.skillId?skillLabel(source.skillId):'Skills',available:true};
 }
 if(source.kind==='contracts')return {kind:'weekly_order',id:'contract-board',label:'Contract Board',available:true};
 if(source.kind==='dungeon')return {kind:'dungeon',id:source.dungeonId??'dungeon',label:'Dungeon',available:true};
 if(source.kind==='world')return {kind:'region',id:source.regionId,label:WORLD_ZONES.find(row=>row.id===source.regionId)?.name??source.regionId,available:state.character!.level>=(WORLD_ZONES.find(row=>row.id===source.regionId)?.minLevel??1)};
 if(source.kind==='inventory')return {kind:'item',id:'inventory',label:'Inventory & Bank',available:true};
 return undefined;
}

export type WorkingTowardAvailabilityStatus='ready'|'travel'|'locked'|'info';
export interface WorkingTowardDestinationAvailability{status:WorkingTowardAvailabilityStatus;label:string;detail:string;canNavigate:boolean;}

export function workingTowardDestinationAvailability(state:GameState,source:WorkingTowardDestination):WorkingTowardDestinationAvailability{
 const base=workingTowardSourceAvailability(state,source);
 if(source.kind==='info')return {status:'info',label:'INFO',detail:source.detail,canNavigate:false};
 if(source.kind==='inventory'||source.kind==='contracts'||source.kind==='dungeon')return {status:'ready',label:'READY',detail:'Available now.',canNavigate:true};
 const regionId='regionId' in source?source.regionId:undefined,region=regionId?WORLD_ZONES.find(row=>row.id===regionId):undefined;
 if(region&&state.character!.level<region.minLevel)return {status:'locked',label:'LOCKED',detail:`Region unlocks at character level ${region.minLevel}.`,canNavigate:true};
 if(base&&!base.available)return {status:'locked',label:'LOCKED',detail:base.reason??'This source is not available yet.',canNavigate:true};
 if(regionId&&regionId!==state.currentRegionId)return {status:'travel',label:'TRAVEL',detail:`Travel to ${region?.name??regionId} first.`,canNavigate:true};
 const recipeSource=source.kind==='skills'&&!!source.recipeId;
 return {status:'ready',label:recipeSource?'AVAILABLE':'READY',detail:recipeSource?'Recipe unlocked.':'Available now.',canNavigate:true};
}

export function workingTowardItemSource(state:GameState,itemId:string):WorkingTowardDestination{
 const gather=gatherDefs.filter(row=>row.itemId===itemId).sort((a,b)=>(skillLevel(state,b.skillId)>=b.unlockLevel?1:0)-(skillLevel(state,a.skillId)>=a.unlockLevel?1:0)||a.unlockLevel-b.unlockLevel)[0];
 if(gather){
  const zone=WORLD_ZONES.find(row=>row.id===gather.zoneId);
  return {kind:'skills',skillId:gather.skillId as SkillId,mode:'gathering',actionId:gather.id,regionId:gather.zoneId,button:`Gather ${gather.name}`,detail:`${gather.name} in ${zone?.name??gather.zoneId} is a direct source.`};
 }
 const recipe=RECIPES.filter(row=>row.output.itemId===itemId).sort((a,b)=>a.level-b.level)[0];
 if(recipe)return {kind:'skills',skillId:recipe.skillId as SkillId,mode:'crafting',recipeId:recipe.id,button:`Craft ${recipe.name}`,detail:`${recipe.name} produces this item.`};
 const drops=MONSTERS.filter(monster=>monster.drops.some(drop=>drop.itemId===itemId)).sort((a,b)=>(state.unlockedMonsterIds.includes(b.id)?1:0)-(state.unlockedMonsterIds.includes(a.id)?1:0)||a.unlockLevel-b.unlockLevel);
 const monster=drops[0];
 if(monster){const region=regionForZoneName(monster.zone);return {kind:'combat',monsterId:monster.id,zoneName:monster.zone,regionId:region?.id,button:`Hunt ${monster.name}`,detail:`${monster.name} in ${monster.zone} drops this item.`};}
 return {kind:'inventory',button:'Open Inventory',detail:'No direct activity source is currently registered; review your stored materials.'};
}

export function progressionGoalDestination(state:GameState,goal:ProgressionGoal):WorkingTowardDestination{
 if(goal.kind==='skill_level'){
  if(goal.skillId==='faith')return {kind:'skills',skillId:'faith' as SkillId,mode:'faith',button:'Train Faith',detail:'Open Faith practice and continue toward this level.'};
  if(gatherDefs.some(row=>row.skillId===goal.skillId))return {kind:'skills',skillId:goal.skillId as SkillId,mode:'gathering',button:`Train ${skillLabel(goal.skillId)}`,detail:'Open this gathering skill and choose an available regional node.'};
  if(RECIPES.some(row=>row.skillId===goal.skillId))return {kind:'skills',skillId:goal.skillId as SkillId,mode:'crafting',button:`Train ${skillLabel(goal.skillId)}`,detail:'Open this profession and choose an available recipe.'};
  return {kind:'skills',skillId:goal.skillId as SkillId,button:'Open Skills',detail:`Review ${skillLabel(goal.skillId)} progression.`};
 }
 if(goal.kind==='monster_kills'){
  const monster=MONSTERS.find(row=>row.id===goal.monsterId),region=monster?regionForZoneName(monster.zone):undefined;
  return monster?{kind:'combat',monsterId:monster.id,zoneName:monster.zone,regionId:region?.id,button:`Hunt ${monster.name}`,detail:`${monster.name} is found in ${monster.zone}.`}:{kind:'info',button:'Target unavailable',detail:'This monster is not in the current encounter catalog.'};
 }
 if(goal.kind==='mastery_rank'){
  const gather=gatherDefs.find(row=>row.id===goal.actionId);
  if(gather){const zone=WORLD_ZONES.find(row=>row.id===gather.zoneId);return {kind:'skills',skillId:gather.skillId as SkillId,mode:'gathering',actionId:gather.id,regionId:gather.zoneId,button:`Work ${gather.name}`,detail:`Mastery grows by repeating ${gather.name} in ${zone?.name??gather.zoneId}.`};}
  const recipe=RECIPES.find(row=>row.id===goal.actionId);
  if(recipe)return {kind:'skills',skillId:recipe.skillId as SkillId,mode:'crafting',recipeId:recipe.id,button:`Craft ${recipe.name}`,detail:`Mastery grows by crafting ${recipe.name}.`};
  return {kind:'skills',button:'Open Skills',detail:'Open Skills to find the tracked mastery action.'};
 }
 if(goal.kind==='weekly_order')return {kind:'contracts',button:'Open Contract Board',detail:'Continue this exact weekly job from the Asterfall Journal.'};
 if(goal.kind==='item_quantity')return workingTowardItemSource(state,goal.itemId);
 if(goal.kind==='recipe'){
  const recipe=RECIPES.find(row=>row.id===goal.recipeId);
  return recipe?{kind:'skills',skillId:recipe.skillId as SkillId,mode:'crafting',recipeId:recipe.id,button:`Craft ${recipe.name}`,detail:'Open the tracked recipe.'}:{kind:'info',button:'Recipe unavailable',detail:'This recipe is not in the current catalog.'};
 }
 if(goal.kind==='pet_hunt'){
  const monster=goal.sourceKind==='monster'?MONSTERS.find(row=>row.id===goal.sourceId):undefined,region=monster?regionForZoneName(monster.zone):undefined;
  return monster?{kind:'combat',monsterId:monster.id,zoneName:monster.zone,regionId:region?.id,button:`Hunt ${monster.name}`,detail:'This hunt can award the tracked pet.'}:{kind:'info',button:'View pet source',detail:'This pet uses a dungeon or special source.'};
 }
 if(goal.kind==='dungeon_clears')return {kind:'dungeon',dungeonId:goal.dungeonId,button:'Open Dungeon',detail:'Continue the tracked dungeon from Dungeon content.'};
 if(goal.kind==='equipment_set')return {kind:'skills',mode:'crafting',button:'Open Crafting',detail:'Continue crafting pieces for the tracked equipment set.'};
 return {kind:'info',button:'Review goal',detail:'Review the tracked objective.'};
}

export function progressionGoalContext(state:GameState):GoalContext{
 const sources:Record<string,GoalSource>={},rates:NonNullable<GoalContext['rates']>={killsPerHour:{},itemPerHour:{}};
 for(const skill of state.skills){const goal={id:'preview',characterId:state.character!.id,kind:'skill_level',title:'',createdAtMs:0,pinnedAtMs:0,skillId:skill.skillId,targetLevel:skill.level+1} as ProgressionGoal;const source=workingTowardSourceAvailability(state,progressionGoalDestination(state,goal));if(source)sources[`skill:${skill.skillId}`]=source;}
 for(const monster of MONSTERS){const destination:WorkingTowardDestination={kind:'combat',monsterId:monster.id,zoneName:monster.zone,regionId:regionForZoneName(monster.zone)?.id,button:'Hunt',detail:''};const source=workingTowardSourceAvailability(state,destination);if(source)sources[`monster:${monster.id}`]=source;rates.killsPerHour![monster.id]=3600/Math.max(1,monster.secondsPerKill);}
 for(const action of gatherDefs){const destination:WorkingTowardDestination={kind:'skills',skillId:action.skillId as SkillId,mode:'gathering',actionId:action.id,regionId:action.zoneId,button:'Gather',detail:''};const source=workingTowardSourceAvailability(state,destination);if(source)sources[`mastery:${action.id}`]=source;rates.itemPerHour![action.itemId]=Math.max(.1,((action.min+action.max)/2)*3600/Math.max(1,action.seconds));}
 for(const recipe of RECIPES){const destination:WorkingTowardDestination={kind:'skills',skillId:recipe.skillId as SkillId,mode:'crafting',recipeId:recipe.id,button:'Craft',detail:''};const source=workingTowardSourceAvailability(state,destination);if(source){sources[`mastery:${recipe.id}`]=source;sources[`recipe:${recipe.id}`]=source;}}
 for(const order of state.account.weeklyOrders?.orders??[])sources[`weekly_order:${order.id}`]={...order.source,kind:'weekly_order',id:order.id,label:order.title};
 for(const item of ITEMS.filter(row=>row.type==='material')){const destination=workingTowardItemSource(state,item.id),source=workingTowardSourceAvailability(state,destination);if(source)sources[`item:${item.id}`]={...source,kind:'item',id:item.id,label:item.name};}
 return {
  skillLevels:Object.fromEntries(state.skills.map(row=>[row.skillId,row.level])),
  skillXp:Object.fromEntries(state.skills.map(row=>[row.skillId,row.xp])),
  itemQuantities:quantities(state),recipeCraftCounts:{},
  monsterKills:{...(state.character?.monsterMasteryPoints??{})},
  ownedPetIds:Object.fromEntries([...(state.account.unlockedCosmeticPetIds??[]),...(state.character?.ownedPetIds??[])].map(id=>[id,true as const])),
  craftedSetPieceCounts:{},dungeonClears:{},
  masteryPoints:Object.fromEntries(Object.entries(state.account.professionMasteryByAction??{}).map(([id,row])=>[id,row.points])),
  weeklyOrderProgress:Object.fromEntries((state.account.weeklyOrders?.orders??[]).map(row=>[row.id,row.progress])),
  sources,rates,
 };
}

export function workingTowardReadyCount(state:GameState){
 const goals=state.character?.progressionGoals??[],context=state.character?progressionGoalContext(state):undefined;
 return context?goals.filter(goal=>{const kind=goal.kind;if(kind==='mastery_rank')return professionMasteryRank(context.masteryPoints[goal.actionId]??0)>=goal.targetRank;if(kind==='item_quantity')return (context.itemQuantities[goal.itemId]??0)>=goal.targetQuantity;if(kind==='monster_kills')return (context.monsterKills[goal.monsterId]??0)>=goal.targetKills;if(kind==='skill_level')return (context.skillLevels[goal.skillId]??1)>=goal.targetLevel;if(kind==='weekly_order')return (context.weeklyOrderProgress?.[goal.orderId]??0)>=goal.targetProgress;return false;}).length:0;
}

export function workingTowardTrackableItems(){
 const sourceIds=new Set<string>([...gatherDefs.map(row=>row.itemId),...RECIPES.map(row=>row.output.itemId),...MONSTERS.flatMap(row=>row.drops.map(drop=>drop.itemId))]);
 return ITEMS.filter(item=>item.type==='material'&&sourceIds.has(item.id)).sort((a,b)=>a.name.localeCompare(b.name));
}
