import type {Language} from './languages';
import {accountText} from './account';

/** Source-exact copy for the non-destructive account-erasure support panel.
 * The request/approval flow is gated separately until every string is authored. */
const publicCopy:Record<string,Partial<Record<Language,string>>>={
 'Online account deletion':{
  de:'Online-Konto löschen',es:'Eliminar cuenta en línea',nl:'Onlineaccount verwijderen',
  it:'Elimina account online',fr:'Supprimer le compte en ligne',ru:'Удаление онлайн-аккаунта',tr:'Çevrimiçi hesabı silme',
 },
 'This is different from deleting a character or removing a local save.':{
  de:'Das ist nicht dasselbe wie das Löschen eines Charakters oder eines lokalen Spielstands.',
  es:'No es lo mismo que eliminar un personaje o una partida guardada en el dispositivo.',
  nl:'Dit is iets anders dan een personage of een lokale opslag verwijderen.',
  it:'È diverso dall’eliminare un personaggio o un salvataggio locale.',
  fr:'Ce n’est pas la même chose que supprimer un personnage ou une sauvegarde locale.',
  ru:'Это не то же самое, что удалить персонажа или локальное сохранение.',
  tr:'Bu, bir karakteri veya yerel kayıt dosyasını silmekten farklıdır.',
 },
 'Deleting your online account can permanently remove all characters, inventory, guild participation and account-wide rewards.':{
  de:'Durch das Löschen deines Online-Kontos können alle Charaktere, Gegenstände, Gildenmitgliedschaften und kontoweiten Belohnungen dauerhaft verloren gehen.',
  es:'Eliminar la cuenta en línea puede borrar permanentemente todos tus personajes, objetos, participación en gremios y recompensas de cuenta.',
  nl:'Als je je onlineaccount verwijdert, kunnen al je personages, voorwerpen, gildedeelname en accountbrede beloningen definitief verdwijnen.',
  it:'Eliminare l’account online può cancellare per sempre personaggi, inventario, partecipazione alle gilde e ricompense dell’account.',
  fr:'La suppression du compte en ligne peut effacer définitivement les personnages, les objets, la participation aux guildes et les récompenses du compte.',
  ru:'Удаление онлайн-аккаунта может навсегда удалить всех персонажей, инвентарь, участие в гильдиях и награды аккаунта.',
  tr:'Çevrimiçi hesabı silmek, tüm karakterlerini, envanterini, lonca katılımını ve hesap genelindeki ödüllerini kalıcı olarak kaldırabilir.',
 },
 'Purchases and transaction records may require separate handling under the Privacy Policy. Your Google Play subscription is managed through Google Play.':{
  de:'Käufe und Transaktionsdaten können gemäß Datenschutzrichtlinie gesondert behandelt werden. Dein Google-Play-Abo verwaltest du über Google Play.',
  es:'Las compras y transacciones pueden requerir un tratamiento aparte según la Política de privacidad. Gestiona tu suscripción de Google Play desde Google Play.',
  nl:'Aankopen en transactiegegevens kunnen volgens het privacybeleid apart worden verwerkt. Je Google Play-abonnement beheer je via Google Play.',
  it:'Acquisti e transazioni potrebbero richiedere una gestione separata secondo l’Informativa sulla privacy. Gestisci l’abbonamento tramite Google Play.',
  fr:'Les achats et transactions peuvent être traités séparément selon la politique de confidentialité. Gérez votre abonnement depuis Google Play.',
  ru:'Покупки и записи транзакций могут обрабатываться отдельно согласно Политике конфиденциальности. Подписка управляется через Google Play.',
  tr:'Satın alımlar ve işlem kayıtları Gizlilik Politikası kapsamında ayrıca ele alınabilir. Google Play aboneliğini Google Play üzerinden yönetebilirsin.',
 },
 'Self-service deletion requests are not yet enabled. Use the Privacy Policy contact information to request full-account deletion. This screen does not delete any data.':{
  de:'Die selbstständige Kontolöschung ist noch nicht verfügbar. Nutze die Kontaktdaten in der Datenschutzrichtlinie, um die vollständige Löschung anzufragen. Dieser Bildschirm löscht keine Daten.',
  es:'Las solicitudes de eliminación desde el juego aún no están disponibles. Usa los datos de contacto de la Política de privacidad para solicitar la eliminación completa. Esta pantalla no borra datos.',
  nl:'Zelf een verwijderverzoek indienen is nog niet beschikbaar. Gebruik de contactgegevens in het privacybeleid om volledige accountverwijdering aan te vragen. Dit scherm verwijdert geen gegevens.',
  it:'Le richieste di eliminazione autonome non sono ancora disponibili. Usa i contatti nell’Informativa sulla privacy per richiedere la cancellazione completa. Questa schermata non elimina dati.',
  fr:'Les demandes de suppression en libre-service ne sont pas encore disponibles. Utilisez les coordonnées de la politique de confidentialité pour demander la suppression complète. Cet écran ne supprime aucune donnée.',
  ru:'Самостоятельная отправка запроса на удаление пока недоступна. Для полного удаления аккаунта воспользуйтесь контактами в Политике конфиденциальности. Этот экран не удаляет данные.',
  tr:'Oyun içinden silme talebi henüz etkin değil. Hesabının tamamen silinmesini istemek için Gizlilik Politikası iletişim bilgilerini kullan. Bu ekran hiçbir veriyi silmez.',
 },
 'Privacy & deletion support':{
  de:'Datenschutz und Löschanfrage',es:'Privacidad y ayuda para eliminar la cuenta',nl:'Privacy en hulp bij verwijderen',
  it:'Privacy e assistenza per l’eliminazione',fr:'Confidentialité et aide à la suppression',
  ru:'Конфиденциальность и помощь с удалением',tr:'Gizlilik ve hesap silme desteği',
 },
};

const requestCopy:Record<string,Partial<Record<Language,string>>>={
  "Sign in to a linked account first. Guest accounts require separate identity verification through support.": {
    "de": "Melde dich zuerst mit einem verknüpften Konto an. Gastkonten müssen über den Support separat bestätigt werden.",
    "es": "Primero inicia sesión con una cuenta vinculada. Las cuentas de invitado necesitan una verificación de identidad a través de soporte.",
    "nl": "Meld je eerst aan met een gekoppeld account. Voor gastaccounts is aparte identiteitscontrole via support nodig.",
    "it": "Accedi prima con un account collegato. Gli account ospite richiedono una verifica dell'identità separata tramite assistenza.",
    "fr": "Connectez-vous d'abord à un compte lié. Les comptes invités nécessitent une vérification d'identité par l'assistance.",
    "ru": "Сначала войдите в привязанный аккаунт. Гостевые аккаунты требуют отдельной проверки личности через поддержку.",
    "tr": "Önce bağlı hesabınla giriş yap. Misafir hesaplar için destek üzerinden ayrı kimlik doğrulaması gerekir."
  },
  "Submitting a request does not delete your account immediately. Your account remains usable until an authorized review completes.": {
    "de": "Eine Anfrage löscht dein Konto nicht sofort. Bis zum Abschluss der autorisierten Prüfung kannst du es weiter nutzen.",
    "es": "Enviar una solicitud no elimina tu cuenta de inmediato. Podrás seguir usándola hasta que termine la revisión autorizada.",
    "nl": "Een verzoek verwijdert je account niet meteen. Je kunt het blijven gebruiken totdat de bevoegde beoordeling is afgerond.",
    "it": "Inviare una richiesta non elimina subito l'account. Puoi continuare a usarlo fino al termine della verifica autorizzata.",
    "fr": "Envoyer une demande ne supprime pas immédiatement votre compte. Il reste utilisable jusqu'à la fin de l'examen autorisé.",
    "ru": "Отправка запроса не удаляет аккаунт сразу. Им можно пользоваться до завершения проверки уполномоченным сотрудником.",
    "tr": "Talep göndermek hesabını hemen silmez. Yetkili inceleme tamamlanana kadar hesabını kullanabilirsin."
  },
  "Signed-in VELDRYN account": {
    "de": "Angemeldetes VELDRYN-Konto",
    "es": "Cuenta de VELDRYN activa",
    "nl": "Aangemeld VELDRYN-account",
    "it": "Account VELDRYN connesso",
    "fr": "Compte VELDRYN connecté",
    "ru": "Текущий аккаунт VELDRYN",
    "tr": "Oturum açılan VELDRYN hesabı"
  },
  "Linked account": {
    "de": "Verknüpftes Konto",
    "es": "Cuenta vinculada",
    "nl": "Gekoppeld account",
    "it": "Account collegato",
    "fr": "Compte lié",
    "ru": "Привязанный аккаунт",
    "tr": "Bağlı hesap"
  },
  "Refresh request status": {
    "de": "Anfragestatus aktualisieren",
    "es": "Actualizar estado de la solicitud",
    "nl": "Verzoekstatus vernieuwen",
    "it": "Aggiorna stato richiesta",
    "fr": "Actualiser le statut de la demande",
    "ru": "Обновить статус запроса",
    "tr": "Talep durumunu yenile"
  },
  "Requested on": {
    "de": "Angefragt am",
    "es": "Solicitado el",
    "nl": "Aangevraagd op",
    "it": "Richiesto il",
    "fr": "Demande envoyée le",
    "ru": "Дата запроса",
    "tr": "Talep tarihi"
  },
  "Do not delete your character or local save to try to complete this request.": {
    "de": "Lösche weder deinen Charakter noch deinen lokalen Spielstand, um diese Anfrage abzuschließen.",
    "es": "No elimines tu personaje ni tu partida local para intentar completar esta solicitud.",
    "nl": "Verwijder je personage of lokale opslag niet om dit verzoek af te ronden.",
    "it": "Non eliminare il personaggio o il salvataggio locale per completare questa richiesta.",
    "fr": "Ne supprimez ni votre personnage ni votre sauvegarde locale pour finaliser cette demande.",
    "ru": "Не удаляйте персонажа или локальное сохранение ради выполнения этого запроса.",
    "tr": "Bu talebi tamamlamak için karakterini veya yerel kaydını silme."
  },
  "Withdraw deletion request": {
    "de": "Löschanfrage zurückziehen",
    "es": "Retirar solicitud de eliminación",
    "nl": "Verwijderverzoek intrekken",
    "it": "Ritira richiesta di eliminazione",
    "fr": "Retirer la demande de suppression",
    "ru": "Отозвать запрос на удаление",
    "tr": "Silme talebini geri çek"
  },
  "To request deletion, type DELETE ACCOUNT exactly.": {
    "de": "Gib zum Beantragen der Löschung exakt DELETE ACCOUNT ein.",
    "es": "Para solicitar la eliminación, escribe exactamente DELETE ACCOUNT.",
    "nl": "Typ precies DELETE ACCOUNT om verwijdering aan te vragen.",
    "it": "Per richiedere l'eliminazione, digita esattamente DELETE ACCOUNT.",
    "fr": "Pour demander la suppression, saisissez exactement DELETE ACCOUNT.",
    "ru": "Чтобы запросить удаление, введите точно DELETE ACCOUNT.",
    "tr": "Silme talebinde bulunmak için tam olarak DELETE ACCOUNT yaz."
  },
  "Type DELETE ACCOUNT to request online account deletion": {
    "de": "DELETE ACCOUNT eingeben, um die Löschung des Online-Kontos anzufragen",
    "es": "Escribe DELETE ACCOUNT para solicitar la eliminación de la cuenta en línea",
    "nl": "Typ DELETE ACCOUNT om verwijdering van je onlineaccount aan te vragen",
    "it": "Digita DELETE ACCOUNT per richiedere l'eliminazione dell'account online",
    "fr": "Saisissez DELETE ACCOUNT pour demander la suppression du compte en ligne",
    "ru": "Введите DELETE ACCOUNT, чтобы запросить удаление онлайн-аккаунта",
    "tr": "Çevrimiçi hesap silme talebi için DELETE ACCOUNT yaz"
  },
  "Request online account deletion": {
    "de": "Online-Kontolöschung anfragen",
    "es": "Solicitar eliminación de la cuenta",
    "nl": "Verwijdering onlineaccount aanvragen",
    "it": "Richiedi eliminazione account online",
    "fr": "Demander la suppression du compte",
    "ru": "Запросить удаление аккаунта",
    "tr": "Çevrimiçi hesap silme talebi"
  },
  "Checking your deletion request status…": {
    "de": "Löschanfragestatus wird geprüft…",
    "es": "Comprobando el estado de la solicitud…",
    "nl": "Status van verwijderverzoek controleren…",
    "it": "Verifica dello stato della richiesta…",
    "fr": "Vérification de votre demande…",
    "ru": "Проверяем статус запроса…",
    "tr": "Silme talebinin durumu kontrol ediliyor…"
  },
  "We could not verify the latest request status. Refresh before submitting anything.": {
    "de": "Der aktuelle Anfragestatus konnte nicht geprüft werden. Bitte aktualisiere ihn, bevor du etwas absendest.",
    "es": "No pudimos verificar el estado actual. Actualízalo antes de enviar otra solicitud.",
    "nl": "We konden de actuele verzoekstatus niet controleren. Vernieuw de status voordat je iets indient.",
    "it": "Impossibile verificare lo stato attuale. Aggiornalo prima di inviare un'altra richiesta.",
    "fr": "Impossible de vérifier l'état actuel. Actualisez-le avant d'envoyer une demande.",
    "ru": "Не удалось проверить текущий статус. Обновите его перед отправкой запроса.",
    "tr": "Güncel talep durumu doğrulanamadı. Yeni bir işlem yapmadan önce durumu yenile."
  },
  "Deletion request received": {
    "de": "Löschanfrage eingegangen",
    "es": "Solicitud de eliminación recibida",
    "nl": "Verwijderverzoek ontvangen",
    "it": "Richiesta di eliminazione ricevuta",
    "fr": "Demande de suppression reçue",
    "ru": "Запрос на удаление получен",
    "tr": "Silme talebi alındı"
  },
  "Deletion request under review": {
    "de": "Löschanfrage wird geprüft",
    "es": "Solicitud de eliminación en revisión",
    "nl": "Verwijderverzoek wordt beoordeeld",
    "it": "Richiesta di eliminazione in revisione",
    "fr": "Demande de suppression en cours d'examen",
    "ru": "Запрос на удаление рассматривается",
    "tr": "Silme talebi inceleniyor"
  },
  "Deletion request needs support review": {
    "de": "Löschanfrage erfordert Supportprüfung",
    "es": "La solicitud requiere revisión de soporte",
    "nl": "Verwijderverzoek moet door support worden beoordeeld",
    "it": "La richiesta richiede la revisione dell'assistenza",
    "fr": "La demande nécessite un examen par l'assistance",
    "ru": "Запрос требует проверки службы поддержки",
    "tr": "Silme talebi destek incelemesi gerektiriyor"
  }
};

export function accountDeletionText(language:Language,key:string){
 return requestCopy[key]?.[language]??publicCopy[key]?.[language]??accountText(language,key);
}
