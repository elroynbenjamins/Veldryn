/** Private lifecycle integration over actual reviewed socket groups. */
import {strict as assert} from 'node:assert';
import {createEffectLifecycleReviewV2} from '../effect-gem-lifecycle-review';
import type {reviewFrozenForgeSocketsV2} from '../frozen-forge-socket-review';
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
export function runEffectLifecycleReviewV2(p:ReturnType<typeof reviewFrozenForgeSocketsV2>){
 const group=(id:string)=>p.effectResonanceReview!.families.find(g=>g.familyId===id)!;
 const a=group('effect_aegis'),m=group('effect_mercy'),r=group('effect_renewal');
 assert.equal(a.resonance,m.resonance);assert.equal(a.resonance,r.resonance);
 const rank=a.resonance,ledger=createEffectLifecycleReviewV2(p);
 const shield={actionId:'shield',outputId:'shield-a',targetId:'a',origin:'authored' as const,direct:true,
  amount:100,baseCapacity:1000,durationMs:6000,externalShield:0};
 const first=ledger.grantAuthoredBarrier(shield);
 close(first.granted,100*(1+a.totalValue));
 assert.equal(ledger.grantAuthoredBarrier({...shield,outputId:'duplicate-target'}).granted,0);
 assert.throws(()=>ledger.grantAuthoredBarrier(shield),/output_identity/);
 const foreign=ledger.grantAuthoredBarrier({...shield,outputId:'shield-b',targetId:'b'});
 close(foreign.granted,first.granted);
 assert.equal(ledger.grantAuthoredBarrier({...shield,actionId:'proc',outputId:'proc-barrier',origin:'secondary'}).granted,0);
 ledger.absorb('a',20);
 close(ledger.inspect().barriers.find(x=>x.recipientId==='a')!.remaining,first.granted-20);
 close(ledger.inspect().barriers.find(x=>x.recipientId==='b')!.remaining,foreign.granted);
 assert.equal(ledger.removeBarrier(foreign.segmentId!),true);
 assert.equal(ledger.removeBarrier(foreign.segmentId!),false);
 const heal={actionId:'heal',outputId:'heal-a',targetId:'c',origin:'authored' as const,direct:true,
  attempted:1000,actual:500,maxHp:1000,externalShield:0};
 const h=ledger.applyDirectHeal(heal);
 close(h.mercy,Math.min(500*m.totalValue,rank>=2?40:30));
 close(h.renewal,500*r.totalValue*(rank>=2?1.2:1));
 assert.equal(ledger.applyDirectHeal({...heal,outputId:'heal-duplicate'}).renewal,0);
 assert.equal(ledger.applyDirectHeal({...heal,actionId:'hot',outputId:'hot',direct:false}).mercy,0);
 assert.equal(ledger.applyDirectHeal({...heal,actionId:'generated',outputId:'generated',origin:'secondary'}).renewal,0);
 const start=ledger.inspect();
 ledger.advance(100);
 ledger.applyDirectHeal({...heal,actionId:'heal2',outputId:'heal2'});
 ledger.advance(200);
 ledger.applyDirectHeal({...heal,actionId:'heal3',outputId:'heal3'});
 const after=ledger.inspect();
 assert.equal(after.renewals.length,rank===3?2:1);
 assert.ok(after.renewals.every(x=>x.id!==start.renewals[0].id));
 assert.ok(after.barriers.filter(x=>x.recipientId==='c').reduce((n,x)=>n+x.remaining,0)<=(rank>=2?40:30)+1e-8);
 const due=ledger.advance(6000);
 assert.equal(due.expiryHeals.length,rank>=2?1:0);
 if(rank>=2)close(due.expiryHeals[0].amount,(first.granted-20)*.05);
 assert.ok(due.expiryHeals.every(x=>!x.mayTriggerEffects&&x.origin==='secondary'));
 assert.ok(due.periodicHeals.every(x=>!x.mayTriggerEffects&&x.origin==='secondary'));
 assert.ok(due.periodicHeals.every(x=>x.id!==start.renewals[0].id));
 const tail=ledger.advance(20000);
 assert.equal(tail.expiryHeals.length,0);
 assert.equal(ledger.inspect().barriers.length,0);
 assert.equal(ledger.inspect().renewals.length,0);
 const remaining=ledger.advance(20000);
 assert.equal(remaining.expiryHeals.length+remaining.periodicHeals.length,0);
 assert.throws(()=>ledger.advance(19999),/clock/);
 assert.equal(ledger.inspect().canExecuteEffects,false);
 return {rank,sourceDigest:p.digest,acceptedOutputs:ledger.inspect().acceptedOutputs,
  periodicTicks:due.periodicHeals.length+tail.periodicHeals.length,expiryHeals:due.expiryHeals.length,
  retiredCount:ledger.inspect().retiredCount,releaseEnabled:false};
}
