import {COLLECTIBLES,validateCollectibleCatalog} from '../src/content/collectibles';
import {collectionBonusBreakdown,selectCollectible,unlockCollectible} from '../src/core/collectibles';
import {createCharacter,newGame} from '../src/core/game';
const fail=(message:string)=>{throw new Error(message)};const state=unlockCollectible(createCharacter(newGame(1),'IRONWARDEN','Mira'),'pet_harvest_fox');validateCollectibleCatalog();if(COLLECTIBLES.length!==15)fail('catalog');if(collectionBonusBreakdown(state).find(row=>row.target==='gold')?.ownedAppliedBps!==50)fail('owned bonus');const active=selectCollectible(state,'pet','pet_harvest_fox');if(active.character?.selectedCosmeticPetId!=='pet_harvest_fox')fail('selection');console.log('account collectibles PASS');
