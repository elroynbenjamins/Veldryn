import {useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {GameModalSurface,GameModalHeader} from './GameModalSurface';
import {GameButton} from './GameButton';
import {GameTextInput} from './GameTextInput';
import {useGameTheme} from '../theme/ThemeContext';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {PARTY_LANGUAGES,partyActivityLabel,type PartyActivityLevel,type PartyLanguage} from '../core/party-social';

const choices:readonly {id:PartyActivityLevel;subtitle:string;glyph:string}[]=[
 {id:'casual',subtitle:'Play whenever you like',glyph:'☕'},
 {id:'active',subtitle:'Regular play and group activities',glyph:'✦'},
 {id:'tryhard',subtitle:'Push progression and efficiency',glyph:'◆'},
];
export function PartyCreateSheet({visible,busy,activityLevel,language,minimumLevel,editing=false,error,onActivityLevel,onLanguage,onMinimumLevel,onClose,onCreate}:{
 visible:boolean;busy:boolean;editing?:boolean;activityLevel:PartyActivityLevel;language:PartyLanguage;minimumLevel:number;error?:string;
 onActivityLevel:(value:PartyActivityLevel)=>void;onLanguage:(value:PartyLanguage)=>void;onMinimumLevel:(value:number)=>void;onClose:()=>void;onCreate:()=>void;
}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const [languageExpanded,setLanguageExpanded]=useState(false);
 const languageLabel=PARTY_LANGUAGES.find(row=>row.id===language)?.label??'Any language';
 return <GameModalSurface visible={visible} presentation="sheet" onClose={()=>{if(!busy)onClose()}} dismissOnBackdrop={!busy}>
  <GameModalHeader eyebrow={editing?'PARTY SETTINGS':'NEW PARTY'} title={editing?'Party preferences':'Create a Party'} onClose={onClose} closeDisabled={busy}/>
  <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={s.content}>
   <Text style={s.subtitle}>{editing?'Change how other players discover your Party. Existing members stay.':'Choose the kind of teammates you want to play with.'}</Text>
   <View style={s.section}>
    <Text style={s.label}>Activity level</Text>
    <View accessibilityRole="radiogroup" style={s.options}>
     {choices.map(option=><Pressable key={option.id} disabled={busy} accessibilityRole="radio" accessibilityState={{checked:activityLevel===option.id,disabled:busy}} onPress={()=>onActivityLevel(option.id)} style={[s.choice,activityLevel===option.id&&s.selected]}>
      <View style={s.glyph}><Text style={s.glyphText}>{option.glyph}</Text></View>
      <View style={s.copy}><Text style={s.optionTitle}>{partyActivityLabel(option.id)}</Text><Text style={s.hint}>{option.subtitle}</Text></View>
      <Text style={[s.indicator,activityLevel===option.id&&s.indicatorSelected]}>{activityLevel===option.id?'●':'○'}</Text>
     </Pressable>)}
    </View>
   </View>
   <View style={s.section}>
    <Text style={s.label}>Preferred language</Text>
    <Pressable accessibilityRole="button" accessibilityState={{expanded:languageExpanded}} disabled={busy} onPress={()=>setLanguageExpanded(current=>!current)} style={s.select}>
     <Text style={s.optionTitle}>{languageLabel}</Text><Text style={s.chevron}>{languageExpanded?'⌃':'⌄'}</Text>
    </Pressable>
    {languageExpanded?<View style={s.languageList}>{PARTY_LANGUAGES.map(option=><Pressable key={option.id} accessibilityRole="radio" accessibilityState={{checked:language===option.id}} onPress={()=>{onLanguage(option.id);setLanguageExpanded(false)}} style={[s.languageItem,language===option.id&&s.selected]}><Text style={s.optionTitle}>{option.label}</Text>{language===option.id?<Text style={s.check}>✓</Text>:null}</Pressable>)}</View>:null}
    <Text style={s.hint}>For discovery and communication only. Players are not blocked by language.</Text>
   </View>
   <View style={s.section}>
    <Pressable accessibilityRole="checkbox" accessibilityState={{checked:minimumLevel>0}} onPress={()=>onMinimumLevel(minimumLevel>0?0:10)} disabled={busy} style={s.toggleRow}>
     <Text style={s.checkbox}>{minimumLevel>0?'☑':'☐'}</Text><View style={s.copy}><Text style={s.optionTitle}>Minimum combat level</Text><Text style={s.hint}>Optional · all levels welcome by default</Text></View>
    </Pressable>
    {minimumLevel>0?<View style={s.levelRow}><Text style={s.hint}>Required level</Text><GameTextInput accessibilityLabel="Minimum combat level" keyboardType="number-pad" value={String(minimumLevel)} maxLength={4} onChangeText={value=>onMinimumLevel(Math.min(2000,Math.max(0,Number.parseInt(value.replace(/\D/g,''),10)||0)))} style={s.levelInput}/></View>:null}
   </View>
   <View style={s.footer}><Text style={s.footerNote}>Up to 4 players · All classes welcome</Text></View>
   {error?<Text accessibilityRole="alert" style={s.error}>{error}</Text>:null}
   <GameButton title={editing?'Save preferences':'Create Party'} loading={busy} disabled={busy} onPress={onCreate}/>
  </ScrollView>
 </GameModalSurface>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 content:{gap:spacing.md,paddingVertical:spacing.md,paddingBottom:spacing.xl},
 subtitle:{...typography.body,color:C.muted,lineHeight:20},
 section:{gap:8},label:{fontSize:12,fontWeight:'900',color:C.text},options:{gap:7},
 choice:{minHeight:64,padding:10,flexDirection:'row',alignItems:'center',gap:10,borderWidth:1,borderColor:C.line,borderRadius:11,backgroundColor:C.panel2},
 selected:{borderColor:C.selectionLine,backgroundColor:C.selection},
 glyph:{height:39,width:39,borderRadius:9,alignItems:'center',justifyContent:'center',backgroundColor:C.panel,borderWidth:StyleSheet.hairlineWidth,borderColor:C.line},
 glyphText:{fontSize:21,color:C.accent},copy:{flex:1,minWidth:0,gap:3},
 optionTitle:{fontSize:13,fontWeight:'800',color:C.text},
 hint:{fontSize:11,color:C.muted,lineHeight:16},
 indicator:{fontSize:20,color:C.disabled},indicatorSelected:{color:C.good},
 select:{minHeight:48,paddingHorizontal:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderWidth:1,borderColor:C.line,borderRadius:9,backgroundColor:C.inputBg},
 chevron:{fontSize:20,color:C.muted},languageList:{gap:3,borderWidth:1,borderColor:C.line,borderRadius:9,padding:4,backgroundColor:C.panel},
 languageItem:{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:12,borderRadius:7},
 check:{color:C.good,fontWeight:'900'},
 toggleRow:{minHeight:48,paddingVertical:4,flexDirection:'row',gap:9,alignItems:'center'},
 checkbox:{fontSize:23,color:C.accent},levelRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:8,gap:12},
 levelInput:{width:92,minHeight:44,textAlign:'center',borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.inputBg,color:C.text},
 footer:{borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:C.line,paddingTop:10},footerNote:{fontSize:11,color:C.muted,textAlign:'center'},
 error:{fontSize:12,color:C.bad},
 });}
