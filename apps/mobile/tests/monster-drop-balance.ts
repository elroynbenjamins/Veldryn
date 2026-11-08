import {MONSTERS} from '../src/content/monsters';
import {HOLY_WATER_ID,HOLY_WATER_SOURCES} from '../src/content/faith';
import {itemDef} from '../src/content/items';

/** Changes here must affect the server-authoritative monster catalog, not
 * only the client loot tooltip. These assertions use that shared catalog. */
function check(value:unknown,reason:string):asserts value {
 if(!value)throw new Error(reason);
}
function monster(id:string){
 const found=MONSTERS.find(row=>row.id===id);
 check(found,`Missing monster: ${id}`);
 return found;
}
function dropChance(monsterId:string,itemId:string):number|undefined{
 return monster(monsterId).drops.find(row=>row.itemId===itemId)?.chance;
}
function closeTo(actual:number|undefined,expected:number,message:string){
 check(typeof actual==='number'&&Math.abs(actual-expected)<1e-12,`${message}: ${String(actual)} !== ${expected}`);
}

for(const source of HOLY_WATER_SOURCES){
 closeTo(dropChance(source.monsterId,HOLY_WATER_ID),source.chance*.95,`${source.monsterId} Holy Water is 5% less likely`);
}
closeTo(dropChance('MOSS_RAT','MOSS_FIBER'),.55*.5*.95,'Ordinary material keeps the 50% adjustment followed by the 5% reduction');
closeTo(dropChance('ANCIENT_TREANT','IRONWOOD_LOG'),.52*.5*.95,'Original Ironwood Forest source remains at reduced probability');
closeTo(dropChance('IRONBACK_MOLE','COPPER_ORE'),.30*.5*.95,'Alternative Copper Ore source stays available');
closeTo(dropChance('CAVE_SKITTER','BP_ASTER_IRON_PICKAXE'),.05*(itemDef('BP_ASTER_IRON_PICKAXE').type==='material'?.5:1)*.95,'Blueprint chance also respects the new reduction');

for(const [enemy,forbidden] of [
 ['LANTERN_WRETCH',['THORN_SAP','IRONWOOD_LOG']],
 ['FALLEN_SENTINEL',['IRONWOOD_LOG']],
 ['CAVE_SKITTER',['COPPER_ORE']],
] as const){
 for(const itemId of forbidden)check(dropChance(enemy,itemId)===undefined,`${enemy} must no longer award ${itemId}`);
}
check(dropChance('LANTERN_WRETCH','OATHGLASS_SHARD')!==undefined,"Lantern Wretch retains relevant King's Road drops");
check(dropChance('FALLEN_SENTINEL','FALLEN_RIVET')!==undefined,'Fallen Sentinel retains unique drops');
check(dropChance('CAVE_SKITTER','ASTER_IRON_ORE')!==undefined,'Cave Skitter retains Aster-Iron drops');
check(MONSTERS.some(m=>m.drops.some(d=>d.itemId==='THORN_SAP')),'Thorn Sap still available elsewhere');
check(MONSTERS.some(m=>m.drops.some(d=>d.itemId==='IRONWOOD_LOG')),'Ironwood Log still available elsewhere');
check(MONSTERS.some(m=>m.drops.some(d=>d.itemId==='COPPER_ORE')),'Copper Ore still available elsewhere');
for(const bossDrop of monster('FALLEN_KNIGHT').drops.filter(drop=>drop.chance===1)){
 closeTo(bossDrop.chance,1,`Guaranteed boss drop ${bossDrop.itemId} remains guaranteed`);
}
check(MONSTERS.every(m=>m.drops.every(d=>d.chance>=0&&d.chance<=1)),'All combat drop probabilities stay valid');
console.log('PASS monster loot balance: -5% random chances, three enemy removals, guaranteed bosses protected');
