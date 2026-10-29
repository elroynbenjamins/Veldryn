const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const inventory=read('src/screens/InventoryScreen.tsx');
const pouch=read('src/components/GemPouchPanel.tsx');
const memory=read('src/core/inventory-screen-state.ts');
const coop=read('src/screens/CoopExpeditionScreen.tsx');
const browser=read('src/components/coop/CoopDungeonBrowser.tsx');
const run=read('src/components/coop/CoopRunOverview.tsx');

// The pouch is a real storage destination, not a permanently-expanded 30-slot drawer
// inside Inventory and Bank's already-long list headers.
assert(inventory.includes("if(pouchOpen)return <ScrollView"),'Gems must have an independent storage screen');
assert(inventory.includes('<GemPouchPanel standalone state={state}'),'Standalone pouch must render inside the dedicated Gems view');
assert((inventory.match(/<StorageChip label=\{accountText\(language,'Gems'\)\}/g)||[]).length===2,'All storage views must show a Gems tab');
assert(!inventory.includes('<GemPouchPanel state={state} busy='),'The old nested expandable pouch is removed from normal Inventory/Bank');
assert(inventory.includes('setPouchOpen(false);setQuery(\'\');setFilter(\'food\')'),'Food deep links must always return to character Inventory');
assert(memory.includes('pouchOpen:false')&&memory.includes('foodRequest:request,pouchOpen:false'),'Storage choice is remembered without breaking quick food access');
assert(pouch.includes('standalone||drawerOpen'),'Standalone mode never collapses the dedicated pouch');
assert(pouch.includes('accessible={!standalone}')&&pouch.includes("accessibilityRole={standalone?'header':undefined}"),'Standalone Pouch heading is accessible without a disabled disclosure');
assert(inventory.includes('storageChipTopCompact'),'All three storage tabs fit narrow devices and large text');
assert(pouch.includes('const columns=gridWidth>=600?8:gridWidth>=440?6:gridWidth>=345?5:4')&&pouch.includes('{width:slotWidth,minHeight:Math.max(slotWidth,62)}'),'Gem grid responds to available width without fixed percentage overflow');
assert(pouch.includes('onFavorite?')&&pouch.includes('onLock?'),'Gem favorites and locks remain actionable');
assert(pouch.includes('||protectedGem} onPress={()=>setPendingDismantle'),'Protected gems cannot be dismantled accidentally');
assert(pouch.includes('Gem Pouch,')===false,'Pouch UI is not implementing gameplay inventory logic itself');

// Retain the last server-confirmed dungeon state during harmless catalogue refreshes
// and when network connectivity temporarily fails mid-run.
assert(!coop.includes('catch(reason){setEntry(undefined);setError('),'Refresh errors may not erase the last catalogue');
assert(coop.includes('requestId===loadRequestId.current'),'Late requests cannot overwrite a newer refresh');
assert(coop.includes('setSyncError('),'Run connection errors are not mixed into action notices');
assert(browser.includes('hasUsableSnapshot'),'Previously loaded dungeons remain accessible while refresh is pending');
assert(browser.includes('showCatalog&&available.map('),'Dungeon cards remain visible if a refresh fails');
assert(browser.includes('Showing previously loaded dungeons'),'Users know when they are viewing cached server data');
assert(run.includes('{!!syncError&&<FantasyPanel variant="danger">'),'Connection recovery is shown only after a sync failure');
assert(run.indexOf('{!!syncError&&<FantasyPanel variant="danger">')<run.indexOf("{!(run.phase==='resolving_node'"),'Reconnect warning remains visible even while combat is resolving');
assert(!run.includes('Refresh saved progress'),'Routine manual Refresh does not clutter the run view');
assert(run.includes('onPress={onRefresh}'),'A failed sync has a manual retry path');
assert(run.includes("accountText(language,value)"),'Dungeon reconnect text uses a localized string');
assert(browser.includes("a('Refreshing dungeon availability…')"),'Catalog refresh text is localized');
console.log('PASS Inventory Gems tab and dungeon cached-state/retry UX contracts');
