const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=relative=>fs.readFileSync(path.join(__dirname,'..',relative),'utf8');
const sheet=source('src/components/ItemQuickInspect.tsx');
const inventory=source('src/screens/InventoryScreen.tsx');
const pouch=source('src/components/EquipmentPouchPanel.tsx');
const controls=source('src/components/InventoryItemHeaderControls.tsx');
const disposal=source('src/components/EquipmentDisposalStatus.tsx');
const i18n=source('src/i18n/equipment-pouch-ui.ts');

assert(sheet.includes('[detailsOpen,setDetailsOpen]=useState(false)'),'Detailed content must start collapsed');
assert(sheet.includes('setDetailsOpen(false)'),'Details disclosure must reset for each exact selected copy');
assert(sheet.includes('accessibilityState={{expanded:detailsOpen}}'),'Details disclosure must describe its actual state');
assert(sheet.includes('detailsOpen&&<>'),'Detailed stats, upgrades, gems and sources must be optional');
assert(sheet.includes('sources.length>0?<Section'),'Hide empty sources instead of showing boilerplate');
assert(sheet.includes('uses.length>0?<Section'),'Hide unused ingredient sections');
assert(sheet.includes('bonusRows.map(roll=>')&&sheet.includes('Sell value · {gold} gold each'),'Keep the actual equipment bonuses and vendor value visible');
assert(!sheet.includes("gt('BONUS STATS')")&&!sheet.includes('s.bonusNote}>{gt('),'Remove redundant rolled-bonus headings/explanations');
assert(sheet.includes('disposalActions?<View style={s.footerDisposal}')&&sheet.includes('footerDisposal:{borderTopWidth:StyleSheet.hairlineWidth'),'Keep Sell/Salvage visible below a clear divider');
assert(!sheet.includes('actionsOpen')&&!sheet.includes('footerActionScroll'),'No equipment action may be hidden behind a More actions disclosure');
assert(sheet.includes('compactHeader=width<390||fontScale>=1.25')&&controls.includes('button:{width:40,height:44'),'Header must accommodate compact phones and accessible target heights');

const quickStart=inventory.indexOf("inspected?.type==='gear'?<View style={s.inspectQuickActions}>");
assert(quickStart>=0,'Equipment must expose quick actions outside the secondary actions drawer');
const quick=inventory.slice(quickStart,inventory.indexOf('const inspectActions',quickStart));
assert(quick.includes("gl('Compare & Equip')")&&quick.includes("gl('To Bank')")&&quick.includes("gt('Withdraw')"),'Inventory and Bank must show appropriate primary actions');
assert(quick.includes("type:'gear_move'")&&quick.includes('selectedCopy?.id??null'),'Quick actions must use the selected exact-copy identity when available');
const secondary=inventory.slice(inventory.indexOf('const inspectActions'),inventory.indexOf('if(equipmentPouchOpen)'));
assert(!secondary.includes('Compare stats')&&!secondary.includes('favoriteSet.has(inspected.id)?gt("Remove favorite")'),'Do not duplicate primary compare or header favorite controls');
assert(secondary.includes('equipmentCopyDisposalDecision')===false && secondary.includes('inspectedCopySalvage?.allowed'),'Do not bypass existing copy-level disposal permissions');
assert(inventory.includes('setCopyPending({instanceId:selectedCopy.id,method:\'salvage\''),'Salvage must still confirm the selected instance');
assert(pouch.includes("p('Compare & Equip')")&&pouch.includes("p('To Bank')")&&pouch.includes("p('To Inventory')")&&pouch.includes('disposalActions={selected?'),'Gear Pouch must show transfers together and disposal buttons below them');
assert(pouch.includes('salvageCandidate?.eligible')&&pouch.includes('startSalvage([salvageCandidate.id])'),'Gear pouch disposal must validate the exact selected copy');
assert(disposal.includes('if(compact)return reasons.length?')&&disposal.includes('equipmentDisposalExplanation(reason)'),'Compact warnings must show real reasons, not duplicate readiness boxes');
for(const label of ['Details & sources']){
 const marker='"'+label+'": [';
 const at=i18n.indexOf(marker);
 assert(at>=0,'Missing localized disclosure label: '+label);
 const row=i18n.slice(at,i18n.indexOf('],',at)+2);
 assert((row.match(/","/g)||[]).length>=6,'Provide translations across seven non-English locales: '+label);
}
console.log('PASS: Compact item sheet, exact-copy disposal, small-screen controls and multilingual disclosures');
