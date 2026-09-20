import {createCharacter,claimActivity,newGame} from '../src/core/game';
import {totalXpAtLevel,levelFromXp} from '../src/core/progression';
import {rewardHasProgress} from '../src/core/playability';
import {companionMaterialSourceTargets,companionProgressionRoadmap} from '../src/core/companion-presentation';

function fail(message:string):never{throw new Error(message)}
function ok(value:unknown,message:string){if(!value)fail(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(`${message}: expected ${String(expected)}, got ${String(actual)}`)}

const target=totalXpAtLevel(30),beforeXp=target-1;
equal(levelFromXp(beforeXp),29,'faith fixture starts below level 30');

let state=createCharacter(newGame(0),'IRONWARDEN','Faith Companion');
state={
  ...state,
  skills:state.skills.map(row=>row.skillId==='faith'?{...row,xp:beforeXp,level:29}:row),
  character:{
    ...state.character!,
    faith:{xp:beforeXp,favoriteBlessingIds:[],hideWeakerBlessings:true,practice:{tierId:'FAITH_LITANY',remaining:1,lastClaimAtMs:0,progressMs:0}},
  },
  activity:{
    kind:'faith',
    targetId:'FAITH_LITANY',
    startedAtMs:0,
    lastClaimAtMs:0,
    faithPractice:{tierId:'FAITH_LITANY',remainingPractices:1,lastClaimAtMs:0,progressFraction:0},
  },
};

ok(!(state.account.unlockedCombatCompanionIds??[]).includes('UNIT_008'),'Dawnwing starts locked');
const claimed=claimActivity(state,30_000);
ok(claimed.state.account.unlockedCombatCompanionIds?.includes('UNIT_008'),'Faith 30 immediately unlocks Dawnwing');
ok(claimed.reward.companionUnlocks?.some(row=>row.companionId==='UNIT_008'),'activity reward reports newly unlocked Dawnwing');
equal(claimed.reward.companionUnlocks?.find(row=>row.companionId==='UNIT_008')?.role,'support','unlock reward carries companion role');
ok(rewardHasProgress({xp:0,gold:0,items:[],kills:0,elapsedSeconds:0,companionUnlocks:[{companionId:'UNIT_008',name:'Dawnwing',role:'support',rarity:'elite'}]}),'companion-only unlock is meaningful reward progress');

const fangSources=companionMaterialSourceTargets('IRONWOOD_FANG');
ok(fangSources.some(source=>source.kind==='combat'&&source.monsterId==='IRONWOOD_WOLF'),'Ascension material exposes a direct Ironwood Wolf hunt source');
ok(companionMaterialSourceTargets('EVENT_BONDBLOOM').some(source=>source.kind==='events'),'event Ascension material exposes an Events destination');

const dawnwingRoadmap=companionProgressionRoadmap(claimed.state,'UNIT_008');
ok(dawnwingRoadmap?.owned,'newly recruited companion immediately exposes its owned roadmap');
equal(dawnwingRoadmap?.power.find(step=>step.id==='ascension-1')?.status,'current','Ascension I starts as the next power milestone');
equal(dawnwingRoadmap?.bond.find(step=>step.id==='bond-2')?.status,'current','Bond 2 starts as the next Bond milestone');

const dawnwingProgress=claimed.state.account.combatCompanionProgress?.UNIT_008;
ok(dawnwingProgress,'Dawnwing progress exists after unlock');
const milestoneState={...claimed.state,account:{...claimed.state.account,companionBondRewardClaims:[],combatCompanionProgress:{...claimed.state.account.combatCompanionProgress,UNIT_008:{...dawnwingProgress!,level:10,xp:0,ascensionTier:0 as const,bondLevel:6,bondXp:840,bondTraitUnlocked:false}}}};
const milestoneRoadmap=companionProgressionRoadmap(milestoneState,'UNIT_008');
equal(milestoneRoadmap?.power.find(step=>step.id==='ascension-1')?.status,'ready','level 10 marks Ascension I ready');
equal(milestoneRoadmap?.bond.find(step=>step.id==='bond-6')?.status,'ready','reached unclaimed Bond reward is visibly ready');
ok(milestoneRoadmap?.bond.find(step=>step.id==='bond-6')?.reward.includes('Bond Resonance'),'Bond 6 roadmap names its meaningful reward');

console.log('PASS: activity-earned companion unlock presentation and Faith reconciliation validate');
