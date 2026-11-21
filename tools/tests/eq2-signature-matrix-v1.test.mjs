import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {evaluateSignatureSyntheticMatrix,validateSyntheticFixture} from '../lib/eq2-signature-matrix-v1.mjs';
import {previewHeartwoodRetort,previewOasisAfterglow} from '../lib/eq2-signature-tank-support-preview-v1.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const signature=JSON.parse(read('docs/equipment-2-0/t2-t4-signature-equipment-fishing-dungeon-v1.json'));
const contract=JSON.parse(read('docs/equipment-2-0/signature-combat-interop-contract-v1.json'));
const clone=o=>JSON.parse(JSON.stringify(o));
const report=evaluateSignatureSyntheticMatrix({contract,signature,seed:20261121});

test('real current mobile nine-class IDs and roles match manually pinned 18-spec contracts',()=>{
 const classes=read('apps/mobile/src/content/classes.ts');
 for(const row of contract.rolesAndSpecializations){
  assert.ok(classes.includes("id:'"+row.classId+"'"),'class removed '+row.classId);
  assert.ok(classes.includes("role:'"+(row.role==='tank'?'Tank':row.role==='support'?'Support':'Damage')+"'"));
  assert.equal(row.specializations.length,2);
 }
 const verified=validateSyntheticFixture({contract,signature});
 assert.deepEqual(verified,{classes:9,specs:18});
});
test('all six signature traits are covered by a deterministic 486-case grid',()=>{
 assert.deepEqual(report.coverage,{classes:9,specializations:18,tiers:[2,3,4],
  enemyKinds:['normal','elite','boss'],paceProfiles:['slow','baseline','fast'],
  syntheticScenarios:486,realCombatSimulations:0});
 assert.equal(report.rows.length,486);
 assert.equal(report.summaries.length,9);
 assert.deepEqual(report,evaluateSignatureSyntheticMatrix({contract,signature,seed:20261121}));
});
test('physical Bleed stays separate from magical Hex Potency and Ward effect channels',()=>{
 const rule=contract.crossSystemRules;
 assert.equal(rule.physicalBleedHexPotencyMultiplier,1);
 assert.equal(rule.physicalBleedElementalWardMultiplier,1);
 assert.equal(rule.physicalBleedBossCoefficientMultiplier,.5);
 assert.equal(rule.physicalBleedNoRarityQualityOrATKDoubleScaling,true);
 const t4=report.summaries.filter(x=>x.tier===4);
 assert.equal(t4.find(x=>x.kind==='normal').theoreticalLongRunUncooledFractionUpperBound,.024);
 assert.equal(t4.find(x=>x.kind==='boss').theoreticalLongRunUncooledFractionUpperBound,.012);
});
test('sampling never predicts >3% signature mitigation or negative damage taken',()=>{
 for(const row of report.rows){
  assert.ok(row.glassfinDamagePrevented>=0);
  assert.ok(row.glassfinPercentAllIncoming>=0);
  assert.ok(row.glassfinPercentAllIncoming<=3.00001);
  assert.ok(row.heartwoodDamagePrevented>=0);
  assert.ok(row.sourceDirectDamage>=0&&row.potentialBleedDamage>=0);
  assert.ok(row.potentialBleedProcs<=row.qualifyingDirectHits);
 }
});
test('Heartwood uptime is not a passive unconditional damage reduction',()=>{
 const normal=report.rows.filter(x=>x.kind==='normal');
 const elite=report.rows.filter(x=>x.kind==='elite');
 assert.ok(normal.every(x=>x.heartwoodActivations===0));
 assert.ok(elite.every(x=>x.heartwoodActivations>0));
 assert.ok(elite.some(x=>x.heartwoodDamagePrevented>0));
});
test('Oasistide shield has zero procs outside active real-support preview events',()=>{
 const rows=report.rows;
 assert.ok(rows.filter(x=>x.role!=='support').every(x=>x.oasisPotentialShield===0));
 assert.ok(rows.filter(x=>x.role==='support').every(x=>x.oasisPotentialShield>0));
 assert.ok(rows.every(x=>Number.isFinite(x.oasisPotentialShield)));
});
test('external Combat 2.0 source hashes and contract cannot pretend to authorize runtime',()=>{
 assert.equal(contract.noImplementationAuthorized,true);
 assert.equal(report.status,'REVIEW_ONLY_NO_RUNTIME');
 assert.equal(contract.pinnedExternalSourceFiles.length,6);
 assert.ok(contract.pinnedExternalSourceFiles.every(x=>/^[0-9a-f]{40}$/.test(x.blobSha)));
 assert.ok(contract.criticalIntegrationGaps.some(x=>x.includes('DIFFERENT draft branch')));
});
test('a manipulated combat-family cap or mocked role roster fails closed',()=>{
 const bad1=clone(contract);
 bad1.crossSystemRules.maximumPersistentSignatureMitigation=.15;
 assert.throws(()=>validateSyntheticFixture({contract:bad1,signature}),/interoperability_caps/);
 const bad2=clone(contract);
 bad2.rolesAndSpecializations[0].specializations=['Sentinel','Sentinel'];
 assert.throws(()=>validateSyntheticFixture({contract:bad2,signature}),/eighteen_specs/);
 const bad3=clone(contract);
 bad3.rolesAndSpecializations[0].illustrativePhysicalHitFraction=1.6;
 assert.throws(()=>validateSyntheticFixture({contract:bad3,signature}),/class_data/);
 const bad4=clone(signature);bad4.release.combatProcsEnabled=true;
 assert.throws(()=>validateSyntheticFixture({contract,signature:bad4}),/review_gate|signature_pieces/);
});
test('support/tank preview modules remain synthetic and never a server-backed combat authority',()=>{
 const app=previewOasisAfterglow({events:[],
  trait:signature.items.find(x=>x.traitId==='oasis_afterglow').trait});
 const tank=previewHeartwoodRetort({events:[],maxHp:1000,
  trait:signature.items.find(x=>x.traitId==='heartwood_retort').trait});
 assert.equal(app.status,'SYNTHETIC_REVIEW_ONLY');
 assert.equal(tank.status,'SYNTHETIC_REVIEW_ONLY');
 assert.equal(report.coverage.realCombatSimulations,0);
});
