import {useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {UiIcon} from '../components/UiIcon';
import type {Language} from '../i18n/languages';
import {accountText} from '../i18n/account';
import {profileText,profileSourceText} from '../i18n/profile';
import {useGameTheme} from '../theme/ThemeContext';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {GameButton} from '../components/GameButton';
import type {UnlockInboxEntry} from '../core/unlock-inbox';

const icons={title:'character',background:'world',border:'account',profile_icon:'character',pet:'companions',emote:'chat',guild_cosmetic:'guild'} as const;
const labels={title:'TITLE',background:'PROFILE BACKGROUND',border:'PROFILE BORDER',profile_icon:'PROFILE ICON',pet:'COSMETIC PET',emote:'EMOTE',guild_cosmetic:'GUILD COSMETIC'} as const;
export function NewUnlocksScreen({language,entries,onCustomize}:{language:Language;entries:readonly UnlockInboxEntry[];onBack:()=>void;onCustomize:()=>void}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [showAll,setShowAll]=useState(false),[filter,setFilter]=useState<'all'|'title'|'pet'|'other'>('all'),[expanded,setExpanded]=useState<string|null>(null);
 const filtered=entries.filter(row=>filter==='all'||(filter==='title'?row.kind==='title':filter==='pet'?row.kind==='pet':row.kind!=='title'&&row.kind!=='pet'));
 const shown=showAll?filtered:filtered.slice(0,20);
 const t=(key:string)=>accountText(language,key);

 return <ScrollView contentContainerStyle={s.root} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
   <Text accessibilityRole="header" style={s.heading}>{t('New Unlocks')}</Text>
   <Text style={s.caption}>{t('Titles, pets, emotes and profile cosmetics you earned.')}</Text>
   <View style={s.summary}>
     <View style={s.summaryIcon}><UiIcon name="rewards" size={28}/></View>
     <View style={s.flex}><Text style={s.summaryValue}>{entries.length}</Text><Text style={s.summaryText}>{t('Your cosmetic unlocks are saved automatically. No need to claim them here.')}</Text></View>
     <GameButton compact title={t('Customize Profile')} tone="secondary" onPress={onCustomize}/>
   </View>
   {entries.length?<>
     <View accessibilityRole="tablist" style={s.filters}>
       {([['all',t('All unlocks')],['title',t('Titles')],['pet',t('Pets')],['other',t('Other cosmetics')]] as const).map(([value,label])=><Pressable key={value} accessibilityRole="tab" accessibilityState={{selected:filter===value}} style={[s.filter,filter===value&&s.filterSelected]} onPress={()=>{setFilter(value);setShowAll(false);setExpanded(null)}}><Text style={[s.filterText,filter===value&&s.filterTextSelected]}>{label}</Text></Pressable>)}
     </View>
     <Text style={s.section}>{t('Recently unlocked')} · {filtered.length}</Text>
     <View style={s.list}>{shown.map(row=><Pressable key={row.key} accessibilityRole="button" accessibilityState={{expanded:expanded===row.key}} onPress={()=>setExpanded(current=>current===row.key?null:row.key)} style={({pressed})=>[s.entry,pressed&&s.pressed]}>
       <View style={s.mark}><UiIcon name={icons[row.kind]} size={27}/></View>
       <View style={s.flex}><Text style={s.kind}>{row.kind==='pet'||row.kind==='emote'||row.kind==='guild_cosmetic'?t(labels[row.kind]):profileText(language,labels[row.kind])}</Text>
         <Text style={s.name} numberOfLines={expanded===row.key?undefined:2}>{row.name}</Text>
         {row.detail&&expanded===row.key?<Text style={s.detail}>{profileSourceText(language,row.detail)}</Text>:null}
       </View><View style={s.end}><Text style={s.date}>{new Date(row.unlockedAtMs).toLocaleDateString(language)}</Text><Text style={s.chevron}>{expanded===row.key?'⌃':'⌄'}</Text></View>
     </Pressable>)}</View>
     {!filtered.length?<View style={s.empty}><Text style={s.emptyTitle}>{t('No unlocks in this category')}</Text></View>:null}
     {filtered.length>20?<GameButton compact title={showAll?t('Show fewer unlocks'):t('Show older unlocks')} tone="secondary" onPress={()=>setShowAll(value=>!value)}/>:null}
   </>:<View style={s.empty}><UiIcon name="rewards" size={40}/><Text style={s.emptyTitle}>{t('No new unlocks yet')}</Text><Text style={s.caption}>{t('New cosmetic rewards will appear here automatically as you earn them.')}</Text></View>}
 </ScrollView>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{padding:spacing.md,paddingBottom:110,gap:spacing.md,maxWidth:680,width:'100%',alignSelf:'center'},
 flex:{flex:1,minWidth:0},heading:{...typography.hero,color:C.text},caption:{...typography.caption,color:C.muted,lineHeight:18},
 summary:{padding:12,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel,flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:10},
 summaryIcon:{width:44,height:44,borderRadius:10,backgroundColor:C.accentSurface,alignItems:'center',justifyContent:'center'},summaryValue:{fontSize:22,fontWeight:'900',color:C.text},summaryText:{...typography.caption,color:C.muted,lineHeight:16},
 section:{...typography.bodyStrong,color:C.text},filters:{flexDirection:'row',flexWrap:'wrap',gap:6},filter:{minHeight:44,paddingHorizontal:12,justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.panel},filterSelected:{borderColor:C.accent,backgroundColor:C.accentSurface},filterText:{fontSize:12,fontWeight:'800',color:C.muted},filterTextSelected:{color:C.text},
 list:{gap:7},entry:{flexDirection:'row',alignItems:'center',gap:9,padding:10,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel,minHeight:68},
 mark:{width:42,height:42,alignItems:'center',justifyContent:'center',backgroundColor:C.panel2,borderRadius:10},kind:{fontSize:10,color:C.accent,fontWeight:'900',letterSpacing:.3},name:{...typography.bodyStrong,color:C.text,marginTop:2},detail:{...typography.caption,color:C.muted,lineHeight:17,marginTop:5},end:{alignItems:'flex-end',gap:5},date:{fontSize:10,color:C.muted},chevron:{fontSize:15,color:C.accent},
 empty:{gap:10,padding:20,alignItems:'center',borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel2},emptyTitle:{...typography.title,color:C.text,textAlign:'center'},pressed:{opacity:.75}
});}