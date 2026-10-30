import { strict as assert } from 'node:assert';
import { launchPlayer } from '../../combat/content/launch-combat';
import type { FrozenLoadoutSnapshot } from '../loadout-snapshots';
import type { PublishedEcho } from '../echo-recruitment';
import { MemoryQModeRunRepository, QModeService } from '../qmode';

function frozen(accountId:string,classId:string,characterId:string):FrozenLoadoutSnapshot{
 const player=launchPlayer(classId,25); const role=player.role as 'tank'|'damage'|'support';
 const snapshot={characterId,classId,role,level:25,...player.stats};
 return {accountId,characterId,classId,loadoutId:`load-${characterId}`,revision:1,normalized:{snapshot,abilities:player.abilities,effectiveLevel:25,normalizationVersion:'test',before:{level:25,maxHp:snapshot.maxHp,attackPower:snapshot.attackPower,healingPower:snapshot.healingPower,defense:snapshot.defense}},readiness:{ready:true,role,normalizedScore:1,failures:[]},snapshotHash:`hash-${characterId}`};
}
function echo(accountId:string,classId:string,characterId:string):PublishedEcho{return{profileId:`profile-${characterId}`,sourceAccountId:accountId,optedIn:true,publishedAtMs:9_000,contentVersion:'v1',blockedAccountIds:[],snapshot:frozen(accountId,classId,characterId)}}
const profiles=[echo('tank-owner','Ironwarden','tank-char'),echo('damage-owner-1','Wayfinder','damage-char-1'),echo('damage-owner-dup','Wayfinder','damage-char-dup'),echo('damage-owner-2','Ravager','damage-char-2'),echo('support-owner','Stonecaller','support-char')];
const repository=new MemoryQModeRunRepository();const firstService=new QModeService(repository,'q-secret-success');
let run=firstService.create({requestId:'request-1',runId:'q-run-1',controllerAccountId:'controller',controllerSnapshot:frozen('controller','Dawnkeeper','controller-char'),expeditionId:'EXP_001',tier:1,contentVersion:'v1',balanceVersion:'b1',nowMs:10_000,profiles});
assert.equal(run.players.length,4);assert.equal(new Set(run.echoSourceAccountIds).size,3);assert.equal(run.phase,'awaiting_choice');
const damageClasses=run.players.filter(player=>player.role==='damage').map(player=>player.classId);assert.equal(damageClasses.length,2);assert.equal(new Set(damageClasses).size,2,'Q-Mode must choose two different Damage classes even if duplicate-class Echoes are available');
assert.equal(firstService.create({requestId:'request-1',runId:'different',controllerAccountId:'controller',controllerSnapshot:frozen('controller','Dawnkeeper','controller-char'),expeditionId:'EXP_001',tier:1,contentVersion:'v1',balanceVersion:'b1',nowMs:10_000,profiles}).id,'q-run-1');
let denied='';try{firstService.getAuthorized(run.id,'tank-owner');}catch(error){denied=error instanceof Error?error.message:String(error);}assert.equal(denied,'not_participant');
const resumedService=new QModeService(repository,'q-secret-success');
for(let depth=1;depth<=run.graph.preBossNodeCount;depth++){
 const current=run.graph.nodes.find(node=>node.nodeId===run.currentNodeId)!;const options=current.nextNodeIds.map(id=>run.graph.nodes.find(node=>node.nodeId===id)!);const selected=options.find(node=>node.kind==='camp')??options[0];run=resumedService.choose({runId:run.id,controllerAccountId:'controller',optionNodeId:selected.nodeId});assert.equal(run.phase,'awaiting_choice');
}
run=resumedService.choose({runId:run.id,controllerAccountId:'controller',optionNodeId:'boss'});assert.equal(run.phase,'completed');assert.ok((run.rewardMarks??0)>0);
assert.equal(run.persistentState.visitedNodeIds.length,run.graph.preBossNodeCount+1);
console.log('coop phase6 qmode OK',JSON.stringify({echoes:run.echoSourceAccountIds.length,preBoss:run.graph.preBossNodeCount,rewardMarks:run.rewardMarks}));

// Production NPC fallback: preserve roles, unique DPS and real Echo preference.
import {createQModeNpcAllies} from '../qmode-npc-allies';
import {projectQModeRun} from '../qmode-public-projection';
const npcKits=createQModeNpcAllies({minimumLevel:15,syncLevel:25,controllerLevel:25});
assert.equal(npcKits.length,9);
assert.ok(npcKits.every(npc=>npc.readiness.ready));
const npcOnly=new QModeService(new MemoryQModeRunRepository(),'npc-test').create({
 requestId:'npc-test-request',runId:'npc-run',controllerAccountId:'controller',
 controllerSnapshot:frozen('controller','Dawnkeeper','controller-char'),expeditionId:'EXP_001',tier:1,
 contentVersion:'v1',balanceVersion:'b1',nowMs:10_000,profiles:[],npcSnapshots:npcKits});
assert.equal(npcOnly.npcCharacterIds?.length,3);
assert.equal(npcOnly.echoSourceAccountIds.length,0);
assert.deepEqual(projectQModeRun(npcOnly).team.map(member=>member.kind),['controller','npc','npc','npc']);
assert.equal(new Set(npcOnly.players.filter(player=>player.role==='damage').map(player=>player.classId)).size,2);
const mixed=new QModeService(new MemoryQModeRunRepository(),'npc-test').create({
 requestId:'mixed-test-request',runId:'mixed-run',controllerAccountId:'controller',
 controllerSnapshot:frozen('controller','Dawnkeeper','controller-char'),expeditionId:'EXP_001',tier:1,
 contentVersion:'v1',balanceVersion:'b1',nowMs:10_000,profiles:[profiles[0]],npcSnapshots:npcKits});
assert.equal(mixed.echoSourceAccountIds.length,1);
assert.equal(mixed.npcCharacterIds?.length,2);
assert.deepEqual(projectQModeRun(mixed).team.map(member=>member.kind),['controller','echo','npc','npc']);
console.log('Q-Mode NPC fallback passed');

import {EXPEDITIONS} from '../../expeditions/content/launch-content';
import {coopRequiredLevel} from '../config';
import {recruitQModeAllies} from '../echo-recruitment';

// Every reachable dungeon/tier must have NPC kits for all four party compositions
// without creating fake accounts, donor Echo profiles or duplicate Damage classes.
let tierCombinations=0;
for(const dungeon of Object.values(EXPEDITIONS)){
 for(const tier of [1,2,3,4,5] as const){
  const minimumLevel=coopRequiredLevel(dungeon.minLevel,tier);
  if(minimumLevel>100)continue;
  const tierKits=createQModeNpcAllies({minimumLevel,syncLevel:dungeon.recommendedLevel,controllerLevel:minimumLevel});
  assert.equal(tierKits.length,9);
  assert.ok(tierKits.every(npc=>npc.readiness.ready&&npc.normalized.before.level>=minimumLevel));
  for(const [controllerRole,controllerClassId] of [['tank','IRONWARDEN'],['damage','WAYFINDER'],['support','DAWNKEEPER']] as const){
   const allies=recruitQModeAllies({
    serverSecret:'npc-tier-regression',requestId:`npc-${dungeon.id}-${tier}-${controllerRole}`,
    controllerAccountId:'controller',controllerRole,controllerClassId,
    contentVersion:'v1',nowMs:10_000,profiles:[],npcSnapshots:tierKits,
   });
   assert.equal(allies.length,3);
   assert.ok(allies.every(ally=>ally.kind==='npc'&&ally.snapshot.accountId.startsWith('npc:qmode:')));
   assert.ok(allies.every(ally=>ally.snapshot.normalized.snapshot.displayName?.startsWith('NPC · ')===true));
   const roles=[controllerRole,...allies.map(ally=>ally.snapshot.readiness.role)];
   assert.equal(roles.filter(role=>role==='tank').length,1);
   assert.equal(roles.filter(role=>role==='damage').length,2);
   assert.equal(roles.filter(role=>role==='support').length,1);
   const damageClasses=[...(controllerRole==='damage'?[controllerClassId]:[]),...allies.filter(ally=>ally.snapshot.readiness.role==='damage').map(ally=>ally.snapshot.classId)];
   assert.equal(new Set(damageClasses).size,2);
   tierCombinations++;
  }
 }
}
console.log('Q-Mode NPC tier coverage passed',tierCombinations);
