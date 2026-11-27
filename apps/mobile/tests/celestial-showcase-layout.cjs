const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const modulePath=path.join(__dirname,'../src/core/celestial-showcase-layout.ts');
const compiled=ts.transpileModule(fs.readFileSync(modulePath,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const mod={exports:{}};new Function('exports','module',compiled)(mod.exports,mod);
const {celestialPetMode,celestialStageSupported,CELESTIAL_STAGE:S,CELESTIAL_PET_BOX:B,CELESTIAL_IDENTITY_BOX:I}=mod.exports;
assert.equal(celestialPetMode('aetherion','aetherion',false),'matching');
assert.equal(celestialPetMode('aetherion','aetherion',true),'matching');
assert.equal(celestialPetMode('another','aetherion',true),'alternate');
assert.equal(celestialPetMode('another','aetherion',false),'none');
for(const id of [null,undefined,''])assert.equal(celestialPetMode(id,'aetherion',true),'none');
assert.equal(celestialPetMode('another','',true),'alternate');
for(const w of [300,340,480])assert(celestialStageSupported(w,1));
for(const w of [0,260,299,481,Infinity,NaN])assert(!celestialStageSupported(w,1));
for(const f of [0,1.21,2,NaN,Infinity])assert(!celestialStageSupported(340,f));
assert(celestialStageSupported(340,1.2));
for(const box of Object.values(B)){
 assert(box.x>=234&&box.x+box.width<=S.width-18);
 assert(box.y>=24&&box.y+box.height<=S.height-24);
}
assert.equal(B.alternate.y,101);
assert.equal(B.alternate.width,46);
assert(B.alternate.y+B.alternate.height<=B.glow.y+B.glow.height);
assert.equal(I.guild.x,I.plate.x);
assert.equal(I.guild.width,I.plate.width);
assert(I.guild.y>=I.plate.y+I.plate.height);
assert(I.guild.y+I.guild.height<=S.height-24);
console.log('Celestial pet selection, safe geometry and responsive fallback assertions passed.');

assert(I.identity.x>=I.portrait.x+I.portrait.width);
assert(I.identity.x+I.identity.width<=I.plate.width);
assert(I.identity.y+I.identity.height<=I.plate.height);
assert(!celestialStageSupported(300,1.2),'use readable ordinary layout when text and featured badges cannot fit');
assert(celestialStageSupported(340,1.2));
assert(I.guild.y>I.plate.y+I.plate.height);

// All four dedicated stages use the same legibility treatment; no hard outline.
const surfacePath=path.join(__dirname,'../src/components/profile/ascendant-showcase-surfaces.ts');
const surfaceMod={exports:{}};
new Function('exports','module',ts.transpileModule(fs.readFileSync(surfacePath,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(surfaceMod.exports,surfaceMod);
for(const [theme,file] of Object.entries({celestial:'CelestialSovereignPreview',draconic:'DraconicDominionPreview',abyssal:'AbyssalMajestyPreview',paradox:'ParadoxEternalPreview'})){
 const treatment=surfaceMod.exports.ASCENDANT_SURFACES[theme];
 assert.equal(treatment.identity.borderWidth,0);
 assert.match(treatment.identity.backgroundColor,/^rgba\\(.*0\\.82\\)$/);
 assert.equal(treatment.portrait.backgroundColor,'transparent');
 assert(fs.readFileSync(path.join(__dirname,'../src/components/profile/'+file+'.tsx'),'utf8').includes('ASCENDANT_SURFACES.'+theme+'.identity'));
}
