import {memo,useEffect,useRef,useState} from 'react';
import {useMusicOverride} from '../storage/audio';
import {AccessibilityInfo,ActivityIndicator,Animated,AppState,Easing,Image,ImageBackground,StyleSheet,Text,View,type ImageSourcePropType} from 'react-native';
import type {GuildPveEncounter} from '../core/guild-pve-encounters';
import {guildPvePresentation,guildPveView} from '../core/guild-pve-encounters';
import type {GameState} from '../core/types';
import type {Language} from '../i18n/languages';
import {useSocialText} from '../i18n/social';
import {classIconArtwork} from '../theme/character-assets';
import {companionArtSource} from '../theme/companion-art';
import {combatCompanionDef} from '../content/combat-companions';
import {dungeonCombatClassFx,type DungeonCombatActorMotion,type DungeonCombatFxAccent} from '../core/dungeon-combat-fx';
import {formatGameNumber} from '../core/number-format';
import {useGameTheme} from '../theme/ThemeContext';
import {CombatTheaterModal} from './CombatTheaterModal';
import {CombatAttackSprite} from './CombatAttackSprite';
import {CombatImpactBurst} from './CombatImpactBurst';
import {UiIcon} from './UiIcon';

// The cosmetic effect layer only repaints when its animation cue changes, not on each countdown tick.
const RaidStrikeEffects=memo(function RaidStrikeEffects({encounterId,pulse,companionTurn,motion,accent}:{encounterId:string;pulse:number;companionTurn:boolean;motion:DungeonCombatActorMotion;accent:DungeonCombatFxAccent}){
 return <View pointerEvents="none" style={s.effects}><CombatAttackSprite eventId={`${encounterId}:${pulse}:attack`} motion={companionTurn?'projectile':motion} accent={companionTurn?'violet':accent} actionKind="damage" reduceMotion={false}/><CombatImpactBurst eventId={`${encounterId}:${pulse}:impact`} kind="damage" size={companionTurn?48:68} reduceMotion={false}/></View>;
});

export function GuildRaidTheater({row,state,language,numberMode,stageArt,bossArt,onClose,onRefresh}:{
 row:GuildPveEncounter;state?:GameState;language:Language;numberMode:'abbreviated'|'exact';
 stageArt:ImageSourcePropType;bossArt:ImageSourcePropType;onClose:()=>void;onRefresh?:()=>unknown;
}){
 const st=useSocialText(),C=useGameTheme();
 useMusicOverride('boss');
 const [now,setNow]=useState(Date.now()),[pulse,setPulse]=useState(0),[foreground,setForeground]=useState(AppState.currentState==='active'),[systemReduceMotion,setSystemReduceMotion]=useState(false);
 useEffect(()=>{const sub=AppState.addEventListener('change',status=>{setForeground(status==='active');if(status==='active')setNow(Date.now())});return()=>sub.remove()},[]);
 useEffect(()=>{let mounted=true;void AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(mounted)setSystemReduceMotion(value)}).catch(()=>{});const sub=AccessibilityInfo.addEventListener('reduceMotionChanged',setSystemReduceMotion);return()=>{mounted=false;sub.remove()}},[]);
 const currentRefresh=useRef(onRefresh);currentRefresh.current=onRefresh;
 const pending=(row.pendingAttempts??0)>0;
 useEffect(()=>{
  if(!pending||!foreground)return;
  const interval=setInterval(()=>setNow(Date.now()),1000);
  return()=>clearInterval(interval);
 },[pending,foreground]);
 const remaining=row.nextAttemptResolvesAt?Math.max(0,Math.ceil((Date.parse(row.nextAttemptResolvesAt)-now)/1000)):0;
 const overdue=pending&&remaining===0;
 useEffect(()=>{
  if(!overdue||!foreground)return;
  const refresh=()=>{if(currentRefresh.current)void currentRefresh.current();};
  refresh();
  const timer=setInterval(refresh,12000);
  return()=>clearInterval(timer);
 },[overdue,row.id,foreground]);
 const reduceMotion=Boolean(state?.settings.reduceMotion)||systemReduceMotion;
 const animating=pending&&!overdue&&foreground&&!reduceMotion;
 const recoil=useRef(new Animated.Value(0)).current;
 useEffect(()=>{
  recoil.stopAnimation();recoil.setValue(0);
  if(!animating)return;
  Animated.sequence([
   Animated.timing(recoil,{toValue:1,duration:85,easing:Easing.out(Easing.quad),useNativeDriver:true}),
   Animated.timing(recoil,{toValue:0,duration:230,easing:Easing.out(Easing.cubic),useNativeDriver:true}),
  ]).start();
  return()=>recoil.stopAnimation();
 },[pulse,animating,recoil]);
 useEffect(()=>{
  if(!animating)return;
  const timer=setInterval(()=>setPulse(value=>value+1),2800);
  return()=>clearInterval(timer);
 },[animating]);
 const view=guildPveView(row,now),present=guildPvePresentation(row),accent=row.kind==='event'?C.special:C.accent;
 const n=(value:number)=>formatGameNumber(value,numberMode,language);
 const fx=dungeonCombatClassFx(state?.character?.classId);
 const companionId=state?.character?.equippedCombatCompanionId,companion=companionId?combatCompanionDef(companionId):undefined;
 const companionArt=companionId?companionArtSource(companionId):undefined;
 const companionTurn=Boolean(companionArt)&&pulse%3===2;
 const outcomeUnit=st(row.kind==='weekly'?'Contribution':'Damage');
 const countDown=`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`;
 return <CombatTheaterModal visible onClose={onClose} eyebrow={st(row.kind==='event'?'EVENT BOSS':'WEEKLY BOSS')} title={present.bossName} subtitle={st('3-minute attempt')} compactHeader tone={row.kind==='event'?'event':'guild'} reduceMotion={reduceMotion}>
  <View style={s.content}>
   <ImageBackground source={stageArt} resizeMode="cover" style={s.arena} imageStyle={s.arenaArt}>
    <View style={s.shade}/>
    <Animated.Image source={bossArt} resizeMode="contain" style={[s.bossArt,{transform:[{translateX:recoil.interpolate({inputRange:[0,1],outputRange:[0,4]})},{scale:recoil.interpolate({inputRange:[0,1],outputRange:[1,.98]})}]}]} accessible={false}/>
    {animating?<RaidStrikeEffects encounterId={row.id} pulse={pulse} companionTurn={companionTurn} motion={fx?.damageMotion??'lunge'} accent={fx?.damageAccent??'gold'}/>:null}

   </ImageBackground>
   <View accessibilityRole="progressbar" accessibilityLabel={st('Boss health')} accessibilityValue={{min:0,max:100,now:Math.round(100-view.percent),text:`${n(view.remaining)} / ${n(row.maxHp)} HP`}} style={[s.hpTrack,{backgroundColor:C.panel2}]}>
    <View style={{height:'100%',width:`${Math.max(0,Math.min(100,100-view.percent))}%` as `${number}%`,backgroundColor:accent}}/>
   </View>
   <Text style={[s.hpTotal,{color:C.text}]}>{n(view.remaining)} / {n(row.maxHp)} HP</Text>
   <View style={s.formation}>
    <View style={[s.portrait,{backgroundColor:C.panel2,borderColor:C.line}]}>{state?.character?<Image source={classIconArtwork[state.character.classId]} style={s.portraitArt} accessible={false}/>:<UiIcon name="character" size={30}/>}</View>
    <View style={[s.portrait,{backgroundColor:C.panel2,borderColor:C.line}]}>{companionArt?<Image source={companionArt} resizeMode="contain" style={s.portraitArt} accessible={false}/>:<UiIcon name="companions" size={30} muted/>}</View>
    <View style={s.flex}><Text style={[s.name,{color:C.text}]} numberOfLines={1}>{state?.character?.name??st('Your character')}</Text><Text style={[s.meta,{color:C.muted}]} numberOfLines={1}>{companion?.name??st('No companion equipped')}</Text></View>
   </View>
   {pending?<View style={[s.status,{backgroundColor:C.panel2}]}><ActivityIndicator color={accent} size="small"/><Text style={[s.statusText,{color:C.text}]}>{remaining>0?st('Raid in progress · {time}',{time:countDown}):st('Resolving attempt…')}</Text></View>:
    row.lastAttemptDamage!=null?<View style={s.result}><Text style={[s.meta,{color:C.muted,textAlign:'center'}]}>{st('Last attempt')}</Text>
     <Text style={[s.resultTotal,{color:accent}]}>{n(row.lastAttemptDamage)} {outcomeUnit}</Text>
     <View style={[s.resultRow,{borderColor:C.line}]}><Text style={[s.meta,{color:C.muted}]}>{st('Your contribution')}</Text><Text style={[s.name,{color:C.text}]}>{n(row.personalDamage)}</Text></View>
     <View style={[s.resultRow,{borderColor:C.line}]}><Text style={[s.meta,{color:C.muted}]}>{st('Attempts remaining')}</Text><Text style={[s.name,{color:C.text}]}>{view.attemptsRemaining} / {view.attemptCap}</Text></View>
     <View style={[s.resultRow,{borderColor:C.line}]}><Text style={[s.meta,{color:C.muted}]}>{st('Character damage')}</Text><Text style={[s.name,{color:C.text}]}>{n(row.lastAttemptCharacterDamage??Math.max(0,row.lastAttemptDamage-(row.lastAttemptCompanionDamage??0)))}</Text></View>
     <View style={[s.resultRow,{borderColor:C.line}]}><View style={s.flex}><Text style={[s.meta,{color:C.muted}]}>{st('Companion damage')}</Text><Text numberOfLines={1} style={[s.meta,{color:C.text}]}>{row.lastAttemptCompanionId?combatCompanionDef(row.lastAttemptCompanionId)?.name??row.lastAttemptCompanionId:st('No companion equipped')}</Text></View><Text style={[s.name,{color:C.text}]}>{n(row.lastAttemptCompanionDamage??0)}</Text></View>
     {view.milestones.some(m=>m.ready)?<View style={[s.rewardNotice,{backgroundColor:C.panel2,borderColor:C.good}]}><Text style={[s.name,{color:C.good}]}>{st('Reward unlocked')}</Text><Text style={[s.meta,{color:C.text}]}>{view.milestones.filter(m=>m.ready).map(m=>`${m.percent}%`).join(' · ')}</Text></View>:null}
    </View>:null}
  </View>
 </CombatTheaterModal>;
}
const s=StyleSheet.create({
 content:{gap:12,paddingBottom:16},
 arena:{height:250,alignItems:'center',justifyContent:'center',borderRadius:14,overflow:'hidden'},
 arenaArt:{opacity:.75},
 shade:{...StyleSheet.absoluteFill,backgroundColor:'rgba(5,8,13,.38)'},
 bossArt:{width:218,height:218},
 effects:{...StyleSheet.absoluteFill,alignItems:'center',justifyContent:'center'},
 formation:{flexDirection:'row',alignItems:'center',gap:9},
 portrait:{width:46,height:46,borderRadius:12,borderWidth:1,alignItems:'center',justifyContent:'center'},
 portraitArt:{width:40,height:40},
 flex:{flex:1,minWidth:0},name:{fontSize:14,fontWeight:'800'},meta:{fontSize:12,lineHeight:17},
 hpTrack:{height:12,borderRadius:7,overflow:'hidden'},
 hpTotal:{fontSize:13,fontWeight:'800',textAlign:'center'},
 status:{minHeight:48,padding:12,borderRadius:11,flexDirection:'row',alignItems:'center',gap:10},
 statusText:{flex:1,fontSize:13,fontWeight:'700'},
 result:{gap:8},resultTotal:{fontSize:27,fontWeight:'900',textAlign:'center'},
 resultRow:{borderTopWidth:1,paddingTop:9,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},
 rewardNotice:{borderWidth:1,borderRadius:10,padding:10,gap:3},note:{fontSize:11,lineHeight:16,textAlign:'center'},
});
