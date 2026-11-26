import {memo,type ComponentProps} from 'react';
import {AbyssalMajestyPreview} from './AbyssalMajestyPreview';
import {getAbyssalReviewAssets} from '../../theme/abyssal-integration-assets';
import {abyssalReviewTier,type AbyssalReviewSelection} from '../../core/abyssal-showcase-layout';

type PreviewProps=ComponentProps<typeof AbyssalMajestyPreview>;
type Props=Omit<PreviewProps,'assets'|'equippedPetId'|'fullSet'> & {
 reviewEnabled?:boolean;
 /** Must be supplied by a trusted server grant projection or isolated QA fixture.
  * Never populate from mutable local save arrays or arbitrary profile text. */
 verifiedCollectionIds:readonly string[];
 selection:AbyssalReviewSelection;
};
/** No live navigation entry or save mutation. Until the server catalogue supports
 * the new collection, real accounts cannot satisfy the verified grant contract. */
export const AbyssalReviewScene=memo(function AbyssalReviewScene({reviewEnabled=false,verifiedCollectionIds,selection,...props}:Props){
 const tier=abyssalReviewTier(reviewEnabled,verifiedCollectionIds,selection);
 if(tier==='hidden')return <>{props.fallback}</>;
 return <AbyssalMajestyPreview {...props} assets={getAbyssalReviewAssets().scene}
  equippedPetId={selection.pet} fullSet={tier==='ascendant'}/>;
});
