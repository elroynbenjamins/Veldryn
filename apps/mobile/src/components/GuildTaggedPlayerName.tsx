import {StyleSheet,Text,View,type StyleProp,type TextStyle} from 'react-native';
import {guildTagColor,normalizeGuildTag} from '../core/guild-tags';
import {C} from '../theme/theme';

export function GuildTaggedPlayerName({name,guildTag,tagColorId,style,numberOfLines}:{name:string;guildTag?:string|null;tagColorId?:string|null;style?:StyleProp<TextStyle>;numberOfLines?:number}){
  const normalized=guildTag?normalizeGuildTag(guildTag):undefined;
  const tagColor=guildTagColor(tagColorId??undefined);\n  return <View accessible accessibilityLabel={normalized?`[${normalized}] ${name}`:name} style={s.row}>{normalized?<Text numberOfLines={1} style={[s.tag,{color:tagColor,borderColor:tagColor}]}>[{normalized}]</Text>:null}<Text numberOfLines={numberOfLines??1} style={[s.name,style]}>{name}</Text></View>;
}
const s=StyleSheet.create({row:{flexDirection:'row',alignItems:'center',gap:5,minWidth:0},tag:{fontSize:9,lineHeight:13,fontWeight:'900',paddingHorizontal:4,paddingVertical:1,borderWidth:1,borderRadius:4,backgroundColor:'rgba(8,15,24,.82)',textShadowColor:'#000',textShadowRadius:2},name:{color:C.text,fontWeight:'800',minWidth:0,flexShrink:1}});
