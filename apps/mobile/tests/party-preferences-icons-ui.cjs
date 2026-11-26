// Guard the Party settings icon treatment and preserve existing interactions.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync('src/components/PartyCreateSheet.tsx','utf8');

const pixels=[...source.matchAll(/'([.abc]{13})'/g)].map(match=>match[1]);
assert.equal(pixels.length,26,'Both 13x13 pixel-art icons must be present');
assert(pixels.every(row=>row.length===13),'Pixel masks must have uniform dimensions');
assert(source.includes('<PreferencePixelIcon kind="language" colors={C}/>'),'Language selector needs a pixel globe');
assert(source.includes('<PreferencePixelIcon kind="combat" colors={C}/>'),'Combat restriction needs pixel crossed swords');
assert(source.includes('<View style={s.glyph}><PreferencePixelIcon kind="language"'),'Keep icon in matching activity tile');
assert(source.includes('<View style={s.glyph}><PreferencePixelIcon kind="combat"'),'Keep icon in matching activity tile');
assert(source.includes('onPress={()=>setLanguageExpanded(current=>!current)}'),'Language dropdown must still open');
assert(source.includes('onLanguage(option.id);setLanguageExpanded(false)'),'Language selection must still save locally');
assert(source.includes('onPress={()=>onMinimumLevel(minimumLevel>0?0:10)}'),'Minimum-level toggle must still work');
assert(source.includes("onCreate}"),'Create / save action must be wired');
assert(source.includes('accessibilityRole="checkbox"'),'Minimum-level switch must be accessible');
assert(source.includes('accessibilityState={{expanded:languageExpanded}}'),'Language dropdown must report expansion');
assert(source.includes('selectContent:{flex:1,minWidth:0'),'Selected language must fit small screens');
console.log('PASS: Party settings pixel icons, compact layout and preserved preferences controls');
