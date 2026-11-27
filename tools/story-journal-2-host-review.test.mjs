import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {journalHostIntentReview} from '../apps/mobile/src/core/story-journal-host-review.ts';
const id={accountId:'account',characterId:'hero'},returnTo={...id,screen:'Journal',tab:'story',questId:'story2:asterfall:01'},known=[returnTo.questId];
const combat={screen:'World',zoneId:'GREENFIELDS',monsterId:'MOSS_RAT',returnTo};
const world=journalHostIntentReview(combat,id,known);
assert.equal(world.status,'review');
assert.deepEqual(world.intent,{tab:'World',goalRegionId:'GREENFIELDS',regionalAreaId:undefined,goalMonsterId:'MOSS_RAT'});
assert.equal(world.authorizesAccess,false);
assert.equal(journalHostIntentReview(combat,{...id,characterId:'other'},known).reason,'stale_return_context');
assert.equal(journalHostIntentReview(combat,id,[]).reason,'stale_return_context');
const fishing=journalHostIntentReview({screen:'Skills',skillId:'fishing',gatheringId:'OASIS_CARP_POOL',areaId:'ZONE_006',returnTo},id,known);
assert.equal(fishing.intent.goalActionId,'OASIS_CARP_POOL');
assert.equal(fishing.intent.regionalAreaId,'ZONE_006');
const scouting={screen:'Skills',skillId:'exploration',section:'Reports',routeId:'SCOUT_IRONWOOD',assignmentId:'report1',returnTo};
assert.equal(journalHostIntentReview(scouting,id,known).reason,'exploration_host_pending');
assert.equal(journalHostIntentReview(scouting,id,known,true).intent.assignmentId,'report1');
assert.equal(journalHostIntentReview({screen:'Inventory',returnTo},id,known).intent.tab,'Inventory');
assert.equal(journalHostIntentReview({screen:'Travel',returnTo},id,known).reason,'unsupported_destination');
const detail=readFileSync(new URL('../apps/mobile/src/components/StoryQuestDetail2Review.tsx',import.meta.url),'utf8');
assert.ok(detail.includes('GameModalSurface')&&detail.includes('GameButton')&&detail.includes('useGameTheme'));
assert.ok(!detail.includes('onClaim')&&!detail.includes('perform('));
for(const file of ['StoryJournal2Review','StoryJournalRecords2Review','StoryQuestTracker2Review']){
 const content=readFileSync(new URL('../apps/mobile/src/components/'+file+'.tsx',import.meta.url),'utf8');
 assert.ok(content.includes('useGameTheme')&&content.includes('makeStyles'));
}
console.log('Scoped host intents, exploration guard, detail sheet and shared theme wiring: PASS');
