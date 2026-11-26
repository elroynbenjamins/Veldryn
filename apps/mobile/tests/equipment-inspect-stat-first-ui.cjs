const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=relative=>fs.readFileSync(path.resolve(__dirname,'../src',relative),'utf8');
const sheet=src('components/ItemQuickInspect.tsx');
const model=src('core/item-inspect.ts');
const compare=src('components/EquipmentPreview.tsx');
const inventory=src('screens/InventoryScreen.tsx');
const pouch=src('components/EquipmentPouchPanel.tsx');
const language=src('i18n/equipment-pouch-ui.ts');

// Base stats, authored innate trait, and authenticated rolled bonuses must stay distinct.
const base=sheet.indexOf('gt("BASE STATS")');
const innate=sheet.indexOf("ui('INNATE TRAIT')");
const rolls=sheet.indexOf("ui('RANDOM BONUS ROLLS')");
const summary=sheet.indexOf('canPreviewGear&&gearDecision?');
const vendor=sheet.indexOf("Sell value · {gold} gold each");
const details=sheet.indexOf("accessibilityLabel={ui('Details & sources')}");
assert(base>=0&&base<innate&&innate<rolls&&rolls<summary&&summary<vendor&&vendor<details,
  'An equipment copy must show stats, innate trait, affixes, comparison, value, then collapsed details');
assert(sheet.includes("const isBonusRoll=(line:string)=>line.startsWith('Equipment roll · ')||line.startsWith('Weapon roll · ')"),
  'Only authenticated weapon/equipment roll lines become random affixes');
assert(sheet.includes('bonusRows.map(roll=>')&&sheet.includes('rarityNameColor(model.rarityId,C.dark,C.good)'),
  'Rarity-accent actual rolled bonus values, never mock stats');
assert(sheet.includes("item.type==='gear'?ui('INNATE TRAIT'):gt(\"TRAIT\")"),
  'An authored passive stays separate from immutable physical-copy bonus rolls');

// Exact-copy status and comparison must never guess which receipt owns an affix.
assert(sheet.includes("isExactEquippedGear=item.type==='gear'&&source!=='bank'&&!!gearDecision?.alreadyEquipped"),
  'Equipped badge requires a real matching active copy; Bank-only stock never claims equipped');
assert(sheet.includes('!!gearDecision.previewAvailable')&&sheet.includes('(!!instanceId||model.craftedCopies===0)'),
  'A forged item without a selected receipt cannot present a fabricated power delta');
assert(sheet.includes("model.craftedCopies>0&&!instanceId?<Text style={s.warningText}"),
  'Expanded Gear Check must also fail closed for unspecified physical copies');
assert(model.includes('previewEquipment(state,itemId,selectedCopy?.id,source)'),
  'Compact impact must reuse the canonical equip projection with the exact receipt');
assert(sheet.includes('gearDecision.loadoutDelta.power')&&sheet.includes('displayStat(gearDecision.loadoutDelta.power)'),
  'Displayed combat power delta uses existing scale and signed projection');
assert(sheet.includes('gearDecision.set.currentPieces')&&sheet.includes('gearDecision.set.previewPieces'),
  'Set progress uses real before/after equipped piece counts');
assert(sheet.includes('gearDecision.alreadyEquipped?gt(\'Currently equipped · loadout change is zero.\')'),
  'Already-equipped items cannot say the effect requires equipping');
assert(sheet.includes('visibleStatDeltas.map('),'Show nonzero ATK/DEF/HP tradeoffs, not only power');
assert(inventory.includes("const inspectedGearReceiptId=inspected?.type==='gear'"),'Bind exact receipts only for real gear');
assert(inventory.includes("exactCopies.some(row=>row.id===selectedInstanceId)?selectedInstanceId:exactCopies.length===1?exactCopies[0].id:null"),
  'A sole verified copy must preview immediately; multiple copies require an explicit receipt');
assert(inventory.includes('instanceId={inspectedGearReceiptId} source={location}'),
  'Inventory passes the resolved unique receipt to the authoritative inspector');
assert(sheet.includes("item.type==='gear'&&source==='bank'?<Text style={s.gearSummaryNote}>{ui('Withdraw to compare & equip.')}</Text>"),
  'Bank inspection explains why equip deltas cannot be shown');

assert(sheet.includes('gearSummaryMetrics:{flexDirection:')&&sheet.includes('flexWrap:\'wrap\''),
  'Keep comparison metrics responsive on narrow phones');

// The existing full comparison and fixed action permissions remain authoritative.
assert(compare.includes('weaponBonusComparisonRows(')&&compare.includes('equipmentBonusCompactLine('),
  'Full Compare & Swap must still show all weapon and armor rolls');
assert(compare.includes('disabled={alreadyEquipped||!!blocked||busy}'),
  'Already equipped and incompatible pieces remain protected from redundant equip');
assert(inventory.includes('equipmentCopyDisposalDecision(')&&inventory.includes('disposalActions={inspectDisposalActions}'),
  'Inventory disposal still follows exact-copy authorization');
assert(pouch.includes('equipmentPouchSalvageCandidates(')&&pouch.includes('disposalActions={selected?'),
  'Gear Pouch disposal behavior remains separate and unchanged');
assert(sheet.includes('disposalActions?<View style={s.footerDisposal}'),
  'Sell and Salvage controls remain fixed below the scroll area');

// All new player-facing labels have seven non-English equivalents.
for(const key of ['INNATE TRAIT','RANDOM BONUS ROLLS','EQUIPMENT IMPACT','POWER CHANGE',
                  'SET PIECES','Replacing equipped item','Withdraw to compare & equip.']){
  const marker='"'+key+'": [';
  const start=language.indexOf(marker);
  assert(start>=0,'Missing new equipment translation: '+key);
  const row=language.slice(start,language.indexOf('],',start)+2);
  assert((row.match(/","/g)||[]).length>=6,'Incomplete DE/ES/NL/IT/FR/RU/TR row: '+key);
}
console.log('PASS equipment inspect: innate vs random, exact receipts, summary, responsive layout, permissions and translations');
