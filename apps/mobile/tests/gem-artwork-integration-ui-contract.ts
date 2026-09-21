export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const artwork=read('src/components/GemArtwork.tsx');
const itemArtwork=read('src/components/ItemArtwork.tsx');
const codex=read('src/components/GemCodexModal.tsx');
const enhancement=read('src/components/EquipmentEnhancementModal.tsx');
const rewards=read('src/components/RewardPopup.tsx');
const inspect=read('src/components/ItemQuickInspect.tsx');
const queue=read('src/components/EquipmentCraftQueuePanel.tsx');
const queueCore=read('src/core/equipment-crafting-queue.ts');

ok(artwork.includes('gemArtworkCellV1'),'GemArtwork must resolve canonical atlas cells');
ok(itemArtwork.includes('hasGemArtworkV1(itemId)'),'Shared ItemArtwork must route gems and catalysts to GemArtwork');
ok(codex.includes('mobileGemItemIdV1(row.family.familyId,row.highestOwned??1)'),'Gem Codex family rows must show the correct family art');
ok(codex.includes('itemId={recipe.output.itemId}'),'Gem combine rows must show the output gem art');
ok(codex.includes("mobileGemItemIdV1(familyId,3)"),'Resonance Cache choices must show their Grade III gem art');
ok(enhancement.includes('itemId={gem.id} size={44}'),'Socket candidate rows must show the actual owned gem');
ok(enhancement.includes('gemResultBody'),'Socket result feedback must include gem art');
ok(enhancement.includes('gemCompareArt'),'Replace/extract confirmation must visually identify the selected gems');
ok(rewards.includes('hasGemArtworkV1(x.itemId)'),'Reward popup must render gem/catalyst art');
ok(inspect.includes('hasGemArtworkV1(item.id)'),'Quick inspect must render gem/catalyst art');
ok(queueCore.includes('outputItemId'),'Forge queue model must expose craft output identity');
ok(queue.includes('job.outputItemId'),'Forge queue rows must render their output art');

console.log('PASS: gem artwork is integrated across Codex, socketing, Forge, rewards, inspect, and shared item UI');
