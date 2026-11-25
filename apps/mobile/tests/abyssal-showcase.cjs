const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const src=fs.readFileSync(path.join(__dirname,'../src/core/abyssal-showcase-layout.ts'),'utf8');
const code=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const mod={exports:{}};new Function('exports','module',code)(mod.exports,mod);
const {ABYSSAL_IDS:I,ABYSSAL_BOXES:B,ABYSSAL_STAGE:S,ABYSSAL_CYCLE_MS,ABYSSAL_MOTE_PATHS:P,ABYSSAL_BUDGET:Q,abyssalPair,abyssalPetMode,abyssalStageSupported,abyssalAwakeningCurve}=mod.exports;
assert(abyssalPair(I.background,I.border));assert(!abyssalPair(I.background,'other'));
assert.equal(abyssalPetMode(I.pet),'matching');assert.equal(abyssalPetMode('PET_001',true),'alternate');assert.equal(abyssalPetMode(null,true),'none');
for(const b of Object.values(B))assert(b.x>=10&&b.y>=10&&b.x+b.w<=S.width-10&&b.y+b.h<=S.height-10);
for(const b of [B.leviathan,B.aura,B.ring,B.alternate])assert(B.plate.x+B.plate.w<b.x);
assert(B.portrait.x+B.portrait.w<B.identity.x);
assert(B.identity.y+B.identity.h<=B.badges.y);
assert(B.badges.y+B.badges.h<=B.plate.y+B.plate.h);
assert(B.plate.y+B.plate.h<B.guild.y);
assert(abyssalStageSupported(340,1));assert(abyssalStageSupported(320,1.05));assert(!abyssalStageSupported(319,1));assert(!abyssalStageSupported(340,1.1));assert(!abyssalStageSupported(NaN,1));
assert.equal(ABYSSAL_CYCLE_MS,24000);
const {phase,energy}=abyssalAwakeningCurve();
assert.equal(phase.length,37);assert.equal(phase.length,energy.length);assert.equal(phase[0],0);assert.equal(phase.at(-1),1);
assert.equal(energy[0],0);assert.equal(energy.at(-1),0);assert.equal(Math.max(...energy),1);
assert(energy.every(x=>Number.isFinite(x)&&x>=0&&x<=1));
assert(phase.every((x,i)=>!i||x>phase[i-1]));
assert(energy.some((x,i)=>phase[i]<1/3&&x>=.3));
assert.equal(phase[energy.indexOf(1)],16/24);
assert(P.length<=Q.maxAmbientMotes);
for(const p of P){
 assert.deepEqual(p[0],p.at(-1));
 for(const [x,y] of p){
  assert(x-Q.moteRadius>=0&&x+Q.moteRadius<=S.width&&y-Q.moteRadius>=0&&y+Q.moteRadius<=S.height);
  for(const b of [B.plate,B.guild])assert(x+Q.moteRadius<=b.x||x-Q.moteRadius>=b.x+b.w||y+Q.moteRadius<=b.y||y-Q.moteRadius>=b.y+b.h);
 }
}
assert(Q.petAtlasFps<=12&&Q.maxPetFrames<=48&&Q.maxPetLift<=3);
console.log('PASS: Abyssal geometry, pet modes, responsive fallback and closed tidal choreography');
