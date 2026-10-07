import {useState,type ReactNode} from 'react';
import {Image,ImageBackground,Pressable,Text,View,type ImageSourcePropType} from 'react-native';
import {useGameTheme} from '../../theme/ThemeContext';
import {UiIcon} from '../UiIcon';
import {RoleBadge} from './CoopVisualKit';
import {t,type Language} from '../../i18n';
import {dungeonEnemyPortraitSource} from '../../theme/dungeon-enemy-art';

export function DungeonHero({source,label,description,title}:{source?:ImageSourcePropType;label:string;description:string;title?:string}){
 const C=useGameTheme();
 return <View style={{borderRadius:14,overflow:'hidden',borderWidth:1,borderColor:C.line,backgroundColor:C.panel}}>{source?<ImageBackground source={source} resizeMode="cover" accessibilityLabel={title??label} imageStyle={{width:'100%',height:'100%'}} style={{width:'100%',height:title?190:146,justifyContent:'flex-end'}}><View style={{padding:14,gap:5,backgroundColor:'rgba(3,4,5,.66)'}}><Text style={{color:'#BFD4CA',fontSize:10,fontWeight:'600',letterSpacing:1.3}}>{label.toLocaleUpperCase()}</Text>{title?<Text accessibilityRole="header" style={{color:'#F1F4F5',fontSize:24,lineHeight:30,fontWeight:'600'}}>{title}</Text>:null}</View></ImageBackground>:<View style={{padding:14}}><Text accessibilityRole="header" style={{color:C.text,fontSize:24,fontWeight:'600'}}>{title??label}</Text></View>}<Text style={{padding:12,fontSize:13,lineHeight:20,color:C.muted}}>{description}</Text></View>;
}
export function DungeonBossPreview({name,label}:{name:string;label:string}){
 const C=useGameTheme(),source=dungeonEnemyPortraitSource(name);
 return <View style={{flexDirection:'row',gap:12,alignItems:'center',padding:12,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel}}>{source?<Image source={source} accessibilityLabel={name} resizeMode="contain" style={{width:64,height:64}}/>:<UiIcon name="dungeon" size={42}/>}<View style={{flex:1,gap:4}}><Text style={{fontSize:10,letterSpacing:1,color:C.special,fontWeight:'600'}}>{label.toLocaleUpperCase()}</Text><Text style={{fontSize:17,lineHeight:23,fontWeight:'600',color:C.text}}>{name}</Text></View></View>;
}
export function DungeonDisclosure({title,children,initiallyOpen=false}:{title:string;children:ReactNode;initiallyOpen?:boolean}){
 const [open,setOpen]=useState(initiallyOpen),C=useGameTheme();
 return <View style={{borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel,overflow:'hidden'}}><Pressable accessibilityRole="button" accessibilityState={{expanded:open}} onPress={()=>setOpen(v=>!v)} style={({pressed})=>({minHeight:48,padding:12,flexDirection:'row',gap:10,alignItems:'center',opacity:pressed?.7:1})}><Text style={{flex:1,color:C.text,fontSize:14,fontWeight:'500'}}>{title}</Text><Text style={{color:C.muted,fontSize:20}}>{open?'−':'+'}</Text></Pressable>{open?<View style={{padding:12,paddingTop:0,gap:12}}>{children}</View>:null}</View>;
}
export function DungeonPartyRoles({language,note}:{language:Language;note?:string}){
 const C=useGameTheme();return <View style={{gap:10}}><View style={{flexDirection:'row',flexWrap:'wrap',gap:8,justifyContent:'space-between'}}>{(['tank','damage','damage','support'] as const).map((role,i)=><RoleBadge key={i} role={role} label={t(language,`coopUi.${role}`)}/>)}</View>{note?<Text style={{color:C.muted,fontSize:12,lineHeight:18}}>{note}</Text>:null}</View>;
}
export function DungeonReward({title,detail,source}:{title:string;detail?:string;source?:ImageSourcePropType}){
 const C=useGameTheme();return <View style={{flexDirection:'row',gap:12,alignItems:'center'}}><View style={{width:44,height:44,borderRadius:10,backgroundColor:C.specialSurface,alignItems:'center',justifyContent:'center'}}>{source?<Image source={source} style={{width:36,height:36}} resizeMode="contain"/>:<UiIcon name="ward" size={28}/>}</View><View style={{flex:1,gap:3}}><Text style={{fontSize:16,lineHeight:22,fontWeight:'600',color:C.text}}>{title}</Text>{detail?<Text style={{fontSize:12,lineHeight:18,color:C.muted}}>{detail}</Text>:null}</View></View>;
}
