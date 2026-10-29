import {useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Image,ImageBackground,StyleSheet,Text,View,type ImageSourcePropType} from 'react-native';
import type {GuildPveEncounter} from '../core/guild-pve-encounters';
import {guildPvePresentation,guildPveView} from '../core/guild-pve-encounters';
import type {GameState} from '../core/types';
import type {Language} from '../i18n/languages';
import {useSocialText} from '../i18n/social';
import {classIconArtwork} from '../theme/character-assets';
import {companionArtSource} from '../theme/companion-art';
import {combatCompanionDef} from '../content/combat-companions';
import {dungeonCombatClassFx} from '../core/dungeon-combat-fx';
import {formatGameNumber} from '../core/number-format';
import {useGameTheme} from '../theme/ThemeContext';
import {CombatTheaterModal} from './CombatTheaterModal';
import {CombatAttackSprite} from './CombatAttackSprite';
import {CombatImpactBurst} from './CombatImpactBurst';
import {UiIcon} from './UiIcon';

export function GuildRaidTheater({row,state,language,numberMode,stageArt,bossArt,onClose,onRefresh}:{
 row:GuildPveEncounter;state?:GameState;language:Language;numberMode:'abbreviated'|'exact';
 stageArt:ImageSourcePropType;bossArt:ImageSourcePropType;onClose:()=>void;onRefresh?:()=>unknown;
}){
 const st=useSocialText(),C=useGameTheme();
 const [now,setNow]=useState(Date.now()),[pulse,setPulse]=useState(0);
 const currentRefresh=useRef(onRefresh);currentRefresh.current=onRefresh;
 const pending=row.pendingAttempts>0;
 useEffect(()=>{
  if(!pending)return;
  const interval=setInterval(()=>setNow(Date.now()),1000);
  return()=>clearInterval(interval);
 },[pending]);
 const remaining=row.nextAttemptResolvesAt?Math.max(0,Math.ceil((Date.parse(row.nextAttemptResolvesAt)-now)/1000)):0;
 const overdue=pending&&remaining===0;
 useEffect(()=>{
  if(!overdue)return;
  const refresh=()=>{if(currentRefresh.current)void currentRefresh.current();};
  refresh();
  const timer=setInterval(refresh,12000);
  return()=>clearInterval(timer);
 },[overdue,row.id]);
 const reduceMotion=Boolean(state?.settings.reduceMotion);
 useEffect(()=>{
  if(!pending||reduceMotion)return;
  const timer=setInterval(()=>setPulse(value=>value+1),2800);
  return()=>clearInterval(timer);
 },[pending,reduceMotion]);
 const view=guildPveView(row,now),present=guildPvePresentation(row),accent=row.kind==='event'?C.special:C.accent;
 const n=(value:number)=>formatGameNumber(value,numberMode,language);
 const fx=dungeonCombatClassFx(state?.character?.classId);
 const companionId=state?.character?.equippedCombatCompanionId,companion=companionId?combatCompanionDef(companionId):undefined;
 const companionArt=companionId?companionArtSource(companionId):undefined;
 const companionTurn=Boolean(companionArt)&&pulse%3===2;
 const countDown=`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`;
 return <CombatTheaterModal visible onClose={onClose} eyebrow={st(row.kind==='event'?'EVENT BOSS':'WEEKLY BOSS')} title={present.bossName} subtitle={st('3-minute attempt')} tone={row.kind==='event'?'event':'guild'} reduceMotion={reduceMotion}>
  <View style={s.content}>
   <ImageBackground source={stageArt} resizeMode="cover" style={s.arena} imageStyle={s.arenaArt}>
    <View style={s.shade}/>
    <Image source={bossArt} resizeMode="contain" style={s.bossArt} accessible={false}/>
    {pending&&!reduceMotion?<View pointerEvents="none" style={s.effects}>
     <CombatAttackSprite eventId={`${row.id}:${pulse}:attack`} motion={companionTurn?'projectile':fx?.damageMotion??'lunge'} accent={companionTurn?'violet':fx?.damageAccent??'gold'} actionKind="damage" reduceMotion={false}/>
     <CombatImpactBurst eventId={`${row.id}:${pulse}:impact`} kind="damage" size={68} reduceMotion={false}/>
    </View>:null}
   </ImageBackground>
   <View style={s.formation}>
    <View style={[s.portrait,{backgroundColor:C.panel2,borderColor:C.line}]}>{state?.character?<Image source={classIconArtwork[state.character.classId]} style={s.portraitArt} accessible={false}/>:<UiIcon name="character" size={30}/>}</View>
    <View style={[s.portrait,{backgroundColor:C.panel2,borderColor:C.line}]}>{companionArt?<Image source={companionArt} resizeMode="contain" style={s.portraitArt} accessible={false}/>:<UiIcon name="companions" size={30} muted/>}</View>
    <View style={s.flex}><Text style={[s.name,{color:C.text}]} numberOfLines={1}>{state?.character?.name??st('Your character')}</Text><Text style={[s.meta,{color:C.muted}]} numberOfLines={1}>{companion?.name??st('No companion equipped')}</Text></View>
   </View>
   <View accessibilityRole="progressbar" accessibilityLabel={st('Boss health')} accessibilityValue={{min:0,max:100,now:Math.round(100-view.percent),text:`${n(view.remaining)} / ${n(row.maxHp)} HP`}} style={[s.hpTrack,{backgroundColor:C.panel2}]}>
    <View style={{height:'100%',width:`${Math.max(0,Math.min(100,100-view.percent))}%` as `${number}%`,backgroundColor:accent}}/>
   </View>
   <Text style={[s.hpTotal,{color:C.text}]}>{n(view.remaining)} / {n(row.maxHp)} HP</Text>
   {pending?<View style={[s.status,{backgroundColor:C.panel2}]}><ActivityIndicator color={accent} size="small"/><Text accessibilityLiveRegion="polite" style={[s.statusText,{color:C.text}]}>{remaining>0?st('Raid in progress · {time}',{time:countDown}):st('Resolving attempt…')}</Text></View>:
    row.lastAttemptDamage!=null?<View style={s.result}>
     <Text style={[s.resultTotal,{color:accent}]}>{n(row.lastAttemptDamage)} {st('Damage')}</Text>
     <View style={[s.resultRow,{borderColor:C.line}]}><Text style={[s.meta,{color:C.muted}]}>{st('Character damage')}</Text><Text style={[s.name,{color:C.text}]}>{n(row.lastAttemptCharacterDamage??row.lastAttemptDamage)}</Text></View>
     <View style={[s.resultRow,{borderColor:C.line}]}><View style={s.flex}><Text style={[s.meta,{color:C.muted}]}>{st('Companion damage')}</Text><Text numberOfLines={1} style={[s.meta,{color:C.text}]}>{row.lastAttemptCompanionId?combatCompanionDef(row.lastAttemptCompanionId)?.name??row.lastAttemptCompanionId:st('No companion equipped')}</Text></View><Text style={[s.name,{color:C.text}]}>{n(row.lastAttemptCompanionDamage??0)}</Text></View>
    </View>:null}
   <Text style={[s.note,{color:C.muted}]}>{st('Visual effects only · server-calculated damage')}</Text>
  </View>
 </CombatTheaterModal>;
}
const s=StyleSheet.create({
 content:{gap:12,paddingBottom:16},
 arena:{height:214,alignItems:'center',justifyContent:'center',borderRadius:14,overflow:'hidden'},
 arenaArt:{opacity:.75},
 shade:{...StyleSheet.absoluteFill,backgroundColor:'rgba(5,8,13,.38)'},
 bossArt:{width:190,height:190},
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
 note:{fontSize:11,lineHeight:16,textAlign:'center'},
});
