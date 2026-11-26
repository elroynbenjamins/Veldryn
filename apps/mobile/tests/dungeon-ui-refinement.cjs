const assert=require('node:assert/strict');
const test=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
function loadTypeScript(relative){
 const source=read(relative);
 const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};
 vm.runInNewContext(output,{exports,require}, {filename:relative});
 return exports;
}
test('weekly quest snapshot validates actual objective targets, not a hard-coded one',()=>{
 const m=loadTypeScript('src/core/dungeon-weekly-quests.ts');
 for(const [week,target] of [['2026-W45',1],['2026-W46',15],['2026-W47',3]]){
  const entry=m.dungeonWeeklyQuestForWeek(week);
  assert.equal(entry.target,target,'Rotation must keep one quest per week');
  const base={weekKey:week,id:entry.id,name:entry.name,description:entry.description,target,
   rewardMarks:25,claimed:false,resetAtMs:1795392000000};
  for(const progress of [0,1,target]){
   assert.equal(m.validateDungeonWeeklyQuestSnapshot({...base,progress}).progress,progress);
  }
  for(const progress of [-1,target+1,.5]){
   assert.throws(()=>m.validateDungeonWeeklyQuestSnapshot({...base,progress}),/invalid_dungeon_weekly_quest/);
  }
  assert.throws(()=>m.validateDungeonWeeklyQuestSnapshot({...base,progress:0,target:999}),/invalid_dungeon_weekly_quest/);
 }
});
test('all new compact prompts exist in eight languages',()=>{
 const m=loadTypeScript('src/i18n/dungeon-ux-copy.ts');
 const keys=['bossChoice','bossFinish','bossVote','bossFinal','bossHint','continueDeeper','continueVote','weeklyExpand','weeklyCollapse','weeklyFallback','weeklyHeader','weeklyStatus','weeklyProgress','weeklyReset','weeklyClaim','weeklyClaimedNote','weeklyScope','weeklyLoading','weeklyUnavailable','enduranceRoute','threat','room','finalBossLegend','bossCheckpoint','nextBossAt','soloPowerHint'];
 for(const lang of ['en','de','es','nl','it','fr','ru','tr'])
  for(const key of keys)assert.ok(m.dungeonUxText(lang,key).trim().length>=2,lang+' '+key); // Short UI labels such as Room/Oda must remain valid.
 assert.notEqual(m.dungeonUxText('en','bossChoice'),m.dungeonUxText('de','bossChoice'));
 assert.equal(m.dungeonUxText('fr','weeklyProgress',{name:'Élite',current:3,goal:3}),'Élite : 3 sur 3');
 assert.equal(m.dungeonUxText('en','nextBossAt',{room:21}),'Next boss option after room 21');
 assert.equal(m.dungeonUxText('tr','weeklyProgress',{name:'Seçkin',current:2,goal:3}),'Seçkin: 2/3');
 assert.notEqual(m.dungeonUxText('en','bossVote'),m.dungeonUxText('en','bossFinish'),'Voting is not an immediate fight');
});
test('weekly quest is compact, accessible, and claims without entering detail mode',()=>{
 const source=read('src/components/coop/DungeonWeeklyQuestPanel.tsx');
 assert.match(source,/accessibilityState=\{\{expanded\}\}/);
 assert.match(source,/onPress=\{\(\)=>setExpanded\(value=>!value\)\}/);
 assert.match(source,/ready\?<GameButton compact title=\{dungeonUxText\(language,'weeklyClaim'\)\}/);
 assert.match(source,/accessibilityRole="progressbar"/);
 assert.match(source,/expanded\?<Text style=\{s\.description\}/);
 assert.match(source,/resetAtMs/);
 assert.match(source,/dungeonUxText\(language,'weeklyCollapse'\)/);
});
test('Echo selection retains automatic role fills and gives explicit disabled reasons',()=>{
 const source=read('src/components/coop/CoopSocialEchoPicker.tsx');
 const loadout=read('src/components/coop/CoopLoadoutSelection.tsx');
 assert.match(source,/roleSlots\(hostRole,candidates,selectedIds\)/);
 assert.match(source,/accessibilityRole="checkbox"/);
 assert.match(source,/reasonLabel=disabled\?disabledReason\(why\)/);
 assert.match(source,/accessibilityHint=\{disabled\?reasonLabel/);
 assert.match(source,/candidate\.relationship==='both'/);
 assert.match(source,/!loading&&!error&&available\.map/);
 assert.match(source,/minHeight:44/);
 assert.match(source,/t\('uniqueDamage'\)/);
 assert.match(loadout,/preferredEchoCharacterIds:selectedSocialCharacterIds/);
 assert.doesNotMatch(source,/shareEcho|setShowEchoSharing/);
});
test('hub and loadout use one correct progression path and compact readiness',()=>{
 const browser=read('src/components/coop/CoopDungeonBrowser.tsx');
 const loadout=read('src/components/coop/CoopLoadoutSelection.tsx');
 assert.match(browser,/dungeonUxText\(language,'bossChoice'\)/);
 assert.match(browser,/\{weeklyQuestPanel\?\?null\}/);
 assert.ok(browser.indexOf('{sortedEvents.length>0?')<browser.indexOf('<View style={s.modeSegment}>'));
 assert.match(browser,/onQuickMatch/);
 assert.match(browser,/onShop/);
 assert.match(loadout,/portrait:\{width:70,height:88\}/);
 assert.match(loadout,/!selected\.selectable\|\|selected\.blockingReasons\.length>0/);
 assert.match(loadout,/T\$\{tier\}/);
 assert.match(loadout,/stickyAction=/);
});
test('Endurance boss exits are distinct without changing server-owned route submission',()=>{
 const route=read('src/components/coop/DungeonRouteChoices.tsx');
 const strip=read('src/components/coop/RoutePathStrip.tsx');
 assert.match(route,/const orderedOptions=useMemo\(\(\)=>\[\.\.\.options\]\.sort\(/,'Boss choice must be sorted first without mutating server-owned options');
 assert.match(route,/\{orderedOptions\.map\(\(option,optionIndex\)=>\{/,'The actual route cards must render in boss-priority order');
 assert.match(route,/const bossAvailable=orderedOptions\.length>1&&orderedOptions\.some\(option=>option\.kind==='boss'\)/);
 assert.match(route,/const bossExit=option\.kind==='boss'&&bossAvailable/);
 assert.match(route,/const continueChoice=bossAvailable&&option\.kind!=='boss'/);
 assert.match(route,/dungeonUxText\(language,'bossHint'\)/);
 assert.match(route,/live\?dungeonUxText\(language,'bossVote'\)/);
 assert.match(route,/AccessibilityInfo\.isReduceMotionEnabled\(\)/);
 assert.match(route,/animation\.stop\(\)/);
 assert.match(route,/onPress=\{\(\)=>onChoose\?\.\(option\.nodeId\)\}/);
 assert.match(route,/canChoose&&!option\.hidden/);
 assert.match(route,/myVotedNodeId===option\.nodeId/);
 assert.match(strip,/Array\.from\(\{length:7\}/);
 assert.match(strip,/const checkpoints=Math\.max\(1,Math\.ceil\(\(path\.totalDepth-1\)\/7\)\)/);
 assert.match(strip,/reduceMotion\|\|path\.totalDepth>16/);
});


test('solo dungeon difficulty shows server CP advice without imposing a CP entry gate',()=>{
 const source=read('src/components/coop/CoopDungeonBrowser.tsx');
 assert.match(source,/requiredPower=\{0\} recommendedPower=\{dungeon\.tierMinPower\[value\]\} currentLevel=\{currentLevel\} currentPower=\{Number\.POSITIVE_INFINITY\}/);
 assert.match(source,/const suggestedPower=Number\.isFinite\(recommendedPower\)&&recommendedPower>0/);
 assert.match(source,/style=\{s\.tierSuggestedPower\}/);
 assert.match(source,/dungeonUxText\(language,'soloPowerHint'\)/);
});

test('dungeon party cards share compact, stable dimensions and readable long-name slots',()=>{
 const run=read('src/components/coop/CoopRunOverview.tsx');
 const kit=read('src/components/coop/CoopVisualKit.tsx');
 const companion=read('src/components/coop/CoopPartyCompanionChip.tsx');
 // Compact styling is used only in the dungeon cards, not globally.
 assert.match(run,/style=\{s\.member\} contentStyle=\{s\.memberContent\}/);
 assert.match(run,/member:\{width:'48%',flexGrow:1,minWidth:0,minHeight:232\}/);
 assert.match(run,/memberContent:\{flex:1,gap:6,padding:10\}/);
 assert.match(run,/memberIdentity:\{flexDirection:'row',alignItems:'center',gap:6,height:70\}/);
 assert.match(run,/memberNameBox:\{height:38,justifyContent:'center'\}/);
 assert.match(run,/numberOfLines=\{2\} ellipsizeMode="tail" style=\{s\.memberName\}/);
 assert.match(run,/numberOfLines=\{1\} ellipsizeMode="tail" style=\{s\.className\}/);
 assert.match(run,/RoleBadge role=\{slot\.role\} label=\{t\(language,`coopUi\.\$\{slot\.role\}`\)\} compact/);
 assert.match(run,/memberMeta:\{flexDirection:'row',alignItems:'stretch',gap:coopSpacing\.xs,height:34\}/);
 assert.equal((run.match(/style=\{s\.memberChip\} compact/g)||[]).length,2);
 assert.match(run,/memberCompanion:\{marginTop:'auto',minHeight:46/);
 assert.match(run,/CoopPartyCompanionChip companionId=\{slot\.companionId\} echo=\{slot\.echo\} compact/);
 assert.match(run,/memberCompanionEmpty/);
 assert.doesNotMatch(run,/<Text style=\{s\.section\}>\{ct\(language,'details\.party'\)\}<\/Text>/,'No repeated Party heading above the grid');
 assert.match(kit,/roleBadgeCompact:\{minHeight:40/);
 assert.match(kit,/roleImageCompact:\{width:26,height:26\}/);
 assert.match(kit,/chipCompact:\{minHeight:34/);
 assert.match(kit,/adjustsFontSizeToFit=\{compact\}/);
 assert.match(companion,/compact\?:boolean/);
 assert.match(companion,/\{!compact\?<Text numberOfLines=\{1\} style=\{s\.subtitle\}/);
 assert.match(companion,/accessibilityLabel=\{\(echo\?st\('Frozen Echo companion'\)/);
});
