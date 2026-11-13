import {useMemo,useState} from 'react';
import {Image,Pressable,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {ALL_COMBAT_COMPANIONS,COMBAT_COMPANIONS} from '../content/combat-companions';
import {WORLD_ZONES} from '../content/world-map';
import {COMPANION_INDEX_COUNTS,UNRELEASED_SEASONAL_COMPANION_COUNT,companionIndexGroup,type CompanionIndexGroup} from '../core/companion-index-availability';
import {GUILD_SHOP_CATALOGUE} from '../../../../packages/guild-shop/src/catalogue';
import type {CombatCompanionRole,CompanionUnlockRequirementType} from '../core/combat-companion-types';
import type {GameState} from '../core/types';
import {companionNextUnlockTargets,companionUnlockCompletion,companionUnlockGuidance} from '../core/companion-presentation';
import {companionAvailability} from '../core/companion-runtime';
import {companionArtSource} from '../theme/companion-art';
import {companionRarityBorder} from './CompanionPresentation';
import {SearchField} from './SearchField';
import {useGameTheme} from '../theme/ThemeContext';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {companionContent,companionLabel,companionTranslator} from '../i18n/companions';

type Scope='owned'|'missing'|'all';
type Role='all'|CombatCompanionRole;
const sourceIcon:Record<CompanionUnlockRequirementType,string>={
 quest:'✦',achievement:'★',boss_kills:'⚔',dungeon_clears:'◆',
 monster_mastery:'♜',skill_level:'✧',reputation:'◈',collection:'◇',
 event_currency:'◉',event_challenge:'⚔',meta:'✦',
};
const groupOrder:readonly CompanionIndexGroup[]=['available','event','comingSoon'];
export interface CompanionIndexProps{
 state:GameState;
 hiddenIds:ReadonlySet<string>;
 onOpen:(id:string)=>void;
 onTrain:(id:string)=>void;
 onCodex:()=>void;
}
const roleOrder:Role[]=['all','damage','tank','support'];
const unavailableOriginIds=new Set(WORLD_ZONES.filter(zone=>zone.availability==='inDevelopment').map(zone=>`REG_${zone.id}`));

export function CompanionIndex({state,hiddenIds,onOpen,onTrain,onCodex}:CompanionIndexProps){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]),language=useGameLanguage(),t=companionTranslator(language);
 const {width}=useWindowDimensions(),wide=width>=680;
 const [scope,setScope]=useState<Scope>('all'),[group,setGroup]=useState<CompanionIndexGroup>('available'),[role,setRole]=useState<Role>('all'),[query,setQuery]=useState('');
 const ownedIds=new Set(state.account.unlockedCombatCompanionIds??[]);
 const unlocked=COMBAT_COMPANIONS.filter(def=>ownedIds.has(def.id)).length;
 const groupCompanions=COMBAT_COMPANIONS.filter(def=>companionIndexGroup(def)===group);
 const groupUnlocked=groupCompanions.filter(def=>ownedIds.has(def.id)).length;
 const visible=useMemo(()=>{
  const q=query.trim().toLocaleLowerCase(language);
  return COMBAT_COMPANIONS.filter(def=>{
   if(companionIndexGroup(def)!==group)return false;
   const owned=ownedIds.has(def.id),hidden=!owned&&hiddenIds.has(def.id);
   if(scope==='owned'&&!owned||scope==='missing'&&owned)return false;
   if(role!=='all'&&def.role!==role)return false;
   // Undiscovered Prestige names must not be discoverable via search.
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
    const aProgress=companionUnlockCompletion(state,a),bProgress=companionUnlockCompletion(state,b);
    if(aProgress.ratio!==bProgress.ratio)return bProgress.ratio-aProgress.ratio;
   }
   return a.name.localeCompare(b.name);
  });
 },[state,scope,group,role,query,hiddenIds,language]);
 const candidate=companionNextUnlockTargets(state,COMBAT_COMPANIONS.length)
  .find(({def})=>!hiddenIds.has(def.id)&&!unavailableOriginIds.has(def.origin.id)&&def.origin.type!=='event'&&def.origin.id!=='GUILD_TOKEN_SHOP');
 const candidateArt=candidate?companionArtSource(candidate.def.id):undefined;
 const open=(id:string)=>onOpen(id);
 return <View style={s.root}>
  <View style={s.header}>
   <View style={s.headingBlock}>
    <Text accessibilityRole="header" style={s.heading}>{t('Companion Index')}</Text>
    <Text style={s.caption}>{t('{value0} collected · {value1} total',{value0:unlocked,value1:ALL_COMBAT_COMPANIONS.length})}</Text>
   </View>
   <Pressable accessibilityRole="button" onPress={onCodex} style={({pressed})=>[s.codexAction,pressed&&s.pressed]}>
    <Text style={s.codexText}>{t('Codex & rewards')} ›</Text>
   </Pressable>
  </View>
  {candidate?<Pressable accessibilityRole="button" accessibilityLabel={t('Next unlock: {value0}',{value0:candidate.def.name})} onPress={()=>open(candidate.def.id)} style={({pressed})=>[s.nextUnlock,pressed&&s.pressed]}>
    {candidateArt?<Image source={candidateArt} resizeMode="contain" style={s.nextArt}/>:null}
    <View style={s.nextCopy}>
     <Text style={s.overline}>{t('NEXT TO UNLOCK')}</Text>
     <Text style={s.nextName} numberOfLines={1}>{candidate.def.name}</Text>
     <Text style={s.nextDetail} numberOfLines={2}>{companionContent(language,companionUnlockGuidance(state,candidate.def).label)}</Text>
     <Text style={s.nextProgress}>{candidate.progress.completeCount}/{candidate.progress.totalCount} {t('requirements')}</Text>
    </View>
    <Text style={s.nextArrow}>›</Text>
   </Pressable>:null}
  <View accessibilityRole="tablist" style={s.groupRow}>{groupOrder.map(id=>{
   const title=id==='available'?t('Available to earn'):id==='event'?t('Event / Past'):t('Coming soon');
   return <Pressable key={id} accessibilityRole="tab" accessibilityState={{selected:group===id}} accessibilityLabel={title+' · '+COMPANION_INDEX_COUNTS[id]} onPress={()=>{setGroup(id);setScope('all');}} style={[s.groupTab,group===id&&s.groupTabActive]}>
    <Text numberOfLines={2} style={[s.groupText,group===id&&s.groupTextActive]}>{title}</Text>
    <Text style={[s.groupCount,group===id&&s.groupTextActive]}>{COMPANION_INDEX_COUNTS[id]}</Text>
   </Pressable>;
  })}</View>
  <SearchField value={query} onChangeText={setQuery} placeholder={t('Search companions')} accessibilityLabel={t('Search companions')}/>
  <View accessibilityRole="tablist" style={s.segmentRow}>{([
   ['all',t('All')],['owned',t('Owned')],['missing',t('Locked')]
  ] as const).map(([id,title])=><Pressable key={id} accessibilityRole="tab" accessibilityState={{selected:scope===id}} onPress={()=>setScope(id)} style={[s.segment,scope===id&&s.segmentActive]}><Text style={[s.segmentText,scope===id&&s.segmentTextActive]}>{title}{id==='owned'?' · '+groupUnlocked:id==='missing'?' · '+(groupCompanions.length-groupUnlocked):''}</Text></Pressable>)}</View>
  <View style={s.roleRow}>{roleOrder.map(id=><Pressable key={id} accessibilityRole="button" accessibilityState={{selected:role===id}} onPress={()=>setRole(id)} style={[s.roleFilter,role===id&&s.roleFilterActive]}><Text style={[s.roleFilterText,role===id&&s.roleFilterTextActive]}>{id==='all'?t('All roles'):companionLabel(language,id)}</Text></Pressable>)}</View>
  <Text style={s.resultsLabel}>{t('{value0} companions shown',{value0:visible.length})}</Text>
  {group==='comingSoon'&&UNRELEASED_SEASONAL_COMPANION_COUNT>0?<View style={s.seasonPreview}>
   <Text style={s.seasonSymbol}>◇</Text>
   <Text style={s.seasonText}>{t('{value0} more seasonal companions are hidden until their events release.',{value0:UNRELEASED_SEASONAL_COMPANION_COUNT})}</Text>
  </View>:null}
  {visible.length===0?<View style={s.empty}><Text style={s.cardName}>{t('No companions found')}</Text><Text style={s.caption}>{t('Try another filter or search.')}</Text><Pressable onPress={()=>{setQuery('');setScope('all');setRole('all');}} accessibilityRole="button"><Text style={s.codexText}>{t('Show all companions')}</Text></Pressable></View>:null}
  <View style={s.list}>{visible.map(def=>{
   const owned=ownedIds.has(def.id),hidden=!owned&&hiddenIds.has(def.id),upcoming=!owned&&unavailableOriginIds.has(def.origin.id),progress=state.account.combatCompanionProgress?.[def.id],equipped=state.character?.equippedCombatCompanionId===def.id;
   const status=owned?companionAvailability(state,def.id).label:undefined;
   const guildShopEntry=def.origin.id==='GUILD_TOKEN_SHOP'?GUILD_SHOP_CATALOGUE.find(entry=>entry.category==='companion'&&entry.id==='guild_companion_'+def.id.slice(-2)):undefined;
   const achievement=!owned&&!hidden&&!upcoming&&def.origin.type!=='event'&&def.origin.id!=='GUILD_TOKEN_SHOP'?companionUnlockCompletion(state,def):undefined;
   const guidance=achievement?companionUnlockGuidance(state,def):undefined;
   const percent=achievement?Math.round(achievement.ratio*100):0;
   const label=hidden?t('Unknown Prestige Companion'):def.name,art=hidden?undefined:companionArtSource(def.id);
   const category=hidden?t('Undiscovered'):upcoming?t('Coming soon'):def.origin.type==='event'?t('Event reward'):def.origin.id==='GUILD_TOKEN_SHOP'?t('Guild Token Shop'):companionLabel(language,def.rarity);
   const subtitle=owned?t('Lv. {value0} · Bond {value1}',{value0:progress?.level??1,value1:progress?.bondLevel??1}):hidden?t('Discover through companion challenges'):upcoming?t('Region in development'):def.origin.type==='event'?t('Previously available through {event}',{event:def.origin.name}):guildShopEntry?t('Guild Lv. {level} · {cost} tokens',{level:guildShopEntry.guildLevel,cost:guildShopEntry.tokenCost.toLocaleString()}):def.origin.id==='GUILD_TOKEN_SHOP'?t('Purchase from the Guild Shop'):companionContent(language,guidance?.label??t('Complete unlock requirements'));
   return <Pressable key={def.id} accessibilityRole="button" accessibilityLabel={label+' · '+(owned?t('Owned'):t('Locked'))+' · '+subtitle} onPress={()=>open(def.id)} style={({pressed})=>[s.entry,{width:wide?'48.9%':'100%',borderLeftColor:hidden?C.line:companionRarityBorder(def.rarity,C.dark)},pressed&&s.pressed]}>
    <View style={s.artBox}>{art?<Image source={art} resizeMode="contain" style={s.art}/>:<Text style={s.unknown}>?</Text>}</View>
    <View style={s.entryBody}>
     <Text numberOfLines={1} style={s.cardName}>{label}</Text>
     <Text numberOfLines={1} style={s.meta}>{companionLabel(language,def.role)} · {category}</Text>
     <Text numberOfLines={2} style={s.caption}>{subtitle}</Text>
     {!owned&&!hidden&&def.origin.type!=='event'&&def.origin.id!=='GUILD_TOKEN_SHOP'&&def.unlockRequirements.length>0?<View style={s.requirementList}>
      <Text style={s.requirementHeading}>{upcoming?t('Planned unlocks'):t('Unlock requirements')}</Text>
      {def.unlockRequirements.map((req,index)=>{
       const requirement=achievement?.requirements[index],complete=requirement?.complete===true;
       return <View key={req.type+':'+(req.target??index)} style={s.requirementRow}>
        <View style={[s.requirementIcon,complete&&s.requirementIconDone]}><Text style={[s.requirementGlyph,complete&&s.requirementGlyphDone]}>{complete?'✓':sourceIcon[req.type]}</Text></View>
        <Text numberOfLines={2} style={[s.requirementLabel,complete&&s.requirementLabelDone]}>{companionContent(language,req.description)}</Text>
        <Text style={[s.requirementValue,complete&&s.requirementValueDone]}>{requirement?Math.min(requirement.current,requirement.total)+'/'+requirement.total:'—'}</Text>
       </View>;
      })}
     </View>:null}
     {achievement?<View style={s.progressRail}><View style={[s.progressFill,{width:`${Math.max(0,Math.min(100,percent))}%`}]} /></View>:null}
     {achievement?<Text style={s.progressText}>{achievement.completeCount}/{achievement.totalCount} {t('requirements')} · {percent}%</Text>:null}
     {equipped?<Text style={s.ownedStatus}>{t('EQUIPPED')}</Text>:owned&&status?<Text style={s.ownedStatus}>{status}</Text>:null}
    </View>
    <Text style={s.chevron}>›</Text>
   </Pressable>;
  })}</View>
  {unlocked>0?<Pressable accessibilityRole="button" onPress={()=>{const equipped=state.character?.equippedCombatCompanionId;const first=equipped&&ownedIds.has(equipped)?equipped:COMBAT_COMPANIONS.find(def=>ownedIds.has(def.id))?.id;if(first)onTrain(first);}} style={s.trainShortcut}><Text style={s.codexText}>{t('Train & Bond your companions')} ›</Text></Pressable>:null}
 </View>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 root:{gap:spacing.sm},
 header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 headingBlock:{flex:1,minWidth:0,gap:2},
 heading:{...typography.title,color:C.text,fontWeight:'900'},
 caption:{fontSize:11,lineHeight:15,color:C.muted},
 codexAction:{minHeight:40,paddingHorizontal:10,justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:9,backgroundColor:C.panel2},
 codexText:{fontSize:11,color:C.accent,fontWeight:'800'},
 nextUnlock:{flexDirection:'row',alignItems:'center',padding:10,borderWidth:1,borderColor:C.selectionLine,borderRadius:10,backgroundColor:C.panel2},
 nextArt:{width:50,height:54},nextProgress:{fontSize:10,color:C.accent,fontWeight:'800'},
 nextCopy:{flex:1,gap:3},overline:{fontSize:9,color:C.accent,fontWeight:'900',letterSpacing:.8},
 nextName:{...typography.bodyStrong,color:C.text},nextDetail:{fontSize:11,color:C.muted},
 nextArrow:{fontSize:22,color:C.accent,paddingHorizontal:5},
 groupRow:{flexDirection:'row',gap:5,alignItems:'stretch'},
 groupTab:{flex:1,minWidth:0,minHeight:49,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5,paddingHorizontal:5,paddingVertical:7,borderRadius:9,borderWidth:1,borderColor:C.line,backgroundColor:C.panel},
 groupTabActive:{backgroundColor:C.selection,borderColor:C.selectionLine},
 groupText:{fontSize:10,lineHeight:13,flexShrink:1,textAlign:'center',fontWeight:'800',color:C.muted},
 groupTextActive:{color:C.text},groupCount:{fontSize:11,fontWeight:'900',color:C.accent},
 segmentRow:{flexDirection:'row',padding:3,backgroundColor:C.panel2,borderRadius:10,borderWidth:1,borderColor:C.line},
 segment:{flex:1,minHeight:40,alignItems:'center',justifyContent:'center',borderRadius:8,paddingHorizontal:3},
 segmentActive:{backgroundColor:C.selection},segmentText:{fontSize:11,color:C.muted,fontWeight:'800'},segmentTextActive:{color:C.text},
 roleRow:{flexDirection:'row',gap:5,flexWrap:'wrap'},roleFilter:{paddingHorizontal:10,minHeight:32,justifyContent:'center',borderRadius:8,borderWidth:1,borderColor:C.line},
 roleFilterActive:{borderColor:C.accent,backgroundColor:C.panel2},roleFilterText:{fontSize:10,color:C.muted,fontWeight:'700'},roleFilterTextActive:{color:C.text},
 resultsLabel:{fontSize:10,fontWeight:'700',color:C.muted},
 seasonPreview:{flexDirection:'row',alignItems:'center',gap:9,padding:10,borderRadius:9,backgroundColor:C.panel2,borderWidth:1,borderColor:C.line},
 seasonSymbol:{fontSize:20,color:C.accent,fontWeight:'700'},seasonText:{flex:1,fontSize:11,lineHeight:16,color:C.muted},
 requirementList:{marginTop:4,gap:5},
 requirementHeading:{fontSize:9,fontWeight:'900',color:C.muted,letterSpacing:.45},
 requirementRow:{flexDirection:'row',alignItems:'center',gap:6,minHeight:22},
 requirementIcon:{width:20,height:20,alignItems:'center',justifyContent:'center',borderRadius:5,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},
 requirementIconDone:{borderColor:C.good},requirementGlyph:{fontSize:11,fontWeight:'800',color:C.accent},requirementGlyphDone:{color:C.good},
 requirementLabel:{fontSize:10,lineHeight:14,color:C.text,flex:1,minWidth:0},
 requirementLabelDone:{color:C.muted},requirementValue:{fontSize:10,fontWeight:'800',color:C.muted},requirementValueDone:{color:C.good},
 list:{flexDirection:'row',flexWrap:'wrap',gap:7,alignItems:'stretch'},
 entry:{minHeight:105,flexDirection:'row',alignItems:'center',gap:8,padding:8,borderWidth:1,borderLeftWidth:3,borderColor:C.line,borderRadius:10,backgroundColor:C.panel},
 artBox:{width:68,height:76,justifyContent:'center',alignItems:'center',backgroundColor:C.panel2,borderRadius:7},
 art:{width:65,height:73},unknown:{fontSize:25,fontWeight:'700',color:C.muted},
 entryBody:{flex:1,minWidth:0,gap:3},cardName:{fontSize:12,lineHeight:16,color:C.text,fontWeight:'800'},
 meta:{fontSize:10,lineHeight:13,color:C.accent,fontWeight:'700'},
 progressRail:{height:4,borderRadius:4,backgroundColor:C.panelRaised,overflow:'hidden',marginTop:1},progressFill:{height:4,backgroundColor:C.accent},
 progressText:{fontSize:9,color:C.muted,fontWeight:'700'},ownedStatus:{fontSize:9,color:C.good,fontWeight:'900',letterSpacing:.4},
 chevron:{fontSize:19,color:C.muted,paddingHorizontal:1},
 empty:{padding:16,alignItems:'center',gap:7,borderColor:C.line,borderWidth:1,borderRadius:10},
 trainShortcut:{minHeight:42,alignItems:'center',justifyContent:'center',borderColor:C.line,borderWidth:1,borderRadius:10},
 pressed:{opacity:.75}
});}
