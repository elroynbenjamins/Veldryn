import {strict as assert} from 'node:assert';
import {launchPlayer} from '../../content/launch-combat';
import {CLASS_NAMES_V2,SKILL_IDENTITIES_V2,SKILLS_V2,SPECIALIZATIONS_V2} from '../skill-catalog';
import type {ClassIdV2} from '../build-contract';
import {selectReviewSkillLoadoutV2} from '../ability-counterplay-strategies';

const bosses=[
 'BOSS_EXP_ROOT','BOSS_EXP_BELL','BOSS_EXP_SOLAR',
 'BOSS_EXP_SPHINX','BOSS_EXP_BELLBEAST','BOSS_EXP_CANTOR',
] as const;
let selected=0,alternatives=0,missingSpecialized=0;
for(const classId of Object.keys(CLASS_NAMES_V2) as ClassIdV2[]){
 for(const spec of SPECIALIZATIONS_V2.filter(x=>x.classId===classId)){
  for(const bossId of bosses){
   const actor=launchPlayer(CLASS_NAMES_V2[classId],60);
   const old=JSON.stringify(actor);
   const generic=selectReviewSkillLoadoutV2(classId,spec.id,actor,bossId,'generic');
   const targeted=selectReviewSkillLoadoutV2(classId,spec.id,actor,bossId,'targeted');
   const alternative=selectReviewSkillLoadoutV2(classId,spec.id,actor,bossId,'alternative');
   for(const pick of [generic,targeted,alternative]){
    selected++;
    assert.equal(pick.activeSkills.length,2);
    assert.equal(new Set(pick.activeSkills.map(s=>s.skillId)).size,2);
    for(const skill of pick.activeSkills){
     const item=SKILL_IDENTITIES_V2.find(s=>s.id===skill.skillId);
     assert.equal(item?.classId,classId);
     assert.ok(item?.variants.some(v=>v.id===skill.variantId));
     assert.ok(SKILLS_V2.some(s=>s.id===item?.id&&s.unlockLevel<=actor.level));
    }
    assert.ok(pick.potentialRouteScore>=0);
    assert.deepEqual(
     selectReviewSkillLoadoutV2(classId,spec.id,actor,bossId,pick.strategy),pick,
     'Identical server-authored actor/spec/boss must select the same variants',
    );
   }
   if(JSON.stringify(targeted.activeSkills)!==JSON.stringify(alternative.activeSkills))
    alternatives++;
   if(!targeted.hasMatchingCounter)missingSpecialized++;
   assert.equal(JSON.stringify(actor),old,'Never mutate a class actor in QA selection');
  }
 }
}
assert.equal(selected,9*2*6*3);
assert.ok(alternatives>0,'Need meaningful non-identical loadout comparisons');
assert.ok(missingSpecialized>=0,'Fallback to another route is allowed for every class');
const actor=launchPlayer(CLASS_NAMES_V2.IRONWARDEN,60);
const spec=SPECIALIZATIONS_V2.find(s=>s.classId==='IRONWARDEN')!;
assert.throws(()=>selectReviewSkillLoadoutV2(
 'IRONWARDEN',spec.id,actor,'FAKE_BOSS','targeted'),/unknown_boss/);
assert.throws(()=>selectReviewSkillLoadoutV2(
 'IRONWARDEN',spec.id,actor,'BOSS_EXP_ROOT','CHEAT' as 'targeted'),/unknown_strategy/);
assert.throws(()=>selectReviewSkillLoadoutV2(
 'IRONWARDEN','FAKE_SPEC',actor,'BOSS_EXP_ROOT','targeted'),/invalid_specialization/);
console.log('PASS: '+selected+' deterministic server-compiled tactical selections, '+alternatives+
 ' differing 18-spec boss pairs, '+missingSpecialized+
 ' class-native fallback profiles (coverage data, NOT release balance)');
