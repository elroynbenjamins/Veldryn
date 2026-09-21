import {MOBILE_GEM_FAMILIES_V1,mobileGemItemIdV1,type MobileGemGradeV1} from '../src/content/gems-v1';
import {GEM_ARTWORK_CELL_BY_KEY_V1,gemArtworkCellV1,hasGemArtworkV1} from '../src/theme/gem-assets';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}

ok(MOBILE_GEM_FAMILIES_V1.length===32,'Gem art coverage should track all 32 canonical gem families');
ok(Object.keys(GEM_ARTWORK_CELL_BY_KEY_V1).length===35,'Atlas should contain 32 gem families plus Dust and two Catalysts');

for(const family of MOBILE_GEM_FAMILIES_V1){
  for(const grade of [1,2,3,4,5] as MobileGemGradeV1[]){
    const itemId=mobileGemItemIdV1(family.familyId,grade);
    ok(hasGemArtworkV1(itemId),`Missing gem art for ${itemId}`);
    const cell=gemArtworkCellV1(itemId)!;
    ok(cell.column>=0&&cell.column<6&&cell.row>=0&&cell.row<6,`Invalid atlas cell for ${itemId}`);
  }
}
for(const itemId of ['GEM_DUST','REGIONAL_CATALYST','RADIANT_CATALYST']){
  ok(hasGemArtworkV1(itemId),`Missing progression-material art for ${itemId}`);
}
ok(!hasGemArtworkV1('NOT_A_GEM'),'Unknown items should not claim gem artwork');

console.log('gem artwork v1 tests passed');
