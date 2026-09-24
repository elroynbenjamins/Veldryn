import {strict as assert} from 'node:assert';
import {
 canAllocate,GUILD_BASE_MEMBER_CAP,GUILD_LAUNCH_LEVEL_CAP,GUILD_LAUNCH_MEMBER_CAP,GUILD_MEMBER_CAP_LEVEL_GATES,
 GUILD_SKILLS,GUILD_SKILL_POINT_BUDGET,GUILD_SKILL_POINTS_BY_LEVEL,GUILD_TREE_TIER_REQUIREMENTS,GUILD_XP_THRESHOLDS,
 guildLevelForXp,guildMemberCapForRanks,guildSkillPointBudgetForLevel,guildUpgradeEffects,spentPoints,
} from '../progression';

const ranks:Record<string,number>={};
assert.equal(spentPoints(ranks),0);
assert.equal(GUILD_LAUNCH_LEVEL_CAP,10);
assert.equal(GUILD_BASE_MEMBER_CAP,12);
assert.equal(GUILD_LAUNCH_MEMBER_CAP,20);
assert.deepEqual([...GUILD_MEMBER_CAP_LEVEL_GATES],[2,4,7,10]);
assert.deepEqual([...GUILD_SKILL_POINTS_BY_LEVEL],[0,3,6,9,14,17,20,23,26,31]);
assert.equal(GUILD_SKILL_POINT_BUDGET,31);
assert.deepEqual([...GUILD_XP_THRESHOLDS],[0,1200,3200,6500,11000,17000,24500,33500,44000,56000]);
assert.equal(guildLevelForXp(55999),9);
assert.equal(guildLevelForXp(56000),10);
assert.equal(guildLevelForXp(999999999),10);
assert.equal(guildSkillPointBudgetForLevel(5),14);
assert.equal(guildSkillPointBudgetForLevel(10),31);

const professions=GUILD_SKILLS.filter(entry=>entry.branch==='professions');
const fellowship=GUILD_SKILLS.filter(entry=>entry.branch==='fellowship');
const vanguard=GUILD_SKILLS.filter(entry=>entry.branch==='vanguard');
assert.equal(professions.length,3);
assert.equal(fellowship.length,4);
assert.equal(vanguard.length,4);
assert.ok(professions.every(entry=>entry.scope==='all_skilling'));
assert.ok(vanguard.every(entry=>entry.scope==='guild_combat_only'));

const training=GUILD_SKILLS.find(entry=>entry.id==='professions_training');if(!training)throw new Error('professions_training missing');
assert.equal(training.maxRank,6);
assert.equal(training.effectPerRank,100);
assert.equal(guildUpgradeEffects({professions_training:6}).skillXpBps,600);
assert.equal(canAllocate({},training,1,3,2),true);

const assault=GUILD_SKILLS.find(entry=>entry.id==='vanguard_assault');if(!assault)throw new Error('vanguard_assault missing');
assert.equal(assault.maxRank,6);
assert.ok(assault.costPerRank.reduce((sum,value)=>sum+value,0)>training.costPerRank.reduce((sum,value)=>sum+value,0));
assert.equal(guildUpgradeEffects({vanguard_assault:6}).guildCombatDamageBps,600);

const halls=GUILD_SKILLS.find(entry=>entry.id==='member_capacity');if(!halls)throw new Error('member_capacity skill missing');
assert.equal(halls.maxRank,4);
assert.equal(guildMemberCapForRanks({}),12);
assert.equal(guildMemberCapForRanks({member_capacity:1}),14);
assert.equal(guildMemberCapForRanks({member_capacity:4}),20);
assert.equal(canAllocate({},halls,1,31,1),false);
assert.equal(canAllocate({},halls,1,31,2),true);
assert.equal(canAllocate({member_capacity:1},halls,2,31,3),false);
assert.equal(canAllocate({member_capacity:1},halls,2,31,4),true);

const vanguardTier3=GUILD_TREE_TIER_REQUIREMENTS.find(row=>row.branch==='vanguard'&&row.tier===3);
assert.equal(vanguardTier3?.requiredGuildLevel,10);
assert.equal(vanguardTier3?.goldCost,250000);
assert.equal(vanguardTier3?.materialContributionUnits,3200);
console.log('guild progression PASS');
