import { strict as assert } from 'node:assert';
import { launchPlayer } from '../../combat/content/launch-combat';
import { EVENT_EXPEDITIONS } from '../content/event-expeditions';
import { EventExpeditionService, MemoryEventRunRepository, eventMechanicProjection } from '../event-service';

const players=['Ironwarden','Wayfinder','Ravager','Dawnkeeper'].map(classId=>launchPlayer(classId,80));
const members=[['a','c1','tank'],['b','c2','damage'],['c','c3','damage'],['d','c4','support']].map(([accountId,characterId,role])=>({accountId,characterId,role:role as 'tank'|'damage'|'support'}));
const now=Date.UTC(2026,6,15);

const gated=new EventExpeditionService(new MemoryEventRunRepository(),'event-test-secret');
assert.throws(()=>gated.start({requestId:'event-off-req',runId:'event-off-run',accountId:'a',eventId:'EVENT_SUNCREST_SHATTERED_ISLES',members,players,nowMs:now}),/event_not_live/);
assert.throws(()=>gated.start({requestId:'event-wrong-req',runId:'event-wrong-run',accountId:'a',eventId:'EVENT_SUNCREST_SHATTERED_ISLES',activeLiveEventId:'EVT_ANNUAL_010_2026',members,players,nowMs:now}),/event_not_live/);

for(const definition of EVENT_EXPEDITIONS){
 const service=new EventExpeditionService(new MemoryEventRunRepository(),`route-secret-${definition.id}`);
 const run=service.start({requestId:`request-${definition.liveEventSeriesId}`,runId:`run-${definition.liveEventSeriesId}`,accountId:'a',eventId:definition.id,activeLiveEventId:`${definition.liveEventSeriesId}_2026`,members,players,nowMs:now});
 assert.equal(run.graph.preBossNodeCount,definition.routeNodeCount,`${definition.eventName} route length drifted`);
 assert.equal(run.graph.generatorVersion,'event-route-v2');
 assert.equal(run.mechanic?.id,definition.mechanic.id);
 assert.equal(run.mechanic?.value,definition.mechanic.startValue);
 assert.ok(run.graph.nodes.some(node=>node.mechanicDelta&&node.mechanicDelta>0),`${definition.eventName} needs a restorative/success mechanic node`);
 assert.ok(run.graph.nodes.some(node=>node.kind!=='battle'&&node.kind!=='boss'&&node.kind!=='entry'),`${definition.eventName} needs non-combat route variety`);
 for(let depth=1;depth<=2;depth++)assert.ok(run.graph.nodes.filter(node=>node.depth===depth).every(node=>node.kind==='battle'),`${definition.eventName} must open with readable combat rooms`);
}

const service=new EventExpeditionService(new MemoryEventRunRepository(),'event-suncrest-secret');
const suncrest=EVENT_EXPEDITIONS.find(item=>item.id==='EVENT_SUNCREST_SHATTERED_ISLES')!;
let run=service.start({requestId:'event-request-1',runId:'event-run-1',accountId:'a',eventId:suncrest.id,activeLiveEventId:'EVT_ANNUAL_006_2026',members,players,nowMs:now});
const originalGraph=JSON.stringify(run.graph);
assert.equal(originalGraph,JSON.stringify(service.start({requestId:'event-request-1',runId:'ignored',accountId:'a',eventId:suncrest.id,activeLiveEventId:'EVT_ANNUAL_006_2026',members,players,nowMs:now}).graph));

const initialMeter=run.mechanic!.value;
for(let depth=1;depth<=run.graph.preBossNodeCount;depth++){
 const current=run.graph.nodes.find(node=>node.nodeId===run.currentNodeId)!;
 const options=current.nextNodeIds.map(id=>run.graph.nodes.find(node=>node.nodeId===id)!);
 const selected=options.find(node=>(node.mechanicDelta??0)>0)??options.find(node=>node.kind==='camp'||node.kind==='shrine')??options.find(node=>node.kind==='battle')!;
 run=service.choose({runId:run.id,accountId:'a',optionNodeId:selected.nodeId,requestId:`event-choice-${depth}`});
 if(run.phase==='failed')throw new Error('event route failed');
}
assert.ok(run.mechanic!.value>=initialMeter,'themed route choices should be able to improve the seasonal meter');
const beforeBoss=eventMechanicProjection(run);
run=service.choose({runId:run.id,accountId:'a',optionNodeId:'boss',requestId:'event-choice-boss'});
assert.equal(run.phase,'completed');
assert.equal(run.rewardMarks,suncrest.rewardMarks+beforeBoss.rewardBonus);
assert.equal(service.claimReward({runId:run.id,accountId:'a',requestId:'event-claim'}).marks,run.rewardMarks);
assert.equal(service.claimReward({runId:run.id,accountId:'a',requestId:'event-claim'}).idempotentReplay,true);
assert.equal(service.choose({runId:run.id,accountId:'a',optionNodeId:'boss',requestId:'event-choice-boss'}).phase,'completed');
console.log('event service tests passed');
