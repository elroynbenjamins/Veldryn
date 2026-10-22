/** Tiny pure policy shared by the runtime cache and regression tests. */
export const PLAYER_ICON_REFRESH_MS=24*60*60*1000;
export const PLAYER_SOCIAL_REFRESH_MS=5*60*1000;
export function identityFieldExpired(fetchedAt:number|undefined,ttl:number,now:number){
 return fetchedAt===undefined||!Number.isFinite(fetchedAt)||fetchedAt<=0||now<fetchedAt||now-fetchedAt>=ttl;
}
/** A lightweight social query must never erase locally cached icon artwork. */
export function mergeSocialWithCachedIcon<T extends {profile_icon_id:string|null;class_id:string|null}>(
 previous:T|undefined,incoming:T,includesIcon:boolean,
):T{
 return includesIcon?incoming:{...incoming,profile_icon_id:previous?.profile_icon_id??null,class_id:previous?.class_id??null};
}
