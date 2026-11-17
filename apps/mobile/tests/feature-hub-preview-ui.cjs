const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const mobile=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(mobile,file),'utf8');
const app=read('App.tsx');
const route=read('src/core/feature-hub-routes.ts');
const screen=read('src/screens/FeaturePreviewScreen.tsx');
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
 assert.match(screen,/feature==='party'\?<Pressable accessibilityRole="button" accessibilityLabel=\{partyConnected\?'Open Party Chat'/);
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
 assert.match(screen,/sort==='unit'\?a\.unit-b\.unit/,'sort should use normalized unit price');
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
