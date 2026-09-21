import {useEffect,useMemo,useState} from 'react';
import {AccessibilityInfo,Image,Pressable,StyleSheet,Text,View} from 'react-native';
import type {CoopRunView} from '../../core/coop-presentation';
import {dungeonCombatAvatar} from '../../core/dungeon-combat-avatars';
import {playbackCueDelayMs,playbackCueLabel,playbackCueTone,playbackProgress,playbackRecentCues} from '../../core/dungeon-combat-playback';
import {combatCompanionDef} from '../../content/combat-companions';
import {companionArtSource} from '../../theme/companion-art';
import {coopColors,coopRadii,coopSpacing,coopTypography} from '../../theme/coop-ui-theme';
import {FantasyPanel,StateChip} from './CoopVisualKit';

type Slot=CoopRunView['roleSlots'][number];

function hpPercent(slot:Slot){
 const current=slot.currentHp,maximum=slot.maximumHp;
 if(current===undefined||maximum===undefined||!Number.isFinite(current)||!Number.isFinite(maximum)||maximum<=0)return 1;
 return Math.max(0,Math.min(1,current/maximum));
}
function seconds(value:number){return `${Math.max(0,value/1000).toFixed(1)}s`;}

function ClassAvatar({slot,active=false,assistProc=false}:{slot:Slot;active?:boolean;assistProc?:boolean}){
 const avatar=dungeonCombatAvatar(slot.classId),pct=hpPercent(slot),companion=slot.companionId?combatCompanionDef(slot.companionId):undefined,art=slot.companionId?companionArtSource(slot.companionId):undefined;
 const initial=(avatar?.label??slot.classId??slot.role).slice(0,1).toUpperCase();
 return <View style={[s.member,slot.role==='tank'&&s.memberTank,active&&s.memberActive,slot.ready===false&&s.memberDown]}>
  <View style={[s.avatarFrame,slot.role==='tank'?s.avatarTank:slot.role==='support'?s.avatarSupport:s.avatarDamage,active&&s.avatarActive]}>
   <Text style={s.avatarInitial}>{initial}</Text>
   <Text numberOfLines={1} style={s.avatarWeapon}>{avatar?.weaponSilhouette??slot.role}</Text>
  </View>
  <Text numberOfLines={1} style={s.memberName}>{slot.name}</Text>
  <Text numberOfLines={1} style={s.className}>{avatar?.label??slot.classId??slot.role}</Text>
  <View style={s.hpTrack}><View style={[s.hpFill,{width:`${Math.round(pct*100)}%` as `${number}%`}]} /></View>
  {slot.currentHp!==undefined&&slot.maximumHp!==undefined?<Text style={s.hpText}>{Math.max(0,Math.round(slot.currentHp))}/{Math.max(1,Math.round(slot.maximumHp))}</Text>:null}
  {companion?<View style={[s.assistRow,assistProc&&s.assistRowActive]}>{art?<Image source={art} resizeMode="contain" style={[s.companionArt,assistProc&&s.companionArtActive]}/>:<View style={[s.companionFallback,assistProc&&s.companionFallbackActive]}><Text style={s.companionFallbackText}>◇</Text></View>}<View style={s.assistCopy}><Text style={s.assistLabel}>{assistProc?'ASSIST PROC':'COMPANION ASSIST'}</Text><Text numberOfLines={1} style={[s.assistName,assistProc&&s.assistNameActive]}>{companion.name}</Text></View></View>:null}
 </View>;
}

export function DungeonCombatStage({run,enemyLabel,boss=false}:{run:CoopRunView;enemyLabel?:string;boss?:boolean}){
 const tank=run.roleSlots.find(slot=>slot.role==='tank'),damage=run.roleSlots.filter(slot=>slot.role==='damage'),support=run.roleSlots.find(slot=>slot.role==='support');
 const ordered=[tank,damage[0],damage[1],support].filter((slot):slot is Slot=>Boolean(slot)),assists=ordered.filter(slot=>slot.companionId).length;
 const replay=run.lastCombat,cues=replay?.cues??[],replayKey=`${run.runId}:${replay?.nodeId??'preview'}:${replay?.durationMs??0}:${cues.length}`;
 const [cueIndex,setCueIndex]=useState(0),[reduceMotion,setReduceMotion]=useState(false);
 useEffect(()=>{let mounted=true;void AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(mounted)setReduceMotion(value);});return()=>{mounted=false;};},[]);
 useEffect(()=>{setCueIndex(reduceMotion&&cues.length?cues.length-1:0);},[replayKey,reduceMotion,cues.length]);
 useEffect(()=>{
  if(!replay||reduceMotion||cueIndex>=cues.length-1)return;
  const current=cues[cueIndex],next=cues[cueIndex+1],timer=setTimeout(()=>setCueIndex(value=>Math.min(value+1,cues.length-1)),playbackCueDelayMs(current,next));
  return()=>clearTimeout(timer);
 },[replay,replayKey,reduceMotion,cueIndex,cues]);
 const currentCue=cues.length?cues[Math.min(cueIndex,cues.length-1)]:undefined,recent=replay?playbackRecentCues(replay,cueIndex):[];
 const partyIds=useMemo(()=>new Set(ordered.map(slot=>slot.memberId).filter((id):id is string=>Boolean(id))),[ordered]);
 const replayEnemy=useMemo(()=>{for(const cue of cues){if(cue.actorId&&!partyIds.has(cue.actorId)&&cue.actorName)return cue.actorName;if(cue.targetId&&!partyIds.has(cue.targetId)&&cue.targetName)return cue.targetName;}return undefined;},[cues,partyIds]);
 const shownEnemy=enemyLabel??replayEnemy??(boss?'Final Boss':'Dungeon Enemy'),enemyActive=Boolean(currentCue?.actorId&&!partyIds.has(currentCue.actorId));
 const progress=replay?playbackProgress(replay,cueIndex):0,complete=Boolean(replay&&(!cues.length||cueIndex>=cues.length-1));
 return <FantasyPanel variant={boss?'danger':'selected'}>
  <View style={s.header}><View style={s.grow}><Text style={s.kicker}>{replay?'COMBAT PLAYBACK':boss?'FINAL ENCOUNTER':'DUNGEON COMBAT'}</Text><Text style={s.title}>{shownEnemy}</Text></View><StateChip label={assists?`${assists} ASSIST${assists===1?'':'S'}`:'NO ASSISTS'} tone={assists?'success':'neutral'}/></View>
  <View style={s.arena}>
   <View style={s.partyField}>{ordered.map((slot,index)=>{const active=Boolean(currentCue?.actorId&&slot.memberId===currentCue.actorId),assistProc=active&&currentCue?.type==='assist';return <View key={slot.memberId??`${slot.name}-${index}`} style={[s.formationSlot,index===0&&s.slotFront,index===3&&s.slotRear]}><ClassAvatar slot={slot} active={active} assistProc={assistProc}/></View>;})}</View>
   <View style={s.divider}><Text style={s.vs}>VS</Text></View>
   <View style={s.enemyField}><View style={[s.enemyCore,boss&&s.enemyBoss,enemyActive&&s.enemyActive]}><Text style={s.enemyMark}>{boss?'♛':'◆'}</Text><Text numberOfLines={2} style={s.enemyName}>{shownEnemy}</Text><Text style={s.enemyHint}>{replay?'Authoritative server replay':boss?'Phase + cast telegraphs above':'Server-resolved encounter'}</Text></View></View>
  </View>
  {replay?<View style={s.replayPanel}>
   <View style={s.replayHead}><View style={s.grow}><Text style={s.replayKicker}>{complete?'ENCOUNTER RECAP':'NOW PLAYING'}</Text><Text accessibilityLiveRegion="polite" style={s.replayCurrent}>{currentCue?playbackCueLabel(currentCue):replay.reason==='victory'?'Encounter cleared':replay.reason==='wipe'?'Party defeated':'Encounter timed out'}</Text></View><StateChip label={currentCue?.type.toUpperCase()??replay.reason.toUpperCase()} tone={currentCue?playbackCueTone(currentCue):replay.reason==='victory'?'success':replay.reason==='wipe'?'danger':'warning'}/></View>
   {currentCue?.type==='cast'&&currentCue.durationMs!==undefined?<View style={s.castWarning}><Text style={s.castWarningLabel}>CAST WINDOW</Text><Text style={s.castWarningTime}>{seconds(currentCue.durationMs)}</Text></View>:null}
   <View style={s.replayMeta}><Text style={s.replayTime}>{currentCue?seconds(currentCue.atMs):'0.0s'} / {seconds(replay.durationMs)}</Text><Text style={s.replayTime}>{cueIndex+1}/{Math.max(1,cues.length)} cues</Text></View>
   <View style={s.replayTrack}><View style={[s.replayFill,{width:`${Math.round(progress*100)}%` as `${number}%`}]} /></View>
   {recent.length?<View style={s.log}>{recent.map((cue,index)=><View key={`${cue.atMs}-${cue.type}-${index}`} style={s.logRow}><Text style={s.logTime}>{seconds(cue.atMs)}</Text><Text numberOfLines={2} style={s.logCopy}>{playbackCueLabel(cue)}</Text></View>)}</View>:<Text style={s.note}>The authoritative result has no detailed replay cues for this older encounter.</Text>}
   {complete&&!reduceMotion&&cues.length>1?<Pressable accessibilityRole="button" accessibilityLabel="Replay combat recap" onPress={()=>setCueIndex(0)} style={({pressed})=>[s.replayButton,pressed&&s.replayButtonPressed]}><Text style={s.replayButtonText}>↻ Replay encounter</Text></Pressable>:null}
  </View>:<Text style={s.note}>Companions stay attached to their owner and never consume extra party slots. Their existing assist ability flashes here when it actually procs in the server simulation.</Text>}
 </FantasyPanel>;
}

const s=StyleSheet.create({
 header:{flexDirection:'row',alignItems:'flex-start',gap:coopSpacing.sm},grow:{flex:1,minWidth:0},
 kicker:{...coopTypography.meta,color:coopColors.gold,fontWeight:'900',letterSpacing:.8},title:{...coopTypography.section,color:coopColors.text},
 arena:{minHeight:294,flexDirection:'row',alignItems:'stretch',gap:coopSpacing.xs,padding:coopSpacing.sm,borderWidth:1,borderColor:coopColors.goldDim,borderRadius:coopRadii.tile,backgroundColor:'#04111E',overflow:'hidden'},
 partyField:{flex:1.75,flexDirection:'row',flexWrap:'wrap',alignContent:'center',justifyContent:'center',gap:coopSpacing.xs},
 formationSlot:{width:'46%'},slotFront:{transform:[{translateX:6}]},slotRear:{transform:[{translateX:-5}]},
 member:{minHeight:126,padding:coopSpacing.xs,borderWidth:1,borderColor:'#274052',borderRadius:coopRadii.tile,backgroundColor:'rgba(7,24,39,.94)',gap:2},
 memberTank:{borderColor:coopColors.gold},memberActive:{borderColor:coopColors.cyan,shadowColor:coopColors.cyan,shadowOpacity:.5,shadowRadius:5,elevation:2},memberDown:{opacity:.48},
 avatarFrame:{height:44,borderRadius:8,borderWidth:1,alignItems:'center',justifyContent:'center',paddingHorizontal:3,backgroundColor:coopColors.surfaceRaised},
 avatarTank:{borderColor:coopColors.gold},avatarDamage:{borderColor:coopColors.danger},avatarSupport:{borderColor:coopColors.success},avatarActive:{backgroundColor:'#0A3047'},
 avatarInitial:{fontSize:21,lineHeight:23,color:coopColors.text,fontWeight:'900'},avatarWeapon:{fontSize:7,lineHeight:9,color:coopColors.textMuted,textTransform:'uppercase',fontWeight:'800'},
 memberName:{fontSize:11,lineHeight:13,color:coopColors.text,fontWeight:'900'},className:{fontSize:9,lineHeight:11,color:coopColors.cyan,fontWeight:'800'},
 hpTrack:{height:4,borderRadius:99,overflow:'hidden',backgroundColor:'#20313D'},hpFill:{height:'100%',backgroundColor:coopColors.success},hpText:{fontSize:8,lineHeight:10,color:coopColors.textMuted},
 assistRow:{minHeight:30,flexDirection:'row',alignItems:'center',gap:4,paddingTop:2,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:'#284255'},
 assistRowActive:{marginHorizontal:-3,paddingHorizontal:3,borderRadius:5,borderTopColor:coopColors.violet,backgroundColor:'rgba(117,76,164,.24)'},
 companionArt:{width:26,height:26,borderRadius:6},companionArtActive:{transform:[{scale:1.08}]},companionFallback:{width:26,height:26,borderRadius:6,borderWidth:1,borderColor:coopColors.violet,alignItems:'center',justifyContent:'center'},companionFallbackActive:{borderColor:coopColors.cyan},
 assistCopy:{flex:1,minWidth:0},assistLabel:{fontSize:7,lineHeight:9,color:coopColors.violet,fontWeight:'900',letterSpacing:.35},assistName:{fontSize:8,lineHeight:10,color:coopColors.textSecondary,fontWeight:'800'},assistNameActive:{color:coopColors.text},
 divider:{width:22,alignItems:'center',justifyContent:'center'},vs:{fontSize:9,lineHeight:11,color:coopColors.gold,fontWeight:'900'},
 enemyField:{flex:1,alignItems:'center',justifyContent:'center'},enemyCore:{width:'100%',minHeight:136,alignItems:'center',justifyContent:'center',gap:5,padding:coopSpacing.xs,borderWidth:1,borderColor:coopColors.danger,borderRadius:coopRadii.tile,backgroundColor:'rgba(75,19,31,.35)'},enemyBoss:{minHeight:178,borderColor:coopColors.violet,backgroundColor:'rgba(55,21,76,.42)'},enemyActive:{borderWidth:2,shadowColor:coopColors.danger,shadowOpacity:.55,shadowRadius:6,elevation:2},
 enemyMark:{fontSize:34,lineHeight:38,color:coopColors.danger},enemyName:{...coopTypography.meta,color:coopColors.text,fontWeight:'900',textAlign:'center'},enemyHint:{fontSize:8,lineHeight:11,color:coopColors.textMuted,textAlign:'center'},
 replayPanel:{padding:coopSpacing.sm,borderWidth:1,borderColor:'#284255',borderRadius:coopRadii.tile,backgroundColor:'rgba(4,17,30,.82)',gap:coopSpacing.xs},
 replayHead:{flexDirection:'row',alignItems:'flex-start',gap:coopSpacing.sm},replayKicker:{fontSize:8,lineHeight:10,color:coopColors.cyan,fontWeight:'900',letterSpacing:.65},replayCurrent:{...coopTypography.body,color:coopColors.text,fontWeight:'900'},
 castWarning:{minHeight:34,paddingHorizontal:coopSpacing.sm,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderWidth:1,borderColor:coopColors.danger,borderRadius:coopRadii.tile,backgroundColor:'rgba(113,28,46,.28)'},castWarningLabel:{...coopTypography.meta,color:coopColors.danger,fontWeight:'900'},castWarningTime:{...coopTypography.meta,color:coopColors.gold,fontWeight:'900'},
 replayMeta:{flexDirection:'row',justifyContent:'space-between',gap:coopSpacing.sm},replayTime:{fontSize:9,lineHeight:11,color:coopColors.textMuted,fontWeight:'800'},replayTrack:{height:5,borderRadius:99,overflow:'hidden',backgroundColor:'#20313D'},replayFill:{height:'100%',backgroundColor:coopColors.cyan},
 log:{gap:2},logRow:{minHeight:25,flexDirection:'row',alignItems:'center',gap:coopSpacing.xs,paddingVertical:2,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#20313D'},logTime:{width:38,fontSize:8,lineHeight:10,color:coopColors.gold,fontWeight:'900'},logCopy:{flex:1,fontSize:9,lineHeight:12,color:coopColors.textSecondary,fontWeight:'700'},
 replayButton:{minHeight:36,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:coopColors.goldDim,borderRadius:coopRadii.button,backgroundColor:coopColors.surfaceRaised},replayButtonPressed:{opacity:.66},replayButtonText:{...coopTypography.meta,color:coopColors.gold,fontWeight:'900'},
 note:{...coopTypography.meta,color:coopColors.textMuted,fontSize:11,lineHeight:15},
});
