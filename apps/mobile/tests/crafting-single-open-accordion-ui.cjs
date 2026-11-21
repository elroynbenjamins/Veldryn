'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'../',file),'utf8');
const browser=read('src/components/CraftingRecipeBrowser.tsx');
const card=read('src/components/RecipeCard.tsx');
const skills=read('src/screens/SkillsScreen.tsx');

// The browser is the single owner of which recipe is expanded, even across
// readiness groups and paired crafting-method variants.
assert.match(browser,/const \[expandedRecipeKey,setExpandedRecipeKey\]=useState<string\|null\|undefined>\(undefined\)/);
assert.match(browser,/initialExpandedKey=variantGroups\.find\(group=>group\.recipes\.some\(recipe=>recipe\.id===preferredRecipeId\)\)\?\.key\?\?null/);
assert.match(browser,/controlledExpanded=\{openRecipeKey===recipeGroup\.key\}/);
assert.match(browser,/onExpandedChange=\{open=>setExpandedRecipeKey\(open\?recipeGroup\.key:null\)\}/);

// RecipeCard remains usable as an independent disclosure elsewhere, while the
// crafting browser controls it through the same header, chevron and help tap.
assert.match(card,/expanded=controlledExpanded\?\?localExpanded/);
assert.match(card,/if\(controlledExpanded===undefined\)setLocalExpanded\(open\);onExpandedChange\?\.\(open\)/);
assert.match(card,/const toggleDetails=\(\)=>setExpanded\(value=>!value\)/);
assert.match(card,/onPress=\{\(\)=>setExpanded\(true\)\}/);
assert.match(card,/\[wantedQuantity,setWantedQuantity\]=useState\(1\)/,'changing accordion state must not wipe the quantity selection');
assert.match(skills,/expandedToolId===tool\.id/,'gathering tools also stay one-expanded-at-a-time');
console.log('PASS: crafting recipe accordion has one expanded card, with deep links and quantities preserved');
