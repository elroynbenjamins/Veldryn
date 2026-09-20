import {petArtSource} from '../src/theme/pet-art';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}

for(const id of ['PET_001','PET_018','PET_033','EVT_PET_001','EVT_PET_019']){
  ok(petArtSource(id),`missing pet artwork for ${id}`);
}
ok(!petArtSource('NOT_A_PET'),'unknown pet ids should not resolve artwork');

console.log('PASS: pet artwork resolver covers permanent and event pet discovery UI');
