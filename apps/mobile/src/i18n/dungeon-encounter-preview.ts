import type {Language} from './languages';
import type {CoopEncounterPreviewView} from '../core/coop-presentation';

/** Reviewed server-authored PvE archetype labels, English followed by DE/ES/NL/IT/FR/RU/TR. */
export const DUNGEON_ARCHETYPE_COPY={
  "bruiser": [
    "Bruiser",
    "Schläger",
    "Bruto",
    "Kneuzer",
    "Picchiatore",
    "Brute",
    "Громила",
    "Ezici"
  ],
  "assassin": [
    "Assassin",
    "Assassine",
    "Asesino",
    "Sluipmoordenaar",
    "Assassino",
    "Assassin",
    "Убийца",
    "Suikastçı"
  ],
  "caster": [
    "Caster",
    "Zauberwirker",
    "Hechicero",
    "Spreukgebruiker",
    "Incantatore",
    "Lanceur de sorts",
    "Заклинатель",
    "Büyücü"
  ],
  "swarm": [
    "Swarm",
    "Schwarm",
    "Enjambre",
    "Zwerm",
    "Sciame",
    "Essaim",
    "Рой",
    "Sürü"
  ],
  "guardian": [
    "Guardian",
    "Wächter",
    "Guardián",
    "Bewaker",
    "Guardiano",
    "Gardien",
    "Страж",
    "Muhafız"
  ],
  "hexer": [
    "Hexer",
    "Verhexer",
    "Maldecidor",
    "Vervloeker",
    "Maledicente",
    "Maudisseur",
    "Проклинатель",
    "Lanetçi"
  ],
  "executioner": [
    "Executioner",
    "Scharfrichter",
    "Verdugo",
    "Beul",
    "Carnefice",
    "Bourreau",
    "Палач",
    "Cellat"
  ],
  "support": [
    "Support",
    "Unterstützer",
    "Apoyo",
    "Ondersteuner",
    "Supporto",
    "Soutien",
    "Поддержка",
    "Destek"
  ]
} as const;
/** PvE mechanic labels and their counterplay explanations, in the same language order. */
export const DUNGEON_MECHANIC_COPY={
  "heavy_hit": {
    "label": [
      "Heavy Hit",
      "Schwerer Treffer",
      "Golpe fuerte",
      "Zware klap",
      "Colpo pesante",
      "Coup puissant",
      "Тяжёлый удар",
      "Ağır Darbe"
    ],
    "description": [
      "Strong focused attacks create tank pressure.",
      "Starke gezielte Angriffe setzen den Tank unter Druck.",
      "Los ataques potentes y dirigidos presionan al tanque.",
      "Krachtige gerichte aanvallen zetten de tank onder druk.",
      "Attacchi potenti e mirati mettono sotto pressione il tank.",
      "Les attaques puissantes et ciblées mettent le tank sous pression.",
      "Сильные прицельные атаки создают нагрузку на танка.",
      "Güçlü ve odaklı saldırılar tankı zorlar."
    ]
  },
  "focus": {
    "label": [
      "Focus",
      "Fokus",
      "Foco",
      "Focus",
      "Focus",
      "Ciblage",
      "Фокус",
      "Odak"
    ],
    "description": [
      "Can pressure a non-tank party member.",
      "Kann ein Gruppenmitglied außerhalb der Tank-Rolle gezielt bedrängen.",
      "Puede atacar con fuerza a un miembro que no sea tanque.",
      "Kan een groepslid dat geen tank is gericht onder druk zetten.",
      "Può prendere di mira un membro del gruppo diverso dal tank.",
      "Peut cibler un membre du groupe autre que le tank.",
      "Может сосредоточить атаки на участнике группы, не являющемся танком.",
      "Tank olmayan bir grup üyesini hedef alıp zorlayabilir."
    ]
  },
  "interrupt": {
    "label": [
      "Interrupt",
      "Unterbrechen",
      "Interrupción",
      "Onderbreken",
      "Interruzione",
      "Interruption",
      "Прерывание",
      "Kesme"
    ],
    "description": [
      "Dangerous casts can be interrupted.",
      "Gefährliche Zauber können unterbrochen werden.",
      "Se pueden interrumpir los lanzamientos peligrosos.",
      "Gevaarlijke spreuken kunnen worden onderbroken.",
      "Le abilità pericolose in lancio possono essere interrotte.",
      "Les incantations dangereuses peuvent être interrompues.",
      "Опасные заклинания можно прерывать.",
      "Tehlikeli yetenek kullanımları kesilebilir."
    ]
  },
  "aoe": {
    "label": [
      "Party Damage",
      "Gruppenschaden",
      "Daño al grupo",
      "Groepsschade",
      "Danni al gruppo",
      "Dégâts de groupe",
      "Урон по группе",
      "Grup Hasarı"
    ],
    "description": [
      "Can damage multiple party members at once.",
      "Kann mehrere Gruppenmitglieder gleichzeitig verletzen.",
      "Puede dañar a varios miembros del grupo a la vez.",
      "Kan meerdere groepsleden tegelijk verwonden.",
      "Può danneggiare più membri del gruppo contemporaneamente.",
      "Peut blesser plusieurs membres du groupe à la fois.",
      "Может одновременно наносить урон нескольким участникам группы.",
      "Aynı anda birden fazla grup üyesine hasar verebilir."
    ]
  },
  "dot": {
    "label": [
      "DoT",
      "Schaden über Zeit",
      "Daño continuo",
      "Schade over tijd",
      "Danni nel tempo",
      "Dégâts sur la durée",
      "Периодический урон",
      "Zamanla Hasar"
    ],
    "description": [
      "Applies damage over time.",
      "Verursacht Schaden über Zeit.",
      "Inflige daño a lo largo del tiempo.",
      "Brengt schade toe gedurende een bepaalde tijd.",
      "Infligge danni nel tempo.",
      "Inflige des dégâts sur la durée.",
      "Наносит периодический урон.",
      "Zaman içinde hasar verir."
    ]
  },
  "vulnerability": {
    "label": [
      "Vulnerability",
      "Verwundbarkeit",
      "Vulnerabilidad",
      "Kwetsbaarheid",
      "Vulnerabilità",
      "Vulnérabilité",
      "Уязвимость",
      "Savunmasızlık"
    ],
    "description": [
      "Applies increased damage taken.",
      "Erhöht den erlittenen Schaden.",
      "Aumenta el daño recibido.",
      "Verhoogt de ontvangen schade.",
      "Aumenta i danni subiti.",
      "Augmente les dégâts subis.",
      "Увеличивает получаемый урон.",
      "Alınan hasarı artırır."
    ]
  },
  "healing_reduction": {
    "label": [
      "Heal Cut",
      "Heilungshemmung",
      "Reducción de curación",
      "Minder genezing",
      "Riduzione cure",
      "Réduction des soins",
      "Снижение лечения",
      "İyileştirme Azaltma"
    ],
    "description": [
      "Reduces healing received for a short time.",
      "Verringert kurzzeitig erhaltene Heilung.",
      "Reduce brevemente la curación recibida.",
      "Vermindert kort de ontvangen genezing.",
      "Riduce per poco tempo le cure ricevute.",
      "Réduit brièvement les soins reçus.",
      "На короткое время снижает получаемое лечение.",
      "Kısa süreliğine alınan iyileştirmeyi azaltır."
    ]
  },
  "barrier": {
    "label": [
      "Barrier",
      "Barriere",
      "Barrera",
      "Barrière",
      "Barriera",
      "Barrière",
      "Барьер",
      "Bariyer"
    ],
    "description": [
      "Can create a protective barrier.",
      "Kann eine schützende Barriere erzeugen.",
      "Puede crear una barrera protectora.",
      "Kan een beschermende barrière maken.",
      "Può creare una barriera protettiva.",
      "Peut créer une barrière protectrice.",
      "Может создавать защитный барьер.",
      "Koruyucu bir bariyer oluşturabilir."
    ]
  },
  "enrage": {
    "label": [
      "Enrage",
      "Raserei",
      "Furia",
      "Razernij",
      "Furia",
      "Enragé",
      "Ярость",
      "Öfke"
    ],
    "description": [
      "Temporarily increases offensive pressure.",
      "Erhöht vorübergehend den Angriffsdruck.",
      "Aumenta temporalmente la presión ofensiva.",
      "Verhoogt tijdelijk de aanvalsdruk.",
      "Aumenta temporaneamente la pressione offensiva.",
      "Accroît temporairement la pression offensive.",
      "Временно усиливает атаки.",
      "Saldırı baskısını geçici olarak artırır."
    ]
  },
  "execute": {
    "label": [
      "Execute",
      "Hinrichten",
      "Ejecución",
      "Executie",
      "Esecuzione",
      "Exécution",
      "Добивание",
      "İnfaz"
    ],
    "description": [
      "Deals increased damage to low-health targets.",
      "Verursacht bei Zielen mit wenig Leben erhöhten Schaden.",
      "Inflige más daño a objetivos con poca salud.",
      "Doet meer schade aan doelen met weinig gezondheid.",
      "Infligge più danni ai bersagli con poca salute.",
      "Inflige plus de dégâts aux cibles blessées.",
      "Наносит повышенный урон целям с низким запасом здоровья.",
      "Sağlığı az hedeflere daha fazla hasar verir."
    ]
  },
  "sustain": {
    "label": [
      "Sustain",
      "Durchhaltevermögen",
      "Resistencia",
      "Volhouden",
      "Resistenza",
      "Endurance",
      "Выживаемость",
      "Dayanıklılık"
    ],
    "description": [
      "Can restore health or prolong the fight.",
      "Kann Leben wiederherstellen oder den Kampf verlängern.",
      "Puede recuperar salud o prolongar el combate.",
      "Kan gezondheid herstellen of het gevecht verlengen.",
      "Può recuperare salute o prolungare il combattimento.",
      "Peut restaurer des points de vie ou prolonger le combat.",
      "Может восстанавливать здоровье или продлевать бой.",
      "Sağlık yenileyebilir veya savaşı uzatabilir."
    ]
  }
} as const;
const column:Record<Language,number>={en:0,de:1,es:2,nl:3,it:4,fr:5,ru:6,tr:7};

/**
 * Only translate if every identifier, label, explanation and summary matches the
 * authoritative PvE projection. Leave changed/unknown server intel untouched.
 * These strings describe strategy; never infer new hazards or rewards.
 */
export function localizedDungeonEncounterPreview(language:Language,preview:CoopEncounterPreviewView):CoopEncounterPreviewView{
 if(language==='en')return preview;
 const labels:string[]=[],archetypes:CoopEncounterPreviewView['archetypes']=[],mechanics:CoopEncounterPreviewView['mechanics']=[];
 for(const item of preview.archetypes){
  const row=Object.prototype.hasOwnProperty.call(DUNGEON_ARCHETYPE_COPY,item.id)
   ?DUNGEON_ARCHETYPE_COPY[item.id as keyof typeof DUNGEON_ARCHETYPE_COPY]:undefined;
  if(!row||row[0]!==item.label)return preview;
  archetypes.push({...item,label:row[column[language]]});
  labels.push(item.label);
 }
 for(const item of preview.mechanics){
  const row=Object.prototype.hasOwnProperty.call(DUNGEON_MECHANIC_COPY,item.id)
   ?DUNGEON_MECHANIC_COPY[item.id as keyof typeof DUNGEON_MECHANIC_COPY]:undefined;
  if(!row||row.label[0]!==item.label||row.description[0]!==item.description)return preview;
  mechanics.push({...item,label:row.label[column[language]],description:row.description[column[language]]});
 }
 const sourceSummary=[...labels,...preview.mechanics.slice(0,2).map(item=>item.label)].join(' · ');
 if(preview.summary!==sourceSummary)return preview;
 const summary=[...archetypes.map(item=>item.label),...mechanics.slice(0,2).map(item=>item.label)].join(' · ');
 return {...preview,archetypes,mechanics,summary};
}
