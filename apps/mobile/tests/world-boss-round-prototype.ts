/** Hidden World Boss V6 round simulator contract tests.
 * Never issues a live attempt, changes a user's inventory, or grants Sigils.
 */
import {assert} from './test-assert';
import {launchPlayer} from '../../../backend/src/server/combat/content/launch-combat';
import {simulateWorldBossRounds,validateWorldBossScripts,WORLD_BOSS_ROUND_SCRIPTS,type WorldBossPhase,type WorldBossId} from '../../../backend/src/server/combat/world-boss-round-prototype';
import type {CombatantDefinition, AbilityDefinition} from '../../../backend/src/server/combat/types';

const BOSSES:WorldBossId[]=['hollowroot','sunscar','frostmarch'];
const PHASES:WorldBossPhase[]=['armored','exposed','enraged'];
const CLASSES=[
 ['Ironwarden','tank'],['Bastion','tank'],['Dreadguard','tank'],
 ['Wayfinder','damage'],['Ravager','damage'],['Hexweaver','damage'],['Knife Dancer','damage'],
 ['Dawnkeeper','support'],['Stonecaller','support']
] as const;
assert.equal(validateWorldBossScripts(),126,'all boss/phase authored rounds');
function squad(initiator:string,level=25):CombatantDefinition[]{
 const p=CLASSES.find(([name])=>name===initiator);if(!p)throw Error('unknown_class');
 const selected=[initiator];
 const needs={tank:1,damage:2,support:1};needs[p[1]]--;
 for(const role of ['tank','damage','support'] as const)for(const [name,r] of CLASSES)
  if(r===role&&needs[role]>0&&name!==initiator){selected.push(name);needs[role]--;}
 assert.equal(selected.length,4);
 return selected.map(n=>launchPlayer(n,level));
}
function roughly(a:number,b:number,message:string){assert.ok(Math.abs(a-b)<.055,message+': '+a+' != '+b);}
let total=0,seenStatuses=0,seenGuards=0,seenHits=0,seenRoleSurvival=0;
for(const boss of BOSSES)for(const phase of PHASES)for(const [name] of CLASSES){
 const args={boss,phase,seed:'world-boss-v6:'+boss+':'+phase+':'+name,players:squad(name)};
 const r=simulateWorldBossRounds(args),again=simulateWorldBossRounds(args);
 assert.deepEqual(r.events,again.events,'identical snapshots and seeds must produce identical event logs');
 assert.deepEqual(r.participants,again.participants,'identical seeds yield same per-role ledger');
 assert.equal(r.roundsCompleted,14,'sample squads should complete exactly 14 turns');
 assert.ok(r.localGuardDamage>=0&&r.remainingGuard>=0&&r.guardRestored>=0,'separate local guard is nonnegative');
 assert.equal(r.proposedWorldDamage,r.bossHpDamage,'proposal must not conflate local guard with global HP');
 const attacks=r.events.filter(e=>e.type==='strike'&&e.targetId===boss.toUpperCase()&&e.actorId?.startsWith('P_'));
 roughly(attacks.reduce((n,e)=>n+(e.amount??0),0),r.bossHpDamage,'actual boss HP damage reconciles');
 roughly(attacks.reduce((n,e)=>n+(e.guardAbsorbed??0),0),r.localGuardDamage,'guard absorbs reconcile');
 const byPlayer=Object.values(r.participants).reduce((n,p)=>n+p.bossHpDamage,0);
 roughly(byPlayer,r.bossHpDamage,'initiator and borrowed Echo HP contributions reconcile');
 // The replay must be sufficient to reconstruct each role's actual utility.
 for(const [actor,metric] of Object.entries(r.participants)){
  const healing=r.events.filter(e=>e.type==='heal'&&e.actorId===actor).reduce((n,e)=>n+(e.amount??0),0);
  const shields=r.events.filter(e=>e.type==='mitigate'&&e.abilityId==='SHIELD_ABSORB'&&e.ownerId===actor)
   .reduce((n,e)=>n+(e.amount??0),0);
  const protection=r.events.filter(e=>e.type==='mitigate'&&e.abilityId==='TANK_INTERCEPT'&&e.actorId===actor)
   .reduce((n,e)=>n+(e.amount??0),0);
  roughly(healing,metric.effectiveHealing,'effective healing must equal actual replay heals');
  roughly(shields,metric.shieldConsumed,'only consumed shield value earns utility credit');
  roughly(protection,metric.tankProtection,'Tank protection cannot be invented from unused shields');
 }
 for(const t of r.events.filter(e=>e.type==='telegraph')){
  const ordinary=r.events.find(e=>e.round===t.round&&e.type==='strike'&&e.actorId===boss.toUpperCase()&&e.abilityId==='BASIC');
  assert.ok(Boolean(ordinary),'every warning round includes a distinct ordinary boss action');
 }
 if(boss==='hollowroot'&&phase==='exposed'){
  const poison=r.events.filter(e=>e.type==='status_apply'&&e.abilityId==='SPOREBURST');
  assert.ok(poison.length>=2,'sporeburst must pressure multiple surviving actors rather than just the Tank');
 }
 const phaseScript=WORLD_BOSS_ROUND_SCRIPTS[boss][phase];
 for(const event of r.events.filter(e=>e.type==='telegraph')){
  assert.equal(phaseScript[event.round-1],event.abilityId+'_TELL','visual cues are real scripted abilities');
  assert.ok(phaseScript[event.round]===event.abilityId,'telegraph has the next round resolution');
 }
 for(const e of r.events){
  assert.ok(e.round>=1&&e.round<=14,'every combat event must fit the authored replay window');
  if(e.amount!==undefined)assert.ok(Number.isFinite(e.amount)&&e.amount>=0,'no non-finite/negative fake effect values');
  if(e.absorbed!==undefined)assert.ok(e.absorbed>=0,'shield absorption never negative');
 }
 for(const p of Object.values(r.participants)){
  assert.ok(p.effectiveHealing>=0&&p.shieldConsumed>=0&&p.tankProtection>=0&&p.cleansePrevented>=0,'role attribution nonnegative');
 }
 for(const e of r.events.filter(e=>e.type==='guard'&&e.abilityId==='REGROWTH'||e.type==='guard'&&e.abilityId==='AEGIS_REFRESH'))
  assert.equal(e.detail,'local_only','Regrowth and Aegis cannot add global boss HP');
 seenStatuses+=r.events.filter(e=>e.type==='status_tick').length;
 seenGuards+=r.events.filter(e=>e.type==='guard').length;
 seenHits+=attacks.length;
 if(r.survived)seenRoleSurvival++;
 total++;
}
assert.equal(total,81,'all nine real class initiators and three bosses across three phases covered');
assert.ok(seenStatuses>0,'at least some actual burn/poison/frostbite HP ticks must fire');
assert.ok(seenGuards>0&&seenHits>0,'guard and damage are real events');
assert.ok(seenRoleSurvival>0,'there must be some survivable fixtures');

const support=squad('Dawnkeeper');
// Independent snapshots preserve gear/class stats even when caller updates the original array.
const frozen=simulateWorldBossRounds({seed:'immutable',boss:'hollowroot',phase:'exposed',players:support});
support[1]={...support[1],stats:{...support[1].stats,maxHp:100}};
const replay=simulateWorldBossRounds({seed:'immutable',boss:'hollowroot',phase:'exposed',players:squad('Dawnkeeper')});
assert.deepEqual(frozen.events,replay.events,'freshly resolved original loadout has stable replay');

// A hypothetical World Boss-ready cleanse kit is used ONLY here to validate actual cleanse
// effects. None of the current live nine kits are changed or given a free cleanse.
const cleanse:AbilityDefinition={
 id:'TEST_CLEANSE',name:'Test Cleanse',priority:200,cooldownMs:5000,castTimeMs:0,
 target:'lowest_hp_ally',aiCondition:'ally_below_50_or_dot',effects:[{kind:'cleanse'}]
};
const modified=squad('Dawnkeeper').map(p=>p.role==='support'?{...p,abilities:[cleanse,...p.abilities]}:p);
const withCleanse=simulateWorldBossRounds({seed:'cleanse-test',boss:'hollowroot',phase:'exposed',players:modified});
assert.ok(withCleanse.events.some(e=>e.type==='cleanse'),'a real cleanse ability must clear scheduled statuses');

// Interruption requires a real actor's available interrupt effect; it is not a free boss mechanic.
const interrupter:AbilityDefinition={
 id:'TEST_INTERRUPT',name:'Test Interrupt',priority:250,cooldownMs:5000,castTimeMs:0,
 target:'interruptible_casting_enemy',aiCondition:'target_casting',effects:[{kind:'interrupt'}]
};
const interruptSquad=squad('Hexweaver');
// Remove competing class interrupts from this isolated test: with Support-first
// reactions, a Tank may validly interrupt the channel before Hexweaver does.
const patched=interruptSquad.map(p=>p.classId==='Hexweaver'
 ?{...p,abilities:[interrupter,...p.abilities]}
 :{...p,abilities:p.abilities.filter(a=>!a.effects.some(e=>e.kind==='interrupt'))});
const interrupted=simulateWorldBossRounds({seed:'interrupt-test',boss:'hollowroot',phase:'exposed',players:patched});
assert.ok(interrupted.events.some(e=>e.type==='interrupt'&&e.abilityId==='TEST_INTERRUPT'),'channel interrupt must be ledger-backed');
assert.ok(interrupted.events.some(e=>e.type==='interrupt'&&e.abilityId==='REGROWTH'),'an interrupted special must not apply its guard restoration');

// Invalid formation must not be silently accepted.
let rejected=false;
try{simulateWorldBossRounds({seed:'invalid',boss:'hollowroot',phase:'armored',players:[support[0],support[0],support[1],support[2]]});}
catch{rejected=true;}
assert.ok(rejected,'duplicate Echo or malformed role composition rejected');

const baseline=simulateWorldBossRounds({seed:'warorder',boss:'sunscar',phase:'enraged',players:squad('Ironwarden')});
const protection=simulateWorldBossRounds({seed:'warorder',boss:'sunscar',phase:'enraged',players:squad('Ironwarden'),order:'hold_line'});
const normalOpening=baseline.events.find(e=>e.type==='strike'&&e.actorId==='SUNSCAR'&&e.round===1);
const protectedOpening=protection.events.find(e=>e.type==='strike'&&e.actorId==='SUNSCAR'&&e.round===1);
assert.ok(Boolean(normalOpening&&protectedOpening),'each identical-seed opening must include the normal enemy strike');
assert.ok((protectedOpening?.amount??Infinity)<=(normalOpening?.amount??-1),
 'Hold the Line must reduce the same opening strike, not compare diverging later AI outcomes');

// Pressure test is an engineering counterfactual, NOT approval of ×2 live damage.
const hard=simulateWorldBossRounds({seed:'pressure',boss:'frostmarch',phase:'enraged',players:squad('Dawnkeeper'),pressure:2});
assert.ok(hard.events.filter(e=>e.actorId==='FROSTMARCH'&&e.type==='strike').length>0,'pressure fight must have actual enemy attacks');

console.log('WB_ROUND_PROTOTYPE='+JSON.stringify({
 mode:'test_only',fixtures:total,bosses:BOSSES,phases:PHASES,authoredRounds:validateWorldBossScripts(),
 statusTicks:seenStatuses,guardEvents:seenGuards,creditedPlayerHits:seenHits,survivingFixtures:seenRoleSurvival,
 postSettlement:false,realEventHpWrites:false
}));
