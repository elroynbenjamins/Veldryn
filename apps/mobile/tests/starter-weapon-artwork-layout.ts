import {assert} from './test-assert';
import {CLASSES} from '../src/content/classes';
import {STARTER_WEAPON_CELLS,starterWeaponArtworkLayout} from '../src/core/starter-weapon-artwork-layout';

const cells=Object.entries(STARTER_WEAPON_CELLS);
assert.equal(cells.length,9,'all nine starter weapon atlas cells are mapped');
assert.equal(new Set(cells.map(([,cell])=>cell.row*3+cell.column)).size,9,'each starter weapon occupies its own atlas cell');
for(const characterClass of CLASSES){
  assert.ok(starterWeaponArtworkLayout(characterClass.starterEquipment.weapon,52),characterClass.id+' starter weapon has artwork');
}
assert.equal(starterWeaponArtworkLayout('not-a-starter',52),null,'unknown items fall back to normal equipment art');
assert.equal(starterWeaponArtworkLayout('basic_bow',0),null,'zero-size sprites are not rendered');
assert.equal(starterWeaponArtworkLayout('basic_bow',Number.NaN),null,'invalid preview geometry fails quiet');

for(const size of [32,40,48,52,58,64,112]){
  const bow=starterWeaponArtworkLayout('basic_bow',size)!;
  const sword=starterWeaponArtworkLayout('basic_sword',size)!;
  assert.equal(bow.inset,.14,'bow uses the roomier crop');
  assert.ok(bow.displaySize<sword.displaySize,'bow is scaled down relative to the other starters');
  assert.ok(Math.abs(bow.displaySize/size-.72)<1e-10,'bow fits within 72% of the preview frame');
  for(const [id] of cells){
    const layout=starterWeaponArtworkLayout(id,size)!;
    const offset=size*layout.inset;
    const visibleLeft=layout.left+layout.column*layout.displaySize;
    const visibleTop=layout.top+layout.row*layout.displaySize;
    assert.ok(Math.abs(visibleLeft-offset)<1e-8&&Math.abs(visibleTop-offset)<1e-8,id+' correctly centers its atlas cell');
    assert.ok(visibleLeft>0&&visibleTop>0,id+' keeps top and left padding at size '+size);
    assert.ok(visibleLeft+layout.displaySize<size&&visibleTop+layout.displaySize<size,id+' keeps bottom and right padding at size '+size);
    assert.ok(Math.abs(layout.sheetSize-layout.displaySize*3)<1e-8,id+' retains accurate 3 by 3 atlas cropping');
    if(id!=='basic_bow')assert.equal(layout.inset,.06,id+' keeps its previous starter weapon scale');
  }
}
console.log('PASS starter weapon preview framing across all nine weapons and thumbnail sizes');
