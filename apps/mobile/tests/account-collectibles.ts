import {COLLECTIBLES,PROFILE_COLLECTIBLES,validateCollectibleCatalog} from '../src/content/collectibles';
import {CORE_PET_COLLECTIBLES,validateCorePetCatalog} from '../src/content/core-pets';
import {EVENT_PET_COLLECTIBLES} from '../src/content/event-collectible-content-active';
import {GUILD_PET_COLLECTIBLES} from '../src/content/guild-pets-v1';
import {collectionBonusBreakdown,selectCollectible,unlockCollectible} from '../src/core/collectibles';
import {normalizeOwnedPetIds,normalizeSelectedPetId} from '../src/core/pet-collection';
import {createCharacter,newGame} from '../src/core/game';
import {migrateSave} from '../src/core/save-migrations';
import {reconcileAccountCollections} from '../src/core/account-collections';
import {createAccountCharacter,deleteAccountCharacter,switchAccountCharacter} from '../src/core/account-actions';
import {profileBackgroundUnlocked,profileTitleUnlocked} from '../src/core/profile-unlocks';
import {executeGameCommand} from '../src/core/game-commands';
import {EVENTS_RELEASED} from '../src/core/release-flags';

const fail=(message:string)=>{throw new Error(message)};
const equal=(actual:unknown,expected:unknown,message:string)=>{if(actual!==expected)fail(`${message}: expected ${String(expected)}, got ${String(actual)}`)};

validateCollectibleCatalog();
validateCorePetCatalog();

equal(CORE_PET_COLLECTIBLES.length,33,'canonical core pet count');
equal(EVENT_PET_COLLECTIBLES.length,2,'released event pet count');
equal(
  COLLECTIBLES.length,
  CORE_PET_COLLECTIBLES.length+GUILD_PET_COLLECTIBLES.length+(EVENTS_RELEASED?EVENT_PET_COLLECTIBLES.length:0)+PROFILE_COLLECTIBLES.filter(row=>row.collectionGroup!=='event').length,
  'combined collectible catalog count',
);

const coreIds=CORE_PET_COLLECTIBLES.map(row=>row.id);
equal(coreIds[0],'PET_001','first core pet id');
equal(coreIds[32],'PET_033','last core pet id');
equal(new Set(coreIds).size,33,'core pet ids are unique');

let state=unlockCollectible(createCharacter(newGame(1),'IRONWARDEN','Mira'),'PET_001');
state.quests=state.quests.map(q=>q.questId==='QST_003'?{...q,status:'claimed'}:q);
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


/** A second character inherits ownership/progression, never the first character's selection. */
const now=1700000000000;
let primary=createCharacter(newGame(now),'IRONWARDEN','Collection Main');
primary={...primary,
 account:{...primary.account,unlockedCharacterSlots:2,unlockedOutfitIds:['OUTFIT_ACCOUNT_TEST'],unlockedCosmeticPetIds:['PET_001']},
 character:{...primary.character!,level:25,ownedPetIds:['PET_018'],selectedCosmeticPetId:'PET_001',equippedOutfitId:'OUTFIT_ACCOUNT_TEST'},
};
primary=reconcileAccountCollections(primary);
if(!primary.account.unlockedTitleIds?.includes('oathbound'))fail('earned titles persist as account unlocks');
if(!primary.account.unlockedProfileBackgroundIds?.includes('oathglass-hall'))fail('earned backgrounds persist as account unlocks');
if(!primary.account.unlockedCosmeticPetIds?.includes('PET_018'))fail('legacy character pet becomes account owned');
let alternate=createAccountCharacter(primary,'BASTION','Collection Alt','male',now+1);
equal(alternate.character?.equippedOutfitId,undefined,'new character has independent outfit selection');
equal(alternate.character?.selectedCosmeticPetId,undefined,'new character has independent pet selection');
if(!alternate.account.unlockedCosmeticPetIds?.includes('PET_018'))fail('account pet collection shared across characters');
if(!profileTitleUnlocked(alternate,'oathbound'))fail('account-earned title available to low-level alt');
if(!profileBackgroundUnlocked(alternate,'oathglass-hall'))fail('account-earned background available to low-level alt');
if(collectionBonusBreakdown(alternate).find(row=>row.target==='gatheringYield')?.ownedAppliedBps!==50)fail('alt receives shared passive pet collection bonus');
alternate=executeGameCommand(alternate,{type:'outfit_select',args:{id:'OUTFIT_ACCOUNT_TEST'}},now+2).state;
equal(alternate.character?.equippedOutfitId,'OUTFIT_ACCOUNT_TEST','alt may select owned full-character outfit');
let rejected=false;
try{executeGameCommand(alternate,{type:'outfit_select',args:{id:'OUTFIT_UNOWNED'}},now+3);}catch{rejected=true;}
if(!rejected)fail('unowned outfit must be rejected server-side');
alternate=switchAccountCharacter(alternate,primary.character!.id,now+4);
equal(alternate.character?.selectedCosmeticPetId,'PET_001','original character retains its own pet selection');
equal(alternate.character?.equippedOutfitId,'OUTFIT_ACCOUNT_TEST','original character retains its outfit selection');
alternate=switchAccountCharacter(alternate,'LOCAL_CHAR_2',now+5);
equal(alternate.character?.selectedCosmeticPetId,undefined,'alt does not copy first character pet selection');
equal(alternate.character?.equippedOutfitId,'OUTFIT_ACCOUNT_TEST','alt outfit selection survives switches');
alternate=deleteAccountCharacter(alternate,primary.character!.id,'DELETE Collection Main',now+6);
if(!alternate.account.unlockedCosmeticPetIds?.includes('PET_018'))fail('deleting original owner must preserve pet');
if(!alternate.account.unlockedTitleIds?.includes('oathbound'))fail('deleting original owner must preserve earned title');
if(!alternate.account.unlockedProfileBackgroundIds?.includes('oathglass-hall'))fail('deleting original owner must preserve earned background');
if(!alternate.account.unlockedOutfitIds?.includes('OUTFIT_ACCOUNT_TEST'))fail('deleting original owner must preserve outfit');

const legacyAltOnly=JSON.parse(JSON.stringify(createAccountCharacter(primary,'BASTION','Legacy Alt','male',now+7)));
legacyAltOnly.account.unlockedCosmeticPetIds=[];
legacyAltOnly.otherCharacters[0].character.ownedPetIds=['PET_018'];
legacyAltOnly.character.selectedCosmeticPetId='PET_018';
const migratedAltOnly=migrateSave(legacyAltOnly);
if(!migratedAltOnly.account.unlockedCosmeticPetIds?.includes('PET_018'))fail('legacy pet owned only by inactive character must migrate to account');
equal(migratedAltOnly.character?.selectedCosmeticPetId,'PET_018','old selected pet survives account-wide migration');

console.log('account collectibles PASS');
