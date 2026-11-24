const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.join(__dirname,'../src');
const code=ts.transpileModule(fs.readFileSync(path.join(root,'core/ultra-luxe-pet-poses.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const mod={exports:{}};new Function('exports','module',code)(mod.exports,mod);
const {ULTRA_LUXE_POSE_ATLASES,poseAtlasTimeline,poseAtlasCell}=mod.exports;
const {inputRange,frames}=poseAtlasTimeline();
assert.equal(inputRange.length,frames.length);
assert.equal(inputRange[0],0);assert.equal(inputRange.at(-1),1);
assert.equal(frames[0],0);assert.equal(frames.at(-1),0);
assert.equal(new Set(frames).size,6);
for(let i=1;i<inputRange.length;i++)assert(inputRange[i]>inputRange[i-1]);
for(const f of frames){const c=poseAtlasCell(f);assert(c.column>=0&&c.column<3&&c.row>=0&&c.row<2);}
assert(frames.some((f,i)=>f===5&&inputRange[i]>=14/24&&inputRange[i]<=19/24));
for(const [theme,name] of [['celestial','CelestialSovereignPreview'],['draconic','DraconicDominionPreview']]){
 const a=ULTRA_LUXE_POSE_ATLASES[theme];assert.equal(a.rows*a.columns,6);
 const s=fs.readFileSync(path.join(root,'components/profile',name+'.tsx'),'utf8');
 assert(s.includes('assets.poseAtlas?')&&s.includes('<UltraLuxePetPoseSprite'));
 assert(s.includes('clock={clock}')&&s.includes('reduceMotion'));
}
const renderer=fs.readFileSync(path.join(root,'components/profile/UltraLuxePetPoseSprite.tsx'),'utf8');
assert(renderer.includes("overflow:'hidden'")&&!renderer.includes('Animated.loop(')&&!renderer.includes('setInterval'));
console.log('Six-pose atlas layout, signature timing, static fallback and native-clock contract passed.');
