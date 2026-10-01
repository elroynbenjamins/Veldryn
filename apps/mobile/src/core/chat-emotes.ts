import emoteData from '../features/chat-pilot/data/emotes.json';

export type ChatEmoteDef={id:string;label:string;category:'male'|'female'|'pets';defaultAvailable?:boolean};
export const CHAT_MAX_EMOTES_PER_MESSAGE=2;
export const CHAT_EMOTE_TRAY_SIZE=5;

const rows=emoteData as ChatEmoteDef[];
const catalog=new Map(rows.map(row=>[row.id,row]));
const known=new Set(catalog.keys());
const starterIds=new Set(['male_01','male_02','male_03','male_04','male_05','female_01','female_02','female_03','female_04','female_05']);

export function chatEmoteCount(value:string){return [...value.matchAll(/:([a-z0-9_]+):/g)].filter(match=>known.has(match[1])).length}

export function chatUnavailableEmoteIds(value:string,unlockedIds:readonly string[]=[]){
 const unlocked=new Set(unlockedIds);
 return [...new Set([...value.matchAll(/:([a-z0-9_]+):/g)].map(match=>match[1]).filter(id=>{const def=catalog.get(id);return !!def&&def.defaultAvailable===false&&!unlocked.has(id)}))];
}

export function availableChatEmotes(unlockedIds:readonly string[]=[],bodyPresentation?:'male'|'female'){
 void unlockedIds;
 return rows.filter(row=>starterIds.has(row.id)&&(!bodyPresentation||row.category===bodyPresentation));
}

export function normalizeChatEmoteTrayIds(value:unknown){
 if(!Array.isArray(value))return [] as string[];
 return [...new Set(value.filter((id):id is string=>typeof id==='string'&&known.has(id)))].slice(0,CHAT_EMOTE_TRAY_SIZE);
}

export function defaultChatEmoteTray(bodyPresentation:'male'|'female'='male'){
 const preferred=rows.filter(row=>starterIds.has(row.id)&&row.category===bodyPresentation).map(row=>row.id);
 const fallback=rows.filter(row=>starterIds.has(row.id)).map(row=>row.id);
 return [...new Set([...preferred,...fallback])].slice(0,CHAT_EMOTE_TRAY_SIZE);
}

export function resolvedChatEmoteTray(value:unknown,unlockedIds:readonly string[]=[],bodyPresentation:'male'|'female'='male'){
 const available=availableChatEmotes(unlockedIds,bodyPresentation),availableIds=new Set(available.map(row=>row.id));
 const saved=normalizeChatEmoteTrayIds(value).filter(id=>availableIds.has(id));
 const fallback=[...defaultChatEmoteTray(bodyPresentation),...available.map(row=>row.id)];
 return [...new Set([...saved,...fallback])].slice(0,CHAT_EMOTE_TRAY_SIZE);
}
