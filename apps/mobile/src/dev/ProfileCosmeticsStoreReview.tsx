import {useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context';
import {StoreCosmeticsCatalog} from '../components/StoreCosmeticsCatalog';
import {PROFILE_COSMETIC_STORE_COLLECTIONS} from '../content/profile-cosmetic-store';
import {createCharacter,newGame} from '../core/game';
import {GameThemeProvider,useGameTheme} from '../theme/ThemeContext';
import type {UiThemeId} from '../theme/theme';

type OwnershipMode='none'|'border'|'effect'|'both';
const base=createCharacter(newGame(0),'IRONWARDEN','Cosmetics QA');

function ReviewBody({theme,setTheme}:{theme:UiThemeId;setTheme:(id:UiThemeId)=>void}){
 const C=useGameTheme(),[mode,setMode]=useState<OwnershipMode>('none');
 const state=useMemo(()=>{
  const borders=mode==='border'||mode==='both'?PROFILE_COSMETIC_STORE_COLLECTIONS.map(row=>row.border.itemId):[];
  const effects=mode==='effect'||mode==='both'?PROFILE_COSMETIC_STORE_COLLECTIONS.map(row=>row.effect.itemId):[];
  return {...base,account:{...base.account,unlockedProfileBorderIds:borders,unlockedProfileEffectIds:effects}};
 },[mode]);
 const button=(id:string,label:string,selected:boolean,onPress:()=>void)=><Pressable key={id} accessibilityRole="button" accessibilityState={{selected}} onPress={onPress} style={[s.button,{borderColor:selected?C.selectionLine:C.line,backgroundColor:selected?C.selection:C.panel}]}><Text style={{color:C.text,fontWeight:'800',fontSize:11}}>{label}</Text></Pressable>;
 return <SafeAreaView style={{flex:1,backgroundColor:C.bg}}><ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={s.root}>
  <Text accessibilityRole="header" style={{color:C.text,fontSize:20,fontWeight:'900'}}>COSMETICS STORE · QA</Text>
  <Text style={{color:C.muted,fontSize:11,lineHeight:17}}>Developer-only catalog review. No prices, checkout, Google Play products, grants or server writes.</Text>
  <Text style={{color:C.text,fontSize:12,fontWeight:'800'}}>Ownership fixture</Text>
  <View style={s.row}>{(['none','border','effect','both'] as const).map(value=>button(value,value==='none'?'0 / 2':value==='border'?'Border only':value==='effect'?'Effect only':'2 / 2',mode===value,()=>setMode(value)))}</View>
  <Text style={{color:C.text,fontSize:12,fontWeight:'800'}}>Theme</Text>
  <View style={s.row}>{(['obsidian','ember','ivory'] as const).map(value=>button(value,value,theme===value,()=>setTheme(value)))}</View>
  <StoreCosmeticsCatalog state={state}/>
 </ScrollView></SafeAreaView>;
}
export default function ProfileCosmeticsStoreReview(){
 const [theme,setTheme]=useState<UiThemeId>('obsidian');
 return <SafeAreaProvider><GameThemeProvider themeId={theme}><ReviewBody theme={theme} setTheme={setTheme}/></GameThemeProvider></SafeAreaProvider>;
}
const s=StyleSheet.create({root:{padding:12,gap:10,paddingBottom:40},row:{flexDirection:'row',flexWrap:'wrap',gap:6},button:{minHeight:44,justifyContent:'center',paddingHorizontal:10,borderWidth:1,borderRadius:7}});
