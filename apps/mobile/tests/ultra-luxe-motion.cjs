const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.join(__dirname,'../src');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const source=read('core/ultra-luxe-motion.ts');
const mod={exports:{}};
new Function('exports','module','require',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(mod.exports,mod,require);
const {ULTRA_LUXE_CYCLE_MS,SIGNATURE_PHASE,SIGNATURE_ENERGY,RAIL_PATH,LOOP_PHASE,ORBIT_X,ORBIT_Y,FX_POINTS,shiftClosed}=mod.exports;
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
const fx=read('components/profile/UltraLuxeMotion.tsx');
assert(!fx.includes('Animated.loop('),'effect layers must not create their own clocks');
assert(fx.includes('pointerEvents="none"')&&fx.includes('importantForAccessibility="no-hide-descendants"'));
for(const name of ['CelestialSovereignPreview','DraconicDominionPreview']){
 const s=read('components/profile/'+name+'.tsx');
 assert(s.includes('duration:ULTRA_LUXE_CYCLE_MS')&&s.includes('useNativeDriver:true'));
 assert(s.includes('loop.stop()')&&s.includes('reduceMotion')&&s.includes('foreground'));
 const environment=s.indexOf('<UltraLuxeEnvironment'),pet=s.indexOf(name.startsWith('Celestial')?"{petMode==='matching'":"{mode==='matching'"),aura=s.indexOf('<UltraLuxePetAura');
 assert(environment>=0&&environment<pet&&pet<aura,'environment is independent; matching aura follows pet condition');
 assert(s.includes('<UltraLuxeRail'));
}
console.log('Ultra Luxe shared timing, closed paths, native-driver and pet-independent layer contracts passed.');
