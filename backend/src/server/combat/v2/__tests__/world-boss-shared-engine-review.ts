import {strict as assert} from 'node:assert';
import type {CombatInput} from '../../types';
import {CLASS_ROLES_V2,type ClassIdV2} from '../build-contract';
import {reviewWorldBossProtectionV2} from '../world-boss-protection-review';
import {bosses,profiles,setup} from './ten-slot-boss-fixture';
import {compileExactEquipmentTraitSourceV2} from '../equipment-trait-exact-copy-adapter';
import {enemyV2SnapshotDigest} from '../enemy-engine-authority';
import {buildWorldBossAuthoredReviewV2} from '../world-boss-authored-review';
import {reviewWorldBossContributionV2,reviewWorldBossFixedLedgerWeightV2} from '../world-boss-contribution-review';
import {compileWorldBossRosterReviewV2,simulateWorldBossSharedEngineReviewV2,
 WORLD_BOSS_SHARED_ENGINE_REVIEW_LIVE,type WorldBossSharedRosterReviewV2,
 type WorldBossSharedPreviewBindingV2} from '../unified-equipment-encounter';

// Review-only synthetic local profiles. Neither global boss HP nor official
// balance/counterplay/Guard values are inferred from these fixtures.
const cases=[
 {id:'hollowroot',name:'Hollowroot',cast:'Root Slam',damageType:'nature',regional:bosses[0]},
 {id:'sunscar',name:'Solbrand',cast:'Burning Tempest',damageType:'fire',regional:bosses[2]},
 {id:'frostmarch',name:'Rimewarden',cast:'Ice Spear',damageType:'ice',regional:bosses[4]},
] as const;
const phases=['armored','exposed','enraged'] as const;
function fixture(b:typeof cases[number],phase:typeof phases[number],size:number,
 classes:readonly ClassIdV2[]=['IRONWARDEN','WAYFINDER','STONECALLER'],spec:0|1=0,grade:0|1=1,seedIndex=0){
 const rows=classes.slice(0,size).map(id=>setup(id,spec,b.regional,profiles[grade]));
 const accountId='QA_WORLD_ACCOUNT';
 const builds=rows.map(x=>x.build),runtime=rows.map(x=>x.runtime);
 const ports=rows.map(x=>({...x.signedPort,accountId,verifyPersisted:x.signedPort.verifyPersisted}));
 const sources=ports.map((p,i)=>compileExactEquipmentTraitSourceV2(builds[i],runtime[i],p));
 const traitPorts=ports.map((p,i)=>({...p,verifyPersisted:(rs:readonly typeof sources[number][],digest:string)=>
  rs.length===1&&enemyV2SnapshotDigest(rs[0])===enemyV2SnapshotDigest(sources[i])&&/^[a-f0-9]{64}$/.test(digest)}));
 const seed='QA_WORLD_'+b.id+'_'+phase+'_'+seedIndex;
 const authored=buildWorldBossAuthoredReviewV2({bossId:b.id,phase,
  level:b.regional.level,stats:rows[0].input.enemies[0].stats,
  localShieldAmount:phase==='armored'?300:150});
 const boss=authored.definition;
 assert.equal(authored.digest,enemyV2SnapshotDigest(boss));
 assert.equal(boss.abilities.length,3);
 assert.equal(boss.phases,undefined);
 const input:CombatInput={seed,players:rows.map(x=>x.actor),enemies:[boss],maxDurationMs:12000,tickMs:100};
 const scope:WorldBossSharedRosterReviewV2={accountId,eventId:'QA_WORLD_EVENT',
  reservationId:'QA_WORLD_RESERVATION',attempt:1,entitlementRevision:7,
  unlockedCharacterSlots:3,rosterDigest:'a'.repeat(64),contentVersion:'qa_content',balanceVersion:'qa_balance',
  seed,bossId:b.id,phase,members:sources.map((s,i)=>({actorId:s.actorId,characterId:s.characterId,
   snapshotId:'QA_SNAPSHOT_'+i,sourceRevision:2,sourceHash:(i+1).toString(16).repeat(64),
   equipmentReceiptRevision:s.revision,equipmentReceiptDigest:s.equipmentReceiptDigest}))};
 const compiled=compileWorldBossRosterReviewV2(input,builds,runtime,traitPorts,scope);
 const expected:WorldBossSharedPreviewBindingV2={scope:structuredClone(scope),
  bossDefinitionDigest:enemyV2SnapshotDigest(boss),
  compiledInputDigest:enemyV2SnapshotDigest({...input,players:compiled.players}),
  equipmentSourcesDigest:enemyV2SnapshotDigest(sources)};
 const verify=(binding:WorldBossSharedPreviewBindingV2)=>enemyV2SnapshotDigest(binding)===enemyV2SnapshotDigest(expected);
 return {input,scope,builds,runtime,traitPorts,compiled,verify};
}
assert.equal(WORLD_BOSS_SHARED_ENGINE_REVIEW_LIVE,false);
let count=0;
for(const boss of cases)for(const phase of phases)for(let size=1;size<=3;size++){
 const f=fixture(boss,phase,size);
 assert.equal(f.compiled.players.length,size);
 assert.equal(f.compiled.canAuthorizeCombat,false);
 assert.equal(f.compiled.evidence.every(e=>e.baseSources.length===10),true);
 const run=()=>simulateWorldBossSharedEngineReviewV2(f.input,f.builds,f.runtime,f.traitPorts,f.scope,f.verify,true);
 const first=run();
 assert.deepEqual(run(),first);
 assert.ok(first.protection);
 assert.deepEqual(simulateWorldBossSharedEngineReviewV2(f.input,f.builds,f.runtime,f.traitPorts,f.scope,f.verify,true,false).combat,first.combat);
 assert.equal(first.globalHpCredited,0);
 assert.equal(first.rewardGranted,false);
 assert.equal(first.persisted,false);
 assert.equal(first.releaseReady,false);
 assert.equal(first.enemyKitAuthority,false);
 assert.equal(first.guardSettlement,false);
 assert.ok(first.localBossHpLoss>=0&&first.localBossHpLoss<=f.input.enemies[0].stats.maxHp);
 assert.ok(first.combat.events.some(e=>e.type==='combat_start'));
 assert.ok(first.combat.events.some(e=>e.type==='combat_end'));
 const contribution=reviewWorldBossContributionV2(first.combat);
 assert.equal(contribution.localHpLoss,first.localBossHpLoss);
 assert.equal(contribution.characters.length,size);
 assert.equal(contribution.impactScore,null);
 assert.equal(contribution.globalHpCredited,0);
 assert.equal(contribution.shieldOwnerCredit,'unavailable');
 assert.ok(contribution.bossShieldAbsorbed<=contribution.bossShieldGranted+1);
 assert.deepEqual(reviewWorldBossContributionV2(run().combat),contribution);
 assert.deepEqual(simulateWorldBossSharedEngineReviewV2(f.input,[...f.builds].reverse(),
  [...f.runtime].reverse(),[...f.traitPorts].reverse(),f.scope,f.verify,true),first);
 count++;
}
const f=fixture(cases[0],phases[0],3);
const run=(input=f.input,scope=f.scope,ports=f.traitPorts,verify=f.verify,enabled=true)=>
 simulateWorldBossSharedEngineReviewV2(input,f.builds,f.runtime,ports,scope,verify,enabled);
assert.throws(()=>run(f.input,f.scope,f.traitPorts,f.verify,false),/disabled/);
assert.throws(()=>run(f.input,{...f.scope,unlockedCharacterSlots:2}),/invalid_roster_scope/);
assert.throws(()=>run(f.input,{...f.scope,accountId:'FOREIGN'}),/member_ownership_or_revision_mismatch/);
assert.throws(()=>run(f.input,{...f.scope,phase:'exposed'}),/persisted_ledger_not_verified/);
assert.throws(()=>run(f.input,{...f.scope,attempt:4}),/invalid_roster_scope/);
assert.throws(()=>run(f.input,{...f.scope,rosterDigest:'b'.repeat(64)}),/persisted_ledger_not_verified/);
assert.throws(()=>run(f.input,{...f.scope,members:[{...f.scope.members[0],sourceRevision:3},...f.scope.members.slice(1)]}),/persisted_ledger_not_verified/);
assert.throws(()=>run(f.input,{...f.scope,members:[{...f.scope.members[0],snapshotId:f.scope.members[1].snapshotId},...f.scope.members.slice(1)]}),/duplicate_snapshot/);
assert.throws(()=>run(f.input,{...f.scope,members:[{...f.scope.members[0],equipmentReceiptDigest:'f'.repeat(64)},...f.scope.members.slice(1)]}),/equipment_digest_mismatch/);
assert.throws(()=>run(f.input,f.scope,[{...f.traitPorts[0],verifyPersisted:()=>false},...f.traitPorts.slice(1)]),/persisted_ledger_not_verified/);
assert.throws(()=>run(f.input,f.scope,f.traitPorts,()=>false),/persisted_ledger_not_verified/);
assert.throws(()=>run({...f.input,enemies:[{...f.input.enemies[0],stats:{...f.input.enemies[0].stats,attackPower:999}}]}),/persisted_ledger_not_verified/);
assert.throws(()=>run({...f.input,tickMs:5000}),/invalid_local_boss_scope/);
assert.throws(()=>run({...f.input,initialPlayerState:{}}),/invalid_roster_scope/);
console.log('WORLD_BOSS_SHARED_ENGINE_REVIEW: '+count+' synthetic local boss/phase/roster scenarios; no global settlement');

for(const first of [0,1,100,10000])for(const extra of [0,1,10,100,10000]){
 const baseline=reviewWorldBossFixedLedgerWeightV2([first]);
 const two=reviewWorldBossFixedLedgerWeightV2([first,extra]);
 assert.ok(two>=baseline);
 assert.ok(reviewWorldBossFixedLedgerWeightV2([first,extra,1])>=two);
}
assert.equal(reviewWorldBossFixedLedgerWeightV2([1000,500,100]),1067);
assert.throws(()=>reviewWorldBossFixedLedgerWeightV2([100,-1]),/invalid_fixed_ledger/);
assert.throws(()=>reviewWorldBossFixedLedgerWeightV2(Array<number>(2)),/invalid_fixed_ledger/);
const profile={bossId:'hollowroot' as const,phase:'armored' as const,
 level:25,stats:f.input.enemies[0].stats,localShieldAmount:300};
assert.throws(()=>buildWorldBossAuthoredReviewV2({...profile,localShieldAmount:profile.stats.maxHp}),/invalid_profile/);
assert.throws(()=>buildWorldBossAuthoredReviewV2({...profile,stats:{...profile.stats,attackPower:NaN}}),/invalid_profile/);
console.log('WORLD_BOSS_AUTHORED_AND_CONTRIBUTION_REVIEW: nine local profiles, fixed-ledger monotonic checks; no Impact or HP credit');

const protection=reviewWorldBossProtectionV2([
 {kind:'grant',atMs:0,ownerId:'tank',targetId:'dps',amount:30,before:0,after:30},
 {kind:'grant',atMs:1,ownerId:'support',targetId:'dps',amount:70,before:30,after:100},
 {kind:'absorb',atMs:2,sourceId:'boss',targetId:'dps',amount:80,before:100,after:20,hpBefore:50,raw:120},
],['tank','support','dps'],{tank:0,support:0,dps:20,boss:0});
assert.equal(protection.characters[0].shieldConsumed,30);
assert.equal(protection.characters[0].effectiveHpProtected,0);
assert.equal(protection.characters[1].shieldConsumed,50);
assert.equal(protection.characters[1].effectiveHpProtected,10);
assert.throws(()=>reviewWorldBossProtectionV2([],['tank'],{tank:1}),/final_pool_mismatch/);

// Matched threat and seed per boss/phase; synthetic common Q0 vs epic Q100
// profiles are not equal-CP evidence, and no coefficient is tuned here.
let matrixCount=0,upgradeDamageRegressions=0;
const summaries:Record<string,{runs:number;damage:number;healing:number;protected:number;survivors:number}>={};
for(const b of cases)for(const phase of phases)for(const id of Object.keys(CLASS_ROLES_V2) as ClassIdV2[])
 for(const spec of [0,1] as const)for(const seedIndex of [0,1]){
  const outcomes=([0,1] as const).map(grade=>{
   const f=fixture(b,phase,1,[id],spec,grade,seedIndex);
   const result=simulateWorldBossSharedEngineReviewV2(f.input,f.builds,f.runtime,f.traitPorts,f.scope,f.verify,true);
   const evidence=reviewWorldBossContributionV2(result.combat);
   assert.ok(result.protection);
   assert.equal(result.globalHpCredited,0);
   const key=b.id+'|'+phase+'|'+id+'|'+spec+'|'+grade;
   const cell=summaries[key]??{runs:0,damage:0,healing:0,protected:0,survivors:0};
   cell.runs++;cell.damage+=evidence.localHpLoss;cell.healing+=evidence.characters[0].engineEffectiveHealing;
   cell.protected+=result.protection.characters[0].effectiveHpProtected;
   cell.survivors+=evidence.characters[0].survived?1:0;
   summaries[key]=cell;matrixCount++;return evidence.localHpLoss;
  });
  if(outcomes[1]<outcomes[0])upgradeDamageRegressions++;
 }
assert.equal(matrixCount,648);
console.log(JSON.stringify({kind:'WORLD_BOSS_V93_SOLO_MATCHED_MATRIX_NOT_APPROVED',matrixCount,upgradeDamageRegressions,summaries}));
