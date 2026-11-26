import assert from 'node:assert/strict';
import {createCharacter,newGame,startGathering} from '../../../apps/mobile/src/core/game';
import {switchAccountCharacter} from '../../../apps/mobile/src/core/account-actions';
import {executeGameCommand} from '../../../apps/mobile/src/core/game-commands';
import {planSupportActivityRecovery,executeSupportActivityStep,type AuthorizedSupportJob,type SupportRecoveryPorts} from '../support-activity-recovery';

async function main(){
 const now=1700000000000;
 const hero=createCharacter(newGame(now),'IRONWARDEN','Support Fixture');
 hero.character!.id='target';
 hero.character!.level=39;
 hero.currentRegionId='IRONWOOD';
 hero.skills=hero.skills.map(row=>row.skillId==='woodcutting'?{...row,level:18}:row);
 hero.exploredRouteIds=['SCOUT_IRONWOOD','SCOUT_OLD_MINES','SCOUT_KINGS_ROAD','SCOUT_SUNSCAR'];
 const active=startGathering(hero,'IRONWOOD_TREE',now);
 const later=now+120000;
 const before=structuredClone(active);
 const best=planSupportActivityRecovery(active,'target',{kind:'highest_woodcutting'},later);
 assert.equal(best.destination?.id,'CROWNWOOD_TREE');
 assert.deepEqual(best.steps,[{type:'start',args:{kind:'gathering',id:'CROWNWOOD_TREE'}}]);
 assert.deepEqual(active,before,'Planning never settles or mutates a live activity');
 const expected=executeGameCommand(active,best.steps[0],later,{characterId:'target',accountId:'account',eventId:'support_fixture',randomRoll:0.5});
 assert.equal(expected.state.activity?.targetId,'CROWNWOOD_TREE');
 assert.ok(expected.reward&&expected.reward.elapsedSeconds>0,'Normal start settles prior activity');
 assert.throws(()=>planSupportActivityRecovery(active,'target',{kind:'start_gathering',nodeId:'DUNEWOOD_TREE'},later),/support_gathering_locked/);
 assert.throws(()=>planSupportActivityRecovery(active,'target',{kind:'travel',regionId:'ASHLANDS'},later),/support_region_locked/);
 assert.throws(()=>planSupportActivityRecovery(active,'not-owned',{kind:'claim'},later),/support_character_not_owned/);
 const other=createCharacter(newGame(now),'IRONWARDEN','Other Fixture');
 other.character!.id='selected';
 other.otherCharacters=[{character:active.character!,inventory:active.inventory,overflow:active.overflow,activity:active.activity,skills:active.skills,quests:active.quests,currentRegionId:active.currentRegionId,defeatedBossIds:active.defeatedBossIds,exploredRouteIds:active.exploredRouteIds,unlockedMonsterIds:active.unlockedMonsterIds}];
 const inactive=planSupportActivityRecovery(other,'target',{kind:'highest_woodcutting'},later);
 assert.equal(inactive.requiresSelectionApproval,true);
 assert.equal(inactive.steps[0].type,'roster_switch');
 assert.equal(inactive.destination?.id,'CROWNWOOD_TREE');
 let audited=0,dispatches=0,records=0;
 const job:AuthorizedSupportJob={operatorAccountId:'operator',accountId:'account',characterId:'target',reason:'Account inaccessible',requestId:'support_fixture01',expectedVersion:7,intent:{kind:'highest_woodcutting'},approveSelection:false};
 const ports:SupportRecoveryPorts={
  authorizeAndAudit:async()=>{audited++;return {};},
  read:async()=>({accountId:'account',version:7,serverNow:later,state:other}),
  dispatch:async step=>{dispatches++;assert.equal(step.command.type,'roster_switch');const switched=switchAccountCharacter(other,'target',later);return {version:8,selectedCharacterId:switched.character!.id,regionId:switched.currentRegionId,activity:switched.activity};},
  recordResult:async()=>{records++;},
 };
 await assert.rejects(executeSupportActivityStep(ports,job),/support_selection_approval_required/);
 await assert.rejects(executeSupportActivityStep(ports,{...job,expectedVersion:6}),/support_stale_scope/);
 await assert.rejects(executeSupportActivityStep({...ports,authorizeAndAudit:async()=>{throw new Error('forbidden');}},job),/forbidden/);
 assert.equal(dispatches,0);
 const result=await executeSupportActivityStep(ports,{...job,approveSelection:true});
 assert.equal(result.status,'committed');assert.equal(dispatches,1);assert.equal(records,1);assert.equal(audited,3);
 const replay=await executeSupportActivityStep({...ports,authorizeAndAudit:async()=>({replay:result}),read:async()=>{throw new Error('unexpected replay read');}},{...job,approveSelection:true});
 assert.deepEqual(replay,result);assert.equal(dispatches,1);
 await assert.rejects(executeSupportActivityStep({...ports,dispatch:async()=>({version:8,selectedCharacterId:'wrong',regionId:'IRONWOOD'})},{...job,approveSelection:true}),/support_unconfirmed_commit/);
 console.log('PASS support recovery planning, standard reward settlement, scope guards, approval, audit replay and commit readback');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
