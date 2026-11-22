import {useMemo,useState} from 'react';
import {Image,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useCoopStyles} from '../../theme/useCoopStyles';
import type {CoopColors} from '../../theme/coop-ui-theme';
import {dungeonEchoPickerText} from '../../i18n/dungeon-social-echo-copy';
import type {Language} from '../../i18n/languages';
import {validateSelectedSocialEchoCharacterIds,type SocialEchoCandidate} from '../../core/coop-social-echoes';
import {FantasyPanel} from './CoopVisualKit';
import {GameButton} from '../GameButton';
import {IdentityArtwork} from '../SocialIdentity';
import {coopUiAssets} from '../../theme/coop-ui-assets';

type Role='tank'|'damage'|'support';
type Filter='all'|'friend'|'guild';
const PARTY_ROLES:readonly Role[]=['tank','damage','damage','support'];
function displayClass(classId:string){
 return classId.split('_').map(word=>word.slice(0,1)+word.slice(1).toLowerCase()).join(' ');
}
function displayCombatPower(combatPower:number,compact=false){
 const cp=Math.max(0,Math.round(combatPower));
 if(compact&&cp>=10000)return (cp/1000).toFixed(1).replace(/\.0$/,'')+'K';
 return cp.toLocaleString('en-US');
}
function reasonFor(candidate:SocialEchoCandidate,selectedIds:readonly string[],
 candidates:readonly SocialEchoCandidate[],hostClassId:string,hostRole:Role){
 try{
  validateSelectedSocialEchoCharacterIds([...selectedIds,candidate.characterId],candidates,hostClassId,hostRole);
  return '';
 }catch(error){
  return error instanceof Error?error.message:'invalid_echo_selection';
 }
}
function roleSlots(hostRole:Role,candidates:readonly SocialEchoCandidate[],selectedIds:readonly string[],hostCombatPower:number){
 const chosen=selectedIds.map(id=>candidates.find(row=>row.characterId===id)).filter((v):v is SocialEchoCandidate=>!!v);
 const used=new Set<string>();let hostUsed=false;
 return PARTY_ROLES.map((role,index)=>{
  if(role===hostRole&&!hostUsed){hostUsed=true;return {key:role+index,role,name:'YOU',kind:'host' as const,combatPower:hostCombatPower};}
  const person=chosen.find(row=>row.role===role&&!used.has(row.characterId));
  if(person){used.add(person.characterId);return {key:role+index,role,name:person.name,kind:'chosen' as const,combatPower:person.combatPower};}
  return {key:role+index,role,name:'AUTO',kind:'auto' as const,combatPower:null};
 });
}

/** Compact, optional pre-run party builder. No sharing switch exists.
 * Contacts are server-derived; role legality is checked again at run start. */
export function CoopSocialEchoPicker({
 language,candidates,selectedIds,onChange,hostRole,hostClassId,hostCombatPower,loading,error,onRefresh,
}:{
 language:Language;candidates:readonly SocialEchoCandidate[];selectedIds:readonly string[];onChange:(ids:string[])=>void;
 hostRole:Role;hostClassId:string;hostCombatPower:number;loading:boolean;error?:string;onRefresh:()=>void;
}){
 const {styles:s,colors:C}=useCoopStyles(makeStyles);
 const t=(key:Parameters<typeof dungeonEchoPickerText>[1],count?:number)=>dungeonEchoPickerText(language,key,count);
 const [expanded,setExpanded]=useState(true);
 const [filter,setFilter]=useState<Filter>('all');
 const [search,setSearch]=useState('');
 const [selectionError,setSelectionError]=useState('');
 const slots=roleSlots(hostRole,candidates,selectedIds,hostCombatPower);
 const available=useMemo(()=>candidates.filter(row=>{
  if(filter!=='all'&&row.relationship!==filter&&row.relationship!=='both')return false;
  const q=search.trim().toLowerCase();
  return !q||row.name.toLowerCase().includes(q)||displayClass(row.classId).toLowerCase().includes(q);
 }).sort((a,b)=>Number(selectedIds.includes(b.characterId))-Number(selectedIds.includes(a.characterId))||a.name.localeCompare(b.name)),[candidates,filter,search,selectedIds]);
 const disabledReason=(code:string)=>code==='duplicate_coop_account'?t('onePlayer'):
  code==='duplicate_damage_class'?t('uniqueDamage'):t('slotFull');
 const toggle=(candidate:SocialEchoCandidate)=>{
  if(selectedIds.includes(candidate.characterId)){
   onChange(selectedIds.filter(id=>id!==candidate.characterId));setSelectionError('');return;
  }
  const errorCode=reasonFor(candidate,selectedIds,candidates,hostClassId,hostRole);
  if(errorCode){
   setSelectionError(disabledReason(errorCode));return;
  }
  onChange([...selectedIds,candidate.characterId]);setSelectionError('');
 };
 return <FantasyPanel variant={selectedIds.length?'selected':'default'}>
  <Pressable accessibilityRole="button" accessibilityLabel={t('open')}
   accessibilityState={{expanded}} onPress={()=>setExpanded(v=>!v)} style={({pressed})=>[s.header,pressed&&s.pressed]}>
   <View style={s.emblem}><Text style={s.emblemText}>✦</Text></View>
   <View style={s.headerContent}>
    <Text style={s.heading}>{t('title')}</Text>
    <Text style={s.subtitle} numberOfLines={2}>{selectedIds.length
     ?t('chosen',selectedIds.length)
     :t('subtitle')}</Text>
   </View>
   <View style={s.counter} accessible accessibilityLabel={t("chosen",selectedIds.length)}><Text style={s.counterText}>{selectedIds.length}/3</Text></View>
   <Text style={s.chevron}>{expanded?'⌄':'›'}</Text>
  </Pressable>

  <View style={s.partySlots} accessibilityLabel={t('title')}>
   {slots.map(slot=><View key={slot.key} accessible accessibilityLabel={t(slot.role)+': '+(slot.kind==='host'?t('you'):slot.kind==='auto'?t('auto'):slot.name)+(slot.combatPower===null?'':', CP '+displayCombatPower(slot.combatPower))} style={[s.slot,slot.kind==='chosen'&&s.slotChosen,slot.kind==='host'&&s.slotHost]}>
    <Text style={[s.slotRole,slot.kind==='auto'&&s.slotDim]}>{t(slot.role)}</Text>
    <Image accessible={false} source={coopUiAssets[slot.role==='damage'?'role_damage':slot.role==='support'?'role_support':'role_tank']} style={[s.slotRoleIcon,slot.kind==='auto'&&s.slotRoleIconDim]} resizeMode="contain"/>
    <Text style={[s.slotName,slot.kind==='auto'&&s.slotDim,slot.kind==='host'&&s.slotYou]} numberOfLines={1}>{slot.kind==='host'?t('you'):slot.kind==='auto'?t('auto'):slot.name}</Text>
    <Text style={[s.slotPower,slot.kind==='auto'&&s.slotDim]} numberOfLines={1}>{slot.combatPower===null?'CP —':'CP '+displayCombatPower(slot.combatPower,true)}</Text>
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
   {!loading&&!error&&available.map(candidate=>{
    const chosen=selectedIds.includes(candidate.characterId);
    const why=chosen?'':selectedIds.length>=3?'max':reasonFor(candidate,selectedIds,candidates,hostClassId,hostRole);
    const disabled=!!why;
    const reasonLabel=disabled?disabledReason(why):'';
    return <Pressable key={candidate.characterId} accessibilityRole="checkbox"
     accessibilityLabel={candidate.name+', '+displayClass(candidate.classId)+', '+candidate.role}
     accessibilityState={{checked:chosen,disabled}} accessibilityHint={disabled?reasonLabel:undefined}
     disabled={disabled} onPress={()=>toggle(candidate)}
     style={({pressed})=>[s.person,chosen&&s.personChosen,disabled&&s.personDisabled,pressed&&s.pressed]}>
      <IdentityArtwork name={candidate.name} className={candidate.classId} size={34}/>
      <View style={s.personInfo}>
       <Text style={s.personName} numberOfLines={1}>{candidate.name}</Text>
       <Text style={s.personSub} numberOfLines={1}>{displayClass(candidate.classId)}  ·  Lv {candidate.level}</Text>
       <View style={s.personMeta}>
        <Text style={s.personPower}>CP {displayCombatPower(candidate.combatPower)}</Text>
        <Text style={[s.relationship,disabled&&s.reason]} numberOfLines={2}>{disabled?reasonLabel:candidate.relationship==='both'?t('both'):candidate.relationship==='friend'?t('friend'):t('guildMember')}</Text>
       </View>
      </View>
      <View style={s.rolePill}><Image accessible={false} source={coopUiAssets[candidate.role==='damage'?'role_damage':candidate.role==='support'?'role_support':'role_tank']} style={s.roleIcon} resizeMode="contain"/><Text style={s.rolePillText}>{candidate.role==='damage'?'DMG':candidate.role==='support'?'SUP':'TANK'}</Text></View>
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
 slotRoleIcon:{width:21,height:21},slotRoleIconDim:{opacity:.48},
 slotName:{fontSize:10,lineHeight:14,fontWeight:'900',color:C.text,textAlign:'center',width:'100%'},
 slotYou:{color:C.gold},slotDim:{color:C.textMuted},
 slotPower:{fontSize:9,lineHeight:12,fontWeight:'800',color:C.gold,textAlign:'center',width:'100%'},
 slotMark:{height:2,width:'45%',backgroundColor:C.line,borderRadius:2},
 slotMarkChosen:{backgroundColor:C.cyan},slotMarkHost:{backgroundColor:C.gold},
 details:{gap:9,paddingTop:9,borderTopWidth:1,borderTopColor:C.line},
 explainer:{fontSize:11,lineHeight:17,color:C.textSecondary},
 filters:{flexDirection:'row',alignSelf:'stretch',gap:5},
 filter:{flex:1,minHeight:44,justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:6,paddingVertical:7,paddingHorizontal:12,backgroundColor:C.surfaceRaised,minWidth:57,alignItems:'center'},
 filterSelected:{borderColor:C.cyan,backgroundColor:C.surface},
 filterText:{fontSize:11,color:C.textSecondary,fontWeight:'800'},filterTextSelected:{color:C.cyan},
 search:{minHeight:44,borderWidth:1,borderColor:C.line,borderRadius:6,paddingHorizontal:11,color:C.text,backgroundColor:C.surfaceRaised,fontSize:12},
 person:{minHeight:60,flexDirection:'row',alignItems:'center',gap:7,borderWidth:1,borderColor:C.line,borderRadius:8,paddingHorizontal:8,paddingVertical:6,backgroundColor:C.surface},
 personChosen:{borderColor:C.cyan,backgroundColor:C.surfaceRaised},
 personDisabled:{opacity:.66},
 avatar:{width:32,height:32,borderRadius:6,alignItems:'center',justifyContent:'center',backgroundColor:C.surfaceRaised,borderColor:C.goldDim,borderWidth:1},
 avatarChosen:{borderColor:C.cyan},avatarLetter:{color:C.gold,fontSize:18,fontWeight:'900'},avatarLetterChosen:{color:C.cyan},
 personInfo:{flex:1,minWidth:0,gap:1},
 personName:{fontSize:12,fontWeight:'900',color:C.text},personSub:{fontSize:10,color:C.textSecondary},
 personMeta:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',columnGap:6,rowGap:1},
 personPower:{fontSize:10,lineHeight:13,fontWeight:'900',color:C.gold},
 relationship:{fontSize:9,lineHeight:12,color:C.cyan,fontWeight:'800'},
 reason:{color:C.textSecondary,fontWeight:'700'},
 rolePill:{minWidth:48,paddingHorizontal:4,minHeight:28,flexDirection:'row',gap:2,justifyContent:'center',alignItems:'center',borderRadius:5,borderWidth:1,borderColor:C.goldDim,backgroundColor:C.surfaceRaised},
 roleIcon:{width:16,height:16},
 rolePillText:{fontSize:9,fontWeight:'900',color:C.gold},
 selectIcon:{borderWidth:1,borderColor:C.goldDim,borderRadius:5,width:26,height:26,alignItems:'center',justifyContent:'center'},
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
