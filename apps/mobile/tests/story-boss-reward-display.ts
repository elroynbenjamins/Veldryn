import {storyBossRewardDisplay} from '../src/core/story-boss-reward-display';

function expect(actual:unknown,expected:unknown,description:string){
  if(actual!==expected)throw new Error(`${description}: expected ${String(expected)}, got ${String(actual)}`);
}

const weekly=storyBossRewardDisplay(
  'Fallen Knight weekly clear 1/3 won in 42s. +720 Gold, +1800 XP, +28 Essence · '+
  'Oathglass Bounty completed: 1 Oathglass Fragment, 1 Tempering Core, 10 Gem Dust, 1 Regional Catalyst · '+
  'Boss drops: 3× Echo-Touched Pelt, 4× Torn Oathcloth, 12× Tempering Dust, 1× Tempering Core · +1 Bondstone.'
);
expect(weekly.gold,720,'Weekly Gold is itemized');
expect(weekly.xp,1800,'Weekly XP is itemized');
expect(weekly.essence,28,'Weekly Essence is itemized');
expect(weekly.bondstones,1,'Bonus Bondstone is itemized');
expect(weekly.weeklyClear,'1/3','Weekly clear count is available');
expect(weekly.bountyCompleted,true,'First clear highlights bounty completion');
expect(weekly.bounty.length,4,'All bounty items are shown');
expect(weekly.drops.length,4,'All rolled boss drops are shown');
expect(weekly.drops[0].name,'Echo-Touched Pelt','Hyphenated loot names survive parsing');
expect(weekly.drops[2].quantity,12,'Stack quantity is shown correctly');

const rematch=storyBossRewardDisplay(
 'Fallen Knight weekly clear 2/3 won in 48s. +220 Gold, +600 XP, +8 Essence · '+
 'Boss drops: no bonus drop · Bondstone weekly cap already reached.'
);
expect(rematch.weeklyClear,'2/3','Second weekly clear number is retained');
expect(rematch.bountyCompleted,false,'Bounty is not repeated on later clears');
expect(rematch.drops.length,0,'Zero boss drops are explicit');
expect(rematch.bondstoneCapped,true,'Weekly Bondstone limit is visible');

const story=storyBossRewardDisplay(
 'Fallen Knight defeated in 34s. +900 Gold, +3,000 XP, +40 Companion Essence, +1 Bondstone. '+
 'Boss drops: 2× Oathglass Shard, 1× Tempering Core.'
);
expect(story.xp,3000,'Story clear numbers support thousands separators');
expect(story.essence,40,'Companion Essence is recognized');
expect(story.bondstones,1,'Story clear Bondstone is recognized');
expect(story.drops.length,2,'Story clear drops are visible');
expect(story.weeklyClear,null,'Story clear has no weekly counter');

const unknown=storyBossRewardDisplay('An unfamiliar settlement response.');
expect(unknown.recognized,false,'Unknown results retain original message in UI');
console.log('PASS story boss reward presentation breakdown');
