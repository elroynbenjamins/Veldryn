import {CORE_PET_COLLECTIBLES,validateCorePetCatalog} from '../src/content/core-pets';

function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)}

validateCorePetCatalog();
equal(CORE_PET_COLLECTIBLES.length,42,'VELDRYN has 42 canonical permanent pets');
equal(CORE_PET_COLLECTIBLES.filter(row=>row.region==='Asterfall').length,18,'Asterfall core pet count');
equal(CORE_PET_COLLECTIBLES.filter(row=>row.region==='Sunscar').length,8,'Sunscar core pet count');
equal(CORE_PET_COLLECTIBLES.filter(row=>row.region==='Frostmarch').length,8,'Frostmarch core pet count');
equal(CORE_PET_COLLECTIBLES.filter(row=>row.region==='Ashlands').length,8,'Ashlands core pet count');
equal(CORE_PET_COLLECTIBLES.filter(row=>row.nativeSize===64).length,12,'epic and mythic display-size count');
equal(CORE_PET_COLLECTIBLES.filter(row=>row.rarity==='Mythic').length,4,'one mythic pet per region');
console.log('PASS: canonical 42-pet content registry validates');
