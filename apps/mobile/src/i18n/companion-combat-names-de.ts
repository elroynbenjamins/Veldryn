import type {Language} from './languages';

/** Authoritative combat ability and bond trait names are display-only.
 * Verify BOTH immutable companion ID and exact English source before localizing.
 * Player, unknown server, and renamed content must never be rewritten.
 */
export const germanCompanionCombatNames:Readonly<Record<string,{
 active:readonly [string,string];
 bond:readonly [string,string];
}>>={
 UNIT_001:{active:['Hamstring Pounce','Sehnenbeißer-Sprung'],bond:['Relentless Chase','Unermüdliche Jagd']},
 UNIT_002:{active:['Rune Brace','Runenschutz'],bond:['Carved Shelter','Gemeißelter Schutz']},
 UNIT_003:{active:['Silver Current','Silberstrom'],bond:['Deep Current','Tiefenströmung']},
 UNIT_004:{active:['Briar Charge','Dornenansturm'],bond:['Rootbreaker','Wurzelbrecher']},
 UNIT_005:{active:['Lantern Snuff','Laternenlöscher'],bond:['Afterglow','Nachglühen']},
 UNIT_006:{active:["Page's Vow",'Schwur des Knappen'],bond:['Renewed Vow','Erneuerter Schwur']},
 UNIT_007:{active:['Gloamstep','Dämmertritt'],bond:['Final Shadow','Letzter Schatten']},
 UNIT_008:{active:['Dawn Pinion','Morgenschwinge'],bond:['Second Dawn','Zweite Morgenröte']},
 UNIT_009:{active:['Echo Rend','Echoriss'],bond:['Resonant Hunt','Resonanzjagd']},
 UNIT_010:{active:['Siege Bolt','Belagerungsbolzen'],bond:['Perfect Calibration','Perfekte Kalibrierung']},
 UNIT_011:{active:['Memory Command','Erinnerungsbefehl'],bond:['Perfect Recall','Vollkommene Erinnerung']},
 UNIT_012:{active:['Oathglass Reflection','Eidglasspiegelung'],bond:['True Reflection','Wahre Spiegelung']},
 UNIT_013:{active:['Venom Pounce','Giftsprung'],bond:['Perfect Ambush','Perfekter Hinterhalt']},
 UNIT_014:{active:['Mirage Spring','Trugbildquelle'],bond:['Deep Oasis','Tiefe Oase']},
 UNIT_015:{active:['Solar Carapace','Sonnenpanzer'],bond:['Sun Mirror','Sonnenspiegel']},
 UNIT_016:{active:['Crownward','Kronenschutz'],bond:['Unbroken Crown','Ungebrochene Krone']},
 UNIT_017:{active:['Rimefang Rush','Reifzahn-Ansturm'],bond:['Shatterfang','Splitterzahn']},
 UNIT_018:{active:['Resonant Chime','Resonanzklang'],bond:['Grand Resonance','Große Resonanz']},
 UNIT_019:{active:['Choir Ward','Chorschutz'],bond:['Fortified Hymn','Verstärkter Hymnus']},
 UNIT_020:{active:["Wyrm's Verdict",'Urteil des Wyrms'],bond:['Ancient Verdict','Uraltes Urteil']},
 UNIT_021:{active:['Obsidian Rend','Obsidianschnitt'],bond:['Molten Pursuit','Glühende Verfolgung']},
 UNIT_022:{active:['Forge Barrier','Schmiedebarriere'],bond:['Overheat Guard','Überhitzungsschutz']},
 UNIT_023:{active:['Primal Arc','Urzeitblitz'],bond:['Chain Surge','Kettenentladung']},
 UNIT_024:{active:["Regent's Decree",'Erlass des Regenten'],bond:['Royal Veil','Königlicher Schleier']},
 GUILD_UNIT_001:{active:['Stormwatch Aegis','Sturmwacht-Ägis'],bond:['Unbroken Fellowship','Ungebrochene Kameradschaft']},
 GUILD_UNIT_002:{active:['Oathstrike','Eidschlag'],bond:['Seeker Resolve','Entschlossenheit des Suchers']},
 GUILD_UNIT_003:{active:['Dawncall','Morgenruf'],bond:['Fellowship Hymn','Hymne der Gemeinschaft']},
 EVT_UNIT_001:{active:['First Dawn','Erste Morgenröte'],bond:['Dawn Renewed','Erneuerte Morgenröte']},
 EVT_UNIT_002:{active:['Vow Link','Schwurbund'],bond:['Unbroken Promise','Ungebrochenes Versprechen']},
 EVT_UNIT_003:{active:['Living Bastion','Lebendes Bollwerk'],bond:['Deep Roots','Tiefe Wurzeln']},
 EVT_UNIT_004:{active:['Solar Momentum','Sonnenschwung'],bond:['Final Radiance','Letzter Lichtglanz']},
 EVT_UNIT_005:{active:['Starfall Mark','Sternenfallmal'],bond:['Falling Star','Fallender Stern']},
 EVT_UNIT_006:{active:['Harvest Bulwark','Erntebollwerk'],bond:['Autumn Reserve','Herbstreserve']},
 EVT_UNIT_007:{active:['Veil Rend','Schleierschnitt'],bond:['Deep Gloom','Tiefe Finsternis']},
 EVT_UNIT_008:{active:['Hollow Ward','Hohlrüstungsschutz'],bond:['Unbroken Ward','Ungebrochener Schutz']},
 EVT_UNIT_011:{active:['Lantern Grace','Laternengnade'],bond:['Last Lantern','Letzte Laterne']},
 EVT_UNIT_009:{active:['Frostbell Cycle','Frostglockenklang'],bond:['Grand Bell','Große Glocke']},
 EVT_UNIT_010:{active:['Caravan Formation','Karawanenformation'],bond:['Long Road','Langer Weg']},
};

/** Technique names from the fixed server-authored technique catalogue.
 * Call only for objects returned by companionTechniques(), not arbitrary copy.
 */
export const germanCompanionTechniqueNames:Readonly<Record<string,string>>={
 'Venom Ambush':'Gifthinterhalt',
 'Sandstep':'Sandschritt',
 'Deep Oasis':'Tiefe Oase',
 'Mirage Current':'Trugbildströmung',
 'Solar Shell':'Sonnenpanzer',
 'Sun Mirror':'Sonnenspiegel',
 'Tyrant Bulwark':'Tyrannenbollwerk',
 'Burning Crown':'Brennende Krone',
 'Shatterfang':'Splitterzahn',
 'Winter Hunt':'Winterjagd',
 'Grand Resonance':'Große Resonanz',
 'Quick Chime':'Schneller Glockenklang',
 'Resonant Plating':'Resonanzpanzerung',
 'Fracture Hymn':'Bruchhymne',
 "Wyrm's Fury":'Zorn des Wyrms',
 'Telegraph Hunter':'Vorzeichenjäger',
 'Obsidian Fang':'Obsidianfang',
 'Molten Pursuit':'Glühende Verfolgung',
 'Forge Barrier':'Schmiedebarriere',
 'Overheat Guard':'Überhitzungsschutz',
 'Chain Surge':'Kettenentladung',
 'Quick Spark':'Schneller Funke',
 "Regent's Ward":'Schutz des Regenten',
 'Shade Command':'Schattenbefehl',
 'Aegis Bulwark':'Ägisbollwerk',
 'Watchful Reprisal':'Wachsame Vergeltung',
 'Oathstrike':'Eidschlag',
 'Trailfinder':'Pfadfinder',
 'Dawncall':'Morgenruf',
 'Skylark Cadence':'Lerchenrhythmus',
 'First Light':'Erstes Licht',
 'New Dawn':'Neue Morgenröte',
 'Shared Vow':'Gemeinsamer Schwur',
 'Guarded Bond':'Geschütztes Band',
 'Root Bastion':'Wurzelbastion',
 'Living Bark':'Lebende Rinde',
 'Solar Momentum':'Sonnenschwung',
 'Final Radiance':'Letzter Lichtglanz',
 'Starfall':'Sternenfall',
 'Astral Tempo':'Astralrhythmus',
 'Stored Harvest':'Gespeicherte Ernte',
 'Autumn Reprisal':'Herbstvergeltung',
 'Veil Rend':'Schleierschnitt',
 'Shadow Chase':'Schattenjagd',
 'Gravebell Ward':'Grabglockenschutz',
 'Toll of Stone':'Steingeläut',
 'Wardlight':'Schutzlicht',
 'Last Lantern':'Letzte Laterne',
 'Grand Bell':'Große Glocke',
 'Quick Bell':'Schnelle Glocke',
 'Caravan Ward':'Karawanenschutz',
 'Adaptable Route':'Anpassungsfähige Route',
 'Fortified Shell':'Verstärkter Panzer',
 'Reflective Shell':'Reflektierender Panzer',
 'Executioner':'Scharfrichter',
 'Relentless':'Unermüdlich',
 'Deep Restoration':'Tiefe Wiederherstellung',
 'Rapid Aid':'Schnelle Hilfe',
};

/** The first 12 server companions still use default Signature names in combat replays.
 * Preserve the proper companion name and localize only the generic ability type.
 */
export const germanCompanionLegacySignatures:Readonly<Record<string,string>>={
 UNIT_001:'Ironwood Hound',UNIT_002:'Runebound Sentry',UNIT_003:'Silverbrook Sprite',
 UNIT_004:'Briarhorn Cub',UNIT_005:'Lantern Wisp',UNIT_006:'Oathbound Page',
 UNIT_007:'Gloamknife Shade',UNIT_008:'Dawnwing',UNIT_009:'Echo Stalker',
 UNIT_010:'Forge Automaton',UNIT_011:"Veyren's Memory",UNIT_012:'Oathglass Knightling',
};

export function companionCombatAbilityName(language:Language,companionId:string,source:string):string{
 if(language!=='de')return source;
 const entry=germanCompanionCombatNames[companionId]?.active;
 if(entry?.[0]===source)return entry[1];
 const signature=germanCompanionLegacySignatures[companionId];
 return signature&&source===signature+' Signature'?'Spezialfähigkeit: '+signature:source;
}

export function companionCombatBondName(language:Language,companionId:string,source:string):string{
 const entry=germanCompanionCombatNames[companionId]?.bond;
 return language==='de'&&entry?.[0]===source?entry[1]:source;
}

export function companionTechniqueName(language:Language,techniqueId:string,source:string):string{
 // IDs are authored per companion and never accepted from player input.
 if(language!=='de'||!/^(?:UNIT_\d{3}|GUILD_UNIT_\d{3}|EVT_UNIT_\d{3})_(?:FORTIFIED|REFLECTIVE|EXECUTIONER|RELENTLESS|DEEP_RESTORATION|RAPID_AID)$/.test(techniqueId))
  return source;
 return Object.prototype.hasOwnProperty.call(germanCompanionTechniqueNames,source)
  ?germanCompanionTechniqueNames[source]:source;
}


/**
 * Remaining authored description gaps across the Event companion identities
 * and new custom combat techniques. The large shared companion catalog already
 * covers the other descriptions. Strict source lookup prevents translation of
 * player-entered or arbitrary server strings.
 */
export const germanCompanionCombatDescriptions:Readonly<Record<string,string>>={
 'Raises a heavy ward that reduces incoming pressure and protects the front line.':'Errichtet einen starken Schutzwall, der eingehenden Schaden verringert und die Front schützt.',
 'Hollow Armor: steadier mitigation during prolonged fights.':'Hohlrüstung: zuverlässigere Schadensminderung in längeren Kämpfen.',
 'Bond 10 strengthens Hollow Knightling mitigation.':'Bindung 10 verbessert die Schadensminderung des Hohlritters.',
 'Restores the weakest ally and briefly accelerates recovery cadence.':'Heilt den schwächsten Verbündeten und beschleunigt kurzzeitig weitere Heilungen.',
 'Wardlight: slightly faster support cadence.':'Schutzlicht: Unterstützungsfähigkeiten werden etwas häufiger eingesetzt.',
 'Bond 10 strengthens Lantern Keeper restorative support.':'Bindung 10 verstärkt die Heilunterstützung des Laternenhüters.',
 'Deepen the Sentinel’s sheltering ward.':'Verstärkt den Schutzwall des Wächters.',
 'Turn steady defense into a measured counter.':'Wandelt stabile Verteidigung in einen gezielten Gegenschlag um.',
 'Sharpen the Seeker’s decisive finishing blow.':'Verstärkt den entscheidenden letzten Schlag des Suchers.',
 'Keep the Seeker moving from mark to mark.':'Hält den Sucher von Ziel zu Ziel in Bewegung.',
 'Carry a brighter restorative refrain through the party.':'Stärkt die heilende Melodie, die die Gruppe unterstützt.',
 'Raise the tempo of the Herald’s support cycle.':'Erhöht das Tempo der Unterstützungsfähigkeiten des Herolds.',
 'Reinforce the Knightling’s ward for prolonged frontline pressure.':'Verstärkt den Schutz des kleinen Ritters für lange Kämpfe an der Front.',
 'Trade a little ward strength for faster defensive cycling.':'Verringert die Schutzstärke leicht und ermöglicht schnellere Verteidigungsfähigkeiten.',
 'Strengthen Lanternwing’s restorative support pulse.':'Verstärkt den heilenden Unterstützungsimpuls des Laternenflügels.',
 'Cycle support more quickly while retaining a smaller recovery boost.':'Unterstützungsfähigkeiten werden häufiger eingesetzt, allerdings mit geringerer Heilwirkung.',
};

export function companionCombatDescriptionText(language:Language,source:string):string|undefined{
 return language==='de'&&Object.prototype.hasOwnProperty.call(germanCompanionCombatDescriptions,source)
  ?germanCompanionCombatDescriptions[source]:undefined;
}


/** Authored Companion Trial enemy abilities and phase names.
 * Applied only inside Trial preview/replay UI, never to gameplay identifiers.
 */
export const germanCompanionTrialAbilities:Readonly<Record<string,string>>={
 'Guarded Ward':'Schutzbarriere',
 'Predatory Rush':'Raubtieransturm',
 'Arc Pulse':'Arkaner Impuls',
 'Runic Bastion':'Runenbollwerk',
 "Tyrant's Ascendance":'Aufstieg des Tyrannen',
 'Glass Fracture':'Glasbruch',
 'White Silence Toll':'Glockenschlag der weißen Stille',
 'Crucible Overheat':'Überhitzter Schmelztiegel',
 'Rift Unbound':'Entfesselter Riss',
 'Riftfire Frenzy':'Rissfeuer-Raserei',
 'Final Decree':'Letzter Erlass',
 'Echo Crown':'Echokrone',
 'Runic Shockwave':'Runenschockwelle',
 'Stone Brace':'Steinschutz',
 'Tyrant Glass Spear':'Glasspeer des Tyrannen',
 "Tyrant's Fury":'Zorn des Tyrannen',
 'Bell of White Silence':'Glocke der weißen Stille',
 'Crucible Hammer':'Schmelztiegelhammer',
 'Riftfire Sweep':'Rissfeuer-Schlag',
 'Riftfire Focus':'Rissfeuer-Fokus',
 'Regent Decree':'Erlass des Regenten',
 "Crown's Judgment":'Urteil der Krone',
};

export function companionTrialAbilityName(language:Language,source:string):string{
 return language==='de'&&Object.prototype.hasOwnProperty.call(germanCompanionTrialAbilities,source)
  ?germanCompanionTrialAbilities[source]:source;
}
