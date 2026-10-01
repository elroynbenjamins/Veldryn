/** Real profile components, fictional identity data, no auth or persistence. */
import {useState} from 'react';
import {Pressable,ScrollView,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {ProfileScenePreview} from '../components/ProfileScenePreview';
import {PublicProfileScene} from '../components/PublicProfileScene';
import {C} from '../theme/theme';
import {CardBackground} from '../components/CardBackground';
import {guildBackgroundSources} from '../theme/card-background-assets';

export function ProfileIdentityReview({state}:{state:GameState}){
 const [width,setWidth]=useState(400),[showGuild,setShowGuild]=useState(true),[longName,setLongName]=useState(false);
 const [showFormats,setShowFormats]=useState(false);
 const guild=showGuild?{name:longName?'Wardens of the Silver':'The Bloomwardens',tag:'BLM',tagColorId:'tag_emerald',nameColorId:'name_emerald',bannerId:'world_tree_green',level:12,frameId:'silver_fellowship',backgroundId:'forest_sanctum',motto:'Together, we keep the wilds safe.'}:null;
 const personal={...state,character:{...state.character!,profileBorderId:'frame_harvestwake_festival',profileTitle:'Warden of the Grove'}};
 return <ScrollView style={{flex:1}} contentContainerStyle={{padding:16,gap:16,alignItems:'center'}} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
  <Text style={{color:C.accent,fontWeight:'900'}}>PROFILE IDENTITY · RESPONSIVE REVIEW</Text>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,justifyContent:'center'}}>
   {[288,400,720].map(value=><Pressable key={value} accessibilityRole="button" accessibilityLabel={`Card width ${value}`} accessibilityState={{selected:width===value}} onPress={()=>setWidth(value)} style={{padding:10,borderRadius:6,backgroundColor:width===value?C.panel2:C.panel}}><Text style={{color:C.text}}>{value}px</Text></Pressable>)}
   <Pressable accessibilityRole="button" onPress={()=>setShowGuild(value=>!value)} style={{padding:10,backgroundColor:C.panel}}><Text style={{color:C.text}}>{showGuild?'Hide guild':'Show guild'}</Text></Pressable>
   <Pressable accessibilityRole="button" onPress={()=>setLongName(value=>!value)} style={{padding:10,backgroundColor:C.panel}}><Text style={{color:C.text}}>{longName?'Short guild name':'Long guild name'}</Text></Pressable>
   <Pressable accessibilityRole="button" onPress={()=>setShowFormats(value=>!value)} style={{padding:10,backgroundColor:C.panel}}><Text style={{color:C.text}}>{showFormats?'Hide background formats':'Background formats'}</Text></Pressable>
  </View>
  {!showFormats?<View style={{width:'100%',flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:20}}>
   <View style={{width,maxWidth:'100%',gap:12}}><Text style={{color:C.accent,fontWeight:'900',textAlign:'center'}}>PERSONAL PROFILE</Text><ProfileScenePreview state={personal} backgroundId="bg_forest_sanctum"/></View>
   <View style={{width,maxWidth:'100%',gap:12}}><Text style={{color:C.accent,fontWeight:'900',textAlign:'center'}}>PUBLIC PROFILE</Text><PublicProfileScene profile={{guild,accountId:'preview',displayName:'Aster',visibility:'public',character:{id:'preview',name:'Aster',classId:'IRONWARDEN',level:28,bodyPresentation:'female',profileIconId:state.character!.profileIconId??''},title:'Warden of the Grove',backgroundId:'bg_merchant_guild',borderId:'frame_amber_vine',bio:'',achievementShowcaseIds:[],collectionShowcase:[],recordShowcaseIds:[],masteryShowcaseActionIds:[],revision:0}}/></View>
  </View>:null}
  {showFormats?<View style={{gap:16,width:'100%'}}>
   {(['forest_sanctum','guild_plaza'] as const).map(id=><View key={id} style={{gap:8}}>
    <Text style={{color:C.accent,fontWeight:'800',textAlign:'center'}}>{id==='forest_sanctum'?'Forest Sanctum':'Guild Plaza'}</Text>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:12,justifyContent:'center',alignItems:'flex-start'}}>
     {([{name:'Landscape',width:240,height:135},{name:'Square',width:180,height:180},{name:'Portrait',width:160,height:240}]).map(shape=><View key={shape.name} style={{gap:6}}>
      <Text style={{color:C.text,textAlign:'center'}}>{shape.name}</Text>
      <View accessibilityLabel={id+' '+shape.name+' background'} style={{width:shape.width,height:shape.height,overflow:'hidden',borderRadius:8}}><CardBackground sources={guildBackgroundSources.get(id)!}/></View>
     </View>)}
    </View>
   </View>)}
  </View>:null}
 </ScrollView>;
}
