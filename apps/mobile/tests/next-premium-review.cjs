const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
function load(name){
 const src=fs.readFileSync(path.join(__dirname,'../src/core',name+'.ts'),'utf8'),mod={exports:{}};
 new Function('exports','module','require',ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(mod.exports,mod,require);
 return mod.exports;
}
const m=load('next-premium-motion-review'),c=load('next-premium-set-review');
let checks=0;
assert.equal(m.ORNAMENT_PHASE.length,97);
assert.equal(c.NEXT_PREMIUM_STAGE.loopMs,24000);
for(const set of c.NEXT_PREMIUM_SETS){
 const b=c.nextPremiumBoxes(set);
 assert(b.pet.x+b.pet.w<=b.identity.x||b.identity.x+b.identity.w<=b.pet.x);
 assert(c.nextPremiumPair(set,set.background,set.border));
 assert(!c.nextPremiumPair(set,set.background,'wrong'));
 assert.equal(c.nextPremiumPetMode(set,set.pet,false),'matching');
 assert.equal(c.nextPremiumPetMode(set,'other',true),'alternate');
 assert.equal(c.nextPremiumPetMode(set,'other',false),'none');
 for(const [width,scale,expected] of [[319,1,false],[320,1,true],[480,1.05,true],[481,1,false],[340,1.06,false],[NaN,1,false]])assert.equal(c.nextPremiumStageSupported(width,scale),expected);
 for(const showcase of [false,true])for(const full of [false,true]){
  const tracks=m.nextPremiumOrnamentTracks(set.motion,showcase,full);
  assert.equal(tracks.length,showcase?8:6);
  for(const {frames,radius} of tracks){
   assert.deepEqual(frames[0],frames.at(-1));
   for(let i=1;i<frames.length;i++)for(let j=0;j<=10;j++){
    const a=frames[i-1],b=frames[i],t=j/10;
    const f=Object.fromEntries(Object.keys(a).map(k=>[k,a[k]+(b[k]-a[k])*t]));
    assert(m.nextPremiumOrnamentFits(f,radius));
    assert(f.opacity>=0&&f.opacity<=1&&f.scale>=1&&f.scale<=1.12+1e-9);
    checks+=2;
   }
  }
 }
}
assert.notDeepEqual(m.nextPremiumOrnamentTracks('petal-waltz',true,true),m.nextPremiumOrnamentTracks('thunder-pulse',true,true));
console.log('Next premium review: '+checks+' interpolated bounds and opacity/scale assertions passed.');

let calibratedChecks=0;
for(const mode of ['standard','showcase'])for(const full of [false,true]){
 const tracks=m.sakuraV2OrnamentTracks(mode,full),a=m.SAKURA_V2_ANCHORS[mode];
 assert.equal(tracks.length,mode==='showcase'?8:6);
 for(const [idx,{frames,radius}] of tracks.entries()){
  assert.deepEqual(frames[0],frames.at(-1));
  if(idx>=2){const [x,y]=a.fixed[idx-2];assert.equal(frames[0].x,x*340/a.width);assert.equal(frames[0].y,y*205/a.height);}
  for(let i=1;i<frames.length;i++)for(let j=0;j<=10;j++){
   const a=frames[i-1],b=frames[i],t=j/10;
   const f=Object.fromEntries(Object.keys(a).map(k=>[k,a[k]+(b[k]-a[k])*t]));
   assert(m.nextPremiumOrnamentFits(f,radius));
   assert(f.opacity>=0&&f.opacity<=1&&f.scale>=1&&f.scale<=1.12+1e-9);
   calibratedChecks+=2;
  }
 }
}
assert.notDeepEqual(m.sakuraV2OrnamentTracks('standard',false)[2].frames,m.sakuraV2OrnamentTracks('showcase',false)[2].frames);
console.log('Sakura V2 calibration: '+calibratedChecks+' interpolated bounds and opacity/scale assertions passed.');

let stormChecks=0;
for(const mode of ['standard','showcase'])for(const full of [false,true]){
 const tracks=m.stormforgedV2OrnamentTracks(mode,full),a=m.STORMFORGED_V2_ANCHORS[mode];
 assert.equal(tracks.length,mode==='showcase'?8:6);
 for(const [idx,{frames,radius}] of tracks.entries()){
  assert.deepEqual(frames[0],frames.at(-1));
  if(idx>=2){const [x,y]=a.fixed[idx-2];assert.equal(frames[0].x,x*340/a.width);assert.equal(frames[0].y,y*205/a.height);}
  for(let i=1;i<frames.length;i++)for(let j=0;j<=10;j++){
   const a=frames[i-1],b=frames[i],t=j/10;
   const f=Object.fromEntries(Object.keys(a).map(k=>[k,a[k]+(b[k]-a[k])*t]));
   assert(m.nextPremiumOrnamentFits(f,radius));
   assert(f.opacity>=0&&f.opacity<=1&&f.scale>=1&&f.scale<=1.12+1e-9);
   stormChecks+=2;
  }
 }
}
assert.notDeepEqual(m.stormforgedV2OrnamentTracks('standard',false)[2].frames,m.stormforgedV2OrnamentTracks('showcase',false)[2].frames);
console.log('Stormforged V2 calibration: '+stormChecks+' interpolated bounds and opacity/scale assertions passed.');

const env=load('next-premium-environment-review');
let envChecks=0;
assert.equal(env.NEXT_ENVIRONMENT_PHASE.length,97);
for(const theme of ['petal-waltz','thunder-pulse'])for(const full of [false,true]){
 const tracks=env.nextPremiumEnvironmentTracks(theme,full);
 assert.equal(tracks.length,6);
 const moving=tracks.slice(0,4);
 assert(moving.some(t=>t.frames.slice(0,9).some(p=>Math.hypot(p.x-t.frames[0].x,p.y-t.frames[0].y)>=8&&p.opacity>=.25)),'visible movement within two seconds');
 for(const {radius,frames} of tracks){
  assert.deepEqual(frames[0],frames.at(-1));
  for(let i=1;i<frames.length;i++)for(let j=0;j<=10;j++){
   const a=frames[i-1],b=frames[i],t=j/10;
   const f=Object.fromEntries(Object.keys(a).map(k=>[k,a[k]+(b[k]-a[k])*t]));
   assert(env.nextPremiumEnvironmentFits(f,radius));
   assert(f.opacity>=0&&f.opacity<=.68&&f.scale>=1&&f.scale<=1.15+1e-9);
   assert(Math.abs(f.rotate)<=25);
   envChecks+=3;
  }
 }
}
assert.notDeepEqual(env.nextPremiumEnvironmentTracks('petal-waltz',true),env.nextPremiumEnvironmentTracks('thunder-pulse',true));
console.log('Next premium environment: '+envChecks+' interpolated safety assertions passed.');

for(const theme of ['petal-waltz','thunder-pulse']){
 const tracks=env.nextPremiumEnvironmentTracks(theme,true);
 const a=env.NEXT_PREMIUM_ENVIRONMENT_ANCHORS[theme];
 for(const [kind,xy] of Object.entries(a)){
  const track=tracks.find(t=>t.kind===kind);assert(track);
  assert(track.frames.every(f=>f.x===xy[0]&&f.y===xy[1]),'fixed wide artwork landmark');
 }
}

const sig=load('next-premium-signature-review');
let signatureChecks=0;
for(const theme of ['petal-waltz','thunder-pulse']){
 for(const layer of ['border','environment']){
  const base=layer==='border'?(theme==='petal-waltz'?m.sakuraV2OrnamentTracks('showcase',true):m.stormforgedV2OrnamentTracks('showcase',true)):env.nextPremiumEnvironmentTracks(theme,true);
  const accented=sig.nextPremiumSignatureTracks(theme,base,layer,true);
  assert.equal(accented.length,base.length);assert.equal(sig.nextPremiumSignatureTracks(theme,base,layer,false),base);
  assert(accented.some((track,k)=>track.frames.some((f,i)=>f.opacity>base[k].frames[i].opacity+.01)));
  for(const [k,track] of accented.entries()){
   assert.deepEqual(track.frames[0],track.frames.at(-1));
   for(const [i,f] of track.frames.entries()){
    const original=base[k].frames[i];
    assert.deepEqual({...f,opacity:0},{...original,opacity:0});
    const cap=layer==='border'?.84:track.kind==='haze'?.10:track.kind==='light'?.23:theme==='petal-waltz'?.68:.52;
    assert(f.opacity>=original.opacity-1e-9&&f.opacity<=cap+1e-9);
    assert(layer==='border'?m.nextPremiumOrnamentFits(f,track.radius):env.nextPremiumEnvironmentFits(f,track.radius));
    signatureChecks+=3;
   }
  }
 }
 assert(sig.nextPremiumSignatureEnvelope(theme,2/24,2,'border')>.3,'early signature crest response');
 const cfg=sig.NEXT_PREMIUM_REACTION[theme];
 assert(cfg.duration>=600&&cfg.duration<=1000);
 assert.deepEqual([cfg.lift[0],cfg.scale[0],cfg.tilt[0]],[0,1,0]);
 assert.deepEqual([cfg.lift.at(-1),cfg.scale.at(-1),cfg.tilt.at(-1)],[0,1,0]);
 for(let i=1;i<cfg.phase.length;i++){
  assert(cfg.phase[i]>cfg.phase[i-1]);
  assert(cfg.lift[i]>=-2.3&&cfg.lift[i]<=0&&cfg.scale[i]>=1&&cfg.scale[i]<=1.035&&Math.abs(cfg.tilt[i])<=3);
 }
}
assert.notEqual(sig.NEXT_PREMIUM_REACTION['petal-waltz'].duration,sig.NEXT_PREMIUM_REACTION['thunder-pulse'].duration);
assert.equal(sig.nextPremiumSignatureEnvelope('petal-waltz',NaN,0,'border'),0);
console.log('Next premium signature: '+signatureChecks+' sample geometry/opacity assertions passed.');
