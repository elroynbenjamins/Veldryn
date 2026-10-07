import {useMemo} from 'react';
import type {Language} from './languages';
import {SUPPORTED_LANGUAGES} from './languages';
import {useGameLanguage} from './GameLanguageProvider';
import {createTranslator,type TranslationParams} from './translator';

// Columns are German, Spanish, Dutch, Italian and French; keys are the English catalog.
export const socialTranslationRows = {
"PARTY FORMATION":["GRUPPENFORMATION","FORMACIÓN DEL GRUPO","GROEPSFORMATIE","FORMAZIONE DEL GRUPPO","FORMATION DU GROUPE"],
"{count} companion assists":["{count} Begleiterhilfen","{count} ayudas de compañeros","{count} metgezelondersteuningen","{count} aiuti dei compagni","{count} aides de compagnons"],
"Combat replay speed {speed} times":["Kampfwiederholung mit {speed}-facher Geschwindigkeit","Velocidad de repetición del combate: {speed} veces","Snelheid gevechtsherhaling: {speed} keer","Velocità della riproduzione del combattimento: {speed} volte","Vitesse de lecture du combat : {speed} fois"],
"Encounter totals":["Gesamtwerte des Kampfes","Totales del combate","Gevechtstotalen","Totali dello scontro","Totaux du combat"],
"No event details were saved for this encounter.":["Für diesen Kampf wurden keine Ereignisdetails gespeichert.","No se guardaron detalles de eventos para este combate.","Voor dit gevecht zijn geen gebeurtenisdetails opgeslagen.","Non sono stati salvati dettagli degli eventi per questo scontro.","Aucun détail des événements n’a été enregistré pour ce combat."],
"Tank":["Tank","Tanque","Tank","Tank","Tank"],
"Damage":["Schaden","Daño","Schade","Danni","Dégâts"],
"Support":["Unterstützung","Apoyo","Ondersteuning","Supporto","Soutien"],
"Expeditions":["Expeditionen","Expediciones","Expedities","Spedizioni","Expéditions"],
"Live expedition":["Live-Expedition","Expedición en vivo","Live-expeditie","Spedizione live","Expédition en direct"],
"Auto Tier up to":["Automatische Stufe bis","Nivel automático hasta","Automatische rang tot","Livello automatico fino a","Palier automatique jusqu’à"],
"Tier":["Stufe","Nivel","Rang","Livello","Palier"],
"Live party":["Live-Gruppe","Grupo en vivo","Live-groep","Gruppo live","Groupe en direct"],
"Your party awaits":["Deine Gruppe wartet","Tu grupo te espera","Je groep wacht","Il tuo gruppo ti aspetta","Votre groupe vous attend"],
"Gathering your party":["Gruppe wird gesucht","Reuniendo tu grupo","Je groep samenstellen","Formazione del gruppo","Formation de votre groupe"],
"Finding a replacement":["Ersatz wird gesucht","Buscando un reemplazo","Een vervanger zoeken","Ricerca di un sostituto","Recherche d’un remplaçant"],
"Your party is ready":["Deine Gruppe ist bereit","Tu grupo está listo","Je groep is klaar","Il tuo gruppo è pronto","Votre groupe est prêt"],
"Restoring your party":["Gruppe wird wiederhergestellt","Restaurando tu grupo","Je groep herstellen","Ripristino del gruppo","Restauration de votre groupe"],
"to confirm":["zum Bestätigen","para confirmar","om te bevestigen","per confermare","pour confirmer"],
"remaining":["übrig","restantes","resterend","rimanenti","restantes"],
"Confirm your place before time runs out.":["Bestätige deinen Platz vor Ablauf der Zeit.","Confirma tu plaza antes de que termine el tiempo.","Bevestig je plek voordat de tijd om is.","Conferma il tuo posto prima che scada il tempo.","Confirmez votre place avant la fin du temps imparti."],
"Accepted players keep their place.":["Bestätigte Spieler behalten ihren Platz.","Los jugadores que aceptaron conservan su plaza.","Spelers die accepteerden behouden hun plek.","Chi ha accettato mantiene il proprio posto.","Les joueurs ayant accepté gardent leur place."],
"Everyone accepted. Preparing your dungeon…":["Alle haben bestätigt. Dungeon wird vorbereitet…","Todos aceptaron. Preparando la mazmorra…","Iedereen heeft geaccepteerd. Je kerker voorbereiden…","Tutti hanno accettato. Preparazione della spedizione…","Tout le monde a accepté. Préparation du donjon…"],
"Return to expeditions to start a new search.":["Kehre zu den Expeditionen zurück, um erneut zu suchen.","Vuelve a expediciones para iniciar otra búsqueda.","Ga terug naar expedities om opnieuw te zoeken.","Torna alle spedizioni per iniziare una nuova ricerca.","Retournez aux expéditions pour lancer une nouvelle recherche."],
"1 Tank · 2 Damage · 1 Support":["1 Tank · 2 Schaden · 1 Unterstützung","1 Tanque · 2 Daño · 1 Apoyo","1 Tank · 2 Schade · 1 Ondersteuning","1 Tank · 2 Danni · 1 Supporto","1 Tank · 2 Dégâts · 1 Soutien"],
"Your last action is saved. Retry to continue.":["Deine letzte Aktion ist gespeichert. Versuche es erneut.","Tu última acción está guardada. Reintenta para continuar.","Je laatste actie is opgeslagen. Probeer opnieuw.","La tua ultima azione è salvata. Riprova per continuare.","Votre dernière action est enregistrée. Réessayez pour continuer."],
"Queued":["In Warteschlange","En cola","In wachtrij","In coda","En file"],
"Your response needed":["Deine Bestätigung fehlt","Falta tu respuesta","Jouw reactie nodig","Serve la tua risposta","Votre réponse est requise"],
"Searching…":["Suche läuft…","Buscando…","Zoeken…","Ricerca…","Recherche…"],
"Match found. Preparing your party…":["Gruppe gefunden. Wird vorbereitet…","Grupo encontrado. Preparando…","Groep gevonden. Voorbereiden…","Gruppo trovato. Preparazione…","Groupe trouvé. Préparation…"],
"No active search. Choose a dungeon to find a party.":["Keine aktive Suche. Wähle einen Dungeon.","No hay búsqueda activa. Elige una mazmorra.","Geen actieve zoekopdracht. Kies een kerker.","Nessuna ricerca attiva. Scegli una spedizione.","Aucune recherche active. Choisissez un donjon."],
"Waiting for party update…":["Warte auf Gruppenstatus…","Esperando actualización del grupo…","Wachten op groepsupdate…","In attesa di aggiornamenti…","En attente du groupe…"],
"Keep this screen open while searching.":["Lass diesen Bildschirm während der Suche geöffnet.","Mantén esta pantalla abierta durante la búsqueda.","Houd dit scherm open tijdens het zoeken.","Tieni aperta questa schermata durante la ricerca.","Gardez cet écran ouvert pendant la recherche."],
"Preparing your dungeon…":["Dungeon wird vorbereitet…","Preparando la mazmorra…","Je kerker voorbereiden…","Preparazione della spedizione…","Préparation du donjon…"],
"Keep this screen open while we refill your party.":["Lass diesen Bildschirm offen, während wir Ersatz suchen.","Mantén esta pantalla abierta mientras completamos tu grupo.","Houd dit scherm open terwijl we je groep aanvullen.","Tieni aperta questa schermata mentre completiamo il gruppo.","Gardez cet écran ouvert pendant que nous complétons le groupe."],
"Connecting your party…":["Gruppe wird verbunden…","Conectando tu grupo…","Je groep verbinden…","Connessione del gruppo…","Connexion de votre groupe…"],
"Dismiss matches":["Treffer ausblenden","Descartar coincidencias","Matches verbergen","Ignora corrispondenze","Masquer les correspondances"],
"MATCHES FOUND":["PASSENDE GRUPPEN","COINCIDENCIAS ENCONTRADAS","MATCHES GEVONDEN","CORRISPONDENZE TROVATE","CORRESPONDANCES TROUVÉES"],
"Alert me about matches":["Über passende Gruppen informieren","Avisarme de coincidencias","Meld passende groepen","Avvisami delle corrispondenze","M’avertir des correspondances"],
"Stop match alerts":["Match-Hinweise stoppen","Desactivar avisos de coincidencias","Matchmeldingen stoppen","Disattiva avvisi di corrispondenza","Désactiver les alertes de correspondance"],
"Event currency":["Eventwährung","Moneda del evento","Evenementvaluta","Valuta evento","Monnaie d’événement"],
"Candy":["Süßigkeit","Caramelo","Snoep","Caramella","Bonbon"],
"Skill":["Fertigkeit","Habilidad","Vaardigheid","Abilità","Compétence"],
"Battle":["Kampf","Batalla","Strijd","Battaglia","Combat"],
"Bond":["Bindung","Vínculo","Band","Legame","Lien"],
"Today's allowance":["Heutiges Limit","Límite de hoy","Limiet van vandaag","Limite di oggi","Limite du jour"],
"Combat earns 200 contribution per minute, up to {daily} per UTC day. Contribute 1,000 to qualify for rewards.":["Kämpfe gewähren 200 Beitrag pro Minute, bis zu {daily} pro UTC-Tag. Erreiche 1.000 für Belohnungen.","El combate otorga 200 de contribución por minuto, hasta {daily} por día UTC. Aporta 1.000 para obtener recompensas.","Gevechten leveren 200 bijdrage per minuut op, tot {daily} per UTC-dag. Draag 1.000 bij voor beloningen.","Il combattimento dà 200 contributi al minuto, fino a {daily} al giorno UTC. Raggiungi 1.000 per le ricompense.","Le combat rapporte 200 contributions par minute, jusqu’à {daily} par jour UTC. Atteignez 1 000 pour les récompenses."],
"Encounter allowance remaining: {amount}":["Verbleibendes Begegnungslimit: {amount}","Límite restante del encuentro: {amount}","Resterende ontmoetingslimiet: {amount}","Limite restante dello scontro: {amount}","Limite restante du combat : {amount}"],
"Difficulty: {count}-member bracket":["Schwierigkeit: Gruppe für {count} Mitglieder","Dificultad: grupo de {count} miembros","Moeilijkheid: groep van {count} leden","Difficoltà: fascia di {count} membri","Difficulté : tranche de {count} membres"],
"Offline combat counts on the day it happened. Collect before the claim deadline.":["Offline-Kämpfe zählen für den Tag, an dem sie stattfanden. Hole sie vor der Abholfrist ab.","El combate sin conexión cuenta para el día en que ocurrió. Recógelo antes del plazo.","Offline gevechten tellen voor de dag waarop ze plaatsvonden. Haal ze vóór de claimdeadline op.","Il combattimento offline conta per il giorno in cui è avvenuto. Riscuoti entro la scadenza.","Le combat hors ligne compte pour le jour où il a eu lieu. Récupérez-le avant la date limite."],
"This encounter has a fixed roster. New members join the next encounter.":["Diese Begegnung hat eine feste Mitgliederliste. Neue Mitglieder nehmen an der nächsten teil.","Este encuentro tiene una plantilla fija. Los nuevos miembros participan en el siguiente.","Deze ontmoeting heeft een vaste deelnemerslijst. Nieuwe leden doen mee aan de volgende.","Questo scontro ha una rosa fissa. I nuovi membri partecipano al prossimo.","Ce combat a un effectif fixe. Les nouveaux membres participent au prochain."],
"Boss defeated! You can still contribute before the battle deadline to qualify for rewards.":["Boss besiegt! Du kannst bis zur Kampffrist weiter beitragen, um Belohnungen zu erhalten.","¡Jefe derrotado! Aún puedes contribuir antes del fin del combate para obtener recompensas.","Baas verslagen! Je kunt vóór de gevechtsdeadline nog bijdragen om beloningen te verdienen.","Boss sconfitto! Puoi ancora contribuire prima della fine dello scontro per ottenere ricompense.","Boss vaincu ! Vous pouvez encore contribuer avant la fin du combat pour obtenir des récompenses."],
  "Contributors": ["Mitwirkende","Colaboradores","Bijdragers","Partecipanti","Participants"],
  "WEEKLY & EVENT BOSSES": ["WOCHEN- UND EVENTBOSSE","JEFES SEMANALES Y DE EVENTO","WEKELIJKSE EN EVENEMENTBAZEN","BOSS SETTIMANALI ED EVENTO","BOSS HEBDOMADAIRES ET ÉVÉNEMENTIELS"],
  "Fight together through everyday combat.": ["Kämpft durch tägliche Kämpfe gemeinsam.","Luchad juntos con los combates diarios.","Vecht samen via dagelijkse gevechten.","Combattete insieme attraverso gli scontri quotidiani.","Combattez ensemble grâce aux combats quotidiens."],
  "Guild PvE is unavailable. Please try again.": ["Gilden-PvE ist nicht verfügbar. Bitte erneut versuchen.","El JcE del gremio no está disponible. Inténtalo de nuevo.","Gilde-PvE is niet beschikbaar. Probeer opnieuw.","Il PvE di gilda non è disponibile. Riprova.","Le JcE de guilde est indisponible. Réessayez."],
  "Unable to claim. Refresh and try again.": ["Abholen fehlgeschlagen. Aktualisieren und erneut versuchen.","No se pudo reclamar. Actualiza e inténtalo de nuevo.","Ophalen mislukt. Vernieuw en probeer opnieuw.","Riscossione fallita. Aggiorna e riprova.","Impossible de récupérer. Actualisez et réessayez."],
  "Connect to your online guild to fight shared bosses and claim rewards.": ["Verbinde dich mit deiner Online-Gilde, um gemeinsame Bosse zu bekämpfen und Belohnungen abzuholen.","Conéctate a tu gremio en línea para combatir jefes compartidos y reclamar recompensas.","Verbind met je online gilde om samen bazen te bevechten en beloningen op te halen.","Collegati alla tua gilda online per affrontare boss condivisi e ottenere ricompense.","Connectez-vous à votre guilde en ligne pour combattre des boss communs et récupérer des récompenses."],
  "Join a guild to unlock shared encounters.": ["Tritt einer Gilde für gemeinsame Kämpfe bei.","Únete a un gremio para desbloquear encuentros compartidos.","Sluit je aan bij een gilde voor gezamenlijke gevechten.","Unisciti a una gilda per sbloccare scontri condivisi.","Rejoignez une guilde pour débloquer les combats communs."],
  "Event bosses appear here during active festivals.": ["Eventbosse erscheinen hier während aktiver Feste.","Los jefes de evento aparecen aquí durante los festivales activos.","Evenementbazen verschijnen hier tijdens actieve festivals.","I boss evento appaiono qui durante le feste attive.","Les boss événementiels apparaissent ici pendant les festivals actifs."],
  "WEEKLY BOSS": ["WOCHENBOSS","JEFE SEMANAL","WEKELIJKSE BAAS","BOSS SETTIMANALE","BOSS HEBDOMADAIRE"],
  "EVENT BOSS": ["EVENTBOSS","JEFE DE EVENTO","EVENEMENTBAAS","BOSS EVENTO","BOSS ÉVÉNEMENTIEL"],
  "Rootbound Colossus": ["Wurzelkoloss","Coloso arraigado","Wortelkolos","Colosso radicato","Colosse enraciné"],
  "Defeated": ["Besiegt","Derrotado","Verslagen","Sconfitto","Vaincu"],
  "Claim rewards": ["Belohnungen abholen","Reclamar recompensas","Beloningen ophalen","Riscuoti ricompense","Récupérer les récompenses"],
  "Upcoming": ["Demnächst","Próximamente","Binnenkort","In arrivo","À venir"],
  "In progress": ["Läuft","En curso","Bezig","In corso","En cours"],
  "Guild progress": ["Gildenfortschritt","Progreso del gremio","Gildevoortgang","Progresso gilda","Progression de guilde"],
  "Your contribution": ["Dein Beitrag","Tu contribución","Jouw bijdrage","Il tuo contributo","Votre contribution"],
  "Allowance remaining": ["Verbleibender Beitrag","Contribución restante","Resterende bijdrage","Contributo rimanente","Contribution restante"],
  "Collect combat rewards to damage both shared bosses. Contribute 1,000 damage to qualify for milestones.": ["Hole Kampfbelohnungen ab, um beiden gemeinsamen Bossen Schaden zuzufügen. Verursache 1.000 Schaden für Meilensteinbelohnungen.","Recoge recompensas de combate para dañar a ambos jefes compartidos. Aporta 1.000 de daño para optar a los hitos.","Haal gevechtsbeloningen op om beide gezamenlijke bazen te beschadigen. Draag 1.000 schade bij voor mijlpaalbeloningen.","Raccogli ricompense di combattimento per danneggiare entrambi i boss condivisi. Infliggi 1.000 danni per accedere alle ricompense.","Récupérez les récompenses de combat pour blesser les deux boss communs. Infligez 1 000 dégâts pour obtenir les récompenses de palier."],
  "Go hunting": ["Auf die Jagd","Ir de caza","Ga jagen","Vai a caccia","Partir chasser"],
  "MILESTONE REWARDS": ["MEILENSTEINBELOHNUNGEN","RECOMPENSAS DE HITOS","MIJLPAALBELONINGEN","RICOMPENSE TRAGUARDI","RÉCOMPENSES DE PALIER"],
  "Gold": ["Gold","Oro","Goud","Oro","Or"],
  "Guild progress needed": ["Gildenfortschritt erforderlich","Se necesita progreso del gremio","Gildevoortgang nodig","Serve progresso della gilda","Progression de guilde requise"],
  "Contribution needed": ["Beitrag erforderlich","Se necesita contribución","Bijdrage nodig","Serve un contributo","Contribution requise"],
  "Reward unlocked": ["Belohnung freigeschaltet","Recompensa desbloqueada","Beloning ontgrendeld","Ricompensa sbloccata","Récompense débloquée"],
  "Ends {date}": ["Endet am {date}","Termina el {date}","Eindigt op {date}","Termina il {date}","Se termine le {date}"],
  "Claim by {date}": ["Abholen bis {date}","Reclamar antes del {date}","Ophalen vóór {date}","Riscuoti entro il {date}","Récupérer avant le {date}"],
  "Backgrounds will be available after the server update.": ["Hintergründe sind nach dem Server-Update verfügbar.","Los fondos estarán disponibles tras actualizar el servidor.","Achtergronden zijn beschikbaar na de serverupdate.","Gli sfondi saranno disponibili dopo l'aggiornamento del server.","Les arrière-plans seront disponibles après la mise à jour du serveur."],
  "Card background": ["Kartenhintergrund","Fondo de tarjeta","Kaartachtergrond","Sfondo della scheda","Arrière-plan de carte"],
  "Guild Plaza": ["Gildenplatz","Plaza del gremio","Gildeplein","Piazza della gilda","Place de guilde"],
  "Forest Sanctum": ["Waldheiligtum","Santuario del bosque","Bosheiligdom","Santuario della foresta","Sanctuaire forestier"],
  "Plain": ["Schlicht","Liso","Effen","Semplice","Uni"],
  "Friends": [
    "Freunde",
    "Amigos",
    "Vrienden",
    "Amici",
    "Amis"
  ],
  "Requests": [
    "Anfragen",
    "Solicitudes",
    "Verzoeken",
    "Richieste",
    "Demandes"
  ],
  "Find players": [
    "Spieler suchen",
    "Buscar jugadores",
    "Spelers zoeken",
    "Trova giocatori",
    "Trouver des joueurs"
  ],
  "Refresh": [
    "Aktualisieren",
    "Actualizar",
    "Vernieuwen",
    "Aggiorna",
    "Actualiser"
  ],
  "Search": [
    "Suchen",
    "Buscar",
    "Zoeken",
    "Cerca",
    "Rechercher"
  ],
  "Player name": [
    "Spielername",
    "Nombre del jugador",
    "Spelersnaam",
    "Nome giocatore",
    "Nom du joueur"
  ],
  "Add": [
    "Hinzufügen",
    "Añadir",
    "Toevoegen",
    "Aggiungi",
    "Ajouter"
  ],
  "Accept": [
    "Annehmen",
    "Aceptar",
    "Accepteren",
    "Accetta",
    "Accepter"
  ],
  "Decline": [
    "Ablehnen",
    "Rechazar",
    "Afwijzen",
    "Rifiuta",
    "Refuser"
  ],
  "Cancel": [
    "Abbrechen",
    "Cancelar",
    "Annuleren",
    "Annulla",
    "Annuler"
  ],
  "Close": [
    "Schließen",
    "Cerrar",
    "Sluiten",
    "Chiudi",
    "Fermer"
  ],
  "Back": [
    "Zurück",
    "Atrás",
    "Terug",
    "Indietro",
    "Retour"
  ],
  "Retry": [
    "Erneut versuchen",
    "Reintentar",
    "Opnieuw proberen",
    "Riprova",
    "Réessayer"
  ],
  "Save": [
    "Speichern",
    "Guardar",
    "Opslaan",
    "Salva",
    "Enregistrer"
  ],
  "Send": [
    "Senden",
    "Enviar",
    "Versturen",
    "Invia",
    "Envoyer"
  ],
  "Leave": [
    "Verlassen",
    "Salir",
    "Verlaten",
    "Esci",
    "Quitter"
  ],
  "Remove": [
    "Entfernen",
    "Eliminar",
    "Verwijderen",
    "Rimuovi",
    "Retirer"
  ],
  "Block": [
    "Blockieren",
    "Bloquear",
    "Blokkeren",
    "Blocca",
    "Bloquer"
  ],
  "Unblock": [
    "Entsperren",
    "Desbloquear",
    "Deblokkeren",
    "Sblocca",
    "Débloquer"
  ],
  "Remove friend": [
    "Freund entfernen",
    "Eliminar amigo",
    "Vriend verwijderen",
    "Rimuovi amico",
    "Retirer cet ami"
  ],
  "Friend request": [
    "Freundschaftsanfrage",
    "Solicitud de amistad",
    "Vriendschapsverzoek",
    "Richiesta di amicizia",
    "Demande d’amitié"
  ],
  "Request sent": [
    "Anfrage gesendet",
    "Solicitud enviada",
    "Verzoek verstuurd",
    "Richiesta inviata",
    "Demande envoyée"
  ],
  "Respond in requests": [
    "Unter Anfragen antworten",
    "Responde en solicitudes",
    "Reageer bij verzoeken",
    "Rispondi nelle richieste",
    "Répondre dans les demandes"
  ],
  "VIEW PROFILE ›": [
    "PROFIL ANSEHEN ›",
    "VER PERFIL ›",
    "PROFIEL BEKIJKEN ›",
    "VEDI PROFILO ›",
    "VOIR LE PROFIL ›"
  ],
  "WANTS TO BE FRIENDS": [
    "MÖCHTE BEFREUNDET SEIN",
    "QUIERE SER TU AMIGO",
    "WIL VRIENDEN WORDEN",
    "VUOLE ESSERE TUO AMICO",
    "SOUHAITE ÊTRE VOTRE AMI"
  ],
  "REQUEST PENDING": [
    "ANFRAGE AUSSTEHEND",
    "SOLICITUD PENDIENTE",
    "VERZOEK IN AFWACHTING",
    "RICHIESTA IN ATTESA",
    "DEMANDE EN ATTENTE"
  ],
  "FRIEND": [
    "FREUND",
    "AMIGO",
    "VRIEND",
    "AMICO",
    "AMI"
  ],
  "BLOCKED": [
    "BLOCKIERT",
    "BLOQUEADO",
    "GEBLOKKEERD",
    "BLOCCATO",
    "BLOQUÉ"
  ],
  "Hidden from search and requests": [
    "In Suche und Anfragen verborgen",
    "Oculto en búsquedas y solicitudes",
    "Verborgen in zoeken en verzoeken",
    "Nascosto da ricerche e richieste",
    "Masqué des recherches et demandes"
  ],
  "Manage this friendship.": [
    "Diese Freundschaft verwalten.",
    "Gestiona esta amistad.",
    "Beheer deze vriendschap.",
    "Gestisci questa amicizia.",
    "Gérer cette amitié."
  ],
  "Open {name}'s profile": [
    "Profil von {name} öffnen",
    "Abrir el perfil de {name}",
    "Profiel van {name} openen",
    "Apri il profilo di {name}",
    "Ouvrir le profil de {name}"
  ],
  "Manage friendship with {name}": [
    "Freundschaft mit {name} verwalten",
    "Gestionar amistad con {name}",
    "Vriendschap met {name} beheren",
    "Gestisci amicizia con {name}",
    "Gérer l’amitié avec {name}"
  ],
  "Request sent to {name}.": [
    "Anfrage an {name} gesendet.",
    "Solicitud enviada a {name}.",
    "Verzoek verstuurd naar {name}.",
    "Richiesta inviata a {name}.",
    "Demande envoyée à {name}."
  ],
  "No new request was needed.": [
    "Keine neue Anfrage nötig.",
    "No era necesaria otra solicitud.",
    "Geen nieuw verzoek nodig.",
    "Non serviva una nuova richiesta.",
    "Aucune nouvelle demande nécessaire."
  ],
  "Online services are off": [
    "Onlinedienste sind deaktiviert",
    "Servicios en línea desactivados",
    "Online diensten staan uit",
    "Servizi online disattivati",
    "Services en ligne désactivés"
  ],
  "Online friends are unavailable in this build.": [
    "Onlinefreunde sind in dieser Version nicht verfügbar.",
    "Los amigos en línea no están disponibles en esta versión.",
    "Online vrienden zijn niet beschikbaar in deze versie.",
    "Gli amici online non sono disponibili in questa versione.",
    "Les amis en ligne ne sont pas disponibles dans cette version."
  ],
  "Loading friends": [
    "Freunde werden geladen",
    "Cargando amigos",
    "Vrienden laden",
    "Caricamento amici",
    "Chargement des amis"
  ],
  "Syncing friends, requests and blocked players.": [
    "Freunde, Anfragen und blockierte Spieler werden synchronisiert.",
    "Sincronizando amigos, solicitudes y jugadores bloqueados.",
    "Vrienden, verzoeken en geblokkeerde spelers synchroniseren.",
    "Sincronizzazione di amici, richieste e giocatori bloccati.",
    "Synchronisation des amis, demandes et joueurs bloqués."
  ],
  "Sign in first": [
    "Zuerst anmelden",
    "Inicia sesión primero",
    "Meld je eerst aan",
    "Accedi prima",
    "Connectez-vous d’abord"
  ],
  "Open Settings → Account and use a guest or official account. Friends stay attached when a guest account is upgraded.": [
    "Öffne Einstellungen → Konto und nutze ein Gastkonto oder offizielles Konto. Freunde bleiben beim Aufwerten eines Gastkontos erhalten.",
    "Abre Ajustes → Cuenta y usa una cuenta de invitado u oficial. Tus amigos se conservan al actualizar una cuenta de invitado.",
    "Open Instellingen → Account en gebruik een gastaccount of officieel account. Vrienden blijven behouden bij het upgraden van een gastaccount.",
    "Apri Impostazioni → Account e usa un account ospite o ufficiale. Gli amici restano quando aggiorni un account ospite.",
    "Ouvrez Paramètres → Compte et utilisez un compte invité ou officiel. Vos amis sont conservés lors de la conversion du compte invité."
  ],
  "Updating friends": [
    "Freunde werden aktualisiert",
    "Actualizando amigos",
    "Vrienden bijwerken",
    "Aggiornamento amici",
    "Actualisation des amis"
  ],
  "Syncing the latest social state.": [
    "Aktueller sozialer Status wird synchronisiert.",
    "Sincronizando el estado social más reciente.",
    "Nieuwste sociale status synchroniseren.",
    "Sincronizzazione dello stato sociale più recente.",
    "Synchronisation du dernier état social."
  ],
  "Search by the beginning of a player’s display name.": [
    "Suche nach dem Anfang eines Spielernamens.",
    "Busca por el inicio del nombre visible de un jugador.",
    "Zoek op het begin van de weergavenaam van een speler.",
    "Cerca l’inizio del nome visualizzato di un giocatore.",
    "Recherchez le début du nom affiché d’un joueur."
  ],
  "No players found": [
    "Keine Spieler gefunden",
    "No se encontraron jugadores",
    "Geen spelers gevonden",
    "Nessun giocatore trovato",
    "Aucun joueur trouvé"
  ],
  "Try another display name or a shorter starting phrase.": [
    "Versuche einen anderen Namen oder einen kürzeren Namensanfang.",
    "Prueba otro nombre o un inicio más corto.",
    "Probeer een andere naam of een korter begin.",
    "Prova un altro nome o un inizio più breve.",
    "Essayez un autre nom ou un début plus court."
  ],
  "No pending requests": [
    "Keine ausstehenden Anfragen",
    "No hay solicitudes pendientes",
    "Geen openstaande verzoeken",
    "Nessuna richiesta in attesa",
    "Aucune demande en attente"
  ],
  "Incoming and outgoing friend requests will appear here.": [
    "Eingehende und gesendete Freundschaftsanfragen erscheinen hier.",
    "Las solicitudes de amistad recibidas y enviadas aparecerán aquí.",
    "Ontvangen en verstuurde vriendschapsverzoeken verschijnen hier.",
    "Le richieste di amicizia ricevute e inviate appariranno qui.",
    "Les demandes d’amitié reçues et envoyées apparaîtront ici."
  ],
  "No friends yet": [
    "Noch keine Freunde",
    "Aún no tienes amigos",
    "Nog geen vrienden",
    "Ancora nessun amico",
    "Pas encore d’amis"
  ],
  "Use Find players to send your first friend request.": [
    "Nutze die Spielersuche für deine erste Freundschaftsanfrage.",
    "Usa Buscar jugadores para enviar tu primera solicitud.",
    "Gebruik Spelers zoeken om je eerste verzoek te versturen.",
    "Usa Trova giocatori per inviare la prima richiesta.",
    "Utilisez Trouver des joueurs pour envoyer votre première demande."
  ],
  "Friends could not be loaded.": [
    "Freunde konnten nicht geladen werden.",
    "No se pudieron cargar los amigos.",
    "Vrienden konden niet worden geladen.",
    "Impossibile caricare gli amici.",
    "Impossible de charger les amis."
  ],
  "Please try again.": [
    "Bitte versuche es erneut.",
    "Inténtalo de nuevo.",
    "Probeer het opnieuw.",
    "Riprova.",
    "Veuillez réessayer."
  ],
  "{friends} friends · {incoming} incoming": [
    "{friends} Freunde · {incoming} eingehend",
    "{friends} amigos · {incoming} recibidas",
    "{friends} vrienden · {incoming} ontvangen",
    "{friends} amici · {incoming} ricevute",
    "{friends} amis · {incoming} reçues"
  ],
  "Friends · {count}": [
    "Freunde · {count}",
    "Amigos · {count}",
    "Vrienden · {count}",
    "Amici · {count}",
    "Amis · {count}"
  ],
  "Requests · {count}": [
    "Anfragen · {count}",
    "Solicitudes · {count}",
    "Verzoeken · {count}",
    "Richieste · {count}",
    "Demandes · {count}"
  ],
  "Requests · {count} incoming": [
    "Anfragen · {count} eingehend",
    "Solicitudes · {count} recibidas",
    "Verzoeken · {count} ontvangen",
    "Richieste · {count} ricevute",
    "Demandes · {count} reçues"
  ],
  "Blocked players · {count}": [
    "Blockierte Spieler · {count}",
    "Jugadores bloqueados · {count}",
    "Geblokkeerde spelers · {count}",
    "Giocatori bloccati · {count}",
    "Joueurs bloqués · {count}"
  ],
  "Guild": [
    "Gilde",
    "Gremio",
    "Gilde",
    "Gilda",
    "Guilde"
  ],
  "Home": [
    "Start",
    "Inicio",
    "Start",
    "Inizio",
    "Accueil"
  ],
  "Members": [
    "Mitglieder",
    "Miembros",
    "Leden",
    "Membri",
    "Membres"
  ],
  "Activities": [
    "Aktivitäten",
    "Actividades",
    "Activiteiten",
    "Attività",
    "Activités"
  ],
  "Hall": [
    "Halle",
    "Sala",
    "Hal",
    "Sala",
    "Hall"
  ],
  "Chat": [
    "Chat",
    "Chat",
    "Chat",
    "Chat",
    "Discussion"
  ],
  "Manage": [
    "Verwalten",
    "Gestionar",
    "Beheren",
    "Gestisci",
    "Gérer"
  ],
  "Future": [
    "Zukunft",
    "Futuro",
    "Toekomst",
    "Futuro",
    "À venir"
  ],
  "Overview": [
    "Übersicht",
    "Resumen",
    "Overzicht",
    "Panoramica",
    "Vue d’ensemble"
  ],
  "PvE": [
    "PvE",
    "JcE",
    "PvE",
    "PvE",
    "JcE"
  ],
  "Roster": [
    "Mitgliederliste",
    "Miembros",
    "Ledenlijst",
    "Membri",
    "Effectif"
  ],
  "Roster · {count}": [
    "Mitglieder · {count}",
    "Miembros · {count}",
    "Leden · {count}",
    "Membri · {count}",
    "Membres · {count}"
  ],
  "Leader": [
    "Anführer",
    "Líder",
    "Leider",
    "Capo",
    "Chef"
  ],
  "Officer": [
    "Offizier",
    "Oficial",
    "Officier",
    "Ufficiale",
    "Officier"
  ],
  "Member": [
    "Mitglied",
    "Miembro",
    "Lid",
    "Membro",
    "Membre"
  ],
  "{name} · Level {level}": [
    "{name} · Stufe {level}",
    "{name} · Nivel {level}",
    "{name} · Niveau {level}",
    "{name} · Livello {level}",
    "{name} · Niveau {level}"
  ],
  "{name} · Lv {level}": [
    "{name} · St. {level}",
    "{name} · Nv. {level}",
    "{name} · Nv. {level}",
    "{name} · Liv. {level}",
    "{name} · Niv. {level}"
  ],
  "Level {level}": [
    "Stufe {level}",
    "Nivel {level}",
    "Niveau {level}",
    "Livello {level}",
    "Niveau {level}"
  ],
  "GUILD NETWORK": [
    "GILDENNETZWERK",
    "RED DE GREMIOS",
    "GILDENETWERK",
    "RETE GILDE",
    "RÉSEAU DES GUILDES"
  ],
  "One home for membership, shared activities, Hall progression, chat and Guild identity.": [
    "Ein Ort für Mitgliedschaft, gemeinsame Aktivitäten, Hallenfortschritt, Chat und Gildenidentität.",
    "Un lugar para miembros, actividades compartidas, progreso de la sala, chat e identidad del gremio.",
    "Eén plek voor leden, gezamenlijke activiteiten, halvoortgang, chat en gilde-identiteit.",
    "Un luogo per membri, attività condivise, progressione della sala, chat e identità della gilda.",
    "Un espace pour les membres, les activités communes, la progression du hall, la discussion et l’identité de la guilde."
  ],
  "DAILY & WEEKLY": [
    "TÄGLICH & WÖCHENTLICH",
    "DIARIO Y SEMANAL",
    "DAGELIJKS & WEKELIJKS",
    "GIORNALIERO E SETTIMANALE",
    "QUOTIDIEN ET HEBDOMADAIRE"
  ],
  "Muster & Rally": [
    "Antreten & Versammlung",
    "Reunión y movilización",
    "Appèl & samenkomst",
    "Adunata e raduno",
    "Appel et rassemblement"
  ],
  "Daily participation rolls into the shared weekly Rally without adding another currency.": [
    "Tägliche Teilnahme zählt zur gemeinsamen wöchentlichen Versammlung, ohne eine weitere Währung.",
    "La participación diaria cuenta para la movilización semanal compartida sin añadir otra moneda.",
    "Dagelijkse deelname telt mee voor de gezamenlijke wekelijkse samenkomst zonder extra valuta.",
    "La partecipazione giornaliera contribuisce al raduno settimanale senza aggiungere altre valute.",
    "La participation quotidienne contribue au rassemblement hebdomadaire commun sans ajouter de monnaie."
  ],
  "INTENTIONAL PROGRESSION": [
    "GEZIELTER FORTSCHRITT",
    "PROGRESO PLANIFICADO",
    "GERICHTE VOORTGANG",
    "PROGRESSIONE MIRATA",
    "PROGRESSION CIBLÉE"
  ],
  "Guild Quests": [
    "Gildenaufträge",
    "Misiones de gremio",
    "Gildemissies",
    "Missioni di gilda",
    "Quêtes de guilde"
  ],
  "Weekly cooperative objectives are the primary way to push and maintain Guild Activity through normal verified play.": [
    "Wöchentliche kooperative Ziele steigern und erhalten die Gildenaktivität durch reguläres, geprüftes Spielen.",
    "Los objetivos cooperativos semanales son la forma principal de aumentar y mantener la actividad del gremio mediante juego verificado.",
    "Wekelijkse gezamenlijke doelen verhogen en behouden gildeactiviteit door normaal geverifieerd spel.",
    "Gli obiettivi cooperativi settimanali aumentano e mantengono l’attività della gilda tramite il normale gioco verificato.",
    "Les objectifs coopératifs hebdomadaires augmentent et maintiennent l’activité de guilde grâce au jeu normal vérifié."
  ],
  "SHARED PROGRESSION": [
    "GEMEINSAMER FORTSCHRITT",
    "PROGRESO COMPARTIDO",
    "GEZAMENLIJKE VOORTGANG",
    "PROGRESSIONE CONDIVISA",
    "PROGRESSION COMMUNE"
  ],
  "Guild Projects": [
    "Gildenprojekte",
    "Proyectos de gremio",
    "Gildeprojecten",
    "Progetti di gilda",
    "Projets de guilde"
  ],
  "Hunt or gather to progress your automatic weekly Project, and review recent Guild activity.": [
    "Jage oder sammle, um dein automatisches Wochenprojekt voranzubringen, und sieh dir die letzten Gildenaktivitäten an.",
    "Caza o recolecta para avanzar en tu proyecto semanal automático y consulta la actividad reciente del gremio.",
    "Jaag of verzamel om je automatische weekproject te voltooien en bekijk recente gildeactiviteit.",
    "Caccia o raccogli per avanzare nel progetto settimanale automatico e consulta le attività recenti della gilda.",
    "Chassez ou récoltez pour faire progresser votre projet hebdomadaire automatique et consultez les activités récentes de la guilde."
  ],
  "WEEKLY PVE": [
    "WÖCHENTLICHES PVE",
    "JCE SEMANAL",
    "WEKELIJKSE PVE",
    "PVE SETTIMANALE",
    "JCE HEBDOMADAIRE"
  ],
  "Guild Boss": [
    "Gildenboss",
    "Jefe de gremio",
    "Gildebaas",
    "Boss di gilda",
    "Boss de guilde"
  ],
  "Shared PvE progress and personal contribution remain server-validated.": [
    "Gemeinsamer PvE-Fortschritt und persönlicher Beitrag werden vom Server geprüft.",
    "El progreso JcE compartido y la contribución personal se validan en el servidor.",
    "Gezamenlijke PvE-voortgang en persoonlijke bijdragen worden door de server gecontroleerd.",
    "I progressi PvE condivisi e i contributi personali sono convalidati dal server.",
    "La progression JcE commune et la contribution personnelle sont validées par le serveur."
  ],
  "RECRUITMENT": [
    "REKRUTIERUNG",
    "RECLUTAMIENTO",
    "WERVING",
    "RECLUTAMENTO",
    "RECRUTEMENT"
  ],
  "Directory & Creation": [
    "Verzeichnis & Gründung",
    "Directorio y creación",
    "Overzicht & oprichting",
    "Elenco e creazione",
    "Annuaire et création"
  ],
  "Find another Guild when eligible, or create and configure a new Guild identity.": [
    "Finde eine andere Gilde, wenn berechtigt, oder gründe und gestalte eine neue Gilde.",
    "Busca otro gremio cuando sea posible, o crea y configura uno nuevo.",
    "Zoek een ander gilde wanneer mogelijk, of richt een nieuw gilde op en stel het in.",
    "Trova un’altra gilda quando possibile, oppure crea e configura una nuova gilda.",
    "Trouvez une autre guilde si vous êtes éligible, ou créez et configurez une nouvelle guilde."
  ],
  "IDENTITY": [
    "IDENTITÄT",
    "IDENTIDAD",
    "IDENTITEIT",
    "IDENTITÀ",
    "IDENTITÉ"
  ],
  "Guild Appearance": [
    "Gildenaussehen",
    "Aspecto del gremio",
    "Gilde-uiterlijk",
    "Aspetto della gilda",
    "Apparence de guilde"
  ],
  "Manage the Guild tag, banner, border, colors, nameplate and motto with role-based permissions.": [
    "Verwalte Gildenkürzel, Banner, Rahmen, Farben, Namensschild und Motto gemäß deinen Rollenrechten.",
    "Gestiona etiqueta, estandarte, borde, colores, placa y lema del gremio según los permisos de tu rol.",
    "Beheer gildetag, banier, rand, kleuren, naamplaat en motto volgens je rolrechten.",
    "Gestisci tag, stendardo, bordo, colori, targhetta e motto della gilda in base ai permessi del ruolo.",
    "Gérez le tag, la bannière, la bordure, les couleurs, la plaque et la devise selon les droits de votre rôle."
  ],
  "Find your guild": [
    "Finde deine Gilde",
    "Encuentra tu gremio",
    "Vind je gilde",
    "Trova la tua gilda",
    "Trouvez votre guilde"
  ],
  "A friendly expedition guild focused on steady PvE progress.": [
    "Eine freundliche Expeditionsgilde mit stetigem PvE-Fortschritt.",
    "Un gremio de expediciones amistoso centrado en el progreso JcE constante.",
    "Een vriendelijk expeditiegilde gericht op gestage PvE-voortgang.",
    "Una gilda di spedizioni amichevole dedicata al progresso PvE costante.",
    "Une guilde d’expédition conviviale axée sur une progression JcE régulière."
  ],
  "Join a guild to unlock shared projects, guild PvE, and the AFK reserve bonus.": [
    "Tritt einer Gilde bei, um gemeinsame Projekte, Gilden-PvE und den AFK-Reservebonus freizuschalten.",
    "Únete a un gremio para desbloquear proyectos compartidos, JcE de gremio y la bonificación de reserva AFK.",
    "Word lid van een gilde voor gezamenlijke projecten, gilde-PvE en de AFK-reservebonus.",
    "Unisciti a una gilda per sbloccare progetti condivisi, PvE di gilda e il bonus riserva AFK.",
    "Rejoignez une guilde pour débloquer les projets communs, le JcE de guilde et le bonus de réserve AFK."
  ],
  "Leave guild": [
    "Gilde verlassen",
    "Salir del gremio",
    "Gilde verlaten",
    "Lascia la gilda",
    "Quitter la guilde"
  ],
  "Join The Bloomwardens": [
    "The Bloomwardens beitreten",
    "Unirse a The Bloomwardens",
    "Lid worden van The Bloomwardens",
    "Unisciti a The Bloomwardens",
    "Rejoindre The Bloomwardens"
  ],
  "Weekly PvE project": [
    "Wöchentliches PvE-Projekt",
    "Proyecto JcE semanal",
    "Wekelijks PvE-project",
    "Progetto PvE settimanale",
    "Projet JcE hebdomadaire"
  ],
  "{progress}/1,000 restored · You contributed {contribution}": [
    "{progress}/1.000 wiederhergestellt · Dein Beitrag: {contribution}",
    "{progress}/1.000 restaurado · Tu contribución: {contribution}",
    "{progress}/1.000 hersteld · Jouw bijdrage: {contribution}",
    "{progress}/1.000 ripristinato · Il tuo contributo: {contribution}",
    "{progress}/1 000 restaurés · Votre contribution : {contribution}"
  ],
  "Contribute 100": [
    "100 beitragen",
    "Aportar 100",
    "100 bijdragen",
    "Contribuisci 100",
    "Contribuer 100"
  ],
  "{hp} HP remaining": [
    "{hp} LP verbleibend",
    "Quedan {hp} PV",
    "{hp} HP over",
    "{hp} PV rimanenti",
    "{hp} PV restants"
  ],
  "Attack · 5,000 damage": [
    "Angreifen · 5.000 Schaden",
    "Atacar · 5.000 de daño",
    "Aanvallen · 5.000 schade",
    "Attacca · 5.000 danni",
    "Attaquer · 5 000 dégâts"
  ],
  "Guild membership required": [
    "Gildenmitgliedschaft erforderlich",
    "Se requiere pertenecer a un gremio",
    "Gildelidmaatschap vereist",
    "È richiesta l’appartenenza a una gilda",
    "Appartenance à une guilde requise"
  ],
  "Join a guild from Overview to participate in weekly projects and bosses.": [
    "Tritt über die Übersicht einer Gilde bei, um an Wochenprojekten und Bossen teilzunehmen.",
    "Únete a un gremio desde Resumen para participar en proyectos y jefes semanales.",
    "Word via Overzicht lid van een gilde om mee te doen aan weekprojecten en bazen.",
    "Unisciti a una gilda dalla panoramica per partecipare a progetti e boss settimanali.",
    "Rejoignez une guilde depuis la vue d’ensemble pour participer aux projets et boss hebdomadaires."
  ],
  "Join a guild to view its members.": [
    "Tritt einer Gilde bei, um ihre Mitglieder zu sehen.",
    "Únete a un gremio para ver sus miembros.",
    "Word lid van een gilde om de leden te bekijken.",
    "Unisciti a una gilda per vederne i membri.",
    "Rejoignez une guilde pour voir ses membres."
  ],
  "GUILD HOME": [
    "GILDENSTART",
    "INICIO DEL GREMIO",
    "GILDESTART",
    "HOME GILDA",
    "ACCUEIL DE GUILDE"
  ],
  "Guild Overview": [
    "Gildenübersicht",
    "Resumen del gremio",
    "Gildeoverzicht",
    "Panoramica della gilda",
    "Vue d’ensemble de la guilde"
  ],
  "Keep Guild Activity high through Guild Quests, Muster and shared Projects to maintain cumulative non-combat bonuses.": [
    "Halte die Gildenaktivität durch Aufträge, Antreten und gemeinsame Projekte hoch, um kumulative Boni außerhalb des Kampfes zu erhalten.",
    "Mantén alta la actividad con misiones, reuniones y proyectos para conservar las bonificaciones acumulativas ajenas al combate.",
    "Houd gildeactiviteit hoog met missies, appèl en gezamenlijke projecten om cumulatieve bonussen buiten gevechten te behouden.",
    "Mantieni alta l’attività con missioni, adunate e progetti per conservare i bonus cumulativi non di combattimento.",
    "Maintenez l’activité grâce aux quêtes, à l’appel et aux projets pour conserver les bonus cumulés hors combat."
  ],
  "OPEN ›": [
    "ÖFFNEN ›",
    "ABRIR ›",
    "OPENEN ›",
    "APRI ›",
    "OUVRIR ›"
  ],
  "Manage Guild": [
    "Gilde verwalten",
    "Gestionar gremio",
    "Gilde beheren",
    "Gestisci gilda",
    "Gérer la guilde"
  ],
  "Future Content": [
    "Künftige Inhalte",
    "Contenido futuro",
    "Toekomstige inhoud",
    "Contenuti futuri",
    "Contenu à venir"
  ],
  "FUTURE GUILD CONTENT": [
    "KÜNFTIGE GILDENINHALTE",
    "CONTENIDO FUTURO DE GREMIOS",
    "TOEKOMSTIGE GILDE-INHOUD",
    "FUTURI CONTENUTI DI GILDA",
    "CONTENU DE GUILDE À VENIR"
  ],
  "In Development": [
    "In Entwicklung",
    "En desarrollo",
    "In ontwikkeling",
    "In sviluppo",
    "En développement"
  ],
  "These destinations are visible for roadmap clarity only. They do not accept contributions, consume resources or affect rankings yet. Guild Legacy will eventually extend the Guild Hall Trophy Room into a permanent seasonal history.": [
    "Diese Bereiche zeigen nur die Entwicklungsplanung. Sie nehmen noch keine Beiträge an, verbrauchen keine Ressourcen und beeinflussen keine Ranglisten. Das Gildenvermächtnis erweitert später den Trophäenraum um eine dauerhafte Saisonhistorie.",
    "Estas secciones muestran los planes futuros. Aún no aceptan contribuciones, consumen recursos ni afectan las clasificaciones. El legado del gremio ampliará la sala de trofeos con un historial permanente de temporadas.",
    "Deze onderdelen tonen de ontwikkelplannen. Ze accepteren nog geen bijdragen, kosten geen middelen en beïnvloeden geen ranglijsten. Gilde-erfgoed zal de trofeeënkamer uitbreiden met een blijvende seizoensgeschiedenis.",
    "Queste sezioni mostrano i piani futuri. Non accettano ancora contributi, consumano risorse o influenzano classifiche. L’eredità di gilda estenderà la sala dei trofei con una cronologia stagionale permanente.",
    "Ces sections présentent les projets à venir. Elles n’acceptent pas encore de contributions, ne consomment pas de ressources et n’affectent pas les classements. L’héritage de guilde ajoutera un historique permanent des saisons à la salle des trophées."
  ],
  "Open Guild {section}": [
    "Gildenbereich {section} öffnen",
    "Abrir {section} del gremio",
    "Gildeonderdeel {section} openen",
    "Apri {section} della gilda",
    "Ouvrir {section} de la guilde"
  ],
  "{title}, In Development": [
    "{title}, in Entwicklung",
    "{title}, en desarrollo",
    "{title}, in ontwikkeling",
    "{title}, in sviluppo",
    "{title}, en développement"
  ],
  "{count} mentions": [
    "{count} Erwähnungen",
    "{count} menciones",
    "{count} vermeldingen",
    "{count} menzioni",
    "{count} mentions"
  ],
  "{count} updates": [
    "{count} Aktualisierungen",
    "{count} actualizaciones",
    "{count} updates",
    "{count} aggiornamenti",
    "{count} mises à jour"
  ],
  "MUSTER · PROJECTS · PVE": [
    "ANTRETEN · PROJEKTE · PVE",
    "REUNIÓN · PROYECTOS · JCE",
    "APPÈL · PROJECTEN · PVE",
    "ADUNATA · PROGETTI · PVE",
    "APPEL · PROJETS · JCE"
  ],
  "Daily Muster, weekly Projects and Guild boss progress.": [
    "Tägliches Antreten, Wochenprojekte und Gildenboss-Fortschritt.",
    "Reunión diaria, proyectos semanales y progreso del jefe del gremio.",
    "Dagelijks appèl, weekprojecten en gildebaasvoortgang.",
    "Adunata giornaliera, progetti settimanali e progressi del boss di gilda.",
    "Appel quotidien, projets hebdomadaires et progression du boss de guilde."
  ],
  "ROSTER · APPLICATIONS": [
    "MITGLIEDER · BEWERBUNGEN",
    "MIEMBROS · SOLICITUDES",
    "LEDEN · AANVRAGEN",
    "MEMBRI · CANDIDATURE",
    "EFFECTIF · CANDIDATURES"
  ],
  "Members, roles, applications, invitations and leadership safety.": [
    "Mitglieder, Rollen, Bewerbungen, Einladungen und Führungssicherung.",
    "Miembros, roles, solicitudes, invitaciones y seguridad del liderazgo.",
    "Leden, rollen, aanvragen, uitnodigingen en leiderschapsbescherming.",
    "Membri, ruoli, candidature, inviti e tutela della guida.",
    "Membres, rôles, candidatures, invitations et protection de la direction."
  ],
  "HALL · TROPHIES": [
    "HALLE · TROPHÄEN",
    "SALA · TROFEOS",
    "HAL · TROFEEËN",
    "SALA · TROFEI",
    "HALL · TROPHÉES"
  ],
  "Guild Hall facilities, long-term progression and Trophy Room.": [
    "Gildenhalleneinrichtungen, langfristiger Fortschritt und Trophäenraum.",
    "Instalaciones de la sala del gremio, progreso a largo plazo y sala de trofeos.",
    "Gildehalvoorzieningen, langdurige voortgang en trofeeënkamer.",
    "Strutture della sala di gilda, progressi a lungo termine e sala dei trofei.",
    "Installations du hall de guilde, progression à long terme et salle des trophées."
  ],
  "GUILD CHAT": [
    "GILDENCHAT",
    "CHAT DEL GREMIO",
    "GILDECHAT",
    "CHAT DI GILDA",
    "DISCUSSION DE GUILDE"
  ],
  "Member chat with Guild tags, roles and player profiles.": [
    "Mitgliederchat mit Gildenkürzeln, Rollen und Spielerprofilen.",
    "Chat de miembros con etiquetas, roles y perfiles.",
    "Ledenchat met gildetags, rollen en spelersprofielen.",
    "Chat dei membri con tag di gilda, ruoli e profili.",
    "Discussion des membres avec tags de guilde, rôles et profils."
  ],
  "Guild vs Guild": [
    "Gilde gegen Gilde",
    "Gremio contra gremio",
    "Gilde tegen gilde",
    "Gilda contro gilda",
    "Guilde contre guilde"
  ],
  "Guild Raids": [
    "Gildenraids",
    "Incursiones de gremio",
    "Gilderaids",
    "Incursioni di gilda",
    "Raids de guilde"
  ],
  "Guild Trials": [
    "Gildenprüfungen",
    "Pruebas de gremio",
    "Gildeproeven",
    "Prove di gilda",
    "Épreuves de guilde"
  ],
  "Guild Expeditions": [
    "Gildenexpeditionen",
    "Expediciones de gremio",
    "Gilde-expedities",
    "Spedizioni di gilda",
    "Expéditions de guilde"
  ],
  "Guild Legacy": [
    "Gildenvermächtnis",
    "Legado del gremio",
    "Gilde-erfgoed",
    "Eredità di gilda",
    "Héritage de guilde"
  ],
  "SEASONAL GUILD COMPETITION": [
    "SAISONALER GILDENWETTBEWERB",
    "COMPETICIÓN ESTACIONAL DE GREMIOS",
    "SEIZOENSGILDECOMPETITIE",
    "COMPETIZIONE STAGIONALE DI GILDA",
    "COMPÉTITION SAISONNIÈRE DE GUILDE"
  ],
  "LARGE-SCALE PVE": [
    "GROSS ANGELEGTES PVE",
    "JCE A GRAN ESCALA",
    "GROOTSCHALIGE PVE",
    "PVE SU LARGA SCALA",
    "JCE À GRANDE ÉCHELLE"
  ],
  "ROTATING CHALLENGES": [
    "WECHSELNDE HERAUSFORDERUNGEN",
    "DESAFÍOS ROTATIVOS",
    "WISSELENDE UITDAGINGEN",
    "SFIDE A ROTAZIONE",
    "DÉFIS TOURNANTS"
  ],
  "ASYNC GUILD MISSIONS": [
    "ASYNCHRONE GILDENMISSIONEN",
    "MISIONES ASÍNCRONAS DE GREMIO",
    "ASYNCHRONE GILDEMISSIES",
    "MISSIONI DI GILDA ASINCRONE",
    "MISSIONS ASYNCHRONES DE GUILDE"
  ],
  "SEASONS & HISTORY": [
    "SAISONS & GESCHICHTE",
    "TEMPORADAS E HISTORIA",
    "SEIZOENEN & GESCHIEDENIS",
    "STAGIONI E STORIA",
    "SAISONS ET HISTOIRE"
  ],
  "Asynchronous guild-versus-guild matchups with contribution objectives, fair brackets and no requirement for every member to be online together.": [
    "Asynchrone Gildenduelle mit Beitragszielen und fairen Gruppen. Nicht alle Mitglieder müssen gleichzeitig online sein.",
    "Enfrentamientos asíncronos entre gremios con objetivos de contribución y grupos justos, sin exigir que todos estén conectados a la vez.",
    "Asynchrone gildeduels met bijdragedoelen en eerlijke groepen, zonder dat iedereen tegelijk online hoeft te zijn.",
    "Scontri asincroni tra gilde con obiettivi di contributo e gruppi equi, senza richiedere tutti i membri online insieme.",
    "Affrontements asynchrones entre guildes avec objectifs de contribution et groupes équitables, sans connexion simultanée obligatoire."
  ],
  "Longer guild encounters built around role contribution, shared boss progress and guild-wide completion rewards.": [
    "Längere Gildenbegegnungen mit Rollenbeiträgen, gemeinsamem Bossfortschritt und Abschlussbelohnungen für die ganze Gilde.",
    "Encuentros largos centrados en la contribución de roles, progreso compartido del jefe y recompensas para todo el gremio.",
    "Langere gildegevechten met rolbijdragen, gezamenlijke baasvoortgang en beloningen voor het hele gilde.",
    "Scontri più lunghi basati sui ruoli, sui progressi condivisi contro i boss e su ricompense per tutta la gilda.",
    "Rencontres prolongées fondées sur les rôles, la progression commune contre les boss et les récompenses pour toute la guilde."
  ],
  "Short rotating guild challenges with authored restrictions, score targets and cooperative mastery goals.": [
    "Kurze wechselnde Gildenherausforderungen mit festen Einschränkungen, Punktezielen und kooperativen Meisterschaftszielen.",
    "Desafíos breves rotativos con restricciones, objetivos de puntuación y metas de maestría cooperativa.",
    "Korte wisselende gilde-uitdagingen met vaste beperkingen, scoredoelen en gezamenlijke beheersingsdoelen.",
    "Brevi sfide a rotazione con restrizioni, obiettivi di punteggio e maestria cooperativa.",
    "Défis courts tournants avec restrictions définies, scores cibles et objectifs de maîtrise coopérative."
  ],
  "Long-form cooperative missions where members contribute different combat and skilling requirements over time.": [
    "Langfristige kooperative Missionen, bei denen Mitglieder über Zeit verschiedene Kampf- und Fertigkeitsziele erfüllen.",
    "Misiones cooperativas largas en las que los miembros aportan distintos requisitos de combate y habilidades con el tiempo.",
    "Langdurige gezamenlijke missies waarin leden door de tijd verschillende gevechts- en vaardigheidsdoelen vervullen.",
    "Missioni cooperative lunghe in cui i membri soddisfano nel tempo diversi requisiti di combattimento e abilità.",
    "Missions coopératives longues où les membres remplissent divers objectifs de combat et de compétences au fil du temps."
  ],
  "A permanent guild record of past seasons, raid clears, Guild vs Guild results, major Projects, trophies and notable guild milestones.": [
    "Ein dauerhaftes Gildenarchiv vergangener Saisons, Raidabschlüsse, Gildenduelle, großer Projekte, Trophäen und wichtiger Meilensteine.",
    "Un registro permanente de temporadas, incursiones, enfrentamientos entre gremios, grandes proyectos, trofeos e hitos.",
    "Een blijvend gildearchief van seizoenen, raids, gildeduels, grote projecten, trofeeën en belangrijke mijlpalen.",
    "Un registro permanente di stagioni, incursioni, scontri tra gilde, grandi progetti, trofei e traguardi.",
    "Un registre permanent des saisons, raids terminés, résultats entre guildes, grands projets, trophées et étapes marquantes."
  ],
  "Social help": [
    "Soziale Hilfe",
    "Ayuda social",
    "Sociale hulp",
    "Aiuto sociale",
    "Aide sociale"
  ],
  "SOCIAL UNAVAILABLE": [
    "SOZIALES NICHT VERFÜGBAR",
    "SOCIAL NO DISPONIBLE",
    "SOCIAAL NIET BESCHIKBAAR",
    "SOCIAL NON DISPONIBILE",
    "SOCIAL INDISPONIBLE"
  ],
  "Account settings": [
    "Kontoeinstellungen",
    "Ajustes de cuenta",
    "Accountinstellingen",
    "Impostazioni account",
    "Paramètres du compte"
  ],
  "ROLE": [
    "ROLLE",
    "ROL",
    "ROL",
    "RUOLO",
    "RÔLE"
  ],
  "FOCUS": [
    "SCHWERPUNKT",
    "ENFOQUE",
    "FOCUS",
    "OBIETTIVO",
    "ORIENTATION"
  ],
  "Current · {objective}": [
    "Aktuell · {objective}",
    "Actual · {objective}",
    "Huidig · {objective}",
    "Attuale · {objective}",
    "Actuel · {objective}"
  ],
  "Join Party": [
    "Gruppe beitreten",
    "Unirse al grupo",
    "Groep betreden",
    "Unisciti al gruppo",
    "Rejoindre le groupe"
  ],
  "Join / apply to Guild": [
    "Gilde beitreten / bewerben",
    "Unirse / solicitar al gremio",
    "Gilde betreden / aanmelden",
    "Unisciti / candidati alla gilda",
    "Rejoindre / postuler à la guilde"
  ],
  "Player Profile": [
    "Spielerprofil",
    "Perfil del jugador",
    "Spelersprofiel",
    "Profilo giocatore",
    "Profil du joueur"
  ],
  "Close details": [
    "Details schließen",
    "Cerrar detalles",
    "Details sluiten",
    "Chiudi dettagli",
    "Fermer les détails"
  ],
  "PARTY INVITES": [
    "GRUPPENEINLADUNGEN",
    "INVITACIONES DE GRUPO",
    "GROEPSUITNODIGINGEN",
    "INVITI AL GRUPPO",
    "INVITATIONS DE GROUPE"
  ],
  "{count} pending": [
    "{count} ausstehend",
    "{count} pendientes",
    "{count} in afwachting",
    "{count} in attesa",
    "{count} en attente"
  ],
  "PARTY INVITE": [
    "GRUPPENEINLADUNG",
    "INVITACIÓN DE GRUPO",
    "GROEPSUITNODIGING",
    "INVITO AL GRUPPO",
    "INVITATION DE GROUPE"
  ],
  "OUTGOING PARTY INVITES": [
    "GESENDETE GRUPPENEINLADUNGEN",
    "INVITACIONES DE GRUPO ENVIADAS",
    "VERSTUURDE GROEPSUITNODIGINGEN",
    "INVITI AL GRUPPO INVIATI",
    "INVITATIONS DE GROUPE ENVOYÉES"
  ],
  "INVITE SENT": [
    "EINLADUNG GESENDET",
    "INVITACIÓN ENVIADA",
    "UITNODIGING VERSTUURD",
    "INVITO INVIATO",
    "INVITATION ENVOYÉE"
  ],
  "Waiting for this player to respond.": [
    "Warte auf die Antwort dieses Spielers.",
    "Esperando la respuesta de este jugador.",
    "Wachten op antwoord van deze speler.",
    "In attesa della risposta del giocatore.",
    "En attente de la réponse du joueur."
  ],
  "Cancel invite": [
    "Einladung zurückziehen",
    "Cancelar invitación",
    "Uitnodiging annuleren",
    "Annulla invito",
    "Annuler l’invitation"
  ],
  "Open Guild directory and management": [
    "Gildenverzeichnis und Verwaltung öffnen",
    "Abrir directorio y gestión de gremios",
    "Gildeoverzicht en beheer openen",
    "Apri elenco e gestione delle gilde",
    "Ouvrir l’annuaire et la gestion des guildes"
  ],
  "Post Guild recruiting advert": [
    "Gildenanzeige veröffentlichen",
    "Publicar anuncio de gremio",
    "Gildewervingsbericht plaatsen",
    "Pubblica annuncio di gilda",
    "Publier une annonce de guilde"
  ],
  "Join a Party to use Party Chat. World and Guild chat remain available in the chat overlay.": [
    "Tritt einer Gruppe für den Gruppenchat bei. Welt- und Gildenchat bleiben im Chatfenster verfügbar.",
    "Únete a un grupo para usar su chat. Los chats del mundo y gremio siguen disponibles en la ventana de chat.",
    "Word lid van een groep voor groepschat. Wereld- en gildechat blijven beschikbaar in het chatvenster.",
    "Unisciti a un gruppo per usarne la chat. Le chat mondiale e di gilda restano disponibili nel pannello chat.",
    "Rejoignez un groupe pour discuter. Les discussions du monde et de guilde restent disponibles dans le panneau."
  ],
  "Ranked Party events": [
    "Gewertete Gruppenevents",
    "Eventos de grupo clasificatorios",
    "Groepsevenementen met ranglijst",
    "Eventi di gruppo classificati",
    "Événements de groupe classés"
  ],
  "Normalized points, then completion time. Ties use a stable Party ID order.": [
    "Normalisierte Punkte, dann Abschlusszeit. Bei Gleichstand zählt eine feste Reihenfolge der Gruppen-IDs.",
    "Puntos normalizados y luego tiempo de finalización. Los empates usan un orden estable de ID de grupo.",
    "Genormaliseerde punten, daarna voltooiingstijd. Gelijke standen gebruiken een vaste volgorde van groeps-ID’s.",
    "Punti normalizzati, poi tempo di completamento. I pareggi seguono un ordine stabile degli ID di gruppo.",
    "Points normalisés, puis temps d’achèvement. Les égalités suivent un ordre stable des identifiants de groupe."
  ],
  "{count} pts": [
    "{count} Pkt.",
    "{count} pts",
    "{count} ptn",
    "{count} pt",
    "{count} pts"
  ],
  "No ranked contributions yet.": [
    "Noch keine gewerteten Beiträge.",
    "Aún no hay contribuciones clasificadas.",
    "Nog geen bijdragen met ranglijst.",
    "Ancora nessun contributo classificato.",
    "Aucune contribution classée pour le moment."
  ],
  "Your adverts": [
    "Deine Anzeigen",
    "Tus anuncios",
    "Je advertenties",
    "I tuoi annunci",
    "Vos annonces"
  ],
  "{count} active / saved": [
    "{count} aktiv / gespeichert",
    "{count} activos / guardados",
    "{count} actief / opgeslagen",
    "{count} attivi / salvati",
    "{count} actives / enregistrées"
  ],
  "Close advert": [
    "Anzeige schließen",
    "Cerrar anuncio",
    "Advertentie sluiten",
    "Chiudi annuncio",
    "Fermer l’annonce"
  ],
  "CLOSED": [
    "GESCHLOSSEN",
    "CERRADO",
    "GESLOTEN",
    "CHIUSO",
    "FERMÉ"
  ],
  "No adverts published yet.": [
    "Noch keine Anzeigen veröffentlicht.",
    "Aún no se han publicado anuncios.",
    "Nog geen advertenties geplaatst.",
    "Nessun annuncio pubblicato.",
    "Aucune annonce publiée."
  ],
  "Working…": [
    "Wird bearbeitet…",
    "Procesando…",
    "Bezig…",
    "Elaborazione…",
    "Traitement…"
  ],
  "Loading account…": [
    "Konto wird geladen…",
    "Cargando cuenta…",
    "Account laden…",
    "Caricamento account…",
    "Chargement du compte…"
  ],
  "Sign in and sync a character to use Parties and Recruitment.": [
    "Melde dich an und synchronisiere einen Charakter, um Gruppen und Rekrutierung zu nutzen.",
    "Inicia sesión y sincroniza un personaje para usar grupos y reclutamiento.",
    "Meld je aan en synchroniseer een personage voor groepen en werving.",
    "Accedi e sincronizza un personaggio per usare gruppi e reclutamento.",
    "Connectez-vous et synchronisez un personnage pour utiliser les groupes et le recrutement."
  ],
  "Social service unavailable.": [
    "Sozialer Dienst nicht verfügbar.",
    "Servicio social no disponible.",
    "Sociale dienst niet beschikbaar.",
    "Servizio sociale non disponibile.",
    "Service social indisponible."
  ],
  "Live event unavailable.": [
    "Live-Event nicht verfügbar.",
    "Evento en vivo no disponible.",
    "Live-evenement niet beschikbaar.",
    "Evento live non disponibile.",
    "Événement en direct indisponible."
  ],
  "Sync your character in Account settings first.": [
    "Synchronisiere zuerst deinen Charakter in den Kontoeinstellungen.",
    "Sincroniza primero tu personaje en los ajustes de cuenta.",
    "Synchroniseer eerst je personage in Accountinstellingen.",
    "Sincronizza prima il personaggio nelle impostazioni account.",
    "Synchronisez d’abord votre personnage dans les paramètres du compte."
  ],
  "Leave your current Party before accepting another invitation.": [
    "Verlasse deine aktuelle Gruppe, bevor du eine andere Einladung annimmst.",
    "Sal de tu grupo actual antes de aceptar otra invitación.",
    "Verlaat je huidige groep voordat je een andere uitnodiging accepteert.",
    "Lascia il gruppo attuale prima di accettare un altro invito.",
    "Quittez votre groupe actuel avant d’accepter une autre invitation."
  ],
  "This Party is currently full.": [
    "Diese Gruppe ist derzeit voll.",
    "Este grupo está lleno.",
    "Deze groep is momenteel vol.",
    "Questo gruppo è al completo.",
    "Ce groupe est actuellement complet."
  ],
  "{focus} Party · {members}/4 members · {open} open": [
    "Gruppe {focus} · {members}/4 Mitglieder · {open} frei",
    "Grupo {focus} · {members}/4 miembros · {open} libres",
    "Groep {focus} · {members}/4 leden · {open} vrij",
    "Gruppo {focus} · {members}/4 membri · {open} liberi",
    "Groupe {focus} · {members}/4 membres · {open} libres"
  ],
  "Leave Party and hand over leadership?": [
    "Gruppe verlassen und Führung übergeben?",
    "¿Salir del grupo y ceder el liderazgo?",
    "Groep verlaten en leiderschap overdragen?",
    "Lasciare il gruppo e trasferire la guida?",
    "Quitter le groupe et transmettre la direction ?"
  ],
  "Leave and disband Party?": [
    "Gruppe verlassen und auflösen?",
    "¿Salir y disolver el grupo?",
    "Groep verlaten en opheffen?",
    "Lasciare e sciogliere il gruppo?",
    "Quitter et dissoudre le groupe ?"
  ],
  "Leave Party?": [
    "Gruppe verlassen?",
    "¿Salir del grupo?",
    "Groep verlaten?",
    "Lasciare il gruppo?",
    "Quitter le groupe ?"
  ],
  "Leadership will pass to {name}, the oldest remaining Party member.": [
    "Die Führung geht an {name}, das am längsten verbleibende Gruppenmitglied.",
    "El liderazgo pasará a {name}, el miembro restante más antiguo.",
    "Het leiderschap gaat naar {name}, het langst aanwezige resterende groepslid.",
    "La guida passerà a {name}, il membro rimasto da più tempo.",
    "La direction sera transmise à {name}, le membre restant le plus ancien."
  ],
  "You are the only Party member, so leaving will disband it.": [
    "Du bist das einzige Mitglied. Beim Verlassen wird die Gruppe aufgelöst.",
    "Eres el único miembro, por lo que salir disolverá el grupo.",
    "Je bent het enige groepslid, dus bij vertrek wordt de groep opgeheven.",
    "Sei l’unico membro: uscendo scioglierai il gruppo.",
    "Vous êtes le seul membre : quitter dissoudra le groupe."
  ],
  "You will leave this persistent Party.": [
    "Du verlässt diese dauerhafte Gruppe.",
    "Saldrás de este grupo persistente.",
    "Je verlaat deze blijvende groep.",
    "Lascerai questo gruppo persistente.",
    "Vous quitterez ce groupe persistant."
  ],
  "Disband Party?": [
    "Gruppe auflösen?",
    "¿Disolver el grupo?",
    "Groep opheffen?",
    "Sciogliere il gruppo?",
    "Dissoudre le groupe ?"
  ],
  "This removes every member and cancels all pending Party invitations.": [
    "Alle Mitglieder werden entfernt und ausstehende Gruppeneinladungen zurückgezogen.",
    "Se eliminará a todos los miembros y se cancelarán las invitaciones pendientes.",
    "Alle leden worden verwijderd en alle openstaande uitnodigingen geannuleerd.",
    "Tutti i membri saranno rimossi e gli inviti in attesa annullati.",
    "Tous les membres seront retirés et les invitations en attente annulées."
  ],
  "Disband": [
    "Auflösen",
    "Disolver",
    "Opheffen",
    "Sciogli",
    "Dissoudre"
  ],
  "Transfer Party leadership?": [
    "Gruppenführung übertragen?",
    "¿Transferir liderazgo del grupo?",
    "Groepsleiderschap overdragen?",
    "Trasferire la guida del gruppo?",
    "Transférer la direction du groupe ?"
  ],
  "{name} will become Party leader.": [
    "{name} wird Gruppenanführer.",
    "{name} será líder del grupo.",
    "{name} wordt groepsleider.",
    "{name} diventerà capogruppo.",
    "{name} deviendra chef de groupe."
  ],
  "Transfer": [
    "Übertragen",
    "Transferir",
    "Overdragen",
    "Trasferisci",
    "Transférer"
  ],
  "Remove {name}?": [
    "{name} entfernen?",
    "¿Eliminar a {name}?",
    "{name} verwijderen?",
    "Rimuovere {name}?",
    "Retirer {name} ?"
  ],
  "They will leave the Party immediately.": [
    "Die Person verlässt die Gruppe sofort.",
    "Saldrá del grupo inmediatamente.",
    "Deze speler verlaat de groep meteen.",
    "Lascerà il gruppo immediatamente.",
    "Ce joueur quittera immédiatement le groupe."
  ],
  "damage": [
    "Schaden",
    "daño",
    "schade",
    "danni",
    "dégâts"
  ],
  "tank": [
    "Tank",
    "tanque",
    "tank",
    "tank",
    "tank"
  ],
  "support": [
    "Unterstützung",
    "apoyo",
    "ondersteuning",
    "supporto",
    "soutien"
  ],
  "combat": [
    "Kampf",
    "combate",
    "gevecht",
    "combattimento",
    "combat"
  ],
  "skilling": [
    "Fertigkeiten",
    "habilidades",
    "vaardigheden",
    "abilità",
    "compétences"
  ],
  "mixed": [
    "Gemischt",
    "mixto",
    "gemengd",
    "misto",
    "mixte"
  ],
  "LFG": [
    "GRUPPENSUCHE",
    "BUSCA GRUPO",
    "ZOEKT GROEP",
    "CERCA GRUPPO",
    "CHERCHE GROUPE"
  ],
  "LFM": [
    "MITGLIEDERSUCHE",
    "BUSCA MIEMBROS",
    "ZOEKT LEDEN",
    "CERCA MEMBRI",
    "CHERCHE MEMBRES"
  ],
  "GUILD SEEKER": [
    "GILDENSUCHENDER",
    "BUSCA GREMIO",
    "ZOEKT GILDE",
    "CERCA GILDA",
    "CHERCHE GUILDE"
  ],
  "GUILD RECRUITING": [
    "GILDE REKRUTIERT",
    "GREMIO RECLUTANDO",
    "GILDE WERFT",
    "GILDA RECLUTA",
    "GUILDE RECRUTE"
  ],
  "Expired": [
    "Abgelaufen",
    "Caducado",
    "Verlopen",
    "Scaduto",
    "Expiré"
  ],
  "{count}h left": [
    "Noch {count} Std.",
    "Quedan {count} h",
    "Nog {count} u",
    "{count} h rimaste",
    "{count} h restantes"
  ],
  "{count}d left": [
    "Noch {count} Tage",
    "Quedan {count} d",
    "Nog {count} d",
    "{count} g rimasti",
    "{count} j restants"
  ],
  "Combat {level}+": [
    "Kampf {level}+",
    "Combate {level}+",
    "Gevecht {level}+",
    "Combattimento {level}+",
    "Combat {level}+"
  ],
  "Total {level}+": [
    "Gesamt {level}+",
    "Total {level}+",
    "Totaal {level}+",
    "Totale {level}+",
    "Total {level}+"
  ],
  "Casual": [
    "Entspannt",
    "Casual",
    "Ontspannen",
    "Informale",
    "Détente"
  ],
  "Active": [
    "Aktiv",
    "Activo",
    "Actief",
    "Attivo",
    "Actif"
  ],
  "Hardcore": [
    "Intensiv",
    "Intensivo",
    "Intensief",
    "Intensivo",
    "Intensif"
  ],
  "RANKINGS": [
    "RANGLISTEN",
    "CLASIFICACIONES",
    "RANGLIJSTEN",
    "CLASSIFICHE",
    "CLASSEMENTS"
  ],
  "VELDRYN Rankings": [
    "VELDRYN-Ranglisten",
    "Clasificaciones de VELDRYN",
    "VELDRYN-ranglijsten",
    "Classifiche VELDRYN",
    "Classements VELDRYN"
  ],
  "Prestige, not power": [
    "Prestige, keine Macht",
    "Prestigio, no poder",
    "Prestige, geen macht",
    "Prestigio, non potere",
    "Du prestige, pas de puissance"
  ],
  "Rankings are read-only, server-calculated, and provide no exclusive combat power. Account boards respect Public Profile visibility and block relationships.": [
    "Ranglisten sind schreibgeschützt, vom Server berechnet und verleihen keine exklusive Kampfkraft. Kontoranglisten beachten die Sichtbarkeit öffentlicher Profile und Blockierungen.",
    "Las clasificaciones son de solo lectura, calculadas por el servidor y no otorgan poder de combate exclusivo. Respetan la visibilidad del perfil público y los bloqueos.",
    "Ranglijsten zijn alleen-lezen, door de server berekend en geven geen exclusieve gevechtskracht. Accountranglijsten respecteren openbare profielzichtbaarheid en blokkeringen.",
    "Le classifiche sono in sola lettura, calcolate dal server e non danno potere di combattimento esclusivo. Rispettano la visibilità del profilo pubblico e i blocchi.",
    "Les classements sont en lecture seule, calculés par le serveur et ne confèrent aucune puissance exclusive. Ils respectent la visibilité du profil public et les blocages."
  ],
  "Public Profile": [
    "Öffentliches Profil",
    "Perfil público",
    "Openbaar profiel",
    "Profilo pubblico",
    "Profil public"
  ],
  "SCOPE": [
    "BEREICH",
    "ÁMBITO",
    "BEREIK",
    "AMBITO",
    "PORTÉE"
  ],
  "BOARD": [
    "RANGLISTE",
    "TABLA",
    "BORD",
    "CLASSIFICA",
    "TABLEAU"
  ],
  "Loading rankings": [
    "Ranglisten werden geladen",
    "Cargando clasificaciones",
    "Ranglijsten laden",
    "Caricamento classifiche",
    "Chargement des classements"
  ],
  "Fetching the latest server-calculated board.": [
    "Neueste serverberechnete Rangliste wird geladen.",
    "Obteniendo la clasificación más reciente del servidor.",
    "Nieuwste door de server berekende ranglijst ophalen.",
    "Recupero dell’ultima classifica calcolata dal server.",
    "Récupération du dernier classement calculé par le serveur."
  ],
  "YOUR STANDING": [
    "DEIN RANG",
    "TU POSICIÓN",
    "JOUW POSITIE",
    "LA TUA POSIZIONE",
    "VOTRE POSITION"
  ],
  "No ranked entries yet": [
    "Noch keine Ranglisteneinträge",
    "Aún no hay entradas clasificadas",
    "Nog geen ranglijstvermeldingen",
    "Ancora nessuna voce classificata",
    "Aucune entrée classée"
  ],
  "This board will populate when eligible public results are available.": [
    "Diese Rangliste füllt sich, sobald berechtigte öffentliche Ergebnisse vorliegen.",
    "Esta tabla se llenará cuando haya resultados públicos válidos.",
    "Dit bord vult zich zodra geldige openbare resultaten beschikbaar zijn.",
    "Questa classifica si popolerà quando saranno disponibili risultati pubblici idonei.",
    "Ce tableau se remplira lorsque des résultats publics éligibles seront disponibles."
  ],
  "Rankings require the authenticated online server.": [
    "Ranglisten benötigen den authentifizierten Onlineserver.",
    "Las clasificaciones requieren el servidor en línea autenticado.",
    "Ranglijsten vereisen de geauthenticeerde online server.",
    "Le classifiche richiedono il server online autenticato.",
    "Les classements nécessitent le serveur en ligne authentifié."
  ],
  "Could not load Rankings.": [
    "Ranglisten konnten nicht geladen werden.",
    "No se pudieron cargar las clasificaciones.",
    "Ranglijsten konden niet worden geladen.",
    "Impossibile caricare le classifiche.",
    "Impossible de charger les classements."
  ],
  "YOU": [
    "DU",
    "TÚ",
    "JIJ",
    "TU",
    "VOUS"
  ],
  "GUILD": [
    "GILDE",
    "GREMIO",
    "GILDE",
    "GILDA",
    "GUILDE"
  ],
  "PLAYER": [
    "SPIELER",
    "JUGADOR",
    "SPELER",
    "GIOCATORE",
    "JOUEUR"
  ],
  "Account": [
    "Konto",
    "Cuenta",
    "Account",
    "Account",
    "Compte"
  ],
  "Professions": [
    "Berufe",
    "Profesiones",
    "Beroepen",
    "Professioni",
    "Métiers"
  ],
  "Competitive": [
    "Wettkampf",
    "Competitivo",
    "Competitief",
    "Competitivo",
    "Compétitif"
  ],
  "Dungeons": [
    "Dungeons",
    "Mazmorras",
    "Kerkers",
    "Dungeon",
    "Donjons"
  ],
  "Guilds": [
    "Gilden",
    "Gremios",
    "Gilden",
    "Gilde",
    "Guildes"
  ],
  "Profession Total": [
    "Berufssumme",
    "Total de profesiones",
    "Beroepentotaal",
    "Totale professioni",
    "Total des métiers"
  ],
  "Achievement Score": [
    "Erfolgspunkte",
    "Puntuación de logros",
    "Prestatiescore",
    "Punteggio imprese",
    "Score de succès"
  ],
  "Mining": [
    "Bergbau",
    "Minería",
    "Mijnbouw",
    "Estrazione",
    "Minage"
  ],
  "Woodcutting": [
    "Holzfällen",
    "Tala",
    "Houthakken",
    "Taglio legna",
    "Bûcheronnage"
  ],
  "Fishing": [
    "Angeln",
    "Pesca",
    "Vissen",
    "Pesca",
    "Pêche"
  ],
  "Smithing": [
    "Schmieden",
    "Herrería",
    "Smeden",
    "Forgiatura",
    "Forge"
  ],
  "Cooking": [
    "Kochen",
    "Cocina",
    "Koken",
    "Cucina",
    "Cuisine"
  ],
  "Herbalism": [
    "Kräuterkunde",
    "Herboristería",
    "Kruidenkunde",
    "Erboristeria",
    "Herboristerie"
  ],
  "Alchemy": [
    "Alchemie",
    "Alquimia",
    "Alchemie",
    "Alchimia",
    "Alchimie"
  ],
  "Hunting": [
    "Jagd",
    "Caza",
    "Jagen",
    "Caccia",
    "Chasse"
  ],
  "Exploration": [
    "Erkundung",
    "Exploración",
    "Verkenning",
    "Esplorazione",
    "Exploration"
  ],
  "Tailoring": [
    "Schneiderei",
    "Sastrería",
    "Kleermaken",
    "Sartoria",
    "Couture"
  ],
  "Enchanting": [
    "Verzaubern",
    "Encantamiento",
    "Betovering",
    "Incantamento",
    "Enchantement"
  ],
  "Faith": [
    "Glaube",
    "Fe",
    "Geloof",
    "Fede",
    "Foi"
  ],
  "Arena Rating": [
    "Arenawertung",
    "Puntuación de arena",
    "Arenascore",
    "Valutazione arena",
    "Cote d’arène"
  ],
  "Arena Wins": [
    "Arenasiege",
    "Victorias de arena",
    "Arenaoverwinningen",
    "Vittorie in arena",
    "Victoires en arène"
  ],
  "Dungeon Tier": [
    "Dungeonstufe",
    "Nivel de mazmorra",
    "Kerkerniveau",
    "Grado dungeon",
    "Palier de donjon"
  ],
  "Dungeon Clears": [
    "Dungeonabschlüsse",
    "Mazmorras completadas",
    "Voltooide kerkers",
    "Dungeon completati",
    "Donjons terminés"
  ],
  "Guild Prestige": [
    "Gildenprestige",
    "Prestigio del gremio",
    "Gildeprestige",
    "Prestigio di gilda",
    "Prestige de guilde"
  ],
  "Combined server-tracked profession levels across all account characters.": [
    "Kombinierte, servererfasste Berufsstufen aller Charaktere des Kontos.",
    "Niveles de profesión sumados de todos los personajes de la cuenta, registrados por el servidor.",
    "Gecombineerde beroepsniveaus van alle accountpersonages, bijgehouden door de server.",
    "Livelli di professione combinati di tutti i personaggi dell’account, registrati dal server.",
    "Niveaux de métiers cumulés de tous les personnages du compte, suivis par le serveur."
  ],
  "Prestige points from claimed account achievements.": [
    "Prestigepunkte aus abgeholten Kontoerfolgen.",
    "Puntos de prestigio de logros de cuenta reclamados.",
    "Prestigepunten van opgehaalde accountprestaties.",
    "Punti prestigio dalle imprese dell’account riscosse.",
    "Points de prestige des succès de compte réclamés."
  ],
  "Highest {profession} level on one account character.": [
    "Höchste Stufe in {profession} eines Kontocharakters.",
    "Mayor nivel de {profession} en un personaje de la cuenta.",
    "Hoogste niveau in {profession} op één accountpersonage.",
    "Livello massimo in {profession} su un personaggio dell’account.",
    "Niveau maximal en {profession} sur un personnage du compte."
  ],
  "Current Arena-season rating.": [
    "Wertung der aktuellen Arenasaison.",
    "Puntuación de la temporada de arena actual.",
    "Score van het huidige arenaseizoen.",
    "Valutazione della stagione arena attuale.",
    "Cote de la saison d’arène actuelle."
  ],
  "Current Arena-season wins.": [
    "Siege der aktuellen Arenasaison.",
    "Victorias de la temporada de arena actual.",
    "Overwinningen in het huidige arenaseizoen.",
    "Vittorie della stagione arena attuale.",
    "Victoires de la saison d’arène actuelle."
  ],
  "Highest cleared co-op tier, then clears at that tier.": [
    "Höchste abgeschlossene Koop-Stufe, dann Abschlüsse dieser Stufe.",
    "Mayor nivel cooperativo completado, luego victorias en ese nivel.",
    "Hoogste voltooide coöpniveau, daarna voltooiingen op dat niveau.",
    "Grado cooperativo massimo completato, poi completamenti a quel grado.",
    "Palier coopératif maximal terminé, puis réussites à ce palier."
  ],
  "Lifetime participant clear entitlements from co-op Dungeons.": [
    "Bisherige Abschlussberechtigungen als Teilnehmer an Koop-Dungeons.",
    "Derechos de finalización acumulados como participante en mazmorras cooperativas.",
    "Alle voltooide coöpkerkers waarvoor deelname is erkend.",
    "Diritti di completamento totali come partecipante ai dungeon cooperativi.",
    "Total des droits de réussite comme participant aux donjons coopératifs."
  ],
  "Guild level, then Guild XP. Prestige-only.": [
    "Gildenstufe, dann Gilden-EP. Nur Prestige.",
    "Nivel del gremio, luego EXP del gremio. Solo prestigio.",
    "Gildeniveau, daarna gilde-XP. Alleen prestige.",
    "Livello di gilda, poi PE di gilda. Solo prestigio.",
    "Niveau de guilde, puis EXP de guilde. Prestige uniquement."
  ],
  "{value} levels": [
    "{value} Stufen",
    "{value} niveles",
    "{value} niveaus",
    "{value} livelli",
    "{value} niveaux"
  ],
  "{value} points": [
    "{value} Punkte",
    "{value} puntos",
    "{value} punten",
    "{value} punti",
    "{value} points"
  ],
  "{value} level": [
    "{value} Stufe",
    "{value} nivel",
    "{value} niveau",
    "{value} livello",
    "{value} niveau"
  ],
  "{value} rating": [
    "{value} Wertung",
    "{value} puntuación",
    "{value} score",
    "{value} valutazione",
    "{value} cote"
  ],
  "{value} wins": [
    "{value} Siege",
    "{value} victorias",
    "{value} overwinningen",
    "{value} vittorie",
    "{value} victoires"
  ],
  "{value} clears": [
    "{value} Abschlüsse",
    "{value} completadas",
    "{value} voltooiingen",
    "{value} completamenti",
    "{value} réussites"
  ],
  "Tier {value}": [
    "Stufe {value}",
    "Nivel {value}",
    "Niveau {value}",
    "Grado {value}",
    "Palier {value}"
  ],
  "FUTURE FEATURE": [
    "KÜNFTIGE FUNKTION",
    "FUNCIÓN FUTURA",
    "TOEKOMSTIGE FUNCTIE",
    "FUNZIONE FUTURA",
    "FONCTION À VENIR"
  ],
  "Arena": [
    "Arena",
    "Arena",
    "Arena",
    "Arena",
    "Arène"
  ],
  "Arena is coming later": [
    "Arena erscheint später",
    "La arena llegará más adelante",
    "Arena komt later",
    "L’arena arriverà in seguito",
    "L’arène arrivera plus tard"
  ],
  "The three-character Arena, server-frozen companion snapshots, and 3v3 combat replay are authored and tested, but Arena will not be available at release. It will open in a later authenticated service update, like World Bosses.": [
    "Die Arena mit drei Charakteren, serverfixierten Begleiterabbildern und 3-gegen-3-Wiederholung ist entwickelt und getestet, aber nicht zum Start verfügbar. Sie folgt wie Weltbosse in einem späteren Update des authentifizierten Dienstes.",
    "La arena de tres personajes, las instantáneas de compañeros y la repetición 3c3 están desarrolladas y probadas, pero llegarán tras el lanzamiento mediante una actualización del servicio autenticado, como los jefes del mundo.",
    "De arena met drie personages, vastgelegde metgezellen en 3-tegen-3-herhaling is ontwikkeld en getest, maar komt na de lancering via een update van de geauthenticeerde dienst, net als wereldbazen.",
    "L’arena a tre personaggi, le istantanee dei compagni e i replay 3 contro 3 sono sviluppati e testati, ma arriveranno dopo il lancio con un aggiornamento del servizio autenticato, come i boss mondiali.",
    "L’arène à trois personnages, les instantanés de compagnons et les replays 3 contre 3 sont développés et testés, mais arriveront après le lancement avec une mise à jour du service authentifié, comme les boss mondiaux."
  ],
  "UNAVAILABLE AT RELEASE": [
    "ZUM START NICHT VERFÜGBAR",
    "NO DISPONIBLE AL LANZAMIENTO",
    "NIET BESCHIKBAAR BIJ LANCERING",
    "NON DISPONIBILE AL LANCIO",
    "INDISPONIBLE AU LANCEMENT"
  ],
  "What is planned": [
    "Was geplant ist",
    "Qué está previsto",
    "Wat gepland staat",
    "Cosa è previsto",
    "Ce qui est prévu"
  ],
  "Three character profiles versus three opponent profiles, with Front / Middle / Back lanes, companion snapshot badges, deterministic rounds, attack effects, hit feedback, and a final result screen.": [
    "Drei Charakterprofile gegen drei Gegnerprofile mit vorderer, mittlerer und hinterer Reihe, Begleiterabzeichen, deterministischen Runden, Angriffseffekten, Trefferanzeige und Ergebnisbildschirm.",
    "Tres perfiles contra tres rivales, con filas delantera, central y trasera, insignias de compañeros, rondas deterministas, efectos de ataque, impactos y pantalla de resultados.",
    "Drie personages tegen drie tegenstanders, met voor-, midden- en achterposities, metgezelbadges, deterministische rondes, aanvalseffecten, trefferfeedback en een resultatenscherm.",
    "Tre profili contro tre avversari, con file anteriore, centrale e posteriore, stemmi dei compagni, turni deterministici, effetti di attacco, riscontri dei colpi e risultati finali.",
    "Trois profils contre trois adversaires, avec lignes avant, milieu et arrière, badges de compagnons, manches déterministes, effets d’attaque, impacts et écran de résultats."
  ],
  "THREE-CHARACTER MODE": [
    "DREI-CHARAKTER-MODUS",
    "MODO DE TRES PERSONAJES",
    "MODUS MET DRIE PERSONAGES",
    "MODALITÀ A TRE PERSONAGGI",
    "MODE À TROIS PERSONNAGES"
  ],
  "Build your squad": [
    "Stelle dein Team zusammen",
    "Forma tu escuadrón",
    "Stel je team samen",
    "Crea la tua squadra",
    "Composez votre équipe"
  ],
  "Choose three characters from this account for Front, Middle, and Back. Any role mix is valid. Ranked matches remain disabled until the authenticated Arena service is enabled.": [
    "Wähle drei Charaktere dieses Kontos für vorne, Mitte und hinten. Jede Rollenmischung ist erlaubt. Ranglistenkämpfe bleiben bis zur Aktivierung des authentifizierten Arenadienstes gesperrt.",
    "Elige tres personajes de esta cuenta para delante, centro y atrás. Cualquier mezcla de roles es válida. Las partidas clasificatorias se activarán con el servicio de arena autenticado.",
    "Kies drie accountpersonages voor vooraan, midden en achteraan. Elke rolmix is geldig. Rangwedstrijden blijven uitgeschakeld totdat de geauthenticeerde arenadienst actief is.",
    "Scegli tre personaggi dell’account per davanti, centro e dietro. Ogni combinazione di ruoli è valida. Le partite classificate resteranno disattivate fino all’attivazione del servizio arena autenticato.",
    "Choisissez trois personnages du compte pour l’avant, le milieu et l’arrière. Tout mélange de rôles est valide. Les matchs classés restent désactivés jusqu’à l’activation du service d’arène authentifié."
  ],
  "{count}/3 selected · minimum level {level}": [
    "{count}/3 gewählt · Mindeststufe {level}",
    "{count}/3 elegidos · nivel mínimo {level}",
    "{count}/3 gekozen · minimumniveau {level}",
    "{count}/3 scelti · livello minimo {level}",
    "{count}/3 sélectionnés · niveau minimum {level}"
  ],
  "Formation ready": [
    "Formation bereit",
    "Formación lista",
    "Formatie klaar",
    "Formazione pronta",
    "Formation prête"
  ],
  "Select three different account characters.": [
    "Wähle drei verschiedene Kontocharaktere.",
    "Elige tres personajes distintos de la cuenta.",
    "Kies drie verschillende accountpersonages.",
    "Scegli tre personaggi diversi dell’account.",
    "Sélectionnez trois personnages différents du compte."
  ],
  "Every Arena character must be level {level} or higher.": [
    "Jeder Arenacharakter muss mindestens Stufe {level} haben.",
    "Todos los personajes de arena deben tener nivel {level} o superior.",
    "Elk arenapersonage moet minimaal niveau {level} zijn.",
    "Ogni personaggio dell’arena deve essere almeno di livello {level}.",
    "Chaque personnage d’arène doit être de niveau {level} ou supérieur."
  ],
  "The saved Arena squad is invalid.": [
    "Das gespeicherte Arenateam ist ungültig.",
    "El escuadrón de arena guardado no es válido.",
    "Het opgeslagen arenateam is ongeldig.",
    "La squadra arena salvata non è valida.",
    "L’équipe d’arène enregistrée est invalide."
  ],
  "Front": [
    "Vorne",
    "Delante",
    "Vooraan",
    "Davanti",
    "Avant"
  ],
  "Middle": [
    "Mitte",
    "Centro",
    "Midden",
    "Centro",
    "Milieu"
  ],
  "Back lane": [
    "Hinten",
    "Atrás",
    "Achteraan",
    "Dietro",
    "Arrière"
  ],
  "Clear slot": [
    "Platz leeren",
    "Vaciar espacio",
    "Plek leegmaken",
    "Svuota posto",
    "Vider l’emplacement"
  ],
  "No character selected.": [
    "Kein Charakter gewählt.",
    "Ningún personaje seleccionado.",
    "Geen personage geselecteerd.",
    "Nessun personaggio selezionato.",
    "Aucun personnage sélectionné."
  ],
  "Arena integrity": [
    "Arenaintegrität",
    "Integridad de arena",
    "Arena-integriteit",
    "Integrità dell’arena",
    "Intégrité de l’arène"
  ],
  "The server will freeze and verify each character’s loadout before a ranked duel. Client saves only the account-owned slot selection.": [
    "Der Server fixiert und prüft vor einem gewerteten Duell die Ausrüstung jedes Charakters. Der Client speichert nur die Platzauswahl des Kontos.",
    "El servidor fijará y verificará el equipo de cada personaje antes del duelo. El cliente solo guarda la selección de espacios de la cuenta.",
    "De server legt de uitrusting van elk personage vast en controleert die voor een rangduel. De client bewaart alleen de gekozen accountposities.",
    "Il server fisserà e verificherà l’equipaggiamento prima di un duello classificato. Il client salva solo i posti scelti dell’account.",
    "Le serveur figera et vérifiera l’équipement de chaque personnage avant un duel classé. Le client n’enregistre que les emplacements choisis du compte."
  ],
  "Retry pending co-op action": [
    "Ausstehende Koop-Aktion wiederholen",
    "Reintentar acción cooperativa pendiente",
    "Openstaande coöpactie opnieuw proberen",
    "Riprova azione cooperativa in sospeso",
    "Réessayer l’action coopérative en attente"
  ],
  "Echo sharing": [
    "Echo teilen",
    "Compartir Echo",
    "Echo delen",
    "Condivisione Echo",
    "Partage d’Echo"
  ],
  "Sharing an Echo lets other players recruit a snapshot of your character for 24 hours.": [
    "Wenn du ein Echo teilst, können andere Spieler 24 Stunden lang ein Abbild deines Charakters rekrutieren.",
    "Compartir un Echo permite a otros jugadores reclutar una instantánea de tu personaje durante 24 horas.",
    "Door een Echo te delen kunnen andere spelers 24 uur lang een momentopname van je personage rekruteren.",
    "Condividere un Echo permette ad altri giocatori di reclutare un’istantanea del personaggio per 24 ore.",
    "Partager un Echo permet aux autres joueurs de recruter un instantané de votre personnage pendant 24 heures."
  ],
  "Stop sharing my Echo": [
    "Mein Echo nicht mehr teilen",
    "Dejar de compartir mi Echo",
    "Mijn Echo niet meer delen",
    "Smetti di condividere il mio Echo",
    "Ne plus partager mon Echo"
  ],
  "Share my Echo": [
    "Mein Echo teilen",
    "Compartir mi Echo",
    "Mijn Echo delen",
    "Condividi il mio Echo",
    "Partager mon Echo"
  ],
  "Invalid run response.": [
    "Ungültige Laufantwort.",
    "Respuesta de partida no válida.",
    "Ongeldig runantwoord.",
    "Risposta della partita non valida.",
    "Réponse de partie invalide."
  ],
  "Invalid active Live run response.": [
    "Ungültige Antwort des aktiven Live-Laufs.",
    "Respuesta de partida activa en vivo no válida.",
    "Ongeldig antwoord van actieve live-run.",
    "Risposta della partita Live attiva non valida.",
    "Réponse de partie active en direct invalide."
  ],
  "Invalid Live run response.": [
    "Ungültige Live-Laufantwort.",
    "Respuesta de partida en vivo no válida.",
    "Ongeldig antwoord van live-run.",
    "Risposta della partita Live non valida.",
    "Réponse de partie en direct invalide."
  ],
  "This active event does not currently offer a launchable seasonal expedition.": [
    "Dieses aktive Event bietet derzeit keine startbare saisonale Expedition.",
    "Este evento activo no ofrece ahora una expedición de temporada disponible.",
    "Dit actieve evenement biedt momenteel geen startbare seizoensexpeditie.",
    "Questo evento attivo non offre al momento una spedizione stagionale avviabile.",
    "Cet événement actif ne propose actuellement aucune expédition saisonnière lançable."
  ],
  "That dungeon source is not currently available in the dungeon catalog.": [
    "Diese Dungeonquelle ist derzeit nicht im Katalog verfügbar.",
    "Esta fuente de mazmorra no está disponible en el catálogo.",
    "Die kerkerbron is momenteel niet beschikbaar in de catalogus.",
    "Questa fonte di dungeon non è disponibile nel catalogo.",
    "Cette source de donjon n’est pas disponible dans le catalogue."
  ],
  "That dungeon is no longer available for this character.": [
    "Dieser Dungeon ist für diesen Charakter nicht mehr verfügbar.",
    "Esta mazmorra ya no está disponible para este personaje.",
    "Die kerker is niet meer beschikbaar voor dit personage.",
    "Questo dungeon non è più disponibile per il personaggio.",
    "Ce donjon n’est plus disponible pour ce personnage."
  ],
  "No verified Live-ready loadout is available. Refresh your co-op loadout first.": [
    "Keine geprüfte Live-bereite Ausrüstung verfügbar. Aktualisiere zuerst deine Koop-Ausrüstung.",
    "No hay equipo verificado listo para jugar en vivo. Actualiza primero tu equipo cooperativo.",
    "Geen geverifieerde uitrusting klaar voor live beschikbaar. Vernieuw eerst je coöpuitrusting.",
    "Nessun equipaggiamento verificato pronto per Live. Aggiorna prima l’equipaggiamento cooperativo.",
    "Aucun équipement vérifié prêt pour le direct. Actualisez d’abord votre équipement coopératif."
  ],
  "No verified expedition-ready loadout is available. Refresh your co-op loadout first.": [
    "Keine geprüfte expeditionsbereite Ausrüstung verfügbar. Aktualisiere zuerst deine Koop-Ausrüstung.",
    "No hay equipo verificado listo para expediciones. Actualiza primero tu equipo cooperativo.",
    "Geen geverifieerde expeditieklare uitrusting beschikbaar. Vernieuw eerst je coöpuitrusting.",
    "Nessun equipaggiamento verificato pronto per spedizioni. Aggiorna prima l’equipaggiamento cooperativo.",
    "Aucun équipement vérifié prêt pour une expédition. Actualisez d’abord votre équipement coopératif."
  ],
  "Live LFG posted for 30 minutes.": [
    "Live-Gruppensuche für 30 Minuten veröffentlicht.",
    "Anuncio de grupo en vivo publicado por 30 minutos.",
    "Live-groepszoekbericht geplaatst voor 30 minuten.",
    "Annuncio gruppo Live pubblicato per 30 minuti.",
    "Annonce de groupe en direct publiée pour 30 minutes."
  ],
  "Live LFG removed.": [
    "Live-Gruppensuche entfernt.",
    "Anuncio de grupo en vivo eliminado.",
    "Live-groepszoekbericht verwijderd.",
    "Annuncio gruppo Live rimosso.",
    "Annonce de groupe en direct retirée."
  ],
  "Refresh this run before choosing.": [
    "Aktualisiere diesen Lauf vor der Auswahl.",
    "Actualiza esta partida antes de elegir.",
    "Vernieuw deze run voordat je kiest.",
    "Aggiorna la partita prima di scegliere.",
    "Actualisez cette partie avant de choisir."
  ],
  "Collect {marks} event currency": [
    "{marks} Eventwährung abholen",
    "Recoger {marks} de moneda del evento",
    "{marks} evenementvaluta ophalen",
    "Raccogli {marks} valuta evento",
    "Récupérer {marks} de monnaie d’événement"
  ],
  "{marks} event currency collected.": [
    "{marks} Eventwährung abgeholt.",
    "{marks} de moneda del evento recogida.",
    "{marks} evenementvaluta opgehaald.",
    "{marks} valuta evento raccolta.",
    "{marks} de monnaie d’événement récupérée."
  ],
  "{marks} event currency and reputation collected.": [
    "{marks} Eventwährung und Ruf abgeholt.",
    "{marks} de moneda del evento y reputación recogidas.",
    "{marks} evenementvaluta en reputatie opgehaald.",
    "{marks} valuta evento e reputazione raccolte.",
    "{marks} de monnaie d’événement et réputation récupérées."
  ],
  "{marks} Expedition Marks collected.": [
    "{marks} Expeditionsmarken abgeholt.",
    "{marks} marcas de expedición recogidas.",
    "{marks} expeditiemerken opgehaald.",
    "{marks} marche spedizione raccolte.",
    "{marks} marques d’expédition récupérées."
  ],
  "{marks} Expedition Marks collected. Includes +{bonus} Live Fellowship bonus.": [
    "{marks} Expeditionsmarken abgeholt. Enthält +{bonus} Live-Gemeinschaftsbonus.",
    "{marks} marcas de expedición recogidas. Incluye +{bonus} de compañerismo en vivo.",
    "{marks} expeditiemerken opgehaald. Inclusief +{bonus} live-samenwerkingsbonus.",
    "{marks} marche spedizione raccolte. Include +{bonus} bonus compagnia Live.",
    "{marks} marques d’expédition récupérées. Inclut +{bonus} de bonus de camaraderie en direct."
  ],
  "Live matchmaking is not enabled yet.": [
    "Live-Spielersuche ist noch nicht aktiviert.",
    "El emparejamiento en vivo aún no está activado.",
    "Live-matchmaking is nog niet ingeschakeld.",
    "Il matchmaking Live non è ancora attivo.",
    "La recherche de groupe en direct n’est pas encore activée."
  ],
  "World": [
    "Welt",
    "Mundo",
    "Wereld",
    "Mondo",
    "Monde"
  ],
  "Party": [
    "Gruppe",
    "Grupo",
    "Groep",
    "Gruppo",
    "Groupe"
  ],
  "Events": [
    "Events",
    "Eventos",
    "Evenementen",
    "Eventi",
    "Événements"
  ],
  "Rankings": [
    "Ranglisten",
    "Clasificaciones",
    "Ranglijsten",
    "Classifiche",
    "Classements"
  ],
  "System": [
    "System",
    "Sistema",
    "Systeem",
    "Sistema",
    "Système"
  ],
  "WORLD": [
    "WELT",
    "MUNDO",
    "WERELD",
    "MONDO",
    "MONDE"
  ],
  "CHAT": [
    "CHAT",
    "CHAT",
    "CHAT",
    "CHAT",
    "DISCUSSION"
  ],
  "Open chat": [
    "Chat öffnen",
    "Abrir chat",
    "Chat openen",
    "Apri chat",
    "Ouvrir la discussion"
  ],
  "Close chat": [
    "Chat schließen",
    "Cerrar chat",
    "Chat sluiten",
    "Chiudi chat",
    "Fermer la discussion"
  ],
  "Opens full chat": [
    "Öffnet den vollständigen Chat",
    "Abre el chat completo",
    "Opent de volledige chat",
    "Apre la chat completa",
    "Ouvre la discussion complète"
  ],
  "World chat is quiet.": [
    "Im Weltchat ist es ruhig.",
    "El chat mundial está tranquilo.",
    "De wereldchat is rustig.",
    "La chat mondiale è silenziosa.",
    "La discussion mondiale est calme."
  ],
  "Tap to open chat.": [
    "Tippen, um den Chat zu öffnen.",
    "Toca para abrir el chat.",
    "Tik om de chat te openen.",
    "Tocca per aprire la chat.",
    "Touchez pour ouvrir la discussion."
  ],
  "Open chat. Latest World message from {name}: {message}": [
    "Chat öffnen. Neueste Weltnachricht von {name}: {message}",
    "Abrir chat. Último mensaje mundial de {name}: {message}",
    "Chat openen. Laatste wereldbericht van {name}: {message}",
    "Apri chat. Ultimo messaggio mondiale di {name}: {message}",
    "Ouvrir la discussion. Dernier message mondial de {name} : {message}"
  ],
  "{count} unread": [
    "{count} ungelesen",
    "{count} sin leer",
    "{count} ongelezen",
    "{count} non letti",
    "{count} non lus"
  ],
  "NEW MESSAGES": [
    "NEUE NACHRICHTEN",
    "MENSAJES NUEVOS",
    "NIEUWE BERICHTEN",
    "NUOVI MESSAGGI",
    "NOUVEAUX MESSAGES"
  ],
  "Jump to {count} new messages": [
    "Zu {count} neuen Nachrichten springen",
    "Ir a {count} mensajes nuevos",
    "Naar {count} nieuwe berichten",
    "Vai a {count} nuovi messaggi",
    "Aller aux {count} nouveaux messages"
  ],
  "↓ {count} NEW": [
    "↓ {count} NEU",
    "↓ {count} NUEVOS",
    "↓ {count} NIEUW",
    "↓ {count} NUOVI",
    "↓ {count} NOUVEAUX"
  ],
  "Mention {name}": [
    "{name} erwähnen",
    "Mencionar a {name}",
    "{name} vermelden",
    "Menziona {name}",
    "Mentionner {name}"
  ],
  "World language: {language}": [
    "Weltsprache: {language}",
    "Idioma mundial: {language}",
    "Wereldtaal: {language}",
    "Lingua mondiale: {language}",
    "Langue mondiale : {language}"
  ],
  "Open emote tray": [
    "Emote-Leiste öffnen",
    "Abrir bandeja de emoticonos",
    "Emotevak openen",
    "Apri barra emote",
    "Ouvrir la barre d’émotes"
  ],
  "Reset": [
    "Zurücksetzen",
    "Restablecer",
    "Herstellen",
    "Ripristina",
    "Réinitialiser"
  ],
  "Save 5": [
    "5 speichern",
    "Guardar 5",
    "5 opslaan",
    "Salva 5",
    "Enregistrer 5"
  ],
  "Tap selected emotes to remove them, then choose replacements below. Save becomes available when all 5 slots are filled.": [
    "Tippe auf gewählte Emotes, um sie zu entfernen, und wähle unten Ersatz. Speichern ist verfügbar, sobald alle 5 Plätze belegt sind.",
    "Toca los emoticonos seleccionados para quitarlos y elige otros abajo. Podrás guardar cuando llenes los 5 espacios.",
    "Tik op gekozen emotes om ze te verwijderen en kies hieronder vervangers. Opslaan kan zodra alle 5 plekken gevuld zijn.",
    "Tocca le emote selezionate per rimuoverle e scegli altre qui sotto. Puoi salvare quando tutti gli 5 posti sono pieni.",
    "Touchez les émotes choisies pour les retirer, puis choisissez des remplacements. L’enregistrement est possible lorsque les 5 emplacements sont remplis."
  ],
  "THIS IS YOUR PROFILE": [
    "DAS IST DEIN PROFIL",
    "ESTE ES TU PERFIL",
    "DIT IS JE PROFIEL",
    "QUESTO È IL TUO PROFILO",
    "CECI EST VOTRE PROFIL"
  ],
  "Edit your biography, favorites, privacy and showcases from Account → Profile.": [
    "Bearbeite Biografie, Favoriten, Privatsphäre und Ausstellungen unter Konto → Profil.",
    "Edita biografía, favoritos, privacidad y vitrinas desde Cuenta → Perfil.",
    "Bewerk biografie, favorieten, privacy en vitrines via Account → Profiel.",
    "Modifica biografia, preferiti, privacy e vetrine da Account → Profilo.",
    "Modifiez biographie, favoris, confidentialité et vitrines depuis Compte → Profil."
  ],
  "PLAYER ACTIONS": [
    "SPIELERAKTIONEN",
    "ACCIONES DEL JUGADOR",
    "SPELERSACTIES",
    "AZIONI GIOCATORE",
    "ACTIONS DU JOUEUR"
  ],
  "Friend status could not refresh; showing the last known state.": [
    "Freundesstatus konnte nicht aktualisiert werden; letzter bekannter Stand wird angezeigt.",
    "No se pudo actualizar la amistad; se muestra el último estado conocido.",
    "Vriendstatus kon niet worden vernieuwd; de laatst bekende status wordt getoond.",
    "Impossibile aggiornare l’amicizia; viene mostrato l’ultimo stato noto.",
    "Impossible d’actualiser l’amitié ; affichage du dernier état connu."
  ],
  "Add friend": [
    "Freund hinzufügen",
    "Añadir amigo",
    "Vriend toevoegen",
    "Aggiungi amico",
    "Ajouter un ami"
  ],
  "Report": [
    "Melden",
    "Denunciar",
    "Melden",
    "Segnala",
    "Signaler"
  ],
  "DIRECT INVITATIONS": [
    "DIREKTE EINLADUNGEN",
    "INVITACIONES DIRECTAS",
    "DIRECTE UITNODIGINGEN",
    "INVITI DIRETTI",
    "INVITATIONS DIRECTES"
  ],
  "Invite to Party": [
    "Zur Gruppe einladen",
    "Invitar al grupo",
    "Uitnodigen voor groep",
    "Invita al gruppo",
    "Inviter au groupe"
  ],
  "Party invite sent": [
    "Gruppeneinladung gesendet",
    "Invitación de grupo enviada",
    "Groepsuitnodiging verstuurd",
    "Invito al gruppo inviato",
    "Invitation de groupe envoyée"
  ],
  "Invite to Guild": [
    "Zur Gilde einladen",
    "Invitar al gremio",
    "Uitnodigen voor gilde",
    "Invita alla gilda",
    "Inviter à la guilde"
  ],
  "Guild invite sent": [
    "Gildeneinladung gesendet",
    "Invitación al gremio enviada",
    "Gilde-uitnodiging verstuurd",
    "Invito alla gilda inviato",
    "Invitation de guilde envoyée"
  ],
  "Direct invitations are temporarily unavailable.": [
    "Direkte Einladungen sind vorübergehend nicht verfügbar.",
    "Las invitaciones directas no están disponibles temporalmente.",
    "Directe uitnodigingen zijn tijdelijk niet beschikbaar.",
    "Gli inviti diretti non sono temporaneamente disponibili.",
    "Les invitations directes sont temporairement indisponibles."
  ],
  "PLAYER PROFILE": [
    "SPIELERPROFIL",
    "PERFIL DEL JUGADOR",
    "SPELERSPROFIEL",
    "PROFILO GIOCATORE",
    "PROFIL DU JOUEUR"
  ],
  "LOADING PROFILE": [
    "PROFIL WIRD GELADEN",
    "CARGANDO PERFIL",
    "PROFIEL LADEN",
    "CARICAMENTO PROFILO",
    "CHARGEMENT DU PROFIL"
  ],
  "PROFILE BIO": [
    "PROFILBIOGRAFIE",
    "BIOGRAFÍA",
    "PROFIELBIOGRAFIE",
    "BIOGRAFIA",
    "BIOGRAPHIE"
  ],
  "ACHIEVEMENT SHOWCASE": [
    "ERFOLGSAUSSTELLUNG",
    "VITRINA DE LOGROS",
    "PRESTATIEVITRINE",
    "VETRINA IMPRESE",
    "VITRINE DES SUCCÈS"
  ],
  "PERSONAL RECORDS": [
    "PERSÖNLICHE REKORDE",
    "RÉCORDS PERSONALES",
    "PERSOONLIJKE RECORDS",
    "RECORD PERSONALI",
    "RECORDS PERSONNELS"
  ],
  "COLLECTION SHOWCASE": [
    "SAMMLUNGSAUSSTELLUNG",
    "VITRINA DE COLECCIÓN",
    "COLLECTIEVITRINE",
    "VETRINA COLLEZIONE",
    "VITRINE DE COLLECTION"
  ],
  "Retry profile": [
    "Profil erneut laden",
    "Reintentar perfil",
    "Profiel opnieuw laden",
    "Riprova profilo",
    "Recharger le profil"
  ],
  "Guild Chat requires online services. No simulated chat is shown.": [
    "Gildenchat benötigt Onlinedienste. Es wird kein simulierter Chat angezeigt.",
    "El chat del gremio requiere servicios en línea. No se muestra chat simulado.",
    "Gildechat vereist online diensten. Er wordt geen gesimuleerde chat getoond.",
    "La chat di gilda richiede servizi online. Non viene mostrata una chat simulata.",
    "La discussion de guilde nécessite les services en ligne. Aucune discussion simulée n’est affichée."
  ],
  "Join an online Guild to use Guild Chat.": [
    "Tritt einer Onlinegilde bei, um den Gildenchat zu nutzen.",
    "Únete a un gremio en línea para usar su chat.",
    "Word lid van een online gilde om gildechat te gebruiken.",
    "Unisciti a una gilda online per usare la chat.",
    "Rejoignez une guilde en ligne pour utiliser sa discussion."
  ],
  "GUILD CHANNEL": [
    "GILDENKANAL",
    "CANAL DEL GREMIO",
    "GILDEKANAAL",
    "CANALE GILDA",
    "CANAL DE GUILDE"
  ],
  "MEMBERS ONLY": [
    "NUR MITGLIEDER",
    "SOLO MIEMBROS",
    "ALLEEN LEDEN",
    "SOLO MEMBRI",
    "MEMBRES UNIQUEMENT"
  ],
  "No Guild messages yet. Start the conversation.": [
    "Noch keine Gildennachrichten. Beginne das Gespräch.",
    "Aún no hay mensajes. Inicia la conversación.",
    "Nog geen gildeberichten. Begin het gesprek.",
    "Ancora nessun messaggio. Inizia la conversazione.",
    "Aucun message de guilde. Lancez la conversation."
  ],
  "GUILD CHAT UNAVAILABLE": [
    "GILDENCHAT NICHT VERFÜGBAR",
    "CHAT DEL GREMIO NO DISPONIBLE",
    "GILDECHAT NIET BESCHIKBAAR",
    "CHAT DI GILDA NON DISPONIBILE",
    "DISCUSSION DE GUILDE INDISPONIBLE"
  ],
  "Guild message": [
    "Gildennachricht",
    "Mensaje del gremio",
    "Gildebericht",
    "Messaggio di gilda",
    "Message de guilde"
  ],
  "Party Chat is quiet.": [
    "Im Gruppenchat ist es ruhig.",
    "El chat del grupo está tranquilo.",
    "De groepschat is rustig.",
    "La chat del gruppo è silenziosa.",
    "La discussion de groupe est calme."
  ],
  "CHAT UNAVAILABLE": [
    "CHAT NICHT VERFÜGBAR",
    "CHAT NO DISPONIBLE",
    "CHAT NIET BESCHIKBAAR",
    "CHAT NON DISPONIBILE",
    "DISCUSSION INDISPONIBLE"
  ],
  "Party message": [
    "Gruppennachricht",
    "Mensaje del grupo",
    "Groepsbericht",
    "Messaggio di gruppo",
    "Message de groupe"
  ],
  "Message your Party": [
    "Schreibe deiner Gruppe",
    "Escribe a tu grupo",
    "Bericht aan je groep",
    "Scrivi al gruppo",
    "Écrivez à votre groupe"
  ],
  "World chat message": [
    "Weltchatnachricht",
    "Mensaje del chat mundial",
    "Wereldchatbericht",
    "Messaggio chat mondiale",
    "Message de discussion mondiale"
  ],
  "Send message": [
    "Nachricht senden",
    "Enviar mensaje",
    "Bericht versturen",
    "Invia messaggio",
    "Envoyer le message"
  ],
  "Party chat": [
    "Gruppenchat",
    "Chat de grupo",
    "Groepschat",
    "Chat di gruppo",
    "Discussion de groupe"
  ],
  "Only current Live party members can read this room.": [
    "Nur aktuelle Live-Gruppenmitglieder können diesen Raum lesen.",
    "Solo los miembros actuales del grupo en vivo pueden leer esta sala.",
    "Alleen huidige live-groepsleden kunnen deze ruimte lezen.",
    "Solo i membri attuali del gruppo Live possono leggere questa stanza.",
    "Seuls les membres actuels du groupe en direct peuvent lire ce salon."
  ],
  "No messages yet.": [
    "Noch keine Nachrichten.",
    "Aún no hay mensajes.",
    "Nog geen berichten.",
    "Ancora nessun messaggio.",
    "Aucun message pour le moment."
  ],
  "Party chat message": [
    "Gruppenchatnachricht",
    "Mensaje del chat de grupo",
    "Groepschatbericht",
    "Messaggio chat di gruppo",
    "Message de discussion de groupe"
  ],
  "Message your party…": [
    "Schreibe deiner Gruppe…",
    "Escribe a tu grupo…",
    "Bericht aan je groep…",
    "Scrivi al gruppo…",
    "Écrivez à votre groupe…"
  ],
  "No recent Guild activity": [
    "Keine neue Gildenaktivität",
    "Sin actividad reciente del gremio",
    "Geen recente gildeactiviteit",
    "Nessuna attività recente della gilda",
    "Aucune activité récente de guilde"
  ],
  "Project completions, member milestones and Guild events will appear here.": [
    "Projektabschlüsse, Mitgliedsmeilensteine und Gildenevents erscheinen hier.",
    "Aquí aparecerán proyectos completados, hitos de miembros y eventos del gremio.",
    "Projectvoltooiingen, ledenmijlpalen en gilde-evenementen verschijnen hier.",
    "Qui appariranno progetti completati, traguardi dei membri ed eventi di gilda.",
    "Les projets terminés, étapes des membres et événements de guilde apparaîtront ici."
  ],
  "ACTIVE GUILD": [
    "AKTIVE GILDE",
    "GREMIO ACTIVO",
    "ACTIEF GILDE",
    "GILDA ATTIVA",
    "GUILDE ACTIVE"
  ],
  "Activity Reserve": [
    "Aktivitätsreserve",
    "Reserva de actividad",
    "Activiteitsreserve",
    "Riserva attività",
    "Réserve d’activité"
  ],
  "All Guild Activity milestones active.": [
    "Alle Gildenaktivitätsmeilensteine aktiv.",
    "Todos los hitos de actividad activos.",
    "Alle gildeactiviteitsmijlpalen actief.",
    "Tutti i traguardi attività attivi.",
    "Tous les paliers d’activité sont actifs."
  ],
  "Guild visuals": [
    "Gildengestaltung",
    "Diseño del gremio",
    "Gilde-uiterlijk",
    "Aspetto della gilda",
    "Visuels de guilde"
  ],
  "Only the guild leader or an officer can edit these visuals.": [
    "Nur Gildenanführer oder Offiziere können diese Gestaltung ändern.",
    "Solo el líder o un oficial puede editar este diseño.",
    "Alleen de gildeleider of een officier kan dit uiterlijk wijzigen.",
    "Solo il capo o un ufficiale può modificare questi elementi.",
    "Seuls le chef ou un officier peuvent modifier ces visuels."
  ],
  "Guild identity preview": [
    "Vorschau der Gildenidentität",
    "Vista previa de identidad del gremio",
    "Voorbeeld gilde-identiteit",
    "Anteprima identità gilda",
    "Aperçu de l’identité de guilde"
  ],
  "Banner / Emblem": [
    "Banner / Emblem",
    "Estandarte / emblema",
    "Banier / embleem",
    "Stendardo / emblema",
    "Bannière / emblème"
  ],
  "Selected": [
    "Ausgewählt",
    "Seleccionado",
    "Geselecteerd",
    "Selezionato",
    "Sélectionné"
  ],
  "Guild profile border": [
    "Gildenprofilrahmen",
    "Borde del perfil del gremio",
    "Gildeprofielrand",
    "Bordo profilo gilda",
    "Bordure du profil de guilde"
  ],
  "Guild nameplate": [
    "Gildennamensschild",
    "Placa del gremio",
    "Gildenaamplaat",
    "Targhetta gilda",
    "Plaque de guilde"
  ],
  "Guild motto": [
    "Gildenmotto",
    "Lema del gremio",
    "Gildemotto",
    "Motto della gilda",
    "Devise de guilde"
  ],
  "Shown beneath the guild name. Maximum 80 characters.": [
    "Wird unter dem Gildennamen angezeigt. Höchstens 80 Zeichen.",
    "Se muestra bajo el nombre del gremio. Máximo 80 caracteres.",
    "Onder de gildenaam getoond. Maximaal 80 tekens.",
    "Mostrato sotto il nome della gilda. Massimo 80 caratteri.",
    "Affiché sous le nom de guilde. Maximum 80 caractères."
  ],
  "Stronger together.": [
    "Gemeinsam stärker.",
    "Más fuertes juntos.",
    "Samen sterker.",
    "Più forti insieme.",
    "Plus forts ensemble."
  ],
  "ACTIVE": [
    "AKTIV",
    "ACTIVO",
    "ACTIEF",
    "ATTIVO",
    "ACTIF"
  ],
  "No decree choice active": [
    "Keine aktive Dekretauswahl",
    "Sin elección de decreto activa",
    "Geen actieve decreetkeuze",
    "Nessuna scelta decreto attiva",
    "Aucun choix de décret actif"
  ],
  "GUILD BULLETIN": [
    "GILDENMITTEILUNGEN",
    "BOLETÍN DEL GREMIO",
    "GILDEBULLETIN",
    "BOLLETTINO GILDA",
    "BULLETIN DE GUILDE"
  ],
  "CURRENT PRIORITIES": [
    "AKTUELLE PRIORITÄTEN",
    "PRIORIDADES ACTUALES",
    "HUIDIGE PRIORITEITEN",
    "PRIORITÀ ATTUALI",
    "PRIORITÉS ACTUELLES"
  ],
  "YOUR ROLE": [
    "DEINE ROLLE",
    "TU ROL",
    "JOUW ROL",
    "IL TUO RUOLO",
    "VOTRE RÔLE"
  ],
  "MEMBERS": [
    "MITGLIEDER",
    "MIEMBROS",
    "LEDEN",
    "MEMBRI",
    "MEMBRES"
  ],
  "Combat": [
    "Kampf",
    "Combate",
    "Gevecht",
    "Combattimento",
    "Combat"
  ],
  "Skilling": [
    "Fertigkeiten",
    "Habilidades",
    "Vaardigheden",
    "Abilità",
    "Compétences"
  ],
  "YOUR CONTRIBUTION": [
    "DEIN BEITRAG",
    "TU CONTRIBUCIÓN",
    "JOUW BIJDRAGE",
    "IL TUO CONTRIBUTO",
    "VOTRE CONTRIBUTION"
  ],
  "RESOURCE GOALS": [
    "RESSOURCENZIELE",
    "OBJETIVOS DE RECURSOS",
    "MIDDELENDOELEN",
    "OBIETTIVI RISORSE",
    "OBJECTIFS DE RESSOURCES"
  ],
  "Donate": [
    "Spenden",
    "Donar",
    "Doneren",
    "Dona",
    "Faire un don"
  ],
  "CONTRIBUTORS": [
    "BEITRAGENDE",
    "COLABORADORES",
    "BIJDRAGERS",
    "CONTRIBUTORI",
    "CONTRIBUTEURS"
  ],
  "No contributor rows yet.": [
    "Noch keine Beiträge erfasst.",
    "Aún no hay contribuciones registradas.",
    "Nog geen bijdragen geregistreerd.",
    "Ancora nessun contributo registrato.",
    "Aucune contribution enregistrée."
  ],
  "Claim completion reward": [
    "Abschlussbelohnung abholen",
    "Recoger recompensa de finalización",
    "Voltooiingsbeloning ophalen",
    "Riscatta ricompensa finale",
    "Réclamer la récompense d’achèvement"
  ],
  "ACTIVE PROJECTS": [
    "AKTIVE PROJEKTE",
    "PROYECTOS ACTIVOS",
    "ACTIEVE PROJECTEN",
    "PROGETTI ATTIVI",
    "PROJETS ACTIFS"
  ],
  "No active Guild Project": [
    "Kein aktives Gildenprojekt",
    "Sin proyecto de gremio activo",
    "Geen actief gildeproject",
    "Nessun progetto di gilda attivo",
    "Aucun projet de guilde actif"
  ],
  "Open the weekly board to choose the next shared goal.": [
    "Öffne die Wochentafel, um das nächste gemeinsame Ziel zu wählen.",
    "Abre el tablón semanal para elegir el próximo objetivo compartido.",
    "Open het weekbord om het volgende gezamenlijke doel te kiezen.",
    "Apri la bacheca settimanale per scegliere il prossimo obiettivo comune.",
    "Ouvrez le tableau hebdomadaire pour choisir le prochain objectif commun."
  ],
  "WEEKLY PROJECT BOARD": [
    "WÖCHENTLICHE PROJEKTTAFEL",
    "TABLÓN SEMANAL DE PROYECTOS",
    "WEKELIJKS PROJECTBORD",
    "BACHECA PROGETTI SETTIMANALE",
    "TABLEAU HEBDOMADAIRE DES PROJETS"
  ],
  "Start": [
    "Starten",
    "Iniciar",
    "Starten",
    "Avvia",
    "Démarrer"
  ],
  "GUILD QUESTS": [
    "GILDENAUFTRÄGE",
    "MISIONES DE GREMIO",
    "GILDEMISSIES",
    "MISSIONI DI GILDA",
    "QUÊTES DE GUILDE"
  ],
  "Loading this week’s objectives…": [
    "Wochenziele werden geladen…",
    "Cargando objetivos semanales…",
    "Weekdoelen laden…",
    "Caricamento obiettivi settimanali…",
    "Chargement des objectifs de la semaine…"
  ],
  "TRY AGAIN": [
    "ERNEUT VERSUCHEN",
    "REINTENTAR",
    "OPNIEUW PROBEREN",
    "RIPROVA",
    "RÉESSAYER"
  ],
  "WEEKLY GUILD QUESTS": [
    "WÖCHENTLICHE GILDENAUFTRÄGE",
    "MISIONES SEMANALES DE GREMIO",
    "WEKELIJKSE GILDEMISSIES",
    "MISSIONI SETTIMANALI DI GILDA",
    "QUÊTES HEBDOMADAIRES DE GUILDE"
  ],
  "QUESTS COMPLETE": [
    "AUFTRÄGE ABGESCHLOSSEN",
    "MISIONES COMPLETADAS",
    "MISSIES VOLTOOID",
    "MISSIONI COMPLETATE",
    "QUÊTES TERMINÉES"
  ],
  "ACTIVITY EARNED": [
    "AKTIVITÄT VERDIENT",
    "ACTIVIDAD OBTENIDA",
    "ACTIVITEIT VERDIEND",
    "ATTIVITÀ OTTENUTA",
    "ACTIVITÉ GAGNÉE"
  ],
  "CLOSEST TO COMPLETION": [
    "FAST ABGESCHLOSSEN",
    "MÁS CERCA DE COMPLETARSE",
    "BIJNA VOLTOOID",
    "QUASI COMPLETATO",
    "AU PLUS PRÈS DE L’ACHÈVEMENT"
  ],
  "Guild Activity increased": [
    "Gildenaktivität gestiegen",
    "Actividad del gremio aumentada",
    "Gildeactiviteit verhoogd",
    "Attività della gilda aumentata",
    "Activité de guilde augmentée"
  ],
  "✓ Guild Quest complete": [
    "✓ Gildenauftrag abgeschlossen",
    "✓ Misión de gremio completada",
    "✓ Gildemissie voltooid",
    "✓ Missione di gilda completata",
    "✓ Quête de guilde terminée"
  ],
  "Guild seekers": [
    "Gildensuchende",
    "Buscadores de gremio",
    "Gildezoekers",
    "Cercatori di gilda",
    "Recherche de guilde"
  ],
  "Post mine": [
    "Eigene Anzeige",
    "Publicar el mío",
    "Mijn bericht plaatsen",
    "Pubblica il mio",
    "Publier mon annonce"
  ],
  "No fresh Guild seekers": [
    "Keine neuen Gildensuchenden",
    "Sin buscadores de gremio recientes",
    "Geen nieuwe gildezoekers",
    "Nessun nuovo cercatore di gilda",
    "Aucune recherche de guilde récente"
  ],
  "LIVE DUNGEON": [
    "LIVE-DUNGEON",
    "MAZMORRA EN VIVO",
    "LIVE-KERKER",
    "DUNGEON LIVE",
    "DONJON EN DIRECT"
  ],
  "WAITING": [
    "WARTEN",
    "ESPERANDO",
    "WACHTEN",
    "IN ATTESA",
    "EN ATTENTE"
  ],
  "FOUND": [
    "GEFUNDEN",
    "ENCONTRADO",
    "GEVONDEN",
    "TROVATO",
    "TROUVÉ"
  ],
  "Leave Queue": [
    "Warteschlange verlassen",
    "Salir de la cola",
    "Wachtrij verlaten",
    "Lascia la coda",
    "Quitter la file"
  ],
  "Ready": [
    "Bereit",
    "Listo",
    "Klaar",
    "Pronto",
    "Prêt"
  ],
  "FINAL BOSS": [
    "ENDBOSS",
    "JEFE FINAL",
    "EINDBAAS",
    "BOSS FINALE",
    "BOSS FINAL"
  ],
  "GUILD DIRECTORY": [
    "GILDENVERZEICHNIS",
    "DIRECTORIO DE GREMIOS",
    "GILDEOVERZICHT",
    "ELENCO GILDE",
    "ANNUAIRE DES GUILDES"
  ],
  "Find a Guild": [
    "Gilde suchen",
    "Buscar gremio",
    "Gilde zoeken",
    "Trova una gilda",
    "Trouver une guilde"
  ],
  "Browse live Guild identities and join policies. Three-letter tags are globally unique.": [
    "Durchsuche Gilden und Beitrittsregeln. Kürzel aus drei Buchstaben sind weltweit einzigartig.",
    "Explora gremios y sus políticas de acceso. Las etiquetas de tres letras son únicas globalmente.",
    "Bekijk gildes en toetredingsregels. Tags van drie letters zijn wereldwijd uniek.",
    "Esplora gilde e regole di accesso. I tag di tre lettere sono unici globalmente.",
    "Parcourez les guildes et leurs règles d’adhésion. Les tags de trois lettres sont uniques mondialement."
  ],
  "CREATE GUILD": [
    "GILDE GRÜNDEN",
    "CREAR GREMIO",
    "GILDE OPRICHTEN",
    "CREA GILDA",
    "CRÉER UNE GUILDE"
  ],
  "Tag reserved permanently": [
    "Kürzel dauerhaft reserviert",
    "Etiqueta reservada permanentemente",
    "Tag permanent gereserveerd",
    "Tag riservato permanentemente",
    "Tag réservé définitivement"
  ],
  "New guild name": [
    "Neuer Gildenname",
    "Nombre del nuevo gremio",
    "Nieuwe gildenaam",
    "Nome nuova gilda",
    "Nom de la nouvelle guilde"
  ],
  "Guild name": [
    "Gildenname",
    "Nombre del gremio",
    "Gildenaam",
    "Nome della gilda",
    "Nom de guilde"
  ],
  "Guild tag": [
    "Gildenkürzel",
    "Etiqueta del gremio",
    "Gildetag",
    "Tag della gilda",
    "Tag de guilde"
  ],
  "TAG": [
    "KÜRZEL",
    "ETIQUETA",
    "TAG",
    "TAG",
    "TAG"
  ],
  "Check tag": [
    "Kürzel prüfen",
    "Comprobar etiqueta",
    "Tag controleren",
    "Controlla tag",
    "Vérifier le tag"
  ],
  "JOIN POLICY": [
    "BEITRITTSREGEL",
    "POLÍTICA DE ACCESO",
    "TOETREDINGSREGEL",
    "REGOLA DI ACCESSO",
    "RÈGLE D’ADHÉSION"
  ],
  "Open": [
    "Offen",
    "Abierto",
    "Open",
    "Aperto",
    "Ouvert"
  ],
  "Applications": [
    "Bewerbungen",
    "Solicitudes",
    "Aanvragen",
    "Candidature",
    "Candidatures"
  ],
  "Create Guild": [
    "Gilde gründen",
    "Crear gremio",
    "Gilde oprichten",
    "Crea gilda",
    "Créer une guilde"
  ],
  "AVAILABLE GUILDS": [
    "VERFÜGBARE GILDEN",
    "GREMIOS DISPONIBLES",
    "BESCHIKBARE GILDES",
    "GILDE DISPONIBILI",
    "GUILDES DISPONIBLES"
  ],
  "No online Guilds yet": [
    "Noch keine Onlinegilden",
    "Aún no hay gremios en línea",
    "Nog geen online gildes",
    "Ancora nessuna gilda online",
    "Aucune guilde en ligne"
  ],
  "Create the first Guild, or refresh after other players have founded one.": [
    "Gründe die erste Gilde oder aktualisiere, nachdem andere eine gegründet haben.",
    "Crea el primer gremio o actualiza cuando otros hayan fundado uno.",
    "Richt het eerste gilde op of vernieuw nadat anderen er een hebben opgericht.",
    "Crea la prima gilda o aggiorna dopo che altri ne hanno fondata una.",
    "Créez la première guilde ou actualisez après la création d’une guilde par d’autres joueurs."
  ],
  "Guild customization": [
    "Gildenanpassung",
    "Personalización del gremio",
    "Gilde aanpassen",
    "Personalizzazione gilda",
    "Personnalisation de guilde"
  ],
  "Join or create a guild before choosing guild visuals.": [
    "Tritt einer Gilde bei oder gründe eine, bevor du die Gestaltung wählst.",
    "Únete o crea un gremio antes de elegir su diseño.",
    "Word lid of richt een gilde op voordat je het uiterlijk kiest.",
    "Unisciti o crea una gilda prima di sceglierne l’aspetto.",
    "Rejoignez ou créez une guilde avant de choisir ses visuels."
  ],
  "GUILD APPEARANCE": [
    "GILDENAUSSEHEN",
    "ASPECTO DEL GREMIO",
    "GILDE-UITERLIJK",
    "ASPETTO DELLA GILDA",
    "APPARENCE DE GUILDE"
  ],
  "GUILD TAG": [
    "GILDENKÜRZEL",
    "ETIQUETA DEL GREMIO",
    "GILDETAG",
    "TAG DELLA GILDA",
    "TAG DE GUILDE"
  ],
  "Changing a tag permanently retires the old one. It will never return to the available pool.": [
    "Ein Kürzelwechsel sperrt das alte Kürzel dauerhaft. Es wird nie wieder verfügbar.",
    "Cambiar la etiqueta retira la anterior permanentemente. Nunca volverá a estar disponible.",
    "Een tag wijzigen maakt de oude tag permanent onbruikbaar. Deze wordt nooit meer beschikbaar.",
    "Cambiare tag ritira quello vecchio per sempre. Non sarà più disponibile.",
    "Changer de tag retire définitivement l’ancien. Il ne sera plus jamais disponible."
  ],
  "Change tag": [
    "Kürzel ändern",
    "Cambiar etiqueta",
    "Tag wijzigen",
    "Cambia tag",
    "Changer le tag"
  ],
  "Tag color": [
    "Kürzelfarbe",
    "Color de etiqueta",
    "Tagkleur",
    "Colore tag",
    "Couleur du tag"
  ],
  "Banner / emblem": [
    "Banner / Emblem",
    "Estandarte / emblema",
    "Banier / embleem",
    "Stendardo / emblema",
    "Bannière / emblème"
  ],
  "Profile border": [
    "Profilrahmen",
    "Borde del perfil",
    "Profielrand",
    "Bordo profilo",
    "Bordure de profil"
  ],
  "Guild name color": [
    "Gildennamenfarbe",
    "Color del nombre del gremio",
    "Gildenaamkleur",
    "Colore nome gilda",
    "Couleur du nom de guilde"
  ],
  "Nameplate": [
    "Namensschild",
    "Placa",
    "Naamplaat",
    "Targhetta",
    "Plaque"
  ],
  "Guild Hall": [
    "Gildenhalle",
    "Sala del gremio",
    "Gildehal",
    "Sala di gilda",
    "Hall de guilde"
  ],
  "Join a Guild to unlock long-term Guild Hall progression.": [
    "Tritt einer Gilde bei, um langfristigen Hallenfortschritt freizuschalten.",
    "Únete a un gremio para desbloquear el progreso a largo plazo de su sala.",
    "Word lid van een gilde voor langdurige gildehalvoortgang.",
    "Unisciti a una gilda per sbloccare la progressione a lungo termine della sala.",
    "Rejoignez une guilde pour débloquer la progression à long terme de son hall."
  ],
  "GUILD HALL": [
    "GILDENHALLE",
    "SALA DEL GREMIO",
    "GILDEHAL",
    "SALA DI GILDA",
    "HALL DE GUILDE"
  ],
  "Facilities": [
    "Einrichtungen",
    "Instalaciones",
    "Voorzieningen",
    "Strutture",
    "Installations"
  ],
  "Automatic progression": [
    "Automatischer Fortschritt",
    "Progreso automático",
    "Automatische voortgang",
    "Progressione automatica",
    "Progression automatique"
  ],
  "Guild Skill Trees": [
    "Gildenfertigkeitsbäume",
    "Árboles de habilidades del gremio",
    "Gildevaardigheidsbomen",
    "Alberi abilità gilda",
    "Arbres de compétences de guilde"
  ],
  "PROFESSIONS": [
    "BERUFE",
    "PROFESIONES",
    "BEROEPEN",
    "PROFESSIONI",
    "MÉTIERS"
  ],
  "FELLOWSHIP": [
    "GEMEINSCHAFT",
    "COMPAÑERISMO",
    "SAMENWERKING",
    "COMPAGNIA",
    "CAMARADERIE"
  ],
  "VANGUARD": [
    "VORHUT",
    "VANGUARDIA",
    "VOORHOEDE",
    "AVANGUARDIA",
    "AVANT-GARDE"
  ],
  "Trophy Room": [
    "Trophäenraum",
    "Sala de trofeos",
    "Trofeeënkamer",
    "Sala dei trofei",
    "Salle des trophées"
  ],
  "No trophies yet": [
    "Noch keine Trophäen",
    "Aún no hay trofeos",
    "Nog geen trofeeën",
    "Ancora nessun trofeo",
    "Aucun trophée"
  ],
  "GUILD INVITATIONS": [
    "GILDENEINLADUNGEN",
    "INVITACIONES DE GREMIO",
    "GILDE-UITNODIGINGEN",
    "INVITI DI GILDA",
    "INVITATIONS DE GUILDE"
  ],
  "GUILD INVITE": [
    "GILDENEINLADUNG",
    "INVITACIÓN DE GREMIO",
    "GILDE-UITNODIGING",
    "INVITO DI GILDA",
    "INVITATION DE GUILDE"
  ],
  "My guild · online": [
    "Meine Gilde · online",
    "Mi gremio · en línea",
    "Mijn gilde · online",
    "La mia gilda · online",
    "Ma guilde · en ligne"
  ],
  "You have not joined an online guild yet.": [
    "Du bist noch keiner Onlinegilde beigetreten.",
    "Aún no te has unido a un gremio en línea.",
    "Je bent nog geen lid van een online gilde.",
    "Non ti sei ancora unito a una gilda online.",
    "Vous n’avez pas encore rejoint de guilde en ligne."
  ],
  "Refresh my guild": [
    "Meine Gilde aktualisieren",
    "Actualizar mi gremio",
    "Mijn gilde vernieuwen",
    "Aggiorna la mia gilda",
    "Actualiser ma guilde"
  ],
  "GUILD MANAGEMENT": [
    "GILDENVERWALTUNG",
    "GESTIÓN DEL GREMIO",
    "GILDEBEHEER",
    "GESTIONE GILDA",
    "GESTION DE GUILDE"
  ],
  "Member controls and succession safety": [
    "Mitgliederverwaltung und Nachfolgesicherung",
    "Controles de miembros y sucesión segura",
    "Ledenbeheer en opvolgingsbescherming",
    "Gestione membri e tutela successione",
    "Gestion des membres et protection de succession"
  ],
  "PENDING APPLICATIONS": [
    "AUSSTEHENDE BEWERBUNGEN",
    "SOLICITUDES PENDIENTES",
    "OPENSTAANDE AANVRAGEN",
    "CANDIDATURE IN ATTESA",
    "CANDIDATURES EN ATTENTE"
  ],
  "GUILD APPLICATION": [
    "GILDENBEWERBUNG",
    "SOLICITUD DE GREMIO",
    "GILDEAANVRAAG",
    "CANDIDATURA DI GILDA",
    "CANDIDATURE DE GUILDE"
  ],
  "No pending applications.": [
    "Keine ausstehenden Bewerbungen.",
    "No hay solicitudes pendientes.",
    "Geen openstaande aanvragen.",
    "Nessuna candidatura in attesa.",
    "Aucune candidature en attente."
  ],
  "OUTGOING INVITES": [
    "GESENDETE EINLADUNGEN",
    "INVITACIONES ENVIADAS",
    "VERSTUURDE UITNODIGINGEN",
    "INVITI INVIATI",
    "INVITATIONS ENVOYÉES"
  ],
  "GUILD INVITE SENT": [
    "GILDENEINLADUNG GESENDET",
    "INVITACIÓN DE GREMIO ENVIADA",
    "GILDE-UITNODIGING VERSTUURD",
    "INVITO DI GILDA INVIATO",
    "INVITATION DE GUILDE ENVOYÉE"
  ],
  "DANGER ZONE": [
    "GEFAHRENBEREICH",
    "ZONA DE PELIGRO",
    "GEVARENZONE",
    "ZONA PERICOLOSA",
    "ZONE DE DANGER"
  ],
  "Disband Guild": [
    "Gilde auflösen",
    "Disolver gremio",
    "Gilde opheffen",
    "Sciogli la gilda",
    "Dissoudre la guilde"
  ],
  "Leave Guild": [
    "Gilde verlassen",
    "Salir del gremio",
    "Gilde verlaten",
    "Lascia la gilda",
    "Quitter la guilde"
  ],
  "Loading Guild Muster…": [
    "Gildenappell wird geladen…",
    "Cargando reunión del gremio…",
    "Gildeappèl laden…",
    "Caricamento adunata di gilda…",
    "Chargement de l’appel de guilde…"
  ],
  "Checking today’s attendance and verified Guild contribution.": [
    "Heutige Anwesenheit und geprüfter Gildenbeitrag werden geladen.",
    "Comprobando asistencia de hoy y contribución verificada.",
    "Aanwezigheid van vandaag en geverifieerde gildebijdrage controleren.",
    "Controllo presenza odierna e contributo verificato.",
    "Vérification de la présence du jour et de la contribution validée."
  ],
  "Guild Muster": [
    "Gildenappell",
    "Reunión del gremio",
    "Gildeappèl",
    "Adunata di gilda",
    "Appel de guilde"
  ],
  "GUILD MUSTER": [
    "GILDENAPPELL",
    "REUNIÓN DEL GREMIO",
    "GILDEAPPÈL",
    "ADUNATA DI GILDA",
    "APPEL DE GUILDE"
  ],
  "Show up. Play normally. Help together.": [
    "Komm vorbei. Spiele normal. Hilf gemeinsam.",
    "Participa. Juega con normalidad. Ayuda en equipo.",
    "Kom langs. Speel normaal. Help samen.",
    "Partecipa. Gioca normalmente. Aiuta insieme.",
    "Participez. Jouez normalement. Aidez ensemble."
  ],
  "Today": [
    "Heute",
    "Hoy",
    "Vandaag",
    "Oggi",
    "Aujourd’hui"
  ],
  "CHECK-IN": [
    "ANWESENHEIT",
    "REGISTRO",
    "AANMELDING",
    "PRESENZA",
    "PRÉSENCE"
  ],
  "COMBAT": [
    "KAMPF",
    "COMBATE",
    "GEVECHT",
    "COMBATTIMENTO",
    "COMBAT"
  ],
  "SKILLING": [
    "FERTIGKEITEN",
    "HABILIDADES",
    "VAARDIGHEDEN",
    "ABILITÀ",
    "COMPÉTENCES"
  ],
  "Your weekly cadence": [
    "Dein Wochenrhythmus",
    "Tu ritmo semanal",
    "Je weekritme",
    "Il tuo ritmo settimanale",
    "Votre rythme hebdomadaire"
  ],
  "WEEKLY GUILD RALLY": [
    "WÖCHENTLICHE GILDENVERSAMMLUNG",
    "MOVILIZACIÓN SEMANAL DEL GREMIO",
    "WEKELIJKSE GILDESAMENKOMST",
    "RADUNO SETTIMANALE DI GILDA",
    "RASSEMBLEMENT HEBDOMADAIRE DE GUILDE"
  ],
  "Rally Marks": [
    "Versammlungsmarken",
    "Marcas de movilización",
    "Samenkomstmerken",
    "Marche raduno",
    "Marques de rassemblement"
  ],
  "CHECKED IN": [
    "ANWESEND",
    "REGISTRADO",
    "AANGEMELD",
    "PRESENTE",
    "PRÉSENT"
  ],
  "MARK TODAY": [
    "MARKE HEUTE",
    "MARCA DE HOY",
    "MERK VANDAAG",
    "MARCA OGGI",
    "MARQUE DU JOUR"
  ],
  "HALL BONUS": [
    "HALLENBONUS",
    "BONIFICACIÓN DE SALA",
    "HALBONUS",
    "BONUS SALA",
    "BONUS DU HALL"
  ],
  "This week’s contributors": [
    "Beitragende dieser Woche",
    "Colaboradores de esta semana",
    "Bijdragers van deze week",
    "Contributori della settimana",
    "Contributeurs de la semaine"
  ],
  "Loading Guild Notice Board…": [
    "Gildentafel wird geladen…",
    "Cargando tablón del gremio…",
    "Gildemededelingen laden…",
    "Caricamento bacheca di gilda…",
    "Chargement du tableau de guilde…"
  ],
  "Syncing the private member bulletin.": [
    "Private Mitgliedermitteilungen werden synchronisiert.",
    "Sincronizando el boletín privado de miembros.",
    "Privéledenbulletin synchroniseren.",
    "Sincronizzazione bollettino privato dei membri.",
    "Synchronisation du bulletin privé des membres."
  ],
  "Guild Notice Board": [
    "Gildenanschlagtafel",
    "Tablón del gremio",
    "Gildemededelingenbord",
    "Bacheca di gilda",
    "Tableau d’affichage de guilde"
  ],
  "MEMBER NOTICE BOARD": [
    "MITGLIEDERANSCHLAGTAFEL",
    "TABLÓN DE MIEMBROS",
    "LEDENMEDEDELINGENBORD",
    "BACHECA MEMBRI",
    "TABLEAU DES MEMBRES"
  ],
  "No notice posted": [
    "Keine Mitteilung veröffentlicht",
    "Sin avisos publicados",
    "Geen bericht geplaatst",
    "Nessun avviso pubblicato",
    "Aucune annonce publiée"
  ],
  "Guild leadership can post a short member-only notice here.": [
    "Die Gildenführung kann hier eine kurze Mitteilung nur für Mitglieder veröffentlichen.",
    "La dirección puede publicar aquí un aviso breve solo para miembros.",
    "De gildeleiding kan hier een kort bericht voor leden plaatsen.",
    "La guida può pubblicare qui un breve avviso riservato ai membri.",
    "La direction peut publier ici une courte annonce réservée aux membres."
  ],
  "Guild Notice Board text": [
    "Text der Gildentafel",
    "Texto del tablón del gremio",
    "Tekst gildemededelingenbord",
    "Testo bacheca gilda",
    "Texte du tableau de guilde"
  ],
  "Raid notes, weekly priorities, Guild reminders…": [
    "Raidnotizen, Wochenprioritäten, Gildenerinnerungen…",
    "Notas de incursión, prioridades semanales, recordatorios…",
    "Raidnotities, weekprioriteiten, gildeherinneringen…",
    "Note incursione, priorità settimanali, promemoria…",
    "Notes de raid, priorités hebdomadaires, rappels de guilde…"
  ],
  "Visible to Guild members only · blank text clears the notice.": [
    "Nur für Gildenmitglieder sichtbar · leerer Text löscht die Mitteilung.",
    "Visible solo para miembros · el texto vacío borra el aviso.",
    "Alleen zichtbaar voor gildeleden · lege tekst wist het bericht.",
    "Visibile solo ai membri · il testo vuoto cancella l’avviso.",
    "Visible uniquement par les membres · un texte vide efface l’annonce."
  ],
  "Read-only · Your Guild role cannot edit the Notice Board.": [
    "Schreibgeschützt · Deine Gildenrolle darf die Tafel nicht bearbeiten.",
    "Solo lectura · Tu rol no permite editar el tablón.",
    "Alleen-lezen · Je gilderol mag het bord niet bewerken.",
    "Sola lettura · Il tuo ruolo non può modificare la bacheca.",
    "Lecture seule · Votre rôle ne peut pas modifier le tableau."
  ],
  "Loading Guild Projects…": [
    "Gildenprojekte werden geladen…",
    "Cargando proyectos de gremio…",
    "Gildeprojecten laden…",
    "Caricamento progetti di gilda…",
    "Chargement des projets de guilde…"
  ],
  "Syncing shared Project progress and recent Guild activity.": [
    "Gemeinsamer Projektfortschritt und Gildenaktivität werden synchronisiert.",
    "Sincronizando progreso de proyectos y actividad reciente.",
    "Gezamenlijke projectvoortgang en recente activiteit synchroniseren.",
    "Sincronizzazione progressi dei progetti e attività recente.",
    "Synchronisation des projets communs et de l’activité récente."
  ],
  "Join a Guild to view shared Projects and recent Guild activity.": [
    "Tritt einer Gilde bei, um gemeinsame Projekte und aktuelle Aktivität zu sehen.",
    "Únete a un gremio para ver proyectos compartidos y actividad reciente.",
    "Word lid van een gilde voor gezamenlijke projecten en recente activiteit.",
    "Unisciti a una gilda per vedere progetti comuni e attività recente.",
    "Rejoignez une guilde pour voir les projets communs et l’activité récente."
  ],
  "GUILD PROJECTS": [
    "GILDENPROJEKTE",
    "PROYECTOS DE GREMIO",
    "GILDEPROJECTEN",
    "PROGETTI DI GILDA",
    "PROJETS DE GUILDE"
  ],
  "Shared Progress": [
    "Gemeinsamer Fortschritt",
    "Progreso compartido",
    "Gezamenlijke voortgang",
    "Progressi condivisi",
    "Progression commune"
  ],
  "LIVE": [
    "LIVE",
    "EN VIVO",
    "LIVE",
    "LIVE",
    "EN DIRECT"
  ],
  "NEXT WEEKLY PROJECT": [
    "NÄCHSTES WOCHENPROJEKT",
    "PRÓXIMO PROYECTO SEMANAL",
    "VOLGEND WEEKPROJECT",
    "PROSSIMO PROGETTO SETTIMANALE",
    "PROCHAIN PROJET HEBDOMADAIRE"
  ],
  "1 vote per member": [
    "1 Stimme pro Mitglied",
    "1 voto por miembro",
    "1 stem per lid",
    "1 voto per membro",
    "1 vote par membre"
  ],
  "Recent completions": [
    "Letzte Abschlüsse",
    "Finalizaciones recientes",
    "Recente voltooiingen",
    "Completamenti recenti",
    "Achèvements récents"
  ],
  "Guild Activity": [
    "Gildenaktivität",
    "Actividad del gremio",
    "Gildeactiviteit",
    "Attività della gilda",
    "Activité de guilde"
  ],
  "YOUR VOTE": [
    "DEINE STIMME",
    "TU VOTO",
    "JOUW STEM",
    "IL TUO VOTO",
    "VOTRE VOTE"
  ],
  "View details ›": [
    "Details ansehen ›",
    "Ver detalles ›",
    "Details bekijken ›",
    "Vedi dettagli ›",
    "Voir les détails ›"
  ],
  "Weekly Guild PvE": [
    "Wöchentliches Gilden-PvE",
    "JcE semanal de gremio",
    "Wekelijkse gilde-PvE",
    "PvE settimanale di gilda",
    "JcE hebdomadaire de guilde"
  ],
  "WEEKLY PROJECT": [
    "WOCHENPROJEKT",
    "PROYECTO SEMANAL",
    "WEEKPROJECT",
    "PROGETTO SETTIMANALE",
    "PROJET HEBDOMADAIRE"
  ],
  "Guild Project": [
    "Gildenprojekt",
    "Proyecto de gremio",
    "Gildeproject",
    "Progetto di gilda",
    "Projet de guilde"
  ],
  "Contribute 100 points": [
    "100 Punkte beitragen",
    "Aportar 100 puntos",
    "100 punten bijdragen",
    "Contribuisci 100 punti",
    "Contribuer 100 points"
  ],
  "GUILD BOSS": [
    "GILDENBOSS",
    "JEFE DE GREMIO",
    "GILDEBAAS",
    "BOSS DI GILDA",
    "BOSS DE GUILDE"
  ],
  "Weekly Boss": [
    "Wochenboss",
    "Jefe semanal",
    "Weekbaas",
    "Boss settimanale",
    "Boss hebdomadaire"
  ],
  "Deal 1,000 boss damage": [
    "1.000 Bossschaden verursachen",
    "Infligir 1.000 de daño al jefe",
    "1.000 baasschade toebrengen",
    "Infliggi 1.000 danni al boss",
    "Infliger 1 000 dégâts au boss"
  ],
  "PARTY EVENT": [
    "GRUPPENEVENT",
    "EVENTO DE GRUPO",
    "GROEPSEVENEMENT",
    "EVENTO DI GRUPPO",
    "ÉVÉNEMENT DE GROUPE"
  ],
  "No active Party Event": [
    "Kein aktives Gruppenevent",
    "Sin evento de grupo activo",
    "Geen actief groepsevenement",
    "Nessun evento di gruppo attivo",
    "Aucun événement de groupe actif"
  ],
  "RANK": [
    "RANG",
    "RANGO",
    "RANG",
    "POSIZIONE",
    "RANG"
  ],
  "YOUR POINTS": [
    "DEINE PUNKTE",
    "TUS PUNTOS",
    "JOUW PUNTEN",
    "I TUOI PUNTI",
    "VOS POINTS"
  ],
  "PARTY SCORE": [
    "GRUPPENPUNKTE",
    "PUNTUACIÓN DEL GRUPO",
    "GROEPSSCORE",
    "PUNTEGGIO GRUPPO",
    "SCORE DU GROUPE"
  ],
  "Find / Create a Party": [
    "Gruppe suchen / gründen",
    "Buscar / crear grupo",
    "Groep zoeken / maken",
    "Trova / crea gruppo",
    "Trouver / créer un groupe"
  ],
  "Contribution": [
    "Beitrag",
    "Contribución",
    "Bijdrage",
    "Contributo",
    "Contribution"
  ],
  "Leaderboard": [
    "Rangliste",
    "Clasificación",
    "Ranglijst",
    "Classifica",
    "Classement"
  ],
  "RANKING QUALIFICATION": [
    "RANGLISTENQUALIFIKATION",
    "REQUISITOS DE CLASIFICACIÓN",
    "RANGLIJSTKWALIFICATIE",
    "QUALIFICAZIONE CLASSIFICA",
    "QUALIFICATION AU CLASSEMENT"
  ],
  "Personal": [
    "Persönlich",
    "Personal",
    "Persoonlijk",
    "Personale",
    "Personnel"
  ],
  "Claim": [
    "Abholen",
    "Recoger",
    "Ophalen",
    "Riscatta",
    "Réclamer"
  ],
  "Party points": [
    "Gruppenpunkte",
    "Puntos de grupo",
    "Groepspunten",
    "Punti gruppo",
    "Points de groupe"
  ],
  "Claim Final Ranking Reward": [
    "Endrangbelohnung abholen",
    "Recoger recompensa final de clasificación",
    "Eindrangbeloning ophalen",
    "Riscatta ricompensa classifica finale",
    "Réclamer la récompense du classement final"
  ],
  "PARTY LEADERBOARD": [
    "GRUPPENRANGLISTE",
    "CLASIFICACIÓN DE GRUPOS",
    "GROEPSRANGLIJST",
    "CLASSIFICA GRUPPI",
    "CLASSEMENT DES GROUPES"
  ],
  "PARTY": [
    "GRUPPE",
    "GRUPO",
    "GROEP",
    "GRUPPO",
    "GROUPE"
  ],
  "Create Party": [
    "Gruppe gründen",
    "Crear grupo",
    "Groep maken",
    "Crea gruppo",
    "Créer un groupe"
  ],
  "Party Chat": [
    "Gruppenchat",
    "Chat de grupo",
    "Groepschat",
    "Chat di gruppo",
    "Discussion de groupe"
  ],
  "PARTY MEMBERS": [
    "GRUPPENMITGLIEDER",
    "MIEMBROS DEL GRUPO",
    "GROEPSLEDEN",
    "MEMBRI GRUPPO",
    "MEMBRES DU GROUPE"
  ],
  "Lead": [
    "Führung",
    "Liderar",
    "Leiden",
    "Guida",
    "Diriger"
  ],
  "Kick": [
    "Entfernen",
    "Expulsar",
    "Verwijderen",
    "Espelli",
    "Exclure"
  ],
  "PARTY CONTRACTS": [
    "GRUPPENVERTRÄGE",
    "CONTRATOS DE GRUPO",
    "GROEPSCONTRACTEN",
    "CONTRATTI DI GRUPPO",
    "CONTRATS DE GROUPE"
  ],
  "Shared weekly progress. Personal minimums prevent zero-contribution rewards.": [
    "Gemeinsamer Wochenfortschritt. Persönliche Mindestbeiträge verhindern Belohnungen ohne Beitrag.",
    "Progreso semanal compartido. Los mínimos personales impiden recompensas sin contribuir.",
    "Gezamenlijke weekvoortgang. Persoonlijke minima voorkomen beloningen zonder bijdrage.",
    "Progressi settimanali condivisi. I minimi personali impediscono premi senza contributo.",
    "Progression hebdomadaire commune. Les minimums personnels empêchent les récompenses sans contribution."
  ],
  "No active Contract right now.": [
    "Derzeit kein aktiver Vertrag.",
    "No hay contrato activo ahora.",
    "Momenteel geen actief contract.",
    "Nessun contratto attivo al momento.",
    "Aucun contrat actif actuellement."
  ],
  "Post my LFG": [
    "Gruppensuche veröffentlichen",
    "Publicar búsqueda de grupo",
    "Mijn groepszoekbericht plaatsen",
    "Pubblica ricerca gruppo",
    "Publier ma recherche de groupe"
  ],
  "Post Party LFM": [
    "Mitgliedersuche veröffentlichen",
    "Publicar búsqueda de miembros",
    "Ledenzoekbericht plaatsen",
    "Pubblica ricerca membri",
    "Publier une recherche de membres"
  ],
  "No fresh posts match these filters.": [
    "Keine neuen Anzeigen passen zu diesen Filtern.",
    "Ningún anuncio reciente coincide con estos filtros.",
    "Geen nieuwe berichten voldoen aan deze filters.",
    "Nessun annuncio recente corrisponde ai filtri.",
    "Aucune annonce récente ne correspond aux filtres."
  ],
  "LOOKING FOR GROUP": [
    "GRUPPENSUCHE",
    "BUSCANDO GRUPO",
    "GROEP ZOEKEN",
    "RICERCA GRUPPO",
    "RECHERCHE DE GROUPE"
  ],
  "Party Board": [
    "Gruppentafel",
    "Tablón de grupos",
    "Groepsbord",
    "Bacheca gruppi",
    "Tableau des groupes"
  ],
  "Parties LF Members": [
    "Gruppen suchen Mitglieder",
    "Grupos buscan miembros",
    "Groepen zoeken leden",
    "Gruppi cercano membri",
    "Groupes cherchant des membres"
  ],
  "Players LFG": [
    "Spieler suchen Gruppen",
    "Jugadores buscan grupo",
    "Spelers zoeken groep",
    "Giocatori cercano gruppo",
    "Joueurs cherchant un groupe"
  ],
  "Request Join": [
    "Beitritt anfragen",
    "Solicitar acceso",
    "Toetreding aanvragen",
    "Richiedi accesso",
    "Demander à rejoindre"
  ],
  "NEW RECRUITMENT POST": [
    "NEUE REKRUTIERUNGSANZEIGE",
    "NUEVO ANUNCIO DE RECLUTAMIENTO",
    "NIEUW WERVINGSBERICHT",
    "NUOVO ANNUNCIO RECLUTAMENTO",
    "NOUVELLE ANNONCE DE RECRUTEMENT"
  ],
  "Keep it concise. One active advert per type; refresh or replacement is available every 6 hours.": [
    "Halte dich kurz. Eine aktive Anzeige je Typ; alle 6 Stunden aktualisierbar oder ersetzbar.",
    "Sé breve. Un anuncio activo por tipo; se puede actualizar o reemplazar cada 6 horas.",
    "Houd het kort. Eén actieve advertentie per type; elke 6 uur vernieuwen of vervangen.",
    "Sii conciso. Un annuncio attivo per tipo; aggiornabile o sostituibile ogni 6 ore.",
    "Soyez concis. Une annonce active par type ; actualisation ou remplacement toutes les 6 heures."
  ],
  "MESSAGE": [
    "NACHRICHT",
    "MENSAJE",
    "BERICHT",
    "MESSAGGIO",
    "MESSAGE"
  ],
  "Advert title": [
    "Anzeigentitel",
    "Título del anuncio",
    "Advertentietitel",
    "Titolo annuncio",
    "Titre de l’annonce"
  ],
  "Short title": [
    "Kurzer Titel",
    "Título breve",
    "Korte titel",
    "Titolo breve",
    "Titre court"
  ],
  "Advert description": [
    "Anzeigenbeschreibung",
    "Descripción del anuncio",
    "Advertentiebeschrijving",
    "Descrizione annuncio",
    "Description de l’annonce"
  ],
  "Activities, availability and what you enjoy": [
    "Aktivitäten, Verfügbarkeit und Vorlieben",
    "Actividades, disponibilidad y gustos",
    "Activiteiten, beschikbaarheid en wat je leuk vindt",
    "Attività, disponibilità e preferenze",
    "Activités, disponibilité et préférences"
  ],
  "DISCOVERY TAGS": [
    "SUCHMERKMALE",
    "ETIQUETAS DE BÚSQUEDA",
    "ZOEKLABELS",
    "TAG DI RICERCA",
    "TAGS DE RECHERCHE"
  ],
  "PACE": [
    "TEMPO",
    "RITMO",
    "TEMPO",
    "RITMO",
    "RYTHME"
  ],
  "Current objective · optional": [
    "Aktuelles Ziel · optional",
    "Objetivo actual · opcional",
    "Huidig doel · optioneel",
    "Obiettivo attuale · facoltativo",
    "Objectif actuel · facultatif"
  ],
  "AUTO-EXPIRES": [
    "LÄUFT AUTOMATISCH AB",
    "CADUCA AUTOMÁTICAMENTE",
    "VERLOOPT AUTOMATISCH",
    "SCADENZA AUTOMATICA",
    "EXPIRATION AUTOMATIQUE"
  ],
  "Search recruitment": [
    "Rekrutierung durchsuchen",
    "Buscar reclutamiento",
    "Werving doorzoeken",
    "Cerca reclutamento",
    "Rechercher un recrutement"
  ],
  "Search adverts": [
    "Anzeigen suchen",
    "Buscar anuncios",
    "Advertenties zoeken",
    "Cerca annunci",
    "Rechercher des annonces"
  ],
  "RECRUITMENT FILTERS": [
    "REKRUTIERUNGSFILTER",
    "FILTROS DE RECLUTAMIENTO",
    "WERVINGSFILTERS",
    "FILTRI RECLUTAMENTO",
    "FILTRES DE RECRUTEMENT"
  ],
  "Clear": [
    "Leeren",
    "Limpiar",
    "Wissen",
    "Svuota",
    "Effacer"
  ],
  "POST TYPE": [
    "ANZEIGENTYP",
    "TIPO DE ANUNCIO",
    "BERICHTTYPE",
    "TIPO DI ANNUNCIO",
    "TYPE D’ANNONCE"
  ],
  "Open Party spots only": [
    "Nur freie Gruppenplätze",
    "Solo grupos con espacios libres",
    "Alleen vrije groepsplekken",
    "Solo posti liberi nel gruppo",
    "Places de groupe libres uniquement"
  ],
  "Hide full LFM posts.": [
    "Volle Mitgliedersuchen ausblenden.",
    "Ocultar anuncios de grupos llenos.",
    "Volle groepsadvertenties verbergen.",
    "Nascondi annunci di gruppi pieni.",
    "Masquer les annonces de groupes complets."
  ],
  "Only Parties with open spots": [
    "Nur Gruppen mit freien Plätzen",
    "Solo grupos con espacios libres",
    "Alleen groepen met vrije plekken",
    "Solo gruppi con posti liberi",
    "Uniquement les groupes avec places libres"
  ],
  "OPEN DETAILS ›": [
    "DETAILS ÖFFNEN ›",
    "ABRIR DETALLES ›",
    "DETAILS OPENEN ›",
    "APRI DETTAGLI ›",
    "OUVRIR LES DÉTAILS ›"
  ],
  "OPEN": [
    "OFFEN",
    "ABIERTO",
    "OPEN",
    "APERTO",
    "OUVERT"
  ],
  "SHARED WORLD": [
    "GEMEINSAME WELT",
    "MUNDO COMPARTIDO",
    "GEDEELDE WERELD",
    "MONDO CONDIVISO",
    "MONDE PARTAGÉ"
  ],
  "ARENA FORMATION": [
    "ARENAFORMATION",
    "FORMACIÓN DE ARENA",
    "ARENAFORMATIE",
    "FORMAZIONE ARENA",
    "FORMATION D’ARÈNE"
  ],
  "3v3 combat preview": [
    "3-gegen-3-Kampfvorschau",
    "Vista previa de combate 3c3",
    "3-tegen-3-gevechtsvoorbeeld",
    "Anteprima combattimento 3 contro 3",
    "Aperçu du combat 3 contre 3"
  ],
  "ROUND 1 · FRONT LANE": [
    "RUNDE 1 · VORDERE REIHE",
    "RONDA 1 · FILA DELANTERA",
    "RONDE 1 · VOORSTE RIJ",
    "TURNO 1 · FILA ANTERIORE",
    "MANCHE 1 · LIGNE AVANT"
  ],
  "✦ Companion snapshot": [
    "✦ Begleiterabbild",
    "✦ Instantánea de compañero",
    "✦ Metgezelmomentopname",
    "✦ Istantanea compagno",
    "✦ Instantané de compagnon"
  ],
  "No companion equipped": [
    "Kein Begleiter ausgerüstet",
    "Sin compañero equipado",
    "Geen metgezel uitgerust",
    "Nessun compagno equipaggiato",
    "Aucun compagnon équipé"
  ],
  "COMBAT INSPECT": [
    "KAMPFDETAILS",
    "DETALLES DE COMBATE",
    "GEVECHTSDETAILS",
    "DETTAGLI COMBATTIMENTO",
    "DÉTAILS DU COMBAT"
  ],
  "Close combat details": [
    "Kampfdetails schließen",
    "Cerrar detalles de combate",
    "Gevechtsdetails sluiten",
    "Chiudi dettagli combattimento",
    "Fermer les détails du combat"
  ],
  "HP": [
    "LP",
    "PV",
    "HP",
    "PV",
    "PV"
  ],
  "BARRIER": [
    "BARRIERE",
    "BARRERA",
    "BARRIÈRE",
    "BARRIERA",
    "BARRIÈRE"
  ],
  "PHASE": [
    "PHASE",
    "FASE",
    "FASE",
    "FASE",
    "PHASE"
  ],
  "COMPANION": [
    "BEGLEITER",
    "COMPAÑERO",
    "METGEZEL",
    "COMPAGNO",
    "COMPAGNON"
  ],
  "ACTIVE EFFECTS": [
    "AKTIVE EFFEKTE",
    "EFECTOS ACTIVOS",
    "ACTIEVE EFFECTEN",
    "EFFETTI ATTIVI",
    "EFFETS ACTIFS"
  ],
  "No active timed effects at this replay moment.": [
    "Keine aktiven zeitlich begrenzten Effekte an dieser Stelle der Wiederholung.",
    "No hay efectos temporales activos en este momento de la repetición.",
    "Geen actieve tijdelijke effecten op dit herhalingsmoment.",
    "Nessun effetto temporaneo attivo in questo momento del replay.",
    "Aucun effet temporaire actif à cet instant du replay."
  ],
  "GEM": [
    "EDELSTEIN",
    "GEMA",
    "EDELSTEEN",
    "GEMMA",
    "GEMME"
  ],
  "DOWN": [
    "BESIEGT",
    "CAÍDO",
    "NEER",
    "CADUTO",
    "À TERRE"
  ],
  "LOW": [
    "NIEDRIG",
    "BAJO",
    "LAAG",
    "BASSO",
    "FAIBLE"
  ],
  "Entry": [
    "Zutritt",
    "Entrada",
    "Toegang",
    "Ingresso",
    "Entrée"
  ],
  "Mechanic": [
    "Mechanik",
    "Mecánica",
    "Mechaniek",
    "Meccanica",
    "Mécanique"
  ],
  "Objective": [
    "Ziel",
    "Objetivo",
    "Doel",
    "Obiettivo",
    "Objectif"
  ],
  "SEASONAL EVENT EXPEDITION": [
    "SAISONALE EVENTEXPEDITION",
    "EXPEDICIÓN DE EVENTO ESTACIONAL",
    "SEIZOENSEVENEMENTEXPEDITIE",
    "SPEDIZIONE EVENTO STAGIONALE",
    "EXPÉDITION D’ÉVÉNEMENT SAISONNIER"
  ],
  "Route": [
    "Route",
    "Ruta",
    "Route",
    "Percorso",
    "Parcours"
  ],
  "LIVE MATCHMAKING": [
    "LIVE-SPIELERSUCHE",
    "EMPAREJAMIENTO EN VIVO",
    "LIVE-MATCHMAKING",
    "MATCHMAKING LIVE",
    "RECHERCHE DE GROUPE EN DIRECT"
  ],
  "Find a dungeon party": [
    "Dungeongruppe suchen",
    "Buscar grupo de mazmorra",
    "Kerkergroep zoeken",
    "Trova gruppo dungeon",
    "Trouver un groupe de donjon"
  ],
  "Back to expeditions": [
    "Zurück zu Expeditionen",
    "Volver a expediciones",
    "Terug naar expedities",
    "Torna alle spedizioni",
    "Retour aux expéditions"
  ],
  "A live party of one Tank, two Damage, and one Support.": [
    "Eine Live-Gruppe aus einem Tank, zwei Schadensrollen und einer Unterstützung.",
    "Un grupo en vivo de un tanque, dos de daño y un apoyo.",
    "Een live-groep van één tank, twee schade en één ondersteuning.",
    "Un gruppo Live con un tank, due danni e un supporto.",
    "Un groupe en direct avec un tank, deux dégâts et un soutien."
  ],
  "Keep this screen open while searching. Server time controls every deadline.": [
    "Lass diesen Bildschirm während der Suche geöffnet. Alle Fristen richten sich nach der Serverzeit.",
    "Mantén esta pantalla abierta al buscar. El servidor controla todos los plazos.",
    "Houd dit scherm open tijdens het zoeken. Servertijd bepaalt alle termijnen.",
    "Tieni aperta questa schermata durante la ricerca. Il tempo server controlla le scadenze.",
    "Gardez cet écran ouvert pendant la recherche. L’heure du serveur détermine les délais."
  ],
  "Retry connection": [
    "Verbindung erneut versuchen",
    "Reintentar conexión",
    "Verbinding opnieuw proberen",
    "Riprova connessione",
    "Réessayer la connexion"
  ],
  "Pending action saved": [
    "Ausstehende Aktion gespeichert",
    "Acción pendiente guardada",
    "Openstaande actie opgeslagen",
    "Azione in sospeso salvata",
    "Action en attente enregistrée"
  ],
  "Your last matchmaking action will be retried safely against the server.": [
    "Deine letzte Suchaktion wird sicher beim Server wiederholt.",
    "Tu última acción de emparejamiento se reintentará de forma segura.",
    "Je laatste matchmakingactie wordt veilig opnieuw geprobeerd op de server.",
    "L’ultima azione di matchmaking sarà ritentata in sicurezza sul server.",
    "Votre dernière action de recherche sera réessayée en toute sécurité sur le serveur."
  ],
  "Retry pending action": [
    "Ausstehende Aktion wiederholen",
    "Reintentar acción pendiente",
    "Openstaande actie opnieuw proberen",
    "Riprova azione in sospeso",
    "Réessayer l’action en attente"
  ],
  "Restoring your matchmaking session…": [
    "Suchsitzung wird wiederhergestellt…",
    "Restaurando sesión de emparejamiento…",
    "Matchmakingsessie herstellen…",
    "Ripristino sessione matchmaking…",
    "Restauration de la session de recherche…"
  ],
  "SEARCHING": [
    "SUCHE",
    "BUSCANDO",
    "ZOEKEN",
    "RICERCA",
    "RECHERCHE"
  ],
  "Building your party": [
    "Gruppe wird zusammengestellt",
    "Formando tu grupo",
    "Je groep samenstellen",
    "Formazione del gruppo",
    "Formation de votre groupe"
  ],
  "IN QUEUE": [
    "IN WARTESCHLANGE",
    "EN COLA",
    "IN WACHTRIJ",
    "IN CODA",
    "EN FILE"
  ],
  "The matcher is looking for the remaining roles. You can cancel at any time.": [
    "Die Suche sucht die fehlenden Rollen. Du kannst jederzeit abbrechen.",
    "Se están buscando los roles restantes. Puedes cancelar cuando quieras.",
    "De zoeker zoekt de ontbrekende rollen. Je kunt altijd annuleren.",
    "La ricerca cerca i ruoli mancanti. Puoi annullare in qualsiasi momento.",
    "La recherche attend les rôles manquants. Vous pouvez annuler à tout moment."
  ],
  "Cancel search": [
    "Suche abbrechen",
    "Cancelar búsqueda",
    "Zoeken annuleren",
    "Annulla ricerca",
    "Annuler la recherche"
  ],
  "MATCH FOUND": [
    "GRUPPE GEFUNDEN",
    "GRUPO ENCONTRADO",
    "GROEP GEVONDEN",
    "GRUPPO TROVATO",
    "GROUPE TROUVÉ"
  ],
  "Your party is being assembled": [
    "Deine Gruppe wird zusammengestellt",
    "Tu grupo se está formando",
    "Je groep wordt samengesteld",
    "Il gruppo si sta formando",
    "Votre groupe est en cours de formation"
  ],
  "The server reserved a compatible roster. Loading the ready check now…": [
    "Der Server hat eine passende Gruppe reserviert. Bereitschaftsprüfung wird geladen…",
    "El servidor reservó un grupo compatible. Cargando confirmación…",
    "De server heeft een geschikte groep gereserveerd. Gereedheidscontrole laden…",
    "Il server ha riservato un gruppo compatibile. Caricamento conferma…",
    "Le serveur a réservé un groupe compatible. Chargement de la confirmation…"
  ],
  "No active search": [
    "Keine aktive Suche",
    "Sin búsqueda activa",
    "Geen actieve zoekopdracht",
    "Nessuna ricerca attiva",
    "Aucune recherche active"
  ],
  "Return to the expedition menu and start Quick Match or join a Live group post.": [
    "Kehre zum Expeditionsmenü zurück und starte die Schnellsuche oder tritt einer Live-Anzeige bei.",
    "Vuelve al menú de expediciones e inicia la búsqueda rápida o únete a un anuncio en vivo.",
    "Ga terug naar het expeditiemenu en start snelzoeken of sluit aan bij een live-groepsbericht.",
    "Torna al menu spedizioni e avvia la ricerca rapida o unisciti a un annuncio Live.",
    "Retournez au menu des expéditions pour lancer la recherche rapide ou rejoindre une annonce en direct."
  ],
  "Search ended": [
    "Suche beendet",
    "Búsqueda finalizada",
    "Zoekopdracht beëindigd",
    "Ricerca terminata",
    "Recherche terminée"
  ],
  "Your party search has ended. You can safely return to the expedition menu and start again.": [
    "Deine Gruppensuche ist beendet. Du kannst zum Expeditionsmenü zurückkehren und neu starten.",
    "La búsqueda de grupo terminó. Puedes volver al menú de expediciones y empezar de nuevo.",
    "Je groepszoekopdracht is beëindigd. Je kunt terug naar het expeditiemenu en opnieuw beginnen.",
    "La ricerca è terminata. Puoi tornare al menu spedizioni e ricominciare.",
    "La recherche de groupe est terminée. Vous pouvez revenir au menu des expéditions et recommencer."
  ],
  "LIVE QUICK MATCH": [
    "LIVE-SCHNELLSUCHE",
    "BÚSQUEDA RÁPIDA EN VIVO",
    "LIVE-SNELZOEKEN",
    "RICERCA RAPIDA LIVE",
    "RECHERCHE RAPIDE EN DIRECT"
  ],
  "Any eligible dungeon": [
    "Jeder berechtigte Dungeon",
    "Cualquier mazmorra válida",
    "Elke geschikte kerker",
    "Qualsiasi dungeon idoneo",
    "Tout donjon éligible"
  ],
  "FASTEST POOL": [
    "SCHNELLSTE SUCHE",
    "COLA MÁS RÁPIDA",
    "SNELSTE WACHTRIJ",
    "CODA PIÙ VELOCE",
    "FILE LA PLUS RAPIDE"
  ],
  "Quick Match": [
    "Schnellsuche",
    "Búsqueda rápida",
    "Snelzoeken",
    "Ricerca rapida",
    "Recherche rapide"
  ],
  "LIVE GROUP BOARD": [
    "LIVE-GRUPPENTAFEL",
    "TABLÓN DE GRUPOS EN VIVO",
    "LIVE-GROEPSBORD",
    "BACHECA GRUPPI LIVE",
    "TABLEAU DES GROUPES EN DIRECT"
  ],
  "30-minute LFG posts": [
    "Gruppensuche für 30 Minuten",
    "Anuncios de grupo de 30 minutos",
    "Groepsberichten van 30 minuten",
    "Annunci gruppo da 30 minuti",
    "Annonces de groupe de 30 minutes"
  ],
  "DUNGEON": [
    "DUNGEON",
    "MAZMORRA",
    "KERKER",
    "DUNGEON",
    "DONJON"
  ],
  "OPTIONAL NOTE": [
    "OPTIONALE NOTIZ",
    "NOTA OPCIONAL",
    "OPTIONELE NOTITIE",
    "NOTA FACOLTATIVA",
    "NOTE FACULTATIVE"
  ],
  "Co-op LFG note": [
    "Notiz zur Koop-Gruppensuche",
    "Nota de búsqueda cooperativa",
    "Coöpgroepsnotitie",
    "Nota ricerca gruppo cooperativo",
    "Note de recherche de groupe coopératif"
  ],
  "Starting now, chill run, learning boss…": [
    "Starten jetzt, entspannter Lauf, Boss lernen…",
    "Empezando ahora, partida tranquila, aprendiendo jefe…",
    "Nu starten, ontspannen run, baas leren…",
    "Si parte ora, partita tranquilla, impariamo il boss…",
    "Départ maintenant, partie détendue, découverte du boss…"
  ],
  "Join this search": [
    "Dieser Suche beitreten",
    "Unirse a esta búsqueda",
    "Aansluiten bij deze zoekopdracht",
    "Unisciti alla ricerca",
    "Rejoindre cette recherche"
  ],
  "No other Live LFG posts right now. Quick Match is still available.": [
    "Derzeit keine weiteren Live-Anzeigen. Die Schnellsuche ist verfügbar.",
    "No hay otros anuncios en vivo. La búsqueda rápida sigue disponible.",
    "Momenteel geen andere live-groepsberichten. Snelzoeken blijft beschikbaar.",
    "Nessun altro annuncio Live al momento. La ricerca rapida resta disponibile.",
    "Aucune autre annonce en direct. La recherche rapide reste disponible."
  ],
  "Your party is resolving this room. Progress is saved online.": [
    "Deine Gruppe schließt diesen Raum ab. Der Fortschritt wird online gespeichert.",
    "Tu grupo está resolviendo esta sala. El progreso se guarda en línea.",
    "Je groep werkt deze kamer af. Voortgang wordt online opgeslagen.",
    "Il gruppo sta risolvendo la stanza. I progressi sono salvati online.",
    "Votre groupe résout cette salle. La progression est sauvegardée en ligne."
  ],
  "PVE INTEL": [
    "PVE-INFORMATIONEN",
    "INFORMACIÓN JCE",
    "PVE-INFORMATIE",
    "INFORMAZIONI PVE",
    "RENSEIGNEMENTS JCE"
  ],
  "Refresh saved progress": [
    "Gespeicherten Fortschritt aktualisieren",
    "Actualizar progreso guardado",
    "Opgeslagen voortgang vernieuwen",
    "Aggiorna progressi salvati",
    "Actualiser la progression sauvegardée"
  ],
  "Expedition Marks collected.": [
    "Expeditionsmarken abgeholt.",
    "Marcas de expedición recogidas.",
    "Expeditiemerken opgehaald.",
    "Marche spedizione raccolte.",
    "Marques d’expédition récupérées."
  ],
  "Collect expedition reward": [
    "Expeditionsbelohnung abholen",
    "Recoger recompensa de expedición",
    "Expeditiebeloning ophalen",
    "Raccogli ricompensa spedizione",
    "Récupérer la récompense d’expédition"
  ],
  "SECURED": [
    "GESICHERT",
    "ASEGURADO",
    "VEILIGGESTELD",
    "ASSICURATO",
    "SÉCURISÉ"
  ],
  "Previous combat event": [
    "Vorheriges Kampfereignis",
    "Evento de combate anterior",
    "Vorige gevechtsgebeurtenis",
    "Evento combattimento precedente",
    "Événement de combat précédent"
  ],
  "Next combat event": [
    "Nächstes Kampfereignis",
    "Siguiente evento de combate",
    "Volgende gevechtsgebeurtenis",
    "Evento combattimento successivo",
    "Événement de combat suivant"
  ],
  "Skip combat replay to result": [
    "Kampfwiederholung zum Ergebnis überspringen",
    "Saltar repetición al resultado",
    "Gevechtsherhaling overslaan naar resultaat",
    "Salta replay al risultato",
    "Passer le replay au résultat"
  ],
  "Skip →": [
    "Überspringen →",
    "Saltar →",
    "Overslaan →",
    "Salta →",
    "Passer →"
  ],
  "PARTY CONTRIBUTION": [
    "GRUPPENBEITRAG",
    "CONTRIBUCIÓN DEL GRUPO",
    "GROEPSBIJDRAGE",
    "CONTRIBUTO GRUPPO",
    "CONTRIBUTION DU GROUPE"
  ],
  "authoritative totals": [
    "Serverbestätigte Summen",
    "Totales del servidor",
    "Servertotalen",
    "Totali del server",
    "Totaux du serveur"
  ],
  "Replay combat recap": [
    "Kampfzusammenfassung abspielen",
    "Reproducir resumen de combate",
    "Gevechtssamenvatting herhalen",
    "Riproduci riepilogo combattimento",
    "Rejouer le résumé du combat"
  ],
  "↻ Replay encounter": [
    "↻ Begegnung wiederholen",
    "↻ Repetir encuentro",
    "↻ Gevecht herhalen",
    "↻ Ripeti scontro",
    "↻ Rejouer la rencontre"
  ],
  "FINAL BOSS PLAN": [
    "ENDBOSSPLAN",
    "PLAN DEL JEFE FINAL",
    "EINDBAASPLAN",
    "PIANO BOSS FINALE",
    "PLAN DU BOSS FINAL"
  ],
  "PHASE TRACKER": [
    "PHASENÜBERSICHT",
    "SEGUIMIENTO DE FASES",
    "FASEOVERZICHT",
    "TRACCIAMENTO FASI",
    "SUIVI DES PHASES"
  ],
  "OBJECTIVE": [
    "ZIEL",
    "OBJETIVO",
    "DOEL",
    "OBIETTIVO",
    "OBJECTIF"
  ],
  "CAST TELEGRAPHS": [
    "ZAUBERANKÜNDIGUNGEN",
    "AVISOS DE LANZAMIENTO",
    "SPREUKWAARSCHUWINGEN",
    "AVVISI LANCIO",
    "ANNONCES D’INCANTATION"
  ],
  "SUPPRESSED BY YOUR RUN": [
    "DURCH DEINEN LAUF UNTERDRÜCKT",
    "SUPRIMIDO POR TU PARTIDA",
    "ONDERDRUKT DOOR JE RUN",
    "SOPPRESSO DALLA TUA PARTITA",
    "NEUTRALISÉ PAR VOTRE PARCOURS"
  ],
  "BOSS RECAP": [
    "BOSSZUSAMMENFASSUNG",
    "RESUMEN DEL JEFE",
    "BAASSAMENVATTING",
    "RIEPILOGO BOSS",
    "RÉSUMÉ DU BOSS"
  ],
  "Phases triggered": [
    "Ausgelöste Phasen",
    "Fases activadas",
    "Geactiveerde fases",
    "Fasi attivate",
    "Phases déclenchées"
  ],
  "Boss casts seen": [
    "Gesehene Bosszauber",
    "Lanzamientos del jefe vistos",
    "Geziene baasspreuken",
    "Lanci del boss osservati",
    "Incantations du boss observées"
  ],
  "Unable to load this player profile.": [
    "Dieses Spielerprofil konnte nicht geladen werden.",
    "No se pudo cargar este perfil.",
    "Dit spelersprofiel kon niet worden geladen.",
    "Impossibile caricare questo profilo.",
    "Impossible de charger ce profil."
  ],
  "Friend status could not refresh.": [
    "Freundesstatus konnte nicht aktualisiert werden.",
    "No se pudo actualizar la amistad.",
    "Vriendstatus kon niet worden vernieuwd.",
    "Impossibile aggiornare l’amicizia.",
    "Impossible d’actualiser l’amitié."
  ],
  "Invitation actions are unavailable.": [
    "Einladungsaktionen sind nicht verfügbar.",
    "Las invitaciones no están disponibles.",
    "Uitnodigingsacties zijn niet beschikbaar.",
    "Le azioni di invito non sono disponibili.",
    "Les invitations sont indisponibles."
  ],
  "Unable to update this friendship.": [
    "Diese Freundschaft konnte nicht aktualisiert werden.",
    "No se pudo actualizar esta amistad.",
    "Deze vriendschap kon niet worden bijgewerkt.",
    "Impossibile aggiornare questa amicizia.",
    "Impossible de mettre à jour cette amitié."
  ],
  "They will be removed from your Friends list. You can send a new request later.": [
    "Die Person wird aus deiner Freundesliste entfernt. Du kannst später eine neue Anfrage senden.",
    "Se eliminará de tus amigos. Puedes enviar otra solicitud más tarde.",
    "Deze persoon wordt uit je vriendenlijst verwijderd. Je kunt later een nieuw verzoek sturen.",
    "Sarà rimosso dagli amici. Puoi inviare una nuova richiesta in seguito.",
    "Cette personne sera retirée de vos amis. Vous pourrez envoyer une nouvelle demande plus tard."
  ],
  "Their messages will be hidden and they will be removed from your social lists.": [
    "Nachrichten dieser Person werden verborgen und sie wird aus deinen sozialen Listen entfernt.",
    "Sus mensajes se ocultarán y se eliminará de tus listas sociales.",
    "Berichten van deze persoon worden verborgen en deze wordt uit je sociale lijsten verwijderd.",
    "I suoi messaggi saranno nascosti e verrà rimosso dalle liste sociali.",
    "Ses messages seront masqués et cette personne sera retirée de vos listes sociales."
  ],
  "Block player": [
    "Spieler blockieren",
    "Bloquear jugador",
    "Speler blokkeren",
    "Blocca giocatore",
    "Bloquer le joueur"
  ],
  "Unable to block player.": [
    "Spieler konnte nicht blockiert werden.",
    "No se pudo bloquear al jugador.",
    "Speler kon niet worden geblokkeerd.",
    "Impossibile bloccare il giocatore.",
    "Impossible de bloquer le joueur."
  ],
  "Report player": [
    "Spieler melden",
    "Denunciar jugador",
    "Speler melden",
    "Segnala giocatore",
    "Signaler le joueur"
  ],
  "Unable to submit this report.": [
    "Meldung konnte nicht gesendet werden.",
    "No se pudo enviar la denuncia.",
    "Melding kon niet worden verstuurd.",
    "Impossibile inviare la segnalazione.",
    "Impossible d’envoyer le signalement."
  ],
  "Choose what needs review.": [
    "Wähle, was geprüft werden soll.",
    "Elige qué debe revisarse.",
    "Kies wat beoordeeld moet worden.",
    "Scegli cosa deve essere esaminato.",
    "Choisissez ce qui doit être examiné."
  ],
  "Party invitation": [
    "Gruppeneinladung",
    "Invitación de grupo",
    "Groepsuitnodiging",
    "Invito al gruppo",
    "Invitation de groupe"
  ],
  "Unable to send Party invitation.": [
    "Gruppeneinladung konnte nicht gesendet werden.",
    "No se pudo enviar la invitación de grupo.",
    "Groepsuitnodiging kon niet worden verstuurd.",
    "Impossibile inviare l’invito al gruppo.",
    "Impossible d’envoyer l’invitation de groupe."
  ],
  "Guild invitation": [
    "Gildeneinladung",
    "Invitación de gremio",
    "Gilde-uitnodiging",
    "Invito alla gilda",
    "Invitation de guilde"
  ],
  "Unable to send Guild invitation.": [
    "Gildeneinladung konnte nicht gesendet werden.",
    "No se pudo enviar la invitación al gremio.",
    "Gilde-uitnodiging kon niet worden verstuurd.",
    "Impossibile inviare l’invito alla gilda.",
    "Impossible d’envoyer l’invitation de guilde."
  ],
  "Guild chat unavailable.": [
    "Gildenchat nicht verfügbar.",
    "Chat de gremio no disponible.",
    "Gildechat niet beschikbaar.",
    "Chat di gilda non disponibile.",
    "Discussion de guilde indisponible."
  ],
  "Guild chat": [
    "Gildenchat",
    "Chat del gremio",
    "Gildechat",
    "Chat di gilda",
    "Discussion de guilde"
  ],
  "Use at most 2 emotes in one message.": [
    "Verwende höchstens 2 Emotes pro Nachricht.",
    "Usa como máximo 2 emoticonos por mensaje.",
    "Gebruik maximaal 2 emotes per bericht.",
    "Usa al massimo 2 emote per messaggio.",
    "Utilisez au maximum 2 émotes par message."
  ],
  "One or more emotes in this message are still locked.": [
    "Mindestens ein Emote dieser Nachricht ist noch gesperrt.",
    "Uno o más emoticonos del mensaje siguen bloqueados.",
    "Een of meer emotes in dit bericht zijn nog vergrendeld.",
    "Una o più emote del messaggio sono ancora bloccate.",
    "Une ou plusieurs émotes du message sont encore verrouillées."
  ],
  "Message failed. Try again.": [
    "Nachricht fehlgeschlagen. Erneut versuchen.",
    "El mensaje falló. Inténtalo otra vez.",
    "Bericht mislukt. Probeer opnieuw.",
    "Messaggio non inviato. Riprova.",
    "Échec du message. Réessayez."
  ],
  "Could not load Guild Quests.": [
    "Gildenaufträge konnten nicht geladen werden.",
    "No se pudieron cargar las misiones del gremio.",
    "Gildemissies konden niet worden geladen.",
    "Impossibile caricare le missioni di gilda.",
    "Impossible de charger les quêtes de guilde."
  ],
  "Unable to load guilds.": [
    "Gilden konnten nicht geladen werden.",
    "No se pudieron cargar los gremios.",
    "Gildes konden niet worden geladen.",
    "Impossibile caricare le gilde.",
    "Impossible de charger les guildes."
  ],
  "Unable to check that tag.": [
    "Dieses Kürzel konnte nicht geprüft werden.",
    "No se pudo comprobar la etiqueta.",
    "Die tag kon niet worden gecontroleerd.",
    "Impossibile controllare il tag.",
    "Impossible de vérifier ce tag."
  ],
  "Unable to join guild.": [
    "Gildenbeitritt fehlgeschlagen.",
    "No se pudo unir al gremio.",
    "Toetreden tot gilde mislukt.",
    "Impossibile unirsi alla gilda.",
    "Impossible de rejoindre la guilde."
  ],
  "Guild created": [
    "Gilde gegründet",
    "Gremio creado",
    "Gilde opgericht",
    "Gilda creata",
    "Guilde créée"
  ],
  "Your guild tag is permanently reserved and visible with your guild identity.": [
    "Dein Gildenkürzel ist dauerhaft reserviert und bei deiner Gildenidentität sichtbar.",
    "Tu etiqueta está reservada permanentemente y visible con la identidad del gremio.",
    "Je gildetag is permanent gereserveerd en zichtbaar bij je gilde-identiteit.",
    "Il tag è riservato permanentemente e visibile nell’identità della gilda.",
    "Votre tag est réservé définitivement et visible avec l’identité de guilde."
  ],
  "Create guild": [
    "Gilde gründen",
    "Crear gremio",
    "Gilde oprichten",
    "Crea gilda",
    "Créer une guilde"
  ],
  "Unable to create guild.": [
    "Gilde konnte nicht gegründet werden.",
    "No se pudo crear el gremio.",
    "Gilde kon niet worden opgericht.",
    "Impossibile creare la gilda.",
    "Impossible de créer la guilde."
  ],
  "Unable to load guild customization.": [
    "Gildenanpassung konnte nicht geladen werden.",
    "No se pudo cargar la personalización del gremio.",
    "Gildeaanpassing kon niet worden geladen.",
    "Impossibile caricare la personalizzazione della gilda.",
    "Impossible de charger la personnalisation de guilde."
  ],
  "Guild updated": [
    "Gilde aktualisiert",
    "Gremio actualizado",
    "Gilde bijgewerkt",
    "Gilda aggiornata",
    "Guilde actualisée"
  ],
  "Your entitlement-validated guild visuals are now visible across social surfaces.": [
    "Deine berechtigungsgeprüfte Gildengestaltung ist jetzt in den sozialen Bereichen sichtbar.",
    "Tu diseño validado ya es visible en las secciones sociales.",
    "Je gevalideerde gilde-uiterlijk is nu zichtbaar in de sociale onderdelen.",
    "L’aspetto convalidato della gilda è ora visibile nelle sezioni sociali.",
    "Les visuels de guilde validés sont désormais visibles dans les espaces sociaux."
  ],
  "Unable to save guild customization.": [
    "Gildenanpassung konnte nicht gespeichert werden.",
    "No se pudo guardar la personalización.",
    "Gildeaanpassing kon niet worden opgeslagen.",
    "Impossibile salvare la personalizzazione.",
    "Impossible d’enregistrer la personnalisation."
  ],
  "Change guild tag?": [
    "Gildenkürzel ändern?",
    "¿Cambiar etiqueta del gremio?",
    "Gildetag wijzigen?",
    "Cambiare tag della gilda?",
    "Changer le tag de guilde ?"
  ],
  "The old tag is permanently retired and can never be claimed again.": [
    "Das alte Kürzel wird dauerhaft gesperrt und kann nie wieder beansprucht werden.",
    "La etiqueta anterior se retira permanentemente y no podrá reclamarse de nuevo.",
    "De oude tag wordt permanent ingetrokken en kan nooit meer worden geclaimd.",
    "Il vecchio tag è ritirato per sempre e non sarà più disponibile.",
    "L’ancien tag est retiré définitivement et ne pourra plus être réclamé."
  ],
  "Guild tag updated": [
    "Gildenkürzel aktualisiert",
    "Etiqueta actualizada",
    "Gildetag bijgewerkt",
    "Tag aggiornato",
    "Tag de guilde actualisé"
  ],
  "Unable to change the guild tag.": [
    "Gildenkürzel konnte nicht geändert werden.",
    "No se pudo cambiar la etiqueta.",
    "Gildetag kon niet worden gewijzigd.",
    "Impossibile cambiare il tag.",
    "Impossible de changer le tag."
  ],
  "Unable to load Guild Hall.": [
    "Gildenhalle konnte nicht geladen werden.",
    "No se pudo cargar la sala del gremio.",
    "Gildehal kon niet worden geladen.",
    "Impossibile caricare la sala di gilda.",
    "Impossible de charger le hall de guilde."
  ],
  "Unable to load your online guild.": [
    "Deine Onlinegilde konnte nicht geladen werden.",
    "No se pudo cargar tu gremio en línea.",
    "Je online gilde kon niet worden geladen.",
    "Impossibile caricare la gilda online.",
    "Impossible de charger votre guilde en ligne."
  ],
  "Unable to respond to this Guild invitation.": [
    "Diese Gildeneinladung konnte nicht beantwortet werden.",
    "No se pudo responder a esta invitación.",
    "Deze gilde-uitnodiging kon niet worden beantwoord.",
    "Impossibile rispondere all’invito.",
    "Impossible de répondre à cette invitation."
  ],
  "Guild application": [
    "Gildenbewerbung",
    "Solicitud de gremio",
    "Gildeaanvraag",
    "Candidatura di gilda",
    "Candidature de guilde"
  ],
  "Unable to review application.": [
    "Bewerbung konnte nicht geprüft werden.",
    "No se pudo revisar la solicitud.",
    "Aanvraag kon niet worden beoordeeld.",
    "Impossibile esaminare la candidatura.",
    "Impossible d’examiner la candidature."
  ],
  "Unable to cancel invitation.": [
    "Einladung konnte nicht zurückgezogen werden.",
    "No se pudo cancelar la invitación.",
    "Uitnodiging kon niet worden geannuleerd.",
    "Impossibile annullare l’invito.",
    "Impossible d’annuler l’invitation."
  ],
  "Guild member": [
    "Gildenmitglied",
    "Miembro del gremio",
    "Gildelid",
    "Membro della gilda",
    "Membre de guilde"
  ],
  "Transfer Guild leadership?": [
    "Gildenführung übertragen?",
    "¿Transferir liderazgo del gremio?",
    "Gildeleiderschap overdragen?",
    "Trasferire la guida della gilda?",
    "Transférer la direction de guilde ?"
  ],
  "Guild member controls": [
    "Gildenmitgliederverwaltung",
    "Controles de miembros",
    "Gildeledenbeheer",
    "Gestione membri della gilda",
    "Gestion des membres de guilde"
  ],
  "Leave Guild?": [
    "Gilde verlassen?",
    "¿Salir del gremio?",
    "Gilde verlaten?",
    "Lasciare la gilda?",
    "Quitter la guilde ?"
  ],
  "You will lose access to Guild projects, chat and member benefits until you join another Guild.": [
    "Du verlierst Zugang zu Gildenprojekten, Chat und Mitgliedsvorteilen, bis du einer anderen Gilde beitrittst.",
    "Perderás acceso a proyectos, chat y ventajas hasta unirte a otro gremio.",
    "Je verliest toegang tot projecten, chat en ledenvoordelen totdat je een ander gilde betreedt.",
    "Perderai accesso a progetti, chat e vantaggi finché non ti unirai a un’altra gilda.",
    "Vous perdrez l’accès aux projets, à la discussion et aux avantages jusqu’à rejoindre une autre guilde."
  ],
  "Unable to leave Guild.": [
    "Gilde konnte nicht verlassen werden.",
    "No se pudo salir del gremio.",
    "Gilde kon niet worden verlaten.",
    "Impossibile lasciare la gilda.",
    "Impossible de quitter la guilde."
  ],
  "Disband Guild?": [
    "Gilde auflösen?",
    "¿Disolver gremio?",
    "Gilde opheffen?",
    "Sciogliere la gilda?",
    "Dissoudre la guilde ?"
  ],
  "This permanently closes the Guild for every member and removes its shared Guild progress.": [
    "Dies schließt die Gilde dauerhaft für alle Mitglieder und entfernt den gemeinsamen Fortschritt.",
    "Esto cierra el gremio permanentemente para todos y elimina su progreso compartido.",
    "Dit sluit het gilde permanent voor alle leden en verwijdert gezamenlijke voortgang.",
    "Questo chiude la gilda per tutti definitivamente e rimuove i progressi condivisi.",
    "Cela ferme définitivement la guilde pour tous les membres et supprime sa progression commune."
  ],
  "Confirm disband": [
    "Auflösung bestätigen",
    "Confirmar disolución",
    "Opheffing bevestigen",
    "Conferma scioglimento",
    "Confirmer la dissolution"
  ],
  "Unable to disband Guild.": [
    "Gilde konnte nicht aufgelöst werden.",
    "No se pudo disolver el gremio.",
    "Gilde kon niet worden opgeheven.",
    "Impossibile sciogliere la gilda.",
    "Impossible de dissoudre la guilde."
  ],
  "Unable to load Guild Muster.": [
    "Gildenappell konnte nicht geladen werden.",
    "No se pudo cargar la reunión del gremio.",
    "Gildeappèl kon niet worden geladen.",
    "Impossibile caricare l’adunata.",
    "Impossible de charger l’appel de guilde."
  ],
  "Unable to load the Guild Notice Board.": [
    "Gildentafel konnte nicht geladen werden.",
    "No se pudo cargar el tablón del gremio.",
    "Gildemededelingenbord kon niet worden geladen.",
    "Impossibile caricare la bacheca.",
    "Impossible de charger le tableau de guilde."
  ],
  "Unable to update the Guild Notice Board.": [
    "Gildentafel konnte nicht aktualisiert werden.",
    "No se pudo actualizar el tablón.",
    "Gildemededelingenbord kon niet worden bijgewerkt.",
    "Impossibile aggiornare la bacheca.",
    "Impossible de mettre à jour le tableau."
  ],
  "Unable to load Guild Projects.": [
    "Gildenprojekte konnten nicht geladen werden.",
    "No se pudieron cargar los proyectos.",
    "Gildeprojecten konden niet worden geladen.",
    "Impossibile caricare i progetti.",
    "Impossible de charger les projets de guilde."
  ],
  "Guild Project action failed.": [
    "Gildenprojektaktion fehlgeschlagen.",
    "La acción del proyecto falló.",
    "Gildeprojectactie mislukt.",
    "Azione del progetto fallita.",
    "Échec de l’action du projet de guilde."
  ],
  "Guild PvE": [
    "Gilden-PvE",
    "JcE de gremio",
    "Gilde-PvE",
    "PvE di gilda",
    "JcE de guilde"
  ],
  "Unable to load weekly Guild state.": [
    "Wöchentlicher Gildenstand konnte nicht geladen werden.",
    "No se pudo cargar el estado semanal del gremio.",
    "Wekelijkse gildestatus kon niet worden geladen.",
    "Impossibile caricare lo stato settimanale.",
    "Impossible de charger l’état hebdomadaire de guilde."
  ],
  "Unable to record contribution.": [
    "Beitrag konnte nicht erfasst werden.",
    "No se pudo registrar la contribución.",
    "Bijdrage kon niet worden vastgelegd.",
    "Impossibile registrare il contributo.",
    "Impossible d’enregistrer la contribution."
  ],
  "Chat unavailable.": [
    "Chat nicht verfügbar.",
    "Chat no disponible.",
    "Chat niet beschikbaar.",
    "Chat non disponibile.",
    "Discussion indisponible."
  ],
  "Unable to load chat.": [
    "Chat konnte nicht geladen werden.",
    "No se pudo cargar el chat.",
    "Chat kon niet worden geladen.",
    "Impossibile caricare la chat.",
    "Impossible de charger la discussion."
  ],
  "World chat": [
    "Weltchat",
    "Chat mundial",
    "Wereldchat",
    "Chat mondiale",
    "Discussion mondiale"
  ],
  "Unable to send message.": [
    "Nachricht konnte nicht gesendet werden.",
    "No se pudo enviar el mensaje.",
    "Bericht kon niet worden verstuurd.",
    "Impossibile inviare il messaggio.",
    "Impossible d’envoyer le message."
  ],
  "Edit emote tray": [
    "Emote-Leiste bearbeiten",
    "Editar bandeja de emoticonos",
    "Emotevak bewerken",
    "Modifica barra emote",
    "Modifier la barre d’émotes"
  ],
  "☺ Emotes": [
    "☺ Emotes",
    "☺ Emoticonos",
    "☺ Emotes",
    "☺ Emote",
    "☺ Émotes"
  ],
  "Choose your 5 emotes": [
    "Wähle deine 5 Emotes",
    "Elige tus 5 emoticonos",
    "Kies je 5 emotes",
    "Scegli le tue 5 emote",
    "Choisissez vos 5 émotes"
  ],
  "Quick emotes": [
    "Schnelle Emotes",
    "Emoticonos rápidos",
    "Snelle emotes",
    "Emote rapide",
    "Émotes rapides"
  ],
  "Cancel emote tray editing": [
    "Bearbeiten der Emote-Leiste abbrechen",
    "Cancelar edición de emoticonos",
    "Emotevak bewerken annuleren",
    "Annulla modifica emote",
    "Annuler la modification des émotes"
  ],
  "Edit 5": [
    "5 bearbeiten",
    "Editar 5",
    "5 bewerken",
    "Modifica 5",
    "Modifier 5"
  ],
  "{count}/{total} selected": [
    "{count}/{total} gewählt",
    "{count}/{total} elegidos",
    "{count}/{total} gekozen",
    "{count}/{total} scelti",
    "{count}/{total} sélectionnés"
  ],
  "5 slots · {count}/{total} used": [
    "5 Plätze · {count}/{total} benutzt",
    "5 espacios · {count}/{total} usados",
    "5 plekken · {count}/{total} gebruikt",
    "5 posti · {count}/{total} usati",
    "5 emplacements · {count}/{total} utilisés"
  ],
  "Slot {slot}: ": [
    "Platz {slot}: ",
    "Espacio {slot}: ",
    "Plek {slot}: ",
    "Posto {slot}: ",
    "Emplacement {slot} : "
  ],
  "Block {name}?": [
    "{name} blockieren?",
    "¿Bloquear a {name}?",
    "{name} blokkeren?",
    "Bloccare {name}?",
    "Bloquer {name} ?"
  ],
  "Report {name}": [
    "{name} melden",
    "Denunciar a {name}",
    "{name} melden",
    "Segnala {name}",
    "Signaler {name}"
  ],
  "Name / profile": [
    "Name / Profil",
    "Nombre / perfil",
    "Naam / profiel",
    "Nome / profilo",
    "Nom / profil"
  ],
  "Harassment / spam": [
    "Belästigung / Spam",
    "Acoso / spam",
    "Intimidatie / spam",
    "Molestie / spam",
    "Harcèlement / spam"
  ],
  "You already submitted this report recently.": [
    "Du hast diese Meldung kürzlich bereits gesendet.",
    "Ya enviaste esta denuncia recientemente.",
    "Je hebt deze melding onlangs al verstuurd.",
    "Hai già inviato questa segnalazione di recente.",
    "Vous avez déjà envoyé ce signalement récemment."
  ],
  "Report submitted for review. Blocking is separate and remains your choice.": [
    "Meldung zur Prüfung gesendet. Blockieren ist unabhängig davon deine Entscheidung.",
    "Denuncia enviada para revisión. Bloquear es una acción aparte y queda a tu elección.",
    "Melding verstuurd ter beoordeling. Blokkeren staat daar los van en blijft jouw keuze.",
    "Segnalazione inviata. Il blocco è separato e resta una tua scelta.",
    "Signalement envoyé pour examen. Le blocage reste un choix distinct."
  ],
  "A Party invitation is already pending.": [
    "Eine Gruppeneinladung ist bereits ausstehend.",
    "Ya hay una invitación de grupo pendiente.",
    "Er staat al een groepsuitnodiging open.",
    "Un invito al gruppo è già in attesa.",
    "Une invitation de groupe est déjà en attente."
  ],
  "Party invitation sent for 24 hours.": [
    "Gruppeneinladung für 24 Stunden gesendet.",
    "Invitación de grupo enviada por 24 horas.",
    "Groepsuitnodiging verstuurd voor 24 uur.",
    "Invito al gruppo inviato per 24 ore.",
    "Invitation de groupe envoyée pour 24 heures."
  ],
  "A Guild invitation is already pending.": [
    "Eine Gildeneinladung ist bereits ausstehend.",
    "Ya hay una invitación de gremio pendiente.",
    "Er staat al een gilde-uitnodiging open.",
    "Un invito alla gilda è già in attesa.",
    "Une invitation de guilde est déjà en attente."
  ],
  "Guild invitation sent for 24 hours.": [
    "Gildeneinladung für 24 Stunden gesendet.",
    "Invitación de gremio enviada por 24 horas.",
    "Gilde-uitnodiging verstuurd voor 24 uur.",
    "Invito alla gilda inviato per 24 ore.",
    "Invitation de guilde envoyée pour 24 heures."
  ],
  "Parties are persistent groups of 1–4 players. You can stay together while doing different activities.": [
    "Gruppen sind dauerhafte Zusammenschlüsse von 1–4 Spielern. Ihr könnt bei verschiedenen Aktivitäten zusammenbleiben.",
    "Los grupos son persistentes y tienen 1–4 jugadores. Podéis seguir juntos haciendo actividades distintas.",
    "Groepen blijven bestaan en hebben 1–4 spelers. Je kunt samen blijven terwijl je verschillende activiteiten doet.",
    "I gruppi persistenti hanno 1–4 giocatori. Potete restare insieme svolgendo attività diverse.",
    "Les groupes persistants réunissent 1 à 4 joueurs. Vous pouvez rester ensemble en pratiquant différentes activités."
  ],
  "Weekly Party Contracts combine verified Combat, Skilling, or Mixed progress. Harder and slower activities are worth more normalized contribution.": [
    "Wöchentliche Gruppenverträge kombinieren geprüften Kampf-, Fertigkeits- oder gemischten Fortschritt. Schwerere und langsamere Aktivitäten geben mehr normalisierten Beitrag.",
    "Los contratos semanales combinan progreso verificado de combate, habilidades o mixto. Las actividades más difíciles y lentas aportan más contribución normalizada.",
    "Wekelijkse groepscontracten combineren geverifieerde gevechts-, vaardigheids- of gemengde voortgang. Moeilijkere en tragere activiteiten leveren meer genormaliseerde bijdrage op.",
    "I contratti settimanali combinano progressi verificati di combattimento, abilità o misti. Le attività più difficili e lente danno più contributo normalizzato.",
    "Les contrats hebdomadaires combinent les progrès vérifiés de combat, compétences ou mixtes. Les activités plus difficiles et lentes rapportent davantage de contribution normalisée."
  ],
  "Everyone shares Contract progress, but each member must contribute a minimum amount to earn the completion reward.": [
    "Alle teilen den Vertragsfortschritt, aber jedes Mitglied muss einen Mindestbeitrag für die Abschlussbelohnung leisten.",
    "Todos comparten el progreso, pero cada miembro debe aportar un mínimo para ganar la recompensa final.",
    "Iedereen deelt contractvoortgang, maar elk lid moet een minimumbijdrage leveren voor de voltooiingsbeloning.",
    "Tutti condividono i progressi, ma ogni membro deve contribuire un minimo per ottenere la ricompensa finale.",
    "Tous partagent la progression du contrat, mais chaque membre doit contribuer un minimum pour obtenir la récompense finale."
  ],
  "Looking for Party and Looking for Members adverts last 1 day. Guild and Guild-Seeker adverts normally last 3 days, so old posts disappear automatically.": [
    "Gruppen- und Mitgliedersuchen bleiben 1 Tag aktiv. Gildenanzeigen bleiben normalerweise 3 Tage aktiv. Alte Anzeigen verschwinden automatisch.",
    "Los anuncios de grupo y miembros duran 1 día. Los de gremios y buscadores de gremio duran 3 días, por lo que los antiguos desaparecen solos.",
    "Groeps- en ledenzoekadvertenties blijven 1 dag staan. Gildeadvertenties blijven normaal 3 dagen staan, zodat oude berichten automatisch verdwijnen.",
    "Gli annunci di ricerca gruppo e membri durano 1 giorno. Quelli di gilde durano normalmente 3 giorni: i vecchi annunci scompaiono automaticamente.",
    "Les annonces de recherche de groupe et de membres durent 1 jour. Celles de guilde durent normalement 3 jours ; les anciennes disparaissent automatiquement."
  ],
  "Use Search and Filters to find the activity focus, role, availability, playstyle, or guild style you want. Your current Contract is only context and never blocks discovery.": [
    "Nutze Suche und Filter für Aktivitätsschwerpunkt, Rolle, Verfügbarkeit, Spielstil oder Gildenstil. Dein aktueller Vertrag ist nur Kontext und blockiert nie die Suche.",
    "Usa búsqueda y filtros para encontrar enfoque, rol, disponibilidad, estilo de juego o de gremio. Tu contrato actual solo aporta contexto y nunca bloquea la búsqueda.",
    "Gebruik zoeken en filters voor activiteit, rol, beschikbaarheid, speelstijl of gildestijl. Je huidige contract is alleen context en blokkeert nooit het zoeken.",
    "Usa ricerca e filtri per trovare attività, ruolo, disponibilità, stile di gioco o di gilda. Il contratto attuale è solo contesto e non blocca la ricerca.",
    "Utilisez recherche et filtres pour trouver activité, rôle, disponibilité, style de jeu ou de guilde. Votre contrat actuel n’est qu’un contexte et ne bloque jamais la recherche."
  ],
  "Party Chat appears only while you are currently in a Party.": [
    "Gruppenchat erscheint nur, wenn du in einer Gruppe bist.",
    "El chat de grupo solo aparece mientras estás en un grupo.",
    "Groepschat verschijnt alleen wanneer je in een groep zit.",
    "La chat di gruppo appare solo mentre fai parte di un gruppo.",
    "La discussion de groupe apparaît uniquement lorsque vous êtes dans un groupe."
  ],
  "Live Dungeons are separate: they still require exactly 1 Tank, 2 Damage, and 1 Support.": [
    "Live-Dungeons sind getrennt: Sie benötigen genau 1 Tank, 2 Schadensrollen und 1 Unterstützung.",
    "Las mazmorras en vivo son independientes: requieren exactamente 1 tanque, 2 de daño y 1 apoyo.",
    "Live-kerkers staan los hiervan: ze vereisen precies 1 tank, 2 schade en 1 ondersteuning.",
    "I dungeon Live sono separati: richiedono esattamente 1 tank, 2 danni e 1 supporto.",
    "Les donjons en direct sont distincts : ils nécessitent exactement 1 tank, 2 dégâts et 1 soutien."
  ],
  "Cancel request": [
    "Anfrage zurückziehen",
    "Cancelar solicitud",
    "Verzoek annuleren",
    "Annulla richiesta",
    "Annuler la demande"
  ],
  "Refresh request": [
    "Anfrage aktualisieren",
    "Actualizar solicitud",
    "Verzoek vernieuwen",
    "Aggiorna richiesta",
    "Actualiser la demande"
  ],
  "Accept request": [
    "Anfrage annehmen",
    "Aceptar solicitud",
    "Verzoek accepteren",
    "Accetta richiesta",
    "Accepter la demande"
  ],
  "Public profile could not load": [
    "Öffentliches Profil konnte nicht geladen werden",
    "No se pudo cargar el perfil público",
    "Openbaar profiel kon niet worden geladen",
    "Impossibile caricare il profilo pubblico",
    "Impossible de charger le profil public"
  ],
  "Full profile unavailable": [
    "Vollständiges Profil nicht verfügbar",
    "Perfil completo no disponible",
    "Volledig profiel niet beschikbaar",
    "Profilo completo non disponibile",
    "Profil complet indisponible"
  ],
  "No published profile": [
    "Kein veröffentlichtes Profil",
    "Sin perfil publicado",
    "Geen gepubliceerd profiel",
    "Nessun profilo pubblicato",
    "Aucun profil publié"
  ],
  "The profile service did not respond successfully. The player identity and social actions below are still available.": [
    "Der Profildienst hat nicht erfolgreich geantwortet. Spieleridentität und soziale Aktionen unten bleiben verfügbar.",
    "El servicio de perfiles no respondió correctamente. La identidad y las acciones sociales siguen disponibles abajo.",
    "De profieldienst antwoordde niet goed. Speleridentiteit en sociale acties hieronder blijven beschikbaar.",
    "Il servizio profili non ha risposto correttamente. L’identità e le azioni sociali sotto restano disponibili.",
    "Le service de profils n’a pas répondu correctement. L’identité et les actions sociales ci-dessous restent disponibles."
  ],
  "This player may use Private or Guild visibility, may not have published a social profile yet, or may be hidden by a relationship rule.": [
    "Dieser Spieler nutzt möglicherweise private oder Gildensichtbarkeit, hat noch kein soziales Profil veröffentlicht oder wird durch eine Beziehungsregel verborgen.",
    "Este jugador puede tener visibilidad privada o de gremio, no haber publicado un perfil o estar oculto por una regla de relación.",
    "Deze speler heeft mogelijk privé- of gildezichtbaarheid, nog geen sociaal profiel gepubliceerd of is verborgen door een relatieregel.",
    "Il giocatore potrebbe usare visibilità privata o di gilda, non aver pubblicato un profilo o essere nascosto da una regola di relazione.",
    "Ce joueur peut utiliser une visibilité privée ou de guilde, ne pas avoir publié de profil ou être masqué par une règle de relation."
  ],
  "REDUCED MOTION": [
    "REDUZIERTE BEWEGUNG",
    "MOVIMIENTO REDUCIDO",
    "MINDER BEWEGING",
    "MOVIMENTO RIDOTTO",
    "MOUVEMENTS RÉDUITS"
  ],
  "LIVE FX": [
    "LIVE-EFFEKTE",
    "EFECTOS EN VIVO",
    "LIVE-EFFECTEN",
    "EFFETTI LIVE",
    "EFFETS EN DIRECT"
  ],
  "INTERRUPTIBLE CAST": [
    "UNTERBRECHBARER ZAUBER",
    "LANZAMIENTO INTERRUMPIBLE",
    "ONDERBREEKBARE SPREUK",
    "LANCIO INTERROMPIBILE",
    "INCANTATION INTERRUPTIBLE"
  ],
  "ACTIVE CAST": [
    "AKTIVER ZAUBER",
    "LANZAMIENTO ACTIVO",
    "ACTIEVE SPREUK",
    "LANCIO ATTIVO",
    "INCANTATION ACTIVE"
  ],
  "ASSIST PROC": [
    "UNTERSTÜTZUNG AUSGELÖST",
    "AYUDA ACTIVADA",
    "HULP GEACTIVEERD",
    "ASSISTENZA ATTIVATA",
    "ASSISTANCE DÉCLENCHÉE"
  ],
  "ENCOUNTER": [
    "BEGEGNUNG",
    "ENCUENTRO",
    "GEVECHT",
    "SCONTRO",
    "RENCONTRE"
  ],
  "BOSS HP": [
    "BOSS-LP",
    "PV DEL JEFE",
    "BAAS-HP",
    "PV BOSS",
    "PV DU BOSS"
  ],
  "INTERRUPT NOW": [
    "JETZT UNTERBRECHEN",
    "INTERRUMPIR AHORA",
    "NU ONDERBREKEN",
    "INTERROMPI ORA",
    "INTERROMPRE MAINTENANT"
  ],
  "BOSS CAST": [
    "BOSSZAUBER",
    "LANZAMIENTO DEL JEFE",
    "BAASSPREUK",
    "LANCIO BOSS",
    "INCANTATION DU BOSS"
  ],
  "ACTING": [
    "HANDELT",
    "ACTUANDO",
    "HANDELT",
    "IN AZIONE",
    "EN ACTION"
  ],
  "TARGETED": [
    "ANVISIERT",
    "OBJETIVO",
    "DOELWIT",
    "BERSAGLIATO",
    "CIBLÉ"
  ],
  "Boss profile": [
    "Bossprofil",
    "Perfil del jefe",
    "Baasprofiel",
    "Profilo boss",
    "Profil du boss"
  ],
  "Enemy profile": [
    "Gegnerprofil",
    "Perfil del enemigo",
    "Vijandprofiel",
    "Profilo nemico",
    "Profil de l’ennemi"
  ],
  "Launch seasonal expedition": [
    "Saisonale Expedition starten",
    "Iniciar expedición estacional",
    "Seizoensexpeditie starten",
    "Avvia spedizione stagionale",
    "Lancer l’expédition saisonnière"
  ],
  "Seasonal expedition unavailable": [
    "Saisonale Expedition nicht verfügbar",
    "Expedición estacional no disponible",
    "Seizoensexpeditie niet beschikbaar",
    "Spedizione stagionale non disponibile",
    "Expédition saisonnière indisponible"
  ],
  "This seasonal expedition is only launchable while its LiveOps event is active.": [
    "Diese saisonale Expedition kann nur während ihres aktiven LiveOps-Events gestartet werden.",
    "Esta expedición solo puede iniciarse mientras su evento LiveOps esté activo.",
    "Deze seizoensexpeditie kan alleen starten tijdens het actieve LiveOps-evenement.",
    "Questa spedizione può partire solo mentre il suo evento LiveOps è attivo.",
    "Cette expédition ne peut être lancée que pendant son événement LiveOps actif."
  ],
  "Route choices and combat outcomes are saved online after every decision. Closing the app does not discard an active seasonal run.": [
    "Routenwahl und Kampfergebnisse werden nach jeder Entscheidung online gespeichert. Das Schließen der App verwirft keinen aktiven saisonalen Lauf.",
    "Las rutas y resultados se guardan en línea tras cada decisión. Cerrar la aplicación no elimina una partida estacional activa.",
    "Routekeuzes en gevechtsresultaten worden na elke beslissing online opgeslagen. De app sluiten wist geen actieve seizoensrun.",
    "Scelte e risultati vengono salvati online dopo ogni decisione. Chiudere l’app non elimina una partita stagionale attiva.",
    "Les choix de parcours et résultats sont sauvegardés en ligne après chaque décision. Fermer l’application ne supprime pas une partie saisonnière active."
  ],
  "ACTION NEEDED": [
    "AKTION ERFORDERLICH",
    "ACCIÓN NECESARIA",
    "ACTIE NODIG",
    "AZIONE NECESSARIA",
    "ACTION REQUISE"
  ],
  "READY": [
    "BEREIT",
    "LISTO",
    "KLAAR",
    "PRONTO",
    "PRÊT"
  ],
  "READY CHECK": [
    "BEREITSCHAFTSPRÜFUNG",
    "CONFIRMACIÓN",
    "GEREEDHEIDSCONTROLE",
    "CONFERMA PRESENZA",
    "CONFIRMATION"
  ],
  "RE-FILLING PARTY": [
    "GRUPPE WIRD AUFGEFÜLLT",
    "RELLENANDO GRUPO",
    "GROEP AANVULLEN",
    "RIEMPIMENTO GRUPPO",
    "REMPLISSAGE DU GROUPE"
  ],
  "PARTY STATUS": [
    "GRUPPENSTATUS",
    "ESTADO DEL GRUPO",
    "GROEPSSTATUS",
    "STATO GRUPPO",
    "ÉTAT DU GROUPE"
  ],
  "Confirm your place before the timer expires.": [
    "Bestätige deinen Platz, bevor die Zeit abläuft.",
    "Confirma tu plaza antes de que termine el tiempo.",
    "Bevestig je plek voordat de tijd om is.",
    "Conferma il posto prima dello scadere del tempo.",
    "Confirmez votre place avant la fin du délai."
  ],
  "Accepted players are held while the server searches for a replacement.": [
    "Spieler, die angenommen haben, bleiben reserviert, während der Server Ersatz sucht.",
    "Los jugadores que aceptaron quedan reservados mientras el servidor busca sustitutos.",
    "Spelers die accepteerden blijven gereserveerd terwijl de server vervanging zoekt.",
    "I giocatori che hanno accettato restano in attesa mentre il server cerca sostituti.",
    "Les joueurs ayant accepté restent réservés pendant la recherche de remplaçants."
  ],
  "Everyone accepted. The dungeon handoff is the next step.": [
    "Alle haben angenommen. Als Nächstes startet der Dungeon.",
    "Todos aceptaron. El siguiente paso es entrar a la mazmorra.",
    "Iedereen heeft geaccepteerd. De volgende stap is de kerker betreden.",
    "Tutti hanno accettato. Il prossimo passo è entrare nel dungeon.",
    "Tout le monde a accepté. L’entrée dans le donjon est la prochaine étape."
  ],
  "This ready check has ended.": [
    "Diese Bereitschaftsprüfung ist beendet.",
    "Esta confirmación ha terminado.",
    "Deze gereedheidscontrole is beëindigd.",
    "Questa conferma è terminata.",
    "Cette confirmation est terminée."
  ],
  "You": [
    "Du",
    "Tú",
    "Jij",
    "Tu",
    "Vous"
  ],
  "Accepted": [
    "Angenommen",
    "Aceptado",
    "Geaccepteerd",
    "Accettato",
    "Accepté"
  ],
  "Waiting for response": [
    "Warte auf Antwort",
    "Esperando respuesta",
    "Wachten op antwoord",
    "In attesa di risposta",
    "En attente de réponse"
  ],
  "Accept party": [
    "Gruppe annehmen",
    "Aceptar grupo",
    "Groep accepteren",
    "Accetta gruppo",
    "Accepter le groupe"
  ],
  "Replace my post": [
    "Meine Anzeige ersetzen",
    "Reemplazar mi anuncio",
    "Mijn bericht vervangen",
    "Sostituisci annuncio",
    "Remplacer mon annonce"
  ],
  "Post LFG": [
    "Gruppensuche veröffentlichen",
    "Publicar búsqueda de grupo",
    "Groepszoekbericht plaatsen",
    "Pubblica ricerca gruppo",
    "Publier une recherche de groupe"
  ],
  "Replace 30m post": [
    "30-Min.-Anzeige ersetzen",
    "Reemplazar anuncio de 30 min",
    "30-minutenbericht vervangen",
    "Sostituisci annuncio 30 min",
    "Remplacer l’annonce de 30 min"
  ],
  "Publish 30m post": [
    "30-Min.-Anzeige veröffentlichen",
    "Publicar anuncio de 30 min",
    "30-minutenbericht plaatsen",
    "Pubblica annuncio 30 min",
    "Publier l’annonce de 30 min"
  ],
  "✦ EXPEDITION CLEARED": [
    "✦ EXPEDITION ABGESCHLOSSEN",
    "✦ EXPEDICIÓN COMPLETADA",
    "✦ EXPEDITIE VOLTOOID",
    "✦ SPEDIZIONE COMPLETATA",
    "✦ EXPÉDITION TERMINÉE"
  ],
  "EXPEDITION ENDED": [
    "EXPEDITION BEENDET",
    "EXPEDICIÓN FINALIZADA",
    "EXPEDITIE BEËINDIGD",
    "SPEDIZIONE TERMINATA",
    "EXPÉDITION FINIE"
  ],
  "Victory secured": [
    "Sieg gesichert",
    "Victoria asegurada",
    "Overwinning behaald",
    "Vittoria assicurata",
    "Victoire assurée"
  ],
  "Run complete": [
    "Lauf abgeschlossen",
    "Partida completada",
    "Run voltooid",
    "Partita completata",
    "Partie terminée"
  ],
  "ENDED": [
    "BEENDET",
    "FINALIZADO",
    "BEËINDIGD",
    "TERMINATO",
    "TERMINÉ"
  ],
  "LIVE LINK": [
    "LIVE-VERBINDUNG",
    "CONEXIÓN EN VIVO",
    "LIVE-VERBINDING",
    "COLLEGAMENTO LIVE",
    "LIEN EN DIRECT"
  ],
  "SAFETY AI": [
    "SICHERHEITS-KI",
    "IA DE SEGURIDAD",
    "VEILIGHEIDS-AI",
    "IA DI SICUREZZA",
    "IA DE SÉCURITÉ"
  ],
  "ALL CONNECTED": [
    "ALLE VERBUNDEN",
    "TODOS CONECTADOS",
    "IEDEREEN VERBONDEN",
    "TUTTI CONNESSI",
    "TOUS CONNECTÉS"
  ],
  "DANGER": [
    "GEFAHR",
    "PELIGRO",
    "GEVAAR",
    "PERICOLO",
    "DANGER"
  ],
  "ADVANTAGE": [
    "VORTEIL",
    "VENTAJA",
    "VOORDEEL",
    "VANTAGGIO",
    "AVANTAGE"
  ],
  "MIXED": [
    "GEMISCHT",
    "MIXTO",
    "GEMENGD",
    "MISTO",
    "MIXTE"
  ],
  "Choose this room": [
    "Diesen Raum wählen",
    "Elegir esta sala",
    "Deze kamer kiezen",
    "Scegli questa stanza",
    "Choisir cette salle"
  ],
  "Vote for this room": [
    "Für diesen Raum stimmen",
    "Votar por esta sala",
    "Op deze kamer stemmen",
    "Vota questa stanza",
    "Voter pour cette salle"
  ],
  "Seasonal expedition reward collected.": [
    "Saisonale Expeditionsbelohnung abgeholt.",
    "Recompensa de expedición estacional recogida.",
    "Seizoensexpeditiebeloning opgehaald.",
    "Ricompensa spedizione stagionale raccolta.",
    "Récompense d’expédition saisonnière récupérée."
  ],
  "Return to dungeon list": [
    "Zur Dungeonliste",
    "Volver a mazmorras",
    "Terug naar kerkerlijst",
    "Torna all’elenco dungeon",
    "Retour à la liste des donjons"
  ],
  "Leave expedition": [
    "Expedition verlassen",
    "Salir de expedición",
    "Expeditie verlaten",
    "Lascia spedizione",
    "Quitter l’expédition"
  ],
  "COMBAT PLAYBACK": [
    "KAMPFWIEDERGABE",
    "REPETICIÓN DE COMBATE",
    "GEVECHTSHERHALING",
    "REPLAY COMBATTIMENTO",
    "REPLAY DU COMBAT"
  ],
  "FINAL ENCOUNTER": [
    "LETZTE BEGEGNUNG",
    "ENCUENTRO FINAL",
    "LAATSTE GEVECHT",
    "SCONTRO FINALE",
    "RENCONTRE FINALE"
  ],
  "DUNGEON COMBAT": [
    "DUNGEONKAMPF",
    "COMBATE DE MAZMORRA",
    "KERKERGEVECHT",
    "COMBATTIMENTO DUNGEON",
    "COMBAT DE DONJON"
  ],
  "ENCOUNTER RECAP": [
    "BEGEGNUNGSZUSAMMENFASSUNG",
    "RESUMEN DEL ENCUENTRO",
    "GEVECHTSSAMENVATTING",
    "RIEPILOGO SCONTRO",
    "RÉSUMÉ DE LA RENCONTRE"
  ],
  "PAUSED": [
    "PAUSIERT",
    "PAUSADO",
    "GEPAUZEERD",
    "IN PAUSA",
    "EN PAUSE"
  ],
  "NOW PLAYING": [
    "WIRD ABGESPIELT",
    "REPRODUCIENDO",
    "WORDT AFGESPEELD",
    "IN RIPRODUZIONE",
    "EN COURS"
  ],
  "Encounter cleared": [
    "Begegnung abgeschlossen",
    "Encuentro completado",
    "Gevecht voltooid",
    "Scontro completato",
    "Rencontre terminée"
  ],
  "Party defeated": [
    "Gruppe besiegt",
    "Grupo derrotado",
    "Groep verslagen",
    "Gruppo sconfitto",
    "Groupe vaincu"
  ],
  "Encounter timed out": [
    "Begegnung abgelaufen",
    "Tiempo del encuentro agotado",
    "Gevechtstijd verstreken",
    "Tempo dello scontro scaduto",
    "Délai de rencontre écoulé"
  ],
  "Resume combat replay": [
    "Kampfwiedergabe fortsetzen",
    "Reanudar repetición",
    "Gevechtsherhaling hervatten",
    "Riprendi replay",
    "Reprendre le replay"
  ],
  "Pause combat replay": [
    "Kampfwiedergabe pausieren",
    "Pausar repetición",
    "Gevechtsherhaling pauzeren",
    "Metti in pausa replay",
    "Mettre le replay en pause"
  ],
  "▶ Resume": [
    "▶ Fortsetzen",
    "▶ Reanudar",
    "▶ Hervatten",
    "▶ Riprendi",
    "▶ Reprendre"
  ],
  "Ⅱ Pause": [
    "Ⅱ Pause",
    "Ⅱ Pausa",
    "Ⅱ Pauze",
    "Ⅱ Pausa",
    "Ⅱ Pause"
  ],
  "Hide combat battle log": [
    "Kampfprotokoll ausblenden",
    "Ocultar registro de combate",
    "Gevechtslog verbergen",
    "Nascondi registro combattimento",
    "Masquer le journal de combat"
  ],
  "Show combat battle log": [
    "Kampfprotokoll anzeigen",
    "Mostrar registro de combate",
    "Gevechtslog tonen",
    "Mostra registro combattimento",
    "Afficher le journal de combat"
  ],
  "Hide battle log": [
    "Kampfprotokoll ausblenden",
    "Ocultar registro",
    "Gevechtslog verbergen",
    "Nascondi registro",
    "Masquer le journal"
  ],
  "Battle log": [
    "Kampfprotokoll",
    "Registro de combate",
    "Gevechtslog",
    "Registro battaglia",
    "Journal de combat"
  ],
  "INTERRUPT": [
    "UNTERBRECHEN",
    "INTERRUMPIR",
    "ONDERBREKEN",
    "INTERROMPI",
    "INTERROMPRE"
  ],
  "WATCH": [
    "BEOBACHTEN",
    "VIGILAR",
    "OPLETTEN",
    "OSSERVA",
    "SURVEILLER"
  ],
  "No threshold phases triggered.": [
    "Keine Schwellenphasen ausgelöst.",
    "No se activaron fases de umbral.",
    "Geen drempelfases geactiveerd.",
    "Nessuna fase di soglia attivata.",
    "Aucune phase de seuil déclenchée."
  ],
  "No boss casts started before the fight ended.": [
    "Vor Kampfende wurden keine Bosszauber begonnen.",
    "El jefe no inició lanzamientos antes de terminar el combate.",
    "Geen baasspreuken gestart voor het gevecht eindigde.",
    "Nessun lancio del boss iniziato prima della fine.",
    "Aucune incantation du boss lancée avant la fin du combat."
  ],
  "MAX ACTIVITY": [
    "MAXIMALE AKTIVITÄT",
    "ACTIVIDAD MÁXIMA",
    "MAXIMALE ACTIVITEIT",
    "ATTIVITÀ MASSIMA",
    "ACTIVITÉ MAXIMALE"
  ],
  "PROTECTED": [
    "GESCHÜTZT",
    "PROTEGIDO",
    "BESCHERMD",
    "PROTETTO",
    "PROTÉGÉ"
  ],
  "BUILDING": [
    "IM AUFBAU",
    "EN PROGRESO",
    "IN OPBOUW",
    "IN CRESCITA",
    "EN PROGRESSION"
  ],
  "Voted": [
    "Abgestimmt",
    "Votado",
    "Gestemd",
    "Votato",
    "Vote enregistré"
  ],
  "Vote": [
    "Abstimmen",
    "Votar",
    "Stemmen",
    "Vota",
    "Voter"
  ],
  "No bulletin posted.": [
    "Keine Mitteilung veröffentlicht.",
    "No hay boletín publicado.",
    "Geen bulletin geplaatst.",
    "Nessun bollettino pubblicato.",
    "Aucun bulletin publié."
  ],
  "Development Project": [
    "Entwicklungsprojekt",
    "Proyecto de desarrollo",
    "Ontwikkelingsproject",
    "Progetto di sviluppo",
    "Projet de développement"
  ],
  "Recommended": [
    "Empfohlen",
    "Recomendado",
    "Aanbevolen",
    "Consigliato",
    "Recommandé"
  ],
  "Recommend": [
    "Empfehlen",
    "Recomendar",
    "Aanbevelen",
    "Consiglia",
    "Recommander"
  ],
  "ENDS SOON": [
    "ENDET BALD",
    "TERMINA PRONTO",
    "EINDIGT BINNENKORT",
    "TERMINA PRESTO",
    "SE TERMINE BIENTÔT"
  ],
  "DONE": [
    "FERTIG",
    "HECHO",
    "KLAAR",
    "FATTO",
    "TERMINÉ"
  ],
  "BOARD CLEARED": [
    "TAFEL ABGESCHLOSSEN",
    "TABLÓN COMPLETADO",
    "BORD VOLTOOID",
    "BACHECA COMPLETATA",
    "TABLEAU TERMINÉ"
  ],
  "REMAINING": [
    "VERBLEIBEND",
    "RESTANTE",
    "RESTEREND",
    "RIMANENTE",
    "RESTANT"
  ],
  "COMPLETE": [
    "ABGESCHLOSSEN",
    "COMPLETO",
    "VOLTOOID",
    "COMPLETATO",
    "TERMINÉ"
  ],
  "Close create": [
    "Gründung schließen",
    "Cerrar creación",
    "Oprichten sluiten",
    "Chiudi creazione",
    "Fermer la création"
  ],
  "Create": [
    "Erstellen",
    "Crear",
    "Maken",
    "Crea",
    "Créer"
  ],
  "Instant join": [
    "Sofort beitreten",
    "Acceso inmediato",
    "Direct toetreden",
    "Accesso immediato",
    "Adhésion immédiate"
  ],
  "Officer review": [
    "Offiziersprüfung",
    "Revisión de oficial",
    "Officiersbeoordeling",
    "Revisione ufficiale",
    "Examen par un officier"
  ],
  "Loading…": [
    "Wird geladen…",
    "Cargando…",
    "Laden…",
    "Caricamento…",
    "Chargement…"
  ],
  "Join": [
    "Beitreten",
    "Unirse",
    "Toetreden",
    "Unisciti",
    "Rejoindre"
  ],
  "Apply": [
    "Bewerben",
    "Solicitar",
    "Aanmelden",
    "Candidati",
    "Postuler"
  ],
  "Invite only": [
    "Nur auf Einladung",
    "Solo invitación",
    "Alleen op uitnodiging",
    "Solo su invito",
    "Sur invitation uniquement"
  ],
  "Leader / Officer access": [
    "Anführer- / Offizierszugriff",
    "Acceso de líder / oficial",
    "Toegang leider / officier",
    "Accesso capo / ufficiale",
    "Accès chef / officier"
  ],
  "Read-only · Leader or Officer required": [
    "Schreibgeschützt · Anführer oder Offizier erforderlich",
    "Solo lectura · Requiere líder u oficial",
    "Alleen-lezen · Leider of officier vereist",
    "Sola lettura · Richiede capo o ufficiale",
    "Lecture seule · Chef ou officier requis"
  ],
  "UNSAVED": [
    "UNGESPEICHERT",
    "SIN GUARDAR",
    "NIET OPGESLAGEN",
    "NON SALVATO",
    "NON ENREGISTRÉ"
  ],
  "SAVED": [
    "GESPEICHERT",
    "GUARDADO",
    "OPGESLAGEN",
    "SALVATO",
    "ENREGISTRÉ"
  ],
  "Change pending": [
    "Änderung ausstehend",
    "Cambio pendiente",
    "Wijziging in afwachting",
    "Modifica in attesa",
    "Modification en attente"
  ],
  "Permanent identity": [
    "Dauerhafte Identität",
    "Identidad permanente",
    "Permanente identiteit",
    "Identità permanente",
    "Identité permanente"
  ],
  "Available": [
    "Verfügbar",
    "Disponible",
    "Beschikbaar",
    "Disponibile",
    "Disponible"
  ],
  "Guild achievement required": [
    "Gildenerfolg erforderlich",
    "Requiere logro de gremio",
    "Gildeprestatie vereist",
    "Richiede impresa di gilda",
    "Succès de guilde requis"
  ],
  "Saving…": [
    "Wird gespeichert…",
    "Guardando…",
    "Opslaan…",
    "Salvataggio…",
    "Enregistrement…"
  ],
  "Save Guild Appearance": [
    "Gildenaussehen speichern",
    "Guardar aspecto del gremio",
    "Gilde-uiterlijk opslaan",
    "Salva aspetto gilda",
    "Enregistrer l’apparence de guilde"
  ],
  "Appearance Saved": [
    "Aussehen gespeichert",
    "Aspecto guardado",
    "Uiterlijk opgeslagen",
    "Aspetto salvato",
    "Apparence enregistrée"
  ],
  "Refreshing…": [
    "Wird aktualisiert…",
    "Actualizando…",
    "Vernieuwen…",
    "Aggiornamento…",
    "Actualisation…"
  ],
  "Refresh Guild Hall": [
    "Gildenhalle aktualisieren",
    "Actualizar sala del gremio",
    "Gildehal vernieuwen",
    "Aggiorna sala gilda",
    "Actualiser le hall de guilde"
  ],
  "Already joined": [
    "Bereits beigetreten",
    "Ya unido",
    "Al lid",
    "Già membro",
    "Déjà membre"
  ],
  "Guild Leader": [
    "Gildenanführer",
    "Líder del gremio",
    "Gildeleider",
    "Capo gilda",
    "Chef de guilde"
  ],
  "Leader controls": [
    "Anführerverwaltung",
    "Controles del líder",
    "Leidersbeheer",
    "Gestione capo",
    "Commandes du chef"
  ],
  "Membership": [
    "Mitgliedschaft",
    "Membresía",
    "Lidmaatschap",
    "Appartenenza",
    "Adhésion"
  ],
  "NOT CHECKED IN": [
    "NICHT ANWESEND",
    "SIN REGISTRAR",
    "NIET AANGEMELD",
    "NON PRESENTE",
    "ABSENT"
  ],
  "RALLY MARK": [
    "VERSAMMLUNGSMARKE",
    "MARCA DE MOVILIZACIÓN",
    "SAMENKOMSTMERK",
    "MARCA RADUNO",
    "MARQUE DE RASSEMBLEMENT"
  ],
  "IN PROGRESS": [
    "IN BEARBEITUNG",
    "EN CURSO",
    "BEZIG",
    "IN CORSO",
    "EN COURS"
  ],
  "4 OF 7": [
    "4 VON 7",
    "4 DE 7",
    "4 VAN 7",
    "4 SU 7",
    "4 SUR 7"
  ],
  "Refresh Muster": [
    "Appell aktualisieren",
    "Actualizar reunión",
    "Appèl vernieuwen",
    "Aggiorna adunata",
    "Actualiser l’appel"
  ],
  "Save Notice": [
    "Mitteilung speichern",
    "Guardar aviso",
    "Bericht opslaan",
    "Salva avviso",
    "Enregistrer l’annonce"
  ],
  "No Changes": [
    "Keine Änderungen",
    "Sin cambios",
    "Geen wijzigingen",
    "Nessuna modifica",
    "Aucune modification"
  ],
  "Edit Notice": [
    "Mitteilung bearbeiten",
    "Editar aviso",
    "Bericht bewerken",
    "Modifica avviso",
    "Modifier l’annonce"
  ],
  "Post Notice": [
    "Mitteilung veröffentlichen",
    "Publicar aviso",
    "Bericht plaatsen",
    "Pubblica avviso",
    "Publier l’annonce"
  ],
  "Refresh Projects": [
    "Projekte aktualisieren",
    "Actualizar proyectos",
    "Projecten vernieuwen",
    "Aggiorna progetti",
    "Actualiser les projets"
  ],
  "Voting…": [
    "Wird abgestimmt…",
    "Votando…",
    "Stemmen…",
    "Votazione…",
    "Vote en cours…"
  ],
  "Starting…": [
    "Wird gestartet…",
    "Iniciando…",
    "Starten…",
    "Avvio…",
    "Démarrage…"
  ],
  "Start Project": [
    "Projekt starten",
    "Iniciar proyecto",
    "Project starten",
    "Avvia progetto",
    "Démarrer le projet"
  ],
  "Weekly": [
    "Wöchentlich",
    "Semanal",
    "Wekelijks",
    "Settimanale",
    "Hebdomadaire"
  ],
  "Development": [
    "Entwicklung",
    "Desarrollo",
    "Ontwikkeling",
    "Sviluppo",
    "Développement"
  ],
  "Event": [
    "Event",
    "Evento",
    "Evenement",
    "Evento",
    "Événement"
  ],
  "Loading Guild PvE…": [
    "Gilden-PvE wird geladen…",
    "Cargando JcE del gremio…",
    "Gilde-PvE laden…",
    "Caricamento PvE gilda…",
    "Chargement du JcE de guilde…"
  ],
  "Refresh weekly PvE": [
    "Wöchentliches PvE aktualisieren",
    "Actualizar JcE semanal",
    "Wekelijkse PvE vernieuwen",
    "Aggiorna PvE settimanale",
    "Actualiser le JcE hebdomadaire"
  ],
  "Claimed": [
    "Abgeholt",
    "Recogido",
    "Opgehaald",
    "Riscattato",
    "Réclamé"
  ],
  "Locked": [
    "Gesperrt",
    "Bloqueado",
    "Vergrendeld",
    "Bloccato",
    "Verrouillé"
  ],
  "Current Party": [
    "Aktuelle Gruppe",
    "Grupo actual",
    "Huidige groep",
    "Gruppo attuale",
    "Groupe actuel"
  ],
  "Reward eligible": [
    "Belohnungsberechtigt",
    "Con derecho a recompensa",
    "Beloning beschikbaar",
    "Idoneo alla ricompensa",
    "Éligible à la récompense"
  ],
  "Needs more contribution": [
    "Mehr Beitrag nötig",
    "Necesita más contribución",
    "Meer bijdrage nodig",
    "Serve più contributo",
    "Contribution supplémentaire requise"
  ],
  "Adventure Together": [
    "Gemeinsam Abenteuer erleben",
    "Aventura en equipo",
    "Samen op avontuur",
    "Avventura insieme",
    "L’aventure ensemble"
  ],
  "Find Members": [
    "Mitglieder suchen",
    "Buscar miembros",
    "Leden zoeken",
    "Trova membri",
    "Trouver des membres"
  ],
  "Find Party": [
    "Gruppe suchen",
    "Buscar grupo",
    "Groep zoeken",
    "Trova gruppo",
    "Trouver un groupe"
  ],
  "Reward claimed": [
    "Belohnung abgeholt",
    "Recompensa recogida",
    "Beloning opgehaald",
    "Ricompensa riscattata",
    "Récompense réclamée"
  ],
  "PLAYERS LOOKING FOR PARTY": [
    "SPIELER SUCHEN GRUPPE",
    "JUGADORES BUSCAN GRUPO",
    "SPELERS ZOEKEN GROEP",
    "GIOCATORI CERCANO GRUPPO",
    "JOUEURS CHERCHANT UN GROUPE"
  ],
  "PARTIES LOOKING FOR MEMBERS": [
    "GRUPPEN SUCHEN MITGLIEDER",
    "GRUPOS BUSCAN MIEMBROS",
    "GROEPEN ZOEKEN LEDEN",
    "GRUPPI CERCANO MEMBRI",
    "GROUPES CHERCHANT DES MEMBRES"
  ],
  "Weekly Contract": [
    "Wochenvertrag",
    "Contrato semanal",
    "Weekcontract",
    "Contratto settimanale",
    "Contrat hebdomadaire"
  ],
  "Ranked Mini-Event": [
    "Gewertetes Mini-Event",
    "Minievento clasificatorio",
    "Mini-evenement met ranglijst",
    "Mini-evento classificato",
    "Mini-événement classé"
  ],
  "All": [
    "Alle",
    "Todos",
    "Alle",
    "Tutti",
    "Tous"
  ],
  "Adventurer": [
    "Abenteurer",
    "Aventurero",
    "Avonturier",
    "Avventuriero",
    "Aventurier"
  ],
  "Post Party Listing": [
    "Gruppenanzeige veröffentlichen",
    "Publicar anuncio de grupo",
    "Groepsadvertentie plaatsen",
    "Pubblica annuncio gruppo",
    "Publier une annonce de groupe"
  ],
  "Advertise Myself": [
    "Eigene Anzeige veröffentlichen",
    "Anunciarme",
    "Mezelf adverteren",
    "Pubblica il mio annuncio",
    "Publier mon annonce"
  ],
  "Language · optional": [
    "Sprache · optional",
    "Idioma · opcional",
    "Taal · optioneel",
    "Lingua · facoltativa",
    "Langue · facultative"
  ],
  "Region · optional": [
    "Region · optional",
    "Región · opcional",
    "Regio · optioneel",
    "Regione · facoltativa",
    "Région · facultative"
  ],
  "Minimum Combat": [
    "Mindestkampfstufe",
    "Combate mínimo",
    "Minimaal gevechtsniveau",
    "Combattimento minimo",
    "Combat minimum"
  ],
  "Minimum Total": [
    "Mindestgesamtstufe",
    "Total mínimo",
    "Minimaal totaalniveau",
    "Totale minimo",
    "Total minimum"
  ],
  "Publishing…": [
    "Wird veröffentlicht…",
    "Publicando…",
    "Publiceren…",
    "Pubblicazione…",
    "Publication…"
  ],
  "Publish advert": [
    "Anzeige veröffentlichen",
    "Publicar anuncio",
    "Advertentie plaatsen",
    "Pubblica annuncio",
    "Publier l’annonce"
  ],
  "Hide filters": [
    "Filter ausblenden",
    "Ocultar filtros",
    "Filters verbergen",
    "Nascondi filtri",
    "Masquer les filtres"
  ],
  "Filters": [
    "Filter",
    "Filtros",
    "Filters",
    "Filtri",
    "Filtres"
  ],
  "Guild seeker": [
    "Gildensuchender",
    "Busca gremio",
    "Gildezoeker",
    "Cerca gilda",
    "Recherche de guilde"
  ],
  "Guild recruiting": [
    "Gilde rekrutiert",
    "Gremio reclutando",
    "Gilde werft",
    "Gilda recluta",
    "Guilde recrute"
  ],
  "Language": [
    "Sprache",
    "Idioma",
    "Taal",
    "Lingua",
    "Langue"
  ],
  "Region": [
    "Region",
    "Región",
    "Regio",
    "Regione",
    "Région"
  ],
  "My Combat level": [
    "Meine Kampfstufe",
    "Mi nivel de combate",
    "Mijn gevechtsniveau",
    "Il mio livello combattimento",
    "Mon niveau de combat"
  ],
  "My Total level": [
    "Meine Gesamtstufe",
    "Mi nivel total",
    "Mijn totaalniveau",
    "Il mio livello totale",
    "Mon niveau total"
  ]
,
  "Online chat unavailable": [
    "Online-Chat nicht verfügbar",
    "Chat en línea no disponible",
    "Online chat niet beschikbaar",
    "Chat online non disponibile",
    "Chat en ligne indisponible"
  ],
  "This release is missing its online service configuration. Update or reinstall the production build rather than using temporary demo chat.": [
    "In dieser Version fehlt die Konfiguration der Onlinedienste. Aktualisiere oder installiere die Produktionsversion neu, statt den temporären Demo-Chat zu verwenden.",
    "A esta versión le falta la configuración de los servicios en línea. Actualiza o reinstala la versión de producción en lugar de usar el chat de demostración temporal.",
    "In deze versie ontbreekt de configuratie van de online diensten. Werk de productieversie bij of installeer die opnieuw in plaats van de tijdelijke demo-chat te gebruiken.",
    "In questa versione manca la configurazione dei servizi online. Aggiorna o reinstalla la versione di produzione invece di usare la chat demo temporanea.",
    "La configuration des services en ligne manque dans cette version. Mettez à jour ou réinstallez la version de production plutôt que d’utiliser le chat de démonstration temporaire."
  ]} as const satisfies Record<string,readonly [string,string,string,string,string]>;
export type SocialMessageKey=keyof typeof socialTranslationRows;
export const socialCatalogs=Object.fromEntries(SUPPORTED_LANGUAGES.map((language,index)=>[
 language,Object.fromEntries(Object.entries(socialTranslationRows).map(([key,values])=>[key,index===0?key:values[index-1]])),
])) as Record<Language,Record<SocialMessageKey,string>>;
export const socialText=createTranslator(socialCatalogs);
export function useSocialText(preferredLanguage?:Language){
 const contextLanguage=useGameLanguage(),language=preferredLanguage??contextLanguage;
 return useMemo(()=>(key:SocialMessageKey,params?:TranslationParams)=>socialText(language,key,params),[language]);
}

// Only for labels from controlled UI/content definitions, never player-authored text.
export function socialLabel(language:Language,label:string):string{
 return Object.prototype.hasOwnProperty.call(socialTranslationRows,label)?socialText(language,label as SocialMessageKey):label;
}
export function socialExpiry(language:Language,expiresAtMs:number,nowMs:number){
 const remaining=expiresAtMs-nowMs,hours=Math.ceil(remaining/3_600_000);
 return {text:remaining<=0?socialText(language,'Expired'):hours<24?socialText(language,'{count}h left',{count:hours}):socialText(language,'{count}d left',{count:Math.ceil(hours/24)}),urgency:remaining<=0?'expired' as const:hours<=6?'soon' as const:'normal' as const};
}
