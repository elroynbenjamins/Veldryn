import type {CompanionAffinity,CompanionDefinition} from '../../../apps/mobile/src/core/combat-companion-types';
import {companionAffinity,companionAffinityDiversity} from '../../../apps/mobile/src/core/companion-affinities';

export type CompanionAffinityRequirement=
 |{type:'affinity_count';affinity:CompanionAffinity;count:number}
 |{type:'affinity_diversity';count:number}
 |{type:'affinity_unique'};

export function validateCompanionAffinityRequirements(defs:CompanionDefinition[],requirements:CompanionAffinityRequirement[]){
 for(const req of requirements){
  if(req.type==='affinity_count'&&defs.filter(def=>companionAffinity(def)===req.affinity).length<req.count)return {ok:false,reason:`mission_requires_${req.affinity}_affinity`};
  if(req.type==='affinity_diversity'&&companionAffinityDiversity(defs)<req.count)return {ok:false,reason:'mission_requires_affinity_diversity'};
  if(req.type==='affinity_unique'&&companionAffinityDiversity(defs)<defs.length)return {ok:false,reason:'mission_requires_unique_affinities'};
 }
 return {ok:true as const};
}
