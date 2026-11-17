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
