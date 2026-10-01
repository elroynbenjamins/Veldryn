import {useMemo} from 'react';
import {StyleSheet,Text,View,type StyleProp,type TextStyle} from 'react-native';
import {guildTagColor,normalizeGuildTag} from '../core/guild-tags';
import {type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import type {PlayerNameStylePreference} from '../core/player-name-style';
import {PlayerStyledName} from './PlayerStyledName';
import {PlayerBadges} from './PlayerBadges';
import type {PlayerBadgeIdentity} from '../core/player-badges';
import {useIdentityBadges} from '../online/PlayerBadgeProvider';

export function GuildTaggedPlayerName({name,guildTag,tagColorId,nameStyle,reduceMotion=false,style,numberOfLines,badges,accountId,plainTag=false}:{badges?:PlayerBadgeIdentity;accountId?:string;name:string;guildTag?:string|null;tagColorId?:string|null;nameStyle?:PlayerNameStylePreference;reduceMotion?:boolean;style?:StyleProp<TextStyle>;numberOfLines?:number;plainTag?:boolean}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const identity=useIdentityBadges(accountId,badges);
 const normalized=guildTag?normalizeGuildTag(guildTag):undefined;
 const tagColor=guildTagColor(tagColorId??undefined);
 return <View style={s.row}>{normalized?<Text numberOfLines={1} style={[s.tag,{color:tagColor,borderColor:tagColor},plainTag&&s.plainTag]}>[{normalized}]</Text>:null}<PlayerStyledName name={name} nameStyle={nameStyle} reduceMotion={reduceMotion} numberOfLines={numberOfLines??1} style={[s.name,style]}/><PlayerBadges identity={identity}/></View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 row:{flexDirection:'row',alignItems:'center',gap:5,minWidth:0,flexShrink:1},
 plainTag:{borderWidth:0,borderRadius:0,paddingHorizontal:0,paddingVertical:0,backgroundColor:'transparent',textShadowRadius:0},
 tag:{fontSize:9,lineHeight:13,fontWeight:'900',flexShrink:0,paddingHorizontal:4,paddingVertical:1,borderWidth:1,borderRadius:4,backgroundColor:C.dark?'rgba(8,15,24,.82)':'rgba(255,255,255,.9)',textShadowColor:C.dark?'#000':'transparent',textShadowRadius:C.dark?2:0},
 name:{color:C.text,fontWeight:'800',minWidth:0,flexShrink:1},
});}
