/**
 * Launch-facing World Chat channels. Global 1 / Global 2 stay provisioned
 * server-side for later reactivation, but are not selectable in the UI.
 */
export const VISIBLE_WORLD_CHAT_CHANNEL_IDS=['world-1','world-2'] as const;
export const isVisibleWorldChatChannel=(id:string):boolean=>
 VISIBLE_WORLD_CHAT_CHANNEL_IDS.some(visibleId=>visibleId===id);

/** Persisted chat preference uses 1-based channel indices.
 * Legacy values 3/4 return to English, never a hidden channel.
 */
export function defaultVisibleWorldChatIndex(preference?:number):number{
 return preference===2?1:0;
}
/** Local UI selection is 0-based and can only address two public channels. */
export function visibleWorldChatIndex(index?:number):number{
 return index===1?1:0;
}
