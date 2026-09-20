import {CLASSES} from '../content/classes';
import {ITEMS} from '../content/items';
import {MONSTERS} from '../content/monsters';
import {GATHERING,RECIPES} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {WORLD_ZONES} from '../content/world-map';
import type {GameState,SkillId} from './types';
import type {WeeklyOrderCandidate} from './weekly-orders-v41';
import {COLLECTION_SETS_V45} from './collection-sets-v45';
import {CROSS_SKILL_DISCOVERIES_V45} from './cross-skill-discoveries-v45';
import {RARE_DISCOVERY_POOLS_V46} from './rare-idle-discoveries-v46';
import {BASE_OFFLINE_CAP_HOURS,MAX_OFFLINE_CAP_HOURS} from './game';

export const CURRENT_SKILL_IDS:readonly SkillId[]=['mining','woodcutting','fishing','smithing','cooking','herbalism','alchemy','hunting','exploration','tailoring','enchanting','faith'];

export interface LaunchReadinessIssue{severity:'blocker'|'warning';code:string;message:string;ref?:string}
export interface LaunchReadinessReport{ok:boolean;issues:LaunchReadinessIssue[];counts:{classes:number;regions:number;items:number;monsters:number;bosses:number;gatheringActions:number;recipes:number;weeklyOrderCandidates:number;crossSkillDiscoveries:number;collectionSets:number;enabledRareDiscoveryPools:number}}

const itemIds=new Set(ITEMS.map(row=>row.id)),zoneIds=new Set(WORLD_ZONES.map(row=>row.id)),skillIds=new Set<string>(CURRENT_SKILL_IDS);
function issue(list:LaunchReadinessIssue[],severity:LaunchReadinessIssue['severity'],code:string,message:string,ref?:string){list.push({severity,code,message,...(ref?{ref}:{})})}

export function weeklyOrderCandidatesFromCurrentContent(state:GameState):WeeklyOrderCandidate[]{
 const level=state.character?.level??1,availableZoneNames=new Set(WORLD_ZONES.filter(zone=>level>=zone.minLevel).map(zone=>zone.name)),availableZoneIds=new Set(WORLD_ZONES.filter(zone=>level>=zone.minLevel).map(zone=>zone.id));
 const hunts=MONSTERS.filter(monster=>!monster.boss).map(monster=>({id:`monster:${monster.id}`,kind:'hunt' as const,title:`Defeat ${monster.name}`,monsterId:monster.id,regionId:WORLD_ZONES.find(zone=>zone.name===monster.zone)?.id,activityId:`combat:${monster.id}`,source:{kind:'monster' as const,id:monster.id,label:monster.name,available:level>=monster.unlockLevel&&availableZoneNames.has(monster.zone),reason:level<monster.unlockLevel?`Requires level ${monster.unlockLevel}`:undefined},estimatedPerHour:Math.max(1,Math.floor(3600/Math.max(1,monster.secondsPerKill))),available:level>=monster.unlockLevel&&availableZoneNames.has(monster.zone),priority:monster.level<=level?20+Math.abs(level-monster.level):80}));
 const gathering=[...GATHERING,...HERB_NODES].map(action=>({id:`gather:${action.id}`,kind:'profession' as const,title:`${action.name}`,actionId:action.id,professionKind:'gathering' as const,regionId:action.zoneId,activityId:action.id,source:{kind:'skill' as const,id:action.skillId,label:action.name,available:availableZoneIds.has(action.zoneId)&&(state.skills.find(skill=>skill.skillId===action.skillId)?.level??1)>=action.unlockLevel,reason:availableZoneIds.has(action.zoneId)?undefined:'Region locked'},estimatedPerHour:Math.max(1,Math.floor(3600/Math.max(1,action.seconds))),available:availableZoneIds.has(action.zoneId)&&(state.skills.find(skill=>skill.skillId===action.skillId)?.level??1)>=action.unlockLevel,priority:25}));
 const recipes=RECIPES.filter(recipe=>recipe.skillId==='smithing'||recipe.skillId==='cooking').map(recipe=>({id:`recipe:${recipe.id}`,kind:'profession' as const,title:recipe.name,actionId:recipe.id,professionKind:recipe.skillId==='cooking'?'cooking' as const:'crafting' as const,activityId:recipe.id,source:{kind:'recipe' as const,id:recipe.id,label:recipe.name,available:(state.skills.find(skill=>skill.skillId===recipe.skillId)?.level??1)>=recipe.level,reason:`Requires ${recipe.skillId} ${recipe.level}`},estimatedPerHour:Math.max(1,Math.floor(3600/Math.max(1,recipe.seconds))),available:(state.skills.find(skill=>skill.skillId===recipe.skillId)?.level??1)>=recipe.level,priority:35}));
 const regionalProblems=WORLD_ZONES.filter(zone=>availableZoneIds.has(zone.id)).map(zone=>{const rates=[...hunts.filter(row=>row.available&&row.regionId===zone.id).map(row=>row.estimatedPerHour),...gathering.filter(row=>row.available&&row.regionId===zone.id).map(row=>row.estimatedPerHour)],estimatedPerHour=rates.length?Math.max(10,Math.round(rates.reduce((sum,value)=>sum+value,0)/rates.length)):30;return {id:`region:${zone.id}`,kind:'regional' as const,title:`Stabilize ${zone.name}`,regionId:zone.id,activityId:`region:${zone.id}`,source:{kind:'region' as const,id:zone.id,label:zone.name,available:true},estimatedPerHour,available:true,priority:zone.id===state.currentRegionId?12:28};});
 return [...hunts,...gathering,...recipes,...regionalProblems];
}

export function launchReadinessReport(state?:GameState):LaunchReadinessReport{
 const issues:LaunchReadinessIssue[]=[];
 if(CLASSES.length!==9)issue(issues,'blocker','CLASS_COUNT',`Expected 9 launch classes, found ${CLASSES.length}.`);
 if(new Set(CLASSES.map(row=>row.id)).size!==CLASSES.length)issue(issues,'blocker','DUPLICATE_CLASS','Class IDs must be unique.');
 if(BASE_OFFLINE_CAP_HOURS!==24||MAX_OFFLINE_CAP_HOURS!==36)issue(issues,'blocker','OFFLINE_CAP','Offline Reserve must remain 24h base / 36h max.');
 if(skillIds.has('trading'))issue(issues,'blocker','TRADING_SKILL','Trading must not be a runtime skill.');
 for(const monster of MONSTERS){
  if(!WORLD_ZONES.some(zone=>zone.name===monster.zone))issue(issues,'blocker','MONSTER_ZONE',`${monster.name} references unknown zone ${monster.zone}.`,monster.id);
  for(const drop of monster.drops)if(!itemIds.has(drop.itemId))issue(issues,'blocker','MONSTER_DROP_ITEM',`${monster.name} drops missing item ${drop.itemId}.`,monster.id);
 }
 for(const action of [...GATHERING,...HERB_NODES]){
  if(!zoneIds.has(action.zoneId))issue(issues,'blocker','GATHER_ZONE',`${action.name} references missing zone ${action.zoneId}.`,action.id);
  if(!itemIds.has(action.itemId))issue(issues,'blocker','GATHER_ITEM',`${action.name} outputs missing item ${action.itemId}.`,action.id);
  if(!skillIds.has(action.skillId))issue(issues,'blocker','GATHER_SKILL',`${action.name} uses missing skill ${action.skillId}.`,action.id);
 }
 for(const recipe of RECIPES){
  if(!skillIds.has(recipe.skillId))issue(issues,'blocker','RECIPE_SKILL',`${recipe.name} uses missing skill ${recipe.skillId}.`,recipe.id);
  if(!itemIds.has(recipe.output.itemId))issue(issues,'blocker','RECIPE_OUTPUT',`${recipe.name} outputs missing item ${recipe.output.itemId}.`,recipe.id);
  for(const input of recipe.inputs)if(!itemIds.has(input.itemId))issue(issues,'blocker','RECIPE_INPUT',`${recipe.name} requires missing item ${input.itemId}.`,recipe.id);
 }
 for(const discovery of CROSS_SKILL_DISCOVERIES_V45)for(const req of discovery.requirements)if(!skillIds.has(req.skillId))issue(issues,'blocker','DISCOVERY_SKILL',`${discovery.name} uses missing skill ${req.skillId}.`,discovery.id);
 for(const set of COLLECTION_SETS_V45.filter(row=>row.enabled))for(const member of set.members)if(member.kind==='item'&&!itemIds.has(member.id))issue(issues,'blocker','COLLECTION_ITEM',`${set.name} references missing item ${member.id}.`,set.id);
 for(const pool of RARE_DISCOVERY_POOLS_V46.filter(row=>row.enabled))for(const candidate of pool.candidates)if(candidate.reward.kind==='item_grant'&&!itemIds.has(candidate.reward.ref))issue(issues,'blocker','RARE_REWARD_ITEM',`${pool.name} references missing reward item ${candidate.reward.ref}.`,pool.id);
 if(!RARE_DISCOVERY_POOLS_V46.some(row=>row.enabled))issue(issues,'warning','RARE_POOLS_DISABLED','Rare idle discovery engine is ready, but no pool is enabled until a canonical unique reward is authored.');
 const weekly=state?weeklyOrderCandidatesFromCurrentContent(state):[];
 return {ok:!issues.some(row=>row.severity==='blocker'),issues,counts:{classes:CLASSES.length,regions:WORLD_ZONES.length,items:ITEMS.length,monsters:MONSTERS.length,bosses:MONSTERS.filter(row=>row.boss).length,gatheringActions:GATHERING.length+HERB_NODES.length,recipes:RECIPES.length,weeklyOrderCandidates:weekly.length,crossSkillDiscoveries:CROSS_SKILL_DISCOVERIES_V45.length,collectionSets:COLLECTION_SETS_V45.filter(row=>row.enabled).length,enabledRareDiscoveryPools:RARE_DISCOVERY_POOLS_V46.filter(row=>row.enabled).length}};
}
