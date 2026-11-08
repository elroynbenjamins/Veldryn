import {Animated,Easing,Image,Platform,StyleSheet,Text,View} from 'react-native';
import {useEffect,useMemo,useRef,useState} from 'react';
import type {GameState} from '../core/types';
import type {MonsterDef} from '../content/monsters';
import {combatBaselineProjection} from '../core/balance-projection';
import {activeCombatHitProjection,combatSustainProjection} from '../core/game';
import {itemDef} from '../content/items';
import {formatGameNumber} from '../core/number-format';
import {useGameTheme} from '../theme/ThemeContext';
import {battleText} from '../i18n/battle';
import {progressionT} from '../i18n/progression';
import {CharacterPortrait} from './CharacterVisual';
import {MonsterPortraitFrame} from './MonsterPortraitFrame';
import {RegionArtwork} from './RegionArtwork';

/** An encounter preview; reward projections are deliberately labeled as baseline estimates. */
export function HuntingPreview({state,monster,regionId}:{state:GameState;monster:MonsterDef;regionId:string}){
 const C=useGameTheme(),pace=combatBaselineProjection(monster),sustain=monster.boss?undefined:combatSustainProjection(state,monster.id);
 const active=state.activity?.kind==='combat'&&state.activity.targetId===monster.id;
 const [clock,setClock]=useState(Date.now());
 useEffect(()=>{if(!active)return;setClock(Date.now());const timer=setInterval(()=>setClock(Date.now()),750);return()=>clearInterval(timer);},[active]);
 const fight=useMemo(()=>active?activeCombatHitProjection(state,clock):undefined,[state,active,clock]);
 const lastHit=fight?.lastHit&&clock-fight.lastHit.atMs<3500?fight.lastHit:undefined;
 const playerImpact=useRef(new Animated.Value(0)).current,enemyImpact=useRef(new Animated.Value(0)).current;
 useEffect(()=>{
  const hit=fight?.lastHit;
  if(!active||state.settings.reduceMotion||!hit)return;
  const value=hit.actor==='enemy'?playerImpact:enemyImpact;
  value.stopAnimation();value.setValue(1);
  const animation=Animated.timing(value,{toValue:0,duration:680,easing:Easing.out(Easing.quad),useNativeDriver:true});
  animation.start();
  return()=>animation.stop();
 },[active,fight?.lastHit?.atMs,fight?.lastHit?.actor,state.settings.reduceMotion,playerImpact,enemyImpact]);
 const number=(value:number)=>formatGameNumber(Math.round(value),state.settings.numberMode,state.settings.language);
 // Small real damage ticks must never render as a misleading zero.
 const damageText=(value:number)=>value>0&&value<1?value.toFixed(2):number(value);
 const font=Platform.OS==='web'?'system-ui':Platform.OS==='android'?'sans-serif':'System';
 const tr=(text:string)=>battleText(state.settings.language,text);
 return <View style={{borderWidth:1,borderColor:C.line,borderRadius:16,overflow:'hidden',backgroundColor:C.panel}}>
  <View style={{height:196,justifyContent:'flex-end'}}>
   {regionId==='IRONWOOD'?<Image source={require('../../assets/combat-scenes/ironwood-clearing-v1.jpg')} resizeMode="cover" style={[StyleSheet.absoluteFill,{width:'100%',height:'100%'}]}/>:<RegionArtwork regionId={regionId}/>}
   <View style={[StyleSheet.absoluteFill,{backgroundColor:'rgba(3,7,10,.35)'}]}/>
   <View style={{position:'absolute',top:10,left:12,right:12,alignItems:'center',gap:2}}><Text style={{fontFamily:font,color:'#ADC8BC',fontSize:10,fontWeight:'700',letterSpacing:1}}>{state.activity?.kind==='combat'&&state.activity.targetId===monster.id?progressionT(state.settings.language,'HUNTING'):tr('Combat preview')}</Text><Text style={{fontFamily:font,color:'#F0F3F4',fontSize:21,fontWeight:'700'}}>{monster.name}</Text><Text style={{fontFamily:font,color:'#BAC3CA',fontSize:12}}>{tr('Combat preview')}</Text></View>
   <View style={{flexDirection:'row',alignItems:'flex-end',justifyContent:'space-around',padding:10,gap:8}}>
    <View style={{flex:1,alignItems:'center',gap:5}}><View style={{borderWidth:2,borderColor:'#A5B4AA',borderRadius:50,backgroundColor:'rgba(4,9,12,.8)',padding:3,position:'relative'}}><CharacterPortrait state={state} style={{width:72,height:72}}/><Animated.View pointerEvents="none" style={{position:'absolute',top:9,left:-6,right:-6,alignItems:'center',opacity:playerImpact,transform:[{translateY:playerImpact.interpolate({inputRange:[0,1],outputRange:[-18,0]})}]}}><Text style={{fontSize:16,fontWeight:'900',color:'#FF8995',textShadowColor:'#210809',textShadowRadius:4}}>−{lastHit?.actor==='enemy'?damageText(lastHit.damage):''}</Text></Animated.View></View><Text style={{fontFamily:font,color:'#E8ECEF',fontSize:11,fontWeight:'700',marginTop:-12,paddingHorizontal:7,paddingVertical:2,borderRadius:5,borderWidth:1,borderColor:'#758D88',backgroundColor:'#111B20'}}>Lv {state.character?.level}</Text></View>
    <Text style={{color:'#C9CED2',fontWeight:'800',alignSelf:'center'}}>VS</Text>
    <View style={{flex:1,alignItems:'center',gap:5,position:'relative'}}><MonsterPortraitFrame monster={monster} size={116} framed={false} reduceMotion={state.settings.reduceMotion}/><Animated.View pointerEvents="none" style={{position:'absolute',top:12,left:-4,right:-4,alignItems:'center',opacity:enemyImpact,transform:[{translateY:enemyImpact.interpolate({inputRange:[0,1],outputRange:[-20,0]})}]}}><Text style={{fontSize:17,fontWeight:'900',color:'#FFDA8F',textShadowColor:'#241306',textShadowRadius:4}}>−{lastHit?.actor==='player'?damageText(lastHit.damage):''}{lastHit?.critical?'!':''}</Text></Animated.View></View>
   </View>
  </View>
  {fight?<View style={{paddingHorizontal:12,paddingVertical:10,gap:8,borderTopWidth:1,borderColor:C.line,backgroundColor:C.panel}}>
   <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
    <Text style={{fontFamily:font,color:C.text,fontSize:12,fontWeight:'800'}}>{fight.stoppedReason?'Combat stopped':'LIVE HUNT · REAL HITS'}</Text>
    <Text style={{fontFamily:font,color:C.muted,fontSize:11}}>{Math.round(fight.progressFraction*100)}% encounter</Text>
   </View>
   {([
     {label:state.character?.name??'You',hp:fight.playerHp,max:fight.playerMaxHp,color:C.good},
     {label:monster.name,hp:fight.enemyHp,max:fight.enemyMaxHp,color:C.bad},
   ]).map(row=><View key={row.label} style={{gap:3}}>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8}}>
     <Text numberOfLines={1} style={{fontFamily:font,color:C.text,fontSize:11,fontWeight:'700',flex:1}}>{row.label}</Text>
     <Text style={{fontFamily:font,color:C.muted,fontSize:11}}>{number(row.hp)} / {number(row.max)}</Text>
    </View>
    <View style={{height:8,borderRadius:8,backgroundColor:C.line,overflow:'hidden'}}>
     <View style={{width:`${Math.max(0,Math.min(100,row.hp/Math.max(1,row.max)*100))}%` as `${number}%`,height:'100%',backgroundColor:row.color,borderRadius:8}}/>
    </View>
   </View>)}
   <Text accessibilityLiveRegion="polite" style={{fontFamily:font,fontSize:12,fontWeight:'700',color:lastHit?.actor==='enemy'?C.bad:C.accent}}>
    {fight.stoppedReason?fight.stoppedReason:lastHit?`${lastHit.actor==='player'?'Hit':'Taken'} −${damageText(lastHit.damage)}${lastHit.critical?' · CRITICAL!':''}`:'Hits reduce real HP during the encounter'}
   </Text>
  </View>:null}
  {!monster.boss?<View accessibilityLabel={progressionT(state.settings.language,'BASELINE REWARDS')} style={{margin:8,marginTop:0,padding:11,gap:8,borderWidth:1,borderColor:C.lineStrong,borderRadius:8,backgroundColor:C.panel}}>
   <View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:6}}>{[[pace.killsPerHour,'kills/hr'],[pace.xpPerHour,'XP/hr'],[pace.goldPerHour,'Gold/hr']].map(([value,label],index)=><Text key={label} style={{fontFamily:font,color:C.text,fontWeight:'600',fontSize:13}}>{index?'·  ':''}~{number(value as number)} {label}</Text>)}</View>
   <Text style={{fontFamily:font,color:C.muted,fontSize:11,lineHeight:15,textAlign:'center'}}>{sustain?.foodId?`${itemDef(sustain.foodId).name} · ~${sustain.foodPerHour.toFixed(1)} food/hr`:progressionT(state.settings.language,'Equip cooked food for sustained hunts.')}</Text>
  </View>:null}
 </View>;
}
