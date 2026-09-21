import {createCharacter,newGame} from '../src/core/game';
import {itemDef} from '../src/content/items';
import {gearEnhancement,equippedEffectGemResonance,socketGem} from '../src/core/equipment-enhancement';
import {combineGem,effectGemItemId,hasGemRecipe,learnGemRecipe,statGemItemId} from '../src/core/gem-progression';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}

const cutMight=statGemItemId('might',1),radiantMight=statGemItemId('might',5),cutMomentum=effectGemItemId('momentum',1);
ok(itemDef(cutMight).gemGrade===1&&itemDef(radiantMight).gemGrade===5,'Stat gems should register all five grades');
ok(itemDef(cutMomentum).gemFamilyId==='momentum','Effect gems should carry a stable family ID');

let state=createCharacter(newGame(1),'KNIFE_DANCER','Gem Test','male');
state={...state,character:{...state.character!,gold:100000,equipment:{...state.character!.equipment,chest:'NIGHTFANG_CHEST',gloves:'NIGHTFANG_GLOVES',ring:'NIGHTFANG_RING',cape:'NIGHTFANG_CAPE'}},inventory:{...state.inventory,capacity:99,stacks:[...state.inventory.stacks,{itemId:cutMight,quantity:3},{itemId:cutMomentum,quantity:4},{itemId:'GEM_DUST',quantity:100}]},bank:{...state.bank,capacity:99}};

const combined=combineGem(state,cutMight);
ok(combined.outputItemId===statGemItemId('might',2),'Three Cut gems should deterministically combine into one Polished gem');
ok(combined.state.character!.gold===state.character!.gold-1500,'Grade I combine should charge the configured gold');
ok((combined.state.inventory.stacks.find(s=>s.itemId===cutMight)?.quantity??0)===0,'Combining should consume three lower-grade gems');
ok((combined.state.inventory.stacks.find(s=>s.itemId=statGemItemId('might',2))?.quantity??0)===1,'Combining should grant the upgraded gem');

let socketed=socketGem(state,'NIGHTFANG_CHEST',cutMomentum);
socketed=socketGem(socketed,'NIGHTFANG_GLOVES',cutMomentum);
socketed=socketGem(socketed,'NIGHTFANG_RING',cutMomentum);
const resonance=equippedEffectGemResonance(socketed).find(row=>row.family==='momentum');
ok(resonance?.copies===3&&resonance.resonance3Active,'Three matching Effect Gems should activate Resonance III');
let fourthBlocked=false;try{socketGem(socketed,'NIGHTFANG_CAPE',cutMomentum)}catch{fourthBlocked=true}
ok(fourthBlocked,'A fourth active Effect Gem from the same family must be rejected');
ok(gearEnhancement(socketed,'NIGHTFANG_RING').effectGemId===cutMomentum,'The third gem should remain safely socketed');

ok(!hasGemRecipe(state,'momentum'),'Recipe should begin locked');
const learned=learnGemRecipe(state,'momentum');
ok(hasGemRecipe(learned,'momentum'),'Effect Gem recipes should unlock account-wide through knowledge');
const duplicate=learnGemRecipe(learned,'momentum');
ok((duplicate.inventory.stacks.find(s=>s.itemId==='GEM_DUST')?.quantity??0)===(learned.inventory.stacks.find(s=>s.itemId==='GEM_DUST')?.quantity??0)+25,'Duplicate recipes should convert into 25 Gem Dust');

console.log('PASS: gem progression content, combining, recipes, and Resonance');
