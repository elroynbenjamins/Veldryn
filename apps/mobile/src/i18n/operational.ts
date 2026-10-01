import {Language} from './languages';

const en={
  'save.recoveryKicker':'SAVE RECOVERY','save.recoveryTitle':'VELDRYN could not open the local save','save.recoveryBody':'The existing data has not been deleted. Retry first if device storage was temporarily unavailable.','save.retry':'Retry loading','save.startFresh':'Start fresh…',
  'craft.complete':'Craft complete','craft.setComplete':'Novice set complete!','craft.cannot':'Cannot craft','craft.screen':'Skills & Crafting','craft.gathering':'Gathering','craft.crafting':'Crafting','craft.novice':'Novice set','craft.path':'Crafting path',
  'combat.victory':'Victory','combat.notReady':'Not ready','combat.live':'LIVE ENCOUNTER','combat.damage':'damage',
  'overflow.title':'Overflow Chest','overflow.body':'Normal storage was full. Free Bank space to recover these items.','overflow.move':'Move {count} items to Bank','overflow.remain':'{count} items would remain; make more Bank space.',
  'chat.world':'World chat','chat.closed':'Chat is closed to save service costs.','chat.open':'Open World chat','chat.tap':'Tap a player name to view their profile.','chat.placeholder':'Message this world…','chat.send':'Send','chat.close':'Close chat','chat.guild':'Guild chat','chat.preview':'Local preview · realtime chat will connect with online services.','chat.none':'No messages yet.','chat.refresh':'Refresh',
} as const;
export type OperationalKey=keyof typeof en;
type OperationalCatalog=Record<OperationalKey,string>;

const catalogs:Record<Language,OperationalCatalog>={en,
  de:{
    'save.recoveryKicker':'SPIELSTAND RETTEN','save.recoveryTitle':'VELDRYN konnte den lokalen Spielstand nicht öffnen','save.recoveryBody':'Die vorhandenen Daten wurden nicht gelöscht. Versuche zuerst erneut zu laden, falls der Gerätespeicher vorübergehend nicht verfügbar war.','save.retry':'Erneut laden','save.startFresh':'Neu beginnen…',
    'craft.complete':'Herstellung abgeschlossen','craft.setComplete':'Anfängerset vollständig!','craft.cannot':'Herstellung nicht möglich','craft.screen':'Fertigkeiten & Herstellung','craft.gathering':'Sammeln','craft.crafting':'Herstellung','craft.novice':'Anfängerset','craft.path':'Herstellungsweg','combat.victory':'Sieg','combat.notReady':'Noch nicht bereit','combat.live':'LAUFENDER KAMPF','combat.damage':'Schaden',
    'overflow.title':'Überlauftruhe','overflow.body':'Der normale Speicher war voll. Schaffe Platz in der Bank, um diese Gegenstände zu retten.','overflow.move':'{count} Gegenstände zur Bank verschieben','overflow.remain':'{count} Gegenstände würden verbleiben; schaffe mehr Platz in der Bank.',
    'chat.world':'Weltchat','chat.closed':'Der Chat ist geschlossen, um Dienstkosten zu sparen.','chat.open':'Weltchat öffnen','chat.tap':'Tippe auf einen Spielernamen, um das Profil anzusehen.','chat.placeholder':'Nachricht an diese Welt…','chat.send':'Senden','chat.close':'Chat schließen','chat.guild':'Gildenchat','chat.preview':'Lokale Vorschau · Echtzeit-Chat wird mit den Online-Diensten verbunden.','chat.none':'Noch keine Nachrichten.','chat.refresh':'Aktualisieren',
  },
  es:{
    'save.recoveryKicker':'RECUPERACIÓN DE PARTIDA','save.recoveryTitle':'VELDRYN no pudo abrir la partida local','save.recoveryBody':'Los datos existentes no se han eliminado. Intenta cargar de nuevo por si el almacenamiento no estaba disponible temporalmente.','save.retry':'Reintentar carga','save.startFresh':'Empezar de nuevo…',
    'craft.complete':'Fabricación completada','craft.setComplete':'¡Conjunto de principiante completo!','craft.cannot':'No se puede fabricar','craft.screen':'Habilidades y fabricación','craft.gathering':'Recolección','craft.crafting':'Fabricación','craft.novice':'Conjunto de principiante','craft.path':'Ruta de fabricación','combat.victory':'Victoria','combat.notReady':'Aún no está listo','combat.live':'COMBATE EN CURSO','combat.damage':'de daño',
    'overflow.title':'Cofre de excedentes','overflow.body':'El almacenamiento normal estaba lleno. Libera espacio en el Banco para recuperar estos objetos.','overflow.move':'Mover {count} objetos al Banco','overflow.remain':'Quedarían {count} objetos; libera más espacio en el Banco.',
    'chat.world':'Chat mundial','chat.closed':'El chat está cerrado para ahorrar costes del servicio.','chat.open':'Abrir chat mundial','chat.tap':'Toca el nombre de un jugador para ver su perfil.','chat.placeholder':'Mensaje para este mundo…','chat.send':'Enviar','chat.close':'Cerrar chat','chat.guild':'Chat del gremio','chat.preview':'Vista previa local · el chat en tiempo real se conectará a los servicios en línea.','chat.none':'Todavía no hay mensajes.','chat.refresh':'Actualizar',
  },
  nl:{
    'save.recoveryKicker':'OPSLAGHERSTEL','save.recoveryTitle':'VELDRYN kon de lokale opslag niet openen','save.recoveryBody':'De bestaande gegevens zijn niet verwijderd. Probeer eerst opnieuw te laden als de apparaatopslag tijdelijk niet beschikbaar was.','save.retry':'Opnieuw laden','save.startFresh':'Opnieuw beginnen…',
    'craft.complete':'Maken voltooid','craft.setComplete':'Beginnersset voltooid!','craft.cannot':'Kan niet maken','craft.screen':'Vaardigheden en maken','craft.gathering':'Verzamelen','craft.crafting':'Maken','craft.novice':'Beginnersset','craft.path':'Maaktraject','combat.victory':'Overwinning','combat.notReady':'Nog niet klaar','combat.live':'LOPEND GEVECHT','combat.damage':'schade',
    'overflow.title':'Overloopkist','overflow.body':'De normale opslag was vol. Maak ruimte vrij in de Bank om deze voorwerpen te herstellen.','overflow.move':'{count} voorwerpen naar Bank verplaatsen','overflow.remain':'Er blijven {count} voorwerpen over; maak meer ruimte in de Bank.',
    'chat.world':'Wereldchat','chat.closed':'Chat is gesloten om servicekosten te besparen.','chat.open':'Wereldchat openen','chat.tap':'Tik op een spelersnaam om het profiel te bekijken.','chat.placeholder':'Bericht aan deze wereld…','chat.send':'Versturen','chat.close':'Chat sluiten','chat.guild':'Gildechat','chat.preview':'Lokale preview · realtimechat wordt later met online diensten verbonden.','chat.none':'Nog geen berichten.','chat.refresh':'Vernieuwen',
  },
  it:{
    'save.recoveryKicker':'RECUPERO SALVATAGGIO','save.recoveryTitle':'VELDRYN non ha potuto aprire il salvataggio locale','save.recoveryBody':'I dati esistenti non sono stati eliminati. Riprova prima, nel caso la memoria del dispositivo fosse temporaneamente non disponibile.','save.retry':'Riprova caricamento','save.startFresh':'Ricomincia…',
    'craft.complete':'Creazione completata','craft.setComplete':'Set da principiante completo!','craft.cannot':'Impossibile creare','craft.screen':'Abilità e creazione','craft.gathering':'Raccolta','craft.crafting':'Creazione','craft.novice':'Set da principiante','craft.path':'Percorso di creazione','combat.victory':'Vittoria','combat.notReady':'Non ancora pronto','combat.live':'SCONTRO IN CORSO','combat.damage':'danni',
    'overflow.title':'Forziere eccedenze','overflow.body':'Lo spazio normale era pieno. Libera spazio in Banca per recuperare questi oggetti.','overflow.move':'Sposta {count} oggetti in Banca','overflow.remain':'Rimarrebbero {count} oggetti; libera altro spazio in Banca.',
    'chat.world':'Chat mondiale','chat.closed':'La chat è chiusa per ridurre i costi del servizio.','chat.open':'Apri chat mondiale','chat.tap':'Tocca il nome di un giocatore per visualizzarne il profilo.','chat.placeholder':'Messaggio a questo mondo…','chat.send':'Invia','chat.close':'Chiudi chat','chat.guild':'Chat della gilda','chat.preview':'Anteprima locale · la chat in tempo reale verrà collegata ai servizi online.','chat.none':'Nessun messaggio.','chat.refresh':'Aggiorna',
  },
  fr:{
    'save.recoveryKicker':'RÉCUPÉRATION DE SAUVEGARDE','save.recoveryTitle':'VELDRYN n’a pas pu ouvrir la sauvegarde locale','save.recoveryBody':'Les données existantes n’ont pas été supprimées. Réessayez d’abord, au cas où le stockage était temporairement indisponible.','save.retry':'Réessayer le chargement','save.startFresh':'Recommencer…',
    'craft.complete':'Fabrication terminée','craft.setComplete':'Ensemble novice terminé !','craft.cannot':'Fabrication impossible','craft.screen':'Compétences et fabrication','craft.gathering':'Récolte','craft.crafting':'Fabrication','craft.novice':'Ensemble novice','craft.path':'Parcours de fabrication','combat.victory':'Victoire','combat.notReady':'Pas encore prêt','combat.live':'COMBAT EN COURS','combat.damage':'dégâts',
    'overflow.title':'Coffre de surplus','overflow.body':'Le stockage normal était plein. Libérez de la place dans la Banque pour récupérer ces objets.','overflow.move':'Déplacer {count} objets vers la Banque','overflow.remain':'{count} objets resteraient ; libérez plus de place dans la Banque.',
    'chat.world':'Chat mondial','chat.closed':'Le chat est fermé afin de réduire les coûts du service.','chat.open':'Ouvrir le chat mondial','chat.tap':'Touchez le nom d’un joueur pour afficher son profil.','chat.placeholder':'Message à ce monde…','chat.send':'Envoyer','chat.close':'Fermer le chat','chat.guild':'Chat de guilde','chat.preview':'Aperçu local · le chat en temps réel sera connecté aux services en ligne.','chat.none':'Aucun message pour le moment.','chat.refresh':'Actualiser',
  },
};

export function ot(language:Language,key:OperationalKey,values:Record<string,string|number>={}):string{
  return catalogs[language][key].replace(/\{(\w+)\}/g,(_match,name)=>String(values[name]??`{${name}}`));
}

export const OPERATIONAL_MESSAGE_COUNT=Object.keys(en).length;
