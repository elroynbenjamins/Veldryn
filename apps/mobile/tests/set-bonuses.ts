import {createCharacter,craftRecipe,equipNoviceSet,effectiveStats,newGame} from '../src/core/game';
import {noviceItemId,noviceRecipeId} from '../src/content/novice-sets';
let state=createCharacter(newGame(0),'BASTION','Tester');
state={...state,character:{...state.character!,level:4,gold:500},bank:{...state.bank,stacks:[{itemId:'COPPER_ORE',quantity:500},{itemId:'GREENWOOD_LOG',quantity:500},{itemId:'MOSS_FIBER',quantity:500}]}};
for(const slot of ['chest','weapon','offhand','gloves','boots','helmet','legs'] as const)state=craftRecipe(state,noviceRecipeId('BASTION',slot));
const before=effectiveStats(state),after=effectiveStats(equipNoviceSet(state));
if(after.defense-before.defense<12||after.hp-before.hp<42)throw new Error('Full set bonus not applied');
console.log(`PASS: Bastion full-set bonus adds ${after.defense-before.defense} DEF and ${after.hp-before.hp} HP`);
