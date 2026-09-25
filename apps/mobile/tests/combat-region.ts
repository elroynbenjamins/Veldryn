import {claimActivity,createCharacter,newGame,startCombat,startExploration,startGathering,travelToRegion} from '../src/core/game';
import {currentRegionId} from '../src/core/combat-region';
import {encounterUnlocked,nextRegionUnlock,orderedTravelRegions,regionActivitySummary,regionEncounters} from '../src/core/world-navigation';
import {totalXpAtLevel} from '../src/core/progression';

const ok=(condition:unknown,message:string)=>{if(!condition)throw new Error(message)};
const beginner=createCharacter(newGame(0),'IRONWARDEN','Region Test');
ok(currentRegionId(beginner)==='GREENFIELDS','A new character must begin in Greenfields');

const explored=(state:typeof beginner,level:number,routes:string[],explorationLevel=22)=>({...state,character:{...state.character!,level,completedExplorationRouteIds:routes},skills:state.skills.map(skill=>skill.skillId==='exploration'?{...skill,level:explorationLevel,xp:totalXpAtLevel(explorationLevel)}:skill)});

let rejected=false;
try{startGathering(beginner,'COPPER_VEIN',1)}catch{rejected=true}
ok(rejected,'Gathering outside the current region must be rejected by core game logic');

rejected=false;
try{travelToRegion({...beginner,character:{...beginner.character!,level:20}},'OLD_MINES',2)}catch(error){rejected=/Scout|Map|Trace/.test(String(error))}
ok(rejected,'Character level alone must not bypass Exploration road discovery');

const veteran=explored(beginner,20,['SCOUT_GREENFIELDS','SCOUT_SILVERBROOK','SCOUT_IRONWOOD']);
const travelled=travelToRegion(veteran,'OLD_MINES',3);
ok(currentRegionId(travelled.state)==='OLD_MINES','Travel must persist the new current region after its road is discovered');
ok(startGathering(travelled.state,'COPPER_VEIN',4).activity?.targetId==='COPPER_VEIN','Gathering in the current region must be allowed');

rejected=false;
try{startCombat(travelled.state,'MOSS_RAT',5)}catch{rejected=true}
ok(rejected,'Combat outside the current region must be rejected by core game logic');

const active=startGathering(travelled.state,'COPPER_VEIN',6);
const returned=travelToRegion(active,'GREENFIELDS',60006);
ok(returned.state.currentRegionId==='GREENFIELDS'&&returned.state.activity===null,'Travel must settle and stop an active regional activity');
ok(returned.reward.elapsedSeconds>0,'Travel must preserve rewards earned before departure');

rejected=false;
try{travelToRegion(beginner,'KINGS_ROAD',7)}catch{rejected=true}
ok(rejected,'Locked regions must reject travel');

const later=explored(beginner,30,['SCOUT_GREENFIELDS','SCOUT_SILVERBROOK','SCOUT_IRONWOOD','SCOUT_OLD_MINES','SCOUT_KINGS_ROAD'],12);
const sunscar=travelToRegion(later,'SUNSCAR',8).state;
ok(currentRegionId(sunscar)==='SUNSCAR','Later-region travel must persist Sunscar');
const sunscarScout=startExploration(sunscar,'SCOUT_SUNSCAR',9);
const sunscarMapped=claimActivity(sunscarScout,218009).state;
ok(sunscarMapped.unlockedMonsterIds.includes('SUNSCAR_SCORPION'),'Sunscar scouting must unlock its first authored encounter');
ok(sunscarMapped.character?.completedExplorationRouteIds?.includes('SCOUT_SUNSCAR'),'Sunscar scouting must discover the road onward');
const sunscarCombat=startCombat(sunscarMapped,'SUNSCAR_SCORPION',218010);
ok(sunscarCombat.activity?.targetId==='SUNSCAR_SCORPION','Sunscar encounters must use the normal combat activity lane');
ok(!claimActivity(sunscarCombat,338010).state.unlockedMonsterIds.includes('BLACKGLASS_MIRELING'),'Sunscar combat must not bypass Ashlands scouting');

const frost=explored(beginner,50,['SCOUT_GREENFIELDS','SCOUT_SILVERBROOK','SCOUT_IRONWOOD','SCOUT_OLD_MINES','SCOUT_KINGS_ROAD','SCOUT_SUNSCAR'],18);
const frostmarch=travelToRegion(frost,'FROSTMARCH',10).state;
const frostScout=startExploration(frostmarch,'SCOUT_FROSTMARCH',11);
const frostMapped=claimActivity(frostScout,310011).state;
ok(startCombat(frostMapped,'FROSTWOLF',310012).activity?.targetId==='FROSTWOLF','Frostmarch encounters must be startable after scouting and its level gate');
rejected=false;
try{travelToRegion(later,'FROSTMARCH',12)}catch{rejected=true}
ok(rejected,'Frostmarch must remain locked below its level gate');

const ash=explored(beginner,75,['SCOUT_GREENFIELDS','SCOUT_SILVERBROOK','SCOUT_IRONWOOD','SCOUT_OLD_MINES','SCOUT_KINGS_ROAD','SCOUT_SUNSCAR','SCOUT_FROSTMARCH'],25);
const ashlands=travelToRegion(ash,'ASHLANDS',13).state;
const ashScout=startExploration(ashlands,'SCOUT_ASHLANDS',14);
const ashMapped=claimActivity(ashScout,373014).state;
ok(ashMapped.unlockedMonsterIds.includes('BLACKGLASS_MIRELING'),'Ashlands scouting must unlock its first authored encounter');
ok(startCombat(ashMapped,'BLACKGLASS_MIRELING',373015).activity?.targetId==='BLACKGLASS_MIRELING','Ashlands encounters must use the normal combat activity lane');
ok(encounterUnlocked(ashMapped,{id:'BLACKGLASS_MIRELING',name:'Blackglass Mireling',level:72,hp:1,attack:1,defense:1,xp:1,gold:1,secondsPerKill:1,unlockLevel:71,zone:'Ashlands',drops:[]}),'Unlocked Ashlands encounter must appear in the world browser');
ok(regionEncounters(ashMapped,'Ashlands','glass',true).some(monster=>monster.id==='BLACKGLASS_MIRELING'),'Later-region encounter search must include discovered content');
ok(nextRegionUnlock(30)?.id==='FROSTMARCH'&&nextRegionUnlock(50)?.id==='ASHLANDS','Level-only next-region lookup must remain available to balance tooling');
ok(nextRegionUnlock({...beginner,character:{...beginner.character!,level:5}})?.id==='SILVERBROOK','State-aware next-region lookup must surface an Exploration-locked region after its level gate is met');

const greenfieldsSummary=regionActivitySummary(beginner,'GREENFIELDS');
ok(greenfieldsSummary.unlocked,'Current starter region must report as unlocked');
ok(greenfieldsSummary.combatTotal>0&&greenfieldsSummary.gatheringTotal>0,'Region summary must expose real authored combat and gathering counts');
ok(greenfieldsSummary.gatheringSkills.includes('woodcutting'),'Region summary must expose authored gathering skill families');
const frostSummaryAt30=regionActivitySummary(later,'FROSTMARCH');
ok(!frostSummaryAt30.unlocked&&frostSummaryAt30.combatReady===0&&frostSummaryAt30.gatheringReady===0,'Locked regions must not report playable readiness');
const ordered=orderedTravelRegions(later,'SUNSCAR','FROSTMARCH');
ok(ordered[0]?.id==='FROSTMARCH','Pinned Working Toward destination must be promoted to the top of travel choices');
const orderedNoGoal=orderedTravelRegions(later,'SUNSCAR');
ok(orderedNoGoal[0]?.id==='KINGS_ROAD'&&orderedNoGoal.findIndex(zone=>zone.id==='FROSTMARCH')>orderedNoGoal.findIndex(zone=>zone.id==='GREENFIELDS'),'Travel ordering must show unlocked regions first and future locked regions after them');

const future={...beginner,character:{...beginner.character!,level:120},currentRegionId:'VEILLANDS'};
ok(currentRegionId(future)==='GREENFIELDS','In-development regions must never become the active persisted location');
rejected=false;
try{travelToRegion(future,'VEILLANDS',16)}catch(error){rejected=String(error).toLowerCase().includes('development')}
ok(rejected,'Core travel must reject in-development regions even above their level band');

console.log('PASS: travel now requires both character level and discovered Exploration roads');
