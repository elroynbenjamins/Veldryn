import {useCoopStyles} from '../../theme/useCoopStyles';
import {useSocialText} from '../../i18n/social';
import {useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {ChatComposer} from '../ChatComposer';
import {type CoopColors,coopSpacing,coopTypography} from '../../theme/coop-ui-theme';
import {FantasyPanel} from './CoopVisualKit';
import type {CoopChatMessage} from '../../online/coop-client';

export function CoopPartyChat({messages,busy,onSend}:{messages:CoopChatMessage[];busy?:boolean;onSend:(text:string)=>Promise<void>} ){
 const {styles:s}=useCoopStyles(makeStyles);
 const st=useSocialText();
 const [text,setText]=useState('');
 const [sending,setSending]=useState(false);
 const [error,setError]=useState('');
 const send=async()=>{
  const value=text.trim();
  if(!value||busy||sending)return;
  setSending(true);setError('');
  try{await onSend(value);setText('');}
  catch{setError(st("Message could not be sent. Try again."));}
  finally{setSending(false);}
 };
 return <FantasyPanel variant="selected"><Text style={s.title}>{st("Party chat")}</Text><Text style={s.copy}>{st("Only current Live party members can read this room.")}</Text>
  <View style={s.messages}>{messages.length?messages.slice(-8).map(message=><Text key={message.id} style={s.message}><Text style={s.sender}>{message.senderName}: </Text>{message.body}</Text>):<Text style={s.copy}>{st("No messages yet.")}</Text>}</View>
  {error?<Text accessibilityRole="alert" style={s.error}>{error}</Text>:null}
  <ChatComposer accessibilityLabel={st("Party chat message")} value={text} onChangeText={setText} onSend={()=>void send()} busy={busy||sending} editable={!busy&&!sending} placeholder={st("Message your party…")}/>
 </FantasyPanel>;
}

const makeStyles=(coopColors:CoopColors)=>StyleSheet.create({title:{...coopTypography.section,color:coopColors.text},copy:{...coopTypography.body,color:coopColors.textSecondary},messages:{gap:coopSpacing.xs,maxHeight:160},message:{...coopTypography.body,color:coopColors.text},sender:{color:coopColors.cyan,fontWeight:'900'},error:{...coopTypography.meta,color:coopColors.danger}});
