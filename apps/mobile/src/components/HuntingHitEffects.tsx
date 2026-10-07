import {useEffect,useRef,useState} from 'react';
import {Animated,AppState,Easing,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import type {MonsterDef} from '../content/monsters';
import {activeCombatRuntimeProjection} from '../core/game';
import {combatPresentation} from '../core/combat-presentation';
import {huntingEffectsEnabled,huntingHitCue} from '../core/hunting-hit-effects';
import {useGameTheme} from '../theme/ThemeContext';

/** Local, decorative playback. No background catch-up, rewards, or health mutation. */
export function HuntingHitEffects({state,monster,side}:{state:GameState;monster:MonsterDef;side:'player'|'enemy'}){
 const C=useGameTheme(),pulse=useRef(new Animated.Value(0)).current;
 const latest=useRef(state);latest.current=state;
 const [amount,setAmount]=useState(0),[foreground,setForeground]=useState(AppState.currentState==='active');
 const activity=state.activity,active=activity?.kind==='combat'&&activity.targetId===monster.id;
 const enabled=huntingEffectsEnabled(state.settings,active)&&foreground;
 const cycleSeconds=active?activeCombatRuntimeProjection(state)?.killCycleSeconds??0:0;
 useEffect(()=>{const subscription=AppState.addEventListener('change',value=>setForeground(value==='active'));return()=>subscription.remove()},[]);
 useEffect(()=>{
  pulse.stopAnimation();pulse.setValue(0);setAmount(0);
  if(!enabled||cycleSeconds<=0)return;
  let previous:string|null=null,animation:Animated.CompositeAnimation|undefined;
  const sample=()=>{
   const current=latest.current,a=current.activity;
   if(a?.kind!=='combat'||a.targetId!==monster.id)return;
   const elapsed=Math.max(0,Date.now()-a.lastClaimAtMs)+(a.progressFraction??0)*cycleSeconds*1000;
   const cue=huntingHitCue(elapsed,cycleSeconds*1000,side);
   if(!cue||cue===previous)return;
   previous=cue;
   const view=combatPresentation(current,monster,elapsed/1000,cycleSeconds);
   setAmount(side==='enemy'?view.playerHit:view.enemyHit);
   animation?.stop();pulse.setValue(0);
   animation=Animated.timing(pulse,{toValue:1,duration:650,easing:Easing.out(Easing.quad),useNativeDriver:true});animation.start();
  };
  // Do not replay historical hits when entering the screen or resuming the app.
  const timer=setInterval(sample,150);
  return()=>{clearInterval(timer);animation?.stop();pulse.stopAnimation();pulse.setValue(0)};
 },[enabled,cycleSeconds,activity?.startedAtMs,monster.id,side,pulse]);
 if(!enabled||amount<=0)return null;
 const color=side==='enemy'?C.warning:C.bad;
 const opacity=pulse.interpolate({inputRange:[0,.1,.55,1],outputRange:[0,1,.9,0]});
 return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
  <Animated.View style={[s.impact,{opacity,transform:[{scale:pulse.interpolate({inputRange:[0,1],outputRange:[.7,1.08]})}]}]}>
   {[0,1,2].slice(0,side==='player'?3:2).map(index=><View key={index} style={[s.slash,{backgroundColor:color,top:22+index*9,transform:[{rotate:side==='player'?'-35deg':index?'28deg':'-30deg'}]}]}/>)}
  </Animated.View>
  <Animated.View style={[s.number,{opacity,transform:[{translateY:pulse.interpolate({inputRange:[0,1],outputRange:[0,-20]})}]}]}><Text style={[s.text,{color,backgroundColor:C.panel}]}>≈ −{amount.toLocaleString(state.settings.language)}</Text></Animated.View>
 </View>;
}
const s=StyleSheet.create({impact:{position:'absolute',width:58,height:65,left:'50%',top:'35%',marginLeft:-29},slash:{position:'absolute',left:0,width:58,height:3,borderRadius:4},number:{position:'absolute',left:0,right:0,top:8,alignItems:'center'},text:{fontSize:16,lineHeight:21,fontWeight:'600',paddingHorizontal:5,paddingVertical:2,borderRadius:5,fontVariant:['tabular-nums']}});
