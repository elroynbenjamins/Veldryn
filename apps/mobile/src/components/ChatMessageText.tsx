import {useMemo} from 'react';
import {Text,StyleSheet} from 'react-native';
import emoteData from '../features/chat-pilot/data/emotes.json';
import {radii,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {chatMentionSegments} from '../core/chat-mentions';

const known=new Map((emoteData as Array<{id:string;label:string}>).map(row=>[row.id,row.label]));

export function ChatMessageText({body,mentionName}:{body:string;mentionName?:string}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const parts=body.split(/(:[a-z0-9_]+:)/g);
 return <Text style={s.body}>{parts.map((part,index)=>{
  const match=/^:([a-z0-9_]+):$/.exec(part),label=match?known.get(match[1]):undefined;
  if(label)return <Text key={index} style={s.emote}>☺ {label.replace(/\s+—\s+.*/, '')}</Text>;
  return chatMentionSegments(part,mentionName).map((segment,segmentIndex)=><Text key={index+':'+segmentIndex} style={segment.kind==='self_mention'?s.selfMention:segment.kind==='mention'?s.mention:undefined}>{segment.text}</Text>);
 })}</Text>
}
function makeStyles(C:ThemeColors){return StyleSheet.create({body:{...typography.body,color:C.text},emote:{...typography.caption,color:C.accent,fontWeight:'900',backgroundColor:C.infoSurface,borderRadius:radii.sm,paddingHorizontal:4},mention:{color:C.info,fontWeight:'900'},selfMention:{color:C.warning,fontWeight:'900',backgroundColor:C.warningSurface}});}
