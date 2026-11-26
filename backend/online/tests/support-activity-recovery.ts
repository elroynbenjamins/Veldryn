import assert from 'node:assert/strict';
import {supportReceiptReader,supportCommandHash} from '../support-activity-receipts';
import {buildSupportActivityHandlers} from '../support-activity-admin-handler';
import type {AdminCommandRow} from '../../../control-center/backend_integration/admin-command-worker-v17_3';
import {createCharacter,newGame,startGathering} from '../../../apps/mobile/src/core/game';
import {executeGameCommand} from '../../../apps/mobile/src/core/game-commands';
import {planSupportActivityRecovery,executeSupportActivityStep,type AuthorizedSupportJob,type SupportRecoveryPorts,type PreparedSupportStep,type SupportCommitReadback,type SupportRecoveryResult} from '../support-activity-recovery';

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
 let dispatches=0,records=0,prepares=0,revision=7;
 let prepared:PreparedSupportStep|undefined,receipt:SupportCommitReadback|null=null,completed:SupportRecoveryResult|undefined;
 let loseResponse=false,failAuditWrite=false;
 const job:AuthorizedSupportJob={operatorAccountId:'operator',accountId:'account',characterId:'target',reason:'Account inaccessible',requestId:'support_fixture01',expectedVersion:7,intent:{kind:'highest_woodcutting'},approveSelection:false};
 const ports:SupportRecoveryPorts={
  authorizeAndAudit:async()=>({prepared,replay:completed}),
  read:async()=>({accountId:'account',version:revision,serverNow:later,state:active}),
  prepare:async(_job,entry)=>{prepares++;prepared=structuredClone(entry);},
  recoverReceipt:async()=>receipt,
  dispatch:async step=>{
   dispatches++;assert.equal(step.command.type,'start');assert.equal(step.characterId,'target');
   const actual=executeGameCommand(active,step.command,later,{characterId:'target',accountId:'account',eventId:'support_fixture',randomRoll:0.5});
   receipt={version:++revision,selectedCharacterId:actual.state.character!.id,regionId:actual.state.currentRegionId,activity:actual.state.activity};
   if(loseResponse)throw new Error('lost_response');
   return receipt;
  },
  recordResult:async(_job,result)=>{if(failAuditWrite)throw new Error('audit_write_failed');records++;completed=result;},
 };
 const inactivePorts={...ports,read:async()=>({accountId:'account',version:7,serverNow:later,state:other})};
 await assert.rejects(executeSupportActivityStep(inactivePorts,job),/support_inactive_character_requires_isolated_settlement/);
 await assert.rejects(executeSupportActivityStep(inactivePorts,{...job,approveSelection:true}),/support_inactive_character_requires_isolated_settlement/);
 await assert.rejects(executeSupportActivityStep(ports,{...job,expectedVersion:6}),/support_stale_scope/);
 await assert.rejects(executeSupportActivityStep({...ports,authorizeAndAudit:async()=>{throw new Error('forbidden');}},job),/forbidden/);
 await assert.rejects(executeSupportActivityStep(ports,{...job,intent:{kind:'claim',xp:1000} as never}),/support_invalid_job/);
 assert.equal(dispatches,0);assert.equal(prepares,0);
 loseResponse=true;
 await assert.rejects(executeSupportActivityStep(ports,job),/lost_response/);
 assert.equal(dispatches,1);assert.equal(prepares,1);assert.equal(revision,8);
 // A committed response was lost. Exact recovery wins over stale revision.
 failAuditWrite=true;
 await assert.rejects(executeSupportActivityStep(ports,job),/audit_write_failed/);
 assert.equal(dispatches,1);assert.equal(prepares,1);
 failAuditWrite=false;
 const result=await executeSupportActivityStep(ports,job);
 assert.equal(result.status,'committed');assert.equal(result.version,8);assert.equal(dispatches,1);assert.equal(records,1);
 const replay=await executeSupportActivityStep({...ports,read:async()=>{throw new Error('unexpected replay read');}},job);
 assert.deepEqual(replay,result);assert.equal(dispatches,1);
 completed=undefined;
 await assert.rejects(executeSupportActivityStep(ports,{...job,characterId:'wrong'}),/support_prepared_scope_mismatch/);
 await assert.rejects(executeSupportActivityStep(ports,{...job,intent:{kind:'claim'}}),/support_prepared_intent_mismatch/);
 await assert.rejects(executeSupportActivityStep({...ports,recoverReceipt:async()=>({version:8,selectedCharacterId:'wrong',regionId:'IRONWOOD'})},job),/support_unconfirmed_commit/);
 receipt=null;
 await assert.rejects(executeSupportActivityStep(ports,job),/support_stale_scope/);
 assert.equal(dispatches,1);
 // The actual gameplay receipt uses canonical validated intent, not the
 // operator's raw request or a guessed current snapshot.
 const step=prepared!.step;
 const digest=await supportCommandHash(step.command);
 assert.equal(digest,await supportCommandHash({args:{id:'CROWNWOOD_TREE',kind:'gathering'},type:'start'}));
 const payload={requestHash:digest,response:{accountId:'account',version:8,state:expected.state}};
 let wire:unknown=payload;
 const reader=supportReceiptReader(async<T>(name:string,args:Record<string,unknown>)=>{
  assert.equal(name,'read_online_game_receipt_server_v1');assert.equal(args.p_account_id,'account');assert.equal(args.p_request_id,job.requestId);return wire as T;
 },false);
 assert.equal((await reader(step))?.activity?.targetId,'CROWNWOOD_TREE');
 wire={...payload,requestHash:'bad'};
 await assert.rejects(reader(step),/support_receipt_hash_conflict/);
 wire={...payload,response:{...payload.response,accountId:'wrong'}};
 await assert.rejects(reader(step),/support_receipt_scope_conflict/);
 wire=null;assert.equal(await reader(step),null);
 const id='12345678-1234-4234-8234-123456789012',accountId='12345678-1234-4234-8234-123456789013',characterId='12345678-1234-4234-8234-123456789014',operatorId='12345678-1234-4234-8234-123456789015';
 const row:AdminCommandRow={id,command_key:'progression.highest_woodcutting',target_account_id:accountId,target_character_id:characterId,target_ref:null,parameters_json:{expectedVersion:7},reason:'Account inaccessible',risk_tier:'high',status:'processing',idempotency_key:'fixture',attempts:1,reversible:false};
 const context={commandId:id,auditReason:row.reason,idempotencyKey:'admin-command:fixture'};
 let approvedRow=row,workerCalls=0;
 const handlers=buildSupportActivityHandlers({verifyClaimedCommand:async()=>({row:approvedRow,operatorAccountId:operatorId})},{...ports,authorizeAndAudit:async input=>{workerCalls++;assert.equal(input.requestId,'support_'+id.replace(/-/g,''));assert.equal(input.accountId,accountId);assert.equal(input.characterId,characterId);return {replay:result};}});
 await handlers['progression.highest_woodcutting'](row,context);
 assert.equal(workerCalls,1);
 approvedRow={...row,parameters_json:{expectedVersion:7,xp:9000}};
 await assert.rejects(handlers['progression.highest_woodcutting'](row,context),/invalid_support_parameters/);
 approvedRow={...row,status:'approved'};
 await assert.rejects(handlers['progression.highest_woodcutting'](row,context),/invalid_support_authority/);
 assert.equal(workerCalls,1);
 console.log('PASS support recovery planning, normal reward settlement, inactive safety, scope guards, lost-response receipt recovery and commit readback');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
