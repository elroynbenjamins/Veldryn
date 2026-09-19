import {GLOBAL_CRAFT_RARITY_V29,guaranteedTokenQtyV29,targetQuantityBudgetV29,validateGlobalRarityV29} from './equipment-quantity-balance-v29';
import {rarityChancesV26} from './equipment-craft-rarity-v26';
function assert(cond:boolean,msg:string){if(!cond)throw new Error(msg);}
assert(validateGlobalRarityV29(),'global rarity validation');
assert(GLOBAL_CRAFT_RARITY_V29.Epic===.006,'epic chance');
assert(GLOBAL_CRAFT_RARITY_V29.Mythic===.001,'mythic chance');
for(const tier of ['T1','T2','T3','T4','T5','T6','T7','T8','T9'] as const){
 const chances=rarityChancesV26(tier,0,0,0);
 assert(chances.find(x=>x.rarity==='Epic')?.chance===.006,`${tier} epic`);
 assert(chances.find(x=>x.rarity==='Mythic')?.chance===.001,`${tier} mythic`);
}
assert(guaranteedTokenQtyV29('T1',30)===0,'T1 token guard');
assert(guaranteedTokenQtyV29('T2',30)===0,'T2 token guard');
assert(guaranteedTokenQtyV29('T9',135)>0,'T9 token grind');
const t9=targetQuantityBudgetV29('T9','Alternate','Weapon');
assert(t9.totalHours>7,'T9 weapon target');
assert(t9.dungeonMinutes>0,'T9 dungeon budget');
