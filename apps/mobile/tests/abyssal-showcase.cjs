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

const preview=fs.readFileSync(path.join(__dirname,'../src/components/profile/AbyssalMajestyPreview.tsx'),'utf8');
assert.equal((preview.match(/Animated\.loop\(/g)||[]).length,1);
assert(preview.includes('useNativeDriver:true,isInteraction:false'));
assert(preview.includes('active&&supported&&!reduceMotion'));
assert(preview.includes("AppState.currentState==='active'"));
assert(preview.includes('AccessibilityInfo.isReduceMotionEnabled()'));
assert(preview.includes('app.remove();motion.remove();'));
assert(preview.includes('loop.stop();clock.stopAnimation();'));
assert(preview.includes("if(!running||mode!=='matching')return null"));
assert(preview.includes("if(mode==='none')return null"));
assert(preview.includes('source={alternatePetSource}'));
assert(preview.includes('fullSet&&mode==='));
assert(preview.includes('active={running}'));
assert(preview.includes('!supported?fallback'));
assert(preview.includes('running?<AbyssalTide'));
assert(!preview.includes('setInterval(')&&!preview.includes('addListener(')&&!preview.includes('requestAnimationFrame('));
assert(preview.includes('pointerEvents="none" accessible={false}'));
assert(!preview.includes('require('),'review preview accepts supplied art only');
for(const name of ['PublicProfileScene.tsx','ProfileScenePreview.tsx','profile/ProfileStage.tsx']){
 const live=fs.readFileSync(path.join(__dirname,'../src/components',name),'utf8');
 assert(!live.includes('AbyssalMajestyPreview'),'review-only preview stays out of live renderers');
}
console.log('PASS: isolated native preview, lifecycle, matching pet and static fallback contracts');

const {ABYSSAL_POSE_ATLAS:A,abyssalPoseTimeline,abyssalPoseCell}=mod.exports;
assert.equal(A.frames,A.columns*A.rows);
assert.equal(A.frames/A.seconds,12);
assert.equal(A.seconds*A.cycles*1000,ABYSSAL_CYCLE_MS);
assert(A.frames<=Q.maxPetFrames);
const timeline=abyssalPoseTimeline();
assert.equal(timeline.inputRange.length,73);
assert.equal(timeline.frames.length,73);
assert.equal(timeline.frames[0],0);assert.equal(timeline.frames.at(-1),0);
assert(timeline.inputRange.every((t,i)=>!i||t>timeline.inputRange[i-1]));
for(const i of timeline.frames){
 const cell=abyssalPoseCell(i);
 assert(i>=0&&i<A.frames&&cell.column<A.columns&&cell.row<A.rows);
}
assert(A.frameWidth*A.frameHeight*A.frames*4<=2100000);
assert(preview.includes('motion&&assets.idleAtlas?'));
assert(preview.includes('Animated.modulo(Animated.multiply(clock,a.cycles),1)'));
assert(preview.includes("width:w,height:h,overflow:'hidden'"));
console.log('PASS: bounded single-clock Abyssal pet atlas and static fallback');

assert(preview.includes('running?<AbyssalBorderLight'));
assert(preview.indexOf('source={assets.border}')<preview.indexOf('running?<AbyssalBorderLight'));
assert(!preview.includes('motion.crest'));
for(const b of [{x:157,y:5,w:26,h:26},{x:158,y:176,w:24,h:24}]){
 assert(b.x>=0&&b.y>=0&&b.x+b.w<=S.width&&b.y+b.h<=S.height);
 for(const protectedBox of [B.plate,B.guild,B.leviathan,B.aura]){
  assert(b.x+b.w<=protectedBox.x||b.x>=protectedBox.x+protectedBox.w||b.y+b.h<=protectedBox.y||b.y>=protectedBox.y+protectedBox.h);
 }
}
console.log('PASS: frame crest and pearl light are bounded and above artwork');

const crypto=require('node:crypto');
const artDir=path.join(__dirname,'../assets/ascendant/abyssal');
const manifest=JSON.parse(fs.readFileSync(path.join(artDir,'manifest.json'),'utf8'));
const registry=fs.readFileSync(path.join(__dirname,'../src/theme/abyssal-integration-assets.ts'),'utf8');
const expectedFiles=Object.keys(manifest.files);
assert.equal(expectedFiles.length,13);
assert.equal((registry.match(/require\(/g)||[]).length,13);
let totalBytes=0;
for(const name of expectedFiles){
 const meta=manifest.files[name],buf=fs.readFileSync(path.join(artDir,name));
 assert.equal(buf.length,meta.size_bytes,name+' byte length');
 assert.equal(crypto.createHash('sha256').update(buf).digest('hex'),meta.sha256,name+' hash');
 assert.equal(buf.toString('ascii',0,4),'RIFF');
 assert.equal(buf.toString('ascii',8,12),'WEBP');
 const chunk=buf.toString('ascii',12,16);
 let w,h,alpha=false;
 if(chunk==='VP8X'){w=1+buf.readUIntLE(24,3);h=1+buf.readUIntLE(27,3);alpha=!!(buf[20]&16);}
 else if(chunk==='VP8L'){assert.equal(buf[20],47);const bits=buf.readUInt32LE(21);w=1+(bits&16383);h=1+((bits>>>14)&16383);alpha=!!(bits&(1<<28));}
 else if(chunk==='VP8 '){w=buf.readUInt16LE(26)&16383;h=buf.readUInt16LE(28)&16383;}
 else assert.fail('Unsupported WebP chunk '+chunk);
 assert.deepEqual([w,h],meta.dimensions,name+' dimensions');
 assert.equal(alpha,meta.mode==='RGBA',name+' alpha metadata');
 assert(registry.includes("require('../../assets/ascendant/abyssal/"+name+"')"));
 totalBytes+=buf.length;
}
assert(totalBytes<1024*1024,'Abyssal artwork bundle stays below 1 MiB compressed');
for(const name of ['PublicProfileScene.tsx','ProfileScenePreview.tsx','profile/ProfileStage.tsx']){
 const live=fs.readFileSync(path.join(__dirname,'../src/components',name),'utf8');
 assert(!live.includes('abyssal-integration-assets'),'review registry must remain isolated');
}
console.log('PASS: all thirteen uploaded artwork files match manifest and typed review registry');

const {ABYSSAL_PRIVATE_REVIEW:R,abyssalReviewTier,ABYSSAL_RAIL_PHASE:RP,ABYSSAL_RAIL_PATHS:RR,ABYSSAL_RAIL_OPACITY:RO}=mod.exports;
const actual={background:I.background,border:I.border,pet:I.pet,effect:R.effectId,verifiedTitleId:R.titleId,displayedBadges:[I.badge]};
assert.equal(abyssalReviewTier(false,[R.collectionId],actual),'hidden');
assert.equal(abyssalReviewTier(true,[],actual),'hidden');
assert.equal(abyssalReviewTier(true,['ascendant-celestial-sovereign'],actual),'hidden');
assert.equal(abyssalReviewTier(true,[R.collectionId],{...actual,border:'other'}),'hidden');
assert.equal(abyssalReviewTier(true,[R.collectionId],{...actual,effect:'other'}),'hidden');
assert.equal(abyssalReviewTier(true,[R.collectionId],{...actual,pet:null}),'paired');
assert.equal(abyssalReviewTier(true,[R.collectionId],{...actual,pet:'PET_001'}),'paired');
assert.equal(abyssalReviewTier(true,[R.collectionId],{...actual,verifiedTitleId:null}),'awakened');
assert.equal(abyssalReviewTier(true,[R.collectionId],{...actual,displayedBadges:[] }),'awakened');
assert.equal(abyssalReviewTier(true,[R.collectionId],{...actual,effect:null}),'ascendant');
assert.equal(abyssalReviewTier(true,[R.collectionId],actual),'ascendant');
const review=fs.readFileSync(path.join(__dirname,'../src/components/profile/AbyssalReviewScene.tsx'),'utf8');
assert(review.includes('reviewEnabled=false'));
assert(review.includes("tier==='hidden'"));
assert(review.includes("fullSet={tier==='ascendant'}"));
assert(review.includes('getAbyssalReviewAssets().scene'));
assert(RR.length<=Q.maxRailMotes);
assert.equal(RO[0],0);assert.equal(RO.at(-1),0);
assert.equal(RP[RO.indexOf(Math.max(...RO))],16/24);
for(const track of RR){
 assert.equal(track.length,RP.length);
 for(let i=1;i<track.length;i++){
  for(let j=0;j<=20;j++){
   const t=j/20,x=track[i-1][0]+t*(track[i][0]-track[i-1][0]),y=track[i-1][1]+t*(track[i][1]-track[i-1][1]),r=4;
   assert(x-r>=0&&x+r<=S.width&&y-r>=0&&y+r<=S.height);
   for(const b of [B.plate,B.guild,B.aura])assert(x+r<=b.x||x-r>=b.x+b.w||y+r<=b.y||y-r>=b.y+b.h);
  }
 }
}
assert(preview.includes('showcase fullSet={verifiedFullSet}'));
console.log('PASS: private review gate, exact matching tiers and safe full-set rail animation');

const root=path.join(__dirname,'../src');
const source=p=>fs.readFileSync(path.join(root,p),'utf8');
const layoutMod={exports:{}};
new Function('exports','module',ts.transpileModule(source('core/profile-frame-layout.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(layoutMod.exports,layoutMod);
const borderMod={exports:{}};
new Function('exports','module','require',ts.transpileModule(source('core/abyssal-border-motion.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(borderMod.exports,borderMod,id=>id==='./profile-frame-layout'?layoutMod.exports:id==='./abyssal-showcase-layout'?mod.exports:require(id));
const {abyssalBorderTracks,ABYSSAL_BORDER_PHASE:BP,ABYSSAL_BORDER_NODE_BUDGET:NB}=borderMod.exports;
assert.deepEqual(NB,{standard:6,showcase:8});
assert.deepEqual(abyssalBorderTracks(0,0),[]);
assert.deepEqual(abyssalBorderTracks(NaN,205),[]);
for(const showcase of [false,true]){
 for(const [w,h] of showcase?[[320,320*205/340],[340,205],[390,390*205/340],[480,480*205/340]]:[[44,44],[104,72],[260,174],[340,205],[480,270]]){
  const q=Math.min(1,w/300,h/205),k=w/340,side=showcase?28*k:18*q,rail=showcase?34*k:24*q;
  const tracks=abyssalBorderTracks(w,h,showcase,false),full=abyssalBorderTracks(w,h,showcase,true);
  assert.equal(tracks.length,showcase?NB.showcase:NB.standard);
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
  const left=tracks[0],right=tracks[1];
  assert(Math.max(...left.y)-Math.min(...left.y)>.4*h);
  assert.notDeepEqual(left.opacity,right.opacity);
  if(showcase)assert(full.some((u,i)=>u.opacity.some((a,j)=>a>tracks[i].opacity[j])));
 }
}
const borderLayer=source('components/profile/AbyssalBorderLight.tsx');
assert(!borderLayer.includes('Animated.loop(')&&!borderLayer.includes('setInterval('));
assert(borderLayer.includes('pointerEvents="none"')&&borderLayer.includes('running?<AbyssalBorderLight'));
console.log('PASS: Abyssal tidal border parity, protected geometry, full-set intensity and native lifecycle');
