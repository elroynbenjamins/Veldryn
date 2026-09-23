import {useMemo} from 'react';
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
  const imageStyle=useMemo(()=>[StyleSheet.absoluteFillObject,muted&&s.muted],[muted]);
  if(!cell)return <RegionArtwork regionId={regionId} muted={muted}/>;
  return <View pointerEvents="none" accessible={false} style={s.crop}>
    <AtlasScene cell={cell} muted={muted} blurRadius={blurRadius}/>
  </View>;
}

function AtlasScene({cell,muted,blurRadius}:{cell:ZoneSceneCell;muted:boolean;blurRadius:number}){
  return <View style={StyleSheet.absoluteFill} onLayout={()=>{}}>
    <Image
      source={zoneSceneSheet}
      resizeMode="stretch"
      blurRadius={blurRadius}
      fadeDuration={0}
      style={[
        StyleSheet.absoluteFillObject,
        {
          width:ZONE_SCENE_SHEET_WIDTH*2,
          height:ZONE_SCENE_SHEET_HEIGHT*2,
          left:-cell.column*ZONE_SCENE_CELL_WIDTH*2,
          top:-cell.row*ZONE_SCENE_CELL_HEIGHT*2,
        },
        muted&&s.muted,
      ]}
    />
  </View>;
}

const s=StyleSheet.create({crop:{...StyleSheet.absoluteFillObject,overflow:'hidden',backgroundColor:'#101a24'},muted:{opacity:.52}});
