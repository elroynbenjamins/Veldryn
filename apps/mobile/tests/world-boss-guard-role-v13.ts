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
let baselineFights=0,stressFights=0,roleComparisons=0,downed=0,measuredRecovery=0,measuredInterception=0;
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
assert.equal(baselineFights,3*3*4*3*2);
assert.equal(roleComparisons,3*3*4*STRESS.length*2);
assert.equal(stressFights,roleComparisons*3);
assert.equal(positiveLowestBand,3,'every T1 armored boss needs to accept actual HP damage');
assert.ok(measuredRecovery>0&&measuredInterception>0,'real Tank/Support ledgers must be nonzero');
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
console.log('WB_V13_STRESS_MATRIX='+JSON.stringify({
 baselineFights,stressFights,roleComparisons,downed,firstDeathAt,
 supportSurvivalWins,tankSurvivalWins,measuredRecovery:round(measuredRecovery),
 measuredInterception:round(measuredInterception),positiveLowestBand,
 realEquipmentRules:true,actualLiveAccountReads:0,
 approvedBossTuning:false,liveWorldBossEnabled:false,
}));
