import {useCoopStyles} from '../../theme/useCoopStyles';
import {useSocialText} from '../../i18n/social';
import {useGameplayText} from '../../i18n/gameplay';
import type {DungeonHealingPotionView} from '../../core/coop-potion-view';
import type {DungeonTonicView} from '../../core/coop-tonic-view';
import {useEffect,useRef,useState} from 'react';
import {Animated,Easing,Image,Modal,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {CoopRunView} from '../../core/coop-presentation';
import {isCoopBattleResolving,isCoopCombatNodeKind,validateCoopRunView} from '../../core/coop-presentation';
import {ct,t,type Language} from '../../i18n';
import {accountText} from '../../i18n/account';
import {type CoopColors,coopSpacing,coopTypography} from '../../theme/coop-ui-theme';
import {ExpeditionScreenShell,FantasyPanel,RoleBadge,StateChip} from './CoopVisualKit';
import {DungeonRouteChoices} from './DungeonRouteChoices';
import {RoutePathStrip} from './RoutePathStrip';
import {DungeonRoomResolution} from './DungeonRoomResolution';
import {DungeonMerchantPanel} from './DungeonMerchantPanel';
import {DungeonRoomOutcomeBanner} from './DungeonRoomOutcomeBanner';
import {GameButton} from '../GameButton';
import {IdentityArtwork} from '../SocialIdentity';
import {SeasonalBossTelegraphPanel} from './SeasonalBossTelegraphPanel';
import {localizedSeasonalDungeonMechanic,localizedSeasonalDungeonObjective} from '../../i18n/seasonal-dungeon-effects';
import {dungeonDynamicUiText} from '../../i18n/dungeon-dynamic-ui';
import {dungeonCombatAvatar} from '../../core/dungeon-combat-avatars';
import {dungeonEnemyDisplayName} from '../../core/dungeon-enemy-display';
import {DungeonCombatStage} from './DungeonCombatStage';
import {CombatTheaterModal} from '../CombatTheaterModal';
import {CoopPartyChat} from './CoopPartyChat';
import {DungeonDisclosure} from './DungeonPreparation';
import {CoopPartyCompanionChip} from './CoopPartyCompanionChip';
import {combatCompanionDef} from '../../content/combat-companions';
import {companionArtSource} from '../../theme/companion-art';
import {UiIcon} from '../UiIcon';
import {ExpeditionMarkIcon} from '../ExpeditionMarkIcon';
import type {CoopChatMessage} from '../../online/coop-client';

function TerminalRunMoment({phase,rewardsReady,rewardsSecured,reduceMotion}:{phase:CoopRunView['phase'];rewardsReady:boolean;rewardsSecured:boolean;reduceMotion:boolean}){
 const {styles:s}=useCoopStyles(makeStyles);
 const st=useSocialText();
  const scale=useRef(new Animated.Value(1)).current,completed=phase==='completed';
  useEffect(()=>{scale.stopAnimation();scale.setValue(1);if(reduceMotion||!completed)return;Animated.sequence([Animated.spring(scale,{toValue:1.025,damping:9,stiffness:220,mass:.65,useNativeDriver:true}),Animated.spring(scale,{toValue:1,damping:16,stiffness:200,mass:.75,useNativeDriver:true})]).start();return()=>scale.stopAnimation()},[phase,rewardsSecured,reduceMotion,scale,completed]);
  const body=completed
    ?rewardsSecured?st("Your expedition rewards are secured. Return when you are ready."):rewardsReady?st("Final encounter cleared. Collect the expedition reward below."):st("Final encounter cleared. Your reward entitlement is being prepared.")
    :st("This expedition has ended. Review any available rewards before returning.");
  return <Animated.View accessibilityLiveRegion="polite" style={[s.terminal,{transform:[{scale}]}]}>
    <View style={[s.rewardCrest,completed?s.rewardCrestSuccess:s.rewardCrestFailure]}><Text style={[s.rewardCrestText,completed?s.terminalSuccess:s.terminalDanger]}>{completed?'✦':'◇'}</Text></View>
    <Text style={[s.terminalEyebrow,completed?s.terminalSuccess:s.terminalDanger]}>{completed?st("EXPEDITION CLEARED"):st("EXPEDITION ENDED")}</Text>
    <Text style={s.terminalTitle}>{completed?st("Victory secured!"):st("Run complete")}</Text>
    <Text style={s.terminalDescription}>{body}</Text>
  </Animated.View>;
}

export interface CoopRewardDisplay {id:string;claimed_at:string|null;reward_json:{marks?:number;enhanced_reward?:boolean;live_fellowship_bonus?:number;reward_charges_remaining?:number;weekly_enhanced_remaining?:number;failure_consolation_remaining?:number;failure_consolation_applied?:boolean};}

/** Count up to the final value when the reward row first appears, so the
 * player SEES the Marks accrue instead of a static number landing. Reduce-
 * motion jumps straight to the final value. */
function AnimatedMarkAmount({value,reduceMotion,style}:{value:number;reduceMotion:boolean;style:any}){
 const [displayed,setDisplayed]=useState(reduceMotion?value:0);
 const latest=useRef(value);latest.current=value;
 useEffect(()=>{
  if(reduceMotion){setDisplayed(value);return;}
  const driver=new Animated.Value(0);
  const listener=driver.addListener(({value:progress})=>setDisplayed(Math.round(progress*latest.current)));
  Animated.timing(driver,{toValue:1,duration:900,easing:Easing.out(Easing.cubic),useNativeDriver:false}).start();
  return()=>{driver.removeListener(listener);driver.stopAnimation();};
 },[value,reduceMotion]);
 return <Text style={style}>+{displayed}</Text>;
}

/** A single-pass sheen around the Expedition Mark icon when the reward lands. */
function MarkIconBurst({reduceMotion}:{reduceMotion:boolean}){
 const burst=useRef(new Animated.Value(0)).current;
 useEffect(()=>{
  if(reduceMotion){burst.setValue(0);return;}
  burst.setValue(0);
  Animated.timing(burst,{toValue:1,duration:900,easing:Easing.out(Easing.cubic),useNativeDriver:true}).start();
 },[reduceMotion,burst]);
 if(reduceMotion)return null;
 const style={position:'absolute' as const,top:-6,left:-6,right:-6,bottom:-6,borderRadius:16,borderWidth:2,borderColor:'#F4CE5D',opacity:burst.interpolate({inputRange:[0,.4,1],outputRange:[0,.85,0]}),transform:[{scale:burst.interpolate({inputRange:[0,1],outputRange:[.8,1.4]})}]};
 return <Animated.View pointerEvents="none" style={style}/>;
}
export function CoopRunOverview({language,run,myVotedNodeId,selfVoter,onBack,onChoose,onPurchaseMerchant,onUseHealingPotion,healingPotion,onPrepareTonic,dungeonTonic,onRefresh,onClaim,onQueueAgain,onPartyRematch,onOpenShop,busy=false,notice,syncError,rewards=[],terminalAction,reduceMotion=false,seasonal=false,eventName,chatMessages=[],onChatSend}:{language:Language;run:CoopRunView;myVotedNodeId?:string;selfVoter?:{name:string;profileIconId?:string|null;className?:string|null};onBack:()=>void;onChoose?:(nodeId:string,boonId?:string)=>void;onPurchaseMerchant?:(offerId:string)=>void;onUseHealingPotion?:()=>void;healingPotion?:DungeonHealingPotionView;onPrepareTonic?:(id:string)=>void;dungeonTonic?:DungeonTonicView;onRefresh?:()=>void;onClaim?:(id:string)=>void;onQueueAgain?:{label:string;onPress:()=>void};onPartyRematch?:()=>void;onOpenShop?:()=>void;busy?:boolean;notice?:string;syncError?:string;rewards?:CoopRewardDisplay[];terminalAction?:{label:string;claimed?:boolean;completeText?:string;onPress:()=>void};reduceMotion?:boolean;seasonal?:boolean;eventName?:string;chatMessages?:CoopChatMessage[];onChatSend?:(text:string)=>Promise<void>}){
 const {colors:C,styles:s}=useCoopStyles(makeStyles);
 const st=useSocialText(),a=(value:string)=>accountText(language,value),{gt}=useGameplayText();
 const localizedMechanic=run.mechanic?localizedSeasonalDungeonMechanic(language,run.mechanic):undefined;
 const localizedObjective=run.objective?localizedSeasonalDungeonObjective(language,run.objective):undefined;
  validateCoopRunView(run);
  const modeLabel=run.modeLabel??(run.mode==='qmode'?ct(language,'details.qmode'):ct(language,'details.live')),bossNext=run.phase==='awaiting_choice'&&run.options.some(option=>option.kind==='boss');
  const terminal=run.phase==='completed'||run.phase==='failed',unclaimedRewards=rewards.filter(reward=>!reward.claimed_at),rewardSurfaceReady=rewards.length>0||Boolean(terminalAction),rewardsSecured=terminal&&rewardSurfaceReady&&!unclaimedRewards.length&&(!terminalAction||terminalAction.claimed===true);
  const inCombat=isCoopBattleResolving(run);
  const replayCues=run.lastCombat?.cues??[];
  const [clockTick,setClockTick]=useState(Date.now());
  const clockAnchor=useRef({serverNow:run.serverNow??0,localAt:Date.now()});
  if(run.serverNow!==undefined&&clockAnchor.current.serverNow!==run.serverNow)clockAnchor.current={serverNow:run.serverNow,localAt:Date.now()};
  useEffect(()=>{
   if(run.mode!=='live'||!run.resolvesAtMs||run.phase!=='awaiting_choice'||run.options.length<2)return;
   const timer=setInterval(()=>setClockTick(Date.now()),500);return()=>clearInterval(timer);
  },[run.mode,run.resolvesAtMs,run.phase,run.options.length]);
  const liveServerNow=run.serverNow===undefined?undefined:clockAnchor.current.serverNow+Math.max(0,clockTick-clockAnchor.current.localAt);
  const secondsRemaining=run.phase==='awaiting_choice'&&run.options.length>1&&run.resolvesAtMs!==undefined&&liveServerNow!==undefined?Math.max(0,Math.ceil((run.resolvesAtMs-liveServerNow)/1000)):undefined;
  const replayKey=`${run.runId}:${run.lastCombat?.nodeId??'pending'}:${run.lastCombat?.durationMs??0}:${replayCues.length}:${replayCues[replayCues.length-1]?.atMs??0}`;
  const lastReplay=useRef(replayKey),wasInCombat=useRef(inCombat),wasTerminal=useRef(terminal);
  const [theaterOpen,setTheaterOpen]=useState(inCombat);
  const [rewardOpen,setRewardOpen]=useState(terminal);
  const [enteringCombat,setEnteringCombat]=useState(false);
  const [battlePresentationReady,setBattlePresentationReady]=useState(false);
  const [entryCombatArchetypes,setEntryCombatArchetypes]=useState<Array<{id:string;label:string}>>([]);
  const [entryCombatNodeId,setEntryCombatNodeId]=useState<string|undefined>();
  const [entryCombatKind,setEntryCombatKind]=useState<string|undefined>();
  const [enteringUtility,setEnteringUtility]=useState<{nodeId:string;kind:string;stateVersion?:number;decisionId?:string}>();
  const [companionMemberId,setCompanionMemberId]=useState<string|undefined>();
  const [selectedBoonId,setSelectedBoonId]=useState<string|undefined>();
  useEffect(()=>setSelectedBoonId(undefined),[run.runId,run.lastRoomOutcome?.nodeId]);
  const needsBoon=run.mode==='qmode'&&Boolean(run.boonOffers?.length);
  useEffect(()=>setCompanionMemberId(undefined),[run.runId]);
  useEffect(()=>{setBattlePresentationReady(false);setEntryCombatArchetypes([]);},[run.runId]);
  useEffect(()=>{setEnteringUtility(undefined);},[run.runId]);
  const companionSlot=run.roleSlots.find(slot=>(slot.memberId??slot.name)===companionMemberId&&slot.companionId);
  const companionInfo=companionSlot?.companionId?combatCompanionDef(companionSlot.companionId):undefined;
  const companionPortrait=companionSlot?.companionId?companionArtSource(companionSlot.companionId):undefined;
  const enterFromVersion=useRef(run.stateVersion),enterFromNode=useRef(run.lastCombat?.nodeId);
  useEffect(()=>{
   const newCombat=Boolean(run.lastCombat&&lastReplay.current!==replayKey);
   // Present each server-authorized battle once; never expose a replay control.
   if((inCombat&&!wasInCombat.current)||newCombat){
    setTheaterOpen(true);setBattlePresentationReady(false);
    if(terminal)setRewardOpen(false);
   }else if(terminal&&!wasTerminal.current&&!theaterOpen&&!inCombat){
    setRewardOpen(true);
   }
   lastReplay.current=replayKey;wasInCombat.current=inCombat;wasTerminal.current=terminal;
  },[inCombat,run.lastCombat,replayKey,terminal]);
  // The battle stage opens before the request finishes. Combat cues, HP and
  // outcomes still come exclusively from the authoritative server response.
  const chooseRoom=(nodeId:string)=>{
   if(needsBoon&&!selectedBoonId)return;
   const option=run.options.find(item=>item.nodeId===nodeId);
   if(onChoose&&run.mode==='qmode'&&isCoopCombatNodeKind(option?.kind)){
    enterFromVersion.current=run.stateVersion;
    enterFromNode.current=run.lastCombat?.nodeId;
    setEntryCombatNodeId(nodeId);setEntryCombatKind(option?.kind);
    setEntryCombatArchetypes(option?.encounterPreview?.archetypes??[]);
    setBattlePresentationReady(false);
    setEnteringCombat(true);setTheaterOpen(true);
   }else if(onChoose&&run.mode==='qmode'&&option){
    setEnteringUtility({nodeId,kind:option.kind,stateVersion:run.stateVersion,decisionId:run.decisionId});
   }
   onChoose?.(nodeId,needsBoon?selectedBoonId:undefined);
  };
  useEffect(()=>{
   if(!enteringUtility)return;
   if(notice||run.phase!=='awaiting_choice'||run.stateVersion!==enteringUtility.stateVersion||run.decisionId!==enteringUtility.decisionId||!run.options.some(option=>option.nodeId===enteringUtility.nodeId))setEnteringUtility(undefined);
  },[enteringUtility,notice,run.phase,run.stateVersion,run.decisionId,run.options]);
  useEffect(()=>{
   if(!enteringCombat)return;
   const resolved=run.phase==='resolving_node'||run.stateVersion!==enterFromVersion.current||run.lastCombat?.nodeId!==enterFromNode.current;
   if(notice){setEnteringCombat(false);setTheaterOpen(false);return;}
   if(resolved){
    setEnteringCombat(false);
    // Pending combat is only projected for Live mode, so Q-Mode must stay
    // open while its valid server-authorized encounter is resolving.
    if(!inCombat&&(!run.lastCombat||run.lastCombat.nodeId===enterFromNode.current))setTheaterOpen(false);
   }
  },[enteringCombat,inCombat,run.phase,run.stateVersion,run.lastCombat?.nodeId,notice]);
  // Solo runs reveal their server-authored replay after node settlement.
  // Never play the previous room's lastCombat while the new fight is pending.
  const awaitingCombatPlayback=inCombat&&(run.mode==='qmode'?!!run.selectedNodeId&&run.lastCombat?.nodeId!==run.selectedNodeId:!run.pendingCombat?.cues.length);
  const combatName=enteringCombat?(entryCombatKind==='boss'?st('FINAL BOSS'):st('DUNGEON COMBAT')):dungeonEnemyDisplayName(run.bossMechanic?.telegraph?.bossName??(run.pendingCombat??run.lastCombat)?.combatants?.find(member=>member.boss)?.name??st('DUNGEON COMBAT'));
  const closeTheater=()=>{setTheaterOpen(false);if(terminal)setRewardOpen(true);};
  const showBattleAction=battlePresentationReady&&!inCombat&&Boolean(run.lastCombat);
  const regionTint=run.region==='Sunscar'?C.danger:run.region==='Frostmarch'?C.cyan:run.region==='Ashlands'?C.violet:C.gold;
  return <><ExpeditionScreenShell hideHeader compactHeader={inCombat} regionWashColor={run.region&&!inCombat?regionTint:undefined} eyebrow={ct(language,'browse.resumeTitle')} title={inCombat?combatName:ct(language,'browse.resume')} banner={inCombat?undefined:<View style={s.banner}>{run.region?<><Text style={[s.region,{color:regionTint}]}>{run.region}</Text><Text style={s.bannerDot}>·</Text></>:null}<Text style={s.modeText}>{modeLabel}</Text><Text style={s.bannerDot}>·</Text><Text style={s.phase}>{run.phase==='awaiting_choice'?dungeonDynamicUiText(language,run.mode==='qmode'?'Choose a room':'Vote on a route'):run.phase==='resolving_node'?dungeonDynamicUiText(language,'Resolving room'):run.phase==='completed'?dungeonDynamicUiText(language,'Expedition completed'):run.phase==='failed'?dungeonDynamicUiText(language,'Expedition failed'):run.phase.replaceAll('_',' ').replace(/^./,letter=>letter.toUpperCase())}</Text></View>}>
    {inCombat?<FantasyPanel variant="selected"><View style={s.summary}>
      <View style={s.grow}><Text style={s.title}>{run.phase==='resolving_node'?st('Battle in progress'):run.lastCombat?.reason==='victory'?st('Encounter cleared'):run.lastCombat?.reason==='wipe'?st('Party defeated'):st('Battle complete')}</Text><Text style={s.copy}>{combatName}</Text></View>
      <GameButton compact title={st('View battle')} onPress={()=>setTheaterOpen(true)}/>
     </View></FantasyPanel>:null}
    {run.phase==='resolving_node'&&!inCombat?<DungeonRoomResolution kind={run.selectedNodeKind} reduceMotion={reduceMotion}/>:enteringUtility?<DungeonRoomResolution kind={enteringUtility.kind} reduceMotion={reduceMotion}/>:null}
    {!!syncError&&<FantasyPanel variant="danger"><Text accessibilityRole="alert" style={s.title}>{a('Connection interrupted')}</Text><Text style={s.copy}>{a('Showing the last saved expedition progress. Reconnecting automatically.')}</Text><Text style={s.copy} numberOfLines={2}>{syncError}</Text>{onRefresh?<GameButton compact title={a('Retry connection')} tone="secondary" disabled={busy} onPress={onRefresh}/>:null}</FantasyPanel>}
    <DungeonRoomOutcomeBanner outcome={run.phase==='awaiting_choice'?run.lastRoomOutcome:undefined}/>
    {needsBoon&&run.phase==='awaiting_choice'?<FantasyPanel variant="selected">
      <View style={s.boonHeader}><Text style={s.title}>{st('Choose a boon')}</Text><Text style={s.copy}>{st('Select one reward before entering the next room.')}</Text></View>
      <View style={s.boonChoices}>{run.boonOffers!.map(offer=><Pressable key={offer.id} accessibilityRole="radio" accessibilityState={{selected:selectedBoonId===offer.id,disabled:busy}} disabled={busy} onPress={()=>setSelectedBoonId(offer.id)} style={[s.boonChoice,selectedBoonId===offer.id&&s.boonSelected]}>
       <View style={s.boonText}><Text style={s.name}>{offer.name}</Text><Text style={s.copy}>{offer.description}</Text></View>
       <Text style={s.boonMarker}>{selectedBoonId===offer.id?'✓':'○'}</Text>
      </Pressable>)}</View>
    </FantasyPanel>:null}
    {run.merchantShop?<DungeonMerchantPanel shop={run.merchantShop} busy={busy} onPurchase={onPurchaseMerchant}/>:null}
    {run.phase==='awaiting_choice'&&run.options.length&&!enteringUtility?<View style={s.actionArea}>
      {run.routePath?<RoutePathStrip path={run.routePath} reduceMotion={reduceMotion}/>:null}
      <View style={s.routeHeader}><View style={s.grow}><Text style={s.routeEyebrow}>{modeLabel}</Text><Text style={s.section}>{run.mode==='live'?st('Vote for the next path'):st('Choose the next room')}</Text></View>{bossNext?<StateChip label={st('FINAL BOSS')} tone="warning"/>:null}</View>
      {!seasonal&&(dungeonTonic?.open||dungeonTonic?.preparedName||healingPotion)?<View style={s.routeSupplies}>{dungeonTonic&&(dungeonTonic.open||dungeonTonic.preparedName)?<Text style={s.routeSupply} numberOfLines={1}>{dungeonTonic.preparedName?`${gt('DUNGEON TONIC')}: ${dungeonTonic.preparedName}`:gt('Choose a tonic before the first room.')}</Text>:null}{healingPotion?<Text style={s.routeSupply}>{gt('DUNGEON HEALING')} {healingPotion.remaining}/{healingPotion.capacity}</Text>:null}</View>:null}
      {needsBoon&&!selectedBoonId?<Text style={s.copy}>{st('Choose your boon above to continue.')}</Text>:null}
      {run.mode==='live'?<Text style={s.copy}>{st('The route with the most votes will be selected.')}{secondsRemaining!==undefined?` · ${st('Vote ends in {seconds}s',{seconds:secondsRemaining})}`:''}</Text>:null}
      <DungeonRouteChoices options={run.options} mode={run.mode} phase={run.phase} busy={busy||(needsBoon&&!selectedBoonId)} onChoose={onChoose?chooseRoom:undefined} myVotedNodeId={myVotedNodeId} selfVoter={selfVoter}/>
      <View style={s.partyMini} accessibilityLabel={st('Party & formation')}>
       {run.roleSlots.map((slot,index)=><View key={`${slot.role}-${index}`} accessible accessibilityLabel={`${slot.name}, ${t(language,`coopUi.${slot.role}`)}`} style={s.partyMiniMember}><IdentityArtwork name={slot.name} profileIconId={slot.profileIconId} className={slot.iconClassId??slot.classId} size={28}/><Text numberOfLines={1} style={s.partyMiniName}>{slot.name}</Text><Text numberOfLines={1} style={s.partyMiniRole}>{t(language,`coopUi.${slot.role}`)}</Text></View>)}
      </View>
     </View>:run.phase!=='resolving_node'&&!terminal&&!enteringUtility?<FantasyPanel><Text style={s.copy}>{ct(language,'browse.resumeBody')}</Text></FantasyPanel>:null}
    {!seasonal&&(dungeonTonic||healingPotion)&&run.phase==='awaiting_choice'?<DungeonDisclosure title={st('Dungeon supplies')} initiallyOpen={Boolean(healingPotion?.canUse||dungeonTonic?.open)}>
    {!seasonal&&dungeonTonic&&run.phase==='awaiting_choice'?<FantasyPanel>
      <View style={s.summary}>
       <View style={s.grow}>
        <Text style={s.title}>{gt('DUNGEON TONIC')}</Text>
        {dungeonTonic.preparedName?<Text style={s.copy}>{dungeonTonic.preparedName} · {gt('Active')}</Text>:<Text style={s.copy}>{gt('Choose a tonic before the first room.')}</Text>}
       </View>
       <StateChip label={gt('One per run')} tone={dungeonTonic.preparedName?'success':'neutral'}/>
      </View>
      {dungeonTonic.open&&!dungeonTonic.options.length?<Text style={s.copy}>{gt('No tonics carried.')}</Text>:null}
      {dungeonTonic.open&&onPrepareTonic?dungeonTonic.options.map(option=><View key={option.id} style={[s.summary,{paddingVertical:4}]}>
       <View style={s.grow}>
        <Text style={s.name}>{option.name} · T{option.tier} ×{option.owned}</Text>
        <Text style={s.copy} numberOfLines={2}>{option.effect}</Text>
       </View>
       <GameButton compact title={gt('Use tonic')} disabled={busy} onPress={()=>onPrepareTonic(option.id)}/>
      </View>):null}
    </FantasyPanel>:null}
    {!seasonal&&healingPotion&&run.phase==='awaiting_choice'?<FantasyPanel>
      <View style={s.summary}>
       <View style={s.grow}>
        <Text style={s.title}>{gt('DUNGEON HEALING')}</Text>
        <Text style={s.copy}>{healingPotion.name?`${healingPotion.name} · ${healingPotion.healPercent}% HP · ${healingPotion.carried} ${gt('carried')}`:gt('Select a healing potion in the HP menu.')}</Text>
       </View>
       <StateChip label={`${healingPotion.remaining}/${healingPotion.capacity}`} tone={healingPotion.remaining>0?'selected':'warning'}/>
      </View>
      <Text style={s.copy}>{gt('Food is disabled. Healing potions can be used between dungeon rooms only.')}</Text>
      {healingPotion.name&&onUseHealingPotion?<GameButton compact title={healingPotion.canUse?gt('Use 1 healing potion'):healingPotion.currentHp>=healingPotion.maximumHp?gt('Health full'):healingPotion.remaining===0?gt('No potion charges left'):healingPotion.carried===0?gt('No healing potions carried. Brew them in Alchemy or withdraw from Bank.'):gt('Use 1 healing potion')} disabled={busy||!healingPotion.canUse} onPress={onUseHealingPotion}/>:null}
    </FantasyPanel>:null}
    </DungeonDisclosure>:null}
    {!(run.phase==='resolving_node'||bossNext||run.lastCombat)?<DungeonDisclosure title={st('Party & formation')} initiallyOpen={false}>
    <FantasyPanel variant="selected"><View style={s.summary}><View style={s.grow}><Text style={s.title}>{ct(language,'details.party')}</Text><Text style={s.copy}>{ct(language,'details.partyValue')}</Text></View><StateChip label={`Lv. ${run.syncedLevel}`} tone="success"/></View></FantasyPanel>
    <Text style={s.section}>{ct(language,'details.party')}</Text>
    <View style={s.party}>{run.roleSlots.map((slot,index)=>{const avatar=dungeonCombatAvatar(slot.classId);return <FantasyPanel key={`${slot.role}-${index}`} variant={slot.ready===false?'danger':'default'} style={s.member}><RoleBadge role={slot.role} label={t(language,`coopUi.${slot.role}`)}/><View style={s.summary}><IdentityArtwork name={slot.name} profileIconId={slot.profileIconId} className={slot.iconClassId??slot.classId} size={36}/><View style={s.grow}><Text numberOfLines={2} style={s.name}>{slot.name}</Text>{avatar?<Text style={s.className}>{avatar.label}</Text>:null}</View></View><View style={s.memberMeta}><StateChip label={slot.npc?st('NPC'):slot.echo?'Echo':modeLabel} tone={slot.echo||slot.npc?'selected':'neutral'}/>{slot.ready!==undefined?<StateChip label={slot.ready?t(language,'coopUi.ready'):t(language,'coopUi.searching')} tone={slot.ready?'success':'warning'}/>:null}</View>{slot.companionId?<CoopPartyCompanionChip companionId={slot.companionId} echo={slot.echo}
      expanded={companionMemberId===(slot.memberId??slot.name)}
      onPress={()=>setCompanionMemberId(previous=>previous===(slot.memberId??slot.name)?undefined:(slot.memberId??slot.name))}/>:null}</FantasyPanel>})}</View>
    {companionSlot&&companionInfo?<FantasyPanel variant="selected">
     <View style={s.companionDetailRow}>
      <View style={s.companionDetailPortrait}>{companionPortrait?<Image source={companionPortrait} resizeMode="contain" style={s.companionDetailArt}/>:<UiIcon name="companions" size={40}/>}</View>
      <View style={s.grow}>
       <Text style={s.title}>{companionInfo.name}</Text>
       <Text style={s.copy}>{companionSlot.echo?st('Frozen Echo companion'):st('Party companion')} · {t(language,('coopUi.'+companionInfo.role) as 'coopUi.tank'|'coopUi.damage'|'coopUi.support')}</Text>
       {companionSlot.echo?<Text style={s.companionDetailNote}>{st('Echo companions use the published snapshot.')}</Text>:null}
      </View>
     </View>
    </FantasyPanel>:null}
    </DungeonDisclosure>:null}
    {run.mode==='live'&&run.presenceSummary?<DungeonDisclosure title={`${st('LIVE LINK')} · ${run.presenceSummary.connectedCount}/${run.presenceSummary.activeCount}`} initiallyOpen={run.presenceSummary.safetyAiCount>0}>
      <View style={s.summary}><Text style={[s.copy,s.grow]}>{run.presenceSummary.safetyAiCount>0?st('SAFETY AI'):st('ALL CONNECTED')}</Text></View>
      {run.presenceSummary.safetyAiCount>0?<Text style={s.copy}>{dungeonDynamicUiText(language,'A disconnected party member is being piloted with basic attacks and safe defensive abilities while reconnect is available.')}</Text>:null}
    </DungeonDisclosure>:null}
    {run.mechanic||run.objective?<DungeonDisclosure title={st('Objectives & mechanics')}>
    {run.mechanic?<FantasyPanel variant={run.mechanic.status==='critical'?'danger':run.mechanic.status==='strong'?'success':'selected'}><View style={s.mechanicHead}><View style={s.grow}><Text style={s.title}>{localizedMechanic?.label}</Text><Text style={s.copy}>{localizedMechanic?.description}</Text></View><StateChip label={`${Math.round(run.mechanic.value)}/${Math.round(run.mechanic.maxValue)}`} tone={run.mechanic.status==='critical'?'danger':run.mechanic.status==='strong'?'success':'warning'}/></View><View style={s.meterTrack}><View style={[s.meterFill,{width:`${Math.round((run.mechanic.value/run.mechanic.maxValue)*100)}%` as `${number}%`}]} /></View><Text style={s.copy}>{localizedMechanic?.bossEffect}</Text></FantasyPanel>:null}
    {run.objective?<FantasyPanel variant={run.objective.completed?'success':'selected'}><View style={s.mechanicHead}><View style={s.grow}><Text style={s.title}>{localizedObjective?.label}</Text><Text style={s.copy}>{localizedObjective?.description}</Text></View><StateChip label={`${run.objective.count}/${run.objective.maxCount}`} tone={run.objective.completed?'success':'selected'}/></View><Text style={s.copy}>{localizedObjective?.effectText}</Text></FantasyPanel>:null}
    </DungeonDisclosure>:null}
    <SeasonalBossTelegraphPanel mechanic={run.bossMechanic} recap={run.bossRecap} showPlan={bossNext}/>
    {run.mode==='live'&&onChatSend?<DungeonDisclosure title={st('Party Chat')}><CoopPartyChat messages={chatMessages} busy={busy} onSend={onChatSend}/></DungeonDisclosure>:null}
    {!!notice&&<Text accessibilityRole="alert" style={s.copy}>{notice}</Text>}

    {run.rewardText?<FantasyPanel variant="success"><Text style={s.title}>{ct(language,'details.reward')}</Text><Text style={s.copy}>{run.rewardText}</Text></FantasyPanel>:null}
    {terminal?<GameButton title={st('View rewards')} tone="secondary" disabled={busy} onPress={()=>setRewardOpen(true)}/>:null}
  </ExpeditionScreenShell>
   {terminal?<Modal visible={rewardOpen&&!theaterOpen} transparent animationType={reduceMotion?'none':'fade'} onRequestClose={()=>setRewardOpen(false)}>
    <View style={s.rewardOverlay}>
     <ScrollView style={s.rewardDialog} contentContainerStyle={s.rewardContent} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
      <TerminalRunMoment phase={run.phase} rewardsReady={rewardSurfaceReady} rewardsSecured={rewardsSecured} reduceMotion={reduceMotion}/>
      <Text style={s.rewardRunCaption}>{run.region?`${run.region} · `:''}{modeLabel}{run.routePath?` · ${run.routePath.totalDepth} ${st('rooms')}`:''}</Text>
      {!rewardSurfaceReady?<Text style={s.copy}>{run.phase==='failed'
       ?st("No failed-run reward receipt yet. Weekly consolation rewards may be exhausted; refresh to check.")
       :st("Preparing expedition rewards. You can retry if they have not appeared yet.")}</Text>:null}
      {rewards.map(reward=><View key={reward.id} style={s.rewardRow}>
       <View style={s.summary}><View style={s.rewardCurrencyIcon}><MarkIconBurst reduceMotion={reduceMotion}/><ExpeditionMarkIcon size={32}/></View><View style={s.grow}><Text style={s.rewardRowTitle}>{st("Expedition Marks")}</Text><AnimatedMarkAmount value={reward.reward_json.marks??0} reduceMotion={reduceMotion} style={s.rewardRowAmount}/>
       {reward.reward_json.live_fellowship_bonus?<Text style={s.copy}>{st("Live Fellowship bonus: +{marks} Marks",{marks:reward.reward_json.live_fellowship_bonus})}</Text>:null}
       {reward.reward_json.failure_consolation_applied?<Text style={s.copy}>{st("Consolation reward · No enhanced charge spent.")}</Text>:null}
        {reward.reward_json.reward_charges_remaining!==undefined&&reward.reward_json.weekly_enhanced_remaining!==undefined?<Text style={s.copy}>{st("Enhanced: {charges} charges · {weekly} weekly rewards left",{charges:reward.reward_json.reward_charges_remaining,weekly:reward.reward_json.weekly_enhanced_remaining})}</Text>:null}
       </View><StateChip label={reward.claimed_at?st("CLAIMED"):st("READY")} tone={reward.claimed_at?'success':'selected'}/></View>
       {!reward.claimed_at?<GameButton title={st("Claim rewards")} disabled={busy||!onClaim} onPress={()=>onClaim?.(reward.id)}/>:null}
      </View>)}
      {terminalAction?<View style={s.rewardRow}>{terminalAction.claimed?<View style={s.claimedReward}><StateChip label={st("CLAIMED")} tone="success"/><Text style={s.copy}>{terminalAction.completeText??st("Seasonal reward collected.")}</Text></View>:<GameButton title={terminalAction.label} disabled={busy} onPress={terminalAction.onPress}/>}</View>:null}
      {run.rewardText?<Text style={s.copy}>{run.rewardText}</Text>:null}
      {!!notice?<Text accessibilityRole="alert" style={s.copy}>{notice}</Text>:null}
      {rewardsSecured&&onOpenShop?<GameButton title={st('Spend at Expedition Shop')} disabled={busy} onPress={()=>{setRewardOpen(false);onOpenShop();}}/>:null}
      {rewardsSecured&&run.phase==='completed'&&run.mode==='live'&&onPartyRematch?<GameButton title={st('Rematch with this party')} tone="secondary" disabled={busy} onPress={()=>{setRewardOpen(false);onPartyRematch();}}/>:null}
      {rewardsSecured&&onQueueAgain?<GameButton title={onQueueAgain.label} tone="secondary" disabled={busy} onPress={onQueueAgain.onPress}/>:null}
      {!rewardSurfaceReady&&onRefresh?<GameButton title={st("Refresh rewards")} tone="secondary" disabled={busy} onPress={onRefresh}/>:null}
      <GameButton title={st("Return to dungeon list")} tone="secondary" disabled={busy} onPress={onBack}/>
     </ScrollView>
    </View>
   </Modal>:null}
   {theaterOpen?<CombatTheaterModal visible tone={seasonal?'event':'dungeon'} onClose={closeTheater} title={combatName} eyebrow={st('DUNGEON COMBAT')} subtitle={modeLabel} reduceMotion={reduceMotion} footer={showBattleAction?<GameButton title={terminal?st('View rewards'):st('Continue dungeon')} onPress={closeTheater}/>:undefined}>
    <DungeonCombatStage run={run} anticipation={enteringCombat||awaitingCombatPlayback} entryNodeId={entryCombatNodeId} previewArchetypes={entryCombatArchetypes} onPresentationComplete={()=>setBattlePresentationReady(true)} seasonal={seasonal} eventName={eventName} reduceMotionSetting={reduceMotion} boss={enteringCombat||awaitingCombatPlayback?(entryCombatKind??run.selectedNodeKind)==='boss':Boolean((run.pendingCombat??run.lastCombat)?.combatants?.some(member=>member.boss))} enemyLabel={(entryCombatKind??run.selectedNodeKind)==='boss'?run.bossMechanic?.telegraph?.bossName:undefined}/>
   </CombatTheaterModal>:null}
  </>;
}

const makeStyles=(coopColors:CoopColors)=>StyleSheet.create({actionArea:{gap:8},routeHeader:{flexDirection:'row',alignItems:'center',gap:8},routeEyebrow:{fontSize:11,lineHeight:15,color:coopColors.textMuted,fontWeight:'700',letterSpacing:.6},routeSupplies:{flexDirection:'row',flexWrap:'wrap',gap:8},partyMini:{flexDirection:'row',gap:6,paddingVertical:7,paddingHorizontal:6,borderWidth:1,borderColor:coopColors.goldDim,borderRadius:10,backgroundColor:coopColors.surface},partyMiniMember:{flex:1,minWidth:0,alignItems:'center',justifyContent:'center',gap:1},partyMiniName:{fontSize:10,lineHeight:14,fontWeight:'700',color:coopColors.text,maxWidth:'100%'},partyMiniRole:{fontSize:9,lineHeight:12,color:coopColors.textMuted},routeSupply:{fontSize:11,lineHeight:16,color:coopColors.textSecondary},boonHeader:{gap:3},boonChoices:{gap:6},boonChoice:{minHeight:52,flexDirection:'row',alignItems:'center',gap:8,paddingVertical:8,paddingHorizontal:10,borderWidth:1,borderColor:coopColors.line,borderRadius:9,backgroundColor:coopColors.surface},boonSelected:{borderColor:coopColors.cyan,backgroundColor:coopColors.selection},boonText:{flex:1,minWidth:0,gap:2},boonMarker:{fontSize:20,fontWeight:'900',color:coopColors.gold},battlePrelude:{minHeight:300,justifyContent:'center',alignItems:'center',gap:14,padding:24},preludeIcon:{fontSize:46,color:coopColors.gold},preludeTitle:{...coopTypography.section,color:coopColors.text,fontWeight:'900'},rewardOverlay:{flex:1,justifyContent:'center',padding:16,backgroundColor:'rgba(0,0,0,.84)'},rewardDialog:{maxHeight:'88%',flexGrow:0,borderRadius:16,borderWidth:1,borderColor:coopColors.goldDim,backgroundColor:coopColors.background},rewardContent:{gap:12,padding:16},rewardRow:{gap:8,padding:10,borderWidth:1,borderColor:coopColors.goldDim,borderRadius:10,backgroundColor:coopColors.surfaceRaised},terminal:{gap:6,paddingVertical:coopSpacing.md,paddingHorizontal:coopSpacing.sm,alignItems:"center"},rewardCrest:{width:48,height:48,borderRadius:24,borderWidth:1,alignItems:"center",justifyContent:"center",marginBottom:6},rewardCrestSuccess:{borderColor:coopColors.success,backgroundColor:coopColors.selection},rewardCrestFailure:{borderColor:coopColors.danger,backgroundColor:coopColors.surfaceRaised},rewardCrestText:{fontSize:24,fontWeight:"800"},terminalDescription:{...coopTypography.meta,color:coopColors.textMuted,textAlign:"center",marginTop:4},rewardRunCaption:{...coopTypography.meta,color:coopColors.gold,textAlign:'center',fontWeight:'700',marginTop:-6},rewardCurrencyIcon:{width:40,height:40,borderRadius:10,borderWidth:1,borderColor:coopColors.goldDim,alignItems:"center",justifyContent:"center",backgroundColor:coopColors.surface},rewardRowTitle:{...coopTypography.meta,fontWeight:"700",color:coopColors.text},rewardRowAmount:{...coopTypography.section,color:coopColors.text,fontWeight:"900"},terminalHead:{flexDirection:'row',alignItems:'center',gap:coopSpacing.sm},terminalEyebrow:{...coopTypography.meta,fontWeight:'900',letterSpacing:.8,textAlign:'center'},terminalSuccess:{color:coopColors.success},terminalDanger:{color:coopColors.danger},terminalTitle:{...coopTypography.section,color:coopColors.text,fontWeight:'900',textAlign:'center'},claimedReward:{flexDirection:'row',alignItems:'center',gap:coopSpacing.sm},banner:{flexDirection:'row',alignItems:'center',gap:6,minHeight:22},region:{fontSize:12,lineHeight:18,fontWeight:'900',letterSpacing:.6,textTransform:'uppercase'},modeText:{fontSize:12,lineHeight:18,color:coopColors.gold,fontWeight:'800',letterSpacing:.4},bannerDot:{fontSize:15,lineHeight:18,color:coopColors.textMuted},phase:{...coopTypography.meta,color:coopColors.textSecondary,flex:1},summary:{flexDirection:'row',alignItems:'center',gap:coopSpacing.sm},grow:{flex:1,minWidth:0},section:{...coopTypography.section,color:coopColors.gold,marginTop:coopSpacing.xs},title:{...coopTypography.section,color:coopColors.text},copy:{...coopTypography.body,color:coopColors.textSecondary},party:{flexDirection:'row',flexWrap:'wrap',gap:coopSpacing.sm},member:{width:'48%',flexGrow:1},companionDetailRow:{flexDirection:'row',alignItems:'center',gap:10},companionDetailPortrait:{width:48,height:48,alignItems:'center',justifyContent:'center'},companionDetailArt:{width:46,height:46},companionDetailNote:{fontSize:11,lineHeight:16,color:coopColors.textMuted,marginTop:3},name:{...coopTypography.body,color:coopColors.text,fontWeight:'800'},className:{...coopTypography.meta,color:coopColors.cyan},memberMeta:{flexDirection:'row',flexWrap:'wrap',gap:coopSpacing.xs},option:{minHeight:64,flexDirection:'row',alignItems:'center',gap:coopSpacing.md},encounterIntel:{marginTop:3,flexDirection:'row',alignItems:'center',gap:5},encounterIntelLabel:{fontSize:7,lineHeight:9,color:coopColors.cyan,fontWeight:'900',letterSpacing:.45},encounterIntelCopy:{flex:1,fontSize:8,lineHeight:10,color:coopColors.textMuted,fontWeight:'800'},mechanicHead:{flexDirection:'row',alignItems:'flex-start',gap:coopSpacing.sm},meterTrack:{height:6,borderRadius:999,overflow:'hidden',backgroundColor:coopColors.surfaceRaised},meterFill:{height:'100%',borderRadius:999,backgroundColor:coopColors.cyan}});
