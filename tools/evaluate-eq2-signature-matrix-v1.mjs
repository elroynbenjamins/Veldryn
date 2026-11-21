#!/usr/bin/env node
/**
 * Cross-system SIGNATURE GEAR 2.0 PREVIEW ONLY.
 * 9 classes x 2 specializations x 3 tiers x 3 enemy kinds x 3 activity speeds
 * = 486 synthetic traces. The engine remains untouched.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {evaluateSignatureSyntheticMatrix} from './lib/eq2-signature-matrix-v1.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const contract=read('docs/equipment-2-0/signature-combat-interop-contract-v1.json');
const signature=read('docs/equipment-2-0/t2-t4-signature-equipment-fishing-dungeon-v1.json');
const report=evaluateSignatureSyntheticMatrix({contract,signature,seed:20261121});
console.log(JSON.stringify({
 status:report.status,
 method:'Unapproved synthetic event approximation, NOT the real Combat 2.0 engine; no authoritative trait numbers or gear interaction claim.',
 externalSourceBranch:contract.latestInspectedExternalCombatBranch,
 pinnedSourceBlobs:contract.pinnedExternalSourceFiles.map(x=>({path:x.path,sha:x.blobSha})),
 coverage:report.coverage,
 summaries:report.summaries,
 examples:{
  noPhysicalMagicCasterHitProc:report.rows.filter(x=>x.classId==='HEXWEAVER'&&x.tier===4&&x.kind==='boss').map(x=>({
    spec:x.specialization,pace:x.profile,qualifyingHits:x.qualifyingDirectHits,potentialBleedPct:x.potentialBleedShare*100
  })),
  supportShieldEligibleExamples:report.rows.filter(x=>x.classId==='DAWNKEEPER'&&x.tier===3&&x.kind==='elite').map(x=>({
    spec:x.specialization,pace:x.profile,triggeredShieldAmount:x.oasisPotentialShield
  }))
 },
 warnings:[
  'Synthetic cadence, role physical eligibility and damage are illustrative fixture parameters, not real class mechanics.',
  'Expected long-run Bleed chance*damage fractions are uncooldowned upper-envelope references, not simulated final DPS.',
  'Only the original credited direct physical hit can seed a Bleed. A real hit must pass accuracy/evasion/immune and deal positive actual HP damage first.',
  'The real backend currently supports physical periodic damage, but not this server-owned item trait issuer, class/trait shared budget, status refresh, boss immunity or source-preserving receipt lineage.',
  'Gem hex potency affects shadow/arcane/nature dots only. Physical bleed uses the original resolved hit once and receives no additional affix/quality/gem scaling.',
  'Support shields and Tank protection require their own authoritative direct-damage/heal/shield hook; no self-heal/gem-recursive procs.',
  'A new Combat 2.0 ruleset and full reproducible 9-class/18-spec battle simulations are required before runtime integration.',
  'No item grants, fishing or dungeon loot, changes to 1.0.x, UI implementation, server deployment, SQL or main merge.'
 ]
},null,2));
