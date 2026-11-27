/** Authored review pacing diagnostics, not access authority. */
export function auditStoryPacing(books,routePrerequisites){
 const issues=[],seenRoutes=new Set(),seenIds=new Set();
 for(const book of books){
  let previousLevel=book.suggestedLevels[0];
  const sequence=[...book.quests,...(book.finale?[book.finale]:[])];
  for(let i=0;i<sequence.length;i++){
   const q=sequence[i];
   if(seenIds.has(q.id))issues.push({questId:q.id,reason:'duplicate_identity'});
   seenIds.add(q.id);
   if(q.suggestedLevel<previousLevel||q.suggestedLevel>book.suggestedLevels[1])issues.push({questId:q.id,reason:'level_order'});
   previousLevel=q.suggestedLevel;
   if(i&&(!q.prerequisites.includes(sequence[i-1].id)))issues.push({questId:q.id,reason:'missing_preceding_quest'});
   for(const o of q.objectives??[]){
    if(o.kind!=='map')continue;
    const prerequisite=routePrerequisites[o.targetId];
    if(prerequisite&&!seenRoutes.has(prerequisite))issues.push({questId:q.id,reason:'missing_earlier_route',routeId:o.targetId,prerequisite});
    seenRoutes.add(o.targetId);
   }
  }
 }
 return {released:false,authorizesAccess:false,issues,routeCount:seenRoutes.size};
}
