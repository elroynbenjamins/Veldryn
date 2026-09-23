import {useEffect,useRef} from 'react';
import {Animated,Easing,Image,StyleSheet,Text,View} from 'react-native';
import type {MonsterDef} from '../content/monsters';
import {monsterPortraitSource} from '../theme/monster-assets';
import {C,radii} from '../theme/theme';

export function MonsterPortraitFrame({monster,size=96,active=false,framed=true,reduceMotion=false}:{monster:MonsterDef;size?:number;active?:boolean;framed?:boolean;reduceMotion?:boolean}){
  const accent=monster.boss?'#e2ad52':monster.level>=20?'#a783d8':monster.level>=10?'#5ea3c7':C.good;
  const portrait=monsterPortraitSource(monster.id);
  const pulse=useRef(new Animated.Value(0)).current;
  useEffect(()=>{
    pulse.setValue(0);
    if(!active||reduceMotion)return;
    const loop=Animated.loop(Animated.sequence([
      Animated.timing(pulse,{toValue:1,duration:620,easing:Easing.inOut(Easing.quad),useNativeDriver:true}),
      Animated.timing(pulse,{toValue:0,duration:620,easing:Easing.inOut(Easing.quad),useNativeDriver:true}),
    ]));
    loop.start();return()=>loop.stop();
  },[active,pulse,reduceMotion]);
  const scale=pulse.interpolate({inputRange:[0,1],outputRange:[1,1.035]});
  return <Animated.View accessibilityLabel={`${monster.name} pixel portrait`} style={[s.frame,!framed&&s.unframed,{width:size,height:size,borderColor:active?C.accent:accent},active&&framed&&s.active,{transform:[{scale}]}]}>
    {framed&&<><View style={[s.corner,s.topLeft,{borderColor:accent}]}/><View style={[s.corner,s.topRight,{borderColor:accent}]}/><View style={[s.corner,s.bottomLeft,{borderColor:accent}]}/><View style={[s.corner,s.bottomRight,{borderColor:accent}]}/></>}
    {portrait?<Image source={portrait} resizeMode="contain" fadeDuration={0} style={{width:size-10,height:size-10}}/>:<View style={[s.fallback,{width:size-10,height:size-10,borderColor:accent}]}><Text style={[s.fallbackMark,{color:accent}]}>{monster.name.slice(0,1).toUpperCase()}</Text></View>}
    {active&&!reduceMotion&&<Animated.View pointerEvents="none" style={[s.activeGlow,{opacity:pulse.interpolate({inputRange:[0,1],outputRange:[.08,.28]})}]}/>}
    {framed&&<View style={[s.level,{backgroundColor:accent}]}><Text style={s.levelText}>{monster.boss?'BOSS':`LV ${monster.level}`}</Text></View>}
  </Animated.View>;
}
const s=StyleSheet.create({fallback:{alignItems:'center',justifyContent:'center',borderWidth:1,borderRadius:radii.sm,backgroundColor:'#0e1720'},fallbackMark:{fontSize:30,fontWeight:'900',opacity:.78},unframed:{borderWidth:0,backgroundColor:'transparent'},frame:{alignItems:'center',justifyContent:'center',overflow:'hidden',borderWidth:2,borderRadius:radii.md,backgroundColor:'#09121a'},active:{borderWidth:3},activeGlow:{...StyleSheet.absoluteFillObject,borderWidth:2,borderColor:C.accent,borderRadius:radii.md},corner:{position:'absolute',width:9,height:9,borderWidth:1},topLeft:{left:3,top:3,borderRightWidth:0,borderBottomWidth:0},topRight:{right:3,top:3,borderLeftWidth:0,borderBottomWidth:0},bottomLeft:{left:3,bottom:3,borderRightWidth:0,borderTopWidth:0},bottomRight:{right:3,bottom:3,borderLeftWidth:0,borderTopWidth:0},level:{position:'absolute',right:3,bottom:3,borderRadius:3,paddingHorizontal:4,paddingVertical:1},levelText:{fontSize:8,color:'#071018',fontWeight:'900'}});
