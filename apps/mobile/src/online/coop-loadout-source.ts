import type {CoopLoadoutProjection} from '../core/coop-loadout-presentation';
import {coopClient} from './coop-client';

export interface CoopLoadoutVerificationRequest {characterId:string;loadoutId:string;expectedRevision:number;}
export interface CoopLoadoutVerificationSource {kind:'real'|'fixture';verify:(request:CoopLoadoutVerificationRequest)=>Promise<CoopLoadoutProjection>;}

/** The current backend exposes verification only through its authenticated entry
 * projection. Re-read it so a selection never promotes an old local snapshot. */
export const realCoopLoadoutVerificationSource:CoopLoadoutVerificationSource={kind:'real',verify:async request=>{
  const entry=await coopClient.entry();
  const loadout=entry.loadouts.find(candidate=>candidate.id===request.loadoutId&&candidate.characterId===request.characterId);
  if(!loadout)throw new Error('loadout_not_available');
  if(loadout.revision!==request.expectedRevision||loadout.verifiedRevision!==request.expectedRevision)throw new Error('invalid_loadout_revision');
  return loadout;
}};
