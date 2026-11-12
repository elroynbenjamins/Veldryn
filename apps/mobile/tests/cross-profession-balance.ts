import {ALCHEMY_RECIPES} from '../src/content/alchemy';
import {CROSS_PROFESSION_COMPONENT_RECIPES} from '../src/content/cross-profession-components';
import {RECIPES} from '../src/content/skills';
import {V33_EQUIPMENT_RECIPES} from '../src/content/equipment-recipes-v33';
import {marketCatalogCandidate} from '../src/core/player-market-readiness';

function ok(v:unknown,message:string){if(!v)throw new Error(message);}
function equal(actual:unknown,expected:unknown,message:string){
 if(actual!==expected)throw new Error(message+': expected '+expected+', got '+actual);
}
function set(tier:string,classId:string,path:'Foundation'|'Alternate'){
 const pieces=V33_EQUIPMENT_RECIPES.filter(row=>row.v33EquipmentTier===tier&&row.classId===classId&&row.v33Path===path);
 equal(pieces.length,10,tier+' '+classId+' '+path+' must retain a complete 10-piece set');
 return pieces;
}
function count(pieces:readonly (typeof V33_EQUIPMENT_RECIPES[number])[],itemId:string){
 return pieces.reduce((sum,piece)=>sum+(piece.inputs.find(input=>input.itemId===itemId)?.quantity??0),0);
}
function component(id:string){const recipe=CROSS_PROFESSION_COMPONENT_RECIPES.find(row=>row.id===id);ok(recipe,id+' must exist');return recipe!;}
function input(recipe:{inputs:readonly {itemId:string;quantity:number}[]},id:string){
 return recipe.inputs.find(row=>row.itemId===id)?.quantity??0;
}

// Exactly the approved moderate changes, with all slot-specific rounding reconciled.
const t2SmithAlt=set('T2','IRONWARDEN','Alternate');
const t2TailorAlt=set('T2','WAYFINDER','Alternate');
equal(count(t2SmithAlt,'IRONWOOD_FANG'),173,'T2 Alternate Smithing direct Fang sink');
equal(count(t2SmithAlt,'PADDED_LININGS'),20,'T2 Alternate Smithing extra padded linings');
equal(count(t2SmithAlt,'IRONWOOD_BINDING_RESIN'),10,'T2 smithing still requires ten binders');
equal(count(t2SmithAlt,'IRONWOOD_FANG')+10*2,193,'T2 Smithing all-in Fangs including resin');
equal(count(t2TailorAlt,'TROLL_HIDE'),174,'T2 Alternate Tailoring Troll Hides');
equal(count(t2TailorAlt,'REINFORCED_BUCKLES'),20,'T2 Alternate Tailoring extra metal buckles');
equal(count(set('T2','IRONWARDEN','Foundation'),'PADDED_LININGS'),10,'T2 Foundation Smithing is unchanged');
equal(count(set('T2','WAYFINDER','Foundation'),'REINFORCED_BUCKLES'),10,'T2 Foundation Tailoring is unchanged');

for(const path of ['Foundation','Alternate'] as const){
 const smithT3=set('T3','IRONWARDEN',path),smithT4=set('T4','IRONWARDEN',path);
 const tailorT4=set('T4','WAYFINDER',path);
 equal(count(smithT3,'DUNEWOOD'),590,'T3 Smithing modest direct Dunewood trim');
 equal(count(smithT4,'DUNEWOOD'),321,'T4 Smithing modest direct Dunewood trim');
 equal(count(tailorT4,'SUNSCALE'),311,'T4 Tailoring modest Sunscale trim');
 equal(count(smithT3,'REINFORCED_STRAPS'),18,'T3 Smithing component count stays unchanged');
 equal(count(smithT4,'REINFORCED_STRAPS'),28,'T4 Smithing component count stays unchanged');
 equal(count(set('T3','WAYFINDER',path),'ARMOR_RIVETS'),18,'T3 Tailoring component count stays unchanged');
 equal(count(tailorT4,'ARMOR_RIVETS'),28,'T4 Tailoring component count stays unchanged');
}
equal(count(set('T4','IRONWARDEN','Foundation'),'ASTRAL_SCRIPT')+10,42,'T4 Smithing Foundation scripts including mandatory binder');
equal(count(set('T4','WAYFINDER','Alternate'),'ASTRAL_SCRIPT')+10,42,'T4 Tailoring Alternate scripts including mandatory binder');

// Rivets now unlock at level 20 with raw Sunstone ore rather than gated level-26 smelting.
const rivets=component('FORGE_ARMOR_RIVETS');
equal(rivets.level,20,'Rivets must unlock at Smithing 20');
equal(input(rivets,'SUNSTONE_ORE'),3,'Main rivet recipe Sunstone Ore');
equal(input(rivets,'ASTER_IRON_INGOT'),1,'Main rivet recipe Aster-Iron');
equal(input(rivets,'SUNSTONE_INGOT'),0,'Main rivet route must not require level-26 smelting');
equal(RECIPES.find(row=>row.id==='SMELT_SUNSTONE_INGOT')?.level,26,'Sunstone smelting progression retained');

const reclaimed=component('FORGE_RECLAIMED_ARMOR_RIVETS');
equal(input(reclaimed,'FALLEN_RIVET'),1,'Reclaimed rivets consume one trophy');
equal(input(reclaimed,'SUNSTONE_ORE'),2,'Reclaimed rivets consume fewer ore');
equal(input(reclaimed,'ASTER_IRON_INGOT'),1,'Reclaimed rivets retain iron input');
const recycled=component('STITCH_RECYCLED_REINFORCED_STRAPS');
equal(input(recycled,'TORN_OATHCLOTH'),2,'Recycled straps consume older cloth drops');
equal(input(recycled,'SUNSCALE'),2,'Recycled straps use reduced Sunscale');
equal(input(recycled,'DUNEWOOD'),2,'Recycled straps use reduced Dunewood');
for(const recipe of [reclaimed,recycled]){
 ok(recipe.repeatableTraining,'Recycling must retain profession XP');
 ok(marketCatalogCandidate(recipe.output.itemId),'Recycled output must be market eligible');
}

// Bulk route saves rare botanical essence without multiplying XP or eliminating common-resource costs.
const single=ALCHEMY_RECIPES.find(row=>row.id==='BREW_VERDANT_BINDING_RESIN')!;
const bulk=ALCHEMY_RECIPES.find(row=>row.id==='BREW_VERDANT_BINDING_RESIN_BULK')!;
ok(!!single&&!!bulk,'Single and optional bulk Verdant recipes must remain available');
equal(bulk.output.itemId,single.output.itemId,'Bulk and single resin outputs match');
equal(bulk.output.quantity,5,'Bulk Verdant makes five resins');
equal(input(bulk,'ASTERFALL_BOTANICAL_ESSENCE'),4,'Bulk Verdant saves one rare essence per five resins');
equal(input(bulk,'DEWLEAF'),35,'Bulk Verdant uses more common herbs');
equal(input(bulk,'MOSS_FIBER'),60,'Bulk Verdant preserves fiber demand');
equal(input(bulk,'WISP_DUST'),20,'Bulk Verdant uses more Wisp Dust');
equal(bulk.gold,110,'Bulk Verdant final Gold includes the standard 20% surcharge');
equal(bulk.xp,475,'Bulk Verdant XP equals five single batches');
equal(bulk.seconds,450,'Bulk Verdant base time equals five single batches');
equal(bulk.output.quantity*2,10,'Two bulk batches produce a full T1 ten-piece set');
equal(input(bulk,'ASTERFALL_BOTANICAL_ESSENCE')*2,8,'Full T1 set via bulk requires eight Essence');
console.log('PASS: moderate T1–T4 balance totals, alternative recycling routes, Smithing level progression and bulk resin XP');
