const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};

function ok(value:boolean,message:string){if(!value)throw new Error(message)}

const screenSource=fs.readFileSync('src/screens/InventoryScreen.tsx','utf8');
const card=fs.readFileSync('src/components/ItemCard.tsx','utf8');
const artwork=fs.readFileSync('src/components/EquipmentArtwork.tsx','utf8');
const slot=fs.readFileSync('src/components/EquipmentSlot.tsx','utf8');
const appSource=fs.readFileSync('App.tsx','utf8');
const normalization=fs.readFileSync('src/core/save-normalization.ts','utf8');
const commands=fs.readFileSync('src/core/game-commands.ts','utf8');
const bulk=fs.readFileSync('src/core/inventory-bulk.ts','utf8');
const inspect=fs.readFileSync('src/components/ItemQuickInspect.tsx','utf8');
const gearPreview=fs.readFileSync('src/components/EquipmentPreview.tsx','utf8');
const inspectModel=fs.readFileSync('src/core/item-inspect.ts','utf8');

ok(!screenSource.includes('FILTERS & DISPLAY'),'Inventory must not regress to the large filters disclosure');
ok(!screenSource.includes('showFilters'),'Inventory must not regress to the old large filter disclosure');
ok(screenSource.includes('filterOpen')&&screenSource.includes('filterSheet')&&screenSource.includes('View and action settings. Current filter:'),'Inventory category filters must use one compact View & actions control and a themed sheet');
ok(!screenSource.includes('controlStrip')&&!screenSource.includes('ChoiceChip'),'Inventory must not regress to a long horizontal category strip');
ok(screenSource.includes('setSort(option.id)')&&screenSource.includes('MOVE / SELL AMOUNT')&&screenSource.includes('Custom move or sell amount')&&screenSource.includes('View & actions'),'Inventory must keep sort and move/sell amount controls together in the compact view sheet');
ok(screenSource.includes('amountTrigger')&&screenSource.includes('Set move or sell amount. Current amount:'),'The current move or sell amount must remain directly discoverable from the compact inventory header');
ok(screenSource.includes('quantityQuickAmounts')&&screenSource.includes('quantityCustom:{width:112,minHeight:44')&&screenSource.includes("textAlignVertical:'center'"),'Move and sell amounts must use balanced quick controls and an unclipped custom field');
ok(screenSource.includes("gt('Deposit all {amount}g'")&&screenSource.includes("gt('Withdraw all {amount}g'")&&screenSource.includes("transferGold('deposit',carriedGold)")&&screenSource.includes("transferGold('withdraw',bankGold)"),'Gold storage must expose one-tap all-transfer actions instead of Max controls that only fill an input');
ok(screenSource.includes("gt('Deposit {amount}g'")&&screenSource.includes("gt('Withdraw {amount}g'")&&screenSource.includes('customGoldAmount'),'Custom Gold actions must state the exact amount and direction before transferring');
ok(screenSource.includes("{id:'potion',label:'Potions'}"),'Potion filter category must remain available');
ok(screenSource.includes("{id:'gem',label:'Gems'}")&&screenSource.includes("{id:'quest',label:'Quest'}"),'Gem and quest filter categories must remain available');
ok(screenSource.includes("{id:'favorites',label:'★ Favorites'}")&&screenSource.includes("{id:'favorite',label:'Favorites first'}"),'Favorites filter and sort must remain available');
ok(screenSource.includes("{id:'new',label:'New'}")&&screenSource.includes("{id:'new',label:'New first'}"),'New item filter and sort must remain available');
ok(card.includes('newItem&&<View style={s.newBadge}')&&card.includes('gt("New").toLocaleUpperCase(language)'),'New stored items must show a compact NEW badge');
ok(screenSource.includes('Mark all seen')&&screenSource.includes('onAcknowledgeItem'),'New item acknowledgement controls must remain available');
ok(screenSource.includes('style={[s.itemNew,selectMode?s.itemNewTop:s.itemNewBottom]}')&&screenSource.includes('itemNewBottom:{bottom:16}')&&screenSource.includes('itemNewTop:{top:3}'),
  'NEW badge must have mutually exclusive top/bottom anchors when switching to bulk selection');
ok(screenSource.includes("itemNew:{position:'absolute',left:3,height:16,maxHeight:16")&&screenSource.includes('<Text numberOfLines={1} style={s.itemNewText}')&&!screenSource.includes('bottom:undefined'),
  'NEW badge must remain single-line and height-bounded instead of stretching along the item icon');
ok(screenSource.includes('BULK MANAGEMENT')&&screenSource.includes('Select shown')&&screenSource.includes('onBulkAction')&&screenSource.includes('Select item stacks to manage them together.'),'Bulk management must stay temporary, player-invoked, and compact before items are selected');
ok(screenSource.includes('beginInventorySubmission')&&screenSource.includes('inventoryBusyRef.current'),'Inventory mutations must synchronously lock duplicate submissions');
ok(screenSource.includes('<Modal transparent visible={inventoryBusyLabel!==null}')&&screenSource.includes('<ActivityIndicator size="large" color={C.accent}/>'),'Inventory mutations must show a blocking progress indicator while awaiting confirmation');
ok(screenSource.includes('Moving items to Bank…')&&screenSource.includes('Moving items to Inventory…')&&screenSource.includes('Selling items…'),'Selling and item transfers must explain the active transaction');
ok(screenSource.includes("accessibilityRole={selectMode?'checkbox':'button'}")&&screenSource.includes('itemSelectedOn'),'Inventory grid tiles must expose accessible selection controls only in selection mode');
ok(bulk.includes('bulkTransferSelected')&&bulk.includes('bulkSellSelected')&&bulk.includes('bulkSalvageSelected'),'Bulk actions must use shared core helpers');
ok(bulk.includes("state.settings.favoriteItemIds")&&bulk.includes("state.settings.lockedItemIds")&&bulk.includes('canDisposeLegacyEquipment')&&bulk.includes('equippedFoodId'),'Bulk disposal must protect favorites, locked items, enhanced gear, and auto-eat food');
ok(commands.includes("bulk_transfer:['location','ids']")&&commands.includes("bulk_sell:['location','ids']")&&commands.includes("bulk_salvage:['location','ids']"),'Online commands must expose atomic source-scoped bulk actions');
ok(commands.includes("oneOf(a.location??'inventory',['inventory','bank'] as const)")&&commands.includes("if(bulk.location!==undefined)oneOf(bulk.location,['inventory','bank'])"),'Bulk sell and salvage must default legacy clients to Inventory and validate optional Bank source');
ok(screenSource.includes('ItemArtwork itemId={item.id} size={iconSize}')&&screenSource.includes('gridColumns=gridWidth<235?3:gridWidth>=600?8:gridWidth>=440?6:gridWidth>=345?5:4')&&screenSource.includes('const STORAGE_PAGE_SIZE=30;')&&screenSource.includes('Math.min(960,event.nativeEvent.layout.width)-32')&&screenSource.includes('<FlatList key={gridColumns}')&&screenSource.includes('numColumns={gridColumns}')&&screenSource.includes('windowSize={3}'), 'Inventory must show a virtualized artwork grid that adapts to the bounded content width');
ok(screenSource.includes("if(item.type==='gear'&&location==='inventory'){setPreviewInstanceId(stack.instanceId??null);setPreviewId(item.id);return;}")&&screenSource.includes('instanceId={previewInstanceId}')&&screenSource.includes("type:'gear_equip'")&&screenSource.includes('onInspect={()=>{setSelectedInstanceId(previewInstanceId);setInspectQuantity(1);setInspectId(previewId);'),'All carried gear, including exact Forge copies, must open a copy-aware comparison before equipping and retain Quick Inspect access');
ok(inspect.includes('HOW TO GET')&&inspect.includes('USED IN CRAFTING')&&inspect.includes('UPGRADE')&&inspect.includes('craftingDisclosure')&&inspect.includes('Show crafting uses'),'Quick Inspect sheet must show sources, a closed crafting disclosure, and equipment upgrade information');
ok(inspectModel.includes('RECIPES')&&inspectModel.includes('MONSTERS')&&inspectModel.includes('GATHERING')&&inspectModel.includes('upgradeQuote'),'Quick Inspect must derive information from authoritative content data');
ok(inspect.includes('gt("Open ›").toLocaleUpperCase(language)')&&inspect.includes('onNavigate(source.navigation')&&inspect.includes('onNavigate(recipe.navigation)'),'Quick Inspect source and recipe rows must retain localized open labels and actionable destinations');
ok(inspectModel.includes("actionId:node.id")&&inspectModel.includes("monsterId:monster.id")&&inspectModel.includes("recipeId:recipe.id"),'Quick Inspect navigation must retain exact source IDs');
ok(screenSource.includes('onNavigateInspect')&&screenSource.includes('closeInspect();onNavigateInspect(destination)'),'Inventory must close Quick Inspect before navigating');
ok(appSource.includes('onNavigateInspect={openWorkingTowardDestination}'),'Quick Inspect navigation must reuse the existing region-aware gameplay router');
ok(inspect.includes('AvailabilityPill')&&inspect.includes("status==='ready'")&&inspect.includes("status==='travel'")&&inspect.includes("status==='locked'"),'Quick Inspect must visibly distinguish READY, TRAVEL and LOCKED source states');
ok(inspect.includes('availabilityDetail'),'Quick Inspect must show blocker or travel detail alongside availability');
ok(inspectModel.includes('workingTowardDestinationAvailability'),'Quick Inspect availability must reuse the shared progression availability rules');
ok(inspect.includes('GEAR CHECK')&&inspect.includes('DeltaStat')&&inspect.includes('TO +'),'Quick Inspect gear must expose compact loadout deltas and +10 potential');
ok(inspect.includes('2/4/8/10 always-on V33 bonuses are live')&&inspect.includes("row.runtime==='live'?gt(\"LIVE\"):it('HOOK')")&&inspect.includes('POTENTIAL'),'Gear Check must distinguish live set stat thresholds, conditional hooks and upgrade potential');
ok(inspectModel.includes('previewEquipment')&&inspectModel.includes('effectiveStats')&&inspectModel.includes('enhancedGearStatsAtRank'),'Gear Check must use real preview/effective-stat and enhancement math');
ok(inspectModel.includes('equippedSetPieceCount')&&inspectModel.includes('MAX_UPGRADE_RANK'),'Gear Check must derive set movement and max-rank potential from authoritative systems');
ok(screenSource.includes('StorageChip')&&screenSource.includes('storageCapacityStatus'),'Inventory and Bank must show compact capacity feedback');
const headerControls=fs.readFileSync('src/components/InventoryItemHeaderControls.tsx','utf8');
ok(inspect.includes('InventoryItemHeaderControls')&&inspect.includes('onFavorite={onToggleFavorite}')&&inspect.includes('onLock={onToggleLock}')&&screenSource.includes('favorite={inspectFavorite} locked={inspectLocked}')&&headerControls.includes('accessibilityState={{selected:favorite,disabled}}'),'Quick Inspect must place working lock and favorite controls together in its header');
ok(inspect.includes('(quickActions||disposalActions)?<View style={s.quickFooter}')&&screenSource.includes('quickActions={inspectQuickActions}')&&screenSource.includes('setInspectQuantity(inspectStock)')&&screenSource.includes("kind:carried?'sell':'bank_sell'"),'Resource Quick Inspect must show a separate all-or-custom quantity footer and confirm inventory or bank sales');
ok(screenSource.includes('inspectLocked||inspectFavorite||goalProtection.has(inspected.id)'),'Quick Inspect must disable selling for locked, favorite and Working Toward items');
ok(screenSource.includes("type:'gear_lock'")&&screenSource.includes('previewRecord')&&screenSource.includes('selectedCopy'),'Gear header locking must target the selected unique crafted copy');
ok(screenSource.includes('itemStatusBadge')&&screenSource.includes('itemLockCorner')&&screenSource.includes('itemFavoriteCorner')&&!screenSource.includes('s.itemCorner')&&screenSource.includes('!selectMode&&locked?')&&screenSource.includes('!selectMode&&favorite?'),'Inventory tiles must keep artwork clear and show only small, noninteractive active protection indicators');
ok(screenSource.includes("chooseProtectionMode('lock')")&&screenSource.includes("chooseProtectionMode('favorite')")&&screenSource.includes('protectionToolbarButton')&&screenSource.includes('shortToolbarLabels')&&screenSource.includes('toolbarFilterText')&&!screenSource.includes('resultActionsCompact'),'Lock and favorite must remain within the responsive single-row inventory toolbar');
const toolbarStart=screenSource.indexOf('<View style={s.resultRow}>');
const toolbarEnd=screenSource.indexOf('</View>',toolbarStart);
const toolbar=screenSource.slice(toolbarStart,toolbarEnd);
ok(toolbarStart>=0&&toolbarEnd>toolbarStart,'Inventory must render a dedicated single-row toolbar');
ok(toolbar.includes('s.viewOptionsTrigger')&&toolbar.includes("chooseProtectionMode('lock')")&&toolbar.includes("chooseProtectionMode('favorite')")&&toolbar.includes('s.amountTrigger')&&toolbar.includes('s.textAction'),'Filter, Lock, Favorite, Amount and Select must share one row');
ok((toolbar.match(/<View/g)||[]).length===1&&screenSource.includes("resultRow:{flexDirection:'row',alignItems:'center',gap:4,width:'100%'}"),'Inventory toolbar must not wrap or create a second nested action row');
ok(screenSource.includes('protectionToolbarButton:{width:44,minHeight:44')&&screenSource.includes('amountTrigger:{width:44,minHeight:44')&&screenSource.includes('textAction:{minHeight:44,width:52'),'Compact toolbar controls must retain 44-point minimum touch targets and fixed widths');
ok(toolbar.includes('accessibilityState={{disabled:selectMode}}')&&toolbar.includes('disabled={selectMode}')&&toolbar.includes('accessibilityState={{selected:selectMode}}'),'Amount must be disabled during selection and Select must expose active state');
ok(screenSource.includes('applySelectedProtection(true)')&&screenSource.includes('applySelectedProtection(false)')&&screenSource.includes('onBulkPreference')&&screenSource.includes("beginBulk('transfer')")&&screenSource.includes('beginBulk("sell")')&&screenSource.includes('beginBulk("salvage")'),'Protection selection must offer both apply/remove actions without changing sell, salvage or transfer modes');
ok(commands.includes("inventory_preference_bulk:['ids','kind','enabled']")&&commands.includes('applyBulkInventoryProtection(state,ids,kind,a.enabled)')&&appSource.includes("type:'inventory_preference_bulk'"),'Batch lock/favorite actions must use the authoritative atomic command in online and offline modes');
ok(appSource.includes('toggleInventoryLock')&&appSource.includes('onToggleLock'),'Item locks must persist through the same application state path as favorites');
ok(normalization.includes('lockedItemIds:stringList')&&commands.includes('result.lockedItemIds'),'Locks must survive save normalization and authoritative settings validation');
ok(card.includes('protected from selling and salvage'),'Favorite items must explain disposal protection');
ok(appSource.includes('toggleInventoryFavorite')&&appSource.includes('onToggleFavorite'),'Favorites must persist through the app settings path');
ok(normalization.includes('favoriteItemIds:stringList')&&commands.includes('result.favoriteItemIds'),'Favorites must survive save normalization and online settings validation');
ok(normalization.includes('legacySeenItemIds')&&normalization.includes('seenItemIds:legacySeenItemIds'),'Old saves must not mark existing stored items as newly obtained');
ok(commands.includes('result.seenItemIds'),'Seen item history must survive online settings validation');
ok(card.includes('accentColor={meta.color}')&&card.includes('borderWidth={meta.borderWidth}'),'Inventory cards must use rarity frame metadata');
ok(artwork.includes('borderWidth:framed?meta.borderWidth:0'),'Framed equipment art must use rarity border strength');
ok(slot.includes('borderWidth:meta.borderWidth'),'Equipped item slots must use rarity border strength');
ok(card.includes('rarityNameColor')&&card.includes("fontWeight:'800'"),'Inventory item names must use bold accessible rarity emphasis');
ok(slot.includes('rarityNameColor')&&slot.includes("fontWeight:'800'"),'Equipment slot names must use bold accessible rarity emphasis');

ok(screenSource.includes('onMoveToBank={previewId&&onCommand?async()=>')&&screenSource.includes("type:'gear_move',args:{instanceId,to:'bank'}")&&gearPreview.includes('onMoveToBank')&&gearPreview.includes("gearText('Move to Bank')"),'Crafted and ordinary copies must expose direct shared-Bank deposit from the equipment comparison, including class-restricted fallback');
ok(bulk.includes('moveCraftedGearInstance(next,id.slice(5)')&&bulk.includes("stack.instanceId===undefined")&&bulk.includes("const transferable=stacks.filter(stack=>location==='bank'||stack.itemId!==autoEatId)"),'Bulk bank transfer must preserve exact Forge instance IDs and distinguish ordinary copies');
ok(screenSource.includes('onStoreInGear={previewId&&onCommand?async()=>')&&screenSource.includes("type:'gear_move',args:{instanceId,to:'equipment_pouch'}")&&screenSource.includes("type:'equipment_pouch_move',args:{itemId:id,quantity:1,from:'inventory',to:'equipment_pouch'}"),'Equipment comparison must allow one-tap Inventory-to-Gear storage for exact and ordinary copies');
ok(gearPreview.includes("gearText('Store in Gear')")&&gearPreview.includes('canStoreInGear')&&gearPreview.includes('onStoreInGear'),'Equipment comparison must expose a distinct storage action with a capacity guard');
ok(screenSource.includes('gearMoveAmount=')&&screenSource.includes('quantity:gearMoveAmount')&&screenSource.includes('freeGearSlots<gearMoveAmount'),'Quick Inspect must respect selected transfer quantity and remaining Gear slots');
ok(screenSource.includes("const result=await onCommand!({type:'gear_move',args:{instanceId:selectedCopy.id,to:'equipment_pouch'}})")&&!screenSource.includes("selectedCopy.ownerCharacterId===state.character?.id?<GameButton"),'Shared Bank copies must remain transferable to the active character Gear storage without tying the transfer to their original crafter');


const gearPanel=fs.readFileSync('src/components/EquipmentPouchPanel.tsx','utf8');
ok(gearPanel.includes('<ItemQuickInspect state={state}')&&gearPanel.includes('source="equipment_pouch"')
  &&!gearPanel.includes('visible={!!selected}'),
  'Tapping stored gear must open shared Quick Inspect directly, not the old duplicate storage sheet');
ok(gearPanel.includes('instanceId={selected?.instanceId}')&&gearPanel.includes('onToggleLock={onAction&&selected?()=>toggleLock(selected)')
  &&gearPanel.includes('onToggleFavorite={onAction&&selected?()=>toggleFavorite(selected)'),
  'Gear details must retain exact crafted-copy identity and working lock/favorite header actions');
ok(gearPanel.includes('quickActions={selected?<View')&&gearPanel.includes("p('Compare & Equip')")
  &&gearPanel.includes("p('To Inventory')")&&gearPanel.includes("p('To Bank')"),
  'Compare/equip and both transfer destinations must stay in the compact visible footer');
ok(gearPanel.includes('EquipmentDisposalStatus compact')&&gearPanel.includes("p('Sell copy')")
  &&gearPanel.includes("p('Salvage copy')")&&gearPanel.includes("startSale([saleCandidate.id])")
  &&gearPanel.includes("startSalvage([salvageCandidate.id])"),
  'Sell and salvage must use the existing protected per-copy confirmation flow');
ok(gearPanel.includes('onNavigate={onNavigate?destination=>')&&screenSource.includes('onNavigate={onNavigateInspect}'),
  'Gear Quick Inspect source links must reuse the existing gameplay source navigation');
ok(inspect.includes("source==='bank'?gt('Bank'):gl('Gear')")
  &&inspect.includes("equipmentPouch(state).stacks.reduce("),
  'Gear Quick Inspect must identify character-local storage instead of showing only Inventory and Bank');

const pouchTranslations=fs.readFileSync('src/i18n/equipment-pouch-ui.ts','utf8');
for(const label of ['Compare & Equip','To Inventory','To Bank','Sell copy','Salvage copy']){
 ok(pouchTranslations.includes('"'+label+'": ['),'Gear detail action must be localized: '+label);
}
ok(inspect.includes("const isBonusRoll=(line:string)=>line.startsWith('Equipment roll · ')")
   &&inspect.includes("line.startsWith('Weapon roll · ')")
   &&inspect.includes("const bonusRows=model.effectLines.filter(isBonusRoll)")
   &&inspect.includes("source==='bank'?gt('Bank'):gl('Gear')"),
   'Shared Inspect must derive new and legacy bonus stats from exact item-inspection receipts in Gear Storage');
ok(!inspect.includes("gt('BONUS STATS')")&&inspect.includes("bonusRows.map(roll=>")
   &&inspect.includes("otherEffectLines=model.effectLines.filter(line=>!isBonusRoll(line)&&(!traitLine||line!==traitLine)")
   &&inspect.includes('const traitLine=item.type===\'gear\'?item.passive?.trim():undefined'),
   'Bonus stats must be prominent, compact, and not duplicated under expanded equipment details');
ok(gearPreview.includes("gl('BONUS STATS')")&&!gearPreview.includes('rollTrack')
   &&!gearPreview.includes('weaponBonusStrength')&&!gearPreview.includes('rollBadge'),
   'Comparison must show bonus values without misleading roll-strength bars or ranking badges');
console.log('PASS: compact themed inventory/bank controls, NEW feedback, favorites, safe bulk selection, Quick Inspect gear decisions and availability, capacity feedback, rarity frames and rarity-colored names');
