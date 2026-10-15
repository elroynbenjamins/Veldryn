import {createCharacter,newGame} from '../src/core/game';
import {retireGoalPlanner} from '../src/core/retired-goal-planner';
import {validateGameCommand} from '../src/core/game-commands';
import {bulkSelectionSummary} from '../src/core/inventory-bulk';
import {sourceDestinationAvailability} from '../src/core/source-navigation';

function ok(value:unknown,message:string){if(!value)throw new Error(message);}
const state=createCharacter(newGame(0),'IRONWARDEN','Legacy Cleanup');
const character=state.character!;
const retainedRule={id:'manual-stop',characterId:character.id,name:'Manual stop',conditions:[{id:'elapsed',kind:'duration_seconds' as const,value:3600,enabled:true}],stopIfOutOfFood:true,stopIfRewardsWouldOverflow:true,finishCurrentCycle:true};
const obsoleteRule={...retainedRule,id:'goal-rule:old'};
const legacy={...state,character:{...character,progressionGoals:[{id:'goal:old',kind:'item_quantity',itemId:'IRON_ORE',targetQuantity:12}],idleRulesV40:[obsoleteRule,retainedRule],activeIdleRuleIdV40:retainedRule.id}};
const cleaned=retireGoalPlanner(legacy);
ok(cleaned.character?.progressionGoals?.length===0,'All saved planner goals are removed');
ok(cleaned.character?.idleRulesV40?.length===1&&cleaned.character.idleRulesV40[0].id==='manual-stop','Manual idle rule survives planner retirement');
ok(cleaned.character?.activeIdleRuleIdV40==='manual-stop','Active non-planner rule stays active');
const retiredSource=sourceDestinationAvailability(cleaned,{kind:'inventory',button:'Inventory',detail:'Review items'});
ok(retiredSource.canNavigate,'Normal item navigation remains available');
let rejected=false;
try{validateGameCommand({type:'goals_set',args:{goals:[]}});}catch{rejected=true;}
ok(rejected,'Retired goal commands cannot be used to recreate Working Toward');
const bulk=bulkSelectionSummary(cleaned,[],'inventory');
ok(!('goalProtectedCount' in bulk),'Bulk inventory no longer includes planner reservation data');
console.log('PASS: legacy planner removed without damaging idle rules, navigation or bank inventory');
