/** Read-only companion Training roster selection. Never grants or changes ownership. */
export type TrainingRosterScope='Owned'|'Discover';
export type TrainingRosterRole='All'|'damage'|'tank'|'support';
export type TrainingRosterRarity='All'|'standard'|'rare'|'elite'|'prestige';
export interface TrainingRosterCompanion{
 id:string;
 role:Exclude<TrainingRosterRole,'All'>;
 rarity:Exclude<TrainingRosterRarity,'All'>;
}

/** Owned always takes priority over Codex visibility; undiscovered entries stay hidden. */
export function selectTrainingRoster<T extends TrainingRosterCompanion>(
 definitions:readonly T[],
 ownedIds:ReadonlySet<string>,
 discoveredIds:ReadonlySet<string>,
 scope:TrainingRosterScope,
 role:TrainingRosterRole='All',
 rarity:TrainingRosterRarity='All',
 equippedId?:string,
 favoriteId?:string,
):T[]{
 const matches=definitions.filter(def=>
  (scope==='Owned'?ownedIds.has(def.id):!ownedIds.has(def.id)&&discoveredIds.has(def.id))&&
  (role==='All'||def.role===role)&&
  (rarity==='All'||def.rarity===rarity)
 );
 if(scope==='Owned'){
  const priority=(id:string)=>id===equippedId?0:id===favoriteId?1:2;
  matches.sort((a,b)=>priority(a.id)-priority(b.id));
 }
 return matches;
}
