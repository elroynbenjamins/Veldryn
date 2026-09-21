export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const assets=read('src/theme/gem-assets.ts');
const artwork=read('src/components/GemArtwork.tsx');
const codex=read('src/components/GemCodexModal.tsx');
const enhancement=read('src/components/EquipmentEnhancementModal.tsx');

ok(assets.includes('gemArtworkGradeV1'),'Gem artwork mapping must expose canonical grade parsing');
ok(assets.includes("g([1-5])"),'Gem grade parser must support exactly grades I-V');
ok(artwork.includes('GEM_GRADE_RARITY_V1'),'Gem artwork must map grades to existing rarity colors');
ok(artwork.includes('GRADE_ROMAN'),'Gem artwork must show compact I-V grade identity');
ok(artwork.includes('showGradeBadge'),'Callers must be able to suppress misleading grade badges for unowned Codex families');
ok(codex.includes('showGradeBadge={Boolean(row.highestOwned)}'),'Unowned Codex families must not pretend to be Grade I ownership');
ok(codex.includes('recipe.inputs[0].itemId')&&codex.includes('recipe.output.itemId'),'Gem combining must visually show source and output gems');
ok(codex.includes('GEM_DUST')&&codex.includes('REGIONAL_CATALYST')&&codex.includes('RADIANT_CATALYST'),'Resonance Cache must visually identify gem progression materials');
ok(enhancement.includes('gemRarity=gem?rarityMeta(itemRarity(gem))'),'Occupied sockets must use grade rarity presentation');
ok(enhancement.includes("GEM_GRADE_LABEL_V1[meta.grade]+' · '+gemEffectDescription"),'Effect Gem socket detail must include its grade label');
ok(enhancement.includes('gradeColor=rarityMeta(itemRarity(gem)).color'),'Owned socket candidates must color names by grade rarity');

console.log('PASS: gem grade I-V identity and progression visuals are consistent across Codex and socketing');
