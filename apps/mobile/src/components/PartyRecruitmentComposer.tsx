import {useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {GameTextInput as TextInput} from './GameTextInput';
import {GameButton} from './GameButton';
import {useGameTheme} from '../theme/ThemeContext';
import {radii,spacing,type ThemeColors} from '../theme/theme';
import {PARTY_LANGUAGES,normalizedPartyPreferences,partyActivityLabel,recruitmentPaceForParty,type PartyActivityLevel,type PartyLanguage,type PersistentPartySummary} from '../core/party-social';
import type {PublishRecruitmentInput} from '../online/party-social';

const activities=[{id:'dungeon',label:'Dungeons'},{id:'boss',label:'Bosses'},{id:'quest',label:'Questing'},{id:'skilling',label:'Skilling'},{id:'exploration',label:'Exploration'},{id:'pvp',label:'PvP'},{id:'party_event',label:'Party events'},{id:'other',label:'Other'}] as const;
const activityChoices=[{id:'casual',label:'Casual'},{id:'active',label:'Active'},{id:'tryhard',label:'Tryhard'}] as const;
function activityFromPace(pace:PublishRecruitmentInput['activityLevel']):PartyActivityLevel{return pace==='hardcore'?'tryhard':pace==='casual'?'casual':'active';}

/** One lightweight advert editor for LFG and LFM; dungeon roles stay in dungeon setup. */
export function PartyRecruitmentComposer({initial,party,busy,onPublish,onCancel}:{initial:PublishRecruitmentInput;party?:PersistentPartySummary|null;busy:boolean;onPublish:(value:PublishRecruitmentInput)=>void;onCancel:()=>void}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]),[draft,setDraft]=useState(initial),[advanced,setAdvanced]=useState(false),[languageOpen,setLanguageOpen]=useState(false),[activityOpen,setActivityOpen]=useState(false);
 const [seekerLevel,setSeekerLevel]=useState<PartyActivityLevel>(activityFromPace(initial.activityLevel)),[seekerLanguage,setSeekerLanguage]=useState<PartyLanguage>((PARTY_LANGUAGES.some(item=>item.id===initial.language)?initial.language:'any') as PartyLanguage);
 const recruiting=draft.postType==='party_recruiting',prefs=normalizedPartyPreferences(party);
 const level=recruiting?prefs.activityLevel:seekerLevel,language=recruiting?prefs.language:seekerLanguage;
 const levelLimit=recruiting?prefs.minimumLevel:draft.minCombatLevel??0;
 const patch=(change:Partial<PublishRecruitmentInput>)=>setDraft(current=>({...current,...change}));
 const publish=()=>{
  if(draft.title.trim().length<3)return;
  onPublish({...draft,durationDays:1,roles:[],requiredRoleCounts:{},flexibleRoles:true,
    activityLevel:recruitmentPaceForParty(level),language:language==='any'?undefined:language,
    minCombatLevel:levelLimit||undefined,focus:'mixed'});
 };
 return <View style={s.root}>
  <View style={s.head}>
   <View style={s.flex}><Text style={s.eyebrow}>PARTY RECRUITMENT</Text><Text style={s.heading}>{recruiting?'Find teammates':'Looking for a Party'}</Text><Text style={s.hint}>{recruiting?'Make your Party easy for others to find.':'Tell Party leaders what you are looking for.'}</Text></View>
   <View style={s.pill}><Text style={s.pillText}>{recruiting?'LFM':'LFG'}</Text></View>
  </View>
  {recruiting?<View style={s.summary}><View style={s.between}><Text style={s.summaryTitle}>Your Party</Text><Text style={s.available}>{Math.max(0,4-(party?.members.length??1))} open</Text></View>
    <Text style={s.hint}>{partyActivityLabel(level)} · {PARTY_LANGUAGES.find(item=>item.id===language)?.label??'Any language'}{levelLimit?' · Lv. '+levelLimit+'+':''}</Text>
    <Text style={s.help}>These settings come from your Party. The Party leader can change them from Party options.</Text>
   </View>:<View style={s.section}>
    <Text style={s.label}>Preferred activity level</Text>
    <View style={s.paceRow}>{activityChoices.map(choice=><Choice key={choice.id} label={choice.label} selected={seekerLevel===choice.id} onPress={()=>setSeekerLevel(choice.id)}/>)}</View>
    <Text style={s.label}>Language preference</Text>
    <Pressable accessibilityRole="button" accessibilityState={{expanded:languageOpen}} style={s.selector} onPress={()=>setLanguageOpen(v=>!v)}><Text style={s.selectorText}>{PARTY_LANGUAGES.find(item=>item.id===language)?.label}</Text><Text style={s.chevron}>{languageOpen?'⌃':'⌄'}</Text></Pressable>
    {languageOpen?<View style={s.dropdown}>{PARTY_LANGUAGES.map(option=><Pressable key={option.id} onPress={()=>{setSeekerLanguage(option.id);setLanguageOpen(false)}} style={s.menuItem}><Text style={s.selectorText}>{option.label}</Text>{language===option.id?<Text style={s.check}>✓</Text>:null}</Pressable>)}</View>:null}
   </View>}
  <View style={s.section}>
   <Text style={s.label}>Post title</Text>
   <TextInput accessibilityLabel="Recruitment title" value={draft.title} maxLength={80} onChangeText={title=>patch({title})} placeholder="Looking for active teammates" placeholderTextColor={C.muted} style={s.input}/>
   <View style={s.between}><Text style={s.label}>Description</Text><Text style={s.counter}>{draft.body.length}/600</Text></View>
   <TextInput accessibilityLabel="Recruitment description" value={draft.body} maxLength={600} multiline onChangeText={body=>patch({body})} placeholder="What would you like to do together?" placeholderTextColor={C.muted} style={[s.input,s.body]}/>
  </View>
  <View style={s.section}>
   <Text style={s.label}>Main activity</Text>
   <Pressable accessibilityRole="button" accessibilityState={{expanded:activityOpen}} style={s.selector} onPress={()=>setActivityOpen(v=>!v)}><Text style={s.selectorText}>{activities.find(item=>item.id===draft.activityKind)?.label??'Any activity'}</Text><Text style={s.chevron}>{activityOpen?'⌃':'⌄'}</Text></Pressable>
   {activityOpen?<View style={s.dropdown}>{[{id:'',label:'Any activity'},...activities].map(option=><Pressable key={option.id} onPress={()=>{patch({activityKind:option.id?option.id as PublishRecruitmentInput['activityKind']:undefined});setActivityOpen(false)}} style={s.menuItem}><Text style={s.selectorText}>{option.label}</Text></Pressable>)}</View>:null}
  </View>
  <Pressable accessibilityRole="button" accessibilityState={{expanded:advanced}} style={s.advanced} onPress={()=>setAdvanced(v=>!v)}><View style={s.flex}><Text style={s.label}>More options</Text><Text style={s.hint}>Goal, timing and voice preferences</Text></View><Text style={s.chevron}>{advanced?'⌃':'⌄'}</Text></Pressable>
  {advanced?<View style={s.section}>
   <Text style={s.label}>Goal</Text>
   <View style={s.wrap}>{(['learn','clear','farm','speedrun','achievement','casual'] as const).map(goal=><Choice key={goal} label={goal} selected={draft.goal===goal} onPress={()=>patch({goal})}/>)}</View>
   <Text style={s.label}>When are you playing?</Text>
   <View style={s.wrap}>{(['now','next_hour','scheduled','recurring'] as const).map(mode=><Choice key={mode} label={mode.replace('_',' ')} selected={draft.startMode===mode} onPress={()=>patch({startMode:mode})}/>)}</View>
   {draft.startMode==='scheduled'?<TextInput accessibilityLabel="Scheduled start UTC" value={draft.scheduledAt??''} onChangeText={scheduledAt=>patch({scheduledAt:scheduledAt||undefined})} placeholder="Start time in UTC (ISO 8601)" placeholderTextColor={C.muted} style={s.input}/>:null}
   <Text style={s.label}>Voice</Text>
   <View style={s.wrap}>{(['none','preferred','required'] as const).map(voiceMode=><Choice key={voiceMode} label={voiceMode==='none'?'Not needed':voiceMode} selected={(draft.voiceMode??'none')===voiceMode} onPress={()=>patch({voiceMode})}/>)}</View>
   {!recruiting?<><Text style={s.label}>Minimum combat level · optional</Text><TextInput accessibilityLabel="Minimum combat level" keyboardType="number-pad" value={String(draft.minCombatLevel??'')} placeholder="No minimum" placeholderTextColor={C.muted} onChangeText={value=>patch({minCombatLevel:value?Math.min(2000,Math.max(0,parseInt(value,10)||0)):undefined})} style={s.input}/></>:null}
  </View>:null}
  <View style={s.expiry}><Text style={s.expiryText}>◷  Expires automatically after 24 hours</Text></View>
  <GameButton title={busy?'Publishing…':'Publish recruitment post'} disabled={busy||draft.title.trim().length<3} loading={busy} onPress={publish}/>
  <GameButton title="Cancel" compact tone="secondary" disabled={busy} onPress={onCancel}/>
 </View>;
}
function Choice({label,selected,onPress}:{label:string;selected:boolean;onPress:()=>void}){const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);return <Pressable accessibilityRole="button" accessibilityState={{selected}} onPress={onPress} style={[s.chip,selected&&s.chipSelected]}><Text style={[s.chipText,selected&&s.chipSelectedText]}>{label.charAt(0).toUpperCase()+label.slice(1)}</Text></Pressable>}
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
 check:{color:C.good,fontWeight:'900'},paceRow:{flexDirection:'row',gap:6},wrap:{flexDirection:'row',flexWrap:'wrap',gap:6},
 chip:{minHeight:38,flexGrow:1,alignItems:'center',justifyContent:'center',paddingHorizontal:10,borderWidth:1,borderColor:C.line,borderRadius:9,backgroundColor:C.panel2},
 chipSelected:{backgroundColor:C.selection,borderColor:C.selectionLine},chipText:{color:C.muted,fontSize:11,fontWeight:'800'},chipSelectedText:{color:C.text},
 advanced:{minHeight:52,flexDirection:'row',alignItems:'center',padding:11,borderWidth:1,borderColor:C.line,borderRadius:9,backgroundColor:C.panel2},
 expiry:{paddingVertical:7},expiryText:{fontSize:11,color:C.muted,textAlign:'center'}
 });}
