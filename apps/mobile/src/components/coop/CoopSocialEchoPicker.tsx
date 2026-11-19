import {useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useCoopStyles} from '../../theme/useCoopStyles';
import type {CoopColors} from '../../theme/coop-ui-theme';
import {dungeonEchoPickerText} from '../../i18n/dungeon-social-echo-copy';
import type {Language} from '../../i18n/languages';
import {validateSelectedSocialEchoIds,type SocialEchoCandidate} from '../../core/coop-social-echoes';
import {FantasyPanel,RoleBadge} from './CoopVisualKit';
import {GameButton} from '../GameButton';

type Role='tank'|'damage'|'support';
type Filter='all'|'friend'|'guild';
const PARTY_ROLES:readonly Role[]=['tank','damage','damage','support'];
function displayClass(classId:string){
 return classId.split('_').map(word=>word.slice(0,1)+word.slice(1).toLowerCase()).join(' ');
}
function reasonFor(candidate:SocialEchoCandidate,selectedIds:readonly string[],
 candidates:readonly SocialEchoCandidate[],hostClassId:string,hostRole:Role){
 try{
  validateSelectedSocialEchoIds([...selectedIds,candidate.profileId],candidates,hostClassId,hostRole);
  return '';
 }catch(error){
  return error instanceof Error?error.message:'invalid_echo_selection';
 }
}
function roleSlots(hostRole:Role,candidates:readonly SocialEchoCandidate[],selectedIds:readonly string[]){
 const chosen=selectedIds.map(id=>candidates.find(row=>row.profileId===id)).filter((v):v is SocialEchoCandidate=>!!v);
 const used=new Set<string>();let hostUsed=false;
 return PARTY_ROLES.map((role,index)=>{
  if(role===hostRole&&!hostUsed){hostUsed=true;return {key:role+index,role,name:'YOU',kind:'host' as const};}
  const person=chosen.find(row=>row.role===role&&!used.has(row.profileId));
  if(person){used.add(person.profileId);return {key:role+index,role,name:person.name,kind:'chosen' as const};}
  return {key:role+index,role,name:'AUTO',kind:'auto' as const};
 });
}

/** Compact, optional pre-run party builder. No sharing switch exists.
 * Contacts are server-derived; role legality is checked again at run start. */
export function CoopSocialEchoPicker({
 language,candidates,selectedIds,onChange,hostRole,hostClassId,loading,error,onRefresh,
}:{
 language:Language;candidates:readonly SocialEchoCandidate[];selectedIds:readonly string[];onChange:(ids:string[])=>void;
 hostRole:Role;hostClassId:string;loading:boolean;error?:string;onRefresh:()=>void;
}){
 const {styles:s,colors:C}=useCoopStyles(makeStyles);
 const t=(key:Parameters<typeof dungeonEchoPickerText>[1],count?:number)=>dungeonEchoPickerText(language,key,count);
 const [expanded,setExpanded]=useState(false);
 const [filter,setFilter]=useState<Filter>('all');
 const [search,setSearch]=useState('');
 const [selectionError,setSelectionError]=useState('');
 const slots=roleSlots(hostRole,candidates,selectedIds);
 const available=useMemo(()=>candidates.filter(row=>{
  if(filter!=='all'&&row.relationship!==filter&&row.relationship!=='both')return false;
  const q=search.trim().toLowerCase();
  return !q||row.name.toLowerCase().includes(q)||displayClass(row.classId).toLowerCase().includes(q);
 }).sort((a,b)=>Number(selectedIds.includes(b.profileId))-Number(selectedIds.includes(a.profileId))||a.name.localeCompare(b.name)),[candidates,filter,search,selectedIds]);
 const toggle=(candidate:SocialEchoCandidate)=>{
  if(selectedIds.includes(candidate.profileId)){
   onChange(selectedIds.filter(id=>id!==candidate.profileId));setSelectionError('');return;
  }
  const errorCode=reasonFor(candidate,selectedIds,candidates,hostClassId,hostRole);
  if(errorCode){
   setSelectionError(errorCode==='duplicate_coop_account'?t('onePlayer'):
    errorCode==='duplicate_damage_class'?t('uniqueDamage'):
    t('slotFull'));return;
  }
  onChange([...selectedIds,candidate.profileId]);setSelectionError('');
 };
 return <FantasyPanel variant={selectedIds.length?'selected':'default'}>
  <Pressable accessibilityRole="button" accessibilityLabel={t('open')}
   accessibilityState={{expanded}} onPress={()=>setExpanded(v=>!v)} style={({pressed})=>[s.header,pressed&&s.pressed]}>
   <View style={s.emblem}><Text style={s.emblemText}>✦</Text></View>
   <View style={s.headerContent}>
    <Text style={s.heading}>{t('title')}</Text>
    <Text style={s.subtitle}>{selectedIds.length
     ?t('chosen',selectedIds.length)
     :t('subtitle')}</Text>
   </View>
   <View style={s.counter}><Text style={s.counterText}>{selectedIds.length}/3</Text></View>
   <Text style={s.chevron}>{expanded?'⌄':'›'}</Text>
  </Pressable>

  <View style={s.partySlots} accessibilityLabel={t('title')}>
   {slots.map(slot=><View key={slot.key} style={[s.slot,slot.kind==='chosen'&&s.slotChosen,slot.kind==='host'&&s.slotHost]}>
    <Text style={[s.slotRole,slot.kind==='auto'&&s.slotDim]}>{t(slot.role)}</Text>
    <Text style={[s.slotName,slot.kind==='auto'&&s.slotDim,slot.kind==='host'&&s.slotYou]} numberOfLines={1}>{slot.kind==='host'?t('you'):slot.kind==='auto'?t('auto'):slot.name}</Text>
    <View style={[s.slotMark,slot.kind==='chosen'&&s.slotMarkChosen,slot.kind==='host'&&s.slotMarkHost]}/>
   </View>)}
  </View>

  {expanded?<View style={s.details}>
   <Text style={s.explainer}>{t('explain')}</Text>
   <View style={s.filters}>
    {(['all','friend','guild'] as const).map(option=><Pressable key={option}
     accessibilityRole="button" accessibilityState={{selected:filter===option}}
     onPress={()=>setFilter(option)} style={[s.filter,filter===option&&s.filterSelected]}>
     <Text style={[s.filterText,filter===option&&s.filterTextSelected]}>{option==='all'?t('all'):option==='friend'?t('friends'):t('guild')}</Text>
    </Pressable>)}
   </View>
   {candidates.length>6?<TextInput accessibilityLabel={t('searchHint')}
    style={s.search} placeholder={t('search')}
    placeholderTextColor={C.textMuted} value={search} onChangeText={setSearch}
    autoCorrect={false} maxLength={50}/>:null}
   {loading?<Text style={s.meta}>{t('checking')}</Text>:null}
   {error?<View style={s.errorRow}><Text accessibilityRole="alert" style={s.error}>{error}</Text>
    <GameButton title={t('retry')} tone="secondary" compact onPress={onRefresh}/></View>:null}
   {!loading&&!error&&available.length===0?<View style={s.empty}>
    <Text style={s.emptyTitle}>{t('emptyTitle')}</Text>
    <Text style={s.meta}>{t('emptyCopy')}</Text>
   </View>:null}
   {available.map(candidate=>{
    const chosen=selectedIds.includes(candidate.profileId);
    const why=chosen?'':selectedIds.length>=3?'max':reasonFor(candidate,selectedIds,candidates,hostClassId,hostRole);
    const disabled=!!why;
    return <Pressable key={candidate.profileId} accessibilityRole="checkbox"
     accessibilityLabel={candidate.name+', '+displayClass(candidate.classId)+', '+candidate.role}
     accessibilityState={{checked:chosen,disabled}} accessibilityHint={disabled?t('disabled'):undefined}
     disabled={disabled} onPress={()=>toggle(candidate)}
     style={({pressed})=>[s.person,chosen&&s.personChosen,disabled&&s.personDisabled,pressed&&s.pressed]}>
      <View style={[s.avatar,chosen&&s.avatarChosen]}>
       <Text style={[s.avatarLetter,chosen&&s.avatarLetterChosen]}>{candidate.name.slice(0,1).toUpperCase()}</Text>
      </View>
      <View style={s.personInfo}>
       <Text style={s.personName} numberOfLines={1}>{candidate.name}</Text>
       <Text style={s.personSub} numberOfLines={1}>{displayClass(candidate.classId)}  ·  Lv {candidate.level}</Text>
       <Text style={s.relationship}>{candidate.relationship==='both'?t('both'):candidate.relationship==='friend'?t('friend'):t('guildMember')}</Text>
      </View>
      <RoleBadge role={candidate.role} label={candidate.role==='damage'?'DMG':candidate.role==='support'?'SUP':'TANK'}/>
      <View style={[s.selectIcon,chosen&&s.selectIconChosen]}>
       <Text style={[s.selectIconText,chosen&&s.selectIconTextChosen]}>{chosen?'✓':disabled?'–':'+'}</Text>
      </View>
     </Pressable>;
   })}
   {!!selectionError?<Text accessibilityRole="alert" style={s.error}>{selectionError}</Text>:null}
   <Text style={s.privacy}>{t('privacy')}</Text>
  </View>:null}
 </FantasyPanel>;
}
const makeStyles=(C:CoopColors)=>StyleSheet.create({
 header:{flexDirection:'row',alignItems:'center',minHeight:48,gap:9},
 emblem:{width:34,height:34,borderRadius:7,justifyContent:'center',alignItems:'center',backgroundColor:C.goldDim,borderWidth:1,borderColor:C.gold},
 emblemText:{fontSize:19,color:C.gold,fontWeight:'900'},
 headerContent:{flex:1,minWidth:0,gap:2},
 heading:{fontSize:15,lineHeight:20,color:C.text,fontWeight:'900'},
 subtitle:{fontSize:11,lineHeight:15,color:C.textSecondary},
 counter:{borderRadius:6,borderWidth:1,borderColor:C.goldDim,paddingHorizontal:7,paddingVertical:4,backgroundColor:C.surfaceRaised},
 counterText:{fontSize:11,color:C.gold,fontWeight:'900'},
 chevron:{fontSize:23,color:C.cyan,fontWeight:'900',width:17,textAlign:'center'},
 partySlots:{flexDirection:'row',gap:5},
 slot:{flex:1,minWidth:0,borderWidth:1,borderColor:C.line,borderRadius:6,backgroundColor:C.surfaceRaised,paddingHorizontal:4,paddingTop:7,paddingBottom:5,alignItems:'center',gap:4},
 slotChosen:{borderColor:C.cyan},slotHost:{borderColor:C.goldDim},
 slotRole:{fontSize:8,fontWeight:'900',letterSpacing:.15,color:C.textSecondary},
 slotName:{fontSize:10,lineHeight:14,fontWeight:'900',color:C.text,textAlign:'center',width:'100%'},
 slotYou:{color:C.gold},slotDim:{color:C.textMuted},
 slotMark:{height:2,width:'45%',backgroundColor:C.line,borderRadius:2},
 slotMarkChosen:{backgroundColor:C.cyan},slotMarkHost:{backgroundColor:C.gold},
 details:{gap:9,paddingTop:9,borderTopWidth:1,borderTopColor:C.line},
 explainer:{fontSize:11,lineHeight:17,color:C.textSecondary},
 filters:{flexDirection:'row',alignSelf:'flex-start',gap:5},
 filter:{borderWidth:1,borderColor:C.line,borderRadius:6,paddingVertical:7,paddingHorizontal:13,backgroundColor:C.surfaceRaised,minWidth:57,alignItems:'center'},
 filterSelected:{borderColor:C.cyan,backgroundColor:C.surface},
 filterText:{fontSize:11,color:C.textSecondary,fontWeight:'800'},filterTextSelected:{color:C.cyan},
 search:{height:37,borderWidth:1,borderColor:C.line,borderRadius:6,paddingHorizontal:11,color:C.text,backgroundColor:C.surfaceRaised,fontSize:12},
 person:{minHeight:62,flexDirection:'row',alignItems:'center',gap:9,borderWidth:1,borderColor:C.line,borderRadius:8,paddingHorizontal:9,paddingVertical:7,backgroundColor:C.surface},
 personChosen:{borderColor:C.cyan,backgroundColor:C.surfaceRaised},
 personDisabled:{opacity:.4},
 avatar:{width:35,height:35,borderRadius:6,alignItems:'center',justifyContent:'center',backgroundColor:C.surfaceRaised,borderColor:C.goldDim,borderWidth:1},
 avatarChosen:{borderColor:C.cyan},avatarLetter:{color:C.gold,fontSize:18,fontWeight:'900'},avatarLetterChosen:{color:C.cyan},
 personInfo:{flex:1,minWidth:0,gap:1},
 personName:{fontSize:12,fontWeight:'900',color:C.text},personSub:{fontSize:10,color:C.textSecondary},
 relationship:{fontSize:9,color:C.cyan,fontWeight:'800'},
 selectIcon:{borderWidth:1,borderColor:C.goldDim,borderRadius:5,width:24,height:24,alignItems:'center',justifyContent:'center'},
 selectIconChosen:{backgroundColor:C.cyan,borderColor:C.cyan},
 selectIconText:{fontSize:16,fontWeight:'900',color:C.textSecondary},selectIconTextChosen:{color:C.surface},
 meta:{fontSize:11,lineHeight:17,color:C.textSecondary},
 empty:{borderRadius:8,borderWidth:1,borderColor:C.line,padding:11,gap:3},
 emptyTitle:{color:C.text,fontSize:12,fontWeight:'900'},
 privacy:{fontSize:10,lineHeight:15,color:C.textMuted},
 errorRow:{flexDirection:'row',gap:8,alignItems:'center'},
 error:{fontSize:11,color:C.danger,flexShrink:1},
 pressed:{opacity:.75},
});
