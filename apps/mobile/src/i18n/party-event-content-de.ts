import type {Language} from './languages';
import type {LiveOpsActivityKind} from '../core/party-social';

/**
 * Display-only German translations for the five authored Party Live Ops event
 * templates. Require BOTH canonical English title and description, so a future
 * changed event, admin override, or user-created Party name is never guessed.
 */
export const germanPartyEventTemplates:Readonly<Record<string,readonly [string,string,string]>>={
 'Rift Surge':[
  'Stabilize a spreading Rift through combat and realm-support activities.',
  'Risswelle',
  'Stabilisiert einen sich ausbreitenden Riss durch Kämpfe und Aktivitäten zur Unterstützung des Reiches.',
 ],
 'Sunscar Invasion':[
  'Drive back an invasion with efficient combat, elite hunts and regional boss clears.',
  'Invasion in Sunscar',
  'Schlagt die Invasion mit Kämpfen, Jagden auf Elitegegner und Siegen über regionale Bosse zurück.',
 ],
 'Rebuild Asterfall':[
  'Gather, process and craft supplies to restore damaged frontier infrastructure.',
  'Wiederaufbau von Asterfall',
  'Sammelt, verarbeitet und fertigt Vorräte, um die beschädigten Anlagen im Grenzland wiederherzustellen.',
 ],
 'Frostmarch Supply Crisis':[
  'Keep remote settlements supplied through fishing, hunting, gathering and crafting.',
  'Versorgungskrise in Frostmarch',
  'Versorgt abgelegene Siedlungen durch Angeln, Jagen, Sammeln und Handwerk.',
 ],
 'Blackened Wells':[
  'Contain poisoned threats while gathering reagents and producing emergency remedies.',
  'Verseuchte Brunnen',
  'Haltet giftige Bedrohungen auf, sammelt Reagenzien und stellt dringend benötigte Heilmittel her.',
 ],
};

export function partyEventDisplayCopy(language:Language,name:string,description:string):{name:string;shortDescription:string}{
 const row=germanPartyEventTemplates[name];
 return language==='de'&&row?.[0]===description
  ?{name:row[1],shortDescription:row[2]}:{name,shortDescription:description};
}

export const germanPartyEventTags:Readonly<Record<string,string>>={
 rift:'Riss',
 mixed:'Gemischt',
 party_event:'Gruppenevent',
 sunscar:'Sunscar',
 combat:'Kampf',
 asterfall:'Asterfall',
 skilling:'Fertigkeiten',
 frostmarch:'Frostmarch',
 poison:'Gift',
};

export function partyEventTagText(language:Language,name:string,description:string,tag:string):string{
 const fallback=tag.replace(/_/g,' ');
 if(language!=='de'||germanPartyEventTemplates[name]?.[0]!==description)return fallback;
 return Object.prototype.hasOwnProperty.call(germanPartyEventTags,tag)?germanPartyEventTags[tag]:fallback;
}

/** Ranking eligibility codes are server enums, not player-created content.
 * Keep unknown codes readable rather than giving them an invented meaning.
 */
export const germanPartyEventRankReasons:Readonly<Record<string,string>>={
 party_points:'Zu wenige Gruppenpunkte',
 meaningful_contributors:'Zu wenige aktive Mitwirkende',
 minimum_combat_share:'Kampfbeitrag zu gering',
 minimum_skilling_share:'Fertigkeitsbeitrag zu gering',
};

export function partyEventRankReasonText(language:Language,reason:string):string{
 const fallback=reason.replace(/_/g,' ');
 return language==='de'&&Object.prototype.hasOwnProperty.call(germanPartyEventRankReasons,reason)
  ?germanPartyEventRankReasons[reason]:fallback;
}


/** Fixed activity enum names used by the Party Event contribution breakdown.
 * Activity IDs, content IDs and scored points remain untouched.
 */
export const germanPartyEventActivityNames:Readonly<Record<LiveOpsActivityKind,readonly [string,string]>>={
 combat:['Combat','Kampf'],
 gathering:['Gathering','Sammeln'],
 processing:['Processing','Verarbeitung'],
 crafting:['Crafting','Handwerk'],
 fishing:['Fishing','Angeln'],
 hunting:['Hunting','Jagd'],
 alchemy:['Alchemy','Alchemie'],
 delivery:['Deliveries','Lieferungen'],
};

export function partyEventActivityText(language:Language,activity:LiveOpsActivityKind):string{
 const names=germanPartyEventActivityNames[activity];
 return language==='de'?names[1]:names[0];
}
