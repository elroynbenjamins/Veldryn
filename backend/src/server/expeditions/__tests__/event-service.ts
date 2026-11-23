import { strict as assert } from 'node:assert';
import { launchPlayer } from '../../combat/content/launch-combat';
import {buildExpeditionEncounter,expeditionEncounterPreview} from '../../combat/expedition-combat-service';
import { EVENT_EXPEDITIONS,eventTierMinLevel,eventTierRewardMarks } from '../content/event-expeditions';
import { EventExpeditionService, MemoryEventRunRepository, eventBossMechanicProjection, eventMechanicProjection, eventObjectiveProjection } from '../event-service';
import {FROSTFALL_ENDURANCE_GENERATOR,FROSTFALL_ENDURANCE_BALANCE_V3,FROSTFALL_ENDURANCE_ENEMY_PACING_V3,FROSTFALL_ENDURANCE_DEPTH_REWARDS,FROSTFALL_ENDURANCE_DEPTH_CURVE_V3,frostfallDepthCurveForGraph,frostfallEnemyPacingForGraph,frostfallRewardMultiplierForBoss} from '../frostfall-endurance';

const players=['Ironwarden','Wayfinder','Ravager','Dawnkeeper'].map(classId=>launchPlayer(classId,80));
const members=[['a','c1','tank'],['b','c2','damage'],['c','c3','damage'],['d','c4','support']].map(([accountId,characterId,role])=>({accountId,characterId,role:role as 'tank'|'damage'|'support'}));
const now=Date.UTC(2026,6,15);

const gated=new EventExpeditionService(new MemoryEventRunRepository(),'event-test-secret');
assert.throws(()=>gated.start({requestId:'event-off-req',runId:'event-off-run',accountId:'a',eventId:'EVENT_SUNCREST_SHATTERED_ISLES',members,players,nowMs:now}),/event_not_live/);
assert.throws(()=>gated.start({requestId:'event-wrong-req',runId:'event-wrong-run',accountId:'a',eventId:'EVENT_SUNCREST_SHATTERED_ISLES',activeLiveEventId:'EVT_ANNUAL_010_2026',members,players,nowMs:now}),/event_not_live/);

const effects=new Set<string>();
const frostfallId='EVENT_FROSTFALL_AURORA_HOLLOW';
for(const definition of EVENT_EXPEDITIONS){
 const service=new EventExpeditionService(new MemoryEventRunRepository(),`route-secret-${definition.id}`);
 const run=service.start({requestId:`request-${definition.liveEventSeriesId}`,runId:`run-${definition.liveEventSeriesId}`,accountId:'a',eventId:definition.id,activeLiveEventId:`${definition.liveEventSeriesId}_2026`,members,players,nowMs:now});
 assert.equal(run.graph.preBossNodeCount,definition.id===frostfallId?42:definition.routeNodeCount,`${definition.eventName} route length drifted`);
 assert.equal(run.graph.generatorVersion,definition.id===frostfallId?FROSTFALL_ENDURANCE_GENERATOR:'event-route-v5');
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
 const bossProfile=eventBossMechanicProjection(run);assert.ok(bossProfile?.label.trim());assert.ok(bossProfile?.summary.trim());assert.ok(bossProfile?.telegraph.bossName.trim());assert.ok((bossProfile?.telegraph.phases.length??0)>0);assert.ok(bossProfile?.telegraph.phases.every(phase=>phase.label.trim()));assert.ok(bossProfile?.telegraph.castAbilities.some(ability=>ability.label.trim()));
 const altCount=definition.objective.startCount===definition.objective.maxCount?0:definition.objective.maxCount;
 const alternate=eventBossMechanicProjection({...run,objective:{id:definition.objective.id,count:altCount}});assert.ok(alternate);assert.notEqual(alternate!.profileId,bossProfile!.profileId);
}
assert.deepEqual(effects,new Set(['boss_attack_down','boss_hp_down','boss_defense_down','reward_bonus','preboss_heal']));
const frostfall=EVENT_EXPEDITIONS.find(item=>item.id==='EVENT_FROSTFALL_AURORA_HOLLOW')!;
assert.equal(frostfall.minLevel,10);
for(let tier=1;tier<=5;tier++){
 const required=10+(tier-1)*5;
 assert.equal(eventTierMinLevel(frostfall,tier),required);
 assert.ok(eventTierRewardMarks(frostfall,tier)>=frostfall.rewardMarks);
}
assert.throws(()=>eventTierMinLevel(frostfall,0),/invalid_event_tier/);
assert.throws(()=>eventTierMinLevel(frostfall,6),/invalid_event_tier/);
const frostBase=buildExpeditionEncounter({encounterId:'EVENT_FROSTFALL_BATTLE_01'})[0];
const frostEntry=buildExpeditionEncounter({encounterId:'EVENT_FROSTFALL_BATTLE_01',enemyLevel:10})[0];
const frostVeteran=buildExpeditionEncounter({encounterId:'EVENT_FROSTFALL_BATTLE_01',enemyLevel:30})[0];
assert.ok(frostEntry.stats.maxHp<frostBase.stats.maxHp*.5,'Tier I must not inherit level-35 hit points');
assert.ok(frostVeteran.stats.maxHp>frostEntry.stats.maxHp*2,'Tier V must be meaningfully tougher than Tier I');
assert.equal(frostEntry.level,10);
assert.equal(frostVeteran.level,30);

const baseRimebell=buildExpeditionEncounter({encounterId:'EVENT_FROSTFALL_BOSS',enemyLevel:10})[0];
const v3Rimebell=buildExpeditionEncounter({encounterId:'EVENT_FROSTFALL_BOSS',enemyLevel:10,enemyShieldMultiplier:.68*10/35})[0];
const flatShields=(actor:typeof baseRimebell)=>[
 ...actor.abilities.flatMap(ability=>ability.effects),
 ...(actor.phases??[]).flatMap(phase=>phase.effects)
].filter(effect=>effect.kind==='shield'&&typeof effect.flat==='number').map(effect=>effect.flat!);
assert.equal(flatShields(baseRimebell).length,2,'Rimebell retains both Ward and Frozen Carapace');
for(const [i,oldShield] of flatShields(baseRimebell).entries())assert.ok(Math.abs(flatShields(v3Rimebell)[i]-oldShield*.68*10/35)<1e-8,'Tier I boss barrier '+i+' scales with the normalized boss HP bracket');
assert.equal(v3Rimebell.stats.maxHp,baseRimebell.stats.maxHp,'shield-only tuning must not silently change boss HP');
assert.equal(v3Rimebell.stats.attackPower,baseRimebell.stats.attackPower,'shield-only tuning must not silently change boss attack');
assert.throws(()=>buildExpeditionEncounter({encounterId:'EVENT_FROSTFALL_BOSS',enemyLevel:10,enemyShieldMultiplier:1.5}),/invalid_enemy_shield_multiplier/);

assert.ok(expeditionEncounterPreview('EVENT_FROSTFALL_BATTLE_01',10),'tier encounter preview available');
for(let tier=1;tier<=5;tier++){
 const service=new EventExpeditionService(new MemoryEventRunRepository(),'frostfall-tier-test-'+tier);
 const run=service.start({requestId:'frost-tier-request-'+tier,runId:'frost-tier-run-'+tier,accountId:'a',eventId:frostfall.id,tier,activeLiveEventId:'EVT_ANNUAL_012_2026',members,players,nowMs:now});
 assert.equal(run.tier,tier);
 assert.equal(run.syncLevel,eventTierMinLevel(frostfall,tier));
 assert.equal(run.graph.preBossNodeCount,42);
 assert.equal(run.graph.generatorVersion,FROSTFALL_ENDURANCE_GENERATOR);
}
assert.throws(()=>new EventExpeditionService(new MemoryEventRunRepository(),'frostfall-gate').start({requestId:'frost-req-level',runId:'frost-run-level',accountId:'a',eventId:frostfall.id,tier:2,activeLiveEventId:'EVT_ANNUAL_012_2026',members,players:players.map((player,index)=>index===0?{...player,level:14}:player),nowMs:now}),/event_level_requirement/);
const frostEnduranceService=new EventExpeditionService(new MemoryEventRunRepository(),'frostfall-endurance-checkpoints');
const frostStart=frostEnduranceService.start({requestId:'frost-endurance-req',runId:'frost-endurance-run',accountId:'a',eventId:frostfall.id,activeLiveEventId:'EVT_ANNUAL_012_2026',members,players,nowMs:now});
assert.equal(frostStart.graph.nodes.filter(node=>node.kind==='boss').length,6,'five optional exits and one mandatory final boss');
assert.equal(frostStart.graph.nodes.find(node=>node.nodeId==='boss')?.depth,43);
assert.equal(frostStart.graph.balanceVersion,FROSTFALL_ENDURANCE_BALANCE_V3);
assert.deepEqual(frostfallEnemyPacingForGraph(frostStart.graph,3),FROSTFALL_ENDURANCE_ENEMY_PACING_V3);
const tier1Pace=frostfallEnemyPacingForGraph(frostStart.graph,1),tier2Pace=frostfallEnemyPacingForGraph(frostStart.graph,2);
assert.deepEqual(tier1Pace,{attack:0.504,hp:0.68,defense:0.81},'Tier I receives explicit starter difficulty relief');
assert.ok(Math.abs(tier2Pace.attack-0.612)<1e-9&&Math.abs(tier2Pace.hp-0.72)<1e-9&&Math.abs(tier2Pace.defense-0.855)<1e-9,'Tier II pacing must remain a bounded step between Tier I and III');
assert.ok(tier1Pace.attack<tier2Pace.attack&&tier2Pace.attack<FROSTFALL_ENDURANCE_ENEMY_PACING_V3.attack,'Tier I, II, III entry attack difficulty must progress in order');
assert.deepEqual(frostfallEnemyPacingForGraph({...frostStart.graph,balanceVersion:'event-frostfall-endurance-v2'},1),{attack:1,hp:1,defense:1},'already saved 42-room v2 runs preserve their original enemy stats');
assert.deepEqual(frostfallEnemyPacingForGraph({...frostStart.graph,generatorVersion:'event-route-v5'},1),{attack:1,hp:1,defense:1},'legacy six-room event routes must not adopt v3 pacing');
assert.deepEqual(frostfallDepthCurveForGraph(frostStart.graph),FROSTFALL_ENDURANCE_DEPTH_CURVE_V3);
assert.deepEqual(frostfallDepthCurveForGraph({...frostStart.graph,balanceVersion:'event-frostfall-endurance-v2'}),{attack:1.022,hp:1.035,defense:1.012},'saved 42-room v2 runs retain their original difficulty curve');
assert.deepEqual(frostfallDepthCurveForGraph({...frostStart.graph,generatorVersion:'event-route-v5'}),{attack:1.022,hp:1.035,defense:1.012},'legacy six-room events use their original curve');
assert.ok(Math.pow(FROSTFALL_ENDURANCE_DEPTH_CURVE_V3.hp,35)<1.8,'v3 final-floor HP increase is capped below 1.8x');
assert.ok(Math.pow(FROSTFALL_ENDURANCE_DEPTH_CURVE_V3.attack,35)<1.5,'v3 final-floor attack increase is capped below 1.5x');

const frostGraphNodes=frostStart.graph.nodes;
assert.equal(frostGraphNodes.length,128,'42 depths × 3 choices plus entry and final boss');
for(let depth=1;depth<=42;depth++){
 const room=frostGraphNodes.filter(node=>node.depth===depth);
 assert.equal(room.length,3,'depth '+depth+' must expose exactly three branch options');
 assert.deepEqual(room.map(node=>node.nodeId).sort(),['d'+depth+'-c0','d'+depth+'-c1','d'+depth+'-c2']);
 const checkpoint=depth>1&&(depth-1)%7===0;
 if(checkpoint){
  assert.deepEqual(room.map(node=>node.kind),['camp','shrine','boss'],'checkpoint '+depth+' must keep optional exit');
  assert.deepEqual(room.map(node=>node.nextNodeIds.length),[3,3,0],'checkpoint exit must end while continued paths remain connected');
 }else{
  assert.ok(room.every(node=>node.kind!=='boss'),'ordinary depth '+depth+' must not contain an unexpected boss exit');
  assert.ok(room.every(node=>node.nextNodeIds.length=== (depth===42?1:3)),'normal route options must remain connected');
 }
 for(const node of room)for(const next of node.nextNodeIds)assert.ok(frostGraphNodes.some(candidate=>candidate.nodeId===next&&candidate.depth===depth+1),'all route edges point to the following depth');
}
assert.deepEqual(frostGraphNodes.find(node=>node.nodeId==='boss')?.nextNodeIds,[],'final 42-room boss is terminal');

for(let stage=1;stage<=5;stage++){
 const d=7*stage+1;
 const choices=frostStart.graph.nodes.filter(node=>node.depth===d).sort((a,b)=>a.nodeId.localeCompare(b.nodeId));
 assert.deepEqual(choices.map(node=>node.kind),['camp','shrine','boss'],'Campfire, Boon, Boss checkpoint alternatives');
 assert.deepEqual(choices.map(node=>node.modifierId),['checkpoint-camp-v2','checkpoint-boon-v2','checkpoint']);
 assert.equal(choices[2].contentId,frostfall.bossEncounterId,'frozen seasonal boss at every exit');
 assert.equal(frostfallRewardMultiplierForBoss(frostStart.graph,choices[2]),FROSTFALL_ENDURANCE_DEPTH_REWARDS[stage-1]);
}
assert.equal(frostfallRewardMultiplierForBoss(frostStart.graph,frostStart.graph.nodes.find(node=>node.nodeId==='boss')!),FROSTFALL_ENDURANCE_DEPTH_REWARDS[5]);
assert.throws(()=>frostfallRewardMultiplierForBoss(frostStart.graph,frostStart.graph.nodes.find(node=>node.nodeId==='d7-c0')!),/invalid_frostfall_boss_exit/);
// All five Frostfall tiers must preserve a strictly increasing, bounded
// boss-exit payout. A later checkpoint must never mint a worse base reward.
const frostExitDepths=[8,15,22,29,36,43] as const;
for(let tier=1;tier<=5;tier++){
 const tierBase=eventTierRewardMarks(frostfall,tier);
 let previous=0;
 for(const [index,depth] of frostExitDepths.entries()){
  const exit=depth===43?frostStart.graph.nodes.find(node=>node.nodeId==='boss')!:frostStart.graph.nodes.find(node=>node.nodeId==='d'+depth+'-c2')!;
  const multiplier=frostfallRewardMultiplierForBoss(frostStart.graph,exit);
  const payout=Math.round(tierBase*multiplier);
  assert.ok(payout>previous,'Frostfall tier '+tier+' checkpoint '+depth+' must improve base tokens');
  assert.ok(payout<=Math.round(tierBase*1.52),'Frostfall depth cap must remain 1.52x');
  assert.equal(multiplier,FROSTFALL_ENDURANCE_DEPTH_REWARDS[index]);
  previous=payout;
 }
}
const checkpointFrostBoss=frostStart.graph.nodes.find(node=>node.nodeId==='d8-c2')!;
const counterfeitFrostBoss={...checkpointFrostBoss,contentId:'EVENT_VEILBREAK_BOSS_FAKE'};
assert.throws(()=>frostfallRewardMultiplierForBoss(frostStart.graph,counterfeitFrostBoss),/invalid_frostfall_boss_exit/);
const outOfRangeFrostBoss={...checkpointFrostBoss,depth:9};
assert.throws(()=>frostfallRewardMultiplierForBoss(frostStart.graph,outOfRangeFrostBoss),/invalid_frostfall_boss_depth/);
const fabricatedFrostBoss={...checkpointFrostBoss,nodeId:'fabricated-reward-exit'};
assert.throws(()=>frostfallRewardMultiplierForBoss(frostStart.graph,fabricatedFrostBoss),/invalid_frostfall_boss_exit/,'forged non-graph exit cannot mint rewards');
const mismatchedFrostBoss={...checkpointFrostBoss,nodeId:'d15-c2'};
assert.throws(()=>frostfallRewardMultiplierForBoss(frostStart.graph,mismatchedFrostBoss),/invalid_frostfall_boss_exit/,'graph node identity cannot be relabeled to an earlier checkpoint');

let frostRun=frostStart;
for(let d=1;d<=7;d++){
 const options=frostRun.graph.nodes.find(node=>node.nodeId===frostRun.currentNodeId)!.nextNodeIds;
 const chosen=options.map(id=>frostRun.graph.nodes.find(node=>node.nodeId===id)!).find(node=>node.kind==='battle')!;
 frostRun=frostEnduranceService.choose({runId:frostRun.id,accountId:'a',optionNodeId:chosen.nodeId,requestId:'frost-endurance-choice-'+d});
 assert.equal(frostRun.phase,'awaiting_choice','first seven seasonal rooms should remain playable');
}
const frostExit=frostRun.graph.nodes.find(node=>node.nodeId==='d8-c2')!;
assert.equal(frostExit.kind,'boss');
const frostBefore=eventMechanicProjection(frostRun),frostObjective=eventObjectiveProjection(frostRun);
const frostCompleted=frostEnduranceService.choose({runId:frostRun.id,accountId:'a',optionNodeId:frostExit.nodeId,requestId:'frost-endurance-early-exit'});
assert.equal(frostCompleted.phase,'completed');
assert.equal(frostCompleted.rewardMarks,eventTierRewardMarks(frostfall,1)+frostBefore.rewardBonus+frostObjective.rewardBonus);
assert.equal(frostEnduranceService.claimReward({runId:frostCompleted.id,accountId:'a',requestId:'frost-endurance-claim',nowMs:now}).marks,frostCompleted.rewardMarks);
const practiceService=new EventExpeditionService(new MemoryEventRunRepository(),'frostfall-practice-endurance');
let practiceRun=practiceService.start({requestId:'frost-practice-start',runId:'frost-practice-run',accountId:'a',eventId:frostfall.id,practiceOnly:true,activeLiveEventId:'EVT_ANNUAL_012_2026',members,players,nowMs:now});
assert.equal(practiceRun.practiceOnly,true,'practice-only entitlement is frozen on the run');
for(let depth=1;depth<=7;depth++){
 const current=practiceRun.graph.nodes.find(node=>node.nodeId===practiceRun.currentNodeId)!;
 const selected=current.nextNodeIds.map(id=>practiceRun.graph.nodes.find(node=>node.nodeId===id)!).find(node=>node.kind==='battle')!;
 practiceRun=practiceService.choose({runId:practiceRun.id,accountId:'a',optionNodeId:selected.nodeId,requestId:'frost-practice-step-'+depth});
 assert.equal(practiceRun.phase,'awaiting_choice');
}
practiceRun=practiceService.choose({runId:practiceRun.id,accountId:'a',optionNodeId:'d8-c2',requestId:'frost-practice-exit'});
assert.equal(practiceRun.phase,'completed');
assert.equal(practiceRun.rewardMarks,0,'no event currency is generated after both rewarded clears');
assert.equal(practiceRun.settlement,'claimed','practice completion never creates an unclaimable pending reward');
assert.throws(()=>practiceService.claimReward({runId:practiceRun.id,accountId:'a',requestId:'frost-practice-claim',nowMs:now}),/event_reward_not_ready/);


// Older six-room Frostfall runs are persisted with event-route-v5. They must
// remain resolvable after new 42-room runs use the endurance generator.
const frostLegacyRepository=new MemoryEventRunRepository();
const frostLegacyService=new EventExpeditionService(frostLegacyRepository,'frostfall-saved-v5-secret');
const frostLegacyStarted=frostLegacyService.start({
 requestId:'frostfall-saved-v5-start',runId:'frostfall-saved-v5-run',accountId:'a',
 eventId:frostfall.id,tier:1,activeLiveEventId:'EVT_ANNUAL_012_2026',members,players,nowMs:now
});
const oldNodes=frostLegacyStarted.graph.nodes.filter(node=>node.nodeId==='entry'||node.depth>=1&&node.depth<=6)
 .map(node=>node.depth===6?{...node,nextNodeIds:['boss']}:node);
const oldBoss={...frostLegacyStarted.graph.nodes.find(node=>node.nodeId==='boss')!,depth:7};
const frostLegacySaved={...frostLegacyStarted,graph:{
 ...frostLegacyStarted.graph,generatorVersion:'event-route-v5',contentVersion:'event-v5',
 balanceVersion:'event-balance-v5',preBossNodeCount:6,nodes:[...oldNodes,oldBoss]
}};
frostLegacyRepository.save(frostLegacySaved);
let legacyContinue=frostLegacyRepository.get(frostLegacySaved.id)!;
for(let depth=1;depth<=6;depth++){
 const current=legacyContinue.graph.nodes.find(node=>node.nodeId===legacyContinue.currentNodeId)!;
 const options=current.nextNodeIds.map(id=>legacyContinue.graph.nodes.find(node=>node.nodeId===id)!);
 const target=options.find(node=>node.kind==='battle')??options[0];
 legacyContinue=frostLegacyService.choose({runId:legacyContinue.id,accountId:'a',optionNodeId:target.nodeId,requestId:'legacy-choice-'+depth});
 assert.equal(legacyContinue.phase,'awaiting_choice','legacy saved Frostfall route should not unexpectedly fail at depth '+depth);
}
const legacyWarmth=eventMechanicProjection(legacyContinue),legacyObjective=eventObjectiveProjection(legacyContinue);
legacyContinue=frostLegacyService.choose({runId:legacyContinue.id,accountId:'a',optionNodeId:'boss',requestId:'legacy-boss-clear'});
assert.equal(legacyContinue.phase,'completed','legacy six-room Frostfall final boss must remain playable');
assert.equal(legacyContinue.graph.generatorVersion,'event-route-v5','saved generator version must remain stable');
assert.equal(legacyContinue.rewardMarks,eventTierRewardMarks(frostfall,1)+legacyWarmth.rewardBonus+legacyObjective.rewardBonus,
 'legacy saved rewards must not receive a new 42-room depth multiplier');
assert.equal(frostLegacyService.claimReward({runId:legacyContinue.id,accountId:'a',requestId:'legacy-reward',nowMs:now}).marks,legacyContinue.rewardMarks);

const veil=EVENT_EXPEDITIONS.find(item=>item.id==='EVENT_VEILBREAK_GLOAM_BREACH')!,veilService=new EventExpeditionService(new MemoryEventRunRepository(),'veil-telegraph-secret');
const veilRun=veilService.start({requestId:'veil-telegraph-request',runId:'veil-telegraph-run',accountId:'a',eventId:veil.id,activeLiveEventId:'EVT_ANNUAL_010_2026',members,players,nowMs:now});
assert.equal(veil.minLevel,15);
assert.deepEqual(veil.levelScaling,{minLevel:15,maxLevel:35});
assert.equal(veilRun.syncLevel,35,'high-level lobbies should clamp to the Veilbreak bracket');
const mixedPlayers=players.map((player,index)=>({...player,level:[15,20,25,35][index]}));
const mixedVeil=veilService.start({requestId:'veil-mixed-request',runId:'veil-mixed-run',accountId:'a',eventId:veil.id,activeLiveEventId:'EVT_ANNUAL_010_2026',members,players:mixedPlayers,nowMs:now});
assert.equal(mixedVeil.syncLevel,24,'Veilbreak should sync to the lobby average within its bracket');
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
const clearRepo=new MemoryEventRunRepository(),clearService=new EventExpeditionService(clearRepo,'daily-clear-secret');
for(let index=0;index<3;index++)clearRepo.save({...run,id:`daily-clear-run-${index}`,requestId:`daily-clear-request-${index}`,settlement:'pending',phase:'completed',rewardMarks:1});
assert.equal(clearService.claimReward({runId:'daily-clear-run-0',accountId:'a',requestId:'daily-clear-0',nowMs:now}).marks,1);
assert.equal(clearService.claimReward({runId:'daily-clear-run-1',accountId:'a',requestId:'daily-clear-1',nowMs:now}).marks,1);
assert.throws(()=>clearService.claimReward({runId:'daily-clear-run-2',accountId:'a',requestId:'daily-clear-2',nowMs:now}),/event_daily_clear_limit/);
// Reward replay receipts are run-scoped: a client reusing a request ID on a
// different successful event run must receive that run's independently settled amount.
const sharedClaimRepo=new MemoryEventRunRepository();
const sharedClaimService=new EventExpeditionService(sharedClaimRepo,'run-scope-claim-replay');
for(const [index,marks] of [11,22].entries())sharedClaimRepo.save({...run,id:'scope-run-'+index,requestId:'scope-start-'+index,settlement:'pending',phase:'completed',rewardMarks:marks});
const firstShared=sharedClaimService.claimReward({runId:'scope-run-0',accountId:'a',requestId:'same-claim-request',nowMs:now});
const secondShared=sharedClaimService.claimReward({runId:'scope-run-1',accountId:'a',requestId:'same-claim-request',nowMs:now});
assert.deepEqual([firstShared.marks,firstShared.idempotentReplay],[11,false]);
assert.deepEqual([secondShared.marks,secondShared.idempotentReplay],[22,false],'same request ID on a distinct run must not reuse an earlier reward');
assert.deepEqual(sharedClaimService.claimReward({runId:'scope-run-1',accountId:'a',requestId:'same-claim-request',nowMs:now}),{marks:22,idempotentReplay:true});

// UTC midnight resets the daily *claim* cap, not the account identity or tier.
assert.throws(()=>clearService.claimReward({runId:'daily-clear-run-2',accountId:'a',requestId:'next-day-check',nowMs:now+86_399_000}),/event_daily_clear_limit/);
assert.equal(clearService.claimReward({runId:'daily-clear-run-2',accountId:'a',requestId:'next-day-check',nowMs:now+86_400_000}).marks,1,'new UTC day must admit a fresh rewarded claim');

console.log('event service tests passed');
