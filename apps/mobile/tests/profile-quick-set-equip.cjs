const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const cache=new Map();
function load(file){
 file=path.resolve(file);
 if(cache.has(file))return cache.get(file).exports;
 const mod={exports:{}};cache.set(file,mod);
 const src=fs.readFileSync(file,'utf8');
 const js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 new Function('exports','module','require',js)(mod.exports,mod,id=>{
  if(id==='./release-flags')return {PROFILE_ANIMATED_COSMETICS_RELEASED:false};
  if(!id.startsWith('.'))throw Error('Unexpected dependency '+id);
  return load(path.resolve(path.dirname(file),id+'.ts'));
 });return mod.exports;
}
const core=path.join(__dirname,'../src/core');
const {quickCosmeticSets,quickSetSelection,quickSetEquipped,undoQuickSet}=load(path.join(core,'profile-quick-set-equip.ts'));
const {PROFILE_COSMETIC_STORE_COLLECTIONS:standard}=load(path.join(core,'../content/profile-cosmetic-store.ts'));
const {PREMIUM_PROFILE_COSMETICS:premium}=load(path.join(core,'profile-premium-cosmetics.ts'));
const {CELESTIAL_IDS:C}=load(path.join(core,'ascendant-cosmetics.ts'));
const {DRACONIC_IDS:D}=load(path.join(core,'draconic-showcase-layout.ts'));
const old={icon:'old-icon',scene:'old-scene',frame:'old-frame',effect:'old-effect',pet:'old-pet',title:'old-title'};
const empty={character:{id:'hero'},account:{entitlements:{profile_cosmetics_tester_v1:true}}};
assert.deepEqual(quickCosmeticSets(empty),[]);
assert.deepEqual(quickCosmeticSets({...empty,character:null}),[]);
for(const row of standard){
 const account={...empty.account,unlockedProfileBorderIds:[row.border.itemId],unlockedProfileEffectIds:[row.effect.itemId],unlockedProfileIconIds:row.portraits.map(p=>p.id)};
 const state={...empty,account};
 assert.equal(quickCosmeticSets(state).length,1);
 const set=quickCosmeticSets(state)[0];assert.equal(set.choices.length,2);
 assert.deepEqual(quickCosmeticSets({...state,account:{...account,entitlements:{}}}),[]);
 for(const choice of set.choices){
  const next=quickSetSelection(state,old,set.id,choice.id);
  assert.deepEqual(next,{...old,icon:choice.id,frame:row.border.itemId,effect:row.effect.itemId});
  assert(quickSetEquipped(next,choice));assert(!quickSetEquipped(old,choice));
  assert.deepEqual(undoQuickSet(next,old,next),old);
  assert.deepEqual(undoQuickSet({...next,frame:'new-frame',pet:'new-pet'},old,next),{...old,frame:'new-frame',pet:'new-pet'});
 }
 assert.equal(quickSetSelection(state,old,set.id,'bad'),null);
 for(const key of ['unlockedProfileBorderIds','unlockedProfileEffectIds','unlockedProfileIconIds']){
  assert.deepEqual(quickCosmeticSets({...state,account:{...account,[key]:[]}}),[]);
 }
}
for(const [i,ids,title] of [[0,C,'ascendant-celestial-title'],[1,D,'ascendant-draconic-title']]){
 const row=premium[i];
 for(const variant of ['legacy','dedicated']){
  const a={...empty.account,unlockedProfileBackgroundIds:[variant==='legacy'?row.backgroundId:ids.background],unlockedProfileBorderIds:[variant==='legacy'?row.borderId:ids.border],unlockedCosmeticPetIds:[variant==='legacy'?row.petId:ids.pet],unlockedProfileEffectIds:[row.effectId]};
  const state={...empty,account:a},set=quickCosmeticSets(state)[0];
  assert(set);assert.equal(set.id,row.id);
  const next=quickSetSelection(state,old,row.id,row.id);
  assert.deepEqual(next,{...old,scene:a.unlockedProfileBackgroundIds[0],frame:a.unlockedProfileBorderIds[0],pet:a.unlockedCosmeticPetIds[0],effect:row.effectId});
  const withTitle=quickSetSelection({...state,account:{...a,unlockedTitleIds:[title]}},old,row.id,row.id);
  assert.equal(withTitle.title,row.badgeName);
  for(const key of ['unlockedProfileBackgroundIds','unlockedProfileBorderIds','unlockedCosmeticPetIds','unlockedProfileEffectIds'])assert.equal(quickSetSelection({...state,account:{...a,[key]:[]}},old,row.id,row.id),null);
 }
}
for(const row of premium.slice(2)){
 const state={...empty,account:{...empty.account,unlockedProfileBackgroundIds:[row.backgroundId],unlockedProfileBorderIds:[row.borderId],unlockedProfileEffectIds:[row.effectId],unlockedCosmeticPetIds:[row.petId]}};
 assert.deepEqual(quickCosmeticSets(state),[]);
}
const ui=fs.readFileSync(path.join(__dirname,'../src/components/profile/ProfileLookPanel.tsx'),'utf8');
assert(ui.includes("chip==='frame'&&quickSets.length>0"));
assert(ui.includes('quickSetSelection(stateRef.current,before,setId,choiceId)'));
assert(ui.includes('accountRef.current!==next.accountId||!base.character||base.character.id!==next.characterId'));
assert(ui.includes('...next.patch'));
assert(ui.includes('undoQuickSet(current,before,next)'));
assert(ui.includes('selectionScopeRef.current!==scope'));
assert(ui.includes('await onChangeRef.current(applyWardrobeEquipped(base,rebased))'));
console.log('PASS: quick cosmetic set eligibility, exact owned IDs, per-character scope, independent pieces and targeted undo');
