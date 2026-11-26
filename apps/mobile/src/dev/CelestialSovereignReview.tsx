import {Image,SafeAreaView,ScrollView,StyleSheet,Text,View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GameLanguageProvider} from '../i18n/GameLanguageProvider';
import {GameThemeProvider,useGameTheme} from '../theme/ThemeContext';
import {CelestialSovereignPreview} from '../components/profile/CelestialSovereignPreview';
import {CELESTIAL_IDS,getCelestialAssetBundle} from '../theme/celestial-integration-assets';
import {petArtSource} from '../theme/pet-art';
import {ProfileIcon} from '../components/ProfileIcon';

const assets=getCelestialAssetBundle();
const alternatePetId='DUNGEON_PET_ASTERFALL_001';
const alternatePet=petArtSource(alternatePetId);

function Identity(){
 return <View style={s.identity}>
  <Text numberOfLines={1} style={s.name}>Aster Nightfall</Text>
  <Text numberOfLines={1} style={s.title}>Sovereign of the Stars</Text>
  <Text numberOfLines={1} style={s.meta}>Lv. 50 · Bastion · 142,580 CP</Text>
 </View>;
}
function Card({label,petId,petSource}:{label:string;petId?:string;petSource?:ReturnType<typeof petArtSource>}){
 const C=useGameTheme();
 const fallback=<View style={[s.fallback,{borderColor:C.line,backgroundColor:C.panel}]}><Text style={{color:C.muted}}>Standard profile fallback</Text></View>;
 return <View style={s.section}>
  <Text style={[s.label,{color:C.accent}]}>{label}</Text>
  <CelestialSovereignPreview
   assets={assets.scene}
   equippedPetId={petId}
   matchingPetId={CELESTIAL_IDS.pet}
   alternatePetSource={petSource}
   petAccessibilityLabel={petId===CELESTIAL_IDS.pet?'Aetherion, the Starborn':petId?'Oathroot Seedling':undefined}
   active
   reduceMotion={false}
   fallback={fallback}
   portrait={<ProfileIcon classId="BASTION" size={56} style={{width:'100%',height:'100%'}}/>}
   identity={<Identity/>}
   guild={<Text numberOfLines={1} style={s.guild}>Sovereign</Text>}
  />
 </View>;
}
function Review(){
 const C=useGameTheme();
 return <SafeAreaView style={[s.root,{backgroundColor:C.bg}]}>
  <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
   <Text style={[s.kicker,{color:C.warning}]}>NATIVE QA · ASCENDANT I</Text>
   <Text accessibilityRole="header" style={[s.heading,{color:C.text}]}>Celestial Sovereign</Text>
   <Text style={[s.copy,{color:C.muted}]}>Real committed runtime artwork. Global release gate remains disabled.</Text>
   <View style={[s.assetRow,{borderColor:C.line,backgroundColor:C.panel}]}>
    <View style={s.assetCell}><Image source={assets.petRegular} resizeMode="contain" style={s.petIcon}/><Text style={[s.assetLabel,{color:C.muted}]}>Aetherion · regular pet art</Text></View>
    <View style={s.assetCell}><Image source={assets.badge} resizeMode="contain" style={s.badgeIcon}/><Text style={[s.assetLabel,{color:C.muted}]}>Sovereign of the Stars</Text></View>
   </View>
   <Card label="MATCHING PET · AETHERION" petId={CELESTIAL_IDS.pet}/>
   <Card label="ALTERNATE PET · OATHROOT SEEDLING" petId={alternatePetId} petSource={alternatePet}/>
   <Card label="NO PET" />
  </ScrollView>
 </SafeAreaView>;
}
export default function CelestialSovereignReview(){
 return <SafeAreaProvider><GameThemeProvider themeId="obsidian"><GameLanguageProvider language="en"><Review/></GameLanguageProvider></GameThemeProvider></SafeAreaProvider>;
}
const s=StyleSheet.create({
 root:{flex:1},content:{padding:14,paddingBottom:48,gap:12},section:{gap:6},
 kicker:{fontSize:9,lineHeight:13,fontWeight:'900',letterSpacing:1.1},
 heading:{fontSize:22,lineHeight:28,fontWeight:'900'},
 copy:{fontSize:12,lineHeight:18,marginBottom:4},
 label:{fontSize:9,lineHeight:13,fontWeight:'900',letterSpacing:.7},
 identity:{flex:1,minWidth:0,overflow:'hidden'},
 name:{fontSize:12,lineHeight:15,color:'#fff0c8',fontWeight:'900'},
 title:{fontSize:9,lineHeight:12,color:'#efd69b',fontWeight:'700'},
 meta:{fontSize:8,lineHeight:11,color:'#d6e0f4',fontWeight:'700'},
 guild:{fontSize:9,lineHeight:12,color:'#f4ddb0',fontWeight:'900'},
 fallback:{height:205,borderWidth:1,borderRadius:10,alignItems:'center',justifyContent:'center'},
 assetRow:{flexDirection:'row',gap:10,padding:10,borderWidth:1,borderRadius:10},
 assetCell:{flex:1,minWidth:0,alignItems:'center',gap:5},petIcon:{width:84,height:84},badgeIcon:{width:64,height:64,marginVertical:10},
 assetLabel:{fontSize:9,lineHeight:12,fontWeight:'700',textAlign:'center'},
});
