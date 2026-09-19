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
equal(CORE_PET_ACTIVITY_DROPS.length,29,'regular regional non-signature pet count');
equal(CORE_PET_ACTIVITY_DROPS.filter(row=>row.region==='Sunscar').length,4,'Sunscar regular pet source count');
equal(CORE_PET_ACTIVITY_DROPS.filter(row=>row.region==='Frostmarch').length,4,'Frostmarch regular pet source count');
equal(CORE_PET_ACTIVITY_DROPS.filter(row=>row.region==='Ashlands').length,4,'Ashlands regular pet source count');
equal(asterfallActivity.filter(row=>row.sourceType==='combat').length,4,'Asterfall regular combat pet count');
equal(asterfallActivity.filter(row=>row.sourceType==='gathering').length,8,'Asterfall regular gathering pet count');
equal(asterfallActivity.filter(row=>row.sourceType==='exploration').length,5,'Asterfall exploration pet count');
ok(asterfallActivity.filter(row=>row.sourceType==='combat').every(row=>row.chance===.001),'regular combat pets use 0.10% per-kill rate');
ok(asterfallActivity.filter(row=>row.sourceType==='gathering').every(row=>row.chance===.0012),'gathering pets use 0.12% per-action rate');
ok(asterfallActivity.filter(row=>row.sourceType==='exploration').every(row=>row.chance===.002),'exploration pets use 0.20% per-route rate');

equal(corePetActivityDropsForSource('gathering','COPPER_VEIN')[0]?.petId,'PET_001','Copper Vein can discover Pebblemole');
equal(corePetActivityDropsForSource('exploration','SCOUT_GREENFIELDS')[0]?.petId,'PET_010','Greenfields exploration can discover Redfeather Chick');
equal(corePetActivityDropsForSource('combat','IRONWOOD_WOLF')[0]?.petId,'PET_004','Ironwood Wolf can drop Mossback Pup');
equal(corePetActivityDropsForSource('combat','SUNSCAR_SCORPION')[0]?.petId,'PET_019','Sunscar Scorpion can drop Duneling');
equal(corePetActivityDropsForSource('exploration','SCOUT_SUNSCAR')[0]?.petId,'PET_020','Sunscar exploration can discover Mirage Minnow');
equal(corePetActivityDropsForSource('gathering','SUNSCALE_BLOOM')[0]?.petId,'PET_021','Sunscale Bloom can reveal Sunscarab');
equal(corePetActivityDropsForSource('combat','DUNE_ORACLE')[0]?.petId,'PET_022','Dune Oracle can drop Tiny Sphinx');
equal(corePetActivityDropsForSource('exploration','SCOUT_FROSTMARCH')[0]?.petId,'PET_024','Frostmarch exploration can discover Snowpuff Hare');
equal(corePetActivityDropsForSource('gathering','FROSTBELL_FLOWER')[0]?.petId,'PET_025','Frostbell Flower can reveal Rimecap');
equal(corePetActivityDropsForSource('combat','FROSTWOLF')[0]?.petId,'PET_026','Frostwolf can drop Bellfin Fry');
equal(corePetActivityDropsForSource('combat','BELLWRAITH')[0]?.petId,'PET_027','Bellwraith can drop Choir Pebble');
equal(corePetActivityDropsForSource('combat','BLACKGLASS_MIRELING')[0]?.petId,'PET_029','Blackglass Mireling can drop Coalbug');
equal(corePetActivityDropsForSource('gathering','ASHEN_MYRRH_GROVE')[0]?.petId,'PET_030','Ashen Myrrh can reveal Sootling');
equal(corePetActivityDropsForSource('exploration','SCOUT_ASHLANDS')[0]?.petId,'PET_031','Ashlands exploration can discover Ember Eel Fry');
equal(corePetActivityDropsForSource('combat','CINDER_TITAN')[0]?.petId,'PET_032','Cinder Titan can drop Forge Imp');

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

const regionalCombat=applyCorePetCombatDrops(createCharacter(newGame(7),'IRONWARDEN','Dune Hunter'),'DUNE_ORACLE',1,'dune',()=>0);
equal(regionalCombat.drops[0]?.petId,'PET_022','forced regional combat source awards Tiny Sphinx');

const regionalGathering=applyCorePetActivityDrops(createCharacter(newGame(8),'IRONWARDEN','Bloom Hunter'),'gathering','FROSTBELL_FLOWER',1,'frostbloom',()=>0);
equal(regionalGathering.drops[0]?.petId,'PET_025','forced regional gathering source awards Rimecap');

const regionalExploration=applyCorePetActivityDrops(createCharacter(newGame(9),'IRONWARDEN','Ash Scout'),'exploration','SCOUT_ASHLANDS',1,'ash-scout',()=>0);
equal(regionalExploration.drops[0]?.petId,'PET_031','forced regional exploration source awards Ember Eel Fry');

equal(resolveCorePetActivityDrops(createCharacter(newGame(5),'IRONWARDEN','No Source'),'gathering','UNKNOWN_NODE',100000,'wrong-source',()=>0).length,0,'unconfigured activities cannot award pets');
equal(resolveCorePetCombatDrops(createCharacter(newGame(6),'IRONWARDEN','No Luck'),'OATHGLASS_REVENANT',100,'no-luck',()=>1).length,0,'failed rolls award no pet');

ok(rewardHasProgress({xp:0,gold:0,items:[],kills:0,elapsedSeconds:0,petDrops:[{petId:'PET_018',name:'Oathling',sourceId:'OATHGLASS_REVENANT'}]}),'pet-only rewards count as meaningful progress');

console.log('PASS: regional signature and Asterfall activity pet drops validate');
