import {useEffect,useState} from 'react';
import {Modal,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {localizedGuildDetailedGuide} from '../i18n/guild-detailed-guide-locales';
import {guildGuideLibraryText,guildGuideSectionTitle,type GuildGuideLibraryLabel} from '../i18n/guild-guide-library';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {useGameTheme} from '../theme/ThemeContext';
import {ThemedIcon} from './ThemedNavigationIcon';

type GuildRole='member'|'officer'|'leader'|null;
const GROUPS:readonly {id:GuildGuideLibraryLabel;sections:readonly string[];leadership?:boolean}[]=[
 {id:'Getting started',sections:['Home']},
 {id:'Activities',sections:['Activities/Muster','Activities/Quests','PvE']},
 {id:'Progress',sections:['Progress/Projects','Progress/Skills']},
 {id:'Hall',sections:['Hall/Bank','Hall/Construction','Hall/Shop']},
 {id:'Community',sections:['Roster','Chat']},
 {id:'Leadership',sections:['Manage','Appearance'],leadership:true},
];

export function GuildGuideLibrary({visible,onClose,role}:{visible:boolean;onClose:()=>void;role:GuildRole}){
 const C=useGameTheme(),language=useGameLanguage(),t=(label:GuildGuideLibraryLabel)=>guildGuideLibraryText(language,label);
 const [section,setSection]=useState<string|null>(null),[topicIndex,setTopicIndex]=useState(0);
 const leadership=role==='leader'||role==='officer';
 useEffect(()=>{if(!visible){setSection(null);setTopicIndex(0)}},[visible]);
 useEffect(()=>{if(!leadership&&(section==='Manage'||section==='Appearance')){setSection(null);setTopicIndex(0)}},[leadership,section]);
 if(!visible)return null;
 const guide=section?localizedGuildDetailedGuide(language,section):undefined;
 const topic=guide?.topics[Math.min(topicIndex,guide.topics.length-1)];
 const choose=(id:string)=>{setSection(id);setTopicIndex(0)};
 const back=()=>{setSection(null);setTopicIndex(0)};
 return <Modal visible={visible} animationType="fade" transparent statusBarTranslucent onRequestClose={onClose}>
  <View style={s.shade}>
   <Pressable accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" onPress={onClose} style={StyleSheet.absoluteFill}/>
   <View accessibilityViewIsModal onAccessibilityEscape={onClose} style={[s.modal,{backgroundColor:C.panel,borderColor:C.selectionLine}]}>
    <View style={s.header}>
     <View style={[s.icon,{backgroundColor:C.selection,borderColor:C.selectionLine}]}><ThemedIcon name="guild" size={23}/></View>
     <View style={s.flex}>
      <Text style={[s.eyebrow,{color:C.accent}]}>{t('Guild Guide').toUpperCase()}</Text>
      <Text accessibilityRole="header" style={[s.title,{color:C.text}]}>{guide&&section?guildGuideSectionTitle(language,section,guide.title):t('Browse guides')}</Text>
     </View>
     <Pressable accessibilityRole="button" accessibilityLabel={t('Close Guild Guide')} onPress={onClose} style={[s.close,{borderColor:C.line}]}><Text style={[s.closeText,{color:C.text}]}>×</Text></Pressable>
    </View>
    {!guide?<ScrollView style={s.libraryScroll} contentContainerStyle={s.body} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
     <Text style={[s.intro,{color:C.muted}]}>{t('Choose a Guild topic to learn more.')}</Text>
     {GROUPS.filter(group=>!group.leadership||leadership).map(group=><View key={group.id} style={s.group}>
      <Text style={[s.groupTitle,{color:C.accent}]}>{t(group.id)}</Text>
      <View style={s.tiles}>{group.sections.map(id=>{
       const item=localizedGuildDetailedGuide(language,id);
       if(!item)return null;
       return <Pressable key={id} accessibilityRole="button" accessibilityLabel={guildGuideSectionTitle(language,id,item.title)} onPress={()=>choose(id)}
        style={({pressed})=>[s.tile,{backgroundColor:C.panel2,borderColor:C.line},pressed&&s.pressed]}>
        <Text style={[s.tileTitle,{color:C.text}]}>{guildGuideSectionTitle(language,id,item.title)}</Text>
        <Text numberOfLines={2} style={[s.tileDescription,{color:C.muted}]}>{item.body}</Text>
       </Pressable>;
      })}</View>
     </View>)}
    </ScrollView>:<View style={s.detail}>
     <Pressable accessibilityRole="button" accessibilityLabel={t('All guides')} onPress={back} style={s.back}><Text style={[s.backText,{color:C.accent}]}>‹ {t('All guides')}</Text></Pressable>
     <Text style={[s.intro,{color:C.muted}]}>{guide.body}</Text>
     <ScrollView horizontal showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} accessibilityRole="tablist" contentContainerStyle={s.topicRow}>
      {guide.topics.map((item,index)=><Pressable key={item.id} accessibilityRole="tab" accessibilityState={{selected:topicIndex===index}} onPress={()=>setTopicIndex(index)}
       style={[s.topicButton,{backgroundColor:topicIndex===index?C.selection:C.panel2,borderColor:topicIndex===index?C.selectionLine:C.line}]}>
       <Text style={[s.topicLabel,{color:topicIndex===index?C.text:C.muted}]}>{item.title}</Text>
      </Pressable>)}
     </ScrollView>
     <ScrollView style={s.topicScroll} contentContainerStyle={s.topicBody} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
      {topic?<><Text accessibilityRole="header" style={[s.topicHeading,{color:C.text}]}>{topic.title}</Text><Text style={[s.topicText,{color:C.muted}]}>{topic.body}</Text></>:null}
     </ScrollView>
    </View>}
   </View>
  </View>
 </Modal>;
}
const s=StyleSheet.create({
 shade:{flex:1,justifyContent:'center',paddingHorizontal:14,paddingVertical:25,backgroundColor:'rgba(0,0,0,0.78)'},
 modal:{maxHeight:'92%',minHeight:0,width:'100%',maxWidth:480,alignSelf:'center',gap:10,padding:13,borderWidth:1,borderRadius:16,overflow:'hidden'},
 libraryScroll:{flexShrink:1,minHeight:0},
 header:{flexDirection:'row',alignItems:'center',gap:9},flex:{flex:1,minWidth:0},icon:{width:42,height:42,borderWidth:1,borderRadius:10,alignItems:'center',justifyContent:'center'},
 eyebrow:{fontSize:10,fontWeight:'900',letterSpacing:.7},title:{fontSize:18,lineHeight:24,fontWeight:'800'},
 close:{width:44,height:44,borderWidth:1,borderRadius:10,alignItems:'center',justifyContent:'center'},closeText:{fontSize:22,lineHeight:27},
 body:{gap:13,paddingBottom:12},intro:{fontSize:12.5,lineHeight:19},group:{gap:7},groupTitle:{fontSize:11,fontWeight:'900',letterSpacing:.6},
 tiles:{flexDirection:'row',flexWrap:'wrap',gap:7},tile:{width:'48%',minWidth:130,flexGrow:1,gap:4,padding:10,minHeight:83,borderWidth:1,borderRadius:10,justifyContent:'center'},
 tileTitle:{fontSize:13,fontWeight:'800'},tileDescription:{fontSize:11,lineHeight:16},pressed:{opacity:.8},
 detail:{minHeight:190,maxHeight:'80%',flexShrink:1,gap:10},back:{minHeight:44,alignSelf:'flex-start',justifyContent:'center'},backText:{fontSize:12,fontWeight:'800'},
 topicRow:{gap:6,paddingVertical:2},topicButton:{minHeight:44,maxWidth:190,paddingHorizontal:10,paddingVertical:7,justifyContent:'center',borderWidth:1,borderRadius:9},
 topicLabel:{fontSize:12,fontWeight:'800'},topicScroll:{flexShrink:1,minHeight:0},topicBody:{gap:8,paddingBottom:8},topicHeading:{fontSize:15,lineHeight:21,fontWeight:'800'},topicText:{fontSize:13,lineHeight:21},
});
