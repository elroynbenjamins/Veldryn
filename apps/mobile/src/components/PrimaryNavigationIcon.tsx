import {Image,Platform,type ImageStyle} from 'react-native';
import {navigationIcons} from '../theme/ui-icons';
export type PrimaryNavigationDestination='Home'|'Skills'|'Character'|'World'|'Inventory'|'Account'|'More';
export function PrimaryNavigationIcon({destination,active}:{destination:PrimaryNavigationDestination;active:boolean}){
  return <Image accessible={false} source={navigationIcons[destination]} resizeMode="contain" style={[{width:32,height:32,opacity:active?1:.82},Platform.OS==='web'?{imageRendering:'pixelated'} as ImageStyle:undefined]}/>;
}
