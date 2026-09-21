import {useMemo} from 'react';
import {Animated,Image,StyleSheet,Text,View} from 'react-native';
import type {CoopCombatReplayCueView,CoopRunView} from '../../core/coop-presentation';
import {dungeonCombatAvatar} from '../../core/dungeon-combat-avatars';
import {combatCompanionDef} from '../../content/combat-companions';
import {companionArtSource} from '../../theme/companion-art';
import {dungeonCombatPortraitSource} from '../../theme/dungeon-combat-art';
import {dungeonEnemyPortraitSource} from '../../theme/dungeon-enemy-art';
import {equipmentTheme,radii,type ThemeColors} from '../../theme/theme';
import {useGameTheme} from '../../theme/ThemeContext';
import {IdentityArtwork} from '../SocialIdentity';

type Slot=CoopRunView['roleSlots'][number];

function hpPercent(slot:Slot){
 const current=slot.currentHp,maximum=slot.maximumHp;
 if(current===undefined||maximum===undefined||!Number.isFinite(current)||!Number.isFinite(maximum)||maximum<=0)return 1;
 return Math.max(0,Math.min(1,current/maximum));
}
function roleLabel(role:Slot['role']){return role==='tank'?'TANK':role==='support'?'SUPPORT':'DAMAGE';}
function floatingValue(cue:CoopCombatReplayCueView|undefined,targetId:string|undefined){
 if(!cue||cue.type!=='action'||cue.amount===undefined||!targetId||cue.targetId!==targetId)return undefined;
 const amount=Math.max(0,Math.round(cue.amount));
 if(cue.actionKind==='heal')return {label:`+${amount}`,kind:'heal' as const};
 if(cue.actionKind==='shield')return {label:`+${amount}`,kind:'shield' as const};
 return {label:`-${amount}`,kind:'damage' as const};
}

export function CombatantProfileCard({slot,active=false,targeted=false,assistProc=false,motionStyle,currentCue,compact=false}:{slot:Slot;active?:boolean;targeted?:boolean;assistProc?:boolean;motionStyle?:any;currentCue?:CoopCombatReplayCueView;compact?:boolean}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),equipment=equipmentTheme(C),avatar=dungeonCombatAvatar(slot.classId);
 const portrait=dungeonCombatPortraitSource(slot.classId,slot.bodyPresentation??'male'),pct=hpPercent(slot),companion=slot.companionId?combatCompanionDef(slot.companionId):undefined,companionArt=slot.companionId?companionArtSource(slot.companionId):undefined;
 const accent=slot.role==='tank'?equipment.goldSoft:slot.role==='support'?C.good:C.bad,float=floatingValue(currentCue,slot.memberId);
 return <Animated.View accessibilityLabel={`${slot.name}, ${avatar?.label??slot.classId??slot.role}, ${roleLabel(slot.role)}, ${Math.round(pct*100)} percent health`} style={[s.card,compact&&s.cardCompact,{borderColor:accent},targeted&&s.targeted,active&&s.active,slot.ready===false&&s.down,motionStyle]}>
  <View style={[s.scene,compact&&s.sceneCompact]}>
   <View style={[StyleSheet.absoluteFill,s.sceneBg]}/>
   <View style={s.shade}/>
   {portrait?<Image source={portrait} resizeMode="contain" fadeDuration={0} style={[s.portrait,compact&&s.portraitCompact]}/>:<View style={s.fallback}><IdentityArtwork name={slot.name} className={slot.classId} size={48}/></View>}
   <View style={[s.rolePill,{borderColor:accent}]}><Text style={[s.roleText,{color:accent}]}>{roleLabel(slot.role)}</Text></View>
   {slot.echo?<View style={s.echoPill}><Text style={s.echoText}>ECHO</Text></View>:null}
   {slot.ready===false?<View style={s.downPill}><Text style={s.downText}>DOWN</Text></View>:null}
   {float?<View style={[s.floatPill,float.kind==='damage'?s.floatDamage:float.kind==='heal'?s.floatHeal:s.floatShield]}><Text style={[s.floatText,float.kind==='damage'?s.floatDamageText:float.kind==='heal'?s.floatHealText:s.floatShieldText]}>{float.label}</Text></View>:null}
   <View style={s.identityPlate}><Text numberOfLines={1} style={s.name}>{slot.name}</Text><Text numberOfLines={1} style={s.className}>{avatar?.label??slot.classId??slot.role}</Text></View>
  </View>
  <View style={[s.combatInfo,compact&&s.combatInfoCompact]}>
   <View style={s.hpHead}><Text style={s.hpLabel}>HP</Text><Text style={s.hpValue}>{slot.currentHp!==undefined&&slot.maximumHp!==undefined?`${Math.max(0,Math.round(slot.currentHp))}/${Math.max(1,Math.round(slot.maximumHp))}`:`${Math.round(pct*100)}%`}</Text></View>
   <View style={s.hpTrack}><View style={[s.hpFill,{width:`${Math.round(pct*100)}%` as `${number}%`,backgroundColor:pct<=.25?C.bad:pct<=.55?C.warning:C.good}]}/></View>
   {companion?<View style={[s.assistRow,assistProc&&s.assistActive]}>{companionArt?<Image source={companionArt} resizeMode="contain" style={s.assistArt}/>:<View style={s.assistFallback}><Text style={s.assistFallbackText}>◇</Text></View>}<View style={s.assistCopy}><Text style={[s.assistKicker,assistProc&&s.assistKickerActive]}>{assistProc?'ASSIST PROC':'COMPANION'}</Text><Text numberOfLines={1} style={s.assistName}>{companion.name}</Text></View></View>:<Text style={[s.noAssist,compact&&s.noAssistCompact]}>No companion assist</Text>}
  </View>
 </Animated.View>;
}

export function EnemyCombatProfileCard({name,boss=false,active=false,targeted=false,motionStyle,currentCue}:{name:string;boss?:boolean;active?:boolean;targeted?:boolean;motionStyle?:any;currentCue?:CoopCombatReplayCueView}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),portrait=dungeonEnemyPortraitSource(name),float=currentCue?.type==='action'&&currentCue.targetName===name&&currentCue.amount!==undefined?{label:`${currentCue.actionKind==='heal'?'+':'-'}${Math.round(currentCue.amount)}`,heal:currentCue.actionKind==='heal'}:undefined;
 return <Animated.View accessibilityLabel={`${boss?'Boss':'Dungeon enemy'} ${name}`} style={[s.enemyCard,boss&&s.enemyBoss,targeted&&s.targeted,active&&s.enemyActive,motionStyle]}>
  <View style={[s.enemyScene,boss&&s.enemyBossScene]}><View style={[StyleSheet.absoluteFill,s.enemyWash]}/>{portrait?<Image source={portrait} resizeMode="contain" fadeDuration={0} style={[s.enemyPortrait,boss&&s.enemyBossPortrait]}/>:<Text style={[s.enemyMark,boss&&s.enemyBossMark]}>{boss?'♛':'◆'}</Text>}{float?<View style={[s.floatPill,float.heal?s.floatHeal:s.floatDamage]}><Text style={[s.floatText,float.heal?s.floatHealText:s.floatDamageText]}>{float.label}</Text></View>:null}<View style={s.enemyPlate}><Text style={s.enemyKicker}>{boss?'FINAL BOSS':'ENCOUNTER'}</Text><Text numberOfLines={2} style={s.enemyName}>{name}</Text></View></View>
  <View style={s.enemyInfo}><Text style={s.enemyHint}>{active?'ACTING':targeted?'TARGETED':boss?'Boss profile':'Enemy profile'}</Text></View>
 </Animated.View>;
}

function makeStyles(C:ThemeColors){const equipment=equipmentTheme(C);return StyleSheet.create({
 card:{minHeight:150,borderWidth:1,borderRadius:radii.md,overflow:'hidden',backgroundColor:C.panel,shadowColor:'#000',shadowOpacity:.18,shadowRadius:3,elevation:1},
 cardCompact:{minHeight:118},active:{borderWidth:2,borderColor:C.info,shadowColor:C.info,shadowOpacity:.32,shadowRadius:6,elevation:3},targeted:{borderWidth:2,borderColor:C.bad},down:{opacity:.48},
 scene:{height:84,position:'relative',alignItems:'center',justifyContent:'flex-end',overflow:'hidden',backgroundColor:C.stage},
 sceneCompact:{height:70},sceneBg:{backgroundColor:C.dark?'#0B1B2B':'#E6E0D3'},shade:{...StyleSheet.absoluteFillObject,backgroundColor:C.dark?'rgba(4,11,18,.16)':'rgba(255,255,255,.06)'},
 portrait:{position:'absolute',bottom:0,width:76,height:82},portraitCompact:{width:62,height:68},fallback:{position:'absolute',top:20,left:0,right:0,alignItems:'center'},
 identityPlate:{position:'absolute',left:4,right:4,bottom:4,paddingHorizontal:5,paddingVertical:3,borderWidth:1,borderColor:C.lineStrong,borderRadius:radii.sm,backgroundColor:C.dark?'rgba(8,15,24,.86)':'rgba(255,255,255,.9)'},
 name:{fontSize:10,lineHeight:12,color:C.text,fontWeight:'900'},className:{fontSize:7.5,lineHeight:10,color:equipment.goldSoft,fontWeight:'800'},
 rolePill:{position:'absolute',left:4,top:4,paddingHorizontal:4,paddingVertical:2,borderWidth:1,borderRadius:99,backgroundColor:C.dark?'rgba(8,15,24,.8)':'rgba(255,255,255,.88)'},roleText:{fontSize:6,lineHeight:8,fontWeight:'900',letterSpacing:.45},
 echoPill:{position:'absolute',right:4,top:4,paddingHorizontal:4,paddingVertical:2,borderWidth:1,borderColor:C.special,borderRadius:99,backgroundColor:C.specialSurface},echoText:{fontSize:6,lineHeight:8,color:C.special,fontWeight:'900',letterSpacing:.45},
 downPill:{position:'absolute',right:4,top:22,paddingHorizontal:4,paddingVertical:2,borderWidth:1,borderColor:C.bad,borderRadius:99,backgroundColor:C.badSurface},downText:{fontSize:6,lineHeight:8,color:C.bad,fontWeight:'900',letterSpacing:.45},
 floatPill:{position:'absolute',right:5,top:38,minWidth:34,paddingHorizontal:5,paddingVertical:3,borderWidth:1,borderRadius:99,alignItems:'center'},floatText:{fontSize:10,lineHeight:12,fontWeight:'900'},floatDamage:{borderColor:C.bad,backgroundColor:C.badSurface},floatDamageText:{color:C.bad},floatHeal:{borderColor:C.good,backgroundColor:C.goodSurface},floatHealText:{color:C.good},floatShield:{borderColor:C.info,backgroundColor:C.infoSurface},floatShieldText:{color:C.info},
 combatInfo:{padding:5,gap:3,backgroundColor:C.panelRaised},combatInfoCompact:{padding:4,gap:2},hpHead:{flexDirection:'row',justifyContent:'space-between',gap:4},hpLabel:{fontSize:6.5,lineHeight:8,color:C.muted,fontWeight:'900',letterSpacing:.45},hpValue:{fontSize:6.5,lineHeight:8,color:C.text,fontWeight:'900'},hpTrack:{height:5,borderRadius:99,overflow:'hidden',backgroundColor:C.panel2},hpFill:{height:'100%',borderRadius:99},
 assistRow:{minHeight:27,flexDirection:'row',alignItems:'center',gap:4,paddingTop:2,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:C.line},assistActive:{marginHorizontal:-2,paddingHorizontal:2,borderRadius:radii.sm,backgroundColor:C.specialSurface},assistArt:{width:23,height:23},assistFallback:{width:23,height:23,borderWidth:1,borderColor:C.special,borderRadius:6,alignItems:'center',justifyContent:'center'},assistFallbackText:{color:C.special},assistCopy:{flex:1,minWidth:0},assistKicker:{fontSize:5.5,lineHeight:7,color:C.special,fontWeight:'900',letterSpacing:.35},assistKickerActive:{color:C.info},assistName:{fontSize:7,lineHeight:9,color:C.muted,fontWeight:'800'},noAssist:{fontSize:6,lineHeight:8,color:C.disabled,textAlign:'center',paddingTop:3},noAssistCompact:{display:'none'},
 enemyCard:{width:'100%',borderWidth:1,borderColor:C.bad,borderRadius:radii.md,overflow:'hidden',backgroundColor:C.panel},enemyBoss:{borderColor:C.special,borderWidth:2},enemyActive:{shadowColor:C.bad,shadowOpacity:.34,shadowRadius:7,elevation:3},enemyScene:{height:132,position:'relative',alignItems:'center',justifyContent:'center',overflow:'hidden',backgroundColor:C.stage},enemyBossScene:{height:190},enemyWash:{backgroundColor:C.dark?'rgba(75,19,31,.42)':'rgba(180,70,80,.15)'},enemyPortrait:{position:'absolute',top:4,bottom:20,left:4,right:4},enemyBossPortrait:{top:0,bottom:14},enemyMark:{fontSize:45,lineHeight:49,color:C.bad,fontWeight:'900'},enemyBossMark:{color:C.special},enemyPlate:{position:'absolute',left:6,right:6,bottom:6,padding:6,borderWidth:1,borderColor:C.lineStrong,borderRadius:radii.sm,backgroundColor:C.dark?'rgba(8,15,24,.88)':'rgba(255,255,255,.9)'},enemyKicker:{fontSize:6,color:equipment.goldSoft,fontWeight:'900',letterSpacing:.55},enemyName:{fontSize:10,lineHeight:13,color:C.text,fontWeight:'900'},enemyInfo:{minHeight:28,alignItems:'center',justifyContent:'center',backgroundColor:C.panelRaised},enemyHint:{fontSize:6.5,lineHeight:9,color:C.muted,fontWeight:'900',letterSpacing:.5},
 });}
