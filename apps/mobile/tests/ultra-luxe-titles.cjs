const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const src=fs.readFileSync(path.join(__dirname,'../src/core/ultra-luxe-titles.ts'),'utf8');
const mod={exports:{}};new Function('exports','module','require',ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(mod.exports,mod,require);
const {ULTRA_LUXE_TITLES,ownedUltraLuxeTitles,ownedUltraLuxeTitleColor,verifiedUltraLuxeTitleColor}=mod.exports;
for(const title of ULTRA_LUXE_TITLES){
 const none={account:{unlockedTitleIds:[]}},owned={account:{unlockedTitleIds:[title.id]}};
 assert.equal(ownedUltraLuxeTitles(none).length,0);
 assert.deepEqual(ownedUltraLuxeTitles(owned),[title]);
 assert.equal(ownedUltraLuxeTitleColor(none,title.name),undefined);
 assert.equal(ownedUltraLuxeTitleColor(owned,title.name),title.color);
 assert.equal(verifiedUltraLuxeTitleColor(title.name,undefined),undefined);
 assert.equal(verifiedUltraLuxeTitleColor('Custom title',title.id),undefined);
 assert.equal(verifiedUltraLuxeTitleColor(title.name,title.id),title.color);
 assert.equal(verifiedUltraLuxeTitleColor(title.name,title.id,false),title.lightColor);
}
console.log('Private title visibility and verified-color contract passed.');
