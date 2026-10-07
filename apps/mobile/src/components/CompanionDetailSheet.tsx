import {useState,type ReactNode} from 'react';
import {ScrollView,Text,View,useWindowDimensions} from 'react-native';
import {GameButton} from './GameButton';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import {useGameTheme} from '../theme/ThemeContext';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {companionTranslator} from '../i18n/companions';

/** A single entry point keeps secondary choices out of the main activity flow. */
export function CompanionDetailSheet({title,summary,children,reduceMotion=false}:{title:string;summary?:string;children:ReactNode;reduceMotion?:boolean}){
 const [open,setOpen]=useState(false),C=useGameTheme(),{height}=useWindowDimensions();
 return <View style={{gap:6}}><GameButton title={title} tone="secondary" onPress={()=>setOpen(true)}/>{summary?<Text style={{color:C.muted,fontSize:12}}>{summary}</Text>:null}<GameModalSurface visible={open} onClose={()=>setOpen(false)} reduceMotion={reduceMotion} surfaceStyle={{maxHeight:height*.9}}><GameModalHeader title={title} onClose={()=>setOpen(false)}/><ScrollView contentContainerStyle={{gap:12,paddingBottom:20}}>{children}<GameButton title="Done" onPress={()=>setOpen(false)}/></ScrollView></GameModalSurface></View>;
}
