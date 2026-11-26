/** Standalone core test process. Simulate certification before loading catalogue
 * modules; never change the checked-in readiness gate or create a player preview. */
import assert from 'node:assert/strict';
import type {Wave2Id} from '../src/core/profile-cosmetic-wave2';
import type {GameState} from '../src/core/types';
const wave:typeof import('../src/core/profile-cosmetic-wave2')=require('../src/core/profile-cosmetic-wave2');
const ready=wave.WAVE2_READY_SET_IDS as Wave2Id[];
const prior=[...ready];
ready.splice(0,ready.length,...wave.WAVE2_SETS.map(s=>s.id));
try{
 const {createCharacter,newGame}:typeof import('../src/core/game')=require('../src/core/game');
 const {profileWardrobe,wardrobeEquipped}:typeof import('../src/core/profile-wardrobe')=require('../src/core/profile-wardrobe');
 const {quickCosmeticSets,quickSetSelection}:typeof import('../src/core/profile-quick-set-equip')=require('../src/core/profile-quick-set-equip');
 const {executeGameCommand}:typeof import('../src/core/game-commands')=require('../src/core/game-commands');
 const {PROFILE_ALL_EFFECTS}:typeof import('../src/core/profile-effects')=require('../src/core/profile-effects');
 const {profileCosmeticsTester}:typeof import('../src/core/profile-cosmetic-access')=require('../src/core/profile-cosmetic-access');
 const {profileIconCollection}:typeof import('../src/core/profile-icons')=require('../src/core/profile-icons');
 const {PROFILE_COSMETIC_STORE_COLLECTIONS}:typeof import('../src/content/profile-cosmetic-store')=require('../src/content/profile-cosmetic-store');
 const assets={scenes:[],frames:PROFILE_ALL_EFFECTS.map(s=>s.borderId),effects:PROFILE_ALL_EFFECTS};
 const base=createCharacter(newGame(0),'IRONWARDEN','Wave Two Test');
 const rows=(s:GameState)=>profileWardrobe(s,assets,{nowMs:0}).flatMap(c=>c.rows);
 const allIds=new Set<string>(wave.WAVE2_SETS.flatMap(s=>[s.borderId,s.effectId,...s.iconIds]));
 assert(!profileCosmeticsTester(base));
 assert(!rows(base).some(r=>allIds.has(r.id)));
 assert.equal(quickCosmeticSets(base).length,0);
 assert(!PROFILE_COSMETIC_STORE_COLLECTIONS.some(s=>allIds.has(s.border.itemId)));
 for(const set of wave.WAVE2_SETS){
  const owned:GameState={...base,account:{...base.account,unlockedProfileBorderIds:[set.borderId],unlockedProfileEffectIds:[set.effectId],unlockedProfileIconIds:[...set.iconIds]}};
  assert(!profileCosmeticsTester(owned));
  const items=rows(owned).filter(r=>allIds.has(r.id));
  assert.equal(items.length,4,set.name+' normal wardrobe exactly four owned pieces');
  assert(items.every(r=>r.unlocked));
  assert.deepEqual(new Set(items.map(r=>r.id)),new Set([set.borderId,set.effectId,...set.iconIds]));
  assert.equal(quickCosmeticSets(owned).length,1);
  for(const id of set.iconIds){
   const before=wardrobeEquipped(owned);
   const selected=quickSetSelection(owned,before,set.id,id);
   assert(selected);
   assert.deepEqual(selected,{...before,icon:id,frame:set.borderId,effect:set.effectId});
   const after=executeGameCommand(owned,{type:'profile',args:{profileIconId:id,profileBorderId:set.borderId,profileEffectId:set.effectId}},0).state;
   assert.equal(after.account.profileIconId,id);
   assert.equal(after.character?.profileIconId,id);
   assert.equal(after.character?.profileBorderId,set.borderId);
   assert.equal(after.character?.profileEffectId,set.effectId);
   assert.equal(after.character?.profileBackgroundId,owned.character?.profileBackgroundId);
   assert.deepEqual(after.account.unlockedProfileIconIds,owned.account.unlockedProfileIconIds);
   assert(profileIconCollection(after).some(r=>r.id===id&&r.selected&&r.unlocked));
   assert(wave.wave2PublicRenderable('border',set.borderId));
   assert(wave.wave2PublicRenderable('effect',set.effectId));
  }
  for(const [kind,id] of [['profileBorderId',set.borderId],['profileEffectId',set.effectId],['profileIconId',set.iconIds[0]]] as const){
   assert.throws(()=>executeGameCommand(base,{type:'profile',args:{[kind]:id}},0),/cosmetic_not_owned|feature_not_released/);
  }
  const partial:GameState={...owned,account:{...owned.account,unlockedProfileIconIds:[set.iconIds[0]]}};
  assert.equal(quickCosmeticSets(partial).length,0);
  assert.equal(rows(partial).filter(r=>allIds.has(r.id)).length,3);
 }
}finally{ready.splice(0,ready.length,...prior);}
console.log('PASS all four certified sets through ordinary wardrobe, quick equip and authoritative profile command without tester access');
