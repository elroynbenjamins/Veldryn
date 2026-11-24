const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
function load(name){
 const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/core',name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const mod={exports:{}};new Function('exports','module','require',code)(mod.exports,mod,require);return mod.exports;
}
const {DRACONIC_IDS:I,DRACONIC_BOXES:B,DRACONIC_STAGE:S,draconicPair,draconicPetMode,draconicStageSupported}=load('draconic-showcase-layout');
const {ultraLuxeProfileCosmeticVisible,isUltraLuxeBadge}=load('ultra-luxe-cosmetics');
assert(draconicPair(I.background,I.border));
assert(!draconicPair(I.background,'another'));
assert(!draconicPair('another',I.border));
assert.equal(draconicPetMode(I.pet,false),'matching');
assert.equal(draconicPetMode('PET_001',true),'alternate');
assert.equal(draconicPetMode('PET_001',false),'none');
assert.equal(draconicPetMode(null,true),'none');
for(const box of Object.values(B)){assert(box.x>=10&&box.y>=10&&box.x+box.w<=S.width-10&&box.y+box.h<=S.height-10);}
assert(B.plate.x+B.plate.w<B.dragon.x);
assert(B.plate.x+B.plate.w<B.alternate.x);
assert(B.portrait.x+B.portrait.w<B.identity.x);
assert(B.identity.y+B.identity.h<=B.badges.y);
assert(B.badges.y+B.badges.h<=B.plate.y+B.plate.h);
assert(B.plate.y+B.plate.h<B.guild.y);
assert.equal(B.guild.x,B.plate.x);
assert.equal(B.guild.w,B.plate.w);
assert(B.guild.y+B.guild.h<=159);
assert(B.plate.x+B.plate.w<B.ring.x);
assert(!('altar' in B));
assert(B.identity.y+B.identity.h<=B.guild.y);
assert(draconicStageSupported(340,1));assert(!draconicStageSupported(319,1));assert(!draconicStageSupported(340,1.3));
const account={unlockedProfileBackgroundIds:[I.background],unlockedProfileBorderIds:[I.border],unlockedCosmeticPetIds:[I.pet]};
for(const kind of ['background','border','pet']){
 assert(!ultraLuxeProfileCosmeticVisible({account:{}},kind,I[kind]));
 assert(ultraLuxeProfileCosmeticVisible({account},kind,I[kind]));
}
assert(isUltraLuxeBadge(I.badge));
console.log('Draconic geometry, pet modes and grant-only discovery passed.');
