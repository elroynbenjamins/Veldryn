import type {Language} from './languages';
const order=['de','es','nl','it','fr','ru','tr'] as const;
const copy:Readonly<Record<string,readonly string[]>>={
  "Rewards & drop rates": [
    "Belohnungen & Dropchancen",
    "Recompensas y probabilidades",
    "Beloningen en dropkansen",
    "Ricompense e probabilità",
    "Récompenses et taux de butin",
    "Награды и шанс добычи",
    "Ödüller ve düşme oranları"
  ],
  "Guaranteed on a successful clear": [
    "Garantiert bei erfolgreichem Abschluss",
    "Garantizado al completar",
    "Gegarandeerd na een geslaagde run",
    "Garantito completando",
    "Garanti après une victoire",
    "Гарантировано при успешном прохождении",
    "Başarılı tamamlamada garanti"
  ],
  "100% on clear, not a 100% chance to win.": [
    "100 % bei Abschluss, nicht 100 % Siegchance.",
    "100 % al completar, no es un 100 % de probabilidad de ganar.",
    "100% bij voltooien, niet 100% kans om te winnen.",
    "100% completando, non 100% di vittoria.",
    "100 % en cas de réussite, pas 100 % de chances de gagner.",
    "100% при победе, а не 100% шанс на победу.",
    "Tamamlanırsa %100; kazanma şansı %100 değildir."
  ],
  "Potential item drops": [
    "Mögliche Gegenstände",
    "Posibles objetos",
    "Mogelijke itemdrops",
    "Oggetti possibili",
    "Butin possible",
    "Возможные предметы",
    "Olası eşya düşüşleri"
  ],
  "No permanent item drop rates are published for regular dungeons yet.": [
    "Für reguläre Dungeons wurden noch keine dauerhaften Gegenstands-Dropchancen veröffentlicht.",
    "Todavía no se han publicado probabilidades de objetos permanentes para mazmorras normales.",
    "Voor gewone kerkers zijn nog geen dropkansen voor permanente items gepubliceerd.",
    "Le probabilità di oggetti permanenti nei dungeon normali non sono ancora pubblicate.",
    "Aucun taux de butin permanent n’est encore publié pour les donjons normaux.",
    "Для обычных подземелий ещё не опубликованы шансы получения постоянных предметов.",
    "Normal zindanlar için kalıcı eşya düşme oranları henüz yayımlanmadı."
  ],
  "Rewards must be claimed. After enhanced charges or the weekly cap, Marks are reduced to 20%.": [
    "Belohnungen müssen abgeholt werden. Ohne verstärkte Ladungen oder nach dem Wochenlimit gibt es 20 % der Marken.",
    "Debes reclamar los premios. Sin cargas mejoradas o tras el límite semanal, las marcas bajan al 20 %.",
    "Je moet beloningen claimen. Zonder versterkte ladingen of na de weeklimiet ontvang je 20% van de markeringen.",
    "Le ricompense vanno riscattate. Senza cariche potenziate o oltre il limite settimanale, i Marchi scendono al 20%.",
    "Les récompenses doivent être réclamées. Sans charges renforcées ou après la limite hebdomadaire, les marques passent à 20 %.",
    "Награды нужно забрать. Без усиленных зарядов или после недельного лимита выдаётся 20% отметок.",
    "Ödüller alınmalıdır. Güçlendirilmiş haklar biterse veya haftalık sınıra ulaşılırsa İşaretler %20'ye düşer."
  ],
  "Drop chance": [
    "Dropchance",
    "Probabilidad",
    "Dropkans",
    "Probabilità",
    "Probabilité",
    "Шанс",
    "Düşme şansı"
  ],
  "Live Fellowship bonus is conditional on remaining weekly bonuses.": [
    "Live-Gruppenbonus gilt nur, wenn noch Wochenboni übrig sind.",
    "El bonus de cooperación en vivo depende de los premios semanales restantes.",
    "De Live-samenwerkingsbonus geldt alleen zolang er weekbonussen over zijn.",
    "Il bonus cooperativo Live richiede bonus settimanali rimanenti.",
    "Le bonus de groupe Live dépend des bonus hebdomadaires restants.",
    "Бонус живой группы действует, только если остались недельные начисления.",
    "Canlı ekip bonusu yalnızca kalan haftalık bonuslarla geçerlidir."
  ],
  "Complete a dungeon to earn its clear reward. Failed runs may earn limited consolation Marks.": [
    "Schließe den Dungeon ab, um die Abschlussbelohnung zu erhalten. Bei Fehlschlägen sind begrenzte Trostmarken möglich.",
    "Completa la mazmorra para obtener el premio. Las derrotas pueden dar marcas de compensación limitadas.",
    "Voltooi de kerker voor de eindbeloning. Een mislukte run kan beperkte troostmarkeringen opleveren.",
    "Completa il dungeon per la ricompensa finale. I tentativi falliti possono concedere Marchi di consolazione limitati.",
    "Terminez le donjon pour recevoir le gain de victoire. Un échec peut donner des marques de consolation limitées.",
    "Завершите подземелье для награды. При неудаче возможны ограниченные утешительные отметки.",
    "Tamamlama ödülü için zindanı bitir. Başarısız koşulda sınırlı teselli İşaretleri verilebilir."
  ]
};
export function dungeonRewardPreviewText(language:Language,source:keyof typeof copy):string{
 const index=order.indexOf(language as typeof order[number]);
 return index<0?source:copy[source]?.[index]??source;
}
