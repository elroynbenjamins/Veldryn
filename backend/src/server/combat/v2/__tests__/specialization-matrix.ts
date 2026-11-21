/**
 * Classes 2.0 staging telemetry — synthetic, deterministic and non-player.
 *
 * Collects nine-class / eighteen-spec fixture statistics, with no absolute
 * role-win/DPS assertions until Equipment+Enemies 2.0 balance is calibrated.
 */
import {strict as assert} from 'node:assert';
import type {CombatantDefinition} from '../../types';
import {launchPlayer} from '../../content/launch-combat';
import {simulateCombatWithSkillsV2,type VerifiedSkillBuildV2} from '../skill-effects';
import {CLASS_NAMES_V2,SPECIALIZATIONS_V2,SKILL_IDENTITIES_V2} from '../skill-catalog';
import {CLASS_ROLES_V2,type ClassIdV2} from '../build-contract';
import {RESOURCE_CAP_V2} from '../resource-runtime';

const classes=Object.keys(CLASS_NAMES_V2) as ClassIdV2[];
const target:CombatantDefinition={
 id:'SYNTHETIC_ENEMY',name:'Training golem',team:'enemies',role:'enemy',level:50,
 stats:{maxHp:1e8,attackPower:120,healingPower:0,defense:140,accuracy:880,
   evasion:110,critChance:.03,critMultiplier:1.5,haste:0},
 basicAttackMs:2300,basicAttackCoeff:.9,abilities:[],
};
const report:Record<string,{role:string;damage:number;healed:number;taken:number;
  resourceGains:number;resourceSpends:number;capstoneEvents:number}>={};
for(const classId of classes){
 for(const spec of SPECIALIZATIONS_V2.filter(s=>s.classId===classId)){
  const actor=launchPlayer(CLASS_NAMES_V2[classId],50);
  const selected=SKILL_IDENTITIES_V2.filter(x=>x.classId===classId).slice(0,3);
  const build:VerifiedSkillBuildV2={
   actor,verified:{classId,level:50,ownedInstanceIds:new Set()},
   selected:{specializationId:spec.id,equipment:{},
     activeSkills:selected.map(s=>({skillId:s.id,variantId:s.variants[0].id})),
     talentRanks:{},signaturePassiveIds:[],capstoneId:spec.capstoneId},
   ownedItemsById:{},setsById:{},
  };
  const input={seed:'combat-v2-spec-matrix-'+classId+'-'+spec.id,
    players:[actor],enemies:[target],maxDurationMs:16000};
  const original=JSON.stringify(actor);
  const a=simulateCombatWithSkillsV2(input,[build],true);
  const b=simulateCombatWithSkillsV2(input,[build],true);
  assert.deepEqual(a,b,'seed replay must match '+spec.id);
  assert.equal(JSON.stringify(actor),original,'source actor modified by '+spec.id);
  assert.equal(a.players.length,1);
  const player=a.players[0];
  assert.ok(Number.isFinite(player.hp));
  assert.ok(Number.isFinite(player.damageDone)&&player.damageDone>=0);
  assert.ok(Number.isFinite(player.healingDone)&&player.healingDone>=0);
  assert.ok(Number.isFinite(player.damageTaken)&&player.damageTaken>=0);
  const resources=a.events.filter(e=>e.type==='resource_gain'||e.type==='resource_spend');
  for(const event of resources){
   const cap=RESOURCE_CAP_V2[event.resource!];
   assert.ok(cap>=3&&cap<=5);
   assert.ok(Number.isInteger(event.resourceAfter));
   assert.ok(event.resourceAfter!>=0&&event.resourceAfter!<=cap,
     'out-of-bounds class resource for '+spec.id);
  }
  assert.ok(a.events.length<5000,'possible infinite proc or replay storm: '+spec.id);
  report[spec.id]={role:CLASS_ROLES_V2[classId],damage:Math.round(player.damageDone),
    healed:Math.round(player.healingDone),taken:Math.round(player.damageTaken),
    resourceGains:resources.filter(e=>e.type==='resource_gain').length,
    resourceSpends:resources.filter(e=>e.type==='resource_spend').length,
    capstoneEvents:a.events.filter(e=>e.type==='capstone_trigger').length};
 }
}
assert.equal(Object.keys(report).length,18);
assert.equal(Object.values(report).filter(x=>x.role==='tank').length,6);
assert.equal(Object.values(report).filter(x=>x.role==='damage').length,8);
assert.equal(Object.values(report).filter(x=>x.role==='support').length,4);
console.log('Synthetic class-spec balance baseline (not final tuned numbers):');
console.log(JSON.stringify(report));
console.log('PASS: 18 specialization replay fixtures, resource caps, role coverage and proc-loop limits');
