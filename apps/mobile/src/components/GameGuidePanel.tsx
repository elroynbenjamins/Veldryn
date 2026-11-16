import {useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import type {GameState} from '../core/types';
import {GAME_GUIDE_CATEGORIES,normalizeOnboardingGuideState,unlockedGameGuide,type GameGuideId} from '../core/onboarding';
import {browseGameGuides,type GameGuideFilter} from '../core/game-guide-browse';
import {accountText} from '../i18n/account';
import {guideHubText} from '../i18n/game-guide-hub';
import {useGameTheme} from '../theme/ThemeContext';
import {spacing,typography,type ThemeColors} from '../theme/theme';

const categories:readonly GameGuideFilter[]=['all','basics','progress','social','adventures'];
const categoryLabels:Record<GameGuideFilter,'All'|'Basics'|'Progress'|'Social'|'Adventures'>={all:'All',basics:'Basics',progress:'Progress',social:'Social',adventures:'Adventures'};

export function GameGuidePanel({state,onOpen,onStartTour,seenGuideIds}:{
 state:GameState;
 onOpen:(id:GameGuideId)=>void;
 onStartTour?:()=>void;
 seenGuideIds?:readonly GameGuideId[];
}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [query,setQuery]=useState('');
 const [category,setCategory]=useState<GameGuideFilter>('all');
 const [unreadOnly,setUnreadOnly]=useState(false);
 const language=state.settings.language;
 const a=(value:string)=>accountText(language,value);
 const t=(label:Parameters<typeof guideHubText>[1])=>guideHubText(language,label);
 const saved=normalizeOnboardingGuideState(state.account.guideState);
 const readIds=new Set<GameGuideId>([...saved.seenGuideIds,...(seenGuideIds??[])]);
 const unlocked=unlockedGameGuide(state);
 const unlockedIds=new Set<GameGuideId>(unlocked.map(entry=>entry.id));
 const readCount=unlocked.filter(entry=>readIds.has(entry.id)).length;
 const percent=unlocked.length?Math.round(readCount/unlocked.length*100):0;
 const firstUnread=unlocked.find(entry=>!readIds.has(entry.id));
 const entries=browseGameGuides({unlockedIds,readIds,category,query,unreadOnly,localize:a});
 return <View style={s.root}>
  <View style={s.hero}>
   <Text style={s.eyebrow}>{t('Learning library')}</Text>
   <Text accessibilityRole="header" style={s.title}>{t('Help & Guide')}</Text>
   <View style={s.heroMeta}>
    <Text style={s.progressLabel}>{readCount} / {unlocked.length} {t('Topics read').toLocaleLowerCase()}</Text>
    <Text style={s.progressLabel}>{percent}%</Text>
   </View>
   <View style={s.progressTrack}><View style={[s.progressFill,{width:`${percent}%` as `${number}%`}]}/></View>
   <View style={s.heroActions}>
    {firstUnread?<Pressable accessibilityRole="button" onPress={()=>onOpen(firstUnread.id)} style={({pressed})=>[s.continueButton,pressed&&s.pressed]}>
     <Text numberOfLines={1} style={s.continueTitle}>{t('Continue reading')}</Text>
     <Text numberOfLines={1} style={s.continueDetail}>{a(firstUnread.title)}  ›</Text>
    </Pressable>:null}
    {onStartTour?<Pressable accessibilityRole="button" onPress={onStartTour} style={({pressed})=>[s.tourButton,pressed&&s.pressed]}>
     <Text style={s.tourTitle}>{t('Start screen tour')}  ›</Text>
    </Pressable>:null}
   </View>
  </View>
  <View style={s.searchRow}>
   <Text style={s.searchIcon}>⌕</Text>
   <TextInput
    accessibilityLabel={t('Find a topic')}
    value={query}
    onChangeText={setQuery}
    placeholder={t('Find a topic')}
    placeholderTextColor={C.muted}
    autoCorrect={false}
    autoCapitalize="none"
    returnKeyType="search"
    selectionColor={C.accent}
    style={s.searchInput}
   />
   {query?<Pressable accessibilityRole="button" accessibilityLabel={a('Clear')} onPress={()=>setQuery('')} style={s.clearButton}><Text style={s.clearText}>×</Text></Pressable>:null}
  </View>
  <ScrollView horizontal nestedScrollEnabled keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false} contentContainerStyle={s.categoryRow}>
   {categories.map(value=><Pressable key={value} accessibilityRole="button" accessibilityState={{selected:category===value}} onPress={()=>setCategory(value)} style={({pressed})=>[s.categoryChip,category===value&&s.categorySelected,pressed&&s.pressed]}>
    <Text style={[s.categoryText,category===value&&s.categoryTextSelected]}>{t(categoryLabels[value])}</Text>
   </Pressable>)}
  </ScrollView>
  <View style={s.listHeading}>
   <Text style={s.listTitle}>{t('Guides')} · {entries.length}</Text>
   <Pressable accessibilityRole="checkbox" accessibilityState={{checked:unreadOnly}} onPress={()=>setUnreadOnly(value=>!value)} style={[s.unreadControl,unreadOnly&&s.unreadSelected]}>
    <Text style={[s.unreadLabel,unreadOnly&&s.unreadLabelSelected]}>{unreadOnly?'✓  ':''}{t('Unread only')}</Text>
   </Pressable>
  </View>
  {entries.length===0?<View style={s.empty}>
   <Text style={s.emptyTitle}>{t('No matching guides')}</Text>
   <Text style={s.emptyDetail}>{t('Try another search or category.')}</Text>
  </View>:entries.map(entry=>{
   const available=unlockedIds.has(entry.id),read=available&&readIds.has(entry.id);
   const categoryName=t(categoryLabels[GAME_GUIDE_CATEGORIES[entry.id]]);
   return <Pressable key={entry.id} accessibilityRole="button" accessibilityLabel={`${a(entry.title)}. ${available?read?t('Read'):t('To read'):t('Locked')}.`}
    accessibilityHint={available?a(entry.summary):a(entry.unlockHint)}
    onPress={()=>onOpen(entry.id)}
    style={({pressed})=>[s.guideRow,pressed&&s.pressed]}>
    <View style={[s.guideEmblem,read&&s.emblemRead,!available&&s.emblemLocked]}>
     <Text style={[s.emblemText,!available&&s.emblemMuted]}>{read?'✓':available?'◇':'·'}</Text>
    </View>
    <View style={s.guideMain}>
     <View style={s.guideTop}>
      <Text numberOfLines={2} style={s.guideTitle}>{a(entry.title)}</Text>
     </View>
     <Text style={s.guideCategory}>{categoryName}  ·  {available?read?t('Read'):t('To read'):t('Locked')}</Text>
     <Text numberOfLines={2} style={s.guideSummary}>{available?a(entry.summary):a(entry.unlockHint)}</Text>
    </View>
    <Text style={s.arrow}>›</Text>
   </Pressable>;
  })}
 </View>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{gap:10},
 hero:{backgroundColor:C.panel,borderColor:C.lineStrong,borderWidth:1,borderRadius:14,padding:14,gap:9},
 eyebrow:{...typography.caption,fontSize:10,color:C.accent,fontWeight:'900',letterSpacing:1.2,textTransform:'uppercase'},
 title:{...typography.title,color:C.text,fontSize:22,lineHeight:28,fontWeight:'900'},
 heroMeta:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
 progressLabel:{...typography.caption,color:C.muted,fontWeight:'800'},
 progressTrack:{height:6,borderRadius:4,overflow:'hidden',backgroundColor:C.panel2},
 progressFill:{height:'100%',borderRadius:4,backgroundColor:C.accent},
 heroActions:{flexDirection:'row',gap:7,flexWrap:'wrap'},
 continueButton:{flex:1,minWidth:145,backgroundColor:C.selection,borderColor:C.selectionLine,borderWidth:1,borderRadius:10,paddingHorizontal:11,paddingVertical:10,gap:3,justifyContent:'center',minHeight:56},
 continueTitle:{fontSize:12,fontWeight:'900',color:C.text},
 continueDetail:{fontSize:11,fontWeight:'700',color:C.muted},
 tourButton:{minWidth:112,flexGrow:1,borderColor:C.lineStrong,backgroundColor:C.panel2,borderWidth:1,borderRadius:10,paddingHorizontal:11,paddingVertical:10,minHeight:56,justifyContent:'center',alignItems:'center'},
 tourTitle:{fontSize:12,fontWeight:'800',color:C.text,textAlign:'center'},
 searchRow:{minHeight:48,flexDirection:'row',alignItems:'center',borderWidth:1,borderRadius:11,backgroundColor:C.inputBg,borderColor:C.lineStrong,paddingHorizontal:12,gap:9},
 searchIcon:{fontSize:22,color:C.muted},
 searchInput:{flex:1,minWidth:0,fontSize:14,color:C.text,paddingVertical:9},
 clearButton:{height:40,width:40,alignItems:'center',justifyContent:'center'},
 clearText:{fontSize:24,color:C.muted},
 categoryRow:{gap:7,paddingVertical:2,paddingRight:6},
 categoryChip:{minHeight:42,justifyContent:'center',paddingHorizontal:15,borderRadius:9,backgroundColor:C.panel,borderWidth:1,borderColor:C.line},
 categorySelected:{backgroundColor:C.selection,borderColor:C.selectionLine},
 categoryText:{fontSize:12,fontWeight:'800',color:C.muted},
 categoryTextSelected:{color:C.text},
 listHeading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,minHeight:36},
 listTitle:{fontSize:14,fontWeight:'900',color:C.text},
 unreadControl:{minHeight:36,alignItems:'center',justifyContent:'center',borderColor:C.line,borderWidth:1,backgroundColor:C.panel,paddingHorizontal:10,borderRadius:8},
 unreadSelected:{backgroundColor:C.selection,borderColor:C.selectionLine},
 unreadLabel:{fontSize:11,fontWeight:'800',color:C.muted},
 unreadLabelSelected:{color:C.text},
 guideRow:{minHeight:88,borderRadius:12,borderWidth:1,borderColor:C.line,backgroundColor:C.panel,paddingHorizontal:11,paddingVertical:11,flexDirection:'row',alignItems:'center',gap:10},
 guideEmblem:{width:38,height:38,borderRadius:10,alignItems:'center',justifyContent:'center',borderColor:C.selectionLine,backgroundColor:C.selection,borderWidth:1},
 emblemRead:{borderColor:C.line,backgroundColor:C.panel2},
 emblemLocked:{borderColor:C.line,backgroundColor:C.bg},
 emblemText:{fontSize:22,fontWeight:'900',color:C.accent},
 emblemMuted:{color:C.disabled},
 guideMain:{flex:1,minWidth:0,gap:3},
 guideTop:{flexDirection:'row',alignItems:'center'},
 guideTitle:{fontSize:14,lineHeight:19,fontWeight:'900',color:C.text,flexShrink:1},
 guideCategory:{fontSize:10,lineHeight:14,fontWeight:'800',color:C.accent},
 guideSummary:{fontSize:12,lineHeight:17,color:C.muted},
 arrow:{fontSize:25,fontWeight:'500',color:C.muted},
 empty:{borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel,padding:18,alignItems:'center',gap:5},
 emptyTitle:{fontSize:14,fontWeight:'800',color:C.text},
 emptyDetail:{...typography.caption,textAlign:'center',color:C.muted},
 pressed:{opacity:.72}
});}
