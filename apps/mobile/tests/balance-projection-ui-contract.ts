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

const recipe=read('src/components/RecipeCard.tsx');
const skillNavigation=read('src/core/skill-progression-navigation.ts');
const quickInspect=read('src/components/ItemQuickInspect.tsx');
ok(recipe.includes('row.estimateLabel')&&recipe.includes('sourceEstimate')&&recipe.includes('BOTTLENECK'),'Missing recipe materials must show compact acquisition estimates and the longest modeled bottleneck');
ok(recipe.includes('source.estimateLabel'),'Expanded Other sources must expose their own acquisition pace when modeled');
ok(skillNavigation.includes('acquisitionProjectionForDestination')&&skillNavigation.includes('b.estimatedSeconds'),'Recipe source estimates must reuse shared projection math and keep the longest modeled material visible first');
ok(quickInspect.includes('source.estimateLabel')&&quickInspect.includes('sourceEstimate'),'Item Quick Inspect must show per-item acquisition pace for modeled primary and alternate sources');

const acquisitionPlan=read('src/core/material-acquisition-plan.ts');
ok(acquisitionPlan.includes('visitedRecipes')&&acquisitionPlan.includes('consumeOwned')&&acquisitionPlan.includes('addOwned'),'Recursive material planning must guard recipe loops and account for owned stock plus batch overproduction');
ok(acquisitionPlan.includes('materialAcquisitionChainLabel')&&acquisitionPlan.includes('total chain'),'Recursive material planning must expose a compact raw-needs chain and only a completed total-chain ETA');
ok(recipe.includes('row.chainLabel')&&recipe.includes('row.chainBlockedReason'),'Recipe source rows must show recursive crafting chains and explain why a total estimate is withheld');
ok(recipe.includes('source.chainLabel')&&recipe.includes('source.chainBlockedReason'),'Expanded Other sources must preserve recursive chain context for crafting alternatives');
ok(quickInspect.includes('source.chainLabel')&&quickInspect.includes('source.chainBlockedReason'),'Item Quick Inspect must expose the same recursive chain context as crafting requirements');
ok(acquisitionPlan.includes('recipePreparationRoute')&&acquisitionPlan.includes('preparationEtaSeconds')&&acquisitionPlan.includes('preparationBottleneck'),'Recursive material planning must expose one recipe-wide shared-ledger route with prep ETA and bottleneck metadata');
ok(!skillNavigation.includes('prepareSteps?:MaterialPreparationStep[]')&&!skillNavigation.includes('materialPreparationSteps(plan)'),'Source rows must not carry a second per-source preparation implementation after reconciliation');
ok(recipe.includes('recipePreparationRoute(state,recipe,multiplier)')&&recipe.includes('preparationRoute.steps.length>1'),'Recipe cards must build one batch-aware Prepare Materials route and hide it when no preparation work remains');
ok(recipe.includes('Prepare materials')&&recipe.includes('route.chainLabel')&&recipe.includes('recipePreparationRouteLabel(route)')&&recipe.includes('numberOfLines={1}'),'Collapsed Prepare Materials must show a compact source chain plus bounded prep metadata');
ok(recipe.includes('route.steps.map')&&recipe.includes('onNavigate(step.destination!)')&&recipe.includes("step.kind!=='final_craft'"),'Expanded preparation must render one ordered actionable dependency sequence while keeping the final craft in place');
ok(recipe.includes('BOTTLENECK')&&recipe.includes("'FINAL · HERE'"),'Expanded route rows must surface the authoritative bottleneck and mark the current recipe as FINAL / HERE');
ok(recipe.includes('NEXT STEP')&&recipe.includes('next=prepSteps[0]')&&recipe.includes('nextStepCard'),'Prepare Materials must keep one prominent next-step recommendation from the ordered route');
ok(recipe.includes('route.totalGold.toLocaleString()')&&recipe.includes('route.goldShortfall'),'Expanded route must preserve full-chain Gold accounting and shortfall visibility');
ok(!recipe.includes('row.prepareSteps')&&!recipe.includes('openPlans'),'Recipe UI must not keep the superseded nested per-source Prepare Materials disclosure');


console.log('PASS: player-facing progression bars, ETAs and drop expectations use shared balance projections');
