import {companionAffinityById,type CompanionAffinity} from '../../shared/companion-affinity-catalog';

type CompanionAffinitySource={id:string;affinity?:CompanionAffinity};
const companionAffinity=(def:CompanionAffinitySource)=>def.affinity??companionAffinityById(def.id);
const companionAffinityDiversity=(defs:CompanionAffinitySource[])=>new Set(defs.map(companionAffinity)).size;

export type CompanionAffinityRequirement=
 |{type:'affinity_count';affinity:CompanionAffinity;count:number}
 |{type:'affinity_diversity';count:number}
 |{type:'affinity_unique'};

export function validateCompanionAffinityRequirements(defs:CompanionAffinitySource[],requirements:CompanionAffinityRequirement[]){
 for(const req of requirements){
  if(req.type==='affinity_count'&&defs.filter(def=>companionAffinity(def)===req.affinity).length<req.count)return {ok:false,reason:`mission_requires_${req.affinity}_affinity`};
  if(req.type==='affinity_diversity'&&companionAffinityDiversity(defs)<req.count)return {ok:false,reason:'mission_requires_affinity_diversity'};
  if(req.type==='affinity_unique'&&companionAffinityDiversity(defs)<defs.length)return {ok:false,reason:'mission_requires_unique_affinities'};
 }
 return {ok:true as const};
}
