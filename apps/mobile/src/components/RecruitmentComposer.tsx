import {GameTextInput as TextInput} from './GameTextInput';
import {useState} from 'react';
import {Text,View,StyleSheet} from 'react-native';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {C,spacing,touchTargetMin} from '../theme/theme';
import {recruitmentTags} from './RecruitmentFiltersPanel';
import type {PublishRecruitmentInput} from '../online/party-social';
export function RecruitmentComposer({initial,busy,onPublish,onCancel}:{initial:PublishRecruitmentInput;busy:boolean;onPublish:(input:PublishRecruitmentInput)=>void;onCancel:()=>void}){
 const [draft,setDraft]=useState(initial);const patch=(value:Partial<PublishRecruitmentInput>)=>setDraft(previous=>({...previous,...value}));
 const guild=draft.postType==='looking_for_guild'||draft.postType==='guild_recruiting';
 return <Panel><Text style={s.title}>{draft.postType.replaceAll('_',' ')}</Text><Text style={s.text}>One active advert. Refresh or replacement is available every 6 hours.</Text>
  <TextInput accessibilityLabel="Advert title" placeholder="Title" placeholderTextColor={C.muted} style={s.input} value={draft.title} maxLength={80} onChangeText={title=>patch({title})}/>
  <TextInput accessibilityLabel="Advert description" placeholder="Activities, availability and what you enjoy" placeholderTextColor={C.muted} style={s.input} multiline value={draft.body} maxLength={600} onChangeText={body=>patch({body})}/>
  <View style={s.row}>{(['combat','skilling','mixed'] as const).map(focus=><GameButton key={focus} title={`${draft.focus===focus?'✓ ':''}${focus}`} tone="secondary" onPress={()=>patch({focus})}/>)}</View>
  <View style={s.row}>{(['tank','damage','support'] as const).map(role=><GameButton key={role} title={`${draft.roles?.includes(role)?'✓ ':''}${role}`} tone="secondary" onPress={()=>patch({roles:draft.roles?.includes(role)?draft.roles.filter(r=>r!==role):[...draft.roles??[],role]})}/>)}</View>
  {(['activityTags','playstyleTags','availabilityTags','guildInterestTags'] as const).map(key=><TextInput key={key} accessibilityLabel={key} placeholder={`${key.replace('Tags','')} (comma separated)`} placeholderTextColor={C.muted} style={s.input} onChangeText={text=>patch({[key]:recruitmentTags(text)})}/>)}
  <View style={s.row}>{(['casual','regular','active','hardcore'] as const).map(activityLevel=><GameButton key={activityLevel} title={`${draft.activityLevel===activityLevel?'✓ ':''}${activityLevel}`} tone="secondary" onPress={()=>patch({activityLevel})}/>)}</View>
  {(['language','region','currentObjective'] as const).map(key=><TextInput key={key} accessibilityLabel={key} placeholder={`${key} (optional)`} placeholderTextColor={C.muted} style={s.input} maxLength={key==='currentObjective'?120:40} onChangeText={text=>patch({[key]:text||undefined})}/>)}
  <View style={s.row}>{(['minCombatLevel','minTotalLevel'] as const).map(key=><TextInput key={key} accessibilityLabel={key} placeholder={key==='minCombatLevel'?'Minimum Combat level':'Minimum Total level'} placeholderTextColor={C.muted} style={[s.input,s.grow]} keyboardType="number-pad" onChangeText={text=>patch({[key]:text?Math.max(0,parseInt(text,10)||0):undefined})}/>)}</View>
  <Text style={s.text}>Expires after {draft.durationDays??(guild?3:1)} day(s). Party open spots are calculated from the current roster.</Text>
  {guild&&<View style={s.row}>{([1,3] as const).map(durationDays=><GameButton key={durationDays} title={`${draft.durationDays===durationDays?'✓ ':''}${durationDays} day(s)`} tone="secondary" onPress={()=>patch({durationDays})}/>)}</View>}
  <GameButton title={busy?'Publishing…':'Publish advert'} disabled={busy||draft.title.trim().length<3} onPress={()=>onPublish(draft)}/><GameButton title="Cancel" tone="secondary" onPress={onCancel}/>
 </Panel>;
}
const s=StyleSheet.create({title:{color:C.accent,fontSize:18,fontWeight:'800'},text:{color:C.muted},input:{minHeight:touchTargetMin,borderWidth:1,borderColor:C.line,padding:spacing.sm,color:C.text},row:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm},grow:{flex:1,minWidth:120}});
