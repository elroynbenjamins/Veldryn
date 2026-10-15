import {EQUIPMENT_ITEMS_V33} from '../src/content/equipment-items-v33';
import {ITEMS,itemDef} from '../src/content/items';
import catalog from '../src/content/equipment_catalog_t1_t9_v33.json';
import {EQUIPMENT_SETS} from '../src/content/equipment-sets';
import {CLASS_ICON_ACCENT} from '../src/content/class-icon-colors';

function ok(value:boolean,message:string){if(!value)throw new Error(message)}
ok(EQUIPMENT_ITEMS_V33.length===1620,'all v33 pieces have runtime item definitions');
ok(new Set(EQUIPMENT_ITEMS_V33.map(item=>item.id)).size===1620,'v33 piece IDs are unique');
ok(EQUIPMENT_ITEMS_V33.every(item=>item.type==='gear'&&item.equipmentSetId&&item.slot),'v33 pieces are gear');
ok(EQUIPMENT_ITEMS_V33.every(item=>itemDef(item.id)===item),'itemDef resolves every v33 piece');
ok(ITEMS.length>=1620,'v33 items are registered in the mobile item catalog');
ok(EQUIPMENT_SETS.every(set=>set.accent===CLASS_ICON_ACCENT[set.classId]),'equipment sets inherit their class icon color');
const grouped=new Map<string,Array<Record<string,unknown>>>();
for(const set of catalog.sets as Array<Record<string,unknown>>){
  const key=`${set.Tier}|${set.Class}`;
  const sets=grouped.get(key)??[];
  sets.push(set);grouped.set(key,sets);
}
ok(grouped.size===81,'every tier/class pair is present');
for(const [key,sets] of grouped){
  ok(sets.length===2,`${key} has exactly two build paths`);
  ok(sets.map(set=>set.Path).sort().join(',')==='Alternate,Foundation',`${key} retains Foundation and Alternate`);
  const [foundation,alternate]=sets;
  ok(foundation['Build Focus']!==alternate['Build Focus'],`${key} paths have distinct build focuses`);
  const stats=(set:Record<string,unknown>)=>['Primary Stat','Secondary Stat','Tertiary Stat'].map(field=>set[field]).join('|');
  ok(stats(foundation)!==stats(alternate),`${key} paths have distinct stat packages`);
  for(const field of ['2pc Bonus v33','4pc Bonus v33','6pc Bonus v33','8pc Bonus v33','10pc Bonus v33'])ok(foundation[field]!==alternate[field],`${key} paths have distinct ${field}`);
}
console.log('PASS: all 1,620 V33 equipment pieces resolve, with two distinct paths per class and tier');
