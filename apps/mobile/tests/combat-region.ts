import {claimActivity,createCharacter,newGame,startCombat,startExploration,startGathering,travelToRegion} from '../src/core/game';
import {currentRegionId} from '../src/core/combat-region';
import {encounterUnlocked,nextRegionUnlock,orderedTravelRegions,regionActivitySummary,regionEncounters} from '../src/core/world-navigation';

const ok=(condition:unknown,message:string)=>{if(!condition)throw new Error(message)};
const beginner=createCharacter(newGame(0),'IRONWARDEN','Region Test');
ok(currentRegionId(beginner)==='GREENFIELDS','A new character must begin in Greenfields');

let rejected=false;
try{startGathering(beginner,'COPPER_VEIN',1)}catch{rejected=true}
ok(rejected,'Gathering outside the current region must be rejected by core game logic');

const veteran={...beginner,character:{...beginner.character!,level:20}};
const travelled=travelToRegion(veteran,'OLD_MINES',2);
ok(currentRegionId(travelled.state)==='OLD_MINES','Travel must persist the new current region');
ok(startGathering(travelled.state,'COPPER_VEIN',3).activity?.targetId==='COPPER_VEIN','Gathering in the current region must be allowed');

rejected=false;
try{startCombat(travelled.state,'MOSS_RAT',4)}catch{rejected=true}
ok(rejected,'Combat outside the current region must be rejected by core game logic');

const active=startGathering(travelled.state,'COPPER_VEIN',5);
const returned=travelToRegion(active,'GREENFIELDS',60005);
ok(returned.state.currentRegionId==='GREENFIELDS'&&returned.state.activity===null,'Travel must settle and stop an active regional activity');
ok(returned.reward.elapsedSeconds>0,'Travel must preserve rewards earned before departure');

rejected=false;
try{travelToRegion(beginner,'KINGS_ROAD',6)}catch{rejected=true}
ok(rejected,'Locked regions must reject travel');

const later={...beginner,character:{...beginner.character!,level:30}};
const sunscar=travelToRegion(later,'SUNSCAR',7).state;
ok(currentRegionId(sunscar)==='SUNSCAR','Later-region travel must persist Sunscar');
const sunscarScout=startExploration(sunscar,'SCOUT_SUNSCAR',8);
const sunscarMapped=claimActivity(sunscarScout,218008).state;
ok(sunscarMapped.unlockedMonsterIds.includes('SUNSCAR_SCORPION'),'Sunscar scouting must unlock its first authored encounter');
const sunscarCombat=startCombat(sunscarMapped,'SUNSCAR_SCORPION',218009);
ok(sunscarCombat.activity?.targetId==='SUNSCAR_SCORPION','Sunscar encounters must use the normal combat activity lane');
ok(!claimActivity(sunscarCombat,338009).state.unlockedMonsterIds.includes('BLACKGLASS_MIRELING'),'Sunscar combat must not bypass Ashlands scouting');

const frost={...beginner,character:{...beginner.character!,level:50}};
const frostmarch=travelToRegion(frost,'FROSTMARCH',9).state;
const frostScout=startExploration(frostmarch,'SCOUT_FROSTMARCH',10);
const frostMapped=claimActivity(frostScout,310010).state;
ok(startCombat(frostMapped,'FROSTWOLF',310011).activity?.targetId==='FROSTWOLF','Frostmarch encounters must be startable after scouting and its level gate');
rejected=false;
try{travelToRegion(later,'FROSTMARCH',11)}catch{rejected=true}
ok(rejected,'Frostmarch must remain locked below its level gate');

const ash={...beginner,character:{...beginner.character!,level:75}};
const ashlands=travelToRegion(ash,'ASHLANDS',12).state;
const ashScout=startExploration(ashlands,'SCOUT_ASHLANDS',13);
const ashMapped=claimActivity(ashScout,373013).state;
ok(ashMapped.unlockedMonsterIds.includes('BLACKGLASS_MIRELING'),'Ashlands scouting must unlock its first authored encounter');
ok(startCombat(ashMapped,'BLACKGLASS_MIRELING',373014).activity?.targetId==='BLACKGLASS_MIRELING','Ashlands encounters must use the normal combat activity lane');
ok(encounterUnlocked(ashMapped,{id:'BLACKGLASS_MIRELING',name:'Blackglass Mireling',level:72,hp:1,attack:1,defense:1,xp:1,gold:1,secondsPerKill:1,unlockLevel:71,zone:'Ashlands',drops:[]}),'Unlocked Ashlands encounter must appear in the world browser');
ok(regionEncounters(ashMapped,'Ashlands','glass',true).some(monster=>monster.id==='BLACKGLASS_MIRELING'),'Later-region encounter search must include discovered content');
ok(nextRegionUnlock(30)?.id==='FROSTMARCH'&&nextRegionUnlock(50)?.id==='ASHLANDS','Next-region navigation must include later regions');
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

console.log('PASS: travel persists location and region gates combat and gathering');
