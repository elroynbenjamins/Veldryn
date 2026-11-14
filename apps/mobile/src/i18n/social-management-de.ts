import type {Language} from './languages';

/**
 * German-only display translations for stable Guild member management and
 * recruitment UI. Never pass player-authored names, notes or tag values into
 * this table. English source keys are exact and all other locales are intact.
 */
export const germanSocialManagementCopy:Readonly<Record<string,string>>={
 'CONFIRM GUILD ACTION':'GILDENAKTION BESTÄTIGEN',
 'GUILD MEMBER':'GILDENMITGLIED',
 'Member details':'Mitgliedsdetails',
 'GUILD ROLE':'GILDENROLLE',
 'JOINED GUILD':'BEITRITT',
 'Unavailable':'Nicht verfügbar',
 'Promote to Officer':'Zum Offizier befördern',
 'Allow this member to manage regular members.':'Erlaube diesem Mitglied, reguläre Mitglieder zu verwalten.',
 'Demote to Member':'Zum Mitglied zurückstufen',
 'Remove this member’s Officer permissions.':'Entziehe diesem Mitglied die Offiziersrechte.',
 'Transfer leadership':'Gildenleitung übertragen',
 'Hand over leadership and become an Officer.':'Übergib die Gildenleitung und werde selbst Offizier.',
 'Remove from Guild':'Aus Gilde entfernen',
 'Revoke this player’s Guild membership.':'Beende die Gildenmitgliedschaft dieses Spielers.',
 'Remove {name}?':'{name} entfernen?',
 'Give leadership to {name}?':'Gildenleitung an {name} übertragen?',
 'They will lose access to Guild chat, projects and benefits until they join another Guild.':'Diese Person verliert den Zugang zu Gildenchat, Projekten und Vorteilen, bis sie einer anderen Gilde beitritt.',
 'This member will become Guild Leader. You will become an Officer. This changes who can manage the Guild.':'Dieses Mitglied wird Gildenleiter. Du wirst Offizier und gibst die Verwaltungsrechte der Gildenleitung ab.',
 'Remove member':'Mitglied entfernen',
 'Keep current role':'Aktuelle Rolle beibehalten',
 'PLAYER ACTIONS':'SPIELERAKTIONEN',
 'View player profile':'Spielerprofil ansehen',
 "Open this player's public showcase":'Öffentliches Spielerprofil öffnen',
 'Your role does not allow changes to this member.':'Deine Gildenrolle erlaubt keine Änderungen an diesem Mitglied.',
 'Saving Guild changes…':'Gildenänderungen werden gespeichert…',
 'QUICK MATCH':'SCHNELLAUSWAHL',
 'LFG + LFM':'LFG + LFM',
 'Combat parties':'Kampfgruppen',
 'Skilling parties':'Fertigkeitsgruppen',
 'Open spots only':'Nur freie Plätze',
 'ACTIVITY LEVEL':'AKTIVITÄT',
 'Hide advanced filters':'Erweiterte Filter ausblenden',
 'Advanced filters':'Erweiterte Filter',
 'Playstyle':'Spielstil',
 'Availability':'Verfügbarkeit',
 'Guild interests':'Gildeninteressen',
 ' · comma separated':' · durch Kommas trennen',
 'Current · {objective}':'Aktuell · {objective}',
 'Posted by {name}':'Von {name}',
} as const;

export function germanSocialManagementText(language:Language,source:string):string{
 return language==='de'&&Object.prototype.hasOwnProperty.call(germanSocialManagementCopy,source)
  ?germanSocialManagementCopy[source]:source;
}

/** Runtime substitutions never interpret player names as replacement patterns. */
export function germanSocialManagementFormat(
 language:Language,source:string,values:Readonly<Record<string,string>>={}
):string{
 const template=germanSocialManagementText(language,source);
 return template.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g,(match,key)=>Object.prototype.hasOwnProperty.call(values,key)?values[key]:match);
}
