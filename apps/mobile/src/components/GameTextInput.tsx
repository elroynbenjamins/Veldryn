import {forwardRef,useState} from 'react';
import {TextInput,StyleSheet,type TextInputProps} from 'react-native';
import {C,radii} from '../theme/theme';

/** Shared field metrics; native text and placeholder keep the same baseline. */
export const GameTextInput=forwardRef<TextInput,TextInputProps>(function GameTextInput({style,multiline=false,editable=true,onFocus,onBlur,placeholderTextColor=C.muted,...props},ref){
  const [focused,setFocused]=useState(false);
  const metrics=StyleSheet.flatten(style);
  const minimumHeight=typeof metrics?.minHeight==='number'?metrics.minHeight:0;
  return <TextInput {...props} ref={ref} multiline={multiline} editable={editable} placeholderTextColor={placeholderTextColor} underlineColorAndroid="transparent"
    onFocus={event=>{setFocused(true);onFocus?.(event);}} onBlur={event=>{setFocused(false);onBlur?.(event);}}
    style={[s.input,style,{minHeight:Math.max(multiline?104:48,minimumHeight),paddingTop:10,paddingBottom:10,borderRadius:radii.md,includeFontPadding:false,textAlignVertical:multiline?'top':'center'},focused&&{borderColor:'#8BAFC2'},!editable&&s.disabled]}/>;
});
const s=StyleSheet.create({input:{minHeight:48,minWidth:0,fontSize:16,color:C.text,backgroundColor:'#101B27',borderWidth:1,borderColor:C.line,paddingHorizontal:14,paddingVertical:10},disabled:{opacity:.5}});
