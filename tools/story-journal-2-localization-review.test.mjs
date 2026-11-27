import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {storyJournal2Rows,storyJournal2Text} from '../apps/mobile/src/i18n/story-journal-2-review.ts';
import {onboardingTipReview} from './story-journal-2-learning-review.mjs';
const guide=JSON.parse(readFileSync(new URL('../docs/2-0/story-asterfall-onboarding-review-v1.json',import.meta.url),'utf8'));
const langs=['en','de','es','nl','it','fr','ru','tr'];
for(const [key,row] of Object.entries(storyJournal2Rows)){
 assert.equal(row.length,7,key);assert.ok(row.every(v=>v.trim().length>0),key);
 for(const l of langs)assert.ok(storyJournal2Text(l,key).length>0);
}
assert.equal(storyJournal2Text('nl','Search quests'),'Missies zoeken');
assert.equal(storyJournal2Text('de','custom',x=>'fallback:'+x),'fallback:custom');
for(const file of ['StoryJournal2Review','StoryJournalRecords2Review','StoryQuestDetail2Review','StoryQuestTracker2Review']){
 const content=readFileSync(new URL('../apps/mobile/src/components/'+file+'.tsx',import.meta.url),'utf8');
 for(const match of content.matchAll(/\bt\('([^']+)'\)/g))assert.ok(Object.hasOwn(storyJournal2Rows,match[1]),file+': '+match[1]);
}
const e={accountId:'a',characterId:'c'},base={...e,questStates:{QST_001:'active'},accountSeen:[],characterSeen:[],dismissed:[],canStartHunt:true};
const tip=s=>onboardingTipReview(guide,{...base,...s},e);
assert.equal(tip({}).system,'combat');
assert.equal(tip({usedSystems:['combat']}),null);
assert.equal(tip({inBossFight:true}),null);
assert.equal(tip({inDungeon:true}),null);
assert.equal(tip({activity:{kind:'combat',targetId:'MOSS_RAT',rewardReady:true}}).system,'collection');
assert.equal(tip({activity:{kind:'gathering',rewardReady:true}}),null);
assert.equal(tip({storyRewardReady:true}),null);
assert.equal(tip({questStates:{QST_002:'active'},gatheringAccess:true}).system,'gathering');
assert.equal(tip({questStates:{QST_007:'active'},scoutingAvailable:false}),null);
assert.equal(tip({questStates:{QST_007:'active'},scoutingAvailable:true}).system,'scouting');
assert.equal(tip({questStates:{QST_003:'active'},ironwoodReportReady:true}).system,'scouting-report');
assert.equal(tip({questStates:{QST_005:'active'},companionAccess:true}),null);
assert.equal(tip({questStates:{QST_005:'claimed'},companionAccess:true}).system,'companions');
console.log('Eight-language fixed-label review and first-session contextual progression: PASS');
