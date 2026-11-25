const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const inventory=read('src/screens/InventoryScreen.tsx');
const pouch=read('src/components/EquipmentPouchPanel.tsx');
const compare=read('src/components/EquipmentPreview.tsx');
const labels=read('src/i18n/equipment-pouch-ui.ts');

test('modified compact surfaces and translations are parseable',()=>{
 for(const [name,source,kind] of [
  ['InventoryScreen.tsx',inventory,ts.ScriptKind.TSX],
  ['EquipmentPouchPanel.tsx',pouch,ts.ScriptKind.TSX],
  ['EquipmentPreview.tsx',compare,ts.ScriptKind.TSX],
  ['equipment-pouch-ui.ts',labels,ts.ScriptKind.TS],
 ]){
  const ast=ts.createSourceFile(name,source,ts.ScriptTarget.Latest,true,kind);
  assert.equal(ast.parseDiagnostics.length,0,name+' must parse without errors: '+ast.parseDiagnostics.map(x=>x.messageText).join('; '));
 }
});

test('Option A shows selection-first Gear controls only on narrow screens',()=>{
 assert.ok(pouch.includes('compactActions=width<380||fontScale>=1.25'),'compact mode is breakpoint-gated');
 assert.ok(pouch.includes("{!compactActions?<><GameButton compact title={p('Quick sell')}"),'wide layout retains Quick sell');
 assert.ok(pouch.includes("title={p('Quick salvage')}"),'wide layout retains Quick salvage');
 assert.ok(pouch.includes("p(compactActions?'Select safe to sell':'Select safe')"),'compact selection uses unambiguous, translated action');
 assert.ok(pouch.includes('equipmentPouchQuickSellIds(saleCandidates).slice(0,100)'),'safe selection retains eligible-only cap');
 assert.ok(pouch.includes('equipmentPouchQuickSalvageIds(state,salvageCandidates).slice(0,100)'),'salvage selection respects eligible-only safety and batch cap');
 assert.ok(pouch.includes('startSale(equipmentPouchQuickSellIds(saleCandidates).slice(0,100)'),'wide quick-sell also respects server batch limit');
 assert.ok(pouch.includes('selectedIds.filter(id=>!eligibleSales.some'),'protected counts use exact chosen IDs');
 assert.ok(pouch.includes("p('Protected')"),'compact selection identifies protected copies');
});

test('approved comparison exposes transfers and disposal at all sizes',()=>{
 assert.ok(compare.includes('hasStorageActions?<View style={s.footerActionRow}'),'storage stays visible above the divider');
 assert.ok(compare.includes('hasDisposalActions?<View style={s.footerDisposal}'),'Sell and Salvage stay visible below the divider');
 assert.ok(!compare.includes('compactPinnedBank')&&!compare.includes('actionsOpen'),'comparison has no hidden action drawer at any width');
 assert.ok(compare.includes("if(!onMoveToBank||busy)return;"),'Bank transfer retains pending guard');
 assert.ok(compare.includes("loading={busy&&busyAction==='bank'} disabled={busy}"),'footer is not repeatedly submitable');
 assert.ok(compare.includes('onMoveToInventory'),'Gear Pouch comparison can return a copy directly to Inventory');
});

test('compact Inventory controls remain reachable without changing full-size sizing',()=>{
 assert.ok(inventory.includes('compactInspector=width<380||fontScale>=1.25'));
 assert.ok(inventory.includes('stackInspectorActions=width<345||fontScale>=1.25'));
 assert.ok(inventory.includes('inspectStepCompact:{minWidth:44,minHeight:44}'),'narrow +/-/All controls are at least 44dp');
 assert.ok(inventory.includes('compactInspector&&s.inspectStepCompact'));
 assert.ok(inventory.includes('stackInspectorActions&&s.inspectQuickButtonsStacked'));
 assert.ok(inventory.includes('inspectAmount>=inspectStock&&s.inspectStepDisabled'));
 assert.ok(inventory.includes('disabled={inspectAmountValid&&inspectAmount===inspectStock}'),'All is disabled only when a valid quantity already equals stock');
 assert.ok(inventory.includes('accessibilityState={{disabled:inspectAmountValid&&inspectAmount===inspectStock}}'),'All announces the same disabled state');
 assert.ok(inventory.includes('onPress={()=>setInspectQuantity(inspectStock)}'),'All can restore a valid full-stock quantity from invalid input');
 assert.ok(inventory.includes('accessibilityState={{disabled:inspectAmount<=1}}'),'decrement announces disabled state');
 assert.ok(inventory.includes('accessibilityState={{disabled:inspectAmount>=inspectStock}}'),'increment announces disabled state');
});

test('open Gear inspector is anchored to the exact selected receipt after pouch reorder',()=>{
 assert.ok(pouch.includes('selectedReceipt.itemId===selectedAtIndex.itemId'),'inspector must match exact item identity');
 assert.ok(pouch.includes('selectedReceipt.instanceId===(selectedAtIndex.instanceId??null)'),'forged receipt must stay identical');
 assert.ok(pouch.includes('selectedIndex===null||!selected?undefined:byIndex.get(selectedIndex)'),'reordered sale candidate cannot be used');
 assert.ok(pouch.includes('selectedIndex===null||!selected?undefined:equipmentPouchSalvageCandidates'),'reordered salvage candidate cannot be used');
});

test('sale and salvage confirmation are exact-copy safe and retryable',()=>{
 for(const marker of [
  'confirmationValid=pendingRows.length>0',
  'salvageConfirmationValid=pendingSalvageRows.length>0',
  'pendingRows.every(row=>row.eligible)',
  'pendingSalvageRows.every(row=>row.eligible)',
  "type:'equipment_pouch_sell',args:{ids}",
  "type:'equipment_pouch_salvage',args:{ids}",
  'saleInFlight.current=true;setDisposalBusy(true);',
  'dismissOnBackdrop={!busy&&!disposalBusy}',
  "if(result===false){setDisposalError(",
  "if(result===false){setDisposalError(p('The action was not confirmed. Try again.'));return;}",
  'setSelectedIds([]);setSelectMode(false);setPendingSale(null);',
  'setSelectedIds([]);setSelectMode(false);setPendingSalvage(null);',
  'needsHighRarityReview(pendingRows)',
  'needsHighRarityReview(pendingSalvageRows)',
  "['epic','legendary','mythic']",
 ]){
  assert.ok(pouch.includes(marker),'missing safety requirement: '+marker);
 }
});

test('new user-facing guidance is available in all seven translated locales',()=>{
 for(const key of [
  'Tap a piece to inspect, equip or move it to Bank.',
  'Safe selection excludes Epic, Legendary and Mythic.',
  'The action was not confirmed. Try again.',
  'High-rarity gear selected. Check each copy before confirming.',
 ]){
  const start=labels.indexOf('  "'+key+'": [');
  assert.ok(start>=0,'missing translation row '+key);
  const end=labels.indexOf('\n  ],',start);
  assert.ok(end>start,'missing translation row end '+key);
  const values=labels.slice(labels.indexOf('\n',start)+1,end).split('\n').filter(line=>line.trim().startsWith('"'));
  assert.equal(values.length,7,'must have DE ES NL IT FR RU TR for '+key);
 }
});
