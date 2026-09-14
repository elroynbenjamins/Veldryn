import {useState} from 'react';
import {Image,StyleSheet,View} from 'react-native';
import {WORLD_ZONES} from '../content/world-map';

/** Reframes the approved Asterfall map around a region; no additional location lore or unlocks. */
export function RegionArtwork({regionId,muted=false}:{regionId:string;muted?:boolean}){
  const [size,setSize]=useState({width:0,height:0});
  const zone=WORLD_ZONES.find(item=>item.id===regionId)??WORLD_ZONES[0];
  const width=Math.max(size.width*3,size.height*2),height=width*(1537/1023);
  const left=Math.min(0,Math.max(size.width-width,size.width/2-zone.x*width));
  const top=Math.min(0,Math.max(size.height-height,size.height/2-zone.y*height));
  return <View accessible={false} pointerEvents="none" onLayout={event=>{const {width,height}=event.nativeEvent.layout;setSize(old=>old.width===width&&old.height===height?old:{width,height});}} style={[StyleSheet.absoluteFill,s.crop,muted&&{opacity:.4}]}>
    {size.width>0&&<Image source={require('../../assets/world/asterfall-map-v1.png')} resizeMode="stretch" fadeDuration={0} style={{position:'absolute',width,height,left,top}}/>}
  </View>;
}
const s=StyleSheet.create({crop:{overflow:'hidden',backgroundColor:'#101a24'}});
