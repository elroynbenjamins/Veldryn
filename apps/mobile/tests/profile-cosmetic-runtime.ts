import {profileSceneBorderZones,profileSceneGlowBounds,profileSceneArtworkGlowBounds,profileFrameSegments} from '../src/core/profile-frame-layout';
import {sampleCosmeticTrack,cosmeticGlowOpacity,periodicCosmeticPhase,cosmeticViewportVisible} from '../src/core/profile-cosmetic-motion-v2';
import {PROFILE_COSMETIC_RUNTIME,profileCosmeticRuntimeByBorder,profileCosmeticRuntimeByEffect,usesArtworkGlowAnchors} from '../src/theme/profile-cosmetic-runtime-v1';
function fail(message:string):never{throw new Error(message)}
function ok(value:unknown,message:string){if(!value)fail(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(message+': expected '+String(expected)+', got '+String(actual))}
equal(PROFILE_COSMETIC_RUNTIME.length,8,'four standard and four Ascendant animated profile collections');
equal(new Set(PROFILE_COSMETIC_RUNTIME.map(r=>r.borderId)).size,8,'border ids are unique');
ok(PROFILE_COSMETIC_RUNTIME.every(r=>r.borderId!==r.fallbackBorderId),'animated product border ids never reuse exclusive reward ids');
const standard=PROFILE_COSMETIC_RUNTIME.filter(r=>['gloamward','frostbound','amberglass','briarbound'].includes(r.motionProfile));
ok(standard.filter(r=>r.motionProfile!=='gloamward').every(r=>r.fallbackBorderId.startsWith('dungeon:')),'standard dungeon reward art is fallback-only, never the product identity');
equal(new Set(PROFILE_COSMETIC_RUNTIME.map(r=>r.effectId)).size,8,'effect ids are unique');
for(const row of PROFILE_COSMETIC_RUNTIME){
 ok(row.tracks.length>=5&&row.tracks.length<=12,row.collection+' keeps motion subtle');
 ok(row.glows.length>=6&&row.glows.length<=12,row.collection+' has staggered border lights');
 ok(row.tracks.some(t=>t.points.some(([x,y])=>x>.82&&y<.38)),row.collection+' uses the approved upper-right empty space');
 equal(profileCosmeticRuntimeByBorder.get(row.borderId),row,row.collection+' resolves by border');
 equal(profileCosmeticRuntimeByEffect.get(row.effectId),row,row.collection+' resolves by effect');
}
const kinds=new Map(PROFILE_COSMETIC_RUNTIME.map(r=>[r.motionProfile,new Set(r.tracks.map(t=>t.particle))]));
ok(kinds.get('frostbound')?.has('snowflake'),'Frostbound uses snowflakes');
ok(kinds.get('amberglass')?.has('ember'),'Amberglass uses embers');
ok(kinds.get('briarbound')?.has('leaf')&&kinds.get('briarbound')?.has('firefly'),'Briarbound uses leaves and fireflies');
ok(kinds.get('gloamward')?.has('arcane'),'Gloamward uses arcane sparks');
ok(kinds.get('celestial')?.has('arcane'),'Celestial Sovereign uses celestial arcane motes');
ok(kinds.get('draconic')?.has('ember'),'Draconic Dominion uses embers');
ok(kinds.get('abyssal')?.has('firefly'),'Abyssal Majesty uses slow bioluminescent motes');
ok(kinds.get('paradox')?.has('arcane')&&kinds.get('paradox')?.has('snowflake'),'Paradox Eternal mixes fractured arcane and crystalline motes');
console.log('PASS: eight native cosmetic runtimes retain unique particles, placement and bounded motion');

 // Real authored tracks and glow periods must have identical endpoints on the native clock.
for(const row of PROFILE_COSMETIC_RUNTIME){
 for(const t of row.tracks){
  for(const [w,h] of [[104,72],[260,174],[340,205],[480,270]]){
   const a=sampleCosmeticTrack(t,0,w,h),b=sampleCosmeticTrack(t,1,w,h);
   for(const key of ['x','y','width','height','opacity','rotation'] as const) equal(a[key],b[key],row.collection+' closes particle '+key);
  }
 }
 for(const g of row.glows){
  equal(cosmeticGlowOpacity(row.motionProfile,0,g.periodMs,g.phaseMs,g.peakOpacity),cosmeticGlowOpacity(row.motionProfile,1,g.periodMs,g.phaseMs,g.peakOpacity),row.collection+' closes glow');
  equal(cosmeticGlowOpacity(row.motionProfile,0,g.periodMs,g.phaseMs,g.peakOpacity,true),cosmeticGlowOpacity(row.motionProfile,1,g.periodMs,g.phaseMs,g.peakOpacity,true),row.collection+' closes lantern glow');
 }
}
for(const cycles of [.75,.9,1,1.25,1.4,3.75,5]){
 let prior=0;
 for(let i=1;i<=120;i++){
  const p=periodicCosmeticPhase(i/120,cycles);
  const delta=(p-prior+1)%1;
  ok(delta>0&&delta<.1,'authored tempo remains forward and bounded');
  prior=p;
 }
}
console.log('PASS: particle and glow loop endpoints match across all collections and viewport sizes');

const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
const motionSource=fs.readFileSync('src/components/ProfileCosmeticMotion.tsx','utf8');
const stageSource=fs.readFileSync('src/components/profile/ProfileStage.tsx','utf8');
const audienceSource=fs.readFileSync('src/components/ProfileAudiencePreviewModal.tsx','utf8');
const publicSource=fs.readFileSync('src/components/PublicProfileScene.tsx','utf8');
ok(motionSource.includes("if(!enabled)return;setForeground"),'inactive and static layers skip AppState subscriptions');
ok(motionSource.includes('const staticItems=useMemo')&&motionSource.includes('()=>!enabled?[]:runtime.tracks.map'),'static effects skip native interpolation graphs');
ok(motionSource.includes('const glows=useMemo'),'procedural glow interpolation is memoized');
const collapsed=stageSource.slice(stageSource.indexOf('if(collapsed)return'),stageSource.indexOf('return <View style={s.root}>'));
ok(collapsed.includes('active reduceMotion')&&!collapsed.includes('reduceMotion={state.settings.reduceMotion}/>:effectRuntime'),'collapsed strip uses static effects');
ok(audienceSource.includes('cosmeticsActive={visible&&cosmeticViewport.visible}')&&publicSource.includes('const active=cosmeticsActive&&(stageActive??true)&&(review?.active??true)')&&publicSource.includes('active={active} reduceMotion={reduceMotion}'),'hidden audience preview stops cosmetics');
console.log('PASS: cosmetic idle and static rendering contract');

for(const [top,height,scroll,viewport,expected] of [
 [0,0,0,200,false],[0,180,0,0,false],[0,180,0,200,true],
 [0,180,179,200,true],[0,180,180,200,false],[250,180,0,250,false],
 [250,180,1,250,true],[250,180,430,100,false],[-20,180,0,200,true],
 [0,180,-30,200,true],[0,180,NaN,200,false],
] as const)equal(cosmeticViewportVisible(top,height,scroll,viewport),expected,'scroll viewport intersection');
for(const row of standard){
 for(const [width,height] of [[104,72],[260,174],[340,205],[480,270],[640,360]]){
  const zones=profileSceneBorderZones(width,height);
  for(const g of row.glows){
   const box=profileSceneGlowBounds(width,height,g.x,g.y,g.size);
   ok(!!box,row.collection+' glow fits border stencil');
   if(!box)continue;
   ok(zones.some(z=>box.x>=z.x-.001&&box.y>=z.y-.001&&box.x+box.width<=z.x+z.width+.001&&box.y+box.height<=z.y+z.height+.001),row.collection+' glow remains fully inside border zone');
  }
 }
}
ok(motionSource.includes('if(next!==last.current)')&&audienceSource.includes('onScroll={cosmeticViewport.onScroll}'),'scroll visibility only updates on crossings');
ok(motionSource.includes('profileSceneGlowBounds(size.width,size.height'),'procedural glows use the safe frame stencil');
console.log('PASS: standard cosmetic glow clipping and scroll viewport boundary regressions');

ok(motionSource.includes('Animated.timing(entryOpacity,{toValue:1,duration:180')&&motionSource.includes('entry.stop();loop.stop()'),'entry fade is native and stopped with the main clock');
for(const name of ['AnimatedProfileBorderGlows','ProfileCosmeticExteriorMatte','ProfileSceneEffect','ProceduralProfileBorderGlows','ProceduralProfileSceneEffect']){
 ok(motionSource.includes('export const '+name+'=memo(function '+name),'cosmetic layer has a stable memoized boundary: '+name);
}
ok(motionSource.includes('if(!pieces.length)return []')&&motionSource.includes('left:box.left-left,top:box.top-top'),'sprite glows composite only their clipped footprint');
const selfSource=fs.readFileSync('src/components/ProfileScenePreview.tsx','utf8');
ok(publicSource.includes('runtimeFallbackBorderId??(review?reviewBorderId:renderBorderId)')&&selfSource.includes('borderRuntime?.fallbackBorderId??renderBorderId')&&stageSource.includes('borderRuntime?.fallbackBorderId??character.profileBorderId'),'fallback artwork uses its actual aperture calibration in all three scene renderers');
console.log('PASS: cosmetic re-entry, memo boundaries, clipped compositing and fallback aperture contract');


 // Standard animation visibility budget: no new moving nodes, bigger bounded sprites,
 // stronger sustained glows and unchanged loop/viewport behavior.
const oldPulsePowers={gloamward:4,frostbound:6,amberglass:2,briarbound:1} as const;
for(const row of standard){
 const oldPower=oldPulsePowers[row.motionProfile as keyof typeof oldPulsePowers];
 equal(row.tracks.length,5,row.collection+' preserves particle count');
 equal(row.glows.length,8,row.collection+' preserves border light count');
 ok(row.tracks.every(t=>t.opacity>=.35&&t.opacity<=.78&&t.maxDp<=18),row.collection+' keeps authored particle opacity and size bounded');
 for(const g of row.glows){
  equal(g.peakOpacity,.86,row.collection+' has brighter border accents');
  let before=0,after=0;
  for(let i=0;i<=120;i++){
   const clock=i/120;
   const phase=periodicCosmeticPhase(clock,12000/g.periodMs,g.phaseMs/g.periodMs);
   before+=.72*(Math.sin(Math.PI*phase)**2)**oldPower;
   const value=cosmeticGlowOpacity(row.motionProfile,clock,g.periodMs,g.phaseMs,g.peakOpacity);
   ok(value>=0&&value<=g.peakOpacity,row.collection+' glow remains bounded');
   after+=value;
  }
  ok(after>before*1.15,row.collection+' increases average glow visibility');
 }
 for(const t of row.tracks){
  for(const [w,h] of [[104,72],[260,174],[340,205],[480,270]]){
   for(let i=0;i<=120;i++){
    const p=sampleCosmeticTrack(t,i/120,w,h);
    ok(p.x>=-1e-6&&p.y>=-1e-6&&p.x+p.width<=w+1e-6&&p.y+p.height<=h+1e-6,row.collection+' larger particles stay inside scene');
   }
  }
 }
}
console.log('PASS: standard cosmetic visibility improves without adding animation nodes or exceeding scene bounds');

 // Each authored ornament maps through the actual responsive frame segments.
for(const row of PROFILE_COSMETIC_RUNTIME){
 equal(usesArtworkGlowAnchors(row.motionProfile),standard.includes(row),row.collection+' keeps premium anchor behavior unchanged');
 if(!usesArtworkGlowAnchors(row.motionProfile))continue;
 for(const [w,h] of [[104,72],[260,174],[340,205],[480,270],[640,360]]){
  const zones=profileSceneBorderZones(w,h);
  for(const g of row.glows){
   const d=Math.min(g.size,Math.max(4,w*.035));
   const box=profileSceneArtworkGlowBounds(w,h,g.x,g.y,d);
   ok(box,row.collection+' ornament maps to a frame segment');
   if(!box)continue;
   ok(zones.some(z=>box.x>=z.x-.001&&box.y>=z.y-.001&&box.x+box.width<=z.x+z.width+.001&&box.y+box.height<=z.y+z.height+.001),row.collection+' mapped ornament stays in perimeter');
   const p=profileFrameSegments(w,h).find(s=>{const x=g.x*s.imageWidth+s.imageLeft,y=g.y*s.imageHeight+s.imageTop;return x>=-1e-6&&y>=-1e-6&&x<=s.width+1e-6&&y<=s.height+1e-6});
   if(!p)fail(row.collection+' ornament has no source segment');
   const expected=profileSceneGlowBounds(w,h,(p.x+g.x*p.imageWidth+p.imageLeft)/w,(p.y+g.y*p.imageHeight+p.imageTop)/h,d);
   ok(expected&&(['x','y','width','height'] as const).every(key=>Math.abs(box[key]-expected[key])<1e-6),row.collection+' glow follows the same artwork transform');
  }
 }
}
equal(profileSceneArtworkGlowBounds(340,205,.5,.5,8),null,'transparent interior cannot host border glows');
equal(profileSceneArtworkGlowBounds(340,205,-.1,.1,8),null,'out-of-source coordinates rejected');
console.log('PASS: standard frame ornament anchors follow responsive art and preserve safe clipping');
