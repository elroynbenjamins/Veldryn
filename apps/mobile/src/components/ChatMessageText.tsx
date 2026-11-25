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
 const preview=numberOfLines!==undefined;
 // Reuse parsed mentions and image elements during feed updates and translation state changes.
 const {content,hasArtwork}=useMemo(()=>{
  let hasArtwork=false;
  const content=body.split(/(:[a-z0-9_]+:)/g).flatMap((part,index)=>{
   if(!part)return [];
   const match=/^:([a-z0-9_]+):$/.exec(part),label=match?known.get(match[1]):undefined,art=match&&label?chatEmoteArtwork(match[1]):undefined;
   if(label&&art){
    hasArtwork=true;
    return [<Image key={index} accessible accessibilityLabel={label} source={art} style={preview?(compact?s.previewEmoteImageCompact:s.previewEmoteImage):(compact?s.emoteImageCompact:s.emoteImage)} resizeMode="contain"/>];
   }
   if(label)return [<Text key={index} style={s.emoteFallback}>☺ {label.replace(/\s+—\s+.*/, '')}</Text>];
   return chatMentionSegments(part,mentionName).map((segment,segmentIndex)=><Text key={index+':'+segmentIndex} style={segment.kind==='self_mention'?s.selfMention:segment.kind==='mention'?s.mention:undefined}>{segment.text}</Text>);
  });
  return {content,hasArtwork};
 },[body,mentionName,compact,preview,s]);
 // Preserve larger caller line heights and protect line-limited previews from clipping.
 const baseStyle=[s.body,compact&&s.compact,style];
 const minEmoteLine=preview?(compact?s.previewEmoteLineCompact:s.previewEmoteLine):(compact?s.emoteLineCompact:s.emoteLine);
 const artworkClearance=hasArtwork?{lineHeight:Math.max(StyleSheet.flatten(baseStyle)?.lineHeight??0,minEmoteLine.lineHeight)}:undefined;
 return <Text numberOfLines={numberOfLines} style={[...baseStyle,artworkClearance]}>{content}</Text>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({body:{...typography.body,color:C.text,fontSize:16,lineHeight:28},compact:{fontSize:15,lineHeight:25},emoteImage:{width:36,height:36},emoteImageCompact:{width:32,height:32},emoteLine:{lineHeight:40},emoteLineCompact:{lineHeight:36},previewEmoteImage:{width:24,height:24},previewEmoteImageCompact:{width:21,height:21},previewEmoteLine:{lineHeight:26},previewEmoteLineCompact:{lineHeight:23},emoteFallback:{color:C.accent,fontWeight:'900',backgroundColor:C.infoSurface,borderRadius:radii.sm,paddingHorizontal:4},mention:{color:C.info,fontWeight:'900'},selfMention:{color:C.warning,fontWeight:'900',backgroundColor:C.warningSurface}});}
