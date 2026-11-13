/**
 * German-only coverage for source-authored gameplay labels which are not keyed
 * by the general six-language catalog yet. Keep names/UI-only: never mutate
 * persisted item, activity, or character identifiers.
 *
 * English source strings are checked before translating. Player chat and
 * player-entered names must never pass through this table.
 */
export const germanGameplayCoverage: Readonly<Record<string,string>>={
  // Mining nodes
  'Copper Outcrop':'Kupfervorkommen',
  'Copper Vein':'Kupferader',
  'Aster-Iron Vein':'Aster-Eisenader',
  'Oathstone Seam':'Eidsteinflöz',
  'Echo Quartz Geode':'Echoquarz-Geode',
  'Sunstone Outcrop':'Sonnensteinvorkommen',
  'Scorchwind Sunstone Seam':'Glutwind-Sonnensteinflöz',
  'Observatory Sunstone Geode':'Observatorium-Sonnenstein-Geode',
  'Frostiron Vein':'Frosteisenader',
  'Shiverlake Frostiron Seam':'Zittersee-Frosteisenflöz',
  'Wyrmspine Frostiron Vein':'Wyrmdorn-Frosteisenader',
  'Blackglass Vein':'Schwarzglasader',
  'Deep Blackglass Vein':'Tiefe Schwarzglasader',

  // Woodcutting nodes
  'Greenwood Tree':'Grünholzbaum',
  'Ironwood Tree':'Eisenholzbaum',
  'Crownwood Tree':'Kronenholzbaum',
  'Dunewood Tree':'Dünenholzbaum',
  'Scorchwind Dunewood Grove':'Glutwind-Dünenholzhain',
  'Whitepine Tree':'Weißkiefer',
  'Whitepine Thicket':'Weißkieferndickicht',
  'Cinderwood Tree':'Aschenholzbaum',
  'Heartfire Cinderwood':'Herzfeuer-Aschenholz',

  // Fishing nodes
  'Meadow Perch Pool':'Wiesenbarsch-Tümpel',
  'Silverbrook Shoal':'Silberbach-Untiefe',
  'River Eel Pool':'Flussaal-Tümpel',
  'Rootstream Trout Pool':'Wurzelbachforellen-Tümpel',
  'Oathscale Pool':'Eidschuppen-Tümpel',
  'Cave Loach Pool':'Höhlenschmerlen-Tümpel',
  'Crown Carp Pool':'Kronenkarpfen-Tümpel',
  'Oasis Carp Pool':'Oasenkarpfen-Tümpel',
  'Glassfin Pool':'Glasflossen-Tümpel',
  'Icefin Pool':'Eisflossen-Tümpel',
  'Shiverlake Icefin Pool':'Zittersee-Eisflossen-Tümpel',
  'Emberfin Mire':'Glutflossen-Sumpf',
  'Emberfin Deepwater':'Glutflossen-Tiefwasser',

  // Herbalism nodes
  'Dewleaf Patch':'Taublattfeld',
  'River Mint Bed':'Flussminzbeet',
  'Ironbloom Thicket':'Eisenblütendickicht',
  'Cavelichen Colony':'Höhlenflechtenkolonie',
  'Crown Sage Grove':'Kronensalbeihain',
  'Oathblossom Patch':'Eidblütenfeld',
  'Sunscale Bloom':'Sonnenschuppenblüte',
  'Frostbell Flower':'Frostglockenblume',
  'Wintermint Patch':'Winterminzfeld',
  'Mirage Saltbloom':'Fata-Morgana-Salzblüte',
  'Observatory Astral Sage':'Observatorium-Astralsalbei',
  'Whitepine Frostbell Thicket':'Weißkiefer-Frostglockendickicht',
  'Ashen Myrrh Grove':'Aschenmyrrhenhain',
  'Ashen Myrrh Crown':'Aschenmyrrhenkrone',

  // Gathering item names not covered by the shared item-name registry.
  'Dewleaf':'Taublatt',
  'River Mint':'Flussminze',
  'Ironbloom':'Eisenblüte',
  'Cavelichen':'Höhlenflechte',
  'Crown Sage':'Kronensalbei',
  'Oathblossom':'Eidblüte',
  'Ashen Myrrh':'Aschenmyrrhe',

  // Gathering tools and their blueprint-name stems.
  'Copper Pickaxe':'Kupferspitzhacke',
  'Greenwood Hatchet':'Grünholzbeil',
  'Reedline Fishing Rod':'Schilfschnur-Angelrute',
  'Aster-Iron Pickaxe':'Aster-Eisenspitzhacke',
  'Aster-Iron Hatchet':'Aster-Eisenbeil',
  'Ironwood Fishing Rod':'Eisenholz-Angelrute',
  'Oathstone Pickaxe':'Eidsteinspitzhacke',
  'Oathstone Hatchet':'Eidsteinbeil',
  'Oathscale Fishing Rod':'Eidschuppen-Angelrute',
  'Frostiron Pickaxe':'Frosteisenspitzhacke',
  'Frostiron Hatchet':'Frosteisenbeil',
  'Rimeglass Fishing Rod':'Reifglas-Angelrute',

  // Active-activity cycle status. The visible bar capitalizes these labels.
  'Tracking the target…':'Ziel wird verfolgt…',
  'Trading blows…':'Schläge werden ausgetauscht…',
  'Pressing the advantage…':'Vorteil wird genutzt…',
  'Finishing the encounter…':'Kampf wird beendet…',
  'Preparing materials…':'Materialien werden vorbereitet…',
  'Crafting in progress…':'Herstellung läuft…',
  'Finishing the work…':'Arbeit wird abgeschlossen…',
  'Quality check…':'Qualität wird geprüft…',
  'Warming up…':'Aufwärmen läuft…',
  'Practicing technique…':'Technik wird geübt…',
  'Refining form…':'Bewegung wird verfeinert…',
  'Completing the drill…':'Übung wird abgeschlossen…',
  'Setting out…':'Aufbruch wird vorbereitet…',
  'Surveying the route…':'Route wird erkundet…',
  'Following the trail…':'Der Spur wird gefolgt…',
  'Completing the route…':'Route wird abgeschlossen…',
  'Beginning practice…':'Übung beginnt…',
  'Maintaining focus…':'Konzentration wird gehalten…',
  'Deepening devotion…':'Hingabe wird vertieft…',
  'Completing the practice…':'Übung wird beendet…',
  'Preparing tools…':'Werkzeuge werden vorbereitet…',
  'Working the resource…':'Ressource wird bearbeitet…',
  'Finishing the action…':'Vorgang wird abgeschlossen…',
  'Packing the yield…':'Ertrag wird verstaut…',

  // Companion skill / sanctuary surfaces embedded in the Skills hub.
  'Companion Mastery':'Gefährtenmeisterschaft',
  'Companion Training':'Gefährtentraining',
  'Account-wide companion skill':'Kontoübergreifende Gefährtenfertigkeit',
  'Sanctuary facility':'Heiligtumsanlage',
  'ACCOUNT-WIDE SKILL':'KONTOÜBERGREIFENDE FERTIGKEIT',
  'SANCTUARY FACILITY':'HEILIGTUMSANLAGE',
  'Strengthen all companions through completed Expeditions, successful Trial floors and claimed Training Ground rewards. Mastery is shared across your characters.':'Stärke alle Gefährten durch abgeschlossene Expeditionen, bestandene Prüfungsstufen und abgeholte Belohnungen vom Trainingsplatz. Die Meisterschaft gilt für alle deine Charaktere.',
  'MASTERY LEVEL':'MEISTERSCHAFTSSTUFE',
  'Mastery reached · all bonuses unlocked':'Meisterschaft erreicht · alle Boni freigeschaltet',
  'COMPANION HP / ATTACK / DEFENSE':'GEFÄHRTEN-LP / ANGRIFF / VERTEIDIGUNG',
  'COMPANION XP EARNED':'ERHALTENE GEFÄHRTEN-EP',
  'EQUIPPED COMPANION ASSIST':'HILFE DURCH AKTIVEN GEFÄHRTEN',
  'At Level 100':'Auf Stufe 100',
  '+5% HP, Attack and Defense for all companions · +10% companion XP · +5% companion assist effectiveness. These are bonuses to companion values, not an extra 5% of your character\'s raw stats.':'+5 % LP, Angriff und Verteidigung für alle Gefährten · +10 % Gefährten-EP · +5 % Wirksamkeit der Gefährtenhilfe. Diese Boni gelten für Gefährtenwerte, nicht zusätzlich für die Grundwerte deines Charakters.',
  'How to earn Mastery XP':'So erhältst du Meisterschafts-EP',
  'Claim finished Expeditions, defeat Trial floors and collect completed Training Ground days. Failed or abandoned activities grant no Mastery XP. Repeated claims cannot earn the same reward twice.':'Hole abgeschlossene Expeditionen ab, besiege Prüfungsstufen und sammle abgeschlossene Trainingstage. Fehlgeschlagene oder abgebrochene Aktivitäten geben keine Meisterschafts-EP. Dieselbe Belohnung kann nicht mehrfach verdient werden.',
  'Training Ground upgrades are separate from this skill. Combat bonuses also apply to companions fighting in Trials and are reflected in Expedition Power previews.':'Verbesserungen des Trainingsplatzes sind von dieser Fertigkeit getrennt. Kampfboni gelten auch für Gefährten in Prüfungen und werden in den Vorschauen zur Expeditionsstärke berücksichtigt.',
  'The Training Ground is a Sanctuary upgrade, not a separate XP-based skill. Upgrade it to gain more Companion XP from each daily training claim.':'Der Trainingsplatz ist eine Verbesserung des Heiligtums und keine eigene EP-Fertigkeit. Verbessere ihn, um bei jeder täglichen Abholung mehr Gefährten-EP zu erhalten.',
  'TRAINING GROUND':'TRAININGSPLATZ',
  'XP PER ELIGIBLE COMPANION / DAY':'EP JE BERECHTIGTEM GEFÄHRTEN / TAG',
  'DAYS READY TO CLAIM':'ABHOLBARE TAGE',
  'ELIGIBLE COMPANIONS':'BERECHTIGTE GEFÄHRTEN',
  'Training accrues every 24 hours, up to seven days. Companions on Expeditions or active Trials do not receive this claim.':'Training sammelt sich alle 24 Stunden an, höchstens sieben Tage lang. Gefährten auf Expeditionen oder in aktiven Prüfungen erhalten diese Belohnung nicht.',
  'Next Training Ground upgrade':'Nächste Trainingsplatzverbesserung',
  'Materials ready':'Materialien vorhanden',
  'Collect the listed materials first':'Sammle zuerst die aufgeführten Materialien',
  'Upgrade Training Ground':'Trainingsplatz verbessern',
  'Training Ground fully upgraded':'Trainingsplatz vollständig verbessert',
  'Build a Training Ground in your Sanctuary':'Baue einen Trainingsplatz in deinem Heiligtum',
  'READY XP PER COMPANION':'ABHOLBARE EP JE GEFÄHRTEN',
  'Claim Companion Training':'Gefährtentraining abholen',
  'Open Companions & Sanctuary':'Gefährten und Heiligtum öffnen',
  'Individual companions become stronger through leveling, Bond, Ascension and abilities. This facility supports their XP growth; it does not directly increase combat stats.':'Einzelne Gefährten werden durch Stufenaufstiege, Bindung, Aufstieg und Fähigkeiten stärker. Diese Anlage erhöht ihren EP-Fortschritt, nicht direkt ihre Kampfwerte.',
  'Companion Essence':'Gefährtenessenz',
  'Facility Lv':'Anlagenstufe',
  'XP/day per idle companion':'EP/Tag je untätigem Gefährten',
  'XP/day':'EP/Tag',
  'adventure skill':'Abenteuerfertigkeit',
  'combat skill':'Kampffertigkeit',
  'gathering':'Sammeln',
  'crafting':'Handwerk',
  'devotion':'Hingabe',
};
const germanCoverageLowercase=new Map(Object.entries(germanGameplayCoverage).map(([english,german])=>[english.toLowerCase(),german]));
export function germanCoverageText(source:string):string|undefined{
 if(source.endsWith(' Blueprint')){
  const toolName=source.slice(0,-' Blueprint'.length);
  const localizedTool=germanGameplayCoverage[toolName];
  if(localizedTool)return localizedTool+'-Bauplan';
 }
 const exact=germanGameplayCoverage[source];
 if(exact!==undefined)return exact;
 const translated=germanCoverageLowercase.get(source.toLowerCase());
 if(translated===undefined)return undefined;
 return source===source.toUpperCase()?translated.toLocaleUpperCase('de-DE'):translated;
}
