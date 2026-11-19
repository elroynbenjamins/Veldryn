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

export function accountDeletionText(language:Language,key:string){
 return publicCopy[key]?.[language]??accountText(language,key);
}
