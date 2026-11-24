const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.join(__dirname,'../src');
const code=ts.transpileModule(fs.readFileSync(path.join(root,'core/ultra-luxe-prestige.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const mod={exports:{}};new Function('exports','module',code)(mod.exports,mod);
const p=mod.exports;
assert.deepEqual(p.ownedUltraLuxeIcons({account:{}}),[]);
assert.deepEqual(p.ownedUltraLuxeNamePresets(undefined),[]);
for(const row of p.ULTRA_LUXE_ICONS){
 assert.deepEqual(p.ownedUltraLuxeIcons({account:{unlockedProfileIconIds:[row.id]}}),[row]);
}
for(const row of p.ULTRA_LUXE_NAME_PRESETS){
 assert.equal(p.verifiedUltraLuxeNameStyle(row.id,[]),undefined);
 assert.equal(p.verifiedUltraLuxeNameStyle(row.id,['unrelated']),undefined);
 assert.deepEqual(p.ownedUltraLuxeNamePresets([row.id]),[row]);
 assert.deepEqual(p.verifiedUltraLuxeNameStyle(row.id,[row.id]),{mode:'gradient',gradientColors:[...row.colors],animation:'flow'});
}
assert.equal(p.verifiedUltraLuxeNameStyle('fake',['fake']),undefined);
const picker=fs.readFileSync(path.join(root,'components/profile/UltraLuxeNameStylePicker.tsx'),'utf8');
assert(picker.includes('if(!presets.length)return null'));
assert(!picker.includes('onSaveNameStyle'));
const id=p.ULTRA_LUXE_NAME_PRESETS[0].id;
assert.equal(p.normalizeUltraLuxeNameSelection({accountId:'other',ownedIds:[id],selectedId:id},'self'),undefined);
assert.deepEqual(p.normalizeUltraLuxeNameSelection({accountId:'self',ownedIds:[id,id,'unknown'],selectedId:id},'self'),{accountId:'self',ownedIds:[id],selectedId:id});
assert.equal(p.normalizeUltraLuxeNameSelection({accountId:'self',ownedIds:[],selectedId:id},'self').selectedId,null);
console.log('Private icon ownership and verified prestige preset resolution passed.');
