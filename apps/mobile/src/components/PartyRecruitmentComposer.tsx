import {useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {GameTextInput as TextInput} from './GameTextInput';
import {GameButton} from './GameButton';
import {useGameTheme} from '../theme/ThemeContext';
import {radii,spacing,type ThemeColors} from '../theme/theme';
import {PARTY_LANGUAGES,normalizedPartyPreferences,type PartyLanguage,type PersistentPartySummary,type RecruitmentActivityLevel} from '../core/party-social';
import type {PublishRecruitmentInput} from '../online/party-social';
import {useSocialText} from '../i18n/social';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {partyMinimumLevelLabel} from '../i18n/party-surface-de';

const activityChoices:readonly {id:RecruitmentActivityLevel;label:string}[]=[
 {id:'casual',label:'Casual'},
 {id:'regular',label:'Regular'},
 {id:'active',label:'Active'},
 {id:'hardcore',label:'Tryhard'},
];

/** One lightweight advert editor for LFG and LFM; dungeon roles stay in dungeon setup. */
export function PartyRecruitmentComposer({initial,party,busy,onPublish,onCancel}:{initial:PublishRecruitmentInput;party?:PersistentPartySummary|null;busy:boolean;onPublish:(value:PublishRecruitmentInput)=>void;onCancel:()=>void}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]),locale=useGameLanguage(),st=useSocialText(),[draft,setDraft]=useState(initial),[languageOpen,setLanguageOpen]=useState(false);
 const [advertActivityLevel,setAdvertActivityLevel]=useState<RecruitmentActivityLevel>(initial.activityLevel??'active');
 const [seekerLanguage,setSeekerLanguage]=useState<PartyLanguage>((PARTY_LANGUAGES.some(item=>item.id===initial.language)?initial.language:'any') as PartyLanguage);
 const recruiting=draft.postType==='party_recruiting',prefs=normalizedPartyPreferences(party);
 const language=recruiting?prefs.language:seekerLanguage;
 const languageName=language==='any'?st('Any language'):PARTY_LANGUAGES.find(item=>item.id===language)?.label??st('Any language');
 const patch=(change:Partial<PublishRecruitmentInput>)=>setDraft(current=>({...current,...change}));
 const publish=()=>{
  if(draft.title.trim().length<3)return;
  onPublish({...draft,durationDays:1,roles:[],requiredRoleCounts:{},flexibleRoles:true,
    activityLevel:advertActivityLevel,language:language==='any'?undefined:language,
    minCombatLevel:recruiting?(prefs.minimumLevel||undefined):undefined,focus:'mixed',
    activityKind:undefined,goal:undefined,startMode:undefined,scheduledAt:undefined,sessionMinutes:undefined,voiceMode:undefined});
 };
 return <View style={s.root}>
  <View style={s.head}>
   <View style={s.flex}><Text style={s.eyebrow}>{st('PARTY RECRUITMENT')}</Text><Text style={s.heading}>{recruiting?st('Find teammates'):st('Looking for a Party')}</Text><Text style={s.hint}>{recruiting?st('Make your Party easy for others to find.'):st('Tell Party leaders what you are looking for.')}</Text></View>
   <View style={s.pill}><Text style={s.pillText}>{recruiting?'LFM':'LFG'}</Text></View>
  </View>
  {recruiting?<View style={s.summary}><View style={s.between}><Text style={s.summaryTitle}>{st('Your Party')}</Text><Text style={s.available}>{st('{count} open',{count:Math.max(0,4-(party?.members.length??1))})}</Text></View>
    <Text style={s.hint}>{languageName}{prefs.minimumLevel?' · '+partyMinimumLevelLabel(locale,prefs.minimumLevel):''}</Text>
    <Text style={s.help}>{st('Language and minimum level follow your Party settings.')}</Text>
   </View>:null}
  <View style={s.section}>
   <Text style={s.label}>{recruiting?st('How active is your Party?'):st('How active are you?')}</Text>
   <View accessibilityRole="radiogroup" style={s.paceRow}>{activityChoices.map(choice=><Choice key={choice.id} label={st(choice.id==='casual'?'Casual':choice.id==='regular'?'Regular':choice.id==='active'?'Active play':'Tryhard')} selected={advertActivityLevel===choice.id} onPress={()=>setAdvertActivityLevel(choice.id)}/>)}</View>
   <Text style={s.hint}>{st('Choose how often you plan to play together.')}</Text>
  </View>
  {!recruiting?<View style={s.section}>
   <Text style={s.label}>{st('Preferred language')}</Text>
   <Pressable accessibilityRole="button" accessibilityState={{expanded:languageOpen}} style={s.selector} onPress={()=>setLanguageOpen(v=>!v)}><Text style={s.selectorText}>{languageName}</Text><Text style={s.chevron}>{languageOpen?'⌃':'⌄'}</Text></Pressable>
   {languageOpen?<View style={s.dropdown}>{PARTY_LANGUAGES.map(option=><Pressable key={option.id} onPress={()=>{setSeekerLanguage(option.id);setLanguageOpen(false)}} style={s.menuItem}><Text style={s.selectorText}>{option.id==='any'?st('Any language'):option.label}</Text>{language===option.id?<Text style={s.check}>✓</Text>:null}</Pressable>)}</View>:null}
  </View>:null}
  <View style={s.section}>
   <Text style={s.label}>{st('Post title')}</Text>
   <TextInput accessibilityLabel={st('Recruitment title')} value={draft.title} maxLength={80} onChangeText={title=>patch({title})} placeholder={st('Looking for active teammates')} placeholderTextColor={C.muted} style={s.input}/>
   <View style={s.between}><Text style={s.label}>{st('Description')}</Text><Text style={s.counter}>{draft.body.length}/600</Text></View>
   <TextInput accessibilityLabel={st('Recruitment description')} value={draft.body} maxLength={600} multiline onChangeText={body=>patch({body})} placeholder={st('What would you like to do together?')} placeholderTextColor={C.muted} style={[s.input,s.body]}/>
  </View>
  <View style={s.expiry}><Text style={s.expiryText}>◷  {st('Expires automatically after 24 hours')}</Text></View>
  <GameButton title={busy?st('Publishing…'):st('Publish recruitment post')} disabled={busy||draft.title.trim().length<3} loading={busy} onPress={publish}/>
  <GameButton title={st('Cancel')} compact tone="secondary" disabled={busy} onPress={onCancel}/>
 </View>;
}
function Choice({label,selected,onPress}:{label:string;selected:boolean;onPress:()=>void}){const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);return <Pressable accessibilityRole="radio" accessibilityState={{checked:selected}} onPress={onPress} style={[s.chip,selected&&s.chipSelected]}><Text style={[s.chipText,selected&&s.chipSelectedText]}>{label.charAt(0).toUpperCase()+label.slice(1)}</Text></Pressable>}
function styles(C:ThemeColors){return StyleSheet.create({
 root:{gap:spacing.md},head:{flexDirection:'row',alignItems:'center',gap:10},flex:{flex:1,minWidth:0},
 eyebrow:{fontSize:10,fontWeight:'900',letterSpacing:.8,color:C.accent},heading:{fontSize:19,fontWeight:'900',color:C.text,marginTop:3},hint:{fontSize:11,lineHeight:16,color:C.muted,marginTop:3},
 pill:{borderWidth:1,borderColor:C.selectionLine,backgroundColor:C.selection,paddingHorizontal:9,paddingVertical:5,borderRadius:99},pillText:{fontSize:10,fontWeight:'900',color:C.text},
 summary:{gap:5,padding:12,borderRadius:radii.md,borderWidth:1,borderColor:C.lineStrong,backgroundColor:C.panel2},between:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 summaryTitle:{fontSize:12,color:C.text,fontWeight:'900'},available:{fontSize:10,color:C.good,fontWeight:'900'},help:{fontSize:10,lineHeight:15,color:C.muted,marginTop:2},
 section:{gap:8},label:{fontSize:12,fontWeight:'800',color:C.text},input:{minHeight:44,borderWidth:1,borderColor:C.line,borderRadius:9,backgroundColor:C.inputBg,color:C.text,paddingHorizontal:11},body:{minHeight:90,textAlignVertical:'top',paddingTop:10},
 counter:{fontSize:10,color:C.muted},selector:{minHeight:48,paddingHorizontal:12,borderWidth:1,borderColor:C.line,borderRadius:9,backgroundColor:C.inputBg,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 selectorText:{fontSize:12,color:C.text,fontWeight:'700'},chevron:{fontSize:19,color:C.muted},
 dropdown:{borderWidth:1,borderColor:C.line,borderRadius:8,padding:4,backgroundColor:C.panel,gap:2},menuItem:{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:12},
 check:{color:C.good,fontWeight:'900'},paceRow:{flexDirection:'row',gap:6,flexWrap:'wrap'},
 chip:{minHeight:38,flexGrow:1,alignItems:'center',justifyContent:'center',paddingHorizontal:10,borderWidth:1,borderColor:C.line,borderRadius:9,backgroundColor:C.panel2},
 chipSelected:{backgroundColor:C.selection,borderColor:C.selectionLine},chipText:{color:C.muted,fontSize:11,fontWeight:'800'},chipSelectedText:{color:C.text},
 expiry:{paddingVertical:7},expiryText:{fontSize:11,color:C.muted,textAlign:'center'}
 });}
