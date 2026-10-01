import {ThemedNavigationIcon} from './ThemedNavigationIcon';
export type PrimaryNavigationDestination='Home'|'Skills'|'Character'|'World'|'Inventory'|'Account'|'More';
export function PrimaryNavigationIcon({destination,active}:{destination:PrimaryNavigationDestination;active:boolean}){
  return <ThemedNavigationIcon destination={destination} size={32} muted={!active}/>;
}
