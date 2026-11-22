const fs=require('node:fs');
const assert=require('node:assert/strict');
const read=path=>fs.readFileSync(path,'utf8');
const app=read('App.tsx');
const world=read('src/screens/WorldScreen.tsx');
const card=read('src/components/WorldDestinationGuide.tsx');
const chapters=read('src/components/WorldChapterNavigator.tsx');
const copy=read('src/i18n/gameplay.ts');
assert(app.includes('onTravel={travelToWorldRegion}'),'World travel should use the single guarded flow');
assert(app.includes('reachedWorldDestination(destination,regionId)'),'A detour must not clear the pending route');
assert(app.includes('currentRegionId!==regionId'),'Arrival must be confirmed from game state');
assert(app.includes('setPendingGoalDestination(undefined);setGoalRegionId(undefined);'),'Cancellation and arrival must clear intent');
assert(app.includes('canStartGatheringAtDestination(arrived,destination)'),'Quick start must re-check resource locks after travel');
assert(app.includes("active.kind!=='gathering'"),'Changing an existing activity requires confirmation');
assert(world.includes('<WorldDestinationGuide'),'World shows the actual target above the region navigator');
assert(world.includes('travelBusy={')===false,'World screen should receive busy as a prop and not fabricate it');
assert(card.includes('ResourceArtwork itemId={goal.itemId}'),'Gathering guide must show an actual item icon');
assert(card.includes('accessibilityRole="button"'),'Guide controls must work with accessibility services');
assert(card.includes("gt('Travel only')"),'Quick start must have a safe travel-only alternative');
assert(card.includes('onTravel(goal.regionId,'),'Card must send the exact region ID, not the chapter ID');
assert(chapters.includes("zone.id===goalRegionId"),'Chapter travel must prefer the selected region');
assert(chapters.includes('const isGoal=!!siblingRegion&&siblingRegion.id===goalRegionId'),'Asterfall siblings must visibly mark the exact destination');
for(const key of ['YOUR DESTINATION','Cancel destination','Ready to travel','Region locked','Travel & Start','Travel only']){
 assert(copy.includes(JSON.stringify(key)+':'),`Missing translated destination label: ${key}`);
}
assert(copy.includes('destinationGuideEarlyLocales'),'Russian and Turkish routes must have translated labels');
console.log('PASS: skill → World destination card, routing, activity guard, review styling, and eight-language strings');
