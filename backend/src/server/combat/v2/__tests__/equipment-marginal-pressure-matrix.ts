/** Hidden synthetic marginal equipment calibration; no real mint or CP authority. */
import {strict as assert} from 'node:assert';
import type {CombatInput,CombatResult,CombatantDefinition,CombatStats} from '../../types';
import type {FrozenLoadoutSnapshot} from '../../../coop/loadout-snapshots';
import type {ReadyCheckRecord,ReadyRosterMember} from '../../../coop/ready-checks';
import {CLASS_ROLES_V2,type ClassIdV2,type GearSlotV2} from '../build-contract';
import {CLASS_NAMES_V2} from '../skill-catalog';
import {launchPlayer} from '../../content/launch-combat';
import {ACTION_STREAM_RNG_QA_V2} from '../../deterministic-rng';
import {simulateUnifiedEquipmentPersistedPartyCombatV2,type TrustedPersistedPartyExecutionV2,type TrustedEquipmentRuntimeV2} from '../unified-equipment-encounter';
import {selectReviewSkillLoadoutV2} from '../ability-counterplay-strategies';
import {preparePartyEnemyKitsV2,type PersistedEnemyKitV2} from '../enemy-kit-composer';
import {ENEMY_V2_RULESET} from '../../enemy-v2-prototype';
import {EQUIPMENT_AFFIXES_V2,type EquipmentAffixIdV2} from '../equipment-affixes';
import {compileExactEquipmentTraitSourceV2,type TrustedEquipmentTraitReceiptPortV2} from '../equipment-trait-exact-copy-adapter';
import type {VerifiedSkillBuildV2} from '../skill-effects';
import {bosses,profiles,setup} from './ten-slot-boss-fixture';

const classes=Object.keys(CLASS_NAMES_V2) as ClassIdV2[];
const parties:ClassIdV2[][]=[
 ['IRONWARDEN','WAYFINDER','HEXWEAVER','STONECALLER'],
 ['BASTION','RAVAGER','KNIFE_DANCER','DAWNKEEPER'],
 ['DREADGUARD','HEXWEAVER','RAVAGER','STONECALLER'],
];
assert.equal(new Set(parties.flat()).size,9);
const idsOfAffixes=Object.keys(EQUIPMENT_AFFIXES_V2) as EquipmentAffixIdV2[];
assert.equal(idsOfAffixes.length,16);
type Gear={build:VerifiedSkillBuildV2;runtime:TrustedEquipmentRuntimeV2;port:TrustedEquipmentTraitReceiptPortV2};
function resign(build:VerifiedSkillBuildV2,runtime:TrustedEquipmentRuntimeV2,port:TrustedEquipmentTraitReceiptPortV2):Gear{
 // Synthetic exact-copy ledger only. Production source receipt verification
 // remains outside this matrix. Never carry the previous arm's verifier.
 const snapshot=compileExactEquipmentTraitSourceV2(build,runtime,port);
 return {build,runtime,port:{...port,verifyPersisted:(sources,digest)=>
  sources.length===1&&sources[0].equipmentReceiptDigest===snapshot.equipmentReceiptDigest&&/^[a-f0-9]{64}$/.test(digest)}};
}
function neutralGear(build:VerifiedSkillBuildV2,r:TrustedEquipmentRuntimeV2,p:TrustedEquipmentTraitReceiptPortV2):Gear{
 // Ten epic Q50 items, all set stats and signature traits retained; ordinary
 // and sidecar rolls zeroed in every arm. This avoids mixed ability-damage
 // channels and isolates a single newly added affix. Not attainable mint proof.
 const instancesById=Object.fromEntries(Object.entries(r.instancesById).map(([id,x])=>[id,{...x,quality:50}]));
 const affixesByInstanceId=Object.fromEntries(Object.entries(r.affixesByInstanceId).map(([id,x])=>[id,{...x,quality:50,affixes:[]}]));
 const receiptsByInstanceId=Object.fromEntries(Object.entries(p.receiptsByInstanceId).map(([id,x])=>[id,{...x,quality:50,newAffixRolls:[]}]));
 return resign(build,{...r,instancesById,affixesByInstanceId,
  affixPolicy:{...r.affixPolicy,countsByTierRarity:{...r.affixPolicy.countsByTierRarity,
   ...Object.fromEntries([2,3,4].map(t=>['T'+t+':common',0]))},
   maxAdvancedEffects:{...r.affixPolicy.maxAdvancedEffects,accuracyPp:1,evasionPp:1,penetrationPp:1,wardPp:1,
    shieldStrengthPct:1,hexPotencyPct:1,tenacityPp:1,abilityDamagePct:1,forgeHealingPowerPct:1}}},
  {...p,receiptsByInstanceId});
}
type Arm='base-plus-10pct'|'quality-0'|'quality-100'|'rarity-common'|'set-six-to-five'|`affix:${EquipmentAffixIdV2}`;
const arms:Arm[]=['base-plus-10pct','quality-0','quality-100','rarity-common','set-six-to-five',...idsOfAffixes.map(id=>('affix:'+id) as Arm)];
function vary(g:Gear,arm:Arm):Gear{
 const {build,runtime:r,port:p}=g;
 const candidates=(Object.entries(build.selected.equipment) as [GearSlotV2,string][])
  .filter(([,id])=>!p.selectedTraitInstanceIds.includes(id));
 const affixId=arm.startsWith('affix:')?arm.slice(6) as EquipmentAffixIdV2:undefined;
 const match=candidates.find(([slot,id])=>affixId?EQUIPMENT_AFFIXES_V2[affixId].slots.includes(slot):
  arm==='set-six-to-five'?Boolean(build.ownedItemsById[id].setFamilyId):slot==='chest');
 assert.ok(match,'no eligible non-trait copy: '+arm);
 const [slot,id]=match,copy=r.instancesById[id],definition=r.definitionsByItemId[copy.itemId],affix=r.affixesByInstanceId[id],receipt=p.receiptsByInstanceId[id];
 if(affixId){
  return resign(build,{...r,affixesByInstanceId:{...r.affixesByInstanceId,[id]:{...affix,affixes:[{id:affixId,value:.05}]}}},p);
 }
 if(arm==='set-six-to-five'){
  const {setFamilyId:_removed,...standalone}=build.ownedItemsById[id];
  return resign({...build,ownedItemsById:{...build.ownedItemsById,[id]:standalone}},r,p);
 }
 if(arm==='base-plus-10pct'){
  const primaryStats=Object.fromEntries(Object.entries(definition.primaryStats).map(([k,val])=>[k,val*1.1]));
  return resign(build,{...r,definitionsByItemId:{...r.definitionsByItemId,[copy.itemId]:{...definition,primaryStats}}},p);
 }
 const quality=arm==='quality-0'?0:arm==='quality-100'?100:copy.quality;
 const rarity=arm==='rarity-common'?'common':copy.rarity;
 return resign(build,{...r,instancesById:{...r.instancesById,[id]:{...copy,rarity,quality}},
  affixesByInstanceId:{...r.affixesByInstanceId,[id]:{...affix,rarity,quality}}},
  {...p,receiptsByInstanceId:{...p.receiptsByInstanceId,[id]:{...receipt,rarity,quality}}});
}
const statKeys:readonly (keyof CombatStats)[]=['maxHp','attackPower','healingPower','defense','accuracy','evasion','critChance','critMultiplier','haste'];
function measure(r:CombatResult,i:number){
 const a=r.players[i],sec=r.durationMs/1000;
 assert.ok(sec>0&&Number.isFinite(sec));
 return {dps:a.damageDone/sec,healing:a.healingDone/sec,hpFraction:a.hp/a.definition.stats.maxHp,
  incomingHpDamage:a.damageTaken,interrupts:a.interrupts,
  shieldGranted:r.events.filter(e=>e.type==='shield'&&e.actorId===a.definition.id).reduce((n,e)=>n+(e.amount??0),0),
  partyHp:r.players.reduce((n,x)=>n+x.hp/x.definition.stats.maxHp,0)/4,
  partyAlive:r.players.filter(x=>x.alive).length,victory:Number(r.victory),durationMs:r.durationMs,
  enemyHp:r.enemies.reduce((n,x)=>n+x.hp,0),
  absorbed:r.events.filter(e=>e.targetId&&r.players.some(x=>x.definition.id===e.targetId)).reduce((n,e)=>n+(e.absorbed??0),0)};
}
type Measurement=ReturnType<typeof measure>;
type Row={classId:ClassIdV2;spec:number;boss:string;arm:Arm;before:Measurement;after:Measurement;statDelta:Record<string,number>};
const rows:Row[]=[];
const fixedReference=new Map(bosses.map(boss=>{
 const roster=classes.map(c=>launchPlayer(CLASS_NAMES_V2[c],boss.level));
 return [boss.id,{averageHp:roster.reduce((n,p)=>n+p.stats.maxHp,0)/roster.length,
  partyAttack:4*roster.reduce((n,p)=>n+p.stats.attackPower,0)/roster.length}] as const;
}));
for(const [partyIndex,ids] of parties.entries())for(const spec of [0,1] as const)
 for(const boss of bosses)for(const seedIndex of [0,1]){
  const f=ids.map(c=>setup(c,spec,boss,profiles[1]));
  const players=f.map(x=>x.actor);
  const builds=f.map((x,i)=>({...x.build,selected:{...x.build.selected,
   activeSkills:selectReviewSkillLoadoutV2(ids[i],x.build.selected.specializationId!,x.actor,boss.id,'targeted').activeSkills}}));
  const initial=f.map((x,i)=>neutralGear(builds[i],x.runtime,x.signedPort));
  const runtime=initial.map(x=>x.runtime),traitPorts=initial.map(x=>x.port);
  // One fixed reference per boss, never rescaled to the tested composition.
  const {averageHp,partyAttack}=fixedReference.get(boss.id)!;
  const raw=f[0].input.enemies[0];
  const enemy:CombatantDefinition={...raw,stats:{...raw.stats,
   attackPower:Math.round(averageHp*.30),maxHp:Math.round(partyAttack*24)}};
  const suffix=[partyIndex,spec,boss.id,'heavy',seedIndex].join('_');
  const seed='EQUIP_PRESSURE_'+suffix,runId='RUN_EQUIP_'+suffix,nodeId='BOSS';
  const input:CombatInput={seed,players,enemies:[enemy],maxDurationMs:90000,tickMs:100};
  const candidate=preparePartyEnemyKitsV2(input.enemies,{
   ruleset:ENEMY_V2_RULESET,serverSeed:seed,encounterId:runId+':'+nodeId,
   region:boss.region,equipmentTier:boss.tier,eliteEnemyIds:[]});
  const snapshot:PersistedEnemyKitV2={...candidate,source:'server-persisted-v2',revision:3};
  const roster:ReadyRosterMember[]=ids.map((classId,i)=>({
   accountId:traitPorts[i].accountId,characterId:runtime[i].characterId,
   ticketId:'TICKET_'+i,role:CLASS_ROLES_V2[classId],originalEnqueuedAtMs:1,
   loadoutId:'LOADOUT_'+i,loadoutRevision:11,loadoutSnapshotHash:'c'.repeat(63)+i}));
  const readyCheck:ReadyCheckRecord={id:'READY_AI',partyId:'PARTY_AI',rosterRevision:5,
   roster,accepts:Object.fromEntries(roster.map(r=>[r.accountId,true])),
   status:'committed',openedAtMs:1,closesAtMs:1000};
  const frozenRoster=ids.map((classId,i)=>({
   accountId:roster[i].accountId,characterId:roster[i].characterId,classId,
   loadoutId:roster[i].loadoutId,revision:roster[i].loadoutRevision,
   snapshotHash:roster[i].loadoutSnapshotHash,readiness:{role:CLASS_ROLES_V2[classId]},
  } as unknown as FrozenLoadoutSnapshot));
  const party:TrustedPersistedPartyExecutionV2={runId,nodeId,encounterRevision:3,stateRevision:7,
   contentVersion:'content_v2',balanceVersion:'balance_v2',readyCheck,frozenRoster,traitPorts,
   enemyKit:{snapshot,verifyPersisted:(_row,digest)=>/^[0-9a-f]{64}$/.test(digest)},
   verifyPersisted:(binding,_sources,digest)=>binding.runId===runId&&digest===binding.combatInputDigest};

  const run=(gear:Gear[])=>simulateUnifiedEquipmentPersistedPartyCombatV2(
   input,gear.map(g=>g.build),gear.map(g=>g.runtime),{...party,traitPorts:gear.map(g=>g.port)},
   true,false,'tactical',ACTION_STREAM_RNG_QA_V2);
  const base=run(initial);
  assert.equal(base.combat.events[0].detail,ACTION_STREAM_RNG_QA_V2);
  assert.ok(base.equipmentEvidence.every(e=>e.baseSources.length===10&&e.affixSources.length===0));
  if(seedIndex===0&&partyIndex===0)assert.deepEqual(base,run(initial));
  for(const [i,classId] of ids.entries())for(const arm of arms){
   const variant=vary(initial[i],arm),gear=initial.map((g,j)=>j===i?variant:g);
   const next=run(gear);
   const a=base.equipmentEvidence[i],b=next.equipmentEvidence[i];
   assert.equal(b.baseSources.length,10);
   assert.deepEqual(b.statStages.classOnly,a.statStages.classOnly);
   assert.deepEqual(b.statStages.afterSkills,a.statStages.afterSkills);
   for(let j=0;j<4;j++)if(j!==i){
    assert.deepEqual(next.equipmentEvidence[j],base.equipmentEvidence[j]);
    assert.deepEqual(next.combat.players[j].definition,base.combat.players[j].definition);
   }
   assert.deepEqual(next.combat.enemies.map(x=>x.definition),base.combat.enemies.map(x=>x.definition));
   if(arm.startsWith('affix:')){
    assert.deepEqual(b.statStages.afterItemBase,a.statStages.afterItemBase);
    assert.deepEqual(b.statStages.afterSets,a.statStages.afterSets);
    assert.equal(b.affixSources.length,1);
    assert.equal(b.affixSources[0].id,arm.slice(6));
    assert.equal(b.affixSources[0].value,.05);
   }else if(arm==='set-six-to-five'){
    assert.deepEqual(b.statStages.afterItemBase,a.statStages.afterItemBase);
    assert.ok(b.setEffects.length<a.setEffects.length);
   }else{
    assert.equal(b.affixSources.length,0);
    const key=initial[i].runtime.definitionsByItemId[initial[i].runtime.instancesById[initial[i].build.selected.equipment.chest!].itemId].primaryStats;
    for(const k of Object.keys(key) as (keyof CombatStats)[])
      assert.ok(arm==='base-plus-10pct'||arm==='quality-100'?b.statStages.afterItemBase[k]>a.statStages.afterItemBase[k]:b.statStages.afterItemBase[k]<a.statStages.afterItemBase[k]);
   }
   const before=measure(base.combat,i),after=measure(next.combat,i);
   assert.ok([...Object.values(before),...Object.values(after)].every(Number.isFinite));
   rows.push({classId,spec,boss:boss.id,arm,before,after,statDelta:Object.fromEntries(statKeys.map(k=>[k,b.statStages.afterAffixes[k]-a.statStages.afterAffixes[k]]))});
  }
 }
assert.equal(rows.length,3*2*6*2*4*arms.length);
const groups=new Map<string,Row[]>();
for(const row of rows){
 const key=[CLASS_ROLES_V2[row.classId],row.classId,row.arm].join('|');
 (groups.get(key)??(groups.set(key,[]),groups.get(key)!)).push(row);
}
const summarize=(rs:Row[])=>{
 const fields=Object.keys(rs[0].before) as (keyof Measurement)[];
 const mean=(fn:(row:Row)=>number)=>rs.reduce((n,row)=>n+fn(row),0)/rs.length;
 return {cases:rs.length,meanDeltas:Object.fromEntries(fields.map(k=>[k,mean(r=>r.after[k]-r.before[k])])),
  meanStatDeltas:Object.fromEntries(statKeys.map(k=>[k,mean(r=>r.statDelta[k])])),
  victoryLosses:rs.filter(r=>r.after.victory<r.before.victory).length,
  survivorLosses:rs.filter(r=>r.after.partyAlive<r.before.partyAlive).length,
  survivorGains:rs.filter(r=>r.after.partyAlive>r.before.partyAlive).length};
};
console.log('EQUIPMENT_MARGINAL_PRESSURE '+JSON.stringify({kind:'SYNTHETIC_GEAR_MARGINALS_NOT_CP',
 policy:ACTION_STREAM_RNG_QA_V2,comparisons:rows.length,baseEncounters:72,arms,
 base:'ten epic Q50, six-piece set, no ordinary or sidecar rolls, existing signature traits',
 byClass:Object.fromEntries([...groups.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([key,rs])=>[key,summarize(rs)])),
 caveat:'5% rolls are QA probes, not authored mint ranges; no gem projection or final CP certification'}));
