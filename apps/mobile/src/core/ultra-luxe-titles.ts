import type {GameState} from './types';

/** Private title grants, separate from scene/frame and badge selections. */
export const ULTRA_LUXE_TITLES=[
 {id:'ascendant-celestial-title',name:'Sovereign of the Stars',color:'#efd69b',lightColor:'#795100'},
 {id:'ascendant-draconic-title',name:'Dragon Sovereign',color:'#ff9248',lightColor:'#a43c0b'},
] as const;
export type UltraLuxeTitleId=typeof ULTRA_LUXE_TITLES[number]['id'];
export function ultraLuxeTitleById(id:unknown){return ULTRA_LUXE_TITLES.find(row=>row.id===id);}
export function ownedUltraLuxeTitles(state:GameState){return ULTRA_LUXE_TITLES.filter(row=>state.account.unlockedTitleIds?.includes(row.id));}
export function ownedUltraLuxeTitleColor(state:GameState,title:string|undefined,dark=true){
 const def=ownedUltraLuxeTitles(state).find(row=>row.name===title);
 return def?(dark?def.color:def.lightColor):undefined;
}
/** Only consume the server's explicit verified title ID; arbitrary text never proves a grant. */
export function verifiedUltraLuxeTitleColor(title:string|undefined,verifiedId:unknown,dark=true){
 const def=ultraLuxeTitleById(verifiedId);
 return def&&def.name===title?(dark?def.color:def.lightColor):undefined;
}
