import {createCharacter,newGame} from '../src/core/game';
import {WAVE2_READY_SET_IDS,WAVE2_SETS} from '../src/core/profile-cosmetic-wave2';
import {PROFILE_EFFECTS} from '../src/core/profile-effects';
import {PROFILE_COSMETIC_PORTRAITS} from '../src/core/profile-cosmetic-icons';
import {PROFILE_COSMETIC_STORE_COLLECTIONS,PROFILE_COSMETIC_STORE_PRODUCTS,PROFILE_COSMETIC_WARDROBE_COLLECTIONS,profileCosmeticCollectionOwnership} from '../src/content/profile-cosmetic-store';

function fail(message:string):never{throw new Error(message)}
function ok(value:unknown,message:string){if(!value)fail(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(message+': expected '+String(expected)+', got '+String(actual))}

equal(PROFILE_COSMETIC_STORE_COLLECTIONS.length,4,'four approved standard profile cosmetic sets');
equal(PROFILE_COSMETIC_STORE_PRODUCTS.length,4,'the Store has one product per complete cosmetic set');
equal(PROFILE_COSMETIC_PORTRAITS.length,8+2*WAVE2_READY_SET_IDS.length,'each available set has two portraits');
equal(PROFILE_COSMETIC_WARDROBE_COLLECTIONS.length,4+WAVE2_READY_SET_IDS.length,'wardrobe has legacy plus certified owner-only sets');
equal(new Set(PROFILE_COSMETIC_PORTRAITS.map(row=>row.id)).size,PROFILE_COSMETIC_PORTRAITS.length,'portrait ids are unique');
equal(new Set(PROFILE_COSMETIC_STORE_PRODUCTS.map(row=>row.sku)).size,4,'set sku ids are unique');
ok(PROFILE_COSMETIC_STORE_PRODUCTS.every(row=>row.kind==='set'),'standard collections are never individual Store products');
ok(PROFILE_COSMETIC_STORE_PRODUCTS.every(row=>row.checkoutEnabled===false),'no hidden set can checkout');
ok(PROFILE_COSMETIC_STORE_PRODUCTS.every(row=>row.billing==='one_time'),'prepared cosmetic sets use one-time ownership semantics');
ok(PROFILE_COSMETIC_STORE_PRODUCTS.every(row=>row.tier==='standard'),'these four sets are standard, not premium');
for(const set of WAVE2_SETS){
 ok(!PROFILE_COSMETIC_STORE_COLLECTIONS.some(row=>row.border.itemId===set.borderId),'Wave 2 excluded from store');
 equal(PROFILE_COSMETIC_WARDROBE_COLLECTIONS.some(row=>row.id===set.id),WAVE2_READY_SET_IDS.includes(set.id),'Wave 2 wardrobe follows readiness');
}
for(const collection of PROFILE_COSMETIC_WARDROBE_COLLECTIONS){
 const definition=PROFILE_EFFECTS.find(row=>row.id===collection.effect.itemId);
 ok(!!definition,collection.name+' effect uses an approved effect id');
 equal(collection.portraits.length,2,collection.name+' has exactly two portrait choices');
 equal(new Set(collection.portraits.map(row=>row.presentation)).size,2,collection.name+' has one female and one male portrait');
 equal(collection.border.itemId,definition!.borderId,collection.name+' border keeps its independent equip identity');
 equal(collection.set.borderId,collection.border.itemId,collection.name+' set includes its border');
 equal(collection.set.effectId,collection.effect.itemId,collection.name+' set includes its effect');
 equal(collection.set.iconIds.join('|'),collection.portraits.map(row=>row.id).join('|'),collection.name+' set includes both portraits');
}
let state=createCharacter(newGame(0),'IRONWARDEN','Cosmetic Catalog');
const first=PROFILE_COSMETIC_STORE_COLLECTIONS[0];
let owned=profileCosmeticCollectionOwnership(state,first);
equal(owned.ownedPieces,0,'fresh account owns zero of four contents');
ok(!owned.setOwned,'set ownership is false with zero pieces');
state={...state,account:{...state.account,unlockedProfileBorderIds:[first.border.itemId],unlockedProfileEffectIds:[first.effect.itemId]}};
owned=profileCosmeticCollectionOwnership(state,first);
equal(owned.ownedPieces,2,'legacy two-piece ownership remains representable');
ok(!owned.setOwned,'border plus effect alone no longer completes the four-piece set');
state={...state,account:{...state.account,unlockedProfileBorderIds:[first.border.itemId],unlockedProfileEffectIds:[first.effect.itemId],unlockedProfileIconIds:first.portraits.map(row=>row.id)}};
owned=profileCosmeticCollectionOwnership(state,first);
ok(owned.setOwned&&owned.ownedPieces===4,'set reads owned only when all four independently equipable contents are owned');
console.log('PASS: hidden Cosmetics Store has four set-only products with border, effect and two human portrait icons each');
