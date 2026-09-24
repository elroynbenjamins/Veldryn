import {strict as assert} from 'node:assert';
import {COMPANION_SPECIAL_CHALLENGES,COMPANION_WEEKLY_CHALLENGES,companionTrialSeasonDefinition} from '../../../backend/src/server/companions/content';
import {validateCompanionTrialTeam,restrictionSatisfied,companionTeamViews} from '../../../backend/src/server/companions/team';
import type {OwnedCompanionSnapshot} from '../../../backend/src/server/companions/domain';

const ids=['UNIT_001','UNIT_002','UNIT_003','UNIT_006','UNIT_007','UNIT_008','UNIT_015','UNIT_023','EVT_UNIT_004'];
const owned=Object.fromEntries(ids.map(id=>[id,{companionId:id,level:30,xp:0,ascensionTier:3 as const,bondLevel:10,bondXp:3000,bondTraitUnlocked:true} satisfies OwnedCompanionSnapshot]));

const unique=['UNIT_001','UNIT_002','UNIT_003'];
const uniqueViews=companionTeamViews(unique,owned);
assert.equal(restrictionSatisfied(uniqueViews,{type:'affinity_unique'}),true);
assert.equal(restrictionSatisfied(uniqueViews,{type:'affinity_diversity',count:3}),true);
assert.equal(restrictionSatisfied(uniqueViews,{type:'prohibit_affinity',affinity:'construct'}),false);

const lightShadow=['UNIT_006','UNIT_007','UNIT_003'];
const lightShadowViews=companionTeamViews(lightShadow,owned);
assert.equal(restrictionSatisfied(lightShadowViews,{type:'require_affinity',affinity:'radiant',count:1}),true);
assert.equal(restrictionSatisfied(lightShadowViews,{type:'require_affinity',affinity:'umbral',count:1}),true);

const noConstruct=['UNIT_006','UNIT_001','UNIT_003'];
assert.equal(restrictionSatisfied(companionTeamViews(noConstruct,owned),{type:'prohibit_affinity',affinity:'construct'}),true);

for(const challenge of COMPANION_SPECIAL_CHALLENGES.filter(c=>c.rewardCompanionId.startsWith('UNIT_'))){
 assert.ok(challenge.teamRestrictions?.length,'live Special Challenge must carry a team-building rule');
}
const oath=COMPANION_SPECIAL_CHALLENGES.find(c=>c.id==='CHALLENGE_OATHGLASS_KNIGHTLING')!;
assert.equal(validateCompanionTrialTeam({companionIds:unique,owned,busyCompanionIds:new Set(),restrictions:oath.teamRestrictions}).ok,true);
const allRadiant=['UNIT_015','EVT_UNIT_004','UNIT_008'];
assert.equal(validateCompanionTrialTeam({companionIds:allRadiant,owned,busyCompanionIds:new Set(),restrictions:oath.teamRestrictions}).ok,false,'Oathglass must reject duplicate Affinities');

const affinityChallengeIds=new Set(COMPANION_WEEKLY_CHALLENGES.filter(c=>c.restrictions.some(r=>r.type.includes('affinity'))).map(c=>c.id));
assert.ok(affinityChallengeIds.size>=4);
for(const seasonKey of ['2026-09','2026-10','2026-11']){
 const season=companionTrialSeasonDefinition(seasonKey);
 assert.ok(season.specialChallenges.some(id=>affinityChallengeIds.has(id)),seasonKey+' should feature an Affinity challenge');
}
console.log('PASS Companion Trial and Special Challenge Affinity rules');
