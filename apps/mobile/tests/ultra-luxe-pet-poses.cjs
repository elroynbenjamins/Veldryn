const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.join(__dirname,'../src');
const code=ts.transpileModule(fs.readFileSync(path.join(root,'core/ultra-luxe-pet-poses.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const mod={exports:{}};new Function('exports','module',code)(mod.exports,mod);
const {ULTRA_LUXE_POSE_ATLASES,poseAtlasTimeline,poseAtlasCell}=mod.exports;
for(const [theme,name] of [['celestial','CelestialSovereignPreview'],['draconic','DraconicDominionPreview']]){
 const a=ULTRA_LUXE_POSE_ATLASES[theme],{inputRange,frames}=poseAtlasTimeline(theme);
 assert.equal(a.rows*a.columns,a.frames);assert.equal(a.frames/a.seconds,12);assert.equal(a.seconds*a.cycles,24);
 assert.equal(inputRange.length,frames.length);assert.equal(inputRange[0],0);assert.equal(inputRange.at(-1),1);
 assert.equal(frames[0],0);assert.equal(frames.at(-1),0);assert.equal(new Set(frames).size,a.frames);
 for(let i=1;i<inputRange.length;i++)assert(inputRange[i]>inputRange[i-1]);
 for(const f of frames){const c=poseAtlasCell(f,theme);assert(c.column>=0&&c.column<a.columns&&c.row>=0&&c.row<a.rows);}
 for(let i=1;i<frames.length;i++)assert(frames[i]===frames[i-1]||frames[i]===(frames[i-1]+1)%a.frames);
 const s=fs.readFileSync(path.join(root,'components/profile',name+'.tsx'),'utf8');
 assert(s.includes('running&&assets.smoothPoseAtlas?')&&s.includes('<UltraLuxePetPoseSprite'),'inactive/reduced-motion scenes must not mount the decoded atlas');
 assert(s.includes('clock={clock}')&&s.includes('reduceMotion'));
}
const renderer=fs.readFileSync(path.join(root,'components/profile/UltraLuxePetPoseSprite.tsx'),'utf8');
assert(renderer.includes("overflow:'hidden'")&&!renderer.includes('Animated.loop(')&&!renderer.includes('setInterval'));
assert(renderer.includes('Animated.modulo(Animated.multiply(clock,ULTRA_LUXE_POSE_ATLASES[theme].cycles),1)'));
assert(renderer.includes('const [x,y]=useMemo')&&renderer.includes('[phase,theme,w,h]'),'keep interpolation graph stable across unrelated rerenders');
console.log('48-frame stag and 36-frame dragon: seamless idle timelines, bounded cells, 12fps and native clock contracts passed.');
