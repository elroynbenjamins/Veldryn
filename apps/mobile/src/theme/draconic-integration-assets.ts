import type {ImageSourcePropType} from 'react-native';
import type {DraconicSceneAssets} from '../components/profile/DraconicDominionPreview';
export type DraconicAssetBundle={scene:DraconicSceneAssets;standardBorder:ImageSourcePropType;backgroundSquare:ImageSourcePropType;petRegular:ImageSourcePropType;petPortrait:ImageSourcePropType;badge:ImageSourcePropType};
/** Binary import safety only, never a public discovery/release switch. Replace with the verified static registry when textures are committed. */
export function getDraconicAssets():DraconicAssetBundle|undefined{return undefined;}
