export function normalizeProfileAttentionKeys(keys:readonly string[]){
 const seen=new Set<string>(),out:string[]=[];
 for(const raw of keys){
  const key=String(raw??'').trim();
  if(!key||seen.has(key))continue;
  seen.add(key);out.push(key);
  if(out.length>=100)break;
 }
 return out;
}

export function mergeProfileAttentionKeys(current:readonly string[],added:readonly string[]){
 return normalizeProfileAttentionKeys([...current,...added]);
}

export function hasProfileAttention(keys:readonly string[]){return normalizeProfileAttentionKeys(keys).length>0;}
