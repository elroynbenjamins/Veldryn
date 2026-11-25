const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/core/ultra-luxe-set-visuals.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const mod={exports:{}};new Function('exports','module',code)(mod.exports,mod);
const {ultraLuxeVisualTier,resolveTesterUltraLuxeVisuals}=mod.exports;
const set={background:'b',border:'f',pet:'p',title:'t',badge:'g'};
const matching={background:'b',border:'f',pet:'p',verifiedTitleId:'t',displayedBadges:['g']};
assert.equal(ultraLuxeVisualTier(set,matching),'ascendant');
assert.equal(ultraLuxeVisualTier(set,{...matching,verifiedTitleId:undefined}),'awakened');
assert.equal(ultraLuxeVisualTier(set,{...matching,displayedBadges:[]}),'awakened');
assert.equal(ultraLuxeVisualTier(set,{...matching,pet:'other'}),'paired');
assert.equal(ultraLuxeVisualTier(set,{...matching,border:'other'}),'individual');
assert.equal(ultraLuxeVisualTier(set,{...matching,background:'other'}),'individual');
const root=path.join(__dirname,'../src/components');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
assert(read('profile/UltraLuxeIdentityMotion.tsx').includes('if(!verified||!motion)'));
assert(read('PlayerBadges.tsx').includes('animate&&motion&&isUltraLuxeBadge(id)'));
for(const name of ['CelestialSovereignPreview','DraconicDominionPreview'])assert(read('profile/'+name+'.tsx').includes('<UltraLuxeIdentityMotionProvider'));
for(const name of ['PublicProfileScene','ProfileScenePreview'])assert((read(name+'.tsx').match(/<UltraLuxeTitleText/g)||[]).length===2);
console.log('Full-set visual tier, mixed pieces and verified identity gating passed.');

const allow={background:true,border:true,pet:true},deny={background:false,border:false,pet:false};
const groups=[[["background","premium:celestial-sovereign:astral-sanctum","ascendant-celestial-astral-sanctum"],["border","premium:celestial-sovereign:crown-of-cosmos","ascendant-celestial-crown-of-the-cosmos"],["pet","premium:celestial-sovereign:aetherion-starborn","ascendant-celestial-aetherion"]],[["background","premium:draconic-dominion:dominion-of-ash","ascendant-draconic-dominion-of-ash"],["border","premium:draconic-dominion:throne-of-embers","ascendant-draconic-throne-of-embers"],["pet","premium:draconic-dominion:vharaxis-eternal-flame","ascendant-draconic-vharaxis"]]];
for(const group of groups){
 const old=Object.fromEntries(group.map(([kind,id])=>[kind,id]));
 const expected=Object.fromEntries(group.map(([kind,,id])=>[kind,id]));
 const selection={...old,verifiedTitleId:'verified',displayedBadges:['badge']};
 const original=JSON.stringify(selection);
 const resolved=resolveTesterUltraLuxeVisuals(selection,allow);
 assert.deepEqual(resolved,{...selection,...expected});
 assert.deepEqual(resolveTesterUltraLuxeVisuals(selection,deny),selection);
 assert.deepEqual(resolveTesterUltraLuxeVisuals(resolved,allow),resolved);
 assert.equal(resolveTesterUltraLuxeVisuals(selection,{...allow,pet:false}).pet,old.pet);
 assert.equal(JSON.stringify(selection),original);
 assert.equal(ultraLuxeVisualTier({...expected,title:'verified',badge:'badge'},resolved),'ascendant');
}
for(const id of ['premium:abyssal-majesty:forgotten-abyss','premium:paradox-eternal:fractured-eternity','PET_001',null,undefined]){
 const item={background:id,border:id,pet:id,displayedBadges:[]};
 assert.deepEqual(resolveTesterUltraLuxeVisuals(item,allow),item);
}
assert(read('ProfileScenePreview.tsx').includes('profileCosmeticsTester(state)'));
assert(read('PublicProfileScene.tsx').includes('const testerPreview=profile.cosmeticsPreview===true'));
console.log('Tester render-only ID bridge passed: per-piece eligibility, no mutation, identity and unrelated items preserved.');

for(const name of ['PublicProfileScene','ProfileScenePreview']){
 const source=read(name+'.tsx');
 assert(source.includes('profileBackgroundPreviewById.get(renderBackgroundId)'));
 assert(source.includes('personalBackgroundVariants.get(renderBackgroundId)'));
 assert(source.includes('profileBorderSourceById.get(renderBorderId)'));
 assert(source.includes('petArtSource(renderPetId)'));
 assert(source.includes('renderBackgroundId===CELESTIAL_IDS.background')&&source.includes('renderBorderId===DRACONIC_IDS.border'));
}
console.log('Dedicated artwork preserved on standard and narrow-screen fallback paths.');
