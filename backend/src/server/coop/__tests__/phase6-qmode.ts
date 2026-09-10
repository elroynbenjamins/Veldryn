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
const profiles=[echo('tank-owner','Ironwarden','tank-char'),echo('damage-owner-1','Wayfinder','damage-char-1'),echo('damage-owner-2','Ravager','damage-char-2'),echo('support-owner','Stonecaller','support-char')];
const repository=new MemoryQModeRunRepository();const firstService=new QModeService(repository,'q-secret-success');
let run=firstService.create({requestId:'request-1',runId:'q-run-1',controllerAccountId:'controller',controllerSnapshot:frozen('controller','Dawnkeeper','controller-char'),expeditionId:'EXP_001',tier:1,contentVersion:'v1',balanceVersion:'b1',nowMs:10_000,profiles});
assert.equal(run.players.length,4);assert.equal(new Set(run.echoSourceAccountIds).size,3);assert.equal(run.phase,'awaiting_choice');
assert.equal(firstService.create({requestId:'request-1',runId:'different',controllerAccountId:'controller',controllerSnapshot:frozen('controller','Dawnkeeper','controller-char'),expeditionId:'EXP_001',tier:1,contentVersion:'v1',balanceVersion:'b1',nowMs:10_000,profiles}).id,'q-run-1');
let denied='';try{firstService.getAuthorized(run.id,'tank-owner');}catch(error){denied=error instanceof Error?error.message:String(error);}assert.equal(denied,'not_participant');
const resumedService=new QModeService(repository,'q-secret-success');
for(let depth=1;depth<=run.graph.preBossNodeCount;depth++){
 const current=run.graph.nodes.find(node=>node.nodeId===run.currentNodeId)!;const options=current.nextNodeIds.map(id=>run.graph.nodes.find(node=>node.nodeId===id)!);const selected=options.find(node=>node.kind==='camp')??options[0];run=resumedService.choose({runId:run.id,controllerAccountId:'controller',optionNodeId:selected.nodeId});assert.equal(run.phase,'awaiting_choice');
}
run=resumedService.choose({runId:run.id,controllerAccountId:'controller',optionNodeId:'boss'});assert.equal(run.phase,'completed');assert.ok((run.rewardMarks??0)>0);
assert.equal(run.persistentState.visitedNodeIds.length,run.graph.preBossNodeCount+1);
console.log('coop phase6 qmode OK',JSON.stringify({echoes:run.echoSourceAccountIds.length,preBoss:run.graph.preBossNodeCount,rewardMarks:run.rewardMarks}));
