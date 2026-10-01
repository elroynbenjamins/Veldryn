import type {QuickNavDestination} from '../core/quick-navigation';
import type {UiIconName} from '../theme/ui-icons';
import {LineworkIcon,LineworkNavigationIcon} from './LineworkIcon';

export function ThemedIcon({name,size=24,muted=false}:{name:UiIconName;size?:number;muted?:boolean}){
 return <LineworkIcon name={name} size={size} muted={muted}/>;
}

export function ThemedNavigationIcon({destination,size=32,muted=false}:{destination:QuickNavDestination;size?:number;muted?:boolean}){
 return <LineworkNavigationIcon destination={destination} size={size} muted={muted}/>;
}
