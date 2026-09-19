import {createCharacter,newGame} from '../src/core/game';
import {
  applyCorePetActivityDrops,
  applyCorePetCombatDrops,
  CORE_PET_ACTIVITY_DROPS,
  CORE_PET_SIGNATURE_DROPS,
  corePetActivityDropsForSource,
  corePetSignatureDropForMonster,
  resolveCorePetActivityDrops,
  resolveCorePetCombatDrops,
} from '../src/core/core-pet-drops';
import {rewardHasProgress} from '../src/core/playability';

function fail(message:string):never{throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(`${message}: expected ${String(expected)}, got ${String(actual)}`)}
function ok(value:unknown,message:string){if(!value)fail(message)}

equal(CORE_PET_SIGNATURE_DROPS.length,4,'signature regional pet count');
ok(CORE_PET_SIGNATURE_DROPS.every(row=>row.chance===.0005),'signature regional pets use the 0.05% drop rate');
equal(corePetSignatureDropForMonster('OATHGLASS_REVENANT')?.petId,'PET_018','Asterfall signature source');
equal(corePetSignatureDropForMonster('GLASSBOUND_SENTINEL')?.petId,'PET_023','Sunscar signature source');
equal(corePetSignatureDropForMonster('CHOIR_HUNTER')?.petId,'PET_028','Frostmarch signature source');
equal(corePetSignatureDropForMonster('ASHEN_REVENANT')?.petId,'PET_033','Ashlands signature source');

const asterfallActivity=CORE_PET_ACTIVITY_DROPS.filter(row=>row.region==='Asterfall');
equal(asterfallActivity.length,17,'Asterfall regular activity pet count');
equal(asterfallActivity.filter(row=>row.sourceType==='combat').length,4,'Asterfall regular combat pet count');
equal(asterfallActivity.filter(row=>row.sourceType==='gathering').length,8,'Asterfall regular gathering pet count');
equal(asterfallActivity.filter(row=>row.sourceType==='exploration').length,5,'Asterfall exploration pet count');
ok(asterfallActivity.filter(row=>row.sourceType==='combat').every(row=>row.chance===.001),'regular combat pets use 0.10% per-kill rate');
ok(asterfallActivity.filter(row=>row.sourceType==='gathering').every(row=>row.chance===.0012),'gathering pets use 0.12% per-action rate');
ok(asterfallActivity.filter(row=>row.sourceType==='exploration').every(row=>row.chance===.002),'exploration pets use 0.20% per-route rate');

equal(corePetActivityDropsForSource('gathering','COPPER_VEIN')[0]?.petId,'PET_001','Copper Vein can discover Pebblemole');
equal(corePetActivityDropsForSource('exploration','SCOUT_GREENFIELDS')[0]?.petId,'PET_010','Greenfields exploration can discover Redfeather Chick');
equal(corePetActivityDropsForSource('combat','IRONWOOD_WOLF')[0]?.petId,'PET_004','Ironwood Wolf can drop Mossback Pup');

let state=createCharacter(newGame(1),'IRONWARDEN','Pet Hunter');
const forced=applyCorePetCombatDrops(state,'OATHGLASS_REVENANT',1,'forced',()=>0);
state=forced.state;
equal(forced.drops.length,1,'forced signature roll awards one pet');
equal(forced.drops[0]?.petId,'PET_018','forced signature roll awards Oathling');
ok(state.account.unlockedCosmeticPetIds?.includes('PET_018'),'signature pet is account-owned');
ok(state.character?.ownedPetIds?.includes('PET_018'),'legacy character mirror is maintained');

const duplicate=applyCorePetCombatDrops(state,'OATHGLASS_REVENANT',5000,'duplicate',()=>0);
equal(duplicate.drops.length,0,'owned signature pet cannot drop again');
equal(state.account.unlockedCosmeticPetIds?.filter(id=>id==='PET_018').length,1,'signature pet ownership is duplicate-protected');

let gatherState=createCharacter(newGame(2),'IRONWARDEN','Gather Hunter');
const gather=applyCorePetActivityDrops(gatherState,'gathering','COPPER_VEIN',1,'gather',()=>0);
gatherState=gather.state;
equal(gather.drops[0]?.petId,'PET_001','forced gathering roll awards Pebblemole');
ok(gatherState.account.unlockedCosmeticPetIds?.includes('PET_001'),'gathering pet is account-owned');
equal(applyCorePetActivityDrops(gatherState,'gathering','COPPER_VEIN',5000,'duplicate-gather',()=>0).drops.length,0,'gathering pet is duplicate-protected');

const exploration=applyCorePetActivityDrops(createCharacter(newGame(3),'IRONWARDEN','Map Hunter'),'exploration','SCOUT_GREENFIELDS',1,'explore',()=>0);
equal(exploration.drops[0]?.petId,'PET_010','forced exploration roll awards Redfeather Chick');

const regularCombat=applyCorePetCombatDrops(createCharacter(newGame(4),'IRONWARDEN','Wolf Hunter'),'IRONWOOD_WOLF',1,'wolf',()=>0);
equal(regularCombat.drops[0]?.petId,'PET_004','forced regular combat roll awards Mossback Pup');

equal(resolveCorePetActivityDrops(createCharacter(newGame(5),'IRONWARDEN','No Source'),'gathering','UNKNOWN_NODE',100000,'wrong-source',()=>0).length,0,'unconfigured activities cannot award pets');
equal(resolveCorePetCombatDrops(createCharacter(newGame(6),'IRONWARDEN','No Luck'),'OATHGLASS_REVENANT',100,'no-luck',()=>1).length,0,'failed rolls award no pet');

ok(rewardHasProgress({xp:0,gold:0,items:[],kills:0,elapsedSeconds:0,petDrops:[{petId:'PET_018',name:'Oathling',sourceId:'OATHGLASS_REVENANT'}]}),'pet-only rewards count as meaningful progress');

console.log('PASS: regional signature and Asterfall activity pet drops validate');
