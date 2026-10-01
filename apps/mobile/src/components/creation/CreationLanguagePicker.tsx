import {useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {LANGUAGE_NAMES,SUPPORTED_LANGUAGES,t,type Language} from '../../i18n';
import {useGameTheme} from '../../theme/ThemeContext';
import type {ThemeColors} from '../../theme/theme';
import {GameModalHeader,GameModalSurface} from '../GameModalSurface';
import {UiIcon} from '../UiIcon';

export function CreationLanguagePicker({language,onChange,disabled=false}:{language:Language;onChange:(language:Language)=>void;disabled?:boolean}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]),[open,setOpen]=useState(false);
 const {height}=useWindowDimensions();
 return <>
  <Pressable accessibilityRole="button" accessibilityLabel={`${t(language,'settings.language')}: ${LANGUAGE_NAMES[language]}`} accessibilityState={{expanded:open,disabled}} aria-expanded={open} disabled={disabled} onPress={()=>setOpen(true)} style={({pressed})=>[s.trigger,pressed&&s.pressed]}>
   <UiIcon name="world" size={20}/><Text style={s.current}>{LANGUAGE_NAMES[language]}</Text><View style={s.chevron}><UiIcon name="next" size={14}/></View>
  </Pressable>
  <GameModalSurface visible={open&&!disabled} presentation="dialog" surfaceStyle={{maxHeight:Math.max(200,height-80)}} onClose={()=>setOpen(false)}>
   <GameModalHeader title={t(language,'settings.language')} onClose={()=>setOpen(false)}/>
   <ScrollView style={s.list} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
    {SUPPORTED_LANGUAGES.map(id=><Pressable key={id} accessibilityRole="radio" accessibilityLabel={LANGUAGE_NAMES[id]} accessibilityState={{checked:language===id}} aria-checked={language===id} onPress={()=>{onChange(id);setOpen(false)}} style={({pressed})=>[s.option,language===id&&s.selected,pressed&&s.pressed]}>
     <Text style={s.code}>{id.toUpperCase()}</Text><Text style={s.name}>{LANGUAGE_NAMES[id]}</Text><View style={[s.radio,language===id&&s.radioSelected]}>{language===id&&<View style={s.dot}/>}</View>
    </Pressable>)}
   </ScrollView>
  </GameModalSurface>
 </>;
}

function styles(C:ThemeColors){return StyleSheet.create({
 trigger:{minHeight:44,maxWidth:'56%',flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:10,borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.panel},current:{fontSize:12,lineHeight:18,fontWeight:'700',color:C.text,flexShrink:1},chevron:{transform:[{rotate:'90deg'}]},pressed:{opacity:.7},list:{flexShrink:1,marginTop:8},option:{minHeight:52,flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:12,paddingVertical:10,borderRadius:8,marginBottom:4},selected:{backgroundColor:C.selection},code:{width:28,fontSize:11,lineHeight:18,fontWeight:'800',color:C.muted},name:{flex:1,fontSize:15,lineHeight:22,color:C.text,fontWeight:'600'},radio:{width:20,height:20,borderRadius:10,borderWidth:1,borderColor:C.lineStrong,alignItems:'center',justifyContent:'center'},radioSelected:{borderColor:C.accent},dot:{width:10,height:10,borderRadius:5,backgroundColor:C.accent},
});}
