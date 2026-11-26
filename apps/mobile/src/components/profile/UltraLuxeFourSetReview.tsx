import {memo,type ReactNode} from 'react';
import type {ImageSourcePropType} from 'react-native';
import {CelestialSovereignPreview} from './CelestialSovereignPreview';
import {DraconicDominionPreview} from './DraconicDominionPreview';
import {AbyssalReviewScene} from './AbyssalReviewScene';
import {ParadoxReviewScene} from './ParadoxReviewScene';
import {getCelestialAssetBundle} from '../../theme/celestial-integration-assets';
import {getDraconicAssets} from '../../theme/draconic-integration-assets';
import {CELESTIAL_IDS} from '../../core/ascendant-cosmetics';
import {eligibleReviewCollections,reviewEquippedTier,type ReviewScope,type ReviewGrantSnapshot} from '../../core/ultra-luxe-review-integration';

type Props={
 reviewEnabled?:boolean;scope:ReviewScope;projection?:ReviewGrantSnapshot;
 selection:{background?:string|null;border?:string|null;pet?:string|null;effect?:string|null;verifiedTitleId?:string|null;displayedBadges:readonly string[]};
 portrait:ReactNode;identity:ReactNode;celestialIdentity?:ReactNode;badges?:ReactNode;guild?:ReactNode;fallback:ReactNode;
 alternatePetSource?:ImageSourcePropType;petAccessibilityLabel?:string;active?:boolean;reduceMotion?:boolean;
};
/** Unified isolated QA entry point. Not imported from live profile routes.
 * Only authenticated, account-scoped projections (or isolated fixtures) may
 * enter this adapter. There is no save, purchase, entitlement or RPC write. */
export const UltraLuxeFourSetReview=memo(function UltraLuxeFourSetReview({reviewEnabled=false,scope,projection,selection,celestialIdentity,badges,...props}:Props){
 const match=reviewEquippedTier(reviewEnabled,scope,projection,selection);
 if(!match)return <>{props.fallback}</>;
 const ids=eligibleReviewCollections(reviewEnabled,scope,projection).map(c=>c.id);
 const fullSet=match.tier==='ascendant';
 if(match.id==='ascendant-abyssal-majesty')return <AbyssalReviewScene {...props} badges={badges} reviewEnabled={reviewEnabled} verifiedCollectionIds={ids} selection={selection}/>;
 if(match.id==='ascendant-paradox-eternal')return <ParadoxReviewScene {...props} badges={badges} reviewEnabled={reviewEnabled} verifiedCollectionIds={ids} selection={selection}/>;
 if(match.id==='ascendant-celestial-sovereign')return <CelestialSovereignPreview {...props} identity={celestialIdentity??props.identity} assets={getCelestialAssetBundle().scene} matchingPetId={CELESTIAL_IDS.pet} equippedPetId={selection.pet} fullSet={fullSet}/>;
 if(match.id==='ascendant-draconic-dominion'){
  const assets=getDraconicAssets();
  return assets?<DraconicDominionPreview {...props} badges={badges} assets={assets.scene} equippedPetId={selection.pet} fullSet={fullSet}/>:<>{props.fallback}</>;
 }
 return <>{props.fallback}</>;
});
