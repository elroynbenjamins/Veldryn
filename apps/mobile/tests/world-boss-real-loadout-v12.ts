/** World Boss V12 realistic game-equipment fixture and server-owned reader diagnostics.
 *
 * Real game item/equipment/crafting/Gem/companion validation pipeline, but
 * synthetic fixture accounts; NO authenticated live DB snapshots are read.
 * All damage and role-survival results are calibration-only.
 */
import {assert} from './test-assert';
import {CLASSES} from '../src/content/classes';
import {regionalCombatFixture,REGIONAL_COMBAT_FIXTURES,type RegionalCombatFixtureDef} from '../src/core/regional-combat-fixtures';
import type {ClassId,GameState,GearSlot} from '../src/core/types';
import {combatantFromVerifiedSnapshot} from '../../../backend/src/server/combat/snapshot-adapter';
import {resolveRealWorldBossSnapshotV12,type WorldBossOwnedStateReaderV12} from '../../../backend/online/world-boss-loadout-v12';
import {prepareWorldBossRosterV9} from '../../../backend/src/server/combat/world-boss-verified-roster-v9';
import {simulateWorldBossRounds,type WorldBossId,type WorldBossPhase,type WorldBossOrder, type WorldBossRoundResult} from '../../../backend/src/server/combat/world-boss-round-prototype';
import {makeWorldBossWarCampSnapshotV11} from '../../../backend/src/server/combat/world-boss-war-camp-v11';
import type {CombatantDefinition} from '../../../backend/src/server/combat/types';

type Tier='T1'|'T2'|'T3'|'T4';
const NOW=1794398400000;
const POLICY={version:'v12-non-production-bracket-fixture',
 bounds:[2500,5000,10000,20000] as [number,number,number,number]};
const BOSSES:WorldBossId[]=['hollowroot','sunscar','frostmarch'];
const PHASES:WorldBossPhase[]=['armored','exposed','enraged'];
const ORDERS:WorldBossOrder[]=['steady_assault','break_armor','hold_line'];
const T1=REGIONAL_COMBAT_FIXTURES.find(x=>x.regionId==='GREENFIELDS')!;
const T2=REGIONAL_COMBAT_FIXTURES.find(x=>x.regionId==='IRONWOOD')!;
const T4=REGIONAL_COMBAT_FIXTURES.find(x=>x.regionId==='SUNSCAR')!;
const TIERS:ReadonlyArray<{tier:Tier;def:RegionalCombatFixtureDef}>=[
 {tier:'T1',def:{...T1,level:8,tier:'T1'}},
 {tier:'T2',def:{...T2,level:15,tier:'T2'}},
 {tier:'T3',def:{...T4,level:29,tier:'T3'}},
 {tier:'T4',def:{...T4,level:40,tier:'T4'}},
];
const err=async(run:()=>Promise<unknown>,matches:string)=>{
 let caught=false;try{await run();}catch(e){caught=String(e).includes(matches);}
 assert.ok(caught,'expected '+matches);
};
const mean=(xs:number[])=>xs.reduce((n,x)=>n+x,0)/Math.max(1,xs.length);
let reads=0,verified=0;
async function fromGame(classId:ClassId,tier:Tier,opts?:{
 account?:string;owner?:string;characterId?:string;revision?:number;state?:GameState;
}){
 const account=opts?.account??'WB12_ACC_'+classId+'_'+tier;
 const characterId=opts?.characterId??'WB12_CHAR_'+classId+'_'+tier;
 const revision=opts?.revision??2;
 const def=TIERS.find(t=>t.tier===tier)!.def;
 const state=opts?.state??regionalCombatFixture(def,'prepared',classId);
 state.character={...state.character!,id:characterId};
 const reader:WorldBossOwnedStateReaderV12={
  principalAccountId:account,
  async loadCharacterState(input){
   reads++;assert.equal(input.accountId,account);assert.equal(input.characterId,characterId);
   return {ownerAccountId:opts?.owner??account,gameVersion:revision,serverState:state};
  },
 };
 const result=await resolveRealWorldBossSnapshotV12({
  reader,characterId,expectedGameVersion:revision,nowUtcMs:NOW,
  minimumCharacterLevel:1,policy:POLICY,
 });
 verified++;
 assert.equal(result.snapshot.ownerAccountId,account);
 assert.equal(result.snapshot.verified.characterId,characterId);
 assert.equal(result.snapshot.abilities.length>0,true);
 assert.ok(result.snapshot.verified.maxHp>0&&result.snapshot.verified.attackPower>0);
 assert.equal(result.persisted,false);
 assert.equal(result.sourceHash.length,64);
 return {state,reader,...result};
}
async function main(){
 const cache=new Map<string,CombatantDefinition>();
 for(const {tier} of TIERS)for(const c of CLASSES){
  const x=await fromGame(c.id,tier);
  const actor=combatantFromVerifiedSnapshot(x.snapshot.verified,[...x.snapshot.abilities]);
  assert.equal(actor.classId,c.id);
  assert.equal(actor.role,c.role.toLowerCase());
  assert.ok(actor.stats.maxHp>0);
  cache.set(c.id+':'+tier,actor);
 }
 assert.equal(verified,CLASSES.length*4,'all nine classes in four real equipment brackets');
 const source=await fromGame('IRONWARDEN','T2',{account:'WB12_SECURITY_ACCOUNT'});
 await err(()=>resolveRealWorldBossSnapshotV12({reader:{
  ...source.reader,
  async loadCharacterState(){return {ownerAccountId:'WB12_STOLEN',gameVersion:2,serverState:source.state};}},
  characterId:'WB12_CHAR_IRONWARDEN_T2',expectedGameVersion:2,nowUtcMs:NOW,
  minimumCharacterLevel:1,policy:POLICY,
 }), 'character_not_owned');
 await err(()=>resolveRealWorldBossSnapshotV12({reader:source.reader,
  characterId:'WB12_CHAR_IRONWARDEN_T2',expectedGameVersion:1,nowUtcMs:NOW,
  minimumCharacterLevel:1,policy:POLICY,
 }), 'stale_server_game_revision');
 await err(()=>resolveRealWorldBossSnapshotV12({reader:source.reader,
  characterId:'WB12_CHAR_IRONWARDEN_T2',expectedGameVersion:2,nowUtcMs:NOW,
  minimumCharacterLevel:99,policy:POLICY,
 }), 'character_level_locked');
 const fake=structuredClone(source.state);
 const slot=Object.entries(fake.character!.equipment).find(([,v])=>Boolean(v))![0] as GearSlot;
 fake.character!.equipmentInstanceIds={...fake.character!.equipmentInstanceIds,[slot]:'WB_FORGED_NOT_OWNED'};
 await err(()=>fromGame('IRONWARDEN','T2',{account:'WB12_SECURITY_ACCOUNT',
  state:fake}),'equipment_copy_not_owned');

 // Same existing V9 full-roster prep from actual production game-rule fixture adapter.
 const initiator=(await fromGame('IRONWARDEN','T2',{account:'WB12_INITIATOR',characterId:'WB12_IN_CHAR'})).snapshot;
 const others=await Promise.all([
  fromGame('WAYFINDER','T2',{account:'WB12_ECHO_A',characterId:'WB12_ECHO_CHAR_A'}),
  fromGame('RAVAGER','T2',{account:'WB12_ECHO_B',characterId:'WB12_ECHO_CHAR_B'}),
  fromGame('DAWNKEEPER','T2',{account:'WB12_ECHO_C',characterId:'WB12_ECHO_CHAR_C'}),
 ]);
 const prepared=await prepareWorldBossRosterV9({
  principalAccountId:'WB12_INITIATOR',nowUtcMs:()=>NOW,
  randomSeed:()=> 'WORLD_BOSS_V12_SERVER_RANDOM_FIXTURE_SEED_12345',
  loadCurrentCharacter:async()=>initiator,
  listEligibleEchoes:async()=>others.map(x=>x.snapshot),
 },{
  eventId:'WB_V12_AUTHORITY_TEST',characterId:'WB12_IN_CHAR',
  requestId:'WB_V12_REQUEST_0001',order:'hold_line',
 });
 assert.equal(prepared.npcSlots,0);
 assert.equal(prepared.snapshotDigest.length,64);
 assert.deepEqual(prepared.command.squad.map(s=>s.resolvedCombatant.role),['tank','damage','damage','support']);

 // Freeze enemy Attack, Defense and local Guard against a T2 baseline. We do not
 // claim that these numbers are approved profiles; all gear is synthetic fixture gear.
 const baseIds=['IRONWARDEN','WAYFINDER','RAVAGER','DAWNKEEPER'] as const;
 const baseTeam=baseIds.map(id=>cache.get(id+':T2')!);
 const baseAttack=mean(baseTeam.map(p=>p.stats.attackPower))*1.1;
 const baseDefense=mean(baseTeam.map(p=>p.stats.defense))*.55;
 const camp=makeWorldBossWarCampSnapshotV11({eventId:'WB_V12_CALIBRATION',revision:1,
  levels:{fortifications:1,fieldProvisions:1,siegecraft:1}});
 let fights=0,withCampFights=0;
 const findings=[] as {boss:string;phase:string;tier:Tier;samples:number;damage:number;
  survived:number;supportRecovery:number;tankPrevented:number;guardDamage:number;warCampDelta:number}[];
 for(const boss of BOSSES)for(const phase of PHASES)for(const {tier} of TIERS){
  const team=baseIds.map(id=>cache.get(id+':'+tier)!);
  const guard=baseTeam.reduce((n,p)=>n+p.stats.attackPower,0)*(boss==='frostmarch'?3:boss==='sunscar'?2.2:1.8);
  const enemy={testOnlyFixedBossAttack:baseAttack,testOnlyFixedBossDefense:baseDefense,
   testOnlyFixedGuardMax:guard};
  const rows:WorldBossRoundResult[]=[];
  let bonusDifference=0;
  for(const order of ORDERS)for(let seed=0;seed<2;seed++){
   const key='WB12:'+boss+':'+phase+':'+tier+':'+order+':'+seed;
   const normal=simulateWorldBossRounds({boss,phase,order,seed:key,players:team,...enemy});
   rows.push(normal);fights++;
   assert.ok(Number.isFinite(normal.bossHpDamage)&&normal.bossHpDamage>=0);
   assert.ok(normal.events.every(e=>e.round<=14));
   const fortified=simulateWorldBossRounds({
    boss,phase,order,seed:key,players:team,...enemy,serverWarCamp:camp,
   });
   withCampFights++;
   bonusDifference+=fortified.bossHpDamage-normal.bossHpDamage;
  }
  findings.push({boss,phase,tier,samples:rows.length,
   damage:+mean(rows.map(r=>r.bossHpDamage)).toFixed(2),
   survived:+mean(rows.map(r=>Object.values(r.participants).filter(v=>v.survived).length)).toFixed(2),
   supportRecovery:+mean(rows.map(r=>r.participants[team[3].id].effectiveHealing+
    r.participants[team[3].id].shieldConsumed)).toFixed(2),
   tankPrevented:+mean(rows.map(r=>r.participants[team[0].id].tankProtection)).toFixed(2),
   guardDamage:+mean(rows.map(r=>r.localGuardDamage)).toFixed(2),
   warCampDelta:+(bonusDifference/rows.length).toFixed(2),
  });
 }
 assert.equal(fights,216);
 assert.equal(withCampFights,216);
 assert.equal(findings.length,36);
 // Do NOT assert that all teams survive or that all war orders improve
 // damage. The purpose is to expose unbalanced mechanics.
 console.log('WB_V12_REAL_GAME_FIXTURE_BRIDGE='+JSON.stringify({
  classes:CLASSES.length,tiers:4,loadoutsVerified:verified,storeReads:reads,
  replayableV9Roster:true,borrowedEchoes:3,source:'trusted-reader interface injected with regional game fixtures',
  actualLiveDbReads:0,realPlayerAccounts:false,serverCoopItemAndGemPipeline:true,
  currencyMinted:0,liveFeatureEnabled:false,
 }));
 for(const row of findings)console.log('WB_V12_CALIBRATION='+JSON.stringify(row));
 console.log('WB_V12_CALIBRATION_METHOD='+JSON.stringify({
  fights,warCampFights:withCampFights,bosses:3,phases:3,tiers:4,
  warOrders:3,seedsPerOrder:2,levelOrPowerTuningApproved:false,
  fixedEnemyAgainstT2Fixture:true,realGameEquipmentRules:true,
  realAccountSnapshots:false,engineIsStill14RoundPrototype:true,
 }));
}
void main().catch(e=>{console.error(e);throw e;});
