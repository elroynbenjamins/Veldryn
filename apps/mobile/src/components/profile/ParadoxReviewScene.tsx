import {memo,type ComponentProps} from 'react';
import {ParadoxEternalPreview,type ParadoxSceneAssets} from './ParadoxEternalPreview';
import {paradoxReviewTier,type ParadoxSelection} from '../../core/paradox-showcase-layout';
import {getParadoxReviewFrames,getParadoxReviewBackgrounds} from '../../theme/paradox-integration-assets';
type Props=Omit<ComponentProps<typeof ParadoxEternalPreview>,'assets'|'equippedPetId'|'fullSet'> & {
 reviewEnabled?:boolean;verifiedCollectionIds:readonly string[];selection:ParadoxSelection;art:Omit<ParadoxSceneAssets,'border'|'background'>;
};
/** Review-only: the production server must independently authorize grants.
 * Candidate pet and textures come from the isolated review caller. */
export const ParadoxReviewScene=memo(function ParadoxReviewScene({reviewEnabled=false,verifiedCollectionIds,selection,art,...props}:Props){
 const tier=paradoxReviewTier(reviewEnabled,verifiedCollectionIds,selection);
 if(tier==='hidden')return <>{props.fallback}</>;
 return <ParadoxEternalPreview {...props} assets={{...art,border:getParadoxReviewFrames().showcase,background:getParadoxReviewBackgrounds().showcase}} equippedPetId={selection.pet} fullSet={tier==='ascendant'}/>;
});
