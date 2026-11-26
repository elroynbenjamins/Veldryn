import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

// Read-only checkout audit; never touches databases, secrets, or runtime state.
// Exact literal hits are evidence to classify, not automatic retirement clearance.
const pattern='ECHO_BAT_WING|Echo[ _-]Bat[ _-]Wing|ITEM_0077|Echo[ _-]Membrane|echo_membrane';
let paths=[];
try {
 paths=execFileSync('git',['grep','-Iil','-E',pattern,'--','apps/mobile/src','backend','packages'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
} catch(e) {
 if(e.status!==1)throw e;
}
let total=0;
for(const path of paths){
 const source=readFileSync(path,'utf8');
 const hits=[...source.matchAll(new RegExp(pattern,'gi'))];
 total+=hits.length;
 console.log(path+' — '+hits.length+' exact references');
 for(const hit of hits.slice(0,16)){
  const index=hit.index;
  const line=source.slice(0,index).split('\n').length;
  const excerpt=source.slice(Math.max(0,index-100),Math.min(source.length,index+hit[0].length+120)).replace(/\s+/g,' ');
  console.log('  L'+line+': '+excerpt);
 }
 if(hits.length>16)console.log('  Remaining '+(hits.length-16)+' occurrences require inspection.');
}
console.log('Total: '+total+' exact references in '+paths.length+' files. Classify producers, consumers, aliases, generated duplicates and metadata before approving retirement.');
if(!paths.some(p=>p==='backend/supabase/functions/gameplay/index.ts'))console.log('No exact literal in gameplay bundle; inspect indirect and generated mappings separately.');

// Distinguish older recipe archives from current authored V33 data by exact JSON values.
for(const version of [27,29,30,33]){
 const path='backend/data/equipment_exact_recipes_v'+version+'.json';
 const catalog=JSON.parse(readFileSync(path,'utf8'));
 const recipes=Array.isArray(catalog.recipes)?catalog.recipes:[];
 if(!recipes.length)throw Error('Recipe schema unverified for '+path);
 const matches=recipes.filter(recipe=>new RegExp(pattern,'i').test(JSON.stringify(recipe)));
 console.log('RECIPE CATALOG V'+version+': '+matches.length+'/'+recipes.length+' matching recipes, examples: '+matches.slice(0,5).map(recipe=>recipe.pieceId??recipe.id??'unknown').join(', '));
}

// Locate import/call sites for old exact-recipe consumers; existence of an exported
// function is not proof that the production HTTP handler reaches it.
const consumers='equipment-exact-recipes-v27|exactRecipeV27|canStartExactPieceCraftV27|canCraftCompositeComponentV27|finalInventoryRequirementsV27|recipeInventoryRequirementsV33|equipment-recipe-materials-v33|equipment-recipe-sources-v25|inventoryItemIdV25';
let usage='';
try {usage=execFileSync('git',['grep','-InE',consumers,'--','backend/src','backend/online','apps/mobile/src','backend/supabase/functions/gameplay/index.ts','backend/supabase/functions/coop/index.ts'],{encoding:'utf8',maxBuffer:16*1024*1024});}catch(e){if(e.status!==1)throw e;}
const usageRows=usage.trim().split('\n').filter(Boolean);
for(const row of usageRows)console.log('RECIPE ROUTE: '+row.slice(0,900));
console.log('Recipe route references: '+usageRows.length+'; manually distinguish definitions, tests and live route calls.');
