const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=path=>fs.readFileSync(path,'utf8');
const app=read('App.tsx');
const summary=read('src/components/ForgeClaimAllSummaryModal.tsx');
const feedback=read('src/components/ForgeResultFeedback.tsx');
const locales=read('src/i18n/gameplay.ts');

assert.match(summary,/forgeClaimAllSummaryGroups/, 'batch results must use one consistent collection summary');
assert.match(summary,/autoSold!=='incoming'/, 'replacing a weaker owned copy must count as equipment retained');
assert.match(summary,/autoSold==='incoming'/, 'an auto-sold incoming roll must not be presented as collected');
assert.match(summary,/sold\.reduce\(/, 'incoming auto-sale gold must be totalled independently');
assert.match(summary,/replaced\.reduce\(/, 'existing weaker-copy sale gold must not be lost');
assert.match(summary,/equipmentRecipeForItem\(result\.itemId\)\?\.v33EquipmentTier/, 'display the actual recipe tier');
assert.match(summary,/rarity\.borderWidth/, 'artwork frames must respect the rolled rarity border');
assert.match(summary,/EquipmentArtwork item=\{item\} rarity=\{result\.rarity\}/, 'use the existing item-specific equipment artwork');
assert.match(summary,/Q\{result\.quality\}\/100/, 'show the authoritative quality roll');
assert.match(summary,/rarityNameColor\(result\.rarity/, 'item names must use the actual rarity');
assert.match(summary,/ScrollView/, 'large bulk settlements must scroll inside the modal');
assert.match(summary,/AUTO-SOLD · NOT COLLECTED/, 'auto-sold incoming gear must remain clearly separate');
assert.match(summary,/fontScale>=1\.25/, 'summary actions must support large text');
assert.match(summary,/reduceMotion=\{reduceMotion\}/, 'respect reduced-motion accessibility setting');
assert.match(summary,/remainingCount>0/, 'partial Claim All must explain jobs still waiting');
assert.match(summary,/try\{item=itemDef\(result\.itemId\)/, 'newer equipment IDs must not crash older clients');
assert.match(summary,/ItemArtwork itemId=\{result\.itemId\}/, 'unknown items require a safe icon fallback');
assert.match(summary,/gt\('Equipment collected: \{count\}'/, 'receipt header must use a grammatical, translated count');
assert.match(app,/remainingCount=\{forgeClaimAllPendingCount\}/, 'popup must receive the real pending count');
for(const key of ['Close Forge collection','Collection summary','Equipment collected: {count}','Auto-sold incoming: {count}','Weaker copies sold: {count}','Forge jobs still waiting: {count}','View Gear storage']){
 assert.ok(locales.includes('"'+key+'":['), 'missing localized Forge key: '+key);
}

assert.match(app,/ForgeClaimAllSummaryModal/, 'app must display the bulk receipt');
assert.match(app,/exceptionalForge:!!forgeClaimAllResults\?\.length\|\|/, 'ordinary batch results must use the global popup slot');
assert.match(app,/setForgeClaimAllResults\(results\)/, 'legacy backend fallback must have a receipt');
assert.match(app,/setForgeClaimAllResults\(result\.forgeResults\)/, 'online bulk claims must have a receipt');
assert.match(app,/setForgeClaimAllResults\(claimed\.results\)/, 'offline bulk claims must have a receipt');
assert.match(app,/ForgeRarityRevealModal/, 'single Legendary and Mythic reveals must remain intact');
assert.match(feedback,/results\.filter\(isExceptionalForgeResult\)/, 'single exceptional reveals remain specialized');

console.log('PASS: Claim All Forge summarizes every kept roll, separates auto-sales, and preserves single-item reveals');
