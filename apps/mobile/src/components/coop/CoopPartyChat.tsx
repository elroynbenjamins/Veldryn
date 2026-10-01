import {useCoopStyles} from '../../theme/useCoopStyles';
import {useSocialText} from '../../i18n/social';
import {useState} from 'react';
import {StyleSheet,Text,TextInput,View} from 'react-native';
import {GameButton} from '../GameButton';
import {type CoopColors,coopSpacing,coopTypography} from '../../theme/coop-ui-theme';
import {FantasyPanel} from './CoopVisualKit';
import type {CoopChatMessage} from '../../online/coop-client';

export function CoopPartyChat({messages,busy,onSend}:{messages:CoopChatMessage[];busy?:boolean;onSend:(text:string)=>Promise<void>} ){
 const {colors:coopColors,styles:s}=useCoopStyles(makeStyles);
 const st=useSocialText();
 const [text,setText]=useState('');
 const send=async()=>{const value=text.trim();if(!value||busy)return;await onSend(value);setText('');};
 return <FantasyPanel variant="selected"><Text style={s.title}>{st("Party chat")}</Text><Text style={s.copy}>{st("Only current Live party members can read this room.")}</Text>
  <View style={s.messages}>{messages.length?messages.slice(-8).map(message=><Text key={message.id} style={s.message}><Text style={s.sender}>{message.senderName}: </Text>{message.body}</Text>):<Text style={s.copy}>{st("No messages yet.")}</Text>}</View>
  <TextInput accessibilityLabel={st("Party chat message")} value={text} onChangeText={setText} editable={!busy} maxLength={300} placeholder={st("Message your party…")} placeholderTextColor={coopColors.textMuted} style={s.input} onSubmitEditing={()=>void send()} returnKeyType="send" />
  <GameButton compact title={st("Send")} disabled={busy||!text.trim()} onPress={()=>void send()}/>
 </FantasyPanel>;
}

const makeStyles=(coopColors:CoopColors)=>StyleSheet.create({title:{...coopTypography.section,color:coopColors.text},copy:{...coopTypography.body,color:coopColors.textSecondary},messages:{gap:coopSpacing.xs,maxHeight:160},message:{...coopTypography.body,color:coopColors.text},sender:{color:coopColors.cyan,fontWeight:'900'},input:{minHeight:44,borderWidth:1,borderColor:coopColors.goldDim,color:coopColors.text,backgroundColor:coopColors.surfaceRaised,paddingHorizontal:coopSpacing.sm,paddingVertical:coopSpacing.xs}});
