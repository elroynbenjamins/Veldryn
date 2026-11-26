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
