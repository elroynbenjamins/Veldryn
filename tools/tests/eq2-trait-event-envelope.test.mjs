import test from 'node:test';
import assert from 'node:assert/strict';
import {
 loadReviewContract,directHitReview,validateSampleRolls,validateSampleTraitSelection,
 retaliationReview,swordDanceReview,echoingStrikeReview,healingEchoReview
} from '../eq2-trait-event-model.mjs';
import {runReferenceMatrix,simulateReferenceEncounter,CLASS_ROLES,ENEMY_TAGS} from '../eq2-trait-balance-matrix.mjs';
import {analyzeTraitTriggerReadiness} from '../eq2-trait-trigger-readiness.mjs';
const c=loadReviewContract(),trait=id=>c.traits.find(t=>t.id===id);
const reflectEvent=(changes={})=>({
 timestampMs:1000,targetId:'ENEMY_A',source:'enemy_direct_hit_post_shield_hp_loss',
 actualHpLost:100,defenderHpAfter:900,defenderMaxHp:1000,targetMaxHp:10000,
 regionalBoss:false,reflectPercent:8,thornboundActive:false,...changes
});
test('basic and ability percent rolls apply only to their eligible direct hit families',()=>{
 assert.equal(directHitReview({origin:'player_direct_basic',damage:100,basicBonus:5,abilityBonus:30}),105);
 assert.equal(directHitReview({origin:'player_direct_class_skill',damage:100,basicBonus:30,abilityBonus:5}),105);
 for(const origin of ['dot_tick','gem_secondary','trait_secondary','retaliation','companion_hit']){
  assert.equal(directHitReview({origin,damage:100,basicBonus:70,abilityBonus:80}),100);
 }
 assert.throws(()=>directHitReview({origin:'player_direct_basic',damage:Infinity,basicBonus:5}),/bad_direct_hit/);
});
test('trusted-style sample copy audit refuses slot spoofing, invalid roll, extra 11th item',()=>{
 const item={instanceId:'GOOD',slot:'weapon',rolls:[{id:'basic_attack_damage_pct',percent:1.2}]};
 assert.equal(validateSampleRolls(c,1,[item]).basic_attack_damage_pct,1.2);
 assert.throws(()=>validateSampleRolls(c,1,[item,{...item}]),/duplicate_item_copy/);
 assert.throws(()=>validateSampleRolls(c,1,[{...item,slot:'chest'}]),/ineligible_roll/);
 assert.throws(()=>validateSampleRolls(c,1,[{...item,rolls:[{id:'basic_attack_damage_pct',percent:999}]}]),/forged_roll_strength/);
 assert.throws(()=>validateSampleRolls(c,1,Array.from({length:11},(_,i)=>({...item,instanceId:''+i}))),/bad_sample_loadout/);
});
test('2 selected traits must be real equipped copies of correct character/source; duplicates blocked',()=>{
 const equipped=[
  {instanceId:'a',ownerCharacterId:'CHAR',equipped:true,traitId:'mending_echo',source:'party_event_chest'},
  {instanceId:'b',ownerCharacterId:'CHAR',equipped:true,traitId:'restorative_bloom',source:'dungeon_boss_chest'},
  {instanceId:'c',ownerCharacterId:'CHAR',equipped:true,traitId:'worldwalker',source:'world_boss_chest'},
 ];
 assert.equal(validateSampleTraitSelection(c,'CHAR',equipped,['a','b']).length,2);
 assert.throws(()=>validateSampleTraitSelection(c,'OTHER',equipped,['a']),/not_worn_or_owned/);
 assert.throws(()=>validateSampleTraitSelection(c,'CHAR',equipped,['a','b','c']),/too_many_selected/);
 assert.throws(()=>validateSampleTraitSelection(c,'CHAR',equipped,['a','a']),/duplicate_selection/);
 assert.throws(()=>validateSampleTraitSelection(c,'CHAR',equipped,['c']),/bad_trait_source_or_duplicate/);
 assert.throws(()=>validateSampleTraitSelection(c,'CHAR',[{...equipped[0],source:'world_boss_chest'}],['a']),/bad_trait_source_or_duplicate/);
});
test('rolling 5-second retaliation limit cannot be defeated at fixed-bucket boundaries',()=>{
 let state={history:[],lastRiposteMs:null,lastEventMs:-1},total=0;
 for(const t of [1000,2000,3000,4000,4999]){
  const result=retaliationReview(c,reflectEvent({timestampMs:t}),state);
  total+=result.amount;state=result.next;
 }
 assert.equal(total,20); // 0.2% of 10,000 HP in any rolling 5 seconds.
 const boundary=retaliationReview(c,reflectEvent({timestampMs:5000}),state);
 assert.equal(boundary.amount,0); // first hit at 1000 is still inside [0,5000].
 const expiry=retaliationReview(c,reflectEvent({timestampMs:6000}),boundary.next);
 assert.equal(expiry.amount,8); // first recorded hit expires at exactly 5s.
 assert.throws(()=>retaliationReview(c,reflectEvent({timestampMs:4000}),expiry.next),/bad_retaliation_time_or_target/);
});
test('reflection uses actual HP lost; boss telegraphs, shields, DoTs, death and reflected hits do not retaliate',()=>{
 for(const change of [
  {source:'boss_phase_telegraph'},{source:'dot_tick'},{source:'trait_secondary'},
  {source:'retaliation'},{source:'environment'},{source:'gem_secondary'},
  {actualHpLost:0},{defenderHpAfter:0}
 ]){
  assert.equal(retaliationReview(c,reflectEvent(change)).amount,0);
 }
 const original=reflectEvent({reflectPercent:5,thornboundActive:true});
 const a=retaliationReview(c,original);
 assert.equal(a.amount,13); // 5% affix + 8% once-ready riposte, below per-hit 15.
 assert.equal(a.fromAffix,5);
 assert.equal(a.fromTrait,8);
 assert.equal(a.tag,'eq2_qa_no_secondary_proc');
 assert.equal(a.next.lastRiposteMs,1000);
 assert.equal(retaliationReview(c,{...original,timestampMs:2000},a.next).fromTrait,0);
 assert.equal(original.timestampMs,1000);
});
test('regional boss retaliation window is stricter than normal and shared across trait and affix',()=>{
 const event=reflectEvent({targetMaxHp:2000,regionalBoss:true,reflectPercent:8,thornboundActive:true});
 const first=retaliationReview(c,event);
 assert.equal(first.amount,2); // 0.1% boss HP = 2 / 5 sec, not affix+trait separately.
 const second=retaliationReview(c,{...event,timestampMs:2000},first.next);
 assert.equal(second.amount,0);
 assert.equal(second.fromTrait,0);
});
test('sword dance needs three consecutive successful basic hits on the same enemy',()=>{
 let state,bonuses=[];
 for(const t of [1000,2000,3000,4000]){
  const hit=swordDanceReview(trait('sword_dance'),
   {origin:'player_direct_basic',hit:true,targetId:'ONE',timestampMs:t,damage:100},state);
  state=hit.next;bonuses.push(hit.bonus);
 }
 assert.deepEqual(bonuses,[0,0,5,0]);
 const swap=swordDanceReview(trait('sword_dance'),
  {origin:'player_direct_basic',hit:true,targetId:'TWO',timestampMs:5000,damage:100},state);
 assert.equal(swap.bonus,0);
 const proc=swordDanceReview(trait('sword_dance'),
  {origin:'trait_secondary',hit:true,targetId:'TWO',timestampMs:6000,damage:100},swap.next);
 assert.equal(proc.bonus,0);
});
test('echo skill and support secondary healing do not recursively activate from secondary events',()=>{
 const echo=trait('echoing_strike');
 const ability={origin:'player_direct_class_skill',hit:true,timestampMs:1000,damage:1000,attackPower:100};
 const a=echoingStrikeReview(echo,ability);
 assert.equal(a.bonus,20); // bounded by 20% of Attack Power, not an uncapped echo.
 assert.equal(echoingStrikeReview(echo,{...ability,timestampMs:2000},a.lastProcMs).bonus,0);
 assert.equal(echoingStrikeReview(echo,{...ability,origin:'trait_secondary',timestampMs:50000}).bonus,0);
 const heal={origin:'player_direct_class_heal',timestampMs:1000,effectiveHeal:200,otherAllyMissingHp:100};
 assert.equal(healingEchoReview(trait('mending_echo'),heal).bonus,16);
 assert.equal(healingEchoReview(trait('restorative_bloom'),heal).bonus,10);
 assert.equal(healingEchoReview(trait('mending_echo'),{...heal,origin:'regeneration_tick'}).bonus,0);
});
test('synthetic 9-class, 2-spec, T1–T4, 8-archetype, 3-encounter, 2-duration matrix is deterministic',()=>{
 const first=runReferenceMatrix(c),second=runReferenceMatrix(c);
 assert.equal(first.count,9*2*4*8*3*2*3);
 assert.equal(first.classes,Object.keys(CLASS_ROLES).length);
 assert.equal(first.enemyTags,ENEMY_TAGS.length);
 assert.deepEqual(first,second);
 assert.equal(first.approvedForProduction,false);
 assert.equal(first.usesActualCombatEngine,false);
 assert.equal(first.usesPlayerTelemetry,false);
 assert.ok(first.rows.every(r=>Number.isFinite(r.totalDamage)&&r.totalDamage>=0&&r.procs<100));
});
test('benchmark pairings have bounded improvement without claiming class balance approval',()=>{
 const base={classId:'WAYFINDER',specIndex:0,tier:4,enemyTag:'guardian',kind:'boss',seconds:60};
 const plain=simulateReferenceEncounter(c,{...base,profile:'baseline'});
 const basic=simulateReferenceEncounter(c,{...base,profile:'basic_plus_sword_dance'});
 const skill=simulateReferenceEncounter(c,{...base,profile:'ability_plus_echo'});
 assert.ok(basic.basic>plain.basic&&basic.trait>0&&basic.skill===plain.skill);
 assert.ok(skill.skill>plain.skill&&skill.trait>0&&skill.basic===plain.basic);
 assert.ok(basic.totalDamage/plain.totalDamage<1.4&&skill.totalDamage/plain.totalDamage<1.4);
 const tankBase={...base,classId:'IRONWARDEN',profile:'baseline'};
 const tank=simulateReferenceEncounter(c,tankBase);
 const thorns=simulateReferenceEncounter(c,{...tankBase,profile:'reflect_plus_riposte'});
 assert.equal(tank.reflect,0);
 assert.ok(thorns.reflect>0);
 assert.ok(thorns.reflect/base.tier<200);
 const supportBase={...base,classId:'DAWNKEEPER',profile:'baseline'};
 const healBase=simulateReferenceEncounter(c,supportBase);
 const echo=simulateReferenceEncounter(c,{...supportBase,profile:'heal_plus_echo'});
 const bloom=simulateReferenceEncounter(c,{...supportBase,profile:'heal_plus_echo_bloom'});
 assert.ok(echo.healing>healBase.healing&&bloom.healing>=echo.healing);
 assert.equal(healBase.trait,0);
});

test('all 28 traits have explicit source-owned event hook requirements, with no mounted engine claims',()=>{
 const report=analyzeTraitTriggerReadiness(c);
 assert.deepEqual(report.violations,[]);
 assert.equal(report.entries.length,28);
 assert.equal(report.distinctEventHooks,22);
 assert.deepEqual(report.roleCounts,{tank:9,damage:9,support:9,utility:1});
 assert.equal(report.allTraitsNotMounted,true);
 assert.ok(report.requiredTrustedFields.includes('boss_status_exemption'));
 assert.ok(report.requiredTrustedFields.includes('post_shield_hp_loss'));
 assert.ok(report.entries.every(entry=>entry.engineStatus==='UNIMPLEMENTED_NEEDS_NEW_RUN_SERVER_ADAPTER'));
});
test('detect unknown event triggers, leaked World Boss traits and unsafe proc configuration',()=>{
 const broken=structuredClone(c);
 broken.traits.find(t=>t.id==='echoing_strike').trigger='after_reactive_damage_from_trait';
 assert.ok(analyzeTraitTriggerReadiness(broken).violations.includes('unmapped_trigger:echoing_strike'));
 const badSource=structuredClone(c);
 badSource.traits.find(t=>t.id==='sword_dance').source=['world_boss_chest'];
 assert.ok(analyzeTraitTriggerReadiness(badSource).violations.includes('combat_trait_source_leak:sword_dance'));
 const brokenPolicy=structuredClone(c);
 brokenPolicy.traitPolicy.effectGemCanTriggerTrait=true;
 assert.ok(analyzeTraitTriggerReadiness(brokenPolicy).violations.includes('unsafe_proc_policy:effectGemCanTriggerTrait'));
});
