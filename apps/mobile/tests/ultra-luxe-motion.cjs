const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.join(__dirname,'../src');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const source=read('core/ultra-luxe-motion.ts');
const mod={exports:{}};
new Function('exports','module','require',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(mod.exports,mod,require);
const {ULTRA_LUXE_CYCLE_MS,SIGNATURE_PHASE,SIGNATURE_ENERGY,RAIL_PATH,LOOP_PHASE,ORBIT_X,ORBIT_Y,FX_POINTS,shiftClosed,PET_IDLE_PHASE,PET_IDLE_POSES}=mod.exports;
assert.equal(ULTRA_LUXE_CYCLE_MS,24000);
assert.equal(SIGNATURE_PHASE.length,SIGNATURE_ENERGY.length);
assert.deepEqual(SIGNATURE_PHASE,[0,8/24,14/24,16/24,19/24,1]);
assert.equal(SIGNATURE_ENERGY[0],0);assert.equal(SIGNATURE_ENERGY.at(-1),0);
assert.equal(SIGNATURE_ENERGY[3],1);
for(const path of [RAIL_PATH,ORBIT_X,ORBIT_Y]){
 assert.equal(path.length,LOOP_PHASE.length);
 assert.deepEqual(path[0],path.at(-1));
 for(let i=0;i<8;i++){const shifted=shiftClosed(path,i);assert.equal(shifted.length,9);assert.deepEqual(shifted[0],shifted.at(-1));}
}
for(const [x,y] of RAIL_PATH)assert(x<=26||x>=314||y<=12||y>=190,'rail stays outside the identity and guild slots');
for(const points of Object.values(FX_POINTS)){assert(points.length<=8);for(const [x,y] of points)assert(x>=0&&x<=340&&y>=0&&y<=205);}
assert.equal(PET_IDLE_PHASE.length,97);
for(const kind of ['celestial','draconic','alternate']){
 const frames=PET_IDLE_POSES[kind];
 assert.equal(frames.length,PET_IDLE_PHASE.length);
 assert.deepEqual(frames[0],frames.at(-1));
 assert(frames.some(p=>p.lift<-.8)&&frames.some(p=>p.scaleY>1.01));
 if(kind==='draconic')assert(frames.every(p=>Math.abs(p.tilt)<=.5&&p.scaleX<=1.006&&p.scaleY<=1.014&&p.lift>=-1.3));
 else assert(frames.some(p=>Math.abs(p.tilt)>1));
 for(const p of frames){
  assert(p.lift>=-5&&p.lift<=0);
  assert(p.scaleX>=1&&p.scaleX<=1.03&&p.scaleY>=1&&p.scaleY<=1.04);
  assert(Math.abs(p.tilt)<=4.1&&p.glow>=0&&p.glow<=1);
 }
}
const fx=read('components/profile/UltraLuxeMotion.tsx');
for(const name of ['soft_glow','drifting_haze']){
 const asset=fs.readFileSync(path.join(root,'../assets/ascendant/shared',name+'.webp'));
 assert.equal(asset.subarray(0,4).toString(),'RIFF');
 assert.equal(asset.subarray(8,12).toString(),'WEBP');
 assert(asset.length<2048,'shared effect texture budget');
 assert(fx.includes(name+'.webp'));
}
assert(!fx.includes('Animated.loop('),'effect layers must not create their own clocks');
assert(fx.includes('pointerEvents="none"')&&fx.includes('importantForAccessibility="no-hide-descendants"'));
for(const name of ['CelestialSovereignPreview','DraconicDominionPreview']){
 const s=read('components/profile/'+name+'.tsx');
 assert(s.includes('duration:ULTRA_LUXE_CYCLE_MS')&&s.includes('useNativeDriver:true'));
 assert(s.includes('loop.stop()')&&s.includes('useCosmeticMotionPolicy(')&&!s.includes('AppState.addEventListener')&&!s.includes('AccessibilityInfo.addEventListener'));
 const environment=s.indexOf('<UltraLuxeEnvironment'),pet=s.indexOf(name.startsWith('Celestial')?"{petMode==='matching'":"{mode==='matching'"),aura=s.indexOf('<UltraLuxePetAura');
 assert(environment>=0&&environment<pet&&pet<aura,'environment is independent; matching aura follows pet condition');
 assert(s.includes('<UltraLuxeRail'));
 assert(s.includes('petIdleMotion(clock,')&&s.includes('idle.scaleY')&&s.includes('idle.tilt')&&s.includes('idle.lift'));
 assert(s.includes('<Animated.Image source={alternatePetSource}'));
}
const reaction=read('components/profile/UltraLuxePetReaction.tsx');
assert(reaction.includes('if(!enabled||playing.current)return'));
assert(reaction.includes('reaction.stopAnimation()')&&reaction.includes('reaction.setValue(0)'));
assert(reaction.includes('useNativeDriver:true')&&!reaction.includes('Animated.loop(')&&!reaction.includes('setInterval'));
for(const name of ['CelestialSovereignPreview','DraconicDominionPreview']){
 const source=read('components/profile/'+name+'.tsx');
 assert(source.includes('useUltraLuxePetReaction(reactionEnabled)')&&source.includes('onPress={trigger}'));
 assert(source.includes("reactionEnabled=running&&"));
}
console.log('Ultra Luxe shared timing, closed paths, native-driver and pet-independent layer contracts passed.');

for(const name of ['CelestialSovereignPreview','DraconicDominionPreview']){
 const s=read('components/profile/'+name+'.tsx');
 for(const layer of ['UltraLuxeEnvironment','UltraLuxeRail','UltraLuxePetAura'])assert(s.includes('{running?<'+layer),'inactive scene must not mount '+layer);
 assert(s.includes('{running&&fullSet?<UltraLuxeAscendantFlourish'));
 assert(s.includes('{reactionEnabled?<UltraLuxePetReaction'));
 assert(s.includes('fullSet={fullSet} active={running}'));
 assert(s.includes('useMemo(()=>petIdleMotion(clock,'));
}
assert(read('components/profile/UltraLuxeIdentityMotion.tsx').includes('active?{clock,fullSet}:null'));
console.log('Inactive and reduced-motion layers remain static; verified identity motion is disabled.');

const {SIGNATURE_CURVE_PHASE:cp,SIGNATURE_CURVE_ENERGY:ce,SIGNATURE_TITLE_OPACITY:to,SIGNATURE_BADGE_OPACITY:bo,SIGNATURE_BADGE_SCALE:bs,SIGNATURE_PARTIAL_BADGE_SCALE:ps}=mod.exports;
assert.equal(cp.length,21);assert.equal(cp.length,ce.length);
for(let i=0;i<SIGNATURE_PHASE.length;i++){assert.equal(cp[i*4],SIGNATURE_PHASE[i]);assert.equal(ce[i*4],SIGNATURE_ENERGY[i]);}
for(let i=1;i<cp.length;i++){assert(cp[i]>cp[i-1]);assert(ce[i]>=0&&ce[i]<=1);}
for(const [curve,min,max] of [[to,.96,1],[bo,.92,1],[bs,1,1.09],[ps,1,1.04]]){
 assert.equal(curve.length,cp.length);assert.equal(curve[0],curve.at(-1));
 assert(curve.every(v=>v>=min-1e-10&&v<=max+1e-10));assert(Math.abs(curve[12]-max)<1e-10);
}
for(const layer of ['UltraLuxeEnvironment','UltraLuxeRail','UltraLuxePetAura','UltraLuxeAscendantFlourish'])assert(fx.includes('export const '+layer+'=memo('));
assert(read('components/profile/UltraLuxeIdentityMotion.tsx').includes('outputRange:SIGNATURE_TITLE_OPACITY'));
assert(read('components/PlayerBadges.tsx').includes('outputRange:SIGNATURE_BADGE_OPACITY'));
console.log('Eased native signature, synchronized readable title/badge and memoized layers passed.');

const {AWAKENING_PHASE,AWAKENING_ENERGY,AWAKENING_CURVES,AWAKENING_PET_LIFT}=mod.exports;
assert.equal(AWAKENING_PHASE[0],0);assert.equal(AWAKENING_PHASE.at(-1),1);
for(const theme of ['celestial','draconic']){
 const {phase,energy}=AWAKENING_CURVES[theme],anchors=AWAKENING_ENERGY[theme];
 assert.equal(anchors.length,AWAKENING_PHASE.length);
 assert.equal(phase.length,(anchors.length-1)*4+1);
 assert.equal(energy.length,phase.length);
 assert.equal(energy[0],0);assert.equal(energy.at(-1),0);
 assert.equal(Math.max(...energy),1);
 assert(anchors[2]>=.4,'visible early signature within four seconds');
 for(let i=0;i<anchors.length;i++){assert.equal(phase[i*4],AWAKENING_PHASE[i]);assert.equal(energy[i*4],anchors[i]);}
 for(let i=1;i<phase.length;i++){assert(phase[i]>phase[i-1]);assert(energy[i]>=0&&energy[i]<=1);}
 assert(AWAKENING_PET_LIFT[theme]>0&&AWAKENING_PET_LIFT[theme]<=7);
}
assert.notDeepEqual(AWAKENING_CURVES.celestial.energy,AWAKENING_CURVES.draconic.energy);
assert(AWAKENING_PET_LIFT.celestial>AWAKENING_PET_LIFT.draconic);
assert(fx.includes('AWAKENING_CURVES[theme]')&&fx.includes('awakeningEnergy(clock,theme)'));
for(const [name,theme] of [['CelestialSovereignPreview','celestial'],['DraconicDominionPreview','draconic']]){
 const s=read('components/profile/'+name+'.tsx');
 assert(s.includes("awakeningEnergy(clock,'"+theme+"')"));
 assert(s.includes('signatureLift')&&s.includes('Animated.add('));
 assert.equal((s.match(/Animated.loop\(/g)||[]).length,1,'one ambient native clock per preview');
}
console.log('Distinct awakening envelopes, early signature, smooth closed loop and bounded matching-pet lift passed.');

const {PET_REACTION_TRAJECTORIES,PET_REACTION_GLOW}=mod.exports;
for(const theme of ['celestial','draconic']){
 const tracks=PET_REACTION_TRAJECTORIES[theme],cx=theme==='celestial'?279:266,cy=theme==='celestial'?99:108;
 assert.equal(tracks.length,3);
 for(const p of tracks){
  for(const progress of [0,.25,.5,.75,1]){
   const x=cx+p.x+p.dx*progress,y=cy+p.y+p.dy*progress;
   assert(x-4>=234&&x+4<=330&&y-4>=24&&y+4<=175,'reaction must stay in pet-side artwork zone');
  }
 }
 assert(PET_REACTION_GLOW[theme].opacity<=1&&PET_REACTION_GLOW[theme].scale<=1.4);
}
assert.notDeepEqual(PET_REACTION_TRAJECTORIES.celestial,PET_REACTION_TRAJECTORIES.draconic);
assert(reaction.includes('PET_REACTION_TRAJECTORIES[theme]')&&reaction.includes('memo(UltraLuxePetReactionLayer)'));
assert(reaction.includes('tracks.map((p,i)')&&!reaction.includes('Animated.loop('));
const badgeSource=read('components/PlayerBadges.tsx');
assert(badgeSource.includes('const badgeMotion=useMemo(')&&badgeSource.includes('opacity:halo'));
assert(badgeSource.includes('width:artSize,height:artSize,alignItems:'));
assert(fx.includes("theme==='celestial'?RAIL_PATH:[...RAIL_PATH].reverse()"));
assert(fx.includes('Animated.multiply(pulse(clock,offset),.55),Animated.multiply(energy,.45)'));
console.log('Identity geometry, distinct pet reactions and synchronized rail energy passed.');

const {CELESTIAL_ATLAS_LIFT,RAIL_GLOW_RADIUS,railGlowPoint,FRAME_ORNAMENTS}=mod.exports;
assert.equal(CELESTIAL_ATLAS_LIFT.length,PET_IDLE_PHASE.length);
assert.equal(CELESTIAL_ATLAS_LIFT[0],CELESTIAL_ATLAS_LIFT.at(-1));
assert(CELESTIAL_ATLAS_LIFT.every(v=>v>=-1.5&&v<=0));
assert.equal(Math.min(...CELESTIAL_ATLAS_LIFT),-1.5);
for(let i=1;i<CELESTIAL_ATLAS_LIFT.length;i++)assert(Math.abs(CELESTIAL_ATLAS_LIFT[i]-CELESTIAL_ATLAS_LIFT[i-1])<.30);
for(const point of RAIL_PATH){
 const [x,y]=railGlowPoint(point),r=RAIL_GLOW_RADIUS;
 assert(x-r>=0&&x+r<=340&&y-r>=0&&y+r<=205);
}
for(const theme of ['celestial','draconic']){
 for(const [x,y] of FRAME_ORNAMENTS[theme])assert(x>=0&&x+12<=340&&y>=0&&y+12<=205);
}
assert.notDeepEqual(FRAME_ORNAMENTS.celestial,FRAME_ORNAMENTS.draconic);
const celScene=read('components/profile/CelestialSovereignPreview.tsx'),dragonScene=read('components/profile/DraconicDominionPreview.tsx');
assert(celScene.includes('CELESTIAL_ATLAS_LIFT.map')&&celScene.includes('translateY:bodyLift'));
assert(dragonScene.indexOf('style={[box(B.ring),{opacity:ringGlow}]}')<dragonScene.indexOf('translateY:bodyLift'),'ground ring remains independent of moving dragon');
assert(celScene.includes('hitSlop={{top:10*scale')&&dragonScene.includes('hitSlop={{top:5*k'));
assert(fx.includes('path.map(railGlowPoint)')&&fx.includes('FRAME_ORNAMENTS[theme]'));
assert(read('components/profile/UltraLuxePetPoseSprite.tsx').includes('memo(UltraLuxePetPoseSpriteLayer)'));
console.log('Smooth atlas lift, grounded ring, frame glow bounds and stable sprite rendering passed.');

async function sharedMotionLifecycle(){
 const callbacks={},reads=[],counts={app:0,motion:0,removed:0};
 const fakeNative={
  Platform:{OS:'android'},
  AppState:{currentState:'active',addEventListener:(_event,fn)=>{counts.app++;callbacks.app=fn;return {remove:()=>counts.removed++};}},
  AccessibilityInfo:{addEventListener:(_event,fn)=>{counts.motion++;callbacks.motion=fn;return {remove:()=>counts.removed++};},isReduceMotionEnabled:()=>new Promise(resolve=>reads.push(resolve))},
 };
 let pendingSubscribe;
 const fakeReact={useSyncExternalStore:(subscribe,getSnapshot)=>{pendingSubscribe=subscribe;return getSnapshot();}};
 const motion={exports:{}};
 new Function('exports','module','require',ts.transpileModule(read('components/anim/motion.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(motion.exports,motion,name=>name==='react'?fakeReact:name==='react-native'?fakeNative:{});
 const {useCosmeticMotionPolicy:policy}=motion.exports;
 assert.equal(policy(false).running,false);
 const offInactive=pendingSubscribe(()=>{});assert.equal(counts.app,0);offInactive();
 assert.equal(policy(true,true).running,false);
 const offReduced=pendingSubscribe(()=>{});assert.equal(counts.motion,0);offReduced();
 assert.equal(policy(true).running,false,'Do not animate before the OS preference is known');
 const offA=pendingSubscribe(()=>{});policy(true);const offB=pendingSubscribe(()=>{});
 assert.equal(counts.app,1);assert.equal(counts.motion,1);assert.equal(reads.length,1);
 callbacks.motion(true);reads[0](false);await Promise.resolve();
 assert.equal(policy(true).running,false,'A late initial read cannot override a newer reduced-motion event');
 callbacks.motion(false);assert.equal(policy(true).running,true);
 fakeNative.AppState.currentState='background';callbacks.app('background');assert.equal(policy(true).running,false);
 fakeNative.AppState.currentState='active';callbacks.app('active');assert.equal(policy(true).running,true);
 offA();assert.equal(counts.removed,0);offB();assert.equal(counts.removed,2);
 assert.equal(policy(true).running,false,'A new subscription cannot animate from a stale preference');
 const offC=pendingSubscribe(()=>{});const oldCallback=callbacks.motion;offC();
 policy(true);const offD=pendingSubscribe(()=>{});oldCallback(false);reads[1](false);await Promise.resolve();
 assert.equal(policy(true).running,false,'An old subscription cannot enable a new stage');
 reads[2](false);await Promise.resolve();assert.equal(policy(true).running,true);
 offD();assert.equal(counts.removed,6);
 assert(read('components/anim/motion.ts').includes('useNativeDriver:LOOP_NATIVE_DRIVER,isInteraction:false'));
 console.log('Shared motion policy, subscription cleanup, foreground and preference race checks passed.');
}
sharedMotionLifecycle().catch(error=>{console.error(error);process.exitCode=1;});
