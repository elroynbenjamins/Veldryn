import {useEffect,useMemo,useRef} from 'react';
import {Animated,Easing,StyleSheet,Text,View} from 'react-native';
import {dungeonCombatClassFx} from '../core/dungeon-combat-fx';
import type {ClassId} from '../core/types';
import {useGameTheme} from '../theme/ThemeContext';

/**
 * The Guild PvE endpoint exposes aggregate HP, an attempt countdown and final
 * damage totals, but not per-hit events. These are repeating, illustrative
 * class/companion battle motions. They NEVER calculate or decrement HP.
 */
export function guildRaidAttackPresentation(classId:ClassId|undefined){
 const classFx=dungeonCombatClassFx(classId);
 const motion=classFx?.damageMotion??'lunge';
 const kind=motion==='projectile'?'projectile' as const:motion==='cast'||motion==='pulse'?'magic' as const:motion==='smash'?'heavy' as const:'slash' as const;
 return {kind,glyph:classFx?.damageGlyph??'╱',accent:classFx?.damageAccent??'gold'};
}

export function useGuildRaidCombatMotion(active:boolean,reduceMotion:boolean){
 const strike=useRef(new Animated.Value(0)).current;
 const assist=useRef(new Animated.Value(0)).current;
 useEffect(()=>{
  strike.stopAnimation();assist.stopAnimation();strike.setValue(0);assist.setValue(0);
  if(!active||reduceMotion)return;
  // Native-driver-only visual cycles, deliberately independent of server damage.
  const strikes=Animated.loop(Animated.sequence([
   Animated.delay(450),
   Animated.timing(strike,{toValue:1,duration:680,useNativeDriver:true,easing:Easing.out(Easing.cubic)}),
   Animated.timing(strike,{toValue:0,duration:150,useNativeDriver:true}),
   Animated.delay(1150),
  ]));
  const assists=Animated.loop(Animated.sequence([
   Animated.delay(1250),
   Animated.timing(assist,{toValue:1,duration:800,useNativeDriver:true,easing:Easing.out(Easing.cubic)}),
   Animated.timing(assist,{toValue:0,duration:150,useNativeDriver:true}),
   Animated.delay(1500),
  ]));
  strikes.start();assists.start();
  return()=>{strikes.stop();assists.stop();strike.stopAnimation();assist.stopAnimation();};
 },[active,reduceMotion,strike,assist]);
 return {strike,assist};
}

const attackOpacity=(v:Animated.Value)=>v.interpolate({inputRange:[0,.09,.48,.85,1],outputRange:[0,1,.9,.2,0]});
const fly=(v:Animated.Value,from:number,to:number)=>v.interpolate({inputRange:[0,1],outputRange:[from,to]});

export function GuildRaidCombatOverlay({classId,companionEquipped,strike,assist,active,reduceMotion=false}:{
 classId?:ClassId;companionEquipped:boolean;strike:Animated.Value;assist:Animated.Value;active:boolean;reduceMotion?:boolean;
}){
 const C=useGameTheme(),s=useMemo(()=>styles(),[]),attack=guildRaidAttackPresentation(classId);
 if(!active||reduceMotion)return null;
 const attackColor=attack.accent==='gold'?C.warning:attack.accent==='cyan'?C.info:attack.accent==='danger'?C.bad:attack.accent==='violet'?C.special:C.good;
 const projectile=attack.kind==='projectile',magic=attack.kind==='magic',heavy=attack.kind==='heavy';
 const moveX=fly(strike,projectile?-125:heavy?-35:-55,projectile?28:10);
 const moveY=fly(strike,magic?25:projectile?20:heavy?-45:48,magic?-24:heavy?24:-20);
 const impactScale=strike.interpolate({inputRange:[0,.5,1],outputRange:[.55,1.35,1.85]});
 return <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
  <Animated.View style={[s.strike,{opacity:attackOpacity(strike),transform:[{translateX:moveX},{translateY:moveY},{rotate:magic?'0deg':heavy?'-22deg':'-42deg'},{scale:impactScale}]}]}>
   <Text style={[s.strikeGlyph,{color:attackColor,fontSize:projectile?43:heavy?60:52}]}>{magic?'✦':projectile?'➤':heavy?'◆':attack.glyph}</Text>
   {!magic&&!projectile?<View style={[s.blade,{backgroundColor:attackColor}]}/>:null}
   {magic?<View style={[s.magicRing,{borderColor:attackColor}]}/>:null}
  </Animated.View>
  <Animated.View style={[s.impactRing,{borderColor:attackColor,opacity:strike.interpolate({inputRange:[0,.32,.55,1],outputRange:[0,0,.65,0]}),transform:[{scale:impactScale}]}]}/>
  {companionEquipped?<Animated.View style={[s.companionStrike,{opacity:attackOpacity(assist),transform:[{translateX:fly(assist,98,-28)},{translateY:fly(assist,42,-34)},{scale:assist.interpolate({inputRange:[0,.5,1],outputRange:[.65,1.6,1]})}]}]}><Text style={[s.companionGlyph,{color:C.special}]}>✧</Text></Animated.View>:null}
 </View>;
}

/**
 * Always shows server-confirmed shared guild HP. Repeating hits illuminate the
 * frame, never its fill width. Only a new server damage total animates the fill.
 */
export function GuildRaidBossHpMeter({maxHp,damage,strike,active,reduceMotion=false,numberText,accent,label}:{
 maxHp:number;damage:number;strike:Animated.Value;active:boolean;reduceMotion?:boolean;numberText:string;accent:string;label:string;
}){
 const C=useGameTheme(),s=useMemo(()=>styles(),[]),safeMax=Math.max(1,maxHp);
 const pct=Math.max(0,Math.min(100,(1-Math.max(0,damage)/safeMax)*100));
 const fill=useRef(new Animated.Value(pct)).current,previousDamage=useRef(damage);
 const confirmation=useRef(new Animated.Value(0)).current;
 useEffect(()=>{
  fill.stopAnimation();
  if(reduceMotion){fill.setValue(pct);}
  else Animated.timing(fill,{toValue:pct,duration:650,easing:Easing.out(Easing.quad),useNativeDriver:false}).start();
  if(previousDamage.current!==damage){
   if(!reduceMotion){confirmation.setValue(0);Animated.sequence([
    Animated.timing(confirmation,{toValue:1,duration:170,useNativeDriver:true}),
    Animated.timing(confirmation,{toValue:0,duration:450,useNativeDriver:true}),
   ]).start();}
   previousDamage.current=damage;
  }
  return()=>{fill.stopAnimation();confirmation.stopAnimation();};
 },[pct,damage,reduceMotion,fill,confirmation]);
 const shimmer=active&&!reduceMotion?strike.interpolate({inputRange:[0,.24,.58,.9,1],outputRange:[0,.04,.5,.06,0]}):0;
 return <View style={[s.hpPanel,{borderColor:C.line,backgroundColor:C.panel}]}>
  <View style={s.hpHead}><Text style={[s.hpLabel,{color:C.text}]}>{label}</Text><Text style={[s.hpValue,{color:C.text}]}>{numberText}</Text></View>
  <View accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{min:0,max:100,now:Math.round(pct)}} style={[s.hpTrack,{backgroundColor:C.panel2}]}>
   <Animated.View style={[s.hpFill,{backgroundColor:accent,width:fill.interpolate({inputRange:[0,100],outputRange:['0%','100%']})}]}/>
   <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill,{backgroundColor:accent,opacity:shimmer}]}/>
   <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill,{backgroundColor:C.warning,opacity:confirmation}]}/>
  </View>
 </View>;
}

function styles(){return StyleSheet.create({
 strike:{position:'absolute',left:'46%',top:'35%',width:75,height:75,alignItems:'center',justifyContent:'center',zIndex:3},
 strikeGlyph:{fontWeight:'900',textShadowColor:'rgba(0,0,0,.95)',textShadowRadius:11,textShadowOffset:{width:0,height:2}},
 blade:{position:'absolute',height:5,width:75,borderRadius:4,transform:[{rotate:'-35deg'}]},
 magicRing:{position:'absolute',height:66,width:66,borderWidth:3,borderRadius:35},
 impactRing:{position:'absolute',left:'50%',top:'43%',marginLeft:-29,marginTop:-29,height:58,width:58,borderWidth:3,borderRadius:30},
 companionStrike:{position:'absolute',left:'53%',top:'34%',width:52,height:52,alignItems:'center',justifyContent:'center',zIndex:3},
 companionGlyph:{fontSize:51,fontWeight:'900',textShadowColor:'rgba(0,0,0,.9)',textShadowRadius:12,textShadowOffset:{width:0,height:2}},
 hpPanel:{padding:12,gap:9,borderWidth:1,borderRadius:14},
 hpHead:{flexDirection:'row',justifyContent:'space-between',flexWrap:'wrap',gap:8,alignItems:'center'},
 hpLabel:{fontSize:12,fontWeight:'800'},hpValue:{fontSize:12,fontWeight:'800',fontVariant:['tabular-nums']},
 hpTrack:{height:13,borderRadius:8,overflow:'hidden'},
 hpFill:{height:'100%',borderRadius:8},
 });}
