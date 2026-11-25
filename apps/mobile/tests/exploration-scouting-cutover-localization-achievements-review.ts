import assert from 'node:assert/strict';
import {SUPPORTED_LANGUAGES} from '../src/i18n/languages';
import {SCOUTING_REVIEW_MESSAGES,scoutingReviewText} from '../src/i18n/exploration-scouting-review';
import {scouting2CutoverDestination,scouting2CompanionSectionAllowed,accountExplorationHero,SCOUTING_2_COMPANION_SECTIONS,SCOUTING_2_UI_CUTOVER_RELEASED} from '../src/core/exploration-scouting-cutover-ui-review';
import {scoutingAchievementProgress,scoutingAchievementServerFacts,SCOUTING_2_ACHIEVEMENTS_RELEASED} from '../src/core/exploration-scouting-achievements-review';
import {ACCOUNT_EXPLORATION_VERSION,type AccountExploration} from '../src/core/exploration-account-review';
import {SCOUT_ROUTES} from '../src/core/exploration-scouting-review';

for(const language of SUPPORTED_LANGUAGES){
 const row=SCOUTING_REVIEW_MESSAGES[language];
 assert.equal(Object.keys(row).length,Object.keys(SCOUTING_REVIEW_MESSAGES.en).length);
 for(const value of Object.values(row))assert.ok(value.trim().length>0);
 assert.ok(scoutingReviewText(language,'Scouting Camp').length>0);
}
assert.equal(SCOUTING_2_UI_CUTOVER_RELEASED,false);
assert.deepEqual(SCOUTING_2_COMPANION_SECTIONS,['Collection','Training','Sanctuary','Trials']);
assert.equal(scouting2CompanionSectionAllowed('Expeditions'),false);
assert.equal(scouting2CutoverDestination({surface:'companion_expeditions'}).skillId,'exploration');
assert.equal(scouting2CutoverDestination({surface:'companion_expedition_claim',assignmentId:'old1'}).tab,'Reports');
assert.equal(scouting2CutoverDestination({surface:'companion_sanctuary_pens'}).focus,'scouting-camp');

const completeIds=SCOUT_ROUTES.filter(r=>r.released).map(r=>r.legacyId);
const account:AccountExploration={version:ACCOUNT_EXPLORATION_VERSION,accountId:'a',xp:100000,level:20,creditedDiscoveryIds:completeIds,retainedSlots:2,sourceCharacterIds:['c1','c2']};
const hero=accountExplorationHero(account);assert.equal(hero.level,20);assert.equal(hero.characterSlotContribution,0);assert.equal(hero.scope,'Account-wide');
const achievements=scoutingAchievementProgress(account,{reportsClaimed:9});
assert.equal(SCOUTING_2_ACHIEVEMENTS_RELEASED,false);assert.equal(achievements.length,5);assert.ok(achievements.every(a=>a.completed));
assert.equal(achievements.find(a=>a.id==='exploration2_first_report')?.progress,1);
assert.equal(achievements.find(a=>a.id==='exploration2_known_realm')?.progress,3);
assert.deepEqual(scoutingAchievementServerFacts({accountId:'a',account,claimedReportIds:['r1','r1','r2']}),{reportsClaimed:2});
assert.throws(()=>scoutingAchievementServerFacts({accountId:'b',account,claimedReportIds:[]}),/owner_mismatch/);
assert.throws(()=>scoutingAchievementProgress(account,{reportsClaimed:-1}),/invalid_report_count/);
console.log('PASS 8-language scouting catalog, old Expeditions cutover, account SkillHero and achievement projection');
