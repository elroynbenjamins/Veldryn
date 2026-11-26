const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const source=fs.readFileSync(path.join(__dirname,'../src/core/paradox-showcase-layout.ts'),'utf8');
const mod={exports:{}};
new Function('exports','module',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(mod.exports,mod);
const {PARADOX_IDS:I,PARADOX_STAGE:S,PARADOX_BOXES:B,PARADOX_BUDGET:Q,PARADOX_CYCLE_MS:ms,PARADOX_GLINT_PHASE:P,PARADOX_GLINT_PATHS:T,PARADOX_GLINT_OPACITY:O,paradoxAwakeningCurve,paradoxStageSupported,paradoxPetMode}=mod.exports;
assert.equal(ms,24000);assert.deepEqual([Q.standardBorderNodes,Q.showcaseBorderNodes,Q.badgeAnimatedNodes],[6,8,0]);
assert(paradoxStageSupported(320,1.05));assert(paradoxStageSupported(480,1));assert(!paradoxStageSupported(319,1));assert(!paradoxStageSupported(340,1.1));assert(!paradoxStageSupported(NaN,1));
assert.equal(paradoxPetMode(I.pet),'matching');assert.equal(paradoxPetMode('PET_001',true),'alternate');assert.equal(paradoxPetMode(null,true),'none');
for(const b of Object.values(B))assert(b.x>=0&&b.y>=0&&b.x+b.w<=S.width&&b.y+b.h<=S.height);
assert(B.plate.x+B.plate.w<B.aura.x);assert(B.identity.y+B.identity.h<=B.badges.y);assert(B.plate.y+B.plate.h<B.guild.y);
const {phase,energy}=paradoxAwakeningCurve();
assert.equal(phase.length,37);assert.equal(energy.length,37);assert.equal(phase[0],0);assert.equal(phase.at(-1),1);
assert.equal(energy[0],0);assert.equal(energy.at(-1),0);assert.equal(Math.max(...energy),1);
assert.equal(phase[energy.indexOf(1)],16/24);
assert(phase.every((t,i)=>!i||t>phase[i-1]));assert(energy.every(t=>Number.isFinite(t)&&t>=0&&t<=1));
assert(energy.some((v,i)=>phase[i]<=4/24&&v>=.4));
assert.equal(O[0],O.at(-1));assert.equal(O[P.indexOf(.5)],0);assert(O.every(v=>v>=0&&v<=1));
for(const track of T){
 assert.equal(track.length,P.length);assert.deepEqual(track[0],track.at(-1));
 for(let i=1;i<track.length;i++)for(let j=0;j<=20;j++){
  const t=j/20,x=track[i-1][0]+t*(track[i][0]-track[i-1][0]),y=track[i-1][1]+t*(track[i][1]-track[i-1][1]),r=6;
  assert(x-r>=0&&x+r<=S.width&&y-r>=0&&y+r<=S.height);
  for(const b of [B.plate,B.guild,B.aura])assert(x+r<=b.x||x-r>=b.x+b.w||y+r<=b.y||y-r>=b.y+b.h);
 }
}
for(const f of ['PublicProfileScene.tsx','ProfileScenePreview.tsx','profile/ProfileStage.tsx']){
 const live=fs.readFileSync(path.join(__dirname,'../src/components',f),'utf8');assert(!live.includes('paradox-showcase-layout'));
}
console.log('PASS: Paradox geometry, static badge budget, closed temporal glints, synchronized signature and isolation');
