import {useMemo,useState} from 'react';
import {Image,Pressable,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {COMBAT_COMPANIONS} from '../content/combat-companions';
import {UiIcon} from './UiIcon';
import type {UiIconName} from '../theme/ui-icons';
import {formatLocalizedNumber} from '../i18n/translator';
import {COMPANION_INDEX_COUNTS,companionIndexGroup} from '../core/companion-index-availability';
import {GUILD_SHOP_CATALOGUE} from '../../../../packages/guild-shop/src/catalogue';
import type {CombatCompanionRole,CompanionUnlockRequirementType} from '../core/combat-companion-types';
import type {GameState} from '../core/types';
import {companionNextUnlockTargets,companionUnlockCompletion} from '../core/companion-presentation';
import {companionAvailability} from '../core/companion-runtime';
import {companionArtSource} from '../theme/companion-art';
import {companionRarityBorder} from './CompanionPresentation';
import {SearchField} from './SearchField';
import {useGameTheme} from '../theme/ThemeContext';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {companionContent,companionLabel,companionTranslator,companionUnlockRequirement} from '../i18n/companions';

type IndexTab='owned'|'unlock'|'event';
type Role='all'|CombatCompanionRole;
/** Shared game pixel-art assets keep requirement symbols legible on every platform. */
const sourceIcon:Record<CompanionUnlockRequirementType,UiIconName>={
 quest:'quests',achievement:'rewards',boss_kills:'trials',dungeon_clears:'dungeon',
 monster_mastery:'world',skill_level:'skills',reputation:'guild',collection:'inventory',
 event_currency:'events',event_challenge:'trials',meta:'companions',
};
const roleOrder:readonly Role[]=['all','damage','tank','support'];

export interface CompanionIndexProps{
 state:GameState;
 hiddenIds:ReadonlySet<string>;
 onOpen:(id:string)=>void;
 onTrain:(id:string)=>void;
 onCodex:()=>void;
}

/** A single intent per tab: manage what you own, earn available recruits, or review past events. */
export function CompanionIndex({state,hiddenIds,onOpen,onTrain,onCodex}:CompanionIndexProps){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]),language=useGameLanguage(),t=companionTranslator(language);
 const {width}=useWindowDimensions(),wide=width>=680;
 const [tab,setTab]=useState<IndexTab>('unlock'),[role,setRole]=useState<Role>('all'),[roleMenuOpen,setRoleMenuOpen]=useState(false),[query,setQuery]=useState('');
 const ownedIds=new Set(state.account.unlockedCombatCompanionIds??[]);
 const inIndex=COMBAT_COMPANIONS.filter(def=>companionIndexGroup(def)!=='comingSoon');
 const unlocked=inIndex.filter(def=>ownedIds.has(def.id)).length;
 const publicTotal=COMPANION_INDEX_COUNTS.available+COMPANION_INDEX_COUNTS.event;
 const unlockCount=inIndex.filter(def=>companionIndexGroup(def)==='available'&&!ownedIds.has(def.id)).length;
 const tabs:{id:IndexTab;title:string;count:number}[]=[
  {id:'owned',title:t('My companions'),count:unlocked},
  {id:'unlock',title:t('Unlock'),count:unlockCount},
  {id:'event',title:t('Past events'),count:COMPANION_INDEX_COUNTS.event},
 ];
 const sectionTitle=tab==='owned'?t('Your companions'):tab==='unlock'?t('Companions to unlock'):t('Previously released companions');
 const visible=useMemo(()=>{
  const q=query.trim().toLocaleLowerCase(language);
  return COMBAT_COMPANIONS.filter(def=>{
   const group=companionIndexGroup(def);
   if(group==='comingSoon')return false;
   const owned=ownedIds.has(def.id),hidden=!owned&&hiddenIds.has(def.id);
   if(tab==='owned'&&!owned)return false;
   if(tab==='unlock'&&(owned||group!=='available'))return false;
   if(tab==='event'&&group!=='event')return false;
   if(role!=='all'&&def.role!==role)return false;
   // Never expose the identity of an undiscovered prestige companion through search.
   if(q&&!(hidden?'Unknown Prestige Companion':def.name).toLocaleLowerCase(language).includes(q))return false;
   return true;
  }).sort((a,b)=>{
   const aOwned=ownedIds.has(a.id),bOwned=ownedIds.has(b.id);
   const aEquipped=a.id===state.character?.equippedCombatCompanionId,bEquipped=b.id===state.character?.equippedCombatCompanionId;
   if(aEquipped!==bEquipped)return aEquipped?-1:1;
   if(aOwned!==bOwned)return aOwned?-1:1;
   const aHidden=hiddenIds.has(a.id),bHidden=hiddenIds.has(b.id);
   if(aHidden!==bHidden)return aHidden?1:-1;
   if(!aOwned&&!aHidden&&!bHidden){
    const ap=companionUnlockCompletion(state,a),bp=companionUnlockCompletion(state,b);
    if(ap.ratio!==bp.ratio)return bp.ratio-ap.ratio;
   }
   return a.name.localeCompare(b.name);
  });
 },[state,tab,role,query,hiddenIds,language]);
 const candidate=companionNextUnlockTargets(state,COMBAT_COMPANIONS.length)
  .find(({def})=>companionIndexGroup(def)==='available'&&!hiddenIds.has(def.id)&&def.origin.id!=='GUILD_TOKEN_SHOP');
 const candidateArt=candidate?companionArtSource(candidate.def.id):undefined;
 const switchTab=(next:IndexTab)=>{setTab(next);setRole('all');setQuery('');setRoleMenuOpen(false);};
 const resetFilters=()=>{setRole('all');setQuery('');setRoleMenuOpen(false);};
 return <View style={s.root}>
  <View style={s.header}>
   <View style={s.headingBlock}>
    <Text accessibilityRole="header" style={s.heading}>{t('Companion Index')}</Text>
    <Text style={s.caption}>{t('{value0} collected · {value1} total',{value0:unlocked,value1:publicTotal})}</Text>
   </View>
   <Pressable accessibilityRole="button" onPress={onCodex} style={({pressed})=>[s.codexAction,pressed&&s.pressed]}>
    <UiIcon name="rewards" size={18}/><Text numberOfLines={1} style={s.codexText}>{t('Codex & rewards')}</Text>
   </Pressable>
  </View>
  <View accessibilityRole="tablist" style={s.tabs}>
   {tabs.map(item=><Pressable key={item.id} accessibilityRole="tab" accessibilityState={{selected:tab===item.id}} accessibilityLabel={item.title+' · '+item.count} onPress={()=>switchTab(item.id)} style={({pressed})=>[s.tab,tab===item.id&&s.tabActive,pressed&&s.pressed]}>
    <Text style={[s.tabCount,tab===item.id&&s.tabCountActive]}>{item.count}</Text>
    <Text numberOfLines={2} style={[s.tabLabel,tab===item.id&&s.tabLabelActive]}>{item.title}</Text>
   </Pressable>)}
  </View>
  {tab==='unlock'&&candidate?<Pressable accessibilityRole="button" accessibilityLabel={t('Next unlock: {value0}',{value0:candidate.def.name})} onPress={()=>onOpen(candidate.def.id)} style={({pressed})=>[s.nextUnlock,pressed&&s.pressed]}>
    <View style={s.nextPortrait}>{candidateArt?<Image source={candidateArt} resizeMode="contain" style={s.nextArt}/>:<UiIcon name="companions" size={32}/>}</View>
    <View style={s.nextCopy}>
     <Text style={s.overline}>{t('NEXT TO UNLOCK')}</Text>
     <Text numberOfLines={1} style={s.nextName}>{candidate.def.name}</Text>
     <Text style={s.nextProgress}>{candidate.progress.completeCount}/{candidate.progress.totalCount} {t('requirements')}</Text>
    </View>
    <Text style={s.nextArrow}>›</Text>
   </Pressable>:null}
  <View style={s.filterRow}>
   <View style={s.searchBox}><SearchField value={query} onChangeText={setQuery} placeholder={t('Search companions')} accessibilityLabel={t('Search companions')}/></View>
   <Pressable accessibilityRole="button" accessibilityState={{expanded:roleMenuOpen}} accessibilityLabel={t('Filter roles')} onPress={()=>setRoleMenuOpen(open=>!open)} style={({pressed})=>[s.roleToggle,roleMenuOpen&&s.roleToggleActive,pressed&&s.pressed]}>
    <UiIcon name="filter" size={18}/><Text numberOfLines={1} style={s.roleToggleText}>{role==='all'?t('All roles'):companionLabel(language,role)}</Text>
    <Text style={s.roleArrow}>{roleMenuOpen?'⌃':'⌄'}</Text>
   </Pressable>
  </View>
  {roleMenuOpen?<View style={s.roleMenu}>
   {roleOrder.map(id=><Pressable key={id} accessibilityRole="button" accessibilityState={{selected:role===id}} onPress={()=>{setRole(id);setRoleMenuOpen(false);}} style={({pressed})=>[s.roleChoice,role===id&&s.roleChoiceActive,pressed&&s.pressed]}>
    <Text style={[s.roleChoiceText,role===id&&s.roleChoiceTextActive]}>{id==='all'?t('All roles'):companionLabel(language,id)}</Text>
    {role===id?<Text style={s.roleCheck}>✓</Text>:null}
   </Pressable>)}
  </View>:null}
  <View style={s.sectionRow}>
   <Text style={s.sectionTitle}>{sectionTitle}</Text>
   <Text style={s.resultsLabel}>{t('{value0} companions shown',{value0:visible.length})}</Text>
  </View>
  {visible.length===0?<View style={s.empty}>
   <UiIcon name="search" size={30}/>
   <Text style={s.cardName}>{t('No companions found')}</Text>
   <Text style={s.caption}>{t('Try another filter or search.')}</Text>
   <Pressable onPress={resetFilters} accessibilityRole="button" style={s.resetAction}><Text style={s.codexText}>{t('Show all companions')}</Text></Pressable>
  </View>:null}
  <View style={s.list}>{visible.map(def=>{
   const owned=ownedIds.has(def.id),hidden=!owned&&hiddenIds.has(def.id),progress=state.account.combatCompanionProgress?.[def.id],equipped=state.character?.equippedCombatCompanionId===def.id;
   const status=owned?companionAvailability(state,def.id).label:undefined;
   const guildShopEntry=def.origin.id==='GUILD_TOKEN_SHOP'?GUILD_SHOP_CATALOGUE.find(entry=>entry.category==='companion'&&entry.id==='guild_companion_'+def.id.slice(-2)):undefined;
   const achievement=!owned&&!hidden&&def.origin.type!=='event'&&def.origin.id!=='GUILD_TOKEN_SHOP'?companionUnlockCompletion(state,def):undefined;
   const percent=achievement?Math.round(achievement.ratio*100):0;
   const label=hidden?t('Unknown Prestige Companion'):def.name,art=hidden?undefined:companionArtSource(def.id);
   const category=hidden?t('Undiscovered'):def.origin.type==='event'?t('Event reward'):def.origin.id==='GUILD_TOKEN_SHOP'?t('Guild Token Shop'):companionLabel(language,def.rarity);
   const subtitle=owned?t('Lv. {value0} · Bond {value1}',{value0:progress?.level??1,value1:progress?.bondLevel??1}):hidden?t('Discover through companion challenges'):def.origin.type==='event'?t('Previously available through {event}',{event:def.origin.name}):def.origin.id==='GUILD_TOKEN_SHOP'?t('Purchase from the Guild Shop'):achievement?achievement.completeCount+'/'+achievement.totalCount+' '+t('requirements'):t('Complete unlock requirements');
   const requirementHint=achievement?def.unlockRequirements.map((req,index)=>{
    const p=achievement.requirements[index];
    return companionUnlockRequirement(language,req.description)+' '+(p.complete?'✓':p.current+'/'+p.total);
   }).join(' · '):guildShopEntry?t('Guild Lv. {level} · {cost} tokens',{level:guildShopEntry.guildLevel,cost:formatLocalizedNumber(language,guildShopEntry.tokenCost)}):undefined;
   return <Pressable key={def.id} accessibilityRole="button" accessibilityLabel={label+' · '+(owned?t('Owned'):t('Locked'))+' · '+subtitle} accessibilityHint={requirementHint} onPress={()=>onOpen(def.id)} style={({pressed})=>[s.entry,{width:wide?'48.9%':'100%',borderLeftColor:hidden?C.line:companionRarityBorder(def.rarity,C.dark)},pressed&&s.pressed]}>
    <View style={s.entryTop}>
     <View style={s.artBox}>{art?<Image source={art} resizeMode="contain" style={s.art}/>:<Text style={s.unknown}>?</Text>}</View>
     <View style={s.entryBody}>
      <Text numberOfLines={2} style={s.cardName}>{label}</Text>
      <Text numberOfLines={1} style={s.meta}>{companionLabel(language,def.role)} · {category}</Text>
      <Text numberOfLines={2} style={s.caption}>{subtitle}</Text>
     </View>
     <View style={[s.statusTag,owned?s.statusOwned:def.origin.type==='event'?s.statusEvent:s.statusLocked]}>
      <Text style={[s.statusText,owned?s.statusOwnedText:def.origin.type==='event'?s.statusEventText:s.statusLockedText]}>{equipped?t('EQUIPPED'):owned?t('Owned'):def.origin.type==='event'?t('Event reward'):t('Locked')}</Text>
     </View>
    </View>
    {!owned&&!hidden&&guildShopEntry?<View style={s.requirementList}>
     <Text style={s.requirementHeading}>{t('Unlock requirements')}</Text>
     <View style={s.requirementRow}><View style={s.requirementIcon}><UiIcon name="guild" size={18}/></View>
      <Text style={s.requirementLabel}>{t('Guild Lv. {level} · {cost} tokens',{level:guildShopEntry.guildLevel,cost:formatLocalizedNumber(language,guildShopEntry.tokenCost)})}</Text>
     </View>
    </View>:null}
    {!owned&&!hidden&&def.origin.type!=='event'&&def.origin.id!=='GUILD_TOKEN_SHOP'&&def.unlockRequirements.length>0?<View style={s.requirementList}>
     <Text style={s.requirementHeading}>{t('Unlock requirements')}</Text>
     {def.unlockRequirements.map((req,index)=>{
      const requirement=achievement?.requirements[index],complete=requirement?.complete===true;
      return <View key={req.type+':'+(req.target??index)} style={s.requirementRow}>
       <View style={[s.requirementIcon,complete&&s.requirementIconDone]}>{complete?<Text style={s.requirementGlyphDone}>✓</Text>:<UiIcon name={sourceIcon[req.type]} size={18}/>}</View>
       <Text style={[s.requirementLabel,complete&&s.requirementLabelDone]}>{companionUnlockRequirement(language,req.description)}</Text>
       {requirement?<Text style={[s.requirementValue,complete&&s.requirementValueDone]}>{complete?'✓':formatLocalizedNumber(language,Math.min(requirement.current,requirement.total))+'/'+formatLocalizedNumber(language,requirement.total)}</Text>:null}
      </View>;
     })}
    </View>:null}
    <View style={s.cardFooter}>
     {achievement?<View style={s.progressArea}>
      <View style={s.progressRail}><View style={[s.progressFill,{width:`${Math.max(0,Math.min(100,percent))}%`}]} /></View>
      <Text style={s.progressText}>{achievement.completeCount}/{achievement.totalCount} {t('requirements')} · {percent}%</Text>
     </View>:<View style={s.footerSpacer}/>}
     <Text style={s.cardAction}>{owned?t('Manage'):t('Details')} ›</Text>
    </View>
    {owned&&status&&!equipped?<Text style={s.ownedStatus}>{companionContent(language,status)}</Text>:null}
   </Pressable>;
  })}</View>
  {unlocked>0?<Pressable accessibilityRole="button" onPress={()=>{const equipped=state.character?.equippedCombatCompanionId;const first=equipped&&ownedIds.has(equipped)?equipped:inIndex.find(def=>ownedIds.has(def.id))?.id;if(first)onTrain(first);}} style={({pressed})=>[s.trainShortcut,pressed&&s.pressed]}>
   <UiIcon name="training" size={21}/><Text style={s.codexText}>{t('Train & Bond your companions')}</Text><Text style={s.nextArrow}>›</Text>
  </Pressable>:null}
 </View>;
}

function styles(C:ThemeColors){return StyleSheet.create({
 root:{gap:spacing.sm},
 header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 headingBlock:{flex:1,minWidth:0,gap:2},
 heading:{...typography.title,color:C.text,fontWeight:'900'},
 caption:{fontSize:11,lineHeight:16,color:C.muted},
 codexAction:{minHeight:44,maxWidth:'48%',paddingHorizontal:10,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5,borderWidth:1,borderColor:C.line,borderRadius:9,backgroundColor:C.panel2},
 codexText:{fontSize:11,color:C.accent,fontWeight:'800',flexShrink:1},
 tabs:{flexDirection:'row',gap:6,alignItems:'stretch'},
 tab:{flex:1,minWidth:0,minHeight:62,alignItems:'center',justifyContent:'center',gap:3,paddingHorizontal:4,paddingVertical:9,borderRadius:9,borderWidth:1,borderColor:C.line,backgroundColor:C.panel},
 tabActive:{backgroundColor:C.selection,borderColor:C.selectionLine},
 tabCount:{fontSize:16,lineHeight:19,fontWeight:'900',color:C.accent},
 tabCountActive:{color:C.text},
 tabLabel:{fontSize:10,lineHeight:14,flexShrink:1,textAlign:'center',fontWeight:'800',color:C.muted},
 tabLabelActive:{color:C.text},
 nextUnlock:{flexDirection:'row',alignItems:'center',gap:10,padding:9,borderWidth:1,borderColor:C.selectionLine,borderRadius:10,backgroundColor:C.panel2,minHeight:69},
 nextPortrait:{width:51,height:51,justifyContent:'center',alignItems:'center',borderRadius:8,backgroundColor:C.panelRaised,overflow:'hidden'},
 nextArt:{width:49,height:51},
 nextCopy:{flex:1,minWidth:0,gap:3},
 overline:{fontSize:9,color:C.warning,fontWeight:'900',letterSpacing:.7},
 nextName:{...typography.bodyStrong,color:C.text},
 nextProgress:{fontSize:10,color:C.muted,fontWeight:'800'},
 nextArrow:{fontSize:18,color:C.accent,paddingHorizontal:3},
 filterRow:{flexDirection:'row',alignItems:'stretch',gap:7},
 searchBox:{flex:1,minWidth:0},
 roleToggle:{minHeight:48,maxWidth:'40%',minWidth:112,paddingHorizontal:9,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:4,borderWidth:1,borderColor:C.line,borderRadius:9,backgroundColor:C.panel2},
 roleToggleActive:{borderColor:C.selectionLine,backgroundColor:C.selection},
 roleToggleText:{fontSize:11,color:C.text,fontWeight:'800',flexShrink:1},
 roleArrow:{fontSize:16,color:C.muted},
 roleMenu:{padding:4,gap:3,borderWidth:1,borderColor:C.lineStrong,borderRadius:9,backgroundColor:C.panel2},
 roleChoice:{minHeight:44,paddingHorizontal:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderRadius:7},
 roleChoiceActive:{backgroundColor:C.selection},
 roleChoiceText:{fontSize:12,color:C.muted,fontWeight:'700'},
 roleChoiceTextActive:{color:C.text},
 roleCheck:{fontSize:13,color:C.good,fontWeight:'900'},
 sectionRow:{flexDirection:'row',alignItems:'baseline',justifyContent:'space-between',gap:6,paddingTop:3},
 sectionTitle:{fontSize:12,lineHeight:17,color:C.text,fontWeight:'900',flexShrink:1},
 resultsLabel:{fontSize:10,fontWeight:'700',color:C.muted},
 list:{flexDirection:'row',flexWrap:'wrap',gap:8,alignItems:'stretch'},
 entry:{minHeight:114,gap:8,padding:10,borderWidth:1,borderLeftWidth:3,borderColor:C.line,borderRadius:10,backgroundColor:C.panel},
 entryTop:{flexDirection:'row',alignItems:'center',gap:9},
 artBox:{width:62,height:66,justifyContent:'center',alignItems:'center',backgroundColor:C.panel2,borderRadius:7,overflow:'hidden'},
 art:{width:61,height:65},
 unknown:{fontSize:25,fontWeight:'700',color:C.muted},
 entryBody:{flex:1,minWidth:0,gap:2},
 cardName:{fontSize:12,lineHeight:17,color:C.text,fontWeight:'900'},
 meta:{fontSize:10,lineHeight:14,color:C.accent,fontWeight:'700'},
 statusTag:{alignSelf:'flex-start',paddingHorizontal:6,paddingVertical:4,borderWidth:1,borderRadius:6,maxWidth:95},
 statusOwned:{backgroundColor:C.goodSurface,borderColor:C.good},
 statusEvent:{backgroundColor:C.panel2,borderColor:C.lineStrong},
 statusLocked:{backgroundColor:C.warningSurface,borderColor:C.warning},
 statusText:{fontSize:9,lineHeight:12,fontWeight:'900',textAlign:'center'},
 statusOwnedText:{color:C.good},statusEventText:{color:C.muted},statusLockedText:{color:C.warning},
 requirementList:{paddingTop:8,borderTopWidth:1,borderTopColor:C.line,gap:7},
 requirementHeading:{fontSize:10,fontWeight:'900',color:C.muted,letterSpacing:.35},
 requirementRow:{flexDirection:'row',alignItems:'center',gap:8,minHeight:26},
 requirementIcon:{width:24,height:24,alignItems:'center',justifyContent:'center',borderRadius:6,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},
 requirementIconDone:{borderColor:C.good,backgroundColor:C.goodSurface},
 requirementGlyphDone:{fontSize:13,fontWeight:'900',color:C.good},
 requirementLabel:{fontSize:11,lineHeight:16,color:C.text,flex:1,minWidth:0},
 requirementLabelDone:{color:C.muted},
 requirementValue:{fontSize:10,fontWeight:'800',color:C.muted,textAlign:'right'},
 requirementValueDone:{color:C.good},
 cardFooter:{flexDirection:'row',alignItems:'center',gap:12,justifyContent:'space-between'},
 footerSpacer:{flex:1},
 progressArea:{flex:1,minWidth:0,gap:4},
 progressRail:{height:5,borderRadius:5,backgroundColor:C.panelRaised,overflow:'hidden'},
 progressFill:{height:5,backgroundColor:C.accent},
 progressText:{fontSize:9,color:C.muted,fontWeight:'700'},
 cardAction:{fontSize:11,color:C.accent,fontWeight:'900',paddingVertical:4},
 ownedStatus:{fontSize:10,color:C.good,fontWeight:'800'},
 empty:{padding:16,alignItems:'center',gap:7,borderColor:C.line,borderWidth:1,borderRadius:10},
 resetAction:{minHeight:44,paddingHorizontal:12,alignItems:'center',justifyContent:'center',borderColor:C.lineStrong,borderWidth:1,borderRadius:8},
 trainShortcut:{minHeight:44,paddingHorizontal:12,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:9,borderColor:C.line,borderWidth:1,borderRadius:10,backgroundColor:C.panel2},
 pressed:{opacity:.72},
});}
