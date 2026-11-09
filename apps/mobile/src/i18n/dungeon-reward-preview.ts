import type {Language} from './languages';
/** Compact Dungeon reward preview text for every supported player language. */
const COPY={
  "en": {
    "normal": "Normal",
    "veteran": "Veteran",
    "heroic": "Heroic",
    "guaranteed": "Guaranteed on clear",
    "potential": "Possible drops",
    "noRates": "No verified item-drop rates are published for this dungeon yet.",
    "estimate": "Amounts shown are clear estimates, not payment for merely entering.",
    "finalMarks": "Final Marks depend on reward charges, clear bonuses and the claim.",
    "chance": "Chance per eligible clear",
    "pity": "Pity by clear",
    "notGuaranteed": "No extra item reward is guaranteed."
  },
  "nl": {
    "normal": "Normaal",
    "veteran": "Veteraan",
    "heroic": "Heroïsch",
    "guaranteed": "Gegarandeerd bij voltooien",
    "potential": "Mogelijke drops",
    "noRates": "Voor deze dungeon zijn nog geen gecontroleerde itemdropkansen gepubliceerd.",
    "estimate": "De bedragen zijn schattingen bij een voltooide run, niet voor deelname alleen.",
    "finalMarks": "De uiteindelijke Marks hangen af van beloningsladingen, bonussen en het claimen.",
    "chance": "Kans per geldige clear",
    "pity": "Garantie na aantal clears",
    "notGuaranteed": "Extra items zijn niet gegarandeerd."
  },
  "de": {
    "normal": "Normal",
    "veteran": "Veteran",
    "heroic": "Heroisch",
    "guaranteed": "Garantiert bei Abschluss",
    "potential": "Mögliche Beute",
    "noRates": "Für diesen Dungeon sind noch keine überprüften Gegenstandsraten veröffentlicht.",
    "estimate": "Die Beträge sind Schätzungen für einen erfolgreichen Abschluss, nicht für den Einstieg.",
    "finalMarks": "Die endgültigen Marken hängen von Belohnungsladungen, Bonus und Abholung ab.",
    "chance": "Chance pro gültigem Abschluss",
    "pity": "Garantie nach Abschlüssen",
    "notGuaranteed": "Zusätzliche Gegenstände sind nicht garantiert."
  },
  "es": {
    "normal": "Normal",
    "veteran": "Veterano",
    "heroic": "Heroico",
    "guaranteed": "Garantizado al completar",
    "potential": "Posibles botines",
    "noRates": "Todavía no se han publicado tasas verificadas de objetos para esta mazmorra.",
    "estimate": "Los importes son estimaciones por terminar, no por entrar.",
    "finalMarks": "Las marcas finales dependen de cargas, bonificaciones y la reclamación.",
    "chance": "Probabilidad por victoria válida",
    "pity": "Garantía tras victorias",
    "notGuaranteed": "No se garantizan objetos adicionales."
  },
  "it": {
    "normal": "Normale",
    "veteran": "Veterano",
    "heroic": "Eroico",
    "guaranteed": "Garantito al completamento",
    "potential": "Possibili bottini",
    "noRates": "Non ci sono ancora percentuali verificate per gli oggetti di questo dungeon.",
    "estimate": "Gli importi sono stime di completamento, non premi per il solo ingresso.",
    "finalMarks": "I Marchi finali dipendono da cariche, bonus e riscossione.",
    "chance": "Probabilità per vittoria valida",
    "pity": "Garanzia dopo vittorie",
    "notGuaranteed": "Non sono garantiti oggetti aggiuntivi."
  },
  "fr": {
    "normal": "Normal",
    "veteran": "Vétéran",
    "heroic": "Héroïque",
    "guaranteed": "Garanti à la victoire",
    "potential": "Butin possible",
    "noRates": "Aucun taux vérifié de butin n'est publié pour ce donjon pour le moment.",
    "estimate": "Les montants sont des estimations de victoire, pas de simple participation.",
    "finalMarks": "Les marques finales dépendent des charges, bonus et réclamations.",
    "chance": "Chance par victoire éligible",
    "pity": "Garantie après victoires",
    "notGuaranteed": "Aucun objet supplémentaire n'est garanti."
  },
  "ru": {
    "normal": "Обычный",
    "veteran": "Ветеран",
    "heroic": "Героический",
    "guaranteed": "Гарантия за победу",
    "potential": "Возможные предметы",
    "noRates": "Для этого подземелья пока нет подтверждённых шансов выпадения предметов.",
    "estimate": "Это оценка награды за победу, а не за один вход.",
    "finalMarks": "Итоговые марки зависят от зарядов, бонусов и получения награды.",
    "chance": "Шанс за подходящую победу",
    "pity": "Гарантия после побед",
    "notGuaranteed": "Дополнительные предметы не гарантированы."
  },
  "tr": {
    "normal": "Normal",
    "veteran": "Kıdemli",
    "heroic": "Kahraman",
    "guaranteed": "Tamamlayınca garanti",
    "potential": "Olası ganimetler",
    "noRates": "Bu zindan için doğrulanmış eşya düşme oranları henüz yayımlanmadı.",
    "estimate": "Miktarlar sadece giriş değil, başarılı tamamlanma tahminidir.",
    "finalMarks": "Son İşaretler ödül haklarına, bonuslara ve ödül almaya bağlıdır.",
    "chance": "Uygun zafer başına olasılık",
    "pity": "Zafer sayısıyla garanti",
    "notGuaranteed": "Ek eşyalar garanti değildir."
  }
} as const;
export type DungeonRewardCopyKey=keyof typeof COPY.en;
export function dungeonRewardText(language:Language,key:DungeonRewardCopyKey):string{
 return COPY[language]?.[key]??COPY.en[key];
}
