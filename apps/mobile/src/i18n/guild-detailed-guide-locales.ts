import type {Language} from './languages';
import {guildDetailedGuide,type GuildDetailedGuide} from '../core/guild-detailed-guides';
import {guildGuideSectionTitle} from './guild-guide-library';
import {guildGuideDe} from './guild-guide-content-de';
import {guildGuideEs} from './guild-guide-content-es';
import {guildGuideNl} from './guild-guide-content-nl';
import {guildGuideIt} from './guild-guide-content-it';
import {guildGuideFr} from './guild-guide-content-fr';
import {guildGuideRu} from './guild-guide-content-ru';
import {guildGuideTr} from './guild-guide-content-tr';

export type GuildGuideTranslation=readonly [summary:string,topics:readonly (readonly [title:string,body:string])[]];
export type GuildGuideLocaleTable=Readonly<Record<string,GuildGuideTranslation>>;
const TABLES:Partial<Record<Language,GuildGuideLocaleTable>>={
 de:guildGuideDe,es:guildGuideEs,nl:guildGuideNl,it:guildGuideIt,fr:guildGuideFr,ru:guildGuideRu,tr:guildGuideTr,
};

/** One canonical English guide determines gameplay semantics and stable topic IDs.
 * Incomplete locale entries safely fall back to English, while CI enforces full
 * coverage of all released Guild screens and topics for supported languages. */
export function localizedGuildDetailedGuide(language:Language,section:string):GuildDetailedGuide|undefined{
 const source=guildDetailedGuide(section);
 if(!source)return undefined;
 const translated=TABLES[language]?.[section];
 const title=guildGuideSectionTitle(language,section,source.title);
 if(!translated||translated[1].length!==source.topics.length)return {...source,title};
 return {...source,title,body:translated[0],topics:source.topics.map((topic,index)=>{
  const row=translated[1][index];
  return {...topic,title:row[0],body:row[1]};
 })};
}

export function guildDetailedGuideLocaleCoverage(language:Language):{sections:number;topics:number;complete:boolean}{
 const table=TABLES[language];
 const sections=Object.keys(table??{}).length;
 const topics=Object.values(table??{}).reduce((sum,entry)=>sum+entry[1].length,0);
 const {GUILD_DETAILED_GUIDES}=require('../core/guild-detailed-guides') as typeof import('../core/guild-detailed-guides');
 const sourceSections=Object.keys(GUILD_DETAILED_GUIDES);
 return {sections,topics,complete:!!table&&sections===sourceSections.length&&sourceSections.every(id=>table[id]?.[1].length===GUILD_DETAILED_GUIDES[id].topics.length)};
}
