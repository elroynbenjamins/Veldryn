import {StyleSheet,Text,View,type StyleProp,type TextStyle} from 'react-native';
import {guildTagColor,normalizeGuildTag} from '../core/guild-tags';
import {C} from '../theme/theme';

export function GuildTaggedPlayerName({name,guildTag,tagColorId,style,numberOfLines}:{name:string;guildTag?:string|null;tagColorId?:string|null;style?:StyleProp<TextStyle>;numberOfLines?:number}){
  const normalized=guildTag?normalizeGuildTag(guildTag):undefined;
  return <View accessible accessibilityLabel={normalized?`[${normalized}] ${name}`:name} style={s.row}>{normalized?<Text numberOfLines={1} style={[s.tag,{color:guildTagColor(tagColorId??undefined)}]}>[{normalized}]</Text>:null}<Text numberOfLines={numberOfLines??1} style={[s.name,style]}>{name}</Text></View>;
}
const s=StyleSheet.create({row:{flexDirection:'row',alignItems:'baseline',gap:5,minWidth:0},tag:{fontSize:11,fontWeight:'900',textShadowColor:'#000',textShadowRadius:2},name:{color:C.text,fontWeight:'800',minWidth:0,flexShrink:1}});
