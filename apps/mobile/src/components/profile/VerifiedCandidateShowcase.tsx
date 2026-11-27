import {AbyssalMajestyPreview} from './AbyssalMajestyPreview';
import {ParadoxEternalPreview} from './ParadoxEternalPreview';
import {AbyssalStandardBorderEffects} from './AbyssalBorderLight';
import {ParadoxStandardBorderEffects} from './ParadoxBorderLight';
import {getAbyssalReviewAssets} from '../../theme/abyssal-integration-assets';
import {getParadoxReviewAssets} from '../../theme/paradox-integration-assets';
import {ABYSSAL_IDS} from '../../core/abyssal-showcase-layout';
import {PARADOX_IDS} from '../../core/paradox-showcase-layout';
import {useState,type ComponentProps} from 'react';
import {View,useWindowDimensions} from 'react-native';
import {useCosmeticMotionPolicy,useLoopProgress} from '../anim/motion';
import {NEXT_PREMIUM_SETS,NEXT_PREMIUM_STAGE,nextPremiumStageSupported} from '../../core/next-premium-set-review';
import {NextPremiumShowcaseReview,NextPremiumStandardBorderEffects} from './NextPremiumShowcaseReview';
type Props=Omit<ComponentProps<typeof AbyssalMajestyPreview>,'assets'> & {collectionId:string};
export function VerifiedCandidateShowcase({collectionId,...props}:Props){
 if(collectionId==='ascendant-abyssal-majesty')return <AbyssalMajestyPreview {...props} assets={getAbyssalReviewAssets().scene}/>;
 if(collectionId==='ascendant-paradox-eternal')return <ParadoxEternalPreview {...props} assets={getParadoxReviewAssets().scene}/>;
 if(NEXT_PREMIUM_SETS.some(set=>set.id===collectionId))return <VerifiedNextPremiumShowcase collectionId={collectionId} {...props}/>;
 return <>{props.fallback}</>;
}
/** Only reachable through the existing verified collection/pair selector. Keep
 * unsupported sizes static and do not infer a badge or full-set from artwork. */
function VerifiedNextPremiumShowcase({collectionId,equippedPetId,alternatePetSource,portrait,identity,badges,guild,fallback,fullSet=false,active=false,reduceMotion=false}:Props){
 const [width,setWidth]=useState(0),{fontScale}=useWindowDimensions();
 const set=NEXT_PREMIUM_SETS.find(row=>row.id===collectionId);
 const supported=!!set&&nextPremiumStageSupported(width,fontScale);
 const {running}=useCosmeticMotionPolicy(active&&supported,reduceMotion);
 const clock=useLoopProgress(NEXT_PREMIUM_STAGE.loopMs,running);
 return <View style={{width:'100%',maxWidth:NEXT_PREMIUM_STAGE.maxWidth,alignSelf:'center'}} onLayout={e=>{const next=e.nativeEvent.layout.width;setWidth(old=>Math.abs(old-next)<.5?old:next);}}>
  {supported&&set?<NextPremiumShowcaseReview setId={set.id} width={width} fontScale={fontScale} clock={clock} running={running} petId={equippedPetId??undefined} alternatePetArt={alternatePetSource} badgeId={fullSet?set.badge:undefined} fullSet={fullSet} portrait={portrait} identity={identity} badges={badges} guild={guild} fallback={fallback}/>:fallback}
 </View>;
}
export function VerifiedCandidateBorderEffects({id,active,reduceMotion}:{id:string;active:boolean;reduceMotion?:boolean}){
 if(id===ABYSSAL_IDS.border)return <AbyssalStandardBorderEffects active={active} reduceMotion={reduceMotion} art={getAbyssalReviewAssets().scene}/>;
 if(id===PARADOX_IDS.border)return <ParadoxStandardBorderEffects active={active} reduceMotion={reduceMotion} art={getParadoxReviewAssets().scene}/>;
 const set=NEXT_PREMIUM_SETS.find(s=>s.border===id);
 return set?<NextPremiumStandardBorderEffects set={set} active={active} reduceMotion={reduceMotion}/>:null;
}
