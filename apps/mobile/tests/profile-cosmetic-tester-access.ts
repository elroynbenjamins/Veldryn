import {createCharacter,newGame} from '../src/core/game';
import {profileAnimatedCosmeticsEnabled,profileCosmeticsTester,PROFILE_COSMETICS_TESTER_ENTITLEMENT} from '../src/core/profile-cosmetic-access';
import {PREMIUM_PROFILE_COSMETICS} from '../src/core/profile-premium-cosmetics';
import {PROFILE_ALL_EFFECTS} from '../src/core/profile-effects';
import {profileWardrobe} from '../src/core/profile-wardrobe';
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
