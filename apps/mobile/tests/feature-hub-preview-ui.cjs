const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const mobile=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(mobile,file),'utf8');
const app=read('App.tsx');
const route=read('src/core/feature-hub-routes.ts');
const screen=read('src/screens/FeaturePreviewScreen.tsx');
const marketFilter=read('src/core/market-preview-filter.ts');
const worldBossPresentation=read('src/core/world-boss-presentation.ts');
const more=read('src/screens/MoreScreen.tsx');
const chat=read('src/components/ChatOverlay.tsx');
const flags=read('src/core/release-flags.ts');

test('all three screens mount only from development-only QA routes',()=>{
 assert.match(route,/FEATURE_HUB_QA_ENABLED=typeof __DEV__/);
 for(const name of ['WorldBossPreview','PartyEventPreview','PlayerMarketPreview']){
  assert.ok(route.includes("'"+name+"'"),name+' route absent');
  assert.ok(more.includes("'"+name+"'"),name+' QA entry absent');
 }
 assert.match(app,/FEATURE_HUB_QA_ENABLED&&isFeatureHubPreviewRoute\(tab\)/);
 assert.match(app,/isFeatureHubPreviewRoute\(destination\)&&!FEATURE_HUB_QA_ENABLED/);
 assert.match(more,/FEATURE_HUB_QA_ENABLED&&onOpenFeaturePreview/);
});

test('immersive feature hubs never show the activity bar or global chat dock',()=>{
 assert.match(route,/hideActivityBar:preview/);
 assert.match(route,/hideGlobalChatDock:preview/);
 assert.match(route,/showLocalPartyChatDock:route==='PartyEventPreview'/);
 assert.match(app,/!featureHubShell\.hideActivityBar/);
 assert.match(app,/featureHubShell\.hideGlobalChatDock/);
 assert.match(screen,/feature==='party'\?<PartyPreviewDock/);
 assert.match(screen,/function PartyPreviewDock/);
 assert.match(screen,/accessibilityLabel=\{partyConnected\?'Open Party Chat'/);
});

test('the Party Event dock opens the real Party channel, never a fake conversation',()=>{
 assert.match(app,/setChatInitialChannel\('party'\);setShowChatOverlay\(true\)/);
 assert.match(chat,/initialChannel\?:'world'\|'guild'\|'party'/);
 assert.match(chat,/initialChannel==='party'&&party\?'party'/);
 assert.match(screen,/social\.party\?\.id/);
});

test('backend release and economy flags stay sealed; previews perform no game writes',()=>{
 assert.match(flags,/PLAYER_MARKET_RELEASED=false/);
 assert.match(flags,/MARKET_AUTHENTICATED_SERVICE_READY=false/);
 assert.match(screen,/No game resources, attempts, votes, listings or rewards are changed/);
 assert.match(screen,/Publish listing · Not available/);
 assert.match(screen,/Begin account raid · Not available/);
 assert.match(screen,/Cast vote · Server unavailable/);
 assert.doesNotMatch(screen,/purchaseMarketOffer|claimWorldBossReward|submitPartyEventVote|supabase\.(rpc|from)/);
});


test('Party Event chat is isolated from global World, Guild, System and player-roster surfaces',()=>{
 assert.match(app,/partyOnly=\{featureHubShell\.showLocalPartyChatDock\}/);
 assert.match(chat,/if\(partyOnly&&next!=='party'\)return/);
 assert.match(chat,/!partyOnly&&<ChatTab channel="world"/);
 assert.match(chat,/!partyOnly&&<ChatTab channel="guild"/);
 assert.match(chat,/!partyOnly&&<ChatTab channel="system"/);
 assert.match(chat,/!partyOnly&&ONLINE_PLAYER_ROSTER_RELEASED&&onlineConfigured/);
 assert.match(chat,/!partyOnly&&<View style=\{\[s\.channelPanel,channel!=='world'/);
});

test('World Boss and Party art uses canonical regional scenes and each family has specific vote labels',()=>{
 assert.match(screen,/import \{regionScenes\} from '\.\.\/theme\/upgraded-artwork'/);
 for(const scene of ["scene:'IRONWOOD'","scene:'KINGS_ROAD'","scene:'SUNSCAR'","scene:'FROSTMARCH'","scene:'SILVERBROOK'","scene:'OLD_MINES'"]){
  assert.ok(screen.includes(scene),scene+' scene missing');
 }
 for(const choice of ['Safe Pass','Brace Wagons','Shadow Trail','Hunt the Alpha','Charge Sigils','Overload Wards','Deep Passage','Preserve Seals']){
  assert.ok(screen.includes(choice),choice+' choice missing');
 }
 assert.match(screen,/roster=\{social\.party\?\.members\.map/);
});

test('Market example item selection, price history and fee explanation stay strictly read-only',()=>{
 assert.match(screen,/ILLUSTRATIVE PRICE TREND · NOT REAL SALES/);
 assert.match(screen,/Example T2 Forged Armor/);
 assert.match(screen,/requiredLevel:18/);
 assert.match(screen,/estimateMarketPreviewQuote\(quantity,price\)/);
 assert.match(screen,/disabled=\{!quoteValid\}/);
 assert.match(screen,/quoteIssue\?<Text/);
 assert.match(screen,/Purchase · Market unavailable/);
 assert.match(screen,/No listing has been submitted/);
 assert.match(screen,/No listings or ownership records are loaded/);
});

test('compact UI and market sorting are keyboard and scroll safe',()=>{
 const views=[...screen.matchAll(/<ScrollView\s[^>]*>/g)].map(match=>match[0]);
 assert.ok(views.length>=4,'tab rail, main page, market filters and guide scroll exist');
 for(const view of views){
  assert.match(view,/showsVerticalScrollIndicator=\{false\}/,'every scroll surface hides vertical indicators');
  assert.match(view,/showsHorizontalScrollIndicator=\{false\}/,'every scroll surface hides horizontal indicators');
 }
 assert.match(screen,/width<360\|\|fontScale>=1\.25/);
 assert.match(screen,/scrollRef\.current\?\.scrollTo\(\{y:0,animated:false\}\)/);
 assert.match(screen,/keyboardDismissMode="on-drag"/);
 assert.match(screen,/selectedItem\?\.id===item\.id/,'selected listing details should render inline');
 assert.match(screen,/filterMarketPreviewItems\(samples,category/,'browse delegates deterministic sort/filter logic');
 assert.match(marketFilter,/sort==='unit-desc'\?b\.unit-a\.unit:a\.unit-b\.unit/,'sorting supports ascending and descending unit price');
 assert.match(marketFilter,/sort==='lot'/,'sorting supports total lot price');
 assert.match(screen,/label:'Total lot'/,'total lot sorting remains available');
});

test('polished preview honors reduced motion and announces important local changes',()=>{
 assert.match(app,/reduceMotion=\{state\.settings\.reduceMotion\}/);
 assert.match(screen,/animationType=\{reduceMotion\?'none':'fade'\}/);
 assert.match(screen,/accessibilityLiveRegion="polite"/);
 assert.match(screen,/accessibilityRole="header"/);
 assert.match(screen,/accessibilityLabel=.*item\.name/,'market item exposes its sample price to screen readers');
});

test('stage-specific stories, settlement and verified trade history remain explicit',()=>{
 for(const snippet of [
  'Survey the crossing and inspect broken bridge supports.',
  'Read tracks and study signs in the moonlit woods.',
  'Trace rune fractures and broken magic circuits.',
  'Translate mirrored glyphs in the forgotten archive.'
 ]){
  assert.ok(screen.includes(snippet),'missing distinct stage: '+snippet);
 }
 assert.match(screen,/id:'results',label:'Results'/);
 assert.match(screen,/DAY 8 · SETTLEMENT/);
 assert.match(screen,/Claim settlement · Not available/);
 assert.match(screen,/id:'history',label:'History'/);
 assert.match(screen,/TRADE AUDIT TRAIL/);
 assert.match(screen,/No verified transactions/);
 assert.match(screen,/import \{UiIcon\} from '\.\.\/components\/UiIcon'/);
 assert.ok(!screen.includes("onPress={()=>purchaseMarketOffer("), 'prototype never buys from the economy');
});

test('guided help remains step-by-step and keyboard dismissible',()=>{
 assert.match(screen,/Step \{guideIndex\+1\} of \{guideTopics\.length\}/);
 assert.match(screen,/setGuideIndex\(0\);setGuide\(true\)/);
 assert.match(screen,/guideIndex===0/);
 assert.match(screen,/setGuideIndex\(i=>Math\.max\(0,i-1\)\)/);
 assert.match(screen,/if\(guideIndex>=guideTopics\.length-1\)setGuide\(false\)/);
 assert.match(screen,/onRequestClose=\{\(\)=>setGuide\(false\)\}/);
 assert.match(screen,/onAccessibilityEscape=\{\(\)=>setGuide\(false\)\}/);
});

test('bosses and party adventures show distinct preview cues without implying live status',()=>{
 for(const cue of ['root barricades','heatproof armor','blizzard','sweeping root warning','blazing ground markers','whiteout cast']){
  assert.ok(screen.includes(cue),'boss-specific preview cue missing: '+cue);
 }
 for(const cue of ['damaged wagons','sturdy snares','wardstones','mirror-shield fittings','raider charge','alpha pack','ward barrier','final seal']){
  assert.ok(screen.includes(cue),'party-specific preparation or finale cue missing: '+cue);
 }
 assert.match(screen,/boss\.supplies\.map/);
 assert.match(screen,/boss\.mechanics\.map/);
 assert.match(screen,/story\.supplies\.map/);
 assert.match(screen,/story\.finaleThreat/);
 assert.match(screen,/No current donation total is available in this preview/);
 assert.match(screen,/No combat, event points or claims can be initiated/);
});

test('World Boss displays only the server-selected rotating event, never a manual boss picker',()=>{
 assert.match(screen,/serverId:'hollowroot'/);
 assert.match(screen,/serverId:'sunscar'/);
 assert.match(screen,/serverId:'frostmarch'/);
 assert.match(worldBossPresentation,/sunscar:\{name:'Solbrand',region:'Sunscar'/);
 assert.match(worldBossPresentation,/frostmarch:\{name:'Rimewarden',region:'Frostmarch'/);
 assert.match(worldBossPresentation,/hollowroot:\{name:'Hollowroot',region:'Asterfall'/);
 for(const id of ['hollowroot','sunscar','frostmarch']){
  assert.ok(screen.includes('...WORLD_BOSS_PRESENTATION.'+id),'UI missing canonical boss identity '+id);
 }
 assert.match(screen,/import \{WORLD_BOSS_PRESENTATION\} from '\.\.\/core\/world-boss-presentation'/);
 assert.match(screen,/One shared boss every 14 days/);
 assert.match(screen,/const cycleBoss=bosses\.find\(entry=>entry\.serverId===bossStatus\?\.bossId\)\?\?unverifiedBoss/);
 assert.match(screen,/const boss=bosses\.find\(item=>item\.serverId===status\?\.bossId\)\?\?unverifiedBoss/);
 assert.match(screen,/const heroTitle=feature==='boss'&&bossStatus\?cycleBoss\.name:title\.title/);
 assert.match(screen,/const heroSceneId=feature==='boss'\?cycleBoss\.scene/);
 assert.match(screen,/scene:'KINGS_ROAD'/);
 assert.match(screen,/The current boss and next event date are unknown until the server announces/);
 assert.match(screen,/Rotation: \{bosses\.map\(entry=>entry\.name\)\.join\(' → '\)\} → repeat/);
 assert.match(screen,/const phaseBrief=active\?\.phase==='upcoming'/);
 for(const label of ['WHAT HAPPENS NEXT','War Camp is the current event phase','Weekend battle phase','Recovery and results','Awaiting the next realm event']){
  assert.ok(screen.includes(label),'missing phase guidance '+label);
 }
 assert.match(screen,/phaseBrief\.target!=='overview'/);
 assert.match(screen,/onPress=\{\(\)=>onTab\(phaseBrief\.target\)\}/);
 assert.match(screen,/This developer preview cannot open an actual event/);
 assert.match(screen,/Rotation','One global World Boss every 14 days/);
 assert.doesNotMatch(screen,/BossRegionPicker|bossRegionButton|setBossId|onSelect=\{setBossId\}/);
 assert.match(screen,/phaseEnd=active\?/);
 assert.match(screen,/NEXT CALENDAR BOUNDARY/);
 assert.match(screen,/bossTracks\.map\(track=>/);
 assert.match(screen,/goal\.tier1At/);
 assert.match(screen,/Projected'\)\+' tier '/);
 assert.match(screen,/progressbar/);
 assert.match(screen,/Squad not verified/);
 assert.match(screen,/Already claimed this event/);
 assert.doesNotMatch(screen,/EXAMPLE WAR SUPPLY METER|value=\{65\}/);
});

test('market browsing offers safe item inspection, reset and equipment gem trade rules',()=>{
 assert.match(screen,/Example T3 Forged Blade/);
 assert.match(screen,/requiredLevel:30/);
 assert.match(screen,/label:'Name'/);
 assert.match(marketFilter,/sort==='name'\?a\.name\.localeCompare\(b\.name\)/);
 assert.match(screen,/label:'Highest \/ unit'/);
 assert.match(screen,/Clear search and filters/);
 assert.match(screen,/setCategory\('All'\);setSelected\(null\)/);
 assert.match(screen,/selectedItem\.type==='Equipment'/);
 assert.match(screen,/Gem policy preview: socketed gems can be replaced, not removed or extracted/);
 assert.match(screen,/Socketed gems are replace-only, not extractable/);
 assert.match(screen,/Actual item sockets, lock state, ownership and tradability must come from the server/);
 assert.match(screen,/Purchase · Market unavailable/);
 assert.match(screen,/Publish listing · Not available/);
});

test('route changes cannot reuse a stale tab or open guide from another feature',()=>{
 assert.match(screen,/const defaultTab=tabs\[0\]\.id/);
 assert.match(screen,/const activeTab=tabs\.some\(item=>item\.id===tab\)\?tab:defaultTab/);
 assert.match(screen,/useEffect\(\(\)=>\{\s*setTab\(defaultTab\);\s*setGuide\(false\);\s*setGuideIndex\(0\);/);
 assert.match(screen,/\},\[route,defaultTab\]\)/);
 assert.match(screen,/if\(!tabs\.some\(item=>item\.id===next\)\)return/);
 for(const expression of ['tab={activeTab}','selected:activeTab===item.id']){
  assert.ok(screen.includes(expression),'tab guard missing: '+expression);
 }
});

test('mobile Market search has an accessible clear action and all preview calculations are memoized',()=>{
 assert.match(screen,/autoCorrect=\{false\} autoCapitalize="none" returnKeyType="search"/);
 assert.match(screen,/query\.length>0\?<Action label="Clear"/);
 assert.match(screen,/useMemo\(\(\)=>filterMarketPreviewItems\(samples/);
 assert.match(screen,/useMemo\(\(\)=>estimateMarketPreviewQuote\(quantity,price\)/);
 assert.match(screen,/help:\{width:44,height:44/);
 assert.match(screen,/sortChip:\{minHeight:44/);
 assert.match(screen,/filter:\{paddingHorizontal:12,minHeight:44/);
 assert.match(marketFilter,/items:readonly MarketPreviewItem\[\]/);
 assert.match(marketFilter,/return items\.filter\(item=>/);
});

test('Party Event stage actions and proposed preparation perks stay story-specific and safely read-only',()=>{
 for(const action of ['Map the Wagon Route','Lay a Scent Decoy','Ground a Failing Sigil','Stabilize the Inner Seal']){
  assert.ok(screen.includes(action),'missing family action: '+action);
 }
 for(const perk of ['Reinforced Wagon Frames','Scent Poultices','Arcane Recovery Salves','Anti-Corruption Remedies']){
  assert.ok(screen.includes(perk),'missing optional perk: '+perk);
 }
 assert.match(screen,/const partyActionStages=\['Stage 1','Stage 2','Stage 2','Stage 3'\]/);
 assert.match(screen,/storyGuide\.actions\.map/);
 assert.match(screen,/storyGuide\.preparations\.map/);
 assert.match(screen,/Partial supplies never activate a preparation bonus/);
 assert.match(screen,/No real orders, inventory quantities or completion status are loaded here/);
 assert.match(screen,/Objective completion and Event Points are unavailable in this preview/);
 assert.match(screen,/Contribute · Not available/);
 assert.match(screen,/Only server-authenticated activity receipts will count/);
 assert.doesNotMatch(screen,/submitPartyEventAction|submitPartyEventSupply|recordPartyEventReceipt/);
});

test('unrelated boss and market hubs do not subscribe to the Party context',()=>{
 const root=screen.split('export function FeaturePreviewScreen')[1].split('type Shared=')[0];
 assert.doesNotMatch(root,/usePartySocial\(\)/,'root preview shell must not rerender for Party roster updates');
 assert.match(screen,/function PartyPreviewPanel/);
 assert.match(screen,/function PartyPreviewDock/);
 assert.equal((screen.match(/usePartySocial\(\)/g)||[]).length,2,'both Party-only descendants own their subscription');
 assert.match(screen,/feature==='party'\?<PartyPreviewPanel/);
 assert.match(screen,/feature==='party'\?<PartyPreviewDock/);
 assert.match(screen,/hasParty=\{Boolean\(social\.party\?\.id\)\}/);
 assert.match(screen,/partyUnread>0&&partyConnected/);
});

test('Party Event private v33 snapshot stays disabled and cannot be confused with the live Party roster',()=>{
 const adapter=read('src/core/party-event-readonly-snapshot.ts');
 assert.match(adapter,/PARTY_EVENT_STATUS_MOBILE_RELEASED=false/);
 assert.match(adapter,/raw\.canClaim!==false\|\|raw\.canContribute!==false\|\|raw\.canFight!==false/);
 assert.match(adapter,/new Set\(raw\.completedActions\)\.size/);
 assert.match(adapter,/integer\(row\.donated,0,row\.target\)/);
 assert.match(screen,/partyEventStatus=null/);
 assert.match(screen,/decodePartyEventReadOnlySnapshot\(partyEventStatus\)/);
 assert.match(screen,/partyEventStatus=\{partyEventStatus\}/);
 assert.match(screen,/No verified event loaded/);
 assert.match(screen,/Event service not connected/);
 assert.match(screen,/status\.rosterSize\+' players'/);
 assert.match(screen,/storyStatus\?\.completedActions\.includes/);
 assert.match(screen,/partyEventSupplyProgress\(storyStatus,storyStatus\.stage,'required'\)/);
 assert.match(screen,/Read-only ballot status/);
 assert.match(screen,/does not authorize a boss attempt/);
 assert.doesNotMatch(app,/partyEventStatus=\{/,'unapproved live event fetch must not be wired by App');
 assert.doesNotMatch(screen,/supabase\.(rpc|from)|claimPartyEventReward|submitPartyEventVote/);
});
