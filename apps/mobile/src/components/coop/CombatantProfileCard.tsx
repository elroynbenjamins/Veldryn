import {useEffect,useMemo,useRef} from 'react';
import {Animated,Image,StyleSheet,Text,View} from 'react-native';
import type {CoopBossPhaseView,CoopCombatReplayCueView,CoopRunView} from '../../core/coop-presentation';
import type {PlaybackCombatStatus} from '../../core/dungeon-combat-playback';
import {dungeonCombatAvatar} from '../../core/dungeon-combat-avatars';
import {combatCompanionDef} from '../../content/combat-companions';
import {companionArtSource} from '../../theme/companion-art';
import {dungeonCombatPortraitSource} from '../../theme/dungeon-combat-art';
import {dungeonEnemyPortraitSource} from '../../theme/dungeon-enemy-art';
import {equipmentTheme,radii,type ThemeColors} from '../../theme/theme';
import {useGameTheme} from '../../theme/ThemeContext';
import {IdentityArtwork} from '../SocialIdentity';

type Slot=CoopRunView['roleSlots'][number];
export interface BossCombatCastState{label:string;durationMs:number;interruptible:boolean;progressStyle?:any;}

function hpPercent(slot:Slot){
 const current=slot.currentHp,maximum=slot.maximumHp;
 if(current===undefined||maximum===undefined||!Number.isFinite(current)||!Number.isFinite(maximum)||maximum<=0)return 1;
 return Math.max(0,Math.min(1,current/maximum));
}
function roleLabel(role:Slot['role']){return role==='tank'?'TANK':role==='support'?'SUPPORT':'DAMAGE';}

const GEM_STATUS_CODES:Readonly<Record<string,string>>=Object.freeze({
 'gem:momentum':'MOM','gem:critical_surge':'SURGE','gem:flow':'FLOW','gem:unyielding':'UNY',
 'gem:predator_boost':'PRED','gem:opening_phase':'OPEN','gem:retaliation_ready':'RETAL',
 'gem:battle_offense_ready':'OFF','gem:battle_support_ready':'SUP','gem:damage_reduction':'GUARD',
 'gem:shared_resolve':'RES','gem:benediction_charge':'BENE','gem:haste_bonus':'HASTE','gem:opportunist_ready':'OPP',
});
function statusCode(status:PlaybackCombatStatus){
 if(status.source==='gem')return GEM_STATUS_CODES[status.tag]??'GEM';
 if(status.kind==='dot')return 'DOT';
 if(status.kind==='hot')return 'HOT';
 if(status.kind==='debuff')return status.tag==='damage_taken'?'VULN':'DEBUFF';
 if(status.tag==='damage_done')return 'DMG↑';
 if(status.tag==='crit')return 'CRIT↑';
 if(status.tag.includes('haste'))return 'HASTE';
 return 'BUFF';
}
function CombatStatusStrip({statuses,gemProc=false,styles}:{statuses?:PlaybackCombatStatus[];gemProc?:boolean;styles:ReturnType<typeof makeStyles>}){
 const combined=(statuses??[]).slice(0,gemProc?2:3),overflow=Math.max(0,(statuses?.length??0)-combined.length);
 if(!combined.length&&!gemProc)return null;
 return <View style={styles.statusStrip} accessibilityLabel={[...combined.map(status=>`${status.label}${status.stacks>1?`, ${status.stacks} stacks`:''}`),gemProc?'Effect Gem proc':undefined,overflow?`${overflow} more effects`:undefined].filter(Boolean).join(', ')}>
  {combined.map((status,index)=>{const harmful=status.kind==='dot'||status.kind==='debuff',gem=status.source==='gem';return <View key={`${status.kind}:${status.tag}:${status.abilityId??status.label}:${index}`} style={[styles.statusPill,harmful?styles.statusHarmful:gem?styles.statusGem:styles.statusHelpful]}><Text style={[styles.statusPillText,harmful?styles.statusHarmfulText:gem?styles.statusGemText:styles.statusHelpfulText]}>{statusCode(status)}{status.stacks>1?`×${status.stacks}`:''}</Text></View>})}
  {gemProc?<View style={[styles.statusPill,styles.statusGem]}><Text style={[styles.statusPillText,styles.statusGemText]}>GEM</Text></View>:null}
  {overflow?<View style={[styles.statusPill,styles.statusOverflow]}><Text style={[styles.statusPillText,styles.statusOverflowText]}>+{overflow}</Text></View>:null}
 </View>;
}

function AnimatedHealthBar({pct,color,trackStyle,fillStyle,animate=true}:{pct:number;color:string;trackStyle:any;fillStyle:any;animate?:boolean}){
 const safe=Math.max(0,Math.min(1,pct)),progress=useRef(new Animated.Value(safe)).current;
 useEffect(()=>{progress.stopAnimation();if(!animate){progress.setValue(safe);return;}Animated.timing(progress,{toValue:safe,duration:240,useNativeDriver:false}).start();return()=>progress.stopAnimation();},[safe,animate]);
 return <View style={trackStyle}><Animated.View style={[fillStyle,{backgroundColor:color,width:progress.interpolate({inputRange:[0,1],outputRange:['0%','100%']})}]}/></View>;
}
function floatingValue(cue:CoopCombatReplayCueView|undefined,targetId:string|undefined){
 if(!cue||cue.type!=='action'||!targetId||cue.targetId!==targetId)return undefined;
 const amount=Math.max(0,Math.round(cue.amount??0));
 if(cue.outcome==='miss')return {label:'MISS',kind:'miss' as const,outcome:'DODGE'};
 if(cue.actionKind==='heal')return {label:`+${amount}`,kind:'heal' as const,outcome:cue.gemProc?'GEM PROC':undefined};
 if(cue.actionKind==='shield')return {label:`+${amount}`,kind:'shield' as const,outcome:cue.gemProc?'GEM PROC':undefined};
 return {label:`-${amount}`,kind:'damage' as const,outcome:cue.outcome==='critical'?'CRIT':cue.absorbed&&cue.absorbed>0?`BARRIER -${Math.round(cue.absorbed)}`:cue.gemProc?'GEM PROC':undefined};
}

export function CombatantProfileCard({slot,active=false,targeted=false,assistProc=false,motionStyle,feedbackStyle,currentCue,combatShield=0,statuses,gemProcActive=false,animateHealth=true}:{slot:Slot;active?:boolean;targeted?:boolean;assistProc?:boolean;motionStyle?:any;feedbackStyle?:any;currentCue?:CoopCombatReplayCueView;combatShield?:number;statuses?:PlaybackCombatStatus[];gemProcActive?:boolean;animateHealth?:boolean}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),equipment=equipmentTheme(C),avatar=dungeonCombatAvatar(slot.classId);
 const portrait=dungeonCombatPortraitSource(slot.classId,slot.bodyPresentation??'male'),pct=hpPercent(slot),shieldPct=slot.maximumHp&&slot.maximumHp>0?Math.max(0,Math.min(1,combatShield/slot.maximumHp)):0,companion=slot.companionId?combatCompanionDef(slot.companionId):undefined,companionArt=slot.companionId?companionArtSource(slot.companionId):undefined;
 const accent=slot.role==='tank'?equipment.goldSoft:slot.role==='support'?C.good:C.bad,float=floatingValue(currentCue,slot.memberId);
 return <Animated.View accessibilityLabel={`${slot.name}, ${avatar?.label??slot.classId??slot.role}, ${roleLabel(slot.role)}, ${Math.round(pct*100)} percent health`} style={[s.card,{borderColor:accent},targeted&&s.targeted,active&&s.active,slot.ready===false&&s.down,motionStyle]}>
  <View style={s.scene}>
   <View style={[StyleSheet.absoluteFill,s.sceneBg]}/>
   <View style={s.shade}/>
   {portrait?<Image source={portrait} resizeMode="contain" fadeDuration={0} style={s.portrait}/>:<View style={s.fallback}><IdentityArtwork name={slot.name} className={slot.classId} size={48}/></View>}
   <View style={[s.rolePill,{borderColor:accent}]}><Text style={[s.roleText,{color:accent}]}>{roleLabel(slot.role)}</Text></View>
   {slot.echo?<View style={s.echoPill}><Text style={s.echoText}>ECHO</Text></View>:null}
   {slot.ready===false?<View style={s.downPill}><Text style={s.downText}>DOWN</Text></View>:null}
   {float?<><Animated.View style={[s.floatPill,float.kind==='damage'?s.floatDamage:float.kind==='heal'?s.floatHeal:float.kind==='shield'?s.floatShield:s.floatMiss,feedbackStyle]}><Text style={[s.floatText,float.kind==='damage'?s.floatDamageText:float.kind==='heal'?s.floatHealText:float.kind==='shield'?s.floatShieldText:s.floatMissText]}>{float.label}</Text></Animated.View>{float.outcome?<Animated.View style={[s.outcomePill,float.outcome==='CRIT'?s.outcomeCrit:float.outcome==='DODGE'?s.outcomeMiss:float.outcome.startsWith('BARRIER')?s.outcomeBarrier:s.outcomeGem,feedbackStyle]}><Text style={s.outcomeText}>{float.outcome}</Text></Animated.View>:null}</>:null}
   <View style={s.identityPlate}><Text numberOfLines={1} style={s.name}>{slot.name}</Text><Text numberOfLines={1} style={s.className}>{avatar?.label??slot.classId??slot.role}</Text></View>
  </View>
  <View style={s.combatInfo}>
   <View style={s.hpHead}><Text style={s.hpLabel}>HP</Text><Text style={s.hpValue}>{slot.currentHp!==undefined&&slot.maximumHp!==undefined?`${Math.max(0,Math.round(slot.currentHp))}/${Math.max(1,Math.round(slot.maximumHp))}`:`${Math.round(pct*100)}%`}</Text></View>
   <AnimatedHealthBar pct={pct} color={pct<=.25?C.bad:pct<=.55?C.warning:C.good} trackStyle={s.hpTrack} fillStyle={s.hpFill} animate={animateHealth}/>
   {pct<=.25&&slot.ready!==false?<View style={s.criticalRow}><Text style={s.criticalLabel}>LOW HP</Text></View>:null}
   {combatShield>0?<View style={s.barrierRow}><Text style={s.barrierLabel}>BARRIER +{Math.round(combatShield)}</Text><AnimatedHealthBar pct={shieldPct} color={C.info} trackStyle={s.barrierTrack} fillStyle={s.barrierFill} animate={animateHealth}/></View>:null}
   <CombatStatusStrip statuses={statuses} gemProc={gemProcActive} styles={s}/>
   {companion?<View style={[s.assistRow,assistProc&&s.assistActive]}>{companionArt?<Image source={companionArt} resizeMode="contain" style={s.assistArt}/>:<View style={s.assistFallback}><Text style={s.assistFallbackText}>◇</Text></View>}<View style={s.assistCopy}><Text style={[s.assistKicker,assistProc&&s.assistKickerActive]}>{assistProc?'ASSIST PROC':'COMPANION'}</Text><Text numberOfLines={1} style={s.assistName}>{companion.name}</Text></View></View>:<Text style={s.noAssist}>No companion assist</Text>}
  </View>
 </Animated.View>;
}

export function EnemyCombatProfileCard({name,boss=false,active=false,targeted=false,motionStyle,feedbackStyle,currentCue,bossPhaseLabel,bossPhases,bossCast,currentHp,maximumHp,combatShield=0,statuses,animateHealth=true}:{name:string;boss?:boolean;active?:boolean;targeted?:boolean;motionStyle?:any;feedbackStyle?:any;currentCue?:CoopCombatReplayCueView;bossPhaseLabel?:string;bossPhases?:CoopBossPhaseView[];bossCast?:BossCombatCastState;currentHp?:number;maximumHp?:number;combatShield?:number;statuses?:PlaybackCombatStatus[];animateHealth?:boolean}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),enemyArt=dungeonEnemyPortraitSource(name),enemyPct=currentHp!==undefined&&maximumHp!==undefined&&maximumHp>0?Math.max(0,Math.min(1,currentHp/maximumHp)):undefined,enemyShieldPct=maximumHp&&maximumHp>0?Math.max(0,Math.min(1,combatShield/maximumHp)):0,float=currentCue?.type==='action'&&currentCue.targetName===name?{label:currentCue.outcome==='miss'?'MISS':`${currentCue.actionKind==='heal'?'+':'-'}${Math.round(currentCue.amount??0)}`,heal:currentCue.actionKind==='heal',miss:currentCue.outcome==='miss',outcome:currentCue.outcome==='critical'?'CRIT':currentCue.outcome==='miss'?'DODGE':currentCue.absorbed&&currentCue.absorbed>0?`BARRIER -${Math.round(currentCue.absorbed)}`:currentCue.gemProc?'GEM PROC':undefined}:undefined;
 return <Animated.View accessibilityLabel={`${boss?'Boss':'Dungeon enemy'} ${name}`} style={[s.enemyCard,boss&&s.enemyBoss,targeted&&s.targeted,active&&s.enemyActive,motionStyle]}>
  <View style={s.enemyScene}><View style={[StyleSheet.absoluteFill,s.enemyWash]}/>{enemyArt?<Image source={enemyArt} resizeMode="contain" fadeDuration={0} style={[s.enemyPortrait,boss&&s.enemyBossPortrait]}/>:<Text style={[s.enemyMark,boss&&s.enemyBossMark]}>{boss?'♛':'◆'}</Text>}{float?<><Animated.View style={[s.floatPill,float.miss?s.floatMiss:float.heal?s.floatHeal:s.floatDamage,feedbackStyle]}><Text style={[s.floatText,float.miss?s.floatMissText:float.heal?s.floatHealText:s.floatDamageText]}>{float.label}</Text></Animated.View>{float.outcome?<Animated.View style={[s.outcomePill,float.outcome==='CRIT'?s.outcomeCrit:float.outcome==='DODGE'?s.outcomeMiss:float.outcome.startsWith('BARRIER')?s.outcomeBarrier:s.outcomeGem,feedbackStyle]}><Text style={s.outcomeText}>{float.outcome}</Text></Animated.View>:null}</>:null}<View style={s.enemyPlate}><Text style={s.enemyKicker}>{boss?'FINAL BOSS':'ENCOUNTER'}</Text><Text numberOfLines={2} style={s.enemyName}>{name}</Text></View></View>
  <View style={[s.enemyInfo,bossCast&&s.enemyInfoCasting]}>
   {enemyPct!==undefined?<><View style={s.enemyHpHead}><Text style={s.enemyHpLabel}>{boss?'BOSS HP':'HP'}</Text><Text style={s.enemyHpValue}>{Math.max(0,Math.round(currentHp??0))}/{Math.max(1,Math.round(maximumHp??1))}</Text></View><View style={s.enemyHpWrap}><AnimatedHealthBar pct={enemyPct} color={enemyPct<=.25?C.bad:enemyPct<=.55?C.warning:C.good} trackStyle={s.enemyHpTrack} fillStyle={s.enemyHpFill} animate={animateHealth}/>{boss?(bossPhases??[]).map(phase=>{const reached=enemyPct<=phase.hpPct/100;return <View key={phase.id} pointerEvents="none" style={[s.phaseThreshold,{left:`${phase.hpPct}%` as `${number}%`},reached&&s.phaseThresholdReached]}><View style={[s.phaseThresholdLine,reached&&s.phaseThresholdLineReached]}/><Text style={[s.phaseThresholdText,reached&&s.phaseThresholdTextReached]}>{phase.hpPct}</Text></View>}):null}</View>{combatShield>0?<View style={s.enemyBarrierRow}><Text style={s.enemyBarrierLabel}>BARRIER +{Math.round(combatShield)}</Text><AnimatedHealthBar pct={enemyShieldPct} color={C.info} trackStyle={s.enemyBarrierTrack} fillStyle={s.enemyBarrierFill} animate={animateHealth}/></View>:null}</>:null}
   <CombatStatusStrip statuses={statuses} styles={s}/>
   {bossPhaseLabel?<View style={s.bossPhaseRow}><Text style={s.bossPhaseKicker}>PHASE</Text><Text numberOfLines={1} style={s.bossPhaseName}>{bossPhaseLabel}</Text></View>:null}
   {bossCast?<View style={[s.castPanel,bossCast.interruptible&&s.castPanelInterruptible]}><View style={s.castHead}><Text style={[s.castKicker,bossCast.interruptible&&s.castKickerInterruptible]}>{bossCast.interruptible?'INTERRUPT NOW':'BOSS CAST'}</Text><Text style={s.castTime}>{(bossCast.durationMs/1000).toFixed(1)}s</Text></View><Text numberOfLines={1} style={s.castName}>{bossCast.label}</Text><View style={s.castTrack}><Animated.View style={[s.castFill,bossCast.interruptible&&s.castFillInterruptible,bossCast.progressStyle]}/></View></View>:<Text style={s.enemyHint}>{active?'ACTING':targeted?'TARGETED':boss?'Boss profile':'Enemy profile'}</Text>}
  </View>
 </Animated.View>;
}

function makeStyles(C:ThemeColors){const equipment=equipmentTheme(C);return StyleSheet.create({
 card:{minHeight:150,borderWidth:1,borderRadius:radii.md,overflow:'hidden',backgroundColor:C.panel,shadowColor:'#000',shadowOpacity:.18,shadowRadius:3,elevation:1},
 active:{borderWidth:2,borderColor:C.info,shadowColor:C.info,shadowOpacity:.32,shadowRadius:6,elevation:3},targeted:{borderWidth:2,borderColor:C.bad},down:{opacity:.48},
 scene:{height:84,position:'relative',alignItems:'center',justifyContent:'flex-end',overflow:'hidden',backgroundColor:C.stage},
 sceneBg:{backgroundColor:C.dark?'#0B1B2B':'#E6E0D3'},shade:{...StyleSheet.absoluteFillObject,backgroundColor:C.dark?'rgba(4,11,18,.16)':'rgba(255,255,255,.06)'},
 portrait:{position:'absolute',bottom:0,width:76,height:82},fallback:{position:'absolute',top:20,left:0,right:0,alignItems:'center'},
 identityPlate:{position:'absolute',left:4,right:4,bottom:4,paddingHorizontal:5,paddingVertical:3,borderWidth:1,borderColor:C.lineStrong,borderRadius:radii.sm,backgroundColor:C.dark?'rgba(8,15,24,.86)':'rgba(255,255,255,.9)'},
 name:{fontSize:10,lineHeight:12,color:C.text,fontWeight:'900'},className:{fontSize:7.5,lineHeight:10,color:equipment.goldSoft,fontWeight:'800'},
 rolePill:{position:'absolute',left:4,top:4,paddingHorizontal:4,paddingVertical:2,borderWidth:1,borderRadius:99,backgroundColor:C.dark?'rgba(8,15,24,.8)':'rgba(255,255,255,.88)'},roleText:{fontSize:6,lineHeight:8,fontWeight:'900',letterSpacing:.45},
 echoPill:{position:'absolute',right:4,top:4,paddingHorizontal:4,paddingVertical:2,borderWidth:1,borderColor:C.special,borderRadius:99,backgroundColor:C.specialSurface},echoText:{fontSize:6,lineHeight:8,color:C.special,fontWeight:'900',letterSpacing:.45},
 downPill:{position:'absolute',right:4,top:22,paddingHorizontal:4,paddingVertical:2,borderWidth:1,borderColor:C.bad,borderRadius:99,backgroundColor:C.badSurface},downText:{fontSize:6,lineHeight:8,color:C.bad,fontWeight:'900',letterSpacing:.45},
 floatPill:{position:'absolute',right:5,top:38,minWidth:34,paddingHorizontal:5,paddingVertical:3,borderWidth:1,borderRadius:99,alignItems:'center'},floatText:{fontSize:10,lineHeight:12,fontWeight:'900'},floatDamage:{borderColor:C.bad,backgroundColor:C.badSurface},floatDamageText:{color:C.bad},floatHeal:{borderColor:C.good,backgroundColor:C.goodSurface},floatHealText:{color:C.good},floatShield:{borderColor:C.info,backgroundColor:C.infoSurface},floatShieldText:{color:C.info},floatMiss:{borderColor:C.muted,backgroundColor:C.panel2},floatMissText:{color:C.muted},outcomePill:{position:'absolute',left:5,top:38,paddingHorizontal:5,paddingVertical:3,borderWidth:1,borderRadius:99},outcomeText:{fontSize:7,lineHeight:9,color:C.text,fontWeight:'900',letterSpacing:.45},outcomeCrit:{borderColor:C.accent,backgroundColor:C.accentSurface},outcomeMiss:{borderColor:C.muted,backgroundColor:C.panel2},outcomeBarrier:{borderColor:C.info,backgroundColor:C.infoSurface},outcomeGem:{borderColor:C.special,backgroundColor:C.specialSurface},
 combatInfo:{padding:5,gap:3,backgroundColor:C.panelRaised},hpHead:{flexDirection:'row',justifyContent:'space-between',gap:4},hpLabel:{fontSize:6.5,lineHeight:8,color:C.muted,fontWeight:'900',letterSpacing:.45},hpValue:{fontSize:6.5,lineHeight:8,color:C.text,fontWeight:'900'},hpTrack:{height:5,borderRadius:99,overflow:'hidden',backgroundColor:C.panel2},hpFill:{height:'100%',borderRadius:99},criticalRow:{alignSelf:'flex-start',paddingHorizontal:4,paddingVertical:1,borderWidth:1,borderColor:C.bad,borderRadius:99,backgroundColor:C.badSurface},criticalLabel:{fontSize:5.5,lineHeight:7,color:C.bad,fontWeight:'900',letterSpacing:.45},barrierRow:{gap:2},barrierLabel:{fontSize:5.5,lineHeight:7,color:C.info,fontWeight:'900',letterSpacing:.35},barrierTrack:{height:3,borderRadius:99,overflow:'hidden',backgroundColor:C.panel2},barrierFill:{height:'100%',borderRadius:99},statusStrip:{minHeight:16,flexDirection:'row',alignItems:'center',gap:2,overflow:'hidden'},statusPill:{minHeight:14,paddingHorizontal:3,paddingVertical:1,borderWidth:1,borderRadius:99,alignItems:'center',justifyContent:'center'},statusPillText:{fontSize:5,lineHeight:7,fontWeight:'900',letterSpacing:.25},statusHarmful:{borderColor:C.bad,backgroundColor:C.badSurface},statusHarmfulText:{color:C.bad},statusHelpful:{borderColor:C.good,backgroundColor:C.goodSurface},statusHelpfulText:{color:C.good},statusGem:{borderColor:C.special,backgroundColor:C.specialSurface},statusGemText:{color:C.special},statusOverflow:{borderColor:C.lineStrong,backgroundColor:C.panel2},statusOverflowText:{color:C.muted},
 assistRow:{minHeight:27,flexDirection:'row',alignItems:'center',gap:4,paddingTop:2,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:C.line},assistActive:{marginHorizontal:-2,paddingHorizontal:2,borderRadius:radii.sm,backgroundColor:C.specialSurface},assistArt:{width:23,height:23},assistFallback:{width:23,height:23,borderWidth:1,borderColor:C.special,borderRadius:6,alignItems:'center',justifyContent:'center'},assistFallbackText:{color:C.special},assistCopy:{flex:1,minWidth:0},assistKicker:{fontSize:5.5,lineHeight:7,color:C.special,fontWeight:'900',letterSpacing:.35},assistKickerActive:{color:C.info},assistName:{fontSize:7,lineHeight:9,color:C.muted,fontWeight:'800'},noAssist:{fontSize:6,lineHeight:8,color:C.disabled,textAlign:'center',paddingTop:3},
 enemyCard:{width:'100%',borderWidth:1,borderColor:C.bad,borderRadius:radii.md,overflow:'hidden',backgroundColor:C.panel},enemyBoss:{borderColor:C.special,borderWidth:2},enemyActive:{shadowColor:C.bad,shadowOpacity:.34,shadowRadius:7,elevation:3},enemyScene:{height:132,position:'relative',alignItems:'center',justifyContent:'center',overflow:'hidden',backgroundColor:C.stage},enemyWash:{backgroundColor:C.dark?'rgba(75,19,31,.42)':'rgba(180,70,80,.15)'},enemyPortrait:{position:'absolute',bottom:3,width:'72%',height:'92%'},enemyBossPortrait:{width:'80%',height:'97%'},enemyMark:{fontSize:45,lineHeight:49,color:C.bad,fontWeight:'900'},enemyBossMark:{color:C.special},enemyPlate:{position:'absolute',left:6,right:6,bottom:6,padding:6,borderWidth:1,borderColor:C.lineStrong,borderRadius:radii.sm,backgroundColor:C.dark?'rgba(8,15,24,.88)':'rgba(255,255,255,.9)'},enemyKicker:{fontSize:6,color:equipment.goldSoft,fontWeight:'900',letterSpacing:.55},enemyName:{fontSize:10,lineHeight:13,color:C.text,fontWeight:'900'},enemyInfo:{minHeight:28,paddingHorizontal:6,paddingVertical:4,alignItems:'stretch',justifyContent:'center',gap:3,backgroundColor:C.panelRaised},enemyInfoCasting:{minHeight:58},enemyHpHead:{flexDirection:'row',justifyContent:'space-between',gap:6},enemyHpLabel:{fontSize:6,lineHeight:8,color:C.bad,fontWeight:'900',letterSpacing:.55},enemyHpValue:{fontSize:6,lineHeight:8,color:C.text,fontWeight:'900'},enemyHpWrap:{position:'relative',paddingTop:5,paddingBottom:8},enemyHpTrack:{height:6,borderRadius:99,overflow:'hidden',backgroundColor:C.panel2},enemyHpFill:{height:'100%',borderRadius:99},phaseThreshold:{position:'absolute',top:0,bottom:0,marginLeft:-5,width:10,alignItems:'center'},phaseThresholdReached:{opacity:1},phaseThresholdLine:{width:1,height:10,backgroundColor:C.muted},phaseThresholdLineReached:{backgroundColor:C.special},phaseThresholdText:{position:'absolute',bottom:0,fontSize:5,lineHeight:6,color:C.muted,fontWeight:'900'},phaseThresholdTextReached:{color:C.special},enemyBarrierRow:{gap:2},enemyBarrierLabel:{fontSize:5.5,lineHeight:7,color:C.info,fontWeight:'900'},enemyBarrierTrack:{height:3,borderRadius:99,overflow:'hidden',backgroundColor:C.panel2},enemyBarrierFill:{height:'100%',borderRadius:99},enemyHint:{fontSize:6.5,lineHeight:9,color:C.muted,fontWeight:'900',letterSpacing:.5,textAlign:'center'},bossPhaseRow:{flexDirection:'row',alignItems:'center',gap:5},bossPhaseKicker:{fontSize:6,lineHeight:8,color:C.special,fontWeight:'900',letterSpacing:.55},bossPhaseName:{flex:1,fontSize:7,lineHeight:9,color:C.text,fontWeight:'900'},castPanel:{gap:2,padding:4,borderWidth:1,borderColor:C.warning,borderRadius:radii.sm,backgroundColor:C.warningSurface},castPanelInterruptible:{borderColor:C.info,backgroundColor:C.infoSurface},castHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:6},castKicker:{fontSize:6,lineHeight:8,color:C.warning,fontWeight:'900',letterSpacing:.6},castKickerInterruptible:{color:C.info},castTime:{fontSize:6,lineHeight:8,color:C.text,fontWeight:'900'},castName:{fontSize:8,lineHeight:10,color:C.text,fontWeight:'900'},castTrack:{height:4,borderRadius:99,overflow:'hidden',backgroundColor:C.panel2},castFill:{height:'100%',backgroundColor:C.warning},castFillInterruptible:{backgroundColor:C.info},
 });}
