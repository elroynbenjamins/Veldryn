/** Shared Guild Construction progress: count actual allocated units, not an
 * unweighted average of the material bars. Keep Hall and Construction in sync. */
export type ConstructionProgressRequirement={key:string;required:number};

export function guildConstructionProgress(
 requirements:readonly ConstructionProgressRequirement[],
 resources:Readonly<Record<string,number>>|undefined,
):{required:number;funded:number;ratio:number}{
 const required=requirements.reduce((total,row)=>total+Math.max(0,row.required),0);
 const funded=requirements.reduce((total,row)=>{
  const cost=Math.max(0,row.required);
  const allocated=resources?.[row.key]??0;
  return total+Math.min(cost,Math.max(0,allocated));
 },0);
 return {required,funded,ratio:required>0?funded/required:0};
}
