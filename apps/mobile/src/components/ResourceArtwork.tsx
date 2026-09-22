import {Image,StyleSheet,View} from 'react-native';
import {resourceIconSource} from '../theme/resource-assets';
import {
  REGIONAL_RESOURCE_CELL,
  REGIONAL_RESOURCE_SHEET_HEIGHT,
  REGIONAL_RESOURCE_SHEET_WIDTH,
  regionalResourceCell,
  regionalResourceSheet,
} from '../theme/regional-resource-assets';
import {C,radii} from '../theme/theme';

export function ResourceArtwork({itemId,size=58,framed=true}:{itemId:string;size?:number;framed?:boolean}){
  const cell=regionalResourceCell(itemId);
  if(cell){
    const scale=size/REGIONAL_RESOURCE_CELL;
    return <View style={[s.art,{width:size,height:size},framed&&s.frame]}>
      <View style={{width:size,height:size,overflow:'hidden'}}>
        <Image
          source={regionalResourceSheet}
          resizeMode="stretch"
          fadeDuration={0}
          style={{
            position:'absolute',
            width:REGIONAL_RESOURCE_SHEET_WIDTH*scale,
            height:REGIONAL_RESOURCE_SHEET_HEIGHT*scale,
            left:-cell.column*size,
            top:-cell.row*size,
          }}
        />
      </View>
    </View>;
  }
  const source=resourceIconSource(itemId);if(!source)return null;
  return <View style={[s.art,{width:size,height:size},framed&&s.frame]}><Image source={source} resizeMode="contain" fadeDuration={0} style={s.image}/></View>;
}

const s=StyleSheet.create({
  art:{alignItems:'center',justifyContent:'center',overflow:'hidden'},
  frame:{borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:'#09121a'},
  image:{width:'100%',height:'100%'},
});
