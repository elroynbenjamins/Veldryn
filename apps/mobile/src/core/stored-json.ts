/**
 * Parse a JSON object previously written to device storage.
 *
 * Returns null for missing, truncated or otherwise corrupt values instead of
 * throwing. Pending-command journals read this on every request, so a single
 * damaged entry (interrupted write, storage corruption) must not block every
 * later command until the app is reinstalled. Callers should remove the key
 * when `raw` was present but this returns null.
 */
export function parseStoredJsonObject<T extends object>(raw:string|null|undefined):T|null{
 if(typeof raw!=='string'||!raw)return null;
 try{
  const value:unknown=JSON.parse(raw);
  return value!==null&&typeof value==='object'&&!Array.isArray(value)?value as T:null;
 }catch{return null;}
}
