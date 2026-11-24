import {Image,SafeAreaView,ScrollView,StyleSheet,Text,View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GameLanguageProvider} from '../i18n/GameLanguageProvider';
import {GameThemeProvider} from '../theme/ThemeContext';
import {DraconicDominionPreview,DraconicStandardEffects} from '../components/profile/DraconicDominionPreview';
import {DRACONIC_IDS} from '../core/draconic-showcase-layout';
import {getDraconicAssets} from '../theme/draconic-integration-assets';
import {petArtSource} from '../theme/pet-art';
import {PlayerBadgeShowcase} from '../components/PlayerBadges';
import {ProfileIcon} from '../components/ProfileIcon';

function Review(){
 const bundle=getDraconicAssets();
 if(!bundle)return <SafeAreaView style={s.root}><Text style={s.label}>Draconic artwork import required.</Text></SafeAreaView>;
 const alternate='DUNGEON_PET_ASTERFALL_001';
 const cases=[{label:'Matching Vharaxis',pet:DRACONIC_IDS.pet},{label:'Alternate pet',pet:alternate},{label:'No pet',pet:undefined}];
 return <SafeAreaView style={s.root}><ScrollView contentContainerStyle={s.content}>
  <Text style={s.heading}>Draconic Dominion · Private QA</Text>
  <View style={s.icons}><Image source={bundle.petRegular} style={s.icon}/><Image source={bundle.badge} style={s.icon}/></View>
  {cases.map(({label,pet})=><View key={label} style={s.section}>
   <Text style={s.label}>{label}</Text>
   <DraconicDominionPreview assets={bundle.scene} equippedPetId={pet} alternatePetSource={pet===alternate?petArtSource(alternate):undefined} active
    portrait={<ProfileIcon classId="BASTION" size={54} style={{width:'100%',height:'100%'}}/>}
    identity={<View><Text numberOfLines={1} style={s.name}>Aster Nightfall</Text><Text style={s.meta}>Dragon Sovereign</Text><Text numberOfLines={1} style={s.meta}>Lv. 50 · Knife Dancer</Text><Text style={s.meta}>142,580 CP</Text></View>}
    badges={<PlayerBadgeShowcase identity={{staff:null,supporter:false,featured:['founder','veteran','ascendant_sovereign_of_stars'],validUntilMs:Date.now()+3600000}} size={12} variant="bare"/>}
    guild={<Text style={s.meta}>Sovereign</Text>} fallback={<Text style={s.label}>Standard layout fallback</Text>}/>
  </View>)}
  <Text style={s.label}>Independent background effects</Text>
  <View style={s.single}><Image source={bundle.scene.background} resizeMode="cover" style={StyleSheet.absoluteFillObject}/><DraconicStandardEffects ember={bundle.scene.ember} kind="background" active/></View>
  <Text style={s.label}>Independent frame effects</Text>
  <View style={s.single}><Image source={bundle.standardBorder} resizeMode="stretch" style={StyleSheet.absoluteFillObject}/><DraconicStandardEffects ember={bundle.scene.ember} kind="border" active/></View>
 </ScrollView></SafeAreaView>;
}
export default function DraconicDominionReview(){return <SafeAreaProvider><GameThemeProvider themeId="obsidian"><GameLanguageProvider language="en"><Review/></GameLanguageProvider></GameThemeProvider></SafeAreaProvider>;}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#160e14'},content:{padding:14,gap:12},section:{gap:6},heading:{fontSize:20,fontWeight:'800',color:'#ffcf9c'},label:{color:'#ffb76b',fontSize:12,fontWeight:'800'},icons:{flexDirection:'row',gap:12},icon:{width:64,height:64},name:{fontSize:11,lineHeight:12,fontWeight:'800',color:'#fff0d6'},meta:{fontSize:8,lineHeight:9,color:'#f6d4b9'},badge:{width:13,height:13},single:{height:150,position:'relative',backgroundColor:'#1c1016'}});
