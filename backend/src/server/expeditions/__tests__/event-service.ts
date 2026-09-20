import { strict as assert } from 'node:assert';
import { launchPlayer } from '../../combat/content/launch-combat';
import { EventExpeditionService, MemoryEventRunRepository } from '../event-service';

const service=new EventExpeditionService(new MemoryEventRunRepository(),'event-test-secret');
const players=['Ironwarden','Wayfinder','Ravager','Dawnkeeper'].map(classId=>launchPlayer(classId,45));
const members=[['a','c1','tank'],['b','c2','damage'],['c','c3','damage'],['d','c4','support']].map(([accountId,characterId,role])=>({accountId,characterId,role:role as 'tank'|'damage'|'support'}));
const now=Date.UTC(2026,6,15);

assert.throws(()=>service.start({requestId:'event-off-req',runId:'event-off-run',accountId:'a',eventId:'EVENT_SUNCREST_SHATTERED_ISLES',members,players,nowMs:now}),/event_not_live/);
assert.throws(()=>service.start({requestId:'event-wrong-req',runId:'event-wrong-run',accountId:'a',eventId:'EVENT_SUNCREST_SHATTERED_ISLES',activeLiveEventId:'EVT_ANNUAL_010_2026',members,players,nowMs:now}),/event_not_live/);

let run=service.start({requestId:'event-request-1',runId:'event-run-1',accountId:'a',eventId:'EVENT_SUNCREST_SHATTERED_ISLES',activeLiveEventId:'EVT_ANNUAL_006_2026',members,players,nowMs:now});
const originalGraph=JSON.stringify(run.graph);
assert.equal(originalGraph,JSON.stringify(service.start({requestId:'event-request-1',runId:'ignored',accountId:'a',eventId:'EVENT_SUNCREST_SHATTERED_ISLES',activeLiveEventId:'EVT_ANNUAL_006_2026',members,players,nowMs:now}).graph));

for(let depth=1;depth<=5;depth++){
 const current=run.graph.nodes.find(node=>node.nodeId===run.currentNodeId)!;
 const options=current.nextNodeIds.map(id=>run.graph.nodes.find(node=>node.nodeId===id)!);
 const selected=options.find(node=>node.kind==='camp')??options.find(node=>node.kind==='battle')!;
 run=service.choose({runId:run.id,accountId:'a',optionNodeId:selected.nodeId,requestId:`event-choice-${depth}`});
 if(run.phase==='failed')throw new Error('event route failed');
}
run=service.choose({runId:run.id,accountId:'a',optionNodeId:'boss',requestId:'event-choice-boss'});
assert.equal(run.phase,'completed');
assert.equal(run.rewardMarks,96);
assert.equal(service.claimReward({runId:run.id,accountId:'a',requestId:'event-claim'}).marks,96);
assert.equal(service.claimReward({runId:run.id,accountId:'a',requestId:'event-claim'}).idempotentReplay,true);
assert.equal(service.choose({runId:run.id,accountId:'a',optionNodeId:'boss',requestId:'event-choice-boss'}).phase,'completed');
console.log('event service tests passed');
