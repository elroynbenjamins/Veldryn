import {Image,Platform,type ImageStyle} from 'react-native';
import {uiIcons,uiSmallIcons,type UiIconName} from '../theme/ui-icons';
const pixelStyle=(Platform.OS==='web'?{imageRendering:'pixelated'}:{}) as ImageStyle;
export function UiIcon({name,size=24,muted=false}:{name:UiIconName;size?:number;muted?:boolean}){
  return <Image accessible={false} source={(size<=24?uiSmallIcons:uiIcons)[name]} fadeDuration={0} resizeMode="contain" style={[pixelStyle,{width:size,height:size,opacity:muted ? .6 : 1}]}/>;
}
