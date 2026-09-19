import {createCharacter,newGame,startGathering} from '../src/core/game';
import {executeGameCommand} from '../src/core/game-commands';

function eq(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(message+': expected '+String(expected)+', got '+String(actual))}
function ok(value:unknown,message:string){if(!value)throw new Error(message)}
const start=Date.UTC(2026,8,14,12);
let state=createCharacter(newGame(start),'IRONWARDEN','ScopeTest','male');
state.account.longTermAccountScopeId='00000000-0000-0000-0000-000000000123';
state=startGathering(state,'GREENWOOD_TREE',start+1000);
const result=executeGameCommand(state,{type:'claim'},start+3600_000,{accountId:'00000000-0000-0000-0000-000000000123',eventId:'claim-once'});
const actions=result.reward?.kills??0;
ok(actions>0,'claim should settle gathering actions');
eq(result.state.account.professionMasteryByAction?.GREENWOOD_TREE?.points,actions,'mastery must advance once, not at both settlement and command boundary');
eq(result.state.account.weeklyOrders?.accountId,'00000000-0000-0000-0000-000000000123','weekly orders must use authenticated account scope online');
eq(result.state.account.longTermMetrics?.['profession.actions_completed'],actions,'long-term profession metric must advance once');
console.log('PASS: authenticated settlement applies V40-V46 long-term progression exactly once and retains account-wide scope');
