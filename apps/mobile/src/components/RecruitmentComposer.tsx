import {GameTextInput as TextInput} from './GameTextInput';
import {useMemo,useState} from 'react';
import {Pressable,Text,View,StyleSheet} from 'react-native';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {C,equipmentColors,spacing,touchTargetMin,typography} from '../theme/theme';
import {useTheme} from '../theme/ThemeProvider';
import {recruitmentTags} from './RecruitmentFiltersPanel';
import type {PublishRecruitmentInput} from '../online/party-social';
export function RecruitmentComposer({initial,busy,onPublish,onCancel}:{initial:PublishRecruitmentInput;busy:boolean;onPublish:(input:PublishRecruitmentInput)=>void;onCancel:()=>void}){
 const {colors:C,equipmentColors}=useTheme();const s=useMemo(()=>createStyles(C,equipmentColors),[C,equipmentColors]);
 const [draft,setDraft]=useState(initial);const patch=(value:Partial<PublishRecruitmentInput>)=>setDraft(previous=>({...previous,...value}));
 const guild=draft.postType==='looking_for_guild'||draft.postType==='guild_recruiting';
 return <Panel><Text style={s.title}>{draft.postType.replaceAll('_',' ')}</Text><Text style={s.text}>One active advert. Refresh or replacement is available every 6 hours.</Text>
  <TextInput accessibilityLabel="Advert title" placeholder="Title" placeholderTextColor={C.muted} style={s.input} value={draft.title} maxLength={80} onChangeText={title=>patch({title})}/>
  <TextInput accessibilityLabel="Advert description" placeholder="Activities, availability and what you enjoy" placeholderTextColor={C.muted} style={s.input} multiline value={draft.body} maxLength={600} onChangeText={body=>patch({body})}/>
  <Text style={s.groupLabel}>FOCUS</Text><View style={s.row}>{(['combat','skilling','mixed'] as const).map(focus=><ChoiceChip key={focus} label={focus} selected={draft.focus===focus} onPress={()=>patch({focus})}/>)}</View>
  <Text style={s.groupLabel}>ROLE</Text><View style={s.row}>{(['tank','damage','support'] as const).map(role=><ChoiceChip key={role} label={role} selected={draft.roles?.includes(role)??false} onPress={()=>patch({roles:draft.roles?.includes(role)?draft.roles.filter(r=>r!==role):[...draft.roles??[],role]})}/>)}</View>
  {(['activityTags','playstyleTags','availabilityTags','guildInterestTags'] as const).map(key=><TextInput key={key} accessibilityLabel={key} placeholder={`${key.replace('Tags','')} (comma separated)`} placeholderTextColor={C.muted} style={s.input} onChangeText={text=>patch({[key]:recruitmentTags(text)})}/>)}
  <Text style={s.groupLabel}>PACE</Text><View style={s.row}>{(['casual','regular','active','hardcore'] as const).map(activityLevel=><ChoiceChip key={activityLevel} label={activityLevel} selected={draft.activityLevel===activityLevel} onPress={()=>patch({activityLevel})}/>)}</View>
  {(['language','region','currentObjective'] as const).map(key=><TextInput key={key} accessibilityLabel={key} placeholder={`${key} (optional)`} placeholderTextColor={C.muted} style={s.input} maxLength={key==='currentObjective'?120:40} onChangeText={text=>patch({[key]:text||undefined})}/>)}
  <View style={s.row}>{(['minCombatLevel','minTotalLevel'] as const).map(key=><TextInput key={key} accessibilityLabel={key} placeholder={key==='minCombatLevel'?'Minimum Combat level':'Minimum Total level'} placeholderTextColor={C.muted} style={[s.input,s.grow]} keyboardType="number-pad" onChangeText={text=>patch({[key]:text?Math.max(0,parseInt(text,10)||0):undefined})}/>)}</View>
  <Text style={s.text}>Expires after {draft.durationDays??(guild?3:1)} day(s). Party open spots are calculated from the current roster.</Text>
  {guild&&<><Text style={s.groupLabel}>DURATION</Text><View style={s.row}>{([1,3] as const).map(durationDays=><ChoiceChip key={durationDays} label={`${durationDays} day${durationDays===1?'':'s'}`} selected={draft.durationDays===durationDays} onPress={()=>patch({durationDays})}/>)}</View></>}
  <GameButton title={busy?'Publishing…':'Publish advert'} disabled={busy||draft.title.trim().length<3} onPress={()=>onPublish(draft)}/><GameButton title="Cancel" tone="secondary" onPress={onCancel}/>
 </Panel>;
}
function ChoiceChip({label,selected,onPress}:{label:string;selected:boolean;onPress:()=>void}){
 const {colors:C,equipmentColors}=useTheme();const s=useMemo(()=>createStyles(C,equipmentColors),[C,equipmentColors]);return <Pressable accessibilityRole="button" accessibilityState={{selected}} onPress={onPress} style={({pressed})=>[s.chip,selected&&s.chipSelected,pressed&&s.pressed]}><Text style={[s.chipText,selected&&s.chipTextSelected]}>{selected?'✓ ':''}{label}</Text></Pressable>}
const createStyles=(C:any,equipmentColors:any)=>StyleSheet.create({title:{color:C.accent,fontSize:18,fontWeight:'800'},text:{color:C.muted},groupLabel:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900',letterSpacing:1,marginTop:4},input:{minHeight:touchTargetMin,borderWidth:1,borderColor:C.line,padding:spacing.sm,color:C.text},row:{flexDirection:'row',flexWrap:'wrap',gap:6},chip:{minHeight:38,paddingHorizontal:12,justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.bg},chipSelected:{borderColor:equipmentColors.selectedLine,backgroundColor:equipmentColors.selected},chipText:{fontSize:12,color:C.muted,fontWeight:'700'},chipTextSelected:{color:'#d9f3ff'},pressed:{opacity:.76},grow:{flex:1,minWidth:120}});
