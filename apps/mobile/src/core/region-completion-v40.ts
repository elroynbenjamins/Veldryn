export interface RegionCompletionInput{regionId:string;name:string;monsters:{done:number;total:number};mastery:{done:number;total:number};resources:{done:number;total:number};dungeons:{done:number;total:number};equipmentSets:{done:number;total:number};pets:{done:number;total:number};lore:{done:number;total:number}}
export interface RegionCompletionCategory{key:keyof Omit<RegionCompletionInput,'regionId'|'name'>;label:string;done:number;total:number;weight:number;percent:number}
export interface RegionCompletionView{regionId:string;name:string;percent:number;categories:RegionCompletionCategory[];nextMilestone?:number;reachedMilestones:number[]}
export const REGION_COMPLETION_MILESTONES=[25,50,75,90,100] as const;
const weights={monsters:25,mastery:15,resources:15,dungeons:15,equipmentSets:15,pets:10,lore:5} as const;
const labels={monsters:'Monsters',mastery:'Monster Mastery',resources:'Resources',dungeons:'Dungeons',equipmentSets:'Equipment Sets',pets:'Pets',lore:'Lore'} as const;
export function regionCompletionView(input:RegionCompletionInput):RegionCompletionView{
 const categories=(Object.keys(weights) as Array<keyof typeof weights>).map(key=>{const row=input[key],total=Math.max(0,row.total),done=Math.max(0,Math.min(row.done,total));return {key,label:labels[key],done,total,weight:weights[key],percent:total?done/total:1} as RegionCompletionCategory});
 const usable=categories.filter(c=>c.total>0),weightTotal=usable.reduce((sum,c)=>sum+c.weight,0)||1,percent=Math.round(usable.reduce((sum,c)=>sum+c.percent*c.weight,0)/weightTotal*100);
 const reached=REGION_COMPLETION_MILESTONES.filter(n=>percent>=n),next=REGION_COMPLETION_MILESTONES.find(n=>percent<n);
 return {regionId:input.regionId,name:input.name,percent,categories,nextMilestone:next,reachedMilestones:[...reached]};
}
