import {useState} from 'react';
import {Image,Pressable,ScrollView,Text,View} from 'react-native';
import {GameThemeProvider} from '../theme/ThemeContext';
import {CombatAttackSprite,CombatEffectShape} from '../components/CombatAttackSprite';
import {TRIAL_ENEMY_PORTRAITS} from '../theme/trial-enemy-portraits';

/** Opt-in visual review: no game state, rewards, or network actions. */
export default function CombatArtReview(){
 const [event,setEvent]=useState(0);
 const effects=['slash','heavy','projectile','magic','heal','shield'] as const;
 return <GameThemeProvider themeId="obsidian"><ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} style={{flex:1,backgroundColor:'#0c1118'}} contentContainerStyle={{padding:16,gap:16}}>
  <Text style={{color:'#fff',fontSize:23,fontWeight:'800'}}>Combat art review</Text>
  <Pressable onPress={()=>setEvent(n=>n+1)} style={{padding:14,borderWidth:1,borderColor:'#76899d',borderRadius:10}}><Text style={{color:'#fff'}}>Replay effects</Text></Pressable>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>{effects.map((kind,index)=><View key={kind} style={{width:'30%',height:112,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#344150',borderRadius:10}}><CombatEffectShape kind={kind} color={index<2?'#f4c982':index===4?'#72d89b':'#8dcdf7'}/><Text style={{color:'#fff',fontSize:12}}>{kind}</Text><CombatAttackSprite eventId={String(event)} motion={kind==='slash'?'lunge':kind==='heavy'?'smash':kind==='projectile'?'projectile':'cast'} accent="cyan" actionKind={kind==='heal'?'heal':kind==='shield'?'shield':'damage'}/></View>)}</View>
  <Text style={{color:'#fff',fontSize:18,fontWeight:'800'}}>Human trial opponents</Text>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>{Object.entries(TRIAL_ENEMY_PORTRAITS).map(([name,source])=><View key={name} style={{width:'30%',alignItems:'center',gap:6}}><Image source={source} style={{width:76,height:76,borderRadius:10}}/><Text style={{color:'#c8d3df',fontSize:10,textAlign:'center'}}>{name}</Text></View>)}</View>
 </ScrollView></GameThemeProvider>;
}
