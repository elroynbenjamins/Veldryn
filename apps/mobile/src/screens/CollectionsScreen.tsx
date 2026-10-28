import {memo,useCallback,useMemo,useState} from 'react';
import {FlatList,Image,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions,type DimensionValue,type ImageSourcePropType} from 'react-native';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {companionContent} from '../i18n/companions';
import {sharedText} from '../i18n/shared';
import {GameButton} from '../components/GameButton';
import {GameTextInput} from '../components/GameTextInput';
import {GameModalHeader,GameModalSurface} from '../components/GameModalSurface';
import {ProfileFrameOverlay} from '../components/ProfileFrameOverlay';
import {ProfileIcon} from '../components/ProfileIcon';
import {RegionArtwork} from '../components/RegionArtwork';
import {BASE_PROFILE_BACKGROUNDS} from '../core/profile-cosmetics';
import {COLLECTIBLE_TARGET_LABELS,type CollectibleKind} from '../content/collectibles';
import {collectibleJournal,collectionBonusBreakdown,selectCollectible} from '../core/collectibles';
import {profileIconCollection,selectProfileIcon} from '../core/profile-icons';
import type {ClassId,GameState} from '../core/types';
import {profileBackgroundPreviewById} from '../theme/profile-background-assets';
import {profileBorderSourceById} from '../theme/profile-border-assets';
import {petArtSource} from '../theme/pet-art';
import {useGameTheme} from '../theme/ThemeContext';
import {radii,typography,type ThemeColors} from '../theme/theme';

type Category='profile_icon'|CollectibleKind;
type Entry={id:string;kind:Category;name:string;source:string;group:string;owned:boolean;selected:boolean;description?:string;bonus?:string;art?:ImageSourcePropType};
const categories:ReadonlyArray<{id:Category;label:string}>=[{id:'profile_icon',label:'Icons'},{id:'pet',label:'Pets'},{id:'background',label:'Backgrounds'},{id:'border',label:'Borders'}];
const pct=(bps:number)=>(bps/100).toFixed(2)+'%';
const entryKey=(row:Entry)=>row.id;

export function CollectionsScreen({state,onChange,initialCategory='profile_icon'}:{state:GameState;onChange:(next:GameState)=>void;initialCategory?:Category|'pet'}){
 const language=useGameLanguage(),C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const text=useCallback((value:string)=>companionContent(language,value),[language]);
 const [category,setCategory]=useState<Category>(initialCategory);
 const [filter,setFilter]=useState<'all'|'owned'|'locked'>('all'),[query,setQuery]=useState(''),[source,setSource]=useState('All sources');
 const [detailId,setDetailId]=useState<string|null>(null),[width,setWidth]=useState(360),[showBonuses,setShowBonuses]=useState(false),[showSearch,setShowSearch]=useState(false),[showSources,setShowSources]=useState(false);
 const {fontScale}=useWindowDimensions();
 const classId=state.character?.classId??'IRONWARDEN';
 const rows:Entry[]=useMemo(()=>category==='profile_icon'?profileIconCollection(state).map(row=>({...row,kind:'profile_icon',owned:row.unlocked})):collectibleJournal(state).filter(row=>row.kind===category).map(row=>({
  ...row,kind:category,group:row.collectionGroup??'Collection',bonus:text(COLLECTIBLE_TARGET_LABELS[row.target])+' · '+pct(row.ownedBps)+' '+text('passive')+' / '+pct(row.activeBps)+' '+text('active'),
  art:row.kind==='background'?profileBackgroundPreviewById.get(row.id)?.source:row.kind==='border'?profileBorderSourceById.get(row.id):row.kind==='pet'?petArtSource(row.id):undefined,
 })),[category,state,text]);
 const owned=rows.filter(row=>row.owned).length,progress=rows.length?owned/rows.length:0;
 const groups=['All sources',...new Set(rows.map(row=>row.group))];
 const needle=query.trim().toLocaleLowerCase(language);
 const visible=useMemo(()=>rows.filter(row=>(filter==='all'||row.owned===(filter==='owned'))&&(source==='All sources'||row.group===source)&&(!needle||[row.name,row.group,row.source].some(value=>text(value).toLocaleLowerCase(language).includes(needle)))),[rows,filter,source,needle,language,text]);
 const detail=rows.find(row=>row.id===detailId),equipped=rows.find(row=>row.selected);
 const columns=width<340||Math.max(fontScale,state.settings.textScale)>=1.2?1:width<620?2:3;
 const cardWidth=(Math.min(width,960)-32-(columns-1)*10)/columns;
 const equip=(row:Entry)=>{if(!state.character||!row.owned||row.selected)return;onChange(row.kind==='profile_icon'?selectProfileIcon(state,row.id):selectCollectible(state,row.kind,row.id));setDetailId(null);};
 const changeCategory=(next:Category)=>{setCategory(next);setFilter('all');setSource('All sources');setQuery('');setDetailId(null);setShowBonuses(false);};
 const breakdown=useMemo(()=>showBonuses?collectionBonusBreakdown(state):[],[showBonuses,state]);
 const artwork=(row:Entry,large=false)=><JournalArtwork row={row} classId={classId} profileIconId={state.character?.profileIconId} large={large} styles={s}/>;
 const renderEntry=useCallback(({item:row}:{item:Entry})=><JournalCard row={row} width={cardWidth} classId={classId} profileIconId={state.character?.profileIconId} name={text(row.name)} status={text(row.selected?'Equipped':row.owned?'Owned':'Locked')} onOpen={setDetailId} styles={s}/>,[cardWidth,classId,state.character?.profileIconId,text,s]);
 return <View style={s.screen} onLayout={event=>setWidth(event.nativeEvent.layout.width)}>
  <FlatList key={`${category}:${columns}`} data={visible} numColumns={columns} keyExtractor={entryKey} renderItem={renderEntry} contentContainerStyle={s.root} columnWrapperStyle={columns>1?s.gridRow:undefined} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} initialNumToRender={8} maxToRenderPerBatch={6} windowSize={3} removeClippedSubviews
   ListHeaderComponent={<View style={s.header}>
    <View style={s.between}><Text accessibilityRole="header" style={[s.heading,s.flex]}>{text('Collections')}</Text><View style={s.count}><Text style={s.body}>{owned} / {rows.length}</Text><Text style={s.meta}>{text('unlocked')}</Text></View></View>
    <View accessibilityRole="progressbar" accessibilityLabel={text('Collection progress')} accessibilityValue={{min:0,max:rows.length,now:owned}} style={s.track}><View style={[s.fill,{width:((progress*100)+'%') as DimensionValue}]}/></View>
    <View accessibilityRole="tablist" style={s.tabs}>{categories.map(row=><Pressable key={row.id} accessibilityRole="tab" accessibilityLabel={text(row.label)} accessibilityState={{selected:category===row.id}} onPress={()=>changeCategory(row.id)} style={[s.tab,category===row.id&&s.activeTab]}><Text style={[s.tabText,category===row.id&&s.bright]}>{text(row.label)}</Text></Pressable>)}</View>
    {equipped?<Pressable accessibilityRole="button" accessibilityLabel={text('Currently equipped')+': '+text(equipped.name)} onPress={()=>setDetailId(equipped.id)} style={({pressed})=>[s.equipped,pressed&&s.pressed]}><View style={s.equippedArt}>{artwork(equipped)}</View><View style={s.flex}><Text style={s.eyebrow}>{text('Currently equipped')}</Text><Text style={s.title}>{text(equipped.name)}</Text><Text style={s.meta}>{text(equipped.group)}</Text></View></Pressable>:null}
    <View style={s.filters}>{(['all','owned','locked'] as const).map(value=><Pressable key={value} accessibilityRole="button" accessibilityLabel={text(value==='all'?'All':value==='owned'?'Owned':'Locked')} accessibilityState={{selected:filter===value}} onPress={()=>setFilter(value)} style={[s.filter,filter===value&&s.selected]}><Text style={[s.tabText,filter===value&&s.bright]}>{text(value==='all'?'All':value==='owned'?'Owned':'Locked')}</Text></Pressable>)}<Pressable accessibilityRole="button" accessibilityLabel={text('Search collection')} accessibilityState={{expanded:showSearch}} onPress={()=>setShowSearch(!showSearch)} style={[s.filter,(showSearch||!!query)&&s.selected]}><Text style={s.tabText}>{sharedText(language,'Search')}</Text></Pressable></View>
    {showSearch?<GameTextInput accessibilityLabel={text('Search collection')} placeholder={text('Search collection…')} value={query} onChangeText={setQuery} autoCorrect={false}/>:null}
    <View style={s.between}><Text style={s.meta}>{visible.length} {text('results')}</Text><Pressable accessibilityRole="button" accessibilityLabel={text(source)+' '+text('source')} accessibilityState={{expanded:showSources}} onPress={()=>setShowSources(!showSources)} style={s.sourceToggle}><Text style={s.meta}>{text(source)} {showSources?'−':'+'}</Text></Pressable></View>
    {showSources?<View style={s.sources}>{groups.map(group=><Pressable key={group} accessibilityRole="button" accessibilityLabel={text(group)+' '+text('source')} accessibilityState={{selected:source===group}} onPress={()=>{setSource(group);setShowSources(false);}} style={[s.source,source===group&&s.selected]}><Text style={s.meta}>{text(group)}</Text></Pressable>)}</View>:null}
   </View>}
   ListEmptyComponent={<View style={s.panel}><Text style={s.title}>{text('No collectibles in this view.')}</Text><Text style={s.copy}>{text('Try another search or clear your filters.')}</Text><GameButton compact tone="secondary" title={text('Clear filters')} onPress={()=>{setQuery('');setSource('All sources');setFilter('all');}}/></View>}
   ListFooterComponent={category!=='profile_icon'?<View style={s.footer}><GameButton tone="secondary" title={text(showBonuses?'Hide account bonuses':'View account bonuses')} onPress={()=>setShowBonuses(!showBonuses)}/>{showBonuses?<View style={s.panel}><Text style={s.eyebrow}>{text('ACTIVE BONUS SUMMARY')}</Text>{breakdown.length?breakdown.map(row=><View key={row.target} style={s.between}><View style={s.flex}><Text style={s.body}>{text(COLLECTIBLE_TARGET_LABELS[row.target])}</Text><Text style={s.copy}>{pct(row.ownedAppliedBps)} {text('passive')} · {pct(row.activeAppliedBps)} {text('active')}</Text></View><Text style={s.good}>+{pct(row.appliedBps)}</Text></View>):<Text style={s.copy}>{text('No owned collectible bonuses yet.')}</Text>}</View>:null}</View>:null} showsHorizontalScrollIndicator={false}
  />
  {detail?<GameModalSurface visible presentation="sheet" reduceMotion={state.settings.reduceMotion} onClose={()=>setDetailId(null)}>
   <GameModalHeader eyebrow={text(detail.group).toLocaleUpperCase(language)} title={text(detail.name)} onClose={()=>setDetailId(null)}/>
   <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.detail} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
    <View style={s.hero}>{artwork(detail,true)}</View>
    <Text style={[s.status,detail.owned&&s.good]}>{text(detail.selected?'Equipped':detail.owned?'Owned':'Locked')}</Text>
    {detail.description?<Text style={s.copy}>{text(detail.description)}</Text>:null}
    <View style={s.panel}><Text style={s.eyebrow}>{text('UNLOCK SOURCE')}</Text><Text style={s.body}>{text(detail.source)}</Text></View>
    <View style={s.panel}>{detail.kind==='profile_icon'?<Text style={s.body}>{text('Cosmetic only')} · {text('No stat bonuses')}</Text>:<><Text style={s.eyebrow}>{text('COLLECTION BONUS')}</Text><Text style={s.body}>{detail.bonus}</Text><Text style={s.copy}>{text('Owned collectibles contribute passive bonuses. Equipping adds the active bonus, subject to account caps.')}</Text></>}</View>
    <GameButton title={text(detail.selected?'Currently equipped':!detail.owned?'Locked':detail.kind==='profile_icon'?'Use profile icon':'Use collectible')} disabled={!state.character||!detail.owned||detail.selected} onPress={()=>equip(detail)}/>
   </ScrollView>
  </GameModalSurface>:null}
 </View>;
}

type JournalStyles=ReturnType<typeof styles>;
const JournalCard=memo(function JournalCard({row,width,classId,profileIconId,name,status,onOpen,styles:s}:{row:Entry;width:number;classId:ClassId;profileIconId?:string;name:string;status:string;onOpen:(id:string)=>void;styles:JournalStyles}){
 return <Pressable accessibilityRole="button" accessibilityLabel={name+', '+status} onPress={()=>onOpen(row.id)} style={({pressed})=>[s.card,{width},row.selected&&s.selected,pressed&&s.pressed]}>
  <View style={[s.cardStage,!row.owned&&s.lockedArtwork]}><JournalArtwork row={row} classId={classId} profileIconId={profileIconId} styles={s}/></View>
  <View style={s.flex}><Text style={s.name}>{name}</Text><Text style={[s.meta,row.selected&&s.bright]}>{row.selected?'✓ ':''}{status}</Text></View>
 </Pressable>;
});

function JournalArtwork({row,classId,profileIconId,large=false,styles:s}:{row:Entry;classId:ClassId;profileIconId?:string;large?:boolean;styles:JournalStyles}){
 const background=BASE_PROFILE_BACKGROUNDS.find(bg=>bg.id===row.id);
 if(row.kind==='profile_icon')return <ProfileIcon id={row.id} classId={classId} size={large?180:54}/>;
 if(row.kind==='background'&&background)return <View style={large?s.largeImage:s.cardImage}><RegionArtwork regionId={background.region}/></View>;
 if(row.kind==='pet'&&row.art){
  // Permanent/guild pets ship as compact runtime icons; scaling them to the
  // full 200-point event portrait stage exposes the source pixels. Keep those
  // icons within a framed, modest preview until portrait-grade art exists.
  const portraitArt=row.id.startsWith('EVT_PET_');
  if(large&&!portraitArt)return <View style={s.petPreviewFrame}><Image accessibilityLabel={row.name} source={row.art} resizeMode="contain" resizeMethod="scale" style={s.petPreviewImage}/></View>;
  return <Image accessibilityLabel={row.name} source={row.art} resizeMode="contain" style={large?s.largeImage:s.cardImage}/>;
 }
 if(row.art)return row.kind==='border'?<View style={large?s.frameLarge:s.frameSmall}><ProfileIcon id={profileIconId} classId={classId} size={large?120:38}/><ProfileFrameOverlay source={row.art}/></View>:<Image accessibilityLabel={row.name} source={row.art} resizeMode="cover" style={large?s.largeImage:s.cardImage}/>;
 return <View style={s.fallback}><Text style={s.fallbackMark}>◇</Text></View>;
}

function styles(C:ThemeColors){return StyleSheet.create({
 screen:{flex:1},root:{padding:16,paddingBottom:110,width:'100%',maxWidth:960,alignSelf:'center'},header:{gap:12,paddingBottom:12},footer:{gap:12,paddingTop:8},detail:{gap:14,paddingTop:12,paddingBottom:16},
 heading:{...typography.hero,color:C.text},title:{...typography.title,color:C.text},copy:{...typography.caption,color:C.muted,lineHeight:19},body:{...typography.body,color:C.text},eyebrow:{...typography.caption,color:C.accent,fontWeight:'800',letterSpacing:.8},meta:{fontSize:11,lineHeight:16,color:C.muted},bright:{color:C.accent},good:{color:C.good},status:{...typography.bodyStrong,color:C.muted},
 panel:{padding:16,gap:10,borderWidth:1,borderColor:C.line,borderRadius:radii.lg,backgroundColor:C.panel},between:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},flex:{flex:1,minWidth:0},count:{alignItems:'flex-end'},
 track:{height:3,borderRadius:3,backgroundColor:C.line,overflow:'hidden'},fill:{height:'100%',backgroundColor:C.accent},
 tabs:{flexDirection:'row',flexWrap:'wrap',gap:12,borderBottomWidth:1,borderColor:C.line},tab:{minHeight:44,alignItems:'center',justifyContent:'center',borderBottomWidth:2,borderColor:'transparent',paddingHorizontal:4},activeTab:{borderBottomColor:C.accent},tabText:{fontSize:12,fontWeight:'700',color:C.muted},
 equipped:{padding:12,gap:12,flexDirection:'row',alignItems:'center',borderWidth:1,borderColor:C.line,borderRadius:radii.lg,backgroundColor:C.panel},equippedArt:{width:66,height:66,borderRadius:33,overflow:'hidden',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.accent,backgroundColor:C.stage},
 filters:{flexDirection:'row',flexWrap:'wrap',gap:6},filter:{minHeight:44,paddingHorizontal:12,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'transparent',borderRadius:radii.md},
 sources:{gap:8,flexDirection:'row',flexWrap:'wrap'},sourceToggle:{minHeight:44,justifyContent:'center',paddingHorizontal:4,flexShrink:1},source:{minHeight:44,justifyContent:'center',paddingHorizontal:12,borderWidth:1,borderColor:C.line,borderRadius:radii.md},
 selected:{borderColor:C.selectionLine,backgroundColor:C.selection},gridRow:{gap:10},card:{padding:8,gap:8,flexDirection:'row',alignItems:'center',marginBottom:10,minHeight:92,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel,minWidth:0},pressed:{opacity:.75},cardStage:{width:54,height:54,alignItems:'center',justifyContent:'center',backgroundColor:C.stage,borderRadius:27,overflow:'hidden'},lockedArtwork:{opacity:.5},name:{fontSize:12,lineHeight:17,fontWeight:'700',color:C.text,marginBottom:4},cardImage:{width:'100%',height:'100%'},
 hero:{height:200,alignItems:'center',justifyContent:'center',backgroundColor:C.stage,borderRadius:radii.lg,overflow:'hidden'},largeImage:{width:'100%',height:'100%'},
 // Thumbnail-only pet art has far fewer source pixels than event portraits.
 // A centered inset avoids stretching it across the full modal hero.
 petPreviewFrame:{width:152,height:152,borderRadius:radii.lg,backgroundColor:C.panel,borderWidth:1,borderColor:C.line,alignItems:'center',justifyContent:'center'},
 petPreviewImage:{width:112,height:112},frameSmall:{width:54,height:54,alignItems:'center',justifyContent:'center'},frameLarge:{width:200,height:200,alignItems:'center',justifyContent:'center'},fallback:{alignItems:'center',justifyContent:'center'},fallbackMark:{fontSize:32,color:C.accent},
});}
