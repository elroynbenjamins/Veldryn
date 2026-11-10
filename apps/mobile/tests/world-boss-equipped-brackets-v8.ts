/**
 * World Boss v8 equipped-bracket diagnostic (TEST ONLY).
 * Uses current T1–T4 game equipment fixtures and all nine class identities,
 * converted by the preexisting v4 RELATIVE-stat adapter. These ARE real game
 * stat inputs but NOT server-authenticated live account loadouts or accurate
 * production engine unit conversions. No rewards, attempts or storage writes.
 */
import {assert} from './test-assert';
import {CLASSES} from '../src/content/classes';
import type {ClassId} from '../src/core/types';
import {effectiveStats} from '../src/core/game';
import {regionalCombatFixture,REGIONAL_COMBAT_FIXTURES,type RegionalCombatFixtureDef} from '../src/core/regional-combat-fixtures';
import {launchPlayer} from '../../../backend/src/server/combat/content/launch-combat';
import {simulateWorldBossRounds,type WorldBossId,type WorldBossPhase} from '../../../backend/src/server/combat/world-boss-round-prototype';
import type {CombatantDefinition,CombatStats} from '../../../backend/src/server/combat/types';

type Tier='T1'|'T2'|'T3'|'T4';
const bosses:WorldBossId[]=['hollowroot','sunscar','frostmarch'];
const phases:WorldBossPhase[]=['armored','exposed','enraged'];
const T1=REGIONAL_COMBAT_FIXTURES.find(x=>x.regionId==='GREENFIELDS')!;
const T2=REGIONAL_COMBAT_FIXTURES.find(x=>x.regionId==='IRONWOOD')!;
const T4=REGIONAL_COMBAT_FIXTURES.find(x=>x.regionId==='SUNSCAR')!;
const brackets:ReadonlyArray<{tier:Tier;fixture:RegionalCombatFixtureDef}>=[
 {tier:'T1',fixture:{...T1,level:8,tier:'T1'}},
 {tier:'T2',fixture:{...T2,level:15,tier:'T2'}},
 {tier:'T3',fixture:{...T4,level:29,tier:'T3'}},
 {tier:'T4',fixture:{...T4,level:40,tier:'T4'}},
];
const mean=(values:number[])=>values.reduce((sum,v)=>sum+v,0)/Math.max(1,values.length);
const clamp=(x:number,min:number,max:number)=>Math.max(min,Math.min(max,x));
const roleCounts={Tank:1,Damage:2,Support:1};

function teamIds(initiatorId:ClassId):ClassId[]{
 const cls=CLASSES.find(c=>c.id===initiatorId);
 if(!cls)throw Error('world_boss_unknown_class');
 const remaining={...roleCounts};remaining[cls.role]--;
 const out:ClassId[]=[initiatorId];
 for(const role of ['Tank','Damage','Support'] as const)
  out.push(...CLASSES.filter(c=>c.role===role&&c.id!==initiatorId).slice(0,remaining[role]).map(c=>c.id));
 assert.equal(out.length,4);
 assert.equal(new Set(out).size,4);
 return out;
}
function equippedPlayer(classId:ClassId,tier:Tier):CombatantDefinition{
 const cls=CLASSES.find(c=>c.id===classId)!;
 const fixture=brackets.find(b=>b.tier===tier)!.fixture;
 const baseline=brackets[1].fixture;
 const state=regionalCombatFixture(fixture,'prepared',classId);
 const reference=regionalCombatFixture(baseline,'prepared',classId);
 const current=effectiveStats(state),ref=effectiveStats(reference);
 assert.ok(current.hp>0&&current.attack>0&&current.defense>0);
 assert.ok(Object.values(state.character!.equipment).filter(Boolean).length>=3,'real equipment fixture');
 const template=launchPlayer(cls.name,25);
 const ratio=(a:number,b:number)=>clamp(a/Math.max(.01,b),.1,30);
 const stats:CombatStats={
  ...template.stats,
  maxHp:Math.max(1,Math.round(template.stats.maxHp*ratio(current.hp,ref.hp))),
  attackPower:Math.max(1,Math.round(template.stats.attackPower*ratio(current.attack,ref.attack))),
  healingPower:Math.max(0,Math.round(template.stats.healingPower*ratio(current.attack,ref.attack))),
  defense:Math.max(0,Math.round(template.stats.defense*ratio(current.defense,ref.defense))),
  critChance:clamp(current.critChance,0,.75),
  critMultiplier:current.critMultiplier,
  accuracy:Math.max(1,Math.round(template.stats.accuracy*ratio(current.accuracy,ref.accuracy))),
  evasion:Math.max(0,Math.round(template.stats.evasion*ratio(current.evasion,ref.evasion))),
  haste:clamp(current.haste,0,.75),
 };
 return {...template,id:'WBE_'+classId,level:fixture.level,stats};
}
const REPLICATES=4;
let total=0,mixedTotal=0;
for(const boss of bosses)for(const phase of phases)for(const {tier} of brackets){
 const rows=[] as {damage:number;alive:number;initiatorAlive:number;guard:number;healing:number;protected:number}[];
 const mixed=[] as {damage:number;alive:number}[];
 for(const cls of CLASSES)for(let seed=0;seed<REPLICATES;seed++){
  const playerIds=teamIds(cls.id);
  const base=playerIds.map(id=>equippedPlayer(id,tier));
  const battle=simulateWorldBossRounds({boss,phase,seed:'wb-equipped-v8:'+boss+':'+phase+':'+tier+':'+cls.id+':'+seed,players:base});
  assert.ok(battle.roundsCompleted>=1&&battle.roundsCompleted<=14);
  assert.ok(battle.bossHpDamage>=0&&battle.localGuardDamage>=0&&Number.isFinite(battle.bossHpDamage));
  const ledgers=Object.values(battle.participants);
  rows.push({
   damage:battle.bossHpDamage,guard:battle.localGuardDamage,
   alive:ledgers.filter(p=>p.survived).length,
   initiatorAlive:Number(battle.participants['WBE_'+cls.id].survived),
   healing:ledgers.reduce((n,p)=>n+p.effectiveHealing+p.shieldConsumed,0),
   protected:ledgers.reduce((n,p)=>n+p.tankProtection,0),
  });
  total++;
  // Three representative initiators per tier test power-mismatched borrowed
  // Echoes; the initiator retains its tier, the Echoes use an adjacent tier.
  if(['IRONWARDEN','WAYFINDER','DAWNKEEPER'].includes(cls.id)){
   const index=brackets.findIndex(b=>b.tier===tier);
   const neighbor=brackets[Math.min(3,index+1)].tier===tier
    ?brackets[Math.max(0,index-1)].tier
    :brackets[Math.min(3,index+1)].tier;
   const mixedPlayers=playerIds.map((id,i)=>equippedPlayer(id,i===0?tier:neighbor));
   const result=simulateWorldBossRounds({
    boss,phase,seed:'wb-equipped-mixed-v8:'+boss+':'+phase+':'+tier+':'+cls.id+':'+seed,
    players:mixedPlayers
   });
   mixed.push({damage:result.bossHpDamage,alive:Object.values(result.participants).filter(p=>p.survived).length});
   assert.ok(result.bossHpDamage>=0&&result.roundsCompleted>=1&&result.roundsCompleted<=14);
   mixedTotal++;
  }
 }
 console.log('WB_EQUIPPED_V8='+JSON.stringify({
  boss,phase,tier,matchedFixtures:rows.length,mixedFixtures:mixed.length,
  avgBossDamage:+mean(rows.map(x=>x.damage)).toFixed(2),
  avgGuardDamage:+mean(rows.map(x=>x.guard)).toFixed(2),
  avgLiving:+mean(rows.map(x=>x.alive)).toFixed(2),
  initiatorSurvivalPct:+(100*mean(rows.map(x=>x.initiatorAlive))).toFixed(2),
  avgRealHealingAndShield:+mean(rows.map(x=>x.healing)).toFixed(2),
  avgActualHpProtected:+mean(rows.map(x=>x.protected)).toFixed(2),
  mixedAvgBossDamage:+mean(mixed.map(x=>x.damage)).toFixed(2),
  mixedAvgLiving:+mean(mixed.map(x=>x.alive)).toFixed(2),
  source:'real T1-T4 mobile fixtures with test-only relative PvE engine conversion',
 }));
}
assert.equal(total,3*3*4*9*REPLICATES,'all 1296 matched class/gear simulations');
assert.equal(mixedTotal,3*3*4*3*REPLICATES,'all 432 mixed-bracket examples');
console.log('WB_EQUIPPED_METHOD_V8='+JSON.stringify({
 matched:total,mixed:mixedTotal,liveAccountSnapshots:false,
 realGameGearFixtures:true,productionStatsDirect:false,mintCurrency:false
}));
