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
  constructor(seed: string,private readonly fullRangeReview=false) {this.key=utf8(seed);}
  next(label: string): number {
    const payload = `${this.cursor++}:${label}`;
    const hex = bytesToHex(hmac(sha256,this.key,utf8(payload))).slice(0,13);
    return parseInt(hex, 16) / (this.fullRangeReview?0x10000000000000:0x1fffffffffffff);
  }
  pick<T>(values: T[], label: string): T {
    if (!values.length) throw new Error('cannot_pick_empty');
    return values[Math.min(values.length - 1, Math.floor(this.next(label) * values.length))];
  }
}

/** Diagnostic-only V2 damage-roll policy. Keep the legacy numerical range
 * deliberately unchanged: this experiment isolates sequencing, not RNG
 * probability calibration. Counters are encounter-local and independent for
 * each source/target/ability/event-kind. No timestamp or party buff enters
 * the stream key. An attempted hit (including miss) consumes one ordinal. */
export const ACTION_STREAM_RNG_QA_V1='action-stream-qa-v1' as const;
// Same hash bytes as v1; correct the 52-bit normalization only in QA v2.
export const ACTION_STREAM_RNG_QA_V2='action-stream-qa-v2-full-range' as const;
export type ActionStreamRngReviewPolicy=typeof ACTION_STREAM_RNG_QA_V1|typeof ACTION_STREAM_RNG_QA_V2;
export class ActionStreamRngReview {
 private readonly key:Uint8Array;
 private readonly counts=new Map<string,number>();
 constructor(seed:string,private readonly policy:ActionStreamRngReviewPolicy=ACTION_STREAM_RNG_QA_V1){this.key=utf8(seed);}
 begin(sourceId:string,targetId:string,abilityId:string,eventKind:'damage'|'dot_tick'){
  const stream=JSON.stringify([sourceId,targetId,abilityId,eventKind]);
  const ordinal=this.counts.get(stream)??0;
  this.counts.set(stream,ordinal+1);
  return (channel:'hit'|'crit'|'var'|'heavy'):number=>{
   const payload=JSON.stringify([ACTION_STREAM_RNG_QA_V1,stream,ordinal,channel]);
   return parseInt(bytesToHex(hmac(sha256,this.key,utf8(payload))).slice(0,13),16)/
    (this.policy===ACTION_STREAM_RNG_QA_V2?0x10000000000000:0x1fffffffffffff);
  };
 }
}
