/** Hidden V14 World Boss cohort gate: synthetic samples only, no database access. */
import {assert} from './test-assert';
import {
 auditWorldBossPowerBracketsV14,type WorldBossPowerSampleV14,
} from '../../../backend/src/server/combat/world-boss-bracket-audit-v14';
import {worldBossBracketFromVerifiedPowerV12} from '../../../backend/online/world-boss-loadout-v12';

const NOW=1794564000000;
const ROLES=['tank','damage','damage','support'] as const;
const samples:WorldBossPowerSampleV14[]=Array.from({length:150},(_,i)=>({
 ownerAccountId:'WB14_ACCOUNT_'+i,
 combatPower:500+i*130,
 role:ROLES[i%ROLES.length],
 capturedAtUtcMs:NOW-60000,
}));
function reject(fn:()=>unknown,code:string){
 let message='';
 try{fn();}catch(error){message=String(error);}
 assert.ok(message.includes(code),'expected failure '+code+', received '+message);
}
const report=auditWorldBossPowerBracketsV14({
 eventId:'WB_V14_TEST_EVENT',nowUtcMs:NOW,samples,
});
assert.equal(report.status,'review_only_not_approved');
assert.equal(report.approved,false);
assert.equal(report.persisted,false);
assert.equal(report.samplesReviewed,150);
assert.equal(report.bounds.length,4);
assert.equal(report.cohorts.length,5);
assert.equal(report.warnings.length,0);
assert.deepEqual(report.cohorts.map(c=>c.sampleCount),[30,30,30,30,30]);
assert.ok(report.bounds.every((x,i)=>x>0&&(i===0||x>report.bounds[i-1])));
const policy={bounds:report.bounds as [number,number,number,number],version:report.policyVersion};
for(const cohort of report.cohorts){
 assert.ok(Object.values(cohort.roles).every(n=>n>0));
 const members=samples.filter(s=>worldBossBracketFromVerifiedPowerV12(s.combatPower,policy)===cohort.bracket);
 assert.equal(members.length,cohort.sampleCount);
 assert.equal(Math.min(...members.map(s=>s.combatPower)),cohort.minimumPower);
 assert.equal(Math.max(...members.map(s=>s.combatPower)),cohort.maximumPower);
}
const repeat=auditWorldBossPowerBracketsV14({eventId:'WB_V14_TEST_EVENT',nowUtcMs:NOW,
 samples:[...samples].reverse()});
assert.deepEqual(repeat,report,'input ordering may not alter boundaries');
reject(()=>auditWorldBossPowerBracketsV14({eventId:'BAD EVENT',nowUtcMs:NOW,samples}),
 'invalid_audit_input');
reject(()=>auditWorldBossPowerBracketsV14({eventId:'WB_TEST',nowUtcMs:NOW,samples:samples.slice(0,99)}),
 'invalid_audit_input');
reject(()=>auditWorldBossPowerBracketsV14({eventId:'WB_TEST',nowUtcMs:NOW,
 samples:[...samples.slice(0,-1),{...samples[0]}]}),
 'invalid_or_unowned_sample');
reject(()=>auditWorldBossPowerBracketsV14({eventId:'WB_TEST',nowUtcMs:NOW,
 samples:[...samples.slice(0,-1),{...samples.at(-1)!,combatPower:Infinity}]}),
 'invalid_or_unowned_sample');
reject(()=>auditWorldBossPowerBracketsV14({eventId:'WB_TEST',nowUtcMs:NOW,
 samples:[...samples.slice(0,-1),{...samples.at(-1)!,capturedAtUtcMs:NOW+1}]}),
 'invalid_or_unowned_sample');
reject(()=>auditWorldBossPowerBracketsV14({eventId:'WB_TEST',nowUtcMs:NOW,
 samples:[...samples.slice(0,-1),{...samples.at(-1)!,capturedAtUtcMs:NOW-8*86400000}]}),
 'invalid_or_unowned_sample');
reject(()=>auditWorldBossPowerBracketsV14({eventId:'WB_TEST',nowUtcMs:NOW,
 samples:samples.map(s=>({...s,combatPower:1234}))}),
 'power_distribution_cannot_form_five_brackets');
const missingRoles=auditWorldBossPowerBracketsV14({eventId:'WB_TEST',nowUtcMs:NOW,
 samples:samples.map(s=>({...s,role:'damage' as const}))});
assert.ok(missingRoles.warnings.some(w=>w.includes('no_tank')));
assert.ok(missingRoles.warnings.some(w=>w.includes('no_support')));
assert.equal(missingRoles.approved,false);
console.log('WB_V14_BRACKET_AUDIT='+JSON.stringify({
 sampleCount:report.samplesReviewed,cohortSizes:report.cohorts.map(c=>c.sampleCount),
 distinctBrackets:report.cohorts.length,roleCoverage:report.warnings.length===0,
 rejectedMalformedDuplicateStaleClustered:true,
 data:'synthetic_samples_only',approved:false,dbReads:0,writes:0,live:false,
}));
