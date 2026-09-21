import {useMemo,useState} from 'react';
import {Pressable,Text,View,StyleSheet} from 'react-native';
import {GameTextInput as TextInput} from './GameTextInput';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {radii,spacing,touchTargetMin,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {recruitmentPostTypePresentation} from '../core/party-social';
import {recruitmentTags} from './RecruitmentFiltersPanel';
import type {PublishRecruitmentInput} from '../online/party-social';

const tagFieldLabel={activityTags:'Activities',playstyleTags:'Playstyle',availabilityTags:'Availability',guildInterestTags:'Guild interests'} as const;

export function RecruitmentComposer({initial,busy,onPublish,onCancel}:{initial:PublishRecruitmentInput;busy:boolean;onPublish:(input:PublishRecruitmentInput)=>void;onCancel:()=>void}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [draft,setDraft]=useState(initial),presentation=recruitmentPostTypePresentation(initial.postType);
 const patch=(value:Partial<PublishRecruitmentInput>)=>setDraft(previous=>({...previous,...value}));
 const guild=draft.postType==='looking_for_guild'||draft.postType==='guild_recruiting';
 return <Panel>
  <View style={s.head}><View style={s.flex}><Text style={s.eyebrow}>NEW RECRUITMENT POST</Text><Text style={s.title}>{presentation.label}</Text></View><View style={s.typePill}><Text style={s.typeText}>{presentation.shortLabel}</Text></View></View>
  <Text style={s.text}>Keep it concise. One active advert per type; refresh or replacement is available every 6 hours.</Text>
  <View style={s.section}><Text style={s.groupLabel}>MESSAGE</Text>
   <TextInput accessibilityLabel="Advert title" placeholder="Short title" placeholderTextColor={C.muted} style={s.input} value={draft.title} maxLength={80} onChangeText={title=>patch({title})}/>
   <TextInput accessibilityLabel="Advert description" placeholder="Activities, availability and what you enjoy" placeholderTextColor={C.muted} style={[s.input,s.bodyInput]} multiline value={draft.body} maxLength={600} onChangeText={body=>patch({body})}/>
  </View>
  <View style={s.section}><Text style={s.groupLabel}>FOCUS</Text><View style={s.row}>{(['combat','skilling','mixed'] as const).map(focus=><ChoiceChip key={focus} label={focus} selected={draft.focus===focus} onPress={()=>patch({focus})}/>)}</View></View>
  <View style={s.section}><Text style={s.groupLabel}>ROLE</Text><View style={s.row}>{(['tank','damage','support'] as const).map(role=><ChoiceChip key={role} label={role} selected={draft.roles?.includes(role)??false} onPress={()=>patch({roles:draft.roles?.includes(role)?draft.roles.filter(r=>r!==role):[...draft.roles??[],role]})}/>)}</View></View>
  <View style={s.section}><Text style={s.groupLabel}>DISCOVERY TAGS</Text>
   {(['activityTags','playstyleTags','availabilityTags','guildInterestTags'] as const).map(key=><TextInput key={key} accessibilityLabel={tagFieldLabel[key]} placeholder={tagFieldLabel[key]+' · comma separated'} placeholderTextColor={C.muted} style={s.input} onChangeText={text=>patch({[key]:recruitmentTags(text)})}/>)}
  </View>
  <View style={s.section}><Text style={s.groupLabel}>PACE</Text><View style={s.row}>{(['casual','regular','active','hardcore'] as const).map(activityLevel=><ChoiceChip key={activityLevel} label={activityLevel} selected={draft.activityLevel===activityLevel} onPress={()=>patch({activityLevel})}/>)}</View></View>
  <View style={s.row}>{(['language','region'] as const).map(key=><TextInput key={key} accessibilityLabel={key} placeholder={key==='language'?'Language · optional':'Region · optional'} placeholderTextColor={C.muted} style={[s.input,s.grow]} maxLength={40} onChangeText={text=>patch({[key]:text||undefined})}/>)}</View>
  <TextInput accessibilityLabel="currentObjective" placeholder="Current objective · optional" placeholderTextColor={C.muted} style={s.input} maxLength={120} onChangeText={text=>patch({currentObjective:text||undefined})}/>
  <View style={s.row}>{(['minCombatLevel','minTotalLevel'] as const).map(key=><TextInput key={key} accessibilityLabel={key} placeholder={key==='minCombatLevel'?'Minimum Combat':'Minimum Total'} placeholderTextColor={C.muted} style={[s.input,s.grow]} keyboardType="number-pad" onChangeText={text=>patch({[key]:text?Math.max(0,parseInt(text,10)||0):undefined})}/>)}</View>
  <View style={s.expiryCard}><View style={s.flex}><Text style={s.expiryLabel}>AUTO-EXPIRES</Text><Text style={s.expiryText}>{draft.durationDays??(guild?3:1)} day{(draft.durationDays??(guild?3:1))===1?'':'s'} · stale posts disappear automatically</Text></View>{guild?<View style={s.durationRow}>{([1,3] as const).map(durationDays=><ChoiceChip key={durationDays} label={durationDays+'d'} selected={draft.durationDays===durationDays} onPress={()=>patch({durationDays})}/>)}</View>:null}</View>
  <View style={s.actions}><View style={s.flex}><GameButton title={busy?'Publishing…':'Publish advert'} disabled={busy||draft.title.trim().length<3} onPress={()=>onPublish(draft)}/></View><View style={s.cancel}><GameButton title="Cancel" tone="secondary" onPress={onCancel}/></View></View>
 </Panel>;
}
function ChoiceChip({label,selected,onPress}:{label:string;selected:boolean;onPress:()=>void}){const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);return <Pressable accessibilityRole="button" accessibilityState={{selected}} onPress={onPress} style={({pressed})=>[s.chip,selected&&s.chipSelected,pressed&&s.pressed]}><Text style={[s.chipText,selected&&s.chipTextSelected]}>{selected?'✓ ':''}{label}</Text></Pressable>}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 head:{flexDirection:'row',alignItems:'center',gap:8},flex:{flex:1,minWidth:0},
 eyebrow:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8},
 title:{...typography.title,color:C.text},
 typePill:{paddingHorizontal:7,paddingVertical:4,borderWidth:1,borderColor:C.info,borderRadius:99,backgroundColor:C.infoSurface},
 typeText:{fontSize:8,color:C.info,fontWeight:'900',letterSpacing:.55},
 text:{...typography.caption,color:C.muted,lineHeight:17},
 section:{gap:5},
 groupLabel:{fontSize:8.5,color:C.accentSoft,fontWeight:'900',letterSpacing:.75},
 input:{minHeight:touchTargetMin,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,paddingHorizontal:spacing.sm,color:C.text,backgroundColor:C.inputBg},
 bodyInput:{minHeight:76,textAlignVertical:'top',paddingTop:10},
 row:{flexDirection:'row',flexWrap:'wrap',gap:5},
 chip:{minHeight:36,paddingHorizontal:10,justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.panel2},
 chipSelected:{borderColor:C.selectionLine,backgroundColor:C.selection},
 chipText:{fontSize:10.5,color:C.muted,fontWeight:'800',textTransform:'capitalize'},chipTextSelected:{color:C.text},
 pressed:{opacity:.72},grow:{flex:1,minWidth:120},
 expiryCard:{minHeight:50,flexDirection:'row',alignItems:'center',gap:8,padding:8,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},
 expiryLabel:{fontSize:8,color:C.accent,fontWeight:'900',letterSpacing:.65},expiryText:{fontSize:9.5,lineHeight:13,color:C.muted,marginTop:1},
 durationRow:{flexDirection:'row',gap:4},
 actions:{flexDirection:'row',gap:6},cancel:{width:96},
});}
