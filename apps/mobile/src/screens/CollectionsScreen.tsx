import {useMemo,useState} from 'react';
import {Image,Pressable,ScrollView,StyleSheet,Text,View,type DimensionValue,type ImageSourcePropType} from 'react-native';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {companionContent,companionUnlockRequirement} from '../i18n/companions';
import {GameButton} from '../components/GameButton';
import {GameTextInput} from '../components/GameTextInput';
import {ProfileFrameOverlay} from '../components/ProfileFrameOverlay';
import {ProfileIcon} from '../components/ProfileIcon';
import {RegionArtwork} from '../components/RegionArtwork';
import {BASE_PROFILE_BACKGROUNDS} from '../core/profile-cosmetics';
import {COLLECTIBLE_TARGET_LABELS,type CollectibleKind} from '../content/collectibles';
import {collectibleJournal,collectionBonusBreakdown,selectCollectible} from '../core/collectibles';
import {earlyFeatureUnlockProgress} from '../core/feature-unlocks';
import {profileIconCollection,selectProfileIcon} from '../core/profile-icons';
import type {GameState} from '../core/types';
import {petArtSource} from '../theme/pet-art';
import {profileBackgroundPreviewById} from '../theme/profile-background-assets';
import {profileBorderSourceById} from '../theme/profile-border-assets';
import {useGameTheme} from '../theme/ThemeContext';
import {radii,typography,type ThemeColors} from '../theme/theme';

type Category='profile_icon'|CollectibleKind;
type Entry={id:string;kind:Category;name:string;source:string;group:string;owned:boolean;selected:boolean;description?:string;bonus?:string;art?:ImageSourcePropType};
const categories:ReadonlyArray<{id:Category;label:string}>=[{id:'profile_icon',label:'Icons'},{id:'pet',label:'Pets'},{id:'background',label:'Backgrounds'},{id:'border',label:'Borders'}];
const pct=(bps:number)=>(bps/100).toFixed(2)+'%';

export function CollectionsScreen({state,onChange,initialCategory='profile_icon'}:{state:GameState;onChange:(next:GameState)=>void;initialCategory?:Category}){
 const language=useGameLanguage(),C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const text=(value:string)=>companionContent(language,value);
 const [category,setCategory]=useState<Category>(initialCategory),[filter,setFilter]=useState<'all'|'owned'|'locked'>('all'),[query,setQuery]=useState(''),[source,setSource]=useState('All sources');
 const [detailId,setDetailId]=useState<string|null>(null),[width,setWidth]=useState(360),[showBonuses,setShowBonuses]=useState(false);
 const petUnlock=earlyFeatureUnlockProgress(state,'pets'),petLocked=category==='pet'&&!petUnlock.unlocked;
 const rows:Entry[]=category==='profile_icon'?profileIconCollection(state).map(row=>({...row,kind:'profile_icon',owned:row.unlocked})):collectibleJournal(state).filter(row=>row.kind===category).map(row=>({
  ...row,group:row.collectionGroup??'Collection',bonus:text(COLLECTIBLE_TARGET_LABELS[row.target])+' · '+pct(row.ownedBps)+' '+text('passive')+' / '+pct(row.activeBps)+' '+text('active'),
  art:row.kind==='pet'?petArtSource(row.id):row.kind==='background'?profileBackgroundPreviewById.get(row.id)?.source:profileBorderSourceById.get(row.id),
 }));
 const owned=rows.filter(row=>row.owned).length,progress=rows.length?owned/rows.length:0;
 const groups=['All sources',...new Set(rows.map(row=>row.group))];
 const needle=query.trim().toLocaleLowerCase(language);
 const visible=rows.filter(row=>(filter==='all'||row.owned===(filter==='owned'))&&(source==='All sources'||row.group===source)&&(!needle||[row.name,row.group,row.source].some(value=>text(value).toLocaleLowerCase(language).includes(needle))));
 const detail=rows.find(row=>row.id===detailId);
 const columns=width<340?2:width<620?3:4,cardWidth=(width-(columns-1)*10)/columns;
 const artwork=(row:Entry,large=false)=>row.kind==='profile_icon'?<ProfileIcon id={row.id} classId={state.character?.classId??'IRONWARDEN'} size={large?220:Math.min(100,cardWidth-16)}/>:row.kind==='background'&&BASE_PROFILE_BACKGROUNDS.some(bg=>bg.id===row.id)?<View style={large?s.largeImage:s.cardImage}><RegionArtwork regionId={BASE_PROFILE_BACKGROUNDS.find(bg=>bg.id===row.id)!.region}/></View>:row.art?row.kind==='border'?<View style={large?s.frameLarge:s.frameSmall}><ProfileIcon id={state.character?.profileIconId} classId={state.character?.classId??'IRONWARDEN'} size={large?120:48}/><ProfileFrameOverlay source={row.art}/></View>:<Image accessibilityLabel={row.name} source={row.art} resizeMode={row.kind==='background'?'cover':'contain'} style={large?s.largeImage:s.cardImage}/>:<View style={s.fallback}><Text style={s.fallbackMark}>◇</Text><Text style={s.meta}>{text('Preview unavailable')}</Text></View>;
 const equip=(row:Entry)=>{if(!state.character||!row.owned||row.selected||petLocked)return;onChange(row.kind==='profile_icon'?selectProfileIcon(state,row.id):selectCollectible(state,row.kind,row.id));};
 const changeCategory=(next:Category)=>{setCategory(next);setFilter('all');setSource('All sources');setQuery('');setDetailId(null);};
 const breakdown=collectionBonusBreakdown(state);
 return <ScrollView key={detail?'detail':'gallery'} keyboardShouldPersistTaps="handled" contentContainerStyle={s.root} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
  {detail?<>
   <GameButton compact tone="secondary" title={text('‹ Back to collection')} onPress={()=>setDetailId(null)}/>
   <Text style={s.eyebrow}>{text(detail.group).toLocaleUpperCase(language)}</Text>
   <View style={s.hero}>{artwork(detail,true)}</View>
   <Text accessibilityRole="header" style={s.heading}>{text(detail.name)}</Text>
   <Text style={[s.status,detail.owned&&s.good]}>{text(detail.selected?'Equipped':detail.owned?'Owned':'Locked')}</Text>
   {detail.description?<Text style={s.copy}>{text(detail.description)}</Text>:null}
   <View style={s.panel}><Text style={s.eyebrow}>{text('UNLOCK SOURCE')}</Text><Text style={s.body}>{text(detail.source)}</Text>{petLocked?<Text style={s.copy}>{companionUnlockRequirement(language,petUnlock.requirement)}</Text>:null}</View>
   <View style={s.panel}>{detail.kind==='profile_icon'?<Text style={s.body}>{text('Cosmetic only')} · {text('No stat bonuses')}</Text>:<><Text style={s.eyebrow}>{text('COLLECTION BONUS')}</Text><Text style={s.body}>{detail.bonus}</Text><Text style={s.copy}>{text('Owned collectibles contribute passive bonuses. Equipping adds the active bonus, subject to account caps.')}</Text></>}</View>
   <GameButton title={text(detail.selected?'Currently equipped':!detail.owned||petLocked?'Locked':detail.kind==='profile_icon'?'Use profile icon':'Use collectible')} disabled={!state.character||!detail.owned||detail.selected||petLocked} onPress={()=>equip(detail)}/>
  </>:<>
   <View><Text accessibilityRole="header" style={s.heading}>{text('Collections')}</Text><Text style={s.copy}>{text('Your journey, collected.')}</Text></View>
   <View style={s.panel}><View style={s.between}><View><Text style={s.eyebrow}>{text(category==='profile_icon'?'PROFILE ICONS':categories.find(row=>row.id===category)!.label.toUpperCase())}</Text><Text style={s.copy}>{owned} / {rows.length} {text('unlocked')}</Text></View><Text style={s.title}>{Math.round(progress*1000)/10}%</Text></View><View accessibilityRole="progressbar" accessibilityLabel={text('Collection progress')} accessibilityValue={{min:0,max:rows.length,now:owned}} style={s.track}><View style={[s.fill,{width:((progress*100)+'%') as DimensionValue}]}/></View></View>
   <View accessibilityRole="tablist" style={s.tabs}>{categories.map(row=><Pressable key={row.id} accessibilityRole="tab" accessibilityLabel={text(row.label)} accessibilityState={{selected:category===row.id}} onPress={()=>changeCategory(row.id)} style={[s.tab,category===row.id&&s.selected]}><Text style={[s.tabText,category===row.id&&s.bright]}>{text(row.label)}</Text></Pressable>)}</View>
   <GameTextInput accessibilityLabel={text('Search collection')} placeholder={text('Search collection…')} value={query} onChangeText={setQuery} autoCorrect={false}/>
   <View style={s.filters}>{(['all','owned','locked'] as const).map(value=><Pressable key={value} accessibilityRole="button" accessibilityLabel={text(value==='all'?'All':value==='owned'?'Owned':'Locked')} accessibilityState={{selected:filter===value}} onPress={()=>setFilter(value)} style={[s.filter,filter===value&&s.selected]}><Text style={[s.tabText,filter===value&&s.bright]}>{text(value==='all'?'All':value==='owned'?'Owned':'Locked')}</Text></Pressable>)}</View>
   <ScrollView horizontal showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} contentContainerStyle={s.sources}>{groups.map(group=><Pressable key={group} accessibilityRole="button" accessibilityLabel={text(group)+' '+text('source')} accessibilityState={{selected:source===group}} onPress={()=>setSource(group)} style={[s.source,source===group&&s.selected]}><Text style={s.meta}>{text(group)}</Text></Pressable>)}</ScrollView>
   {petLocked?<View style={s.panel}><Text style={s.title}>{text('Pet collection locked')}</Text><Text style={s.copy}>{companionUnlockRequirement(language,petUnlock.requirement)}</Text></View>:null}
   <View style={s.between}><Text style={s.eyebrow}>{text(categories.find(row=>row.id===category)!.label)}</Text><Text style={s.meta}>{visible.length} {text('results')}</Text></View>
   <View style={s.grid} onLayout={event=>setWidth(event.nativeEvent.layout.width)}>{visible.map(row=><Pressable key={row.id} accessibilityRole="button" accessibilityLabel={text(row.name)+', '+text(row.selected?'Equipped':row.owned?'Owned':'Locked')} onPress={()=>setDetailId(row.id)} style={({pressed})=>[s.card,{width:cardWidth},row.selected&&s.selected,pressed&&s.pressed]}>
    <View style={s.cardStage}>{artwork(row)}</View><Text numberOfLines={2} style={s.name}>{text(row.name)}</Text><Text style={[s.meta,row.selected&&s.good]}>{text(row.selected?'✓ Equipped':row.owned?row.group:'Locked')}</Text>
   </Pressable>)}</View>
   {!visible.length?<View style={s.panel}><Text style={s.title}>{text('No collectibles in this view.')}</Text><Text style={s.copy}>{text('Try another search or clear your filters.')}</Text><GameButton compact tone="secondary" title={text('Clear filters')} onPress={()=>{setQuery('');setSource('All sources');setFilter('all');}}/></View>:null}
   {category!=='profile_icon'?<><GameButton tone="secondary" title={text(showBonuses?'Hide account bonuses':'View account bonuses')} onPress={()=>setShowBonuses(!showBonuses)}/>{showBonuses?<View style={s.panel}><Text style={s.eyebrow}>{text('ACTIVE BONUS SUMMARY')}</Text>{breakdown.length?breakdown.map(row=><View key={row.target} style={s.between}><View style={s.flex}><Text style={s.body}>{text(COLLECTIBLE_TARGET_LABELS[row.target])}</Text><Text style={s.copy}>{pct(row.ownedAppliedBps)} {text('passive')} · {pct(row.activeAppliedBps)} {text('active')}</Text></View><Text style={s.good}>+{pct(row.appliedBps)}</Text></View>):<Text style={s.copy}>{text('No owned collectible bonuses yet.')}</Text>}</View>:null}</>:null}
  </>}
 </ScrollView>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 root:{padding:16,gap:14,paddingBottom:110,width:'100%',maxWidth:960,alignSelf:'center'},
 heading:{...typography.hero,color:C.text},title:{...typography.title,color:C.text},copy:{...typography.caption,color:C.muted,lineHeight:19},body:{...typography.body,color:C.text},eyebrow:{...typography.caption,color:C.accent,fontWeight:'800',letterSpacing:.8},meta:{fontSize:11,lineHeight:16,color:C.muted},bright:{color:C.text},good:{color:C.good},status:{...typography.bodyStrong,color:C.muted},
 panel:{padding:16,gap:10,borderWidth:1,borderColor:C.line,borderRadius:radii.lg,backgroundColor:C.panel},between:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},flex:{flex:1},
 track:{height:5,borderRadius:3,backgroundColor:C.line,overflow:'hidden'},fill:{height:'100%',backgroundColor:C.accent,borderRadius:3},
 tabs:{flexDirection:'row',flexWrap:'wrap',gap:4,padding:4,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},tab:{flex:1,minWidth:64,minHeight:48,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'transparent',borderRadius:7,paddingHorizontal:4},tabText:{fontSize:12,fontWeight:'700',color:C.muted},
 filters:{flexDirection:'row',gap:8},filter:{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},
 sources:{gap:8},source:{minHeight:44,justifyContent:'center',paddingHorizontal:12,borderWidth:1,borderColor:C.line,borderRadius:radii.md},
 selected:{borderColor:C.selectionLine,backgroundColor:C.selection},grid:{flexDirection:'row',flexWrap:'wrap',gap:10},card:{padding:8,gap:5,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel,minWidth:0},pressed:{opacity:.75},cardStage:{height:104,alignItems:'center',justifyContent:'center',backgroundColor:C.stage,borderRadius:6,overflow:'hidden'},name:{fontSize:12,lineHeight:17,fontWeight:'700',color:C.text,minHeight:34},cardImage:{width:'100%',height:'100%'},
 hero:{height:280,alignItems:'center',justifyContent:'center',backgroundColor:C.stage,borderRadius:radii.lg,overflow:'hidden'},largeImage:{width:'100%',height:'100%'},frameSmall:{width:'90%',height:72,alignItems:'center',justifyContent:'center'},frameLarge:{width:'90%',height:220,alignItems:'center',justifyContent:'center'},fallback:{alignItems:'center',justifyContent:'center',gap:8},fallbackMark:{fontSize:32,color:C.accent},
});}
