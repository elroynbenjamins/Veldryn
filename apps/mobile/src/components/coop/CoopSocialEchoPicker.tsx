import {useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useCoopStyles} from '../../theme/useCoopStyles';
import {type CoopColors} from '../../theme/coop-ui-theme';
import {useSocialText} from '../../i18n/social';
import {validateSelectedSocialEchoIds,type SocialEchoCandidate} from '../../core/coop-social-echoes';
import {FantasyPanel,RoleBadge,StateChip} from './CoopVisualKit';
import {GameButton} from '../GameButton';

export function CoopSocialEchoPicker({
 candidates,selectedIds,onChange,hostRole,hostClassId,loading,error,onRefresh,
}:{
 candidates:readonly SocialEchoCandidate[];selectedIds:readonly string[];onChange:(ids:string[])=>void;
 hostRole:'tank'|'damage'|'support';hostClassId:string;loading:boolean;error?:string;onRefresh:()=>void;
}){
 const {styles:s,colors:C}=useCoopStyles(makeStyles),st=useSocialText();
 const [expanded,setExpanded]=useState(false),[selectionError,setSelectionError]=useState('');
 const toggle=(id:string)=>{
  const next=selectedIds.includes(id)?selectedIds.filter(row=>row!==id):[...selectedIds,id];
  try{validateSelectedSocialEchoIds(next,candidates,hostClassId,hostRole);onChange(next);setSelectionError('');}
  catch(reason){const code=reason instanceof Error?reason.message:'';
   setSelectionError(code==='duplicate_coop_account'?st('Choose only one character from each friend or guild member.'):code==='duplicate_damage_class'?st('The two Damage allies must use different classes.'):st('Your team must have one Tank, two Damage heroes and one Support.'));
  }
 };
 return <FantasyPanel>
  <Pressable accessibilityRole="button" accessibilityState={{expanded}} onPress={()=>setExpanded(v=>!v)} style={s.heading}>
   <View style={s.flex}><Text style={s.title}>{st('Friends & Guild Echoes')}</Text>
    <Text style={s.copy}>{selectedIds.length?st('{count} selected · other roles filled automatically',{count:selectedIds.length}):st('Optional · your other allies are picked automatically')}</Text>
   </View>
   <StateChip label={`${selectedIds.length}/3`} tone={selectedIds.length?'selected':'neutral'}/>
   <Text style={s.expand}>{expanded?'−':'+'}</Text>
  </Pressable>
  {expanded?<View style={s.body}>
   <Text style={s.copy}>{st('Choose up to three shared characters. Your party keeps one Tank, two different Damage classes, and one Support. Their power is scaled to your character; class skills remain theirs.')}</Text>
   {loading?<Text style={s.copy}>{st('Finding available Echoes…')}</Text>:null}
   {!!error?<View style={s.line}><Text accessibilityRole="alert" style={s.error}>{error}</Text><GameButton compact title={st('Retry')} tone="secondary" onPress={onRefresh}/></View>:null}
   {!loading&&!error&&!candidates.length?<Text style={s.copy}>{st('No eligible shared friend or guild Echoes yet. The dungeon will fill the remaining roles automatically.')}</Text>:null}
   {!!selectionError?<Text accessibilityRole="alert" style={s.error}>{selectionError.replaceAll('_',' ')}</Text>:null}
   {candidates.map(candidate=>{
    const selected=selectedIds.includes(candidate.profileId),full=selectedIds.length>=3&&!selected;
    let illegal=false;
    if(!selected&&!full)try{validateSelectedSocialEchoIds([...selectedIds,candidate.profileId],candidates,hostClassId,hostRole);}catch{illegal=true;}
    const disabled=full||illegal;
    return <Pressable key={candidate.profileId} accessibilityRole="checkbox" accessibilityState={{checked:selected,disabled}}
     disabled={disabled} onPress={()=>toggle(candidate.profileId)} style={({pressed})=>[s.candidate,selected&&s.selected,pressed&&s.pressed,disabled&&s.dim]}>
     <RoleBadge role={candidate.role} label={candidate.role}/>
     <View style={s.flex}><Text style={s.name} numberOfLines={1}>{candidate.name}</Text>
      <Text style={s.copy} numberOfLines={1}>{candidate.classId.replaceAll('_',' ')} · Lv {candidate.level} · {candidate.relationship==='both'?st('Friend & Guild'):candidate.relationship==='friend'?st('Friend'):st('Guild')}</Text>
     </View>
     <Text style={[s.select,{color:selected?C.cyan:C.textMuted}]}>{selected?'✓':disabled?'–':'○'}</Text>
    </Pressable>;
   })}
  </View>:null}
 </FantasyPanel>;
}
const makeStyles=(C:CoopColors)=>StyleSheet.create({
 heading:{flexDirection:'row',alignItems:'center',gap:8,minHeight:45},
 title:{color:C.gold,fontSize:14,fontWeight:'900'},
 copy:{color:C.textSecondary,fontSize:11,lineHeight:16},
 flex:{flex:1,minWidth:0,gap:3},
 expand:{color:C.cyan,fontSize:20,fontWeight:'900',width:21,textAlign:'center'},
 body:{gap:8,paddingTop:10},
 line:{flexDirection:'row',gap:8,alignItems:'center'},
 candidate:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:9,paddingHorizontal:8,borderWidth:1,borderColor:C.line,borderRadius:9},
 selected:{borderColor:C.cyan},
 name:{fontSize:12,color:C.text,fontWeight:'800'},
 select:{fontSize:21,fontWeight:'900'},
 pressed:{opacity:.7},dim:{opacity:.45},
 error:{color:C.danger,fontSize:11,flex:1},
});
