import {CLASSES} from '../content/classes';
import type {ClassId} from './types';
/** The server may send a canonical id or a display name. Unknown classes stay generic. */
export function resolveIdentityClass(value?:string|null):ClassId|undefined{
 if(!value)return undefined;
 const normalized=value.trim().toLowerCase().replace(/[_ -]+/g,'');
 return CLASSES.find(item=>item.id.toLowerCase().replace(/[_ -]+/g,'')===normalized||item.name.toLowerCase().replace(/[_ -]+/g,'')===normalized)?.id;
}
