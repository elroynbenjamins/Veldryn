import {memo,useMemo,type ReactNode} from 'react';
import {Animated,Image,StyleSheet,View,type ImageSourcePropType} from 'react-native';
import {NEXT_PREMIUM_SETS,NEXT_PREMIUM_STAGE,nextPremiumBoxes,nextPremiumStageSupported,nextPremiumPetMode,type NextPremiumSet} from '../../core/next-premium-set-review';
import {ORNAMENT_PHASE,sakuraV2OrnamentTracks,stormforgedV2OrnamentTracks} from '../../core/next-premium-motion-review';
import {NEXT_ENVIRONMENT_PHASE,nextPremiumEnvironmentTracks} from '../../core/next-premium-environment-review';
import {getNextPremiumReviewFrame} from '../../theme/next-premium-frame-review-assets';
import {getNextPremiumReviewBackground} from '../../theme/next-premium-background-review-assets';
import {getNextPremiumReviewPet} from '../../theme/next-premium-pet-review-assets';
import {getNextPremiumReviewDecoration} from '../../theme/next-premium-decoration-review-assets';
import {NextPremiumPetReviewSprite} from './NextPremiumPetReviewSprite';

type Sample={x:number;y:number;opacity:number;scale:number;rotate?:number};
type Track={kind:string;radius:number;frames:Sample[]};
type Art=NonNullable<ReturnType<typeof getNextPremiumReviewDecoration>>;
type Props={
 setId:string;width:number;fontScale:number;clock:Animated.Value;running:boolean;
 /** Review fixture explicitly supplies selections. This is not ownership validation. */
 petId?:string;alternatePetArt?:ImageSourcePropType;badgeId?:string;fullSet:boolean;
 identity:ReactNode;guild?:ReactNode;fallback:ReactNode;
};
type LayerProps={clock:Animated.Value;track:Track;phase:number[];source:ImageSourcePropType;ratio:number};
const FxNode=memo(function FxNode({clock,track,phase,source,ratio}:LayerProps){
 // Inscribed square: rotating its corners cannot exceed the tested radial bound.
 const size=track.radius*Math.SQRT2*ratio;
 const style=useMemo(()=>{
  const values=track.frames;
  return {opacity:clock.interpolate({inputRange:phase,outputRange:values.map(f=>f.opacity),extrapolate:'clamp'}),
   transform:[
    {translateX:clock.interpolate({inputRange:phase,outputRange:values.map(f=>f.x*ratio-size/2),extrapolate:'clamp'})},
    {translateY:clock.interpolate({inputRange:phase,outputRange:values.map(f=>f.y*ratio-size/2),extrapolate:'clamp'})},
    {scale:clock.interpolate({inputRange:phase,outputRange:values.map(f=>f.scale),extrapolate:'clamp'})},
    {rotate:clock.interpolate({inputRange:phase,outputRange:values.map(f=>(f.rotate??0)+'deg'),extrapolate:'clamp'})},
   ]};
 },[clock,track,phase,ratio,size]);
 return <Animated.Image accessible={false} source={source} resizeMode="contain" fadeDuration={0} style={[s.fx,{width:size,height:size},style]}/>;
});
const FxLayer=memo(function FxLayer({set,art,clock,ratio,fullSet,environment}:{set:NextPremiumSet;art:Art;clock:Animated.Value;ratio:number;fullSet:boolean;environment:boolean}){
 const tracks=useMemo(()=>environment?nextPremiumEnvironmentTracks(set.motion,fullSet):
  set.motion==='petal-waltz'?sakuraV2OrnamentTracks('showcase',fullSet):stormforgedV2OrnamentTracks('showcase',fullSet),[set,environment,fullSet]);
 const phase=environment?NEXT_ENVIRONMENT_PHASE:ORNAMENT_PHASE;
 return <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
  {tracks.map((track,i)=><FxNode key={i} clock={clock} track={track} phase={phase} ratio={ratio}
   source={track.kind==='haze'?art.haze:track.kind==='petal'||track.kind==='mote'||track.kind==='rail'?art.particle:art.glow}/>)}
 </View>;
});
const Stage=memo(function Stage({set,props,background,border,pet,art}:{set:NextPremiumSet;props:Props;background:ImageSourcePropType;border:ImageSourcePropType;pet:NonNullable<ReturnType<typeof getNextPremiumReviewPet>>;art:Art}){
 const {width,clock,running,petId,alternatePetArt,badgeId,fullSet,identity,guild}=props;
 const ratio=width/NEXT_PREMIUM_STAGE.width,height=NEXT_PREMIUM_STAGE.height*ratio;
 const b=nextPremiumBoxes(set);
 const box=(v:{x:number;y:number;w:number;h:number})=>({position:'absolute' as const,left:v.x*ratio,top:v.y*ratio,width:v.w*ratio,height:v.h*ratio});
 const mode=nextPremiumPetMode(set,petId,!!alternatePetArt);
 const synchronized=fullSet&&mode==='matching'&&badgeId===set.badge;
 return <View style={[s.stage,{width,height}]}>
  <Image accessible={false} source={background} resizeMode="stretch" fadeDuration={0} style={s.cover}/>
  {running&&<FxLayer set={set} art={art} clock={clock} ratio={ratio} fullSet={synchronized} environment/>}
  {mode==='matching'&&<View pointerEvents="none" style={box(b.pet)}>
   <NextPremiumPetReviewSprite source={pet.showcase} atlas={pet.atlas} clock={clock} width={b.pet.w*ratio} height={b.pet.h*ratio} running={running}/>
  </View>}
  {mode==='alternate'&&alternatePetArt&&<Image accessible={false} source={alternatePetArt} resizeMode="contain" fadeDuration={0} style={box(b.alternatePet)}/>}
  <View style={[box(b.identity),s.identity]}>
   <View style={s.identityContent}>{identity}</View>
   {badgeId===set.badge&&<Image accessible accessibilityLabel={set.badgeName} source={art.badge} resizeMode="contain" fadeDuration={0} style={{width:24*ratio,height:24*ratio}}/>}
  </View>
  {guild!=null&&<View style={[box(b.guild),s.guild]}>{guild}</View>}
  <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
   <Image accessible={false} source={border} resizeMode="stretch" fadeDuration={0} style={s.cover}/>
   {running&&<FxLayer set={set} art={art} clock={clock} ratio={ratio} fullSet={synchronized} environment={false}/>}
  </View>
 </View>;
});
/** Complete isolated review composition, not a live profile route.
 * Caller owns native clock (linear 0..1 over 24s), visibility, foreground and motion preference.
 * Never mount in production until ownership, fallback, native parity and lifecycle are verified. */
export const NextPremiumShowcaseReview=memo(function NextPremiumShowcaseReview(props:Props){
 const set=NEXT_PREMIUM_SETS.find(s=>s.id===props.setId);
 if(!set||!nextPremiumStageSupported(props.width,props.fontScale))return <>{props.fallback}</>;
 const background=getNextPremiumReviewBackground(set.background,'wide');
 const border=getNextPremiumReviewFrame(set.border,'showcase');
 const pet=getNextPremiumReviewPet(set.pet);
 const art=getNextPremiumReviewDecoration(set.id);
 if(!background||!border||!pet||!art)return <>{props.fallback}</>;
 return <Stage set={set} props={props} background={background} border={border} pet={pet} art={art}/>;
});
const s=StyleSheet.create({
 stage:{position:'relative',overflow:'hidden'},
 cover:{position:'absolute',top:0,left:0,width:'100%',height:'100%'},
 fx:{position:'absolute',top:0,left:0},
 identity:{flexDirection:'row',alignItems:'center',paddingHorizontal:4,backgroundColor:'rgba(8,10,20,0.70)',borderRadius:5},
 identityContent:{flex:1,minWidth:0},
 guild:{justifyContent:'center',paddingHorizontal:4,backgroundColor:'rgba(8,10,20,0.70)',borderRadius:4},
});
