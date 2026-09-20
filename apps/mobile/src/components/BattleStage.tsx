import {useEffect,useRef} from 'react';
import {Animated,Easing,StyleSheet,Text,View} from 'react-native';
import {MonsterDef} from '../content/monsters';
import {WORLD_ZONES} from '../content/world-map';
import {combatMotionProfile} from '../core/combat-motion';
import {combatPresentation} from '../core/combat-presentation';
import {effectiveStats} from '../core/game';
import {GameState} from '../core/types';
import {C,radii,typography} from '../theme/theme';
import {CharacterPortrait} from './CharacterVisual';
import {MonsterPortraitFrame} from './MonsterPortraitFrame';
import {RegionArtwork} from './RegionArtwork';
import {StatBar} from './StatBar';

export function BattleStage({state,monster,elapsedSeconds,cycleSeconds}:{state:GameState;monster:MonsterDef;elapsedSeconds:number;cycleSeconds:number}){
 const view=combatPresentation(state,monster,elapsedSeconds,cycleSeconds),stats=effectiveStats(state);
 const region=WORLD_ZONES.find(zone=>zone.name===monster.zone),motion=combatMotionProfile(cycleSeconds,state.settings.reduceMotion);
 const playerLunge=useRef(new Animated.Value(0)).current,enemyLunge=useRef(new Animated.Value(0)).current;
 const enemyImpact=useRef(new Animated.Value(0)).current,playerImpact=useRef(new Animated.Value(0)).current;
 const shake=useRef(new Animated.Value(0)).current,breath=useRef(new Animated.Value(0)).current;

 useEffect(()=>{
  const values=[playerLunge,enemyLunge,enemyImpact,playerImpact,shake,breath];values.forEach(value=>value.setValue(0));
  if(!motion.enabled)return;
  const tail=(used:number)=>Math.max(0,motion.cycleMs-used);
  const lungeLoop=(value:Animated.Value,at:number)=>Animated.loop(Animated.sequence([
   Animated.delay(at),
   Animated.timing(value,{toValue:1,duration:motion.lungeMs,easing:Easing.out(Easing.quad),useNativeDriver:true}),
   Animated.timing(value,{toValue:0,duration:motion.recoverMs,easing:Easing.inOut(Easing.quad),useNativeDriver:true}),
   Animated.delay(tail(at+motion.lungeMs+motion.recoverMs)),
  ]));
  const impactLoop=(value:Animated.Value,at:number)=>Animated.loop(Animated.sequence([
   Animated.delay(at),
   Animated.timing(value,{toValue:1,duration:motion.impactMs,easing:Easing.out(Easing.cubic),useNativeDriver:true}),
   Animated.timing(value,{toValue:0,duration:1,useNativeDriver:true}),
   Animated.delay(tail(at+motion.impactMs+1)),
  ]));
  const player=lungeLoop(playerLunge,motion.playerAttackAtMs),enemy=lungeLoop(enemyLunge,motion.enemyAttackAtMs);
  const hitEnemy=impactLoop(enemyImpact,motion.playerAttackAtMs+motion.lungeMs),hitPlayer=impactLoop(playerImpact,motion.enemyAttackAtMs+motion.lungeMs);
  const shakeStart=motion.enemyAttackAtMs+motion.lungeMs,shakeLoop=Animated.loop(Animated.sequence([
   Animated.delay(shakeStart),
   Animated.timing(shake,{toValue:motion.shakePx,duration:35,useNativeDriver:true}),
   Animated.timing(shake,{toValue:-motion.shakePx,duration:45,useNativeDriver:true}),
   Animated.timing(shake,{toValue:motion.shakePx*.5,duration:40,useNativeDriver:true}),
   Animated.timing(shake,{toValue:0,duration:55,useNativeDriver:true}),
   Animated.delay(tail(shakeStart+175)),
  ]));
  const breathing=Animated.loop(Animated.sequence([
   Animated.timing(breath,{toValue:1,duration:900,easing:Easing.inOut(Easing.sin),useNativeDriver:true}),
   Animated.timing(breath,{toValue:0,duration:900,easing:Easing.inOut(Easing.sin),useNativeDriver:true}),
  ]));
  for(const animation of [player,enemy,hitEnemy,hitPlayer,shakeLoop,breathing])animation.start();
  return()=>{for(const animation of [player,enemy,hitEnemy,hitPlayer,shakeLoop,breathing])animation.stop();};
 },[breath,enemyImpact,enemyLunge,motion.cycleMs,motion.enabled,motion.enemyAttackAtMs,motion.impactMs,motion.lungeMs,motion.playerAttackAtMs,motion.recoverMs,motion.shakePx,playerImpact,playerLunge,shake]);

 const playerScale=breath.interpolate({inputRange:[0,1],outputRange:[1,1.012]}),enemyScale=breath.interpolate({inputRange:[0,1],outputRange:[1.008,1]});
 const enemyFloatOpacity=enemyImpact.interpolate({inputRange:[0,.08,.55,1],outputRange:[0,1,.6,0]}),playerFloatOpacity=playerImpact.interpolate({inputRange:[0,.08,.55,1],outputRange:[0,1,.6,0]});
 const floatY=(value:Animated.Value)=>value.interpolate({inputRange:[0,1],outputRange:[0,-22]});
 const flash=(value:Animated.Value)=>value.interpolate({inputRange:[0,.08,.22,1],outputRange:[0,.58,.12,0]});
 return <View style={s.stage}>
  <View style={s.header}><Text accessibilityRole="header" style={s.title}>Combat preview</Text><Text style={[s.safety,{color:view.safety==='safe'?C.good:view.safety==='dangerous'?C.warning:C.info}]}>{view.safety}</Text></View>
  <Animated.View style={[s.arena,{transform:[{translateX:shake}]}]}><RegionArtwork regionId={region?.id??'GREENFIELDS'}/><View style={s.shade}/>
   <View style={s.combatants}>
    <Animated.View style={[s.side,{transform:[{translateX:playerLunge.interpolate({inputRange:[0,1],outputRange:[0,motion.playerLungePx]})},{scale:playerScale}]}]}>
     <View style={s.portrait}><CharacterPortrait state={state} style={{width:96,height:120}}/><Animated.View pointerEvents="none" style={[s.impactFlash,{opacity:flash(playerImpact)}]}/><Animated.View pointerEvents="none" style={[s.floatTextWrap,{opacity:playerFloatOpacity,transform:[{translateY:floatY(playerImpact)}]}]}><Text style={s.damageTaken}>−{view.enemyHit}</Text></Animated.View></View>
     <Text style={s.name}>{state.character!.name}</Text><Text style={s.hit}>≈ {view.playerHit} damage</Text>
    </Animated.View>
    <View style={s.versus}><Text style={s.vs}>VS</Text><Text style={s.motionHint}>{motion.enabled?'LIVE FX':'REDUCED'}</Text></View>
    <Animated.View style={[s.side,{transform:[{translateX:enemyLunge.interpolate({inputRange:[0,1],outputRange:[0,motion.enemyLungePx]})},{scale:enemyScale}]}]}>
     <View style={s.portrait}><MonsterPortraitFrame monster={monster} size={112} active reduceMotion={state.settings.reduceMotion} framed={false}/><Animated.View pointerEvents="none" style={[s.impactFlash,{opacity:flash(enemyImpact)}]}/><Animated.View pointerEvents="none" style={[s.floatTextWrap,{opacity:enemyFloatOpacity,transform:[{translateY:floatY(enemyImpact)}]}]}><Text style={s.damageDealt}>−{view.playerHit}</Text></Animated.View></View>
     <Text style={s.name}>{monster.name}</Text><Text style={s.hit}>≈ {view.enemyHit} damage</Text>
    </Animated.View>
   </View>
  </Animated.View>
  <View style={s.details}><Text style={s.ability}>{view.style.name}</Text><Text style={s.sub}>{view.style.description}</Text>
   <View style={s.identity}><View style={s.identityHead}><Text style={s.identityLabel}>ENCOUNTER · {view.encounter.archetype.toUpperCase()}</Text><Text style={s.pressure}>{view.encounter.pressure.toUpperCase()}</Text></View><Text style={s.sub}>{view.encounter.summary}</Text><View style={s.mechanics}>{view.encounter.mechanics.map(mechanic=><View key={mechanic} style={s.mechanic}><Text style={s.mechanicText}>{mechanic}</Text></View>)}</View><Text style={s.tactic}>Tactic: {view.encounter.tactic}</Text></View>
   <StatBar label="Current health" current={state.character!.currentHp} max={stats.hp} reduceMotion={state.settings.reduceMotion}/>
   <StatBar label="Estimated enemy health" current={view.enemyHp} max={view.enemyMaxHp} reduceMotion={state.settings.reduceMotion}/>
   <Text style={s.note}>Motion is visual feedback only. Combat rewards and settled health remain authoritative when you collect.</Text>
  </View>
 </View>;
}
const s=StyleSheet.create({
 stage:{backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:radii.lg,overflow:'hidden'},
 header:{padding:12,flexDirection:'row',flexWrap:'wrap',alignItems:'baseline',justifyContent:'space-between',gap:8},
 title:{...typography.title,color:C.text},safety:{...typography.caption,textTransform:'capitalize',fontWeight:'600'},
 arena:{minHeight:218,overflow:'hidden',justifyContent:'center'},shade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(5,12,20,.58)'},
 combatants:{flexDirection:'row',alignItems:'flex-start',padding:10,gap:4},side:{flex:1,minWidth:0,alignItems:'center',gap:4},
 portrait:{width:'100%',maxWidth:128,height:128,alignItems:'center',justifyContent:'flex-end',backgroundColor:'rgba(5,12,20,.6)',borderRadius:36,overflow:'hidden',position:'relative'},
 impactFlash:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(255,238,196,.78)'},floatTextWrap:{position:'absolute',top:18,left:0,right:0,alignItems:'center'},
 damageDealt:{fontSize:18,lineHeight:22,color:'#ffd36e',fontWeight:'900',textShadowColor:'#120b03',textShadowRadius:3},
 damageTaken:{fontSize:17,lineHeight:21,color:'#ff8790',fontWeight:'900',textShadowColor:'#180508',textShadowRadius:3},
 name:{...typography.bodyStrong,color:C.text,textAlign:'center'},hit:{...typography.caption,color:'#d5e0ec',textAlign:'center'},
 versus:{width:34,paddingTop:53,alignItems:'center',gap:4},vs:{...typography.caption,color:C.accent,fontWeight:'600'},motionHint:{fontSize:7,lineHeight:9,color:C.muted,fontWeight:'900',letterSpacing:.4,textAlign:'center'},
 details:{padding:12,gap:10},ability:{...typography.bodyStrong,color:C.accent},sub:{...typography.body,color:C.muted},identity:{gap:6,padding:9,borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.panel2},identityHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},identityLabel:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.7},pressure:{fontSize:9,lineHeight:12,color:C.warning,fontWeight:'900',letterSpacing:.5},mechanics:{flexDirection:'row',flexWrap:'wrap',gap:5},mechanic:{paddingHorizontal:7,paddingVertical:3,borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.bg},mechanicText:{fontSize:9,color:C.text,fontWeight:'800'},tactic:{...typography.caption,color:C.info,lineHeight:16},note:{...typography.caption,color:C.muted}
});
