import {useRef,useState,useMemo} from 'react';
import {Pressable,StyleSheet,TextInput,View,type StyleProp,type TextInputProps,type ViewStyle} from 'react-native';
import {GameTextInput} from './GameTextInput';
import {UiIcon} from './UiIcon';
import {radii,equipmentTheme,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

type Props=Omit<TextInputProps,'style'|'value'|'onChangeText'|'multiline'> & {value:string;onChangeText:(value:string)=>void;style?:StyleProp<ViewStyle>};
export function SearchField({value,onChangeText,style,onFocus,onBlur,editable=true,...props}:Props){
 const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);
  const ref=useRef<TextInput>(null),[focused,setFocused]=useState(false);
  return <View style={[s.field,style,focused&&s.focused,!editable&&s.disabled]}>
    <UiIcon name="search" size={24} muted={!focused}/>
    <GameTextInput {...props} ref={ref} value={value} onChangeText={onChangeText} editable={editable} multiline={false}
      accessibilityLabel={props.accessibilityLabel??'Search'} returnKeyType={props.returnKeyType??'search'} autoCorrect={props.autoCorrect??false}
      onFocus={event=>{setFocused(true);onFocus?.(event);}} onBlur={event=>{setFocused(false);onBlur?.(event);}} style={s.input}/>
    {!!value&&editable&&<Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={()=>{onChangeText('');ref.current?.focus();}} style={s.clear}><UiIcon name="close" size={24}/></Pressable>}
  </View>;
}
function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({field:{minHeight:48,minWidth:0,flexDirection:'row',alignItems:'center',paddingLeft:12,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.inputBg},focused:{borderColor:C.selectionLine},disabled:{opacity:.5},input:{flex:1,minWidth:0,borderWidth:0,backgroundColor:'transparent',paddingHorizontal:10,paddingVertical:10},clear:{width:44,minHeight:48,alignItems:'center',justifyContent:'center'}});}
