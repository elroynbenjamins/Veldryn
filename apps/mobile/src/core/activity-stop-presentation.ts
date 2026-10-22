/** Distinguish planned activity completion from injury, storage safety and unexpected stops. */
export type ActivityStopCategory='completed'|'recovery'|'storage'|'paused';
export interface ActivityStopPresentation{category:ActivityStopCategory;title:string;detail:string;}
export function activityStopPresentation(reason:string):ActivityStopPresentation{
 const message=reason.toLowerCase();
 if(/injured|out of food|food reserve|heal before|restock equipped food/.test(message))return {category:'recovery',title:'Combat needs recovery',detail:'Collect your rewards, then heal or restock equipped food before fighting again.'};
 if(/storage|overflow|free slot|inventory full/.test(message))return {category:'storage',title:'Storage needs attention',detail:'Collect rewards, then free space in Inventory or Bank before continuing.'};
 if(/goal reached|target completed|target reached|idle rule duration/.test(message))return {category:'completed',title:'Goal reached',detail:'Your planned stop condition was met. Collect rewards and review the next queued action.'};
 return {category:'paused',title:'Activity paused',detail:'Collect rewards to settle this activity and review the reason it stopped.'};
}
