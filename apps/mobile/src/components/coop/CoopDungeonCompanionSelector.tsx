import {useEffect,useMemo,useState} from 'react';
import {ActivityIndicator,Image,Modal,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../../core/types';
import {combatCompanionDef} from '../../content/combat-companions';
import {canEquipCompanion,classCompanionRole} from '../../core/combat-companions';
import {dungeonCompanionOpportunity,type DungeonCompanionCounterId} from '../../../../../backend/src/server/coop/dungeon-companion-counters';
import {companionArtSource} from '../../theme/companion-art';
import {useCoopStyles} from '../../theme/useCoopStyles';
import type {CoopColors} from '../../theme/coop-ui-theme';
import {useSocialText} from '../../i18n/social';
import {UiIcon} from '../UiIcon';

export function dungeonCompanionCounterLabel(id:DungeonCompanionCounterId,st:(text:string)=>string):string{
 switch(id){
  case 'armor_break':return st('Strong against guardians and barriers');
  case 'swarm_hunt':return st('Faster against swarms');
  case 'bulwark':return st('Shields against heavy attacks');
  case 'recovery':return st('Recovery against lingering damage');
  case 'spellbreak':return st('Interrupts dangerous casts');
  case 'finisher':return st('Pressure against healing enemies');
 }
}

type Props={
 state:GameState;visible:boolean;busy?:boolean;possibleCounterIds?:readonly DungeonCompanionCounterId[];
 onClose:()=>void;onSelect:(id:string|null)=>Promise<void>;
};

/** Selection is only a command intent: equipment state remains server-owned.
 * The real dungeon entrypoint must be reloaded after the command succeeds. */
export function CoopDungeonCompanionSelector({state,visible,busy=false,possibleCounterIds=[],onClose,onSelect}:Props){
 const st=useSocialText(),{styles:s}=useCoopStyles(makeStyles);
 const [pending,setPending]=useState(false),[pendingId,setPendingId]=useState<string|null|undefined>(undefined),[error,setError]=useState('');
 useEffect(()=>{if(visible)setError('');},[visible]);
 const character=state.character,equipped=character?.equippedCombatCompanionId;
 const role=character?classCompanionRole(character.classId):undefined;
 const entries=useMemo(()=>{
  return [...new Set(state.account.unlockedCombatCompanionIds??[])].map(id=>{
   const def=combatCompanionDef(id),progress=state.account.combatCompanionProgress?.[id];
   if(!def||!progress)return undefined;
   const inTrial=Boolean(state.account.companionTrialProgress?.season.activeRun?.teamCompanionIds.includes(id));
   const onExpedition=Boolean(state.account.companionAssignments?.some(a=>a.status!=='claimed'&&a.status!=='cancelled'&&a.companionIds.includes(id)));
   const forbidden=Boolean(role&&!canEquipCompanion(role,def.role));
   const matchup=dungeonCompanionOpportunity(id,possibleCounterIds);
   return {id,def,progress,busy:inTrial||onExpedition,forbidden,matchup,selected:id===equipped};
  }).filter((item):item is NonNullable<typeof item>=>Boolean(item))
   // Keep current selection first, then possible counters, legal choices, and reserved choices.
   .sort((a,b)=>Number(b.selected)-Number(a.selected)
    ||Number(Boolean(b.matchup&&!b.busy&&!b.forbidden))-Number(Boolean(a.matchup&&!a.busy&&!a.forbidden))
    ||Number(!b.busy&&!b.forbidden)-Number(!a.busy&&!a.forbidden)
    ||a.def.name.localeCompare(b.def.name));
 },[state.account,role,equipped,possibleCounterIds]);

 const availableCount=entries.filter(item=>!item.busy&&!item.forbidden).length;
 const dismiss=()=>{if(!pending&&!busy)onClose();};
 const choose=async(id:string|null)=>{
  if(pending||busy||id===equipped)return;
  const item=id?entries.find(value=>value.id===id):undefined;
  if(id&&(!item||item.busy||item.forbidden))return;
  setPending(true);setPendingId(id);setError('');
  try{await onSelect(id);onClose();}
  catch(reason){setError(reason instanceof Error?reason.message:st('Could not equip companion. Try again.'));}
  finally{setPending(false);setPendingId(undefined);}
 };
 return <Modal visible={visible} animationType="fade" transparent onRequestClose={dismiss}>
  <View style={s.overlay}>
   <View style={s.sheet}>
    <View style={s.header}>
     <View style={s.grow}><Text accessibilityRole="header" style={s.title}>{st('Choose dungeon companion')}</Text>
      <Text style={s.hint}>{st('Your choice applies before joining. Echoes already shared will not change.')}</Text>
      <Text style={s.hint}>{st('This also changes your companion in normal combat.')}</Text></View>
     <Pressable accessibilityRole="button" accessibilityLabel={st('Close')} disabled={pending||busy} onPress={dismiss} style={s.close}><Text style={s.closeText}>×</Text></Pressable>
    </View>
    <View style={s.summary}>
     <Text style={s.summaryText}>{st('Available companions: {count}',{count:availableCount})}</Text>
     <Text style={s.hint}>{st('Possible advantages depend on the randomized rooms. The server checks the actual fight.')}</Text>
    </View>
    {error?<Text accessibilityRole="alert" style={s.error}>{error}</Text>:null}
    <ScrollView style={s.scroll} contentContainerStyle={s.items} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
     {entries.map(item=>{
      const art=companionArtSource(item.id),disabled=pending||busy||item.busy||item.forbidden||item.selected;
      const status=item.busy?st('In Trial or Expedition'):item.forbidden?st('Same role as your class'):item.selected?st('Equipped'):item.matchup?st('Possible counter'):st('Available');
      const roleLabel=st(item.def.role==='damage'?'Damage':item.def.role==='tank'?'Tank':'Support');
      const assist=st(item.def.role==='damage'?'Damage assist':item.def.role==='tank'?'Shield assist':'Healing assist');
      return <Pressable key={item.id} accessibilityRole="button"
       accessibilityLabel={item.def.name+', '+item.def.role+', '+status}
       accessibilityState={{selected:item.selected,disabled}}
       disabled={disabled} onPress={()=>void choose(item.id)}
       style={({pressed})=>[s.item,item.selected&&s.equipped,disabled&&!item.selected&&s.disabled,pressed&&s.pressed]}>
       <View style={s.artFrame}>{art?<Image source={art} style={s.art} resizeMode="contain"/>:<UiIcon name="companions" size={28}/>}</View>
       <View style={s.grow}>
        <Text numberOfLines={1} style={s.name}>{item.def.name}{item.selected?' ✓':''}</Text>
        <Text style={s.meta}>{st('Level')} {item.progress.level} · {roleLabel} · {item.def.rarity}</Text>
        <Text style={s.assist}>{assist}</Text>
        {item.matchup&&!item.busy&&!item.forbidden?<Text style={s.matchup}>{dungeonCompanionCounterLabel(item.matchup,st)}</Text>:null}
        {item.busy||item.forbidden?<Text style={s.reason}>{status}</Text>:null}
       </View>
       {pending&&pendingId===item.id?<ActivityIndicator size="small" color={s.status.color}/>:<Text style={[s.status,item.matchup&&!disabled&&s.matchup]}>{status}</Text>}
      </Pressable>;
     })}
     {!entries.length?<Text style={s.hint}>{st('No companions unlocked yet.')}</Text>:null}
     <Pressable accessibilityRole="button" accessibilityLabel={st('No companion')}
       disabled={pending||busy||!equipped} onPress={()=>void choose(null)}
       style={[s.item,!equipped&&s.equipped]}>
       <View style={s.artFrame}><UiIcon name="companions" size={25}/></View>
       <View style={s.grow}><Text style={s.name}>{st('No companion')}</Text><Text style={s.meta}>{st('Continue without a companion assist')}</Text></View>
       {pending&&pendingId===null?<ActivityIndicator size="small" color={s.status.color}/>:!equipped?<Text style={s.status}>✓</Text>:null}
     </Pressable>
    </ScrollView>
    <Text style={s.foot} accessibilityLiveRegion="polite">{pending||busy?st('Saving companion…'):st('Only companions outside your class role can assist.')}</Text>
   </View>
  </View>
 </Modal>;
}
const makeStyles=(C:CoopColors)=>StyleSheet.create({
 overlay:{flex:1,backgroundColor:'rgba(0,0,0,.74)',justifyContent:'center',paddingHorizontal:12,paddingVertical:24},
 sheet:{maxHeight:'88%',borderRadius:14,backgroundColor:C.surface,borderColor:C.lineStrong,borderWidth:1,padding:12,gap:10},
 header:{flexDirection:'row',alignItems:'flex-start',gap:10},grow:{flex:1,minWidth:0},title:{color:C.gold,fontSize:16,fontWeight:'800'},
 hint:{fontSize:11,color:C.textSecondary,lineHeight:16},summary:{gap:3,paddingHorizontal:2},summaryText:{fontSize:12,fontWeight:'700',color:C.text},close:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'},
 closeText:{fontSize:26,color:C.text},scroll:{flexGrow:0},items:{gap:7,paddingVertical:4},
 item:{flexDirection:'row',alignItems:'center',gap:8,padding:8,minHeight:62,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.surfaceRaised},
 equipped:{borderColor:C.gold},disabled:{opacity:.54},pressed:{opacity:.7},artFrame:{width:42,height:42,justifyContent:'center',alignItems:'center'},
 art:{width:42,height:42},name:{color:C.text,fontSize:13,fontWeight:'700'},meta:{color:C.textMuted,fontSize:11,lineHeight:16},assist:{color:C.textSecondary,fontSize:11,lineHeight:16},
 matchup:{color:C.success,fontSize:11,lineHeight:16,fontWeight:'600'},status:{color:C.textMuted,fontSize:10,fontWeight:'700',maxWidth:86,textAlign:'right',flexShrink:1},
 reason:{color:C.danger,fontSize:11},error:{color:C.danger,fontSize:12},foot:{color:C.textMuted,fontSize:11,textAlign:'center'}
});
