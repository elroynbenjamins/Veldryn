import {useMemo} from 'react';
import {Image,Text,StyleSheet,type StyleProp,type TextStyle} from 'react-native';
import emoteData from '../features/chat-pilot/data/emotes.json';
import {radii,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {chatMentionSegments} from '../core/chat-mentions';
import {chatEmoteArtwork} from '../theme/chat-emote-assets';

const known=new Map((emoteData as Array<{id:string;label:string}>).map(row=>[row.id,row.label]));

export function ChatMessageText({body,mentionName,compact=false,numberOfLines,style}:{body:string;mentionName?:string;compact?:boolean;numberOfLines?:number;style?:StyleProp<TextStyle>}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const parts=body.split(/(:[a-z0-9_]+:)/g);
 return <Text numberOfLines={numberOfLines} style={[s.body,compact&&s.compact,style]}>{parts.map((part,index)=>{
  const match=/^:([a-z0-9_]+):$/.exec(part),label=match?known.get(match[1]):undefined,art=match?chatEmoteArtwork(match[1]):undefined;
  if(label&&art)return <Image key={index} accessible accessibilityLabel={label} source={art} style={compact?s.emoteImageCompact:s.emoteImage} resizeMode="contain"/>;
  if(label)return <Text key={index} style={s.emoteFallback}>☺ {label.replace(/\s+—\s+.*/, '')}</Text>;
  return chatMentionSegments(part,mentionName).map((segment,segmentIndex)=><Text key={index+':'+segmentIndex} style={segment.kind==='self_mention'?s.selfMention:segment.kind==='mention'?s.mention:undefined}>{segment.text}</Text>);
 })}</Text>
}
function makeStyles(C:ThemeColors){return StyleSheet.create({body:{...typography.body,color:C.text},compact:{fontSize:11,lineHeight:16},emoteImage:{width:28,height:28},emoteImageCompact:{width:17,height:17},emoteFallback:{...typography.caption,color:C.accent,fontWeight:'900',backgroundColor:C.infoSurface,borderRadius:radii.sm,paddingHorizontal:4},mention:{color:C.info,fontWeight:'900'},selfMention:{color:C.warning,fontWeight:'900',backgroundColor:C.warningSurface}});}
