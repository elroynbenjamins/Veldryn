const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};

function ok(value:boolean,message:string){if(!value)throw new Error(message)}

const screenSource=fs.readFileSync('src/screens/InventoryScreen.tsx','utf8');
const card=fs.readFileSync('src/components/ItemCard.tsx','utf8');
const artwork=fs.readFileSync('src/components/EquipmentArtwork.tsx','utf8');
const slot=fs.readFileSync('src/components/EquipmentSlot.tsx','utf8');
const appSource=fs.readFileSync('App.tsx','utf8');
const normalization=fs.readFileSync('src/core/save-normalization.ts','utf8');
const commands=fs.readFileSync('src/core/game-commands.ts','utf8');

ok(!screenSource.includes('FILTERS & DISPLAY'),'Inventory must not regress to the large filters disclosure');
ok(!screenSource.includes('showFilters'),'Inventory must keep filters always available as compact controls');
ok(screenSource.includes('controlStrip')&&screenSource.includes('ChoiceChip'),'Inventory category filters must use compact chips');
ok(screenSource.includes('Sort ·')&&screenSource.includes('Move ·'),'Inventory must expose compact sort and transfer chips');
ok(screenSource.includes("{id:'potion',label:'Potions'}"),'Potion filter chip must remain available');
ok(screenSource.includes("{id:'gem',label:'Gems'}")&&screenSource.includes("{id:'quest',label:'Quest'}"),'Gem and quest filter chips must remain available');
ok(screenSource.includes("{id:'favorites',label:'★ Favorites'}")&&screenSource.includes("{id:'favorite',label:'Favorites first'}"),'Favorites filter and sort must remain compact');
ok(screenSource.includes('StorageChip')&&screenSource.includes('storageCapacityStatus'),'Inventory and Bank must show compact capacity feedback');
ok(screenSource.includes('onToggleFavorite')&&card.includes('favoriteButton'),'Item cards must expose one-tap favorite controls');
ok(card.includes('protected from selling and salvage'),'Favorite items must explain disposal protection');
ok(appSource.includes('toggleInventoryFavorite')&&appSource.includes('onToggleFavorite'),'Favorites must persist through the app settings path');
ok(normalization.includes('favoriteItemIds:stringList')&&commands.includes('result.favoriteItemIds'),'Favorites must survive save normalization and online settings validation');
ok(card.includes('accentColor={meta.color}')&&card.includes('borderWidth={meta.borderWidth}'),'Inventory cards must use rarity frame metadata');
ok(artwork.includes('borderWidth:framed?meta.borderWidth:0'),'Framed equipment art must use rarity border strength');
ok(slot.includes('borderWidth:meta.borderWidth'),'Equipped item slots must use rarity border strength');

console.log('PASS: compact themed inventory/bank controls, favorites, capacity feedback and rarity frame contract');
