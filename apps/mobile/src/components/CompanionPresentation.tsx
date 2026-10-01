import {useMemo,useState,type PropsWithChildren} from 'react';
import {Image,Pressable,StyleSheet,Text,View} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';
import {type ThemeColors} from '../theme/theme';
import {companionArtSource} from '../theme/companion-art';
import {COMBAT_COMPANIONS} from '../content/combat-companions';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {companionLabel,companionTranslator} from '../i18n/companions';
import {UiIcon} from './UiIcon';
import type {UiIconName} from '../theme/ui-icons';

export function companionRarityBorder(rarity:string,dark:boolean){return ({standard:dark?'#75847c':'#68796e',rare:dark?'#72b9f3':'#2875ac',elite:dark?'#c89bea':'#8653b1',prestige:dark?'#e7bc68':'#94701f'} as Record<string,string>)[rarity]??(dark?'#75847c':'#68796e');}

/** Shared phone presentation; progression and commands stay with the owning panel. */
export function CompanionHero({id,title,eyebrow,meta,hidden=false,children}:PropsWithChildren<{id?:string;title:string;eyebrow:string;meta?:string;hidden?:boolean}>){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]),art=id&&!hidden?companionArtSource(id):undefined,def=COMBAT_COMPANIONS.find(row=>row.id===id);
 return <View style={[s.hero,{borderWidth:1,borderColor:def&&!hidden?companionRarityBorder(def.rarity,C.dark):C.line}]}><Text style={s.eyebrow}>{eyebrow}</Text><View style={s.stage}><View style={s.halo}/><View style={s.plinth}/>{art?<Image source={art} accessibilityLabel={title} resizeMode="contain" style={s.art}/>:<UiIcon name={hidden?'search':'companions'} size={64}/>}</View><Text accessibilityRole="header" style={s.title}>{title}</Text>{meta?<Text style={s.meta}>{meta}</Text>:null}{children}</View>;
}

export function CompanionDisclosure({title,summary,icon='next',defaultOpen=false,children}:PropsWithChildren<{title:string;summary?:string;icon?:UiIconName;defaultOpen?:boolean}>){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]),[open,setOpen]=useState(defaultOpen);
 return <View style={s.disclosure}><Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{expanded:open}} onPress={()=>setOpen(!open)} style={({pressed})=>[s.disclosureHeader,pressed&&s.pressed]}><UiIcon name={icon} size={21}/><View style={s.flex}><Text style={s.label}>{title}</Text>{summary?<Text style={s.meta}>{summary}</Text>:null}</View><Text style={s.toggle}>{open?'−':'+'}</Text></Pressable>{open?<View style={s.details}>{children}</View>:null}</View>;
}

export function CompanionTeamPortraits({ids,levels,slots=0}:{ids:string[];levels?:Record<string,{level:number}>;slots?:number}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]),language=useGameLanguage(),t=companionTranslator(language);
 return <View style={s.team}>{ids.map(id=>{const def=COMBAT_COMPANIONS.find(row=>row.id===id),art=companionArtSource(id);if(!def)return null;return <View key={id} style={[s.member,{borderWidth:1,borderColor:companionRarityBorder(def.rarity,C.dark)}]}>{art?<Image source={art} resizeMode="contain" style={s.teamArt}/>:<UiIcon name="companions" size={42}/>}<Text style={s.memberName}>{def.name}</Text><Text style={s.meta}>{companionLabel(language,def.role)}{levels?.[id]?` · ${t('Lv {value0}',{value0:levels[id].level})}`:''}</Text></View>})}{Array.from({length:Math.max(0,slots-ids.length)},(_,index)=><View key={"empty:"+index} style={[s.member,{borderWidth:1,borderStyle:"dashed",borderColor:C.line,minHeight:100,justifyContent:"center"}]}><UiIcon name="companions" size={28}/><Text style={s.meta}>{t("Empty slot")}</Text></View>)}</View>;
}

const styles=(C:ThemeColors)=>StyleSheet.create({
 hero:{backgroundColor:C.panel2,borderRadius:18,padding:16,gap:8,overflow:'hidden'},eyebrow:{fontSize:10,lineHeight:15,letterSpacing:1.2,fontWeight:'700',color:C.accent},stage:{height:190,alignItems:'center',justifyContent:'center'},halo:{position:'absolute',width:164,height:148,borderRadius:90,backgroundColor:C.selection,opacity:.45},plinth:{position:'absolute',bottom:3,width:142,height:30,borderRadius:75,backgroundColor:C.panelRaised,borderWidth:StyleSheet.hairlineWidth,borderColor:C.line},art:{width:180,height:180},title:{fontSize:24,lineHeight:29,fontWeight:'700',letterSpacing:-.5,color:C.text},meta:{fontSize:12,lineHeight:18,color:C.muted},label:{fontSize:14,lineHeight:20,fontWeight:'600',color:C.text},flex:{flex:1,minWidth:0,gap:3},disclosure:{borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:C.line},disclosureHeader:{minHeight:60,paddingVertical:12,flexDirection:'row',alignItems:'center',gap:10},toggle:{color:C.muted,fontSize:22},details:{gap:12,paddingBottom:14},pressed:{opacity:.7},team:{flexDirection:'row',flexWrap:'wrap',gap:8},member:{flexGrow:1,flexBasis:82,minWidth:0,alignItems:'center',backgroundColor:C.panelRaised,padding:8,borderRadius:12,gap:3},teamArt:{width:64,height:64},memberName:{fontSize:11,lineHeight:15,fontWeight:'600',color:C.text,textAlign:'center'},
});
