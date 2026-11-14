import type {Language} from './languages';

/** Exact, UI-authored Guild identity loading/error copy. */
export const germanGuildIdentityCopy:Readonly<Record<string,string>>={
 'YOUR GUILD':'DEINE GILDE',
 'Guild details unavailable':'Gildendetails nicht verfügbar',
 'Loading your Guild…':'Deine Gilde wird geladen…',
 'Retry Guild details':'Gildendetails erneut laden',
};

export function guildIdentityText(language:Language,source:string):string{
 return language==='de'&&Object.prototype.hasOwnProperty.call(germanGuildIdentityCopy,source)
  ?germanGuildIdentityCopy[source]:source;
}
