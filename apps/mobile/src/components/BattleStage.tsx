import {useEffect,useRef} from 'react';
import {Animated,Easing,StyleSheet,Text,View} from 'react-native';
import {MonsterDef} from '../content/monsters';
import {combatPresentation} from '../core/combat-presentation';
import {effectiveStats} from '../core/game';
import {GameState} from '../core/types';
import {C,radii,spacing,typography} from '../theme/theme';
import {CharacterPortrait} from './CharacterVisual';
import {ot} from '../i18n';
import {MonsterPortraitFrame} from './MonsterPortraitFrame';

export function BattleStage({state,monster,elapsedSeconds,cycleSeconds}:{state:GameState;monster:MonsterDef;elapsedSeconds:number;cycleSeconds:number}){
  const strike=useRef(new Animated.Value(0)).current;
  useEffect(()=>{strike.setValue(0);if(state.settings.reduceMotion)return;const loop=Animated.loop(Animated.sequence([Animated.delay(550),Animated.timing(strike,{toValue:1,duration:140,easing:Easing.out(Easing.quad),useNativeDriver:true}),Animated.timing(strike,{toValue:0,duration:260,useNativeDriver:true}),Animated.delay(550)]));loop.start();return()=>loop.stop()},[state.settings.reduceMotion,strike]);
  const view=combatPresentation(state,monster,elapsedSeconds,cycleSeconds),stats=effectiveStats(state);
  const enemyPct=view.enemyHp/view.enemyMaxHp,playerPct=Math.max(0,Math.min(1,state.character!.currentHp/stats.hp));
  return <View style={s.stage} accessibilityLabel={`Battle against ${monster.name}. ${view.safety} difficulty.`}>
    <View style={s.header}><Text style={s.kicker}>{ot(state.settings.language,'combat.live')}</Text><Text style={[s.safety,view.safety==='safe'?s.safe:view.safety==='dangerous'?s.danger:s.steady]}>{view.safety.toUpperCase()}</Text></View>
    <View style={s.ability}><Text style={s.abilityName}>◆ {view.style.name}</Text><Text style={s.abilityText}>{view.style.description}</Text></View>
    <View style={s.combatants}><View style={s.side}><CharacterPortrait state={state} compact/><Text style={s.name}>{state.character!.name}</Text><Text style={s.hit}>≈ {view.playerHit} {ot(state.settings.language,'combat.damage')}</Text></View><View style={s.versus}><Text style={s.vs}>VS</Text>{!state.settings.reduceMotion&&<Animated.Text style={[s.damage,{opacity:strike,transform:[{translateY:strike.interpolate({inputRange:[0,1],outputRange:[8,-8]})}]}]}>−{view.playerHit}</Animated.Text>}</View><View style={s.side}><MonsterPortraitFrame monster={monster} size={116} active/><Text style={s.name}>{monster.name}</Text><Text style={s.hit}>≈ {view.enemyHit} {ot(state.settings.language,'combat.damage')}</Text></View></View>
    <Bar label="YOUR HEALTH" value={state.character!.currentHp} max={stats.hp} pct={playerPct} color={playerPct<.35?C.bad:C.good}/><Bar label="ENEMY CYCLE" value={view.enemyHp} max={view.enemyMaxHp} pct={enemyPct} color={C.bad}/>
  </View>;
}
function Bar({label,value,max,pct,color}:{label:string;value:number;max:number;pct:number;color:string}){return <View><View style={s.meta}><Text style={s.barLabel}>{label}</Text><Text style={s.barValue}>{value}/{max}</Text></View><View style={s.track}><View style={[s.fill,{width:`${pct*100}%`,backgroundColor:color}]}/></View></View>}
const s=StyleSheet.create({stage:{backgroundColor:'#101925',borderWidth:1,borderColor:C.line,borderRadius:radii.lg,padding:spacing.md,gap:spacing.sm},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},safety:{...typography.caption,fontWeight:'900'},safe:{color:C.good},steady:{color:C.warning},danger:{color:C.bad},ability:{backgroundColor:C.panel2,borderLeftWidth:3,borderLeftColor:C.accent,padding:spacing.sm,borderRadius:radii.sm},abilityName:{...typography.bodyStrong,color:C.accent},abilityText:{...typography.caption,color:C.muted},combatants:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},side:{width:'40%',alignItems:'center'},name:{...typography.bodyStrong,color:C.text,textAlign:'center'},hit:{...typography.caption,color:C.muted},versus:{alignItems:'center',gap:spacing.sm},vs:{...typography.title,color:C.accent},damage:{...typography.bodyStrong,color:C.bad},meta:{flexDirection:'row',justifyContent:'space-between'},barLabel:{...typography.caption,color:C.muted,fontWeight:'900'},barValue:{...typography.caption,color:C.text},track:{height:10,backgroundColor:C.bg,borderRadius:8,overflow:'hidden'},fill:{height:'100%',borderRadius:8}});
