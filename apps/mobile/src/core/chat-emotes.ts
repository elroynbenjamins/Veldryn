import emoteData from '../features/chat-pilot/data/emotes.json';
const known=new Set((emoteData as Array<{id:string}>).map(row=>row.id));
export function chatEmoteCount(value:string){return [...value.matchAll(/:([a-z0-9_]+):/g)].filter(match=>known.has(match[1])).length}
