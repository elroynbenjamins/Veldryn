import {claimActivity,createCharacter,newGame,previewActivityReward,refreshQuests,startCombat,startExploration} from '../src/core/game';
// previewActivityReward and startExploration are used in the partial-progress assertion below.
import {EXPLORATION_ROUTES,explorationGatheringSpeedBonus,explorationScoutingSpeedMultiplier,unmetScoutingPrerequisite} from '../src/content/exploration';
import {MONSTERS} from '../src/content/monsters';
import {regionAreas} from '../src/content/regional-areas';
import {characterPermanentMultipliers} from '../src/core/permanent-boosts';
import {queuedActivityReadiness} from '../src/core/activity-queue';
import {skillMilestones} from '../src/core/skill-milestones';
import {rebasedCombatLevelFromLegacyLevel as rebaseLevel} from '../src/core/progression';
import {skillLevelPace} from '../src/core/balance-projection';
import {totalXpAtLevel} from '../src/core/progression';
import type {GameState} from '../src/core/types';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}

const base=createCharacter(newGame(1),'IRONWARDEN','Explorer');
const rate=(id:string)=>{const route=EXPLORATION_ROUTES.find(row=>row.id===id)!;return route.xp*3600/route.seconds};
const green=rate('SCOUT_GREENFIELDS'),oldMines=rate('SCOUT_OLD_MINES'),sunscar=rate('SCOUT_SUNSCAR'),frost=rate('SCOUT_FROSTMARCH'),ash=rate('SCOUT_ASHLANDS');

ok(green===1800,'Starter Exploration pace should make early region discovery feel brisk');
ok(oldMines>green&&sunscar>oldMines&&frost>sunscar&&ash>frost,'Exploration XP/hour should rise with later routes');

const at=(level:number,xpPerHour:number)=>{
 const state={...base,skills:base.skills.map(row=>row.skillId==='exploration'?{...row,level,xp:totalXpAtLevel(level)}:row)};
 return skillLevelPace(state,'exploration',xpPerHour);
};
const level20=at(20,rate('SCOUT_KINGS_ROAD')),level46=at(46,frost),level71=at(71,ash);
ok((level20.etaSeconds??Infinity)<=4*3600,'King\'s Road Exploration should remain session-scale around level 20');
ok((level46.etaSeconds??Infinity)<=7.5*3600,'Frostmarch Exploration should stay under roughly 7.5 baseline hours per level');
ok((level71.etaSeconds??Infinity)<=10*3600,'Ashlands Exploration should stay under roughly 10 baseline hours per level');

const progressionLevels=EXPLORATION_ROUTES.map(row=>row.requiredExplorationLevel);
ok(progressionLevels.every((value,index)=>index===0||value>=progressionLevels[index-1]),'Exploration route requirements must rise with world progression');
ok(EXPLORATION_ROUTES.find(row=>row.id==='SCOUT_IRONWOOD')?.unlockZoneId==='OLD_MINES','Ironwood scouting should discover the first Exploration-gated region');

let storyScout:GameState={...base,currentRegionId:'IRONWOOD',character:{...base.character!,level:7},skills:base.skills.map(row=>row.skillId==='exploration'?{...row,level:3,xp:totalXpAtLevel(3)}:row),quests:base.quests.map(row=>row.questId==='QST_001'||row.questId==='QST_002'?{...row,status:'claimed' as const}:row.questId==='QST_003'?{...row,status:'active' as const}:row)};
storyScout=startExploration(storyScout,'SCOUT_IRONWOOD',1);
const storyExplored=claimActivity(storyScout,97_001).state;
ok(storyExplored.unlockedMonsterIds.includes('IRONWOOD_WOLF'),'Ironwood scouting should reveal the wolf encounter');
ok(refreshQuests(storyExplored).quests.find(row=>row.questId==='QST_003')?.status==='complete','A Hound\'s Trail should complete from the required scouting route');

let combat:GameState=createCharacter(newGame(1000),'IRONWARDEN','Field Explorer');
combat=startCombat(combat,'MOSS_RAT',1000);
const combatPreview=previewActivityReward(combat,61_000);
ok((combatPreview.explorationXp??0)>0,'Normal combat should grant a small amount of passive Exploration XP');
ok((combatPreview.explorationXp??0)<combatPreview.xp,'Passive Exploration XP should remain secondary to normal combat XP');
const mossRat=MONSTERS.find(row=>row.id==='MOSS_RAT')!;
const normalPassiveXp=combatPreview.kills*Math.max(1,Math.ceil(mossRat.level/12));
ok(combatPreview.explorationXp===Math.floor(normalPassiveXp*13/10),'Combat should give exactly 30% extra passive Exploration XP, rounded only after total kills');
const explorationBefore=combat.skills.find(row=>row.skillId==='exploration')!.xp;
const combatClaim=claimActivity(combat,61_000);
ok(combatClaim.state.skills.find(row=>row.skillId==='exploration')!.xp===explorationBefore+(combatClaim.reward.explorationXp??0),'Combat Exploration XP must settle into the Exploration skill');

// Fractional Exploration XP carries across claims, rather than being lost on short hunts.
let splitCombat=createCharacter(newGame(1_000),'IRONWARDEN','Split Explorer');
splitCombat=startCombat(splitCombat,'MOSS_RAT',1_000);
const firstClaim=claimActivity(splitCombat,31_000);
const secondClaim=claimActivity(firstClaim.state,61_000);
const splitKills=firstClaim.reward.kills+secondClaim.reward.kills;
const splitExplorationXp=(firstClaim.reward.explorationXp??0)+(secondClaim.reward.explorationXp??0);
ok(splitExplorationXp===Math.floor(splitKills*13/10),'Claim frequency must not reduce the 30% passive combat Exploration XP bonus');
ok(secondClaim.state.skills.find(row=>row.skillId==='exploration')!.xp===splitExplorationXp,'Both combat claims must settle all earned passive Exploration XP');

const frostRoute=EXPLORATION_ROUTES.find(row=>row.id==='SCOUT_FROSTMARCH')!,ashRoute=EXPLORATION_ROUTES.find(row=>row.id==='SCOUT_ASHLANDS')!;
ok(frostRoute.seconds===240&&ashRoute.seconds===288,'Exploration routes should stay 20% faster so later-region discovery does not become an unnecessary wait');

// Each of Sunscar's four playable areas has a progressively gated survey.
// Existing SCOUT_SUNSCAR completion must remain valid, including the Frostmarch route.
const sunscarRoutes=EXPLORATION_ROUTES.filter(route=>route.zoneId==='SUNSCAR');
ok(sunscarRoutes.length===4,'Sunscar needs one scouting route per playable area');
ok(sunscarRoutes.map(route=>route.areaId).join(',')===regionAreas('SUNSCAR').map(area=>area.id).join(','),'Each survey must target the correct Sunscar area');
ok(sunscarRoutes[0].id==='SCOUT_SUNSCAR'&&sunscarRoutes[0].unlockZoneId==='FROSTMARCH','Keep the original first Sunscar survey and Frostmarch discovery');
ok(sunscarRoutes.every((route,index)=>route.requiredLevel===regionAreas('SUNSCAR')[index].minLevel),'Sunscar character levels match playable area level gates');
ok(sunscarRoutes.map(route=>route.requiredExplorationLevel).join(',')==='8,10,12,14','Sunscar Exploration requirements increase gradually from 8 to 14');
ok(sunscarRoutes.slice(1).every((route,index)=>route.prerequisiteRouteId===sunscarRoutes[index].id),'Additional surveys require the prior survey');
ok(EXPLORATION_ROUTES.find(route=>route.id==='SCOUT_IRONWOOD')?.requiredExplorationLevel===3,'Ironwood now requires Exploration level 3');
ok(EXPLORATION_ROUTES.find(route=>route.id==='SCOUT_OLD_MINES')?.requiredExplorationLevel===4,'Old Mines now requires Exploration level 4');
ok(EXPLORATION_ROUTES.find(route=>route.id==='SCOUT_KINGS_ROAD')?.requiredExplorationLevel===5,'King\'s Road now requires Exploration level 5');
const legacySunscar=['SCOUT_SUNSCAR'];
ok(!unmetScoutingPrerequisite(sunscarRoutes[0],legacySunscar),'Existing Sunscar completion has no new prerequisite');
ok(unmetScoutingPrerequisite(sunscarRoutes[2],legacySunscar)?.id===sunscarRoutes[1].id,'Cannot skip the second Sunscar area survey');
const sunscarXpPerHour=sunscarRoutes.map(route=>rate(route.id));
ok(sunscarXpPerHour.every((value,index)=>index===0||value>sunscarXpPerHour[index-1]),'Later Sunscar surveys should be better XP training');
const testExplorer={...base,currentRegionId:'SUNSCAR',character:{...base.character!,level:rebaseLevel(45)},skills:base.skills.map(skill=>skill.skillId==='exploration'?{...skill,level:20,xp:totalXpAtLevel(20)}:skill),exploredRouteIds:legacySunscar};
let prerequisiteBlocked=false;
try{startExploration(testExplorer,'SCOUT_SUNSCAR_MIRAGE',1000)}catch(e){prerequisiteBlocked=String(e).includes('Scorchwind');}
ok(prerequisiteBlocked,'Starting an advanced Sunscar survey must validate earlier survey completion');
const queuedMirage=queuedActivityReadiness(testExplorer,{kind:'exploration',targetId:'SCOUT_SUNSCAR_MIRAGE'});
ok(!queuedMirage.ready&&!!queuedMirage.blocker?.includes('Scorchwind'),'Queue execution must use the same Sunscar prerequisites');
let progressedSunscar=startExploration(testExplorer,'SCOUT_SUNSCAR_SCORCHWIND',1000);
progressedSunscar=claimActivity(progressedSunscar,181_000).state;
ok(progressedSunscar.exploredRouteIds?.includes('SCOUT_SUNSCAR_SCORCHWIND'),'Completing a full Sunscar survey persists its mapping');
ok(progressedSunscar.unlockedMonsterIds.includes('DUNE_ORACLE'),'Scorchwind survey reveals the Dune Oracle encounter');
const nextSunscar=startExploration(progressedSunscar,'SCOUT_SUNSCAR_MIRAGE',200_000);
ok(nextSunscar.activity?.targetId==='SCOUT_SUNSCAR_MIRAGE','The next Sunscar survey unlocks after the prior one');
let developingBlocked=false;
try{startExploration({...testExplorer,currentRegionId:'ASHLANDS',exploredRouteIds:['SCOUT_FROSTMARCH']} as GameState,'SCOUT_ASHLANDS',1000)}catch(e){developingBlocked=String(e).includes('in development');}
ok(developingBlocked,'Unreleased regions cannot run Exploration scouting even in legacy saves');

// Exploration improves regular gathering pace and active scouting, not combat.
ok(explorationGatheringSpeedBonus(1)===0&&explorationGatheringSpeedBonus(10)===.01&&explorationGatheringSpeedBonus(100)===.1,'Trailcraft grants exactly 1% gathering speed per 10 levels, capped at 10%');
ok(explorationScoutingSpeedMultiplier(10)===1.02&&explorationScoutingSpeedMultiplier(100)===1.2,'Trailcraft scouting speed is 2% per 10 levels, capped at 20%');
const noviceGathering=characterPermanentMultipliers(base).gatheringSpeedMultiplier;
const veteran={...base,skills:base.skills.map(skill=>skill.skillId==='exploration'?{...skill,level:50,xp:totalXpAtLevel(50)}:skill)};
ok(Math.abs(characterPermanentMultipliers(veteran).gatheringSpeedMultiplier/noviceGathering-1.05)<1e-7,'Exploration 50 adds 5% to baseline gathering speed');
const highScout=startExploration({...veteran,character:{...veteran.character!,level:rebaseLevel(26)},currentRegionId:'SUNSCAR'},'SCOUT_SUNSCAR',1000);
const fasterSeconds=Math.ceil(168/explorationScoutingSpeedMultiplier(50));
ok(previewActivityReward(highScout,1000+(fasterSeconds+1)*1000).kills>=1,'Exploration 50 actually completes scouting faster');
const explorationMilestones=skillMilestones(veteran,'exploration');
ok(explorationMilestones.some(row=>row.id==='scout:SCOUT_SUNSCAR_MIRAGE')&&explorationMilestones.some(row=>row.id==='trailcraft:50'),'Scouting and Trailcraft appear in the skill progression milestones');

// Partial progress between claims must bank, so a sub-cycle claim does not reset the progress bar.
const scoutRoute=EXPLORATION_ROUTES.find(row=>row.id==='SCOUT_GREENFIELDS')!;
let partial=createCharacter(newGame(0),'IRONWARDEN','Partial Scout','female');
partial={...partial,character:{...partial.character!,level:scoutRoute.requiredLevel}};
partial=startExploration(partial,scoutRoute.id,1_000);
const halfCycleMs=1_000+Math.floor(scoutRoute.seconds*1000/2);
const halfPreview=previewActivityReward(partial,halfCycleMs);
if(halfPreview.kills!==0)throw new Error('No full cycle should have completed within the first half of the route');
const claimed=claimActivity(partial,halfCycleMs).state;
if(!claimed.activity||claimed.activity.kind!=='exploration')throw new Error('Exploration activity should remain active after a partial-cycle claim');
if(!claimed.activity.progressFraction||claimed.activity.progressFraction<0.45||claimed.activity.progressFraction>0.55)throw new Error('Partial exploration progress must bank into progressFraction instead of being discarded');

console.log('PASS: Exploration combines active scouting, passive combat familiarity, encounter discovery and later-region route gates');
