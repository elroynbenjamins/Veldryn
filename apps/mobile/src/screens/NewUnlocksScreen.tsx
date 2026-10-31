import {useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {Language} from '../i18n/languages';
import {accountText} from '../i18n/account';
import {profileText,profileSourceText} from '../i18n/profile';
import {useGameTheme} from '../theme/ThemeContext';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {GameButton} from '../components/GameButton';
import type {UnlockInboxEntry} from '../core/unlock-inbox';

const labels={title:'TITLE',background:'PROFILE BACKGROUND',border:'PROFILE BORDER',profile_icon:'PROFILE ICON',pet:'COSMETIC PET',emote:'EMOTE',guild_cosmetic:'GUILD COSMETIC'} as const;
export function NewUnlocksScreen({language,entries,onCustomize}:{language:Language;entries:readonly UnlockInboxEntry[];onBack:()=>void;onCustomize:()=>void}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [showAll,setShowAll]=useState(false);
 const shown=showAll?entries:entries.slice(0,20);
 const t=(key:string)=>accountText(language,key);
 return <ScrollView contentContainerStyle={s.root} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
   <View style={s.header}><View style={s.flex}><Text accessibilityRole="header" style={s.heading}>{t('New Unlocks')}</Text><Text style={s.caption}>{t('Titles, pets, emotes and profile cosmetics you earned.')}</Text></View></View>
   {entries.length?<>
     <View style={s.summary}><Text style={s.summaryText}>{t('Your cosmetic unlocks are saved automatically. No need to claim them here.')}</Text><GameButton compact title={t('Customize Profile')} onPress={onCustomize}/></View>
     <Text style={s.section}>{t('Recently unlocked')} · {entries.length}</Text>
     <View style={s.list}>{shown.map(row=><View key={row.key} style={s.entry}>
       <View style={s.mark}><Text style={s.markText}>✦</Text></View>
       <View style={s.flex}><Text style={s.kind}>{row.kind==='pet'||row.kind==='emote'||row.kind==='guild_cosmetic'?t(labels[row.kind]):profileText(language,labels[row.kind])}</Text>
         <Text style={s.name}>{row.name}</Text>
         {row.detail?<Text numberOfLines={2} style={s.detail}>{profileSourceText(language,row.detail)}</Text>:null}
       </View><Text style={s.date}>{new Date(row.unlockedAtMs).toLocaleDateString(language)}</Text>
     </View>)}</View>
     {!showAll&&entries.length>20?<GameButton title={t('Show older unlocks')} tone="secondary" onPress={()=>setShowAll(true)}/>:null}
   </>:<View style={s.empty}><Text style={s.emptyTitle}>{t('No new unlocks yet')}</Text><Text style={s.caption}>{t('New cosmetic rewards will appear here automatically as you earn them.')}</Text><GameButton compact title={t('Customize Profile')} tone="secondary" onPress={onCustomize}/></View>}
 </ScrollView>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{padding:spacing.md,paddingBottom:spacing.xl,gap:spacing.md,maxWidth:850,width:'100%',alignSelf:'center'},
 header:{flexDirection:'row',alignItems:'center',gap:10},flex:{flex:1,minWidth:0},
 heading:{...typography.hero,color:C.text},caption:{...typography.body,color:C.muted},
 summary:{gap:10,padding:spacing.md,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel2},
 summaryText:{...typography.body,color:C.muted},section:{...typography.bodyStrong,color:C.text},
 list:{gap:7},entry:{flexDirection:'row',alignItems:'center',gap:10,padding:12,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel},
 mark:{width:34,height:34,alignItems:'center',justifyContent:'center',backgroundColor:C.selection,borderRadius:10},
 markText:{color:C.accent,fontSize:18},kind:{...typography.caption,color:C.accent,fontWeight:'800'},
 name:{...typography.bodyStrong,color:C.text},detail:{...typography.caption,color:C.muted},date:{fontSize:10,color:C.muted,alignSelf:'flex-start'},
 empty:{gap:12,padding:24,alignItems:'center',borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel2},
 emptyTitle:{...typography.title,color:C.text,textAlign:'center'},
 });}
