import { strict as assert } from 'node:assert';
import { launchPlayer } from '../../combat/content/launch-combat';
import { EVENT_EXPEDITIONS } from '../content/event-expeditions';
import { EventExpeditionService, MemoryEventRunRepository, eventBossMechanicProjection, eventMechanicProjection, eventObjectiveProjection } from '../event-service';

const players=['Ironwarden','Wayfinder','Ravager','Dawnkeeper'].map(classId=>launchPlayer(classId,80));
const members=[['a','c1','tank'],['b','c2','damage'],['c','c3','damage'],['d','c4','support']].map(([accountId,characterId,role])=>({accountId,characterId,role:role as 'tank'|'damage'|'support'}));
const now=Date.UTC(2026,6,15);

const gated=new EventExpeditionService(new MemoryEventRunRepository(),'event-test-secret');
assert.throws(()=>gated.start({requestId:'event-off-req',runId:'event-off-run',accountId:'a',eventId:'EVENT_SUNCREST_SHATTERED_ISLES',members,players,nowMs:now}),/event_not_live/);
assert.throws(()=>gated.start({requestId:'event-wrong-req',runId:'event-wrong-run',accountId:'a',eventId:'EVENT_SUNCREST_SHATTERED_ISLES',activeLiveEventId:'EVT_ANNUAL_010_2026',members,players,nowMs:now}),/event_not_live/);

const effects=new Set<string>();
for(const definition of EVENT_EXPEDITIONS){
 const service=new EventExpeditionService(new MemoryEventRunRepository(),`route-secret-${definition.id}`);
 const run=service.start({requestId:`request-${definition.liveEventSeriesId}`,runId:`run-${definition.liveEventSeriesId}`,accountId:'a',eventId:definition.id,activeLiveEventId:`${definition.liveEventSeriesId}_2026`,members,players,nowMs:now});
 assert.equal(run.graph.preBossNodeCount,definition.routeNodeCount,`${definition.eventName} route length drifted`);
 assert.equal(run.graph.generatorVersion,'event-route-v5');
 assert.equal(run.mechanic?.id,definition.mechanic.id);
 assert.equal(run.mechanic?.value,definition.mechanic.startValue);
 assert.equal(run.objective?.id,definition.objective.id);
 assert.equal(run.objective?.count,definition.objective.startCount);
 assert.ok(run.graph.nodes.some(node=>node.mechanicDelta&&node.mechanicDelta>0),`${definition.eventName} needs a restorative/success mechanic node`);
 assert.ok(run.graph.nodes.some(node=>(node.objectiveDelta??0)>0)||definition.objective.startCount>0,`${definition.eventName} needs objective progression`);
 assert.ok(run.graph.nodes.some(node=>node.kind!=='battle'&&node.kind!=='boss'&&node.kind!=='entry'),`${definition.eventName} needs non-combat route variety`);
 for(let depth=1;depth<=2;depth++)assert.ok(run.graph.nodes.filter(node=>node.depth===depth).every(node=>node.kind==='battle'),`${definition.eventName} must open with readable combat rooms`);
 const maxed={...run,objective:{id:definition.objective.id,count:definition.objective.maxCount}};
 const objective=eventObjectiveProjection(maxed);effects.add(objective.effect);
 if(objective.effect==='boss_attack_down')assert.ok(objective.bossAttackMultiplier<1);
 if(objective.effect==='boss_hp_down')assert.ok(objective.bossHpMultiplier<1);
 if(objective.effect==='boss_defense_down')assert.ok(objective.bossDefenseMultiplier<1);
 if(objective.effect==='reward_bonus')assert.ok(objective.rewardBonus>0);
 if(objective.effect==='preboss_heal')assert.ok(objective.preBossHealPct>0);
 const bossProfile=eventBossMechanicProjection(run);assert.ok(bossProfile?.label.trim());assert.ok(bossProfile?.summary.trim());assert.ok(bossProfile?.telegraph.bossName.trim());assert.ok(bossProfile?.telegraph.phases.some(phase=>phase.label==='Pressure Break'));assert.ok(bossProfile?.telegraph.castAbilities.some(ability=>ability.label.trim()));
 const altCount=definition.objective.startCount===definition.objective.maxCount?0:definition.objective.maxCount;
 const alternate=eventBossMechanicProjection({...run,objective:{id:definition.objective.id,count:altCount}});assert.ok(alternate);assert.notEqual(alternate!.profileId,bossProfile!.profileId);
}
assert.deepEqual(effects,new Set(['boss_attack_down','boss_hp_down','boss_defense_down','reward_bonus','preboss_heal']));
const veil=EVENT_EXPEDITIONS.find(item=>item.id==='EVENT_VEILBREAK_GLOAM_BREACH')!,veilService=new EventExpeditionService(new MemoryEventRunRepository(),'veil-telegraph-secret');
const veilRun=veilService.start({requestId:'veil-telegraph-request',runId:'veil-telegraph-run',accountId:'a',eventId:veil.id,activeLiveEventId:'EVT_ANNUAL_010_2026',members,players,nowMs:now});
const fullVeil=eventBossMechanicProjection({...veilRun,objective:{id:veil.objective.id,count:veil.objective.maxCount}})!;
assert.ok(fullVeil.telegraph.suppressedAbilities.some(ability=>ability.label==='Lantern Extinction'));
assert.ok(!fullVeil.telegraph.castAbilities.some(ability=>ability.label==='Lantern Extinction'));

const service=new EventExpeditionService(new MemoryEventRunRepository(),'event-suncrest-secret');
const suncrest=EVENT_EXPEDITIONS.find(item=>item.id==='EVENT_SUNCREST_SHATTERED_ISLES')!;
let run=service.start({requestId:'event-request-1',runId:'event-run-1',accountId:'a',eventId:suncrest.id,activeLiveEventId:'EVT_ANNUAL_006_2026',members,players,nowMs:now});
const originalGraph=JSON.stringify(run.graph);
assert.equal(originalGraph,JSON.stringify(service.start({requestId:'event-request-1',runId:'ignored',accountId:'a',eventId:suncrest.id,activeLiveEventId:'EVT_ANNUAL_006_2026',members,players,nowMs:now}).graph));

const initialMeter=run.mechanic!.value,initialObjective=run.objective!.count;
for(let depth=1;depth<=run.graph.preBossNodeCount;depth++){
 const current=run.graph.nodes.find(node=>node.nodeId===run.currentNodeId)!;
 const options=current.nextNodeIds.map(id=>run.graph.nodes.find(node=>node.nodeId===id)!);
 const selected=options.find(node=>(node.objectiveDelta??0)>0)??options.find(node=>(node.mechanicDelta??0)>0)??options.find(node=>node.kind==='camp'||node.kind==='shrine')??options.find(node=>node.kind==='battle')!;
 run=service.choose({runId:run.id,accountId:'a',optionNodeId:selected.nodeId,requestId:`event-choice-${depth}`});
 if(run.phase==='failed')throw new Error('event route failed');
}
assert.ok(run.mechanic!.value>=initialMeter,'themed route choices should be able to improve the seasonal meter');
assert.ok(run.objective!.count>initialObjective,'signature objective should progress through themed route choices');
const beforeBoss=eventMechanicProjection(run),objectiveBeforeBoss=eventObjectiveProjection(run),bossBefore=eventBossMechanicProjection(run);
run=service.choose({runId:run.id,accountId:'a',optionNodeId:'boss',requestId:'event-choice-boss'});
assert.equal(run.phase,'completed');
assert.equal(run.lastResolution?.result.summary.bossTuningProfile,bossBefore?.tuning.profileId);
assert.equal(run.rewardMarks,suncrest.rewardMarks+beforeBoss.rewardBonus+objectiveBeforeBoss.rewardBonus);
assert.equal(service.claimReward({runId:run.id,accountId:'a',requestId:'event-claim'}).marks,run.rewardMarks);
assert.equal(service.claimReward({runId:run.id,accountId:'a',requestId:'event-claim'}).idempotentReplay,true);
assert.equal(service.choose({runId:run.id,accountId:'a',optionNodeId:'boss',requestId:'event-choice-boss'}).phase,'completed');
console.log('event service tests passed');
