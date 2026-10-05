import {useMemo,useState,type ReactNode} from 'react';
import {ActivityIndicator,Pressable,StyleSheet,View} from 'react-native';
import {chatEmoteCount} from '../core/chat-emotes';
import {useSocialText} from '../i18n/social';
import {radii,spacing,touchTargetPreferred,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {ChatEmotePicker} from './ChatEmotePicker';
import {GameTextInput} from './GameTextInput';
import {NavigationLinework} from './NavigationLinework';

type ChatComposerProps={
 value:string;
 onChangeText:(value:string)=>void;
 onSend:()=>void;
 accessibilityLabel:string;
 placeholder?:string;
 maxLength?:number;
 busy?:boolean;
 disabled?:boolean;
 editable?:boolean;
 emotes?:{
  unlockedIds?:readonly string[];
  trayIds?:readonly string[];
  bodyPresentation?:'male'|'female';
  onTrayChange?:(ids:string[])=>void|Promise<void>;
  onPick:(token:string)=>void;
 };
};

/** Presentation only: channel owners retain drafts, validation, and send requests. */
export function ChatComposer({value,onChangeText,onSend,accessibilityLabel,placeholder,maxLength=300,busy=false,disabled=false,editable=true,emotes}:ChatComposerProps){
 const st=useSocialText(),C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [focused,setFocused]=useState(false);
 const sendDisabled=busy||disabled||!editable||!value.trim();
 const send=()=>{if(!sendDisabled)onSend();};
 const row=(trigger?:ReactNode)=><View style={s.row}>
  <GameTextInput accessibilityLabel={accessibilityLabel} value={value} onChangeText={onChangeText} onSubmitEditing={send} returnKeyType="send" editable={editable} placeholder={placeholder} maxLength={maxLength} style={s.input}/>
  {trigger}
  <Pressable accessibilityRole="button" accessibilityLabel={st("Send message")} accessibilityState={{disabled:sendDisabled,busy}} disabled={sendDisabled} onPress={send} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} style={({pressed})=>[s.send,focused&&s.focused,pressed&&!sendDisabled&&s.pressed,sendDisabled&&s.disabled]}>
   {busy?<ActivityIndicator size="small" color={C.primaryButtonText}/>:<NavigationLinework name="next" size={24} color={C.primaryButtonText}/>}
  </Pressable>
 </View>;
 return <View style={s.root}>{emotes?<ChatEmotePicker {...emotes} compact usedCount={chatEmoteCount(value)} renderTrigger={row}/>:row()}</View>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{width:'100%',minWidth:0},
 // Only the input shrinks. Fixed icon targets keep Send at the far right,
 // including narrow screens and large text; the emote tray is outside this row.
 row:{width:'100%',minWidth:0,flexDirection:'row',flexWrap:'nowrap',alignItems:'center',gap:spacing.xs},
 input:{flex:1,minWidth:0},
 send:{width:touchTargetPreferred,minHeight:touchTargetPreferred,flexShrink:0,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.primaryButtonBorder,borderRadius:radii.md,backgroundColor:C.primaryButton},
 focused:{borderWidth:2},pressed:{opacity:.76},disabled:{opacity:.45},
});}
