import {AbyssalMajestyPreview} from './AbyssalMajestyPreview';
import {ParadoxEternalPreview} from './ParadoxEternalPreview';
import {AbyssalStandardBorderEffects} from './AbyssalBorderLight';
import {ParadoxStandardBorderEffects} from './ParadoxBorderLight';
import {getAbyssalReviewAssets} from '../../theme/abyssal-integration-assets';
import {getParadoxReviewAssets} from '../../theme/paradox-integration-assets';
import {ABYSSAL_IDS} from '../../core/abyssal-showcase-layout';
import {PARADOX_IDS} from '../../core/paradox-showcase-layout';
import type {ComponentProps} from 'react';
type Props=Omit<ComponentProps<typeof AbyssalMajestyPreview>,'assets'> & {collectionId:string};
export function VerifiedCandidateShowcase({collectionId,...props}:Props){
 if(collectionId==='ascendant-abyssal-majesty')return <AbyssalMajestyPreview {...props} assets={getAbyssalReviewAssets().scene}/>;
 if(collectionId==='ascendant-paradox-eternal')return <ParadoxEternalPreview {...props} assets={getParadoxReviewAssets().scene}/>;
 return <>{props.fallback}</>;
}
export function VerifiedCandidateBorderEffects({id,active,reduceMotion}:{id:string;active:boolean;reduceMotion?:boolean}){
 if(id===ABYSSAL_IDS.border)return <AbyssalStandardBorderEffects active={active} reduceMotion={reduceMotion} art={getAbyssalReviewAssets().scene}/>;
 if(id===PARADOX_IDS.border)return <ParadoxStandardBorderEffects active={active} reduceMotion={reduceMotion} art={getParadoxReviewAssets().scene}/>;
 return null;
}
