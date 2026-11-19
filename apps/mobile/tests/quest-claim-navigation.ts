import {createCharacter,newGame} from '../src/core/game';
import {recordSeasonalActivity,seasonalQuestBoard,SEASONAL_ACTIVITY_TAGS,type ContractTag} from '../src/core/seasonal-quests';
import {seasonalChallengeDestination} from '../src/core/quest-challenge-navigation';
import {questClaimAttention} from '../src/core/quest-claim-attention';
import type {GameState} from '../src/core/types';

const equal=(actual:unknown,expected:unknown,label:string)=>{
 if(actual!==expected)throw new Error(label+': '+String(actual)+' !== '+String(expected));
};
const now=Date.parse('2026-11-18T20:00:00.000Z');
const base=createCharacter(newGame(now),'BASTION','Quest QA');
equal(questClaimAttention(base,now).challenges,0,'Fresh character has no finished class challenge');
const story={...base,quests:base.quests.map((quest,index)=>index===0?{...quest,status:'complete' as const}:quest)};
equal(questClaimAttention(story,now).story,1,'Story completion creates a claim alert');

const completed=SEASONAL_ACTIVITY_TAGS.reduce((current,tag)=>recordSeasonalActivity(current,tag,1000,now),story) as GameState;
const ready=questClaimAttention(completed,now);
if(ready.challenges<1)throw new Error('Settled seasonal progress must mark at least one challenge as claimable');
const first=seasonalQuestBoard(completed,'daily',new Date(now)).find(row=>row.progress>=row.required);
if(!first)throw new Error('Test requires an earned Class Challenge');
const marked={...completed,character:{...completed.character!,personalSeasonal:{
  ...completed.character!.personalSeasonal!,claimIds:[first.id],
}}} as GameState;
equal(questClaimAttention(marked,now).challenges,ready.challenges-1,'Claiming a challenge clears one unread reward without a seen flag');
equal(questClaimAttention(marked,now).story,1,'Claiming a challenge preserves unrelated story attention');

const milestone={...marked,account:{...marked.account,monthlyQuestMilestones:{months:[{
 key:'2026-11',points:60,creditedQuestIds:[],claimed:{},
}]}}} as GameState;
equal(questClaimAttention(milestone,now).milestones,2,'Only reached and unclaimed milestones draw attention');
const milestoneClaimed={...milestone,account:{...milestone.account,monthlyQuestMilestones:{months:[{
 key:'2026-11',points:60,creditedQuestIds:[],claimed:{
  30:{characterId:marked.character!.id,skillId:'faith' as const,claimedAtMs:now,xpGranted:1000},
 },
}]}}} as GameState;
equal(questClaimAttention(milestoneClaimed,now).milestones,1,'Claiming milestone XP clears the corresponding claim attention');
equal(questClaimAttention(milestoneClaimed,Date.parse('2026-12-09T20:00:00.000Z')).milestones,0,'Expired previous-month milestones stop notifying');

const destinations:[ContractTag,string,string|undefined,string|undefined][]=[
 ['faith','Skills','faith','faith'],
 ['exploration','Skills','exploration','gathering'],
 ['gathering','Skills',undefined,'gathering'],
 ['crafting','Skills',undefined,'crafting'],
 ['cooking','Skills','cooking','crafting'],
 ['alchemy','Skills','alchemy','crafting'],
 ['smithing','Skills','smithing','crafting'],
 ['tailoring','Skills','tailoring','crafting'],
 ['enchanting','Skills','enchanting','crafting'],
 ['combat','Combat',undefined,undefined],
 ['boss','Combat',undefined,undefined],
 ['event','Events',undefined,undefined],
 ['equipment','Inventory',undefined,undefined],
];
for(const [tag,tab,skillId,mode] of destinations){
 const route=seasonalChallengeDestination({tag});
 equal(route.tab,tab,'Destination tab for '+tag);
 equal(route.skillId,skillId,'Destination skill for '+tag);
 equal(route.mode,mode,'Destination skill mode for '+tag);
 if(!route.label)throw new Error('Class challenge button has no label: '+tag);
}
console.log('PASS: quest claim attention and Class Challenge skill deep links');
