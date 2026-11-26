import {strict as assert} from 'node:assert';
import type {CombatInput,CombatantDefinition,DamageType} from '../../types';
import {bosses,profiles,setup} from './ten-slot-boss-fixture';
import {compileExactEquipmentTraitSourceV2} from '../equipment-trait-exact-copy-adapter';
import {enemyV2SnapshotDigest} from '../enemy-engine-authority';
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
function fixture(b:typeof cases[number],phase:typeof phases[number],size:number){
 const classes=['IRONWARDEN','WAYFINDER','STONECALLER'] as const;
 const rows=classes.slice(0,size).map(id=>setup(id,0,b.regional,profiles[1]));
 const accountId='QA_WORLD_ACCOUNT';
 const builds=rows.map(x=>x.build),runtime=rows.map(x=>x.runtime);
 const ports=rows.map(x=>({...x.signedPort,accountId,verifyPersisted:x.signedPort.verifyPersisted}));
 const sources=ports.map((p,i)=>compileExactEquipmentTraitSourceV2(builds[i],runtime[i],p));
 const traitPorts=ports.map((p,i)=>({...p,verifyPersisted:(rs:readonly typeof sources[number][],digest:string)=>
  rs.length===1&&enemyV2SnapshotDigest(rs[0])===enemyV2SnapshotDigest(sources[i])&&/^[a-f0-9]{64}$/.test(digest)}));
 const seed='QA_WORLD_'+b.id+'_'+phase+'_'+size;
 const boss:CombatantDefinition={...rows[0].input.enemies[0],id:b.id,name:b.name,
  abilities:[{id:'qa_'+b.id+'_cast',name:b.cast,cooldownMs:6000,castTimeMs:1000,
   target:'all_enemies',priority:100,interruptible:true,
   effects:[{kind:'damage',coeff:phase==='enraged'?1.5:1,damageType:b.damageType as DamageType}]}]};
 const input:CombatInput={seed,players:rows.map(x=>x.actor),enemies:[boss],maxDurationMs:12000,tickMs:100};
 const scope:WorldBossSharedRosterReviewV2={accountId,eventId:'QA_WORLD_EVENT',
  reservationId:'QA_WORLD_RESERVATION',attempt:1,entitlementRevision:7,
  unlockedCharacterSlots:3,contentVersion:'qa_content',balanceVersion:'qa_balance',
  seed,bossId:b.id,phase,members:sources.map(s=>({actorId:s.actorId,characterId:s.characterId,
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
 assert.equal(first.globalHpCredited,0);
 assert.equal(first.rewardGranted,false);
 assert.equal(first.persisted,false);
 assert.equal(first.releaseReady,false);
 assert.equal(first.enemyKitAuthority,false);
 assert.equal(first.guardSettlement,false);
 assert.ok(first.localBossHpLoss>=0&&first.localBossHpLoss<=f.input.enemies[0].stats.maxHp);
 assert.ok(first.combat.events.some(e=>e.type==='combat_start'));
 assert.ok(first.combat.events.some(e=>e.type==='combat_end'));
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
assert.throws(()=>run(f.input,{...f.scope,members:[{...f.scope.members[0],equipmentReceiptDigest:'f'.repeat(64)},...f.scope.members.slice(1)]}),/equipment_digest_mismatch/);
assert.throws(()=>run(f.input,f.scope,[{...f.traitPorts[0],verifyPersisted:()=>false},...f.traitPorts.slice(1)]),/persisted_ledger_not_verified/);
assert.throws(()=>run(f.input,f.scope,f.traitPorts,()=>false),/persisted_ledger_not_verified/);
assert.throws(()=>run({...f.input,enemies:[{...f.input.enemies[0],stats:{...f.input.enemies[0].stats,attackPower:999}}]}),/persisted_ledger_not_verified/);
assert.throws(()=>run({...f.input,tickMs:5000}),/invalid_local_boss_scope/);
assert.throws(()=>run({...f.input,initialPlayerState:{}}),/invalid_roster_scope/);
console.log('WORLD_BOSS_SHARED_ENGINE_REVIEW: '+count+' synthetic local boss/phase/roster scenarios; no global settlement');
