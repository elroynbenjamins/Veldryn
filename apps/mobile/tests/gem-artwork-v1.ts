import {MOBILE_GEM_FAMILIES_V1,mobileGemItemIdV1,mobileRawGemItemIdV1,type MobileGemGradeV1} from '../src/content/gems-v1';
import {GEM_ARTWORK_CELL_BY_KEY_V1,gemArtworkCellV1,gemVisualIdentityV1,hasGemArtworkV1,hasRawGemArtworkV1} from '../src/theme/gem-assets';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}

ok(MOBILE_GEM_FAMILIES_V1.length===32,'Gem art coverage should track all 32 canonical gem families');
ok(Object.keys(GEM_ARTWORK_CELL_BY_KEY_V1).length===35,'Atlas should contain 32 gem families plus Dust and two Catalysts');

for(const family of MOBILE_GEM_FAMILIES_V1){
  for(const grade of [1,2,3,4,5] as MobileGemGradeV1[]){
    const itemId=mobileGemItemIdV1(family.familyId,grade);
    ok(hasGemArtworkV1(itemId),`Missing gem art for ${itemId}`);
    const identity=gemVisualIdentityV1(itemId);
    ok(identity?.grade===grade&&!identity.raw&&identity.familyId===family.familyId,`Refined grade identity incorrect: ${itemId}`);
    const rawId=mobileRawGemItemIdV1(family.familyId,grade),rawIdentity=gemVisualIdentityV1(rawId);
    ok(hasRawGemArtworkV1(rawId)&&rawIdentity?.raw===true&&rawIdentity.grade===grade&&rawIdentity.artworkId===itemId,`Raw gem must keep its own family artwork and grade: ${rawId}`);
    const cell=gemArtworkCellV1(itemId)!;
    ok(cell.column>=0&&cell.column<6&&cell.row>=0&&cell.row<6,`Invalid atlas cell for ${itemId}`);
  }
}
for(const itemId of ['GEM_DUST','REGIONAL_CATALYST','RADIANT_CATALYST']){
  ok(hasGemArtworkV1(itemId),`Missing progression-material art for ${itemId}`);
}
ok(!hasGemArtworkV1('NOT_A_GEM'),'Unknown items should not claim gem artwork');
ok(!gemVisualIdentityV1('raw_gem:unknown:g3'),'Unknown raw gem should not be presented as a known family');
const uniqueFamilyCells=new Set(MOBILE_GEM_FAMILIES_V1.map(family=>{
  const cell=gemArtworkCellV1(mobileGemItemIdV1(family.familyId,1))!;
  return cell.column+':'+cell.row;
}));
ok(uniqueFamilyCells.size===32,'Each raw gem family should use an independently identifiable atlas icon');

console.log('gem artwork v1 tests passed');
