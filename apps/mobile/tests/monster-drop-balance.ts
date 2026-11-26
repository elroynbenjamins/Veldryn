import {MONSTERS} from '../src/content/monsters';
import {GATHERING_TOOLS,roundDownToolBlueprintDropChance} from '../src/content/gathering-tools';
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
 closeTo(dropChance(source.monsterId,HOLY_WATER_ID),source.chance,`${source.monsterId} Holy Water uses the final whole-percent Faith rate without a second 5% cut`);
}
closeTo(dropChance('MOSS_RAT','MOSS_FIBER'),.55*.5*.95,'Ordinary material keeps the 50% adjustment followed by the 5% reduction');
closeTo(dropChance('ANCIENT_TREANT','IRONWOOD_LOG'),.52*.5*.95,'Original Ironwood Forest source remains at reduced probability');
closeTo(dropChance('IRONBACK_MOLE','COPPER_ORE'),.30*.5*.95,'Alternative Copper Ore source stays available');
closeTo(dropChance('CAVE_SKITTER','BP_ASTER_IRON_PICKAXE'),.006,'Tier-2 pickaxe blueprint must drop at 0.60%');
for(const tool of GATHERING_TOOLS){
 if(!tool.blueprint)continue;
 const source=tool.blueprint.sourceMonsterId;
 const drop=dropChance(source,tool.blueprint.itemId);
 const expected=roundDownToolBlueprintDropChance(tool.blueprint.dropChance*.95);
 check(expected>=.0025&&expected<=.006,source+' final drop chance must be within 0.25%-0.60%');
 closeTo(drop,expected,source+' blueprint gets -25% then -50% rarity adjustments and rounds down to 0.05 percentage points');
}
closeTo(dropChance('FALLEN_SENTINEL','BP_OATHSTONE_PICKAXE'),.0045,'Tier-3 pickaxe blueprint must drop at 0.45%');
check(dropChance('RUNEBOUND_MINER','BP_OATHSTONE_PICKAXE')===undefined,'Old Runebound Miner source must no longer drop the Tier-3 pickaxe blueprint');
closeTo(dropChance('FROSTWOLF','BP_FROSTIRON_HATCHET'),.0025,'Tier-4 hatchet blueprint must drop at 0.25%');
closeTo(dropChance('ANCIENT_TREANT','THORN_SAP'),.30*.5*.95,'Non-blueprint Thorn Sap keeps its original independent adjustment');

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
check(MONSTERS.every(m=>m.drops.every(drop=>drop.itemId!=='FALLEN_KNIGHT_SIGIL')),'Retired Sigil is not obtainable from any monster');
check(dropChance('ECHO_BAT','ECHO_BAT_WING')===undefined,'Retired Echo Bat Wing is not obtainable from Echo Bat');
check(dropChance('ECHO_BAT','WISP_DUST')!==undefined,'Echo Bat retains Wisp Dust after wing retirement');
check(dropChance('ECHO_BAT','OATHGLASS_SHARD')!==undefined,'Echo Bat retains Oathglass Shard after wing retirement');
check(dropChance('FALLEN_KNIGHT','ECHO_TOUCHED_PELT')===1,'Fallen Knight keeps guaranteed pelts');
check(dropChance('FALLEN_KNIGHT','TORN_OATHCLOTH')===1,'Fallen Knight keeps guaranteed oathcloth');
for(const bossDrop of monster('FALLEN_KNIGHT').drops.filter(drop=>drop.chance===1)){
 closeTo(bossDrop.chance,1,`Guaranteed boss drop ${bossDrop.itemId} remains guaranteed`);
}
check(MONSTERS.every(m=>m.drops.every(d=>d.chance>=0&&d.chance<=1)),'All combat drop probabilities stay valid');
console.log('PASS monster loot balance: final Faith Holy Water odds, -5% other random chances, three enemy removals, Echo Bat Wing retired, guaranteed bosses protected');
