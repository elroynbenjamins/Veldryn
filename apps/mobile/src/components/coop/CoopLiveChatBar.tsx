import {useEffect,useRef,useState} from 'react';
import {Keyboard,KeyboardAvoidingView,Modal,Platform,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {useSocialText} from '../../i18n/social';
import type {CoopChatMessage} from '../../online/coop-client';
import {useCoopStyles} from '../../theme/useCoopStyles';
import {type CoopColors,coopTypography} from '../../theme/coop-ui-theme';
import {CoopPartyChat} from './CoopPartyChat';

/** Always-visible Live-run party chat preview; no global/World chat in dungeon combat. */
export function CoopLiveChatBar({messages,onSend,reduceMotion=false}:{messages:CoopChatMessage[];onSend:(text:string)=>Promise<void>;reduceMotion?:boolean}){
 const st=useSocialText();
 const {styles:s}=useCoopStyles(makeStyles);
 const [open,setOpen]=useState(false);
 const [seenThrough,setSeenThrough]=useState<string|undefined>();
 const initialized=useRef(false);
 const latest=messages[messages.length-1];
 // Initial history is not unread. Later messages count until the chat is opened.
 useEffect(()=>{
  if(!initialized.current&&latest){initialized.current=true;setSeenThrough(latest.id);return;}
  if(open&&latest&&latest.id!==seenThrough)setSeenThrough(latest.id);
 },[latest?.id,open,seenThrough]);
 const seenIndex=seenThrough?messages.findIndex(message=>message.id===seenThrough):-1;
 const unread=!open&&initialized.current&&seenThrough&&latest?.id!==seenThrough
  ?seenIndex>=0?Math.max(0,messages.length-seenIndex-1):1:0;
 const close=()=>{Keyboard.dismiss();setSeenThrough(latest?.id);setOpen(false);};
 const expand=()=>{setSeenThrough(latest?.id);setOpen(true);};
 return <>
  <Pressable accessibilityRole="button" accessibilityLabel={st('Open party chat')} accessibilityHint={st('Message your party…')} accessibilityState={{expanded:open}} onPress={expand} style={({pressed})=>[s.dock,pressed&&s.pressed]}>
   <View style={s.channel}><Text style={s.channelTitle}>{st('Party Chat')}</Text><Text style={s.channelMode}>{st('Live')}</Text></View>
   <Text numberOfLines={1} style={s.preview}>{latest?<><Text style={s.sender}>{latest.senderName}: </Text>{latest.body}</>:st('No messages yet.')}</Text>
   {unread>0?<View style={s.unread}><Text style={s.unreadText}>{unread>9?'9+':unread}</Text></View>:null}
   <Text style={s.arrow}>›</Text>
  </Pressable>
  <Modal visible={open} transparent statusBarTranslucent animationType={reduceMotion?'none':'fade'} onRequestClose={close}>
   <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS==='ios'?'padding':'height'}>
    <Pressable style={StyleSheet.absoluteFillObject} onPress={close} accessibilityLabel={st('Close chat')}/>
    <View style={s.sheet} accessibilityViewIsModal>
     <View style={s.header}><View style={s.headerTitle}><Text style={s.title}>{st('Party Chat')}</Text><Text style={s.subtitle}>{st('Only current Live party members can read this room.')}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={st('Close chat')} onPress={close} style={s.close}><Text style={s.closeText}>×</Text></Pressable></View>
     <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={s.body}>
      <CoopPartyChat messages={messages} onSend={onSend}/>
     </ScrollView>
    </View>
   </KeyboardAvoidingView>
  </Modal>
 </>;
}

const makeStyles=(C:CoopColors)=>StyleSheet.create({
 dock:{minHeight:54,flexDirection:'row',alignItems:'center',gap:10,paddingVertical:7,paddingHorizontal:12,borderTopWidth:1,borderColor:C.goldDim,backgroundColor:C.surfaceRaised},
 channel:{width:70,flexShrink:0,gap:2,borderRightWidth:StyleSheet.hairlineWidth,borderRightColor:C.line,paddingRight:8},
 channelTitle:{fontSize:11,fontWeight:'800',color:C.cyan},
 channelMode:{fontSize:9,fontWeight:'700',color:C.textMuted,textTransform:'uppercase',letterSpacing:.5},
 preview:{flex:1,minWidth:0,...coopTypography.meta,color:C.textSecondary},
 sender:{fontWeight:'800',color:C.cyan},
 arrow:{fontSize:23,color:C.cyan},
 unread:{minWidth:21,height:21,borderRadius:11,paddingHorizontal:4,alignItems:'center',justifyContent:'center',backgroundColor:C.cyan},
 unreadText:{fontSize:11,fontWeight:'900',color:C.background},
 pressed:{opacity:.7},
 overlay:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(0,0,0,.66)'},
 sheet:{maxHeight:'78%',borderTopLeftRadius:16,borderTopRightRadius:16,borderWidth:1,borderBottomWidth:0,borderColor:C.goldDim,backgroundColor:C.background,paddingBottom:18},
 header:{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:16,paddingTop:16,paddingBottom:10},
 headerTitle:{flex:1,minWidth:0,gap:4},
 title:{...coopTypography.section,color:C.text},
 subtitle:{...coopTypography.meta,color:C.textSecondary},
 close:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'},
 closeText:{fontSize:27,color:C.text},
 body:{padding:12,paddingTop:2},
});
