import {useState} from 'react';
import {Image,StyleSheet,View} from 'react-native';
import {RegionArtwork} from './RegionArtwork';

const ZONE_SCENE_CELL_WIDTH=128;
const ZONE_SCENE_CELL_HEIGHT=64;
const ZONE_SCENE_SHEET_WIDTH=256;
const ZONE_SCENE_SHEET_HEIGHT=256;
const zoneSceneSheet=require('../../assets/world/world-zone-scenes-v1.jpg');

interface ZoneSceneCell{column:0|1;row:0|1|2|3;}
const zoneSceneCellById:Readonly<Record<string,ZoneSceneCell>>={
  GREENFIELDS:{column:0,row:0},
  SILVERBROOK:{column:1,row:0},
  IRONWOOD:{column:0,row:1},
  OLD_MINES:{column:1,row:1},
  KINGS_ROAD:{column:0,row:2},
  SUNSCAR:{column:1,row:2},
  FROSTMARCH:{column:0,row:3},
  ASHLANDS:{column:1,row:3},
};

/**
 * Scenic travel/world artwork. Every current travel region has a dedicated
 * scene cell; unknown future regions safely fall back to the world-map crop.
 */
export function ZoneSceneArtwork({regionId,muted=false,blurRadius=1}:{regionId:string;muted?:boolean;blurRadius?:number}){
  const cell=zoneSceneCellById[regionId];
  const [size,setSize]=useState({width:0,height:0});
  if(!cell)return <RegionArtwork regionId={regionId} muted={muted}/>;
  const scale=size.width&&size.height?Math.max(size.width/ZONE_SCENE_CELL_WIDTH,size.height/ZONE_SCENE_CELL_HEIGHT):1;
  const cellWidth=ZONE_SCENE_CELL_WIDTH*scale,cellHeight=ZONE_SCENE_CELL_HEIGHT*scale;
  const sheetWidth=ZONE_SCENE_SHEET_WIDTH*scale,sheetHeight=ZONE_SCENE_SHEET_HEIGHT*scale;
  const left=-cell.column*cellWidth+(size.width-cellWidth)/2;
  const top=-cell.row*cellHeight+(size.height-cellHeight)/2;
  return <View
    pointerEvents="none"
    accessible={false}
    onLayout={event=>{const {width,height}=event.nativeEvent.layout;setSize(old=>old.width===width&&old.height===height?old:{width,height});}}
    style={[StyleSheet.absoluteFill,s.crop,muted&&s.muted]}
  >
    {size.width>0&&<Image
      source={zoneSceneSheet}
      resizeMode="stretch"
      blurRadius={blurRadius}
      fadeDuration={0}
      style={{position:'absolute',width:sheetWidth,height:sheetHeight,left,top}}
    />}
  </View>;
}

const s=StyleSheet.create({crop:{overflow:'hidden',backgroundColor:'#101a24'},muted:{opacity:.52}});
