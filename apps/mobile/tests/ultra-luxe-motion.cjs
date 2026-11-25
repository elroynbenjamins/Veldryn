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
 assert(s.includes('loop.stop()')&&s.includes('reduceMotion')&&s.includes('foreground'));
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
