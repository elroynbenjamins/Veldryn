import {useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {GameModalSurface,GameModalHeader} from './GameModalSurface';
import {GameButton} from './GameButton';
import {GameTextInput} from './GameTextInput';
import {useGameTheme} from '../theme/ThemeContext';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {PARTY_LANGUAGES,partyActivityLabel,type PartyActivityLevel,type PartyLanguage} from '../core/party-social';
import {useSocialText} from '../i18n/social';

const choices:readonly {id:PartyActivityLevel;subtitle:string;glyph:string}[]=[
 {id:'casual',subtitle:'Play whenever you like',glyph:'☕'},
 {id:'active',subtitle:'Regular play and group activities',glyph:'✦'},
 {id:'tryhard',subtitle:'Push progression and efficiency',glyph:'◆'},
];

// Crisp, theme-aware pixel artwork. Rendered in-app so the icons stay sharp at every density.
type PreferenceIconKind='language'|'combat';
const preferencePixelArt:Record<PreferenceIconKind,readonly string[]>={
 language:[
  '....aaaaa....','..aa.....aa..','.a...b.b...a.','a...b...b...a',
  'a...b...b...a','a...b...b...a','abbbbbbbbbbba','a...b...b...a',
  'a...b...b...a','a...b...b...a','.a...b.b...a.','..aa.....aa..',
  '....aaaaa....',
 ],
 combat:[
  '..aa.....aa..','...aa...aa...','....aa.aa....','.....aaa.....',
  '......a......','....bbabb....','.....bbb.....','....cc.cc....',
  '...cc...cc...','..cc.....cc..','.cc.......cc.','.............',
  '.............',
 ],
};
function PreferencePixelIcon({kind,colors}:{kind:PreferenceIconKind;colors:ThemeColors}){
 return <View accessible={false} style={{width:26,height:26}}>
  {preferencePixelArt[kind].flatMap((row,y)=>Array.from(row,(pixel,x)=>pixel==='.'?null:
   <View key={x+'-'+y} style={{position:'absolute',left:x*2,top:y*2,width:2,height:2,backgroundColor:pixel==='a'?colors.text:pixel==='b'?colors.accent:colors.muted}}/>) )}
 </View>;
}
export function PartyCreateSheet({visible,busy,activityLevel,language,minimumLevel,shortName,editing=false,error,onActivityLevel,onLanguage,onMinimumLevel,onShortName,onClose,onCreate}:{
 visible:boolean;busy:boolean;editing?:boolean;activityLevel:PartyActivityLevel;language:PartyLanguage;minimumLevel:number;shortName:string;error?:string;
 onActivityLevel:(value:PartyActivityLevel)=>void;onLanguage:(value:PartyLanguage)=>void;onMinimumLevel:(value:number)=>void;onShortName:(value:string)=>void;onClose:()=>void;onCreate:()=>void;
}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]),st=useSocialText();
 const [languageExpanded,setLanguageExpanded]=useState(false);
 const languageLabel=language==='any'?st('Any language'):PARTY_LANGUAGES.find(row=>row.id===language)?.label??st('Any language');
 return <GameModalSurface visible={visible} presentation="sheet" onClose={()=>{if(!busy)onClose()}} dismissOnBackdrop={!busy}>
  <GameModalHeader eyebrow={editing?st('PARTY SETTINGS'):st('NEW PARTY')} title={editing?st('Party preferences'):st('Create a Party')} onClose={onClose} closeDisabled={busy}/>
  <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={s.content}>
   <Text style={s.subtitle}>{editing?st('Change how other players discover your Party. Existing members stay.'):st('Choose the kind of teammates you want to play with.')}</Text>
   {!editing?<View style={s.section}>
    <Text style={s.label}>{st('Party name')}</Text>
    <GameTextInput accessibilityLabel={st('Party name')} autoCapitalize="characters" autoCorrect={false} maxLength={5} value={shortName} placeholder="FROST" onChangeText={value=>onShortName(value.toUpperCase().replace(/[^A-Z]/g,'').slice(0,5))} editable={!busy}/>
    <Text style={s.hint}>{st('3–5 letters, unique across active Parties. The name can only be changed once every six months.')} · {shortName.length}/5</Text>
   </View>:null}
   <View style={s.section}>
    <Text style={s.label}>{st('Activity level')}</Text>
    <View accessibilityRole="radiogroup" style={s.options}>
     {choices.map(option=><Pressable key={option.id} disabled={busy} accessibilityRole="radio" accessibilityState={{checked:activityLevel===option.id,disabled:busy}} onPress={()=>onActivityLevel(option.id)} style={[s.choice,activityLevel===option.id&&s.selected]}>
      <View style={s.glyph}><Text style={s.glyphText}>{option.glyph}</Text></View>
      <View style={s.copy}><Text style={s.optionTitle}>{st(partyActivityLabel(option.id)==='Casual'?'Casual':partyActivityLabel(option.id)==='Active'?'Active play':'Tryhard')}</Text><Text style={s.hint}>{st(option.subtitle==='Play whenever you like'?'Play whenever you like':option.subtitle==='Regular play and group activities'?'Regular play and group activities':'Push progression and efficiency')}</Text></View>
      <Text style={[s.indicator,activityLevel===option.id&&s.indicatorSelected]}>{activityLevel===option.id?'●':'○'}</Text>
     </Pressable>)}
    </View>
   </View>
   <View style={s.section}>
    <Text style={s.label}>{st('Preferred language')}</Text>
    <Pressable accessibilityRole="button" accessibilityState={{expanded:languageExpanded}} disabled={busy} onPress={()=>setLanguageExpanded(current=>!current)} style={s.select}>
     <View style={s.selectContent}><View style={s.glyph}><PreferencePixelIcon kind="language" colors={C}/></View><Text style={s.optionTitle}>{languageLabel}</Text></View>
     <Text style={s.chevron}>{languageExpanded?'⌃':'⌄'}</Text>
    </Pressable>
    {languageExpanded?<View style={s.languageList}>{PARTY_LANGUAGES.map(option=><Pressable key={option.id} accessibilityRole="radio" accessibilityState={{checked:language===option.id}} onPress={()=>{onLanguage(option.id);setLanguageExpanded(false)}} style={[s.languageItem,language===option.id&&s.selected]}><Text style={s.optionTitle}>{option.id==='any'?st('Any language'):option.label}</Text>{language===option.id?<Text style={s.check}>✓</Text>:null}</Pressable>)}</View>:null}
    <Text style={s.hint}>{st('For discovery and communication only. Players are not blocked by language.')}</Text>
   </View>
   <View style={s.section}>
    <Pressable accessibilityRole="checkbox" accessibilityState={{checked:minimumLevel>0}} onPress={()=>onMinimumLevel(minimumLevel>0?0:10)} disabled={busy} style={s.toggleRow}>
     <View style={s.glyph}><PreferencePixelIcon kind="combat" colors={C}/></View>
     <View style={s.copy}><Text style={s.optionTitle}>{st('Minimum combat level')}</Text><Text style={s.hint}>{st('Optional · all levels welcome by default')}</Text></View>
     <Text style={s.checkbox}>{minimumLevel>0?'☑':'☐'}</Text>
    </Pressable>
    {minimumLevel>0?<View style={s.levelRow}><Text style={s.hint}>{st('Required level')}</Text><GameTextInput accessibilityLabel={st('Minimum combat level')} keyboardType="number-pad" value={String(minimumLevel)} maxLength={4} onChangeText={value=>onMinimumLevel(Math.min(2000,Math.max(0,Number.parseInt(value.replace(/\D/g,''),10)||0)))} style={s.levelInput}/></View>:null}
   </View>
   <View style={s.footer}><Text style={s.footerNote}>{st('Up to 4 players · All classes welcome')}</Text></View>
   {error?<Text accessibilityRole="alert" style={s.error}>{error}</Text>:null}
   <GameButton title={editing?st('Save preferences'):st('Create Party')} loading={busy} disabled={busy||(!editing&&!/^[A-Z]{3,5}$/.test(shortName))} onPress={onCreate}/>
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
 select:{minHeight:48,paddingHorizontal:10,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderWidth:1,borderColor:C.line,borderRadius:9,backgroundColor:C.inputBg},
 selectContent:{flex:1,minWidth:0,flexDirection:'row',alignItems:'center',gap:10},
 chevron:{fontSize:20,color:C.muted},languageList:{gap:3,borderWidth:1,borderColor:C.line,borderRadius:9,padding:4,backgroundColor:C.panel},
 languageItem:{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:12,borderRadius:7},
 check:{color:C.good,fontWeight:'900'},
 toggleRow:{minHeight:50,paddingHorizontal:10,flexDirection:'row',gap:10,alignItems:'center',borderWidth:1,borderColor:C.line,borderRadius:9,backgroundColor:C.inputBg},
 checkbox:{fontSize:23,color:C.accent},levelRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:8,gap:12},
 levelInput:{width:92,minHeight:44,textAlign:'center',borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.inputBg,color:C.text},
 footer:{borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:C.line,paddingTop:10},footerNote:{fontSize:11,color:C.muted,textAlign:'center'},
 error:{fontSize:12,color:C.bad},
 });}
