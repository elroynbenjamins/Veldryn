import assert from 'node:assert/strict';
import {createCharacter,newGame} from '../../../apps/mobile/src/core/game';
import {publicProfileCombatPower} from '../public-profile-power';

const state=createCharacter(newGame(0),'WAYFINDER','Power Test');
async function main(){
 const result=await publicProfileCombatPower({rpc:async(name,args)=>{
  assert.equal(name,'online_public_profile_state_server_v1');assert.deepEqual(args,{p_viewer_account_id:'viewer',p_target_account_id:'target'});
  return {state,selectedCharacterId:state.character!.id} as any;
 }},'viewer','target');
 assert.ok(result&&result.combatPower>0,'authorized public profile receives a positive derived score');
 const hidden=await publicProfileCombatPower({rpc:async()=>({state:null} as any)},'viewer','hidden');
 assert.equal(hidden,null,'hidden profile must not expose a score');
 console.log('PASS public profile combat power privacy boundary');
}
void main();
