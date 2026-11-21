import {strict as assert} from 'node:assert';
import {simulateCombat} from '../../engine';
import type {CombatInput,CombatantDefinition,CombatRole,CombatV2Resource} from '../../types';
import {CLASS_ROLES_V2} from '../build-contract';
import {ROOM_BOON_CHOICES} from '../../../coop/room-boon-choices';
import {
 DUNGEON_REWARDS_V2,DUNGEON_REWARD_V2_TOTALS,DUNGEON_REWARD_V2_POLICY,
 compileDraftDungeonRewardCombatV2,simulateDraftDungeonRewardCombatV2,
 type VerifiedDungeonRewardSnapshotV2,type DungeonRewardReceiptV2,
} from '../dungeon-rewards-v2';
import {
 previewDungeonRewardOffersV2,candidateDungeonRewardReceiptV2,
} from '../dungeon-reward-offers-v2';

const currentBoons=ROOM_BOON_CHOICES.filter(item=>item.id!=='ROOM_BOON_SUPPLY').map(item=>item.id);
// This stacked hidden branch predates the current 1.0.x artifact module.
// Pin the eight audited mainline IDs without copying live dungeon runtime.
const currentArtifacts=[
 'RELIC_EMBER_HEART','RELIC_IRON_BARK','RELIC_QUICK_SILVER','RELIC_EAGLE_EYE',
 'RELIC_MOON_WELL','RELIC_HUNTER_MARK','RELIC_BOSS_WARD','RELIC_PARTY_OATH',
];
assert.deepEqual(DUNGEON_REWARD_V2_TOTALS,{boons:16,artifacts:14,executable:6,pending:3});
assert.equal(new Set(DUNGEON_REWARDS_V2.map(item=>item.id)).size,30);
assert.ok(currentBoons.every(id=>DUNGEON_REWARDS_V2.some(row=>row.id===id&&row.type==='boon')));
assert.ok(currentArtifacts.every(id=>DUNGEON_REWARDS_V2.some(row=>row.id===id&&row.type==='artifact')));
assert.ok(DUNGEON_REWARDS_V2.every(row=>row.maxStacks<=3&&
 (row.stage==='needs_engine_hook'||row.stage==='engine_hook'?
  Boolean(row.mechanic&&row.trigger&&row.cooldownMs&&row.cooldownMs>0):true)));
const stats=(hp=3500,attack=180)=>({
 maxHp:hp,attackPower:attack,healingPower:180,defense:80,
 accuracy:100000,evasion:0,critChance:.05,critMultiplier:1.5,haste:0,
});
const players=[
 ['IRONWARDEN','tank','guard'],['BASTION','tank','barrier'],
 ['DREADGUARD','tank','dread'],['WAYFINDER','damage','focus'],
 ['RAVAGER','damage','fury'],['HEXWEAVER','damage','threads'],
 ['KNIFE_DANCER','damage','rhythm'],['DAWNKEEPER','support','radiance'],
 ['STONECALLER','support','resonance'],
] as const satisfies readonly (readonly [string,CombatRole,CombatV2Resource])[];
assert.deepEqual(new Set(players.map(x=>x[0])),new Set(Object.keys(CLASS_ROLES_V2)));
for(const [id,role] of players)assert.equal(CLASS_ROLES_V2[id],role);
const regionalBosses=[
 'BOSS_EXP_ROOT','BOSS_EXP_BELL','BOSS_EXP_SOLAR',
 'BOSS_EXP_SPHINX','BOSS_EXP_BELLBEAST','BOSS_EXP_CANTOR',
];
const player=(cls:string,role:CombatRole,resource:CombatV2Resource):CombatantDefinition=>({
 id:'QA_'+cls,name:cls,team:'players',role,classId:cls,level:50,
 stats:stats(),basicAttackMs:1800,basicAttackCoeff:1,abilities:[],
 tags:['combat-v2','qa-only'],combatV2:{version:2,resource,specializationId:'QA'},
});
const enemy=(id:string,boss=true):CombatantDefinition=>({
 id,name:id,team:'enemies',role:'enemy',level:50,boss,
 stats:stats(100000,130),basicAttackMs:2600,basicAttackCoeff:1,abilities:[],
 tags:boss?['regional-boss']:['encounter:elite'],
});
const verified=()=>true; // Synthetic local harness; never a persisted DB verifier.
const denied=()=>false;
function snapshot(input:CombatInput,receipts:readonly DungeonRewardReceiptV2[]=[]):
 VerifiedDungeonRewardSnapshotV2{
 return {source:'server-persisted-dungeon-v2',policy:DUNGEON_REWARD_V2_POLICY,
  runId:'QA_RUN_'+input.seed,accountId:'QA_ACCOUNT',characterId:'QA_CHAR',
  actorId:input.players[0].id,revision:1,seed:input.seed,
  enduranceRouteVersion:2,mode:'solo',receipts};
}
const receipt=(id:string,depth:number,room:'shrine'|'forge'|'echo'|'treasure'|'secret'='shrine'):
 DungeonRewardReceiptV2=>({id,depth,nodeId:'ROOM_'+depth,room});
const base:CombatInput={seed:'QA_BASE',players:[player(...players[0])],
 enemies:[enemy('BOSS_EXP_ROOT')],maxDurationMs:5000};
const sourceSnapshot=snapshot(base);
const firstRoom={nodeId:'ROOM_1',depth:1,room:'shrine' as const};
const firstOffer=previewDungeonRewardOffersV2(base,sourceSnapshot,firstRoom,
 'PRIVATE_QA_SECRET_16CHARS',verified);
assert.equal(firstOffer.length,3);
assert.equal(new Set(firstOffer.map(x=>x.id)).size,3);
assert.ok(firstOffer.every(x=>x.type==='boon'&&(x.stage==='stat'||x.stage==='room_only')));
assert.deepEqual(previewDungeonRewardOffersV2(base,sourceSnapshot,firstRoom,
 'PRIVATE_QA_SECRET_16CHARS',verified),firstOffer);
assert.deepEqual(candidateDungeonRewardReceiptV2(base,sourceSnapshot,firstRoom,
 firstOffer[0].id,'PRIVATE_QA_SECRET_16CHARS',verified),
 {id:firstOffer[0].id,nodeId:'ROOM_1',depth:1,room:'shrine'});
assert.throws(()=>candidateDungeonRewardReceiptV2(base,sourceSnapshot,firstRoom,
 'ROOM_BOON_BLOODTHIRST','PRIVATE_QA_SECRET_16CHARS',verified),/selection_was_not_offered/);
assert.throws(()=>previewDungeonRewardOffersV2(base,sourceSnapshot,firstRoom,
 'SECRET',verified),/server_secret/);
assert.throws(()=>previewDungeonRewardOffersV2(base,sourceSnapshot,firstRoom,
 'PRIVATE_QA_SECRET_16CHARS',denied),/persisted_run_ledger_not_verified/);
const artRoom={nodeId:'ROOM_2',depth:2,room:'treasure' as const};
const artOffer=previewDungeonRewardOffersV2(base,sourceSnapshot,artRoom,
 'PRIVATE_QA_SECRET_16CHARS',verified);
assert.equal(artOffer.length,3);
assert.ok(artOffer.every(x=>x.type==='artifact'&&x.stage==='stat'));
assert.ok(!artOffer.some(x=>x.id==='RELIC_DAWN_RELIQUARY'),
 'A support-only artifact should never be offered to a tank');
const family=(id:string)=>{
 const row=DUNGEON_REWARDS_V2.find(x=>x.id===id)!;
 if(row.id==='ROOM_BOON_BULWARK')return 'defense';
 if(row.stage==='room_only')return 'utility';
 if(row.stat?.heal)return 'healing';
 if(row.stat?.attack||row.stat?.crit)return 'offense';
 if(row.stat?.defense)return 'defense';
 if(row.stat?.haste)return 'tempo';
 return 'other';
};
assert.equal(new Set(firstOffer.map(x=>family(x.id))).size,3,
 'Boon offer should contain different playstyles when available');

// QA actual engine: 6 regional boss identities x 9 role/class labels x two reward
// states, using synthetic level/stat budgets. NOT canonical boss V2 authored kits.
let simulated=0;
for(const bossId of regionalBosses){
 for(const [cls,role,resource] of players){
  const input:CombatInput={seed:'QA_'+cls+'_'+bossId,players:[player(cls,role,resource)],
   enemies:[enemy(bossId)],maxDurationMs:5000};
  const s=snapshot(input,[receipt('ROOM_BOON_STRIKE',1),
   receipt('RELIC_EMBER_HEART',2,'treasure'),receipt('ROOM_BOON_BULWARK',3)]);
  const pre=compileDraftDungeonRewardCombatV2(input,s,verified);
  assert.equal(pre.input.players[0].stats.attackPower,input.players[0].stats.attackPower*1.10);
  assert.equal(pre.input.players[0].stats.defense,input.players[0].stats.defense*
   (role==='tank'?1.06:1.025));
  const a=simulateDraftDungeonRewardCombatV2(input,s,verified);
  const b=simulateDraftDungeonRewardCombatV2(input,s,verified);
  assert.deepEqual(a,b,'Same seed and persisted receipts must replay exactly');
  assert.deepEqual(input.players[0].stats,stats(),'No mutation of verified actor snapshot');
  assert.ok(a.events.some(x=>x.type==='damage'),'Real engine must execute original attacks');
  assert.ok(a.events.every(x=>x.type!=='equipment_trait_trigger'),
   'Standalone stat preview must not fake an executable reactive proc');
  simulated+=2;
 }
}
// The old engine must remain exactly unchanged, byte-for-byte in its result,
// when no hidden reward path is invoked.
const old1=simulateCombat(base);
const preview=compileDraftDungeonRewardCombatV2(base,sourceSnapshot,verified);
assert.notEqual(preview.input,base);
const old2=simulateCombat(base);
assert.deepEqual(old1,old2,'Current combat must remain isolated');

// Conditional artifacts and roles must never leak into unrelated encounters.
const boosted=snapshot(base,[receipt('RELIC_BOSS_WARD',1,'treasure')]);
assert.equal(compileDraftDungeonRewardCombatV2(base,boosted,verified).
 input.players[0].stats.defense,stats().defense*1.08);
const normal:CombatInput={...base,enemies:[enemy('NORMAL_ENEMY',false)]};
assert.equal(compileDraftDungeonRewardCombatV2(normal,boosted,verified).
 input.players[0].stats.defense,stats().defense);
const healer:CombatInput={...base,players:[player('DAWNKEEPER','support','radiance')]};
const healerSnap=snapshot(healer,[receipt('RELIC_DAWN_RELIQUARY',1,'treasure')]);
assert.equal(compileDraftDungeonRewardCombatV2(healer,healerSnap,verified).
 input.players[0].stats.healingPower,180*1.06);
const dps:CombatInput={...base,players:[player('WAYFINDER','damage','focus')]};
const dpsSnap=snapshot(dps,[receipt('RELIC_DAWN_RELIQUARY',1,'treasure')]);
assert.equal(compileDraftDungeonRewardCombatV2(dps,dpsSnap,verified).
 input.players[0].stats.healingPower,180);
assert.ok(!previewDungeonRewardOffersV2(dps,snapshot(dps),artRoom,
 'PRIVATE_QA_SECRET_16CHARS',verified).some(x=>x.id==='RELIC_PARTY_OATH'),
 'Damage characters must not be offered tank/support-only artifacts');

// Hard failures: unimplemented reactive hooks, client forged choices, stale
// player state, spoofed account/actor/seed and duplicate room receipts.
for(const row of DUNGEON_REWARDS_V2.filter(x=>x.stage==='needs_engine_hook'||x.stage==='engine_hook')){
 const room=row.type==='boon'?'shrine':'treasure';
 assert.throws(()=>compileDraftDungeonRewardCombatV2(base,
  snapshot(base,[receipt(row.id,1,room)]),verified),/unimplemented_proc_/);
}
assert.throws(()=>compileDraftDungeonRewardCombatV2(base,sourceSnapshot,denied),
 /persisted_run_ledger_not_verified/);
assert.throws(()=>compileDraftDungeonRewardCombatV2(base,
 {...sourceSnapshot,actorId:'OTHER'},verified),/fresh_v2_solo_encounter/);
assert.throws(()=>compileDraftDungeonRewardCombatV2(base,
 {...sourceSnapshot,mode:'live'},verified),/invalid_snapshot_or_unverified_live/);
assert.throws(()=>compileDraftDungeonRewardCombatV2(base,
 {...sourceSnapshot,seed:'SPOOFED'},verified),/invalid_snapshot_or_unverified_live/);
assert.throws(()=>compileDraftDungeonRewardCombatV2(base,
 snapshot(base,[receipt('RELIC_IRON_BARK',1)]),verified),/forged_or_duplicate/);
assert.throws(()=>compileDraftDungeonRewardCombatV2(base,
 snapshot(base,[receipt('ROOM_BOON_STRIKE',1),receipt('ROOM_BOON_WARD',1)]),verified),
 /forged_or_duplicate/);
assert.throws(()=>compileDraftDungeonRewardCombatV2(base,
 snapshot(base,[receipt('ROOM_BOON_STRIKE',1),receipt('ROOM_BOON_STRIKE',2),
  receipt('ROOM_BOON_STRIKE',3),receipt('ROOM_BOON_STRIKE',4)]),verified),
 /stack_cap/);
assert.throws(()=>compileDraftDungeonRewardCombatV2(base,
 snapshot(base,[receipt('ROOM_BOON_STRIKE',1),receipt('ROOM_BOON_STRIKE',2),
  receipt('ROOM_BOON_STRIKE',3),receipt('RELIC_EMBER_HEART',4,'treasure'),
  receipt('RELIC_EMBER_HEART',5,'treasure'),receipt('RELIC_ASHEN_SIGIL',6,'treasure'),
  receipt('RELIC_ASHEN_SIGIL',7,'treasure'),receipt('ROOM_BOON_BATTLE_TRANCE',8),
  receipt('ROOM_BOON_BATTLE_TRANCE',9)]),verified),/budget_exceeded/);
assert.throws(()=>compileDraftDungeonRewardCombatV2({...base,
 initialPlayerState:{[base.players[0].id]:{hp:100,downed:false,
  cooldownRemainingMs:{},basicAttackRemainingMs:0}}},sourceSnapshot,verified),
 /fresh_v2_solo_encounter/);
console.log('PASS: hidden 16 boon / 14 artifact catalogue, 3-offer deterministic draft, '+
 simulated+' seeded synthetic 6-boss x 9-class combat previews, source/stack/cap/proc/legacy gates');
