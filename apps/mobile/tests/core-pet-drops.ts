import {createCharacter,newGame} from '../src/core/game';
import {applyCorePetCombatDrops,CORE_PET_SIGNATURE_DROPS,corePetSignatureDropForMonster,resolveCorePetCombatDrops} from '../src/core/core-pet-drops';

function fail(message:string):never{throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(`${message}: expected ${String(expected)}, got ${String(actual)}`)}
function ok(value:unknown,message:string){if(!value)fail(message)}

equal(CORE_PET_SIGNATURE_DROPS.length,4,'signature regional pet count');
ok(CORE_PET_SIGNATURE_DROPS.every(row=>row.chance===.0005),'signature regional pets use the 0.05% drop rate');
equal(corePetSignatureDropForMonster('OATHGLASS_REVENANT')?.petId,'PET_018','Asterfall signature source');
equal(corePetSignatureDropForMonster('GLASSBOUND_SENTINEL')?.petId,'PET_023','Sunscar signature source');
equal(corePetSignatureDropForMonster('CHOIR_HUNTER')?.petId,'PET_028','Frostmarch signature source');
equal(corePetSignatureDropForMonster('ASHEN_REVENANT')?.petId,'PET_033','Ashlands signature source');

let state=createCharacter(newGame(1),'IRONWARDEN','PetHunter');
const forced=applyCorePetCombatDrops(state,'OATHGLASS_REVENANT',1,'forced',()=>0);
state=forced.state;
equal(forced.drops.length,1,'forced regional roll awards one pet');
equal(forced.drops[0]?.petId,'PET_018','forced regional roll awards Oathling');
ok(state.account.unlockedCosmeticPetIds?.includes('PET_018'),'signature pet is account-owned');
ok(state.character?.ownedPetIds?.includes('PET_018'),'legacy character mirror is maintained');

const duplicate=applyCorePetCombatDrops(state,'OATHGLASS_REVENANT',5000,'duplicate',()=>0);
equal(duplicate.drops.length,0,'owned signature pet cannot drop again');
equal(state.account.unlockedCosmeticPetIds?.filter(id=>id==='PET_018').length,1,'signature pet ownership is duplicate-protected');

equal(resolveCorePetCombatDrops(state,'MOSS_RAT',100000,'wrong-source',()=>0).length,0,'unconfigured monsters cannot award regional signature pets');
equal(resolveCorePetCombatDrops(createCharacter(newGame(2),'IRONWARDEN','NoLuck'),'OATHGLASS_REVENANT',100,'no-luck',()=>1).length,0,'failed rolls award no pet');

console.log('PASS: regional signature pet drops and duplicate protection validate');
