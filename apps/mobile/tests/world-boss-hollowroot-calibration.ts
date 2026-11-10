/**
 * TEST-ONLY Hollowroot World Boss calibration. Intentionally excluded from
 * all production server endpoints, function bundles, content registries and
 * mobile navigation. No currency, attempts, events, or player data are touched.
 *
 * Runs the existing deterministic PvE combat engine using nine actual class
 * kits and stats from the real equipped T1–T4 mobile character fixtures.
 * The ordinary dungeon ability kit is used as a PROXY, NOT yet an implemented
 * 14-round World Boss action scheduler or World Impact scoring service.
 */
import {assert} from './test-assert';
import {CLASSES} from '../src/content/classes';
import type {ClassId} from '../src/core/types';
import {effectiveStats} from '../src/core/game';
import {regionalCombatFixture,REGIONAL_COMBAT_FIXTURES,type RegionalCombatFixtureDef} from '../src/core/regional-combat-fixtures';
import {launchPlayer} from '../../../backend/src/server/combat/content/launch-combat';
import {simulateCombat} from '../../../backend/src/server/combat/engine';
import type {CombatResult,CombatantDefinition,AbilityDefinition,CombatStats} from '../../../backend/src/server/combat/types';

type Phase='armored'|'exposed'|'enraged';
type Tier='T1'|'T2'|'T3'|'T4';
type Role='Tank'|'Damage'|'Support';
type Variant='normal'|'no_support_utility'|'no_tank_utility';
const PHASES:readonly Phase[]=['armored','exposed','enraged'];
const ROLE_COUNTS:Readonly<Record<Role,number>>={Tank:1,Damage:2,Support:1};
const T1=REGIONAL_COMBAT_FIXTURES.find(x=>x.regionId==='GREENFIELDS')!;
const T2=REGIONAL_COMBAT_FIXTURES.find(x=>x.regionId==='IRONWOOD')!;
const T4=REGIONAL_COMBAT_FIXTURES.find(x=>x.regionId==='SUNSCAR')!;
const BRACKETS:ReadonlyArray<{tier:Tier;fixture:RegionalCombatFixtureDef}>=[
 {tier:'T1',fixture:{...T1,level:8,tier:'T1'}},
 {tier:'T2',fixture:{...T2,level:15,tier:'T2'}},
 {tier:'T3',fixture:{...T4,level:29,tier:'T3'}},
 {tier:'T4',fixture:{...T4,level:40,tier:'T4'}},
];
const REPLICATES=3;
const ENGINE_WINDOW_MS=70_000; // Proxy to approximate 14 × 5s, NOT real 14 combat rounds.
const CLASS_IDS=CLASSES.map(cls=>cls.id);
const clamp=(x:number,min:number,max:number)=>Math.max(min,Math.min(max,x));
const mean=(xs:number[])=>xs.reduce((a,b)=>a+b,0)/Math.max(1,xs.length);
const round=(x:number)=>Math.round(x*100)/100;
const count=(combat:CombatResult,type:string,actorId?:string)=>
 combat.events.filter(e=>e.type===type&&(actorId===undefined||e.actorId===actorId)).length;
const sum=(combat:CombatResult,type:string,actorId?:string)=>
 combat.events.filter(e=>e.type===type&&(actorId===undefined||e.actorId===actorId)).reduce((a,e)=>a+(e.amount??0),0);

function chooseSquad(initiatorId:ClassId):ClassId[]{
 const initiator=CLASSES.find(c=>c.id===initiatorId);
 if(!initiator)throw new Error('unknown_initiator');
 const desired:Record<Role,number>={...ROLE_COUNTS};
 desired[initiator.role]--;
 const selected:ClassId[]=[initiatorId];
 for(const role of ['Tank','Damage','Support'] as const){
  selected.push(...CLASSES.filter(c=>c.role===role&&c.id!==initiatorId).slice(0,desired[role]).map(c=>c.id));
 }
 assert.equal(selected.length,4,'one initiator + three Echo classes');
 assert.equal(new Set(selected).size,4,'no duplicate Echo owner in squad');
 for(const role of ['Tank','Damage','Support'] as const)assert.equal(selected.filter(id=>CLASSES.find(c=>c.id===id)?.role===role).length,ROLE_COUNTS[role]);
 return selected;
}

/** Engine units differ from mobile stat units. Preserve the class's actual
 *  gear/level RELATIVE stat ratios to a genuine equipped T2 reference rather
 *  than naively inserting mobile Attack into launchPlayer's engine Attack.
 *  This calibration adapter is test-only and NOT safe to use for live fights.
 */
function equippedEnginePlayer(classId:ClassId,fixture:RegionalCombatFixtureDef):CombatantDefinition{
 const cls=CLASSES.find(c=>c.id===classId)!;
 const state=regionalCombatFixture(fixture,'prepared',classId);
 const baseline=regionalCombatFixture(BRACKETS[1].fixture,'prepared',classId);
 const equipped=effectiveStats(state),reference=effectiveStats(baseline);
 assert.ok(equipped.hp>0&&equipped.attack>0&&equipped.defense>0,'real equipped stats required');
 assert.ok(Object.values(state.character!.equipment).filter(Boolean).length>=3,'fixture must use multiple actual equipment slots');
 const template=launchPlayer(cls.name,25);
 const ratio=(a:number,b:number)=>clamp(a/Math.max(.01,b),.1,30);
 const stats:CombatStats={
  ...template.stats,
  maxHp:Math.max(1,Math.round(template.stats.maxHp*ratio(equipped.hp,reference.hp))),
  attackPower:Math.max(1,Math.round(template.stats.attackPower*ratio(equipped.attack,reference.attack))),
  healingPower:Math.max(0,Math.round(template.stats.healingPower*ratio(equipped.attack,reference.attack))),
  defense:Math.max(0,Math.round(template.stats.defense*ratio(equipped.defense,reference.defense))),
  critChance:clamp(equipped.critChance,0,.75),
  critMultiplier:equipped.critMultiplier,
  accuracy:Math.max(1,Math.round(template.stats.accuracy*ratio(equipped.accuracy,reference.accuracy))),
  evasion:Math.max(0,Math.round(template.stats.evasion*ratio(equipped.evasion,reference.evasion))),
  haste:clamp(equipped.haste,0,.75),
 };
 return {...template,id:'WBE_'+classId,level:fixture.level,stats};
}

/** These abilities exercise LIVE combat primitives, not the authored 42-row
 *  Hollowroot turn schedule. The latter needs a phase-safe round scheduler,
 *  targeting controls and a local guard ledger in a later dev pass.
 */
function hollowroot(phase:Phase,players:CombatantDefinition[]):CombatantDefinition{
 const avgAttack=mean(players.map(x=>x.stats.attackPower));
 const avgDefense=mean(players.map(x=>x.stats.defense));
 const hp=Math.max(10_000,Math.round(players.reduce((n,x)=>n+x.stats.attackPower,0)*40));
 const ap=Math.max(80,Math.round(avgAttack*1.10));
 const stats:CombatStats={
  maxHp:hp,attackPower:ap,healingPower:0,defense:Math.round(avgDefense*.55),
  accuracy:745,evasion:115,critChance:.05,critMultiplier:1.5,haste:.02,
 };
 const slam=(coeff:number):AbilityDefinition=>({
  id:'WBH_ROOT_SLAM',name:'Root Slam',target:'current_target',priority:90,
  cooldownMs:11_000,castTimeMs:1_000,interruptible:false,
  effects:[{kind:'damage',coeff,damageType:'nature'}],
 });
 const exposure:AbilityDefinition={
  id:'WBH_AMBER_EXPOSURE',name:'Amber Heart Exposure',target:'self',priority:55,
  cooldownMs:19_000,castTimeMs:0,
  effects:[{kind:'debuff',tag:'damage_taken',value:.10,durationMs:8_000}],
 };
 let abilities:AbilityDefinition[];
 if(phase==='armored')abilities=[
  slam(1.35),
  {id:'WBH_BARK_MANTLE',name:'Bark Mantle',target:'self',priority:80,cooldownMs:17_000,castTimeMs:0,
   effects:[{kind:'buff',tag:'damage_taken',value:-.12,durationMs:11_000}]},
  exposure,
 ];
 else if(phase==='exposed')abilities=[
  {id:'WBH_SPOREBURST',name:'Sporeburst',target:'all_enemies',priority:100,cooldownMs:15_000,castTimeMs:1_000,interruptible:true,
   effects:[{kind:'dot',coeff:.16,damageType:'nature',durationMs:4_000,tickMs:2_000,tag:'hollowroot_spores'}]},
  {id:'WBH_ENTANGLE',name:'Entangling Vines',target:'random_enemy',priority:95,cooldownMs:14_000,castTimeMs:1_000,interruptible:true,
   effects:[{kind:'debuff',tag:'damage_done',value:-.50,durationMs:4_000}]},
  {id:'WBH_REGROWTH',name:'Local Guard Regrowth',target:'self',priority:80,cooldownMs:18_000,castTimeMs:1_100,interruptible:true,
   effects:[{kind:'shield',flat:Math.round(hp*.08)}]},
  slam(1.35),
  exposure,
 ];
 else abilities=[
  {id:'WBH_SPLINTERSTORM',name:'Splinterstorm',target:'all_enemies',priority:100,cooldownMs:11_000,castTimeMs:1_000,
   effects:[{kind:'damage',coeff:.70,damageType:'nature'}]},
  slam(1.45),
  exposure,
 ];
 return {
  id:'WB_HOLLOWROOT_CALIBRATION',name:'Hollowroot Colossus (test only)',
  team:'enemies',role:'enemy',boss:true,level:25,stats,
  basicAttackMs:3_100,basicAttackCoeff:.70,abilities,
  // No local boss HP threshold phases: global phase is snapshotted before battle.
 };
}
type Sample={
 tier:Tier;phase:Phase;initiator:ClassId;role:Role;seed:number;variant:Variant;
 squadDamage:number;ownDamage:number;ownEffectiveHeal:number;ownShieldsApplied:number;
 totalEffectiveHeal:number;shieldAbsorbed:number;incomingDamage:number;
 alive:number;teamSurvived:boolean;bossDefeated:boolean;
 rootSlams:number;sporeTicks:number;regrowthShields:number;interrupts:number;
};
function run(initiator:ClassId,tier:Tier,phase:Phase,seed:number,variant:Variant='normal'){
 const bracket=BRACKETS.find(b=>b.tier===tier)!;
 const teamIds=chooseSquad(initiator);
 const team=teamIds.map(id=>equippedEnginePlayer(id,bracket.fixture));
 const squad=team.map(p=>{
  if(variant==='no_support_utility'&&p.role==='support')return {...p,abilities:p.abilities.filter(a=>a.effects.every(e=>!['heal','hot','shield','cleanse'].includes(e.kind)))};
  if(variant==='no_tank_utility'&&p.role==='tank')return {...p,abilities:p.abilities.filter(a=>a.effects.every(e=>!['taunt','heal','shield'].includes(e.kind)))};
  return p;
 });
 const boss=hollowroot(phase,squad);
 const result=simulateCombat({seed:'worldboss-hollowroot-v4:'+tier+':'+phase+':'+initiator+':'+variant+':'+seed,players:squad,enemies:[boss],maxDurationMs:ENGINE_WINDOW_MS});
 const actualBossDamage=result.enemies[0].damageTaken;
 const summedEvents=result.events.filter(e=>e.targetId===boss.id&&(e.type==='damage'||e.type==='dot_tick')&&e.actorId?.startsWith('WBE_')).reduce((sum,e)=>sum+(e.amount??0),0);
 // Compare replay event amounts to actual engine state. Shields are separate, and
 // regrowth never heals either local or community boss HP in this prototype.
 assert.ok(Math.abs(actualBossDamage-summedEvents)<3,'replayed boss HP damage must reconcile with engine state');
 assert.ok(result.events.every(e=>Number.isFinite(e.atMs)&&(!('amount' in e)||Number.isFinite(e.amount))),
  'no fabricated or NaN engine events');
 assert.ok(!result.events.some(e=>(e.type==='heal'||e.type==='hot_tick')&&e.targetId===boss.id),
  'boss Regrowth is LOCAL shield only, never community HP regeneration');
 const actor='WBE_'+initiator;
 const role=CLASSES.find(c=>c.id===initiator)!.role;
 const a:Sample={
  tier,phase,initiator,role,seed,variant,
  squadDamage:actualBossDamage,
  ownDamage:result.events.filter(e=>e.actorId===actor&&e.targetId===boss.id&&(e.type==='damage'||e.type==='dot_tick')).reduce((n,e)=>n+(e.amount??0),0),
  ownEffectiveHeal:sum(result,'heal',actor)+sum(result,'hot_tick',actor),
  ownShieldsApplied:sum(result,'shield',actor),
  totalEffectiveHeal:sum(result,'heal')+sum(result,'hot_tick'),
  shieldAbsorbed:result.events.filter(e=>e.actorId===boss.id).reduce((n,e)=>n+(e.absorbed??0),0),
  incomingDamage:result.events.filter(e=>e.actorId===boss.id&&(e.type==='damage'||e.type==='dot_tick')).reduce((n,e)=>n+(e.amount??0),0),
  alive:result.players.filter(p=>p.alive).length,
  teamSurvived:result.players.some(p=>p.alive),
  bossDefeated:result.victory,
  rootSlams:count(result,'cast_complete',boss.id), // boss cast total; see signature-specific event fields below
  sporeTicks:result.events.filter(e=>e.abilityId==='WBH_SPOREBURST'&&e.type==='dot_tick').length,
  regrowthShields:result.events.filter(e=>e.abilityId==='WBH_REGROWTH'&&e.type==='shield').length,
  interrupts:count(result,'interrupt'),
 };
 a.rootSlams=result.events.filter(e=>e.abilityId==='WBH_ROOT_SLAM'&&e.type==='cast_complete').length;
 return {sample:a,result};
}

for(const cls of CLASSES)assert.ok(['Tank','Support','Damage'].includes(cls.role));
assert.equal(CLASS_IDS.length,9,'test all nine real class definitions');
assert.equal(BRACKETS.length,4,'test all four implemented early equipment tiers');
// Stable replay is critical to later async World Boss attempt settlement.
const replayA=run('IRONWARDEN','T2','exposed',17);
const replayB=run('IRONWARDEN','T2','exposed',17);
assert.deepEqual(replayA.result.events,replayB.result.events,'server-seeded combat replay must be identical');

const samples:Sample[]=[];
for(const {tier} of BRACKETS)for(const phase of PHASES)for(const initiator of CLASS_IDS)for(let i=0;i<REPLICATES;i++){
 const {sample}=run(initiator,tier,phase,i);
 samples.push(sample);
}
const summary=[];
for(const {tier} of BRACKETS)for(const phase of PHASES)for(const role of ['Tank','Damage','Support'] as const){
 const xs=samples.filter(s=>s.tier===tier&&s.phase===phase&&s.role===role);
 summary.push({
  tier,phase,role,combinations:xs.length,
  survivePct:round(mean(xs.map(x=>Number(x.teamSurvived)))*100),
  bossDefeatPct:round(mean(xs.map(x=>Number(x.bossDefeated)))*100),
  meanSquadDamage:round(mean(xs.map(x=>x.squadDamage))),
  meanInitiatorDamage:round(mean(xs.map(x=>x.ownDamage))),
  meanInitiatorEffectiveHeal:round(mean(xs.map(x=>x.ownEffectiveHeal))),
  meanInitiatorShieldApplied:round(mean(xs.map(x=>x.ownShieldsApplied))),
  meanTeamEffectiveHeal:round(mean(xs.map(x=>x.totalEffectiveHeal))),
  meanConsumedShields:round(mean(xs.map(x=>x.shieldAbsorbed))),
  meanIncomingDamage:round(mean(xs.map(x=>x.incomingDamage))),
  meanAlive:round(mean(xs.map(x=>x.alive))),
  meanRootSlams:round(mean(xs.map(x=>x.rootSlams))),
  meanSporeTicks:round(mean(xs.map(x=>x.sporeTicks))),
  meanRegrowthCasts:round(mean(xs.map(x=>x.regrowthShields))),
  meanInterrupts:round(mean(xs.map(x=>x.interrupts))),
 });
}
const counterplay=[];
for(const tier of ['T2','T4'] as const)for(const phase of PHASES)for(const role of ['Tank','Damage','Support'] as const){
 const candidate=CLASSES.find(c=>c.role===role)!.id;
 const normal=[] as Sample[],noSupport=[] as Sample[],noTank=[] as Sample[];
 for(let i=0;i<REPLICATES;i++){
  normal.push(run(candidate,tier,phase,i).sample);
  noSupport.push(run(candidate,tier,phase,i,'no_support_utility').sample);
  noTank.push(run(candidate,tier,phase,i,'no_tank_utility').sample);
 }
 counterplay.push({
  tier,phase,role,
  normalSurvivePct:round(mean(normal.map(x=>Number(x.teamSurvived)))*100),
  noSupportSurvivePct:round(mean(noSupport.map(x=>Number(x.teamSurvived)))*100),
  noTankSurvivePct:round(mean(noTank.map(x=>Number(x.teamSurvived)))*100),
  normalDamage:round(mean(normal.map(x=>x.squadDamage))),
  noSupportDamage:round(mean(noSupport.map(x=>x.squadDamage))),
  noTankDamage:round(mean(noTank.map(x=>x.squadDamage))),
  supportHeal:round(mean(normal.map(x=>x.totalEffectiveHeal))),
  mutedSupportHeal:round(mean(noSupport.map(x=>x.totalEffectiveHeal))),
  shieldUsed:round(mean(normal.map(x=>x.shieldAbsorbed))),
 });
}
assert.equal(samples.length,4*3*9*REPLICATES);
assert.equal(summary.length,36);
assert.equal(counterplay.length,18);
for(const s of samples){
 assert.ok(Number.isFinite(s.squadDamage)&&s.squadDamage>=0);
 assert.ok(s.ownDamage>=0&&s.ownEffectiveHeal>=0&&s.shieldAbsorbed>=0);
 assert.ok(s.alive>=0&&s.alive<=4);
}
console.log('WB_HOLLOWROOT_METHOD='+JSON.stringify({
 engine:'backend/src/server/combat/engine.ts simulateCombat',
 classKits:'backend/src/server/combat/content/launch-combat.ts launchPlayer',
 gear:'apps/mobile/src/core/regional-combat-fixtures.ts + game.ts effectiveStats',
 phaseProxy:'70s time-based fight (NOT authored 14-round schedule)',
 replicates:REPLICATES,totalRuns:samples.length+counterplay.length*3*REPLICATES+2,
 globalHP:false,sigils:false,accountSnapshots:false,
 limitations:['tier-relative mobile-to-engine stat adapter','fixed boss HP per bracket','no authoritative world-boss guards/weak-points','generic debuff not action-specific root','nature DoT not target %MaxHP','no war camp','no world impact grants'],
}));
for(const row of summary)console.log('WB_HOLLOWROOT_SUMMARY='+JSON.stringify(row));
for(const row of counterplay)console.log('WB_HOLLOWROOT_COUNTERPLAY='+JSON.stringify(row));
console.log('PASS Hollowroot TEST-ONLY nine-class T1-T4 engine benchmark and deterministic role counterplay');
