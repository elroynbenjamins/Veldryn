import {useSocialText} from '../i18n/social';
import {useEffect,useMemo,useRef} from 'react';
import {Animated,Easing,StyleSheet,Text,View} from 'react-native';
import {CLASSES} from '../content/classes';
import type {CharacterState,ClassId,GameState} from '../core/types';
import {C,spacing,typography} from '../theme/theme';
import {CharacterPortraitSelection} from './CharacterVisual';

type ArenaFighter={character:CharacterState;label?:string;companionId?:string};

export function ArenaBattleStage({attackers,defenders,reduceMotion=false}:{attackers:ArenaFighter[];defenders:ArenaFighter[];reduceMotion?:boolean}){
 const st=useSocialText();
 const pulse=useRef(new Animated.Value(0)).current;
 useEffect(()=>{
  pulse.setValue(0);
  if(reduceMotion)return;
  const animation=Animated.loop(Animated.sequence([
   Animated.delay(500),
   Animated.timing(pulse,{toValue:1,duration:260,easing:Easing.out(Easing.quad),useNativeDriver:true}),
   Animated.timing(pulse,{toValue:0,duration:520,easing:Easing.inOut(Easing.quad),useNativeDriver:true}),
   Animated.delay(620),
  ]));
  animation.start();
  return()=>animation.stop();
 },[pulse,reduceMotion]);
 const flashOpacity=pulse.interpolate({inputRange:[0,.18,.5,1],outputRange:[0,.95,.3,0]});
 const slashScale=pulse.interpolate({inputRange:[0,.18,1],outputRange:[.2,1,1.4]});
 const attackerRows=useMemo(()=>attackers.slice(0,3),[attackers]),defenderRows=useMemo(()=>defenders.slice(0,3),[defenders]);
 return <View style={s.stage}>
  <View style={s.header}><View><Text style={s.kicker}>{st("ARENA FORMATION")}</Text><Text style={s.title}>{st("3v3 combat preview")}</Text></View><Text style={s.live}>{reduceMotion?st("REDUCED MOTION"):st("LIVE FX")}</Text></View>
  <View style={s.field}>
   <View style={s.team}>{defenderRows.map((fighter,index)=><ArenaProfile key={fighter.character.id} fighter={fighter} side="defender" lane={index} pulse={pulse}/>)}</View>
   <View style={s.centerLine}><Animated.View pointerEvents="none" style={[s.flash,{opacity:flashOpacity}]}/><Animated.View pointerEvents="none" style={[s.slash,{transform:[{scaleX:slashScale},{rotate:'-18deg'}]}]}/><Text style={s.vs}>VS</Text><Text style={s.round}>{st("ROUND 1 · FRONT LANE")}</Text></View>
   <View style={s.team}>{attackerRows.map((fighter,index)=><ArenaProfile key={fighter.character.id} fighter={fighter} side="attacker" lane={index} pulse={pulse}/>)}</View>
  </View>
  <Text style={s.note}>Training preview only. Ranked combat will replace the top row with the server-frozen opponent snapshot when the authenticated Arena service is enabled.</Text>
 </View>;
}

function ArenaProfile({fighter,side,lane,pulse}:{fighter:ArenaFighter;side:'attacker'|'defender';lane:number;pulse:Animated.Value}){
 const st=useSocialText();
 const className=CLASSES.find(def=>def.id===fighter.character.classId)?.name??fighter.character.classId;
 const strike=pulse.interpolate({inputRange:[0,.2,.45,1],outputRange:[0,side==='attacker'?lane===0?8:lane===1?4:1:-8,0,0]});
 return <Animated.View style={[s.profile,{transform:[{translateX:strike}]}]}>
  <View style={[s.portrait,side==='attacker'?s.attackerPortrait:s.defenderPortrait]}>
   <CharacterPortraitSelection classId={fighter.character.classId as ClassId} body={fighter.character.bodyPresentation??'male'} profileIconId={fighter.character.profileIconId??'starting'} compact style={s.image}/>
   <Animated.View pointerEvents="none" style={[s.impact,{opacity:pulse.interpolate({inputRange:[0,.15,.4,1],outputRange:[0,side==='attacker'&&lane===0?0.75:.35,0,0]})}]}/>
  </View>
  <Text numberOfLines={1} style={s.name}>{fighter.label??fighter.character.name}</Text>
  <Text numberOfLines={1} style={s.className}>{className} · Lv {fighter.character.level}</Text>
  {fighter.companionId?<Text numberOfLines={1} style={s.companion}>{st("✦ Companion snapshot")}</Text>:<Text style={s.companionMuted}>{st("No companion equipped")}</Text>}
 </Animated.View>;
}

const s=StyleSheet.create({
 stage:{backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:14,overflow:'hidden'},
 header:{padding:12,flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',gap:8},kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},title:{...typography.title,color:C.text},live:{...typography.caption,color:C.good,fontWeight:'900',letterSpacing:.6},
 field:{padding:10,gap:8,backgroundColor:'#101b2a'},team:{flexDirection:'row',gap:6},profile:{flex:1,minWidth:0,alignItems:'center'},portrait:{width:'100%',height:92,borderRadius:12,overflow:'hidden',alignItems:'center',justifyContent:'flex-end',borderWidth:1,position:'relative'},defenderPortrait:{borderColor:'#b96c78',backgroundColor:'rgba(76,28,45,.55)'},attackerPortrait:{borderColor:'#6ea6c7',backgroundColor:'rgba(28,60,82,.55)'},image:{width:74,height:92},impact:{...StyleSheet.absoluteFillObject,backgroundColor:'#fff1ad'},name:{...typography.caption,color:C.text,fontWeight:'900',textAlign:'center',marginTop:4},className:{fontSize:9,lineHeight:12,color:C.muted,textAlign:'center'},companion:{fontSize:8,lineHeight:11,color:'#ffd36e',fontWeight:'800',textAlign:'center'},companionMuted:{fontSize:8,lineHeight:11,color:C.muted,textAlign:'center'},
 centerLine:{height:28,alignItems:'center',justifyContent:'center',position:'relative'},vs:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:2},round:{fontSize:8,lineHeight:10,color:C.muted,letterSpacing:.7},flash:{position:'absolute',left:'25%',right:'25%',top:5,height:2,backgroundColor:'#fff1ad'},slash:{position:'absolute',left:'22%',right:'22%',top:4,height:3,borderRadius:3,backgroundColor:'#ffd36e',shadowColor:'#fff1ad',shadowOpacity:.9,shadowRadius:5},note:{padding:10,...typography.caption,color:C.muted,lineHeight:15}
});
