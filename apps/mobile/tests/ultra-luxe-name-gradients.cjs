const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const core=path.join(__dirname,'../src/core'),cache=new Map();
function load(name){
 if(cache.has(name))return cache.get(name);
 const mod={exports:{}};cache.set(name,mod.exports);
 const code=ts.transpileModule(fs.readFileSync(path.join(core,name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 new Function('exports','module','require',code)(mod.exports,mod,id=>{
  if(id==='./account-entitlements')return {accountEntitlementBenefits:()=>({})};
  return load(id.slice(2));
 });return mod.exports;
}
const g=load('ultra-luxe-name-gradients'),p=load('player-name-style'),priv=load('ultra-luxe-prestige');
const palettes=g.ULTRA_LUXE_GRADIENTS;
assert.equal(palettes.length,6);assert.equal(new Set(palettes.map(r=>r.id)).size,6);
assert.equal(new Set(palettes.map(r=>r.motion)).size,6);
assert.equal(g.ULTRA_LUXE_NAME_CYCLE_MS/g.ULTRA_LUXE_NAME_TICK_MS,28);
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
function luminance(h){return rgb(h).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);}
let samples=0;
for(const row of palettes){
 assert.equal(g.ultraLuxeGradientForColors(row.colors),row);
 assert.equal(g.ultraLuxeGradientForColors([...row.colors].reverse()),undefined);
 const style={mode:'gradient',gradientColors:[...row.colors],animation:'flow'};
 const first=p.playerNameCharacterColors('Adventurer',style,0);
 assert.deepEqual(first,p.playerNameCharacterColors('Adventurer',style,1));
 assert.notDeepEqual(first,p.playerNameCharacterColors('Adventurer',style,.25));
 for(const name of ['A','Ab','Adventurer','Long Adventurer Name']){
  const phases=Array.from({length:281},(_,i)=>p.playerNameCharacterColors(name,style,i/280));
  assert.deepEqual(phases[0],phases.at(-1));
  assert(phases.some(f=>f.some((c,i)=>c!==phases[0][i])));
  for(let i=0;i<phases.length;i++)for(let j=0;j<phases[i].length;j++){
   const h=phases[i][j];assert(/^#[0-9A-F]{6}$/.test(h));
   assert((luminance(h)+.05)/(luminance('#15121E')+.05)>=4.5,'dark reference contrast '+row.id+' '+h);
   if(i){const old=rgb(phases[i-1][j]);assert(rgb(h).every((v,k)=>Math.abs(v-old[k])<=6),'discontinuous gradient');}
   samples++;
  }
 }
 if(!['ascendant-celestial-name','ascendant-draconic-name'].includes(row.id))assert.equal(priv.verifiedUltraLuxeNameStyle(row.id,[row.id]),undefined);
}
assert.equal(g.ultraLuxeGradient('invalid'),undefined);
assert.deepEqual(p.playerNameCharacterColors('AB',{mode:'solid',solidColor:'#123456'},.3),['#123456','#123456']);
const ordinary={mode:'gradient',gradientColors:['#112233','#445566','#778899'],animation:'flow'};
assert.equal(g.ultraLuxeGradientForColors(ordinary.gradientColors),undefined);
assert.deepEqual(p.playerNameCharacterColors('ABC',ordinary,0),['#112233','#445566','#112233']);
const renderer=fs.readFileSync(path.join(core,'../components/PlayerStyledName.tsx'),'utf8');
assert(renderer.includes('subscribeSharedTicker(ULTRA_LUXE_NAME_TICK_MS'));
assert(renderer.includes('animated?phase:0'));
assert(!/setInterval\(|Animated\.loop\(/.test(renderer));
console.log('Six themed cyclic gradients; '+samples+' sampled glyph colors passed; private candidate grants closed.');
