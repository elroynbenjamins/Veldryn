import {createCharacter,newGame} from '../src/core/game';
import {profileAnimatedCosmeticsEnabled,profileCosmeticsTester,PROFILE_COSMETICS_TESTER_ENTITLEMENT} from '../src/core/profile-cosmetic-access';
import {PREMIUM_PROFILE_COSMETICS} from '../src/core/profile-premium-cosmetics';
import {PROFILE_ALL_EFFECTS} from '../src/core/profile-effects';
import {profileWardrobe,wardrobeAnimatedSetPiece,wardrobeDisplaySections,type WardrobeRow} from '../src/core/profile-wardrobe';
import {CELESTIAL_IDS} from '../src/core/ascendant-cosmetics';
import {DRACONIC_IDS} from '../src/core/draconic-showcase-layout';
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
const backgroundAssetSource=fs.readFileSync('src/theme/profile-background-assets.ts','utf8');
import {profileCosmeticRuntimeByBorder,profileCosmeticRuntimeByEffect} from '../src/theme/profile-cosmetic-runtime-v1';
import {COLLECTIBLE_PLAYER_BADGE_IDS} from '../src/core/player-badges';

function fail(message:string):never{throw new Error(message)}
function ok(value:unknown,message:string){if(!value)fail(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(message+': expected '+String(expected)+', got '+String(actual))}
let state=createCharacter(newGame(0),'IRONWARDEN','Cosmetics Tester');
ok(!profileCosmeticsTester(state),'fresh accounts are not cosmetics testers');
ok(!profileAnimatedCosmeticsEnabled(state),'unreleased animations stay disabled for normal accounts');
state={...state,account:{...state.account,entitlements:{...(state.account.entitlements??{}),[PROFILE_COSMETICS_TESTER_ENTITLEMENT]:true}}};
ok(profileCosmeticsTester(state),'tester entitlement is account-scoped');
ok(profileAnimatedCosmeticsEnabled(state),'tester entitlement enables unreleased animation rendering without releasing the Store');
equal(PREMIUM_PROFILE_COSMETICS.length,4,'four Ascendant tester collections are modeled');
for(const set of PREMIUM_PROFILE_COSMETICS){
 ok(PROFILE_ALL_EFFECTS.some(row=>row.id===set.effectId&&row.borderId===set.borderId),set.name+' is in the hidden effect/border catalog');
 ok(backgroundAssetSource.includes('id:'+JSON.stringify(set.backgroundId))||backgroundAssetSource.includes("id:'"+set.backgroundId+"'"),set.name+' tester background is registered');
 ok(!!profileCosmeticRuntimeByBorder.get(set.borderId)&&!!profileCosmeticRuntimeByEffect.get(set.effectId),set.name+' has a responsive native animation fallback');
 ok(String(set.borderId)!==String(set.fallbackBorderId)&&String(set.backgroundId)!==String(set.fallbackBackgroundId)&&String(set.petId)!==String(set.fallbackPetId),set.name+' ownership ids never reuse fallback identities');
 ok(COLLECTIBLE_PLAYER_BADGE_IDS.includes(set.badgeId as never),set.name+' Ascendant badge is a server-owned collectible badge');
}
const categories=profileWardrobe(state,{scenes:[],frames:[],effects:[]});
ok(categories.some(row=>row.kind==='effect'),'tester sees the Effects customization family while global release remains off');
console.log('PASS: hidden tester entitlement exposes standard and Ascendant profile cosmetics without releasing the Store');


/** Both granted premium IDs and the original private showcase IDs must resolve
 * to the same actual native art, without treating either as an ownership alias. */
const petArt=fs.readFileSync('src/theme/pet-art.ts','utf8');
const frameArt=fs.readFileSync('src/theme/profile-border-assets.ts','utf8');
const lookPanel=fs.readFileSync('src/components/profile/ProfileLookPanel.tsx','utf8');
const stage=fs.readFileSync('src/components/profile/ProfileStage.tsx','utf8');
for(const set of PREMIUM_PROFILE_COSMETICS.slice(0,2)){
 const celestial=set.id==='celestial-sovereign';
 const resolver=celestial?'getEnabledCelestialAssets':'getDraconicAssets';
 for(const variant of ['petRegular','petPortrait']){
  ok(petArt.split('\n').some(line=>line.includes(set.petId)&&line.includes(resolver+'()?.'+variant)),set.name+' granted pet uses real '+variant+' artwork');
 }
 ok(backgroundAssetSource.split('\n').some(line=>line.includes(set.backgroundId)&&line.includes((celestial?'celestial':'draconic')+'.scene.background')),set.name+' granted background uses actual showcase art');
 ok(frameArt.split('\n').some(line=>line.includes(set.borderId)&&line.includes(celestial?'celestial_border_standard.webp':'draconic.standardBorder')),set.name+' granted frame uses actual showcase art');
}
ok(lookPanel.includes('new Set([...profileBorderSourceById.keys(),...PROFILE_ALL_EFFECTS.map'), 'art registry aliases must not duplicate frame rows');
ok(lookPanel.includes('row.clear?profileT(language,"Solo")'), 'only the explicit no-pet choice may say Solo');
ok(stage.includes('borderArt?.border??directFrame??'), 'customization preview must prefer actual frame art over runtime fallback');


// Sectioning is a presentation-only partition: never manufacture hidden rows or change ownership.
const row=(kind:WardrobeRow['kind'],id:string,unlocked=true,clear=false):WardrobeRow=>({kind,id,name:id,group:'Fixture',unlocked,equipped:false,clear});
for(const set of PREMIUM_PROFILE_COSMETICS){
 for(const piece of [row('scene',set.backgroundId),row('frame',set.borderId),row('effect',set.effectId),row('pet',set.petId)])ok(wardrobeAnimatedSetPiece(piece),set.name+' animated set piece '+piece.kind);
 for(const fallback of [row('scene',set.fallbackBackgroundId),row('frame',set.fallbackBorderId),row('pet',set.fallbackPetId)])ok(!wardrobeAnimatedSetPiece(fallback),'ordinary fallback artwork is not labeled animated');
}
for(const ids of [CELESTIAL_IDS,DRACONIC_IDS]){
 ok(wardrobeAnimatedSetPiece(row('scene',ids.background)),'private scene alias is grouped');
 ok(wardrobeAnimatedSetPiece(row('frame',ids.border)),'private frame alias is grouped');
 ok(wardrobeAnimatedSetPiece(row('pet',ids.pet)),'private pet alias is grouped');
}
for(const effect of PROFILE_ALL_EFFECTS){
 ok(wardrobeAnimatedSetPiece(row('frame',effect.borderId)),'animated border definition is grouped');
 ok(wardrobeAnimatedSetPiece(row('effect',effect.id)),'animated effect definition is grouped');
}
const ordinary=row('frame','frame_gloamward'),clear=row('frame','',true,true),locked=row('frame',PREMIUM_PROFILE_COSMETICS[0].borderId,false);
const partition=wardrobeDisplaySections([clear,locked,ordinary]);
equal(partition.standard.length,2,'standard section preserves clear and ordinary rows');
equal(partition.standard[0],clear,'clear remains first');
equal(partition.standard[1],ordinary,'ordinary row identity is preserved');
equal(partition.animated[0],locked,'animated row identity and locked state are preserved');
equal(partition.animated[0].unlocked,false,'partition does not unlock an item');
equal(wardrobeDisplaySections([ordinary]).animated.length,0,'no animated items means no animated section');
ok(lookPanel.includes('sections.animated.length>0?')&&lookPanel.includes('profileT(language,"Animated sets")'),'inline divider appears only for visible animated rows');
