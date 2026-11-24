const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
const paths=[
 'src/screens/StoreScreen.tsx',
 'src/components/StoreCosmeticsCatalog.tsx',
 'src/components/GooglePlayCommercePanel.tsx',
 'src/components/CommerceCatalog.tsx',
 'src/components/CommerceProductRow.tsx'
];
for(const path of paths){
 const file=ts.createSourceFile(path,read(path),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 assert.deepEqual(file.parseDiagnostics.map(x=>ts.flattenDiagnosticMessageText(x.messageText,' ')),[],path+' should parse');
}
const store=read(paths[0]),collections=read(paths[1]),billing=read(paths[2]),catalog=read(paths[3]),cards=read(paths[4]);
const flags=read('src/core/release-flags.ts');
assert.ok(flags.includes('PROFILE_COSMETICS_STORE_RELEASED=false')&&store.includes('const STORE_COSMETICS_VISIBLE=PROFILE_COSMETICS_STORE_RELEASED;'),'Unreleased store collections are disabled');
assert.ok(store.includes('STORE_COSMETICS_VISIBLE?<BoardTabs')&&store.includes("STORE_COSMETICS_VISIBLE&&section==='Cosmetics'"),'Collections tab and preview are both hidden behind the release flag');
assert.ok(store.includes("type StoreSection='Memberships'|'Cosmetics'"),'The concept can be restored without recreating its UI');
assert.ok(store.includes("s.hidden")&&store.includes("<GooglePlayCommercePanel state={state}"),'Switching tabs retains mounted billing listeners');
assert.ok(store.includes('onRedeemCode(normalized)')&&store.includes('redeemFlight.current'),'Promo redemptions retain server authority and prevent double submit');
assert.ok(collections.includes('CHECKOUT OFF')&&collections.includes('Price and checkout are intentionally not registered in this build.')&&!collections.includes('onBuy('),'Unreleased cosmetics never masquerade as active commerce');
const cosmeticCatalog=read('src/content/profile-cosmetic-store.ts');
assert.ok(['gloamward','frostbound','amberglass','briarbound'].every(id=>cosmeticCatalog.includes(id+':{name:'))&&cosmeticCatalog.includes('checkoutEnabled:false as const'),'Four standard cosmetic sets are prepared with checkout disabled');
assert.ok(catalog.includes('premiumProductRows(owned,checking)')&&catalog.includes('visible={selected!==null}'),'Product details use actual account entitlements');
assert.ok(catalog.includes('!current.confirmed||current.owned')&&catalog.includes('!available(current.id)'),'Unverified, already owned and unavailable products remain non-purchasable');
assert.ok(catalog.includes('rowPrice(current)')&&catalog.includes('price(row.id)')&&!catalog.includes('€4.99'),'Product price always comes from Google Play data');
assert.ok(catalog.includes('onBuy(id)')&&catalog.includes('setSelected(null)'),'Only confirmed detail actions reach the existing purchase callback');
assert.ok(catalog.includes('showsVerticalScrollIndicator={false}')&&catalog.includes('showsHorizontalScrollIndicator={false}'),'Product detail scroll adheres to mobile UI policy');
assert.ok(catalog.includes('fontScale<1.35')&&catalog.includes('width>=390'),'Card layout adapts to text scale and screen width');
assert.ok(billing.includes('verifyGooglePlayPurchase(')&&billing.includes('prepareGooglePlayPurchase(')&&billing.includes('restoreGooglePlayPurchases('),'Google Play verify, prepare and restore flow remains unchanged');
assert.ok(billing.includes('signedIn={signedIn}')&&billing.includes('reduceMotion={state.settings.reduceMotion}'),'Guest safety and accessibility flow through catalogue');
assert.ok(cards.includes('onDetails')&&!cards.includes('onBuy('),'Membership cards cannot start an unintended checkout');
console.log('PASS: Realm Store presentation preserves safe Google Play checkout, account ownership, and unavailable collection previews');
