import {NOVICE_ITEMS,NOVICE_RECIPES,NOVICE_SETS,noviceItemId,noviceRecipeId} from '../src/content/novice-sets';
import {CLASSES} from '../src/content/classes';
import {ITEMS,itemDef} from '../src/content/items';
import {RECIPES} from '../src/content/skills';
import {createCharacter,newGame,craftRecipe,equipNoviceSet,equipItem,unequipItem,effectiveStats} from '../src/core/game';
import {noviceSetProgress} from '../src/core/character-appearance';
import {recipeAvailability} from '../src/core/playability';
import {migrateSave} from '../src/core/save-migrations';
import {GameState} from '../src/core/types';

function ok(value:boolean,message:string){if(!value)throw new Error(message)}
function rejects(action:()=>unknown,message:string){let failed=false;try{action()}catch{failed=true}ok(failed,message)}
function count(state:GameState,id:string){return [...state.inventory.stacks,...state.bank.stacks,...state.overflow.stacks].filter(s=>s.itemId===id).reduce((n,s)=>n+s.quantity,0)+Object.values(state.character!.equipment).filter(item=>item===id).length}

ok(NOVICE_SETS.length===9&&NOVICE_ITEMS.length===90&&NOVICE_RECIPES.length===90,'Nine complete ten-piece sets and ninety unique piece recipes');
ok(new Set(ITEMS.map(item=>item.id)).size===ITEMS.length,'No item ID collisions');

for(const set of NOVICE_SETS){
  for(const body of ['male','female'] as const){
    const initial=createCharacter(newGame(1000),set.classId,'Novice',body);
    ok(!noviceSetProgress(initial).unlocked,'No free novice unlock');
    ok(Object.values(initial.character!.equipment).length===1,'Creation still grants one weapon');
    let state:GameState={...initial,character:{...initial.character!,level:5,gold:1000},bank:{...initial.bank,stacks:[{itemId:'COPPER_ORE',quantity:400},{itemId:'GREENWOOD_LOG',quantity:400},{itemId:'MOSS_FIBER',quantity:200}]}};
    const snapshot=JSON.stringify(state);
    rejects(()=>craftRecipe(state,noviceRecipeId(set.classId,'weapon')),'Weapon requires chest first');
    ok(JSON.stringify(state)===snapshot,'Failed craft does not mutate input');
    const other=NOVICE_SETS.find(candidate=>candidate.classId!==set.classId)!;
    rejects(()=>craftRecipe(state,noviceRecipeId(other.classId,'chest')),'Cross-class crafting rejected');
    for(const slot of set.slots){
      const id=noviceItemId(set.classId,slot),recipeId=noviceRecipeId(set.classId,slot);
      ok(recipeAvailability(state,recipeId).ready,'Workshop eligibility agrees with core');
      state=craftRecipe(state,recipeId);
      ok(count(state,id)===1,'Crafted one piece into storage');
      ok(state.character!.craftedNoviceItemIds!.includes(id),'Crafting history records each piece');
      if(slot==='chest')ok(equipItem(state,id).character!.equipment.chest===id,'Single armor piece equips independently');
    }
    const cost=NOVICE_RECIPES.filter(recipe=>recipe.classId===set.classId).reduce((sum,recipe)=>sum+recipe.gold,0);
    ok(state.character!.gold===1000-cost,'Exact crafting cost deducted');
    ok(noviceSetProgress(state).unlocked,'All pieces unlock completion milestone');
    const equipped=equipNoviceSet(state);
    ok(noviceSetProgress(equipped).pieces.every(piece=>piece.equipped),'Bulk equip uses every owned gameplay piece');
    ok(effectiveStats(equipped).defense>effectiveStats(initial).defense,'Armor affects gameplay stats');
    ok(equipped.character!.currentHp<=effectiveStats(equipped).hp,'Health remains bounded');
    ok(count(equipped,CLASSES.find(candidate=>candidate.id===set.classId)!.starterEquipment.weapon)===1,'Starting weapon preserved in storage');
    const again=equipNoviceSet(equipped);
    for(const slot of set.slots)ok(count(again,noviceItemId(set.classId,slot))===1,'Repeat equip cannot duplicate gear');
    const loaded=migrateSave(JSON.parse(JSON.stringify(equipped)));
    ok(noviceSetProgress(loaded).pieces.every(piece=>piece.equipped)&&noviceSetProgress(loaded).unlocked,'Save/load preserves equipment and milestone');
    ok(loaded.character!.bodyPresentation===body,'Gender survives save/load');
    const removed=unequipItem(equipped,'helmet');
    ok(!noviceSetProgress(removed).pieces.every(piece=>piece.equipped),'Removing a piece updates equipment state');
    ok(noviceSetProgress(removed).unlocked,'Crafting milestone remains unlocked after unequip');
    const incompatible={...equipped,inventory:{...equipped.inventory,stacks:[...equipped.inventory.stacks,{itemId:noviceItemId(set.classId,'cape'),quantity:1}]},character:{...equipped.character!,equipment:{...equipped.character!.equipment,cape:'OATHGLASS_CAPE'}}};
    const restored=equipNoviceSet(incompatible);
    ok(noviceSetProgress(restored).pieces.every(piece=>piece.equipped)&&count(restored,'OATHGLASS_CAPE')===1,'Set equip stores incompatible cape');
    const foreignId=noviceItemId(other.classId,'chest');
    rejects(()=>equipItem({...state,inventory:{...state.inventory,stacks:[...state.inventory.stacks,{itemId:foreignId,quantity:1}]}},foreignId),'Cross-class equip rejected');
    const missing={...state,inventory:{...state.inventory,stacks:state.inventory.stacks.filter(stack=>stack.itemId!==noviceItemId(set.classId,'helmet'))}};
    rejects(()=>equipNoviceSet(missing),'Missing piece cannot be granted by equip-all');
    const bankOnly={...state,bank:{...state.bank,stacks:[...state.bank.stacks,...state.inventory.stacks.filter(stack=>itemDef(stack.itemId).noviceSetId)]},inventory:{...state.inventory,stacks:state.inventory.stacks.filter(stack=>!itemDef(stack.itemId).noviceSetId)}};
    ok(noviceSetProgress(equipNoviceSet(bankOnly)).pieces.every(piece=>piece.equipped),'Equip-all consumes owned Bank pieces');
    const cramped:GameState={...equipped,character:{...equipped.character!,equipment:{...equipped.character!.equipment,weapon:CLASSES.find(candidate=>candidate.id===set.classId)!.starterEquipment.weapon,cape:'OATHGLASS_CAPE'}},inventory:{stacks:[],capacity:0},bank:{stacks:[{itemId:noviceItemId(set.classId,'weapon'),quantity:1}],capacity:1}};
    const crampedBefore=JSON.stringify(cramped);
    rejects(()=>equipNoviceSet(cramped),'Cannot discard replaced gear when storage is full');
    ok(JSON.stringify(cramped)===crampedBefore,'Failed bulk equip is atomic');
  }
}

const fresh=createCharacter(newGame(1000),'IRONWARDEN');
const rich={...fresh,bank:{...fresh.bank,stacks:[{itemId:'COPPER_ORE',quantity:100},{itemId:'GREENWOOD_LOG',quantity:100},{itemId:'MOSS_FIBER',quantity:100}]}};
const chest=craftRecipe(rich,noviceRecipeId('IRONWARDEN','chest'));
rejects(()=>craftRecipe(chest,noviceRecipeId('IRONWARDEN','weapon')),'Character-level gate enforced');
const legacy=migrateSave(JSON.parse(JSON.stringify(fresh)));
ok(noviceSetProgress(legacy).crafted===0,'Old saves get no free crafting history');
rejects(()=>craftRecipe({...rich,character:{...rich.character!,gold:0}},noviceRecipeId('IRONWARDEN','chest')),'Insufficient gold fails');
rejects(()=>craftRecipe(fresh,noviceRecipeId('IRONWARDEN','chest')),'Insufficient materials fail');
const noRoom:GameState={...rich,inventory:{stacks:[],capacity:0},bank:{...rich.bank,capacity:3}};
const noRoomBefore=JSON.stringify(noRoom);
rejects(()=>craftRecipe(noRoom,noviceRecipeId('IRONWARDEN','chest')),'Craft output requires storage');
ok(JSON.stringify(noRoom)===noRoomBefore,'Failed craft does not spend materials or record history');
console.log(`PASS: 18 novice variants, ${RECIPES.length} recipes including capes, amulets and rings, class/stage gates, bank crafting, atomic equip and save migration`);
