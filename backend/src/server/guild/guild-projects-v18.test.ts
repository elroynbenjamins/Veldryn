import { strict as assert } from 'node:assert';
import { buildGuildWeeklyProjectBoard, chooseVoteWinner, autoStartVoteThreshold } from './guild-project-board';
import { cappedGuildSourcedBonus, decreeCandidates } from './guild-decrees';
import { guildProjectSeasonScore } from './guild-project-ranking';
import {
  GUILD_WEEKLY_PROJECT_POOL,
  creditGuildProjectContribution,
  deriveGuildWeeklyProjectBalance,
  evaluateGuildProject,
  guildProjectSlotCap,
  memberEligibleForGuildProjectCompletionReward,
  reachedGuildMilestones,
} from './guild-projects';
import { roleHasPermission, validateGuildBulletin } from './guild-social';

function run(){
  assert.equal(guildProjectSlotCap(4),0); assert.equal(guildProjectSlotCap(5),1); assert.equal(guildProjectSlotCap(10),2); assert.equal(guildProjectSlotCap(25),3);
  const small=deriveGuildWeeklyProjectBalance(4); const large=deriveGuildWeeklyProjectBalance(40);
  assert.equal(small.targetPoints,6800); assert.equal(large.targetPoints,32000); assert.equal(small.minimumMeaningfulContributors,2); assert.equal(large.minimumMeaningfulContributors,8);
  assert.ok(large.singleAccountCompletionShareCap<small.singleAccountCompletionShareCap);
  const profile={id:'combat.test',category:'combat' as const,expectedSecondsPerUnit:3600,challenge:'routine' as const};
  const credit=creditGuildProjectContribution({profile,units:5,pointsCreditedToday:0,completionPointsByAccount:0,balance:small});
  assert.equal(credit.dailyCreditedPoints,2400,'daily cap must stop one settlement from dumping unlimited effort');
  assert.ok(credit.completionCreditedPoints<=Math.ceil(small.targetPoints*small.singleAccountCompletionShareCap));
  const mixed=GUILD_WEEKLY_PROJECT_POOL.find(x=>x.focus==='mixed')!;
  const mixedBalance=deriveGuildWeeklyProjectBalance(10);
  const fail=evaluateGuildProject(mixed,mixedBalance,[{accountId:'a',rawPoints:5000,completionPoints:5000,combatPoints:5000,skillingPoints:0},{accountId:'b',rawPoints:7000,completionPoints:7000,combatPoints:7000,skillingPoints:0}]);
  assert.equal(fail.complete,false); assert.ok(fail.missing.includes('mixed_skilling_share'));
  const pass=evaluateGuildProject(mixed,mixedBalance,[{accountId:'a',rawPoints:6000,completionPoints:6000,combatPoints:6000,skillingPoints:0},{accountId:'b',rawPoints:5000,completionPoints:5000,combatPoints:0,skillingPoints:5000}]);
  assert.equal(pass.complete,true);
  assert.equal(memberEligibleForGuildProjectCompletionReward(mixedBalance,{accountId:'x',rawPoints:1000,completionPoints:1000,combatPoints:500,skillingPoints:500},{currentMember:true,wasMemberAtStart:true,projectStartedAtMs:0,projectCompletedAtMs:10}),true);
  assert.equal(memberEligibleForGuildProjectCompletionReward(mixedBalance,{accountId:'x',rawPoints:1000,completionPoints:1000,combatPoints:500,skillingPoints:500},{currentMember:true,wasMemberAtStart:false,joinedAtMs:0,progressFractionAtJoin:.2,projectStartedAtMs:0,projectCompletedAtMs:49*3600000}),true);
  assert.equal(memberEligibleForGuildProjectCompletionReward(mixedBalance,{accountId:'x',rawPoints:1000,completionPoints:1000,combatPoints:500,skillingPoints:500},{currentMember:true,wasMemberAtStart:false,joinedAtMs:0,progressFractionAtJoin:.8,projectStartedAtMs:0,projectCompletedAtMs:72*3600000}),false);
  assert.deepEqual(reachedGuildMilestones(12500,10000),[25,50,75,100,125]);
  const board1=buildGuildWeeklyProjectBoard('11111111-1111-1111-1111-111111111111',25,new Date('2026-09-14T12:00:00Z'));
  const board2=buildGuildWeeklyProjectBoard('11111111-1111-1111-1111-111111111111',25,new Date('2026-09-15T12:00:00Z'));
  assert.deepEqual(board1.map(x=>x.templateId),board2.map(x=>x.templateId)); assert.deepEqual(board1.map(x=>x.focus),['combat','skilling','mixed']);
  assert.equal(autoStartVoteThreshold(30),3); assert.equal(autoStartVoteThreshold(60),6);
  assert.ok(chooseVoteWinner([{templateId:'a',votes:2},{templateId:'b',votes:2}],'g','2026-09-14'));
  assert.equal(cappedGuildSourcedBonus(.10,decreeCandidates('g','w',50)[0]),Math.min(decreeCandidates('g','w',50)[0].guildSourcedHardCap,.10+decreeCandidates('g','w',50)[0].bonusValue));
  const weekly=GUILD_WEEKLY_PROJECT_POOL[0]; assert.equal(guildProjectSeasonScore({definition:weekly,priorCompletionsOfSameTemplateThisSeason:0,reachedStretchMilestone:false}),40); assert.equal(guildProjectSeasonScore({definition:weekly,priorCompletionsOfSameTemplateThisSeason:3,reachedStretchMilestone:false}),14);
  assert.equal(roleHasPermission('quartermaster','manage_vault'),true); assert.equal(roleHasPermission('recruiter','start_project'),false);
  let bulletinFailed=false; try{validateGuildBulletin('x'.repeat(281));}catch{bulletinFailed=true;} assert.equal(bulletinFailed,true); assert.equal(validateGuildBulletin(' hello '),'hello');
  console.log('v18 guild projects/social tests passed');
}
run();
