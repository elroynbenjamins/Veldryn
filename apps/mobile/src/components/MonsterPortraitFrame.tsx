import {Image,StyleSheet,Text,View} from 'react-native';
import type {MonsterDef} from '../content/monsters';
import {monsterPortraits} from '../theme/monster-assets';
import {C,radii} from '../theme/theme';

export function MonsterPortraitFrame({monster,size=96,active=false}:{monster:MonsterDef;size?:number;active?:boolean}){
  const accent=monster.boss?'#e2ad52':monster.level>=20?'#a783d8':monster.level>=10?'#5ea3c7':C.good;
  return <View accessibilityLabel={`${monster.name} pixel portrait`} style={[s.frame,{width:size,height:size,borderColor:active?C.accent:accent},active&&s.active]}>
    <View style={[s.corner,s.topLeft,{borderColor:accent}]}/><View style={[s.corner,s.topRight,{borderColor:accent}]}/><View style={[s.corner,s.bottomLeft,{borderColor:accent}]}/><View style={[s.corner,s.bottomRight,{borderColor:accent}]}/>
    <Image source={monsterPortraits[monster.id]} resizeMode="contain" style={{width:size-10,height:size-10}}/>
    <View style={[s.level,{backgroundColor:accent}]}><Text style={s.levelText}>{monster.boss?'BOSS':`LV ${monster.level}`}</Text></View>
  </View>;
}
const s=StyleSheet.create({frame:{alignItems:'center',justifyContent:'center',overflow:'hidden',borderWidth:2,borderRadius:radii.md,backgroundColor:'#09121a'},active:{borderWidth:3},corner:{position:'absolute',width:9,height:9,borderWidth:1},topLeft:{left:3,top:3,borderRightWidth:0,borderBottomWidth:0},topRight:{right:3,top:3,borderLeftWidth:0,borderBottomWidth:0},bottomLeft:{left:3,bottom:3,borderRightWidth:0,borderTopWidth:0},bottomRight:{right:3,bottom:3,borderLeftWidth:0,borderTopWidth:0},level:{position:'absolute',right:3,bottom:3,borderRadius:3,paddingHorizontal:4,paddingVertical:1},levelText:{fontSize:8,color:'#071018',fontWeight:'900'}});
