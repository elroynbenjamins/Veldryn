import {useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {ProfileEditor} from '../components/ProfileEditor';
import {OnlineProfileExtensionPanel} from '../components/OnlineProfileExtensionPanel';
import type {GameState} from '../core/types';
import type {ProfileCustomizationDestination} from '../core/profile-customization';
import {C,equipmentColors,radii,spacing,typography} from '../theme/theme';

type Section='Appearance'|'Identity';

export function ProfileCustomizeScreen({state,onChange,onNavigateSource}:{state:GameState;onChange:(next:GameState)=>void;onNavigateSource?:(destination:ProfileCustomizationDestination)=>void}){
 const [section,setSection]=useState<Section>('Appearance');
 return <ScrollView contentContainerStyle={s.root}>
  <View style={s.headingRow}>
   <View style={s.flex}><Text style={s.kicker}>PROFILE CUSTOMIZATION</Text><Text accessibilityRole="header" style={s.heading}>Customize Profile</Text></View>
   <View style={s.liveBadge}><Text style={s.liveBadgeText}>{section==='Appearance'?'LIVE PREVIEW':'PROFILE SETTINGS'}</Text></View>
  </View>
  <Text style={s.intro}>Shape the identity other players see. Appearance is saved per character; social details and showcases belong to your account profile.</Text>

  <View accessibilityRole="tablist" style={s.tabs}>
   <Pressable accessibilityRole="tab" accessibilityState={{selected:section==='Appearance'}} onPress={()=>setSection('Appearance')} style={({pressed})=>[s.tab,section==='Appearance'&&s.tabOn,pressed&&s.pressed]}>
    <Text style={[s.tabTitle,section==='Appearance'&&s.tabTitleOn]}>Appearance</Text>
    <Text style={s.tabMeta}>Background · border · title · Pet</Text>
   </Pressable>
   <Pressable accessibilityRole="tab" accessibilityState={{selected:section==='Identity'}} onPress={()=>setSection('Identity')} style={({pressed})=>[s.tab,section==='Identity'&&s.tabOn,pressed&&s.pressed]}>
    <Text style={[s.tabTitle,section==='Identity'&&s.tabTitleOn]}>Identity & Showcases</Text>
    <Text style={s.tabMeta}>Bio · privacy · favorites · featured slots</Text>
   </Pressable>
  </View>

  {section==='Appearance'
   ?<ProfileEditor state={state} onChange={onChange} showLoadouts={false} onNavigateSource={onNavigateSource}/>
   :<OnlineProfileExtensionPanel state={state}/>}
 </ScrollView>;
}

const s=StyleSheet.create({
 root:{padding:spacing.lg,gap:spacing.md,paddingBottom:110},
 headingRow:{flexDirection:'row',alignItems:'center',gap:spacing.sm},
 flex:{flex:1,minWidth:0},
 kicker:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900',letterSpacing:1},
 heading:{...typography.hero,color:C.text},
 intro:{...typography.body,color:C.muted,lineHeight:20},
 liveBadge:{paddingHorizontal:8,paddingVertical:5,borderWidth:1,borderColor:C.good,borderRadius:99,backgroundColor:C.panel2},
 liveBadgeText:{fontSize:9,color:C.good,fontWeight:'900',letterSpacing:.65},
 tabs:{flexDirection:'row',gap:6,padding:4,borderWidth:1,borderColor:C.line,borderRadius:radii.lg,backgroundColor:C.bg},
 tab:{flex:1,minHeight:64,justifyContent:'center',paddingHorizontal:10,paddingVertical:8,borderRadius:radii.md,borderWidth:1,borderColor:'transparent'},
 tabOn:{backgroundColor:C.panel2,borderColor:C.accent},
 pressed:{opacity:.72},
 tabTitle:{...typography.bodyStrong,color:C.muted},
 tabTitleOn:{color:C.text},
 tabMeta:{fontSize:9,lineHeight:12,color:C.muted,marginTop:2},
});
