/** QA-only staged Frostfall teaser review. The real Event Hub uses server dates. */
import {useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {FrostfallPreview} from '../components/FrostfallPreview';
import {GameThemeProvider} from '../theme/ThemeContext';
import {GameLanguageProvider} from '../i18n/GameLanguageProvider';

const START_MS=Date.UTC(2026,11,3);
const FIRST_MS=Date.UTC(2026,10,19);
const SECOND_MS=Date.UTC(2026,10,27);
export default function FrostfallPreviewReview(){
 const [stage,setStage]=useState<'first'|'second'>('first');
 return <SafeAreaProvider><GameThemeProvider themeId="obsidian"><GameLanguageProvider language="en">
  <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
   <View style={s.header}><Text style={s.label}>PRELAUNCH SCREEN QA · SYNTHETIC CLOCK</Text>
    <Text style={s.explanation}>Switch reveal stages to review artwork and mobile layout. This does not change the published event schedule or unlock rewards.</Text>
    <View style={s.buttons}>
     <Pressable accessibilityRole="button" accessibilityState={{selected:stage==='first'}} onPress={()=>setStage('first')} style={[s.button,stage==='first'&&s.active]}><Text style={s.buttonText}>19 Nov · First teaser</Text></Pressable>
     <Pressable accessibilityRole="button" accessibilityState={{selected:stage==='second'}} onPress={()=>setStage('second')} style={[s.button,stage==='second'&&s.active]}><Text style={s.buttonText}>27 Nov · Second reveal</Text></Pressable>
    </View>
   </View>
   <FrostfallPreview key={stage} startsAtMs={START_MS} nowMs={stage==='first'?FIRST_MS:SECOND_MS}/>
  </ScrollView>
 </GameLanguageProvider></GameThemeProvider></SafeAreaProvider>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#101724'},content:{padding:13,paddingBottom:24,gap:16},header:{gap:9},label:{fontSize:10,fontWeight:'900',color:'#d3c093'},explanation:{fontSize:12,lineHeight:18,color:'#c5d3df'},buttons:{flexDirection:'row',gap:8,flexWrap:'wrap'},button:{minHeight:44,borderRadius:9,borderWidth:1,borderColor:'#41546a',paddingHorizontal:12,justifyContent:'center',backgroundColor:'#233349'},active:{borderColor:'#a9e9ff',backgroundColor:'#2c5068'},buttonText:{fontSize:11,fontWeight:'800',color:'#f3f8ff'}});
