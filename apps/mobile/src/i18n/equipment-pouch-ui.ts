import type {Language} from './languages';
import {SUPPORTED_LANGUAGES} from './languages';
import {gemPouchText,gemPouchUiRows} from './gem-pouch-ui';
import {interpolateTranslation,type TranslationParams} from './translator';

/** Fixed Equipment Pouch presentation copy. Exact-match fallback preserves unknown
 * server-generated sale reasons and canonical IDs/commands. DE/ES/NL/IT/FR/RU/TR. */
type SevenLanguages=readonly [string,string,string,string,string,string,string];
export const equipmentPouchUiRows={
  "Equipment Pouch": [
    "Ausrüstungsbeutel",
    "Bolsa de equipo",
    "Uitrustingszak",
    "Sacca equipaggiamento",
    "Sac d'équipement",
    "Сумка снаряжения",
    "Ekipman Kesesi"
  ],
  "{used}/{capacity} slots · {character} only": [
    "{used}/{capacity} Plätze · Nur für {character}",
    "{used}/{capacity} espacios · Solo para {character}",
    "{used}/{capacity} vakken · Alleen voor {character}",
    "{used}/{capacity} spazi · Solo per {character}",
    "{used}/{capacity} emplacements · Réservé à {character}",
    "{used}/{capacity} ячеек · Только для {character}",
    "{used}/{capacity} yuva · Yalnızca {character} için"
  ],
  "Character": [
    "Charakter",
    "Personaje",
    "Personage",
    "Personaggio",
    "Personnage",
    "Персонаж",
    "Karakter"
  ],
  "New gear arrives here first. Compare, equip, transfer or sell copies directly. The Bank remains shared.": [
    "Neue Ausrüstung landet zuerst hier. Vergleiche, lege sie an, verschiebe oder verkaufe Stücke direkt. Die Bank bleibt gemeinsam.",
    "El equipo nuevo llega aquí primero. Compara, equipa, traslada o vende piezas directamente. El Banco sigue siendo compartido.",
    "Nieuwe uitrusting komt hier eerst terecht. Vergelijk, rust uit, verplaats of verkoop exemplaren direct. De bank blijft gedeeld.",
    "I nuovi equipaggiamenti arrivano prima qui. Confronta, equipaggia, trasferisci o vendi direttamente le copie. La Banca resta condivisa.",
    "Le nouvel équipement arrive d'abord ici. Comparez, équipez, transférez ou vendez les exemplaires directement. La banque reste partagée.",
    "Новое снаряжение сначала поступает сюда. Сравнивайте, надевайте, перемещайте или продавайте экземпляры. Банк остаётся общим.",
    "Yeni ekipman önce buraya gelir. Kopyaları karşılaştır, kuşan, taşı veya doğrudan sat. Banka ortak kalır."
  ],
  "Select safe": [
    "Sichere auswählen",
    "Seleccionar seguros",
    "Veilige selecteren",
    "Seleziona sicuri",
    "Sélectionner les objets sûrs",
    "Выбрать безопасные",
    "Güvenlileri seç"
  ],
  "Clear": [
    "Auswahl löschen",
    "Limpiar",
    "Wissen",
    "Cancella",
    "Effacer",
    "Очистить",
    "Temizle"
  ],
  "Done": [
    "Fertig",
    "Listo",
    "Klaar",
    "Fatto",
    "Terminé",
    "Готово",
    "Bitti"
  ],
  "Select gear": [
    "Ausrüstung auswählen",
    "Seleccionar equipo",
    "Uitrusting selecteren",
    "Seleziona equipaggiamento",
    "Sélectionner l'équipement",
    "Выбрать снаряжение",
    "Ekipman seç"
  ],
  "Select safe to sell": [
    "Sichere zum Verkauf auswählen",
    "Seleccionar los seguros para vender",
    "Veilige items kiezen om te verkopen",
    "Seleziona oggetti sicuri da vendere",
    "Sélectionner les objets sûrs à vendre",
    "Выбрать безопасное для продажи",
    "Satılabilecek güvenlileri seç"
  ],
  "{count} selected · {gold} Gold": [
    "{count} ausgewählt · {gold} Gold",
    "{count} seleccionados · {gold} de oro",
    "{count} geselecteerd · {gold} goud",
    "{count} selezionati · {gold} oro",
    "{count} sélectionnés · {gold} or",
    "Выбрано: {count} · {gold} золота",
    "{count} seçildi · {gold} altın"
  ],
  " · {count} protected": [
    " · {count} geschützt",
    " · {count} protegidos",
    " · {count} beschermd",
    " · {count} protetti",
    " · {count} protégés",
    " · Защищено: {count}",
    " · {count} korumalı"
  ],
  "Sell selected · {gold}g": [
    "Auswahl verkaufen · {gold} G",
    "Vender selección · {gold} o",
    "Selectie verkopen · {gold} g",
    "Vendi selezione · {gold} o",
    "Vendre sélection · {gold} or",
    "Продать выбранное · {gold} з.",
    "Seçilenleri sat · {gold} a"
  ],
  "Quick-selects only eligible Common, Uncommon and Rare gear. Epic, Legendary and Mythic need manual selection.": [
    "Schnellauswahl umfasst nur zulässige gewöhnliche, ungewöhnliche und seltene Ausrüstung. Epische, legendäre und mythische Stücke musst du selbst wählen.",
    "La selección rápida solo incluye equipo común, poco común y raro apto. El épico, legendario y mítico debe elegirse manualmente.",
    "Snel selecteren kiest alleen geschikte gewone, ongewone en zeldzame uitrusting. Epische, legendarische en mythische spullen moet je handmatig kiezen.",
    "La selezione rapida include solo equipaggiamento comune, non comune e raro idoneo. Epico, leggendario e mitico vanno scelti manualmente.",
    "La sélection rapide ne prend que les équipements communs, peu communs et rares admissibles. Les pièces épiques, légendaires et mythiques se choisissent manuellement.",
    "Быстрый выбор включает только допустимое обычное, необычное и редкое снаряжение. Эпическое, легендарное и мифическое выбирайте вручную.",
    "Hızlı seçim yalnızca uygun Yaygın, Sıradışı ve Nadir ekipmanı seçer. Destansı, Efsanevi ve Mitik ekipmanı elle seçmelisin."
  ],
  "quality {quality}": [
    "Qualität {quality}",
    "calidad {quality}",
    "kwaliteit {quality}",
    "qualità {quality}",
    "qualité {quality}",
    "качество {quality}",
    "kalite {quality}"
  ],
  " · protected": [
    " · geschützt",
    " · protegido",
    " · beschermd",
    " · protetto",
    " · protégé",
    " · защищено",
    " · korumalı"
  ],
  "Empty equipment slot": [
    "Leerer Ausrüstungsplatz",
    "Espacio de equipo vacío",
    "Leeg uitrustingsvak",
    "Spazio equipaggiamento vuoto",
    "Emplacement d'équipement vide",
    "Пустая ячейка снаряжения",
    "Boş ekipman yuvası"
  ],
  "EQUIPMENT POUCH · SALE": [
    "AUSRÜSTUNGSBEUTEL · VERKAUF",
    "BOLSA DE EQUIPO · VENTA",
    "UITRUSTINGSZAK · VERKOOP",
    "SACCA EQUIPAGGIAMENTO · VENDITA",
    "SAC D'ÉQUIPEMENT · VENTE",
    "СУМКА СНАРЯЖЕНИЯ · ПРОДАЖА",
    "EKİPMAN KESESİ · SATIŞ"
  ],
  "Sell selected equipment?": [
    "Ausgewählte Ausrüstung verkaufen?",
    "¿Vender el equipo seleccionado?",
    "Geselecteerde uitrusting verkopen?",
    "Vendere l'equipaggiamento selezionato?",
    "Vendre l'équipement sélectionné ?",
    "Продать выбранное снаряжение?",
    "Seçili ekipman satılsın mı?"
  ],
  "{count} copy · {gold} Gold": [
    "{count} Stück · {gold} Gold",
    "{count} pieza · {gold} de oro",
    "{count} exemplaar · {gold} goud",
    "{count} copia · {gold} oro",
    "{count} exemplaire · {gold} or",
    "{count} экземпляр · {gold} золота",
    "{count} kopya · {gold} altın"
  ],
  "{count} copies · {gold} Gold": [
    "{count} Stück · {gold} Gold",
    "{count} piezas · {gold} de oro",
    "{count} exemplaren · {gold} goud",
    "{count} copie · {gold} oro",
    "{count} exemplaires · {gold} or",
    "{count} экземпляров · {gold} золота",
    "{count} kopya · {gold} altın"
  ],
  "This cannot be undone. Locked, favorited, enhanced, socketed, loadout and Working Toward gear stays protected.": [
    "Dies ist endgültig. Gesperrte, favorisierte, verbesserte, mit Edelsteinen bestückte sowie durch Sets oder Ziele geschützte Ausrüstung bleibt erhalten.",
    "Esto no se puede deshacer. El equipo bloqueado, favorito, mejorado, engastado, de conjuntos guardados o necesario para objetivos está protegido.",
    "Dit kan niet ongedaan worden gemaakt. Vergrendelde, favoriete, verbeterde, met edelstenen uitgeruste, opgeslagen en voor doelen benodigde uitrusting blijft beschermd.",
    "L'operazione è irreversibile. Gli oggetti bloccati, preferiti, potenziati, con gemme, nei set salvati o necessari agli obiettivi restano protetti.",
    "Cette action est irréversible. L'équipement verrouillé, favori, amélioré, serti, inclus dans une configuration ou requis pour un objectif reste protégé.",
    "Отменить продажу нельзя. Заблокированное, избранное, улучшенное, со вставками, из комплектов и нужное для целей снаряжение защищено.",
    "Bu işlem geri alınamaz. Kilitli, favori, güçlendirilmiş, taşlı, kayıtlı dizilimdeki veya hedefler için gerekli ekipman korunur."
  ],
  "Selection has changed. Close and review the equipment.": [
    "Auswahl geändert. Schließe das Fenster und prüfe die Ausrüstung erneut.",
    "La selección ha cambiado. Cierra y revisa el equipo.",
    "De selectie is gewijzigd. Sluit het venster en controleer de uitrusting.",
    "La selezione è cambiata. Chiudi e controlla l'equipaggiamento.",
    "La sélection a changé. Fermez et vérifiez l'équipement.",
    "Выбор изменился. Закройте окно и проверьте снаряжение.",
    "Seçim değişti. Pencereyi kapatıp ekipmanı kontrol et."
  ],
  "Cancel": [
    "Abbrechen",
    "Cancelar",
    "Annuleren",
    "Annulla",
    "Annuler",
    "Отмена",
    "İptal"
  ],
  "Confirm sale": [
    "Verkauf bestätigen",
    "Confirmar venta",
    "Verkoop bevestigen",
    "Conferma vendita",
    "Confirmer la vente",
    "Подтвердить продажу",
    "Satışı onayla"
  ],
  "Equipment Pouch equip is unavailable": [
    "Anlegen aus dem Ausrüstungsbeutel ist nicht verfügbar",
    "No se puede equipar desde la bolsa",
    "Uitrusten vanuit de uitrustingszak is niet beschikbaar",
    "Non è possibile equipaggiare dalla sacca",
    "Équipement depuis le sac indisponible",
    "Нельзя надеть снаряжение из сумки",
    "Keseden ekipman kuşanılamıyor"
  ],
  "Equipment was not equipped. Please try again.": [
    "Ausrüstung wurde nicht angelegt. Bitte erneut versuchen.",
    "No se ha equipado. Inténtalo de nuevo.",
    "De uitrusting is niet aangetrokken. Probeer opnieuw.",
    "Equipaggiamento non indossato. Riprova.",
    "L'équipement n'a pas été équipé. Réessayez.",
    "Снаряжение не надето. Попробуйте снова.",
    "Ekipman kuşanılamadı. Tekrar dene."
  ],
  "Close Equipment Pouch details": [
    "Ausrüstungsbeutel-Details schließen",
    "Cerrar detalles de la bolsa de equipo",
    "Details van uitrustingszak sluiten",
    "Chiudi i dettagli della sacca",
    "Fermer les détails du sac d'équipement",
    "Закрыть сведения о сумке снаряжения",
    "Ekipman kesesi ayrıntılarını kapat"
  ],
  "EQUIPMENT · CHARACTER STORAGE": [
    "AUSRÜSTUNG · CHARAKTERLAGER",
    "EQUIPO · ALMACÉN DEL PERSONAJE",
    "UITRUSTING · PERSONAGEOPSLAG",
    "EQUIPAGGIAMENTO · DEPOSITO PERSONAGGIO",
    "ÉQUIPEMENT · STOCKAGE DU PERSONNAGE",
    "СНАРЯЖЕНИЕ · ХРАНИЛИЩЕ ПЕРСОНАЖА",
    "EKİPMAN · KARAKTER DEPOSU"
  ],
  "Equipment": [
    "Ausrüstung",
    "Equipo",
    "Uitrusting",
    "Equipaggiamento",
    "Équipement",
    "Снаряжение",
    "Ekipman"
  ],
  "Stored on {character} · {slot}": [
    "Gelagert bei {character} · {slot}",
    "Guardado en {character} · {slot}",
    "Opgeslagen bij {character} · {slot}",
    "Conservato da {character} · {slot}",
    "Stocké sur {character} · {slot}",
    "Хранится у {character} · {slot}",
    "{character} üzerinde saklanıyor · {slot}"
  ],
  "this character": [
    "diesem Charakter",
    "este personaje",
    "dit personage",
    "questo personaggio",
    "ce personnage",
    "этого персонажа",
    "bu karakter"
  ],
  "Gear": [
    "Ausrüstung",
    "Equipo",
    "Uitrusting",
    "Equipaggiamento",
    "Équipement",
    "Снаряжение",
    "Ekipman"
  ],
  "Locked · ": [
    "Gesperrt · ",
    "Bloqueado · ",
    "Vergrendeld · ",
    "Bloccato · ",
    "Verrouillé · ",
    "Заблокировано · ",
    "Kilitli · "
  ],
  " enhanced · ": [
    " verbessert · ",
    " mejorado · ",
    " verbeterd · ",
    " potenziato · ",
    " amélioré · ",
    " улучшено · ",
    " güçlendirilmiş · "
  ],
  "Unique forged copy": [
    "Einzigartiges geschmiedetes Stück",
    "Pieza forjada única",
    "Uniek gesmeed exemplaar",
    "Copia forgiata unica",
    "Exemplaire forgé unique",
    "Уникальный выкованный экземпляр",
    "Benzersiz dövülmüş kopya"
  ],
  "Standard equipment": [
    "Normale Ausrüstung",
    "Equipo estándar",
    "Standaarduitrusting",
    "Equipaggiamento standard",
    "Équipement standard",
    "Стандартное снаряжение",
    "Standart ekipman"
  ],
  "Compare & Equip": [
    "Vergleichen & anlegen",
    "Comparar y equipar",
    "Vergelijken en uitrusten",
    "Confronta ed equipaggia",
    "Comparer et équiper",
    "Сравнить и надеть",
    "Karşılaştır ve Kuşan"
  ],
  "To Inventory": [
    "Ins Inventar",
    "Al inventario",
    "Naar inventaris",
    "All'inventario",
    "Vers l'inventaire",
    "В инвентарь",
    "Envantere"
  ],
  "To Bank": [
    "In die Bank",
    "Al banco",
    "Naar bank",
    "Alla banca",
    "Vers la banque",
    "В банк",
    "Bankaya"
  ],
  "Remove favorite": [
    "Favorit entfernen",
    "Quitar favorito",
    "Favoriet verwijderen",
    "Rimuovi preferito",
    "Retirer des favoris",
    "Убрать из избранного",
    "Favoriden çıkar"
  ],
  "Favorite": [
    "Favorisieren",
    "Favorito",
    "Favoriet",
    "Preferito",
    "Favori",
    "В избранное",
    "Favori"
  ],
  "Sell · {gold}g": [
    "Verkaufen · {gold} G",
    "Vender · {gold} o",
    "Verkopen · {gold} g",
    "Vendi · {gold} o",
    "Vendre · {gold} or",
    "Продать · {gold} з.",
    "Sat · {gold} a"
  ],
  "Protected": [
    "Geschützt",
    "Protegido",
    "Beschermd",
    "Protetto",
    "Protégé",
    "Защищено",
    "Korumalı"
  ],
  "Selling this copy adds Gold to this character.": [
    "Der Verkauf dieses Stücks bringt diesem Charakter Gold.",
    "Vender esta pieza da oro a este personaje.",
    "De verkoop van dit exemplaar levert dit personage goud op.",
    "La vendita di questa copia aggiunge oro al personaggio.",
    "Vendre cet exemplaire donne de l'or à ce personnage.",
    "Продажа этого экземпляра принесёт золото персонажу.",
    "Bu kopyayı satmak karaktere altın kazandırır."
  ],
  "This equipment is protected.": [
    "Diese Ausrüstung ist geschützt.",
    "Este equipo está protegido.",
    "Deze uitrusting is beschermd.",
    "Questo equipaggiamento è protetto.",
    "Cet équipement est protégé.",
    "Это снаряжение защищено.",
    "Bu ekipman korumalı."
  ],
  "Enhanced, socketed and loadout gear cannot be sold.": [
    "Verbesserte, mit Edelsteinen bestückte und in Sets genutzte Ausrüstung kann nicht verkauft werden.",
    "No se puede vender equipo mejorado, engastado ni de conjuntos guardados.",
    "Verbeterde uitrusting, uitrusting met edelstenen en opgeslagen sets kunnen niet worden verkocht.",
    "Non puoi vendere equipaggiamento potenziato, con gemme o incluso in configurazioni.",
    "L'équipement amélioré, serti ou inclus dans une configuration ne peut pas être vendu.",
    "Улучшенное снаряжение, с камнями и в комплектах нельзя продавать.",
    "Güçlendirilmiş, taşlı ve kayıtlı dizilimdeki ekipman satılamaz."
  ],
  "Protected equipment": [
    "Geschützte Ausrüstung",
    "Equipo protegido",
    "Beschermde uitrusting",
    "Equipaggiamento protetto",
    "Équipement protégé",
    "Защищённое снаряжение",
    "Korumalı ekipman"
  ],
  "Choose a character before selling equipment": [
    "Wähle einen Charakter, bevor du Ausrüstung verkaufst",
    "Elige un personaje antes de vender equipo",
    "Kies eerst een personage om uitrusting te verkopen",
    "Scegli un personaggio prima di vendere equipaggiamento",
    "Choisissez un personnage avant de vendre l'équipement",
    "Выберите персонажа перед продажей снаряжения",
    "Ekipman satmadan önce bir karakter seç"
  ],
  "Equipment Pouch changed; review your selection": [
    "Ausrüstungsbeutel geändert; Auswahl erneut prüfen",
    "La bolsa de equipo cambió; revisa la selección",
    "Uitrustingszak gewijzigd; controleer je selectie",
    "La sacca equipaggiamento è cambiata; verifica la selezione",
    "Le sac d'équipement a changé ; vérifiez la sélection",
    "Содержимое сумки изменилось; проверьте выбор",
    "Ekipman kesesi değişti; seçimini kontrol et"
  ],
  "This equipment cannot be sold": [
    "Diese Ausrüstung kann nicht verkauft werden",
    "Este equipo no se puede vender",
    "Deze uitrusting kan niet worden verkocht",
    "Questo equipaggiamento non può essere venduto",
    "Cet équipement ne peut pas être vendu",
    "Это снаряжение нельзя продать",
    "Bu ekipman satılamaz"
  ],
  "Favorite and locked equipment stays protected": [
    "Favorisierte und gesperrte Ausrüstung bleibt geschützt",
    "El equipo favorito y bloqueado sigue protegido",
    "Favoriete en vergrendelde uitrusting blijft beschermd",
    "Gli oggetti preferiti e bloccati restano protetti",
    "L'équipement favori et verrouillé reste protégé",
    "Избранное и заблокированное снаряжение защищено",
    "Favori ve kilitli ekipman korunur"
  ],
  "Keep the last copy reserved for legacy enhancements": [
    "Letztes Stück für alte Verbesserungen behalten",
    "Conserva la última pieza para mejoras antiguas",
    "Bewaar het laatste exemplaar voor oude verbeteringen",
    "Conserva l'ultima copia per i potenziamenti precedenti",
    "Conservez le dernier exemplaire pour les anciennes améliorations",
    "Оставьте последний экземпляр для старых улучшений",
    "Eski güçlendirmeler için son kopyayı sakla"
  ],
  "Saved loadouts protect this equipment": [
    "Gespeicherte Ausrüstungen schützen diesen Gegenstand",
    "Los conjuntos guardados protegen este equipo",
    "Opgeslagen uitrustingssets beschermen dit item",
    "Le configurazioni salvate proteggono questo equipaggiamento",
    "Les configurations enregistrées protègent cet équipement",
    "Сохранённые комплекты защищают это снаряжение",
    "Kaydedilmiş dizilimler bu ekipmanı korur"
  ],
  "Character Gold overflow": [
    "Goldgrenze des Charakters überschritten",
    "El oro del personaje supera el límite",
    "Goldlimiet van personage overschreden",
    "Superato il limite d'oro del personaggio",
    "Limite d'or du personnage dépassée",
    "Превышен лимит золота персонажа",
    "Karakter altın sınırı aşıldı"
  ],
  "Select 1–100 equipment copies": [
    "Wähle 1–100 Ausrüstungsstücke",
    "Selecciona entre 1 y 100 piezas",
    "Selecteer 1–100 uitrustingsexemplaren",
    "Seleziona 1–100 copie",
    "Sélectionnez de 1 à 100 exemplaires",
    "Выберите от 1 до 100 экземпляров",
    "1–100 ekipman kopyası seç"
  ],
  "Equipment needed for a Working Toward goal is protected": [
    "Ausrüstung für ein aktives Ziel bleibt geschützt",
    "Se protege el equipo necesario para un objetivo activo",
    "Uitrusting voor een actief doel blijft beschermd",
    "L'equipaggiamento necessario a un obiettivo resta protetto",
    "L'équipement nécessaire à un objectif en cours reste protégé",
    "Снаряжение для текущей цели защищено",
    "Etkin hedef için gereken ekipman korunur"
  ],
  "{count} eligible": ["{count} verkaufbar","{count} aptos","{count} verkoopbaar","{count} vendibili","{count} admissibles","Можно продать: {count}","{count} satılabilir"],
  "Sell eligible · {gold}g": ["Verkaufbare verkaufen · {gold} G","Vender aptos · {gold} o","Verkoop geschikte · {gold} g","Vendi idonei · {gold} o","Vendre les admissibles · {gold} or","Продать доступное · {gold} з.","Uygunları sat · {gold} a"],
  "Nothing sellable": ["Nichts verkaufbar","Nada que vender","Niets verkoopbaar","Niente da vendere","Rien à vendre","Нечего продавать","Satılacak eşya yok"],
  "Unlock selected · {count}": ["Auswahl entsperren · {count}","Desbloquear selección · {count}","Selectie ontgrendelen · {count}","Sblocca selezione · {count}","Déverrouiller la sélection · {count}","Разблокировать выбранное · {count}","Seçilenlerin kilidini aç · {count}"],
  "Protected copies are excluded from the sale. Unlock locked gear or open a copy to review other protections.": [
    "Geschützte Stücke werden nicht verkauft. Entsperre gesperrte Ausrüstung oder öffne ein Stück, um weitere Schutzgründe zu prüfen.",
    "Las piezas protegidas no se venden. Desbloquea el equipo o abre una pieza para ver otras protecciones.",
    "Beschermde exemplaren worden niet verkocht. Ontgrendel vergrendelde uitrusting of open een exemplaar om andere beveiligingen te bekijken.",
    "Le copie protette non vengono vendute. Sblocca l'equipaggiamento o apri una copia per verificare le altre protezioni.",
    "Les exemplaires protégés ne sont pas vendus. Déverrouillez-les ou ouvrez-en un pour voir les autres protections.",
    "Защищённые экземпляры не продаются. Снимите блокировку или откройте экземпляр, чтобы узнать причину защиты.",
    "Korumalı kopyalar satılmaz. Kilitleri aç veya diğer korumaları görmek için bir kopyayı aç."
  ],
  "Unlock to sell": ["Zum Verkauf entsperren","Desbloquear para vender","Ontgrendel om te verkopen","Sblocca per vendere","Déverrouiller pour vendre","Разблокировать для продажи","Satmak için kilidi aç"],
  "Select safe to salvage": ["Sichere zum Zerlegen auswählen","Seleccionar seguros para desguazar","Veilige items kiezen om te ontmantelen","Seleziona pezzi sicuri da smontare","Sélectionner les objets sûrs à recycler","Выбрать безопасное для разборки","Güvenle sökülecekleri seç"],
  "{count} salvageable": ["{count} zerlegbar","{count} reciclables","{count} te ontmantelen","{count} smontabili","{count} recyclables","Можно разобрать: {count}","{count} sökülebilir"],
  "Salvage eligible · {count}": ["Geeignete zerlegen · {count}","Desguazar aptos · {count}","Geschikte ontmantelen · {count}","Smonta idonei · {count}","Recycler les admissibles · {count}","Разобрать доступное · {count}","Uygunları sök · {count}"],
  "Nothing salvageable": ["Nichts zerlegbar","Nada que desguazar","Niets te ontmantelen","Niente da smontare","Rien à recycler","Нечего разбирать","Sökülecek eşya yok"],
  "EQUIPMENT POUCH · SALVAGE": ["AUSRÜSTUNGSBEUTEL · ZERLEGEN","BOLSA DE EQUIPO · DESGUACE","UITRUSTINGSZAK · ONTMANTELEN","SACCA EQUIPAGGIAMENTO · SMONTAGGIO","SAC D'ÉQUIPEMENT · RECYCLAGE","СУМКА СНАРЯЖЕНИЯ · РАЗБОРКА","EKİPMAN KESESİ · SÖKÜM"],
  "Salvage selected equipment?": ["Ausgewählte Ausrüstung zerlegen?","¿Desguazar el equipo seleccionado?","Geselecteerde uitrusting ontmantelen?","Smontare l'equipaggiamento selezionato?","Recycler l'équipement sélectionné ?","Разобрать выбранное снаряжение?","Seçilen ekipmanı sökmek istiyor musun?"],
  "{count} copies to salvage": ["{count} Stücke zum Zerlegen","{count} piezas para desguazar","{count} exemplaren om te ontmantelen","{count} copie da smontare","{count} exemplaires à recycler","Экземпляров для разборки: {count}","Sökülecek {count} kopya"],
  "Materials go to Inventory. This cannot be undone; protected gear is excluded.": [
    "Materialien kommen ins Inventar. Dies ist endgültig; geschützte Ausrüstung wird ausgeschlossen.",
    "Los materiales van al Inventario. Esto no se puede deshacer; el equipo protegido queda excluido.",
    "Materialen gaan naar je Inventaris. Dit kan niet ongedaan worden gemaakt; beschermde uitrusting blijft buiten de selectie.",
    "I materiali vanno nell'Inventario. L'operazione è irreversibile; l'equipaggiamento protetto è escluso.",
    "Les matériaux vont dans l'inventaire. Cette action est irréversible ; l'équipement protégé est exclu.",
    "Материалы поступят в инвентарь. Действие нельзя отменить; защищённое снаряжение исключено.",
    "Malzemeler Envantere gider. İşlem geri alınamaz; korumalı ekipman hariç tutulur."
  ],
  "Confirm salvage": ["Zerlegen bestätigen","Confirmar desguace","Ontmantelen bevestigen","Conferma smontaggio","Confirmer le recyclage","Подтвердить разборку","Sökümü onayla"],
  "Salvage · {count}× {name}": ["Zerlegen · {count}× {name}","Desguazar · {count}× {name}","Ontmantelen · {count}× {name}","Smonta · {count}× {name}","Recycler · {count}× {name}","Разобрать · {count}× {name}","Sök · {count}× {name}"],
  "Choose a character before salvaging equipment": ["Wähle vor dem Zerlegen einen Charakter","Selecciona un personaje antes de desguazar","Kies een personage voordat je ontmantelt","Scegli un personaggio prima dello smontaggio","Choisissez un personnage avant le recyclage","Выберите персонажа перед разборкой","Sökümden önce bir karakter seç"],
  "This equipment cannot be salvaged": ["Diese Ausrüstung kann nicht zerlegt werden","Este equipo no se puede desguazar","Deze uitrusting kan niet worden ontmanteld","Questo equipaggiamento non può essere smontato","Cet équipement ne peut pas être recyclé","Это снаряжение нельзя разобрать","Bu ekipman sökülemez"],
  "Inventory is full; make space for salvage": ["Inventar voll; schaffe Platz zum Zerlegen","Inventario lleno; haz espacio para desguazar","Inventaris vol; maak ruimte voor ontmantelen","Inventario pieno; libera spazio per smontare","Inventaire plein ; libérez de la place pour recycler","Инвентарь полон; освободите место для разборки","Envanter dolu; söküm için yer aç"],
  "Salvage material quantity overflow": ["Materialmenge beim Zerlegen überschritten","Cantidad de materiales de desguace excedida","Te veel materialen bij ontmantelen","Quantità materiali da smontaggio eccessiva","Quantité de matériaux recyclés dépassée","Превышено количество материалов разборки","Söküm malzemesi miktarı sınırı aşıldı"],
  "Common": ["Gewöhnlich","Común","Gewoon","Comune","Commun","Обычный","Yaygın"],
  "Uncommon": ["Ungewöhnlich","Poco común","Ongewoon","Non comune","Peu commun","Необычный","Sıradışı"],
  "Rare": ["Selten","Raro","Zeldzaam","Raro","Rare","Редкий","Nadir"],
  "Epic": ["Episch","Épico","Episch","Epico","Épique","Эпический","Destansı"],
  "Legendary": ["Legendär","Legendario","Legendarisch","Leggendario","Légendaire","Легендарный","Efsanevi"],
  "Mythic": ["Mythisch","Mítico","Mythisch","Mitico","Mythique","Мифический","Mitik"],
} as const satisfies Record<string,SevenLanguages>;

export function equipmentPouchText(language:Language,source:string,params:TranslationParams={}):string{
 const index=SUPPORTED_LANGUAGES.indexOf(language)-1;
 const entry=Object.prototype.hasOwnProperty.call(equipmentPouchUiRows,source)
  ?equipmentPouchUiRows[source as keyof typeof equipmentPouchUiRows]:undefined;
 if(entry&&index>=0)return interpolateTranslation(entry[index],params);
 // Reuse identical common terms already reviewed for the Gem Pouch.
 if(Object.prototype.hasOwnProperty.call(gemPouchUiRows,source))return gemPouchText(language,source,params);
 return interpolateTranslation(source,params);
}
