import {createCharacter,newGame} from '../src/core/game';
import {executeGameCommand} from '../src/core/game-commands';
import {saveCharacterLoadout} from '../src/core/character-loadouts';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function eq(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)}

let state=createCharacter(newGame(1000),'IRONWARDEN','Planner','male');
const characterId=state.character!.id;
let result=executeGameCommand(state,{type:'goals_set',args:{goals:[{id:'skill-mining',characterId,kind:'skill_level',title:'Mining 10',createdAtMs:1000,pinnedAtMs:1000,skillId:'mining',targetLevel:10}]}},2000,{accountId:'acct',eventId:'goal'});
state=result.state;
eq(state.character?.progressionGoals?.length,1,'goal command stores one validated goal');
eq(state.character?.progressionGoals?.[0].characterId,characterId,'goal remains character-bound');

result=executeGameCommand(state,{type:'idle_rules_set',args:{rules:[{id:'one-hour',characterId,name:'Safe 1h',conditions:[{id:'duration',kind:'duration_seconds',value:3600,enabled:true}],stopIfOutOfFood:true,stopIfRewardsWouldOverflow:true,finishCurrentCycle:true}],activeId:'one-hour'}},3000,{accountId:'acct',eventId:'idle'});
state=result.state;
eq(state.character?.activeIdleRuleIdV40,'one-hour','idle rule command activates validated rule');
eq(state.character?.idleRulesV40?.[0].conditions[0].kind,'duration_seconds','idle rule remains stop-only duration condition');

state=saveCharacterLoadout(state,0,'Boss');
result=executeGameCommand(state,{type:'loadout_save',args:{index:1,name:'Gathering'}},4000,{accountId:'acct',eventId:'loadout-save'});
state=result.state;
eq(state.character?.savedLoadouts?.length,2,'server loadout save command persists another slot');
const first=state.character?.savedLoadouts?.find(row=>row.slotIndex===0);
ok(first,'first loadout should exist');
result=executeGameCommand(state,{type:'loadout_apply',args:{id:first!.id}},5000,{accountId:'acct',eventId:'loadout-apply'});
state=result.state;
result=executeGameCommand(state,{type:'loadout_delete',args:{id:first!.id}},6000,{accountId:'acct',eventId:'loadout-delete'});
state=result.state;
eq(state.character?.savedLoadouts?.some(row=>row.id===first!.id),false,'server loadout delete command removes preset');

console.log('PASS: V40 Working Toward, Idle Rules and Saved Loadouts use validated command paths');
