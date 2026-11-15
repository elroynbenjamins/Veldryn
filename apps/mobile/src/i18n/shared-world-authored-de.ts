import type {Language} from './languages';

/**
 * German-only display copy for fixed, server-authored Shared World templates.
 * Match the complete English text exactly; unknown, customized or renamed
 * server messages and all player-authored strings must remain unchanged.
 * Do not use translations for template IDs, phase IDs or stored state.
 */
export const GERMAN_SHARED_WORLD_AUTHORED_COPY:Readonly<Record<string,string>>={
  "Cindermaw, the Sunscar Tyrant": "Cindermaw, der Tyrann von Sunscar",
  "A colossal threat pushing through the Sunscar incursion.": "Eine gewaltige Bedrohung dringt während des Vorstoßes in Sunscar vor.",
  "The Riftbound Colossus": "Der riftgebundene Koloss",
  "A massive entity forced through the breach by unstable Rift pressure.": "Eine riesige Kreatur, die durch den instabilen Rissdruck in unsere Welt gedrängt wird.",
  "Unbroken": "Ungebrochen",
  "The boss fights at full strength while responders establish a rhythm.": "Der Boss kämpft mit voller Stärke, während die Angreifer ihren Rhythmus finden.",
  "Enraged": "In Raserei",
  "At 70% HP the boss gains pressure and new mechanics.": "Bei 70 % LP wird der Boss gefährlicher und setzt neue Mechaniken ein.",
  "Last Stand": "Letztes Aufbäumen",
  "Below 35% HP the final mechanics activate.": "Unter 35 % LP werden die letzten Mechaniken aktiviert.",
  "Rift Breach": "Rissdurchbruch",
  "Contain a widening breach through combat and stabilizing skilling work.": "Halte den wachsenden Riss durch Kämpfe und stabilisierende Fertigkeitsaktionen auf.",
  "Sunscar Incursion": "Sunscar-Vorstoß",
  "Break an organized incursion through sustained regional combat.": "Schlage einen organisierten Vorstoß durch anhaltende Kämpfe in der Region zurück.",
  "Frostmarch Whiteout": "Schneetreiben in Frostmarch",
  "Keep settlements supplied and routes open through a severe regional whiteout.": "Versorge die Siedlungen und halte die Wege trotz des heftigen Schneetreibens offen.",
  "Response Mobilized": "Einsatzkräfte mobilisiert",
  "Regional responders have established a stable foothold.": "Die regionalen Einsatzkräfte haben einen sicheren Stützpunkt errichtet.",
  "Turning Point": "Wendepunkt",
  "The crisis is being pushed back and additional response options open.": "Die Krise wird zurückgedrängt und weitere Einsatzmöglichkeiten werden verfügbar.",
  "Region Secured": "Region gesichert",
  "The regional objective has been completed.": "Das regionale Ziel wurde abgeschlossen.",
  "Crisis Ended": "Krise beendet",
  "secured": "gesichert",
  "HP remaining": "LP verbleibend",
  "fight": "Kampf",
  "fights": "Kämpfe"
};

export function sharedWorldAuthoredText(language:Language,source:string):string{
 if(language!=='de')return source;
 return Object.prototype.hasOwnProperty.call(GERMAN_SHARED_WORLD_AUTHORED_COPY,source)
  ?GERMAN_SHARED_WORLD_AUTHORED_COPY[source]:source;
}
