export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message);}
const read=(path:string)=>fs.readFileSync(path,'utf8');
const skills=read('src/screens/SkillsScreen.tsx');
const hubReturn=skills.split('\n').find(line=>line.includes('if(!initialSkill)return'))??'';
ok(hubReturn.includes('<SkillHub')&&hubReturn.includes('onCommand={onCommand}'),'Queue planning commands belong to the scrolling Skills hub');
ok(skills.split('<ActivityQueuePlanner').length===2&&!skills.includes('<ActionQueuePanel'),'Individual skill screens must not contain queue controls');
const focusPosition=skills.indexOf('{focus?<Pressable'),queuePosition=skills.indexOf('<ActivityQueuePlanner'),combatPosition=skills.indexOf('{section(gt("COMBAT SKILLS")');
ok(focusPosition>=0&&queuePosition>focusPosition&&combatPosition>queuePosition,'Queue activity must scroll between Training Focus and Combat Skills');
const planner=read('src/components/ActivityQueuePlanner.tsx');
for(const label of ['Choose queue skill','Choose queued activity','Resource quantity','Skill level','Duration','Enemies defeated'])ok(planner.includes(label),'Planner exposes '+label);
for(const label of ["id:'faith'","id:'exploration'","id:'alchemy'",'Practices to reserve','faithPracticeCount','Starts this brew until its materials'])ok(planner.includes(label),'Planner supports queued '+label);
ok(planner.includes('<GameModalSurface')&&planner.includes('<ScrollView'),'Queue planning uses a scrollable shared popup');
ok(planner.includes('queue_set_goal')&&planner.includes('queue_add'),'Planner can configure the current activity and add future activities');
ok(planner.includes('activityQueueCapacity(state)')&&planner.includes('queuedActivityReadiness'),'Planner respects capacity and activity availability');
ok(planner.includes('queueSkillReadiness({...state,currentRegionId:selectedRegion},skill.id)')&&planner.includes('disabled={disabled}')&&planner.includes('{gl(availability.blocker)}'),'Unavailable skills in selected queue region are disabled with a localized reason');
ok(planner.includes('activityQueueAvailableRegions(state)')&&planner.includes('activityQueueCrossRegionAllowed(state)')&&planner.includes('setRegionFilter(zone.id)'),'Skills planner supports unlocked premium regions');
ok(planner.includes('state.settings.autoTravelQueuedActivities')&&planner.includes('Auto-travel is off.'),'Skills planner explains manual-travel versus auto-travel handoff');
const homeComposer=read('src/components/HomeQueueComposer.tsx');
ok(homeComposer.includes('activityQueueAvailableRegions(state)')&&homeComposer.includes('setRegionId(zone.id)')&&homeComposer.includes('autoTravelQueuedActivities'),'Home composer provides eligible region choices and explains auto-travel');
ok(homeComposer.includes('CURRENT ACTIVITY HANDOFF')&&homeComposer.includes("'30m'")&&homeComposer.includes('keepCurrentRunning:true')&&homeComposer.includes('handoffGoal'),'Home queue composer defaults to a clearly confirmed 30-minute or explicitly open-ended current handoff');
ok(planner.includes('Current activity handoff')&&planner.includes('handoffTargetId:state.activity.targetId')&&planner.includes('handoffGoal:currentGoal'),'Skills planner saves current stop and queue entry atomically');
const app=read('App.tsx');
ok(app.includes('handoffGoal:handoff.goal')&&app.includes('handoffTargetId:handoff.targetId'),'Home submits the combined queue command rather than separate mutations');
const settings=read('src/screens/SettingsScreen.tsx');
ok(settings.includes('Auto-travel between queued activities')&&settings.includes('disabled={!premiumRegionQueue}')&&settings.includes('autoTravelQueuedActivities:value'),'Paid queue travel has a guarded gameplay settings switch');
const popup=read('src/components/RewardPopup.tsx');
const queue=read('src/components/ActionQueuePanel.tsx');
ok(queue.includes('stackRows=width<480||fontScale>=1.25'),'Phone queue controls must stack below the activity details');
ok(queue.includes('accessibilityState={{expanded:managing}}')&&queue.includes('managing?<View style=')&&queue.includes('Confirm clear'),
 'Waiting queue stays compact until Manage is expanded, and destructive clear requires inline confirmation');
ok(queue.includes('onSetCurrentHandoff')&&queue.includes('Current activity handoff required')&&queue.includes('Stop current activity after 30 minutes'),'Already-queued open-ended activities offer the 30-minute remedy');
ok(queue.includes('onClear();')&&queue.includes('setConfirmClear(false'),
 'Clear queue still uses the existing queue_clear command without a new modal or gameplay path');
const quickInspect=read('src/components/ItemQuickInspect.tsx');
ok(quickInspect.includes('prioritizeItemSources(model.sources)')&&quickInspect.includes('prioritizeItemUses(model.usedIn)'),
 'Quick Inspect promotes accessible sources and crafting uses');
ok(quickInspect.includes('setUseLimits(previous=>')&&quickInspect.includes('Math.min(uses.length,useLimit+4)'),
 'Long crafting-use catalogues expand four rows at a time');
ok(quickInspect.includes('const model=useMemo(()=>itemId?itemInspectModel(state,itemId):undefined,[state,itemId])'),
 'Item inspection model is memoized across disclosure-only renders');

ok(queue.includes('<Text style={s.name}>{label}</Text>')&&queue.includes('<Text style={readiness.ready?s.readyMeta:s.blockedMeta}>'),'Queue activity names, goals and blocking reasons must wrap rather than truncate');
ok(!popup.includes('LOOT TYPES')&&!popup.includes('Effective pace')&&!popup.includes('actionsPerHour'),'Irrelevant summary metrics remain removed');
const footer=popup.indexOf('</ScrollView><View'),continueButton=popup.indexOf('title={gt("Continue")}');
ok(popup.includes('<ActivityQueueResults')&&footer>=0&&continueButton>footer,'Localized Continue remains outside the scrollable rewards');
console.log('PASS: central Skills queue planner, goal selection, safeguards and summary controls');
