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
const inspectModel=fs.readFileSync('src/core/item-inspect.ts','utf8');

ok(!screenSource.includes('FILTERS & DISPLAY'),'Inventory must not regress to the large filters disclosure');
ok(!screenSource.includes('showFilters'),'Inventory must keep filters always available as compact controls');
ok(screenSource.includes('controlStrip')&&screenSource.includes('ChoiceChip'),'Inventory category filters must use compact chips');
ok(screenSource.includes('Sort ·')&&screenSource.includes('Move ·'),'Inventory must expose compact sort and transfer chips');
ok(screenSource.includes("{id:'potion',label:'Potions'}"),'Potion filter chip must remain available');
ok(screenSource.includes("{id:'gem',label:'Gems'}")&&screenSource.includes("{id:'quest',label:'Quest'}"),'Gem and quest filter chips must remain available');
ok(screenSource.includes("{id:'favorites',label:'★ Favorites'}")&&screenSource.includes("{id:'favorite',label:'Favorites first'}"),'Favorites filter and sort must remain compact');
ok(screenSource.includes("{id:'new',label:'New'}")&&screenSource.includes("{id:'new',label:'New first'}"),'New item filter and sort must remain compact');
ok(card.includes('newBadge')&&card.includes('NEW'),'New stored items must show a compact NEW badge');
ok(screenSource.includes('Mark all seen')&&screenSource.includes('onAcknowledgeItem'),'New item acknowledgement controls must remain available');
ok(screenSource.includes('BULK MANAGEMENT')&&screenSource.includes('Select shown')&&screenSource.includes('onBulkAction'),'Bulk management must stay temporary and player-invoked');
ok(card.includes('selectionMode')&&card.includes('accessibilityRole="checkbox"'),'Item cards must expose accessible selection controls only in selection mode');
ok(bulk.includes('bulkTransferSelected')&&bulk.includes('bulkSellSelected')&&bulk.includes('bulkSalvageSelected'),'Bulk actions must use shared core helpers');
ok(bulk.includes("state.settings.favoriteItemIds")&&bulk.includes('hasEnhancement')&&bulk.includes('equippedFoodId'),'Bulk disposal must protect favorites, enhanced gear, and auto-eat food');
ok(commands.includes("bulk_transfer:['location','ids']")&&commands.includes("bulk_sell:['ids']")&&commands.includes("bulk_salvage:['ids']"),'Online commands must expose atomic bulk actions');
ok(card.includes('onLongPress={inspect}')&&card.includes('delayLongPress={350}'),'Item cards must open Quick Inspect on a deliberate hold');
ok(screenSource.includes('ItemQuickInspect')&&screenSource.includes('Hold an item for Quick Inspect'),'Inventory must expose and explain Quick Inspect without replacing normal tap actions');
ok(inspect.includes('HOW TO GET')&&inspect.includes('USED IN CRAFTING')&&inspect.includes('UPGRADE'),'Quick Inspect sheet must show sources, crafting uses and equipment upgrade information');
ok(inspectModel.includes('RECIPES')&&inspectModel.includes('MONSTERS')&&inspectModel.includes('GATHERING')&&inspectModel.includes('upgradeQuote'),'Quick Inspect must derive information from authoritative content data');
ok(inspect.includes('OPEN ›')&&inspect.includes('onNavigate(source.navigation')&&inspect.includes('onNavigate(recipe.navigation)'),'Quick Inspect source and recipe rows must be actionable');
ok(inspectModel.includes("actionId:node.id")&&inspectModel.includes("monsterId:monster.id")&&inspectModel.includes("recipeId:recipe.id"),'Quick Inspect navigation must retain exact source IDs');
ok(screenSource.includes('onNavigateInspect')&&screenSource.includes('closeInspect();onNavigateInspect(destination)'),'Inventory must close Quick Inspect before navigating');
ok(appSource.includes('onNavigateInspect={openWorkingTowardDestination}'),'Quick Inspect navigation must reuse the existing region-aware gameplay router');
ok(inspect.includes('AvailabilityPill')&&inspect.includes("status==='ready'")&&inspect.includes("status==='travel'")&&inspect.includes("status==='locked'"),'Quick Inspect must visibly distinguish READY, TRAVEL and LOCKED source states');
ok(inspect.includes('availabilityDetail'),'Quick Inspect must show blocker or travel detail alongside availability');
ok(inspectModel.includes('workingTowardDestinationAvailability'),'Quick Inspect availability must reuse the shared progression availability rules');
ok(screenSource.includes('StorageChip')&&screenSource.includes('storageCapacityStatus'),'Inventory and Bank must show compact capacity feedback');
ok(screenSource.includes('onToggleFavorite')&&card.includes('favoriteButton'),'Item cards must expose one-tap favorite controls');
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

console.log('PASS: compact themed inventory/bank controls, NEW feedback, favorites, safe bulk selection, actionable Quick Inspect availability, capacity feedback, rarity frames and rarity-colored names');
