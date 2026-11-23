/**
 * Veldryn 2.0 physical damage subtype catalogue companion — HIDDEN REVIEW ONLY.
 * Reads pinned server item IDs. Does not alter equipment minting, stat rolls,
 * Combat 2.0 pipeline, item snapshots, market gates or enabled live handlers.
 */
import {v2ServerPiece} from './equipment-crafting-v2-manifest';
export type V2PhysicalSubtypeReview='slashing'|'piercing'|'blunt';
export type V2SubtypeWeightReview={readonly type:V2PhysicalSubtypeReview;readonly basisPoints:number};
export const V2_PHYSICAL_SUBTYPE_REVIEW_ACTIVATED=false as const;
/** Only an authenticated source-owned physical weapon strike can use this profile.
 * Do not use on spells/DoTs/reflect or infer damage type from the client.
 */
const PROFILE_BY_CLASS:Readonly<Record<string,{readonly mode:'physical'|'spell_source'|'physical_staff_strike_only';readonly weights:readonly V2SubtypeWeightReview[];readonly delivery:string}>>={
 IRONWARDEN:{mode:'physical',weights:[{type:'slashing',basisPoints:10000}],delivery:'weapon_strike'},
 BASTION:{mode:'physical',weights:[{type:'slashing',basisPoints:10000}],delivery:'weapon_strike'},
 DREADGUARD:{mode:'physical',weights:[{type:'blunt',basisPoints:7000},{type:'slashing',basisPoints:3000}],delivery:'weapon_strike'},
 WAYFINDER:{mode:'physical',weights:[{type:'piercing',basisPoints:10000}],delivery:'weapon_strike'},
 RAVAGER:{mode:'physical',weights:[{type:'slashing',basisPoints:10000}],delivery:'weapon_strike'},
 HEXWEAVER:{mode:'spell_source',weights:[],delivery:'authored_skill_only'},
 KNIFE_DANCER:{mode:'physical',weights:[{type:'piercing',basisPoints:6000},{type:'slashing',basisPoints:4000}],delivery:'weapon_strike'},
 DAWNKEEPER:{mode:'physical',weights:[{type:'blunt',basisPoints:10000}],delivery:'weapon_strike'},
 STONECALLER:{mode:'physical_staff_strike_only',weights:[{type:'blunt',basisPoints:10000}],delivery:'explicit_staff_melee_only'},
};
export function v2PinnedPhysicalSubtypeReview(pieceId:string){
 const piece=v2ServerPiece(pieceId);
 if(!piece||!/^EQ2_(WEAPON|OFFHAND)_T[1-4]_[A-Z_]+$/.test(pieceId))return null;
 if(piece.slot==='weapon'){
  const profile=piece.classRestriction?PROFILE_BY_CLASS[piece.classRestriction]:undefined;
  if(!profile) return null;
  return {pieceId,slot:piece.slot,profile,shieldBashDamageType:null,combatAuthorized:false} as const;
 }
 if(piece.slot==='offhand'){
  const shield=piece.classRestriction!=='HEXWEAVER';
  return {pieceId,slot:piece.slot,profile:null,
   shieldBashDamageType:shield?'blunt' as const:null,
   /** Source-owned ability is required; never a passive offhand bonus. */
   combatAuthorized:false} as const;
 }
 return null;
}
