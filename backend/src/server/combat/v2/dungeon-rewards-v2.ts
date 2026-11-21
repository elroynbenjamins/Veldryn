/**
 * HIDDEN DUNGEON 2.0 DRAFT — source-owned catalog, selection receipts and a
 * QA-only combat-stat adapter. NOT imported by Q-Mode, Live, mobile or Edge.
 *
 * This catalog deliberately does not replace existing 1.0.x room rewards.
 * Percentages in effect are fractions (0.05 = 5%); crit/haste are
 * percentage-point fractions. Deferred reactive mechanics FAIL CLOSED.
 */
import {simulateCombat} from '../engine';
import type {CombatInput,CombatResult,CombatantDefinition,CombatRole} from '../types';
import {enemyV2SnapshotDigest} from './enemy-engine-authority';

export const DUNGEON_REWARD_V2_POLICY='dungeon-endurance-v2-reward-draft-1' as const;
export type DungeonRoomKindV2='shrine'|'forge'|'echo'|'treasure'|'secret';
export type DungeonRewardTriggerV2=
 'original_direct_hit'|'original_critical_hit'|'original_direct_hp_loss'|
 'original_ally_heal'|'original_shield'|'self_below_30pct'|'original_class_skill';
export type DungeonRewardMechanicV2=
 'bleed'|'last_stand'|'sunder'|'shield_link'|'burst_window'|
 'thorn_reflect'|'temporal_echo'|'soul_lantern'|'frostbind';
export interface DungeonRewardStatV2 {
 readonly attack?:number;readonly defense?:number;readonly heal?:number;
 readonly haste?:number;readonly crit?:number;
 /** Apply only to all-elite or all-boss encounter in this preview. */
 readonly enemyKind?:'elite'|'boss';
 readonly role?:'tank'|'support'|'tank_or_support';
}
export interface DungeonRewardV2 {
 readonly id:string;readonly name:string;readonly type:'boon'|'artifact';
 readonly maxStacks:1|2|3;
 readonly stage:'stat'|'room_only'|'needs_engine_hook';
 readonly stat?:DungeonRewardStatV2;
 readonly trigger?:DungeonRewardTriggerV2;
 readonly mechanic?:DungeonRewardMechanicV2;
 readonly cooldownMs?:number;
 readonly designNote?:string;
}
const boon=(id:string,name:string,stat:DungeonRewardStatV2,maxStacks:1|2|3=3):
 DungeonRewardV2=>({id,name,type:'boon',stage:'stat',stat,maxStacks});
const artifact=(id:string,name:string,stat:DungeonRewardStatV2):
 DungeonRewardV2=>({id,name,type:'artifact',stage:'stat',stat,maxStacks:2});
const room=(id:string,name:string):DungeonRewardV2=>({
 id,name,type:'boon',stage:'room_only',maxStacks:3});
const deferred=(id:string,name:string,type:'boon'|'artifact',
 mechanic:DungeonRewardMechanicV2,trigger:DungeonRewardTriggerV2,cooldownMs:number,
 designNote:string):DungeonRewardV2=>({
 id,name,type,stage:'needs_engine_hook',maxStacks:type==='artifact'?2:1,
 mechanic,trigger,cooldownMs,designNote,
});
export const DUNGEON_REWARDS_V2:readonly DungeonRewardV2[]=Object.freeze([
 // Preserve all nine currently offered 1.0.x boons by ID and broad intent.
 boon('ROOM_BOON_STRIKE','Battle Focus',{attack:.05}),
 boon('ROOM_BOON_WARD','Stalwart Guard',{defense:.05}),
 room('ROOM_BOON_RECOVERY','Second Wind'),
 boon('ROOM_BOON_FURY','Berserker Oath',{attack:.075,defense:-.025}),
 boon('ROOM_BOON_SWIFT','Quickstep',{haste:.04}),
 boon('ROOM_BOON_PRECISION','Eagle Sight',{crit:.025}),
 boon('ROOM_BOON_HARMONY','Healing Chorus',{heal:.10}),
 // Role-specific Guardian's Pact is applied using its separate rule below.
 boon('ROOM_BOON_BULWARK','Guardians Pact',{}),
 room('ROOM_BOON_RESERVE','Supplies Cache'),
 // Seven NEW proposed 2.0 boons: two simple modifiers + five reactive hooks.
 boon('ROOM_BOON_VANGUARD_STEP','Vanguard Step',{defense:.025,haste:.02},2),
 boon('ROOM_BOON_BATTLE_TRANCE','Battle Trance',{attack:.03,crit:.01},2),
 deferred('ROOM_BOON_BLOODTHIRST','Bloodthirst','boon','bleed',
  'original_critical_hit',12000,'One bounded Bleed; cannot proc from DoT, reflect, trait or gem ticks.'),
 deferred('ROOM_BOON_LAST_STAND','Last Stand','boon','last_stand',
  'self_below_30pct',45000,'Once per fight; defensive window after actual direct HP loss.'),
 deferred('ROOM_BOON_CRIPPLING_BLOWS','Crippling Blows','boon','sunder',
  'original_direct_hit',18000,'Short armor debuff, boss resistance and per-target limit.'),
 deferred('ROOM_BOON_WARDWEAVE','Wardweave','boon','shield_link',
  'original_shield',20000,'Protect another ally, no recursion on generated shields.'),
 deferred('ROOM_BOON_BURST_WINDOW','Burst Window','boon','burst_window',
  'original_class_skill',25000,'Controlled damage window after direct class skill; no proc-on-proc.'),
 // Eight pre-existing Endurance run artifacts.
 artifact('RELIC_EMBER_HEART','Ember Heart',{attack:.05}),
 artifact('RELIC_IRON_BARK','Ironbark Idol',{defense:.07}),
 artifact('RELIC_QUICK_SILVER','Quicksilver Feather',{haste:.04}),
 artifact('RELIC_EAGLE_EYE','Eagle-Eye Lens',{crit:.025}),
 artifact('RELIC_MOON_WELL','Moonwell Stone',{heal:.10}),
 artifact('RELIC_HUNTER_MARK','Hunters Sigil',{attack:.06,enemyKind:'elite'}),
 artifact('RELIC_BOSS_WARD','Ward of Ancients',{defense:.08,enemyKind:'boss'}),
 artifact('RELIC_PARTY_OATH','Oathbound Crest',{attack:.04,defense:.04,role:'tank_or_support'}),
 // Six NEW proposed 2.0 artifacts: 2 basic, 4 reactive.
 artifact('RELIC_ASHEN_SIGIL','Ashen Sigil',{attack:.03,crit:.01}),
 artifact('RELIC_DAWN_RELIQUARY','Dawn Reliquary',{heal:.06,defense:.03,role:'support'}),
 deferred('RELIC_THORNBOUND_AEGIS','Thornbound Aegis','artifact','thorn_reflect',
  'original_direct_hp_loss',15000,'Must share the EQ2 reflection 5-second enemy budget.'),
 deferred('RELIC_TEMPORAL_ECHO','Temporal Echo','artifact','temporal_echo',
  'original_class_skill',30000,'At most one secondary effect, never an extra skill cast or action.'),
 deferred('RELIC_SOUL_LANTERN','Soul Lantern','artifact','soul_lantern',
  'original_ally_heal',24000,'Bounded secondary heal on a different ally; no healing loops.'),
 deferred('RELIC_GLACIAL_CROWN','Glacial Crown','artifact','frostbind',
  'original_direct_hit',20000,'Slow on original direct hit; bosses must retain cast counterplay.'),
]);
const catalog=new Map(DUNGEON_REWARDS_V2.map(row=>[row.id,row]));
export const DUNGEON_REWARD_V2_TOTALS=Object.freeze({
 boons:DUNGEON_REWARDS_V2.filter(row=>row.type==='boon').length,
 artifacts:DUNGEON_REWARDS_V2.filter(row=>row.type==='artifact').length,
 pending:DUNGEON_REWARDS_V2.filter(row=>row.stage==='needs_engine_hook').length,
});
export interface DungeonRewardReceiptV2 {
 readonly id:string;
 readonly nodeId:string;
 readonly depth:number;
 readonly room:DungeonRoomKindV2;
}
export interface VerifiedDungeonRewardSnapshotV2 {
 readonly source:'server-persisted-dungeon-v2';
 readonly policy:typeof DUNGEON_REWARD_V2_POLICY;
 readonly runId:string;
 readonly accountId:string;
 readonly characterId:string;
 readonly actorId:string;
 readonly revision:number;
 readonly seed:string;
 readonly enduranceRouteVersion:2;
 readonly mode:'solo'|'live';
 /** Server-saved room selections, NOT untrusted client-reported build rows. */
 readonly receipts:readonly DungeonRewardReceiptV2[];
}
export interface DungeonRewardOverlayV2 {
 readonly input:CombatInput;
 readonly applied:readonly {id:string;stacks:number}[];
 readonly roomOnly:readonly string[];
}
const fail=(why:string):never=>{throw Error('dungeon_v2_reward_'+why);};
const idOk=(id:unknown)=>typeof id==='string'&&id.length>0&&id.length<=128&&
 /^[A-Za-z0-9:_-]+$/.test(id);
const bound=(x:number,max:number)=>Number.isFinite(x)&&Math.abs(x)<=max;
function kindForRoom(room:DungeonRoomKindV2):'boon'|'artifact'{
 return room==='treasure'||room==='secret'?'artifact':'boon';
}
function assertSnapshot(input:CombatInput,snapshot:VerifiedDungeonRewardSnapshotV2){
 if(!snapshot||snapshot.source!=='server-persisted-dungeon-v2'||
  snapshot.policy!==DUNGEON_REWARD_V2_POLICY||snapshot.enduranceRouteVersion!==2||
  snapshot.mode!=='solo'||!idOk(snapshot.runId)||!idOk(snapshot.accountId)||
  !idOk(snapshot.characterId)||!idOk(snapshot.actorId)||
  !Number.isSafeInteger(snapshot.revision)||snapshot.revision<1||
  snapshot.seed!==input.seed||!Array.isArray(snapshot.receipts)||
  snapshot.receipts.length>35)fail('invalid_snapshot_or_unverified_live');
 if(input.players.length!==1||input.players[0].id!==snapshot.actorId||
  input.players[0].team!=='players'||input.players[0].combatV2?.version!==2||
  input.enemies.length===0||input.enemies.some(e=>e.team!=='enemies')||
  input.initialPlayerState&&Object.keys(input.initialPlayerState).length>0||
  input.enemyDamageProfile!==undefined)fail('requires_fresh_v2_solo_encounter');
 const rooms=new Set<string>(),count=new Map<string,number>();
 let previousDepth=0;
 for(const receipt of snapshot.receipts){
  const def=catalog.get(receipt?.id);
  if(!def)throw Error('dungeon_v2_reward_unknown_reward_id');
  if(!receipt||!idOk(receipt.nodeId)||
   !Number.isSafeInteger(receipt.depth)||receipt.depth<1||receipt.depth>35||
   receipt.depth<=previousDepth||rooms.has(receipt.nodeId)||
   !['shrine','forge','echo','treasure','secret'].includes(receipt.room)||
   def.type!==kindForRoom(receipt.room))fail('forged_or_duplicate_room_selection');
  previousDepth=receipt.depth;rooms.add(receipt.nodeId);
  const qty=(count.get(receipt.id)??0)+1;
  if(qty>def.maxStacks)fail('exceeded_reward_stack_cap');
  count.set(receipt.id,qty);
 }
}
function previewEnemyKind(input:CombatInput):'normal'|'elite'|'boss'{
 if(input.enemies.every(e=>e.boss))return 'boss';
 if(input.enemies.every(e=>e.tags?.includes('encounter:elite')))return 'elite';
 return 'normal';
}
function matchesRole(rule:DungeonRewardStatV2,role:CombatRole):boolean{
 return !rule.role||rule.role===role||
  rule.role==='tank_or_support'&&(role==='tank'||role==='support');
}
/** Only a QA harness may call this after its trusted *server* receipt verifier.
 * A callback returning true in a test is not a production authority or a
 * substitute for an atomic DB snapshot / resolved room ledger. */
export function compileDraftDungeonRewardCombatV2(
 input:CombatInput,snapshot:VerifiedDungeonRewardSnapshotV2,
 verifyPersisted:(snapshot:VerifiedDungeonRewardSnapshotV2,inputDigest:string)=>boolean,
):DungeonRewardOverlayV2{
 assertSnapshot(input,snapshot);
 if(typeof verifyPersisted!=='function')fail('persisted_verifier_required');
 let confirmed=false;
 try{confirmed=verifyPersisted(snapshot,enemyV2SnapshotDigest(input))===true;}
 catch{confirmed=false;}
 if(!confirmed)fail('persisted_run_ledger_not_verified');
 const counts=new Map<string,number>(),roomOnly:string[]=[];
 for(const receipt of snapshot.receipts){
  const def=catalog.get(receipt.id)!;
  if(def.stage==='needs_engine_hook')fail('unimplemented_proc_'+receipt.id);
  if(def.stage==='room_only')roomOnly.push(def.id);
  counts.set(def.id,(counts.get(def.id)??0)+1);
 }
 const actor=input.players[0],kind=previewEnemyKind(input),role=actor.role;
 let attack=0,defense=0,heal=0,haste=0,crit=0;
 for(const [id,stacks] of counts){
  const row=catalog.get(id)!;
  if(id==='ROOM_BOON_BULWARK'){
   defense+=stacks*(role==='tank'?.06:.025);continue;
  }
  const stat=row.stat;
  if(!stat||!matchesRole(stat,role)||stat.enemyKind&&stat.enemyKind!==kind)continue;
  attack+=(stat.attack??0)*stacks;
  defense+=(stat.defense??0)*stacks;
  heal+=(stat.heal??0)*stacks;
  haste+=(stat.haste??0)*stacks;
  crit+=(stat.crit??0)*stacks;
 }
 // Do not silently truncate rewards or disguise runaway synergy as a cap.
 if(!bound(attack,.35)||!bound(defense,.35)||!bound(heal,.40)||
  !bound(haste,.20)||!bound(crit,.10)||1+defense<=0)fail('encounter_reward_budget_exceeded');
 const stats=actor.stats;
 const updated:CombatantDefinition={...actor,stats:{
  ...stats,attackPower:stats.attackPower*(1+attack),
  defense:stats.defense*(1+defense),
  healingPower:stats.healingPower*(1+heal),
  haste:stats.haste+haste,
  critChance:Math.min(.75,stats.critChance+crit),
 }};
 if(!Object.values(updated.stats).every(Number.isFinite))fail('invalid_resulting_stats');
 return {input:{...input,players:[updated]},
  applied:[...counts.entries()].map(([id,stacks])=>({id,stacks})),
  roomOnly};
}
/** Test harness only: this intentionally does NOT call the privileged unified
 * equipped encounter. It cannot activate real dungeon combat or 2.0 procs. */
export function simulateDraftDungeonRewardCombatV2(
 input:CombatInput,snapshot:VerifiedDungeonRewardSnapshotV2,
 verifyPersisted:(snapshot:VerifiedDungeonRewardSnapshotV2,inputDigest:string)=>boolean,
):CombatResult{
 return simulateCombat(compileDraftDungeonRewardCombatV2(input,snapshot,verifyPersisted).input);
}
