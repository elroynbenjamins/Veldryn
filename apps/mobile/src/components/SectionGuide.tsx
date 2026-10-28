import AsyncStorage from '@react-native-async-storage/async-storage';
import {useEffect,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {createSectionGuideStore} from '../core/section-guidance';
import {useGameTheme} from '../theme/ThemeContext';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {accountText} from '../i18n/account';
import {spacing,typography} from '../theme/theme';

const store=createSectionGuideStore(AsyncStorage);
type GuideText={title:string;body:string;detail?:string};
type Props={scope:string;area:string;section:string;guide:GuideText;translate?:(value:string)=>string};
/** One unobtrusive tip on first entry to each tab. Tabs and actions remain usable. */
export function SectionGuide({scope,area,section,guide,translate}:Props){
 const C=useGameTheme(),language=useGameLanguage();
 const t=(value:string)=>{const mapped=translate?.(value)??value;return mapped===value?accountText(language,value):mapped;};
 const identity=area+':'+scope;
 const [saved,setSaved]=useState<{identity:string;seen:string[]}|null>(null);
 const [open,setOpen]=useState<{identity:string;section:string}|null>(null);
 const [more,setMore]=useState(false);
 useEffect(()=>{
  let active=true;
  setSaved(null);
  setOpen(null);
  void store.load(scope,area).then(seen=>{if(active)setSaved({identity,seen})});
  return()=>{active=false;};
 },[scope,area,identity]);
 useEffect(()=>{setOpen(null);setMore(false)},[section]);
 if(!scope||!section||saved?.identity!==identity)return null;
 const seen=saved.seen.includes(section);
 const expanded=!seen||open?.identity===identity&&open?.section===section;
 const close=()=>{
  setOpen(null);setMore(false);
  if(!seen){
   setSaved(prev=>prev?.identity===identity?{...prev,seen:[...new Set([...prev.seen,section])]}:prev);
   void store.complete(scope,area,section);
  }
 };
 if(!expanded)return <View style={styles.reopenRow}>
  <Pressable accessibilityRole="button" accessibilityLabel={t('Show guide for this tab')} onPress={()=>{setOpen({identity,section});setMore(false)}} style={[styles.reopen,{borderColor:C.line,backgroundColor:C.panel}]}>
   <Text style={[styles.question,{color:C.muted}]}>?</Text>
  </Pressable>
 </View>;
 return <View style={[styles.card,{borderColor:C.selectionLine,backgroundColor:C.panel}]}>
  <View style={styles.top}>
   <View style={styles.copy}><Text accessibilityRole="header" style={[styles.title,{color:C.text}]}>{t(guide.title)}</Text></View>
   <Pressable accessibilityRole="button" accessibilityLabel={t('Got it')} onPress={close} style={[styles.done,{backgroundColor:C.selection}]}>
    <Text style={[styles.action,{color:C.accent}]}>{t('Got it')} ✓</Text>
   </Pressable>
  </View>
  <Text style={[styles.body,{color:C.muted}]}>{t(guide.body)}</Text>
  {guide.detail?<Pressable accessibilityRole="button" accessibilityState={{expanded:more}} onPress={()=>setMore(v=>!v)} style={styles.more}>
   <Text style={[styles.extraLink,{color:C.accent}]}>{t(more?'Less detail':'More detail')} {more?'−':'+'}</Text>
  </Pressable>:null}
  {more&&guide.detail?<Text style={[styles.detail,{color:C.info}]}>{t(guide.detail)}</Text>:null}
 </View>;
}
const styles=StyleSheet.create({
 card:{gap:6,padding:spacing.sm,borderWidth:1,borderRadius:10},
 top:{flexDirection:'row',alignItems:'center',gap:8},
 copy:{flex:1,minWidth:0},
 title:{...typography.bodyStrong,fontWeight:'800'},
 body:{...typography.caption,lineHeight:18},
 done:{minHeight:36,paddingHorizontal:10,borderRadius:8,alignItems:'center',justifyContent:'center'},
 action:{fontSize:12,fontWeight:'800'},
 more:{alignSelf:'flex-start',minHeight:32,justifyContent:'center',paddingRight:12},
 extraLink:{fontSize:11,fontWeight:'800'},
 detail:{...typography.caption,lineHeight:18},
 reopenRow:{flexDirection:'row',justifyContent:'flex-end'},
 reopen:{minWidth:36,minHeight:36,justifyContent:'center',alignItems:'center',borderWidth:1,borderRadius:8},
 question:{fontSize:17,fontWeight:'800'},
});
