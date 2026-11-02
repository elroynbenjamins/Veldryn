const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
const paths=[
 'src/screens/StoreScreen.tsx',
 'src/components/StoreCollectionsPreview.tsx',
 'src/components/GooglePlayCommercePanel.tsx',
 'src/components/CommerceCatalog.tsx',
 'src/components/CommerceProductRow.tsx'
];
for(const path of paths){
 const file=ts.createSourceFile(path,read(path),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 assert.deepEqual(file.parseDiagnostics.map(x=>ts.flattenDiagnosticMessageText(x.messageText,' ')),[],path+' should parse');
}
const store=read(paths[0]),collections=read(paths[1]),billing=read(paths[2]),catalog=read(paths[3]),cards=read(paths[4]);
assert.ok(store.includes("type StoreSection='Memberships'|'Collections'")&&store.includes('label="Store categories"'),'Store has two accessible destinations');
assert.ok(store.includes("s.hidden")&&store.includes("<GooglePlayCommercePanel state={state}"),'Switching tabs retains mounted billing listeners');
assert.ok(store.includes('onRedeemCode(normalized)')&&store.includes('redeemFlight.current'),'Promo redemptions retain server authority and prevent double submit');
assert.ok(collections.includes('CONCEPT ONLY')&&collections.includes('Nothing on this page can be purchased')&&!collections.includes('onBuy('),'Unreleased cosmetics never masquerade as active commerce');
assert.ok(collections.includes("id:'Bloomwake'")&&collections.includes("id:'Suncrest'")&&collections.includes("id:'Harvestwake'")&&collections.includes("id:'Frostfall'"),'Four seasonal concepts are available to preview');
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
