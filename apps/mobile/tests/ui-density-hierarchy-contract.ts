export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const home=read('src/screens/HomeScreen.tsx');
ok(!home.includes('formatGameNumber'),'Home must not duplicate the Gold already visible in the top bar');
ok(!home.includes('title="Explore world"'),'Home must not duplicate the persistent World navigation action');
ok(!home.includes('title="Equipment & food"'),'Home must not duplicate the persistent Inventory navigation action');
ok(home.includes("completed>0?\`Claim \${completed}\`:'Journal'"),'Quest-ready state must stay integrated into the campaign strip');


const sessionOverview=read('src/components/HomeSessionOverview.tsx');
ok(home.includes('<HomeSessionOverview'),'Home must expose one compact session-priority surface');
ok(home.indexOf('<HomeSessionOverview')<home.indexOf('ASTERFALL CAMPAIGN'),'Session priorities must appear before broader campaign/planning detail');
ok(home.includes('showProgress&&<View style={s.expanded}><WorkingTowardSummary')&&home.includes('<SkillDashboard state={state}'),'Full goals, weekly, daily and skill snapshots must move behind the secondary progress disclosure');
ok((home.match(/<SkillDashboard/g)??[]).length===1,'Home must not duplicate the full skill snapshot outside its secondary progress area');
ok(home.includes('Goals, daily & skill progress')&&home.includes('Working Toward · Contract Board · Daily Supplies · skill snapshot'),'Home secondary disclosure must clearly describe the systems it contains');
ok(sessionOverview.includes('SESSION OVERVIEW')&&sessionOverview.includes('label="READY"')&&sessionOverview.includes('label="GOALS"')&&sessionOverview.includes('label="WEEKLY"')&&sessionOverview.includes('label="NEW"'),'Home session overview must preserve the four compact action categories');
ok(sessionOverview.includes("cell:{position:'relative',flex:1,minWidth:0,minHeight:48"),'Home session cells must stay compact while retaining accessible touch height');
ok(sessionOverview.includes('useWindowDimensions')&&sessionOverview.includes("width<350||fontScale>=1.25")&&sessionOverview.includes("cellStack:{flex:0,flexBasis:'48%'"),'Home session overview must collapse to a clean 2×2 layout on narrow phones or larger text');
ok(sessionOverview.includes('goodSurface')&&sessionOverview.includes('infoSurface')&&sessionOverview.includes('specialSurface')&&sessionOverview.includes('accentSurface'),'Home session cells must use semantic theme surfaces for restrained color emphasis');
const dashboardCore=read('src/core/dashboard.ts');
ok(dashboardCore.includes('homeSessionSummary')&&dashboardCore.includes("kind:'quests'")&&dashboardCore.includes("kind:'daily'")&&dashboardCore.includes("kind:'events'")&&dashboardCore.includes("kind:'goals'"),'Home ready-now priority must remain deterministic and derived from existing systems');

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

const skills=read('src/screens/SkillsScreen.tsx');
ok(skills.includes("minHeight:112"),'Skills hub cards must remain compact');
ok(skills.includes('skillTop:'),'Skills hub cards must keep the compact icon/copy row');
ok(!skills.includes('Tap to open'),'Skills cards must not waste a line on redundant tap instructions');

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
ok(gatheringSkills.includes('EXPECTED / HR')&&gatheringSkills.includes('SKILL XP / HR'),'Gathering cards must surface compact resource and XP hourly rates');
ok(gatheringSkills.includes('NEXT SKILL UNLOCK'),'Gathering details must preview the next skill unlock');
ok(gatheringSkills.includes("targetTag:{fontSize:9"),'Working Toward gathering targets must remain visible without adding a large banner');
ok(gatheringSkills.includes('gatheringProgressionAction')&&gatheringSkills.includes('bestGatheringTrainingDestination'),'Gathering locked/empty states must route to useful training actions');
ok(gatheringSkills.includes("title={'Train to Lv '"),'Locked gathering nodes must offer a direct train-prerequisite action');
ok(gatheringSkills.includes('professionMasteryMultipliers')&&gatheringSkills.includes('MASTERY'),'Gathering cards must show the same action-specific mastery used by their rate calculations');

const craftingBrowser=read('src/components/CraftingRecipeBrowser.tsx');
ok(craftingBrowser.includes("(!recipe.classId||recipe.classId===state.character?.classId)"),'Crafting lists must hide recipes restricted to other classes');
ok(craftingBrowser.includes("label:'READY NOW'")&&craftingBrowser.includes("label:'NEEDS REQUIREMENTS'")&&craftingBrowser.includes("label:'LOCKED'"),'Crafting recipes must remain grouped by actionable state');
ok(craftingBrowser.includes("filterToggle:{minHeight:44"),'Crafting filters must use a compact accessible dropdown control');
ok(craftingBrowser.includes("skillId==='smithing'?{label:'EQUIPMENT FORGE'")&&craftingBrowser.includes("label:'KITCHEN'")&&craftingBrowser.includes("label:'ALCHEMY LAB'"),'Crafting skill screens must preserve distinct workshop identities');
ok(craftingBrowser.includes('alchemyAvailability')&&craftingBrowser.includes("Stop the current activity before brewing."),'Alchemy recipe readiness must use the reserved batch system');
ok(craftingBrowser.includes('bestRecipeTrainingDestination')&&craftingBrowser.includes('Open best training recipe'),'Crafting summaries must navigate into a useful current training recipe');

const recipeCard=read('src/components/RecipeCard.tsx');
ok(recipeCard.includes("head:{minHeight:96"),'Recipe rows must remain compact');
ok(recipeCard.includes("statusText=forgeFull?"),'Collapsed recipe cards must expose the actual blocking state');
ok(recipeCard.includes('BATCH SIZE')&&recipeCard.includes("Brew ×"),'Alchemy recipe cards must expose batch-size and timed brew controls');
ok(skills.includes("type:'alchemy_start'"),'Skills must route Alchemy through the authoritative alchemy_start command');
ok(recipeCard.includes('recipeProgressionSources')&&recipeCard.includes('MISSING SOURCES'),'All recipe types must expose actionable material/prerequisite sources');
ok(recipeCard.includes('recipeSkillTrainingAction')&&recipeCard.includes('recipeCharacterTrainingAction'),'Recipe level blockers must expose skill and character training actions');
ok(recipeCard.includes('RECIPE MASTERY')&&recipeCard.includes('professionMasteryMultipliers'),'Recipe cards must show live per-recipe mastery and effective values');

const skillNavigation=read('src/core/skill-progression-navigation.ts');
ok(skillNavigation.includes('workingTowardItemSource'),'Skill progression navigation must reuse the canonical Working Toward item-source resolver');
ok(skillNavigation.includes('characterTrainingDestination'),'Character-level recipe locks must have a concrete combat training destination when available');

const workingToward=read('src/core/working-toward.ts');
ok(workingToward.includes("kind:'dungeon';dungeonId?:string"),'Working Toward must support a real Dungeon destination');
ok(workingToward.includes("goal.kind==='dungeon_clears')return {kind:'dungeon'"),'Dungeon goals must navigate instead of rendering info-only dead ends');
ok(read('App.tsx').includes("destination.kind==='dungeon'){setTab('Coop')"),'Dungeon progression actions must open the real co-op dungeon screen');

const planner=read('src/screens/ProgressionPlannerScreen.tsx');
ok(planner.includes('MASTERY_GOAL_RANKS')&&planner.includes('nextMasteryGoalRank'),'Working Toward Profession Mastery goals must target authored bonus ranks');
ok(planner.includes("R{rank}")&&planner.includes("rank===10?'+2% XP'"),'Mastery goal authoring must explain each bonus-rank target');

const appMastery=read('App.tsx');
ok(appMastery.includes('masteryRankProgressionMoments')&&appMastery.includes('<ActionFeedback message={masteryRankNoticeMessage(masteryNotices)}'),'Non-reward mastery rank-ups must use lightweight in-app feedback');
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

const activity=read('src/components/ActivityCard.tsx');
ok(activity.includes('activityActions:{flexDirection:\'row\''),'Activity actions must remain on one compact row');
ok(activity.includes('backgroundColor:C.warningSurface'),'Activity warnings must use semantic theme surfaces');
ok(activity.includes('backgroundColor:C.infoSurface'),'Activity goal state must use semantic theme surfaces');

const queue=read('src/components/ActionQueuePanel.tsx');
ok(queue.includes('backgroundColor:C.warningSurface'),'Queue warnings must remain theme-safe');
ok(queue.includes('backgroundColor:C.goodSurface'),'Queue handoff success must remain theme-safe');

const inventory=read('src/screens/InventoryScreen.tsx');
ok(inventory.includes("root:{padding:spacing.md,gap:10}"),'Inventory should keep compact screen padding');
ok(inventory.includes("storageChip:{flex:1,minWidth:0,minHeight:48"),'Inventory storage selector should remain compact');
ok(inventory.includes("utilityChip:{flex:1,minWidth:0,minHeight:44"),'Inventory quick controls must retain accessible touch height');
ok(inventory.includes('visible={filterOpen}'),'Inventory categories must open in a compact filter sheet');
ok(inventory.includes('filterOption:{minHeight:44'),'Inventory filter rows must retain accessible touch height');
ok(!inventory.includes('contentContainerStyle={s.controlStrip}'),'Inventory must not regress to the long horizontal category strip');

const world=read('src/screens/WorldScreen.tsx');
ok(world.includes('currentCard:{minHeight:150'),'World current-region card must remain compact');
ok(world.includes('destination:{minHeight:92'),'World destination cards must remain compact');
ok(world.includes('CURRENT REGION CONTENT')&&world.includes('What can I do in {current.name}?'),'World must behave as a current-region hub before presenting travel-away choices');
ok(world.indexOf('{sunscar&&')<world.indexOf('TRAVEL ELSEWHERE')&&world.indexOf('{frostmarch&&')<world.indexOf('TRAVEL ELSEWHERE'),'Region-specific Sunscar/Frostmarch content must appear before the travel-away list');
ok(world.includes('<RegionStat label="HUNTS"')&&world.includes('<RegionStat label="GATHER"')&&world.includes('<RegionStat label="BOSSES"'),'Current region hub must expose compact real-content readiness counts');
ok(world.includes('NEXT REGION UNLOCK')&&world.includes("unlockTrack:{height:5"),'World travel section must show compact next-region level progress');
ok(world.includes('orderedTravelRegions(state,current.id,goalRegionId)'),'World travel ordering must reuse the core goal-aware unlocked-first ordering helper');
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

const primaryNavigation=read('src/components/PrimaryNavigation.tsx');
const appShell=read('App.tsx');
const packageJson=read('package.json');
ok(primaryNavigation.includes('useSafeAreaInsets'),'Bottom navigation must use real safe-area metrics');
ok(primaryNavigation.includes("Platform.OS==='android'?Math.max(bottom,8):4"),'Android bottom navigation must apply the native bottom inset without reducing touch safety');
ok(!primaryNavigation.includes("Dimensions.get('screen')")&&!primaryNavigation.includes('StatusBar.currentHeight'),'Bottom navigation must not regress to screen-height/status-bar heuristics');
ok(appShell.includes('<SafeAreaProvider>'),'App root must provide safe-area metrics');
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
ok(quests.includes('disclosure:{minHeight:60'),'Quest secondary disclosures must remain compact');
ok(quests.includes('<GameButton compact title={destination.button}'),'Contract Board utility actions must remain compact');
ok(quests.includes('GameModalSurface')&&quests.includes('Filter story chapters'),'Quest story filters must use the compact modal/filter-sheet pattern');
ok(!quests.includes('accessibilityRole="tablist"')&&!quests.includes('function FilterChip'),'Quest Journal must not regress to the old horizontal filter-chip strip');
ok(quests.includes('<JournalStat stack={stackAttention} label="REWARDS"')&&quests.includes('<JournalStat stack={stackAttention} label="WEEKLY"')&&quests.includes('<JournalStat stack={stackAttention} label="CACHES"'),'Quest Journal must expose compact action-attention counts');
ok(quests.includes('useWindowDimensions')&&quests.includes("width<360||fontScale>=1.25")&&quests.includes("journalStatStack:{flex:0,flexBasis:'48%'"),'Quest attention summary must adapt to narrow phones and larger text');
ok(quests.indexOf('{entries.map')<quests.indexOf('CONTRACT BOARD ·'),'Story chapters must appear before secondary Contract Board content');
ok(quests.includes('const ordered=[...orders].sort')&&quests.includes('Number(b.progress>=b.target)'),'Contract Board rows must prioritize completed/near-complete jobs');
ok(quests.includes('claimedIds=new Set')&&quests.includes('Number(b.progress>=b.required&&!claimedIds.has(b.id))'),'Class challenge rows must prioritize claimable caches');
ok(quests.includes("filterToggle:{minWidth:88,minHeight:44"),'Quest filter control must retain accessible compact touch sizing');

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

const combatPolish=read('src/screens/CombatScreen.tsx');
ok(combatPolish.includes('<GameButton compact title="Change"'),'Combat region change must stay a compact secondary action');

const coopPolish=read('src/screens/CoopExpeditionScreen.tsx');
ok(coopPolish.includes("import {useGameTheme} from '../theme/ThemeContext';"),'Co-op shell must use the active theme');
ok(coopPolish.includes('const C=useGameTheme();'),'Co-op shell must resolve semantic colors from the selected theme');
ok(!coopPolish.includes("import {C} from '../theme/theme';"),'Co-op shell must not regress to the static VELDRYN palette');

console.log('PASS: UI hierarchy stays compact, theme-aware, safe-area aware, and free of redundant Home navigation');
