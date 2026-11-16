import {useCoopStyles} from '../../theme/useCoopStyles';
import {useSocialText} from '../../i18n/social';
import {useRef,useState,type ElementRef} from 'react';
import {ScrollView,StyleSheet,Text,View} from 'react-native';
import {ChatTranslateAction,ChatTranslationMessage,useManualChatTranslation} from '../ChatTranslatableBody';
import {ChatComposer} from '../ChatComposer';
import {type CoopColors,coopSpacing,coopTypography} from '../../theme/coop-ui-theme';
import {FantasyPanel} from './CoopVisualKit';
import type {CoopChatMessage} from '../../online/coop-client';

export function CoopPartyChat({messages,busy,onSend}:{messages:CoopChatMessage[];busy?:boolean;onSend:(text:string)=>Promise<void>} ){
 const {styles:s}=useCoopStyles(makeStyles);
 const st=useSocialText();
 const messagesScroll=useRef<ElementRef<typeof ScrollView>>(null);
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
 return <FantasyPanel variant="selected">
  <ScrollView ref={messagesScroll} style={s.messages} contentContainerStyle={s.messageList} keyboardShouldPersistTaps="handled" onContentSizeChange={()=>messagesScroll.current?.scrollToEnd({animated:false})} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} nestedScrollEnabled>
   {messages.length?messages.slice(-20).map(message=><CoopPartyMessageRow key={message.id} message={message}/>):<Text style={s.copy}>{st("No messages yet.")}</Text>}
  </ScrollView>
  {error?<Text accessibilityRole="alert" style={s.error}>{error}</Text>:null}
  <ChatComposer accessibilityLabel={st("Party chat message")} value={text} onChangeText={setText} onSend={()=>void send()} busy={busy||sending} editable={!busy&&!sending} placeholder={st("Message your party…")}/>
 </FantasyPanel>;
}

function CoopPartyMessageRow({message}:{message:CoopChatMessage}){
 const {styles:s}=useCoopStyles(makeStyles);
 const translation=useManualChatTranslation(message.id,message.body);
 return <View>
  <View style={s.messageHeader}>
   <Text style={[s.message,s.sender]}>{message.senderName}:</Text>
   <ChatTranslateAction controller={translation}/>
  </View>
  <ChatTranslationMessage controller={translation} compact style={s.message}/>
 </View>;
}

const makeStyles=(coopColors:CoopColors)=>StyleSheet.create({messageHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',minHeight:28},copy:{...coopTypography.body,color:coopColors.textSecondary},messages:{maxHeight:220},messageList:{gap:coopSpacing.xs},message:{...coopTypography.body,color:coopColors.text},sender:{color:coopColors.cyan,fontWeight:'900'},error:{...coopTypography.meta,color:coopColors.danger}});
