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
 assert.ok(pouch.includes('selectedIds.filter(id=>!eligibleSales.some'),'protected counts use exact chosen IDs');
 assert.ok(pouch.includes("p('Protected')"),'compact selection identifies protected copies');
});

test('compact comparison promotes Bank transfer but keeps equip pinned',()=>{
 assert.ok(compare.includes('compactPinnedBank=width<380;'),'full-size comparison remains unchanged');
 assert.ok(compare.includes('(!compactPinnedBank&&onMoveToBank)'),'Bank action omitted from redundant compact disclosure');
 assert.ok(compare.includes('onMoveToBank&&!compactPinnedBank?<View'),'only wide view shows disclosure transfer');
 assert.ok(compare.includes("compactPinnedBank&&onMoveToBank?<GameButton compact title={gearText('Move to Bank')}"),'Bank action available in compact footer');
 assert.ok(compare.includes("if(!onMoveToBank||busy)return;"),'Bank transfer retains pending guard');
 assert.ok(compare.includes("loading={busy&&busyAction==='bank'} disabled={busy}"),'footer is not repeatedly submitable');
});

test('compact Inventory controls remain reachable without changing full-size sizing',()=>{
 assert.ok(inventory.includes('compactInspector=width<380||fontScale>=1.25'));
 assert.ok(inventory.includes('stackInspectorActions=width<345||fontScale>=1.25'));
 assert.ok(inventory.includes('inspectStepCompact:{minWidth:44,minHeight:44}'),'narrow +/-/All controls are at least 44dp');
 assert.ok(inventory.includes('compactInspector&&s.inspectStepCompact'));
 assert.ok(inventory.includes('stackInspectorActions&&s.inspectQuickButtonsStacked'));
 assert.ok(inventory.includes('inspectAmount>=inspectStock&&s.inspectStepDisabled'));
 assert.ok(inventory.includes('disabled={inspectAmount===inspectStock}'),'All cannot issue redundant changes');
 assert.ok(inventory.includes('accessibilityState={{disabled:inspectAmount<=1}}'),'decrement announces disabled state');
 assert.ok(inventory.includes('accessibilityState={{disabled:inspectAmount>=inspectStock}}'),'increment announces disabled state');
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
  const values=labels.slice(start,end).split('\n').filter(line=>line.trim().startsWith('"'));
  assert.equal(values.length,7,'must have DE ES NL IT FR RU TR for '+key);
 }
});
