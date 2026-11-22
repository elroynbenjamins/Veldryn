import {findStatGem,findEffectGem,gemItemId,type GemGrade} from './gems/gem-catalog-v1';
import type {V2GemSocketKind} from './equipment-crafting-v2-gem-sidecar-types';
import {V2DraftCraftError} from './equipment-crafting-v2-transaction';

/** Canonical server-side item identity for an EQ2 socket.
 * Never use the mobile item catalogue to authorize a gem or its grade.
 * Legacy V33 gems are deliberately not promoted to V2 sockets.
 */
export function v2ServerSocketGemKind(id:unknown):V2GemSocketKind{
 if(typeof id!=='string')throw new V2DraftCraftError('unknown_v2_socket_gem');
 const match=/^gem:(stat_[a-z0-9_]+|effect_[a-z0-9_]+):g([1-5])$/.exec(id);
 if(!match)throw new V2DraftCraftError('unknown_v2_socket_gem');
 const familyId=match[1],grade=Number(match[2]) as GemGrade;
 const kind:V2GemSocketKind=familyId.startsWith('stat_')?'stat':'effect';
 const family=kind==='stat'?findStatGem(familyId):findEffectGem(familyId);
 if(!family||gemItemId(family.familyId,grade)!==id)
  throw new V2DraftCraftError('unknown_v2_socket_gem');
 return kind;
}
