import {overallLevelFromXpV2,professionLevelFromXpV2,overallTotalXpForLevelV2,professionTotalXpForLevelV2} from '../character-progression';
import {
  legacySkillXpForNextLevelV1,legacySkillTotalXpAtLevelV1,legacySkillLevelFromXpV1,
  legacyCombatLevelFromXpV1,
  previewMigratedProfessionXpV2,previewLegacyCareerMigrationV2,
} from '../legacy-migration-preview';
import {previewApplyJournalAwardV2,projectServerSettlementV2,type JournalSnapshotV2} from '../settlement-journal-preview';

function equal(actual:unknown,expected:unknown,label:string){
  if(actual!==expected)throw Error(label+': expected '+String(expected)+', got '+String(actual));
}
function throws(block:()=>unknown,pattern:RegExp,label:string){
  try{block()}catch(e){if(pattern.test(String(e)))return; throw Error(label+': unexpected '+String(e))}
  throw Error(label+': expected throw');
}
equal(legacySkillXpForNextLevelV1(1),200,'live curve first requirement');
equal(legacySkillTotalXpAtLevelV1(50),819238,'live curve level-50 anchor');
equal(legacySkillTotalXpAtLevelV1(100),4344061,'live curve cap anchor');
for(let level=1;level<=100;level++){
  const legacy=legacySkillTotalXpAtLevelV1(level);
  const newXp=previewMigratedProfessionXpV2(legacy);
  equal(legacySkillLevelFromXpV1(legacy),level,'old level at floor '+level);
  equal(professionLevelFromXpV2(newXp),level,'migration must preserve profession level '+level);
  if(level<100){
    const halfway=legacy+Math.floor(legacySkillXpForNextLevelV1(level)/2);
    const mapped=previewMigratedProfessionXpV2(halfway);
    equal(professionLevelFromXpV2(mapped),level,'partial progress preserves level '+level);
    if(mapped<newXp || mapped>=professionTotalXpForLevelV2(level+1))
      throw Error('mapped progress bounds '+level);
  }
}
// Existing server-saved levels must be preserved if an XP-derived level drifts.
const driftSkill=previewLegacyCareerMigrationV2({combatLevel:1,
  professionLifetimeXp:{smithing:legacySkillTotalXpAtLevelV1(20)},
  professionSavedLevels:{smithing:26},
});
equal(driftSkill.highestLegacyCareerLevel,26,'server-saved skill level is never lowered');
equal(professionLevelFromXpV2(driftSkill.professionXpV2.smithing!),26,'T2/T3 license is not lost due to XP mismatch');
const driftCombat=previewLegacyCareerMigrationV2({
  combatLevel:24,combatLifetimeXp:0,professionLifetimeXp:{},
});
equal(driftCombat.highestLegacyCareerLevel,24,'saved combat level preserved when XP-derived lower');
const moreCombatXp=previewLegacyCareerMigrationV2({
  combatLevel:1,combatLifetimeXp:1000000,professionLifetimeXp:{},
});
equal(moreCombatXp.highestLegacyCareerLevel,legacyCombatLevelFromXpV1(1000000),'XP higher than cached combat level also preserved as overall baseline');
throws(()=>previewLegacyCareerMigrationV2({combatLevel:1,professionLifetimeXp:{smithing:0},professionSavedLevels:{mining:22}}),/invalid_saved_skills/,'saved skill cannot exist without a verified XP bank');
throws(()=>previewLegacyCareerMigrationV2({combatLevel:1,combatLifetimeXp:-1,professionLifetimeXp:{}}),/invalid_combat_xp/,'invalid combat XP');

const SmithXp=legacySkillTotalXpAtLevelV1(96);
const legacy={combatLevel:8,professionLifetimeXp:{smithing:SmithXp,mining:legacySkillTotalXpAtLevelV1(20)}} as const;
const before=JSON.stringify(legacy);
const migration=previewLegacyCareerMigrationV2(legacy);
equal(migration.highestLegacyCareerLevel,96,'single master dominates overall level floor');
equal(overallLevelFromXpV2(migration.overallCharacterXp),96,'pure crafter can be high overall character level');
equal(professionLevelFromXpV2(migration.professionXpV2.smithing!),96,'smith never resets');
equal(migration.legacyCombatAndProfessionXpUntouched,true,'no live XP overwrite');
equal(JSON.stringify(legacy),before,'source unchanged');
equal(overallLevelFromXpV2(previewLegacyCareerMigrationV2({combatLevel:75,professionLifetimeXp:{}}).overallCharacterXp),75,'combat-only player retained');
equal(overallLevelFromXpV2(previewLegacyCareerMigrationV2({combatLevel:1,professionLifetimeXp:{smithing:0}}).overallCharacterXp),1,'fresh artisan');
equal(overallLevelFromXpV2(previewLegacyCareerMigrationV2({combatLevel:1,professionLifetimeXp:{smithing:legacySkillTotalXpAtLevelV1(100)}}).overallCharacterXp),100,'master artisan cap');
throws(()=>previewLegacyCareerMigrationV2({combatLevel:1,professionLifetimeXp:{hack:999} as any}),/invalid_profession_bank/,'unknown profession');
throws(()=>previewLegacyCareerMigrationV2({combatLevel:1,professionLifetimeXp:{smithing:-1}}),/invalid_profession_bank/,'negative XP');
throws(()=>previewLegacyCareerMigrationV2({combatLevel:1.5,professionLifetimeXp:{}}),/invalid_snapshot/,'invalid legacy combat level');

const c1='11111111-1111-4111-8111-111111111111';
const c2='22222222-2222-4222-8222-222222222222';
const proof={
  source:'craft_claim' as const,
  sourceId:'job_0000001',ownerCharacterId:c1,receivingCharacterId:c1,
  completed:true,professionId:'smithing' as const,baseEffortSeconds:240,
  difficultyBasisPoints:10000 as const,
};
const receipt=projectServerSettlementV2(proof);
equal(receipt.award.overallCharacterXp,120,'completed craft awards character XP');
equal(receipt.award.professionXp,240,'completed craft projects profession XP');
const initial:JournalSnapshotV2={
  overallXpByCharacter:{[c1]:overallTotalXpForLevelV2(20),[c2]:0},receipts:{},
};
const first=previewApplyJournalAwardV2(initial,receipt);
equal(first.status,'applied','initial award');
equal(first.state.overallXpByCharacter[c1],overallTotalXpForLevelV2(20)+120,'award applied once');
equal(initial.overallXpByCharacter[c1],overallTotalXpForLevelV2(20),'immutable input');
const retry=previewApplyJournalAwardV2(first.state,receipt);
equal(retry.status,'replayed','retry idempotent');
equal(retry.state.overallXpByCharacter[c1],first.state.overallXpByCharacter[c1],'retry cannot award again');
throws(()=>projectServerSettlementV2({...proof,receivingCharacterId:c2}),/unverified_source/,'alt cannot claim source');
throws(()=>projectServerSettlementV2({...proof,completed:false}),/unverified_source/,'incomplete craft');
throws(()=>projectServerSettlementV2({...proof,professionId:'mining'}),/invalid_skill_source/,'craft cannot credit mining');
throws(()=>projectServerSettlementV2({...proof,source:'combat_reward',professionId:'smithing'}),/invalid_skill_source/,'combat cannot also grant profession XP');
throws(()=>previewApplyJournalAwardV2(first.state,projectServerSettlementV2({...proof,baseEffortSeconds:600})),/receipt_collision/,'same receipt changed payload');
throws(()=>previewApplyJournalAwardV2(first.state,projectServerSettlementV2({...proof,ownerCharacterId:c2,receivingCharacterId:c2})),/receipt_collision/,'same source cannot migrate to alt');
throws(()=>projectServerSettlementV2({source:'gathering_claim',sourceId:'idle_000001',ownerCharacterId:c1,receivingCharacterId:c1,completed:true,professionId:'mining',baseEffortSeconds:108000,claimedElapsedSeconds:108000,difficultyBasisPoints:10000}),/exceeds_db_cap/,'30h AFK reserve must be split into <=24h source claims');
const acceleratedGathering=projectServerSettlementV2({source:'gathering_claim',sourceId:'idle_000002',ownerCharacterId:c1,receivingCharacterId:c1,completed:true,professionId:'mining',baseEffortSeconds:103680,claimedElapsedSeconds:86400,difficultyBasisPoints:10000});
equal(acceleratedGathering.award.overallCharacterXp,51840,'24h elapsed may represent 28.8h of base effort at 20% server-authorized speed');
throws(()=>projectServerSettlementV2({...proof,claimedElapsedSeconds:240}),/unexpected_elapsed_field/,'non-idle source rejects arbitrary claim elapsed');
const combat=projectServerSettlementV2({
  source:'combat_reward',sourceId:'boss_0000001',ownerCharacterId:c2,receivingCharacterId:c2,
  completed:true,baseEffortSeconds:300,difficultyBasisPoints:5000,
});
equal(combat.award.overallCharacterXp,75,'combat can grant overall XP');
equal(combat.award.professionXp,0,'combat cannot grant profession XP');
equal(combat.award.combatXp,0,'existing combat authority alone grants combat XP');
equal(previewApplyJournalAwardV2(first.state,combat).state.overallXpByCharacter[c2],75,'per character ownership');
const capped=previewLegacyCareerMigrationV2({combatLevel:100,professionLifetimeXp:{}});
equal(capped.overallCharacterXp,overallTotalXpForLevelV2(100),'new overall cap threshold');
throws(()=>previewApplyJournalAwardV2({overallXpByCharacter:{[c1]:Number.MAX_SAFE_INTEGER},receipts:{}},receipt),/overflow/,'XP overflow protection');
console.log('PASS: V2 legacy migration level preservation, journal idempotency, ownership and credit boundaries');
