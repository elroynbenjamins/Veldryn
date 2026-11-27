const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.join(__dirname,'../src'),cache=new Map();
function load(file){
 file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;
 const mod={exports:{}};cache.set(file,mod);
 const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 new Function('exports','module','require',js)(mod.exports,mod,id=>{if(!id.startsWith('.'))throw Error('Unexpected '+id);return load(path.resolve(path.dirname(file),id+'.ts'));});return mod.exports;
}
const {ULTRA_LUXE_REVIEW_COLLECTIONS:rows,eligibleReviewCollections,reviewQuickSetChoices,reviewQuickSetSelection,reviewEquippedTier}=load(path.join(root,'core/ultra-luxe-review-integration.ts'));
const {ultraLuxeGrantProjection,ULTRA_LUXE_GRANT_COLLECTIONS}=load(path.join(root,'core/ultra-luxe-grants.ts'));
assert.equal(rows.length,4);assert.equal(ULTRA_LUXE_GRANT_COLLECTIONS.length,2);
assert.equal(new Set(rows.map(c=>c.id)).size,4);
for(const key of ['background','border','pet','title','badge','effect'])assert.equal(new Set(rows.map(c=>c[key])).size,4,key);
const scope={accountId:'a',characterId:'hero1'},other={accountId:'b',characterId:'hero1'},otherHero={...scope,characterId:'hero2'};
const before={icon:'existing-icon',scene:'old-scene',frame:'old-frame',pet:'old-pet',title:'old-title',effect:'old-effect'};
const full={accountId:'a',collectionIds:rows.map(c=>c.id)};
assert.deepEqual(eligibleReviewCollections(false,scope,full),[]);
assert.deepEqual(eligibleReviewCollections(true,scope,undefined),[]);
assert.deepEqual(eligibleReviewCollections(true,other,full),[]);
assert.deepEqual(eligibleReviewCollections(true,{accountId:'a',characterId:''},full),[]);
assert.deepEqual(reviewQuickSetChoices(true,scope,{accountId:'a',collectionIds:['bogus']}),[]);
assert.equal(reviewQuickSetChoices(true,scope,full).length,4);
assert.equal(ultraLuxeGrantProjection(full.collectionIds).collectionIds.length,2,'candidate grants remain closed in production projection');
for(const row of rows){
 const grant={accountId:'a',collectionIds:[row.id]};
 const choice=reviewQuickSetChoices(true,scope,grant)[0];
 assert.equal(choice.id,row.id);
 assert(!('icon' in choice.patch));assert(!('badge' in choice.patch));assert(!('nameStyle' in choice.patch));
 const after=reviewQuickSetSelection(true,scope,scope,grant,before,row.id);
 assert.deepEqual(after,{...before,scene:row.background,frame:row.border,pet:row.pet,title:row.titleName,effect:''});
 assert.equal(reviewQuickSetSelection(false,scope,scope,grant,before,row.id),null);
 assert.equal(reviewQuickSetSelection(true,scope,other,grant,before,row.id),null);
 assert.equal(reviewQuickSetSelection(true,scope,otherHero,grant,before,row.id),null);
 assert.equal(reviewQuickSetSelection(true,scope,scope,{accountId:'a',collectionIds:[]},before,row.id),null);
 assert.equal(reviewQuickSetSelection(true,scope,scope,grant,before,'missing'),null);
 const actual={background:row.background,border:row.border,pet:row.pet,effect:'',verifiedTitleId:row.title,displayedBadges:[row.badge]};
 assert.deepEqual(reviewEquippedTier(true,scope,grant,actual),{id:row.id,tier:'ascendant'});
 assert.equal(reviewEquippedTier(true,scope,grant,{...actual,pet:null}).tier,'paired');
 assert.equal(reviewEquippedTier(true,scope,grant,{...actual,verifiedTitleId:null}).tier,'awakened');
 assert.equal(reviewEquippedTier(true,scope,grant,{...actual,displayedBadges:[]}).tier,'awakened');
 assert.equal(reviewEquippedTier(true,scope,grant,{...actual,effect:'unrelated-effect'}),null);
 assert.equal(reviewEquippedTier(true,scope,grant,{...actual,border:rows.find(c=>c.id!==row.id).border}),null);
 assert.equal(reviewEquippedTier(true,other,grant,actual),null);
 assert.equal(reviewEquippedTier(false,scope,grant,actual),null);
}
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const review=read('components/profile/UltraLuxeFourSetReview.tsx');
for(const name of ['CelestialSovereignPreview','DraconicDominionPreview','AbyssalReviewScene','ParadoxReviewScene'])assert(review.includes('<'+name));
assert(review.includes('reviewEnabled=false')&&review.includes('reviewEquippedTier('));
assert(!read('components/PlayerBadges.tsx').includes('Animated.'));
for(const f of ['components/PublicProfileScene.tsx','components/ProfileScenePreview.tsx','components/profile/ProfileStage.tsx','components/profile/ProfileLookPanel.tsx','core/profile-quick-set-equip.ts'])assert(!read(f).includes('UltraLuxeFourSetReview'));
console.log('PASS: four-set isolated projection, scoped quick equip, mixed pieces, revocation, static badges and production isolation');

const wardrobe=load(path.join(root,'core/ultra-luxe-owned-wardrobe.ts'));
assert.equal(wardrobe.NEW_ULTRA_LUXE_WARDROBE.length,4);
assert.equal(wardrobe.LEGACY_PUBLIC_LUXE_WARDROBE.length,2);
const blank=['icon','scene','frame','effect','pet','title'].map(kind=>({kind,label:kind,owned:0,total:0,rows:[]}));
for(const row of wardrobe.NEW_ULTRA_LUXE_WARDROBE){
 const state={character:{id:scope.characterId},account:{unlockedProfileBackgroundIds:[row.ids.background],unlockedProfileBorderIds:[row.ids.border],unlockedCosmeticPetIds:[row.ids.pet],unlockedTitleIds:[row.titleId]}};
 const grant={accountId:scope.accountId,collectionIds:[row.id]};
 assert(wardrobe.newUltraLuxeHint(state));
 assert.deepEqual(wardrobe.appendOwnedUltraLuxeWardrobe(blank,state,scope,undefined),blank);
 assert.deepEqual(wardrobe.appendOwnedUltraLuxeWardrobe(blank,state,other,grant),blank);
 const result=wardrobe.appendOwnedUltraLuxeWardrobe(blank,state,scope,grant);
 assert.equal(result.reduce((n,c)=>n+c.owned,0),4);
 assert.equal(result.reduce((n,c)=>n+c.total,0),4);
 assert(result.flatMap(c=>c.rows).every(r=>r.unlocked&&wardrobe.isNewUltraLuxeWardrobePiece(r)));
 assert.deepEqual(wardrobe.appendOwnedUltraLuxeWardrobe(result,state,scope,grant),result);
 const next=wardrobe.newUltraLuxeQuickSelection(state,scope,grant,before,row.id,row.id);
 assert.deepEqual(next,{...before,scene:row.ids.background,frame:row.ids.border,pet:row.ids.pet,title:row.titleName,effect:''});
 assert.equal(wardrobe.newUltraLuxeQuickSelection(state,scope,undefined,before,row.id,row.id),null);
 assert.equal(wardrobe.newUltraLuxeQuickSelection(state,otherHero,grant,before,row.id,row.id),null);
 assert(!wardrobe.newUltraLuxePatchAllowed(state,scope,undefined,{title:' '+row.titleName.toUpperCase()+' '}));
 assert(!wardrobe.newUltraLuxePatchAllowed(state,scope,{...grant,collectionIds:[]},{frame:row.ids.border}));
 assert(wardrobe.newUltraLuxePatchAllowed(state,scope,grant,{pet:row.ids.pet}));
 assert(wardrobe.newUltraLuxePatchAllowed(state,scope,undefined,{pet:'PET_001'}));
 for(const key of ['unlockedProfileBackgroundIds','unlockedProfileBorderIds','unlockedCosmeticPetIds','unlockedTitleIds']){
  const partial={...state,account:{...state.account,[key]:[]}};
  assert.deepEqual(wardrobe.ownedNewUltraLuxeQuickSets(partial,scope,grant),[]);
 }
}
const panel=read('components/profile/ProfileLookPanel.tsx');
assert(panel.includes('useUltraLuxeCollectionProjection(!!character&&(newUltraLuxeHint(state)')&&panel.includes('reviewGrantAllowsFullSet(verifiedRef.current'));
assert(panel.includes('reviewGrantAllowsFullSet(verifiedCollections,scope,def[0])'));
assert(panel.includes('appendOwnedUltraLuxeWardrobe(profileWardrobe(state,WARDROBE_ASSETS),state,grantScope,verifiedCollections)'));
assert(panel.includes('newUltraLuxePatchAllowed(base,{accountId:next.accountId,characterId:next.characterId},verifiedRef.current,next.patch)'));
assert(panel.includes('newUltraLuxeQuickSelection(stateRef.current'));
const hook=read('online/useUltraLuxeCollectionProjection.ts');
assert(hook.includes("rpc('ultra_luxe_collection_self_v1')")&&hook.includes('scopeRef.current!==key')&&hook.includes('serial.current!==request'));
console.log('PASS: actual wardrobe candidate rows, independent readback, quick equip and queued grant revalidation');

for(const row of wardrobe.NEW_ULTRA_LUXE_WARDROBE){
 const selection={background:row.ids.background,border:row.ids.border,pet:row.ids.pet,verifiedTitleId:row.titleId,displayedBadges:[row.ids.badge]};
 const otherRow=wardrobe.NEW_ULTRA_LUXE_WARDROBE.find(c=>c.id!==row.id);
 assert(wardrobe.candidateAppearanceHint(selection));
 assert.deepEqual(wardrobe.candidateAppearanceIds(selection,[row.id]),selection);
 const denied=wardrobe.candidateAppearanceIds(selection,[]);
 assert.equal(denied.background,'asterfall-night');assert.equal(denied.border,undefined);assert.equal(denied.pet,undefined);
 assert.equal(wardrobe.candidateShowcase(selection,[]),undefined);
 assert.equal(wardrobe.candidateShowcase(selection,[otherRow.id]),undefined);
 assert.deepEqual(wardrobe.candidateShowcase(selection,[row.id]),{id:row.id,fullSet:true});
 for(const patch of [{pet:otherRow.ids.pet},{pet:null},{verifiedTitleId:null},{displayedBadges:[]}]){
  assert.deepEqual(wardrobe.candidateShowcase({...selection,...patch},[row.id]),{id:row.id,fullSet:false});
 }
 assert.equal(wardrobe.candidateShowcase({...selection,border:otherRow.ids.border},[row.id,otherRow.id]),undefined);
 assert.equal(wardrobe.candidateShowcase({...selection,effect:'unrelated-effect'},[row.id]),undefined);
 assert.equal(wardrobe.candidateVerifiedTitle(row.titleName,row.titleId,[row.id]).id,row.id);
 assert.equal(wardrobe.candidateVerifiedTitle(row.titleName,row.titleId,[]),undefined);
 assert.equal(wardrobe.candidateVerifiedTitle('Ordinary title',row.titleId,[row.id]),undefined);
}
const self=read('components/ProfileScenePreview.tsx'),pub=read('components/PublicProfileScene.tsx'),stage=read('components/profile/ProfileStage.tsx');
for(const route of [self,pub]){
 assert(route.includes('candidateAppearanceIds(')&&route.includes('candidateShowcase(')&&route.includes('<VerifiedCandidateShowcase'));
 assert(route.includes('newLuxeBackground(renderBackgroundId)')&&route.includes('newLuxeBorder(renderBorderId)')&&route.includes('newLuxePet(renderPetId)'));
 assert(route.includes('VerifiedCandidateBorderEffects'));
}
assert(self.includes('ownedNewUltraLuxeCollections(state,{accountId,characterId:character.id},projection)'));
assert(pub.includes('verifiedPublicCandidateCollections(profile.ultraLuxeAppearanceVerified,profile.ultraLuxeAppearanceVersion)'));
assert.equal(wardrobe.verifiedPublicCandidateCollections(true,2).length,4);
for(const version of [undefined,1,3,'2',null])assert.equal(wardrobe.verifiedPublicCandidateCollections(true,version).length,2);
for(const verified of [false,undefined,'true',1])assert.deepEqual(wardrobe.verifiedPublicCandidateCollections(verified,2),[]);
assert(self.includes('candidateAppearanceHint(raw),sixLuxeNamesEnabled)'));
assert(stage.includes('collapsed&&candidate,sixLuxeNamesEnabled)'));
for(const row of wardrobe.NEW_ULTRA_LUXE_WARDROBE.slice(2)){
 const selection={background:row.ids.background,border:row.ids.border,pet:row.ids.pet,displayedBadges:[]};
 const oldPublic=wardrobe.LEGACY_PUBLIC_LUXE_WARDROBE.map(c=>c.id);
 assert.equal(wardrobe.candidateAppearanceIds(selection,oldPublic).border,undefined);
 assert.equal(wardrobe.candidateShowcase(selection,oldPublic),undefined);
}
const {NEXT_PREMIUM_SETS}=load(path.join(root,'core/next-premium-set-review.ts'));
for(const set of NEXT_PREMIUM_SETS){
 assert(!wardrobe.newUltraLuxePatchAllowed({character:{id:'hero1'},account:{}},scope,undefined,{icon:set.icon}));
 assert(!wardrobe.newUltraLuxePatchAllowed({character:{id:'hero1'},account:{}},scope,undefined,{effect:set.showcase}));
}
assert(stage.includes('if(dedicated||candidate)'));
const badgesArt=read('components/player-badge-artwork.ts');
assert(badgesArt.includes("ascendant_monarch_of_deep:require(")&&badgesArt.includes("ascendant_beyond_existence:require("));
assert(!read('components/PlayerBadges.tsx').includes('Animated.'));
const tiers=read('components/profile/wardrobe-visual-tiers.ts');
assert(tiers.includes('isNewUltraLuxeWardrobePiece(row)')&&tiers.includes('candidate?.name'));
console.log('PASS: private self appearance, sanitized public appearance, mixed-piece fallback, exact pair, premium tier and static badge art');

const {normalizeReviewGrantSnapshot,reviewGrantAllowsFullSet}=load(path.join(root,'core/ultra-luxe-review-integration.ts'));
const all=load(path.join(root,'core/ultra-luxe-full-set-command.ts')).ULTRA_LUXE_FULL_SET_DEFINITIONS.map(d=>d[0]);
const raw={accountId:'a',collectionIds:[...all.slice().reverse(),all[0],'unknown',null,7]};
assert.deepEqual(normalizeReviewGrantSnapshot(raw,'a',true),{accountId:'a',collectionIds:all});
assert.deepEqual(normalizeReviewGrantSnapshot(raw,'a'),{accountId:'a',collectionIds:all.slice(0,4)});
assert.equal(normalizeReviewGrantSnapshot(raw,'b',true),undefined);
assert.equal(normalizeReviewGrantSnapshot({accountId:'a',collectionIds:'all'},'a',true),undefined);
for(const id of all){
 const verified=normalizeReviewGrantSnapshot({accountId:'a',collectionIds:[id]},'a',true);
 assert(reviewGrantAllowsFullSet(verified,scope,id));
 assert(reviewGrantAllowsFullSet(verified,scope,id.slice('ascendant-'.length)));
 assert(!reviewGrantAllowsFullSet(verified,other,id));
 assert(!reviewGrantAllowsFullSet(verified,{...scope,characterId:''},id));
 assert(!reviewGrantAllowsFullSet(undefined,scope,id));
 assert(!reviewGrantAllowsFullSet({accountId:'a',collectionIds:[]},scope,id));
 assert(!reviewGrantAllowsFullSet(verified,scope,'unknown'));
}
console.log('PASS: gated six-set self projection, exact canonical IDs, cross-account rejection and revoked/missing collection guards');
