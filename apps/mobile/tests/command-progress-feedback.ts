import {createCharacter,newGame,startCombat,startGathering} from '../src/core/game';
import {executeGameCommand,type GameCommand} from '../src/core/game-commands';
import {commandProgressFeedback} from '../src/core/command-progress-feedback';
import {newlyUnlockedProfileIcons} from '../src/core/profile-icons';
import {newlyUnlockedProfileRewards} from '../src/core/profile-customization';
import {masteryPointsForRank} from '../src/core/profession-mastery-v40';
import {OnlineGameRepository,type OnlineSnapshot,type PendingGameCommand} from '../src/core/online-game-repository';

function ok(value:unknown,message:string):asserts value{if(!value)throw new Error(message);}
function equal(actual:unknown,expected:unknown,message:string){if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error(message);}

async function main(){
 const now=1_700_000_000_000,later=now+60_000;
 let before=startGathering(createCharacter(newGame(now),'IRONWARDEN','Profile Tester'),'GREENWOOD_TREE',now);
 before={...before,account:{...before.account,unlockedProfileBorderIds:['owned-border'],unlockedCosmeticPetIds:['PET_001']}};
 const original=JSON.stringify(before),claimed=executeGameCommand(before,{type:'claim'},later);
 ok((claimed.reward?.xp??0)>0&&(claimed.reward?.items.length??0)>0,'fixture must earn real gathering XP and items');
 const profileCommands:GameCommand[]=[
  {type:'profile_icon',args:{id:'starter:hooded-ranger'}},
  {type:'profile',args:{profileIconId:'starter:armored-sentinel'}},
  {type:'profile',args:{profileTitle:'A New Title'}},
  {type:'profile',args:{profileBackgroundId:'ironwood-dawn'}},
  {type:'profile',args:{profileBorderId:'owned-border'}},
  {type:'profile',args:{selectedCosmeticPetId:'PET_001'}},
  {type:'profile',args:{selectedCosmeticPetId:null}},
 ];
 for(const command of profileCommands){
  const result=executeGameCommand(before,command,later),earned=JSON.stringify(result);
  equal(result.reward,claimed.reward,'appearance save must preserve the earned settlement before changing bonuses');
  equal(result.state.inventory,claimed.state.inventory,'appearance save must keep the settled inventory');
  equal(result.state.skills,claimed.state.skills,'appearance save must keep the settled skill progression');
  equal(commandProgressFeedback(command,before,result),{collected:null,masteryNotices:[]},'appearance changes must not open activity reward or rank popups');
  equal(JSON.stringify(result),earned,'feedback must never remove or alter authoritative rewards');
  equal(newlyUnlockedProfileIcons(before,result.state),[],'equipping an owned icon must not count as unlocking it');
  equal(newlyUnlockedProfileRewards(before,result.state),[],'equipping an owned cosmetic must not count as earning it');
 }
 equal(JSON.stringify(before),original,'appearance handling must not mutate the previous committed state');
 const claimFeedback=commandProgressFeedback({type:'claim'},before,claimed);
 ok(claimFeedback.collected&&claimFeedback.collected.reward===claimed.reward,'an explicit activity claim must still show its earned reward');
 equal(claimFeedback.collected.activity,before.activity,'an explicit claim must identify its settled activity');
 const repeated=executeGameCommand(claimed.state,{type:'claim'},later);
 equal(commandProgressFeedback({type:'claim'},claimed.state,repeated),{collected:null,masteryNotices:[]},'a zero-progress repeat claim must stay quiet');

 // New unlocks remain independently discoverable even when settlement happened during editing.
 let combat=startCombat(createCharacter(newGame(now),'IRONWARDEN','Unlock Tester'),'MOSS_RAT',now);
 combat={...combat,character:{...combat.character!,monsterMasteryPoints:{MOSS_RAT:9}}};
 const cosmeticWithUnlock=executeGameCommand(combat,{type:'profile_icon',args:{id:'starter:hooded-ranger'}},later);
 ok(newlyUnlockedProfileIcons(combat,cosmeticWithUnlock.state).some(row=>row.id==='creature:MOSS_RAT'),'genuine mastery icon unlock must survive an incidental cosmetic settlement');
 equal(commandProgressFeedback({type:'profile_icon'},combat,cosmeticWithUnlock).collected,null,'a genuine unlock does not turn profile editing into a reward claim popup');
 const earnedUnlock=executeGameCommand(combat,{type:'claim'},later);
 ok(commandProgressFeedback({type:'claim'},combat,earnedUnlock).collected,'genuine combat reward claim must still be presented');
 ok(newlyUnlockedProfileIcons(combat,earnedUnlock.state).some(row=>row.id==='creature:MOSS_RAT'),'genuine reward claims must still expose new cosmetic unlocks');

 const masteryBefore={...before,account:{...before.account,professionMasteryByAction:{GREENWOOD_TREE:{actionId:'GREENWOOD_TREE',points:masteryPointsForRank(9),updatedAtMs:now}}}};
 const masteryAfter={...masteryBefore,account:{...masteryBefore.account,professionMasteryByAction:{GREENWOOD_TREE:{actionId:'GREENWOOD_TREE',points:masteryPointsForRank(10),updatedAtMs:later}}}};
 ok(commandProgressFeedback({type:'craft'},masteryBefore,{state:masteryAfter}).masteryNotices.some(row=>row.afterLevel===10),'non-reward gameplay commands must retain genuine mastery rank notices');
 equal(commandProgressFeedback({type:'profile'},masteryBefore,{state:masteryAfter}).masteryNotices,[],'profile saves remain quiet when only a rank change is returned');
 const emptyReward={xp:0,gold:0,kills:0,elapsedSeconds:0,items:[]};
 const levelAfter={...before,character:{...before.character!,level:before.character!.level+1}};
 ok(commandProgressFeedback({type:'quest'},before,{state:levelAfter,reward:emptyReward}).collected?.progressionMoments.some(row=>row.kind==='character_level'),'real level transitions must still be celebrated without an item or XP bundle');

 for(const command of [{type:'profile',args:{profileIconId:'starter:hooded-ranger'}},{type:'claim'}] satisfies GameCommand[]){
  let pending:PendingGameCommand|null=null,storedResponse:OnlineSnapshot|null=null,attempts=0;
  const first:OnlineSnapshot={accountId:'profile-account',state:before,version:0,serverNow:now};
  const pendingStore={read:async()=>pending,write:async(value:PendingGameCommand|null)=>{pending=value;}};
  const transport={read:async()=>storedResponse??first,send:async(request:PendingGameCommand)=>{
   equal(Object.keys(request).sort(),['command','expectedVersion','requestId'],'command feedback metadata must never enter the wire request');
   equal(request.command,command,'retry must preserve the original command intent');
   equal(request.requestId,'original-request','retry must preserve the original idempotency key');
   if(!storedResponse){const result=executeGameCommand(before,request.command,later);storedResponse={...first,...result,version:1,serverNow:later};}
   if(++attempts===1)throw new Error('response_lost_after_commit');
   return storedResponse;
  }};
  const firstApp=new OnlineGameRepository('profile-account',transport,pendingStore,()=> 'original-request');
  await firstApp.load();try{await firstApp.execute(command);}catch{}
  ok(await firstApp.hasPending(),'an uncertain response must retain the command for a later retry');
  const restartedApp=new OnlineGameRepository('profile-account',transport,pendingStore,()=> 'must-not-be-used');
  await restartedApp.load();const retry=await restartedApp.execute();
  equal(retry.executedCommand,command,'a retry after restarting the app must return its original presentation context');
  equal(Boolean(commandProgressFeedback(retry.executedCommand,before,retry).collected),command.type==='claim','retried appearance saves stay quiet while retried reward claims stay visible');
  ok(!await restartedApp.hasPending(),'confirmed retry must clear pending command');
  ok(!('executedCommand' in restartedApp.snapshot!),'command feedback metadata must stay outside repository snapshots');
  ok(!('executedCommand' in (await restartedApp.refresh())),'fresh snapshots must not inherit command feedback metadata');
 }

 // When another device has advanced state, a historical receipt still carries the retried intent.
 const pendingProfile:PendingGameCommand={requestId:'old-profile',expectedVersion:0,command:profileCommands[1]};
 const latest:OnlineSnapshot={accountId:'profile-account',state:claimed.state,version:3,serverNow:later+1};
 let pendingOld:PendingGameCommand|null=pendingProfile;
 const newer=new OnlineGameRepository('profile-account',{
  read:async()=>latest,send:async()=>({...latest,version:1,serverNow:later,reward:claimed.reward}),
 },{read:async()=>pendingOld,write:async value=>{pendingOld=value;}},()=> 'unused');
 await newer.load();const refreshed=await newer.execute();
 equal(refreshed.version,3,'a historical cosmetic receipt must not roll back newer state');
 equal(refreshed.executedCommand,pendingProfile.command,'receipt-refresh fallback must retain the local command context');
 equal(commandProgressFeedback(refreshed.executedCommand,before,refreshed).collected,null,'a cosmetic receipt-refresh fallback must stay quiet');
 console.log('PASS appearance saves and retries preserve all earned progress without reward popups; genuine claims and unlocks remain visible');
}
void main().catch(error=>{console.error(error);throw error;});
