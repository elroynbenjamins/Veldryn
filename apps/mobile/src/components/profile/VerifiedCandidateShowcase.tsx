import {useState} from 'react';
import {View,useWindowDimensions} from 'react-native';
import {useCosmeticMotionPolicy,useLoopProgress} from '../anim/motion';
import {NEXT_PREMIUM_SETS,NEXT_PREMIUM_STAGE,nextPremiumStageSupported} from '../../core/next-premium-set-review';
import {NextPremiumShowcaseReview,NextPremiumStandardBorderEffects} from './NextPremiumShowcaseReview';
import {AbyssalMajestyPreview} from './AbyssalMajestyPreview';
import {ParadoxEternalPreview} from './ParadoxEternalPreview';
import {AbyssalStandardBorderEffects} from './AbyssalBorderLight';
import {ParadoxStandardBorderEffects} from './ParadoxBorderLight';
import {getAbyssalReviewAssets} from '../../theme/abyssal-integration-assets';
import {getParadoxReviewAssets} from '../../theme/paradox-integration-assets';
import {ABYSSAL_IDS} from '../../core/abyssal-showcase-layout';
import {PARADOX_IDS} from '../../core/paradox-showcase-layout';
import type {ComponentProps} from 'react';
type Props=Omit<ComponentProps<typeof AbyssalMajestyPreview>,'assets'> & {collectionId:string;displayedBadges?:readonly string[]};
/** The caller already checked the authenticated self/public appearance gate. */
function NextVerifiedShowcase({collectionId,displayedBadges=[],active=false,reduceMotion=false,equippedPetId,alternatePetSource,portrait,identity,badges,guild,fallback,fullSet=false}:Props){
 const [width,setWidth]=useState(0),{fontScale}=useWindowDimensions();
 const set=NEXT_PREMIUM_SETS.find(s=>s.id===collectionId);
 const supported=!!set&&nextPremiumStageSupported(width,fontScale);
 const {running}=useCosmeticMotionPolicy(active&&supported,reduceMotion);
 const clock=useLoopProgress(NEXT_PREMIUM_STAGE.loopMs,running);
 const matchingBadge=set&&displayedBadges.includes(set.badge)?set.badge:undefined;
 return <View style={{width:'100%',maxWidth:NEXT_PREMIUM_STAGE.maxWidth,alignSelf:'center'}} onLayout={e=>{const next=e.nativeEvent.layout.width;setWidth(old=>Math.abs(old-next)<.5?old:next);}}>
  <NextPremiumShowcaseReview setId={collectionId} width={width} fontScale={fontScale} clock={clock} running={running} petId={equippedPetId??undefined} alternatePetArt={alternatePetSource} badgeId={matchingBadge} fullSet={fullSet} portrait={portrait} identity={identity} badges={badges} guild={guild} fallback={fallback}/>
 </View>;
}
export function VerifiedCandidateShowcase({collectionId,...props}:Props){
 if(collectionId==='ascendant-abyssal-majesty')return <AbyssalMajestyPreview {...props} assets={getAbyssalReviewAssets().scene}/>;
 if(collectionId==='ascendant-paradox-eternal')return <ParadoxEternalPreview {...props} assets={getParadoxReviewAssets().scene}/>;
 if(NEXT_PREMIUM_SETS.some(s=>s.id===collectionId))return <NextVerifiedShowcase {...props} collectionId={collectionId}/>;
 return <>{props.fallback}</>;
}
export function VerifiedCandidateBorderEffects({id,active,reduceMotion}:{id:string;active:boolean;reduceMotion?:boolean}){
 if(id===ABYSSAL_IDS.border)return <AbyssalStandardBorderEffects active={active} reduceMotion={reduceMotion} art={getAbyssalReviewAssets().scene}/>;
 if(id===PARADOX_IDS.border)return <ParadoxStandardBorderEffects active={active} reduceMotion={reduceMotion} art={getParadoxReviewAssets().scene}/>;
 const set=NEXT_PREMIUM_SETS.find(s=>s.border===id);
 return set?<NextPremiumStandardBorderEffects set={set} active={active} reduceMotion={reduceMotion}/>:null;
}
