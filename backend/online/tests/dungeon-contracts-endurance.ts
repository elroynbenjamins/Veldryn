import assert from 'node:assert/strict';
import {assignDungeonContracts,DUNGEON_CONTRACTS,dungeonContractProgress} from '../../src/server/coop/dungeon-contracts';
import {DUNGEON_ARTIFACTS,dungeonArtifactBonuses,rollDungeonArtifact} from '../../src/server/coop/dungeon-artifacts';
import {initialPersistentRunState,resolveCoopNode} from '../../src/server/expeditions/node-resolution';
import {roomBoonOffers,applyRoomBoon} from '../../src/server/coop/room-boon-choices';
import type {QModeRun} from '../../src/server/coop/qmode';
import type {CombatantDefinition} from '../../src/server/combat/types';
import type {CoopRouteNode} from '../../src/shared/coop-types';

const secret='dungeon-contract-seed';
const selected=assignDungeonContracts(secret,'run-01','v1');
assert.equal(selected.length,3);
assert.deepEqual(assignDungeonContracts(secret,'run-01','v1'),selected,'Reconnections keep contract assignment');
assert.ok(selected.every(id=>Boolean(DUNGEON_CONTRACTS[id])));
const assignments=new Set(Array.from({length:40},(_,i)=>assignDungeonContracts(secret,`run-${i}`,'v1').join('|')));
assert.ok(assignments.size>=4,'Different runs should draw different contract objectives');
const graphNodes=[
 {nodeId:'entry',kind:'entry',depth:0},
 ...Array.from({length:23},(_,i)=>({nodeId:`n${i+1}`,kind:i===2||i===8||i===13||i===19?'elite':'battle',depth:i+1})),
 {nodeId:'late-boss',kind:'boss',depth:24},
];
const run={
 enduranceRouteVersion:1,contractIds:['DEEP_15','ELITE_3','RELICS_3'],
 graph:{nodes:graphNodes},phase:'awaiting_choice',currentNodeId:'n15',
 persistentState:{visitedNodeIds:graphNodes.slice(1,16).map(node=>node.nodeId),artifacts:['RELIC_EMBER_HEART','RELIC_IRON_BARK']},
} as unknown as QModeRun;
const progress=dungeonContractProgress(run);
assert.deepEqual(progress.map(row=>[row.progress,row.completed]),[[15,true],[3,true],[2,false]],'Contracts count only server-resolved path, elite nodes and artifacts');
const failed={...run,lastResolution:{nodeId:'n14',result:{success:false}},persistentState:{...run.persistentState,visitedNodeIds:graphNodes.slice(1,15).map(node=>node.nodeId)}} as QModeRun;
assert.equal(dungeonContractProgress(failed)[1].progress,2,'Failed elite combat is not credited');
const bossRun={...run,contractIds:['LATE_BOSS'],phase:'completed',currentNodeId:'late-boss',persistentState:{...run.persistentState,visitedNodeIds:[...run.persistentState.visitedNodeIds,'late-boss']}} as QModeRun;
assert.equal(dungeonContractProgress(bossRun)[0].completed,true);
assert.deepEqual(dungeonContractProgress({...run,enduranceRouteVersion:undefined}),[],'Historical runs never acquire contracts on resume');

const catalog=Object.keys(DUNGEON_ARTIFACTS);
assert.equal(catalog.length,8);
for(const id of catalog){
 const choice=rollDungeonArtifact(secret,'artifact-run','treasure-room',catalog.filter(item=>item!==id).flatMap(item=>[item,item]));
 assert.equal(choice,id,'Unowned relic is preferred until the first two stacks of each are earned');
}
const relic=rollDungeonArtifact(secret,'artifact-run','treasure-room',[]);
assert.equal(relic,rollDungeonArtifact(secret,'artifact-run','treasure-room',[]),'Loot rolls cannot reroll on reconnect');
const artifactStats=dungeonArtifactBonuses(['RELIC_HUNTER_MARK','RELIC_BOSS_WARD','RELIC_PARTY_OATH'],'tank','elite');
assert.ok(artifactStats.attack>1&&artifactStats.defense>1,'Role and elite synergies affect combat');
assert.ok(dungeonArtifactBonuses(['RELIC_HUNTER_MARK'],'damage','battle').attack===1,'Elite-only relic cannot buff ordinary rooms');
assert.ok(dungeonArtifactBonuses(['RELIC_BOSS_WARD'],'damage','boss').defense>1,'Boss ward only activates against bosses');

const actor:CombatantDefinition={id:'c1',name:'Hero',role:'tank',classId:'IRONWARDEN',team:'players',level:25,stats:{maxHp:100,attackPower:35,healingPower:15,defense:30,accuracy:10,evasion:10,critChance:.05,critMultiplier:1.5,haste:0},basicAttackMs:1500,basicAttackCoeff:1,abilities:[]};
const treasure={nodeId:'t1',depth:3,kind:'treasure',contentId:'TEST_TREASURE',modifierId:'steady',risk:1,rewardTag:'treasure',nextNodeIds:[]} as CoopRouteNode;
const result=resolveCoopNode({runId:'artifact-run',node:treasure,serverSecret:secret,players:[actor],state:initialPersistentRunState([actor]),enduranceLootVersion:1});
assert.ok(result.state.artifacts.some(id=>catalog.includes(id)),'New runs gain a real named relic');
assert.equal(result.summary.artifactId,result.state.artifacts[0]);
const legacy=resolveCoopNode({runId:'artifact-run',node:treasure,serverSecret:secret,players:[actor],state:initialPersistentRunState([actor])});
assert.ok(!catalog.includes(legacy.state.artifacts[0]),'Historical rolls are preserved');

const shrine={nodeId:'s1',depth:3,kind:'shrine',contentId:'TEST_SHRINE',modifierId:'steady',risk:1,rewardTag:'shrine',nextNodeIds:[]} as CoopRouteNode;
const active={...run,qmodePressureVersion:1,currentNodeId:'s1',graph:{...run.graph,nodes:[shrine]},players:[actor],persistentState:{...initialPersistentRunState([actor]),visitedNodeIds:['s1']},lastResolution:{nodeId:'s1',result:{success:true,state:initialPersistentRunState([actor]),summary:{kind:'shrine'}}}} as QModeRun;
const offered=roomBoonOffers(active,secret);
assert.equal(offered.length,3);
assert.ok(offered.every(row=>row.id!=='ROOM_BOON_SUPPLY'));
const boonChoices=new Set(Array.from({length:50},(_,i)=>roomBoonOffers({...active,id:`run-${i}`},secret).map(row=>row.id).join(',')));
assert.ok(boonChoices.size>=4,'Expanded Endurance offers must vary by run');
applyRoomBoon(active,'ROOM_BOON_FURY');
assert.ok(active.persistentState.boons.includes('ROOM_BOON_FURY'),'Boon changes server-owned run state');
console.log('PASS Dungeon Contracts, seeded boon variety, named relic rolls, legacy isolation');
