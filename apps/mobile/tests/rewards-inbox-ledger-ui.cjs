const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=(relative)=>fs.readFileSync(path.join(root,relative),'utf8');
const inbox=read('src/screens/RewardsInboxScreen.tsx');
const socialAction=read('src/components/SocialActionButton.tsx');
const account=read('src/i18n/account.ts');

test('Rewards Inbox shows a compact, actionable ledger instead of a tall bulk banner',()=>{
 assert.match(inbox,/!marketTab&&!history&&pending>0\?<View style=\{\[s\.headerAction/);
 assert.match(inbox,/available=row\.attachments\.slice\(0,2\)/);
 assert.match(inbox,/s\.cardBody,stackActions&&s\.cardBodyStack/);
 assert.match(inbox,/s\.actions,stackActions&&s\.actionsStack/);
 assert.doesNotMatch(inbox,/s\.bulkAction/);
 assert.match(inbox,/minHeight:44,minWidth:80/);
});

test('Reward details and claim controls have context and safe tap targets',()=>{
 assert.match(inbox,/accessibilityState=\{\{expanded\}\}/);
 assert.match(inbox,/accessibilityLabel=\{a\('Reward details'\)\+': '\+row\.title\}/);
 assert.match(inbox,/accessibilityLabel=\{a\('Claim reward'\)\+': '\+row\.title\}/);
 assert.match(socialAction,/accessibilityLabel=\{accessibilityLabel\?\?label\}/);
 assert.match(inbox,/accessibilityLabel=\{attachment\.name\+' ×'\+attachment\.quantity\.toLocaleString\(language\)\}/);
 assert.match(inbox,/accessibilityRole="alert"/);
});

test('Native screen size, font scale and player text scale all affect compact layout',()=>{
 assert.match(inbox,/useWindowDimensions/);
 assert.match(inbox,/stackActions=width<430\|\|fontScale>=1\.2\|\|state\.settings\.textScale>=1\.2/);
 assert.match(inbox,/stackHeader=width<360\|\|fontScale>=1\.3\|\|state\.settings\.textScale>=1\.3/);
 assert.match(inbox,/flexWrap:'wrap'/);
});

test('Claim business logic and safety remain unchanged',()=>{
 for(const term of ['claimInboxReward(id)','claimAllInboxRewards()','onEventClaim(id.slice(6))','for(const row of eventRows)','await onRefresh();await load();','blockedClaims[row.id]','Make room in your inventory.','Items needing inventory space remain safe in your inbox.']){
  assert.ok(inbox.includes(term),'Missing preserved reward behavior: '+term);
 }
 assert.match(inbox,/MARKET_AUTHENTICATED_SERVICE_READY/);
 assert.match(inbox,/MarketInboxPanel state=\{state\} online=\{online\}/);
 assert.match(inbox,/if\(!marketTab&&!changed\)return/);
 assert.match(inbox,/if\(marketTab&&!changed\)void load\(\)/);
});

test('Player-facing existing reward action labels retain translations',()=>{
 for(const label of ['Claim all','Claim reward','Reward details','Claimed history','CLAIM BLOCKED']){
  assert.ok(account.includes('"'+label+'"'),'Missing translation label: '+label);
 }
});
