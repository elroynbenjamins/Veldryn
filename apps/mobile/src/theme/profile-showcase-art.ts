import type {ImageSourcePropType} from 'react-native';
import type {ProfileCollectionRefV43} from '../online/profile-extension-v43';
import {petArtSource} from './pet-art';
import {companionArtSource} from './companion-art';
import {profileBackgroundPreviewById} from './profile-background-assets';
import {profileBorderSourceById} from './profile-border-assets';
import {craftedItemIcons} from './crafted-item-assets';

export function profileShowcaseArt(ref:ProfileCollectionRefV43):ImageSourcePropType|undefined{
 if(ref.kind==='pet')return petArtSource(ref.id);
 if(ref.kind==='companion')return companionArtSource(ref.id);
 if(ref.kind==='background')return profileBackgroundPreviewById.get(ref.id)?.source;
 if(ref.kind==='border')return profileBorderSourceById.get(ref.id);
 if(ref.kind==='item')return craftedItemIcons[ref.id as keyof typeof craftedItemIcons];
 return undefined;
}
