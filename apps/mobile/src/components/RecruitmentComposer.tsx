import {useMemo,useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {useSocialText} from '../i18n/social';
import {GameTextInput as TextInput} from './GameTextInput';
import {GameButton} from './GameButton';
import {RecruitmentQuickPostChoices} from './RecruitmentQuickPostChoices';
import {radii,spacing,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {recruitmentMainInterest,recruitmentPostTypePresentation,recruitmentStoredInterest,type RecruitmentActivityLevel,type RecruitmentMainInterest} from '../core/party-social';
import type {PublishRecruitmentInput} from '../online/party-social';

/** Guild quick post: only title, description, main interest and expected activity. */
export function RecruitmentComposer({initial,busy,onPublish,onCancel}:{initial:PublishRecruitmentInput;busy:boolean;onPublish:(input:PublishRecruitmentInput)=>void;onCancel:()=>void}){
 const st=useSocialText(),C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const [draft,setDraft]=useState(initial);
 const [interest,setInterest]=useState<RecruitmentMainInterest>(recruitmentMainInterest({focus:initial.focus??'mixed',playstyleTags:initial.playstyleTags??[]}));
 const [activityLevel,setActivityLevel]=useState<RecruitmentActivityLevel>(initial.activityLevel??'active');
 const presentation=recruitmentPostTypePresentation(initial.postType);
 const update=(value:Partial<PublishRecruitmentInput>)=>setDraft(previous=>({...previous,...value}));
 const publish=()=>{
  if(busy||draft.title.trim().length<3)return;
  onPublish({...draft,title:draft.title.trim(),durationDays:3,
   ...recruitmentStoredInterest(interest,draft.playstyleTags),activityLevel,
   roles:[],requiredRoleCounts:{},flexibleRoles:true,
   activityKind:undefined,goal:undefined,startMode:undefined,sessionMinutes:undefined,
   voiceMode:undefined,experience:undefined,scheduledAt:undefined});
 };
 return <View style={s.root}>
  <View style={s.head}>
   <Text style={s.eyebrow}>{st('NEW RECRUITMENT POST')}</Text>
   <Text style={s.postType}>{presentation.shortLabel}</Text>
  </View>
  <View style={s.section}>
   <Text style={s.label}>{st('Advert title')}</Text>
   <TextInput accessibilityLabel={st('Advert title')} placeholder={st('Looking for active adventurers')} placeholderTextColor={C.muted} value={draft.title} maxLength={80} onChangeText={title=>update({title})} style={s.input}/>
  </View>
  <View style={s.section}>
   <Text style={s.label}>{st('Description')}</Text>
   <TextInput accessibilityLabel={st('Advert description')} placeholder={st("Tell others what you're looking for...")} placeholderTextColor={C.muted} multiline value={draft.body} maxLength={600} onChangeText={body=>update({body})} style={[s.input,s.body]}/>
  </View>
  <RecruitmentQuickPostChoices interest={interest} activityLevel={activityLevel} onInterestChange={setInterest} onActivityChange={setActivityLevel}/>
  <Text style={s.expiry}>{st('AUTO-EXPIRES')} · {st('Automatically expires after 3 days')}</Text>
  <GameButton title={busy?st('Publishing…'):st('Publish advert')} disabled={busy||draft.title.trim().length<3} loading={busy} onPress={publish}/>
  <GameButton title={st('Cancel')} compact tone="secondary" disabled={busy} onPress={onCancel}/>
 </View>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 root:{gap:spacing.md},head:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 eyebrow:{fontSize:10,fontWeight:'900',letterSpacing:0.8,color:C.accent},
 postType:{fontSize:10,color:C.info,fontWeight:'900',borderWidth:1,borderColor:C.lineStrong,borderRadius:99,paddingHorizontal:9,paddingVertical:5},
 section:{gap:7},label:{fontSize:12,fontWeight:'800',color:C.text},
 input:{minHeight:44,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,paddingHorizontal:spacing.sm,backgroundColor:C.inputBg,color:C.text},
 body:{minHeight:90,paddingTop:10,textAlignVertical:'top'},
 expiry:{fontSize:11,color:C.muted,textAlign:'center',paddingVertical:5},
});}
