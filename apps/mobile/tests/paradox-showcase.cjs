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

const root=path.join(__dirname,'../src');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const layout={exports:{}};
new Function('exports','module',ts.transpileModule(read('core/profile-frame-layout.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(layout.exports,layout);
const border={exports:{}};
new Function('exports','module','require',ts.transpileModule(read('core/paradox-border-motion.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(border.exports,border,id=>id==='./profile-frame-layout'?layout.exports:id==='./paradox-showcase-layout'?mod.exports:require(id));
const {PARADOX_BORDER_PHASE:BP,paradoxBorderTracks}=border.exports;
assert(BP.every((v,i)=>!i||v>BP[i-1]));
assert(BP.includes(.5)&&BP.includes(16/24));
assert.deepEqual(paradoxBorderTracks(0,0),[]);
assert.deepEqual(paradoxBorderTracks(NaN,205),[]);
for(const showcase of [false,true]){
 for(const [w,h] of showcase?[[320,320*205/340],[340,205],[390,390*205/340],[480,480*205/340]]:[[44,44],[104,72],[260,174],[340,205],[480,270]]){
  const q=Math.min(1,w/300,h/205),k=w/340,side=showcase?28*k:18*q,rail=showcase?34*k:24*q;
  const tracks=paradoxBorderTracks(w,h,showcase),full=paradoxBorderTracks(w,h,showcase,true);
  assert.equal(tracks.length,showcase?Q.showcaseBorderNodes:Q.standardBorderNodes);
  assert.equal(full.length,tracks.length);
  for(let z=0;z<tracks.length;z++){
   const t=tracks[z],u=full[z],r=t.size/2;
   assert(t.size>0&&t.opacity.some(a=>a>=.5));
   assert.deepEqual(t.x,u.x);assert.deepEqual(t.y,u.y);
   assert(u.opacity.every((a,i)=>a>=t.opacity[i]&&a<=.98));
   for(const seq of [t.x,t.y,t.opacity,u.opacity]){assert.equal(seq.length,BP.length);assert.equal(seq[0],seq.at(-1));}
   for(let i=1;i<BP.length;i++)for(let j=0;j<=10;j++){
    const v=j/10,x=t.x[i-1]+v*(t.x[i]-t.x[i-1]),y=t.y[i-1]+v*(t.y[i]-t.y[i-1]);
    assert(x-r>=-1e-6&&x+r<=w+1e-6&&y-r>=-1e-6&&y+r<=h+1e-6);
    assert(x+r<=side+1e-6||x-r>=w-side-1e-6||y+r<=rail+1e-6||y-r>=h-rail-1e-6);
    if(showcase)for(const b of [B.plate,B.guild,B.aura])assert(x+r<=b.x*k+1e-6||x-r>=(b.x+b.w)*k-1e-6||y+r<=b.y*k+1e-6||y-r>=(b.y+b.h)*k-1e-6);
   }
  }
  for(const t of tracks.slice(0,2))assert.equal(t.opacity[BP.indexOf(.5)],0);
  assert(tracks[0].x[BP.indexOf(.5)]>tracks[0].x[0]);
  assert(tracks[1].x[BP.indexOf(.5)]<tracks[1].x[0]);
  if(showcase)assert(full.some((u,i)=>u.opacity.some((a,j)=>a>tracks[i].opacity[j])));
 }
}
const native=read('components/profile/ParadoxBorderLight.tsx');
assert(!native.includes('Animated.loop(')&&!native.includes('setInterval('));
assert(native.includes('pointerEvents="none"')&&native.includes('running?<ParadoxBorderLight'));
console.log('PASS: Paradox native frame tracks, six/eight node parity, fade-before-reversal and protected geometry');
