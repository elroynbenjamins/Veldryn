/** World Boss V29: deterministic, offline-only anti-farming and fairness tests. */
import {assert} from './test-assert';
import {
 auditProvenWorldBossImpactV29,provisionalWorldBossRoleUtilityV29,
 WORLD_BOSS_V29_IMPACT_LIVE,WORLD_BOSS_V29_IMPACT_PAYOUTS_APPROVED,
 WORLD_BOSS_V29_MIN_ACCOUNTS_PER_CELL,
 type WorldBossV29ProvenAttempt,type WorldBossV29ProvenCharacter,
 type WorldBossV29ClassRole,
} from '../../../backend/online/world-boss-impact-audit-v29';
const EVENT='30000000-0000-4000-8000-000000000029';
const uuid=(n:number)=>'10000000-0000-4000-8000-'+String(n).padStart(12,'0');
const digest=(n:number)=>n.toString(16).padStart(64,'0');
const catalog:WorldBossV29ClassRole[]=[];
for(const role of ['tank','damage','support'] as const)
 for(let index=1;index<=3;index++)
  catalog.push({classId:role+'_'+index,role});
function actor(classId:string,id:number):WorldBossV29ProvenCharacter{
 const role=catalog.find(x=>x.classId===classId)!.role;
 return {characterId:uuid(id),classId,role,combatPower:10000,
  bossHpDamage:role==='damage'?1200:500,localGuardDamage:100,
  effectiveHealing:role==='support'?700:20,
  shieldConsumed:role==='tank'?180:40,
  tankProtection:role==='tank'?500:30,
  cleansePrevented:role==='support'?75:0,interrupts:2,survived:true};
}
const fail=(fn:()=>unknown,match:string)=>{
 let message='';try{fn();}catch(e){message=String(e);}
 assert.ok(message.includes(match),match+' missing in '+message);
};
const bosses=['hollowroot','sunscar','frostmarch'] as const;
const brackets=[1,2,3,4,5] as const;
const base:WorldBossV29ProvenAttempt[]=[];
let id=0;
for(const boss of bosses)for(const bracket of brackets)
 for(const {classId} of catalog)for(let i=0;i<20;i++){
  id++;
  base.push({eventId:EVENT,accountId:uuid(id),
   requestId:'V29_PROVEN_'+id,attempt:1,boss,bracket,
   replaySha256:digest(id),proofStatus:'verified_v28',
   roundsCompleted:14,participants:[actor(classId,id+50000)]});
 }
assert.equal(WORLD_BOSS_V29_IMPACT_LIVE,false);
assert.equal(WORLD_BOSS_V29_IMPACT_PAYOUTS_APPROVED,false);
assert.equal(WORLD_BOSS_V29_MIN_ACCOUNTS_PER_CELL,20);
assert.equal(base.length,2700);
const audit=(attempts:readonly WorldBossV29ProvenAttempt[])=>
 auditProvenWorldBossImpactV29({eventId:EVENT,expectedClasses:catalog,attempts});
const clean=audit(base);
assert.equal(clean.status,'review_only_impact_locked');
assert.equal(clean.referenceCells.length,135);
assert.equal(clean.warnings.length,0);
assert.equal(clean.readyForHumanReview,true);
assert.equal(clean.payoutsAuthorized,false);
assert.equal(clean.walletWrites,0);
assert.equal(clean.persisted,false);
assert.equal(clean.uniqueAccounts,2700);
assert.equal(clean.preview.length,2700);
assert.ok(clean.referenceCells.every(r=>r.uniqueAccounts===20&&
 r.medianUtilityPerRootPower>0&&r.survivalRate===1));
assert.ok(clean.preview.every(x=>x.provisionalImpact===1&&
 x.rewardAuthorized===false));
const triple=[...base,...[2,3].map((attempt,offset)=>({
 ...base[0],attempt:attempt as 2|3,
 requestId:'V29_RETRY_'+attempt,replaySha256:digest(3000+offset),
}))];
const auditedTriple=audit(triple);
const first=auditedTriple.preview.find(x=>x.accountId===base[0].accountId)!;
assert.equal(first.attempts,3);
assert.equal(first.provisionalImpact,3);
assert.equal(auditedTriple.referenceCells[0].uniqueAccounts,20);
assert.equal(auditedTriple.uniqueAccounts,2700);
// Request IDs are scoped per account; independent accounts may share a
// string. The replay digest and attempt/account ownership remain distinct.
const sharedRequest:WorldBossV29ProvenAttempt[]=[
 base[0],{...base[1],requestId:base[0].requestId},...base.slice(2)];
assert.equal(audit(sharedRequest).uniqueAccounts,2700);
const mixed:WorldBossV29ProvenAttempt[]=[{
 ...base[0],participants:[...base[0].participants,
  actor('damage_1',60001),actor('support_1',60002)],
},...base.slice(1)];
const mixedResult=audit(mixed);
const three=mixedResult.preview.find(x=>x.accountId===base[0].accountId)!;
assert.equal(three.provisionalImpact,1.19);
assert.equal(mixedResult.uniqueAccounts,2700);
assert.equal(three.rewardAuthorized,false);
// No extra reference-vote per attempt or character of the same class.
const doubleSameClass:WorldBossV29ProvenAttempt[]=[{
 ...base[0],participants:[...base[0].participants,actor('tank_1',60003)],
},...base.slice(1)];
assert.equal(audit(doubleSameClass).referenceCells[0].uniqueAccounts,20);
fail(()=>audit([base[0],base[0]]),'duplicate_attempt_or_replay');
fail(()=>audit([base[0],{...base[0],attempt:2}]),
 'duplicate_attempt_or_replay');
fail(()=>audit([{...base[0],proofStatus:'pending' as never}]),
 'unproved_or_invalid_attempt');
fail(()=>audit([{...base[0],bracket:0 as never}]),
 'unproved_or_invalid_attempt');
fail(()=>audit([{...base[0],participants:[{
 ...base[0].participants[0],role:'support' as const,
 }]}]),'unverified_character');
fail(()=>audit([{...base[0],participants:[{
 ...base[0].participants[0],classId:'unknown_class',
  role:'unknown' as never,
 }]}]),'unverified_character');
fail(()=>audit([base[0],{...base[1],participants:[
 base[0].participants[0]],
 }]),'foreign_or_changed_character');
fail(()=>audit([base[0],{...base[0],attempt:2,
  requestId:'V29_CHANGED_CLASS',replaySha256:digest(4000),
  participants:[{...base[0].participants[0],classId:'tank_2'}],
 }]),'foreign_or_changed_character');
fail(()=>audit([{...base[0],participants:[{
 ...base[0].participants[0],effectiveHealing:-1,
 }]}]),'unverified_character');
fail(()=>audit([{...base[0],participants:[{
 ...base[0].participants[0],combatPower:Infinity,
 }]}]),'unverified_character');
fail(()=>audit([{...base[0],participants:[
 base[0].participants[0],base[0].participants[0],
 ]}]),'unverified_character');
const single=audit([base[0]]);
assert.equal(single.readyForHumanReview,false);
assert.equal(single.preview.length,0);
assert.ok(single.warnings.some(x=>x.startsWith('insufficient_unique_accounts:')));
const dead:WorldBossV29ProvenAttempt={
 ...base[0],participants:[{...base[0].participants[0],survived:false,
  bossHpDamage:0,localGuardDamage:0,effectiveHealing:0,
  shieldConsumed:0,tankProtection:0,cleansePrevented:0,interrupts:0}],
};
assert.equal(provisionalWorldBossRoleUtilityV29(dead.participants[0]),0);
assert.ok(audit([dead]).warnings.some(x=>x.startsWith('zero_reference_utility:')));
console.log('WORLD_BOSS_V29_REVIEW_AUDIT='+JSON.stringify({
 cells:clean.referenceCells.length,samples:base.length,
 uniqueAccounts:clean.uniqueAccounts,perClassCell:20,
 multiCharacterScore:three.provisionalImpact,
 threeAttemptScore:first.provisionalImpact,
 payoutsAuthorized:false,live:false,
}));
