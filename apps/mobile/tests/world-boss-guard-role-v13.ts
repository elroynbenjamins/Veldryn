/**
 * Veldryn World Boss V13 — equipment-band Guard + role pressure DIAGNOSTIC.
 * Uses existing game's real equipment resolver and current class kits, but
 * synthetic account fixtures. No live player, production tuning or currency.
 */
import {assert} from './test-assert';
import {CLASSES} from '../src/content/classes';
import type {ClassId,GameState} from '../src/core/types';
import {regionalCombatFixture,REGIONAL_COMBAT_FIXTURES,type RegionalCombatFixtureDef} from '../src/core/regional-combat-fixtures';
import {verifyPartyEventEquippedCopyOwnershipV4} from '../../../backend/online/party-event-loadout-v4';
import {deriveOnlineCoopLoadout} from '../../../backend/online/coop-loadout';
import {combatantFromVerifiedSnapshot} from '../../../backend/src/server/combat/snapshot-adapter';
import {deriveRole} from '../../../backend/src/server/coop/role-readiness';
import {simulateWorldBossRounds,type WorldBossId,type WorldBossPhase,type WorldBossOrder,type WorldBossRoundResult} from '../../../backend/src/server/combat/world-boss-round-prototype';
import {
 proposeWorldBossGearBandProfileV13,verifyWorldBossEncounterProfileV13,
 makeWorldBossEncounterProfileV13,type WorldBossGearBandV13,
} from '../../../backend/src/server/combat/world-boss-encounter-profile-v13';
import type {CombatantDefinition} from '../../../backend/src/server/combat/types';

const BOSSES:WorldBossId[]=['hollowroot','sunscar','frostmarch'];
const PHASES:WorldBossPhase[]=['armored','exposed','enraged'];
const ORDERS:WorldBossOrder[]=['steady_assault','break_armor','hold_line'];
const STRESS=[1,2,3,4,6,8,10,12];
const EVENT='WORLD_BOSS_V13_TEST';
const t1=REGIONAL_COMBAT_FIXTURES.find(x=>x.regionId==='GREENFIELDS')!;
const t2=REGIONAL_COMBAT_FIXTURES.find(x=>x.regionId==='IRONWOOD')!;
const t4=REGIONAL_COMBAT_FIXTURES.find(x=>x.regionId==='SUNSCAR')!;
const BRACKETS:ReadonlyArray<{band:WorldBossGearBandV13;tier:string;def:RegionalCombatFixtureDef}>=[
 {band:1,tier:'T1',def:{...t1,level:8,tier:'T1'}},
 {band:2,tier:'T2',def:{...t2,level:15,tier:'T2'}},
 {band:3,tier:'T3',def:{...t4,level:29,tier:'T3'}},
 {band:4,tier:'T4',def:{...t4,level:40,tier:'T4'}},
];
const CLASS_IDS=['IRONWARDEN','WAYFINDER','RAVAGER','DAWNKEEPER'] as const satisfies readonly ClassId[];
const mean=(x:number[])=>x.reduce((a,b)=>a+b,0)/Math.max(1,x.length);
const round=(v:number)=>+v.toFixed(2);
const cache=new Map<string,CombatantDefinition>();
const serverProfiles=new Map<string,ReturnType<typeof proposeWorldBossGearBandProfileV13>>();
for(const {band,def} of BRACKETS)for(const cl of CLASSES){
 let state:GameState=regionalCombatFixture(def,'prepared',cl.id);
 state={...state,character:{...state.character!,id:'WB13_'+band+'_'+cl.id}};
 verifyPartyEventEquippedCopyOwnershipV4(state);
 const record=deriveOnlineCoopLoadout('WB13_OWNER_'+band+'_'+cl.id,state,1);
 assert.ok(record.legalEquipment&&Number.isFinite(record.combatPower));
 const actor=combatantFromVerifiedSnapshot({...record.stats,role:deriveRole(cl.id),
  level:record.combatScalingLevel??record.characterLevel},record.abilities);
 assert.equal(actor.classId,cl.id);
 cache.set(cl.id+':'+band,actor);
}
assert.equal(cache.size,CLASSES.length*BRACKETS.length);
const squad=(band:WorldBossGearBandV13)=>CLASS_IDS.map(id=>cache.get(id+':'+band)!);
function rejects(fn:()=>unknown,code:string){
 let ok=false;try{fn();}catch(e){ok=String(e).includes(code);}
 assert.ok(ok,'expected rejection '+code);
}
function recover(p:CombatantDefinition){return p.role!=='support'?p:{
 ...p,abilities:p.abilities.filter(a=>a.effects.every(e=>!['heal','hot','shield','cleanse'].includes(e.kind))),
};}
function survivors(r:WorldBossRoundResult){return Object.values(r.participants).filter(p=>p.survived).length;}
function ownerMetric(r:WorldBossRoundResult,role:'tank'|'support',field:'tankProtection'|'effectiveHealing'|'shieldConsumed'){
 const found=Object.entries(r.participants).find(([id])=>id===r.events.find(e=>e.type==='battle_end')?.actorId);
 // We always use trusted role IDs by the actual squad in the caller, not a client role claim.
 void found;
 return Object.entries(r.participants).filter(([id])=>id.startsWith(role==='tank'?'P_Ironwarden':'P_Dawnkeeper'))
  .reduce((n,[,p])=>n+p[field],0);
}
let baselineFights=0,stressFights=0,roleComparisons=0,downed=0,measuredRecovery=0,measuredInterception=0,telegraphedWards=0;
let positiveLowestBand=0,supportSurvivalWins=0,tankSurvivalWins=0,firstDeathAt:number|null=null;
const summaries=[] as Array<{boss:WorldBossId;phase:WorldBossPhase;tier:string;
 band:number;attack:number;guard:number;unguarded:number;meanDamage:number;
 meanAlive:number;recovery:number;protection:number;stressDowns:number;
 supportSurvivalWin:number;tankSurvivalWin:number}>;
for(const boss of BOSSES)for(const phase of PHASES)for(const bracket of BRACKETS){
 const players=squad(bracket.band);
 const attack=mean(players.map(p=>p.stats.attackPower));
 const defense=mean(players.map(p=>p.stats.defense));
 // Precisely the same test reference squad/gear produces an unguarded estimate.
 // A fixed enemy attack/defense prevents combat gear from scaling the enemy.
 const unguarded=simulateWorldBossRounds({boss,phase,players,order:'steady_assault',
  seed:'WB13:UNGUARDED:'+boss+':'+phase+':'+bracket.band,
  testOnlyFixedBossAttack:attack*1.1,testOnlyFixedBossDefense:defense*.55,
  testOnlyFixedGuardMax:0,
 }).bossHpDamage;
 assert.ok(unguarded>0,'reference squad must generate measurable unguarded damage');
 const profile=proposeWorldBossGearBandProfileV13({
  eventId:EVENT,boss,phase,gearBand:bracket.band,
  referenceAttack:attack,referenceDefense:defense,
  referenceUnguardedHpDamage:unguarded,
 });
 verifyWorldBossEncounterProfileV13(profile,boss,phase,EVENT);
 serverProfiles.set([boss,phase,bracket.band].join(':'),profile);
 assert.ok(profile.guardMax<unguarded*.3+.02,'guard budget must stay bounded by an attackable reference');
 const actual=[] as WorldBossRoundResult[];
 for(const order of ORDERS)for(let seed=0;seed<2;seed++){
  const key='WB13:BASE:'+boss+':'+phase+':'+bracket.band+':'+order+':'+seed;
  const result=simulateWorldBossRounds({boss,phase,players,order,seed:key,serverEncounterProfile:profile});
  actual.push(result);baselineFights++;
  assert.ok(result.bossHpDamage>=0&&Number.isFinite(result.bossHpDamage));
  assert.ok(result.roundsCompleted>=1&&result.roundsCompleted<=14);
 }
 if(bracket.band===1&&phase==='armored'&&mean(actual.map(r=>r.bossHpDamage))>0)positiveLowestBand++;
 let stressDowns=0,localSupportWins=0,localTankWins=0;
 for(const scale of STRESS)for(let seed=0;seed<2;seed++){
  const key='WB13:STRESS:'+boss+':'+phase+':'+bracket.band+':'+scale+':'+seed;
  const params={boss,phase,seed:key,serverEncounterProfile:profile,testOnlyStressMultiplier:scale};
  const normal=simulateWorldBossRounds({...params,players});
  const noSupport=simulateWorldBossRounds({...params,players:players.map(recover)});
  const noTank=simulateWorldBossRounds({...params,players,testOnlyDisableTankInterception:true});
  stressFights+=3;roleComparisons++;
  const intact=survivors(normal),muted=survivors(noSupport),unprotected=survivors(noTank);
  if(intact>muted){supportSurvivalWins++;localSupportWins++;}
  if(intact>unprotected){tankSurvivalWins++;localTankWins++;}
  if(intact<4){downed++;stressDowns++;firstDeathAt=firstDeathAt===null?scale:Math.min(firstDeathAt,scale);}
  const healer=normal.participants[players[3].id];
  const tank=normal.participants[players[0].id];
  measuredRecovery+=healer.effectiveHealing+healer.shieldConsumed;
  measuredInterception+=tank.tankProtection;
  telegraphedWards+=normal.events.filter(e=>e.type==='mitigate'&&
   e.abilityId==='TANK_INTERCEPT'&&e.detail==='telegraphed_ward'&&e.amount!>0).length;
  assert.equal(noSupport.participants[players[3].id].effectiveHealing,0);
  assert.equal(noSupport.participants[players[3].id].shieldConsumed,0);
  assert.equal(noTank.participants[players[0].id].tankProtection,0);
  assert.ok(normal.events.every(e=>e.round>=1&&e.round<=14));
 }
 summaries.push({boss,phase,tier:bracket.tier,band:bracket.band,
  attack:round(profile.attack),guard:round(profile.guardMax),unguarded:round(unguarded),
  meanDamage:round(mean(actual.map(r=>r.bossHpDamage))),
  meanAlive:round(mean(actual.map(survivors))),
  recovery:round(mean(actual.map(r=>r.participants[players[3].id].effectiveHealing+r.participants[players[3].id].shieldConsumed))),
  protection:round(mean(actual.map(r=>r.participants[players[0].id].tankProtection))),
  stressDowns,supportSurvivalWin:localSupportWins,tankSurvivalWin:localTankWins});
}
// Compare every real Tank kit and both real Support kits against the same
// server-frozen encounter profile. This is NOT a class balance verdict.
const tankVariants=['IRONWARDEN','BASTION','DREADGUARD'] as const satisfies readonly ClassId[];
const supportVariants=['DAWNKEEPER','STONECALLER'] as const satisfies readonly ClassId[];
type RoleKitMetric={samples:number;alive:number;recovery:number;shields:number;protection:number;damage:number};
const emptyKit=():RoleKitMetric=>({samples:0,alive:0,recovery:0,shields:0,protection:0,damage:0});
const tankKits:Record<(typeof tankVariants)[number],RoleKitMetric>={
 IRONWARDEN:emptyKit(),BASTION:emptyKit(),DREADGUARD:emptyKit(),
};
const supportKits:Record<(typeof supportVariants)[number],RoleKitMetric>={
 DAWNKEEPER:emptyKit(),STONECALLER:emptyKit(),
};
let roleKitFights=0;
for(const boss of BOSSES)for(const phase of PHASES)for(const {band} of BRACKETS){
 const profile=serverProfiles.get([boss,phase,band].join(':'))!;
 assert.ok(profile,'frozen per-band boss profile must exist');
 for(const tankId of tankVariants)for(const supportId of supportVariants){
  const members=[tankId,'WAYFINDER','RAVAGER',supportId].map(id=>cache.get(id+':'+band)!);
  const fight=simulateWorldBossRounds({
   boss,phase,seed:'WB13:ROLE_KITS:'+boss+':'+phase+':'+band+':'+tankId+':'+supportId,
   players:members,serverEncounterProfile:profile,testOnlyStressMultiplier:6,
  });
  assert.equal(members.filter(p=>p.role==='tank').length,1);
  assert.equal(members.filter(p=>p.role==='damage').length,2);
  assert.equal(members.filter(p=>p.role==='support').length,1);
  const support=fight.participants[members[3].id],tank=fight.participants[members[0].id];
  for(const out of [tankKits[tankId],supportKits[supportId]]){
   out.samples++;out.alive+=survivors(fight);
   out.recovery+=support.effectiveHealing+support.shieldConsumed;
   out.shields+=support.shieldConsumed;out.protection+=tank.tankProtection;
   out.damage+=fight.bossHpDamage;
  }
  roleKitFights++;
 }
}
assert.equal(roleKitFights,3*3*4*3*2,'each real Tank/Support class pairing at stress 6');
assert.ok(supportKits.DAWNKEEPER.recovery>0&&supportKits.STONECALLER.shields>0,
 'Dawnkeeper recovery and Stonecaller consumed shields must both contribute in real fights');
assert.ok(tankVariants.every(id=>tankKits[id].protection>0),
 'every Tank class must genuinely prevent HP across the complete authored boss matrix');
assert.equal(baselineFights,3*3*4*3*2);
assert.equal(roleComparisons,3*3*4*STRESS.length*2);
assert.equal(stressFights,roleComparisons*3);
assert.equal(positiveLowestBand,3,'every T1 armored boss needs to accept actual HP damage');
assert.ok(measuredRecovery>0&&measuredInterception>0,'real Tank/Support ledgers must be nonzero');
assert.ok(telegraphedWards>0,'V13 Tank must actually respond to script-backed telegraphed boss attacks');
assert.ok(downed>0,'synthetic pressure must reveal some deaths; else review model before tuning');
// No assertion that removing a role ALWAYS worsens survival: hard RNG
// and timing differences mean matched-seed counterfactuals are not causal.
const one=makeWorldBossEncounterProfileV13({
 eventId:EVENT,configVersion:'WB13_TEST_ONLY',boss:'hollowroot',phase:'armored',
 gearBand:1,attack:120,defense:50,guardMax:250,
});
const tampered=structuredClone(one);
tampered.guardMax=999999;
rejects(()=>verifyWorldBossEncounterProfileV13(tampered,'hollowroot','armored',EVENT),'invalid_or_foreign_profile');
rejects(()=>verifyWorldBossEncounterProfileV13(one,'frostmarch','armored',EVENT),'invalid_or_foreign_profile');
rejects(()=>verifyWorldBossEncounterProfileV13(one,'hollowroot','enraged',EVENT),'invalid_or_foreign_profile');
rejects(()=>verifyWorldBossEncounterProfileV13(one,'hollowroot','armored','OTHER_EVENT'),'invalid_or_foreign_profile');
rejects(()=>simulateWorldBossRounds({boss:'hollowroot',phase:'armored',
 players:squad(1),seed:'bad_stress',testOnlyStressMultiplier:2}),'invalid_test_stress');
for(const row of summaries)console.log('WB_V13_BAND_GUARD='+JSON.stringify(row));
console.log('WB_V13_ROLE_KITS='+JSON.stringify({
 roleKitFights,stressMultiplierTestOnly:6,
 tanks:Object.fromEntries(tankVariants.map(id=>[id,{...tankKits[id],
  avgAlive:round(tankKits[id].alive/tankKits[id].samples),
  avgProtection:round(tankKits[id].protection/tankKits[id].samples)}])),
 supports:Object.fromEntries(supportVariants.map(id=>[id,{...supportKits[id],
  avgAlive:round(supportKits[id].alive/supportKits[id].samples),
  avgRecovery:round(supportKits[id].recovery/supportKits[id].samples)}])),
 realClassKits:true,productionTierBalanceApproved:false,liveWorldBossEnabled:false,
}));
console.log('WB_V13_STRESS_MATRIX='+JSON.stringify({
 baselineFights,stressFights,roleComparisons,downed,firstDeathAt,
 supportSurvivalWins,tankSurvivalWins,measuredRecovery:round(measuredRecovery),
 measuredInterception:round(measuredInterception),telegraphedWards,positiveLowestBand,
 realEquipmentRules:true,actualLiveAccountReads:0,
 approvedBossTuning:false,liveWorldBossEnabled:false,
}));
