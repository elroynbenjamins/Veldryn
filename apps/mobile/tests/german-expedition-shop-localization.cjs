const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');
require.extensions['.ts']=function(mod,filename){
 const out=ts.transpileModule(fs.readFileSync(filename,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}
 }).outputText;
 mod._compile(out,filename);
};
const {
 germanDungeonShopCopy,germanDungeonShopOfferNames,dungeonShopText,
 dungeonShopOfferName,dungeonShopOfferSummary,dungeonShopLockReason,
}=require('../src/i18n/dungeon-shop.ts');
const app=path.resolve(__dirname,'..');
const backend=fs.readFileSync(path.join(app,'../../backend/src/server/expeditions/dungeon-shop-catalog-v1.ts'),'utf8');
const offers=[...backend.matchAll(/\{id:'(dshop_[^']+)',name:(?:"([^"]+)"|'([^']+)')/g)]
 .map(match=>({id:match[1],name:match[2]??match[3]}));
assert.equal(offers.length,17,'Expected all 17 canonical Expedition Shop offers');
assert.equal(Object.keys(germanDungeonShopOfferNames).length,offers.length,'German offer names must cover every canonical offer ID');
for(const {id,name} of offers){
 assert.equal(germanDungeonShopOfferNames[id]?.[0],name,'German source guard drifted for '+id);
 assert.notEqual(dungeonShopOfferName('de',id,name),name,'German offer name missing: '+id);
 assert.equal(dungeonShopOfferName('en',id,name),name,'English offer name changed: '+id);
 assert.equal(dungeonShopOfferName('de',id,'Renamed server item'), 'Renamed server item','Changed server source should remain unchanged: '+id);
}
const expectedCopy=[
 'Expedition Marks','Permanent account currency','Shop not available yet','Refresh',
 'Weekly supplies reset Monday 00:00 UTC. Permanent collectibles do not rotate.',
 'Supplies','Collections','Owned','Unable to refresh the Dungeon Shop. Please retry.',
 'Purchase confirmed. Refresh to view your balance and reward.','Already owned. No Marks spent.',
 'Purchase confirmed, but refresh failed. Reopen the shop to synchronize your account.',
 'Unable to confirm purchase. Refresh before retrying.',
 'The server has not supplied a verified Dungeon Shop catalogue.',
 'Dungeon Shop is being prepared. Purchases are unavailable.',
 'Processing purchase','Not available yet','Available','Preview only','Need more Marks',
 'Region locked','Weekly limit reached','Coming soon','Owned permanently',
 '{count} purchases left this UTC week','Processing…','Confirm purchase · {marks} Marks',
 'Not enough Expedition Marks.','No offers in this category yet.',
 '{name}, {marks} Expedition Marks, {status}',
 'Shop preview only — no purchases are available.',
 'Not yet released — no Marks can be spent on this offer.',
 'The Expedition Shop is temporarily unavailable.',
 'Purchase confirmed. Reopen your inventory to refresh rewards.',
 '‹ Back to Dungeons','Loading Expedition Shop…',
 'Rare','Epic','supply','companion','icon','border','background','pet',
 'Profile icon · visual only',
];
const placeholders=source=>[...source.matchAll(/\{(\w+)\}/g)].map(match=>match[1]).sort();
assert.deepEqual(Object.keys(germanDungeonShopCopy).sort(),expectedCopy.sort(),'German shop UI keys changed without review');
for(const source of expectedCopy){
 const german=germanDungeonShopCopy[source];
 assert.ok(german?.trim(),'Missing German shop text: '+source);
 assert.deepEqual(placeholders(german),placeholders(source),'Placeholder mismatch: '+source);
 assert.equal(dungeonShopText('de',source),german,'German row ignored: '+source);
 assert.equal(dungeonShopText('en',source),source,'English source should remain unchanged: '+source);
}
assert.equal(dungeonShopText('de','Confirm purchase · {marks} Marks',{marks:'1.500'}),'Kauf bestätigen · 1.500 Marken');
assert.equal(dungeonShopText('de','{name}, {marks} Expedition Marks, {status}',{name:'Spieler $&',marks:120,status:'Verfügbar'}),'Spieler $&, 120 Expeditionsmarken, Verfügbar');
assert.equal(dungeonShopText('de','Unknown player input $&'),'Unknown player input $&');
assert.equal(dungeonShopOfferSummary('de','10 × TEMPERING DUST'),'10 × Härtungsstaub');
assert.equal(dungeonShopOfferSummary('de','8 × GEM DUST'),'8 × Edelsteinstaub');
assert.equal(dungeonShopOfferSummary('de','2 × TEMPERING CORE'),'2 × Härtekern');
assert.equal(dungeonShopOfferSummary('de','100 Companion Essence'),'100 Begleiteressenz');
assert.equal(dungeonShopOfferSummary('de','1 Bondstones'),'1 Bindungssteine');
assert.equal(dungeonShopOfferSummary('de','Profile icon · visual only'),'Profilsymbol · nur optisch');
for(const target of ['craftingSpeed','skillXp','dropChance','gatheringYield','hp','healingEffectiveness','fishingSpeed','defense','actionSpeed']){
 const source='+ 2.00% '+target+' equipped; +0.50% owned';
 const result=dungeonShopOfferSummary('de',source);
 assert.notEqual(result,source,'Untranslated live bonus stat: '+target);
 assert.match(result,/\+2,00 %/,'German bonus should use comma decimals');
 assert.match(result,/\+0,50 % im Besitz/);
 assert.equal(dungeonShopOfferSummary('en',source),source,'English server description changed');
}
assert.equal(dungeonShopOfferSummary('de','Unknown effect {whatever}'),'Unknown effect {whatever}');
for(const region of ['Asterfall','Sunscar','Frostmarch'])
 assert.equal(dungeonShopLockReason('de','Clear a '+region+' dungeon first.'),'Schließe zuerst einen Dungeon in '+region+' ab.');
assert.equal(dungeonShopLockReason('de','A player named Clear a Something dungeon first.'),'A player named Clear a Something dungeon first.');
assert.equal(dungeonShopLockReason('en','Clear a Sunscar dungeon first.'),'Clear a Sunscar dungeon first.');

const components=path.join(app,'src/components');
const shop=fs.readFileSync(path.join(components,'coop/DungeonMarksShopView.tsx'),'utf8');
const shell=fs.readFileSync(path.join(components,'ExpeditionShopPanel.tsx'),'utf8');
for(const marker of [
 'dungeonShopOfferName(language,item.id,item.name)',
 'dungeonShopOfferSummary(language,item.summary)',
 'dungeonShopLockReason(language,item.lockReason)',
 "t('{name}, {marks} Expedition Marks, {status}'",
 'formatLocalizedNumber(language,item.marks)',
 "t('{count} purchases left this UTC week'",
 "title={pending===item.id?t('Processing…')",
])assert.ok(shop.includes(marker),'Shop display translation missing: '+marker);
for(const marker of [
 "title={t('‹ Back to Dungeons')}",
 "t('Loading Expedition Shop…')",
 "t('Purchase confirmed. Reopen your inventory to refresh rewards.')",
])assert.ok(shell.includes(marker),'Expedition shell translation missing: '+marker);
console.log('PASS: 17 guarded German Expedition Shop offers, 45 UI keys, descriptions, statuses, placeholders and a11y wiring');
