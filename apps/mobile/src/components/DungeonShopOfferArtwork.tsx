import {Image,View} from 'react-native';
import {UiIcon} from './UiIcon';
import {dungeonShopOfferArt,dungeonShopMaterialAtlas,dungeonShopMaterialAtlasCell} from '../theme/dungeon-shop-art';

/** Deliberately never gates rendering on purchase availability.
 * Unreleased items still show their art without being spendable. */
export function DungeonShopOfferArtwork({offerId,size=44}:{offerId:string;size?:number}){
 const source=dungeonShopOfferArt[offerId];
 if(source)return <Image source={source} accessible={false} resizeMode="contain" style={{width:size,height:size}}/>;
 const cell=dungeonShopMaterialAtlasCell[offerId];
 if(cell!==undefined){
  const column=cell%4,row=Math.floor(cell/4);
  return <View accessible={false} style={{width:size,height:size,overflow:'hidden'}}>
   <Image source={dungeonShopMaterialAtlas} resizeMode="stretch"
    style={{width:size*4,height:size*4,position:'absolute',left:-column*size,top:-row*size}}/>
  </View>;
 }
 return <UiIcon name="inventory" size={size}/>;
}
