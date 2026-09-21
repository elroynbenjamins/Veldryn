import {useMemo} from 'react';
import {Image,StyleSheet,Text,View} from 'react-native';
import type {ImageResizeMode,ImageSourcePropType} from 'react-native';
import {equipmentTheme,radii,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import type {ProfilePrestigeTone} from '../core/profile-prestige';

export interface ProfileShowcaseEntry{key:string;label:string;meta?:string;value?:string;art?:ImageSourcePropType;artMode?:ImageResizeMode;prestige?:ProfilePrestigeTone;badge?:string}

export function ProfileShowcaseSection({title,entries,emptyLabel='Nothing featured yet',subtitle='Selected by player'}:{title:string;entries:ProfileShowcaseEntry[];emptyLabel?:string;subtitle?:string}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const slots:Array<ProfileShowcaseEntry|undefined>=[entries[0],entries[1],entries[2]];
 const toneStyles=(tone:ProfilePrestigeTone|undefined)=>{
  if(tone==='prestige')return {slot:s.prestige,bar:s.barPrestige,badge:s.badgePrestige,badgeText:s.badgeTextPrestige};
  if(tone==='elite')return {slot:s.elite,bar:s.barElite,badge:s.badgeElite,badgeText:s.badgeTextElite};
  if(tone==='rare')return {slot:s.rare,bar:s.barRare,badge:s.badgeRare,badgeText:s.badgeTextRare};
  if(tone==='notable')return {slot:s.notable,bar:s.barNotable,badge:s.badgeNotable,badgeText:s.badgeTextNotable};
  if(tone==='record')return {slot:s.record,bar:s.barRecord,badge:s.badgeRecord,badgeText:s.badgeTextRecord};
  return {slot:undefined,bar:s.barStandard,badge:s.badgeStandard,badgeText:s.badgeTextStandard};
 };
 return <View style={s.block}>
  <View style={s.head}><View style={s.headCopy}><Text style={s.title}>{title}</Text><Text style={s.subtitle}>{subtitle}</Text></View><View style={s.countPill}><Text style={s.count}>{Math.min(3,entries.length)}/3</Text></View></View>
  {!entries.length
   ?<View style={s.emptySummary}><View style={s.emptyIcon}><Text style={s.emptyMark}>◇</Text></View><View style={s.emptyCopy}><Text style={s.emptyTitle}>No selections yet</Text><Text style={s.emptyText}>{emptyLabel} · choose up to 3 from Customize Profile.</Text></View></View>
   :<View style={s.grid}>{slots.map((entry,index)=>{
    if(!entry)return <View key={'empty-'+index} style={[s.slot,s.emptySlot]}><Text style={s.slotNumber}>SLOT {index+1}</Text><Text style={s.openLabel}>OPEN</Text><Text numberOfLines={2} style={s.emptyText}>{emptyLabel}</Text></View>;
    const tone=toneStyles(entry.prestige);
    return <View key={entry.key} style={[s.slot,tone.slot]}>
     <View style={[s.topBar,tone.bar]}/>
     <View style={s.slotTop}><Text style={s.slotNumber}>SLOT {index+1}</Text>{entry.badge?<View style={[s.badge,tone.badge]}><Text numberOfLines={1} style={[s.badgeText,tone.badgeText]}>{entry.badge}</Text></View>:null}</View>
     {entry.art?<View style={s.artShell}><Image source={entry.art} resizeMode={entry.artMode??'contain'} style={entry.artMode==='cover'?s.artCover:s.art}/></View>:<View style={s.symbolShell}><Text style={[s.symbol,entry.prestige==='prestige'&&s.symbolPrestige]}>◆</Text></View>}
     <Text numberOfLines={2} style={s.name}>{entry.label}</Text>
     {entry.value?<Text numberOfLines={1} style={[s.value,entry.prestige==='prestige'&&s.valuePrestige]}>{entry.value}</Text>:null}
     {entry.meta?<Text numberOfLines={2} style={s.meta}>{entry.meta}</Text>:null}
    </View>;
   })}</View>}
 </View>;
}

function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C),eliteBorder=C.dark?'#A485CF':'#6D47A6',eliteSurface=C.dark?'#211D2B':'#F2ECF8';return StyleSheet.create({
 block:{gap:7,padding:9,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},
 head:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 headCopy:{flex:1,minWidth:0},
 title:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8},
 subtitle:{fontSize:8,lineHeight:11,color:C.muted,marginTop:1},
 countPill:{minWidth:34,alignItems:'center',justifyContent:'center',paddingHorizontal:7,paddingVertical:3,borderRadius:99,borderWidth:1,borderColor:C.line,backgroundColor:C.panel},
 count:{fontSize:9,color:C.text,fontWeight:'900'},
 grid:{flexDirection:'row',gap:6},
 slot:{position:'relative',flex:1,minWidth:0,minHeight:112,padding:7,paddingTop:9,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel,justifyContent:'flex-start',gap:3,overflow:'hidden'},
 topBar:{position:'absolute',left:0,right:0,top:0,height:3},
 barStandard:{backgroundColor:C.line},barNotable:{backgroundColor:C.info},barRare:{backgroundColor:C.selectionLine},barElite:{backgroundColor:eliteBorder},barPrestige:{backgroundColor:equipmentColors.goldSoft},barRecord:{backgroundColor:C.good},
 notable:{borderColor:C.info,backgroundColor:C.infoSurface},rare:{borderColor:C.selectionLine,backgroundColor:C.selection},elite:{borderColor:eliteBorder,backgroundColor:eliteSurface},prestige:{borderColor:C.lineStrong,backgroundColor:C.warningSurface},record:{borderColor:C.good,backgroundColor:C.goodSurface},
 slotTop:{minHeight:17,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:3},
 slotNumber:{fontSize:7,color:C.disabled,fontWeight:'900',letterSpacing:.55},
 badge:{maxWidth:'76%',paddingHorizontal:4,paddingVertical:2,borderRadius:99,borderWidth:1},
 badgeStandard:{borderColor:C.line,backgroundColor:C.panel2},badgeNotable:{borderColor:C.info,backgroundColor:C.infoSurface},badgeRare:{borderColor:C.selectionLine,backgroundColor:C.selection},badgeElite:{borderColor:eliteBorder,backgroundColor:eliteSurface},badgePrestige:{borderColor:C.lineStrong,backgroundColor:C.warningSurface},badgeRecord:{borderColor:C.good,backgroundColor:C.goodSurface},
 badgeText:{fontSize:6.5,fontWeight:'900',letterSpacing:.35},badgeTextStandard:{color:C.muted},badgeTextNotable:{color:C.info},badgeTextRare:{color:C.info},badgeTextElite:{color:eliteBorder},badgeTextPrestige:{color:C.accent},badgeTextRecord:{color:C.good},
 artShell:{height:40,alignItems:'center',justifyContent:'center',marginVertical:1,borderRadius:6,overflow:'hidden'},art:{width:38,height:38},artCover:{width:'100%',height:40},
 symbolShell:{height:40,alignItems:'center',justifyContent:'center'},symbol:{fontSize:19,color:C.accent,fontWeight:'900'},symbolPrestige:{color:equipmentColors.goldSoft},
 emptySlot:{borderStyle:'dashed',opacity:.8,alignItems:'center',justifyContent:'center',gap:4},
 openLabel:{fontSize:8,color:C.disabled,fontWeight:'900',letterSpacing:.75},
 emptySummary:{minHeight:72,flexDirection:'row',alignItems:'center',gap:10,padding:10,borderWidth:1,borderStyle:'dashed',borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel},
 emptyIcon:{width:38,height:38,alignItems:'center',justifyContent:'center',borderRadius:19,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},
 emptyMark:{fontSize:18,color:C.disabled,fontWeight:'900'},
 emptyCopy:{flex:1,minWidth:0},
 emptyTitle:{...typography.bodyStrong,color:C.text},
 emptyText:{fontSize:8,lineHeight:11,color:C.muted,textAlign:'center'},
 name:{fontSize:10,lineHeight:13,color:C.text,fontWeight:'900'},
 value:{fontSize:11,lineHeight:14,color:C.good,fontWeight:'900'},valuePrestige:{color:equipmentColors.goldSoft},
 meta:{fontSize:8,lineHeight:11,color:C.muted},
});}
