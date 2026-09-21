import {View} from 'react-native';
import {itemDef} from '../content/items';
import {EquipmentArtwork,hasEquipmentArtwork} from './EquipmentArtwork';
import {GatheringToolArtwork} from './GatheringToolArtwork';
import {gatheringToolCells} from '../theme/gathering-tool-assets';
import {ResourceArtwork} from './ResourceArtwork';
import {hasResourceArtwork} from '../theme/resource-assets';
import {UiIcon} from './UiIcon';
import {GemArtwork} from './GemArtwork';
import {hasGemArtworkV1} from '../theme/gem-assets';
/** Known items use their artwork. Uncatalogued materials retain a neutral bag marker and a text name. */
export function ItemArtwork({itemId,size=40}:{itemId:string;size?:number}){
 const item=itemDef(itemId);
 if(hasGemArtworkV1(itemId))return <GemArtwork itemId={itemId} size={size} framed={false}/>;
 if(hasResourceArtwork(itemId))return <ResourceArtwork itemId={itemId} size={size} framed={false}/>;
 if(item.type==='tool'&&gatheringToolCells[itemId])return <GatheringToolArtwork itemId={itemId} size={size} framed={false}/>;
 if(item.type==='gear'&&hasEquipmentArtwork(item))return <View style={{width:size,height:size,alignItems:'center',justifyContent:'center'}}><View style={{width:48,height:48,transform:[{scale:size/48}]}}><EquipmentArtwork item={item} compact framed={false}/></View></View>;
 return <UiIcon name="inventory" size={size}/>;
}
