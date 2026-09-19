import { strict as assert } from 'node:assert';
import { formatGuildRole, projectFocusLabel, projectProgressPercent, type GuildProjectView } from '../src/core/guild-projects-v18';
const project:GuildProjectView={id:'p',name:'Rift',description:'',kind:'weekly_campaign',focus:'mixed',status:'active',slotIndex:1,targetPoints:10000,completionPoints:4500,combatPoints:2500,skillingPoints:2000,meaningfulContributors:3,minimumMeaningfulContributors:3,personalPoints:500,personalRewardThreshold:300,dailyPoints:300,dailyCap:2400,members:[],resourceGoals:[],canClaimCompletionReward:false,completionRewardClaimed:false};
assert.equal(projectProgressPercent(project),45); assert.equal(projectFocusLabel('skilling'),'Skilling'); assert.equal(formatGuildRole('co_leader'),'Co Leader');
const dev={...project,kind:'development' as const,focus:'development' as const,targetPoints:0,completionPoints:0,resourceGoals:[{resourceKind:'gold' as const,resourceId:'gold',label:'Gold',target:100,current:50},{resourceKind:'item' as const,resourceId:'wood',label:'Wood',target:100,current:100}]};
assert.equal(projectProgressPercent(dev),75);
console.log('v18 mobile guild project helpers passed');
