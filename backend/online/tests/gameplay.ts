import assert from 'node:assert/strict';
import {gameplayHandler,GameplayError,type GameplayServices} from '../gameplay';
import {totalXpAtLevel,legacyCharacterTotalXpAtLevel} from '../../../apps/mobile/src/core/progression';
import type {GameState} from '../../../apps/mobile/src/core/types';
import {createCraftedGearInstance} from '../../../apps/mobile/src/core/crafted-gear-instances';
import {itemDef} from '../../../apps/mobile/src/content/items';
import {COMBAT_COMPANIONS} from '../../../apps/mobile/src/content/combat-companions';
import {EQUIPMENT_ITEMS_V33} from '../../../apps/mobile/src/content/equipment-items-v33';
import {V33_EQUIPMENT_RECIPES} from '../../../apps/mobile/src/content/equipment-recipes-v33';
import {alchemyRecipeDef} from '../../../apps/mobile/src/content/alchemy';
import {createCharacter,effectiveStats,newGame} from '../../../apps/mobile/src/core/game';
import {unlockCombatCompanion} from '../../../apps/mobile/src/core/combat-companions';
import {setLocalEventEnabled} from '../../../apps/mobile/src/core/live-events';
import {gemRefineRecipeIdV1,gemRefineRecipeV1} from '../../../apps/mobile/src/core/gem-progression-v1';
async function main(){
 let state:GameState|null=null,version=0,commits=0,clock=1700000000000,transportFailure=false,suppressLiveEvent=false,generatedIds=0,blockedDeleteCharacterId:string|null=null,deletedCommitCharacterId:string|null=null;
 const commandMetrics:Record<string,unknown>[]=[];
 const receipts=new Map<string,{response:unknown;requestHash:string}>();
 const services:GameplayServices={authenticate:async token=>token==='alice-token'?'alice':null,randomId:()=>['11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333'][generatedIds++]??'44444444-4444-4444-8444-444444444444',randomRoll:()=>.25,
  rpc:async<T>(name:string,args:Record<string,unknown>):Promise<T>=>{
   if(name==='record_online_command_outcome_server_v1'){commandMetrics.push(args);return null as T;}
   if(name==='read_online_game_receipt_server_v1')return (receipts.get(args.p_request_id as string)??null) as T;
   if(name==='load_online_game_server_v1')return {state:structuredClone(state),version,serverNow:clock,characterId:state?.character?.id??null,walletGold:state?.character?.gold??null,guildMember:false,liveEvent:suppressLiveEvent?undefined:state?.account.liveEvent,communityProgress:{}} as T;
   if(name==='character_delete_coop_guard_server_v1')return {blocked:args.p_character_id===blockedDeleteCharacterId,reason:'Leave the Live co-op queue or ready check before deleting this character.'} as T;
   if(name==='commit_online_game_guild_pve_v1'){
    if(args.p_expected_version!==version)throw new GameplayError('stale_state');
    const response=args.p_response as {state:GameState;version:number};state=response.state;version=response.version;commits++;
    if(args.p_deleted_character_id)deletedCommitCharacterId=args.p_deleted_character_id as string;
    receipts.set(args.p_request_id as string,{response,requestHash:args.p_request_hash as string});
    if(transportFailure){transportFailure=false;throw new Error('lost response after commit');}return response as T;
   }throw new Error('unexpected RPC');
  }};
 const handle=gameplayHandler(services);
 const request=(command:unknown,requestId:string,expectedVersion:number,token='alice-token')=>handle(new Request('https://example.invalid/gameplay',{method:'POST',headers:{Authorization:`Bearer ${token}`},body:JSON.stringify({command,requestId,expectedVersion})}));
 assert.equal((await handle(new Request('https://example.invalid/gameplay'))).status,401);
 assert.equal((await request({type:'claim'},'bad-auth-000',0,'forged')).status,401);
 assert.equal((await request({type:'claim',args:{xp:100000}},'inject-xp-01',0)).status,400);
 assert.equal((await request({type:'create',args:{classId:'IRONWARDEN',name:'Alice Hero'}},'create-00001',0)).status,200);
 assert.equal((await request({args:{name:'Alice Hero',classId:'IRONWARDEN'},type:'create'},'create-00001',0)).status,200);assert.equal(commits,1,'canonical replay');
 state={...state!,inventory:{...state!.inventory,stacks:[...state!.inventory.stacks,{itemId:'HOLY_WATER',quantity:1}]},character:{...state!.character!,gold:100},skills:state!.skills.map(skill=>skill.skillId==='alchemy'||skill.skillId==='herbalism'?{...skill,xp:0,level:1}:skill)};
 assert.equal((await request({type:'faith_practice',args:{tierId:'FAITH_QUIET',count:1}},'faith-00001',1)).status,200,'Faith reservation persists through online command');
 assert.equal((await request({type:'stop'},'faith-stop-01',2)).status,200,'Faith refund persists through online command');
 assert.equal((await request({type:'start',args:{kind:'gathering',id:'DEWLEAF_PATCH'}},'herb-start-01',3)).status,200,'Herbalism activity starts online');
 clock+=60000;
 const herbClaim=await request({type:'claim'},'herb-claim-01',4);assert.equal(herbClaim.status,200,'Herbalism settlement persists online');const herbPayload=await herbClaim.json();assert.equal(herbPayload.guildProjectEffort[0].kind,'skilling');assert.equal(herbPayload.guildProjectEffort[0].endsAtMs-herbPayload.guildProjectEffort[0].startsAtMs,60000);assert.deepEqual(herbPayload.guildPveEffort,[],'Gathering does not damage bosses');
 // The healing potion recipe now charges five times the original ingredients.
 const dewleafCost=alchemyRecipeDef('BREW_DEWLEAF_DRAUGHT')!.inputs.find(input=>input.itemId==='DEWLEAF')!.quantity;
 state={...state!,inventory:{...state!.inventory,stacks:state!.inventory.stacks.map(stack=>stack.itemId==='DEWLEAF'?{...stack,quantity:dewleafCost}:stack)}};
 assert.equal((await request({type:'stop'},'herb-stop-01',5)).status,200,'Herbalism activity stops online');
 assert.equal((await request({type:'alchemy_start',args:{id:'BREW_DEWLEAF_DRAUGHT',batches:1}},'brew-start-01',6)).status,200,'Alchemy reservation persists online');
 clock+=60000;
 const brewClaim=await request({type:'claim'},'brew-claim-01',7);assert.equal(brewClaim.status,200,'Alchemy settlement persists online');
 const persisted=await brewClaim.json();assert.equal(persisted.state.activity,null,'Completed alchemy batch is cleared');assert.ok(persisted.guildProjectEffort.some((part:{kind:string;units?:number;endsAtMs?:number;startsAtMs?:number})=>part.kind==='crafting'&&((part.units??0)>0||(part.endsAtMs??0)>(part.startsAtMs??0))),'Verified crafted items contribute to weekly guild activity: '+JSON.stringify({reward:persisted.reward,effort:persisted.guildProjectEffort,activityBefore:state?.activity}).slice(0,1200));
  // Keep the fixture aligned with authoritative potion inputs and Gold after balance changes.
  const regionalRecipe=alchemyRecipeDef('BREW_GREATER_VIGOR_TONIC_SUNSCAR')!;
  assert.ok(regionalRecipe,'Regional Alchemy recipe exists');
  const tonicItems=new Map(state!.inventory.stacks.map(row=>[row.itemId,{...row}]));
  for(const input of regionalRecipe.inputs){
  const previous=tonicItems.get(input.itemId);
  tonicItems.set(input.itemId,{itemId:input.itemId,quantity:Math.max(previous?.quantity??0,input.quantity)});
 }
  state={...state!,character:{...state!.character!,level:30,xp:legacyCharacterTotalXpAtLevel(30),gold:Math.max(state!.character!.gold,regionalRecipe.gold)},skills:state!.skills.map(skill=>skill.skillId==='herbalism'?{...skill,xp:totalXpAtLevel(26),level:26}:skill.skillId==='alchemy'?{...skill,xp:totalXpAtLevel(35),level:35}:skill.skillId==='exploration'?{...skill,xp:totalXpAtLevel(8),level:8}:skill),inventory:{...state!.inventory,stacks:[...tonicItems.values()]}};
 // This later-region fixture must satisfy the same scouting gates as a real character.
 const beforeLockedTravel=commits;
 const lockedTravel=await request({type:'travel',args:{id:'SUNSCAR'}},'sunscar-locked-01',8);
 assert.equal(lockedTravel.status,400,'Character level alone cannot bypass the Chapter 1 story boss');
 assert.match((await lockedTravel.json()).error,/Fallen Knight/);
 assert.equal(commits,beforeLockedTravel,'Rejected story-locked travel cannot commit progress');
 // Verify the separate scouting gate after the required Chapter 1 boss is defeated.
 state={...state!,defeatedBossIds:[...new Set([...(state!.defeatedBossIds??[]),'FALLEN_KNIGHT'])]};
 const scoutingLocked=await request({type:'travel',args:{id:'SUNSCAR'}},'sunscar-scout-locked-01',8);
 assert.equal(scoutingLocked.status,400,'Finishing Chapter 1 alone does not bypass scouting');
 assert.match((await scoutingLocked.json()).error,/Kings Road scouting/);
 assert.equal(commits,beforeLockedTravel,'Rejected scouting-locked travel cannot commit progress');
 state={...state!,exploredRouteIds:['SCOUT_IRONWOOD','SCOUT_OLD_MINES','SCOUT_KINGS_ROAD']};
 assert.equal((await request({type:'travel',args:{id:'SUNSCAR'}},'sunscar-travel-01',8)).status,200,'Later-region travel persists online');
 assert.equal((await request({type:'explore',args:{id:'SCOUT_SUNSCAR'}},'sunscar-scout-01',9)).status,200,'Later-region scouting starts online');
 clock+=210000;
 const sunscarScout=await request({type:'claim'},'sunscar-scout-claim-01',10);assert.equal(sunscarScout.status,200,'Later-region scouting settles online');
 const sunscarState=await sunscarScout.json();assert.ok(sunscarState.state.unlockedMonsterIds.includes('SUNSCAR_SCORPION'),'Scouting unlock persists online');
 assert.equal((await request({type:'stop'},'sunscar-scout-stop-01',11)).status,200,'Later-region scouting lane stops online');
 assert.equal((await request({type:'start',args:{kind:'gathering',id:'SUNSCALE_BLOOM'}},'sunscale-start-01',12)).status,200,'Later-region Herbalism starts online');
 assert.equal((await request({type:'stop'},'sunscale-stop-01',13)).status,200,'Later-region Herbalism stops online');
 assert.equal((await request({type:'alchemy_start',args:{id:'BREW_GREATER_VIGOR_TONIC_SUNSCAR',batches:1}},'sunscar-brew-start-01',14)).status,200,'Regional Alchemy reservation persists online');
 clock+=132000;
 const regionalBrew=await request({type:'claim'},'sunscar-brew-claim-01',15);assert.equal(regionalBrew.status,200,'Regional Alchemy settlement persists online');
 assert.equal((await request({type:'claim'},'create-00001',1)).status,409,'same key different command');
 assert.equal((await request({type:'claim'},'stale-00001',0)).status,409);
 // The online combat receipt test uses region-attainable equipment:
 // an unprepared level-30 starter loadout should not efficiently farm Sunscar.
 const tierByItem=new Map(V33_EQUIPMENT_RECIPES.map(recipe=>[recipe.output.itemId,Number(recipe.v33EquipmentTier.slice(1))]));
 const sunscarPieces=EQUIPMENT_ITEMS_V33.filter(item=>item.classRestriction===state!.character!.classId&&item.slot
   &&(item.requiredLevel??1)<=state!.character!.level&&(tierByItem.get(item.id)??99)<=3)
   .sort((left,right)=>(tierByItem.get(right.id)??0)-(tierByItem.get(left.id)??0));
 const sunscarKit:Record<string,string>={};
 for(const item of sunscarPieces)if(item.slot&&!sunscarKit[item.slot])sunscarKit[item.slot]=item.id;
 assert.ok(Object.keys(sunscarKit).length>=5,'Sunscar online combat fixture equips attainable T3 gear');
 state={...state!,character:{...state!.character!,equipment:{...state!.character!.equipment,...sunscarKit},
   equippedFoodId:'GRILLED_OASIS_CARP'},inventory:{...state!.inventory,
   stacks:[...state!.inventory.stacks,{itemId:'GRILLED_OASIS_CARP',quantity:30}]}};
 state.character!.currentHp=effectiveStats(state).hp;
 assert.equal((await request({type:'start',args:{kind:'combat',id:'SUNSCAR_SCORPION'}},'start-00001',16)).status,200);
 clock+=120000;transportFailure=true;
 assert.equal((await request({type:'claim'},'claim-00001',17)).status,503,'uncertain commit is retryable');
 const count=commits;const retried=await request({type:'claim'},'claim-00001',17);assert.equal(retried.status,200);assert.equal(commits,count,'no second commit on retry');
 const result=await retried.json();assert.ok(result.reward.kills>0);assert.deepEqual(result.guildProjectEffort,[{kind:'combat',...result.reward.combatEffort}]);assert.ok(result.guildPveEffort.length>0,'Verified combat intervals reach the atomic guild commit');assert.deepEqual(result.guildPveEffort[0].combatEffort,result.reward.combatEffort);assert.ok(result.state.character.xp>0);assert.ok(!result.state.unlockedMonsterIds.includes('BLACKGLASS_MIRELING'),'Sunscar combat cannot bypass Ashlands scouting online');
 let receiptReads=0;
 const raced=gameplayHandler({...services,rpc:async<T>(name:string,args:Record<string,unknown>):Promise<T>=>{
  if(name==='read_online_game_receipt_server_v1'&&receiptReads++===0)return null as T;
  return services.rpc<T>(name,args);
 }});
 const late=await raced(new Request('https://example.invalid/gameplay',{method:'POST',headers:{Authorization:'Bearer alice-token'},body:JSON.stringify({command:{type:'claim'},requestId:'claim-00001',expectedVersion:17})}));
 assert.equal(late.status,200,'a commit between receipt and state reads replays successfully');assert.equal(commits,count);
 const rosterId='22222222-2222-4222-8222-222222222222';
 state={...state!,account:{...state!.account,unlockedCharacterSlots:2},otherCharacters:[{character:{...state!.character!,id:rosterId,name:'Second Hero',classId:'BASTION'},inventory:state!.inventory,overflow:state!.overflow,activity:null,skills:state!.skills,quests:state!.quests,currentRegionId:state!.currentRegionId}]};
 const switched=await request({type:'roster_switch',args:{id:rosterId}},'roster-switch-01',18);assert.equal(switched.status,200,'roster switch routes through authenticated gameplay');
 const switchedPayload=await switched.json();assert.equal(switchedPayload.state.character.id,rosterId,'roster switch persists active identity');
 state={...state!,account:{...state!.account,unlockedCharacterSlots:3}};
 const created=await request({type:'roster_create',args:{classId:'WAYFINDER',name:'Third Hero',body:'male'}},'roster-create-01',19);assert.equal(created.status,200,'roster creation routes through authenticated gameplay');
 const createdPayload=await created.json();assert.equal(createdPayload.state.character.id,'33333333-3333-4333-8333-333333333333','roster creation persists server identity');
 blockedDeleteCharacterId=rosterId;
 const blockedDelete=await request({type:'roster_delete',args:{id:rosterId,confirmation:'DELETE Second Hero'}},'roster-delete-coop-01',20);assert.equal(blockedDelete.status,400,'co-op participation must block server-authoritative roster deletion');assert.equal(commits,20,'blocked co-op deletion must not commit gameplay state');
 blockedDeleteCharacterId=null;
 const removed=await request({type:'roster_delete',args:{id:rosterId,confirmation:'DELETE Second Hero'}},'roster-delete-01',20);assert.equal(removed.status,200,'roster deletion routes through authenticated gameplay');
 const removedPayload=await removed.json();const rosterIds=[removedPayload.state.character?.id,...(removedPayload.state.otherCharacters??[]).map((entry:any)=>entry.character.id)];assert.ok(!rosterIds.includes(rosterId),'server-authoritative deletion removes the requested character');assert.equal(deletedCommitCharacterId,rosterId,'roster deletion must use the atomic delete-aware commit RPC');
 const deniedQa=await request({type:'qa_refill'},'qa-denied-001',21);assert.equal(deniedQa.status,403,'normal authenticated accounts cannot invoke Admin QA commands');
 const qaHandle=gameplayHandler({...services,authenticate:async token=>token==='qa-token'?'alice':null,adminQa:async token=>token==='qa-token'});
 const qaRequest=(command:unknown,requestId:string,expectedVersion:number)=>qaHandle(new Request('https://example.invalid/gameplay',{method:'POST',headers:{Authorization:'Bearer qa-token'},body:JSON.stringify({command,requestId,expectedVersion})}));
 const qaPrepared=await qaRequest({type:'qa_prepare',args:{classId:'STONECALLER'}},'qa-prepare-001',21);assert.equal(qaPrepared.status,200,'trusted Admin QA account can prepare a server-owned QA profile');
 const qaPayload=await qaPrepared.json();assert.equal(qaPayload.state.character.classId,'STONECALLER');assert.equal(qaPayload.state.character.level,100);assert.equal(qaPayload.state.character.classSkills.every((skill:any)=>skill.level===100),true,'Admin QA class disciplines are maxed');assert.equal(qaPayload.state.skills.every((skill:any)=>skill.level===100),true,'Admin QA professions are maxed');
 state={...state!,activity:{kind:'combat',targetId:'MOSS_RAT',startedAtMs:clock-60000,lastClaimAtMs:clock-60000}};
 const qaCombat=await qaRequest({type:'claim'},'qa-combat-effort-01',22);assert.equal(qaCombat.status,200);
 const qaCombatPayload=await qaCombat.json();assert.ok(qaCombatPayload.reward.combatEffort,'QA fixture actually contains combat effort');assert.deepEqual(qaCombatPayload.guildProjectEffort,[]);assert.deepEqual(qaCombatPayload.guildPveEffort,[],'Admin QA must never credit live guild PvE');
 assert.ok(commandMetrics.some(metric=>metric.p_outcome==='committed'&&metric.p_command_type==='create'),'committed commands emit aggregate outcome telemetry');
 assert.ok(commandMetrics.some(metric=>metric.p_outcome==='replayed'&&metric.p_command_type==='create'),'receipt replays emit aggregate outcome telemetry');
 assert.ok(commandMetrics.some(metric=>metric.p_outcome==='conflict'),'stale or conflicting commands emit aggregate conflict telemetry');
 assert.ok(commandMetrics.some(metric=>metric.p_outcome==='retryable_failure'&&metric.p_command_type==='claim'),'lost responses emit retryable telemetry');
 assert.ok(commandMetrics.every(metric=>Object.keys(metric).every(key=>['p_outcome','p_command_type','p_latency_ms'].includes(key))),'command telemetry never carries player or request identifiers');
 // Exact-copy commands use the same database commit fencing and request receipts.
 const fixtureItemId='T1P_001',fixtureJobId='online-unique-gear-test';
 const crafted=createCraftedGearInstance(state!,{itemId:fixtureItemId,ownerCharacterId:state!.character!.id,jobId:fixtureJobId,createdAtMs:clock,roll:.5});
 const exact=crafted.instance;
 state={...crafted.state,inventory:{...crafted.state.inventory,stacks:[...crafted.state.inventory.stacks,{itemId:fixtureItemId,quantity:1,instanceId:exact.id}]}};
 const firstVersion=version,beforeUniqueCommits=commits;
 const [lock,preference]=await Promise.all([
  request({type:'gear_lock',args:{instanceId:exact.id,locked:true}},'gear-lock-race-1',firstVersion),
  request({type:'gear_autosell',args:{enabled:true}},'gear-pref-race-1',firstVersion),
 ]);
 assert.deepEqual([lock.status,preference.status].sort((a,b)=>a-b),[200,409],'two-device equipment writes must fence the stale revision');
 assert.equal(commits,beforeUniqueCommits+1,'only one concurrent equipment write commits');
 const chosen=lock.status===200?{type:'gear_lock',args:{instanceId:exact.id,locked:true}}:{type:'gear_autosell',args:{enabled:true}};
 const chosenKey=lock.status===200?'gear-lock-race-1':'gear-pref-race-1';
 const commitsAfterRace=commits;
 assert.equal((await request(chosen,chosenKey,firstVersion)).status,200,'same equipment receipt replays successfully');
 assert.equal(commits,commitsAfterRace,'replay cannot apply equipment mutation twice');
 if(state!.account.craftedGearInstances!.find(row=>row.id===exact.id)?.locked){
  assert.equal((await request({type:'gear_lock',args:{instanceId:exact.id,locked:false}},'gear-lock-clear-1',version)).status,200);
 }
 const initialGold=state!.character!.gold;
 const saleVersion=version,saleCommits=commits;
 assert.equal((await request({type:'gear_sell',args:{instanceId:exact.id}},'gear-sale-exact-1',saleVersion)).status,200,'sell is exact-instance-authoritative');
 assert.equal(state!.character!.gold,initialGold+itemDef(fixtureItemId).value,'exact sale grants vendor Gold once');
 assert.equal((state!.account.craftedGearInstances??[]).some(row=>row.id===exact.id),false,'sold unique copy record removed');
 assert.equal(state!.inventory.stacks.some(row=>row.instanceId===exact.id),false,'sold physical receipt removed');
 assert.equal((await request({type:'gear_sell',args:{instanceId:exact.id}},'gear-sale-exact-1',saleVersion)).status,200,'sale receipt replays');
 assert.equal(commits,saleCommits+1,'sale retry cannot produce another credit');
 assert.equal(state!.character!.gold,initialGold+itemDef(fixtureItemId).value,'sale retry credits Gold only once');
 // One server request receipt protects every reward system, including multi-companion candy.
 const firstCompanion=COMBAT_COMPANIONS[0].id,secondCompanion=COMBAT_COMPANIONS[1].id;
 state=unlockCombatCompanion(unlockCombatCompanion(setLocalEventEnabled(state!,true,clock),firstCompanion,clock),secondCompanion,clock);
 const candyEventId=state.account.liveEvent!.eventId,candyId=candyEventId+':candy:companion';
 state={...state,account:{...state.account,
  eventCandyChargesById:{...state.account.eventCandyChargesById,[candyId]:5},
  eventShopPurchaseCounts:{...state.account.eventShopPurchaseCounts,[candyEventId+':candy:companion_material']:5},
 }};
 const candyStartVersion=version,candyStartCommits=commits,candyStartBloom=state.account.companionMaterials?.EVENT_BONDBLOOM??0;
 const [candyRaceA,candyRaceB]=await Promise.all([
  request({type:'event_candy',args:{kind:'companion',companionId:firstCompanion}},'candy-race-a-01',candyStartVersion),
  request({type:'event_candy',args:{kind:'companion',companionId:secondCompanion}},'candy-race-b-01',candyStartVersion),
 ]);
 assert.deepEqual([candyRaceA.status,candyRaceB.status].sort((a,b)=>a-b),[200,409],'concurrent candy actions fence stale revisions');
 assert.equal(commits,candyStartCommits+1,'only one candy claim commits under simultaneous taps/devices');
 assert.equal(state!.account.eventCandyChargesById?.[candyId],4,'accepted action spends exactly one candy');
 assert.equal(state!.account.companionMaterials?.EVENT_BONDBLOOM,candyStartBloom+1,'only one Bondbloom material is credited');
 const wonId=candyRaceA.status===200?firstCompanion:secondCompanion,wonKey=candyRaceA.status===200?'candy-race-a-01':'candy-race-b-01';
 assert.equal(state!.account.eventShopPurchaseCounts?.[candyEventId+':candy:companion_material:'+wonId],1);
 const afterRace=commits;
 assert.equal((await request({type:'event_candy',args:{kind:'companion',companionId:wonId}},wonKey,candyStartVersion)).status,200,'receipt replay returns original candy result');
 assert.equal(commits,afterRace,'duplicate candy delivery cannot duplicate reward');
 assert.equal(state!.account.eventCandyChargesById?.[candyId],4);
 const otherId=wonId===firstCompanion?secondCompanion:firstCompanion;
 const beforeRejected=commits;
 assert.equal((await request({type:'event_candy',args:{kind:'companion',companionId:'NOT_OWNED'}},'candy-forged-001',version)).status,400,'unowned companion must be rejected by server');
 assert.equal(commits,beforeRejected,'rejected target cannot spend candy');
 transportFailure=true;
 assert.equal((await request({type:'event_candy',args:{kind:'companion',companionId:otherId}},'candy-lost-reply-01',version)).status,503,'lost response is retriable');
 const beforeRetry=commits;
 assert.equal((await request({type:'event_candy',args:{kind:'companion',companionId:otherId}},'candy-lost-reply-01',version-1)).status,200,'same request key recovers across a stale expectedVersion');
 assert.equal(commits,beforeRetry,'replay cannot double award under lost transport response');
 assert.equal(state!.account.eventCandyChargesById?.[candyId],3);
 assert.equal(state!.account.eventShopPurchaseCounts?.[candyEventId+':candy:companion_material:'+otherId],1);
 assert.equal(state!.account.eventShopPurchaseCounts?.[candyEventId+':candy:companion_material'],5,'legacy aggregate counter is unchanged by per-companion claims');
 // The server may stop returning an event after its scheduled window. A previously
 // server-issued end timestamp must still protect players' unused candy.
 const remainingCandy=state!.account.eventCandyChargesById?.[candyId]??0;
 const beforeExpiryEssence=state!.account.companionEssence??0;
 clock=state!.account.liveEvent!.endsAtMs+7*86400_000+1;
 suppressLiveEvent=true;
 const expired=await request({type:'gear_autosell',args:{enabled:false}},'event-expiry-authority-01',version);
 assert.equal(expired.status,200,'ended event metadata survives archive long enough to settle valid rewards');
 assert.equal(state!.account.eventCandyChargesById?.[candyId],0,'all retired candy charges are consumed exactly once');
 assert.equal(state!.account.companionEssence,beforeExpiryEssence+remainingCandy*10,'archived candy is exchanged for fixed, exact Companion Essence');
 assert.equal(state!.account.eventShopPurchaseCounts?.[candyEventId+':candy:expired_to_essence_v1'],1);
 const expiredCommits=commits,expiredEssence=state!.account.companionEssence;
 assert.equal((await request({type:'gear_autosell',args:{enabled:false}},'event-expiry-again-01',version)).status,200);
 assert.equal(commits,expiredCommits+1);
 assert.equal(state!.account.companionEssence,expiredEssence,'subsequent legitimate actions never mint another expiry reward');

 // Every Gold movement uses the same exactly-once receipt and optimistic
 // version fence as equipment sales and event rewards.
 state={...state!,activity:null,character:{...state!.character!,gold:10000},bank:{...state!.bank,gold:2000}};
 const bankInitialTotal=state.character!.gold+(state.bank.gold??0);
 const bankVersion=version,bankCommits=commits;
 const [depositRace,withdrawRace]=await Promise.all([
  request({type:'bank_gold_deposit',args:{amount:1250}},'bank-deposit-race-a',bankVersion),
  request({type:'bank_gold_withdraw',args:{amount:850}},'bank-withdraw-race-b',bankVersion),
 ]);
 assert.deepEqual([depositRace.status,withdrawRace.status].sort((a,b)=>a-b),[200,409],'concurrent deposits/withdrawals cannot both save an old wallet revision');
 assert.equal(commits,bankCommits+1,'only one Gold movement commits under concurrent requests');
 assert.equal(state!.character!.gold+(state!.bank.gold??0),bankInitialTotal,'total Gold conserved across bank race');
 const firstBankCommand=depositRace.status===200?{type:'bank_gold_deposit',args:{amount:1250}}:{type:'bank_gold_withdraw',args:{amount:850}};
 const firstBankKey=depositRace.status===200?'bank-deposit-race-a':'bank-withdraw-race-b';
 const afterBankRace=commits;
 assert.equal((await request(firstBankCommand,firstBankKey,bankVersion)).status,200,'same bank receipt replays without a new charge');
 assert.equal(commits,afterBankRace,'bank receipt replay never duplicates Gold');
 const bankReject=await request({type:'bank_gold_deposit',args:{amount:100000}},'bank-insufficient-1',version);
 assert.equal(bankReject.status,400,'server refuses a bank deposit larger than carried Gold');
 assert.equal(commits,afterBankRace,'rejected bank transaction is not persisted');
 transportFailure=true;
 const failedBankVersion=version;
 assert.equal((await request({type:'bank_gold_deposit',args:{amount:500}},'bank-deposit-retry-1',failedBankVersion)).status,503,'lost bank receipt remains retriable');
 const bankCommitted=commits;
 const confirmedBankTotal=state!.character!.gold+(state!.bank.gold??0);
 assert.equal((await request({type:'bank_gold_deposit',args:{amount:500}},'bank-deposit-retry-1',failedBankVersion)).status,200,'retry reuses the original Gold deposit receipt');
 assert.equal(commits,bankCommitted,'retry cannot debit carried Gold twice');
 assert.equal(confirmedBankTotal,bankInitialTotal,'all online Gold movements conserve account value');
 // Gem refinements create dynamic Forge recipe ids. Their finished claims must
 // be accepted by the online contribution projection and delivered to Gem Pouch.
 const gemRecipe=gemRefineRecipeV1(gemRefineRecipeIdV1('stat_might',1))!;
 state={...state!,activity:null,character:{...state!.character!,level:100,gold:100000},
  skills:state!.skills.map(skill=>skill.skillId==='enchanting'?{...skill,level:100,xp:totalXpAtLevel(100)}:skill),
  inventory:{...state!.inventory,stacks:gemRecipe.inputs.map(input=>({...input}))},
  bank:{...state!.bank,stacks:[]}};
 const refineVersion=version;
 const refine=await request({type:'gem_refine',args:{familyId:'stat_might',grade:1}},'gem-refine-online-1',refineVersion);
 assert.equal(refine.status,200,'online gem refinement starts');
 const refinePayload=await refine.json(),gemJob=refinePayload.state.account.equipmentCraftingQueue.find((job:{recipeId:string})=>job.recipeId===gemRecipe.id);
 assert.ok(gemJob,'online gem refinement persists a Forge job');
 clock=gemJob.completesAtMs;
 const claim=await request({type:'craft_claim',args:{id:gemJob.id}},'gem-claim-online-1',version);
 assert.equal(claim.status,200,'online gem Forge claim settles');
 const claimPayload=await claim.json();
 assert.ok(claimPayload.state.account.gemPouch.stacks.some((stack:{itemId:string;quantity:number})=>stack.itemId===gemRecipe.output.itemId&&stack.quantity>=1),'online gem Forge claim delivers to Gem Pouch');
 // Legacy stored account quest data must create an entitlement only from the
 // server's trusted snapshot, before account-to-character normalization.
 const legacyBase=createCharacter(newGame(0),'STONECALLER','Legacy Returner');
 clock=Date.UTC(2026,10,14,7,20);
 state={...legacyBase,skills:legacyBase.skills.map(skill=>({...skill,xp:10000})),
  account:{...legacyBase.account,seasonalContractClaimIds:['DAILY_2026-11-13_0'],
   seasonalContractProgress:{daily:{key:'2026-11-14',counts:{gathering:12}}}}};
 const beforeLegacy=commits;
 const legacyOnline=await request({type:'seasonal',args:{period:'daily',id:'DAILY_2026-11-14_1'}},'online-legacy-seasonal-1',version);
 const legacyPayload=await legacyOnline.json();
 assert.equal(legacyOnline.status,200,'HTTP must preserve earned old quest before migration: '+JSON.stringify(legacyPayload).slice(0,320));
 assert.equal(commits,beforeLegacy+1,'Legacy claim commits once');
 assert.ok(legacyPayload.state.character.personalSeasonal.claimIds.includes('DAILY_2026-11-14_1'),'Grant is scoped to claiming character');
 assert.equal(legacyPayload.state.account.legacySeasonalGrantSnapshot?.ownerCharacterId,legacyPayload.state.character.id,'Legacy entitlement owner is authoritative');
 const duplicateLegacy=await request({type:'seasonal',args:{period:'daily',id:'DAILY_2026-11-14_1'}},'online-legacy-seasonal-2',version);
 assert.equal(duplicateLegacy.status,400,'Different request key cannot claim same entitlement again');
 assert.equal(commits,beforeLegacy+1,'Double claim does not commit');
 state={...legacyBase,skills:legacyBase.skills.map(skill=>({...skill,xp:10000})),
  account:{...legacyBase.account,seasonalContractProgress:{daily:{key:'2026-11-14',counts:{gathering:12}}}}};
 const forgedLegacy=await request({type:'seasonal',args:{period:'daily',id:'DAILY_2026-11-14_1'}},'online-legacy-no-history-1',version);
 assert.equal(forgedLegacy.status,400,'No old historical claims means no entitlement');
 assert.equal(commits,beforeLegacy+1,'Forged migration cannot commit');
 console.log('PASS authenticated gameplay HTTP, input authority, Admin QA authorization, canonical replay, stale version, lost-response recovery and aggregate command telemetry');
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
