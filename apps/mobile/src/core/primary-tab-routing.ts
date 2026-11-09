/** The Home dashboard is a first-class persistent destination (not a neutral overlay).
 * Detail routes retain a visible parent destination for navigation affordances.
 */
export type PrimaryNavDestination='Home'|'Character'|'Skills'|'World'|'Inventory'|'More';
export const PRIMARY_NAV_DESTINATIONS:readonly PrimaryNavDestination[]=['Home','Character','Skills','World','Inventory','More'];
export function primaryNavForRoute(route:string):PrimaryNavDestination{
 if(route==='Combat')return 'World';
 if(route==='Coop'||route==='Dungeon')return 'More';
 if(PRIMARY_NAV_DESTINATIONS.some(item=>item===route))return route as PrimaryNavDestination;
 return 'More';
}
