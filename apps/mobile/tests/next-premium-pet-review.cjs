const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const file=path.join(__dirname,'../src/core/next-premium-pet-review.ts'),mod={exports:{}};
new Function('exports','module','require',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(mod.exports,mod,require);
const m=mod.exports,a=m.NEXT_PREMIUM_PET_ATLAS;
assert.equal(a.frames,a.columns*a.rows);assert.equal(a.seconds*a.cycles,24);
assert.equal(a.frames/a.seconds,12);assert.equal(a.frameWidth*a.columns,768);assert.equal(a.frameHeight*a.rows,768);
const timeline=m.nextPremiumPetAtlasTimeline();
assert.equal(timeline.frames.length,73);assert.equal(timeline.inputRange.length,73);
assert.equal(timeline.frames[0],0);assert.equal(timeline.frames.at(-1),0);
assert.equal(timeline.inputRange[0],0);assert.equal(timeline.inputRange.at(-1),1);
for(let i=1;i<timeline.inputRange.length;i++)assert(timeline.inputRange[i]>timeline.inputRange[i-1]);
const cells=new Set();
for(let i=0;i<a.frames;i++){
 const c=m.nextPremiumPetAtlasCell(i);assert(c.column>=0&&c.column<a.columns&&c.row>=0&&c.row<a.rows);cells.add(c.column+':'+c.row);
}
assert.equal(cells.size,36);for(const i of [-1,36,1.5,NaN,Infinity])assert.equal(m.nextPremiumPetAtlasCell(i),undefined);
assert(m.nextPremiumPetCellFits(6,6,116,116));assert(!m.nextPremiumPetCellFits(5,6,116,116));assert(!m.nextPremiumPetCellFits(6,6,117,116));assert(!m.nextPremiumPetCellFits(6,6,0,116));
let checks=0;
for(const theme of ['sakura','stormforged']){
 const frames=m.nextPremiumPetIdleSamples(theme);
 assert.equal(frames.length,97);assert.deepEqual(frames[0],frames.at(-1));
 assert(frames.some(f=>f.lift<-.5)&&frames.some(f=>f.scaleY>1.009));
 for(let i=1;i<frames.length;i++)for(let j=0;j<=10;j++){
  const x=frames[i-1],y=frames[i],t=j/10;
  const f=Object.fromEntries(Object.keys(x).map(k=>[k,x[k]+(y[k]-x[k])*t]));
  assert(f.lift>=-1.25&&f.lift<=0);assert(f.scaleX>=1&&f.scaleX<=1.012);assert(f.scaleY>=1&&f.scaleY<=1.018);
  assert(Math.abs(f.tilt)<=.8);assert(f.aura>=.12&&f.aura<=.30+1e-9);checks+=5;
 }
}
assert.notDeepEqual(m.nextPremiumPetIdleSamples('sakura'),m.nextPremiumPetIdleSamples('stormforged'));
console.log('Next premium pet atlas contract and '+checks+' interpolated idle bounds passed.');

const src=path.join(__dirname,'../src'),component='NextPremiumPetReviewSprite';
const renderer=fs.readFileSync(path.join(src,'components/profile',component+'.tsx'),'utf8');
assert(renderer.includes('if(running&&atlas)return <NextPremiumAtlas'));
assert(renderer.includes('return <Image accessible={false}'));
assert(renderer.includes('overflow:\'hidden\''));
assert(renderer.includes('Animated.modulo(Animated.multiply(clock,A.cycles),1)'));
assert(!/Animated\.loop\(|setInterval\(|setTimeout\(/.test(renderer));
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
for(const file of walk(src)){
 if(file===path.join(src,'components/profile/NextPremiumShowcaseReview.tsx'))continue;
 if(!/\.[jt]sx?$/.test(file)||file.endsWith(component+'.tsx'))continue;
 assert(!fs.readFileSync(file,'utf8').includes(component),'pet review renderer must remain disconnected: '+file);
}
console.log('Isolated atlas player, parent-owned clock and static fallback contract passed.');
