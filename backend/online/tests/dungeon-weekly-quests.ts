import assert from 'node:assert/strict';
import {
 DUNGEON_WEEKLY_QUESTS,DUNGEON_WEEKLY_REWARD_MARKS,
 dungeonWeeklyQuestForWeek,validateDungeonWeeklyQuestSnapshot,
 type DungeonWeeklyQuestSnapshot,
} from '../../../apps/mobile/src/core/dungeon-weekly-quests';
import {makeDungeonWeeklyQuestController} from '../dungeon-weekly-quests';
import {roomArtifactOffers,applyRoomArtifact} from '../../src/server/coop/room-artifact-choices';
import {roomBoonOffers} from '../../src/server/coop/room-boon-choices';
import {DUNGEON_ARTIFACTS,dungeonArtifactBonuses,rollDungeonArtifact} from '../../src/server/coop/dungeon-artifacts';
import type {QModeRun} from '../../src/server/coop/qmode';
import {initialPersistentRunState} from '../../src/server/expeditions/node-resolution';

assert.equal(DUNGEON_WEEKLY_QUESTS.length,3);
assert.deepEqual(DUNGEON_WEEKLY_QUESTS.map(q=>q.target),[1,15,3],'Single-run goals must show real depth and elite progress');
const all=new Set<string>();
for(let week=1;week<=53;week++){
 const label=`2026-W${String(week).padStart(2,'0')}`;
 const row=dungeonWeeklyQuestForWeek(label);
 assert.equal(row.id,DUNGEON_WEEKLY_QUESTS[week%3].id);
 all.add(row.id);
}
assert.equal(all.size,3,'One dungeon-only challenge rotates independently every week');
assert.throws(()=>dungeonWeeklyQuestForWeek('2026-W00'),/invalid_dungeon_week/);
assert.throws(()=>dungeonWeeklyQuestForWeek('2026-W54'),/invalid_dungeon_week/);
const chosen=dungeonWeeklyQuestForWeek('2026-W47');
const board:DungeonWeeklyQuestSnapshot={weekKey:'2026-W47',...chosen,progress:chosen.target,target:chosen.target,rewardMarks:DUNGEON_WEEKLY_REWARD_MARKS,claimed:false,resetAtMs:Date.parse('2026-11-23T00:00:00.000Z')};
assert.deepEqual(validateDungeonWeeklyQuestSnapshot(board),board);
assert.throws(()=>validateDungeonWeeklyQuestSnapshot({...board,rewardMarks:500000}),/invalid_dungeon_weekly_quest/);
assert.throws(()=>validateDungeonWeeklyQuestSnapshot({...board,id:'clears'}),/invalid_dungeon_weekly_quest/);
assert.throws(()=>validateDungeonWeeklyQuestSnapshot({...board,progress:chosen.target+1}),/invalid_dungeon_weekly_quest/);

const calls:Array<{name:string;args:Record<string,unknown>}>=[];
let claimed=false;
const rpc=async <T>(name:string,args:Record<string,unknown>):Promise<T>=>{
 calls.push({name,args});
 if(name==='coop_dungeon_weekly_quest_snapshot_server_v1')return {...board,claimed} as unknown as T;
 if(name==='coop_dungeon_weekly_quest_claim_server_v1'){
  assert.equal(args.p_account_id,'account-test');
  assert.equal(args.p_week_key,board.weekKey);
  assert.equal(args.p_request_id,'request-001');
  claimed=true;
  return {...board,claimed} as unknown as T;
 }
 throw new Error('unexpected_rpc:'+name);
};
async function verifyController(){
 const service=makeDungeonWeeklyQuestController({rpc});
 assert.equal((await service.snapshot('account-test')).claimed,false);
 assert.equal((await service.claim('account-test',board.weekKey,'request-001')).claimed,true);
 assert.equal((await service.snapshot('account-test')).claimed,true);
 await assert.rejects(service.claim('account-test','2026-W54','request-001'),/invalid_dungeon_weekly_request/);
 await assert.rejects(service.claim('account-test',board.weekKey,'bad'),/invalid_dungeon_weekly_request/);
 assert.deepEqual(calls.map(row=>row.name),[
  'coop_dungeon_weekly_quest_snapshot_server_v1','coop_dungeon_weekly_quest_claim_server_v1','coop_dungeon_weekly_quest_snapshot_server_v1',
 ]);
}

// Artifact and boon expansion continues independently from the dedicated quest.
const relicIds=Object.keys(DUNGEON_ARTIFACTS);
assert.equal(relicIds.length,8);
const selectedRelic=rollDungeonArtifact('secret','run','room',[]);
assert.equal(selectedRelic,rollDungeonArtifact('secret','run','room',[]));
assert.ok(relicIds.includes(selectedRelic));
assert.equal(dungeonArtifactBonuses(['RELIC_HUNTER_MARK'],'damage','battle').attack,1);
assert.ok(dungeonArtifactBonuses(['RELIC_HUNTER_MARK'],'damage','elite').attack>1);
assert.ok(dungeonArtifactBonuses(['RELIC_BOSS_WARD'],'tank','boss').defense>1);

const fakePlayers=[{id:'hero',role:'tank',stats:{maxHp:100}}];
const state=initialPersistentRunState(fakePlayers as unknown as Parameters<typeof initialPersistentRunState>[0]);
const treasure={nodeId:'treasure',kind:'treasure',depth:3,contentId:'TEST_TREASURE',modifierId:'steady'};
const run={
 id:'quest-test-run',enduranceRouteVersion:1,qmodePressureVersion:1,phase:'awaiting_choice',
 players:fakePlayers,graph:{contentVersion:'test',nodes:[treasure]},currentNodeId:'treasure',
 persistentState:{...state,visitedNodeIds:['treasure']},
 lastResolution:{nodeId:'treasure',result:{success:true,summary:{kind:'treasure'}}},
} as unknown as QModeRun;
const offers=roomArtifactOffers(run,'secret');
assert.equal(offers.length,3);
assert.deepEqual(offers,roomArtifactOffers(run,'secret'),'Reconnect never rerolls artifact options');
assert.equal(new Set(offers.map(row=>row.id)).size,3);
applyRoomArtifact(run,offers[0].id);
assert.equal(roomArtifactOffers(run,'secret').length,0,'Artifact choice is one-time');
const shrine={...run,chosenRoomArtifacts:undefined,currentNodeId:'shrine',graph:{contentVersion:'test',nodes:[{nodeId:'shrine',kind:'shrine',depth:3,contentId:'TEST_SHRINE'}]},lastResolution:{nodeId:'shrine',result:{success:true,summary:{kind:'shrine'}}}} as unknown as QModeRun;
assert.equal(roomBoonOffers(shrine,'secret').length,3,'New Solo boon rooms still offer three effects');
void verifyController().then(()=>console.log('PASS independent weekly dungeon board, server RPC contracts and seeded relic/boon choices')).catch(error=>{console.error(error);process.exitCode=1;});
