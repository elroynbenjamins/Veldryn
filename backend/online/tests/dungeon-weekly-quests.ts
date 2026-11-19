import assert from 'node:assert/strict';
import {dungeonWeeklyObjective,projectVerifiedDungeonWeeklyProgress,verifiedDungeonWeeklyCount,WEEKLY_DUNGEON_OBJECTIVES} from '../../../apps/mobile/src/core/dungeon-weekly-quests';
import {periodKey,seasonalQuestBoard,recordSeasonalActivity} from '../../../apps/mobile/src/core/seasonal-quests';
import type {GameState} from '../../../apps/mobile/src/core/types';
import {DUNGEON_ARTIFACTS,dungeonArtifactBonuses,rollDungeonArtifact} from '../../src/server/coop/dungeon-artifacts';
import {roomArtifactOffers,applyRoomArtifact} from '../../src/server/coop/room-artifact-choices';
import {roomBoonOffers,applyRoomBoon} from '../../src/server/coop/room-boon-choices';
import {initialPersistentRunState,resolveCoopNode} from '../../src/server/expeditions/node-resolution';
import type {QModeRun} from '../../src/server/coop/qmode';
import type {CombatantDefinition} from '../../src/server/combat/types';
import type {CoopRouteNode} from '../../src/shared/coop-types';

const dates=Array.from({length:14},(_,n)=>new Date(Date.UTC(2026,10,2+n*7)));
const objectives=new Set(dates.map(date=>dungeonWeeklyObjective(periodKey('weekly',date)).metric));
assert.equal(WEEKLY_DUNGEON_OBJECTIVES.length,3);
assert.ok(objectives.size>=2,'Weekly rotation should not be static');
for(const date of dates){
 const weekKey=periodKey('weekly',date);
 assert.deepEqual(dungeonWeeklyObjective(weekKey),dungeonWeeklyObjective(weekKey),'Quest identity remains stable all week');
}
assert.equal(verifiedDungeonWeeklyCount('2026-W1',{clears:-1,deep15:0,elite3:0}),0,'Malformed metric is not rewarded');

const date=new Date('2026-11-19T12:00:00.000Z');
const weekKey=periodKey('weekly',date);
const objective=dungeonWeeklyObjective(weekKey);
const state={
 character:{id:'weekly-hero',level:25,classId:'IRONWARDEN',personalSeasonal:{progress:{},claimIds:[],rewardChoices:{}}},
 account:{seasonalContractClaimIds:[],seasonalContractRewardChoices:{},personalSeasonalClaimLedger:{}},
 skills:[],defeatedBossIds:['FALLEN_KNIGHT'],
 currentRegionId:'ASTERFALL',
} as unknown as GameState;
const forged=recordSeasonalActivity(state,'dungeon',999,date.getTime());
assert.equal(forged,state,'Only committed dungeon results can credit the new weekly quest tag');
const before=seasonalQuestBoard(state,'weekly',date);
assert.equal(before.length,3,'Keep the existing number of weekly quest slots');
assert.equal(before.filter(item=>item.tag==='dungeon').length,1,'One weekly slot must always be a dungeon objective at level 10+');
assert.equal(before.find(item=>item.tag==='dungeon')?.name,objective.name);
const ready=projectVerifiedDungeonWeeklyProgress(state,weekKey,{clears:1,deep15:1,elite3:1});
const quest=seasonalQuestBoard(ready,'weekly',date).find(item=>item.tag==='dungeon');
assert.equal(quest?.progress,1,'Only verified dungeon counts satisfy a weekly quest');
assert.equal(quest?.required,1);
assert.deepEqual(ready.character?.personalSeasonal?.claimIds,[],'Reading dungeon progress cannot grant claims or rewards');
const retry=projectVerifiedDungeonWeeklyProgress(ready,weekKey,{clears:1,deep15:1,elite3:1});
assert.equal(seasonalQuestBoard(retry,'weekly',date).find(item=>item.tag==='dungeon')?.progress,1,'Repeated reads never add progress twice');
const rejected=projectVerifiedDungeonWeeklyProgress(ready,weekKey,{clears:0,deep15:0,elite3:0});
assert.equal(seasonalQuestBoard(rejected,'weekly',date).find(item=>item.tag==='dungeon')?.progress,0,'Server read removes stale unverified progress');
const novice={...state,character:{...state.character!,level:9}} as GameState;
assert.ok(seasonalQuestBoard(novice,'weekly',date).every(row=>row.tag!=='dungeon'),'Dungeon weekly quests require the level-10 unlock');

const secret='endurance-test-secret';
const catalog=Object.keys(DUNGEON_ARTIFACTS);
assert.equal(catalog.length,8);
const first=rollDungeonArtifact(secret,'run-a','room-3',[]);
assert.equal(first,rollDungeonArtifact(secret,'run-a','room-3',[]));
assert.ok(catalog.includes(first));
assert.equal(dungeonArtifactBonuses(['RELIC_HUNTER_MARK'],'damage','battle').attack,1);
assert.ok(dungeonArtifactBonuses(['RELIC_HUNTER_MARK'],'damage','elite').attack>1);
assert.ok(dungeonArtifactBonuses(['RELIC_BOSS_WARD'],'damage','boss').defense>1);

const actor:CombatantDefinition={id:'hero',name:'Hero',role:'tank',classId:'IRONWARDEN',team:'players',level:25,stats:{maxHp:100,attackPower:35,healingPower:15,defense:30,accuracy:10,evasion:10,critChance:.05,critMultiplier:1.5,haste:0},basicAttackMs:1500,basicAttackCoeff:1,abilities:[]};
const treasure={nodeId:'treasure',depth:3,kind:'treasure',contentId:'TREASURE_ROOM',modifierId:'steady',risk:1,rewardTag:'treasure',nextNodeIds:[]} as CoopRouteNode;
const currentState=initialPersistentRunState([actor]);
const newTreasure=resolveCoopNode({runId:'run-a',node:treasure,serverSecret:secret,players:[actor],state:currentState,enduranceLootVersion:1,deferArtifactChoice:true});
assert.equal(newTreasure.state.artifacts.length,0,'Solo rooms hold artifact until a server-validated pick');
const oldTreasure=resolveCoopNode({runId:'run-a',node:treasure,serverSecret:secret,players:[actor],state:currentState});
assert.ok(!catalog.includes(oldTreasure.state.artifacts[0]),'Legacy artifact behavior stays intact');
const run={
 id:'run-a',graph:{contentVersion:'v1',nodes:[treasure]},phase:'awaiting_choice',currentNodeId:'treasure',players:[actor],
 enduranceRouteVersion:1,qmodePressureVersion:1,
 persistentState:{...newTreasure.state,visitedNodeIds:['treasure']},
 lastResolution:{nodeId:'treasure',result:{success:true,state:newTreasure.state,summary:{kind:'treasure'}}}
} as unknown as QModeRun;
const offers=roomArtifactOffers(run,secret);
assert.equal(offers.length,3,'Every Solo treasure drafts three different relics');
assert.deepEqual(offers,roomArtifactOffers(run,secret),'Reconnected artifact draft must not reroll');
assert.equal(new Set(offers.map(offer=>offer.id)).size,3);
applyRoomArtifact(run,offers[1].id);
assert.deepEqual(run.persistentState.artifacts,[offers[1].id]);
assert.deepEqual(roomArtifactOffers(run,secret),[],'Chosen treasure cannot be drafted twice');
const shrine={nodeId:'shrine',kind:'shrine',depth:2,contentId:'SHRINE',modifierId:'steady',risk:1,rewardTag:'shrine',nextNodeIds:[]} as CoopRouteNode;
const boonRun={...run,id:'boon-run',currentNodeId:'shrine',graph:{contentVersion:'v1',nodes:[shrine]},chosenRoomArtifacts:{},persistentState:{...currentState,visitedNodeIds:['shrine']},lastResolution:{nodeId:'shrine',result:{success:true,state:currentState,summary:{kind:'shrine'}}}} as unknown as QModeRun;
const boons=roomBoonOffers(boonRun,secret);
assert.equal(boons.length,3);
assert.equal(new Set(boons.map(offer=>offer.id)).size,3);
applyRoomBoon(boonRun,boons[0].id);
assert.ok(Boolean(boonRun.chosenRoomBoons?.shrine),'Only chosen boon is committed');
console.log('PASS weekly dungeon quest rotation, server metric projection, temporary relic choices and boon drafts');
