const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');

const source=fs.readFileSync(path.join(__dirname,'../src/core/ultra-luxe-cosmetics.ts'),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const mod={exports:{}};new Function('exports','module','require',js)(mod.exports,mod,require);
const {isUltraLuxeProfileCosmetic,ownsUltraLuxeProfileCosmetic,ultraLuxeProfileCosmeticVisible,isUltraLuxeBadge}=mod.exports;

const ids={
 background:'ascendant-celestial-astral-sanctum',
 border:'ascendant-celestial-crown-of-the-cosmos',
 pet:'ascendant-celestial-aetherion',
 badge:'ascendant_sovereign_of_stars',
};
const unowned={account:{unlockedProfileBackgroundIds:[],unlockedProfileBorderIds:[],unlockedCosmeticPetIds:[]}};
const owned={account:{
 unlockedProfileBackgroundIds:[ids.background],
 unlockedProfileBorderIds:[ids.border],
 unlockedCosmeticPetIds:[ids.pet],
}};
for(const kind of ['background','border','pet']){
 const id=ids[kind];
 assert(isUltraLuxeProfileCosmetic(kind,id),kind+' registered as ultra-luxe');
 assert.equal(ownsUltraLuxeProfileCosmetic(unowned,kind,id),false,kind+' unowned');
 assert.equal(ultraLuxeProfileCosmeticVisible(unowned,kind,id),false,kind+' must be absent before grant');
 assert.equal(ownsUltraLuxeProfileCosmetic(owned,kind,id),true,kind+' owned after grant');
 assert.equal(ultraLuxeProfileCosmeticVisible(owned,kind,id),true,kind+' visible after grant');
}
assert(isUltraLuxeBadge(ids.badge),'Celestial badge is private ultra-luxe');

const cosmetics=fs.readFileSync(path.join(__dirname,'../src/core/profile-cosmetics.ts'),'utf8');
assert(cosmetics.includes("if(isUltraLuxeProfileCosmetic(kind,id))return canUseProfileCosmetic(state,kind,id)"),
 'scene/frame release discovery must reduce to ownership for ultra-luxe items');
const celestial=fs.readFileSync(path.join(__dirname,'../src/core/ascendant-cosmetics.ts'),'utf8');
assert(!celestial.includes('ASCENDANT_CELESTIAL_VISUALS_RELEASED'),'pet visibility must not depend on a public release flag');
assert(celestial.includes("if(!ownsCelestialPet(state))return null"),'Aetherion must be absent before ownership');
const flags=fs.readFileSync(path.join(__dirname,'../src/core/release-flags.ts'),'utf8');
assert(!flags.includes('ASCENDANT_CELESTIAL_VISUALS_RELEASED'),'ultra-luxe visuals must have no public release flag');
console.log('Ultra-luxe visibility: absent before grant, visible after grant, never a public locked/released entry.');
