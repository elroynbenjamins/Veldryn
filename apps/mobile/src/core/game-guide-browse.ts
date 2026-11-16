import {GAME_GUIDE,GAME_GUIDE_CATEGORIES,GAME_GUIDE_STEPS,type GameGuideCategory,type GameGuideDefinition,type GameGuideId} from './onboarding';

export type GameGuideFilter=GameGuideCategory|'all';

/** Browsing is intentionally read-only: locked lessons remain previewable, not unlocked. */
export function browseGameGuides(args:{
 unlockedIds:ReadonlySet<GameGuideId>;
 readIds:ReadonlySet<GameGuideId>;
 category:GameGuideFilter;
 query:string;
 unreadOnly:boolean;
 localize?:(value:string)=>string;
}):GameGuideDefinition[]{
 const query=args.query.trim().toLocaleLowerCase();
 return GAME_GUIDE.filter(entry=>{
  if(args.category!=='all'&&GAME_GUIDE_CATEGORIES[entry.id]!==args.category)return false;
  if(args.unreadOnly&&(!args.unlockedIds.has(entry.id)||args.readIds.has(entry.id)))return false;
  if(!query)return true;
  return [entry.title,entry.summary,entry.unlockHint,...GAME_GUIDE_STEPS[entry.id]].some(copy=>copy.toLocaleLowerCase().includes(query)||(args.localize?.(copy)??'').toLocaleLowerCase().includes(query));
 }).sort((a,b)=>{
  const rank=(id:GameGuideId)=>args.unlockedIds.has(id)?args.readIds.has(id)?1:0:2;
  return rank(a.id)-rank(b.id)||GAME_GUIDE.indexOf(a)-GAME_GUIDE.indexOf(b);
 });
}
