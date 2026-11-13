import type {Language} from './languages';
import {SUPPORTED_LANGUAGES} from './languages';
import {createTranslator,type TranslationParams} from './translator';
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
} as const satisfies Record<string,readonly [string,string,string,string,string,string,string]>;

export type RecentScreenKey=keyof typeof recentScreenTranslationRows;
const catalogs=Object.fromEntries(SUPPORTED_LANGUAGES.map((language,index)=>[
 language,Object.fromEntries(Object.entries(recentScreenTranslationRows).map(([source,translations])=>[source,index===0?source:translations[index-1]])),
])) as Record<Language,Record<RecentScreenKey,string>>;
const t=createTranslator<RecentScreenKey>(catalogs);

/** Prefer reviewed new screen copy, then the established account dictionary. */
export function recentScreenText(language:Language,source:string,params:TranslationParams={}):string{
 return Object.prototype.hasOwnProperty.call(recentScreenTranslationRows,source)
  ?t(language,source as RecentScreenKey,params)
  :accountText(language,source,params);
}
