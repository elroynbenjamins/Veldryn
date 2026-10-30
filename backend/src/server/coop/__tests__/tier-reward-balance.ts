import {strict as assert} from 'node:assert';
import {EXPEDITIONS} from '../../expeditions/content/launch-content';
import {EXPEDITION} from '../../expeditions/constants';
import {marksForRun} from '../../expeditions/rewards';
import {coopTierEnemyMultipliers} from '../../expeditions/tier-balance';
import {readinessEligibleCoopTier} from '../config';
import {dungeonRewardState,enhancedDungeonMarks} from '../dungeon-reward-balance';
import type {QModeRun} from '../qmode';
import {launchPlayer} from '../../combat/content/launch-combat';
import {initialPersistentRunState,resolveCoopNode} from '../../expeditions/node-resolution';
import {generateCoopRouteGraph} from '../../expeditions/route-generation';

const tiers=[1,2,3,4,5] as const;
const expectedMarks=[74,81,93,107,126];
let lastAttack=0,lastHp=0,lastDefense=0;
tiers.forEach((tier,i)=>{
 const scale=coopTierEnemyMultipliers(tier);
 assert.equal(marksForRun(74,tier,{cleared:true,routeProgress:1,reachedFinalBoss:true}),expectedMarks[i]);
 assert.ok(scale.attack>=lastAttack&&scale.hp>=lastHp&&scale.defense>=lastDefense);
 assert.equal(Number(scale.attack.toFixed(2)),EXPEDITION.difficultyIndex[tier]);
 lastAttack=scale.attack;lastHp=scale.hp;lastDefense=scale.defense;
});
assert.deepEqual(coopTierEnemyMultipliers(1),{attack:1,hp:1,defense:1});
assert.equal(readinessEligibleCoopTier(15,25,.8),1,'Minimal gear must not be auto-queued at the highest unlocked tier');
assert.equal(readinessEligibleCoopTier(15,35,1.05),5,'Strong verified gear may enter higher auto tiers');
assert.equal(readinessEligibleCoopTier(15,20,1.5),2,'Character level remains an upper bound');
assert.equal(readinessEligibleCoopTier(15,25,.79),undefined,'Invalid role readiness cannot auto-queue');
const roster=['Ironwarden','Wayfinder','Ravager','Dawnkeeper'].map(className=>launchPlayer(className,25));
const graph=generateCoopRouteGraph('balance-audit','EXP_001','test-run','v2','v2');
const first=graph.nodes.find(node=>node.nodeId==='d1-c0')!;
const seedState=initialPersistentRunState(roster);
const firstNormal=resolveCoopNode({runId:'test-run',serverSecret:'balance-audit',node:first,players:roster,state:seedState,tier:1});
const firstLegacy=resolveCoopNode({runId:'test-run',serverSecret:'balance-audit',node:first,players:roster,state:seedState});
assert.deepEqual(firstNormal,firstLegacy,'Tier I must preserve original combat balance byte-for-byte');
const stronger=resolveCoopNode({runId:'test-run',serverSecret:'balance-audit',node:first,players:roster,state:seedState,tier:5});
assert.equal(stronger.summary.kind,'combat');
assert.equal(firstNormal.summary.kind,'combat');

const run={id:'test-run',expeditionId:'EXP_001',tier:5,phase:'completed',tierScalingVersion:2,
 graph,persistentState:{...seedState,visitedNodeIds:[first.nodeId]},lastResolution:{nodeId:graph.bossNodeId,result:{summary:{kind:'combat'}}}
} as unknown as QModeRun;
assert.equal(enhancedDungeonMarks(run),126);
const legacy={...run,tierScalingVersion:undefined} as QModeRun;
assert.equal(enhancedDungeonMarks(legacy),Math.round(EXPEDITIONS.EXP_001.baseMarks*.8),'Legacy live in-progress payouts are preserved');
const failedEarly={...run,phase:'failed',persistentState:{...seedState,visitedNodeIds:[first.nodeId]},lastResolution:{nodeId:first.nodeId,result:{summary:{kind:'combat'}}}} as unknown as QModeRun;
assert.equal(enhancedDungeonMarks(failedEarly),6,'Early failures earn a small progress payment');
const boss=graph.nodes.find(node=>node.kind==='boss')!;
const failedBoss={...run,phase:'failed',persistentState:{...seedState,visitedNodeIds:graph.nodes.filter(node=>node.nodeId.startsWith('d')&&node.nodeId.endsWith('-c0')).map(node=>node.nodeId)},lastResolution:{nodeId:boss.nodeId,result:{summary:{kind:'combat',enemyHp:{chief:20},replayCombatants:[{id:'chief',boss:true,maxHp:100}]}}}} as unknown as QModeRun;
assert.equal(dungeonRewardState(failedBoss).finalBossHpFraction,.2);
assert.equal(enhancedDungeonMarks(failedBoss),63,'Near-boss defeat earns half of tier-correct full Marks');
assert.equal(enhancedDungeonMarks({...failedBoss,lastResolution:{nodeId:boss.nodeId,result:{summary:{kind:'combat',enemyHp:{chief:80},replayCombatants:[{id:'chief',boss:true,maxHp:100}]}}}} as unknown as QModeRun),44,'Other boss defeats earn 35%');
assert.equal(enhancedDungeonMarks({...run,phase:'awaiting_choice'} as QModeRun),0,'No reward before terminal settlement');
// Lightweight deterministic audit. These figures are diagnostics, not claims
// about production clear rates; larger calibrated trials gate the rollout.
const baselineParties=[
 {name:'restoration',party:['Ironwarden','Wayfinder','Ravager','Dawnkeeper'].map(name=>launchPlayer(name,25))},
 {name:'utility',party:['Ironwarden','Hexweaver','Knife Dancer','Stonecaller'].map(name=>launchPlayer(name,25))},
];
const trials=60;
const audit:{party:string;tier:number;clears:number;rate:number}[]=[];
for(const baseline of baselineParties){
 for(const tier of tiers){
  let wins=0;
  for(let n=0;n<trials;n++){
   const id=`tier-audit-${baseline.name}-${n}`;
   const tree=generateCoopRouteGraph('tier-audit', 'EXP_001',id,'audit-v2','audit-v2');
   let state=initialPersistentRunState(baseline.party),current=tree.entryNodeId,alive=true;
   for(let depth=1;depth<=tree.preBossNodeCount;depth++){
    const currentNode=tree.nodes.find(node=>node.nodeId===current)!;
    const choices=currentNode.nextNodeIds.map(nodeId=>tree.nodes.find(node=>node.nodeId===nodeId)!);
    const node=choices.find(item=>item.kind==='camp')??choices[0];
    const result=resolveCoopNode({runId:id,serverSecret:'tier-audit',node,players:baseline.party,state,tier});
    state=result.state;current=node.nodeId;
    if(!result.success){alive=false;break;}
   }
   if(alive){
    const bossNode=tree.nodes.find(node=>node.nodeId===tree.bossNodeId)!;
    const result=resolveCoopNode({runId:id,serverSecret:'tier-audit',node:bossNode,players:baseline.party,state,tier});
    alive=result.success;
   }
   if(alive)wins++;
  }
  audit.push({party:baseline.name,tier,clears:wins,rate:Number((wins/trials).toFixed(3))});
 }
}
console.log('Tier balance audit (diagnostic, n=60 per tier/party):',JSON.stringify(audit));
console.log('PASS tier enemy scaling, Tier I legacy compatibility, and Solo/Live tier-aware failure rewards');
