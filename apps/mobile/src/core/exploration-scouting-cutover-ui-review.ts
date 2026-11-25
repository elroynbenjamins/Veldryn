/** Hidden UI cutover contract. No navigation registrations are changed here. */
import type {AccountExploration} from './exploration-account-review';
import {progressWithinLevel} from './progression';

export const SCOUTING_2_UI_CUTOVER_RELEASED=false as const;
export const SCOUTING_2_PRIMARY_DESTINATION={screen:'Skills',skillId:'exploration',tab:'Routes'} as const;
export const SCOUTING_2_COMPANION_SECTIONS=['Collection','Training','Sanctuary','Trials'] as const;
export type LegacyScoutingEntry=
 |{surface:'skills_exploration'}
 |{surface:'companion_expeditions'}
 |{surface:'companion_expedition_claim';assignmentId:string}
 |{surface:'companion_sanctuary_pens'}
 |{surface:'saved_companion_section';section:string};

export function scouting2CutoverDestination(entry:LegacyScoutingEntry){
 if(entry.surface==='companion_expedition_claim')return {...SCOUTING_2_PRIMARY_DESTINATION,tab:'Reports' as const,reportId:entry.assignmentId};
 if(entry.surface==='companion_sanctuary_pens')return {screen:'Companions' as const,section:'Sanctuary' as const,focus:'scouting-camp' as const};
 if(entry.surface==='saved_companion_section'&&entry.section!=='Expeditions')return {screen:'Companions' as const,section:entry.section};
 return SCOUTING_2_PRIMARY_DESTINATION;
}

/** Account projection replaces the old per-character SkillHero for Exploration. */
export function accountExplorationHero(account:AccountExploration){
 const progress=progressWithinLevel(account.xp,account.level);
 return {name:'Exploration',scope:'Account-wide',level:account.level,xp:account.xp,currentXp:progress.current,nextXp:progress.need,
  characterSlotContribution:0 as const,subtitle:'Routes, Scouting & Discoveries'};
}

export const SCOUTING_2_SURFACE_REPLACEMENTS=[
 {old:'Skills → Exploration → ExplorationPanel',next:'Skills → Exploration → unified Scouting board'},
 {old:'Companions → Expeditions',next:'Skills → Exploration → Missions'},
 {old:'Expedition Pens',next:'Scouting Camp (same stored facility level)'},
 {old:'Expedition completed assignment',next:'Skills → Exploration → Reports → Previous expedition'},
] as const;

export function scouting2CompanionSectionAllowed(section:string){
 return (SCOUTING_2_COMPANION_SECTIONS as readonly string[]).includes(section);
}
