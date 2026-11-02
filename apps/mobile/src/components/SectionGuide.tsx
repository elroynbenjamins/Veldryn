import AsyncStorage from '@react-native-async-storage/async-storage';
import {useEffect,useState,type ReactNode} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {createSectionGuideStore} from '../core/section-guidance';
import {useGameTheme} from '../theme/ThemeContext';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {accountText} from '../i18n/account';
import {spacing,typography} from '../theme/theme';

const store=createSectionGuideStore(AsyncStorage);
type GuideText={title:string;body:string;detail?:string};
type Props={scope:string;area:string;section:string;guide:GuideText;translate?:(value:string)=>string;showReplay?:boolean;header?:ReactNode};
/** One unobtrusive tip on first entry to each tab. Tabs and actions remain usable. */
export function SectionGuide({scope,area,section,guide,translate,showReplay=true,header}:Props){
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
 // Existing headers must remain visible while guide completion loads.
 if(!scope||!section||saved?.identity!==identity)return header??null;
 const seen=saved.seen.includes(section);
 const expanded=!seen||open?.identity===identity&&open?.section===section;
 const close=()=>{
  setOpen(null);setMore(false);
  if(!seen){
   setSaved(prev=>prev?.identity===identity?{...prev,seen:[...new Set([...prev.seen,section])]}:prev);
   void store.complete(scope,area,section);
  }
 };
 // Completed guides must never add a dedicated replay row. A replay control
 // is only shown as part of a caller-supplied, existing screen/section header.
 // Screens without a suitable header keep their guide available in Account.
 const replay=seen&&showReplay&&!(open?.identity===identity&&open?.section===section);
 const trigger=replay&&header?<Pressable accessibilityRole="button" accessibilityLabel={t('Show guide for this tab')}
   accessibilityHint={t(guide.title)} onPress={()=>{setOpen({identity,section});setMore(false)}}
   hitSlop={4} style={[styles.reopen,{borderColor:C.line,backgroundColor:C.panel}]}>
    <Text style={[styles.question,{color:C.muted}]}>?</Text>
   </Pressable>:null;
 const headerRow=header?<View style={styles.headerRow}><View style={styles.headerContent}>{header}</View>{trigger}</View>:null;
 if(!expanded)return headerRow;
 return <>{headerRow}<View style={[styles.card,{borderColor:C.selectionLine,backgroundColor:C.panel}]}>
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
 </View></>;
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
 headerRow:{flexDirection:'row',alignItems:'center',gap:6},
 headerContent:{flex:1,minWidth:0},
 reopen:{width:36,height:36,flexShrink:0,justifyContent:'center',alignItems:'center',borderWidth:1,borderRadius:8},
 question:{fontSize:17,fontWeight:'800'},
});
