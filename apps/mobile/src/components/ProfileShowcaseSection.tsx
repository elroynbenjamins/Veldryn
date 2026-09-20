import {Image,StyleSheet,Text,View} from 'react-native';
import type {ImageResizeMode,ImageSourcePropType} from 'react-native';
import {C,equipmentColors,radii,typography} from '../theme/theme';
import type {ProfilePrestigeTone} from '../core/profile-prestige';

export interface ProfileShowcaseEntry{key:string;label:string;meta?:string;value?:string;art?:ImageSourcePropType;artMode?:ImageResizeMode;prestige?:ProfilePrestigeTone;badge?:string}

function toneStyles(tone:ProfilePrestigeTone|undefined){
 if(tone==='prestige')return {slot:s.prestige,bar:s.barPrestige,badge:s.badgePrestige,badgeText:s.badgeTextPrestige};
 if(tone==='elite')return {slot:s.elite,bar:s.barElite,badge:s.badgeElite,badgeText:s.badgeTextElite};
 if(tone==='rare')return {slot:s.rare,bar:s.barRare,badge:s.badgeRare,badgeText:s.badgeTextRare};
 if(tone==='notable')return {slot:s.notable,bar:s.barNotable,badge:s.badgeNotable,badgeText:s.badgeTextNotable};
 if(tone==='record')return {slot:s.record,bar:s.barRecord,badge:s.badgeRecord,badgeText:s.badgeTextRecord};
 return {slot:undefined,bar:s.barStandard,badge:s.badgeStandard,badgeText:s.badgeTextStandard};
}

export function ProfileShowcaseSection({title,entries,emptyLabel='Empty showcase slot',subtitle='Selected by player'}:{title:string;entries:ProfileShowcaseEntry[];emptyLabel?:string;subtitle?:string}){
 const slots:Array<ProfileShowcaseEntry|undefined>=[entries[0],entries[1],entries[2]];
 return <View style={s.block}>
  <View style={s.head}><View style={s.headCopy}><Text style={s.title}>{title}</Text><Text style={s.subtitle}>{subtitle}</Text></View><View style={s.countPill}><Text style={s.count}>{Math.min(3,entries.length)}/3</Text></View></View>
  <View style={s.grid}>{slots.map((entry,index)=>{
   if(!entry)return <View key={'empty-'+index} style={[s.slot,s.empty]}><Text style={s.slotNumber}>SLOT {index+1}</Text><Text style={s.emptyMark}>◇</Text><Text style={s.emptyText}>{emptyLabel}</Text></View>;
   const tone=toneStyles(entry.prestige);
   return <View key={entry.key} style={[s.slot,tone.slot]}>
    <View style={[s.topBar,tone.bar]}/>
    <View style={s.slotTop}><Text style={s.slotNumber}>SLOT {index+1}</Text>{entry.badge?<View style={[s.badge,tone.badge]}><Text numberOfLines={1} style={[s.badgeText,tone.badgeText]}>{entry.badge}</Text></View>:null}</View>
    {entry.art?<View style={s.artShell}><Image source={entry.art} resizeMode={entry.artMode??'contain'} style={entry.artMode==='cover'?s.artCover:s.art}/></View>:<View style={s.symbolShell}><Text style={[s.symbol,entry.prestige==='prestige'&&s.symbolPrestige]}>◆</Text></View>}
    <Text numberOfLines={2} style={s.name}>{entry.label}</Text>
    {entry.value?<Text numberOfLines={1} style={[s.value,entry.prestige==='prestige'&&s.valuePrestige]}>{entry.value}</Text>:null}
    {entry.meta?<Text numberOfLines={2} style={s.meta}>{entry.meta}</Text>:null}
   </View>;
  })}</View>
 </View>;
}

const s=StyleSheet.create({
 block:{gap:8,padding:10,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},
 head:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 headCopy:{flex:1,minWidth:0},
 title:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8},
 subtitle:{fontSize:8,lineHeight:11,color:C.muted,marginTop:1},
 countPill:{minWidth:34,alignItems:'center',justifyContent:'center',paddingHorizontal:7,paddingVertical:4,borderRadius:99,borderWidth:1,borderColor:C.line,backgroundColor:C.panel},
 count:{fontSize:9,color:C.text,fontWeight:'900'},
 grid:{flexDirection:'row',gap:6},
 slot:{position:'relative',flex:1,minWidth:0,minHeight:126,padding:8,paddingTop:10,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel,justifyContent:'flex-start',gap:3,overflow:'hidden'},
 topBar:{position:'absolute',left:0,right:0,top:0,height:3},
 barStandard:{backgroundColor:C.line},barNotable:{backgroundColor:C.info},barRare:{backgroundColor:'#75a7e8'},barElite:{backgroundColor:'#aa86dc'},barPrestige:{backgroundColor:equipmentColors.goldSoft},barRecord:{backgroundColor:C.good},
 notable:{borderColor:'#4c6f87'},rare:{borderColor:'#5678a4',backgroundColor:'#142236'},elite:{borderColor:'#765f9a',backgroundColor:'#201c2b'},prestige:{borderColor:equipmentColors.lineStrong,backgroundColor:'#2a2418'},record:{borderColor:'#4e8064',backgroundColor:'#15271f'},
 slotTop:{minHeight:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:3},
 slotNumber:{fontSize:7,color:C.disabled,fontWeight:'900',letterSpacing:.55},
 badge:{maxWidth:'76%',paddingHorizontal:4,paddingVertical:2,borderRadius:99,borderWidth:1},
 badgeStandard:{borderColor:C.line,backgroundColor:C.panel2},badgeNotable:{borderColor:C.info,backgroundColor:'#142737'},badgeRare:{borderColor:'#75a7e8',backgroundColor:'#162941'},badgeElite:{borderColor:'#aa86dc',backgroundColor:'#2a2238'},badgePrestige:{borderColor:equipmentColors.goldSoft,backgroundColor:'#352b16'},badgeRecord:{borderColor:C.good,backgroundColor:'#173025'},
 badgeText:{fontSize:6.5,fontWeight:'900',letterSpacing:.35},badgeTextStandard:{color:C.muted},badgeTextNotable:{color:C.info},badgeTextRare:{color:'#a7c9f6'},badgeTextElite:{color:'#d0b6f3'},badgeTextPrestige:{color:equipmentColors.goldSoft},badgeTextRecord:{color:C.good},
 artShell:{height:44,alignItems:'center',justifyContent:'center',marginVertical:1,borderRadius:6,overflow:'hidden'},art:{width:42,height:42},artCover:{width:'100%',height:44},
 symbolShell:{height:44,alignItems:'center',justifyContent:'center'},symbol:{fontSize:20,color:C.accent,fontWeight:'900'},symbolPrestige:{color:equipmentColors.goldSoft},
 empty:{borderStyle:'dashed',opacity:.66,alignItems:'center',justifyContent:'center'},
 emptyMark:{fontSize:20,color:C.disabled,fontWeight:'900',marginTop:8},
 emptyText:{fontSize:8,lineHeight:11,color:C.muted,textAlign:'center'},
 name:{fontSize:10,lineHeight:13,color:C.text,fontWeight:'900'},
 value:{fontSize:11,lineHeight:14,color:C.good,fontWeight:'900'},valuePrestige:{color:equipmentColors.goldSoft},
 meta:{fontSize:8,lineHeight:11,color:C.muted},
});
