import React from 'react';
import {Image,StyleSheet,View} from 'react-native';
import type {SeasonId,WeatherId} from '../core/types';
import {seasonIconSource,weatherIconSource} from '../theme/environment-assets';

export function EnvironmentArtwork({type,id,size=28}:{type:'season';id:SeasonId;size?:number}|{type:'weather';id:WeatherId;size?:number}){
  const source=type==='season'?seasonIconSource[id]:weatherIconSource[id];
  return <View style={{width:size,height:size}}><Image source={source} resizeMode="contain" fadeDuration={0} style={s.image}/></View>;
}
const s=StyleSheet.create({image:{width:'100%',height:'100%'}});
