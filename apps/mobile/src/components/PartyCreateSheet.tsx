import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {Pressable,ScrollView,Text,View} from 'react-native';
import {GameModalSurface,GameModalHeader} from './GameModalSurface';
import {GameButton} from './GameButton';
import {useGameTheme} from '../theme/ThemeContext';
import {useSocialText,socialLabel} from '../i18n/social';
import type {PartyFocus,PartyRole} from '../core/party-social';
export function PartyCreateSheet({visible,busy,focus,role,error,onFocus,onRole,onClose,onCreate}:{visible:boolean;busy:boolean;focus:PartyFocus;role:PartyRole;error?:string;onFocus:(value:PartyFocus)=>void;onRole:(value:PartyRole)=>void;onClose:()=>void;onCreate:()=>void}){
 const language=useGameLanguage(),C=useGameTheme();
 const group=(label:string,values:string[],selected:string,onSelect:(value:string)=>void)=><View style={{gap:8}}><Text style={{color:C.muted,fontSize:12}}>{socialLabel(language,label)}</Text><View accessibilityRole="radiogroup" style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{values.map(value=><Pressable key={value} disabled={busy} accessibilityRole="radio" accessibilityState={{checked:value===selected,disabled:busy}} onPress={()=>onSelect(value)} style={{flex:1,minWidth:80,minHeight:48,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:value===selected?C.selectionLine:C.line,borderRadius:10,backgroundColor:value===selected?C.selection:C.panel}}><Text style={{color:value===selected?C.text:C.muted,fontSize:14,textTransform:'capitalize'}}>{socialLabel(language,value)}</Text></Pressable>)}</View></View>;
 return <GameModalSurface visible={visible} onClose={()=>{if(!busy)onClose()}} dismissOnBackdrop={!busy}><GameModalHeader eyebrow={'NEW PARTY'} title={'Set your direction'} onClose={onClose} closeDisabled={busy}/><ScrollView contentContainerStyle={{gap:20,paddingVertical:18}}><Text style={{color:C.muted,fontSize:14,lineHeight:21}}>Choose your focus and role, then invite your team. Recruitment details can be added after creating your party.</Text>{group('Party focus',['combat','skilling','mixed'],focus,value=>onFocus(value as PartyFocus))}{group('Your role',['damage','tank','support'],role,value=>onRole(value as PartyRole))}{error?<Text accessibilityRole="alert" style={{color:C.bad}}>{error}</Text>:null}<GameButton title={'Create Party'} loading={busy} onPress={onCreate}/></ScrollView></GameModalSurface>;
}
