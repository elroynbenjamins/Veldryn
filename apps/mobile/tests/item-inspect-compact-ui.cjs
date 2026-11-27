const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=relative=>fs.readFileSync(path.join(__dirname,'..',relative),'utf8');
const modal=source('src/components/GameModalSurface.tsx');
const sheet=source('src/components/ItemQuickInspect.tsx');
const inventory=source('src/screens/InventoryScreen.tsx');
const pouch=source('src/components/EquipmentPouchPanel.tsx');
const controls=source('src/components/InventoryItemHeaderControls.tsx');
const disposal=source('src/components/EquipmentDisposalStatus.tsx');
const i18n=source('src/i18n/equipment-pouch-ui.ts');

// Android three-button navigation: the modal's own native window must
// measure and reserve its bottom safe area OUTSIDE the button footer.
const modalHost=modal.indexOf('return <Modal');
const provider=modal.indexOf('<SafeAreaProvider style={{flex:1}}>',modalHost);
const insetRead=modal.indexOf('insets=useSafeAreaInsets()',provider);
assert(modalHost>=0&&provider>modalHost&&insetRead>provider,'A nested provider must measure safe-area insets in the modal window');
assert(modal.includes("navigationBarTranslucent={Platform.OS==='android'}"),'Android navigation must be consistently edge-to-edge for insets to be measured');
assert(modal.includes('const bottomClearance=sheet?Math.max(safeBottom,keyboardOverlap)'),'Sheet clearance must include the resolved bottom inset without double-counting keyboard overlap');
assert(modal.includes('const rootInsets=useSafeAreaInsets()')&&modal.includes('frame=useSafeAreaFrame()')&&modal.includes('screenHeight:Dimensions.get(\'screen\').height'),'Use both native windows and real screen geometry to recover missing modal insets');
const ts=require('typescript');
const safeAreaExports={};
new Function('exports',ts.transpileModule(source('src/components/modal-safe-area.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(safeAreaExports);
const {resolveModalBottomInset,resolveModalKeyboardOverlap}=safeAreaExports;
const geometry={android:true,modalBottom:0,modalTop:24,rootBottom:0,rootTop:24,screenHeight:800,frameHeight:800};
const clearance=overrides=>resolveModalBottomInset({...geometry,...overrides});
assert.equal(clearance({}),48,'Zero insets on a full-screen Android window must reserve the three-button fallback');
assert.equal(clearance({modalBottom:48,rootBottom:48}),48,'A valid three-button inset is not added twice');
assert.equal(clearance({modalBottom:24,rootBottom:24}),24,'Normal gesture navigation stays compact');
assert.equal(clearance({rootBottom:48}),48,'A missing modal inset recovers the app inset');
assert.equal(clearance({modalBottom:24,rootBottom:48}),48,'A larger app inset protects against an underreported modal inset');
assert.equal(clearance({frameHeight:728}),0,'Do not add clearance when status and navigation bars already occupy the excluded window space');
assert.equal(clearance({frameHeight:776}),48,'A status-only exclusion must not consume the navigation allowance');
assert.equal(clearance({frameHeight:752}),24,'Partially excluded space reduces the conservative fallback');
assert.equal(clearance({frameHeight:728,modalBottom:24}),24,'A positive native modal inset still applies inside its own window');
assert.equal(clearance({android:false,modalBottom:34}),34,'Non-Android layout continues to use the native modal inset');
assert.equal(clearance({android:false}),0,'No Android fallback on iOS or web');
assert.equal(clearance({modalBottom:NaN,rootBottom:48}),48,'Invalid modal inset must not suppress a reliable root inset');
assert.equal(clearance({frameHeight:NaN}),48,'Invalid frame height keeps conservative protection');
assert.equal(clearance({rootBottom:-10,modalBottom:-1}),48,'Negative native values cannot remove the Android fallback');
const keyboard=overrides=>resolveModalKeyboardOverlap({android:true,keyboardTop:500,frameY:0,frameHeight:800,windowHeight:752,screenHeight:800,...overrides});
assert.equal(keyboard({}),300,'Keyboard overlap follows modal rather than underlying app height');
assert.equal(keyboard({frameY:24,frameHeight:476}),0,'A resized modal entirely above the keyboard needs no extra padding');
assert.equal(keyboard({frameY:24,frameHeight:600}),124,'Partially resized modal reserves only the remaining overlap');
assert.equal(keyboard({frameY:24,frameHeight:800}),300,'Modal frame bottom is capped to screen height');
assert.equal(keyboard({frameHeight:0,frameY:24}),252,'Unmeasured modal falls back to app window');
assert.equal(keyboard({keyboardTop:null}),0,'Hidden keyboard requires no extra padding');
assert.equal(keyboard({keyboardTop:NaN}),0,'Invalid keyboard coordinates do not affect layout');
assert.equal(keyboard({android:false}),0,'iOS retains its own keyboard avoidance');
assert(modal.includes('Keyboard.metrics()?.screenY??null')&&modal.includes('frameY:frame.y,frameHeight:frame.height'),'Modal opened above an existing keyboard must use actual window geometry');

assert(modal.includes('paddingBottom:bottomClearance'),'Sheet clearance must apply to the backdrop outside action controls');
assert(modal.includes('sheet&&{paddingBottom:spacing.lg}'),'Keep a constant touch-safe gap inside the sheet, not a duplicate safe-area inset');
assert(!modal.includes('sheet&&{paddingBottom:Math.max(spacing.lg,insets.bottom+spacing.sm)}'),'Do not consume the native bar inset twice');

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
assert(sheet.includes('scrollWholeSheet=width<345||height<650||fontScale>=1.25')&&sheet.includes('{scrollWholeSheet?header:null}')&&sheet.includes('{scrollWholeSheet?footer:null}')&&sheet.includes('{!scrollWholeSheet?footer:null}'),'Narrow, short or scaled layouts must scroll every control while normal layouts retain the fixed action footer');
assert(sheet.includes('keyboardShouldPersistTaps="handled"'),'Action buttons remain reachable with the quantity keyboard open');
assert(inventory.includes("inspectQuickButtonStacked:{flex:0,flexShrink:0,width:'100%'}"),'Stacked buttons must use intrinsic heights, not divide the available column space');
assert((inventory.match(/stackInspectorActions&&s\.inspectQuickButtonStacked/g)||[]).length===4,'Material and gear disposal buttons must all use the non-shrinking stacked style');
assert(inventory.includes("inspectAmountLabelStacked:{flexBasis:'100%'}")&&inventory.includes("maxWidth:'100%',flexShrink:1,flexWrap:'wrap'"),'Long amount labels and scaled steppers must wrap within the available width');
assert(pouch.includes("transferActionStacked:{flex:0,flexShrink:0,width:'100%'}")&&(pouch.match(/stackDetailActions&&s\.transferActionStacked/g)||[]).length===4,'All four gear pouch action cells must use intrinsic heights when stacked');

// Stackable resources must inherit the toolbar amount and use one clamped value for both actions.
assert(inventory.includes('setInspectQuantity(stack.instanceId?1:transferAmount(stack.quantity,quantity))'),'Opening a stack must inherit the selected amount, including All, without changing exact-copy actions');
assert(inventory.includes('const inspectAmount=transferAmount(inspectStock,inspectQuantity??1)'),'Clamp the selected amount to live stock');
const materialQuick=inventory.slice(inventory.indexOf("const inspectQuickActions=inspected?.type==='material'"),inventory.indexOf("inspected?.type==='gear'?<View style={s.inspectQuickActions}>"));
assert(materialQuick.includes('keyboardType="number-pad" selectTextOnFocus')&&materialQuick.includes('String(inspectAmount)'),'Quantity must be directly editable and show exact units');
assert(materialQuick.includes('disabled={inventoryBusyLabel!==null||!inspectAmountValid}')&&materialQuick.includes('!inspectAmountValid||inspectLocked||inspectFavorite||goalProtection.has(inspected.id)'),'Blank amounts must disable transfers and sales without bypassing protection');
assert(materialQuick.includes('amount=inspectAmount')&&materialQuick.includes('quantity:inspectAmount')&&materialQuick.includes('itemVendorSellGold(inspected)*inspectAmount'),'Transfer, sale confirmation and gold preview must share the same clamped amount');

const quickStart=inventory.indexOf("inspected?.type==='gear'?<View style={s.inspectQuickActions}>");
assert(quickStart>=0,'Equipment must expose quick actions outside the secondary actions drawer');
const quick=inventory.slice(quickStart,inventory.indexOf('const inspectActions',quickStart));
assert(quick.includes("gl('Compare & Equip')")&&quick.includes("gl('To Bank')")&&quick.includes("gt('Withdraw')"),'Inventory and Bank must show appropriate primary actions');
assert(quick.includes("type:'gear_move'")&&quick.includes('selectedCopy?.id??null'),'Quick actions must use the selected exact-copy identity when available');
const secondary=inventory.slice(inventory.indexOf('const inspectActions'),inventory.indexOf('if(equipmentPouchOpen)'));
assert(!secondary.includes('Compare stats')&&!secondary.includes('favoriteSet.has(inspected.id)?gt("Remove favorite")'),'Do not duplicate primary compare or header favorite controls');
assert(secondary.includes('equipmentCopyDisposalDecision')===false && inventory.includes('inspectedCopySalvage?.allowed')&&inventory.includes('disposalActions={inspectDisposalActions}'),'Do not bypass existing copy-level disposal permissions');
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
