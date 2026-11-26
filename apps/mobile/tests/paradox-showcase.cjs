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

const {PARADOX_REVIEW:R,paradoxReviewTier,PARADOX_IDLE_LIFT:lift,PARADOX_AMBIENT_PATHS:ambient}=mod.exports;
const matching={background:I.background,border:I.border,pet:I.pet,effect:R.effectId,verifiedTitleId:R.titleId,displayedBadges:[I.badge]};
assert.equal(paradoxReviewTier(false,[R.collectionId],matching),'hidden');
assert.equal(paradoxReviewTier(true,[],matching),'hidden');
assert.equal(paradoxReviewTier(true,[R.collectionId],{...matching,border:'wrong'}),'hidden');
assert.equal(paradoxReviewTier(true,[R.collectionId],{...matching,effect:'other'}),'hidden');
assert.equal(paradoxReviewTier(true,[R.collectionId],{...matching,pet:null}),'paired');
assert.equal(paradoxReviewTier(true,[R.collectionId],{...matching,verifiedTitleId:null}),'awakened');
assert.equal(paradoxReviewTier(true,[R.collectionId],{...matching,displayedBadges:[]}),'awakened');
assert.equal(paradoxReviewTier(true,[R.collectionId],matching),'ascendant');
assert.equal(lift[0],lift.at(-1));assert(lift.every(x=>x>=-1.5&&x<=0));
assert(ambient.length<=Q.ambientNodes);
for(const points of ambient){
 assert.deepEqual(points[0],points.at(-1));
 for(let i=1;i<points.length;i++)for(let j=0;j<=10;j++){
  const t=j/10,x=points[i-1][0]+t*(points[i][0]-points[i-1][0]),y=points[i-1][1]+t*(points[i][1]-points[i-1][1]),r=4;
  assert(x-r>=0&&x+r<=S.width&&y-r>=0&&y+r<=S.height);
  for(const b of [B.plate,B.guild,B.aura])assert(x+r<=b.x||x-r>=b.x+b.w||y+r<=b.y||y-r>=b.y+b.h);
 }
}
const preview=read('components/profile/ParadoxEternalPreview.tsx');
assert(preview.includes('useLoopProgress(PARADOX_CYCLE_MS,running)'));
assert(!preview.includes('Animated.loop(')&&!preview.includes('setInterval('));
assert(preview.includes('running?<ParadoxBorderLight')&&preview.includes('!supported?fallback'));
assert(preview.indexOf('</UltraLuxeIdentityMotionProvider>')<preview.indexOf('{badges?<View'));
const review=read('components/profile/ParadoxReviewScene.tsx');
assert(review.includes('reviewEnabled=false')&&review.includes("tier==='hidden'")&&review.includes("fullSet={tier==='ascendant'}"));
const registry=read('theme/paradox-integration-assets.ts');
const crypto=require('node:crypto');
for(const [name,w,h,bytes,sha] of [
 ['fractured_eternity.webp',1020,615,156512,'d8dae670e0b6600997a741c342eb0f8cd2ee1954e85f77c3c1e593bf2f911f90'],
 ['fractured_eternity_standard.webp',1024,576,148942,'bb012ba154a404d018f5c31ad8a5a715c4eca2f1c90f84dc2523d85689bd7d06'],
]){
 const buf=fs.readFileSync(path.join(__dirname,'../assets/ascendant/paradox',name));
 assert.equal(buf.length,bytes);assert.equal(crypto.createHash('sha256').update(buf).digest('hex'),sha);
 assert.equal(buf.toString('ascii',12,16),'VP8X');assert(buf[20]&16);
 assert.equal(1+buf.readUIntLE(24,3),w);assert.equal(1+buf.readUIntLE(27,3),h);
 assert(registry.includes(name));
}
for(const name of ['PublicProfileScene.tsx','ProfileScenePreview.tsx','profile/ProfileStage.tsx']){
 const live=read('components/'+name);
 assert(!live.includes('ParadoxReviewScene')&&!live.includes('paradox-integration-assets'));
}
console.log('PASS: uploaded frame integrity, isolated review grant, native lifecycle, static badge slot and bounded ambient motion');

for(const [name,w,h,bytes,sha] of [
 ['beyond_the_veil.webp',1020,615,111958,'ad91d1ca0c97daf00e780d69df518905c9a0917232bee5a9f5c7fc457f0dc63d'],
 ['beyond_the_veil_square.webp',512,512,59352,'bc87bf0371436bf02b559a9cf9e566be9af4340c84baddedc266fa79d9bf7052'],
]){
 const buf=fs.readFileSync(path.join(__dirname,'../assets/ascendant/paradox',name));
 assert.equal(buf.length,bytes);assert.equal(crypto.createHash('sha256').update(buf).digest('hex'),sha);
 assert.equal(buf.toString('ascii',12,16),'VP8 ');
 assert.equal(buf.readUInt16LE(26)&16383,w);assert.equal(buf.readUInt16LE(28)&16383,h);
 assert(registry.includes(name));
}
assert(review.includes('background:getParadoxReviewBackgrounds().showcase'));
console.log('PASS: uploaded wide and square background integrity and fixed review selection');

const {PARADOX_POSE_ATLAS:A,paradoxPoseTimeline,paradoxPoseCell}=mod.exports;
assert.equal(A.columns*A.rows,A.frames);
assert.equal(A.frames/A.seconds,Q.petAtlasFps);
assert.equal(A.seconds*A.cycles*1000,ms);
assert(A.frames<=Q.maxPetFrames);
assert(A.frameWidth*A.frameHeight*A.frames*4<=2100000);
const poseTimeline=paradoxPoseTimeline();
assert.equal(poseTimeline.inputRange.length,73);
assert.equal(poseTimeline.frames.length,73);
assert.equal(poseTimeline.frames[0],0);
assert.equal(poseTimeline.frames.at(-1),0);
assert(poseTimeline.inputRange.every((t,i)=>!i||t>poseTimeline.inputRange[i-1]));
for(const frame of poseTimeline.frames){
 const cell=paradoxPoseCell(frame);
 assert(frame>=0&&frame<A.frames&&cell.column<A.columns&&cell.row<A.rows);
}
assert(preview.includes('motion&&assets.idleAtlas?'));
assert(preview.includes('Animated.modulo(Animated.multiply(clock,a.cycles),1)'));
assert(preview.includes("width:w,height:h,overflow:'hidden'"));
assert(preview.includes('source={assets.aeon}'));
console.log('PASS: Aeon native atlas, bounded cells, loop continuity and standalone fallback');

const {PARADOX_REACTION:reactionSpec}=mod.exports;
const {center,halo,shards,moteRadius}=reactionSpec;
assert.equal(shards.length,3);
const aura=B.aura;
function withinAura(x,y,rx,ry){
 assert(x-rx>=aura.x&&x+rx<=aura.x+aura.w&&y-ry>=aura.y&&y+ry<=aura.y+aura.h);
}
withinAura(center.x,center.y,halo.w*halo.maxScale/2,halo.h*halo.maxScale/2);
for(const p of shards)for(let j=0;j<=20;j++){
 const t=j/20;withinAura(center.x+p.x+t*p.dx,center.y+p.y+t*p.dy,moteRadius,moteRadius);
}
assert(preview.includes("reactionEnabled=running&&mode==='matching'"));
assert(preview.includes('useUltraLuxePetReaction(reactionEnabled)'));
assert(preview.includes('reactionEnabled?<ParadoxPetReaction')&&preview.includes('onPress={trigger}'));
const artDir=path.join(__dirname,'../assets/ascendant/paradox');
const pending=JSON.parse(fs.readFileSync(path.join(artDir,'pet-artwork-manifest.json'),'utf8'));
assert.equal(pending.files.length,8);assert.equal(pending.badgeMotion,false);
assert.equal(pending.files.reduce((sum,f)=>sum+f.bytes,0),375090);
let present=0;
for(const art of pending.files){
 const file=path.join(artDir,art.name);
 if(!fs.existsSync(file))continue;
 present++;
 const buf=fs.readFileSync(file);
 assert.equal(buf.length,art.bytes,art.name);
 assert.equal(crypto.createHash('sha256').update(buf).digest('hex'),art.sha256,art.name);
 assert.equal(buf.toString('ascii',0,4),'RIFF');
 assert.equal(buf.toString('ascii',8,12),'WEBP');
 const chunk=buf.toString('ascii',12,16);
 if(chunk==='VP8X'){
  assert(buf[20]&16);assert.equal(1+buf.readUIntLE(24,3),art.width);assert.equal(1+buf.readUIntLE(27,3),art.height);
 }else if(chunk==='VP8L'){
  assert.equal(buf[20],47);const bits=buf.readUInt32LE(21);
  assert(bits&(1<<28));assert.equal(1+(bits&16383),art.width);assert.equal(1+((bits>>>14)&16383),art.height);
 }else assert.fail('Missing transparency header: '+art.name);
}
console.log('PASS: localized Aeon reaction and asset integrity contract; '+present+'/8 final assets present (registration remains gated)');
