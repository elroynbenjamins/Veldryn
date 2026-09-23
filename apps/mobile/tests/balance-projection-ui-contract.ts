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

const activeBar=read('src/components/ActiveActivityBar.tsx');
ok(activeBar.includes('activeCombatRuntimeProjection(state)'),'Active combat bar must use the authoritative regional hunt cycle');
ok(activeBar.includes('activeGatheringRuntimeProjection(state)'),'Active gathering bar must use runtime-equivalent gathering pace');
ok(activeBar.includes('NEXT KILL')&&activeBar.includes('combatPresentation'),'Active combat feedback must synchronize presentation with the authoritative hunt cycle');
ok(activeBar.includes('HP {combatView?.enemyHp')&&activeBar.includes('−{combatView?.playerHit'),'Active combat feedback must keep satisfying enemy HP and damage feedback');

const battleStage=read('src/components/BattleStage.tsx');
ok(battleStage.includes('slashBright')&&battleStage.includes('sparkTravel'),'Expanded combat preview must include slash and particle hit feedback');
ok(battleStage.includes('synchronized presentation estimates'),'Combat preview must distinguish visual estimates from authoritative settlement');

const encounters=read('src/components/RegionEncounterList.tsx');
ok(encounters.includes('combatBaselineProjection(monster)'),'Encounter details must use the shared corrected combat baseline');
ok(encounters.includes('dropExpectation(drop.chance'),'Drop rows must derive odds/time from the shared drop projection');
ok(encounters.includes('BASELINE PACE')&&encounters.includes('kills/hr'),'Combat details must show corrected baseline hunt pace');
ok(encounters.includes('formatRegionalEnemySecondaryStats(monster)'),'Ordinary enemy cards must expose the secondary stats that affect regional hunt math');
ok(encounters.includes('~1/')&&encounters.includes('avg '),'Drop rows must show one-in-N odds and average base find time');

console.log('PASS: player-facing progression bars, ETAs and drop expectations use shared balance projections');
