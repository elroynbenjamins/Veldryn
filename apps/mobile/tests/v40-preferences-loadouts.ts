import {createCharacter,newGame} from '../src/core/game';
import {executeGameCommand} from '../src/core/game-commands';
import {saveCharacterLoadout} from '../src/core/character-loadouts';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function eq(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)}

let state=createCharacter(newGame(1000),'IRONWARDEN','Planner','male');
state={...state,quests:state.quests.map(row=>row.questId==='QST_005'?{...row,status:'claimed' as const,progress:1}:row)};
const characterId=state.character!.id;
let goalsRetired=false;
try{executeGameCommand(state,{type:'goals_set',args:{goals:[]}},2000,{accountId:'acct',eventId:'goal'});}catch(error){goalsRetired=error instanceof Error&&error.message==='goals_retired';}
ok(goalsRetired,'the retired Working Toward command must remain unavailable to online clients');

let result=executeGameCommand(state,{type:'idle_rules_set',args:{rules:[{id:'one-hour',characterId,name:'Safe 1h',conditions:[{id:'duration',kind:'duration_seconds',value:3600,enabled:true}],stopIfOutOfFood:true,stopIfRewardsWouldOverflow:true,finishCurrentCycle:true}],activeId:'one-hour'}},3000,{accountId:'acct',eventId:'idle'});
state=result.state;
eq(state.character?.activeIdleRuleIdV40,'one-hour','idle rule command activates validated rule');
eq(state.character?.idleRulesV40?.[0].conditions[0].kind,'duration_seconds','idle rule remains stop-only duration condition');

state=saveCharacterLoadout(state,0,'Boss');
let baseSlotRejected=false;
try{executeGameCommand(state,{type:'loadout_save',args:{index:1,name:'Gathering'}},4000,{accountId:'acct',eventId:'loadout-save'});}catch{baseSlotRejected=true}
ok(baseSlotRejected,'server loadout save command rejects the second slot without an entitlement');
const first=state.character?.savedLoadouts?.find(row=>row.slotIndex===0);
ok(first,'first loadout should exist');
result=executeGameCommand(state,{type:'loadout_apply',args:{id:first!.id}},5000,{accountId:'acct',eventId:'loadout-apply'});
state=result.state;
result=executeGameCommand(state,{type:'loadout_delete',args:{id:first!.id}},6000,{accountId:'acct',eventId:'loadout-delete'});
state=result.state;
eq(state.character?.savedLoadouts?.some(row=>row.id===first!.id),false,'server loadout delete command removes preset');


result=executeGameCommand(state,{type:'idle_rules_set',args:{rules:[{id:'one-hour',characterId:state.character!.id,name:'Safe 1h',conditions:[{id:'duration',kind:'duration_seconds',value:3600,enabled:true}],stopIfOutOfFood:true,stopIfRewardsWouldOverflow:true,finishCurrentCycle:true}],activeId:'one-hour'}},7000,{accountId:'acct',eventId:'idle-duration'});
state=result.state;
result=executeGameCommand(state,{type:'start',args:{kind:'gathering',id:'GREENWOOD_TREE'}},8000,{accountId:'acct',eventId:'idle-start'});
state=result.state;
result=executeGameCommand(state,{type:'claim'},8000+7200*1000,{accountId:'acct',eventId:'idle-claim'});
eq(result.state.activity,null,'duration Idle Rule stops activity at its exact boundary');
ok((result.reward?.elapsedSeconds??0)<=3600,'duration Idle Rule does not settle beyond one hour');
eq(result.state.account.weeklyOrders?.schemaVersion,41,'idle settlement still advances unified long-term progression');


const vipPlusState={...state,account:{...state.account,entitlements:{vip_plus:true}}};
const {characterLoadoutSlotCount}=require('../src/core/character-loadouts') as typeof import('../src/core/character-loadouts');
eq(characterLoadoutSlotCount(state),1,'Base accounts keep one loadout slot');
eq(characterLoadoutSlotCount({...state,account:{...state.account,entitlements:{vip:true}}}),2,'VIP adds one permanent loadout slot');
eq(characterLoadoutSlotCount(vipPlusState),2,'VIP+ independently adds one permanent loadout slot');
const second=saveCharacterLoadout(vipPlusState,1,'VIP+ Second');
eq(second.character?.savedLoadouts?.some(row=>row.slotIndex===1),true,'VIP+ can save into the second loadout slot');
let thirdRejected=false;try{saveCharacterLoadout(vipPlusState,2,'Locked Third')}catch{thirdRejected=true}
ok(thirdRejected,'VIP+ alone cannot use a third slot reserved for both permanent tiers');
const both={...vipPlusState,account:{...vipPlusState.account,entitlements:{vip:true,vip_plus:true}}};
eq(characterLoadoutSlotCount(both),3,'Both permanent tiers add two loadout slots');
const third=saveCharacterLoadout(both,2,'Both Tiers Third');
eq(third.character?.savedLoadouts?.some(row=>row.slotIndex===2),true,'Owning both tiers can save into the third loadout slot');
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
const savedLoadoutUi=fs.readFileSync('src/components/SavedLoadoutsPanel.tsx','utf8');
const profileEditorUi=fs.readFileSync('src/components/ProfileEditor.tsx','utf8');
const appUi=fs.readFileSync('App.tsx','utf8');
ok(savedLoadoutUi.includes("type:'loadout_save'")&&savedLoadoutUi.includes("type:'loadout_apply'")&&savedLoadoutUi.includes("type:'loadout_delete'"),'Saved Loadouts UI must emit authoritative loadout commands when online');
ok(savedLoadoutUi.includes('if(onCommand)await onCommand(command);else await onChange(action())'),'Saved Loadouts UI must keep offline fallback without bypassing the online command path');
ok(profileEditorUi.includes('onCommand={onCommand}')&&/<ProfileEditor\b[^>]*onCommand=\{runCompanionCommand\}/.test(appUi),'Character profile editor must wire Saved Loadouts to the authoritative command executor');
console.log('PASS: retired Working Toward commands, exact duration Idle Rules and Saved Loadouts use validated online command paths');
