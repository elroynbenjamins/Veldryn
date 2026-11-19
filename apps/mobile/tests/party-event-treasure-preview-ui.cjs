'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const src=fs.readFileSync(path.join(__dirname,'../src/screens/FeaturePreviewScreen.tsx'),'utf8');
const portion=src.slice(src.indexOf('function PartyContents('),src.indexOf('const samples:readonly MarketPreviewItem[]'));
assert.match(portion,/if\(tab==='finale'\)/,'original finale remains');
assert.match(portion,/DAY 8 · SETTLEMENT/,'original settlement preserved');
assert.match(portion,/PARTY TREASURE · DESIGN QA/,'dedicated treasure section');
assert.match(portion,/PARTY SIGILS|Party Sigils/,'currency described');
assert.match(portion,/partyTreasureSets\[story\.id\]/,'story changes displayed sets');
assert.match(portion,/partyChestDesign\.map/,'three read-only chest cards');
for(const label of ['Adventure Chest','Preparation Chest','Victory Chest',
 "Wayfarer's Pact","Smuggler's Guile",'Moonfang Pursuit',"Predator's Mark",
 'Runebound Vigil',"Warden's Seal",'Echoheart Vestment',"Curator's Oath"]){
 assert(src.includes(label),'missing authored label: '+label);
}
for(const label of ['Open chest · Not available','Exchange gear · Not available',
 'Claim settlement · Not available'])
 assert(portion.includes(label+'" s={s} disabled'),'no clickable economic action: '+label);
assert(!portion.includes('onPress={()=>claimParty'), 'no direct claim bridge');
assert.match(src,/Developer-only UI preview/,'developer-only shell preserved');
console.log('PARTY_EVENT_TREASURE_PREVIEW_UI_OK: 3 locked chests / 8 authored set labels / no claims or exchange');
