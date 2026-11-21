import {strict as assert} from 'node:assert';
import {simulateCombat} from '../../engine';
import type {CombatInput,CombatantDefinition} from '../../types';
import {
 DUNGEON_REWARD_V2_POLICY,compileDraftDungeonRewardCombatV2,
 type VerifiedDungeonRewardSnapshotV2,type DungeonRewardReceiptV2,
} from '../dungeon-rewards-v2';
import {
 issueDungeonRewardEngineAuthorityV2,authorizeDungeonRewardEngineV2,
 DungeonRewardRuntimeV2,type DungeonRewardEngineAuthorityV2,
} from '../dungeon-reward-engine-v2';

const player:CombatantDefinition={
 id:'P',name:'P',team:'players',role:'damage',classId:'WAYFINDER',level:50,
 stats:{maxHp:3500,attackPower:240,healingPower:70,defense:80,
  accuracy:100000,evasion:0,critChance:.75,critMultiplier:1.5,haste:0},
 basicAttackMs:1800,basicAttackCoeff:1,
 abilities:[{id:'QA_CLASS_DAMAGE',name:'Class Damage',cooldownMs:30000,castTimeMs:0,
  target:'current_target',priority:200,effects:[{kind:'damage',coeff:2,damageType:'physical'}]}],
 tags:['combat-v2'],combatV2:{version:2,resource:'focus',specializationId:'QA'},
};
const boss:CombatantDefinition={
 id:'BOSS_EXP_ROOT',name:'Rootbound QA',team:'enemies',role:'enemy',level:50,boss:true,
 stats:{maxHp:100000,attackPower:0,healingPower:0,defense:80,
  accuracy:100000,evasion:0,critChance:0,critMultiplier:1.5,haste:0},
 basicAttackMs:2600,basicAttackCoeff:1,abilities:[],tags:['combat-v2'],
};
const input:CombatInput={
 seed:'REWARD_PROC_SEEDED_QA',players:[player],enemies:[boss],maxDurationMs:8000,
};
const receipts:readonly DungeonRewardReceiptV2[]=[
 {id:'ROOM_BOON_BLOODTHIRST',nodeId:'SHRINE_1',depth:1,room:'shrine'},
 {id:'ROOM_BOON_LAST_STAND',nodeId:'FORGE_2',depth:2,room:'forge'},
 {id:'ROOM_BOON_CRIPPLING_BLOWS',nodeId:'ECHO_3',depth:3,room:'echo'},
 {id:'ROOM_BOON_BURST_WINDOW',nodeId:'SHRINE_4',depth:4,room:'shrine'},
 {id:'RELIC_TEMPORAL_ECHO',nodeId:'TREASURE_5',depth:5,room:'treasure'},
 {id:'RELIC_GLACIAL_CROWN',nodeId:'SECRET_6',depth:6,room:'secret'},
];
const snap:VerifiedDungeonRewardSnapshotV2={
 source:'server-persisted-dungeon-v2',policy:DUNGEON_REWARD_V2_POLICY,
 runId:'QA_DUNGEON_RUN',accountId:'QA_ACCOUNT',characterId:'QA_CHAR',actorId:'P',
 revision:1,seed:input.seed,mode:'solo',enduranceRouteVersion:2,receipts,
};
const verify=()=>true; // ONLY synthetic QA; real DB custody not implemented.
assert.throws(()=>compileDraftDungeonRewardCombatV2(input,snap,verify),/unimplemented_proc/,
 'Untrusted callers must never opt into a reactive reward by default');
const draft=compileDraftDungeonRewardCombatV2(input,snap,verify,true);
assert.equal(draft.applied.length,6);
assert.equal(draft.input.players[0].stats.attackPower,player.stats.attackPower,
 'Reactives must not duplicate stat-channel boosts');
const token=issueDungeonRewardEngineAuthorityV2(draft.input,snap,verify);
assert.ok(authorizeDungeonRewardEngineV2(draft.input,token));
assert.throws(()=>authorizeDungeonRewardEngineV2({...input,players:[{...player,
 stats:{...player.stats,attackPower:player.stats.attackPower+1}}]},token),
 /compiled_encounter_mismatch/,
 'Signed execution token belongs to the exact compiled actor/encounter');
assert.throws(()=>authorizeDungeonRewardEngineV2(
 {...draft.input,seed:'REPLAY_TAMPER'},token),/compiled_encounter_mismatch/);
assert.throws(()=>simulateCombat(input,undefined,undefined,
 {} as DungeonRewardEngineAuthorityV2),/not_server_issued/);
assert.throws(()=>issueDungeonRewardEngineAuthorityV2(draft.input,snap,()=>false),
 /persisted_run_ledger_not_verified/);
assert.throws(()=>issueDungeonRewardEngineAuthorityV2(draft.input,
 {...snap,mode:'live'},verify),/invalid_snapshot_or_unverified_live/);
assert.throws(()=>issueDungeonRewardEngineAuthorityV2(draft.input,
 {...snap,receipts:[...receipts,{id:'ROOM_BOON_WARDWEAVE',nodeId:'FORGE_7',depth:7,room:'forge'}]},verify),
 /unimplemented_proc_ROOM_BOON_WARDWEAVE/);

const baseline=simulateCombat(input);
const again=simulateCombat(input,undefined,undefined,undefined);
assert.deepEqual(baseline,again,'No token means the old combat result is exactly unchanged');
const first=simulateCombat(draft.input,undefined,undefined,token);
const second=simulateCombat(draft.input,undefined,undefined,token);
assert.deepEqual(first,second,'Real engine dungeon reward actions replay deterministically');
assert.deepEqual(input.players[0],player,'Source player may not be modified');
assert.equal(baseline.events.some(e=>e.type==='dungeon_reward_trigger'),false);
const reward=first.events.filter(e=>e.type==='dungeon_reward_trigger');
assert.ok(reward.some(e=>e.abilityId==='V2_DUNGEON_REWARD:ROOM_BOON_BLOODTHIRST'));
assert.ok(reward.some(e=>e.abilityId==='V2_DUNGEON_REWARD:ROOM_BOON_CRIPPLING_BLOWS'));
assert.ok(reward.some(e=>e.abilityId==='V2_DUNGEON_REWARD:ROOM_BOON_BURST_WINDOW'));
assert.ok(reward.some(e=>e.abilityId==='V2_DUNGEON_REWARD:RELIC_TEMPORAL_ECHO'));
assert.ok(reward.some(e=>e.abilityId==='V2_DUNGEON_REWARD:RELIC_GLACIAL_CROWN'));
assert.ok(reward.every(e=>e.actorId==='P'));
const bleed=first.events.filter(e=>e.type==='dot_tick'&&
 e.abilityId==='V2_DUNGEON_REWARD:ROOM_BOON_BLOODTHIRST');
assert.equal(bleed.length,3,'One crit grants one bounded, three-tick nonstacking bleed');
assert.ok(bleed.every(e=>e.detail==='no_recursive_reward_trigger'));
assert.ok(bleed.reduce((sum,e)=>sum+(e.amount??0),0)<boss.stats.maxHp*.001,
 'Bleed is below a 0.1% regional boss HP budget');
assert.equal(first.events.some(e=>e.type==='resource_gain'&&
 e.abilityId?.startsWith('V2_DUNGEON_REWARD:')),false);
assert.equal(first.events.some(e=>e.type==='equipment_trait_trigger'),false);
const echo=reward.find(e=>e.abilityId==='V2_DUNGEON_REWARD:RELIC_TEMPORAL_ECHO')!;
assert.ok((echo.amount??0)>0&&(echo.amount??0)<=boss.stats.maxHp*.0005+.01,
 'Temporal Echo is only a capped secondary, never another class skill cast');
assert.equal(first.events.filter(e=>e.type==='cast_start'&&e.abilityId==='QA_CLASS_DAMAGE').length,
 baseline.events.filter(e=>e.type==='cast_start'&&e.abilityId==='QA_CLASS_DAMAGE').length,
 'Temporal Echo cannot create additional casts');

const runtime=new DungeonRewardRuntimeV2('P',{
 ROOM_BOON_LAST_STAND:1,ROOM_BOON_BLOODTHIRST:1,
 ROOM_BOON_CRIPPLING_BLOWS:1,ROOM_BOON_BURST_WINDOW:1,
 RELIC_TEMPORAL_ECHO:2,RELIC_GLACIAL_CROWN:1,
});
const phase=runtime.afterOriginalEnemyHit({now:1000,sourceId:boss.id,targetId:'P',
 abilityId:'BOSS_PHASE',actualHpDamage:800,hpBeforePct:.52,hpAfterPct:.29,boss:true});
assert.deepEqual(phase,[],'Boss phase cannot trigger Last Stand');
const last=runtime.afterOriginalEnemyHit({now:2000,sourceId:boss.id,targetId:'P',
 abilityId:'BASIC',actualHpDamage:800,hpBeforePct:.52,hpAfterPct:.29,boss:true});
assert.equal(last.length,2);
assert.deepEqual(last.map(x=>x.tag),['defense_pct','healing_received']);
assert.ok(last.every(x=>x.durationMs===6000));
assert.deepEqual(runtime.afterOriginalEnemyHit({now:2200,sourceId:boss.id,targetId:'P',
 abilityId:'BASIC',actualHpDamage:900,hpBeforePct:.6,hpAfterPct:.25,boss:true}),[],
 'Last Stand must trigger at most once per combat');
const procs=runtime.afterOriginalDirectHit({
 now:1000,sourceId:'P',targetId:boss.id,abilityId:'QA_CLASS_DAMAGE',
 critical:true,actualHpDamage:800,attackPower:240,targetMaxHp:boss.stats.maxHp,boss:true});
assert.equal(procs.length,5,'Critical direct class skill triggers 5 distinct proc families');
assert.equal(runtime.afterOriginalDirectHit({
 now:1500,sourceId:'P',targetId:boss.id,abilityId:'QA_CLASS_DAMAGE',
 critical:true,actualHpDamage:800,attackPower:240,targetMaxHp:boss.stats.maxHp,boss:true}).length,0,
 'Per-reward internal cooldown suppresses immediate proc duplication');
assert.equal(runtime.afterOriginalDirectHit({
 now:32000,sourceId:'P',targetId:boss.id,abilityId:'V2_DUNGEON_REWARD:FORGED',
 critical:true,actualHpDamage:999,attackPower:240,targetMaxHp:boss.stats.maxHp,boss:true}).length,0,
 'Generated ability IDs cannot create new rewards');
const noThreshold=new DungeonRewardRuntimeV2('P',{ROOM_BOON_LAST_STAND:1});
assert.deepEqual(noThreshold.afterOriginalEnemyHit({now:0,sourceId:'B',targetId:'P',
 abilityId:'BASIC',actualHpDamage:250,hpBeforePct:.28,hpAfterPct:.2,boss:false}),[]);
assert.deepEqual(noThreshold.afterOriginalEnemyHit({now:100,sourceId:'B',targetId:'P',
 abilityId:'BASIC',actualHpDamage:3000,hpBeforePct:.8,hpAfterPct:0,boss:false}),[]);
// Verify Last Stand in the ACTUAL Combat 2.0 damage lifecycle, not only the
// stand-alone rule helper. Two normal boss basics cross 30% without killing.
const vulnerable:CombatantDefinition={...player,
 stats:{...player.stats,maxHp:1000,attackPower:0,defense:0,critChance:0},
 basicAttackCoeff:0,abilities:[]};
const strikingBoss:CombatantDefinition={...boss,
 stats:{...boss.stats,attackPower:400},basicAttackMs:2600};
const lastInput:CombatInput={seed:'QA_LAST_STAND_REAL_ENGINE',
 players:[vulnerable],enemies:[strikingBoss],maxDurationMs:4000};
const lastSnapshot:VerifiedDungeonRewardSnapshotV2={...snap,seed:lastInput.seed,
 runId:'QA_LAST_STAND_REAL_ENGINE',
 receipts:[{id:'ROOM_BOON_LAST_STAND',nodeId:'SHRINE_1',depth:1,room:'shrine'}]};
const lastToken=issueDungeonRewardEngineAuthorityV2(lastInput,lastSnapshot,verify);
const lastFight=simulateCombat(lastInput,undefined,undefined,lastToken);
const triggered=lastFight.events.filter(e=>e.type==='dungeon_reward_trigger'&&
 e.abilityId==='V2_DUNGEON_REWARD:ROOM_BOON_LAST_STAND');
assert.equal(triggered.length,2,
 'Real engine should grant exactly two defensive modifiers on 30% crossing');
assert.deepEqual(lastFight.events.filter(e=>e.type==='status_apply'&&
 e.abilityId==='V2_DUNGEON_REWARD:ROOM_BOON_LAST_STAND')
 .map(e=>e.statusTag).sort(),['defense_pct','healing_received']);
assert.deepEqual(lastFight,simulateCombat(lastInput,undefined,undefined,lastToken),
 'Threshold reaction and modifier expiry must replay deterministically');

console.log('PASS six signed Dungeon 2.0 reactive hooks, 3 nonrecursive bleed ticks, '+
 'boss phase exclusions, once-only Last Stand, bounded Echo, ICDs and legacy isolation');
