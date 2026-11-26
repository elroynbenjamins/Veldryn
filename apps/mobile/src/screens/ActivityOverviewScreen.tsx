import {accountText,accountError,accountDuration} from '../i18n/account';
import {characterRosterText} from '../i18n/character-roster';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Keyboard,Platform,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions,type ScrollViewInstance} from 'react-native';
import {GameButton} from '../components/GameButton';
import {GameTextInput} from '../components/GameTextInput';
import {GameModalHeader,GameModalSurface} from '../components/GameModalSurface';
import {ProfileIcon} from '../components/ProfileIcon';
import {orderedCharacterRoster} from './character-roster-order';
import {serverGameplayEnabled} from '../online/gameplay';
import {supabase} from '../online/supabase';
import {CLASSES} from '../content/classes';
import {characterDeleteBlockReason,characterDeleteConfirmation} from '../core/account-actions';
import {activityTargetLabel} from '../core/activity-target-label';
import {accountSkillLevel,CHARACTER_SLOT_THRESHOLDS,MAX_NEW_ACCOUNT_CHARACTERS,occupiedCharacterRoles,unlockedCharacterSlots,type AccountCharacterRole} from '../core/account-roster';
import {equipmentCraftingQueue} from '../core/equipment-crafting-queue';
import type {ActiveActivity,GameState} from '../core/types';
import {spacing,typography,equipmentTheme,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

function activityLabel(activity:ActiveActivity|null){
 if(!activity)return 'Idle';
 return activity.kind==='combat'?'Combat':activity.kind==='training'?'Training':activity.kind==='faith'?'Faith practice':activity.kind.charAt(0).toUpperCase()+activity.kind.slice(1);
}

export function ActivityOverviewScreen({state,now,accountId,onSwitch,onCreate,onDelete,gameplayBusy=false}:{state:GameState;now:number;accountId?:string;onSwitch:(id:string)=>Promise<void>|void;onCreate?:()=>void;onDelete?:(id:string,confirmation:string)=>Promise<void>|void;gameplayBusy?:boolean}){
 const language=state.settings.language;
 const a=(text:string,params?:Record<string,string|number>)=>accountText(language,text,params);
 const r=(text:string,params?:Record<string,string|number>)=>characterRosterText(language,text,params);
 const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);
 const {width,fontScale}=useWindowDimensions(),stackRows=width<390||fontScale>=1.25||state.settings.textScale>=1.25;
 const rosterIds=[state.character?.id,...(state.otherCharacters??[]).map(row=>row.character.id)].filter((id):id is string=>!!id).sort().join('|');
 const [creationOrder,setCreationOrder]=useState<{accountId:string;ids:string[]}|null>(null);
 const creationIds=creationOrder?.accountId===accountId?creationOrder?.ids??[]:[];
 useEffect(()=>{
  const client=supabase;
  if(!client||!serverGameplayEnabled||!accountId||!rosterIds)return;
  let cancelled=false;
  const load=async()=>{
   // This display-only projection is already protected by database RLS.
   // Reuse the SDK session instead of a second remote getUser verification.
   const {data:{session},error:sessionError}=await client.auth.getSession();
   if(cancelled||sessionError||session?.user.id!==accountId)return;
   const {data,error}=await client.from('characters').select('id,created_at')
    .eq('account_id',accountId).order('created_at',{ascending:true}).order('id',{ascending:true});
   if(!cancelled&&!error&&data)setCreationOrder({accountId,ids:data.map(row=>row.id)});
  };
  void load().catch(()=>{}); // Fallback remains stable if the roster projection is unavailable.
  return ()=>{cancelled=true;};
 },[accountId,rosterIds]);
 const entries=orderedCharacterRoster(state,creationIds).map(entry=>({
  character:entry.character,
  activity:entry.character.id===state.character?.id?state.activity:
   (state.otherCharacters??[]).find(other=>other.character.id===entry.character.id)?.activity??null
 }));
 const slots=unlockedCharacterSlots(state),skillTotal=accountSkillLevel(state);
 // Existing four- and five-character accounts are grandfathered for play, not new creation.
 const legacy=entries.length>MAX_NEW_ACCOUNT_CHARACTERS;
 const visibleSlots=legacy?slots:Math.min(slots,MAX_NEW_ACCOUNT_CHARACTERS);
 // Keep the earned-slot watermark authoritative; it may preserve an old 550-skill unlock.
 const nextThreshold=slots<MAX_NEW_ACCOUNT_CHARACTERS?CHARACTER_SLOT_THRESHOLDS[slots]:undefined;
 const canCreate=!!onCreate&&entries.length<MAX_NEW_ACCOUNT_CHARACTERS&&entries.length<slots;
 const workingCount=entries.filter(entry=>!!entry.activity).length;
 const occupiedRoles=new Set(occupiedCharacterRoles(state));
 const roles:AccountCharacterRole[]=['Tank','Damage','Support'];
 const [managingId,setManagingId]=useState<string>(),[confirmation,setConfirmation]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[showDeleteDetails,setShowDeleteDetails]=useState(false),[showDeleteOptions,setShowDeleteOptions]=useState(false);
 const modalScrollRef=useRef<ScrollViewInstance>(null);
 const switchLock=useRef<string|null>(null),[switchingId,setSwitchingId]=useState<string|null>(null),[switchError,setSwitchError]=useState('');
 const switching=!!switchingId;
 const controlsBusy=gameplayBusy||switching||busy;
 useEffect(()=>{
  if(!managingId)return;
  const listener=Keyboard.addListener(Platform.OS==='ios'?'keyboardWillShow':'keyboardDidShow',()=>{
   requestAnimationFrame(()=>modalScrollRef.current?.scrollToEnd({animated:true}));
  });
  return ()=>listener.remove();
 },[managingId]);
 const target=entries.find(entry=>entry.character.id===managingId);
 const targetClass=CLASSES.find(row=>row.id===target?.character.classId);
 const required=target?characterDeleteConfirmation(target.character.name):'';
 const confirmed=!!target&&confirmation===required;
 const blockReason=target?characterDeleteBlockReason(state,target.character.id):undefined;
 const craftCount=target?equipmentCraftingQueue(state).filter(job=>job.ownerCharacterId===target.character.id).length:0;
 const close=()=>{if(busy)return;setManagingId(undefined);setConfirmation('');setError('');setShowDeleteDetails(false);setShowDeleteOptions(false)};
 const open=(id:string)=>{if(switchLock.current||controlsBusy)return;setManagingId(id);setConfirmation('');setError('');setShowDeleteDetails(false);setShowDeleteOptions(false)};
 const switchTo=async(id:string)=>{
  if(switchLock.current||controlsBusy||id===state.character?.id)return;
  switchLock.current=id;setSwitchingId(id);setSwitchError('');
  Keyboard.dismiss();close();
  try{await onSwitch(id);}
  catch(e){if(!serverGameplayEnabled)setSwitchError(e instanceof Error?e.message:'Character switch was not confirmed.');}
  finally{switchLock.current=null;setSwitchingId(null);}
 };
 const remove=async(recreate:boolean)=>{
  if(!target||!onDelete||!confirmed||blockReason||busy)return;
  setBusy(true);setError('');
  try{
   await onDelete(target.character.id,confirmation);
   setManagingId(undefined);setConfirmation('');setShowDeleteOptions(false);setShowDeleteDetails(false);
   if(recreate)onCreate?.();
  }catch(e){setError(e instanceof Error?e.message:"Character could not be deleted.");}
  finally{setBusy(false);}
 };
 return <>
  <ScrollView contentContainerStyle={s.root} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
   <View style={s.titleRow}>
    <View style={s.flex}>
     <Text accessibilityRole="header" style={s.heading}>{a('Characters')}</Text>
     <Text style={s.subtitle}>{r('{count} characters · {working} working',{count:entries.length,working:workingCount})}</Text>
    </View>
    <View style={s.slotBadge}><Text style={s.slotBadgeText}>{r('{count}/{total} slots',{count:entries.length,total:visibleSlots})}</Text></View>
   </View>
   <View style={s.rosterOverview}>
    <View style={s.overviewLine}><Text style={s.sectionLabel}>{r('Character roster')}</Text><Text style={s.skillTotal}>{a('ACCOUNT SKILL')} {skillTotal.toLocaleString(language)}</Text></View>
    {nextThreshold!==undefined?<View style={s.slotProgress}>
      <View style={s.slotProgressHead}><Text style={s.slotHint}>{r('Next slot at {count}',{count:nextThreshold})}</Text><Text style={s.slotCount}>{Math.min(skillTotal,nextThreshold).toLocaleString(language)}/{nextThreshold.toLocaleString(language)}</Text></View>
      <View style={s.track} accessible accessibilityRole="progressbar" accessibilityLabel={a('Account skill')} accessibilityValue={{min:0,max:nextThreshold,now:Math.min(nextThreshold,skillTotal)}}><View style={[s.trackFill,{width:`${Math.min(100,Math.max(0,skillTotal/Math.max(1,nextThreshold)*100))}%`}]}/></View>
     </View>:null}
    {slots>=MAX_NEW_ACCOUNT_CHARACTERS?<Text style={s.slotHint}>{legacy?r('Legacy roster preserved'):r('Three role slots unlocked')}</Text>:null}
   </View>
   {!!switchError&&<Text accessibilityRole="alert" style={s.error}>{accountError(language,switchError)}</Text>}
   <View style={s.list}>
    {entries.map(({character,activity})=>{
     const active=character.id===state.character?.id,classDef=CLASSES.find(row=>row.id===character.classId);
     return <View key={character.id} style={[s.characterCard,active&&s.characterActive]}>
      <View style={[s.characterRow,stackRows&&s.characterRowStack]}>
       <View style={s.identityRow}>
        <View style={s.smallPortrait}><ProfileIcon id={character.profileIconId} classId={character.classId} size={40}/></View>
        <View style={s.flex}>
         <Text numberOfLines={1} style={s.name}>{character.name}</Text>
         <Text numberOfLines={1} style={s.meta}>{a('{className} · Level {level}',{className:classDef?.name??character.classId,level:character.level})}{classDef?' · '+r(classDef.role):''}</Text>
        </View>
       </View>
       <View style={[s.actions,stackRows&&s.actionsStack]}>
        {active?<View accessible accessibilityRole="text" accessibilityLabel={r('Currently playing')+': '+character.name} style={s.playingStatus}><Text numberOfLines={1} style={s.playingStatusText}>✓ {r('Playing')}</Text></View>
        :<GameButton compact tone="secondary" style={s.switchButton} title={a('Switch')} accessibilityLabel={a('Switch')+': '+character.name} loading={switchingId===character.id} disabled={controlsBusy} onPress={()=>switchTo(character.id)}/>}
        <Pressable accessibilityRole="button" accessibilityLabel={a('Manage')+': '+character.name} onPress={()=>open(character.id)} disabled={controlsBusy} accessibilityState={{disabled:controlsBusy}} accessibilityHint={r('Review deletion options')} style={({pressed})=>[s.manageButton,pressed&&s.pressed,controlsBusy&&s.controlDisabled]}><Text style={s.manageGlyph}>⋯</Text></Pressable>
       </View>
      </View>
      <View style={[s.activityRow,stackRows&&s.activityRowStack]}><View style={[s.dot,activity?s.dotOn:s.dotIdle]}/><Text numberOfLines={2} style={[s.activity,activity?activityTone(activity.kind,s):s.idle]}>{activity?a(activityLabel(activity))+' · '+a(activityTargetLabel(activity)):a('Idle')}</Text>{activity?<Text numberOfLines={1} style={s.duration}>{accountDuration(language,(now-activity.startedAtMs)/1000)}</Text>:null}</View>
     </View>;
    })}
   </View>
   <View style={s.rolesPanel}>
    <Text style={s.rolesTitle}>{r('Role slots')}</Text>
    <View style={s.roleRow}>{roles.map(role=><View key={role} style={[s.roleChip,occupiedRoles.has(role)&&s.roleChipFilled]}><Text style={[s.roleChipText,occupiedRoles.has(role)&&s.roleChipTextFilled]}>{occupiedRoles.has(role)?'✓ ':'○ '}{r(role)}</Text></View>)}</View>
   </View>
   {canCreate?<GameButton title={a('Create another character')} tone="secondary" disabled={controlsBusy} onPress={()=>onCreate?.()}/>:null}
  </ScrollView>
  <GameModalSurface visible={!!target} presentation="dialog" surfaceStyle={s.modalSurface} reduceMotion={state.settings.reduceMotion} onClose={close} backdropLabel={a('Close character management')}>
   <GameModalHeader eyebrow={a('CHARACTER MANAGEMENT')} title={target?.character.name??'Character'} onClose={close} closeDisabled={busy}/>
   {target?<ScrollView ref={modalScrollRef} style={s.modalScroll} contentContainerStyle={s.modalBody} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
    {!showDeleteOptions?<View style={s.manageOverview}>
     <View style={s.manageProfile}>
      <ProfileIcon id={target.character.profileIconId} classId={target.character.classId} size={42}/>
      <View style={s.flex}><Text numberOfLines={1} style={s.meta}>{a('{className} · Level {level}',{className:targetClass?.name??target.character.classId,level:target.character.level})}{targetClass?' · '+r(targetClass.role):''}</Text></View>
     </View>
     <View style={s.manageActivity}><View style={[s.dot,target.activity?s.dotOn:s.dotIdle]}/><Text numberOfLines={2} style={s.activity}>{target.activity?a(activityLabel(target.activity))+' · '+a(activityTargetLabel(target.activity)):a('Idle')}</Text></View>
     {target.character.id!==state.character?.id?<GameButton title={a('Switch')} disabled={controlsBusy} loading={switchingId===target.character.id} onPress={()=>switchTo(target.character.id)}/>:null}
     {onDelete?<GameButton title={r('Review deletion options')} tone="secondary" onPress={()=>setShowDeleteOptions(true)}/>:null}
    </View>:<>
     <GameButton title={r('Back to character')} compact tone="secondary" onPress={()=>{Keyboard.dismiss();setShowDeleteOptions(false);setConfirmation('');setError('');setShowDeleteDetails(false)}}/>
     <View style={s.warning}><Text style={s.warningTitle}>{a('What you lose')}</Text><Text style={s.warningText}>{a('Your character, levels, Gold, skills, quests, loadouts and equipment upgrades are permanently removed.')}</Text>
      <Text style={s.warningText}>{a('Equipment and items return to the shared Bank or Overflow, with upgrades removed.')}</Text>
      <Pressable accessibilityRole="button" accessibilityState={{expanded:showDeleteDetails}} style={s.detailsToggle} onPress={()=>setShowDeleteDetails(value=>!value)}><Text style={s.detailsToggleText}>{showDeleteDetails?a('Hide deletion details'):a('Read full deletion details')} {showDeleteDetails?'−':'+'}</Text></Pressable>
      {showDeleteDetails?<Text style={s.warningText}>{a('Levels, XP, Gold, skills, quests, class progress, saved loadouts and character-bound appearance progress are removed. Equipment enhancement/temper ranks and pity progress are also removed; recovered gear returns as its base item. Inventory, overflow items, equipped gear, gathering tools and socketed gems are recovered to the shared Bank, then Overflow if needed.')}</Text>:null}
     </View>
     <View accessibilityLabel={a('ACCOUNT PROGRESS STAYS')} style={s.preserved}><Text style={s.preservedTitle}>{a('What you keep')}</Text><Text style={s.preservedText}>{a('Earned character slots, premium currency, companions, Guild membership and account collectibles are preserved.')}</Text></View>
     {blockReason?<View style={s.block}><Text accessibilityRole="alert" style={s.blockTitle}>{a('Finish before deleting')}</Text><Text style={s.blockText}>{a(blockReason)}</Text>{craftCount>0?<Text style={s.blockText}>{a('{count} equipment crafts are still linked to this character.',{count:craftCount})}</Text>:null}</View>:null}
     <Text style={s.confirmLabel}>{a('Type {confirmation} to unlock the delete actions.',{confirmation:required})}</Text>
     <GameTextInput accessibilityLabel={a('Character deletion confirmation')} autoCapitalize="characters" autoCorrect={false} showSoftInputOnFocus returnKeyType="done" onFocus={()=>requestAnimationFrame(()=>modalScrollRef.current?.scrollToEnd({animated:true}))} onSubmitEditing={()=>Keyboard.dismiss()} editable={!busy} value={confirmation} onChangeText={value=>{setConfirmation(value);setError('')}} placeholder={required}/>
     {!!error&&<Text accessibilityRole="alert" style={s.error}>{accountError(language,error)}</Text>}
     <GameButton title={busy?a('Deleting…'):a('Delete & choose new class')} loading={busy} disabled={!onDelete||!confirmed||!!blockReason||busy} tone="danger" onPress={()=>remove(true)}/>
     {entries.length>1?<GameButton title={a('Delete character only')} disabled={!onDelete||!confirmed||!!blockReason||busy} tone="secondary" onPress={()=>remove(false)}/>:null}
     <Text style={s.footnote}>{entries.length===1?a('This is your only character. After deletion you return to class creation.'):a('Choosing a new class deletes this character first, frees the slot, and then opens class creation. Plain delete keeps you on the remaining roster.')}</Text>
    </>}
   </ScrollView>:null}
  </GameModalSurface>
 </>;
}

function activityTone(kind:ActiveActivity['kind'],s:ReturnType<typeof makeStyles>){return kind==='combat'?s.combatTone:kind==='training'?s.trainingTone:kind==='faith'?s.faithTone:s.gatheringTone}

function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({

 root:{padding:spacing.sm,gap:spacing.sm,paddingBottom:110,maxWidth:660,width:'100%',alignSelf:'center'},
 flex:{flex:1,minWidth:0},
 titleRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},
 heading:{...typography.hero,color:C.text},
 subtitle:{...typography.caption,color:C.muted},
 slotBadge:{paddingHorizontal:9,paddingVertical:6,borderRadius:8,borderWidth:1,borderColor:C.lineStrong,backgroundColor:C.panel},
 slotBadgeText:{...typography.caption,color:C.accent,fontWeight:'800'},
 meta:{...typography.caption,color:C.muted,flexShrink:1},
 rosterOverview:{padding:10,gap:6,backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:10},
 overviewLine:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:6},
 sectionLabel:{...typography.bodyStrong,color:C.text},
 skillTotal:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'800'},
 slotHint:{...typography.caption,color:C.muted,flex:1},
 slotProgress:{gap:4},
 slotProgressHead:{flexDirection:'row',alignItems:'center',gap:6},
 slotCount:{fontSize:11,fontWeight:'900',color:C.info},
 track:{height:5,borderRadius:4,overflow:'hidden',backgroundColor:C.panel2},
 trackFill:{height:'100%',backgroundColor:C.info},
 list:{gap:6},
 characterCard:{padding:9,gap:6,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel},
 characterActive:{borderColor:equipmentColors.selectedLine,backgroundColor:C.selection},
 characterRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:6},
 characterRowStack:{alignItems:'stretch',flexDirection:'column'},
 identityRow:{flex:1,minWidth:0,flexDirection:'row',alignItems:'center',gap:8},
 smallPortrait:{width:42,height:42,alignItems:'center',justifyContent:'center',borderRadius:8,backgroundColor:C.panel2},
 name:{...typography.bodyStrong,color:C.text,flexShrink:1},
 actions:{flexDirection:'row',justifyContent:'flex-end',alignItems:'center',gap:5,flexShrink:0},
 actionsStack:{alignSelf:'flex-end'},
 switchButton:{minWidth:69,paddingHorizontal:8},
 playingStatus:{minWidth:69,minHeight:44,paddingHorizontal:7,borderRadius:8,borderWidth:1,borderColor:C.good,backgroundColor:C.goodSurface,alignItems:'center',justifyContent:'center'},
 playingStatusText:{...typography.caption,color:C.good,fontWeight:'900'},
 manageButton:{minWidth:44,minHeight:44,borderRadius:8,borderWidth:1,borderColor:C.lineStrong,backgroundColor:C.panel2,alignItems:'center',justifyContent:'center'},
 manageGlyph:{fontSize:23,lineHeight:26,fontWeight:'800',color:C.text},
 activityRow:{flexDirection:'row',alignItems:'center',gap:6,minHeight:24,borderTopWidth:1,borderTopColor:C.line,paddingTop:5},
 activityRowStack:{flexWrap:'wrap'},
 dot:{width:8,height:8,borderRadius:4,flexShrink:0},
 dotOn:{backgroundColor:C.good},dotIdle:{backgroundColor:C.disabled},
 activity:{...typography.caption,color:C.good,flex:1,minWidth:0},
 idle:{color:C.muted},
 combatTone:{color:C.bad},gatheringTone:{color:equipmentColors.goldSoft},trainingTone:{color:C.info},faithTone:{color:C.special},
 duration:{...typography.caption,color:C.muted,flexShrink:0,marginLeft:'auto'},
 rolesPanel:{padding:9,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel,gap:6},
 rolesTitle:{...typography.caption,color:C.muted,fontWeight:'900'},
 roleRow:{flexDirection:'row',gap:6,flexWrap:'wrap'},
 roleChip:{minHeight:30,paddingHorizontal:8,paddingVertical:5,borderRadius:8,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},
 roleChipFilled:{borderColor:C.good},
 roleChipText:{fontSize:11,color:C.muted,fontWeight:'800'},
 roleChipTextFilled:{color:C.good},
 pressed:{opacity:.75},controlDisabled:{opacity:.45},
 modalSurface:{maxWidth:420,padding:spacing.md},
 modalScroll:{maxHeight:'78%'},modalBody:{gap:spacing.sm,paddingBottom:spacing.sm},
 manageOverview:{gap:8},manageProfile:{flexDirection:'row',alignItems:'center',gap:9},
 manageActivity:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:7,paddingHorizontal:9,borderRadius:8,backgroundColor:C.panel2},
 warning:{borderWidth:1,borderColor:C.bad,backgroundColor:C.warningSurface,padding:spacing.sm,borderRadius:9,gap:4},
 warningTitle:{...typography.bodyStrong,color:C.bad},
 warningText:{...typography.caption,color:C.text,lineHeight:18},
 detailsToggle:{minHeight:44,justifyContent:'center',alignSelf:'flex-start'},
 detailsToggleText:{...typography.bodyStrong,color:C.accent},
 preserved:{borderWidth:1,borderColor:C.good,backgroundColor:C.goodSurface,padding:spacing.sm,borderRadius:9,gap:4},
 preservedTitle:{...typography.caption,color:C.good,fontWeight:'900',letterSpacing:.7},
 preservedText:{...typography.caption,color:C.text,lineHeight:18},
 block:{borderWidth:1,borderColor:C.warning,backgroundColor:C.warningSurface,padding:spacing.sm,borderRadius:9,gap:4},
 blockTitle:{...typography.bodyStrong,color:C.warning},
 blockText:{...typography.caption,color:C.text,lineHeight:18},
 confirmLabel:{...typography.body,color:C.text},
 error:{...typography.caption,color:C.bad},
 footnote:{...typography.caption,color:C.muted,lineHeight:18}
});}
