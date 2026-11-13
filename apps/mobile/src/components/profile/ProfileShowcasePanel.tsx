import {profileT,profileText} from '../../i18n/profile';
import {useGameLanguage} from '../../i18n/GameLanguageProvider';
import {useMemo,useState,type ReactNode} from 'react';
import {Image,Keyboard,Pressable,ScrollView,StyleSheet,Text,View,type ImageSourcePropType} from 'react-native';
import type {GameState} from '../../core/types';
import type {ProfileCollectionRefV43,ProfileExtensionSelfV43} from '../../online/profile-extension-v43';
import type {ProfileExtensionDraft} from '../../online/useProfileExtensionDraft';
import {JOURNAL_ACHIEVEMENTS_V42} from '../../core/adventurers-journal-v42';
import {personalRecordDefinition} from '../../core/personal-records-v43';
import {professionMasteryMasteredRecords,skillIdentity} from '../../core/profession-mastery-presentation';
import {profileCollectionLabel} from '../../core/profile-presentation';
import {profileIconCollection} from '../../core/profile-icons';
import {COMBAT_COMPANIONS} from '../../content/combat-companions';
import {CLASSES} from '../../content/classes';
import {BASE_PROFILE_BACKGROUNDS} from '../../core/profile-cosmetics';
import {profileBackgroundPreviewById} from '../../theme/profile-background-assets';
import {profileBorderSourceById} from '../../theme/profile-border-assets';
import {personalBackgroundVariants} from '../../theme/card-background-assets';
import {petArtSource} from '../../theme/pet-art';
import {companionArtSource} from '../../theme/companion-art';
import {skillIcons,type ActivityIconId} from '../../theme/skill-assets';
import {radii,spacing,typography,type ThemeColors} from '../../theme/theme';
import {useGameTheme} from '../../theme/ThemeContext';
import {usePlayerBadges} from '../../online/PlayerBadgeProvider';
import {CardBackground} from '../CardBackground';
import {GameButton} from '../GameButton';
import {GameModalHeader,GameModalSurface} from '../GameModalSurface';
import {Panel} from '../Panel';
import {PlayerBadges,PlayerBadgeShowcase} from '../PlayerBadges';
import {ProfileFrameOverlay} from '../ProfileFrameOverlay';
import {ProfileIcon} from '../ProfileIcon';
import {RegionArtwork} from '../RegionArtwork';

/** The showcase board: the seven stored showcase slots as visible slots with their own art,
 * instead of seven dropdown buttons that only say how many are chosen. */
type Picker='character'|'skill'|'companion'|'achievements'|'records'|'collections'|'mastery'|null;
const refKey=(ref:ProfileCollectionRefV43)=>ref.kind+':'+ref.id;
interface Slot{key:string;label:string;meta?:string;art?:ImageSourcePropType;icon?:ReactNode}

export function ProfileShowcasePanel({state,draft}:{state:GameState;draft:ProfileExtensionDraft}){
 const language=useGameLanguage();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [picker,setPicker]=useState<Picker>(null);
 const badges=usePlayerBadges();
 const openPicker=(next:Exclude<Picker,null>)=>{Keyboard.dismiss();setPicker(next)};
 const {value,busy,guest,dirty,error,notice}=draft;

 const characters=[...(state.character?[state.character]:[]),...(state.otherCharacters??[]).map(row=>row.character)];
 const skills=state.skills.map(row=>({id:row.skillId,label:profileText(language,row.skillId)}));
 const companions=(state.account.unlockedCombatCompanionIds??[]).map(id=>({id,label:COMBAT_COMPANIONS.find(row=>row.id===id)?.name??id.replace(/_/g,' ')}));
 const achievements=Object.keys(state.account.journalState?.unlockedAchievements??{}).map(id=>({id,label:JOURNAL_ACHIEVEMENTS_V42.find(row=>row.id===id)?.title??id.replace(/_/g,' ')}));
 const records=Object.keys(state.account.journalState?.records??{}).map(id=>({id,label:profileText(language,personalRecordDefinition(id)?.label??id.replace(/_/g,' '))}));
 const masteries=professionMasteryMasteredRecords(state).map(row=>({id:row.actionId,label:row.name,meta:profileText(language,skillIdentity(row.skillId).label)+' · R50'}));
 const collections=useMemo(()=>{
  const refs:ProfileCollectionRefV43[]=[];
  const add=(kind:ProfileCollectionRefV43['kind'],id?:string)=>{if(id&&!refs.some(row=>row.kind===kind&&row.id===id))refs.push({kind,id})};
  for(const id of state.account.unlockedCosmeticPetIds??[])add('pet',id);
  for(const id of state.account.unlockedCombatCompanionIds??[])add('companion',id);
  for(const icon of profileIconCollection(state).filter(row=>row.unlocked))add('profile_icon',icon.id);
  for(const id of state.account.unlockedProfileBackgroundIds??[])add('background',id);
  add('background',state.character?.profileBackgroundId);
  for(const id of state.account.unlockedProfileBorderIds??[])add('border',id);
  add('border',state.character?.profileBorderId);
  for(const id of Object.values(state.character?.equipment??{}))add('item',id);
  for(const stack of state.inventory.stacks.filter(row=>row.quantity>0).slice(0,30))add('item',stack.itemId);
  return refs.slice(0,100);
 },[state]);

 if(!draft.online)return <Panel><Text style={s.eyebrow}>{profileT(language,"SOCIAL PROFILE")}</Text><Text style={s.title}>{profileT(language,"Showcase")}</Text>
  <Text style={s.copy}>{profileT(language,"Sign in when online profile services are available to publish a showcase character, favorites and featured achievements, records and collectibles.")}</Text></Panel>;
 if(!value)return <Panel><Text style={s.title}>{profileT(language,"Showcase")}</Text>
  {busy?<Text style={s.copy}>{profileT(language,"Loading…")}</Text>:<GameButton title={profileT(language,"Load profile settings")} tone="secondary" onPress={draft.reload}/>}
  {error?<Text style={s.error}>{profileText(language,error)}</Text>:null}</Panel>;

 const patch=(next:Partial<ProfileExtensionSelfV43>)=>draft.patch(next);
 const toggle=(list:string[],id:string)=>list.includes(id)?list.filter(row=>row!==id):list.length<3?[...list,id]:list;
 const toggleCollection=(list:ProfileCollectionRefV43[],ref:ProfileCollectionRefV43)=>{const key=refKey(ref);
  return list.some(row=>refKey(row)===key)?list.filter(row=>refKey(row)!==key):list.length<3?[...list,ref]:list};
 const refArt=(ref:ProfileCollectionRefV43):ImageSourcePropType|undefined=>ref.kind==='pet'?petArtSource(ref.id)
  :ref.kind==='companion'?companionArtSource(ref.id)
  :ref.kind==='background'?profileBackgroundPreviewById.get(ref.id)?.source
  :ref.kind==='border'?profileBorderSourceById.get(ref.id):undefined;

 const character=characters.find(row=>row.id===(value.selectedCharacterId??state.character?.id))??state.character;
 const className=character?CLASSES.find(row=>row.id===character.classId)?.name??character.classId:'';
 const backgroundId=character?.profileBackgroundId??'asterfall-night';
 const scene=profileBackgroundPreviewById.get(backgroundId),base=BASE_PROFILE_BACKGROUNDS.find(row=>row.id===backgroundId);
 const headlineFrame=character?.profileBorderId?profileBorderSourceById.get(character.profileBorderId):undefined;
 const skill=skills.find(row=>row.id===value.favoriteSkillId),companion=companions.find(row=>row.id===value.favoriteCompanionId);
 const achievementSlots:Slot[]=value.achievementShowcaseIds.map(id=>({key:'ach:'+id,label:achievements.find(row=>row.id===id)?.label??id.replace(/_/g,' ')}));
 const recordSlots:Slot[]=value.recordShowcaseIds.map(id=>({key:'rec:'+id,label:records.find(row=>row.id===id)?.label??id.replace(/_/g,' ')}));
 const masterySlots:Slot[]=value.masteryShowcaseActionIds.map(id=>{const row=masteries.find(item=>item.id===id);return {key:'mas:'+id,label:row?.label??id.replace(/_/g,' '),meta:row?.meta}});
 const collectionSlots:Slot[]=value.collectionShowcase.map(ref=>({key:refKey(ref),label:profileCollectionLabel(ref),meta:profileText(language,ref.kind).toUpperCase(),art:refArt(ref),
  icon:ref.kind==='profile_icon'&&character?<ProfileIcon id={ref.id} classId={character.classId} size={34}/>:undefined}));

 const pickerTitle=picker==='character'?'Showcase character':picker==='skill'?'Favorite skill':picker==='companion'?'Favorite companion'
  :picker==='achievements'?'Achievement showcase':picker==='records'?'Personal Record showcase':picker==='collections'?'Collection showcase':picker==='mastery'?'Mastery showcase':'Profile settings';
 const multiPicker=picker==='achievements'||picker==='records'||picker==='collections'||picker==='mastery';
 const pickerCount=picker==='achievements'?value.achievementShowcaseIds.length:picker==='records'?value.recordShowcaseIds.length
  :picker==='collections'?value.collectionShowcase.length:picker==='mastery'?value.masteryShowcaseActionIds.length:0;
 const pickerMaxed=multiPicker&&pickerCount>=3;
 const pickerEmpty=(picker==='achievements'&&achievements.length===0)||(picker==='records'&&records.length===0)
  ||(picker==='collections'&&collections.length===0)||(picker==='mastery'&&masteries.length===0);

 return <><View style={s.root}>
  {guest?<View style={s.warning}><Text style={s.warningTitle}>{profileT(language,"Secure this guest account first")}</Text>
   <Text style={s.copy}>{profileT(language,"Guest progress can continue normally, but public social-profile publishing is held until the account is linked.")}</Text></View>:null}

  <View style={s.head}><Text style={s.eyebrow}>{profileT(language,"SHOWCASE CHARACTER")}</Text><Text style={s.hint}>{profileT(language,"What players see first")}</Text></View>
  <View style={s.headlineWrap}>
  <Pressable accessibilityRole="button" accessibilityLabel={profileT(language,'Showcase character: {name} ▾',{name:character?.name??profileT(language,'Current character')})}
    disabled={guest||busy||characters.length<2} onPress={()=>openPicker('character')} style={({pressed})=>[s.headline,pressed&&s.pressed]}>
   {scene?<CardBackground sources={personalBackgroundVariants.get(backgroundId)??{wide:scene.source,square:scene.source}}/>:base?<RegionArtwork regionId={base.region}/>:null}
   <View style={s.headlineScrim}/>
   {character?<ProfileIcon id={character.profileIconId} classId={character.classId} size={58} style={s.headlineIcon}/>:null}
   <View style={s.headlineCopy}>
    <View style={s.headlineNameRow}>
     <Text numberOfLines={1} style={s.headlineName}>{character?.name??profileT(language,"Current character")}</Text>
     <PlayerBadges identity={badges.identity} size={16}/>
    </View>
    <Text numberOfLines={1} style={s.headlineMeta}>{character?profileT(language,'Lv. {level}',{level:character.level})+' · '+className:''}</Text>
    <PlayerBadgeShowcase identity={badges.identity} size={15} style={s.badgeShelf}/>
    {characters.length>1?<Text style={s.headlineAction}>{profileT(language,"Tap to swap")} ›</Text>:null}
   </View>
  </Pressable>
  {headlineFrame?<ProfileFrameOverlay source={headlineFrame}/>:null}
  </View>

  <View style={s.pair}>
   <SlotCard label={profileT(language,"Favorite skill")} value={skill?.label} art={value.favoriteSkillId?skillIcons[value.favoriteSkillId as ActivityIconId]:undefined}
    disabled={guest||busy} onPress={()=>openPicker('skill')}/>
   <SlotCard label={profileT(language,"Companion")} value={companion?.label} art={value.favoriteCompanionId?companionArtSource(value.favoriteCompanionId):undefined}
    disabled={guest||busy} onPress={()=>openPicker('companion')}/>
  </View>

  <SlotTrio label={profileT(language,"Featured achievements")} slots={achievementSlots} disabled={guest||busy} onPress={()=>openPicker('achievements')}/>
  <SlotTrio label={profileT(language,"Collection showcase")} slots={collectionSlots} disabled={guest||busy} onPress={()=>openPicker('collections')}/>
  <SlotTrio label={profileT(language,"Mastery showcase")} slots={masterySlots} disabled={guest||busy||!masteries.length}
   hint={masteries.length?undefined:profileT(language,"Master a profession action at R50")} onPress={()=>openPicker('mastery')}/>
  <SlotTrio label={profileT(language,"Personal records")} slots={recordSlots} disabled={guest||busy} onPress={()=>openPicker('records')}/>

  <View style={s.saveBar}>
   <View style={s.revert}><GameButton compact title={profileT(language,"Revert")} tone="secondary" disabled={!dirty||busy} onPress={draft.revert}/></View>
   <View style={s.flex}><GameButton title={busy?profileT(language,"Saving…"):dirty?profileT(language,"Save showcase"):profileT(language,"Showcase saved")} loading={busy} disabled={guest||busy||!dirty} onPress={()=>void draft.save()}/></View>
  </View>
  {notice?<Text accessibilityLiveRegion="polite" style={s.notice}>{profileText(language,notice)}</Text>:null}
  {error?<Text accessibilityRole="alert" style={s.error}>{profileText(language,error)}</Text>:null}
 </View>

 <GameModalSurface visible={picker!==null} reduceMotion={state.settings.reduceMotion} onClose={()=>setPicker(null)} backdropLabel={profileT(language,"Close profile picker")} surfaceStyle={s.pickerSheet}>
  <GameModalHeader eyebrow={profileT(language,"SOCIAL PROFILE")} title={profileText(language,pickerTitle)} onClose={()=>setPicker(null)}/>
  <Text style={s.copy}>{multiPicker?profileT(language,'{count}/3 selected · tap a selected item to remove it.',{count:pickerCount}):profileT(language,"Choose one option.")}</Text>
  <ScrollView style={s.pickerList} contentContainerStyle={s.pickerContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
   {pickerEmpty?<Text style={s.pickerEmpty}>{profileT(language,"No entries unlocked for this showcase yet.")}</Text>:null}
   {picker==='character'?characters.map(row=>{const selected=(value.selectedCharacterId??state.character?.id)===row.id;
    return <Pressable key={row.id} accessibilityRole="button" accessibilityState={{selected}} onPress={()=>{patch({selectedCharacterId:row.id});setPicker(null)}} style={[s.option,selected&&s.optionActive]}>
     <Text style={s.optionText}>{selected?'✓ ':''}{row.name}</Text>
     <Text style={s.optionSub}>{row.classId.replace(/_/g,' ')} · {profileT(language,'Level {level}',{level:row.level})}{row.id===state.character?.id?' · '+profileT(language,'currently active'):''}</Text></Pressable>}):null}
   {picker==='skill'?<><Pressable accessibilityRole="button" accessibilityState={{selected:!value.favoriteSkillId}} onPress={()=>{patch({favoriteSkillId:null});setPicker(null)}} style={s.option}><Text style={s.optionText}>{!value.favoriteSkillId?'✓ ':''}{profileT(language,"None")}</Text></Pressable>
    {skills.map(row=><Pressable key={row.id} accessibilityRole="button" accessibilityState={{selected:value.favoriteSkillId===row.id}} onPress={()=>{patch({favoriteSkillId:row.id});setPicker(null)}} style={[s.option,value.favoriteSkillId===row.id&&s.optionActive]}><Text style={s.optionText}>{value.favoriteSkillId===row.id?'✓ ':''}{row.label}</Text></Pressable>)}</>:null}
   {picker==='companion'?<><Pressable accessibilityRole="button" accessibilityState={{selected:!value.favoriteCompanionId}} onPress={()=>{patch({favoriteCompanionId:null});setPicker(null)}} style={s.option}><Text style={s.optionText}>{!value.favoriteCompanionId?'✓ ':''}{profileT(language,"None")}</Text></Pressable>
    {companions.map(row=><Pressable key={row.id} accessibilityRole="button" accessibilityState={{selected:value.favoriteCompanionId===row.id}} onPress={()=>{patch({favoriteCompanionId:row.id});setPicker(null)}} style={[s.option,value.favoriteCompanionId===row.id&&s.optionActive]}><Text style={s.optionText}>{value.favoriteCompanionId===row.id?'✓ ':''}{row.label}</Text></Pressable>)}</>:null}
   {picker==='achievements'?achievements.map(row=>{const selected=value.achievementShowcaseIds.includes(row.id),disabled=pickerMaxed&&!selected;
    return <Pressable key={row.id} accessibilityRole="button" disabled={disabled} accessibilityState={{selected,disabled}} onPress={()=>patch({achievementShowcaseIds:toggle(value.achievementShowcaseIds,row.id)})} style={[s.option,selected&&s.optionActive,disabled&&s.optionDisabled]}><Text style={s.optionText}>{selected?'✓ ':''}{row.label}</Text></Pressable>}):null}
   {picker==='records'?records.map(row=>{const selected=value.recordShowcaseIds.includes(row.id),disabled=pickerMaxed&&!selected;
    return <Pressable key={row.id} accessibilityRole="button" disabled={disabled} accessibilityState={{selected,disabled}} onPress={()=>patch({recordShowcaseIds:toggle(value.recordShowcaseIds,row.id)})} style={[s.option,selected&&s.optionActive,disabled&&s.optionDisabled]}><Text style={s.optionText}>{selected?'✓ ':''}{row.label}</Text></Pressable>}):null}
   {picker==='collections'?collections.map(ref=>{const selected=value.collectionShowcase.some(row=>refKey(row)===refKey(ref)),disabled=pickerMaxed&&!selected;
    return <Pressable key={refKey(ref)} accessibilityRole="button" disabled={disabled} accessibilityState={{selected,disabled}} onPress={()=>patch({collectionShowcase:toggleCollection(value.collectionShowcase,ref)})} style={[s.option,selected&&s.optionActive,disabled&&s.optionDisabled]}>
     <Text style={s.optionText}>{selected?'✓ ':''}{profileCollectionLabel(ref)}</Text><Text style={s.optionSub}>{profileText(language,ref.kind).toUpperCase()}</Text></Pressable>}):null}
   {picker==='mastery'?masteries.map(row=>{const selected=value.masteryShowcaseActionIds.includes(row.id),disabled=pickerMaxed&&!selected;
    return <Pressable key={row.id} accessibilityRole="button" disabled={disabled} accessibilityState={{selected,disabled}} onPress={()=>patch({masteryShowcaseActionIds:toggle(value.masteryShowcaseActionIds,row.id)})} style={[s.option,selected&&s.optionActive,disabled&&s.optionDisabled]}>
     <View style={s.optionRow}><View style={s.flex}><Text style={s.optionText}>{selected?'✓ ':''}{row.label}</Text><Text style={s.optionSub}>{row.meta}</Text></View><Text style={s.masteredMark}>{profileT(language,"MASTERED")}</Text></View></Pressable>}):null}
  </ScrollView>
  <GameButton compact title={profileT(language,"Done")} onPress={()=>setPicker(null)}/>
 </GameModalSurface></>;
}

function SlotCard({label,value,art,disabled,onPress}:{label:string;value?:string;art?:ImageSourcePropType;disabled?:boolean;onPress:()=>void}){
 const language=useGameLanguage();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 return <Pressable accessibilityRole="button" accessibilityLabel={label+': '+(value??profileT(language,"None"))} disabled={disabled} onPress={onPress} style={({pressed})=>[s.slotCard,pressed&&s.pressed,disabled&&s.disabled]}>
  <View style={s.slotIcon}>{art?<Image source={art} resizeMode="contain" style={s.slotIconArt}/>:<Text style={s.slotMark}>◇</Text>}</View>
  <View style={s.flex}><Text style={s.slotLabel}>{label}</Text><Text numberOfLines={1} style={s.slotValue}>{value??profileT(language,"None")}</Text></View>
 </Pressable>;
}

function SlotTrio({label,slots,disabled,hint,onPress}:{label:string;slots:Slot[];disabled?:boolean;hint?:string;onPress:()=>void}){
 const language=useGameLanguage();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const cells:Array<Slot|undefined>=[slots[0],slots[1],slots[2]];
 return <View style={s.trioBlock}>
  <View style={s.head}><Text style={s.eyebrow}>{label}</Text><Text numberOfLines={1} style={s.hint}>{hint?hint+' · ':''}{slots.length}/3</Text></View>
  <View style={s.trio}>{cells.map((slot,index)=>slot
   ?<Pressable key={slot.key} accessibilityRole="button" accessibilityLabel={slot.label} accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>[s.cell,pressed&&s.pressed,disabled&&s.disabled]}>
     <View style={s.cellArt}>{slot.icon??(slot.art?<Image source={slot.art} resizeMode="contain" style={s.cellImage}/>:<Text style={s.slotMark}>◆</Text>)}</View>
     <Text numberOfLines={2} style={s.cellName}>{slot.label}</Text>
     {slot.meta?<Text numberOfLines={1} style={s.cellMeta}>{slot.meta}</Text>:null}
    </Pressable>
   :<Pressable key={'empty:'+index} accessibilityRole="button" accessibilityLabel={profileT(language,'Add to {label}',{label})} disabled={disabled} onPress={onPress} style={({pressed})=>[s.cell,s.cellEmpty,pressed&&s.pressed,disabled&&s.disabled]}>
     <Text style={s.plus}>+</Text><Text numberOfLines={2} style={s.cellMeta}>{profileT(language,"Add")}</Text>
    </Pressable>)}</View>
 </View>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{gap:11},flex:{flex:1,minWidth:0},pressed:{opacity:.74},disabled:{opacity:.5},
 eyebrow:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8,flex:1,minWidth:0},
 title:{...typography.title,color:C.text},
 copy:{...typography.caption,color:C.muted,lineHeight:18},
 head:{flexDirection:'row',alignItems:'center',gap:8},
 hint:{maxWidth:'62%',fontSize:9.5,color:C.muted,fontWeight:'800'},
 warning:{padding:10,borderWidth:1,borderColor:C.warning,borderRadius:radii.md,backgroundColor:C.warningSurface},
 warningTitle:{...typography.bodyStrong,color:C.warning},
 headlineWrap:{position:'relative'},
 headline:{height:126,borderRadius:radii.md,overflow:'hidden',borderWidth:1,borderColor:C.lineStrong,backgroundColor:C.stage,justifyContent:'flex-end'},
 headlineScrim:{...StyleSheet.absoluteFill,backgroundColor:C.dark?'rgba(3,4,5,.56)':'rgba(255,255,255,.46)'},
 headlineIcon:{position:'absolute',right:14,bottom:12,width:58,height:58},
 headlineCopy:{padding:11,maxWidth:'80%'},
 headlineNameRow:{flexDirection:'row',alignItems:'center',gap:5,minWidth:0},
 headlineName:{...typography.title,color:C.text,flexShrink:1,minWidth:0},
 headlineMeta:{...typography.caption,color:C.dark?C.accentSoft:C.text,fontWeight:'700',marginTop:1},
 headlineAction:{fontSize:9,color:C.info,fontWeight:'900',letterSpacing:.5,marginTop:4},
 badgeShelf:{marginTop:5},
 pair:{flexDirection:'row',gap:8},
 slotCard:{flex:1,minWidth:0,minHeight:60,flexDirection:'row',alignItems:'center',gap:9,padding:9,borderRadius:radii.md,borderWidth:1,borderColor:C.line,backgroundColor:C.panel},
 slotIcon:{width:40,height:40,alignItems:'center',justifyContent:'center',borderRadius:radii.sm,borderWidth:1,borderColor:C.line,backgroundColor:C.bg},
 slotIconArt:{width:'88%',height:'88%'},
 slotMark:{...typography.bodyStrong,color:C.muted},
 slotLabel:{fontSize:8.5,lineHeight:11,color:C.accent,fontWeight:'900',letterSpacing:.5},
 slotValue:{...typography.caption,color:C.text,fontWeight:'800',marginTop:2},
 trioBlock:{gap:7},
 trio:{flexDirection:'row',gap:8},
 cell:{flex:1,minWidth:0,minHeight:98,alignItems:'center',gap:4,padding:7,borderRadius:radii.md,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},
 cellEmpty:{alignItems:'center',justifyContent:'center',borderStyle:'dashed'},
 cellArt:{width:38,height:38,alignItems:'center',justifyContent:'center'},
 cellImage:{width:'100%',height:'100%'},
 cellName:{fontSize:9.5,lineHeight:12,color:C.text,fontWeight:'700',textAlign:'center'},
 cellMeta:{fontSize:8,lineHeight:10,color:C.disabled,fontWeight:'800',textAlign:'center'},
 plus:{fontSize:19,lineHeight:22,color:C.muted,fontWeight:'800'},
 saveBar:{flexDirection:'row',alignItems:'center',gap:8,paddingTop:4},
 revert:{width:104},
 notice:{color:C.good,fontWeight:'800',textAlign:'center'},
 error:{color:C.bad,fontWeight:'800',textAlign:'center'},
 pickerSheet:{maxHeight:'88%',paddingHorizontal:spacing.lg,backgroundColor:C.bg,borderColor:C.line,gap:8},
 pickerList:{maxHeight:520},
 pickerContent:{gap:5,paddingBottom:8},
 option:{paddingVertical:10,minHeight:48,justifyContent:'center',paddingHorizontal:12,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},
 optionActive:{borderColor:C.selectionLine,backgroundColor:C.selection},
 optionDisabled:{opacity:.4},
 pickerEmpty:{...typography.caption,color:C.muted,textAlign:'center',paddingHorizontal:12,paddingVertical:18},
 optionRow:{flexDirection:'row',alignItems:'center',gap:8},
 optionText:{color:C.text,fontWeight:'800'},
 optionSub:{color:C.muted,fontSize:9,marginTop:2},
 masteredMark:{fontSize:8,color:C.good,fontWeight:'900',letterSpacing:.55},
});}
