const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const app=read('App.tsx');
const account=read('src/screens/MoreScreen.tsx');
const settings=read('src/screens/SettingsScreen.tsx');
const store=read('src/screens/StoreScreen.tsx');
const billing=read('src/components/GooglePlayCommercePanel.tsx');

for(const p of ['App.tsx','src/screens/MoreScreen.tsx','src/screens/SettingsScreen.tsx','src/screens/StoreScreen.tsx']){
 const source=read(p);
 const tree=ts.createSourceFile(p,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 assert.deepEqual(tree.parseDiagnostics.map(e=>ts.flattenDiagnosticMessageText(e.messageText,' ')),[],p+' parses');
}
assert(account.includes("'ResourceCodex','Store','Settings'"),'Account retains Store as a real destination');
assert(account.includes("['Dungeon','ResourceCodex','Store','Settings']"),'Account quick access shows Dungeons and retains Store');
assert(account.includes("items:['Dungeon','Home','Quests'"),'Dungeon has its own progression tile');
assert(app.includes("tab!=='Store'&&<View style={[s.backBar"),'Store omits the redundant global Back / Store bar');
assert(app.includes("|'Store';"),'Store is included in the route union');
assert(app.includes("case 'Store':return appText(language,'Store')"),'Store has a route title');
assert(app.includes("tab==='Store'&&<StoreScreen"),'Store renders as its own route');
assert(!app.includes("setSettingsSection('store')"),'Account no longer routes Store through Settings');
assert(!settings.includes("section==='store'"),'Settings has no Store section');
assert(!settings.includes("sectionDescription('store')"),'Settings has no Store shortcut');
assert(!settings.includes("GooglePlayCommercePanel"),'Settings does not mount billing');
assert(settings.includes("setSection('guide')"),'Help & Guide remains available in Settings');
assert(store.includes('<GooglePlayCommercePanel state={state} onChange={onChange} online={online} onRefreshCommerce={onRefreshCommerce}/>'),'Store preserves account-scoped checkout and purchase refresh');
assert(store.includes("onRedeemCode(normalized)"),'Store preserves promotional code redemption');
assert(store.includes("disabled={!code.trim()||redeeming||!onRedeemCode}"),'Code redemption cannot misleadingly submit without online support');
assert(billing.includes('restoreGooglePlayPurchases(')&&billing.includes('refreshGooglePlayEntitlements('),'Purchase restore and refresh still exist');
console.log('PASS: Account Store opens a standalone route; Settings duplicate removed; purchase and redemption controls retained');
