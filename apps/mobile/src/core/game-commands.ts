import type {BodyPresentation,ClassId,GameState,GearSlot,RewardBundle} from './types';
import * as game from './game';
import * as events from './live-events';
import {attemptEquipmentUpgrade,socketGem,unsocketGem} from './equipment-enhancement';
import {discoverCharacterSkins,selectCharacterSkin} from './character-skins';
import {transitionActivity} from './playability';
import {SUPPORTED_LANGUAGES} from '../i18n/languages';
import {QUICK_NAV_DESTINATIONS} from './quick-navigation';
import * as companions from './combat-companions';
import {normalizeTrainingFocus} from './class-skills';
import {reserveFaithPractice,updateFaithPreference} from './faith';
import {executeCompanionActivity,refreshCompanions,assertCompanionIdle,claimCompanionTraining} from './companion-runtime';
import {createAccountCharacter,deleteActiveAccountCharacter,rerollActiveAccountCharacter,switchAccountCharacter} from './account-actions';
import {CLASSES} from '../content/classes';
import {applyCharacterLoadout,deleteCharacterLoadout,saveCharacterLoadout} from './character-loadouts';
import {normalizeProgressionGoals} from './progression-goals-v40';
import {normalizeIdleRuleSets,validateActiveIdleRuleId} from './idle-rules-v40';
import {COMBAT_CHALLENGE_IDS} from './challenge-hunts';
import {COMBAT_TACTIC_IDS} from './combat-tactics';
import {HUNT_GOAL_IDS} from './hunt-goals';
import {clearActivityQueue,enqueueActivity,moveQueuedActivity,removeQueuedActivity} from './activity-queue';
import {activateDailySupplyBoost,claimDailySupplies,DAILY_SUPPLY_BOOST_TYPES,dailySupplyBoostLabel} from './daily-supplies';
import {bulkSalvageSelected,bulkSellSelected,bulkTransferSelected} from './inventory-bulk';
import {normalizeChatEmoteTrayIds,CHAT_EMOTE_TRAY_SIZE} from './chat-emotes';

/** Commands express intent. Neither a client save nor a client reward is accepted. */
export interface GameCommand {type:string;args?:Record<string,unknown>}
export interface VerifiedActivity {kind:'combat'|'gathering'|'crafting'|'boss';contentId:string;units:number;startedAtMs?:number;challengeId?:import('./types').CombatChallengeId}
export interface GameCommandResult {state:GameState;reward?:RewardBundle;activity:GameState['activity'];message?:string;won?:boolean;upgrade?:ReturnType<typeof attemptEquipmentUpgrade>['result'];contributions:VerifiedActivity[]}
const fields:Record<string,readonly string[]>={
 class_training:[],class_focus:['focus'],faith_practice:['tierId','count'],faith_blessing:['id'],faith_favorite:['id','enabled'],faith_hide:['enabled'],alchemy_start:['id','batches'],
 companion_monthly:['id'],companion_supplies:[],companion_bond_reward:['id','level'],companion_boss_rematch:[],
 companion_equip:['id'],companion_unequip:[],companion_level:['id'],companion_ascend:['id'],companion_master:['id'],companion_upgrade:['id'],companion_training:[],companion_essence:[],
 companion_trial_start:['ids','floor'],companion_trial_floor:['id','floor'],companion_trial_abandon:['id'],companion_assignment_start:['id','ids'],companion_assignment_claim:['id'],companion_technique:['id','technique'],companion_codex:['id'],companion_showcase:['id','ids'],companion_weekly:['id'],companion_special:['id','ids'],
 create:['classId','name','body'],claim:[],start:['kind','id','challengeId','tacticId','goalId'],queue_add:['kind','id','challengeId','tacticId','goalId'],queue_remove:['index'],queue_move:['index','direction'],queue_clear:[],queue_start:[],explore:['id'],stop:[],travel:['id'],boss:[],craft:['id'],use_potion:['id'],discard_preparation:[],
 roster_create:['classId','name','body'],roster_switch:['id'],roster_reroll:['classId','confirmationName'],roster_delete:['confirmationName'],
 equip:['id'],unequip:['slot'],food:['id'],eat:['id'],sell:['id','quantity'],salvage:['id'],
 deposit:['id','quantity'],withdraw:['id','quantity'],deposit_materials:[],bulk_transfer:['location','ids'],bulk_sell:['ids'],bulk_salvage:['ids'],storage:['location'],overflow:[],
 equip_tool:['id'],equip_set:[],upgrade:['id'],socket:['id','gemId'],unsocket:['id','index'],skin:['id'],
 loadout_save:['index','name'],loadout_apply:['id'],loadout_delete:['id'],goals_set:['goals'],idle_rules_set:['rules','activeId'],daily_supplies_claim:['characterId'],daily_supplies_activate:['type'],
 quest:['id'],seasonal:['period','id'],settings:['settings'],profile:['profileTitle','profileBackgroundId','profileBorderId','selectedCosmeticPetId'],
 event_daily:[],event_cache:[],event_milestones:[],event_discovery:['id'],event_reward:['id'],event_accept:['id'],
 event_objective:['id'],event_weekly:['id'],event_project:['id'],event_contribute:['quantity'],event_community:['percent'],event_purchase:['id'],
};
export function validateGameCommand(value:unknown):GameCommand{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('invalid_command');
 const row=value as Record<string,unknown>;
 if(Object.keys(row).some(key=>key!=='type'&&key!=='args')||typeof row.type!=='string'||!Object.prototype.hasOwnProperty.call(fields,row.type))throw new Error('invalid_command');
 const args=row.args??{};if(!args||typeof args!=='object'||Array.isArray(args)||Object.keys(args).some(key=>!fields[row.type as string].includes(key)))throw new Error('invalid_command_arguments');
 if(row.type==='create'||row.type==='roster_create'||row.type==='roster_reroll'){
  const creation=args as Record<string,unknown>;
  oneOf(creation.classId,CLASSES.map(item=>item.id));
  oneOf(creation.body??'male',['male','female']);
 }
 if(row.type==='roster_switch'&&typeof (args as Record<string,unknown>).id!=='string')throw new Error('invalid_id');
 if((row.type==='roster_reroll'||row.type==='roster_delete')&&typeof (args as Record<string,unknown>).confirmationName!=='string')throw new Error('invalid_confirmation_name');
 if(row.type==='start'||row.type==='queue_add'){const start=args as Record<string,unknown>;oneOf(start.kind,['combat','gathering']);if(start.challengeId!==undefined)oneOf(start.challengeId,COMBAT_CHALLENGE_IDS);if(start.tacticId!==undefined)oneOf(start.tacticId,COMBAT_TACTIC_IDS);if(start.goalId!==undefined)oneOf(start.goalId,HUNT_GOAL_IDS);if(start.kind!=='combat'&&(start.challengeId!==undefined||start.tacticId!==undefined||start.goalId!==undefined))throw new Error('invalid_combat_activity_option');}
 if(row.type==='bulk_transfer'){const bulk=args as Record<string,unknown>;oneOf(bulk.location,['inventory','bank']);stringArray(bulk,'ids');}
 if(row.type==='bulk_sell'||row.type==='bulk_salvage')stringArray(args as Record<string,unknown>,'ids');
 return {type:row.type,args:args as Record<string,unknown>};
}
function text(args:Record<string,unknown>,key:string,max=100):string{const value=args[key];if(typeof value!=='string'||!value.trim()||value.length>max)throw new Error(`invalid_${key}`);return value.trim();}
function integer(args:Record<string,unknown>,key:string,min=1,max=100000):number{const value=args[key];if(typeof value!=='number'||!Number.isSafeInteger(value)||value<min||value>max)throw new Error(`invalid_${key}`);return value;}
function oneOf<T extends string>(value:unknown,choices:readonly T[]):T{if(typeof value!=='string'||!choices.includes(value as T))throw new Error('invalid_choice');return value as T;}
function stringArray(args:Record<string,unknown>,key:string,max=100):string[]{const value=args[key];if(!Array.isArray(value)||value.length<1||value.length>max||value.some(entry=>typeof entry!=='string'||!entry.trim()||entry.length>120))throw new Error(`invalid_${key}`);return [...new Set(value.map(entry=>(entry as string).trim()))];}
interface CompanionCommandEconomySnapshot{gold:number;companionEssence:number;bondstones:number;}
function companionCommandEconomySnapshot(state:GameState):CompanionCommandEconomySnapshot{return {gold:state.character?.gold??0,companionEssence:state.account.companionEssence??0,bondstones:state.account.bondstones??0};}
function recordCompanionCommandMetrics(state:GameState,type:string,before:CompanionCommandEconomySnapshot):GameState{
 const after=companionCommandEconomySnapshot(state),metrics={...(state.account.longTermMetrics??{})},prefix='companions.command.'+type.replace(/^companion_/,'');
 metrics[prefix+'.uses']=(metrics[prefix+'.uses']??0)+1;
 for(const key of ['gold','companionEssence','bondstones'] as const){const delta=after[key]-before[key],label=key==='companionEssence'?'essence':key;if(delta>0)metrics[prefix+'.'+label+'_earned']=(metrics[prefix+'.'+label+'_earned']??0)+delta;else if(delta<0)metrics[prefix+'.'+label+'_spent']=(metrics[prefix+'.'+label+'_spent']??0)-delta;}
 return {...state,account:{...state.account,longTermMetrics:metrics}};
}
export function validateGameSettings(value:unknown):GameState['settings']{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('invalid_settings');const row=value as Record<string,unknown>;
 const keys=Object.keys(game.newGame(0).settings);if(Object.keys(row).some(key=>!keys.includes(key)))throw new Error('invalid_settings');
 const defaults=game.newGame(0).settings,result={...defaults,...row} as GameState['settings'];
 oneOf(result.language,SUPPORTED_LANGUAGES);oneOf(result.numberMode,['abbreviated','exact']);oneOf(result.uiTheme??'veldryn',['veldryn','obsidian','ivory']);
 if(![1,1.15,1.3,1.5].includes(result.textScale)||!Number.isFinite(result.autoEatThresholdPct)||result.autoEatThresholdPct<0||result.autoEatThresholdPct>100)throw new Error('invalid_settings');
 for(const key of ['reduceMotion','stopCombatWhenOutOfFood','autoJoinWorldChat'] as const)if(typeof result[key]!=='boolean')throw new Error('invalid_settings');
 if(![1,2,3,4].includes(result.defaultWorldChat??0)||![1,2,3].includes(result.chatDockLines??0)||!Array.isArray(result.quickNavDestinations)||result.quickNavDestinations.length>8||result.quickNavDestinations.some(id=>!QUICK_NAV_DESTINATIONS.includes(id)))throw new Error('invalid_settings');
 const favoriteItemIds=result.favoriteItemIds,seenItemIds=result.seenItemIds,chatEmoteTrayIds=result.chatEmoteTrayIds;
 if(!Array.isArray(chatEmoteTrayIds)||(chatEmoteTrayIds.length!==0&&chatEmoteTrayIds.length!==CHAT_EMOTE_TRAY_SIZE)||normalizeChatEmoteTrayIds(chatEmoteTrayIds).length!==chatEmoteTrayIds.length)throw new Error('invalid_settings');
 if(!Array.isArray(favoriteItemIds)||favoriteItemIds.length>100||favoriteItemIds.some(id=>typeof id!=='string'||!id||id.length>120))throw new Error('invalid_settings');
 if(!Array.isArray(seenItemIds)||seenItemIds.length>1000||seenItemIds.some(id=>typeof id!=='string'||!id||id.length>120))throw new Error('invalid_settings');
 result.favoriteItemIds=[...new Set(favoriteItemIds)];
 result.seenItemIds=[...new Set(seenItemIds)];
 result.chatEmoteTrayIds=normalizeChatEmoteTrayIds(chatEmoteTrayIds);
 return result;
}

/** The caller provides a trusted clock, character ID and random roll on the server. */
export function executeGameCommand(previous:GameState,value:unknown,now:number,options:{characterId?:string;randomRoll?:number;accountId?:string;eventId?:string}={}):GameCommandResult{
 const command=validateGameCommand(value),a=command.args??{},activity=previous.activity,contributions:VerifiedActivity[]=[];
 let state=structuredClone(previous),reward:RewardBundle|undefined,message:string|undefined,won:boolean|undefined,upgrade:GameCommandResult['upgrade'];
 if(!Number.isSafeInteger(now)||now<previous.createdAtMs)throw new Error('invalid_server_clock');
 const credit=(source:GameState['activity'],earned:RewardBundle)=>{if(source&&earned.kills>0)contributions.push({kind:source.kind==='combat'?'combat':'gathering',contentId:source.targetId,units:earned.kills,startedAtMs:Math.max(source.lastClaimAtMs,now-earned.elapsedSeconds*1000),...(source.kind==='combat'&&source.combatChallengeId?{challengeId:source.combatChallengeId}: {})});};
 const settle=()=>{const source=state.activity,result=game.claimActivity(state,now);state=result.state;reward=result.reward;credit(source,result.reward);};
 // Settle before any mutation that can alter past activity rates, food, gear or inventory.
 const settlementFreeCommand=command.type==='queue_add'||command.type==='queue_remove'||command.type==='queue_move'||command.type==='queue_clear'||command.type==='queue_start'||command.type==='daily_supplies_claim';
 if(state.character&&command.type!=='create'&&!settlementFreeCommand)settle();
 state=refreshCompanions(state,now);
 const companionMetricBefore=command.type.startsWith('companion_')?companionCommandEconomySnapshot(state):undefined;
 if(['companion_equip','companion_level','companion_ascend','companion_master'].includes(command.type))assertCompanionIdle(state,text(a,'id'));
 switch(command.type){
  case 'class_training':state=game.startClassTraining(state,now);break;
  case 'faith_practice':state=reserveFaithPractice(state,text(a,'tierId'),integer(a,'count',1,1000),now);break;
  case 'faith_blessing':state=updateFaithPreference(state,'blessing',text(a,'id'));break;
  case 'faith_favorite':state=updateFaithPreference(state,'favorite',text(a,'id'),a.enabled===true);break;
  case 'faith_hide':state=updateFaithPreference(state,'hide',undefined,a.enabled===true);break;
  case 'alchemy_start':state=game.beginAlchemyBatch(state,text(a,'id'),integer(a,'batches',1,100),now);break;
  case 'class_focus':{
   const focus=oneOf(a.focus,['balanced','primary','secondary']);if(!state.character)throw new Error('character_required');
   state.character={...state.character,trainingFocus:focus};
   if(state.character.classTraining?.progressMs===0)state.character.classTraining={...state.character.classTraining,focus};
   if(state.activity?.startedAtMs===now)state.activity.classFocus=normalizeTrainingFocus(focus);
   break;
  }
  case 'companion_boss_rematch':{const result=game.challengeFallenKnightRematch(state,now);state=result.state;message=result.message;won=result.won;break;}
  case 'companion_monthly':case 'companion_supplies':case 'companion_bond_reward':state=executeCompanionActivity(state,command.type,a,now);break;
  case 'companion_equip':state=companions.equipCombatCompanion(state,text(a,'id'));break;
  case 'companion_unequip':state=companions.unequipCombatCompanion(state);break;
  case 'companion_level':state=companions.purchaseCompanionLevel(state,text(a,'id'));break;
  case 'companion_ascend':state=companions.ascendCombatCompanion(state,text(a,'id'));break;
  case 'companion_master':state=companions.masterPrestigeCompanion(state,text(a,'id'));break;
  case 'companion_upgrade':{
   const id=oneOf(a.id,['trainingGround','essenceBasin','bondHall','expeditionPens','masteryChamber']);
   if(id==='trainingGround')state=claimCompanionTraining(state,now);
   if(id==='essenceBasin')state=companions.claimSanctuaryEssence(state,now);
   state=companions.upgradeCompanionSanctuary(state,id);
   if(id==='trainingGround')state.account.companionSanctuary!.lastTrainingClaimAtMs??=now;
   if(id==='essenceBasin')state.account.companionSanctuary!.lastEssenceClaimAtMs??=now;
   break;
  }
  case 'companion_training':state=claimCompanionTraining(state,now);break;
  case 'companion_essence':state=companions.claimSanctuaryEssence(state,now);break;
  case 'companion_trial_start':case 'companion_trial_floor':case 'companion_trial_abandon':case 'companion_assignment_start':case 'companion_assignment_claim':case 'companion_technique':case 'companion_codex':case 'companion_showcase':case 'companion_weekly':case 'companion_special':state=executeCompanionActivity(state,command.type,a,now);break;
  case 'create':state=game.createCharacter(state,text(a,'classId') as ClassId,text(a,'name',20),oneOf(a.body??'male',['male','female']) as BodyPresentation);if(options.characterId)state.character!.id=options.characterId;break;
  case 'roster_create':{
   state=createAccountCharacter(state,text(a,'classId') as ClassId,text(a,'name',20),oneOf(a.body??'male',['male','female']) as BodyPresentation,now);
   if(options.characterId&&state.character)state.character.id=options.characterId;
   break;
  }
  case 'roster_switch':state=switchAccountCharacter(state,text(a,'id'),now);break;
  case 'roster_reroll':state=rerollActiveAccountCharacter(state,text(a,'classId') as ClassId,text(a,'confirmationName',20),now);message=`${state.character!.name} begins again as ${CLASSES.find(entry=>entry.id===state.character!.classId)?.name??state.character!.classId}.`;break;
  case 'roster_delete':state=deleteActiveAccountCharacter(state,text(a,'confirmationName',20));message='Character deleted. Another owned character is now active.';break;
  case 'claim':break;
  case 'queue_add':{const kind=oneOf(a.kind,['combat','gathering']),combatChallengeId=a.challengeId===undefined?undefined:oneOf(a.challengeId,COMBAT_CHALLENGE_IDS),combatTacticId=a.tacticId===undefined?undefined:oneOf(a.tacticId,COMBAT_TACTIC_IDS),huntGoalId=a.goalId===undefined?undefined:oneOf(a.goalId,HUNT_GOAL_IDS);state=enqueueActivity(state,{kind,targetId:text(a,'id'),...(combatChallengeId?{combatChallengeId}:{}),...(combatTacticId?{combatTacticId}:{}),...(huntGoalId?{huntGoalId}:{})});break;}
  case 'queue_remove':state=removeQueuedActivity(state,integer(a,'index',0,2));break;
  case 'queue_move':state=moveQueuedActivity(state,integer(a,'index',0,2),oneOf(a.direction,['up','down']));break;
  case 'queue_clear':state=clearActivityQueue(state);break;
  case 'queue_start':state=game.startNextQueuedActivity(state,now);break;
  case 'start':{const kind=oneOf(a.kind,['combat','gathering']),challengeId=a.challengeId===undefined?undefined:oneOf(a.challengeId,COMBAT_CHALLENGE_IDS),tacticId=a.tacticId===undefined?undefined:oneOf(a.tacticId,COMBAT_TACTIC_IDS),goalId=a.goalId===undefined?undefined:oneOf(a.goalId,HUNT_GOAL_IDS);if(kind!=='combat'&&(challengeId||tacticId||goalId))throw new Error('invalid_combat_activity_option');state=transitionActivity(state,now,{kind,id:text(a,'id'),...(challengeId?{challengeId}: {}),...(tacticId?{tacticId}: {}),...(goalId?{goalId}: {})}).state;break;}
  case 'explore':state=game.startExploration(state,text(a,'id'),now);break;
  case 'stop':state=game.stopActivity(state);break;
  case 'travel':state=game.travelToRegion(state,text(a,'id'),now).state;break;
  case 'boss':{const result=game.challengeFallenKnight(state,now);state=result.state;message=result.message;won=result.won;if(won)contributions.push({kind:'boss',contentId:'FALLEN_KNIGHT',units:1});break;}
  case 'craft':{const id=text(a,'id');state=game.craftRecipe(state,id,now);contributions.push({kind:'crafting',contentId:id,units:1});break;}
  case 'use_potion':state=game.usePotion(state,text(a,'id'));break;
  case 'discard_preparation':state=game.discardPreparation(state);break;
  case 'equip':state=game.equipItem(state,text(a,'id'));break;
  case 'unequip':state=game.unequipItem(state,oneOf(a.slot,['weapon','offhand','helmet','chest','legs','boots','gloves','cape','amulet','ring']) as GearSlot);break;
  case 'food':state=game.equipFood(state,text(a,'id'));break;
  case 'eat':state=game.eatFood(state,a.id===undefined?undefined:text(a,'id'));break;
  case 'sell':state=game.sellItem(state,text(a,'id'),a.quantity===undefined?1:integer(a,'quantity'));break;
  case 'salvage':state=game.salvageItem(state,text(a,'id'));break;
  case 'deposit':state=game.depositToBank(state,text(a,'id'),integer(a,'quantity'));break;
  case 'withdraw':state=game.withdrawFromBank(state,text(a,'id'),integer(a,'quantity'));break;
  case 'deposit_materials':state=game.depositAllMaterials(state);break;
  case 'bulk_transfer':state=bulkTransferSelected(state,stringArray(a,'ids'),oneOf(a.location,['inventory','bank']));break;
  case 'bulk_sell':state=bulkSellSelected(state,stringArray(a,'ids'));break;
  case 'bulk_salvage':state=bulkSalvageSelected(state,stringArray(a,'ids'));break;
  case 'storage':state=game.upgradeStorage(state,oneOf(a.location,['inventory','bank']));break;
  case 'overflow':state=game.claimOverflowToBank(state);break;
  case 'equip_tool':state=game.equipGatheringTool(state,text(a,'id'));break;
  case 'equip_set':state=game.equipNoviceSet(state);break;
  case 'upgrade':{if(options.randomRoll===undefined)throw new Error('trusted_random_required');const result=attemptEquipmentUpgrade(state,text(a,'id'),options.randomRoll);state=result.state;upgrade=result.result;break;}
  case 'socket':state=socketGem(state,text(a,'id'),text(a,'gemId'));break;
  case 'unsocket':state=unsocketGem(state,text(a,'id'),integer(a,'index',0,1));break;
  case 'skin':state=selectCharacterSkin(state,text(a,'id'));break;
  case 'loadout_save':state=saveCharacterLoadout(state,integer(a,'index',0,2),typeof a.name==='string'?a.name:undefined,now);break;
  case 'loadout_apply':state=applyCharacterLoadout(state,text(a,'id'));break;
  case 'loadout_delete':state=deleteCharacterLoadout(state,text(a,'id'));break;
  case 'goals_set':{
   if(!state.character)throw new Error('character_required');
   state={...state,character:{...state.character,progressionGoals:normalizeProgressionGoals(a.goals,state.character.id)}};break;
  }
  case 'idle_rules_set':{
   if(!state.character)throw new Error('character_required');
   const rules=normalizeIdleRuleSets(a.rules,state.character.id),activeIdleRuleIdV40=validateActiveIdleRuleId(rules,a.activeId);
   state={...state,character:{...state.character,idleRulesV40:rules,activeIdleRuleIdV40}};break;
  }
  case 'daily_supplies_claim':{
   const result=claimDailySupplies(state,text(a,'characterId'),now);state=result.state;
   message=result.status.reward.kind==='premium'
    ?`Daily Supplies milestone: +${result.status.reward.amount} premium currency.`
    :`Daily Supplies: +2h ${dailySupplyBoostLabel(result.status.reward.type)} boost banked.`;
   break;
  }
  case 'daily_supplies_activate':{
   const type=oneOf(a.type,DAILY_SUPPLY_BOOST_TYPES);state=activateDailySupplyBoost(state,type);message=`+10% ${dailySupplyBoostLabel(type)} active for 2 hours of qualifying activity.`;break;
  }
  case 'quest':state=game.claimQuest(state,text(a,'id'));break;
  case 'seasonal':state=game.claimSeasonalContract(state,oneOf(a.period,['daily','weekly']),text(a,'id'),now);break;
  case 'settings':state={...state,settings:validateGameSettings(a.settings)};break;
  case 'profile':{
   if(!state.character)throw new Error('character_required');
   const patch:Record<string,string|undefined>={};
   for(const [key,input] of Object.entries(a)){if(input!==null&&(typeof input!=='string'||input.length>80))throw new Error('invalid_profile');patch[key]=input===null?undefined:input as string;}
   if(patch.profileTitle!==undefined&&patch.profileTitle.length>32)throw new Error('invalid_profile_title');
   if(patch.profileBackgroundId&&!['asterfall-night','ironwood-dawn','silverbrook-mist','oathglass-hall',...(state.account.unlockedProfileBackgroundIds??[])].includes(patch.profileBackgroundId))throw new Error('cosmetic_not_owned');
   if(patch.profileBorderId&&!state.account.unlockedProfileBorderIds?.includes(patch.profileBorderId))throw new Error('cosmetic_not_owned');
   if(patch.selectedCosmeticPetId&&!state.account.unlockedCosmeticPetIds?.includes(patch.selectedCosmeticPetId))throw new Error('cosmetic_not_owned');
   state={...state,character:{...state.character,...patch}};break;
  }
  case 'event_daily':state=events.claimEventDailyGift(state,now);break;
  case 'event_cache':state=events.claimEventRepeatCache(state,now);break;
  case 'event_milestones':state=events.claimAllEventMilestones(state,now);break;
  case 'event_discovery':state=events.claimEventDiscovery(state,text(a,'id'),now);break;
  case 'event_reward':state=events.claimEventReward(state,text(a,'id'),now);break;
  case 'event_accept':state=events.acceptEventContract(state,text(a,'id'),now);break;
  case 'event_objective':state=events.claimEventObjective(state,text(a,'id'),now);break;
  case 'event_weekly':state=events.claimEventWeeklyObjective(state,text(a,'id'),now);break;
  case 'event_project':state=events.chooseEventProject(state,text(a,'id'),now);break;
  case 'event_contribute':state=events.contributeEventCurrency(state,integer(a,'quantity'),now);break;
  case 'event_community':state=events.claimEventCommunityMilestone(state,integer(a,'percent',1,100),now);break;
  case 'event_purchase':state=events.purchaseEventOffer(state,text(a,'id'),now);break;
  default:throw new Error('invalid_command');
 }
 if(companionMetricBefore)state=recordCompanionCommandMetrics(state,command.type,companionMetricBefore);
 if(state.character&&(!Number.isSafeInteger(state.character.gold)||state.character.gold<0))throw new Error('invalid_wallet');
 return {state:discoverCharacterSkins(state),reward,activity,message,won,upgrade,contributions};
}
