export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const home=read('src/screens/HomeScreen.tsx');
ok(home.includes("alchemyRecipeDef")&&home.includes("explorationRoute")&&home.includes("FAITH_TIERS"),'Home must resolve authored Alchemy, Exploration and Faith activity names');
ok(home.includes("kind={state.activity.kind}"),'Home must pass the real activity kind into the shared progress card');

ok(!home.includes('formatGameNumber'),'Home must not duplicate the Gold already visible in the top bar');
ok(!home.includes('title="Explore world"'),'Home must not duplicate the persistent World navigation action');
ok(!home.includes('title="Equipment & food"'),'Home must not duplicate the persistent Inventory navigation action');
ok(home.includes("completed>0?\`Claim \${completed}\`:'Journal'"),'Quest-ready state must stay integrated into the campaign strip');


const sessionOverview=read('src/components/HomeSessionOverview.tsx');
ok(home.includes('<HomeSessionOverview'),'Home must expose one compact session-priority surface');
ok(home.indexOf('<HomeSessionOverview')<home.indexOf("s.guide,guide.priority"),'Session ready-now must precede Next Step progression guidance on Home');
ok(home.indexOf('<HomeSessionOverview')<home.indexOf('ASTERFALL CAMPAIGN'),'Session priorities must appear before broader campaign/planning detail');
ok(home.includes('showProgress&&<View style={s.expanded}><WorkingTowardSummary')&&home.includes('<SkillDashboard state={state}'),'Full goals, weekly, daily and skill snapshots must move behind the secondary progress disclosure');
ok((home.match(/<SkillDashboard/g)??[]).length===1,'Home must not duplicate the full skill snapshot outside its secondary progress area');
ok(home.includes('Goals, daily & skill progress')&&home.includes('Working Toward · Contract Board · Daily Supplies · skill snapshot'),'Home secondary disclosure must clearly describe the systems it contains');
ok(sessionOverview.includes('SESSION OVERVIEW')&&sessionOverview.includes('label="READY"')&&sessionOverview.includes('label="GOALS"')&&sessionOverview.includes('label="WEEKLY"')&&sessionOverview.includes('label="NEW"'),'Home session overview must preserve the four compact action categories');
ok(sessionOverview.includes("cell:{position:'relative',flex:1,minWidth:0,minHeight:48"),'Home session cells must stay compact while retaining accessible touch height');
ok(sessionOverview.includes('useWindowDimensions')&&sessionOverview.includes("width<350||fontScale>=1.25")&&sessionOverview.includes("cellStack:{flex:0,flexBasis:'48%'"),'Home session overview must collapse to a clean 2×2 layout on narrow phones or larger text');
ok(sessionOverview.includes('goodSurface')&&sessionOverview.includes('infoSurface')&&sessionOverview.includes('specialSurface')&&sessionOverview.includes('accentSurface'),'Home session cells must use semantic theme surfaces for restrained color emphasis');
const dashboardCore=read('src/core/dashboard.ts');
ok(dashboardCore.includes('homeSessionSummary')&&dashboardCore.includes("kind:'quests'")&&dashboardCore.includes("kind:'daily'")&&dashboardCore.includes("kind:'events'")&&dashboardCore.includes("kind:'goals'")&&dashboardCore.includes("kind:'forge'")&&dashboardCore.includes("kind:'weekly'")&&dashboardCore.includes("kind:'companions'"),'Home ready-now priority must include core claimable operational systems');
ok(dashboardCore.includes('equipmentCraftQueueModel')&&dashboardCore.includes('companionAttentionSummary')&&dashboardCore.includes('weeklyRewards'),'Home ready-now counts must derive from authoritative Forge, Companion and Contract systems');

ok(home.includes('identityCopy:{flex:1,minWidth:0,gap:5}')&&home.includes('levelBadge:'),'Home identity must combine character XP and level into one compact modern header');
ok(home.includes('guideTop:')&&home.includes('RECOMMENDED')&&home.includes("borderLeftColor:C.info"),'Home Next Step must retain a clear modern recommendation treatment');
ok(home.includes('utilityDisclosure:{minHeight:54')&&home.includes('utilityDisclosureOpen:{borderColor:C.info'),'Home secondary sections must use compact card-like disclosures with a clear open state');

const account=read('src/screens/MoreScreen.tsx');
ok(account.includes("minHeight:86"),'Account hub tiles must remain compact');
ok(account.includes('<Text numberOfLines={singleColumn?2:1} style={s.description}>'),'Account tile descriptions must stay single-line by default and allow two lines only in narrow/large-text mode');
ok(account.includes('ACCOUNT HUB')&&account.includes('header:{minHeight:86'),'Account must use a compact raised hub header rather than a plain title stack');
ok(account.includes('attentionPriority')&&account.includes('attentionDestinations.slice(0,3)'),'Account must surface at most three immediate attention destinations before the full navigation grid');
ok(account.includes('tileAttention:{borderWidth:1,borderColor:C.selectionLine')&&account.includes('iconFrameAttention:'),'Account destinations needing attention must gain restrained theme-semantic emphasis without changing layout');
ok(account.includes("if(id==='Collections')return 'Inventory'")&&account.includes("if(id==='Achievements')return 'Quests'")&&account.includes("if(id==='MasteryHall')return 'Skills'"),'Account identity and prestige destinations must use distinct meaningful existing icons rather than all reusing Social');
ok(!account.includes("items:['Home','Progression','Quests','Skills'"),'Account must not duplicate the persistent Skills bottom-navigation destination');
ok(account.includes("singleColumn=width<350||fontScale>=1.25")&&account.includes('attentionQuickWide'),'Account hub and attention rail must preserve narrow-phone / large-text responsiveness');

const classSkillsPanel=read('src/components/ClassSkillsPanel.tsx');
ok(classSkillsPanel.includes('CLASS_DRILL_BASE_XP')&&classSkillsPanel.includes('Balanced: ~')&&classSkillsPanel.includes('Focused: ~'),'Class safe training must show the authoritative drill baseline and hourly split');
ok(classSkillsPanel.includes('One drill per minute'),'Class safe training cadence must stay explicit');

const craftingProfessionBrowser=read('src/components/CraftingRecipeBrowser.tsx');
ok(craftingProfessionBrowser.includes("'tailoring'|'enchanting'")&&craftingProfessionBrowser.includes('TAILORING BENCH')&&craftingProfessionBrowser.includes('ENCHANTING TABLE'),'Tailoring and Enchanting must use the shared recipe browser and distinct workshop identity');

const skills=read('src/screens/SkillsScreen.tsx');
ok(!skills.includes('Hunting-specific activities are not available yet'),'Hunting must not regress to a placeholder-only skill screen');
ok(!skills.includes('this workshop has no trainable recipes available yet'),'Tailoring and Enchanting must not regress to placeholder-only skill screens');
ok(skills.includes('Train Hunting through monster hunts')&&skills.includes('HUNTING_XP_SHARE')&&skills.includes('Hunting XP/hr'),'Hunting detail must explain its combat-linked progression and current-region pace');

ok(skills.includes("minHeight:112"),'Skills hub cards must remain compact');
ok(skills.includes('skillTop:'),'Skills hub cards must keep the compact icon/copy row');
ok(!skills.includes('Tap to open'),'Skills cards must not waste a line on redundant tap instructions');
ok(skills.includes('TRAINING FOCUS · RECOMMENDED')&&skills.includes('skillTrainingFocus(state)'),'Skills hub must surface one deterministic recommended training target from authored milestones');
ok(skills.includes('NEXT LV {milestone.nextLevel}')&&skills.includes('skillMilestoneOverview(state,skillRow.skillId)'),'Skill cards must preview their next meaningful authored unlock instead of showing XP progress alone');
ok(skills.includes('focusCard:{minHeight:82')&&skills.includes('backgroundColor:C.infoSurface'),'Skills training focus must remain compact and theme-semantic');

const skillMilestones=read('src/components/SkillMilestoneStrip.tsx');
ok(skillMilestones.includes('SKILL MILESTONES')&&skillMilestones.includes("slice(0,2)"),'Skill detail milestones must remain compact and capped');
ok(skillMilestones.includes("'JUST REACHED':'LATEST'")&&skillMilestones.includes('NEXT · LV'),'Skill detail milestones must show recent and next unlock states');
ok(skillMilestones.includes('useGameTheme'),'Skill milestone strip must use the active UI theme');
ok(skillMilestones.includes('if(row.destination&&onNavigate)onNavigate(row.destination)'),'Milestone rows must remain actionable when a destination exists');
ok(skills.includes('<SkillMilestoneStrip'),'Skills detail screens must include the persistent milestone strip');

const masteryPanel=read('src/components/ProfessionMasteryPanel.tsx');
ok(masteryPanel.includes('PROFESSION MASTERY')&&masteryPanel.includes('BEST ACTION BONUS ROADMAP'),'Skill details must explain long-term action mastery and its bonus roadmap');
ok(masteryPanel.includes("slice(0,3)"),'Profession Mastery must remain compact by showing only three priority actions');
ok(masteryPanel.includes("action:{minHeight:62"),'Profession Mastery action rows must stay compact');
ok(masteryPanel.includes('Yield requires stackable output')&&masteryPanel.includes('speed requires a timed cycle'),'Mastery UI must explain bonus applicability instead of implying every bonus affects every action');
ok(masteryPanel.includes('MASTERED RECORDS')&&masteryPanel.includes('Permanent R50 record'),'R50 action mastery must have a permanent compact completion treatment');
ok(masteryPanel.includes('TRACK R')&&masteryPanel.includes('TRACKED R'),'Mastery rows must support one-tap Working Toward tracking without a separate modal');
ok(masteryPanel.includes('minHeight:30'),'Mastery tracking controls must remain compact secondary actions');
ok(skills.includes('<ProfessionMasteryPanel'),'Trainable skill details must expose Profession Mastery');
ok(skills.includes('masteryGoalForAction')&&skills.includes("type:'goals_set'"),'Skill mastery tracking must use the authoritative Working Toward goal command');
ok(skills.includes('skillIdentity')&&skills.includes('identityColor'),'Skill headers must preserve distinct semantic identities without larger typography');

const masteryDiscovery=read('src/components/MasteryDiscoveryPanel.tsx');
const masteryHall=read('src/screens/MasteryHallScreen.tsx');
ok(masteryHall.includes('<MasteryDiscoveryPanel'),'Mastery Hall must expose account-wide mastery discovery without making every skill detail screen taller');
ok(masteryDiscovery.includes("label:'Closest to R50'")&&masteryDiscovery.includes("label:'Highest Rank'")&&masteryDiscovery.includes("label:'Mastered only'"),'Mastery discovery must support the requested R50/rank/mastered sorting and filtering');
ok(masteryDiscovery.includes('All skills')&&masteryDiscovery.includes('All regions'),'Mastery discovery must support compact skill and region filters');
ok(masteryDiscovery.includes('RECOMMENDED MASTERY TARGET · OPTIONAL'),'Mastery recommendation must stay explicitly optional rather than becoming another progression requirement');
ok(masteryDiscovery.includes('Unearned bonus visibility')&&masteryDiscovery.includes('BONUS')&&masteryDiscovery.includes('LEFT'),'Mastery rows must make remaining authored bonuses visible');
ok(masteryDiscovery.includes('rows.slice(0,ROW_LIMIT)')&&masteryDiscovery.includes('const ROW_LIMIT=12'),'Mastery discovery must cap its initial mobile render and offer expansion instead of creating an oversized Hall');
ok(masteryDiscovery.includes('GameModalSurface')&&masteryDiscovery.includes("filterOption:{minHeight:44"),'Mastery filters must use the compact accessible dropdown/modal pattern rather than a long chip strip');
ok(read('App.tsx').includes('onNavigate={openWorkingTowardDestination}'),'Mastery discovery rows must route through the canonical exact Working Toward destination handler');

const masteryPresentation=read('src/core/profession-mastery-presentation.ts');
ok(masteryPresentation.includes("mining:{label:'EXTRACTION'")&&masteryPresentation.includes("woodcutting:{label:'FORESTRY'")&&masteryPresentation.includes("fishing:{label:'ANGLING'")&&masteryPresentation.includes("smithing:{label:'FORGECRAFT'")&&masteryPresentation.includes("cooking:{label:'PROVISIONING'")&&masteryPresentation.includes("alchemy:{label:'BREWCRAFT'"),'Core profession skills must have distinct compact identity labels');
ok(masteryPresentation.includes('yieldRelevant')&&masteryPresentation.includes('speedRelevant'),'Mastery presentation must distinguish bonuses that are meaningful for each action type');
ok(masteryPresentation.includes('professionMasteryMasteredRecords'),'R50 completion records must derive from saved mastery state instead of a duplicate collection store');
ok(masteryPresentation.includes('professionMasteryDiscoveryRecords')&&masteryPresentation.includes('professionMasteryRecommendedTarget'),'Mastery discovery and recommendation must derive from existing profession mastery state');
ok(masteryPresentation.includes("sort='closest_r50'")&&masteryPresentation.includes("status==='bonus_left'"),'Mastery discovery must keep its core sort/filter semantics explicit and regression-testable');

const masteryCore=read('src/core/profession-mastery-v40.ts');
ok(masteryCore.includes("{rank:10,kind:'xp'")&&masteryCore.includes("{rank:20,kind:'yield'")&&masteryCore.includes("{rank:30,kind:'speed'")&&masteryCore.includes("{rank:40,kind:'yield'")&&masteryCore.includes("{rank:50,kind:'speed'"),'Profession Mastery bonus ranks must remain explicit and reviewable');

const gatheringSkills=read('src/components/GatheringActivityList.tsx');
ok(gatheringSkills.includes('FASTEST XP HERE'),'Gathering details must identify the fastest local XP option');
ok(gatheringSkills.includes('EST. YIELD / HR')&&gatheringSkills.includes('SKILL XP / HR'),'Gathering cards must surface compact settlement-aligned resource and XP hourly rates');
ok(gatheringSkills.includes("/action · every {view.cycleSeconds.toFixed(1)}s"),'Gathering cards must expose authored yield per action beside effective cycle time');
ok(gatheringSkills.includes('NEXT SKILL UNLOCK'),'Gathering details must preview the next skill unlock');
ok(gatheringSkills.includes("targetTag:{fontSize:9"),'Working Toward gathering targets must remain visible without adding a large banner');
ok(gatheringSkills.includes('gatheringProgressionAction')&&gatheringSkills.includes('bestGatheringTrainingDestination'),'Gathering locked/empty states must route to useful training actions');
ok(gatheringSkills.includes("title={'Train to Lv '"),'Locked gathering nodes must offer a direct train-prerequisite action');
ok(gatheringSkills.includes('gatheringBalanceProjection')&&gatheringSkills.includes('MASTERY'),'Gathering cards must show mastery from the shared action-rate projection');
const balanceProjection=read('src/core/balance-projection.ts');
ok(balanceProjection.includes('professionMasteryMultipliers')&&balanceProjection.includes('mastery.speed')&&balanceProjection.includes('mastery.xp')&&balanceProjection.includes('mastery.yield'),'Shared gathering balance projection must apply action-specific mastery to speed, XP and yield');

const craftingBrowser=read('src/components/CraftingRecipeBrowser.tsx');
ok(craftingBrowser.includes("(!recipe.classId||recipe.classId===state.character?.classId)"),'Crafting lists must hide recipes restricted to other classes');
ok(craftingBrowser.includes("label:'READY NOW'")&&craftingBrowser.includes("label:'NEEDS REQUIREMENTS'")&&craftingBrowser.includes("label:'LOCKED'"),'Crafting recipes must remain grouped by actionable state');
ok(craftingBrowser.includes("filterToggle:{minHeight:44"),'Crafting filters must use a compact accessible dropdown control');
ok(craftingBrowser.includes("skillId==='smithing'?{label:'EQUIPMENT FORGE'")&&craftingBrowser.includes("label:'KITCHEN'")&&craftingBrowser.includes("label:'ALCHEMY LAB'"),'Crafting skill screens must preserve distinct workshop identities');
ok(craftingBrowser.includes('alchemyAvailability')&&craftingBrowser.includes("Stop the current activity before brewing."),'Alchemy recipe readiness must use the reserved batch system');
ok(craftingBrowser.includes('bestRecipeTrainingDestination')&&craftingBrowser.includes('Open best training recipe'),'Crafting summaries must navigate into a useful current training recipe');
ok(craftingBrowser.includes('recipeProgressionAction')&&craftingBrowser.includes('preferredRecipeId'),'Crafting summary actions must deep-link the exact highlighted recipe instead of reopening a generic profession list');
ok(craftingBrowser.includes('initialExpanded={recipe.id===preferredRecipeId}'),'Deep-linked crafting targets must arrive already expanded');
ok(craftingBrowser.includes('processingAvailability')&&craftingBrowser.includes('onProcessingStart'),'Repeatable stackable recipes must route through reserved timed processing');
ok(craftingBrowser.includes('equipmentCraftAvailability')&&craftingBrowser.includes('timedEquipmentRecipe'),'Crafting groups and summary readiness must use real forge-start semantics for timed equipment');

const recipeCard=read('src/components/RecipeCard.tsx');
ok(recipeCard.includes("processing?'Process ×'")&&recipeCard.includes('Progress continues offline.')&&recipeCard.includes('outputPerHour'),'Processing cards must expose batch controls, offline timing and material throughput');
ok(recipeCard.includes("head:{minHeight:96"),'Recipe rows must remain compact');
ok(recipeCard.includes("statusText=forgeFull?"),'Collapsed recipe cards must expose the actual blocking state');
ok(recipeCard.includes('BATCH SIZE')&&recipeCard.includes("Brew ×"),'Alchemy recipe cards must expose batch-size and timed brew controls');
ok(skills.includes("type:'alchemy_start'"),'Skills must route Alchemy through the authoritative alchemy_start command');
ok(recipeCard.includes('recipeProgressionSources')&&recipeCard.includes('MISSING SOURCES'),'All recipe types must expose actionable material/prerequisite sources');
ok(recipeCard.includes('Other sources ·')&&recipeCard.includes('sourceTypeLabel')&&recipeCard.includes('accessibilityState={{expanded:!!openSources[row.key]}}'),'Recipe material sources must keep one primary route compact and disclose typed alternatives on demand');
ok(recipeCard.includes('initialExpanded=false')&&recipeCard.includes('useState(initialExpanded)'),'Recipe cards must support exact-target auto-expansion from progression navigation');
ok(recipeCard.includes('recipeSkillTrainingAction')&&recipeCard.includes('recipeCharacterTrainingAction'),'Recipe level blockers must expose skill and character training actions');
ok(recipeCard.includes('RECIPE MASTERY')&&recipeCard.includes('professionMasteryMultipliers'),'Recipe cards must show live per-recipe mastery and effective values');
ok(recipeCard.includes('TIMED PACE')&&recipeCard.includes('batches/hr')&&recipeCard.includes('outputPerHour')&&recipeCard.includes('XP/hr'),'Timed crafting must expose batch rate, output/hour, XP/hour and level ETA');
ok(recipeCard.includes('Track preparation')&&recipeCard.includes('Tracked in Working Toward')&&recipeCard.includes('onTrackPreparation(recipe,multiplier,preparationRoute.steps.length)'),'Preparation routes must support one-tap persistent Working Toward tracking without duplicate pins');
ok(recipeCard.includes("'GOAL DONE':'TRACKED'")&&recipeCard.includes('trackedTag'),'Collapsed recipe rows must visibly retain persistent preparation tracking state');
ok(recipeCard.includes("'Preparation goal complete':tracked?'Tracked in Working Toward'"),'Completed preparation goals must stop looking merely active inside the recipe disclosure');
ok(craftingBrowser.includes('onTrackPreparation={onTrackPreparation}')&&skills.includes('trackPreparationGoal')&&skills.includes("type:'goals_set'"),'Crafting screens must persist preparation tracking through the canonical goals command');
ok(skills.includes('MAX_PINNED_GOALS')&&skills.includes("goal.kind==='recipe_preparation'&&goal.recipeId===recipe.id"),'Preparation tracking must respect the shared three-goal cap and avoid duplicate pins for the same recipe');

const skillNavigation=read('src/core/skill-progression-navigation.ts');
ok(skillNavigation.includes('workingTowardItemSource'),'Skill progression navigation must reuse the canonical Working Toward item-source resolver');
ok(skillNavigation.includes('isTimedProcessingRecipe')&&skillNavigation.includes('processingAvailability'),'Training recommendations must use reserved timed-processing readiness for repeatable batch recipes');
ok(skillNavigation.includes('equipmentCraftAvailability')&&skillNavigation.includes('timedEquipmentRecipe'),'Training recommendations must use forge queue availability for timed equipment recipes');
ok(skillNavigation.includes('recipeProgressionAction')&&skillNavigation.includes('Preview the exact recipe'),'Locked recipe navigation must retain the exact unlock target');
ok(skillNavigation.includes('characterTrainingDestination'),'Character-level recipe locks must have a concrete combat training destination when available');

const workingToward=read('src/core/working-toward.ts');
ok(workingToward.includes('workingTowardItemSources')&&workingToward.includes('sourceStatusPriority'),'Material source navigation must rank every known source by live availability instead of fixed source type order');
ok(workingToward.includes("ready:0,travel:1,locked:2,info:3"),'Material source ranking must prefer usable local sources before travel and locked alternatives');
ok(workingToward.includes("typePriority:0")&&workingToward.includes("typePriority:1")&&workingToward.includes("typePriority:2"),'Material source ranking must retain deterministic gather/craft/combat tie-breaks after availability');
ok(workingToward.includes('workingTowardItemSourceEntries')&&workingToward.includes("typeLabel:'Gathering'")&&workingToward.includes("typeLabel:'Crafting'")&&workingToward.includes("typeLabel:'Monster Drop'")&&workingToward.includes("typeLabel:'Dungeon'"),'Material source presentation must carry explicit acquisition-method labels');
ok(workingToward.includes('dungeonMaterialSourcesForItem')&&workingToward.includes('typePriority:3'),'Authoritative dungeon material sources must join the shared ranked source resolver without outranking immediately useful local routes');
ok(workingToward.includes("kind:'dungeon';dungeonId?:string"),'Working Toward must support a real Dungeon destination');
ok(workingToward.includes("goal.kind==='dungeon_clears')return {kind:'dungeon'"),'Dungeon goals must navigate instead of rendering info-only dead ends');
ok(read('App.tsx').includes("destination.kind==='dungeon'){setGoalDungeonId(destination.dungeonId);setTab('Coop')"),'Dungeon progression actions must open the real co-op dungeon screen and preserve the exact dungeon target');

const planner=read('src/screens/ProgressionPlannerScreen.tsx');
ok(planner.includes('MASTERY_GOAL_RANKS')&&planner.includes('nextMasteryGoalRank'),'Working Toward Profession Mastery goals must target authored bonus ranks');
ok(planner.includes("R{rank}")&&planner.includes("rank===10?'+2% XP'"),'Mastery goal authoring must explain each bonus-rank target');
const workingTowardFocus=read('src/components/WorkingTowardFocusPanel.tsx');
const workingTowardExecution=read('src/core/working-toward-execution.ts');
ok(planner.includes('<WorkingTowardFocusPanel')&&planner.includes('workingTowardExecutionOverview(state)'),'Working Toward must elevate one deterministic execution focus above the full tracker list');
ok(workingTowardFocus.includes('FOCUS GOAL · RECOMMENDED')&&workingTowardFocus.includes('ACTIVE NOW')&&workingTowardFocus.includes('READY TO QUEUE')&&workingTowardFocus.includes('QUEUE FULL')&&workingTowardFocus.includes('TRAVEL'),'Focus Goal must distinguish active, queueable, capacity and travel states');
ok(workingTowardFocus.includes('label="RUNNING"')&&workingTowardFocus.includes('label="READY"'),'Focus Goal summary counts must describe literal running and ready-to-queue states');
ok(workingTowardFocus.includes("'stepLabel' in plan.view")&&workingTowardFocus.includes("% prepared"),'Tracked preparation focus must use explicit Step X/Y wording instead of an ambiguous generic fraction');
ok(workingTowardFocus.includes("!!plan.queueActivity&&!plan.activeNow"),'Already-active goal actions must not offer a duplicate queue button');
ok(workingTowardFocus.includes('Stop at goal')&&workingTowardFocus.includes('food/overflow safety')&&workingTowardFocus.includes('same-region only'),'Focus Goal must explain safe queue and stop-at-goal boundaries');
ok(planner.includes("type:'queue_add'")&&planner.includes('enqueueActivity(state,plan.queueActivity)'),'Working Toward queue actions must use trusted online commands and the shared offline queue helper');
ok(workingTowardExecution.includes('activityQueueCapacity')&&workingTowardExecution.includes('queuedActivityReadiness')&&workingTowardExecution.includes('workingTowardDestinationAvailability'),'Execution planning must reuse authoritative queue capacity/readiness and progression availability');
ok(workingTowardExecution.includes("row.executionState==='active'")&&workingTowardExecution.includes("row.executionState==='blocked'")&&workingTowardExecution.includes("row.executionState==='ready'"),'Execution overview counters must derive from literal execution states rather than broad goal lifecycle status');
ok(workingTowardExecution.includes("stopIfOutOfFood:true")&&workingTowardExecution.includes("stopIfRewardsWouldOverflow:true")&&workingTowardExecution.includes("finishCurrentCycle:true"),'Generated stop-at-goal rules must preserve all idle safety defaults');
ok(workingTowardExecution.includes('reconcileWorkingTowardGeneratedRules')&&workingTowardExecution.includes("rule.id.startsWith('goal-rule:')"),'Working Toward must clean orphaned generated stop rules when goals disappear');
ok(read('src/core/game-commands.ts').includes('reconcileWorkingTowardGeneratedRules'),'Trusted goals_set updates must reconcile generated stop rules server-side');
ok(!workingTowardExecution.includes('travelToRegion')&&!workingTowardExecution.includes("type:'travel'"),'Working Toward execution planning must never auto-travel');
ok(planner.includes('offlineCapBreakdown(state)')&&planner.includes('Current reserve: {afk.hours}h')&&planner.includes('maximum {afk.maxHours}h'),'Working Toward must explain the live Offline Reserve model rather than stale fixed-hour copy');
const workingTowardSummary=read('src/components/WorkingTowardSummary.tsx');
const homeSession=read('src/components/HomeSessionOverview.tsx');
const dashboard=read('src/core/dashboard.ts');
ok(workingTowardSummary.includes('recipePreparationTrackingView')&&workingTowardSummary.includes("'Next · '+nextLabel"),'Home Working Toward must resolve a tracked preparation goal to its live next step');
ok(workingTowardSummary.includes('tracked.stepLabel')&&workingTowardSummary.includes('% prepared'),'Home Working Toward summary must show tracked recipe preparation as Step X/Y progress');
ok(planner.includes('recipePreparationTrackingView')&&planner.includes("'Next · '+tracked.nextLabel"),'Working Toward management must show the same live preparation next step');
ok(planner.includes('tracked.stepLabel')&&planner.includes('% prepared'),'Working Toward management must use the same Step X/Y tracked-preparation wording');
ok(dashboard.includes('firstTrackedRecipePreparation')&&dashboard.includes('goalNextStep')&&dashboard.includes('goalNextDestination'),'Compact Home session model must carry tracked preparation step text and exact destination');
ok(homeSession.includes('Continue preparation')&&homeSession.includes('Review preparation')&&homeSession.includes('onGoalNext(summary.goalNextDestination!)'),'Home session overview must directly continue or review the exact tracked preparation step');
ok(homeSession.includes('summary.primaryReady?<GameButton')&&homeSession.includes(':summary.goalNext&&summary.goalNextDestination?'),'Tracked preparation continuation must remain below higher-priority ready-now claims');
ok(read('src/screens/HomeScreen.tsx').includes('onGoalNext={onNavigateGoal}'),'Home must route tracked preparation continuation through canonical Working Toward navigation');

const appMastery=read('App.tsx');
const actionFeedback=read('src/components/ActionFeedback.tsx');
ok(actionFeedback.includes('actionLabel?:string')&&actionFeedback.includes('accessibilityRole="button"')&&actionFeedback.includes('onPress={onAction}'),'Shared ActionFeedback must support an accessible compact action without changing non-action feedback callers');
ok(appMastery.includes('masteryRankProgressionMoments')&&appMastery.includes('<ActionFeedback message={masteryRankNoticeMessage(masteryNotices)}'),'Non-reward mastery rank-ups must use lightweight in-app feedback');
ok(appMastery.includes('recipePreparationTransitionNotices')&&appMastery.includes('queuePreparationNotices(before,result.state)'),'Tracked preparation feedback must be derived at the central online state transition instead of per-feature callbacks');
ok(appMastery.includes('queuePreparationNotices(current,next)')&&appMastery.includes('queuePreparationNotices(current,settled.state)'),'Local commits and return-from-background settlement must also advance tracked preparation feedback');
ok(appMastery.includes('preparationNotices[0].message')&&appMastery.includes('preparationNotices[0].tone'),'Tracked preparation transitions must render through the shared ActionFeedback surface');
ok(appMastery.includes('actionLabel={preparationNotices[0].actionLabel}')&&appMastery.includes('openPreparationNotice(preparationNotices[0])'),'Preparation feedback must provide a one-tap action for the exact current next step');
ok(appMastery.includes("notice.kind==='complete'||!notice.destination||notice.destination.kind==='info'")&&appMastery.includes('openWorkingTowardDestination(notice.destination)'),'Preparation notice actions must route completion to Working Toward and live steps through canonical deep-link navigation');
ok(appMastery.includes('preparationNotices.length||collected||forgeResults'),'Mastery feedback must wait behind preparation feedback and higher-priority reward/reveal surfaces');
ok(appMastery.includes("forgeResults?.some(row=>row.qualityProc)"),'Mastery feedback must defer only behind a real exceptional Forge reveal');

const snapshot=read('src/components/SkillDashboard.tsx');
ok(snapshot.includes('.slice(0,5)'),'Home skill snapshot must show only the five strongest non-combat skills');
ok(snapshot.includes('Skill snapshot'),'Home must label the condensed skill section clearly');
ok(snapshot.includes('useGameTheme'),'Home skill snapshot must use the active theme');

for(const path of [
 'src/components/ActivityCard.tsx',
 'src/components/ActionQueuePanel.tsx',
 'src/components/WorkingTowardSummary.tsx',
 'src/components/ContractBoardSummary.tsx',
 'src/components/DailySuppliesSummary.tsx',
 'src/components/NewUnlocksPanel.tsx',
 'src/components/EnvironmentBanner.tsx',
]){
 const source=read(path);
 ok(source.includes('useGameTheme'),path+' must use the active UI theme');
 ok(!source.includes("import {C,"),path+' must not regress to the static Veldryn palette');
}

const activeActivityBar=read('src/components/ActiveActivityBar.tsx');
ok(activeActivityBar.includes('activityProgressFeedback')&&activeActivityBar.includes("phase.replace('…','').toUpperCase()")&&activeActivityBar.includes('cycleRemaining'),'Collapsed active-activity strip must show the same real cycle phase and next-action countdown as Home');

const activity=read('src/components/ActivityCard.tsx');
ok(activity.includes('activityActions:{flexDirection:\'row\''),'Activity actions must remain on one compact row');
ok(activity.includes('backgroundColor:C.warningSurface'),'Activity warnings must use semantic theme surfaces');
ok(activity.includes('backgroundColor:C.infoSurface'),'Activity goal state must use semantic theme surfaces');
ok(activity.includes('activityProgressFeedback')&&activity.includes('phaseText'),'Active activities must show truthful phase text tied to real cycle progress');
ok(activity.includes('levelPace')&&activity.includes('XP remaining')&&activity.includes('XP/hr'),'Active activities must expose level progress, remaining XP and effective XP/hour');
ok(activity.includes('preview.huntingXp')&&activity.includes('Hunting XP'),'Combat reward cards must surface Hunting XP separately from character XP');
ok(activity.includes("kind:ActivityKind")&&activity.includes("alchemy:'ALCHEMY'")&&activity.includes("faith:'FAITH'")&&activity.includes("exploration:'EXPLORATION'"),'Active activity card must preserve activity-specific headers rather than collapsing everything into Gathering');
ok(activity.includes("alchemy:'brews ready'")&&activity.includes("faith:'practices ready'")&&activity.includes("exploration:'routes ready'"),'Active activity reward counts must use activity-specific units');
ok(activity.includes("preview.craftingActions??0")&&activity.includes("preview.faithActions??0"),'Alchemy and Faith must count their real settled actions instead of showing zero ready rewards');

const queue=read('src/components/ActionQueuePanel.tsx');
ok(queue.includes('backgroundColor:C.warningSurface'),'Queue warnings must remain theme-safe');
ok(queue.includes('backgroundColor:C.goodSurface'),'Queue handoff success must remain theme-safe');

const itemQuickInspect=read('src/components/ItemQuickInspect.tsx');
ok(itemQuickInspect.includes('Other sources ·')&&itemQuickInspect.includes("'Monster Drop'")&&itemQuickInspect.includes("'Dungeon'"),'Item quick inspect must use the same compact typed source disclosure');
ok(!itemQuickInspect.includes('model.sources.slice(0,4)'),'Item quick inspect must not silently hide known sources behind a fixed four-row cap');

const inventory=read('src/screens/InventoryScreen.tsx');
ok(inventory.includes("root:{padding:spacing.md,gap:10}"),'Inventory should keep compact screen padding');
ok(inventory.includes("storageChip:{flex:1,minWidth:0,minHeight:48"),'Inventory storage selector should remain compact');
ok(inventory.includes("utilityChip:{flex:1,minWidth:0,minHeight:44"),'Inventory quick controls must retain accessible touch height');
ok(inventory.includes('visible={filterOpen}'),'Inventory categories must open in a compact filter sheet');
ok(inventory.includes('filterOption:{minHeight:44'),'Inventory filter rows must retain accessible touch height');
ok(!inventory.includes('contentContainerStyle={s.controlStrip}'),'Inventory must not regress to the long horizontal category strip');

const dungeonDeepLinkApp=read('App.tsx');
const dungeonDeepLinkScreen=read('src/screens/CoopExpeditionScreen.tsx');
ok(dungeonDeepLinkApp.includes("setGoalDungeonId(destination.dungeonId)")&&dungeonDeepLinkApp.includes('initialDungeonId={goalDungeonId}'),'Dungeon progression sources must retain the exact authored dungeon id through app navigation');
ok(dungeonDeepLinkScreen.includes('dungeons.find(item=>item.id===initialDungeonId)')&&dungeonDeepLinkScreen.includes('setSelected(dungeon)'),'Dungeon screen must open the exact dungeon supplied by a material/progression deep link');
ok(dungeonDeepLinkScreen.includes('That dungeon source is not currently available in the dungeon catalog.'),'Invalid or stale dungeon deep links must fail visibly instead of silently dropping the player on a generic list');

const world=read('src/screens/WorldScreen.tsx');
ok(world.includes('currentCard:{minHeight:150'),'World current-region card must remain compact');
ok(world.includes('destination:{minHeight:92'),'World destination cards must remain compact');
ok(world.includes('CURRENT REGION CONTENT')&&world.includes('What can I do in {current.name}?'),'World must behave as a current-region hub before presenting travel-away choices');
ok(world.indexOf('{sunscar&&')<world.indexOf('TRAVEL ELSEWHERE')&&world.indexOf('{frostmarch&&')<world.indexOf('TRAVEL ELSEWHERE'),'Region-specific Sunscar/Frostmarch content must appear before the travel-away list');
ok(world.includes('<RegionStat label="HUNTS"')&&world.includes('<RegionStat label="GATHER"')&&world.includes('<RegionStat label="BOSSES"'),'Current region hub must expose compact real-content readiness counts');
ok(world.includes('NEXT REGION UNLOCK')&&world.includes("unlockTrack:{height:5"),'World travel section must show compact next-region level progress');
ok(world.includes('orderedTravelRegions(state,current.id,goalRegionId)'),'World travel ordering must reuse the core goal-aware unlocked-first ordering helper');
ok(world.includes('OBJECTIVE ROUTE')&&world.includes('Your current objective continues in'),'World route guidance must remain truthful for both Working Toward and Journal region deep links');
ok(world.includes("destinationContent:{fontSize:10"),'Travel destinations must preview authored content without making cards excessively tall');
ok(!world.includes('Open Co-op Expeditions'),'World must not keep a duplicate standalone co-op panel after adding co-op to current-region quick actions');

const character=read('src/screens/CharacterScreen.tsx');
ok(character.includes('disclosure:{minHeight:54'),'Character secondary disclosures must remain compact');
ok(character.includes('identityKicker')&&character.includes('characterName')&&character.includes('classMeta'),'Character must use one consolidated identity hero instead of separate page and class headers');
ok(!character.includes('pageHeading')&&!character.includes('headingCopy'),'Character must not regress to the duplicate heading stack');
ok(character.includes('EquipmentSectionHeader title="Loadout preview"'),'Character equipment preview must have a purpose-specific title');
ok(character.includes('EQUIPMENT READINESS')&&!character.includes('>Lv. {character.level}<'),'Character preview must not repeat the character level beside readiness');
ok(character.includes("keyStat:{flex:1,alignItems:'center',gap:2,paddingVertical:6")&&character.includes('backgroundColor:C.panel2'),'Character key stats must use compact HUD-style cells');
ok(character.includes('primaryAction:{flexGrow:2,flexBasis:180}')&&character.includes('secondaryAction:{flexGrow:1,flexBasis:110'),'Character global actions must preserve one obvious primary equipment action');
ok(!character.includes("title={showLoadouts?'Hide guides':'Build guides'}"),'Build Guides disclosure must not be duplicated by a second global button');
ok(character.includes('disclosureOpen:{borderColor:C.info,backgroundColor:C.infoSurface}'),'Character secondary disclosures must show a clean selected/open state');
ok(character.includes('<GameButton compact title={fullSet?')&&character.includes('<GameButton compact title="Craft missing gear"'),'Novice-set utility actions must stay compact');

const empty=read('src/components/EmptyState.tsx');
ok(empty.includes('padding:spacing.lg'),'Empty states must avoid excessive vertical padding');

const topBar=read('src/components/GameTopBar.tsx');
ok(topBar.includes('attentionRows')&&topBar.includes('NEEDS ATTENTION')&&topBar.includes('menuBadge'),'Quick navigation must surface attention both on configured shortcuts and for important destinations outside the configured five');
ok(topBar.includes('attentionTotal')&&topBar.includes('needs attention'),'Quick navigation menu must announce its attention state accessibly');
ok(topBar.includes('hiddenAttentionCount')&&topBar.includes('attentionMore'),'Quick navigation must acknowledge additional attention destinations beyond the compact top three');
ok(sessionOverview.includes('visibleParts=parts.slice(0,4)')&&sessionOverview.includes("readyDisplay=summary.readyTotal>99?'99+'"),'High-attention Home sessions must stay compact instead of growing an unbounded readiness line');
const primaryNavigation=read('src/components/PrimaryNavigation.tsx');
const appShell=read('App.tsx');
const packageJson=read('package.json');
ok(primaryNavigation.includes('useSafeAreaInsets'),'Bottom navigation must use real safe-area metrics');
ok(primaryNavigation.includes('active?:T'),'Bottom navigation must support a neutral selection state for the session Home dashboard');
ok(appShell.includes("tab==='Home'?undefined"),'Home must not falsely select Account or another persistent bottom destination');
ok(primaryNavigation.includes("Platform.OS==='android'?Math.max(bottom,8):4"),'Android bottom navigation must apply the native bottom inset without reducing touch safety');
ok(!primaryNavigation.includes("Dimensions.get('screen')")&&!primaryNavigation.includes('StatusBar.currentHeight'),'Bottom navigation must not regress to screen-height/status-bar heuristics');
ok(appShell.includes('<SafeAreaProvider>'),'App root must provide safe-area metrics');
ok(appShell.includes('buildQuickNavigationBadges')&&appShell.includes("row.kind!=='reward_ready'&&row.kind!=='weekly_order_complete'"),'Primary nav must avoid misleading Home/Contract claim dots while quick navigation routes those notices exactly');
ok(packageJson.includes('"react-native-safe-area-context": "5.4.0"'),'Expo 53 safe-area dependency must remain pinned');


const collections=read('src/screens/CollectionsScreen.tsx');
ok(collections.includes("petCard:{width:'48%',minWidth:0"),'Collections pet grid must keep two-column cards viable on narrow phones');
ok((collections.match(/<GameButton compact title=\{row\.selected\?/g)??[]).length>=2,'Collections repeated item actions must remain compact');

const achievements=read('src/screens/AchievementsScreen.tsx');
ok(achievements.includes('<GameButton compact title="Save showcase"'),'Achievements showcase action must not dominate the screen');
ok(achievements.includes("<GameButton compact title={entry.claimed?'Claimed':entry.completed?'Claim':'Locked'}"),'Achievement row actions must remain compact');

const activityOverview=read('src/screens/ActivityOverviewScreen.tsx');
ok(activityOverview.includes('combatTone:{color:C.bad}'),'Character Activity combat emphasis must use the active theme');
ok(activityOverview.includes('faithTone:{color:C.special}'),'Character Activity Faith emphasis must use the active theme');

const dailySupplies=read('src/screens/DailySuppliesScreen.tsx');
ok(dailySupplies.includes("cell:{width:'12.5%',minWidth:31,maxWidth:40,height:32"),'Daily Supplies track must fit seven compact columns on narrow phones');
ok(dailySupplies.includes('boostRow:{minHeight:56'),'Daily Supplies banked boost rows must remain compact');

const accountBonuses=read('src/screens/AccountBonusesScreen.tsx');
ok(accountBonuses.includes('row:{minHeight:48'),'Account bonus totals must remain dense and scannable');
ok(accountBonuses.includes('source:{minHeight:52'),'Account bonus sources must avoid oversized rows');

const rankings=read('src/screens/RankingsScreen.tsx');
ok(rankings.includes('<GameButton compact title="Refresh"'),'Rankings refresh must remain a secondary compact action');

const arena=read('src/screens/ArenaScreen.tsx');
ok(arena.includes('<GameButton compact title="Clear slot"'),'Arena clear-slot controls must not compete with character selection');
ok(arena.includes("choices:{flexDirection:'row',flexWrap:'wrap'"),'Arena roster choices must wrap instead of forcing one tall row per character');

const event=read('src/screens/EventScreen.tsx');
ok(event.includes('discoveryCount:{...typography.title,color:C.special}'),'Event discovery emphasis must use the semantic theme token');
ok(event.includes("claim:{width:96}"),'Event repeated reward actions must remain compact');

const quests=read('src/screens/QuestScreen.tsx');
const questModes=read('src/components/QuestModeSwitch.tsx');
ok(quests.includes("mode==='story'")&&quests.includes("mode==='contracts'")&&quests.includes("mode==='challenges'"),'Quest screen must render Story, Contract Board and Class Challenges as separate workloads instead of one long feed');
ok(quests.includes('<QuestModeSwitch')&&questModes.includes("accessibilityRole=\"tablist\"")&&questModes.includes("accessibilityRole=\"tab\""),'Quest modes must use one compact accessible three-tab switch');
ok(questModes.includes("minHeight:58")&&questModes.includes("flex:1,minWidth:0"),'Quest mode tabs must stay compact and share narrow mobile width safely');
ok(quests.includes('focusedWeeklyOrderId')&&quests.includes('label="FOCUSED"')&&quests.includes("Number(b.id===focusedOrderId)-Number(a.id===focusedOrderId)"),'Contract Board deep links must promote the focused weekly job to the top');
ok(quests.includes('focusedOrderMissing')&&quests.includes('board refreshed'),'Stale Contract Board deep links must fail visibly after weekly rollover');
ok(quests.includes("challengePeriod")&&quests.includes("['all','daily','weekly','monthly']"),'Class Challenges must support compact cadence filtering');
ok(quests.includes("Number(b.progress>=b.required)-Number(a.progress>=a.required)"),'Claimable Class Challenges must sort ahead of incomplete rows');
ok(quests.includes('<GameButton compact title={destination.button}'),'Contract Board utility actions must remain compact');
const questApp=read('App.tsx');
ok(questApp.includes("const [questMode,setQuestMode]=useState<QuestMode>('story')")&&questApp.includes("openQuestMode('contracts'"),'App routing must preserve explicit Story/Contract destinations');
ok(questApp.includes("focusedWeeklyOrderId={questFocusOrderId}")&&questApp.includes("onOpenContracts={order=>openQuestMode('contracts',order?.id)}"),'World regional Contract links must open the Contract Board with the exact job focused');
ok(questApp.includes("destination.tab==='World'&&destination.zoneId")&&questApp.includes('setGoalRegionId(destination.zoneId)'),'Story Journal destinations must preserve their authored World region instead of dropping zone context');
ok(quests.includes('onOpenWeeklyBoss')&&questApp.includes("monsterId:'FALLEN_KNIGHT'")&&questApp.includes("regionId:'KINGS_ROAD'"),'Weekly boss action must keep its exact destination');

const settings=read('src/screens/SettingsScreen.tsx');
ok(settings.includes('themeChoice:{minHeight:82'),'Theme preview cards must stay compact enough to compare all themes');
ok(settings.includes('<GameButton compact title="Restore gameplay defaults"'),'Settings reset-defaults action must remain secondary and compact');


const friends=read('src/screens/FriendsScreen.tsx');
ok(friends.includes('<GameButton compact title="Refresh"'),'Friends refresh must remain a compact secondary header action');
ok(friends.includes('<GameButton compact title="Accept"'),'Friend-request row actions must remain compact');
ok(friends.includes('<GameButton compact title="Decline"'),'Friend-request decline must remain compact');

const characterPolish=read('src/screens/CharacterScreen.tsx');
ok(characterPolish.includes('<GameButton compact title={selectedDecision?.upgrade.maxed?\'Enhance · MAX\''),'Selected equipment actions must remain compact even when the enhancement chance is surfaced');
ok(characterPolish.includes("GameButton compact title={skin.selected?"),'Repeated Character appearance actions must remain compact');

const worldPolish=read('src/screens/WorldScreen.tsx');
ok(worldPolish.includes("backgroundColor:C.dark?'rgba(5,12,20,.64)':'rgba(255,255,255,.68)'"),'World artwork overlay must preserve text contrast in dark and light themes');
ok(worldPolish.includes("backgroundColor:C.dark?'rgba(8,17,29,.80)':'rgba(255,255,255,.90)'"),'World locked-region overlay must be theme-safe');

const encounterList=read('src/components/RegionEncounterList.tsx');
ok(encounterList.includes('NEXT LV ~')&&encounterList.includes('XP to level'),'Expanded encounters must expose baseline combat level ETA and remaining XP');
ok(encounterList.includes('dropExpectation')&&encounterList.includes("'~1/'+Math.max(1,Math.round(expectation.oneIn))")&&encounterList.includes("'avg '+formatBalanceDuration(expectation.averageFindSeconds)"),'Combat drop rows must expose reciprocal odds and expected find-time context');
ok(encounterList.includes('dropPaceBand')&&encounterList.includes('pace.label'),'Combat drop rows must label frequent, progression, chase and long-chase acquisition pace');

const combatPolish=read('src/screens/CombatScreen.tsx');
ok(combatPolish.includes('<GameButton compact title="Change"'),'Combat region change must stay a compact secondary action');

const coopPolish=read('src/screens/CoopExpeditionScreen.tsx');
ok(coopPolish.includes("import {useGameTheme} from '../theme/ThemeContext';"),'Co-op shell must use the active theme');
ok(coopPolish.includes('const C=useGameTheme();'),'Co-op shell must resolve semantic colors from the selected theme');
ok(!coopPolish.includes("import {C} from '../theme/theme';"),'Co-op shell must not regress to the static VELDRYN palette');

console.log('PASS: UI hierarchy stays compact, theme-aware, safe-area aware, and free of redundant Home navigation');
