import type {UiIconName} from '../theme/ui-icons';
import {ThemedIcon} from './ThemedNavigationIcon';
export function UiIcon({name,size=24,muted=false}:{name:UiIconName;size?:number;muted?:boolean}){
  return <ThemedIcon name={name} size={size} muted={muted}/>;
}
