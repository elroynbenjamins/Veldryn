import emoteData from '../features/chat-pilot/data/emotes.json';
type ChatEmoteDef={id:string;defaultAvailable?:boolean};
const catalog=new Map((emoteData as ChatEmoteDef[]).map(row=>[row.id,row]));
const known=new Set(catalog.keys());

export function chatEmoteCount(value:string){return [...value.matchAll(/:([a-z0-9_]+):/g)].filter(match=>known.has(match[1])).length}
export function chatUnavailableEmoteIds(value:string,unlockedIds:readonly string[]=[]){
 const unlocked=new Set(unlockedIds);
 return [...new Set([...value.matchAll(/:([a-z0-9_]+):/g)].map(match=>match[1]).filter(id=>{const def=catalog.get(id);return !!def&&def.defaultAvailable===false&&!unlocked.has(id)}))];
}
