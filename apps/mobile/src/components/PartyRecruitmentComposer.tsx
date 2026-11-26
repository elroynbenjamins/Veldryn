import {useMemo,useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {GameTextInput as TextInput} from './GameTextInput';
import {GameButton} from './GameButton';
import {RecruitmentQuickPostChoices} from './RecruitmentQuickPostChoices';
import {useGameTheme} from '../theme/ThemeContext';
import {radii,spacing,type ThemeColors} from '../theme/theme';
import {normalizedPartyPreferences,recruitmentMainInterest,recruitmentStoredInterest,type PersistentPartySummary,type RecruitmentActivityLevel,type RecruitmentMainInterest} from '../core/party-social';
import type {PublishRecruitmentInput} from '../online/party-social';
import {useSocialText} from '../i18n/social';

/** Party LFG and LFM use the same four-field quick post; party settings remain authoritative. */
export function PartyRecruitmentComposer({initial,party,busy,onPublish,onCancel}:{initial:PublishRecruitmentInput;party?:PersistentPartySummary|null;busy:boolean;onPublish:(value:PublishRecruitmentInput)=>void;onCancel:()=>void}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]),st=useSocialText();
 const [draft,setDraft]=useState(initial);
 const [interest,setInterest]=useState<RecruitmentMainInterest>(recruitmentMainInterest({focus:initial.focus??'mixed',playstyleTags:initial.playstyleTags??[]}));
 const [activityLevel,setActivityLevel]=useState<RecruitmentActivityLevel>(initial.activityLevel??'active');
 const recruiting=draft.postType==='party_recruiting',prefs=normalizedPartyPreferences(party);
 const patch=(change:Partial<PublishRecruitmentInput>)=>setDraft(current=>({...current,...change}));
 const publish=()=>{
  if(busy||draft.title.trim().length<3)return;
  onPublish({...draft,title:draft.title.trim(),durationDays:1,
   ...recruitmentStoredInterest(interest,draft.playstyleTags),activityLevel,
   roles:[],requiredRoleCounts:{},flexibleRoles:true,
   language:recruiting?(prefs.language==='any'?undefined:prefs.language):draft.language,
   minCombatLevel:recruiting?(prefs.minimumLevel||undefined):undefined,
   activityKind:undefined,goal:undefined,startMode:undefined,sessionMinutes:undefined,
   voiceMode:undefined,experience:undefined,scheduledAt:undefined});
 };
 return <View style={s.root}>
  <View style={s.head}>
   <Text style={s.eyebrow}>{st('PARTY RECRUITMENT')}</Text>
   <Text style={s.pill}>{recruiting?'LFM':'LFG'}</Text>
  </View>
  {recruiting?<Text style={s.hint}>{st('Party language and minimum level follow your Party settings.')}</Text>:null}
  <View style={s.section}>
   <Text style={s.label}>{st('Recruitment title')}</Text>
   <TextInput accessibilityLabel={st('Recruitment title')} value={draft.title} maxLength={80} onChangeText={title=>patch({title})} placeholder={st('Looking for active teammates')} placeholderTextColor={C.muted} style={s.input}/>
  </View>
  <View style={s.section}>
   <Text style={s.label}>{st('Description')}</Text>
   <TextInput accessibilityLabel={st('Recruitment description')} value={draft.body} maxLength={600} multiline onChangeText={body=>patch({body})} placeholder={st("Tell others what you're looking for...")} placeholderTextColor={C.muted} style={[s.input,s.body]}/>
  </View>
  <RecruitmentQuickPostChoices interest={interest} activityLevel={activityLevel} onInterestChange={setInterest} onActivityChange={setActivityLevel}/>
  <Text style={s.expiry}>{st('Automatically expires after 24 hours')}</Text>
  <GameButton title={busy?st('Publishing…'):st('Publish advert')} disabled={busy||draft.title.trim().length<3} loading={busy} onPress={publish}/>
  <GameButton title={st('Cancel')} compact tone="secondary" disabled={busy} onPress={onCancel}/>
 </View>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 root:{gap:spacing.md},head:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},
 eyebrow:{fontSize:10,fontWeight:'900',letterSpacing:0.8,color:C.accent},
 pill:{paddingHorizontal:9,paddingVertical:5,borderWidth:1,borderColor:C.selectionLine,borderRadius:99,backgroundColor:C.selection,fontSize:10,fontWeight:'900',color:C.text},
 hint:{fontSize:11,lineHeight:16,color:C.muted},
 section:{gap:7},label:{fontSize:12,fontWeight:'800',color:C.text},
 input:{minHeight:44,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.inputBg,color:C.text,paddingHorizontal:11},
 body:{minHeight:90,textAlignVertical:'top',paddingTop:10},
 expiry:{fontSize:11,color:C.muted,textAlign:'center',paddingVertical:5},
});}
