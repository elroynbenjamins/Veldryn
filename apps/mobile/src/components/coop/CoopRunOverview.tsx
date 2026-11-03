import {useCoopStyles} from '../../theme/useCoopStyles';
import {useSocialText} from '../../i18n/social';
import {useEffect,useRef,useState} from 'react';
import {Animated,Modal,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {CoopRunView} from '../../core/coop-presentation';
import {isCoopBattleResolving,isCoopCombatNodeKind,validateCoopRunView} from '../../core/coop-presentation';
import {ct,t,type Language} from '../../i18n';
import {accountText} from '../../i18n/account';
import {type CoopColors,coopSpacing,coopTypography} from '../../theme/coop-ui-theme';
import {ExpeditionScreenShell,FantasyPanel,RoleBadge,StateChip} from './CoopVisualKit';
import {DungeonRouteChoices} from './DungeonRouteChoices';
import {GameButton} from '../GameButton';
import {IdentityArtwork} from '../SocialIdentity';
import {SeasonalBossTelegraphPanel} from './SeasonalBossTelegraphPanel';
import {dungeonCombatAvatar} from '../../core/dungeon-combat-avatars';
import {DungeonCombatStage} from './DungeonCombatStage';
import {CombatTheaterModal} from '../CombatTheaterModal';
import {CoopPartyChat} from './CoopPartyChat';
import {DungeonDisclosure} from './DungeonPreparation';
import type {CoopChatMessage} from '../../online/coop-client';

function TerminalRunMoment({phase,rewardsReady,rewardsSecured,reduceMotion}:{phase:CoopRunView['phase'];rewardsReady:boolean;rewardsSecured:boolean;reduceMotion:boolean}){
 const {styles:s}=useCoopStyles(makeStyles);
 const st=useSocialText();
  const scale=useRef(new Animated.Value(1)).current,completed=phase==='completed';
  useEffect(()=>{scale.stopAnimation();scale.setValue(1);if(reduceMotion||!completed)return;Animated.sequence([Animated.spring(scale,{toValue:1.025,damping:9,stiffness:220,mass:.65,useNativeDriver:true}),Animated.spring(scale,{toValue:1,damping:16,stiffness:200,mass:.75,useNativeDriver:true})]).start();return()=>scale.stopAnimation()},[phase,rewardsSecured,reduceMotion,scale,completed]);
  const body=completed
    ?rewardsSecured?'Your expedition rewards are secured. Return when you are ready.':rewardsReady?'Final encounter cleared. Collect the expedition reward below.':'Final encounter cleared. Your reward entitlement is being prepared.'
    :'This expedition has ended. Review any available rewards before returning.';
  return <Animated.View accessibilityLiveRegion="polite" style={[s.terminal,{transform:[{scale}]}]}>
    <View style={[s.rewardCrest,completed?s.rewardCrestSuccess:s.rewardCrestFailure]}><Text style={[s.rewardCrestText,completed?s.terminalSuccess:s.terminalDanger]}>{completed?'✦':'◇'}</Text></View>
    <Text style={[s.terminalEyebrow,completed?s.terminalSuccess:s.terminalDanger]}>{completed?st("EXPEDITION CLEARED"):st("EXPEDITION ENDED")}</Text>
    <Text style={s.terminalTitle}>{completed?st("Victory secured!"):st("Run complete")}</Text>
    <Text style={s.terminalDescription}>{body}</Text>
  </Animated.View>;
}

export interface CoopRewardDisplay {id:string;claimed_at:string|null;reward_json:{marks?:number;enhanced_reward?:boolean;live_fellowship_bonus?:number;reward_charges_remaining?:number;weekly_enhanced_remaining?:number;failure_consolation_remaining?:number;failure_consolation_applied?:boolean};}
export function CoopRunOverview({language,run,myVotedNodeId,selfVoter,onBack,onChoose,onRefresh,onClaim,onQueueAgain,onPartyRematch,busy=false,notice,syncError,rewards=[],terminalAction,reduceMotion=false,seasonal=false,eventName,chatMessages=[],onChatSend}:{language:Language;run:CoopRunView;myVotedNodeId?:string;selfVoter?:{name:string;profileIconId?:string|null;className?:string|null};onBack:()=>void;onChoose?:(nodeId:string)=>void;onRefresh?:()=>void;onClaim?:(id:string)=>void;onQueueAgain?:{label:string;onPress:()=>void};onPartyRematch?:()=>void;busy?:boolean;notice?:string;syncError?:string;rewards?:CoopRewardDisplay[];terminalAction?:{label:string;claimed?:boolean;completeText?:string;onPress:()=>void};reduceMotion?:boolean;seasonal?:boolean;eventName?:string;chatMessages?:CoopChatMessage[];onChatSend?:(text:string)=>Promise<void>}){
 const {styles:s}=useCoopStyles(makeStyles);
 const st=useSocialText(),a=(value:string)=>accountText(language,value);
  validateCoopRunView(run);
  const modeLabel=run.modeLabel??(run.mode==='qmode'?ct(language,'details.qmode'):ct(language,'details.live')),bossNext=run.options.some(option=>option.kind==='boss');
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
  const enterFromVersion=useRef(run.stateVersion),enterFromNode=useRef(run.lastCombat?.nodeId);
  useEffect(()=>{
   const newCombat=Boolean(run.lastCombat&&lastReplay.current!==replayKey);
   // Present each server-authorized battle once; never expose a replay control.
   if((inCombat&&!wasInCombat.current)||newCombat){
    setTheaterOpen(true);
    if(terminal)setRewardOpen(false);
   }else if(terminal&&!wasTerminal.current&&!theaterOpen&&!inCombat){
    setRewardOpen(true);
   }
   lastReplay.current=replayKey;wasInCombat.current=inCombat;wasTerminal.current=terminal;
  },[inCombat,run.lastCombat,replayKey,terminal]);
  // The battle stage opens before the request finishes. Combat cues, HP and
  // outcomes still come exclusively from the authoritative server response.
  const chooseRoom=(nodeId:string)=>{
   const option=run.options.find(item=>item.nodeId===nodeId);
   if(onChoose&&run.mode==='qmode'&&isCoopCombatNodeKind(option?.kind)){
    enterFromVersion.current=run.stateVersion;
    enterFromNode.current=run.lastCombat?.nodeId;
    setEnteringCombat(true);setTheaterOpen(true);
   }
   onChoose?.(nodeId);
  };
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
  const awaitingCombatPlayback=inCombat&&run.mode==='qmode'&&!!run.selectedNodeId&&run.lastCombat?.nodeId!==run.selectedNodeId;
  const combatName=run.bossMechanic?.telegraph?.bossName??(run.pendingCombat??run.lastCombat)?.combatants?.find(member=>member.boss)?.name??st('DUNGEON COMBAT');
  return <><ExpeditionScreenShell hideHeader compactHeader={inCombat} eyebrow={ct(language,'browse.resumeTitle')} title={inCombat?combatName:ct(language,'browse.resume')} banner={inCombat?undefined:<View style={s.banner}><StateChip label={modeLabel} tone="selected"/><Text style={s.phase}>{run.phase.replaceAll('_',' ')}</Text></View>}>
    {inCombat?<FantasyPanel variant="selected"><View style={s.summary}>
      <View style={s.grow}><Text style={s.title}>{run.phase==='resolving_node'?st('Battle in progress'):run.lastCombat?.reason==='victory'?st('Encounter cleared'):run.lastCombat?.reason==='wipe'?st('Party defeated'):st('Battle complete')}</Text><Text style={s.copy}>{combatName}</Text></View>
      <GameButton compact title={st('View battle')} onPress={()=>setTheaterOpen(true)}/>
     </View></FantasyPanel>:null}
    {run.phase==='resolving_node'&&!inCombat?<FantasyPanel variant="selected"><Text style={s.title}>{st('Room in progress')}</Text><Text style={s.copy}>{run.selectedNodeKind?st('Resolving')+' '+run.selectedNodeKind.charAt(0).toUpperCase()+run.selectedNodeKind.slice(1):st('Resolving the selected room')}</Text></FantasyPanel>:null}
    {!!syncError&&<FantasyPanel variant="danger"><Text accessibilityRole="alert" style={s.title}>{a('Connection interrupted')}</Text><Text style={s.copy}>{a('Showing the last saved expedition progress. Reconnecting automatically.')}</Text><Text style={s.copy} numberOfLines={2}>{syncError}</Text>{onRefresh?<GameButton compact title={a('Retry connection')} tone="secondary" disabled={busy} onPress={onRefresh}/>:null}</FantasyPanel>}
    {run.options.length?<View style={s.actionArea}>
      <Text style={s.section}>{run.mode==='live'?st('Vote for the next path'):st('Choose the next room')}</Text>
      {run.mode==='live'?<Text style={s.copy}>{st('The route with the most votes will be selected.')}{secondsRemaining!==undefined?` · ${st('Vote ends in {seconds}s',{seconds:secondsRemaining})}`:''}</Text>:null}
      <DungeonRouteChoices options={run.options} mode={run.mode} phase={run.phase} busy={busy} onChoose={onChoose?chooseRoom:undefined} myVotedNodeId={myVotedNodeId} selfVoter={selfVoter}/>
     </View>:run.phase!=='resolving_node'&&!terminal?<FantasyPanel><Text style={s.copy}>{ct(language,'browse.resumeBody')}</Text></FantasyPanel>:null}
    {!(run.phase==='resolving_node'||bossNext||run.lastCombat)?<DungeonDisclosure title={st('Party & formation')}>
    <FantasyPanel variant="selected"><View style={s.summary}><View style={s.grow}><Text style={s.title}>{ct(language,'details.party')}</Text><Text style={s.copy}>{ct(language,'details.partyValue')}</Text></View><StateChip label={`Lv. ${run.syncedLevel}`} tone="success"/></View></FantasyPanel>
    <Text style={s.section}>{ct(language,'details.party')}</Text>
    <View style={s.party}>{run.roleSlots.map((slot,index)=>{const avatar=dungeonCombatAvatar(slot.classId);return <FantasyPanel key={`${slot.role}-${index}`} variant={slot.ready===false?'danger':'default'} style={s.member}><RoleBadge role={slot.role} label={t(language,`coopUi.${slot.role}`)}/><View style={s.summary}><IdentityArtwork name={slot.name} profileIconId={slot.profileIconId} className={slot.iconClassId??slot.classId} size={36}/><View style={s.grow}><Text numberOfLines={2} style={s.name}>{slot.name}</Text>{avatar?<Text style={s.className}>{avatar.label}</Text>:null}</View></View><View style={s.memberMeta}><StateChip label={slot.npc?st('NPC'):slot.echo?'Echo':modeLabel} tone={slot.echo||slot.npc?'selected':'neutral'}/>{slot.ready!==undefined?<StateChip label={slot.ready?t(language,'coopUi.ready'):t(language,'coopUi.searching')} tone={slot.ready?'success':'warning'}/>:null}</View></FantasyPanel>})}</View>
    </DungeonDisclosure>:null}
    {run.mode==='live'&&run.presenceSummary?<FantasyPanel variant={run.presenceSummary.safetyAiCount>0?'selected':'default'}><View style={s.summary}><View style={s.grow}><Text style={s.title}>{st("LIVE LINK")}</Text><Text style={s.copy}>{run.presenceSummary.connectedCount}/{run.presenceSummary.activeCount} connected · server presence is authoritative</Text></View><StateChip label={run.presenceSummary.safetyAiCount>0?st("SAFETY AI"):st("ALL CONNECTED")} tone={run.presenceSummary.safetyAiCount>0?'warning':'success'}/></View>{run.presenceSummary.safetyAiCount>0?<Text style={s.copy}>A disconnected party member is being piloted with basic attacks and safe defensive abilities while reconnect is available.</Text>:null}</FantasyPanel>:null}
    {run.mechanic||run.objective?<DungeonDisclosure title={st('Objectives & mechanics')}>
    {run.mechanic?<FantasyPanel variant={run.mechanic.status==='critical'?'danger':run.mechanic.status==='strong'?'success':'selected'}><View style={s.mechanicHead}><View style={s.grow}><Text style={s.title}>{run.mechanic.label}</Text><Text style={s.copy}>{run.mechanic.description}</Text></View><StateChip label={`${Math.round(run.mechanic.value)}/${Math.round(run.mechanic.maxValue)}`} tone={run.mechanic.status==='critical'?'danger':run.mechanic.status==='strong'?'success':'warning'}/></View><View style={s.meterTrack}><View style={[s.meterFill,{width:`${Math.round((run.mechanic.value/run.mechanic.maxValue)*100)}%` as `${number}%`}]} /></View><Text style={s.copy}>{run.mechanic.bossEffect}</Text></FantasyPanel>:null}
    {run.objective?<FantasyPanel variant={run.objective.completed?'success':'selected'}><View style={s.mechanicHead}><View style={s.grow}><Text style={s.title}>{run.objective.label}</Text><Text style={s.copy}>{run.objective.description}</Text></View><StateChip label={`${run.objective.count}/${run.objective.maxCount}`} tone={run.objective.completed?'success':'selected'}/></View><Text style={s.copy}>{run.objective.effectText}</Text></FantasyPanel>:null}
    </DungeonDisclosure>:null}
    {run.bossMechanic?<FantasyPanel variant={run.bossMechanic.tone==='danger'?'danger':run.bossMechanic.tone==='benefit'?'success':'selected'}><View style={s.mechanicHead}><View style={s.grow}><Text style={s.title}>Final Boss Reaction · {run.bossMechanic.label}</Text><Text style={s.copy}>{run.bossMechanic.summary}</Text></View><StateChip label={run.bossMechanic.tone==='danger'?st("DANGER"):run.bossMechanic.tone==='benefit'?st("ADVANTAGE"):st("MIXED")} tone={run.bossMechanic.tone==='danger'?'danger':run.bossMechanic.tone==='benefit'?'success':'warning'}/></View></FantasyPanel>:null}
    <SeasonalBossTelegraphPanel mechanic={run.bossMechanic} recap={run.bossRecap} showPlan={bossNext}/>
    {run.mode==='live'&&onChatSend?<DungeonDisclosure title={st('Party Chat')}><CoopPartyChat messages={chatMessages} busy={busy} onSend={onChatSend}/></DungeonDisclosure>:null}
    {!!notice&&<Text accessibilityRole="alert" style={s.copy}>{notice}</Text>}
    {run.phase==='resolving_node'&&<FantasyPanel><Text style={s.copy}>{inCombat?st('Battle in progress · Results are saved online.'):st('Resolving room · Progress is saved online.')}</Text></FantasyPanel>}

    {run.rewardText?<FantasyPanel variant="success"><Text style={s.title}>{ct(language,'details.reward')}</Text><Text style={s.copy}>{run.rewardText}</Text></FantasyPanel>:null}
    {terminal?<GameButton title={st('View rewards')} tone="secondary" disabled={busy} onPress={()=>setRewardOpen(true)}/>:null}
  </ExpeditionScreenShell>
   {terminal?<Modal visible={rewardOpen&&!theaterOpen} transparent animationType={reduceMotion?'none':'fade'} onRequestClose={()=>setRewardOpen(false)}>
    <View style={s.rewardOverlay}>
     <ScrollView style={s.rewardDialog} contentContainerStyle={s.rewardContent} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
      <TerminalRunMoment phase={run.phase} rewardsReady={rewardSurfaceReady} rewardsSecured={rewardsSecured} reduceMotion={reduceMotion}/>
      {!rewardSurfaceReady?<Text style={s.copy}>{st("Preparing expedition rewards. You can retry if they have not appeared yet.")}</Text>:null}
      {rewards.map(reward=><View key={reward.id} style={s.rewardRow}>
       <View style={s.summary}><View style={s.rewardCurrencyIcon}><Text style={s.rewardCurrencyMark}>⬡</Text></View><View style={s.grow}><Text style={s.rewardRowTitle}>{st("Expedition Marks")}</Text><Text style={s.rewardRowAmount}>+{reward.reward_json.marks??0}</Text>
       {reward.reward_json.live_fellowship_bonus?<Text style={s.copy}>{st("Live Fellowship bonus: +{marks} Marks",{marks:reward.reward_json.live_fellowship_bonus})}</Text>:null}
       {reward.reward_json.failure_consolation_applied?<Text style={s.copy}>{st("Consolation reward · No enhanced charge spent.")}</Text>:null}
        {reward.reward_json.reward_charges_remaining!==undefined&&reward.reward_json.weekly_enhanced_remaining!==undefined?<Text style={s.copy}>{st("Enhanced: {charges} charges · {weekly} weekly rewards left",{charges:reward.reward_json.reward_charges_remaining,weekly:reward.reward_json.weekly_enhanced_remaining})}</Text>:null}
       </View><StateChip label={reward.claimed_at?st("CLAIMED"):st("READY")} tone={reward.claimed_at?'success':'selected'}/></View>
       {!reward.claimed_at?<GameButton title={st("Claim rewards")} disabled={busy||!onClaim} onPress={()=>onClaim?.(reward.id)}/>:null}
      </View>)}
      {terminalAction?<View style={s.rewardRow}>{terminalAction.claimed?<View style={s.claimedReward}><StateChip label={st("CLAIMED")} tone="success"/><Text style={s.copy}>{terminalAction.completeText??st("Seasonal reward collected.")}</Text></View>:<GameButton title={terminalAction.label} disabled={busy} onPress={terminalAction.onPress}/>}</View>:null}
      {run.rewardText?<Text style={s.copy}>{run.rewardText}</Text>:null}
      {!!notice?<Text accessibilityRole="alert" style={s.copy}>{notice}</Text>:null}
      {rewardsSecured&&run.phase==='completed'&&run.mode==='live'&&onPartyRematch?<GameButton title={st('Rematch with this party')} disabled={busy} onPress={()=>{setRewardOpen(false);onPartyRematch();}}/>:null}
      {rewardsSecured&&onQueueAgain?<GameButton title={onQueueAgain.label} disabled={busy} onPress={onQueueAgain.onPress}/>:null}
      {!rewardSurfaceReady&&onRefresh?<GameButton title={st("Refresh rewards")} tone="secondary" disabled={busy} onPress={onRefresh}/>:null}
      <GameButton title={st("Return to dungeon list")} tone="secondary" disabled={busy} onPress={onBack}/>
     </ScrollView>
    </View>
   </Modal>:null}
   {theaterOpen?<CombatTheaterModal visible tone={seasonal?'event':'dungeon'} onClose={()=>{setTheaterOpen(false);if(terminal)setRewardOpen(true);}} title={combatName} eyebrow={st('DUNGEON COMBAT')} subtitle={modeLabel} reduceMotion={reduceMotion}>
    {enteringCombat||awaitingCombatPlayback?<View style={s.battlePrelude} accessibilityLiveRegion="polite"><Text style={s.preludeIcon}>⚔</Text><Text style={s.preludeTitle}>{awaitingCombatPlayback?st("Battle in progress"):st("Entering battle")}</Text><Text style={s.copy}>{awaitingCombatPlayback?st("Your encounter is running. Combat results will appear when the server settles this room."):st("Preparing the encounter…")}</Text></View>:<DungeonCombatStage run={run} onPresentationComplete={terminal?()=>{setTheaterOpen(false);setRewardOpen(true);}:undefined} seasonal={seasonal} eventName={eventName} reduceMotionSetting={reduceMotion} boss={Boolean((run.pendingCombat??run.lastCombat)?.combatants?.some(member=>member.boss))} enemyLabel={run.bossMechanic?.telegraph?.bossName}/>}
   </CombatTheaterModal>:null}
  </>;
}

const makeStyles=(coopColors:CoopColors)=>StyleSheet.create({actionArea:{gap:8},battlePrelude:{minHeight:300,justifyContent:'center',alignItems:'center',gap:14,padding:24},preludeIcon:{fontSize:46,color:coopColors.gold},preludeTitle:{...coopTypography.section,color:coopColors.text,fontWeight:'900'},rewardOverlay:{flex:1,justifyContent:'center',padding:16,backgroundColor:'rgba(0,0,0,.84)'},rewardDialog:{maxHeight:'88%',flexGrow:0,borderRadius:16,borderWidth:1,borderColor:coopColors.goldDim,backgroundColor:coopColors.background},rewardContent:{gap:12,padding:16},rewardRow:{gap:8,padding:10,borderWidth:1,borderColor:coopColors.goldDim,borderRadius:10,backgroundColor:coopColors.surfaceRaised},terminal:{gap:6,paddingVertical:coopSpacing.md,paddingHorizontal:coopSpacing.sm,alignItems:"center"},rewardCrest:{width:48,height:48,borderRadius:24,borderWidth:1,alignItems:"center",justifyContent:"center",marginBottom:6},rewardCrestSuccess:{borderColor:coopColors.success,backgroundColor:coopColors.selection},rewardCrestFailure:{borderColor:coopColors.danger,backgroundColor:coopColors.surfaceRaised},rewardCrestText:{fontSize:24,fontWeight:"800"},terminalDescription:{...coopTypography.meta,color:coopColors.textMuted,textAlign:"center",marginTop:4},rewardCurrencyIcon:{width:40,height:40,borderRadius:10,borderWidth:1,borderColor:coopColors.goldDim,alignItems:"center",justifyContent:"center",backgroundColor:coopColors.surface},rewardCurrencyMark:{fontSize:23,color:coopColors.warning},rewardRowTitle:{...coopTypography.meta,fontWeight:"700",color:coopColors.text},rewardRowAmount:{...coopTypography.section,color:coopColors.text,fontWeight:"900"},terminalHead:{flexDirection:'row',alignItems:'center',gap:coopSpacing.sm},terminalEyebrow:{...coopTypography.meta,fontWeight:'900',letterSpacing:.8,textAlign:'center'},terminalSuccess:{color:coopColors.success},terminalDanger:{color:coopColors.danger},terminalTitle:{...coopTypography.section,color:coopColors.text,fontWeight:'900',textAlign:'center'},claimedReward:{flexDirection:'row',alignItems:'center',gap:coopSpacing.sm},banner:{flexDirection:'row',alignItems:'center',gap:coopSpacing.sm},phase:{...coopTypography.meta,color:coopColors.textSecondary,textTransform:'capitalize',flex:1},summary:{flexDirection:'row',alignItems:'center',gap:coopSpacing.sm},grow:{flex:1,minWidth:0},section:{...coopTypography.section,color:coopColors.gold,marginTop:coopSpacing.xs},title:{...coopTypography.section,color:coopColors.text},copy:{...coopTypography.body,color:coopColors.textSecondary},party:{flexDirection:'row',flexWrap:'wrap',gap:coopSpacing.sm},member:{width:'48%',flexGrow:1},name:{...coopTypography.body,color:coopColors.text,fontWeight:'800'},className:{...coopTypography.meta,color:coopColors.cyan},memberMeta:{flexDirection:'row',flexWrap:'wrap',gap:coopSpacing.xs},option:{minHeight:64,flexDirection:'row',alignItems:'center',gap:coopSpacing.md},encounterIntel:{marginTop:3,flexDirection:'row',alignItems:'center',gap:5},encounterIntelLabel:{fontSize:7,lineHeight:9,color:coopColors.cyan,fontWeight:'900',letterSpacing:.45},encounterIntelCopy:{flex:1,fontSize:8,lineHeight:10,color:coopColors.textMuted,fontWeight:'800'},mechanicHead:{flexDirection:'row',alignItems:'flex-start',gap:coopSpacing.sm},meterTrack:{height:6,borderRadius:999,overflow:'hidden',backgroundColor:coopColors.surfaceRaised},meterFill:{height:'100%',borderRadius:999,backgroundColor:coopColors.cyan}});
