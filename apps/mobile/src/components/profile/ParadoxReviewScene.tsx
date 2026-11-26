import {memo,type ComponentProps} from 'react';
import {ParadoxEternalPreview} from './ParadoxEternalPreview';
import {paradoxReviewTier,type ParadoxSelection} from '../../core/paradox-showcase-layout';
import {getParadoxReviewAssets} from '../../theme/paradox-integration-assets';
type Props=Omit<ComponentProps<typeof ParadoxEternalPreview>,'assets'|'equippedPetId'|'fullSet'> & {
 reviewEnabled?:boolean;verifiedCollectionIds:readonly string[];selection:ParadoxSelection;
};
/** Review-only: the production server must independently authorize grants.
 * All artwork is from the dedicated review registry. */
export const ParadoxReviewScene=memo(function ParadoxReviewScene({reviewEnabled=false,verifiedCollectionIds,selection,...props}:Props){
 const tier=paradoxReviewTier(reviewEnabled,verifiedCollectionIds,selection);
 if(tier==='hidden')return <>{props.fallback}</>;
 return <ParadoxEternalPreview {...props} assets={getParadoxReviewAssets().scene} equippedPetId={selection.pet} fullSet={tier==='ascendant'}/>;
});
