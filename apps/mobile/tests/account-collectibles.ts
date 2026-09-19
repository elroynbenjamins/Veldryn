import {COLLECTIBLES,LEGACY_PET_COLLECTIBLES,PROFILE_COLLECTIBLES,validateCollectibleCatalog} from '../src/content/collectibles';
import {CORE_PET_COLLECTIBLES,validateCorePetCatalog} from '../src/content/core-pets';
import {EVENT_PET_COLLECTIBLES} from '../src/content/event-collectible-content';
import {collectionBonusBreakdown,selectCollectible,unlockCollectible} from '../src/core/collectibles';
import {normalizeOwnedPetIds,normalizeSelectedPetId} from '../src/core/pet-collection';
import {createCharacter,newGame} from '../src/core/game';
import {migrateSave} from '../src/core/save-migrations';

const fail=(message:string)=>{throw new Error(message)};
const equal=(actual:unknown,expected:unknown,message:string)=>{if(actual!==expected)fail(`${message}: expected ${String(expected)}, got ${String(actual)}`)};

validateCollectibleCatalog();
validateCorePetCatalog();

equal(CORE_PET_COLLECTIBLES.length,33,'canonical core pet count');
equal(EVENT_PET_COLLECTIBLES.length,19,'event pet count');
equal(
  COLLECTIBLES.length,
  CORE_PET_COLLECTIBLES.length+EVENT_PET_COLLECTIBLES.length+LEGACY_PET_COLLECTIBLES.length+PROFILE_COLLECTIBLES.length,
  'combined collectible catalog count',
);

const coreIds=CORE_PET_COLLECTIBLES.map(row=>row.id);
equal(coreIds[0],'PET_001','first core pet id');
equal(coreIds[32],'PET_033','last core pet id');
equal(new Set(coreIds).size,33,'core pet ids are unique');

let state=unlockCollectible(createCharacter(newGame(1),'IRONWARDEN','Mira'),'PET_001');
if(collectionBonusBreakdown(state).find(row=>row.target==='gatheringYield')?.ownedAppliedBps!==50)fail('owned core pet bonus');
state=selectCollectible(state,'pet','PET_001');
equal(state.character?.selectedCosmeticPetId,'PET_001','canonical pet selection');

const normalized=normalizeOwnedPetIds([' PET_001 ','legacy_unknown_pet'],['PET_001','EVT_PET_001']);
equal(normalized.join(','),'PET_001,legacy_unknown_pet,EVT_PET_001','ownership normalizer preserves unknown legacy ids and deduplicates');
equal(normalizeSelectedPetId('legacy_unknown_pet',normalized),'legacy_unknown_pet','owned legacy selection is preserved');
equal(normalizeSelectedPetId('not_owned',normalized),undefined,'unowned selection is cleared');

const saveWithPets={...state,account:{...state.account,unlockedCosmeticPetIds:['PET_001','PET_018','EVT_PET_001','legacy_unknown_pet']},character:state.character?{...state.character,selectedCosmeticPetId:'PET_018',ownedPetIds:['PET_001','PET_018']}:null};
const migrated=migrateSave(JSON.parse(JSON.stringify(saveWithPets)));
equal(migrated.account.unlockedCosmeticPetIds?.join(','),'PET_001,PET_018,EVT_PET_001,legacy_unknown_pet','save migration preserves core, event and unknown legacy pet ownership');
equal(migrated.character?.selectedCosmeticPetId,'PET_018','save migration preserves an owned selected canonical pet');

console.log('account collectibles PASS');
