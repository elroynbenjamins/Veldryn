import type {Language} from './languages';

/**
 * German UI-only text for the live Party Hub and its onboarding guidance.
 * Exact English source strings prevent accidental translation of user posts,
 * authored party names, or arbitrary server messages.
 */
export const germanPartySurfaceCopy:Readonly<Record<string,string>>={
  'Your members and weekly rewards are here. Claim ready rewards without opening extra menus.':'Hier findest du deine Mitglieder und wöchentlichen Belohnungen. Bereite Belohnungen direkt hier zur Abholung vor.',
  'Use Party options for invitations or to leave. Open Recruitment to find new members.':'Öffne die Gruppenoptionen für Einladungen oder um die Gruppe zu verlassen. Unter Rekrutierung findest du neue Mitglieder.',
  'Find players or publish an advert for your Party here.':'Finde hier Mitspieler oder veröffentliche eine Anzeige für deine Gruppe.',
  'Search and filters narrow the list. Your adverts and matching players appear below.':'Mit Suche und Filtern grenzt du die Ergebnisse ein. Deine Anzeigen und passende Spieler erscheinen darunter.',
  'Create or find a Party.':'Erstelle eine Gruppe oder finde eine bestehende.',
  'Create a Party or post in Recruitment.':'Erstelle eine Gruppe oder veröffentliche eine Anzeige unter Rekrutierung.',
  'Find a Party':'Gruppe finden',
  'Edit Party preferences':'Gruppeneinstellungen bearbeiten',
  'No active weekly contract.':'Kein aktiver Wochenauftrag.',
} as const;

export function germanPartySurfaceText(language:Language,source:string):string{
  return language==='de'&&Object.prototype.hasOwnProperty.call(germanPartySurfaceCopy,source)
    ?germanPartySurfaceCopy[source]:source;
}

export function partyMinimumLevelLabel(language:Language,minimumLevel:number):string{
  return (language==='de'?'St. ':'Lv. ')+minimumLevel+'+';
}
