import {CORE_PET_COLLECTIBLES,validateCorePetCatalog} from '../src/content/core-pets';

function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)}

validateCorePetCatalog();
equal(CORE_PET_COLLECTIBLES.length,33,'VELDRYN has 33 canonical permanent pets');
equal(CORE_PET_COLLECTIBLES.filter(row=>row.region==='Asterfall').length,18,'Asterfall core pet count');
equal(CORE_PET_COLLECTIBLES.filter(row=>row.region==='Sunscar').length,5,'Sunscar core pet count');
equal(CORE_PET_COLLECTIBLES.filter(row=>row.region==='Frostmarch').length,5,'Frostmarch core pet count');
equal(CORE_PET_COLLECTIBLES.filter(row=>row.region==='Ashlands').length,5,'Ashlands core pet count');
equal(CORE_PET_COLLECTIBLES.filter(row=>row.nativeSize===64).length,7,'large native pet count');
console.log('PASS: canonical 33-pet content registry validates');
