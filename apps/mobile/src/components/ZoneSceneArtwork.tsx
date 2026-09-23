import {useMemo} from 'react';
import {Image,StyleSheet,View,type ImageSourcePropType} from 'react-native';
import {RegionArtwork} from './RegionArtwork';

const zoneSceneSourceById:Readonly<Partial<Record<string,ImageSourcePropType>>>={};

/**
 * Scenic zone hero art entrypoint.
 * Falls back to the approved world-map crop until a dedicated zone scene is supplied.
 * Keeping the fallback here lets travel/world surfaces adopt new scenes without layout rewrites.
 */
export function ZoneSceneArtwork({regionId,muted=false,blurRadius=1}:{regionId:string;muted?:boolean;blurRadius?:number}){
  const source=zoneSceneSourceById[regionId];
  const imageStyle=useMemo(()=>[StyleSheet.absoluteFillObject,muted&&s.muted],[muted]);
  if(!source)return <RegionArtwork regionId={regionId} muted={muted}/>;
  return <View pointerEvents="none" accessible={false} style={s.crop}>
    <Image source={source} resizeMode="cover" blurRadius={blurRadius} fadeDuration={0} style={imageStyle}/>
  </View>;
}
const s=StyleSheet.create({crop:{...StyleSheet.absoluteFillObject,overflow:'hidden'},muted:{opacity:.58}});
