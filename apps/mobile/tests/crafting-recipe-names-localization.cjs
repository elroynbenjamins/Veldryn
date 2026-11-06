const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const ts=require('../node_modules/typescript');
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(
 fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}
).outputText,file);
const {RECIPES}=require('../src/content/skills.ts');
const {itemDef}=require('../src/content/items.ts');
const {SUPPORTED_LANGUAGES}=require('../src/i18n/languages.ts');
const {localizedItemName}=require('../src/i18n/starter-item-names.ts');
const {craftingActionRows,craftingActionRecipes,craftingExceptionRecipes,localizedRecipeName,recipeMatchesLocalizedSearch}=require('../src/i18n/crafting-recipe-names.ts');
const languages=['en','de','es','nl','it','fr','ru','tr'];
assert.deepEqual([...SUPPORTED_LANGUAGES],languages);
assert.equal(Object.keys(craftingActionRows).length,12,'nine recipe verbs plus three source-specific strings');
assert.equal(Object.keys(craftingActionRecipes).length,17,'seventeen source-guarded crafting actions');
assert.equal(Object.keys(craftingExceptionRecipes).length,3,'three exceptional authored recipe names');
const ph=text=>[...text.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map(x=>x[1]).sort();
for(const [key,row]of Object.entries(craftingActionRows)){
 assert.equal(row.length,7,key+' expected seven translations');
 for(const [i,lang]of languages.slice(1).entries()){
  assert.ok(row[i].trim(),key+' '+lang+' empty');
  assert.deepEqual(ph(row[i]),ph(key),key+' '+lang+' missing placeholder');
 }
}
for(const [id,meta]of Object.entries(craftingActionRecipes)){
 const recipe=RECIPES.find(x=>x.id===id);
 assert.ok(recipe,'missing recipe '+id);
 assert.equal(recipe.name,meta.en,'source text changed '+id);
 assert.ok(Object.hasOwn(craftingActionRows,meta.verb+' {item}'),'unsupported recipe verb '+id);
 for(const lang of languages){
  const source=lang==='en'?meta.verb+' {item}':craftingActionRows[meta.verb+' {item}'][languages.indexOf(lang)-1];
  const expected=source.replace('{item}',localizedItemName(lang,meta.itemId));
  assert.equal(localizedRecipeName(lang,recipe),expected,id+' '+lang);
  assert.ok(recipeMatchesLocalizedSearch(lang,recipe,expected),id+' localized search '+lang);
  assert.ok(recipeMatchesLocalizedSearch(lang,recipe,recipe.name),id+' English search '+lang);
  assert.equal(localizedRecipeName(lang,{...recipe,name:'Revised server recipe'}),'Revised server recipe','changed source must not translate '+id);
 }
}
for(const [id,english]of Object.entries(craftingExceptionRecipes)){
 const recipe=RECIPES.find(x=>x.id===id);
 assert.ok(recipe,id);
 assert.equal(recipe.name,english,id+' source changed');
 assert.deepEqual(ph(english),[],'specific source should have no placeholders');
 for(const lang of languages){
  const expected=lang==='en'?english:craftingActionRows[english][languages.indexOf(lang)-1];
  assert.equal(localizedRecipeName(lang,recipe),expected,id+' '+lang);
  assert.ok(recipeMatchesLocalizedSearch(lang,recipe,expected),id+' searchable '+lang);
 }
}
const byId=id=>{const recipe=RECIPES.find(x=>x.id===id);assert.ok(recipe,id);return recipe};
for(const id of ['BREW_DEWLEAF_DRAUGHT','BREW_VERDANT_BINDING_RESIN','COOK_IRONWOOD_STEW','COOK_ICEFISH']){
 const recipe=byId(id);
 assert.equal(recipe.name,itemDef(recipe.output.itemId).name,id+' should match product by source');
 for(const lang of languages)assert.equal(localizedRecipeName(lang,recipe),localizedItemName(lang,recipe.output.itemId),id+' output name '+lang);
}
const dynamic={id:'a-custom-recipe',name:'Mysterious custom recipe',output:{itemId:'COPPER_INGOT',quantity:1}};
assert.equal(localizedRecipeName('tr',dynamic),dynamic.name,'unknown dynamic recipe preserved');
assert.ok(!recipeMatchesLocalizedSearch('de',byId('SMELT_COPPER_INGOT'),'nonexistent-ingredient'),'non matching search');
const fileMarkers={
 'components/CraftingRecipeBrowser.tsx':['recipeMatchesLocalizedSearch(language,recipe,q)'],
 'components/RecipeCard.tsx':['localizedRecipeName(language,recipe)','localizedItemName(language,output.id)'],
 'components/IngredientList.tsx':['localizedItemName(language,input.itemId)'],
 'components/SmithingCollection.tsx':['localizedItemName(language,item.id)','localizedItemName(language,input.itemId)'],
 'components/ItemQuickInspect.tsx':['localizedRecipeName(language,craftPath.recipe)']
};
for(const [p,markers]of Object.entries(fileMarkers)){
 const data=fs.readFileSync(path.join(__dirname,'../src',p),'utf8');
 for(const marker of markers)assert.ok(data.includes(marker),p+' missing '+marker);
 const parsed=ts.createSourceFile(p,data,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 assert.equal(parsed.parseDiagnostics.length,0,p+' malformed TSX');
}
console.log('PASS: 17 generated recipe verbs and three special names, seven translations, both search languages, recipe identity and five UI surfaces');
