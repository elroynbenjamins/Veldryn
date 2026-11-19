import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {projectVerifiedCraftingV2BaseEvidence} from '../equipment-exact-copy-interop-v1.mjs';
import {planHiddenEnemyClassEncounterV2,ENEMY_V2_RULESET} from '../enemy-class-encounter-plan-v1.mjs';

/** Staging READINESS fixture (not a staging deployment):
 * canonical Equipment V2 source + class/skills authority pins + Enemy V2
 * solo snapshot must agree before any actor may be released.
 *
 * This deliberately does NOT resolve skill damage, enemy combat, live PvE,
 * rewards, loot, loadouts, world bosses or dungeons. Every plan is
 * non-runnable and explicitly blocked for the combined 2.0 major release.
 */
const require=createRequire(import.meta.url);
const out='../../../../../dist-equipment-v2/server/equipment/';
const {v2ServerRecipeAndPiece,V2_SERVER_PIECES,V2_SERVER_MANIFEST_VERSION}=require(out+'equipment-crafting-v2-manifest.js');
const {draftEquipmentV2Outcome,EQUIPMENT_V2_SERVER_RULES_VERSION}=require(out+'equipment-crafting-v2-rolls.js');
const {v2ServerCreateExactTemplate,v2ServerExactTemplateConsistent}=require(out+'equipment-crafting-v2-instances.js');
const {projectCombatActionPowerV2,validateCombatActionV2}=require('../../../../../dist-equipment-v2/server/combat/combat-stat-contract-v2.js');
const roles={
 IRONWARDEN:'tank',BASTION:'tank',DREADGUARD:'tank',
 WAYFINDER:'damage',RAVAGER:'damage',HEXWEAVER:'damage',KNIFE_DANCER:'damage',
 DAWNKEEPER:'support',STONECALLER:'support',
};
const archetypes={
 guardian:['stonehide'],bruiser:['savage'],executioner:['savage'],
 assassin:['swift'],swarm:['swift'],caster:['venomous'],
 hexer:['hexing'],support:['regenerating'],
};
const idOf=classId=>'EQ2_WEAPON_T2_'+classId;
function exact(classId){
 const id=idOf(classId),pair=v2ServerRecipeAndPiece(id+'_FOUNDATION');
 assert.ok(pair,'Missing canonical weapon '+id);
 assert.equal(pair.piece.role,roles[classId]);
 const roll=draftEquipmentV2Outcome({
  recipeId:pair.recipe.id,pieceId:pair.piece.id,tier:pair.piece.tier,
  role:pair.piece.role,slot:pair.piece.slot,
 },()=>0);
 const item=v2ServerCreateExactTemplate(pair.piece,roll);
 assert.ok(v2ServerExactTemplateConsistent(item));
 return item;
}
function evidence(classId,item){
 const entry={
  instanceId:'staging-copy-'+classId,receiptId:'staging-claim-'+classId,
  ownerCharacterId:'hero-'+classId,
  location:'equipped',slot:'weapon',template:item,
 };
 return projectVerifiedCraftingV2BaseEvidence({
  actor:{characterId:entry.ownerCharacterId,classId,level:35},
  equipped:[entry],trusted:{
   manifestVersion:V2_SERVER_MANIFEST_VERSION,
   rulesVersion:EQUIPMENT_V2_SERVER_RULES_VERSION,
   verifyOwnedReceipt:row=>row.instanceId===entry.instanceId
    &&row.receiptId===entry.receiptId
    &&v2ServerExactTemplateConsistent(row.template)
    &&JSON.stringify(row.template)===JSON.stringify(item),
  },
 });
}
function syntheticEncounter(classId,equipmentEvidence,archetype,ordinal){
 return {
  version:2,ruleset:ENEMY_V2_RULESET,source:'server-persisted-v2',
  mode:'solo',region:'sunscar',equipmentTier:2,
  encounterId:'staging-'+classId+'-'+ordinal,
  serverSeed:'fixture-not-a-gameplay-seed',snapshotRevision:1,
  actors:[{
   actorId:'actor-'+classId,characterId:'hero-'+classId,classId,
   role:roles[classId],classPolicyVersion:'pending-classes-v2-approval',
   skillBuildVersion:'pending-skills-v2-approval',equipmentEvidence,
  }],
  enemies:[{
   id:'enemy-'+archetype,team:'enemies',kind:'normal',boss:false,
   pveArchetypeTag:'pve:archetype:'+archetype,
   traits:archetypes[archetype],
  }],
 };
}
const fixtureAuthority={verifyPersistedSnapshot:s=>
 s.source==='server-persisted-v2'&&s.serverSeed==='fixture-not-a-gameplay-seed'};
const allClasses=Object.keys(roles),allArchetypes=Object.keys(archetypes);
assert.equal(allClasses.length,9);
assert.equal(allArchetypes.length,8);
const weaponPieces=V2_SERVER_PIECES.filter(p=>p.tier===2&&p.slot==='weapon');
assert.equal(weaponPieces.length,9,'Canonical class weapon parity');
const matrix=[];
for(const classId of allClasses){
 const template=exact(classId),gear=evidence(classId,template);
 assert.equal(gear.combatReady,false);
 assert.equal(gear.scaling,'exact-pre-scaled-do-not-reapply-rarity-or-quality');
 assert.equal(gear.baseTotals.attackPower,template.baseStats.attack);
 assert.equal(gear.baseTotals.defense,template.baseStats.defense);
 assert.equal(gear.baseTotals.maxHp,template.baseStats.hp);
 assert.equal(gear.sources[0].rarityAndQualityAlreadyApplied,true);
 assert.ok(gear.blockedUntil.includes('verified_class_baseline'));
 assert.ok(gear.blockedUntil.includes('affix_and_set_effects'));
 // Pure Combat 2.0 source separation, with synthetic class-skill budget.
 // These fixture numbers are NOT class balance or approved live coefficients.
 const statBudget={
  weaponPower:gear.baseTotals.attackPower,skillPower:33,
  abilityDamage:0.12,healingPower:0.08,potency:0.06,
 };
 const basic=projectCombatActionPowerV2(statBudget,{
  kind:'basic_weapon',purpose:'damage',powerSource:'weapon',coefficient:1,
 });
 const technique=projectCombatActionPowerV2(statBudget,{
  kind:'weapon_technique',purpose:'damage',powerSource:'weapon',coefficient:1,
 });
 const skillDamage=projectCombatActionPowerV2(statBudget,{
  kind:'class_skill',purpose:'damage',powerSource:'skill',coefficient:1,
 });
 const skillHeal=projectCombatActionPowerV2(statBudget,{
  kind:'class_skill',purpose:'heal',powerSource:'skill',coefficient:1,
 });
 const skillShield=projectCombatActionPowerV2(statBudget,{
  kind:'class_skill',purpose:'shield',powerSource:'skill',coefficient:1,
 });
 assert.equal(basic.basePower,gear.baseTotals.attackPower);
 assert.equal(basic.bonusMultiplier,1,'Basic weapons never inherit Ability Damage');
 assert.equal(technique.bonusMultiplier,1.12,'Weapon techniques receive Ability Damage once');
 assert.equal(skillDamage.basePower,33,'Class skill cannot borrow Weapon Power');
 assert.equal(skillDamage.bonusMultiplier,1.12);
 assert.equal(skillHeal.bonusMultiplier,1.08,'Healing inherits Healing Power, not Ability Damage');
 assert.equal(skillShield.bonusMultiplier,1,'A shield never silently inherits a heal coefficient');
 assert.ok(validateCombatActionV2({
  kind:'class_skill',purpose:'damage',powerSource:'weapon',coefficient:1,
 }).includes('invalid_class_skill_tag'));

 for(const [ordinal,archetype] of allArchetypes.entries()){
  const saved=syntheticEncounter(classId,gear,archetype,ordinal);
  const input=JSON.stringify(saved);
  const planned=planHiddenEnemyClassEncounterV2(saved,fixtureAuthority);
  assert.equal(planned.runnable,false);
  assert.equal(planned.legacyRulesUntouched,true);
  assert.equal(planned.singleEnemyCompilerRequired,true);
  assert.equal(planned.classId,classId);
  assert.equal(planned.equipmentSchema,gear.schema);
  assert.equal(planned.enemies.length,1);
  assert.ok(planned.blockedOn.includes('combined-skill-and-enemy-engine'));
  assert.equal(JSON.stringify(saved),input,'Planning cannot mutate authoritative snapshots');
  matrix.push([classId,archetype,template.rarity,template.quality,planned.enemies[0].traitIds[0]]);
 }
 const wrongOwner=structuredClone(template);
 wrongOwner.baseStats.attack+=10000;
 assert.throws(()=>evidence(classId,wrongOwner),/eq2_cv2_receipt_not_verified/,
  'Forged frozen base stats may not masquerade as verified gear');
 const wrongManifest={...template,manifestVersion:'stale'};
 assert.throws(()=>evidence(classId,wrongManifest),/eq2_cv2_(invalid_exact_template|receipt_not_verified)/);
}
assert.equal(matrix.length,72,'9 classes × 8 archetypes');
const firstTemplate=exact('IRONWARDEN');
const firstEvidence=evidence('IRONWARDEN',firstTemplate);
const firstEncounter=syntheticEncounter('IRONWARDEN',firstEvidence,'guardian',0);
assert.throws(()=>planHiddenEnemyClassEncounterV2({
 ...firstEncounter,mode:'dungeon',
},fixtureAuthority),/combat_v2_enemy_class_invalid_server_snapshot/,
 'The current dungeon engine remains unchanged until the coordinated migration');
assert.throws(()=>planHiddenEnemyClassEncounterV2({
 ...firstEncounter,enemies:[{...firstEncounter.enemies[0],preparedByAnotherCompiler:true}],
},fixtureAuthority),/combat_v2_enemy_class_enemy_identity_or_duplicate_compiler/);
assert.throws(()=>planHiddenEnemyClassEncounterV2(firstEncounter,{
 verifyPersistedSnapshot:()=>false,
}),/combat_v2_enemy_class_unverified_server_snapshot/);
assert.throws(()=>planHiddenEnemyClassEncounterV2({
 ...firstEncounter,actors:[{
  ...firstEncounter.actors[0],role:'damage',
 }],
},fixtureAuthority),/combat_v2_enemy_class_missing_authoritative_class_or_equipment_source/);
console.log('PASS: offline staging-readiness matrix: 9 canonical class weapons × 8 enemy archetypes = 72 non-runnable 2.0 plans; frozen stats never double scale, legacy/dungeon modes isolated');
