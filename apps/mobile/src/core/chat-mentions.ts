export type ChatMentionSegment={text:string;kind:'text'|'mention'|'self_mention'};

function escapeRegex(value:string){return value.replace(/[.*+?^$()|[\]\\]/g,'\\$&');}

export function messageMentionsName(body:string,name:string){
 const target=name.trim();if(!target)return false;
 return body.toLocaleLowerCase().includes('@'+target.toLocaleLowerCase());
}

export function chatMentionSegments(text:string,currentName=''):ChatMentionSegment[]{
 if(!text)return [];
 const current=currentName.trim(),self=current?new RegExp('(@'+escapeRegex(current)+')','giu'):null;
 const chunks=self?text.split(self):[text],out:ChatMentionSegment[]=[];
 for(const chunk of chunks){
  if(!chunk)continue;
  if(current&&chunk.toLocaleLowerCase()==='@'+current.toLocaleLowerCase()){out.push({text:chunk,kind:'self_mention'});continue;}
  const pieces=chunk.split(/(@[\p{L}\p{M}][\p{L}\p{M}'’\-]{0,19})/gu);
  for(const piece of pieces){if(!piece)continue;out.push({text:piece,kind:piece.startsWith('@')?'mention':'text'});}
 }
 return out;
}


export interface ChatMentionQuery{start:number;query:string}

export function chatMentionQueryAtEnd(text:string):ChatMentionQuery|null{
 const at=text.lastIndexOf('@');
 if(at<0)return null;
 if(at>0&&!/\s/.test(text[at-1]))return null;
 const tail=text.slice(at+1);
 if(tail.length>20||/[\n\r.,!?;:()[\]{}]/u.test(tail))return null;
 if(tail&&!/^[\p{L}\p{M} '\-]*$/u.test(tail))return null;
 return {start:at,query:tail.toLocaleLowerCase()};
}

export function chatMentionSuggestions(text:string,names:readonly string[],excludeName=''){
 const match=chatMentionQueryAtEnd(text);if(!match)return [];
 const excluded=excludeName.trim().toLocaleLowerCase(),seen=new Set<string>(),rows:string[]=[];
 for(const raw of names){
  const name=raw.trim(),key=name.toLocaleLowerCase();
  if(!name||key===excluded||seen.has(key)||!key.startsWith(match.query))continue;
  seen.add(key);rows.push(name);
 }
 return rows.slice(0,4);
}

export function applyChatMentionSuggestion(text:string,name:string){
 const match=chatMentionQueryAtEnd(text);if(!match)return text;
 return text.slice(0,match.start)+'@'+name.trim()+' ';
}
