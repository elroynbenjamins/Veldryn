import type {ImageSourcePropType} from 'react-native';
import {art} from '../features/chat-pilot/src/native/assets';

export function chatEmoteArtwork(id:string):ImageSourcePropType|undefined{
  return art['emotes/'+id];
}
