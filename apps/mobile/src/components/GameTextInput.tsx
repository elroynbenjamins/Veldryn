import {forwardRef,useMemo,useState} from 'react';
import {TextInput,StyleSheet,type TextInputProps} from 'react-native';
import {radii,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

/** Shared field metrics; native text and placeholder keep the same baseline. */
export const GameTextInput=forwardRef<TextInput,TextInputProps>(function GameTextInput({style,multiline=false,editable=true,onFocus,onBlur,placeholderTextColor,...props},ref){
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
  const [focused,setFocused]=useState(false);
  const metrics=StyleSheet.flatten(style);
  const minimumHeight=typeof metrics?.minHeight==='number'?metrics.minHeight:0;
  return <TextInput {...props} ref={ref} multiline={multiline} editable={editable} placeholderTextColor={placeholderTextColor??C.muted} underlineColorAndroid="transparent"
    onFocus={event=>{setFocused(true);onFocus?.(event);}} onBlur={event=>{setFocused(false);onBlur?.(event);}}
    style={[s.input,style,{minHeight:Math.max(multiline?104:48,minimumHeight),paddingTop:10,paddingBottom:10,borderRadius:radii.md,includeFontPadding:false,textAlignVertical:multiline?'top':'center'},focused&&{borderColor:C.selectionLine},!editable&&s.disabled]}/>;
});
function makeStyles(C:ThemeColors){return StyleSheet.create({input:{minHeight:48,minWidth:0,fontSize:16,color:C.text,backgroundColor:C.inputBg,borderWidth:1,borderColor:C.line,paddingHorizontal:14,paddingVertical:10},disabled:{opacity:.5}})}
