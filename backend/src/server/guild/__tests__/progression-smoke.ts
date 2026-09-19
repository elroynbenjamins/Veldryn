import {strict as assert} from 'node:assert';import {canAllocate,GUILD_BASE_MEMBER_CAP,GUILD_LAUNCH_LEVEL_CAP,GUILD_LAUNCH_MEMBER_CAP,GUILD_MEMBER_CAP_LEVEL_GATES,GUILD_SKILLS,guildMemberCapForRanks,guildUpgradeEffects,spentPoints} from '../progression';
const ranks:Record<string,number>={};assert.equal(spentPoints(ranks),0);
const skill={id:'project_coordination',branch:'community' as const,name:'Project Coordination',maxRank:3,costPerRank:[3,5,7],effectKey:'projectContributionEfficiencyBps' as const,effectPerRank:100};
assert.equal(canAllocate(ranks,skill,1),true);const next={...ranks,[skill.id]:1};assert.equal(guildUpgradeEffects(next).projectContributionEfficiencyBps,100);assert.equal(canAllocate(next,skill,3),false);
assert.equal(GUILD_LAUNCH_LEVEL_CAP,10);assert.equal(GUILD_BASE_MEMBER_CAP,12);assert.equal(GUILD_LAUNCH_MEMBER_CAP,20);assert.deepEqual([...GUILD_MEMBER_CAP_LEVEL_GATES],[2,4,7,10]);
const halls=GUILD_SKILLS.find(entry=>entry.id==='member_capacity');if(!halls)throw new Error('member_capacity skill missing');assert.equal(halls.maxRank,4);
assert.equal(guildMemberCapForRanks({}),12);assert.equal(guildMemberCapForRanks({member_capacity:1}),14);assert.equal(guildMemberCapForRanks({member_capacity:4}),20);
assert.equal(canAllocate({},halls,1,100,1),false);assert.equal(canAllocate({},halls,1,100,2),true);assert.equal(canAllocate({member_capacity:1},halls,2,100,3),false);assert.equal(canAllocate({member_capacity:1},halls,2,100,4),true);assert.equal(canAllocate({member_capacity:3},halls,4,100,9),false);assert.equal(canAllocate({member_capacity:3},halls,4,100,10),true);
console.log('guild progression PASS');
