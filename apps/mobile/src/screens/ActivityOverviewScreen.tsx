import {useMemo,useState} from 'react';
import {ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {GameButton} from '../components/GameButton';
import {GameModalHeader,GameModalSurface} from '../components/GameModalSurface';
import {Panel} from '../components/Panel';
import {GATHERING} from '../content/skills';
import {MONSTERS} from '../content/monsters';
import {characterDeleteBlockReason,characterDeleteConfirmation} from '../core/account-actions';
import {accountCharacters,accountSkillLevel,CHARACTER_SLOT_THRESHOLDS,unlockedCharacterSlots} from '../core/account-roster';
import {equipmentCraftingQueue} from '../core/equipment-crafting-queue';
import type {ActiveActivity,GameState} from '../core/types';
import {spacing,typography,equipmentTheme,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

function elapsed(startedAtMs:number,nowMs:number){const total=Math.max(0,Math.floor((nowMs-startedAtMs)/1000)),hours=Math.floor(total/3600),minutes=Math.floor((total%3600)/60),seconds=total%60;return hours?`${hours}h ${minutes}m`:`${minutes}m ${seconds}s`}
function activityName(activity:ActiveActivity){if(activity.kind==='combat')return MONSTERS.find(item=>item.id===activity.targetId)?.name??activity.targetId.replaceAll('_',' ');return GATHERING.find(item=>item.id===activity.targetId)?.name??activity.targetId.replaceAll('_',' ')}
function activityLabel(activity:ActiveActivity|null){if(!activity)return 'Idle';return activity.kind==='combat'?'Combat':activity.kind==='training'?'Training':activity.kind==='faith'?'Faith practice':activity.kind.charAt(0).toUpperCase()+activity.kind.slice(1)}

export function ActivityOverviewScreen({state,now,onSwitch,onCreate,onDelete}:{state:GameState;now:number;onSwitch:(id:string)=>void;onCreate?:()=>void;onDelete?:(id:string,confirmation:string)=>Promise<void>|void}){
 const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);
 const entries=accountCharacters(state).map(entry=>({character:entry.character,activity:entry.character.id===state.character?.id?state.activity:(state.otherCharacters??[]).find(other=>other.character.id===entry.character.id)?.activity??null})).sort((a,b)=>Number(Boolean(b.activity))-Number(Boolean(a.activity)));
 const slots=unlockedCharacterSlots(state),skillTotal=accountSkillLevel(state),nextThreshold=slots<5?CHARACTER_SLOT_THRESHOLDS[slots]:undefined;
 const [managingId,setManagingId]=useState<string>(),[confirmation,setConfirmation]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const target=entries.find(entry=>entry.character.id===managingId);
 const required=target?characterDeleteConfirmation(target.character.name):'';
 const confirmed=!!target&&confirmation===required;
 const blockReason=target?characterDeleteBlockReason(state,target.character.id):undefined;
 const craftCount=target?equipmentCraftingQueue(state).filter(job=>job.ownerCharacterId===target.character.id).length:0;
 const close=()=>{if(busy)return;setManagingId(undefined);setConfirmation('');setError('')};
 const open=(id:string)=>{setManagingId(id);setConfirmation('');setError('')};
 const remove=async(recreate:boolean)=>{
  if(!target||!onDelete||!confirmed||blockReason||busy)return;
  setBusy(true);setError('');
  try{
   await onDelete(target.character.id,confirmation);
   setManagingId(undefined);setConfirmation('');
   if(recreate)onCreate?.();
  }catch(e){setError(e instanceof Error?e.message:'Character could not be deleted.');}
  finally{setBusy(false);}
 };
 return <>
  <ScrollView contentContainerStyle={s.root}>
   <Text accessibilityRole="header" style={s.heading}>Characters</Text>
   <Text style={s.intro}>Switch characters, review their current activity, or safely free a slot when you want to choose another class.</Text>
   <Panel>
    <View style={s.summary}>
     <View style={s.summaryCell}><Text style={s.summaryLabel}>ROSTER</Text><Text style={s.summaryValue}>{entries.length}/{slots}</Text></View>
     <View style={s.summaryCell}><Text style={s.summaryLabel}>ACTIVE</Text><Text style={s.summaryValue}>{entries.filter(entry=>entry.activity).length}</Text></View>
     <View style={s.summaryCell}><Text style={s.summaryLabel}>ACCOUNT SKILL</Text><Text style={s.summaryValue}>{skillTotal}</Text></View>
    </View>
    {nextThreshold!==undefined?<Text style={s.slotHint}>Next character slot unlocks at {nextThreshold} combined account skill levels.</Text>:<Text style={s.slotHint}>All 5 character slots are permanently unlocked.</Text>}
   </Panel>
   {entries.map(({character,activity})=>{const active=character.id===state.character?.id;return <Panel key={character.id} accentColor={active?equipmentColors.selectedLine:undefined}>
    <View style={s.row}>
     <View style={s.copy}><View style={s.nameRow}><Text style={s.name}>{character.name}</Text>{active&&<Text style={s.active}>ACTIVE CHARACTER</Text>}</View><Text style={s.meta}>{character.classId} · Level {character.level}</Text></View>
     <View style={s.actions}>{!active&&<GameButton compact title="Switch" tone="secondary" onPress={()=>onSwitch(character.id)}/>}<GameButton compact title="Manage" tone="secondary" onPress={()=>open(character.id)}/></View>
    </View>
    <View style={s.activityRow}><View style={[s.dot,activity?s.dotOn:s.dotIdle]}/><View style={s.copy}><Text style={activity?[s.activity,activityTone(activity.kind,s)]:s.idle}>{activity?activityLabel(activity):'Idle'}</Text>{activity?<><Text style={s.target}>{activityName(activity)}</Text><Text style={s.meta}>Running for {elapsed(activity.startedAtMs,now)}</Text></>:<Text style={s.meta}>No activity is currently running.</Text>}</View></View>
   </Panel>})}
   {onCreate&&entries.length<slots?<GameButton title="Create another character" tone="secondary" onPress={onCreate}/>:null}
  </ScrollView>
  <GameModalSurface visible={!!target} presentation="dialog" reduceMotion={state.settings.reduceMotion} onClose={close} backdropLabel="Close character management">
   <GameModalHeader eyebrow="CHARACTER MANAGEMENT" title={target?.character.name??'Character'} onClose={close} closeDisabled={busy}/>
   {target?<View style={s.modalBody}>
    <View style={s.warning}><Text style={s.warningTitle}>Permanent character deletion</Text><Text style={s.warningText}>Levels, XP, Gold, skills, quests, class progress, saved loadouts and character-bound appearance progress are removed. Equipment enhancement/temper ranks and pity progress are also removed; recovered gear returns as its base item. Inventory, overflow items, equipped gear, gathering tools and socketed gems are recovered to the shared Bank, then Overflow if needed.</Text></View>
    <View style={s.preserved}><Text style={s.preservedTitle}>ACCOUNT PROGRESS STAYS</Text><Text style={s.preservedText}>Earned character slots, premium currency, companions, Guild membership and account collectibles are preserved.</Text></View>
    {blockReason?<View style={s.block}><Text accessibilityRole="alert" style={s.blockTitle}>Finish before deleting</Text><Text style={s.blockText}>{blockReason}</Text>{craftCount>0?<Text style={s.blockText}>{craftCount} equipment craft{craftCount===1?' is':'s are'} still linked to this character.</Text>:null}</View>:null}
    <Text style={s.confirmLabel}>Type <Text style={s.confirmCode}>{required}</Text> to unlock the delete actions.</Text>
    <TextInput accessibilityLabel="Character deletion confirmation" autoCapitalize="characters" autoCorrect={false} editable={!busy&&!blockReason} value={confirmation} onChangeText={value=>{setConfirmation(value);setError('')}} placeholder={required} placeholderTextColor={C.muted} style={s.input}/>
    {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    <GameButton title={busy?'Deleting…':'Delete & choose new class'} loading={busy} disabled={!onDelete||!confirmed||!!blockReason||busy} tone="danger" onPress={()=>void remove(true)}/>
    {entries.length>1?<GameButton title="Delete character only" disabled={!onDelete||!confirmed||!!blockReason||busy} tone="secondary" onPress={()=>void remove(false)}/>:null}
    <Text style={s.footnote}>{entries.length===1?'This is your only character. After deletion you return to class creation.':'Choosing a new class deletes this character first, frees the slot, and then opens class creation. Plain delete keeps you on the remaining roster.'}</Text>
   </View>:null}
  </GameModalSurface>
 </>;
}

function activityTone(kind:ActiveActivity['kind'],s:ReturnType<typeof makeStyles>){return kind==='combat'?s.combatTone:kind==='training'?s.trainingTone:kind==='faith'?s.faithTone:s.gatheringTone}

function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({
 root:{padding:spacing.lg,gap:spacing.md,paddingBottom:spacing.xl},heading:{...typography.hero,color:C.text},intro:{...typography.body,color:C.muted,lineHeight:21},
 summary:{flexDirection:'row',gap:spacing.lg,flexWrap:'wrap'},summaryCell:{minWidth:72},summaryLabel:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900',letterSpacing:1},summaryValue:{...typography.title,color:C.text},slotHint:{...typography.caption,color:C.muted,marginTop:spacing.sm},
 row:{flexDirection:'row',alignItems:'center',gap:spacing.sm},nameRow:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:spacing.sm},copy:{flex:1,minWidth:0},actions:{flexDirection:'row',alignItems:'center',justifyContent:'flex-end',gap:spacing.xs,flexWrap:'wrap'},name:{...typography.title,color:C.text},active:{...typography.caption,color:equipmentColors.selectedLine,fontWeight:'900',letterSpacing:.7},meta:{...typography.caption,color:C.muted,marginTop:2},
 activityRow:{flexDirection:'row',alignItems:'center',gap:spacing.sm,marginTop:spacing.md,paddingTop:spacing.md,borderTopWidth:1,borderColor:C.line},dot:{width:10,height:10,borderRadius:5},dotOn:{backgroundColor:C.good},dotIdle:{backgroundColor:C.disabled},activity:{...typography.bodyStrong,color:C.good},combatTone:{color:C.bad},gatheringTone:{color:equipmentColors.goldSoft},trainingTone:{color:C.info},faithTone:{color:C.special},idle:{...typography.bodyStrong,color:C.muted},target:{...typography.bodyStrong,color:equipmentColors.goldSoft,marginTop:2},
 modalBody:{gap:spacing.md,paddingBottom:spacing.sm},warning:{borderWidth:1,borderColor:C.bad,backgroundColor:C.warningSurface,padding:spacing.md,borderRadius:10,gap:4},warningTitle:{...typography.bodyStrong,color:C.bad},warningText:{...typography.caption,color:C.text,lineHeight:18},
 preserved:{borderWidth:1,borderColor:C.good,backgroundColor:C.goodSurface,padding:spacing.md,borderRadius:10,gap:4},preservedTitle:{...typography.caption,color:C.good,fontWeight:'900',letterSpacing:.7},preservedText:{...typography.caption,color:C.text,lineHeight:18},
 block:{borderWidth:1,borderColor:C.warning,backgroundColor:C.warningSurface,padding:spacing.md,borderRadius:10,gap:4},blockTitle:{...typography.bodyStrong,color:C.warning},blockText:{...typography.caption,color:C.text,lineHeight:18},
 confirmLabel:{...typography.body,color:C.text},confirmCode:{fontWeight:'900',color:C.bad},input:{minHeight:48,borderWidth:1,borderColor:C.lineStrong,borderRadius:8,paddingHorizontal:spacing.md,color:C.text,backgroundColor:C.panel2,...typography.body},error:{...typography.caption,color:C.bad},footnote:{...typography.caption,color:C.muted,lineHeight:18}
});}
