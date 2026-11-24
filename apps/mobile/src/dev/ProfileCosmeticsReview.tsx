import {useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context';
import {PublicProfileScene} from '../components/PublicProfileScene';
import {GameLanguageProvider} from '../i18n/GameLanguageProvider';
import {GameThemeProvider,useGameTheme} from '../theme/ThemeContext';
import type {UiThemeId} from '../theme/theme';
import type {PublicPlayerProfileV43} from '../online/profile-extension-v43';
import {cosmeticArtByBorder,cosmeticArtByEffect} from '../theme/profile-cosmetic-art-v1';
import {PROFILE_COSMETIC_RUNTIME,profileCosmeticRuntimeByBorder,profileCosmeticRuntimeByEffect} from '../theme/profile-cosmetic-runtime-v1';
const LABELS:Record<string,string>={gloamward:'Gloamward',frostbound:'Frostbound Chime',amberglass:'Amberglass Loop',briarbound:'Briarbound',celestial:'Celestial Sovereign',draconic:'Draconic Dominion',abyssal:'Abyssal Majesty',paradox:'Paradox Eternal'};
const EFFECTS:Record<string,string>={gloamward:'Arcane Wisps',frostbound:'Winter Veil',amberglass:'Ember Motes',briarbound:'Verdant Whispers',celestial:'Celestial Alignment',draconic:'Awakening of the Dragon',abyssal:'Call of the Deep',paradox:'Reality Rewritten'};
const fixture:PublicPlayerProfileV43={accountId:'cosmetic-review-local',displayName:'Aster Nightfall',visibility:'public',character:{id:'cosmetic-review-hero',name:'Aster Nightfall',classId:'IRONWARDEN',level:38,bodyPresentation:'female',profileIconId:'class:IRONWARDEN'},title:'Veil Watcher',backgroundId:'bg_forest_sanctum',petId:'EVT_PET_013',guild:{tag:'QA'},combatPower:6992,bio:'',achievementShowcaseIds:[],collectionShowcase:[],recordShowcaseIds:[],masteryShowcaseActionIds:[],revision:0};
function Preview({theme,setTheme}:{theme:UiThemeId;setTheme:(id:UiThemeId)=>void}){
 const C=useGameTheme(),{width}=useWindowDimensions();
 const [border,setBorder]=useState(PROFILE_COSMETIC_RUNTIME[0]?.borderId??''),[effect,setEffect]=useState(PROFILE_COSMETIC_RUNTIME[0]?.effectId??'');
 const [reduce,setReduce]=useState(false),[active,setActive]=useState(true),[pet,setPet]=useState(true),[guild,setGuild]=useState(true),[longName,setLongName]=useState(false),[size,setSize]=useState(340);
 const btn=(key:string,label:string,selected:boolean,action:()=>void)=><Pressable key={key} accessibilityRole="button" accessibilityState={{selected}} onPress={action} style={[s.button,{backgroundColor:selected?C.selection:C.panel,borderColor:selected?C.selectionLine:C.line}]}><Text style={{color:C.text,fontSize:12,fontWeight:'700'}}>{label}</Text></Pressable>;
 const heading=(label:string)=><Text style={{color:C.text,fontSize:14,fontWeight:'800'}}>{label}</Text>;
 const profile={...fixture,character:{...fixture.character,name:longName?'AsterNightfallLongName':fixture.character.name},petId:pet?fixture.petId:null};
 return <SafeAreaView style={[s.root,{backgroundColor:C.bg}]}><ScrollView contentContainerStyle={s.content}>
 {heading('PROFILE COSMETICS · STANDARD + ASCENDANT QA')}
 <Text style={{color:C.muted}}>Local review only. No account writes, grants, purchases or publication.</Text>
 <Text style={{color:C.muted}}>Native runtime fallback uses the existing border art and themed pixel particles; imported V3 PNGs override it automatically.</Text>
 <View style={{width:Math.min(size,Math.max(0,width-24)),alignSelf:'center'}}>
 <PublicProfileScene profile={profile} height={size===260?174:size===480?270:205} showGuild={guild} reduceMotion={reduce} reviewCosmetics={{borderArt:cosmeticArtByBorder.get(border),effectArt:cosmeticArtByEffect.get(effect),borderRuntime:profileCosmeticRuntimeByBorder.get(border),effectRuntime:profileCosmeticRuntimeByEffect.get(effect),active,surroundColor:C.bg}}/>
 </View>
 {heading('Matching collection')}
 <View style={s.row}>{PROFILE_COSMETIC_RUNTIME.map(a=>btn(a.borderId+':set',LABELS[a.motionProfile],border===a.borderId&&effect===a.effectId,()=>{setBorder(a.borderId);setEffect(a.effectId)}))}</View>
 {heading('Border')}
 <View style={s.row}>{btn('no-border','None',!border,()=>setBorder(''))}{PROFILE_COSMETIC_RUNTIME.map(a=>btn(a.borderId,LABELS[a.motionProfile],border===a.borderId,()=>setBorder(a.borderId)))}</View>
 {heading('Effect')}
 <View style={s.row}>{btn('no-effect','None',!effect,()=>setEffect(''))}{PROFILE_COSMETIC_RUNTIME.map(a=>btn(a.effectId,EFFECTS[a.motionProfile],effect===a.effectId,()=>setEffect(a.effectId)))}</View>
 {heading('Review controls')}
 <View style={s.row}>{btn('motion',reduce?'Reduced motion on':'Reduced motion off',reduce,()=>setReduce(v=>!v))}{btn('active',active?'Animation active':'Animation paused',active,()=>setActive(v=>!v))}{btn('pet',pet?'Pet on':'Pet off',pet,()=>setPet(v=>!v))}{btn('guild',guild?'Guild on':'Guild off',guild,()=>setGuild(v=>!v))}{btn('name','Long name',longName,()=>setLongName(v=>!v))}</View>
 <View style={s.row}>{([260,340,480] as const).map(v=>btn('size'+v,v+' dp',v===size,()=>setSize(v)))}</View>
 <View style={s.row}>{(['obsidian','ember','ivory'] as const).map(id=>btn(id,id,id===theme,()=>setTheme(id)))}</View>
 </ScrollView></SafeAreaView>
}
export default function ProfileCosmeticsReview(){
 const [theme,setTheme]=useState<UiThemeId>('obsidian');
 return <SafeAreaProvider><GameThemeProvider themeId={theme}><GameLanguageProvider language="en"><Preview theme={theme} setTheme={setTheme}/></GameLanguageProvider></GameThemeProvider></SafeAreaProvider>;
}
const s=StyleSheet.create({root:{flex:1},content:{padding:12,gap:12,paddingBottom:32},row:{flexDirection:'row',flexWrap:'wrap',gap:6},button:{minHeight:44,borderWidth:1,borderRadius:6,paddingHorizontal:10,justifyContent:'center'}});
