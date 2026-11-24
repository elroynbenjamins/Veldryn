/** The exact same boundary suite runs against simple isolated fixtures and real
 * original Forge compiled actors. Neither confers ownership of candidate sets.
 */
import {strict as assert} from 'node:assert';
import type {CombatInput,CombatantDefinition} from '../../types';
import {issueEq2PrivateHitQaV22,authorizeEq2PrivateHitQaV22,type Eq2PrivateHitIdV22} from '../equipment-private-hit-qa-v22';
export function runPrivateConditionalBoundaries(ravager:CombatantDefinition,ironwarden:CombatantDefinition,boss:CombatantDefinition){
// V22 isolated event boundary tests (not reported as full combat runs).
{
 const compiled={actor:ravager};
 const i:CombatInput={seed:'QA_V22_BOUNDARY',players:[compiled.actor],enemies:[boss]};
 const winter='EQ2_DUNGEON_ROOTBOUND_T2_WEAPON_RAVAGER' as const;
 const avalanche='eq2_t5_avalanche:6' as const;
 const token=issueEq2PrivateHitQaV22(i,compiled.actor.id,[winter,avalanche],()=>true);
 const runtime=authorizeEq2PrivateHitQaV22(i,token)!;
 const event={now:1000,actorId:compiled.actor.id,targetId:boss.id,abilityId:'AUTHORED_SKILL',
  originalClassAbility:true,direct:true,physical:true,nontrue:true,sourceAlive:true,targetAlive:true,
  targetHp:290,targetMaxHp:1000,shield:0,raw:100};
 for(const change of [{direct:false},{originalClassAbility:false},{nontrue:false},{sourceAlive:false},{targetAlive:false},
  {abilityId:'BASIC'},{abilityId:'GEM_X'},{targetHp:350},{shield:100},{actorId:'OTHER'}]){
  assert.equal(runtime.beforeDirectHit({...event,...change}).raw,100);
 }
 const active=runtime.beforeDirectHit(event);
 assert.equal(active.bonusPct,15);assert.equal(active.activated.length,2);
 assert.ok(Math.abs(active.raw-115)<.000001);
 assert.equal(runtime.beforeDirectHit({...event,now:20999}).raw,100);
 assert.equal(runtime.beforeDirectHit({...event,now:21000,physical:false}).bonusPct,7);
 assert.equal(authorizeEq2PrivateHitQaV22(i),undefined);
 assert.throws(()=>authorizeEq2PrivateHitQaV22({...i,seed:'CHANGED'},token),/invalid_authority/);
 assert.throws(()=>authorizeEq2PrivateHitQaV22(i,{} as typeof token),/invalid_authority/);
 assert.throws(()=>issueEq2PrivateHitQaV22(i,compiled.actor.id,[winter],()=>false),/fixture_unverified/);
 assert.throws(()=>issueEq2PrivateHitQaV22(i,compiled.actor.id,[winter,'EQ2_DUNGEON_OBSERVATORY_T4_WEAPON_RAVAGER'],()=>true),/fixture_scope/);
 console.log('PASS: V22 private current-hit phase, HP threshold, physical scope, shared family, shield exclusion and exact-input token tests');
}

// V23 event-phase tests: exercise the exact engine receipt contract.
{
 const compiled={actor:ravager};
 const input:CombatInput={seed:'QA_V23_CHARGE_BOUNDARY',players:[compiled.actor],enemies:[boss]};
 const follow='eq2_t5_avalanche:4' as const, talons='eq2_combo_t5_glacier_talons:2' as const, thorn='eq2_dungeon_rootbound_t2_thornstrider:4' as const;
 const runtime=(ids:readonly Eq2PrivateHitIdV22[])=>authorizeEq2PrivateHitQaV22(input,issueEq2PrivateHitQaV22(input,compiled.actor.id,ids,()=>true))!;
 const hit=(now:number,abilityId='AUTHORED_SKILL',targetId=boss.id)=>({now,actorId:compiled.actor.id,targetId,abilityId,
  originalClassAbility:abilityId!=='BASIC',direct:true,physical:true,nontrue:true,sourceAlive:true,targetAlive:true,targetHp:500,targetMaxHp:1000,shield:0,raw:100});
 const r=runtime([follow,talons]);const event=hit(1000);
 assert.deepEqual(r.afterDirectHit(event,100),[],'unpaired post receipt cannot generate charge');
 assert.equal(r.beforeDirectHit(event).bonusPct,0);
 assert.deepEqual(r.afterDirectHit(event,100),[follow,talons]);
 assert.deepEqual(r.afterDirectHit(event,100),[],'duplicate post denied');
 assert.equal(r.beforeDirectHit(hit(1000,'BASIC')).bonusPct,0,'same tick cannot consume');
 assert.equal(r.beforeDirectHit({...hit(2000,'BASIC'),shield:100}).bonusPct,0);
 assert.equal(r.beforeDirectHit(hit(2000)).bonusPct,0,'wrong ability does not consume');
 const consume=hit(2001,'BASIC');
 assert.equal(r.beforeDirectHit(consume).bonusPct,12);assert.equal(r.beforeDirectHit(consume).bonusPct,0);
 assert.deepEqual(r.afterDirectHit(consume,112),[]);assert.equal(r.beforeDirectHit(hit(2002,'BASIC')).bonusPct,0);
 const early=hit(3000);r.beforeDirectHit(early);assert.deepEqual(r.afterDirectHit(early,100),[]);
 const expired=runtime([follow,talons]);const start=hit(1000);expired.beforeDirectHit(start);expired.afterDirectHit(start,100);
 assert.equal(expired.beforeDirectHit(hit(6000,'BASIC')).bonusPct,6,'Talonstrike expires at 5 seconds; Follow-Through at 6');
 assert.equal(expired.beforeDirectHit(hit(7000,'BASIC')).bonusPct,0);
 const seq=runtime([thorn]);
 const record=(e:ReturnType<typeof hit>)=>{seq.beforeDirectHit(e);return seq.afterDirectHit(e,100);};
 assert.deepEqual(record(hit(1000)),[]);
 seq.miss(compiled.actor.id,'AUTHORED_SKILL');
 assert.deepEqual(record(hit(2000)),[]);
 assert.deepEqual(record(hit(3000,'AUTHORED_SKILL','OTHER')),[]);
 assert.deepEqual(record(hit(4000)),[]);
 assert.deepEqual(record(hit(5000)),[thorn]);
 assert.equal(seq.beforeDirectHit(hit(5000)).bonusPct,0);
 assert.equal(seq.beforeDirectHit(hit(5100,'AUTHORED_SKILL','OTHER')).bonusPct,0);
 assert.equal(seq.beforeDirectHit(hit(5200)).bonusPct,6);
 assert.equal(seq.beforeDirectHit(hit(5300)).bonusPct,0);
 const noLoss=runtime([follow]);const blocked=hit(1000);noLoss.beforeDirectHit(blocked);assert.deepEqual(noLoss.afterDirectHit(blocked,0),[]);
 assert.equal(noLoss.beforeDirectHit(hit(2000,'BASIC')).bonusPct,0);
 console.log('PASS: V23 one-use charge earning, expiry, same-tick exclusion, cooldown, target streak, missed-hit reset and duplicate receipt negatives');
}

// V24 defensive hit phase and strongest-only temporary reduction tests.
{
 const compiled={actor:ironwarden};
 const input:CombatInput={seed:'QA_V24_DEFENSE_BOUNDARY',players:[compiled.actor],enemies:[boss]};
 const helio='eq2_dungeon_observatory_t4_helioguard:4' as const,stone='eq2_combo_t5_stonewinter_frame:2' as const,rime='eq2_dungeon_shiverlake_t5_rimevanguard:4' as const;
 const runtime=(ids:readonly Eq2PrivateHitIdV22[])=>authorizeEq2PrivateHitQaV22(input,issueEq2PrivateHitQaV22(input,compiled.actor.id,ids,()=>true))!;
 const hit=(now:number)=>({now,actorId:boss.id,targetId:compiled.actor.id,abilityId:'BASIC',originalEnemyAbility:true,
  direct:true,physical:true,nontrue:true,sourceAlive:true,targetAlive:true,targetHp:500,targetMaxHp:1000,shield:0,raw:100});
 const r=runtime([helio,stone,rime]),start=hit(1000);
 assert.deepEqual(r.afterIncomingHit(start,100),[]);
 assert.equal(r.beforeIncomingHit(start).raw,100);assert.deepEqual(r.afterIncomingHit(start,70),[helio,stone,rime]);
 assert.deepEqual(r.afterIncomingHit(start,70),[]);
 assert.equal(r.beforeIncomingHit(hit(1000)).reductionPct,0);
 for(const change of [{nontrue:false},{originalEnemyAbility:false},{abilityId:'V2_PROC'},{targetId:'OTHER'}])
  assert.equal(r.beforeIncomingHit({...hit(2000),...change}).reductionPct,0);
 assert.equal(r.beforeIncomingHit({...hit(2000),direct:false}).reductionPct,6);
 const overlap=hit(2100);assert.equal(r.beforeIncomingHit(overlap).reductionPct,6);assert.equal(r.beforeIncomingHit(overlap).reductionPct,0);
 assert.equal(r.beforeIncomingHit(hit(6000)).reductionPct,5);
 assert.equal(r.beforeIncomingHit(hit(6100)).reductionPct,4);
 assert.equal(r.beforeIncomingHit(hit(6200)).reductionPct,0);
 const weak=runtime([helio]);const small=hit(1000);weak.beforeIncomingHit(small);assert.deepEqual(weak.afterIncomingHit(small,59),[]);
 const exact=hit(2000);weak.beforeIncomingHit(exact);assert.deepEqual(weak.afterIncomingHit(exact,60),[helio]);
 assert.equal(weak.beforeIncomingHit({...hit(2500),shield:100}).reductionPct,0);
 assert.equal(weak.beforeIncomingHit({...hit(2600),direct:false}).reductionPct,0);
 assert.equal(weak.beforeIncomingHit(hit(8000)).reductionPct,0);
 const fatal=runtime([rime]),dead={...hit(1000),targetHp:70};
 fatal.beforeIncomingHit(dead);assert.deepEqual(fatal.afterIncomingHit(dead,70),[]);
 const periodic={...hit(2000),direct:false};fatal.beforeIncomingHit(periodic);assert.deepEqual(fatal.afterIncomingHit(periodic,100),[]);
 assert.throws(()=>issueEq2PrivateHitQaV22(input,compiled.actor.id,['eq2_t5_avalanche:4'],()=>true),/fixture_scope/);
 console.log('PASS: V24 actual HP thresholds, incoming pre/post receipts, strongest-only mitigation, one-use versus timed, expiry and unauthorized damage exclusions');
}


 // V25: timed Defense/Haste is an encounter-local overlay, not frozen gear mutation.
 {
 const compiled={actor:ironwarden};
 const input:CombatInput={seed:'QA_V25_TIMED_BOUNDARY',players:[compiled.actor],enemies:[boss]};
 const oath='eq2_t4_oathplate:4' as const, riposte='EQ2_DUNGEON_OBSERVATORY_T4_WEAPON_IRONWARDEN' as const, brace='eq2_t4_bastionmail:4' as const, haste='eq2_combo_t5_runeforge_link:2' as const;
 const runtime=(ids:readonly Eq2PrivateHitIdV22[])=>authorizeEq2PrivateHitQaV22(input,issueEq2PrivateHitQaV22(input,compiled.actor.id,ids,()=>true))!;
 const hit=(now:number)=>({now,actorId:boss.id,targetId:compiled.actor.id,abilityId:'BASIC',originalEnemyAbility:true,mitigated:true,
 direct:true,physical:true,nontrue:true,sourceAlive:true,targetAlive:true,targetHp:500,targetMaxHp:1000,shield:0,raw:100});
 const r=runtime([oath,riposte,brace]),start=hit(1000);
 r.beforeIncomingHit(start);assert.deepEqual(r.afterIncomingHit(start,50),[oath,riposte,brace]);
 assert.deepEqual(r.afterIncomingHit(start,50),[]);
 assert.equal(r.timedStat(compiled.actor.id,1000,'defense').pct,0);
 assert.equal(r.timedStat(compiled.actor.id,1001,'defense').pct,4.4);
 assert.equal(r.timedStat('OTHER',1001,'defense').pct,0);
 assert.equal(r.timedStat(compiled.actor.id,6999,'defense').pct,4.4);
 assert.equal(r.timedStat(compiled.actor.id,7000,'defense').pct,0);
 const early=hit(8000);r.beforeIncomingHit(early);assert.deepEqual(r.afterIncomingHit(early,100),[]);
 const ready=hit(19000);r.beforeIncomingHit(ready);assert.deepEqual(r.afterIncomingHit(ready,50),[oath,brace]);
 const h=runtime([haste]);
 const heal={now:1000,actorId:compiled.actor.id,targetId:compiled.actor.id,abilityId:'AUTHORED_HEAL',originalClassHeal:true,actualHeal:50};
 assert.deepEqual(h.afterEffectiveHeal({...heal,actualHeal:0}),[]);
 assert.deepEqual(h.afterEffectiveHeal({...heal,originalClassHeal:false}),[]);
 assert.deepEqual(h.afterEffectiveHeal(heal),[haste]);
 assert.deepEqual(h.afterEffectiveHeal(heal),[]);
 assert.equal(h.timedStat(compiled.actor.id,1000,'haste').pct,0);
 assert.equal(h.timedStat(compiled.actor.id,1001,'haste').pct,2);
 assert.equal(h.timedStat(compiled.actor.id,7000,'haste').pct,0);
 const outgoing={now:19000,actorId:compiled.actor.id,targetId:boss.id,abilityId:'AUTHORED_SKILL',originalClassAbility:true,
 direct:true,physical:true,nontrue:true,sourceAlive:true,targetAlive:true,targetHp:500,targetMaxHp:1000,shield:0,raw:100};
 h.beforeDirectHit(outgoing);assert.deepEqual(h.afterDirectHit(outgoing,100),[haste]);
 assert.equal(h.timedStat(compiled.actor.id,19001,'haste').pct,2);
 assert.throws(()=>runtime(['eq2_t1_oathplate:4',oath]),/fixture_scope/);
 assert.throws(()=>runtime(['EQ2_DUNGEON_ROOTBOUND_T2_WEAPON_IRONWARDEN',riposte]),/fixture_scope/);
 console.log('PASS: V25 timed defense and haste boundary, strongest stat, source family cooldown, exact expiry, no duplicate or same-tick benefit');
 }


// V26 independent equipment shield ledger: no legacy shield state mutation.
{
 const compiled={actor:ironwarden};
 const input:CombatInput={seed:'QA_V26_SHIELD_BOUNDARY',players:[compiled.actor],enemies:[boss]};
 const heart='eq2_dungeon_rootbound_t2_heartward:4' as const,tower='eq2_rare_t5_citadel:4' as const,
  line='eq2_t4_bastionmail:6' as const,rime='eq2_t5_rimewatch:4' as const;
 const runtime=(ids:readonly Eq2PrivateHitIdV22[])=>authorizeEq2PrivateHitQaV22(input,issueEq2PrivateHitQaV22(input,compiled.actor.id,ids,()=>true))!;
 const hit=(now:number,hp=500)=>({now,actorId:boss.id,targetId:compiled.actor.id,abilityId:'BASIC',originalEnemyAbility:true,
  direct:true,physical:true,nontrue:true,sourceAlive:true,targetAlive:true,targetHp:hp,targetMaxHp:1000,shield:0,raw:100});
 const r=runtime([heart,tower]);
 const first=hit(1000);
 assert.equal(r.afterShieldHit(first,60),undefined);
 r.beforeIncomingHit(first);r.absorbShield(first,60);r.afterIncomingHit(first,60);
 const grant=r.afterShieldHit(first,60);
 assert.equal(grant?.id,heart);assert.equal(grant?.amount,40);assert.equal(grant?.expiresAt,7000);
 assert.equal(r.afterShieldHit(first,60),undefined);
 assert.equal(r.shieldAvailable(compiled.actor.id,1000),0);
 assert.equal(r.shieldAvailable('OTHER',1001),0);
 assert.equal(r.shieldAvailable(compiled.actor.id,1001),40);
 const same=hit(1000);r.beforeIncomingHit(same);assert.equal(r.absorbShield(same,100),undefined);
 const trueHit={...hit(2000),nontrue:false};r.beforeIncomingHit(trueHit);assert.equal(r.absorbShield(trueHit,100),undefined);
 const next=hit(2100);r.beforeIncomingHit(next);
 assert.deepEqual(r.absorbShield(next,15),{id:heart,amount:15,broken:false});
 assert.equal(r.absorbShield(next,15),undefined);
 assert.equal(r.shieldAvailable(compiled.actor.id,2100),25);
 // Legacy shield absorbs first, caller passes only remaining damage.
 const legacy=hit(2200);r.beforeIncomingHit(legacy);assert.equal(r.absorbShield(legacy,0),undefined);
 assert.equal(r.shieldAvailable(compiled.actor.id,2200),25);
 // A stronger pool may replace the old remainder, but expiry/replacement
 // is not a break; cooldown belongs to actual grant only.
 const consume=hit(2300);r.beforeIncomingHit(consume);
 assert.deepEqual(r.absorbShield(consume,100),{id:heart,amount:25,broken:true});
 assert.equal(r.expireShield(7000),undefined);
 const replace=runtime([heart,tower]),small=hit(1000);replace.beforeIncomingHit(small);replace.absorbShield(small,60);replace.afterIncomingHit(small,60);replace.afterShieldHit(small,60);
 const stronger=hit(1000);replace.beforeIncomingHit(stronger);replace.absorbShield(stronger,80);replace.afterIncomingHit(stronger,80);
 assert.deepEqual(replace.afterShieldHit(stronger,80),{id:tower,amount:60,expiresAt:7000,replaced:{id:heart,remaining:40}});
 const e=runtime([heart]),start=hit(1000);e.beforeIncomingHit(start);e.absorbShield(start,60);e.afterIncomingHit(start,60);e.afterShieldHit(start,60);
 assert.equal(e.shieldAvailable(compiled.actor.id,6999),40);
 assert.equal(e.shieldAvailable(compiled.actor.id,7000),0);
 assert.deepEqual(e.expireShield(7000),{id:heart,ownerId:compiled.actor.id,earnedAt:1000,expiresAt:7000,remaining:40});
 assert.equal(e.expireShield(7001),undefined);
 const x=runtime([line]);const below=hit(1000,340);x.beforeIncomingHit(below);x.absorbShield(below,20);x.afterIncomingHit(below,20);assert.equal(x.afterShieldHit(below,20),undefined);
 const crossing=hit(2000,350);x.beforeIncomingHit(crossing);x.absorbShield(crossing,1);x.afterIncomingHit(crossing,1);assert.equal(x.afterShieldHit(crossing,1)?.amount,50);
 const z=runtime([rime]);const at=hit(1000,500);z.beforeIncomingHit(at);z.absorbShield(at,60);z.afterIncomingHit(at,60);assert.equal(z.afterShieldHit(at,60),undefined);
 const already=hit(2000,499);z.beforeIncomingHit(already);z.absorbShield(already,1);z.afterIncomingHit(already,1);assert.equal(z.afterShieldHit(already,1)?.amount,40);
 const fatal=runtime([heart]);const dead=hit(1000,60);fatal.beforeIncomingHit(dead);fatal.absorbShield(dead,100);fatal.afterIncomingHit(dead,60);assert.equal(fatal.afterShieldHit(dead,60),undefined);
 assert.throws(()=>runtime(['eq2_t1_citadel:4',tower]),/fixture_scope/);
 console.log('PASS: V26 independent shield grant, exact HP threshold, named depletion, legacy residual, true damage, same-tick, replacement, expiry, threshold crossing and fatal-hit guards');
}
 // V27: Weather the Break must be tied to the actual named Rimeguard pool.
 {
  const input:CombatInput={seed:'QA_V27_SHIELD_BREAK',players:[ironwarden],enemies:[boss]};
  const rime='eq2_t5_rimewatch:4' as const,weather='eq2_t5_rimewatch:6' as const,heart='eq2_dungeon_rootbound_t2_heartward:4' as const,tower='eq2_rare_t5_citadel:4' as const;
  const runtime=(ids:readonly Eq2PrivateHitIdV22[])=>authorizeEq2PrivateHitQaV22(input,issueEq2PrivateHitQaV22(input,ironwarden.id,ids,()=>true))!;
  const hit=(now:number,raw=100)=>({now,actorId:boss.id,targetId:ironwarden.id,abilityId:'BASIC',originalEnemyAbility:true,
   direct:true,physical:true,nontrue:true,sourceAlive:true,targetAlive:true,targetHp:400,targetMaxHp:1000,shield:0,raw});
  const grant=(r:ReturnType<typeof runtime>,e:ReturnType<typeof hit>,loss:number)=>{
   r.beforeIncomingHit(e);r.absorbShield(e,loss);r.afterIncomingHit(e,loss);return r.afterShieldHit(e,loss);
  };
  assert.throws(()=>runtime([weather]),/fixture_scope/);
  const r=runtime([rime,weather]);
  assert.equal(grant(r,hit(1000),1)?.id,rime);
  const partial=hit(1100,10);r.beforeIncomingHit(partial);assert.deepEqual(r.absorbShield(partial,10),{id:rime,amount:10,broken:false});
  assert.deepEqual(r.afterIncomingHit(partial,0),[]);
  const exact=hit(1200,30);r.beforeIncomingHit(exact);assert.deepEqual(r.absorbShield(exact,30),{id:rime,amount:30,broken:true});
  assert.deepEqual(r.afterIncomingHit(exact,0),[weather],'exact depletion may have zero HP loss');
  assert.deepEqual(r.afterIncomingHit(exact,0),[]);
  assert.equal(r.beforeIncomingHit(hit(1200)).reductionPct,0);
  assert.equal(r.beforeIncomingHit(hit(1201)).reductionPct,6);
  assert.equal(r.beforeIncomingHit({...hit(1300),nontrue:false}).reductionPct,0);
  assert.equal(r.beforeIncomingHit(hit(5200)).reductionPct,0);
  const expiry=runtime([rime,weather]);grant(expiry,hit(1000),1);assert.equal(expiry.expireShield(7000)?.id,rime);
  const late=hit(7000);expiry.beforeIncomingHit(late);expiry.absorbShield(late,100);assert.deepEqual(expiry.afterIncomingHit(late,100),[]);
  const periodic=runtime([rime,weather]);grant(periodic,hit(1000),1);
  const dot={...hit(1100,40),direct:false};periodic.beforeIncomingHit(dot);assert.equal(periodic.absorbShield(dot,40)?.broken,true);
  assert.deepEqual(periodic.afterIncomingHit(dot,0),[]);assert.equal(periodic.beforeIncomingHit(hit(1200)).reductionPct,0);
  const wrong=runtime([rime,weather,heart]);assert.equal(grant(wrong,{...hit(1000),targetHp:600},60)?.id,heart);
  const other=hit(1100,40);wrong.beforeIncomingHit(other);assert.equal(wrong.absorbShield(other,40)?.id,heart);
  assert.deepEqual(wrong.afterIncomingHit(other,0),[]);assert.equal(wrong.beforeIncomingHit(hit(1200)).reductionPct,0);
  const replaced=runtime([rime,weather,tower]);grant(replaced,hit(1000),1);
  assert.equal(grant(replaced,hit(1000),80)?.replaced?.id,rime);
  const newPool=hit(1100,60);replaced.beforeIncomingHit(newPool);assert.equal(replaced.absorbShield(newPool,60)?.id,tower);
  assert.deepEqual(replaced.afterIncomingHit(newPool,0),[]);
  const fatal=runtime([rime,weather]);grant(fatal,hit(1000),1);
  const dead={...hit(1100,100),targetHp:60};fatal.beforeIncomingHit(dead);fatal.absorbShield(dead,100);
  assert.deepEqual(fatal.afterIncomingHit(dead,60),[]);
  const cd=runtime([rime,weather]);grant(cd,hit(1000),1);
  const firstBreak=hit(1100,40);cd.beforeIncomingHit(firstBreak);cd.absorbShield(firstBreak,40);assert.deepEqual(cd.afterIncomingHit(firstBreak,0),[weather]);
  assert.equal(grant(cd,hit(25000),1)?.id,rime);
  const secondBreak=hit(25100,40);cd.beforeIncomingHit(secondBreak);cd.absorbShield(secondBreak,40);assert.deepEqual(cd.afterIncomingHit(secondBreak,0),[]);
  assert.equal(cd.beforeIncomingHit(hit(25101)).reductionPct,0);
  console.log('PASS: V27 named Rimeguard-only direct depletion, zero-HP-loss trigger, cooldown, exact expiry, wrong source, DoT, fatal and replacement negatives');
 }

}
