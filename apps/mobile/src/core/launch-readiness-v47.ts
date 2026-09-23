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
import {COMBAT_CHALLENGE_IDS,COMBAT_CHALLENGES,challengeHuntStats,challengeHuntUnlocked} from './challenge-hunts';

export const CURRENT_SKILL_IDS:readonly SkillId[]=['mining','woodcutting','fishing','smithing','cooking','herbalism','alchemy','hunting','exploration','tailoring','enchanting','faith'];

export interface LaunchReadinessIssue{severity:'blocker'|'warning';code:string;message:string;ref?:string}
export interface LaunchReadinessReport{ok:boolean;issues:LaunchReadinessIssue[];counts:{classes:number;regions:number;items:number;monsters:number;bosses:number;gatheringActions:number;recipes:number;weeklyOrderCandidates:number;crossSkillDiscoveries:number;collectionSets:number;enabledRareDiscoveryPools:number}}

const itemIds=new Set(ITEMS.map(row=>row.id)),zoneIds=new Set(WORLD_ZONES.map(row=>row.id)),skillIds=new Set<string>(CURRENT_SKILL_IDS);
function issue(list:LaunchReadinessIssue[],severity:LaunchReadinessIssue['severity'],code:string,message:string,ref?:string){list.push({severity,code,message,...(ref?{ref}:{})})}

export function weeklyOrderCandidatesFromCurrentContent(state:GameState):WeeklyOrderCandidate[]{
 const level=state.character?.level??1,availableZoneNames=new Set(WORLD_ZONES.filter(zone=>level>=zone.minLevel).map(zone=>zone.name)),availableZoneIds=new Set(WORLD_ZONES.filter(zone=>level>=zone.minLevel).map(zone=>zone.id));
 const hunts=MONSTERS.filter(monster=>!monster.boss).map(monster=>({id:`monster:${monster.id}`,kind:'hunt' as const,title:`Defeat ${monster.name}`,monsterId:monster.id,regionId:WORLD_ZONES.find(zone=>zone.name===monster.zone)?.id,activityId:`combat:${monster.id}`,source:{kind:'monster' as const,id:monster.id,label:monster.name,available:level>=monster.unlockLevel&&availableZoneNames.has(monster.zone),reason:level<monster.unlockLevel?`Requires level ${monster.unlockLevel}`:undefined},estimatedPerHour:Math.max(1,Math.floor(3600/Math.max(1,monster.secondsPerKill))),available:level>=monster.unlockLevel&&availableZoneNames.has(monster.zone),priority:monster.level<=level?20+Math.abs(level-monster.level):80}));
 const bossHunts=MONSTERS.filter(monster=>monster.boss).map(monster=>{const storyCleared=state.defeatedBossIds.includes(monster.id),available=storyCleared&&level>=monster.unlockLevel&&availableZoneNames.has(monster.zone);return {id:`boss:${monster.id}`,kind:'hunt' as const,title:`Oathglass Bounty: ${monster.name}`,brief:'Defeat the Fallen Knight once during the UTC week. Only the rewarded weekly rematch counts.',monsterId:monster.id,boss:true,regionId:WORLD_ZONES.find(zone=>zone.name===monster.zone)?.id,activityId:`boss:${monster.id}`,source:{kind:'monster' as const,id:monster.id,label:monster.name,available,reason:storyCleared?undefined:'Defeat this boss in the story first'},estimatedPerHour:1,available,priority:0,reward:{rewardRef:'weekly_order_boss_fallen_knight',label:'Oathglass Bounty Cache'}};});
 const gathering=[...GATHERING,...HERB_NODES].map(action=>({id:`gather:${action.id}`,kind:'profession' as const,title:`${action.name}`,actionId:action.id,professionKind:'gathering' as const,regionId:action.zoneId,activityId:action.id,source:{kind:'skill' as const,id:action.skillId,label:action.name,available:availableZoneIds.has(action.zoneId)&&(state.skills.find(skill=>skill.skillId===action.skillId)?.level??1)>=action.unlockLevel,reason:availableZoneIds.has(action.zoneId)?undefined:'Region locked'},estimatedPerHour:Math.max(1,Math.floor(3600/Math.max(1,action.seconds))),available:availableZoneIds.has(action.zoneId)&&(state.skills.find(skill=>skill.skillId===action.skillId)?.level??1)>=action.unlockLevel,priority:25}));
 const recipes=RECIPES.filter(recipe=>recipe.skillId==='smithing'||recipe.skillId==='cooking').map(recipe=>({id:`recipe:${recipe.id}`,kind:'profession' as const,title:recipe.name,actionId:recipe.id,professionKind:recipe.skillId==='cooking'?'cooking' as const:'crafting' as const,activityId:recipe.id,source:{kind:'recipe' as const,id:recipe.id,label:recipe.name,available:(state.skills.find(skill=>skill.skillId===recipe.skillId)?.level??1)>=recipe.level,reason:`Requires ${recipe.skillId} ${recipe.level}`},estimatedPerHour:Math.max(1,Math.floor(3600/Math.max(1,recipe.seconds))),available:(state.skills.find(skill=>skill.skillId===recipe.skillId)?.level??1)>=recipe.level,priority:35}));
 const regionalProblemSeeds:Record<string,Array<{key:string;title:string;brief:string}>>={
  GREENFIELDS:[
   {key:'WARDSTONES',title:'Broken Wardstones',brief:'Old roadside wards are flickering out. Thin the creatures pressing against them and gather what the wardens need to rebuild the line.'},
   {key:'BURROWWAKE',title:'Burrowwake',brief:'Something below the fields is driving vermin and boars toward the farms. Keep the roads clear while locals reinforce the homesteads.'},
  ],
  SILVERBROOK:[
   {key:'RIVERLIGHTS',title:'Riverlights at Dusk',brief:'Unnatural lights are drifting against the current. Patrol the banks and gather from the river while ferrymen trace the source.'},
   {key:'DROWNED_TOLL',title:'The Drowned Toll',brief:'A bell is sounding beneath Silverbrook after sunset. Keep the crossings open while the village searches the flooded foundations.'},
  ],
  IRONWOOD:[
   {key:'THORNWAKE',title:'Thornwake',brief:'Briar growth is choking marked trails overnight. Hunt the things nesting in it and gather through Ironwood to push the growth back.'},
   {key:'RUNE_TREES',title:'Wolves at the Rune Trees',brief:'Predators are circling the oldest oath-marked trees. Wardens need the surrounding paths secured before they can investigate the runes.'},
  ],
  OLD_MINES:[
   {key:'BELL_BELOW',title:'The Bell Below',brief:'The abandoned mine bell is ringing again. Clear the upper tunnels and work the surviving veins while scouts descend toward the sound.'},
   {key:'RUNEBOUND_COLLAPSE',title:'Runebound Collapse',brief:'A sealed gallery has broken open and runic debris is destabilizing nearby shafts. Keep the tunnels usable while crews shore them up.'},
  ],
  KINGS_ROAD:[
   {key:'OATHBOUND_PATROLS',title:'Oathbound Patrols',brief:'Dead soldiers are marching the royal road in disciplined groups. Break their patrol routes before travelers are cut off from Asterfall.'},
   {key:'EMPTY_LANTERNS',title:'Lanterns Without Bearers',brief:'Unattended lanterns are appearing farther down the fogline each night. Hold the road while scouts map where the lights are leading.'},
  ],
  SUNSCAR:[
   {key:'GLASSSTORM',title:'Glassstorm Caravan',brief:'A moving wall of glass dust has trapped supply caravans between safe wells. Secure the route and gather usable material before the storm shifts.'},
   {key:'OBSERVATORY_ECHOES',title:'Observatory Echoes',brief:'Buried observatories are answering one another with pulses of light. Keep nearby camps safe while scholars decipher the sequence.'},
  ],
  FROSTMARCH:[
   {key:'BELLS_UNDER_ICE',title:'Bells Under Ice',brief:'Muted bells are carrying through the frozen ground. Patrol the passes and gather supplies while search parties follow the sound beneath the ice.'},
   {key:'WHITEOUT_HUNT',title:'Whiteout Hunt',brief:'Predators are using a prolonged whiteout to move close to settled routes. Reduce the threat and keep Frostmarch supply lines operating.'},
  ],
  ASHLANDS:[
   {key:'BLACKGLASS_ERUPTION',title:'Blackglass Eruption',brief:'Fresh blackglass is forcing its way through the mire and drawing hostile creatures with it. Stabilize the area before paths are sealed.'},
   {key:'CRUCIBLE_SMOKE',title:'Crucible Smoke',brief:'The distant crucible is venting ash across working routes. Keep the approaches clear while crews recover materials before visibility collapses.'},
  ],
 };
 const regionalProblems=WORLD_ZONES.filter(zone=>availableZoneIds.has(zone.id)).flatMap(zone=>{const rates=[...hunts.filter(row=>row.available&&row.regionId===zone.id).map(row=>row.estimatedPerHour),...gathering.filter(row=>row.available&&row.regionId===zone.id).map(row=>row.estimatedPerHour)],estimatedPerHour=rates.length?Math.max(10,Math.round(rates.reduce((sum,value)=>sum+value,0)/rates.length)):30,seeds=regionalProblemSeeds[zone.id]??[{key:'STABILITY',title:`Trouble in ${zone.name}`,brief:`Local routes through ${zone.name} need adventurers to keep normal activity moving.`}];return seeds.map(seed=>({id:`region:${zone.id}:${seed.key}`,kind:'regional' as const,title:seed.title,brief:seed.brief,regionId:zone.id,activityId:`region:${zone.id}:${seed.key}`,source:{kind:'region' as const,id:zone.id,label:zone.name,available:true},estimatedPerHour,available:true,priority:zone.id===state.currentRegionId?12:28,reward:{rewardRef:`weekly_order_regional_${zone.id.toLowerCase()}`,label:`${zone.name} Relief Cache`}}));});
 const threatBounties=MONSTERS.filter(monster=>!monster.boss&&level>=monster.unlockLevel&&availableZoneNames.has(monster.zone)).flatMap(monster=>COMBAT_CHALLENGE_IDS.filter(challengeId=>challengeHuntUnlocked(state,monster.id,challengeId)).map(challengeId=>{const challenge=COMBAT_CHALLENGES[challengeId],tuned=challengeHuntStats(monster,challengeId),regionId=WORLD_ZONES.find(zone=>zone.name===monster.zone)?.id;return {id:`threat:${monster.id}:${challengeId}`,kind:'threat' as const,title:`${challenge.shortName}: ${monster.name}`,brief:`Defeat ${monster.name} while running its ${challenge.name}. Normal hunts do not count toward this bounty.`,monsterId:monster.id,challengeId,regionId,activityId:`combat:${monster.id}:${challengeId}`,source:{kind:'monster' as const,id:monster.id,label:monster.name,available:true},estimatedPerHour:Math.max(1,Math.floor(3600/Math.max(1,tuned.secondsPerKill))),available:true,priority:challengeId==='apex'?4:challengeId==='nemesis'?8:challengeId==='hardened'?14:20,reward:{rewardRef:`weekly_order_threat_${challengeId}`,label:`${challenge.name} Bounty Cache`}};}));
 return [...bossHunts,...hunts,...gathering,...recipes,...regionalProblems,...threatBounties];
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
