import type {Language} from './languages';
import type {PlaybackCombatStatus} from '../core/dungeon-combat-playback';
import {seasonalBossDisplayName} from './seasonal-boss-copy';

/** Exact status tag + English label contracts from the combat replay presentation layer.
 * Replays, ability identifiers, tags, stacks and expiry remain server authoritative.
 */
export const DUNGEON_GEM_EFFECT_ROWS={
  "gem:momentum": [
    "Momentum",
    "Schwung",
    "Impulso",
    "Momentum",
    "Slancio",
    "Élan",
    "Импульс",
    "İvme"
  ],
  "gem:critical_surge": [
    "Critical Surge",
    "Kritischer Schub",
    "Oleada crítica",
    "Kritieke golf",
    "Impeto critico",
    "Déferlante critique",
    "Критический всплеск",
    "Kritik Dalga"
  ],
  "gem:flow": [
    "Flow",
    "Fluss",
    "Flujo",
    "Flow",
    "Flusso",
    "Fluidité",
    "Поток",
    "Akış"
  ],
  "gem:unyielding": [
    "Unyielding",
    "Unbeugsam",
    "Inquebrantable",
    "Onwrikbaar",
    "Inflessibile",
    "Inébranlable",
    "Несокрушимость",
    "Boyun Eğmez"
  ],
  "gem:predator_boost": [
    "Predator",
    "Raubtier",
    "Depredador",
    "Roofdier",
    "Predatore",
    "Prédateur",
    "Хищник",
    "Yırtıcı"
  ],
  "gem:opening_phase": [
    "Opening Strike",
    "Eröffnungsschlag",
    "Golpe inicial",
    "Openingsaanval",
    "Colpo iniziale",
    "Frappe initiale",
    "Первый удар",
    "Açılış Darbesi"
  ],
  "gem:retaliation_ready": [
    "Retaliation Ready",
    "Vergeltung bereit",
    "Represalia lista",
    "Vergelding klaar",
    "Ritorsione pronta",
    "Riposte prête",
    "Возмездие готово",
    "Misilleme Hazır"
  ],
  "gem:battle_offense_ready": [
    "Offense Ready",
    "Angriff bereit",
    "Ataque listo",
    "Aanval klaar",
    "Attacco pronto",
    "Attaque prête",
    "Атака готова",
    "Saldırı Hazır"
  ],
  "gem:battle_support_ready": [
    "Support Ready",
    "Unterstützung bereit",
    "Apoyo listo",
    "Ondersteuning klaar",
    "Supporto pronto",
    "Soutien prêt",
    "Поддержка готова",
    "Destek Hazır"
  ],
  "gem:damage_reduction": [
    "Guard",
    "Schutz",
    "Guardia",
    "Bewaking",
    "Guardia",
    "Garde",
    "Защита",
    "Koruma"
  ],
  "gem:shared_resolve": [
    "Shared Resolve",
    "Gemeinsamer Wille",
    "Determinación compartida",
    "Gezamenlijke vastberadenheid",
    "Determinazione condivisa",
    "Détermination commune",
    "Общая решимость",
    "Ortak Kararlılık"
  ],
  "gem:benediction_charge": [
    "Benediction",
    "Segen",
    "Bendición",
    "Zegen",
    "Benedizione",
    "Bénédiction",
    "Благословение",
    "Kutsama"
  ],
  "gem:haste_bonus": [
    "Haste",
    "Eile",
    "Celeridad",
    "Haast",
    "Rapidità",
    "Hâte",
    "Ускорение",
    "Hız"
  ],
  "gem:opportunist_ready": [
    "Opportunist Mark",
    "Zeichen des Opportunisten",
    "Marca oportunista",
    "Opportunistenmerk",
    "Marchio dell'opportunista",
    "Marque de l'opportuniste",
    "Метка оппортуниста",
    "Fırsatçı İşareti"
  ]
} as const satisfies Record<string,readonly [string,string,string,string,string,string,string,string]>;
const LANG_COLUMN:Record<Language,number>={en:0,de:1,es:2,nl:3,it:4,fr:5,ru:6,tr:7};
/** Unknown tags/labels and new server effects remain verbatim. */
export function localizedDungeonEffectLabel(language:Language,status:Pick<PlaybackCombatStatus,'tag'|'label'|'source'>):string{
 if(language==='en')return status.label;
 if(status.source==='gem'){
  const row=Object.prototype.hasOwnProperty.call(DUNGEON_GEM_EFFECT_ROWS,status.tag)
   ?DUNGEON_GEM_EFFECT_ROWS[status.tag as keyof typeof DUNGEON_GEM_EFFECT_ROWS]:undefined;
  return row&&row[0]===status.label?row[LANG_COLUMN[language]]:status.label;
 }
 return seasonalBossDisplayName(language,status.label);
}
