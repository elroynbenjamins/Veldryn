import {useEffect,useRef} from 'react';
import {Animated,Easing,StyleSheet,Text,View} from 'react-native';
import type {MonsterDef} from '../content/monsters';
import {WORLD_ZONES} from '../content/world-map';
import {RegionArtwork} from './RegionArtwork';
import {MonsterPortraitFrame} from './MonsterPortraitFrame';
import {C,radii,typography} from '../theme/theme';
import {encounterIdentity} from '../core/encounter-identity';

export function BossEncounterIntro({monster,reduceMotion=false}:{monster:MonsterDef;reduceMotion?:boolean}){
 const region=WORLD_ZONES.find(zone=>zone.name===monster.zone),identity=encounterIdentity(monster);
 const reveal=useRef(new Animated.Value(reduceMotion?1:0)).current,idle=useRef(new Animated.Value(0)).current;
 useEffect(()=>{
  reveal.setValue(reduceMotion?1:0);idle.setValue(0);
  if(reduceMotion)return;
  const entrance=Animated.spring(reveal,{toValue:1,friction:7,tension:70,useNativeDriver:true});
  const breathing=Animated.loop(Animated.sequence([
   Animated.timing(idle,{toValue:1,duration:1050,easing:Easing.inOut(Easing.sin),useNativeDriver:true}),
   Animated.timing(idle,{toValue:0,duration:1050,easing:Easing.inOut(Easing.sin),useNativeDriver:true}),
  ]));
  entrance.start(()=>breathing.start());return()=>breathing.stop();
 },[idle,reduceMotion,reveal]);
 const translateY=reveal.interpolate({inputRange:[0,1],outputRange:[14,0]}),scale=reveal.interpolate({inputRange:[0,1],outputRange:[.94,1]});
 const idleScale=idle.interpolate({inputRange:[0,1],outputRange:[1,1.025]});
 return <View style={s.root}><RegionArtwork regionId={region?.id??'KINGS_ROAD'}/><View style={s.shade}/><Animated.View style={[s.copy,{opacity:reveal,transform:[{translateY}]}]}>
  <Text style={s.eyebrow}>ASTERFALL BOSS</Text>
  <Animated.View style={{transform:[{scale},{scale:idleScale}]}}><MonsterPortraitFrame monster={monster} size={132} framed={false} reduceMotion={reduceMotion}/></Animated.View>
  <Text accessibilityRole="header" style={s.name}>{monster.name}</Text><Text style={s.sub}>Level {monster.level} · {monster.hp} HP · {identity.archetype}</Text><Text style={s.trait}>{identity.mechanics.join(' · ')}</Text><Text style={s.sub}>{identity.tactic}</Text>
 </Animated.View></View>;
}
const s=StyleSheet.create({root:{borderRadius:radii.md,overflow:'hidden',borderWidth:1,borderColor:'#856634',marginTop:12},shade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(7,12,20,.74)'},copy:{padding:16,gap:8,alignItems:'center'},eyebrow:{...typography.caption,color:C.accent,letterSpacing:1,fontWeight:'600'},name:{...typography.hero,color:'#efd895',textAlign:'center'},trait:{...typography.caption,color:C.accent,textAlign:'center',fontWeight:'900'},sub:{...typography.body,color:C.muted,textAlign:'center'}});
