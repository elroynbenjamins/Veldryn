import type {Language} from './languages';
import {SUPPORTED_LANGUAGES} from './languages';
import {createTranslator,interpolateTranslation,type TranslationParams} from './translator';
import {accountText} from './account';

/** New player-facing copy in Roadmap, Market Inbox and badges. Columns DE/ES/NL/IT/FR/RU/TR.
 * Only fixed product-authored UI strings belong here; never translate player or server content. */
export const recentScreenTranslationRows = {
  "Updates every 2 hours": [
    "Aktualisierung alle 2 Stunden",
    "Se actualiza cada 2 horas",
    "Wordt elke 2 uur bijgewerkt",
    "Aggiornamento ogni 2 ore",
    "Mis à jour toutes les 2 heures",
    "Обновляется каждые 2 часа",
    "Her 2 saatte bir güncellenir"
  ],
  "Purchases, sales and returned listings are kept here. Items stay safe until claimed.": [
    "Käufe, Verkäufe und zurückgegebene Angebote werden hier aufbewahrt. Gegenstände bleiben bis zur Abholung sicher.",
    "Aquí se guardan las compras, ventas y anuncios devueltos. Los objetos permanecen seguros hasta reclamarlos.",
    "Aankopen, verkopen en teruggekeerde aanbiedingen staan hier. Voorwerpen blijven veilig tot je ze ophaalt.",
    "Qui trovi acquisti, vendite e inserzioni restituite. Gli oggetti restano al sicuro finché non li ritiri.",
    "Retrouvez ici achats, ventes et annonces retournées. Les objets restent en sécurité jusqu'à leur récupération.",
    "Здесь хранятся покупки, продажи и возвращённые лоты. Предметы останутся в сохранности до получения.",
    "Satın alımlar, satışlar ve iade edilen ilanlar burada tutulur. Eşyalar alınana kadar güvendedir."
  ],
  "Completed": [
    "Abgeschlossen",
    "Completado",
    "Voltooid",
    "Completato",
    "Terminé",
    "Завершено",
    "Tamamlandı"
  ],
  "To claim": [
    "Abholbereit",
    "Por reclamar",
    "Op te halen",
    "Da ritirare",
    "À récupérer",
    "К получению",
    "Alınacak"
  ],
  "Item claimed.": [
    "Gegenstand abgeholt.",
    "Objeto reclamado.",
    "Voorwerp opgehaald.",
    "Oggetto ritirato.",
    "Objet récupéré.",
    "Предмет получен.",
    "Eşya alındı."
  ],
  "Inbox unavailable.": [
    "Posteingang nicht verfügbar.",
    "Bandeja de entrada no disponible.",
    "Inbox niet beschikbaar.",
    "Casella non disponibile.",
    "Boîte de réception indisponible.",
    "Входящие недоступны.",
    "Gelen kutusuna erişilemiyor."
  ],
  "Purchased": [
    "Gekauft",
    "Comprado",
    "Gekocht",
    "Acquistato",
    "Acheté",
    "Куплено",
    "Satın alındı"
  ],
  "Sold": [
    "Verkauft",
    "Vendido",
    "Verkocht",
    "Venduto",
    "Vendu",
    "Продано",
    "Satıldı"
  ],
  "Returned": [
    "Zurückgegeben",
    "Devuelto",
    "Teruggekeerd",
    "Restituito",
    "Retourné",
    "Возвращено",
    "İade edildi"
  ],
  "READY": [
    "BEREIT",
    "LISTO",
    "KLAAR",
    "PRONTO",
    "PRÊT",
    "ГОТОВО",
    "HAZIR"
  ],
  "CLAIMED": [
    "ABGEHOLT",
    "RECLAMADO",
    "OPGEHAALD",
    "RITIRATO",
    "RÉCUPÉRÉ",
    "ПОЛУЧЕНО",
    "ALINDI"
  ],
  "PAID": [
    "BEZAHLT",
    "PAGADO",
    "BETAALD",
    "PAGATO",
    "PAYÉ",
    "ОПЛАЧЕНО",
    "ÖDENDİ"
  ],
  "Gold credited": [
    "Gold gutgeschrieben",
    "Oro abonado",
    "Goud bijgeschreven",
    "Oro accreditato",
    "Or crédité",
    "Золото зачислено",
    "Altın yatırıldı"
  ],
  "Gold · Item waiting in Inbox": [
    "Gold · Gegenstand wartet im Posteingang",
    "Oro · Objeto pendiente en la bandeja",
    "Goud · Voorwerp wacht in inbox",
    "Oro · Oggetto in attesa nella casella",
    "Or · Objet en attente dans la boîte",
    "Золото · Предмет ожидает во входящих",
    "Altın · Eşya gelen kutusunda bekliyor"
  ],
  "Unsold items returned safely": [
    "Unverkaufte Gegenstände sicher zurückgegeben",
    "Objetos no vendidos devueltos de forma segura",
    "Onverkochte voorwerpen veilig teruggestuurd",
    "Oggetti invenduti restituiti in sicurezza",
    "Invendus renvoyés en sécurité",
    "Непроданные предметы безопасно возвращены",
    "Satılmayan eşyalar güvenle iade edildi"
  ],
  "Claim to Inventory": [
    "Ins Inventar abholen",
    "Reclamar al inventario",
    "Ophalen naar inventaris",
    "Ritira nell'inventario",
    "Récupérer dans l'inventaire",
    "Получить в инвентарь",
    "Envantere al"
  ],
  "Bank": [
    "Bank",
    "Banco",
    "Bank",
    "Banca",
    "Banque",
    "Банк",
    "Banka"
  ],
  "Gem Pouch": [
    "Edelsteinbeutel",
    "Bolsa de gemas",
    "Edelstenenzak",
    "Sacca gemme",
    "Sac de gemmes",
    "Сумка самоцветов",
    "Mücevher kesesi"
  ],
  "Loading market inbox…": [
    "Markt-Posteingang wird geladen…",
    "Cargando bandeja del mercado…",
    "Marktinbox laden…",
    "Caricamento messaggi del mercato…",
    "Chargement de la boîte du marché…",
    "Загрузка рыночных сообщений…",
    "Pazar gelen kutusu yükleniyor…"
  ],
  "No completed market activity yet.": [
    "Noch keine abgeschlossenen Marktaktivitäten.",
    "Aún no hay operaciones de mercado completadas.",
    "Nog geen afgeronde marktactiviteiten.",
    "Nessuna operazione di mercato completata.",
    "Aucune opération de marché terminée.",
    "Пока нет завершённых операций на рынке.",
    "Henüz tamamlanan pazar işlemi yok."
  ],
  "No market deliveries waiting.": [
    "Keine Marktlieferungen ausstehend.",
    "No hay entregas del mercado pendientes.",
    "Geen marktleveringen om op te halen.",
    "Nessuna consegna del mercato in attesa.",
    "Aucune livraison du marché en attente.",
    "Нет ожидающих рыночных доставок.",
    "Bekleyen pazar teslimatı yok."
  ],
  "Sign in to choose a player badge.": [
    "Melde dich an, um ein Spielerabzeichen auszuwählen.",
    "Inicia sesión para elegir una insignia.",
    "Log in om een spelersbadge te kiezen.",
    "Accedi per scegliere un distintivo giocatore.",
    "Connectez-vous pour choisir un badge.",
    "Войдите, чтобы выбрать значок игрока.",
    "Oyuncu rozeti seçmek için giriş yap."
  ],
  "Wear one badge beside your name, and feature up to three on your profile. Staff badges appear automatically.": [
    "Trage ein Abzeichen neben deinem Namen und zeige bis zu drei im Profil. Teamabzeichen erscheinen automatisch.",
    "Lleva una insignia junto a tu nombre y destaca hasta tres en tu perfil. Las del equipo aparecen automáticamente.",
    "Draag één badge naast je naam en toon er maximaal drie op je profiel. Teambadges verschijnen automatisch.",
    "Indossa un distintivo accanto al nome e mostrane fino a tre sul profilo. I distintivi dello staff appaiono automaticamente.",
    "Portez un badge à côté de votre nom et affichez-en trois sur votre profil. Ceux du personnel apparaissent automatiquement.",
    "Носите один значок рядом с именем и показывайте до трёх в профиле. Значки команды появляются автоматически.",
    "Adının yanında bir rozet taşı ve profilinde en fazla üçünü sergile. Yetkili rozetleri otomatik görünür."
  ],
  "BESIDE YOUR NAME": [
    "NEBEN DEINEM NAMEN",
    "JUNTO A TU NOMBRE",
    "NAAST JE NAAM",
    "ACCANTO AL NOME",
    "À CÔTÉ DU NOM",
    "РЯДОМ С ИМЕНЕМ",
    "ADININ YANINDA"
  ],
  "ON YOUR PROFILE": [
    "IN DEINEM PROFIL",
    "EN TU PERFIL",
    "OP JE PROFIEL",
    "SUL TUO PROFILO",
    "SUR VOTRE PROFIL",
    "В ПРОФИЛЕ",
    "PROFİLİNDE"
  ],
  "No badge equipped": [
    "Kein Abzeichen angelegt",
    "Ninguna insignia equipada",
    "Geen badge uitgerust",
    "Nessun distintivo equipaggiato",
    "Aucun badge équipé",
    "Значок не выбран",
    "Kuşanılmış rozet yok"
  ],
  "No badges featured yet": [
    "Noch keine Abzeichen im Profil",
    "Aún no hay insignias destacadas",
    "Nog geen badges uitgelicht",
    "Nessun distintivo in evidenza",
    "Aucun badge mis en avant",
    "Пока нет значков на витрине",
    "Henüz sergilenen rozet yok"
  ],
  "Beside your name": [
    "Neben deinem Namen",
    "Junto a tu nombre",
    "Naast je naam",
    "Accanto al nome",
    "À côté du nom",
    "Рядом с именем",
    "Adının yanında"
  ],
  "Profile showcase": [
    "Profilvitrine",
    "Vitrina del perfil",
    "Profielvitrine",
    "Vetrina del profilo",
    "Vitrine du profil",
    "Витрина профиля",
    "Profil vitrini"
  ],
  "Tap a badge to wear it beside your name in chat, parties, guilds and rankings.": [
    "Tippe auf ein Abzeichen, um es in Chats, Gruppen, Gilden und Ranglisten neben deinem Namen zu tragen.",
    "Toca una insignia para llevarla junto a tu nombre en chats, grupos, gremios y clasificaciones.",
    "Tik op een badge om die naast je naam te dragen in chats, party's, guilds en ranglijsten.",
    "Tocca un distintivo per mostrarlo accanto al nome in chat, gruppi, gilde e classifiche.",
    "Touchez un badge pour le porter près de votre nom dans les chats, groupes, guildes et classements.",
    "Нажмите на значок, чтобы носить его рядом с именем в чате, группах, гильдиях и рейтингах.",
    "Sohbette, gruplarda, loncalarda ve sıralamalarda adının yanında taşımak için bir rozete dokun."
  ],
  "Tap up to {count} badges to feature on your profile, in the order you tap them. Tap a featured badge again to remove it.": [
    "Tippe auf bis zu {count} Abzeichen, um sie in dieser Reihenfolge im Profil zu zeigen. Zum Entfernen erneut tippen.",
    "Toca hasta {count} insignias para destacarlas en tu perfil en ese orden. Tócalas de nuevo para quitarlas.",
    "Tik op maximaal {count} badges om ze in die volgorde op je profiel te tonen. Tik opnieuw om ze te verwijderen.",
    "Tocca fino a {count} distintivi per mostrarli sul profilo nell'ordine scelto. Tocca ancora per rimuoverli.",
    "Choisissez jusqu'à {count} badges pour les afficher dans l'ordre sur votre profil. Retouchez-en un pour le retirer.",
    "Выберите до {count} значков в нужном порядке для витрины профиля. Нажмите ещё раз, чтобы убрать.",
    "Profilinde dokunduğun sırayla en fazla {count} rozet sergile. Kaldırmak için tekrar dokun."
  ],
  "Supporter": [
    "Unterstützer",
    "Colaborador",
    "Supporter",
    "Sostenitore",
    "Soutien",
    "Поддержка",
    "Destekçi"
  ],
  "ACTIVE": [
    "AKTIV",
    "ACTIVO",
    "ACTIEF",
    "ATTIVO",
    "ACTIF",
    "АКТИВНО",
    "AKTİF"
  ],
  "NOT ACTIVE": [
    "NICHT AKTIV",
    "INACTIVO",
    "NIET ACTIEF",
    "NON ATTIVO",
    "INACTIF",
    "НЕАКТИВНО",
    "ETKİN DEĞİL"
  ],
  "Verified Supporter time: {days} days total": [
    "Bestätigte Unterstützerzeit: insgesamt {days} Tage",
    "Tiempo verificado como colaborador: {days} días en total",
    "Geverifieerde supportertijd: in totaal {days} dagen",
    "Tempo da sostenitore verificato: {days} giorni totali",
    "Durée de soutien vérifiée : {days} jours au total",
    "Подтверждённая поддержка: всего {days} дн.",
    "Doğrulanmış destekçi süresi: toplam {days} gün"
  ],
  "Your star evolves at 3, 6 and 12 total verified months of Supporter time.": [
    "Dein Stern entwickelt sich nach insgesamt 3, 6 und 12 bestätigten Unterstützermonaten weiter.",
    "Tu estrella evoluciona a los 3, 6 y 12 meses verificados como colaborador.",
    "Je ster evolueert na 3, 6 en 12 geverifieerde maanden als supporter.",
    "La tua stella si evolve dopo 3, 6 e 12 mesi verificati da sostenitore.",
    "Votre étoile évolue après 3, 6 et 12 mois de soutien vérifiés.",
    "Звезда улучшается после 3, 6 и 12 подтверждённых месяцев поддержки.",
    "Yıldızın toplam 3, 6 ve 12 doğrulanmış destekçi ayında gelişir."
  ],
  "Active Supporter · first star": [
    "Aktiver Unterstützer · erster Stern",
    "Colaborador activo · primera estrella",
    "Actieve supporter · eerste ster",
    "Sostenitore attivo · prima stella",
    "Soutien actif · première étoile",
    "Активная поддержка · первая звезда",
    "Aktif destekçi · ilk yıldız"
  ],
  "Verified {months}-month Supporter milestone": [
    "Bestätigter Unterstützer-Meilenstein: {months} Monate",
    "Hito de colaborador verificado: {months} meses",
    "Geverifieerde supportermijlpaal: {months} maanden",
    "Traguardo sostenitore verificato: {months} mesi",
    "Palier de soutien vérifié : {months} mois",
    "Подтверждённый рубеж поддержки: {months} мес.",
    "Doğrulanmış {months} aylık destekçi hedefi"
  ],
  "Time from separate verified subscription periods adds together. Pauses do not erase progress, and buying future months does not count early. Earlier history requires reliable billing proof.": [
    "Bestätigte Abozeiten werden addiert. Pausen löschen keinen Fortschritt, und künftige Monate zählen nicht vorab. Für ältere Zeiten ist ein verlässlicher Zahlungsnachweis nötig.",
    "Los periodos de suscripción verificados se suman. Las pausas no borran el progreso ni cuentan meses futuros por adelantado. El historial anterior requiere pruebas de pago.",
    "Geverifieerde abonnementsperiodes tellen samen. Pauzes wissen geen voortgang en toekomstige maanden tellen niet vooraf. Voor oudere periodes is betrouwbaar betaalbewijs nodig.",
    "I periodi verificati si sommano. Le pause non azzerano i progressi e i mesi futuri non contano in anticipo. Per lo storico serve una prova di pagamento affidabile.",
    "Les périodes d'abonnement vérifiées s'additionnent. Les pauses n'effacent rien et les mois futurs ne comptent pas d'avance. L'historique ancien exige une preuve de paiement fiable.",
    "Подтверждённые периоды подписки суммируются. Паузы не сбрасывают прогресс, будущие месяцы не засчитываются заранее. Для прошлых периодов нужно подтверждение оплаты.",
    "Doğrulanmış abonelik dönemleri toplanır. Aralar ilerlemeyi silmez, gelecek aylar erken sayılmaz. Eski dönemler için güvenilir ödeme kanıtı gerekir."
  ],
  "Earned badges": [
    "Verdiente Abzeichen",
    "Insignias ganadas",
    "Verdiende badges",
    "Distintivi ottenuti",
    "Badges obtenus",
    "Полученные значки",
    "Kazanılan rozetler"
  ],
  "{owned}/{total} UNLOCKED": [
    "{owned}/{total} FREIGESCHALTET",
    "{owned}/{total} DESBLOQUEADAS",
    "{owned}/{total} ONTGRENDELD",
    "{owned}/{total} SBLOCCATI",
    "{owned}/{total} DÉBLOQUÉS",
    "ОТКРЫТО {owned}/{total}",
    "{owned}/{total} AÇILDI"
  ],
  "Unlocked · account-wide": [
    "Freigeschaltet · kontoübergreifend",
    "Desbloqueada · para toda la cuenta",
    "Ontgrendeld · accountbreed",
    "Sbloccato · per tutto l'account",
    "Débloqué · pour tout le compte",
    "Открыто · для всей учётной записи",
    "Açıldı · hesap genelinde"
  ],
  "Unequip badge": [
    "Abzeichen ablegen",
    "Quitar insignia",
    "Badge afdoen",
    "Rimuovi distintivo",
    "Retirer le badge",
    "Снять значок",
    "Rozeti çıkar"
  ],
  "Clear profile badges": [
    "Profilabzeichen entfernen",
    "Quitar insignias del perfil",
    "Profielbadges wissen",
    "Rimuovi distintivi dal profilo",
    "Retirer les badges du profil",
    "Очистить значки профиля",
    "Profil rozetlerini temizle"
  ],
  "Loading earned badges…": [
    "Verdiente Abzeichen werden geladen…",
    "Cargando insignias ganadas…",
    "Verdiende badges laden…",
    "Caricamento distintivi ottenuti…",
    "Chargement des badges obtenus…",
    "Загрузка полученных значков…",
    "Kazanılan rozetler yükleniyor…"
  ],
  "LOCKED": [
    "GESPERRT",
    "BLOQUEADO",
    "VERGRENDELD",
    "BLOCCATO",
    "VERROUILLÉ",
    "ЗАКРЫТО",
    "KİLİTLİ"
  ],
  "EQUIPPED": [
    "ANGELEGT",
    "EQUIPADA",
    "UITGERUST",
    "EQUIPAGGIATO",
    "ÉQUIPÉ",
    "НАДЕТО",
    "KUŞANILDI"
  ],
  "EQUIP": [
    "ANLEGEN",
    "EQUIPAR",
    "UITRUSTEN",
    "EQUIPAGGIA",
    "ÉQUIPER",
    "НАДЕТЬ",
    "KUŞAN"
  ],
  "ON PROFILE {slot}": [
    "IM PROFIL {slot}",
    "EN PERFIL {slot}",
    "OP PROFIEL {slot}",
    "NEL PROFILO {slot}",
    "SUR PROFIL {slot}",
    "В ПРОФИЛЕ {slot}",
    "PROFİLDE {slot}"
  ],
  "FULL": [
    "VOLL",
    "LLENO",
    "VOL",
    "PIENO",
    "COMPLET",
    "ЗАПОЛНЕНО",
    "DOLU"
  ],
  "FEATURE": [
    "HERVORHEBEN",
    "DESTACAR",
    "UITLICHTEN",
    "METTI IN EVIDENZA",
    "METTRE EN AVANT",
    "ПОКАЗАТЬ",
    "SERGİLE"
  ],
  "Unequip this badge": [
    "Dieses Abzeichen ablegen",
    "Quitar esta insignia",
    "Deze badge afdoen",
    "Rimuovi questo distintivo",
    "Retirer ce badge",
    "Снять этот значок",
    "Bu rozeti çıkar"
  ],
  "Wear this badge beside your name": [
    "Dieses Abzeichen neben deinem Namen tragen",
    "Llevar esta insignia junto a tu nombre",
    "Draag deze badge naast je naam",
    "Indossa questo distintivo accanto al nome",
    "Porter ce badge près de votre nom",
    "Носить значок рядом с именем",
    "Bu rozeti adının yanında taşı"
  ],
  "Remove this badge from your profile": [
    "Dieses Abzeichen aus dem Profil entfernen",
    "Quitar esta insignia del perfil",
    "Verwijder deze badge van je profiel",
    "Rimuovi questo distintivo dal profilo",
    "Retirer ce badge du profil",
    "Убрать значок из профиля",
    "Bu rozeti profilden kaldır"
  ],
  "Remove a featured badge to make room": [
    "Entferne ein Profilabzeichen, um Platz zu schaffen",
    "Quita una insignia destacada para hacer sitio",
    "Verwijder een uitgelichte badge om ruimte te maken",
    "Rimuovi un distintivo in evidenza per liberare spazio",
    "Retirez un badge affiché pour libérer de la place",
    "Уберите один значок с витрины, чтобы освободить место",
    "Yer açmak için sergilenen bir rozeti kaldır"
  ],
  "Feature this badge on your profile": [
    "Dieses Abzeichen in deinem Profil zeigen",
    "Destacar esta insignia en tu perfil",
    "Toon deze badge op je profiel",
    "Metti questo distintivo in evidenza nel profilo",
    "Afficher ce badge sur votre profil",
    "Показать значок в профиле",
    "Bu rozeti profilinde sergile"
  ],
  "Awarded to founding players.": [
    "An Gründer-Spieler verliehen.",
    "Otorgada a jugadores fundadores.",
    "Toegekend aan oprichtende spelers.",
    "Assegnato ai giocatori fondatori.",
    "Attribué aux joueurs fondateurs.",
    "Выдаётся игрокам-основателям.",
    "Kurucu oyunculara verilir."
  ],
  "Awarded to early beta testers.": [
    "An frühe Betatester verliehen.",
    "Otorgada a los primeros probadores de la beta.",
    "Toegekend aan vroege bètatesters.",
    "Assegnato ai primi beta tester.",
    "Attribué aux premiers bêta-testeurs.",
    "Выдаётся первым бета-тестерам.",
    "Erken beta testçilerine verilir."
  ],
  "Play Veldryn for 90 days.": [
    "Spiele Veldryn 90 Tage lang.",
    "Juega a Veldryn durante 90 días.",
    "Speel Veldryn 90 dagen.",
    "Gioca a Veldryn per 90 giorni.",
    "Jouez à Veldryn pendant 90 jours.",
    "Играйте в Veldryn 90 дней.",
    "Veldryn'i 90 gün oyna."
  ],
  "Lead an active guild.": [
    "Führe eine aktive Gilde.",
    "Lidera un gremio activo.",
    "Leid een actieve guild.",
    "Guida una gilda attiva.",
    "Dirigez une guilde active.",
    "Руководите активной гильдией.",
    "Etkin bir loncaya liderlik et."
  ],
  "Awarded for outstanding community contributions.": [
    "Für herausragende Beiträge zur Community verliehen.",
    "Otorgada por contribuciones destacadas a la comunidad.",
    "Toegekend voor bijzondere bijdragen aan de community.",
    "Assegnato per contributi eccezionali alla community.",
    "Attribué pour une contribution exceptionnelle à la communauté.",
    "Выдаётся за выдающийся вклад в сообщество.",
    "Topluluğa olağanüstü katkılar için verilir."
  ],
  "Awarded for special event achievements.": [
    "Für besondere Event-Erfolge verliehen.",
    "Otorgada por logros especiales de eventos.",
    "Toegekend voor bijzondere evenementprestaties.",
    "Assegnato per traguardi speciali negli eventi.",
    "Attribué pour des exploits lors d'événements spéciaux.",
    "Выдаётся за особые достижения в событиях.",
    "Özel etkinlik başarıları için verilir."
  ],
  "Unlock with an active Supporter entitlement.": [
    "Mit aktivem Unterstützerstatus freischalten.",
    "Se desbloquea con la suscripción activa de colaborador.",
    "Ontgrendel met een actieve supporterstatus.",
    "Sblocca con lo stato di sostenitore attivo.",
    "Débloqué avec un statut de soutien actif.",
    "Открывается при активной подписке поддержки.",
    "Aktif destekçi hakkıyla açılır."
  ],
  "Unlock after 3 total verified months of Supporter.": [
    "Nach insgesamt 3 bestätigten Unterstützermonaten freischalten.",
    "Se desbloquea tras 3 meses verificados como colaborador.",
    "Ontgrendel na in totaal 3 geverifieerde supportermaanden.",
    "Sblocca dopo 3 mesi verificati da sostenitore.",
    "Débloqué après 3 mois de soutien vérifiés.",
    "Открывается после 3 подтверждённых месяцев поддержки.",
    "Toplam 3 doğrulanmış destekçi ayından sonra açılır."
  ],
  "Unlock after 6 total verified months of Supporter.": [
    "Nach insgesamt 6 bestätigten Unterstützermonaten freischalten.",
    "Se desbloquea tras 6 meses verificados como colaborador.",
    "Ontgrendel na in totaal 6 geverifieerde supportermaanden.",
    "Sblocca dopo 6 mesi verificati da sostenitore.",
    "Débloqué après 6 mois de soutien vérifiés.",
    "Открывается после 6 подтверждённых месяцев поддержки.",
    "Toplam 6 doğrulanmış destekçi ayından sonra açılır."
  ],
  "Unlock after 12 total verified months of Supporter.": [
    "Nach insgesamt 12 bestätigten Unterstützermonaten freischalten.",
    "Se desbloquea tras 12 meses verificados como colaborador.",
    "Ontgrendel na in totaal 12 geverifieerde supportermaanden.",
    "Sblocca dopo 12 mesi verificati da sostenitore.",
    "Débloqué après 12 mois de soutien vérifiés.",
    "Открывается после 12 подтверждённых месяцев поддержки.",
    "Toplam 12 doğrulanmış destekçi ayından sonra açılır."
  ],
  "Admin": ["Admin","Administrador","Beheerder","Amministratore","Administrateur","Администратор","Yönetici"],
  "Moderator": ["Moderator","Moderador","Moderator","Moderatore","Modérateur","Модератор","Moderatör"],
  "Founder": ["Gründer","Fundador","Oprichter","Fondatore","Fondateur","Основатель","Kurucu"],
  "Beta Tester": ["Betatester","Probador beta","Bètatester","Beta tester","Bêta-testeur","Бета-тестер","Beta testçisi"],
  "Veteran": ["Veteran","Veterano","Veteraan","Veterano","Vétéran","Ветеран","Emektar"],
  "Guild Leader": ["Gildenleiter","Líder del gremio","Guildleider","Capogilda","Chef de guilde","Глава гильдии","Lonca lideri"],
  "Community Champion": ["Community-Champion","Campeón de la comunidad","Communitykampioen","Campione della community","Champion de la communauté","Чемпион сообщества","Topluluk şampiyonu"],
  "Event Champion": ["Event-Champion","Campeón de eventos","Evenementkampioen","Campione evento","Champion d'événement","Чемпион события","Etkinlik şampiyonu"],
  "Supporter · 3 Months": ["Unterstützer · 3 Monate","Colaborador · 3 meses","Supporter · 3 maanden","Sostenitore · 3 mesi","Soutien · 3 mois","Поддержка · 3 месяца","Destekçi · 3 ay"],
  "Supporter · 6 Months": ["Unterstützer · 6 Monate","Colaborador · 6 meses","Supporter · 6 maanden","Sostenitore · 6 mesi","Soutien · 6 mois","Поддержка · 6 месяцев","Destekçi · 6 ay"],
  "Supporter · 12 Months": ["Unterstützer · 12 Monate","Colaborador · 12 meses","Supporter · 12 maanden","Sostenitore · 12 mesi","Soutien · 12 mois","Поддержка · 12 месяцев","Destekçi · 12 ay"],
  "Dungeons": ["Dungeons","Mazmorras","Kerkers","Dungeon","Donjons","Подземелья","Zindanlar"],
  "Co-op dungeon expeditions are live. We are expanding encounter variety, refining difficulty tiers, companion loadouts and rewards.": ["Koop-Dungeonexpeditionen sind live. Wir erweitern Begegnungsvielfalt, Schwierigkeitsstufen, Gefährtenausrüstung und Belohnungen.","Las expediciones cooperativas a mazmorras están disponibles. Ampliamos los encuentros y mejoramos las dificultades, los compañeros y las recompensas.","Coöperatieve kerkertochten zijn live. We breiden gevechten uit en verfijnen moeilijkheidsgraden, metgezeluitrustingen en beloningen.","Le spedizioni cooperative nei dungeon sono attive. Ampliamo gli incontri e perfezioniamo difficoltà, equipaggiamenti dei compagni e ricompense.","Les expéditions coopératives en donjon sont disponibles. Nous diversifions les rencontres et améliorons les paliers, les compagnons et les récompenses.","Совместные походы в подземелья уже доступны. Мы разнообразим встречи, дорабатываем сложность, выбор спутников и награды.","Eşli zindan seferleri yayında. Karşılaşmaları çeşitlendiriyor, zorluk kademelerini, yoldaş düzenlerini ve ödülleri geliştiriyoruz."],
  "Seasonal Events": ["Saisonale Events","Eventos de temporada","Seizoensevenementen","Eventi stagionali","Événements saisonniers","Сезонные события","Sezonluk etkinlikler"],
  "Expanding seasonal celebrations with event previews, limited-time activities, themed rewards and improved event access.": ["Wir erweitern saisonale Feste um Vorschauen, zeitlich begrenzte Aktivitäten, Themenbelohnungen und leichteren Zugang.","Ampliamos las celebraciones de temporada con avances, actividades temporales, recompensas temáticas y mejor acceso.","We breiden seizoensfeesten uit met voorproefjes, tijdelijke activiteiten, themabeloningen en betere toegang.","Ampliamo le feste stagionali con anteprime, attività a tempo, ricompense a tema e un accesso migliore.","Nous enrichissons les fêtes saisonnières avec des aperçus, activités limitées, récompenses à thème et un meilleur accès.","Мы расширяем сезонные праздники: предпросмотры, временные занятия, тематические награды и более удобный доступ.","Sezon kutlamalarını ön izlemeler, süreli etkinlikler, temalı ödüller ve daha kolay erişimle genişletiyoruz."],
  "Companion Refinement": ["Gefährten-Überarbeitung","Mejoras de compañeros","Verbeteringen voor metgezellen","Perfezionamento compagni","Amélioration des compagnons","Доработка спутников","Yoldaş iyileştirmeleri"],
  "Refining companion selection, role balance, training, ascension and their impact across combat and dungeons.": ["Wir verbessern Gefährtenauswahl, Rollenbalance, Training, Aufstieg und ihren Einfluss auf Kämpfe und Dungeons.","Mejoramos la elección de compañeros, el equilibrio de roles, el entrenamiento, la ascensión y su efecto en combates y mazmorras.","We verbeteren metgezelkeuze, rolbalans, training, verheffing en de invloed op gevechten en kerkers.","Perfezioniamo scelta dei compagni, bilanciamento dei ruoli, addestramento, ascensione e impatto nei combattimenti e dungeon.","Nous améliorons le choix des compagnons, l'équilibre des rôles, l'entraînement, l'ascension et leur impact en combat et donjon.","Мы дорабатываем выбор спутников, баланс ролей, тренировку, возвышение и их влияние на бои и подземелья.","Yoldaş seçimini, rol dengesini, eğitimi, yükselişi ve savaş ile zindanlara etkilerini iyileştiriyoruz."],
  "Achievements": ["Erfolge","Logros","Prestaties","Obiettivi","Succès","Достижения","Başarılar"],
  "Expand achievements with more progression milestones, challenges and meaningful rewards for player accomplishments.": ["Wir erweitern Erfolge um Fortschrittsmeilensteine, Herausforderungen und wertvolle Belohnungen.","Ampliaremos los logros con hitos de progreso, desafíos y recompensas valiosas por los méritos de los jugadores.","We breiden prestaties uit met voortgangsmijlpalen, uitdagingen en betekenisvolle beloningen.","Ampliamo gli obiettivi con nuovi traguardi, sfide e ricompense significative per i giocatori.","Nous enrichirons les succès de jalons, défis et récompenses valorisant les exploits des joueurs.","Расширим достижения новыми этапами прогресса, испытаниями и ценными наградами за успехи игроков.","Başarıları yeni ilerleme hedefleri, mücadeleler ve oyuncu kazanımları için anlamlı ödüllerle genişleteceğiz."],
  "Cosmetics": ["Kosmetische Gegenstände","Cosméticos","Cosmetica","Aspetti estetici","Cosmétiques","Косметика","Kozmetik öğeler"],
  "Expand player customization with collectible visual rewards, profile cosmetics and additional ways to show off accomplishments.": ["Wir erweitern die Anpassung mit sammelbaren Designs, Profilkosmetik und neuen Möglichkeiten, Erfolge zu zeigen.","Ampliaremos la personalización con recompensas visuales coleccionables, cosméticos de perfil y más formas de mostrar logros.","We breiden personalisatie uit met verzamelbare visuele beloningen, profielcosmetica en meer manieren om prestaties te tonen.","Ampliamo la personalizzazione con ricompense estetiche da collezionare, decorazioni del profilo e nuovi modi di mostrare i traguardi.","Nous enrichirons la personnalisation avec des récompenses visuelles à collectionner, des ornements de profil et des façons d'exposer ses exploits.","Расширим оформление персонажа: коллекционные награды, украшения профиля и новые способы показать достижения.","Koleksiyonluk görsel ödüller, profil süsleri ve başarıları sergilemenin yeni yollarıyla özelleştirmeyi genişleteceğiz."],
  "Community Rewards": ["Community-Belohnungen","Recompensas de la comunidad","Communitybeloningen","Ricompense della community","Récompenses communautaires","Награды сообщества","Topluluk ödülleri"],
  "Introduce shared community milestones and rewards that celebrate collective progress, participation and special occasions.": ["Wir führen gemeinsame Community-Meilensteine und Belohnungen für Fortschritt, Teilnahme und besondere Anlässe ein.","Introduciremos hitos y recompensas compartidos que celebren el progreso, la participación y las ocasiones especiales.","We voegen gezamenlijke communitymijlpalen en beloningen toe voor voortgang, deelname en speciale gelegenheden.","Introduciamo traguardi e ricompense condivisi per celebrare i progressi, la partecipazione e le occasioni speciali.","Nous ajouterons des jalons et récompenses communs pour célébrer la progression, la participation et les événements spéciaux.","Добавим общие цели и награды сообщества за совместный прогресс, участие и особые события.","Ortak ilerlemeyi, katılımı ve özel günleri kutlayan topluluk hedefleri ve ödülleri ekleyeceğiz."],
  "Class & Combat Refinement": ["Klassen- und Kampfüberarbeitung","Mejoras de clases y combate","Verbeteringen voor klassen en gevechten","Perfezionamento classi e combattimento","Amélioration des classes et du combat","Доработка классов и боя","Sınıf ve savaş iyileştirmeleri"],
  "Improve class identity, equipment stat scaling, combat pacing and encounter balance across progression.": ["Wir verbessern Klassenidentität, Ausrüstungsskalierung, Kampftempo und Gegnerbalance im Spielverlauf.","Mejoramos la identidad de clase, el escalado de estadísticas, el ritmo del combate y el equilibrio de los encuentros.","We verbeteren klasse-identiteit, schaling van uitrustingsstats, gevechtstempo en balans tijdens de voortgang.","Miglioriamo l'identità delle classi, la crescita delle statistiche, il ritmo dei combattimenti e il bilanciamento degli incontri.","Nous améliorons l'identité des classes, l'évolution des statistiques d'équipement, le rythme et l'équilibre des combats.","Улучшаем особенности классов, рост характеристик снаряжения, темп боёв и баланс встреч по мере прогресса.","Sınıf kimliğini, ekipman özellik ölçeklemesini, savaş temposunu ve karşılaşma dengesini geliştiriyoruz."],
  "Guild Improvements": ["Gildenverbesserungen","Mejoras de gremios","Guildverbeteringen","Miglioramenti delle gilde","Améliorations des guildes","Улучшения гильдий","Lonca iyileştirmeleri"],
  "Refine weekly projects, guild skills, progression, tutorials and cooperative guild activities.": ["Wir überarbeiten Wochenprojekte, Gildenfertigkeiten, Fortschritt, Tutorials und gemeinsame Gildenaktivitäten.","Mejoramos los proyectos semanales, habilidades, progreso, tutoriales y actividades cooperativas de gremio.","We verbeteren weekprojecten, guildvaardigheden, voortgang, handleidingen en gezamenlijke guildactiviteiten.","Perfezioniamo progetti settimanali, abilità della gilda, progressione, tutorial e attività cooperative.","Nous améliorons les projets hebdomadaires, compétences, progression, tutoriels et activités coopératives de guilde.","Дорабатываем еженедельные проекты, навыки, развитие, обучение и совместные занятия гильдий.","Haftalık projeleri, lonca becerilerini, ilerlemeyi, eğitimleri ve ortak lonca etkinliklerini geliştiriyoruz."],
  "Exploration Expansion": ["Erkundungserweiterung","Expansión de la exploración","Uitbreiding van verkenning","Espansione dell'esplorazione","Extension de l'exploration","Расширение исследования мира","Keşif genişlemesi"],
  "Expand exploration choices with more destinations, level requirements, rewards and progression.": ["Wir erweitern die Erkundung um mehr Reiseziele, Stufenvoraussetzungen, Belohnungen und Fortschritt.","Ampliaremos la exploración con más destinos, requisitos de nivel, recompensas y progresión.","We breiden verkenning uit met meer bestemmingen, levelvereisten, beloningen en voortgang.","Ampliamo l'esplorazione con più destinazioni, requisiti di livello, ricompense e progressione.","Nous enrichirons l'exploration avec plus de destinations, de niveaux requis, de récompenses et de progression.","Расширим исследование мира новыми местами, требованиями к уровню, наградами и этапами развития.","Keşfi daha fazla hedef, seviye koşulu, ödül ve ilerleme ile genişleteceğiz."],
  "New Regions & Chapters": ["Neue Regionen und Kapitel","Nuevas regiones y capítulos","Nieuwe regio's en hoofdstukken","Nuove regioni e capitoli","Nouvelles régions et chapitres","Новые регионы и главы","Yeni bölgeler ve bölümler"],
  "Continue Veldryn’s story with future regions, enemies, bosses, resources and equipment progression.": ["Wir führen Veldryns Geschichte mit neuen Regionen, Gegnern, Bossen, Ressourcen und Ausrüstung fort.","Continuaremos la historia de Veldryn con nuevas regiones, enemigos, jefes, recursos y equipo.","We zetten Veldryns verhaal voort met nieuwe regio's, vijanden, bazen, grondstoffen en uitrusting.","Continueremo la storia di Veldryn con nuove regioni, nemici, boss, risorse e progressione dell'equipaggiamento.","Nous poursuivrons l'histoire de Veldryn avec de nouvelles régions, ennemis, boss, ressources et équipements.","Продолжим историю Veldryn: новые регионы, враги, боссы, ресурсы и развитие снаряжения.","Veldryn hikâyesini yeni bölgeler, düşmanlar, boss'lar, kaynaklar ve ekipman ilerlemesiyle sürdüreceğiz."],
  "Events": ["Events","Eventos","Evenementen","Eventi","Événements","События","Etkinlikler"],
  "Companions": ["Gefährten","Compañeros","Metgezellen","Compagni","Compagnons","Спутники","Yoldaşlar"],
  "Progression": ["Fortschritt","Progresión","Voortgang","Progressione","Progression","Прогресс","İlerleme"],
  "Customization": ["Anpassung","Personalización","Aanpassen","Personalizzazione","Personnalisation","Настройка внешности","Özelleştirme"],
  "Community": ["Community","Comunidad","Community","Community","Communauté","Сообщество","Topluluk"],
  "Combat": ["Kampf","Combate","Gevecht","Combattimento","Combat","Бой","Savaş"],
  "Guilds": ["Gilden","Gremios","Guilds","Gilde","Guildes","Гильдии","Loncalar"],
  "Exploration": ["Erkundung","Exploración","Verkenning","Esplorazione","Exploration","Исследование","Keşif"],
  "World": ["Welt","Mundo","Wereld","Mondo","Monde","Мир","Dünya"],
  "Co-op": ["Koop","Cooperativo","Co-op","Cooperativa","Coopératif","Совместная игра","Eşli oyun"],
  "Echoes": ["Echos","Ecos","Echo's","Echi","Échos","Эхо","Yankılar"],
  "Regional progress unavailable": ["Regionalfortschritt nicht verfügbar","Progreso regional no disponible","Regiovoortgang niet beschikbaar","Progressi regionali non disponibili","Progression régionale indisponible","Прогресс региона недоступен","Bölgesel ilerleme kullanılamıyor"],
  "Continue regional story": ["Regionale Geschichte fortsetzen","Continuar la historia regional","Ga verder met het regioverhaal","Continua la storia regionale","Poursuivre l'histoire régionale","Продолжить историю региона","Bölge hikâyesine devam et"],
  "Complete regional side quests": ["Regionale Nebenquests abschließen","Completar las misiones secundarias regionales","Voltooi de regionale zijmissies","Completa le missioni secondarie regionali","Terminer les quêtes secondaires régionales","Завершить побочные задания региона","Bölgenin yan görevlerini tamamla"],
  "Resolve remaining Echo conditions": ["Verbleibende Echo-Bedingungen erfüllen","Resolver las condiciones de Eco restantes","Vervul de resterende Echovoorwaarden","Soddisfa le condizioni Eco rimanenti","Remplir les conditions d'Écho restantes","Выполнить оставшиеся условия Эхо","Kalan Yankı koşullarını tamamla"],
  "Complete regional co-op content": ["Regionale Koop-Inhalte abschließen","Completar el contenido cooperativo regional","Voltooi regionale co-opinhoud","Completa i contenuti cooperativi regionali","Terminer le contenu coopératif régional","Завершить совместные задания региона","Bölgesel eşli içerikleri tamamla"],
  "Fill the regional collection book": ["Regionales Sammelbuch vervollständigen","Completar el libro de colecciones regional","Vul het regionale verzamelboek","Completa il registro della collezione regionale","Compléter le registre de collection régional","Заполнить коллекционную книгу региона","Bölgesel koleksiyon defterini tamamla"],
  "Advance regional boss mastery": ["Regionale Bossmeisterschaft steigern","Mejorar la maestría de jefes regionales","Verbeter regionale baasbeheersing","Aumenta la maestria dei boss regionali","Améliorer la maîtrise des boss régionaux","Повысить мастерство сражений с боссами региона","Bölgesel boss ustalığını geliştir"],
  "Region complete": ["Region abgeschlossen","Región completada","Regio voltooid","Regione completata","Région terminée","Регион завершён","Bölge tamamlandı"],
  "Combatant": ["Kämpfer","Combatiente","Strijder","Combattente","Combattant","Боец","Savaşçı"],
  "Well-Rounded": ["Vielseitig","Polivalente","Allrounder","Versatile","Polyvalent","Универсал","Çok yönlü"],
  "Artisan": ["Handwerker","Artesano","Ambachtsman","Artigiano","Artisan","Ремесленник","Zanaatkâr"],
  "Mastery Hall": ["Meisterschaftshalle","Salón de maestría","Meesterschapshal","Sala della maestria","Hall de maîtrise","Зал мастерства","Ustalık Salonu"],
  "Pathfinder": ["Pfadfinder","Explorador","Padvinder","Esploratore","Éclaireur","Следопыт","İz bulucu"],
  "Delver": ["Tiefenforscher","Explorador de profundidades","Diepteverkenner","Esploratore di profondità","Explorateur des profondeurs","Исследователь глубин","Derinlik kâşifi"],
  "Companion Keeper": ["Gefährtenhüter","Guardián de compañeros","Metgezelhoeder","Custode dei compagni","Gardien des compagnons","Хранитель спутников","Yoldaş koruyucusu"],
  "Beast Scholar": ["Bestienkundler","Erudito de bestias","Beestengeleerde","Studioso delle bestie","Érudit des bêtes","Знаток зверей","Canavar bilgini"],
  "Orderbound": ["Ordenstreu","Ligado a la Orden","Ordegebonden","Vincolato all'Ordine","Lié à l'Ordre","Верный Ордену","Düzene bağlı"],
  "Novice": ["Anfänger","Novato","Beginner","Novizio","Novice","Новичок","Acemi"],
  "Adventurer": ["Abenteurer","Aventurero","Avonturier","Avventuriero","Aventurier","Искатель приключений","Maceracı"],
  "Master": ["Meister","Maestro","Meester","Maestro","Maître","Мастер","Usta"],
  "Grandmaster": ["Großmeister","Gran maestro","Grootmeester","Gran maestro","Grand maître","Грандмастер","Büyük usta"],
  "Market": ["Markt","Mercado","Markt","Mercato","Marché","Рынок","Pazar"],
  "Price history": ["Preisverlauf","Historial de precios","Prijsgeschiedenis","Storico prezzi","Historique des prix","История цен","Fiyat geçmişi"],
  "Completed sales · Gold per unit": ["Abgeschlossene Verkäufe · Gold pro Einheit","Ventas realizadas · Oro por unidad","Afgeronde verkopen · Goud per stuk","Vendite completate · Oro per unità","Ventes réalisées · Or par unité","Завершённые продажи · золото за единицу","Tamamlanan satışlar · Birim başına altın"],
  "d": ["T","d","d","g","j","д","g"],
  "Loading sale history…": ["Verkaufsverlauf wird geladen…","Cargando historial de ventas…","Verkoopgeschiedenis laden…","Caricamento storico vendite…","Chargement de l'historique des ventes…","Загрузка истории продаж…","Satış geçmişi yükleniyor…"],
  "Not enough completed sales yet": ["Noch nicht genug abgeschlossene Verkäufe","Todavía no hay suficientes ventas completadas","Nog niet genoeg afgeronde verkopen","Non ci sono ancora abbastanza vendite completate","Pas encore assez de ventes réalisées","Пока недостаточно завершённых продаж","Henüz yeterli tamamlanmış satış yok"],
  "Prices appear after at least three completed sales from different buyers and sellers on a day.": ["Preise werden angezeigt, wenn an einem Tag mindestens drei Verkäufe zwischen unterschiedlichen Käufern und Verkäufern abgeschlossen wurden.","Los precios aparecen tras al menos tres ventas completadas entre diferentes compradores y vendedores en un día.","Prijzen verschijnen zodra er op één dag minstens drie verkopen zijn afgerond met verschillende kopers en verkopers.","I prezzi appaiono dopo almeno tre vendite completate in un giorno tra acquirenti e venditori distinti.","Les prix apparaissent après au moins trois ventes conclues en une journée entre acheteurs et vendeurs distincts.","Цены появятся после как минимум трёх завершённых продаж за день между разными покупателями и продавцами.","Fiyatlar, bir günde farklı alıcı ve satıcılar arasında en az üç tamamlanmış satıştan sonra görünür."],
  "Selected day · Median": ["Ausgewählter Tag · Median","Día seleccionado · Mediana","Geselecteerde dag · Mediaan","Giorno selezionato · Mediana","Jour sélectionné · Médiane","Выбранный день · медиана","Seçilen gün · Medyan"],
  "Sales / Units": ["Verkäufe / Einheiten","Ventas / Unidades","Verkopen / Stuks","Vendite / Unità","Ventes / Unités","Продажи / Единицы","Satış / Adet"],
  "No verified daily price": ["Kein bestätigter Tagespreis","Sin precio diario verificado","Geen geverifieerde dagprijs","Nessun prezzo giornaliero verificato","Aucun prix journalier vérifié","Нет подтверждённой цены за день","Doğrulanmış günlük fiyat yok"],
  "Daily price range": ["Tägliche Preisspanne","Rango diario de precios","Dagelijkse prijsrange","Intervallo giornaliero dei prezzi","Fourchette de prix du jour","Дневной диапазон цен","Günlük fiyat aralığı"],
  "Only actual completed sales are shown; missing days have no price.": ["Es werden nur tatsächlich abgeschlossene Verkäufe angezeigt; Tage ohne Verkäufe haben keinen Preis.","Solo se muestran ventas realmente completadas; los días sin datos no tienen precio.","Alleen daadwerkelijk afgeronde verkopen worden getoond; dagen zonder gegevens hebben geen prijs.","Sono mostrate solo vendite effettivamente completate; i giorni senza dati non hanno un prezzo.","Seules les ventes réellement conclues sont affichées ; les jours sans données n'ont pas de prix.","Показаны только реальные завершённые продажи; для дней без данных цена не указана.","Yalnızca gerçek tamamlanan satışlar gösterilir; veri olmayan günlerin fiyatı yoktur."],
  "{date}: {price} Gold median, {sales} completed sales": ["{date}: Median {price} Gold, {sales} abgeschlossene Verkäufe","{date}: mediana de {price} de oro, {sales} ventas completadas","{date}: mediaan {price} goud, {sales} afgeronde verkopen","{date}: mediana {price} oro, {sales} vendite completate","{date} : médiane de {price} or, {sales} ventes réalisées","{date}: медиана {price} золота, завершённых продаж: {sales}","{date}: medyan {price} altın, {sales} tamamlanan satış"],
  "Development tools.": ["Entwicklerwerkzeuge.","Herramientas de desarrollo.","Ontwikkelaarshulpmiddelen.","Strumenti di sviluppo.","Outils de développement.","Инструменты разработчика.","Geliştirici araçları."],
  "Developer tools": ["Entwicklerwerkzeuge","Herramientas de desarrollo","Ontwikkelaarshulpmiddelen","Strumenti di sviluppo","Outils de développement","Инструменты разработчика","Geliştirici araçları"],
  "What's New & Updates": ["Neuigkeiten und Updates","Novedades y actualizaciones","Nieuw en updates","Novità e aggiornamenti","Nouveautés et mises à jour","Новости и обновления","Yenilikler ve güncellemeler"],
  "ACTIVITY QUEUE": ["AKTIVITÄTSWARTESCHLANGE","COLA DE ACTIVIDADES","ACTIVITEITENWACHTRIJ","CODA ATTIVITÀ","FILE D'ACTIVITÉS","ОЧЕРЕДЬ ЗАНЯТИЙ","ETKİNLİK KUYRUĞU"],
  "Manage waiting activities": ["Wartende Aktivitäten verwalten","Gestionar actividades en espera","Wachtende activiteiten beheren","Gestisci le attività in attesa","Gérer les activités en attente","Управление ожидающими занятиями","Bekleyen etkinlikleri yönet"],
  "QUICK ACTIONS": ["SCHNELLAKTIONEN","ACCIONES RÁPIDAS","SNELLE ACTIES","AZIONI RAPIDE","ACTIONS RAPIDES","БЫСТРЫЕ ДЕЙСТВИЯ","HIZLI İŞLEMLER"],
  "Your next moves": ["Deine nächsten Schritte","Tus próximos pasos","Je volgende stappen","Le tue prossime mosse","Vos prochaines actions","Ваши следующие шаги","Sonraki adımların"],
  "QUICK ACCESS": ["SCHNELLZUGRIFF","ACCESO RÁPIDO","SNELTOEGANG","ACCESSO RAPIDO","ACCÈS RAPIDE","БЫСТРЫЙ ДОСТУП","HIZLI ERİŞİM"],
  "Open Guild Hall": ["Gildenhalle öffnen","Abrir sala del gremio","Gildehal openen","Apri la sede della gilda","Ouvrir la salle de guilde","Открыть зал гильдии","Lonca Salonunu aç"],
  "Find a Guild": ["Gilde finden","Buscar gremio","Gilde zoeken","Trova una gilda","Trouver une guilde","Найти гильдию","Lonca bul"],
  "Guild Hall": ["Gildenhalle","Sala del gremio","Gildehal","Sede della gilda","Salle de guilde","Зал гильдии","Lonca Salonu"],
  "Find your Guild": ["Finde deine Gilde","Encuentra tu gremio","Vind je gilde","Trova la tua gilda","Trouvez votre guilde","Найдите свою гильдию","Loncanı bul"],
  "Projects · Guild Shop · Chat": ["Projekte · Gildenladen · Chat","Proyectos · Tienda · Chat","Projecten · Gildewinkel · Chat","Progetti · Negozio · Chat","Projets · Boutique · Chat","Проекты · Магазин · Чат","Projeler · Lonca dükkânı · Sohbet"],
  "Guild projects, events and co-op rewards": ["Gildenprojekte, Events und Koopbelohnungen","Proyectos, eventos y recompensas cooperativas","Gildeprojecten, evenementen en co-opbeloningen","Progetti di gilda, eventi e ricompense cooperative","Projets de guilde, événements et récompenses coop","Проекты гильдии, события и награды за совместную игру","Lonca projeleri, etkinlikler ve ortak oyun ödülleri"],
  "Activity queue": ["Aktivitätsliste","Cola de actividades","Activiteitenwachtrij","Coda attività","File d'activités","Очередь занятий","Etkinlik kuyruğu"],
  "{count} / {capacity} queued": ["{count} / {capacity} in Warteschlange","{count} / {capacity} en cola","{count} / {capacity} in wachtrij","{count} / {capacity} in coda","{count} / {capacity} en attente","В очереди {count} / {capacity}","Sırada {count} / {capacity}"],
  "Co-op expeditions": ["Koop-Expeditionen","Expediciones cooperativas","Co-op-expedities","Spedizioni cooperative","Expéditions coopératives","Совместные экспедиции","Ortak keşif seferleri"],
  "Contracts": ["Verträge","Contratos","Contracten","Contratti","Contrats","Контракты","Sözleşmeler"],
  "Weekly objectives": ["Wöchentliche Ziele","Objetivos semanales","Weekdoelen","Obiettivi settimanali","Objectifs hebdomadaires","Еженедельные цели","Haftalık hedefler"],
  "Forge": ["Schmiede","Forja","Smederij","Forgia","Forge","Кузница","Demirhane"],
  "Crafting & upgrades": ["Herstellung und Verbesserungen","Fabricación y mejoras","Maken en verbeteren","Creazione e miglioramenti","Fabrication et améliorations","Создание и улучшения","Üretim ve geliştirmeler"],
  "READY NOW": ["JETZT BEREIT","LISTO AHORA","NU KLAAR","PRONTO ORA","PRÊT MAINTENANT","ГОТОВО СЕЙЧАС","ŞİMDİ HAZIR"],
  "{count} actions need attention": ["{count} Aktionen benötigen Aufmerksamkeit","{count} acciones requieren atención","{count} acties vragen aandacht","{count} azioni richiedono attenzione","{count} actions nécessitent votre attention","Требуют внимания: {count}","{count} eylem ilgini bekliyor"],
  "Show fewer": ["Weniger anzeigen","Mostrar menos","Minder tonen","Mostra meno","Afficher moins","Свернуть","Daha az göster"],
  "Show {count} more": ["{count} weitere anzeigen","Mostrar {count} más","Toon nog {count}","Mostra altri {count}","Afficher {count} de plus","Показать ещё {count}","{count} tane daha göster"],
  "Your adventure": ["Dein Abenteuer","Tu aventura","Jouw avontuur","La tua avventura","Votre aventure","Ваше приключение","Maceran"],
} as const satisfies Record<string,readonly [string,string,string,string,string,string,string]>;

export type RecentScreenKey=keyof typeof recentScreenTranslationRows;
const catalogs=Object.fromEntries(SUPPORTED_LANGUAGES.map((language,index)=>[
 language,Object.fromEntries(Object.entries(recentScreenTranslationRows).map(([source,translations])=>[source,index===0?source:translations[index-1]])),
])) as Record<Language,Record<RecentScreenKey,string>>;
const t=createTranslator<RecentScreenKey>(catalogs);

/** Prefer reviewed new screen copy, then the established account dictionary. */
export function recentScreenText(language:Language,source:string,params:TranslationParams={}):string{
 if(!Object.prototype.hasOwnProperty.call(recentScreenTranslationRows,source))
  return accountText(language,source,params);
 // This is a screen-specific, reviewed catalog. Its explicit RU/TR copy
 // must win over generic early-language fallbacks used in other contexts.
 // E.g. READY NOW on the Home screen is not READY NOW in a crafting recipe.
 if(language==='ru'||language==='tr'){
  const index=SUPPORTED_LANGUAGES.indexOf(language)-1;
  return interpolateTranslation(recentScreenTranslationRows[source as RecentScreenKey][index],params);
 }
 return t(language,source as RecentScreenKey,params);
}

/** Localize only the exact achievement-title structure authored in adventurers-journal-v42.
 * Unknown or future titles are preserved verbatim rather than rewriting player content. */
const journalAchievementBases=new Set(['Combatant','Well-Rounded','Artisan','Mastery Hall','Pathfinder','Delver','Companion Keeper','Beast Scholar','Orderbound']);
const journalAchievementTiers=new Set(['Novice','Adventurer','Veteran','Master','Grandmaster']);
export function journalAchievementDisplayTitle(language:Language,source:string):string{
 const parts=source.split(' — ');
 if(parts.length!==2||!journalAchievementBases.has(parts[0])||!journalAchievementTiers.has(parts[1]))return source;
 return recentScreenText(language,parts[0])+' — '+recentScreenText(language,parts[1]);
}
