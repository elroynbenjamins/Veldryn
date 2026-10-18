import {SafeAreaView,StyleSheet,Text,View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {ProfileScreen} from '../screens/ProfileScreen';
import {createCharacter,newGame} from '../core/game';
import {GameLanguageProvider} from '../i18n/GameLanguageProvider';
import {GameThemeProvider,useGameTheme} from '../theme/ThemeContext';

function fixture(){
 const created=createCharacter(newGame(Date.now()),'IRONWARDEN','Aster Nightfall','female');
 return {
  ...created,
  character:{
   ...created.character!,level:28,profileIconId:'class:IRONWARDEN',profileTitle:'Gloam-Touched',
   profileBackgroundId:'bg_forest_sanctum',profileBorderId:'frame_gloamward',selectedCosmeticPetId:'EVT_PET_013',
  },
  account:{
   ...created.account,
   unlockedProfileBackgroundIds:[...(created.account.unlockedProfileBackgroundIds??[]),'bg_forest_sanctum'],
   unlockedProfileBorderIds:[...(created.account.unlockedProfileBorderIds??[]),'frame_gloamward'],
   unlockedCosmeticPetIds:[...(created.account.unlockedCosmeticPetIds??[]),'EVT_PET_013'],
  },
 };
}

function Preview(){
 const C=useGameTheme();
 return <SafeAreaView style={[s.root,{backgroundColor:C.bg}]}>
  <View style={[s.phone,{backgroundColor:C.bg,borderColor:C.line}]}>
   <View style={[s.appBar,{borderBottomColor:C.line}]}>
    <View><Text style={[s.appKicker,{color:C.accent}]}>ASTERFALL</Text><Text style={[s.appTitle,{color:C.text}]}>Character</Text></View>
    <View style={[s.goldPill,{borderColor:C.line}]}><Text style={[s.goldLabel,{color:C.muted}]}>GOLD</Text><Text style={[s.goldValue,{color:C.text}]}>3.32K</Text></View>
   </View>
   <View style={s.content}><ProfileScreen state={fixture()}/></View>
   <View style={[s.nav,{borderTopColor:C.line,backgroundColor:C.panel}]}>
    {['Character','Skills','World','Inventory','Account'].map((item,index)=><View key={item} style={s.navItem}><View style={[s.navIcon,{borderColor:index===0?C.accent:C.muted}]}/><Text style={{color:index===0?C.text:C.muted,fontSize:9,fontWeight:'800'}}>{item}</Text></View>)}
   </View>
  </View>
 </SafeAreaView>;
}

export default function GloamwardProfileReview(){
 return <SafeAreaProvider><GameThemeProvider themeId="obsidian"><GameLanguageProvider language="en"><Preview/></GameLanguageProvider></GameThemeProvider></SafeAreaProvider>;
}

const s=StyleSheet.create({
 root:{flex:1,alignItems:'center',justifyContent:'center'},phone:{width:390,height:'100%',maxHeight:844,borderWidth:1,overflow:'hidden'},
 appBar:{height:68,paddingHorizontal:14,borderBottomWidth:1,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 appKicker:{fontSize:9,fontWeight:'900',letterSpacing:1.2},appTitle:{fontSize:18,fontWeight:'900'},
 goldPill:{minWidth:72,borderWidth:1,borderRadius:8,paddingHorizontal:10,paddingVertical:6,alignItems:'flex-end'},goldLabel:{fontSize:8,fontWeight:'900',letterSpacing:1},goldValue:{fontSize:14,fontWeight:'900'},
 content:{flex:1},nav:{height:62,borderTopWidth:1,flexDirection:'row',alignItems:'center',justifyContent:'space-around'},
 navItem:{alignItems:'center',gap:4},navIcon:{width:17,height:17,borderWidth:2,borderRadius:5},
});
