import {Image,StyleSheet,View} from 'react-native';
import {RegionArtwork} from './RegionArtwork';
import {regionScenes} from '../theme/upgraded-artwork';

/** Dedicated panoramas replace enlarged 128px atlas cells. */
export function ZoneSceneArtwork({regionId,muted=false,blurRadius=0}:{regionId:string;muted?:boolean;blurRadius?:number}){
  const source=regionScenes[regionId];
  return <View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill,s.crop,muted&&s.muted]}>
    {source?<Image accessible={false} source={source} resizeMode="cover" blurRadius={blurRadius} fadeDuration={0} style={[StyleSheet.absoluteFill,{width:'100%',height:'100%'}]}/>:<RegionArtwork regionId={regionId}/>}
  </View>;
}

const s=StyleSheet.create({crop:{overflow:'hidden'},muted:{opacity:.52}});
