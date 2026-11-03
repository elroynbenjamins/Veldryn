import AsyncStorage from '@react-native-async-storage/async-storage';
import {useEffect,useState} from 'react';
import {Modal,Pressable,StyleSheet,Text,View} from 'react-native';
import {createSectionGuideStore} from '../core/section-guidance';
import {useGameTheme} from '../theme/ThemeContext';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {accountText} from '../i18n/account';
import {spacing,typography} from '../theme/theme';

const store=createSectionGuideStore(AsyncStorage);
type GuideText={title:string;body:string;detail?:string};
type Props={scope:string;area:string;section:string;guide:GuideText;translate?:(value:string)=>string;showReplay?:boolean;placement?:'card'|'header'};
/** One unobtrusive tip on first entry to each tab. Tabs and actions remain usable. */
export function SectionGuide({scope,area,section,guide,translate,showReplay=true,placement='card'}:Props){
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
 if(placement==='header'){
  const visible=open?.identity===identity&&open?.section===section;
  return <>
   <Pressable
    accessibilityRole="button"
    accessibilityLabel={t('Show guide for this tab')}
    accessibilityHint={t('Open help for the current Guild section')}
    accessibilityState={{expanded:visible}}
    hitSlop={4}
    onPress={()=>{setOpen({identity,section});setMore(false)}}
    style={({pressed})=>[styles.headerTrigger,{borderColor:seen?C.line:C.selectionLine,backgroundColor:C.panel},pressed&&styles.pressed]}>
    <Text style={[styles.headerQuestion,{color:C.muted}]}>?</Text>
    {!seen?<View accessible={false} style={[styles.newDot,{backgroundColor:C.accent}]}/>:null}
   </Pressable>
   <Modal transparent visible={visible} statusBarTranslucent animationType="fade" onRequestClose={close}>
    <View style={styles.shade}>
     <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={close}/>
     <View accessibilityViewIsModal style={[styles.dialog,{backgroundColor:C.panel,borderColor:C.selectionLine}]}>
      <View style={styles.dialogHeading}>
       <View style={styles.copy}>
        <Text style={[styles.dialogEyebrow,{color:C.accent}]}>{t('SECTION GUIDE')}</Text>
        <Text accessibilityRole="header" style={[styles.dialogTitle,{color:C.text}]}>{t(guide.title)}</Text>
       </View>
       <Pressable accessibilityRole="button" accessibilityLabel={t('Close guide')} onPress={close} style={[styles.closeButton,{borderColor:C.line}]}>
        <Text style={[styles.closeText,{color:C.muted}]}>×</Text>
       </Pressable>
      </View>
      <Text style={[styles.dialogBody,{color:C.muted}]}>{t(guide.body)}</Text>
      {guide.detail?<Pressable accessibilityRole="button" accessibilityState={{expanded:more}} onPress={()=>setMore(value=>!value)} style={styles.detailButton}>
       <Text style={[styles.detailToggle,{color:C.accent}]}>{t(more?'Less detail':'More detail')} {more?'−':'+'}</Text>
      </Pressable>:null}
      {more&&guide.detail?<Text style={[styles.dialogDetail,{color:C.info}]}>{t(guide.detail)}</Text>:null}
      <Pressable accessibilityRole="button" accessibilityLabel={t('Got it')} onPress={close} style={({pressed})=>[styles.confirmButton,{backgroundColor:C.selection,borderColor:C.selectionLine},pressed&&styles.pressed]}>
       <Text style={[styles.confirmText,{color:C.text}]}>{t('Got it')} ✓</Text>
      </Pressable>
     </View>
    </View>
   </Modal>
  </>;
 }
 if(!expanded&&!showReplay)return null;
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
 headerTrigger:{width:42,height:42,flexShrink:0,justifyContent:'center',alignItems:'center',borderWidth:1,borderRadius:11},
 headerQuestion:{fontSize:18,fontWeight:'800'},
 newDot:{position:'absolute',top:5,right:5,width:6,height:6,borderRadius:3},
 pressed:{opacity:.78},
 shade:{flex:1,justifyContent:'center',padding:22,backgroundColor:'rgba(0,0,0,0.76)'},
 dialog:{width:'100%',maxWidth:430,maxHeight:'87%',alignSelf:'center',borderWidth:1,borderRadius:16,padding:18,gap:12},
 dialogHeading:{flexDirection:'row',alignItems:'flex-start',gap:12},
 dialogEyebrow:{fontSize:10,fontWeight:'900',letterSpacing:1,marginBottom:5},
 dialogTitle:{fontSize:19,lineHeight:25,fontWeight:'900'},
 dialogBody:{fontSize:14,lineHeight:21},
 closeButton:{width:36,height:36,justifyContent:'center',alignItems:'center',borderRadius:9,borderWidth:1},
 closeText:{fontSize:24,lineHeight:27,fontWeight:'500'},
 detailButton:{minHeight:38,alignSelf:'flex-start',justifyContent:'center',paddingRight:15},
 detailToggle:{fontSize:13,fontWeight:'800'},
 dialogDetail:{fontSize:13,lineHeight:19},
 confirmButton:{marginTop:5,minHeight:46,alignItems:'center',justifyContent:'center',borderRadius:10,borderWidth:1},
 confirmText:{fontSize:14,fontWeight:'900'},
});
