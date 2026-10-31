import {accountText,accountError,accountDuration} from '../i18n/account';
import {useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {GameButton} from '../components/GameButton';
import {GameTextInput} from '../components/GameTextInput';
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
 const language=state.settings.language;
 const a=(text:string,params?:Record<string,string|number>)=>accountText(language,text,params);

 const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]),{width,fontScale}=useWindowDimensions(),stackRows=width<380||fontScale>=1.2;
 const entries=accountCharacters(state).map(entry=>({character:entry.character,activity:entry.character.id===state.character?.id?state.activity:(state.otherCharacters??[]).find(other=>other.character.id===entry.character.id)?.activity??null})).sort((a,b)=>Number(Boolean(b.activity))-Number(Boolean(a.activity)));
 const slots=unlockedCharacterSlots(state),skillTotal=accountSkillLevel(state),nextThreshold=slots<5?CHARACTER_SLOT_THRESHOLDS[slots]:undefined;
 const [managingId,setManagingId]=useState<string>(),[confirmation,setConfirmation]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[showDeleteDetails,setShowDeleteDetails]=useState(false);
 const target=entries.find(entry=>entry.character.id===managingId);
 const required=target?characterDeleteConfirmation(target.character.name):'';
 const confirmed=!!target&&confirmation===required;
 const blockReason=target?characterDeleteBlockReason(state,target.character.id):undefined;
 const craftCount=target?equipmentCraftingQueue(state).filter(job=>job.ownerCharacterId===target.character.id).length:0;
 const close=()=>{if(busy)return;setManagingId(undefined);setConfirmation('');setError('');setShowDeleteDetails(false)};
 const open=(id:string)=>{setManagingId(id);setConfirmation('');setError('');setShowDeleteDetails(false)};
 const remove=async(recreate:boolean)=>{
  if(!target||!onDelete||!confirmed||blockReason||busy)return;
  setBusy(true);setError('');
  try{
   await onDelete(target.character.id,confirmation);
   setManagingId(undefined);setConfirmation('');
   if(recreate)onCreate?.();
  }catch(e){setError(e instanceof Error?e.message:"Character could not be deleted.");}
  finally{setBusy(false);}
 };
 return <>
  <ScrollView contentContainerStyle={s.root} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
   <Text accessibilityRole="header" style={s.heading}>{a("Characters")}</Text>

   <View style={s.rosterOverview}>
    <View style={s.summary}>
     <View style={s.summaryCell}><Text style={s.summaryLabel}>{a("ROSTER")}</Text><Text style={s.summaryValue}>{entries.length}/{slots}</Text></View>
     <View style={s.summaryCell}><Text style={s.summaryLabel}>{a("ACTIVE")}</Text><Text style={s.summaryValue}>{entries.filter(entry=>entry.activity).length}</Text></View>
     <View style={s.summaryCell}><Text style={s.summaryLabel}>{a("ACCOUNT SKILL")}</Text><Text style={s.summaryValue}>{skillTotal}</Text></View>
    </View>
    {nextThreshold!==undefined?<View style={s.slotProgress}><View style={s.slotProgressHead}><Text style={s.slotHint}>{a('Next character slot unlocks at {count} combined account skill levels.',{count:nextThreshold})}</Text><Text style={s.slotCount}>{Math.min(skillTotal,nextThreshold)}/{nextThreshold}</Text></View><View style={s.track}><View style={[s.trackFill,{width:`${Math.min(100,Math.max(0,skillTotal/Math.max(1,nextThreshold)*100))}%`}]}/></View></View>:<Text style={s.slotHint}>{a("All 5 character slots are permanently unlocked.")}</Text>}
   </View>
   {entries.map(({character,activity})=>{const active=character.id===state.character?.id;return <View key={character.id} style={[s.characterCard,active&&s.characterActive]}>
    <View style={[s.row,stackRows&&s.rowStack]}>
     <View style={s.copy}><View style={s.nameRow}><Text style={s.name}>{character.name}</Text>{active&&<Text style={s.active}>{a("ACTIVE CHARACTER")}</Text>}</View><Text style={s.meta}>{a('{className} · Level {level}',{className:character.classId,level:character.level})}</Text></View>
     <View style={[s.actions,stackRows&&s.actionsStack]}>{!active&&<GameButton compact title={a("Switch")} tone="secondary" onPress={()=>onSwitch(character.id)}/>}<GameButton compact title={a("Manage")} tone="secondary" onPress={()=>open(character.id)}/></View>
    </View>
    <View style={s.activityRow}><View style={[s.dot,activity?s.dotOn:s.dotIdle]}/><View style={s.copy}><Text style={activity?[s.activity,activityTone(activity.kind,s)]:s.idle}>{activity?a(activityLabel(activity)):a("Idle")} {activity?`· ${activityName(activity)}`:''}</Text>{activity?<Text style={s.meta}>{a('Running for {time}',{time:accountDuration(language,(now-activity.startedAtMs)/1000)})}</Text>:<Text style={s.meta}>{a("No activity is currently running.")}</Text>}</View></View>
   </View>})}
   {onCreate&&entries.length<slots?<GameButton title={a("Create another character")} tone="secondary" onPress={onCreate}/>:null}
  </ScrollView>
  <GameModalSurface visible={!!target} presentation="dialog" reduceMotion={state.settings.reduceMotion} onClose={close} backdropLabel={a("Close character management")}>
   <GameModalHeader eyebrow={a("CHARACTER MANAGEMENT")} title={target?.character.name??'Character'} onClose={close} closeDisabled={busy}/>
   {target?<ScrollView style={s.modalScroll} contentContainerStyle={s.modalBody} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
    <View style={s.warning}><Text style={s.warningTitle}>{a("What you lose")}</Text><Text style={s.warningText}>{a("Your character, levels, Gold, skills, quests, loadouts and equipment upgrades are permanently removed.")}</Text>
      <Text style={s.warningText}>{a("Equipment and items return to the shared Bank or Overflow, with upgrades removed.")}</Text>
      <Pressable accessibilityRole="button" accessibilityState={{expanded:showDeleteDetails}} style={s.detailsToggle} onPress={()=>setShowDeleteDetails(value=>!value)}><Text style={s.detailsToggleText}>{showDeleteDetails?a("Hide deletion details"):a("Read full deletion details")} {showDeleteDetails?'−':'+'}</Text></Pressable>
      {showDeleteDetails?<Text style={s.warningText}>{a("Levels, XP, Gold, skills, quests, class progress, saved loadouts and character-bound appearance progress are removed. Equipment enhancement/temper ranks and pity progress are also removed; recovered gear returns as its base item. Inventory, overflow items, equipped gear, gathering tools and socketed gems are recovered to the shared Bank, then Overflow if needed.")}</Text>:null}
    </View>
    <View accessibilityLabel={a("ACCOUNT PROGRESS STAYS")} style={s.preserved}><Text style={s.preservedTitle}>{a("What you keep")}</Text><Text style={s.preservedText}>{a("Earned character slots, premium currency, companions, Guild membership and account collectibles are preserved.")}</Text></View>
    {blockReason?<View style={s.block}><Text accessibilityRole="alert" style={s.blockTitle}>{a("Finish before deleting")}</Text><Text style={s.blockText}>{a(blockReason)}</Text>{craftCount>0?<Text style={s.blockText}>{a('{count} equipment crafts are still linked to this character.',{count:craftCount})}</Text>:null}</View>:null}
    <Text style={s.confirmLabel}>{a('Type {confirmation} to unlock the delete actions.',{confirmation:required})}</Text>
    <GameTextInput accessibilityLabel={a("Character deletion confirmation")} autoCapitalize="characters" autoCorrect={false} editable={!busy&&!blockReason} value={confirmation} onChangeText={value=>{setConfirmation(value);setError('')}} placeholder={required}/>
    {!!error&&<Text accessibilityRole="alert" style={s.error}>{accountError(language,error)}</Text>}
    <GameButton title={busy?a("Deleting…"):a("Delete & choose new class")} loading={busy} disabled={!onDelete||!confirmed||!!blockReason||busy} tone="danger" onPress={()=>remove(true)}/>
    {entries.length>1?<GameButton title={a("Delete character only")} disabled={!onDelete||!confirmed||!!blockReason||busy} tone="secondary" onPress={()=>remove(false)}/>:null}
    <Text style={s.footnote}>{entries.length===1?a("This is your only character. After deletion you return to class creation."):a("Choosing a new class deletes this character first, frees the slot, and then opens class creation. Plain delete keeps you on the remaining roster.")}</Text>
   </ScrollView>:null}
  </GameModalSurface>
 </>;
}

function activityTone(kind:ActiveActivity['kind'],s:ReturnType<typeof makeStyles>){return kind==='combat'?s.combatTone:kind==='training'?s.trainingTone:kind==='faith'?s.faithTone:s.gatheringTone}

function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({
 root:{padding:spacing.md,gap:spacing.sm,paddingBottom:110},heading:{...typography.hero,color:C.text},intro:{...typography.body,color:C.muted,lineHeight:21},
 rosterOverview:{padding:12,gap:10,backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:12},summary:{flexDirection:'row',gap:7},summaryCell:{flex:1,minWidth:0,padding:7,backgroundColor:C.panel2,borderRadius:8,alignItems:'center'},summaryLabel:{fontSize:9,color:equipmentColors.goldSoft,fontWeight:'900',letterSpacing:.6,textAlign:'center'},summaryValue:{...typography.title,color:C.text},slotHint:{...typography.caption,color:C.muted,flex:1},slotProgress:{gap:6},slotProgressHead:{flexDirection:'row',alignItems:'center',gap:6},slotCount:{fontSize:10,fontWeight:'900',color:C.info},track:{height:5,borderRadius:4,overflow:'hidden',backgroundColor:C.panel2},trackFill:{height:'100%',backgroundColor:C.info},characterCard:{padding:12,gap:8,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel},characterActive:{borderColor:equipmentColors.selectedLine,backgroundColor:C.selection},
 row:{flexDirection:'row',alignItems:'center',gap:spacing.sm},rowStack:{flexDirection:'column',alignItems:'stretch'},nameRow:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:spacing.sm},copy:{flex:1,minWidth:0},actions:{flexDirection:'row',alignItems:'center',justifyContent:'flex-end',gap:spacing.xs,flexWrap:'wrap'},actionsStack:{justifyContent:'flex-start'},name:{...typography.title,color:C.text},active:{...typography.caption,color:equipmentColors.selectedLine,fontWeight:'900',letterSpacing:.7},meta:{...typography.caption,color:C.muted,marginTop:2},
 activityRow:{flexDirection:'row',alignItems:'center',gap:spacing.sm,marginTop:3,paddingTop:9,borderTopWidth:1,borderColor:C.line},dot:{width:10,height:10,borderRadius:5},dotOn:{backgroundColor:C.good},dotIdle:{backgroundColor:C.disabled},activity:{...typography.bodyStrong,color:C.good},combatTone:{color:C.bad},gatheringTone:{color:equipmentColors.goldSoft},trainingTone:{color:C.info},faithTone:{color:C.special},idle:{...typography.bodyStrong,color:C.muted},target:{...typography.bodyStrong,color:equipmentColors.goldSoft,marginTop:2},
 modalScroll:{maxHeight:'78%'},modalBody:{gap:spacing.md,paddingBottom:spacing.sm},warning:{borderWidth:1,borderColor:C.bad,backgroundColor:C.warningSurface,padding:spacing.md,borderRadius:10,gap:4},warningTitle:{...typography.bodyStrong,color:C.bad},warningText:{...typography.caption,color:C.text,lineHeight:18},detailsToggle:{minHeight:44,justifyContent:'center',alignSelf:'flex-start'},detailsToggleText:{...typography.bodyStrong,color:C.accent},
 preserved:{borderWidth:1,borderColor:C.good,backgroundColor:C.goodSurface,padding:spacing.md,borderRadius:10,gap:4},preservedTitle:{...typography.caption,color:C.good,fontWeight:'900',letterSpacing:.7},preservedText:{...typography.caption,color:C.text,lineHeight:18},
 block:{borderWidth:1,borderColor:C.warning,backgroundColor:C.warningSurface,padding:spacing.md,borderRadius:10,gap:4},blockTitle:{...typography.bodyStrong,color:C.warning},blockText:{...typography.caption,color:C.text,lineHeight:18},
 confirmLabel:{...typography.body,color:C.text},confirmCode:{fontWeight:'900',color:C.bad},error:{...typography.caption,color:C.bad},footnote:{...typography.caption,color:C.muted,lineHeight:18}
});}
