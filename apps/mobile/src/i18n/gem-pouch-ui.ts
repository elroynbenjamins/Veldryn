import type {Language} from './languages';
import {SUPPORTED_LANGUAGES} from './languages';
import {interpolateTranslation,type TranslationParams} from './translator';

/** Authored Gem Pouch controls, help, actions and warnings; no command changes.
 * Rows are DE/ES/NL/IT/FR/RU/TR; unrecognized server content stays unchanged. */
type SevenLanguages=readonly [string,string,string,string,string,string,string];
export const gemPouchUiRows={
  "Gem Pouch": [
    "Edelsteinbeutel",
    "Bolsa de gemas",
    "Edelsteenzak",
    "Sacca delle gemme",
    "Sac à gemmes",
    "Сумка самоцветов",
    "Mücevher Kesesi"
  ],
  "Expand Gem Pouch": [
    "Edelsteinbeutel öffnen",
    "Expandir bolsa de gemas",
    "Edelsteenzak uitklappen",
    "Espandi sacca delle gemme",
    "Déplier le sac à gemmes",
    "Развернуть сумку самоцветов",
    "Mücevher kesesini genişlet"
  ],
  "Collapse Gem Pouch": [
    "Edelsteinbeutel schließen",
    "Contraer bolsa de gemas",
    "Edelsteenzak inklappen",
    "Comprimi sacca delle gemme",
    "Replier le sac à gemmes",
    "Свернуть сумку самоцветов",
    "Mücevher kesesini daralt"
  ],
  "{used}/{capacity} slots · Shared across characters": [
    "{used}/{capacity} Plätze · Von allen Charakteren genutzt",
    "{used}/{capacity} espacios · Compartido entre personajes",
    "{used}/{capacity} vakken · Gedeeld tussen personages",
    "{used}/{capacity} spazi · Condiviso tra personaggi",
    "{used}/{capacity} emplacements · Partagé entre personnages",
    "{used}/{capacity} ячеек · Общий для персонажей",
    "{used}/{capacity} yuva · Karakterler arasında ortak"
  ],
  "Tap a gem to inspect or manage it. Shared across characters; socketing and Enchanting use stored gems automatically.": [
    "Tippe auf einen Edelstein für Details und Aktionen. Alle Charaktere teilen den Vorrat; Sockeln und Verzaubern nutzen ihn automatisch.",
    "Toca una gema para verla o gestionarla. Todos los personajes comparten las gemas y el engaste y encantamiento las usan automáticamente.",
    "Tik op een edelsteen om deze te bekijken of te beheren. Alle personages delen de voorraad; plaatsen en betoveren gebruiken deze automatisch.",
    "Tocca una gemma per esaminarla o gestirla. Tutti i personaggi condividono le gemme; incastonatura e incantamento le usano automaticamente.",
    "Touchez une gemme pour l'examiner ou la gérer. Les personnages partagent ce stock ; le sertissage et l'enchantement l'utilisent automatiquement.",
    "Нажмите на самоцвет для просмотра или управления. Хранилище общее для персонажей; вставка и зачарование используют камни автоматически.",
    "İncelemek veya yönetmek için taşa dokun. Kese tüm karakterlerce paylaşılır; yuvalama ve büyüleme taşları otomatik kullanır."
  ],
  "{name}, {count} owned. Tap for details and actions": [
    "{name}, {count} im Besitz. Für Details und Aktionen tippen",
    "{name}, {count} disponibles. Toca para ver detalles y acciones",
    "{name}, {count} in bezit. Tik voor details en acties",
    "{name}, {count} possedute. Tocca per dettagli e azioni",
    "{name}, {count} en stock. Touchez pour les détails et actions",
    "{name}, в наличии: {count}. Нажмите для подробностей и действий",
    "{name}, sahip olunan: {count}. Ayrıntılar ve işlemler için dokun"
  ],
  "Empty Gem Pouch slot": [
    "Leerer Edelsteinplatz",
    "Espacio vacío de gemas",
    "Leeg edelsteenvak",
    "Spazio gemme vuoto",
    "Emplacement de gemme vide",
    "Пустая ячейка самоцветов",
    "Boş mücevher yuvası"
  ],
  "Opens gem details and actions": [
    "Öffnet Edelsteindetails und Aktionen",
    "Abre detalles y acciones de la gema",
    "Opent edelsteendetails en acties",
    "Apre dettagli e azioni della gemma",
    "Ouvre les détails et actions de la gemme",
    "Открывает сведения и действия с самоцветом",
    "Taş ayrıntılarını ve işlemlerini açar"
  ],
  "Previous": [
    "Zurück",
    "Anterior",
    "Vorige",
    "Precedente",
    "Précédent",
    "Назад",
    "Önceki"
  ],
  "Next": [
    "Weiter",
    "Siguiente",
    "Volgende",
    "Successivo",
    "Suivant",
    "Далее",
    "Sonraki"
  ],
  "Next: {count} slots": [
    "Danach: {count} Plätze",
    "Siguiente: {count} espacios",
    "Volgend: {count} vakken",
    "Prossimo: {count} spazi",
    "Suivant : {count} emplacements",
    "Следующий уровень: {count} ячеек",
    "Sonraki: {count} yuva"
  ],
  "Maximum capacity reached": [
    "Maximale Kapazität erreicht",
    "Capacidad máxima alcanzada",
    "Maximale capaciteit bereikt",
    "Capienza massima raggiunta",
    "Capacité maximale atteinte",
    "Достигнута максимальная вместимость",
    "Azami kapasiteye ulaşıldı"
  ],
  "Level {level} · {gold} Gold": [
    "Stufe {level} · {gold} Gold",
    "Nivel {level} · {gold} de oro",
    "Niveau {level} · {gold} goud",
    "Livello {level} · {gold} oro",
    "Niveau {level} · {gold} or",
    "Уровень {level} · {gold} золота",
    "Seviye {level} · {gold} altın"
  ],
  " · Requires level and Gold": [
    " · Benötigt Stufe und Gold",
    " · Requiere nivel y oro",
    " · Vereist niveau en goud",
    " · Richiede livello e oro",
    " · Niveau et or requis",
    " · Нужен уровень и золото",
    " · Seviye ve altın gerekli"
  ],
  "Upgrade": [
    "Verbessern",
    "Mejorar",
    "Verbeteren",
    "Migliora",
    "Améliorer",
    "Улучшить",
    "Yükselt"
  ],
  "Maxed": [
    "Maximum",
    "Máximo",
    "Maximaal",
    "Massimo",
    "Maximum",
    "Максимум",
    "Maksimum"
  ],
  "Close Gem Pouch item details": [
    "Edelsteindetails schließen",
    "Cerrar detalles de la gema",
    "Edelsteendetails sluiten",
    "Chiudi dettagli della gemma",
    "Fermer les détails de la gemme",
    "Закрыть сведения о самоцвете",
    "Taş ayrıntılarını kapat"
  ],
  "GEM POUCH · ACCOUNT STORAGE": [
    "EDELSTEINBEUTEL · KONTO-LAGER",
    "BOLSA DE GEMAS · ALMACÉN DE CUENTA",
    "EDELSTEENZAK · ACCOUNTOPSLAG",
    "SACCA DELLE GEMME · DEPOSITO ACCOUNT",
    "SAC À GEMMES · STOCKAGE DU COMPTE",
    "СУМКА САМОЦВЕТОВ · ХРАНИЛИЩЕ АККАУНТА",
    "MÜCEVHER KESESİ · HESAP DEPOSU"
  ],
  "Gem details": [
    "Edelsteindetails",
    "Detalles de gema",
    "Edelsteendetails",
    "Dettagli gemma",
    "Détails de la gemme",
    "Сведения о самоцвете",
    "Taş ayrıntıları"
  ],
  "UNREFINED": [
    "UNVERARBEITET",
    "SIN REFINAR",
    "ONGERAFFINEERD",
    "NON RAFFINATA",
    "NON RAFFINÉE",
    "НЕОБРАБОТАННЫЙ",
    "İŞLENMEMİŞ"
  ],
  "STAT GEM": [
    "WERTE-EDELSTEIN",
    "GEMA DE ESTADÍSTICA",
    "STATISTIEKEDELSTEEN",
    "GEMMA STATISTICA",
    "GEMME DE STATISTIQUE",
    "САМОЦВЕТ ХАРАКТЕРИСТИК",
    "İSTATİSTİK TAŞI"
  ],
  "EFFECT GEM": [
    "EFFEKT-EDELSTEIN",
    "GEMA DE EFECTO",
    "EFFECTEDELSTEEN",
    "GEMMA EFFETTO",
    "GEMME D'EFFET",
    "САМОЦВЕТ ЭФФЕКТА",
    "ETKİ TAŞI"
  ],
  "GEM": [
    "EDELSTEIN",
    "GEMA",
    "EDELSTEEN",
    "GEMMA",
    "GEMME",
    "САМОЦВЕТ",
    "MÜCEVHER"
  ],
  "Raw": [
    "Roh",
    "En bruto",
    "Ruw",
    "Grezza",
    "Brute",
    "Сырой",
    "Ham"
  ],
  "{count} in Gem Pouch · Account-wide": [
    "{count} im Edelsteinbeutel · Kontoweit",
    "{count} en bolsa de gemas · Toda la cuenta",
    "{count} in edelsteenzak · Accountbreed",
    "{count} nella sacca · Tutto l'account",
    "{count} dans le sac · Tout le compte",
    "{count} в сумке самоцветов · Весь аккаунт",
    "Kesede {count} · Tüm hesap"
  ],
  "What it does": [
    "Wirkung",
    "Qué hace",
    "Wat het doet",
    "Cosa fa",
    "Effet",
    "Эффект",
    "Etkisi"
  ],
  "Gem material.": [
    "Edelsteinmaterial.",
    "Material de gema.",
    "Edelsteenmateriaal.",
    "Materiale da gemma.",
    "Matériau de gemme.",
    "Материал самоцвета.",
    "Taş malzemesi."
  ],
  "Unrefined gems are materials, not socketable. Refine them using Enchanting first.": [
    "Rohe Edelsteine sind Materialien und können nicht eingesetzt werden. Veredle sie zuerst durch Verzaubern.",
    "Las gemas sin refinar son materiales y no pueden engastarse. Refínalas primero mediante Encantamiento.",
    "Ruwe edelstenen zijn materialen en passen niet in sockets. Verfijn ze eerst via Betoveren.",
    "Le gemme grezze sono materiali e non possono essere incastonate. Raffinale prima con Incantamento.",
    "Les gemmes brutes sont des matériaux non sertissables. Raffinez-les d'abord par Enchantement.",
    "Необработанные самоцветы — материалы, их нельзя вставлять. Сначала обработайте их с помощью зачарования.",
    "Ham taşlar malzemedir, yuvalanamaz. Önce Büyüleme ile işle."
  ],
  "★ Protected: remove Favorite and Lock before selling or dismantling.": [
    "★ Geschützt: Entferne Favorit und Sperre vor Verkauf oder Zerlegen.",
    "★ Protegida: quita Favorito y Bloqueo antes de vender o desmantelar.",
    "★ Beschermd: verwijder Favoriet en Vergrendeling vóór verkoop of ontmanteling.",
    "★ Protetta: rimuovi Preferito e Blocco prima di vendere o smantellare.",
    "★ Protégée : retirez Favori et Verrou avant de vendre ou démonter.",
    "★ Защищено: снимите отметки Избранное и Блокировка перед продажей или разборкой.",
    "★ Korumalı: Satmadan veya parçalamadan önce Favori ve Kilit'i kaldır."
  ],
  "ACTIONS": [
    "AKTIONEN",
    "ACCIONES",
    "ACTIES",
    "AZIONI",
    "ACTIONS",
    "ДЕЙСТВИЯ",
    "İŞLEMLER"
  ],
  "★ Favorited": [
    "★ Favorisiert",
    "★ Favorita",
    "★ Favoriet",
    "★ Preferita",
    "★ En favori",
    "★ В избранном",
    "★ Favori"
  ],
  "☆ Favorite": [
    "☆ Favorisieren",
    "☆ Favorita",
    "☆ Favoriet maken",
    "☆ Preferito",
    "☆ Favori",
    "☆ В избранное",
    "☆ Favorilere ekle"
  ],
  "Unlock": [
    "Entsperren",
    "Desbloquear",
    "Ontgrendelen",
    "Sblocca",
    "Déverrouiller",
    "Разблокировать",
    "Kilidi aç"
  ],
  "Lock": [
    "Sperren",
    "Bloquear",
    "Vergrendelen",
    "Blocca",
    "Verrouiller",
    "Заблокировать",
    "Kilitle"
  ],
  "Enchanting · Grade {grade}": [
    "Verzaubern · Grad {grade}",
    "Encantamiento · Grado {grade}",
    "Betoveren · Graad {grade}",
    "Incantamento · Grado {grade}",
    "Enchantement · Grade {grade}",
    "Зачарование · Класс {grade}",
    "Büyüleme · Derece {grade}"
  ],
  "Requires Lv {level} · {gold} Gold · {materials}": [
    "Benötigt St. {level} · {gold} Gold · {materials}",
    "Requiere niv. {level} · {gold} de oro · {materials}",
    "Vereist niv. {level} · {gold} goud · {materials}",
    "Richiede liv. {level} · {gold} oro · {materials}",
    "Niveau {level} requis · {gold} or · {materials}",
    "Нужен ур. {level} · {gold} золота · {materials}",
    "Sv. {level} gerekli · {gold} altın · {materials}"
  ],
  "Refine 1 gem": [
    "1 Edelstein veredeln",
    "Refinar 1 gema",
    "1 edelsteen verfijnen",
    "Raffina 1 gemma",
    "Raffiner 1 gemme",
    "Обработать 1 самоцвет",
    "1 taşı işle"
  ],
  "Refinement unavailable": [
    "Veredelung nicht verfügbar",
    "Refinado no disponible",
    "Verfijnen niet beschikbaar",
    "Raffinazione non disponibile",
    "Raffinage indisponible",
    "Обработка недоступна",
    "İşleme kullanılamıyor"
  ],
  "Sell 1": [
    "1 verkaufen",
    "Vender 1",
    "Verkoop 1",
    "Vendi 1",
    "Vendre 1",
    "Продать 1",
    "1 sat"
  ],
  "Sell all": [
    "Alle verkaufen",
    "Vender todo",
    "Alles verkopen",
    "Vendi tutto",
    "Tout vendre",
    "Продать все",
    "Tümünü sat"
  ],
  "Dismantle 1": [
    "1 zerlegen",
    "Desmantelar 1",
    "1 ontmantelen",
    "Smantella 1",
    "Démonter 1",
    "Разобрать 1",
    "1 parçala"
  ],
  "Gems remain available for equipment socketing and crafting directly from shared storage.": [
    "Edelsteine bleiben aus dem gemeinsamen Lager direkt für Sockeln und Herstellung verfügbar.",
    "Las gemas del almacén compartido siguen disponibles para engastar y fabricar.",
    "Edelstenen blijven vanuit de gedeelde opslag beschikbaar voor sockets en vervaardigen.",
    "Le gemme del deposito condiviso restano disponibili per incastonatura e creazione.",
    "Les gemmes du stockage partagé restent utilisables pour le sertissage et la fabrication.",
    "Самоцветы из общего хранилища доступны для вставки в снаряжение и изготовления.",
    "Ortak depodaki taşlar yuvalama ve üretim için doğrudan kullanılabilir."
  ],
  "Sell gems from Gem Pouch?": [
    "Edelsteine aus dem Beutel verkaufen?",
    "¿Vender gemas de la bolsa?",
    "Edelstenen uit de zak verkopen?",
    "Vendere gemme dalla sacca?",
    "Vendre des gemmes du sac ?",
    "Продать самоцветы из сумки?",
    "Kesedeki taşlar satılsın mı?"
  ],
  "{count}× {name} · {gold} Gold. This cannot be undone.": [
    "{count}× {name} · {gold} Gold. Dies ist endgültig.",
    "{count}× {name} · {gold} de oro. No se puede deshacer.",
    "{count}× {name} · {gold} goud. Dit kan niet ongedaan gemaakt worden.",
    "{count}× {name} · {gold} oro. Operazione irreversibile.",
    "{count}× {name} · {gold} or. Action irréversible.",
    "{count}× {name} · {gold} золота. Отменить нельзя.",
    "{count}× {name} · {gold} altın. Geri alınamaz."
  ],
  "Sell gems": [
    "Edelsteine verkaufen",
    "Vender gemas",
    "Edelstenen verkopen",
    "Vendi gemme",
    "Vendre les gemmes",
    "Продать самоцветы",
    "Taşları sat"
  ],
  "Dismantle this gem?": [
    "Diesen Edelstein zerlegen?",
    "¿Desmantelar esta gema?",
    "Deze edelsteen ontmantelen?",
    "Smantellare questa gemma?",
    "Démonter cette gemme ?",
    "Разобрать этот самоцвет?",
    "Bu taş parçalansın mı?"
  ],
  "Convert 1× {name} into Gem Dust? This cannot be undone.": [
    "1× {name} in Edelsteinstaub umwandeln? Dies ist endgültig.",
    "¿Convertir 1× {name} en polvo de gema? No se puede deshacer.",
    "1× {name} omzetten in edelsteenstof? Dit is onomkeerbaar.",
    "Convertire 1× {name} in polvere di gemma? Operazione irreversibile.",
    "Convertir 1× {name} en poussière de gemme ? Action irréversible.",
    "Превратить 1× {name} в самоцветную пыль? Отменить нельзя.",
    "1× {name} mücevher tozuna dönüştürülsün mü? Geri alınamaz."
  ],
  "Dismantle": [
    "Zerlegen",
    "Desmantelar",
    "Ontmantelen",
    "Smantella",
    "Démonter",
    "Разобрать",
    "Parçala"
  ]
} as const satisfies Record<string,SevenLanguages>;
export function gemPouchText(language:Language,source:string,params:TranslationParams={}):string{
 const index=SUPPORTED_LANGUAGES.indexOf(language)-1;
 const row=Object.prototype.hasOwnProperty.call(gemPouchUiRows,source)?gemPouchUiRows[source as keyof typeof gemPouchUiRows]:undefined;
 return interpolateTranslation(index>=0&&row?row[index]:source,params);
}
