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
