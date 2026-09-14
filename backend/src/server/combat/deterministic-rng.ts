import {hmac} from '@noble/hashes/hmac';
import {sha256} from '@noble/hashes/sha256';
import {bytesToHex} from '@noble/hashes/utils';

// Node-compatible UTF-8 without requiring Buffer or TextEncoder on Hermes.
function utf8(value:string):Uint8Array{
 const bytes:number[]=[];
 for(const character of value){let n=character.codePointAt(0)!;if(n>=0xd800&&n<=0xdfff)n=0xfffd;
  if(n<0x80)bytes.push(n);else if(n<0x800)bytes.push(0xc0|(n>>6),0x80|(n&63));
  else if(n<0x10000)bytes.push(0xe0|(n>>12),0x80|((n>>6)&63),0x80|(n&63));
  else bytes.push(0xf0|(n>>18),0x80|((n>>12)&63),0x80|((n>>6)&63),0x80|(n&63));
 }return new Uint8Array(bytes);
}

export class CombatRng {
  private cursor = 0;
  private readonly key:Uint8Array;
  constructor(seed: string) {this.key=utf8(seed);}
  next(label: string): number {
    const payload = `${this.cursor++}:${label}`;
    const hex = bytesToHex(hmac(sha256,this.key,utf8(payload))).slice(0,13);
    return parseInt(hex, 16) / 0x1fffffffffffff;
  }
  pick<T>(values: T[], label: string): T {
    if (!values.length) throw new Error('cannot_pick_empty');
    return values[Math.min(values.length - 1, Math.floor(this.next(label) * values.length))];
  }
}
