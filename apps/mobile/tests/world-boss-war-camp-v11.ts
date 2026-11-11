/**
 * World Boss v11 fixed-threat/War Camp combat diagnostics — hidden test only.
 * Uses existing real class kits and deliberately fixed synthetic boss attack.
 * No live player loadout, damage/HP tuning, event, currency or database writes.
 */
import {assert} from './test-assert';
import {launchPlayer} from '../../../backend/src/server/combat/content/launch-combat';
import {simulateWorldBossRounds,type WorldBossId,type WorldBossPhase,type WorldBossRoundResult} from '../../../backend/src/server/combat/world-boss-round-prototype';
import {makeWorldBossWarCampSnapshotV11,deriveWorldBossWarCampEffectsV11} from '../../../backend/src/server/combat/world-boss-war-camp-v11';
import type {CombatantDefinition} from '../../../backend/src/server/combat/types';

const BOSSES:WorldBossId[]=['hollowroot','sunscar','frostmarch'];
const PHASES:WorldBossPhase[]=['armored','exposed','enraged'];
const EVENT='WB_V11_SIM_ONLY';
const seed='world-boss-v11-seeded';
const team=()=>['Ironwarden','Wayfinder','Ravager','Dawnkeeper'].map(name=>launchPlayer(name,25));
const basic=()=>team().map(p=>({...p,abilities:[]}));
const make=(fortifications:0|1|2,fieldProvisions:0|1|2,siegecraft:0|1|2,revision=1)=>
 makeWorldBossWarCampSnapshotV11({eventId:EVENT,revision,levels:{fortifications,fieldProvisions,siegecraft}});
const mean=(xs:number[])=>xs.reduce((n,x)=>n+x,0)/xs.length;
const enemyHit=(result:WorldBossRoundResult)=>result.events.find(x=>x.round===1&&x.type==='strike'&&x.actorId===result.boss.toUpperCase());
const firstGuard=(result:WorldBossRoundResult)=>result.events.find(x=>x.type==='strike'&&x.actorId===team()[0].id&&x.guardAbsorbed!==undefined);
const assertReject=(fn:()=>unknown,word:string)=>{
 let caught=false;try{fn();}catch(e){caught=String(e).includes(word);}
 assert.ok(caught,'expected '+word);
};
const zero=deriveWorldBossWarCampEffectsV11();
assert.equal(zero.bossDamageReduction,0);
assert.equal(zero.startingHpMultiplier,1);
assert.equal(zero.healingMultiplier,1);
assert.equal(zero.guardBreakMultiplier,1);
assert.equal(zero.weakPointMultiplier,1);

const full=make(2,2,2);
const effects=deriveWorldBossWarCampEffectsV11(full);
assert.equal(effects.bossDamageReduction,.10,'two fortification tiers total 10%');
assert.equal(effects.startingHpMultiplier,1.05,'first provision tier 5% HP');
assert.equal(effects.healingMultiplier,1.05,'second provision tier 5% healing');
assert.equal(effects.guardBreakMultiplier,1.05,'first siege tier 5% guard-break effectiveness');
assert.equal(effects.weakPointMultiplier,1.05,'second siege tier 5% conditional weak-point damage');
const damaged=structuredClone(full);
damaged.levels.fortifications=0;
assertReject(()=>deriveWorldBossWarCampEffectsV11(damaged),'war_camp_digest_mismatch');
assertReject(()=>makeWorldBossWarCampSnapshotV11({eventId:EVENT,revision:1,levels:{
 fortifications:3 as never,fieldProvisions:0,siegecraft:0}}),'invalid_server_war_camp');
assertReject(()=>makeWorldBossWarCampSnapshotV11({eventId:EVENT,revision:-1,levels:{
 fortifications:0,fieldProvisions:0,siegecraft:0}}),'invalid_server_war_camp');

const plain=simulateWorldBossRounds({boss:'hollowroot',phase:'armored',seed,players:basic()});
const fortified=simulateWorldBossRounds({boss:'hollowroot',phase:'armored',seed,players:basic(),serverWarCamp:make(2,0,0)});
const noCampFirst=enemyHit(plain),fortFirst=enemyHit(fortified);
assert.ok(Boolean(noCampFirst&&fortFirst&&noCampFirst.amount!>0),'unshielded boss strike must be real');
assert.ok((fortFirst?.amount??Infinity)<(noCampFirst?.amount??0),
 'fortifications actually reduce the same opening boss hit');
assert.ok(fortified.events.some(e=>e.type==='mitigate'&&e.abilityId==='WAR_CAMP_FORTIFICATIONS'&&e.amount!>0),
 'community protection must be visible in the authoritative ledger');
assert.ok(fortified.events.filter(e=>e.abilityId==='WAR_CAMP_FORTIFICATIONS')
 .every(e=>e.actorId==='WAR_CAMP'&&e.detail==='community_buff_not_impact'),
 'War Camp defense is not invented personal Tank contribution');

const siege=simulateWorldBossRounds({boss:'hollowroot',phase:'armored',seed,players:basic(),serverWarCamp:make(0,0,1)});
const g0=firstGuard(plain),g1=firstGuard(siege);
assert.ok(Boolean(g0&&g1&&g0.guardAbsorbed!>0),'first player hit must hit a guard');
assert.ok((g1?.guardAbsorbed??0)>(g0?.guardAbsorbed??Infinity),
 'Siegecraft must break additional real guard, not fake a damage event');

// A stronger squad must no longer make a fixed-bracket boss attack harder.
// Baseline mode is intentionally left unchanged until production stats are verified.
const reference=mean(team().map(p=>p.stats.attackPower))*1.1;
const fixedDefense=mean(team().map(p=>p.stats.defense))*.55;
const fixedSunscarGuard=team().reduce((n,p)=>n+p.stats.attackPower,0)*2.2;
const weak=basic(),geared=basic().map(p=>({...p,stats:{
 ...p.stats,attackPower:p.stats.attackPower*1.65,
 maxHp:p.stats.maxHp*1.6,defense:p.stats.defense*1.6,
}}));
const stableBoss={testOnlyFixedBossAttack:reference,testOnlyFixedBossDefense:fixedDefense,
 testOnlyFixedGuardMax:fixedSunscarGuard,pressure:3};
const fixedWeak=simulateWorldBossRounds({boss:'sunscar',phase:'enraged',seed,players:weak,...stableBoss});
const fixedGeared=simulateWorldBossRounds({boss:'sunscar',phase:'enraged',seed,players:geared,...stableBoss});
assert.ok(fixedGeared.bossHpDamage>fixedWeak.bossHpDamage,
 'better gear must generate more boss damage against same frozen threat');
const incoming=(r:WorldBossRoundResult)=>r.events.filter(e=>
 (e.type==='strike'&&e.actorId===r.boss.toUpperCase())||e.type==='status_tick'
 ).reduce((n,e)=>n+(e.amount??0),0);
assert.ok(incoming(fixedGeared)<=incoming(fixedWeak),
 'prepared gear should mitigate more HP loss under a fixed boss strength');
assertReject(()=>simulateWorldBossRounds({boss:'hollowroot',phase:'armored',seed,players:team(),testOnlyFixedBossAttack:-10}),
 'invalid_fixed_test_attack');
assertReject(()=>simulateWorldBossRounds({boss:'hollowroot',phase:'armored',seed,players:team(),testOnlyFixedBossDefense:-1}),
 'invalid_fixed_test_defense');
assertReject(()=>simulateWorldBossRounds({boss:'hollowroot',phase:'armored',seed,players:team(),testOnlyFixedGuardMax:Number.NaN}),
 'invalid_fixed_test_guard');

const findings=[] as {boss:WorldBossId;phase:WorldBossPhase;pressure:number;
 avgAlive:number;avgHpDamage:number;avgSupportRecovery:number;avgTankProtection:number;
 avgEnemyHpDamage:number;avgDowns:number}[];
let examined=0;
for(const boss of BOSSES)for(const phase of PHASES)for(const pressure of [1,2.5,4.5]){
 const samples=[] as WorldBossRoundResult[];
 for(const initiator of ['Ironwarden','Wayfinder','Dawnkeeper']){
  const members=team();
  const i=members.findIndex(p=>p.name===initiator);
  if(i>0){const current=members.splice(i,1)[0];members.unshift(current);}
  // Holding a fixed reference across squads is a *diagnostic*, not live scaling.
  const battle=simulateWorldBossRounds({boss,phase,pressure,players:members,
   seed:seed+':'+boss+':'+phase+':'+initiator,
   testOnlyFixedBossAttack:reference,testOnlyFixedBossDefense:fixedDefense,
   testOnlyFixedGuardMax:team().reduce((n,p)=>n+p.stats.attackPower,0)*
    (boss==='frostmarch'?3:boss==='sunscar'?2.2:1.8),
  });
  assert.ok(battle.roundsCompleted>0&&battle.roundsCompleted<=14);
  assert.ok(battle.events.every(e=>e.round>=1&&e.round<=14));
  assert.ok(battle.bossHpDamage>=0&&Number.isFinite(battle.bossHpDamage));
  samples.push(battle);examined++;
 }
 findings.push({boss,phase,pressure,
  avgAlive:+mean(samples.map(r=>Object.values(r.participants).filter(p=>p.survived).length)).toFixed(2),
  avgHpDamage:+mean(samples.map(r=>r.bossHpDamage)).toFixed(2),
  avgSupportRecovery:+mean(samples.map(r=>Object.entries(r.participants)
   .filter(([id])=>id.toLowerCase().includes('dawnkeeper'))
   .reduce((n,[,p])=>n+p.effectiveHealing+p.shieldConsumed,0))).toFixed(2),
  avgTankProtection:+mean(samples.map(r=>Object.entries(r.participants)
   .filter(([id])=>id.toLowerCase().includes('ironwarden'))
   .reduce((n,[,p])=>n+p.tankProtection,0))).toFixed(2),
  avgEnemyHpDamage:+mean(samples.map(r=>incoming(r))).toFixed(2),
  avgDowns:+mean(samples.map(r=>r.events.filter(e=>e.type==='down').length)).toFixed(2),
 });
}
assert.equal(examined,81);
assert.equal(findings.length,27);
assert.ok(findings.every(f=>Number.isFinite(f.avgEnemyHpDamage)&&f.avgEnemyHpDamage>=0));
console.log('WB_WAR_CAMP_V11='+JSON.stringify({
 tier0:zero,tier2:effects,verifiedDigest:true,firstAttackFortReduced:true,
 siegeFirstGuardImproved:true,gearedImprovesFixedThreat:true,
 previewOnly:true,currencyMinted:0,dbWrites:0,liveFeatureEnabled:false,
}));
for(const row of findings)console.log('WB_FIXED_THREAT_V11='+JSON.stringify(row));
console.log('WB_FIXED_THREAT_METHOD_V11='+JSON.stringify({
 samples:examined,equipment:'synthetic class-kit baseline + fixed boss attack',
 source:'launchPlayer test-only, not server-resolved real T1–T4 loadouts',
 simulationOnly:true,pressureCoefficientsApproved:false,realBossBalanceApproved:false,
}));
