import {useState} from 'react';
import {SafeAreaView,ScrollView,StatusBar,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {ProfileEditor} from '../components/ProfileEditor';
import {C} from '../theme/theme';

const initial={
 version:6,createdAtMs:Date.now(),inventory:{stacks:[],capacity:120},bank:{stacks:[],capacity:200},overflow:{stacks:[],expiresAtMs:null},activity:null,currentRegionId:'KINGS_ROAD',quests:[],unlockedMonsterIds:[],defeatedBossIds:[],skills:[],
 character:{id:'profile-review',name:'Aster Nightfall',classId:'IRONWARDEN',level:25,xp:0,gold:4500,hp:100,currentHp:100,attack:10,defense:10,equipment:{},bodyPresentation:'female',selectedSkinId:'starting',profileTitle:'Warden of the First Light',profileBackgroundId:'bg_harvestwake',profileBorderId:'frame_amber_vine',selectedCosmeticPetId:'pet_harvest_fox'},
 account:{createdCharacterCount:1,guildMember:false,patronTier:'none',unlockedProfileBackgroundIds:['bg_harvestwake'],unlockedProfileBorderIds:['frame_amber_vine'],unlockedCosmeticPetIds:['pet_harvest_fox'],unlockedTitleIds:[]},
 settings:{language:'en',numberMode:'abbreviated',reduceMotion:true,textScale:1,autoEatThresholdPct:40,stopCombatWhenOutOfFood:true},
} as unknown as GameState;

export default function ProfileNativeReview(){
 const [state,setState]=useState(initial);
 return <SafeAreaView style={s.root}><View style={s.qa}><Text style={s.qaText}>NATIVE QA · PROFILE MEMORY FIXTURE</Text></View><ScrollView contentContainerStyle={s.content}><ProfileEditor state={state} onChange={setState}/></ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:C.bg,paddingTop:StatusBar.currentHeight??24},qa:{backgroundColor:'#26334a',paddingHorizontal:10,paddingVertical:6},qaText:{color:C.text,fontSize:11},content:{padding:16}});
