export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const gathering=read('src/components/GatheringActivityList.tsx');
ok(gathering.includes('gatheringBalanceProjection'),'Gathering UI must use the shared balance projection instead of duplicating rate math');
ok(gathering.includes('EST. YIELD / HR')&&gathering.includes('SKILL XP / HR'),'Gathering cards must show current yield and XP pace');
ok(gathering.includes('next level ~')&&gathering.includes('formatBalanceDuration'),'Gathering guidance must expose next-level ETA');
ok(gathering.includes('levelProgress:{')&&gathering.includes('XP remaining at current pace'),'Gathering cards must show compact level-progress feedback');

const activity=read('src/components/ActivityCard.tsx');
ok(activity.includes('levelPace?:LevelPaceProjection'),'Active activity card must accept a progression pace projection');
ok(activity.includes("accessibilityLabel={levelPace.label+' level progress'}"),'Active level-progress bar must be accessible');
ok(activity.includes('XP remaining · ')&&activity.includes('XP/hr'),'Active level feedback must include remaining XP and current XP/hour');

const home=read('src/screens/HomeScreen.tsx');
ok(home.includes('activeActivityLevelPace(state,rate.xpPerHour)'),'Home must derive level ETA from the same activity rate shown to the player');
ok(home.includes('levelPace={levelPace}'),'Home must pass live level pace into the active activity card');

const encounters=read('src/components/RegionEncounterList.tsx');
ok(encounters.includes('combatBaselineProjection(monster)'),'Encounter details must use the shared corrected combat baseline');
ok(encounters.includes('dropExpectation(drop.chance'),'Drop rows must derive odds/time from the shared drop projection');
ok(encounters.includes('BASELINE PACE')&&encounters.includes('kills/hr'),'Combat details must show corrected baseline hunt pace');
ok(encounters.includes('~1/')&&encounters.includes('avg '),'Drop rows must show one-in-N odds and average base find time');

const recipe=read('src/components/RecipeCard.tsx');
const skillNavigation=read('src/core/skill-progression-navigation.ts');
ok(recipe.includes('row.estimateLabel')&&recipe.includes('sourceEstimate'),'Missing recipe materials must show compact projected acquisition time when a trustworthy source rate exists');
ok(skillNavigation.includes('acquisitionProjectionForDestination')&&skillNavigation.includes("current pace")&&skillNavigation.includes("base pace"),'Recipe source estimates must distinguish player-current gathering pace from baseline combat pace');
ok(skillNavigation.includes("b.key.startsWith('prerequisite:')")&&skillNavigation.includes('b.estimatedSeconds'),'Recipe source list must keep prerequisites first and then surface the longest estimated material bottleneck');

console.log('PASS: player-facing progression bars, ETAs and drop expectations use shared balance projections');
