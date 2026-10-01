import {createSourceTranslator,type TranslationRow} from './source-catalog';

export const SHARED_MESSAGES={
 'Close':['Schließen','Cerrar','Sluiten','Chiudi','Fermer'],
 'Close dialog':['Dialog schließen','Cerrar diálogo','Venster sluiten','Chiudi finestra','Fermer la fenêtre'],
 'Cancel confirmation':['Bestätigung abbrechen','Cancelar confirmación','Bevestiging annuleren','Annulla conferma','Annuler la confirmation'],
 'Cancel':['Abbrechen','Cancelar','Annuleren','Annulla','Annuler'],
 'Continue':['Weiter','Continuar','Doorgaan','Continua','Continuer'],
 'Back':['Zurück','Volver','Terug','Indietro','Retour'],
 'Search':['Suchen','Buscar','Zoeken','Cerca','Rechercher'],
 'Clear search':['Suche löschen','Borrar búsqueda','Zoekopdracht wissen','Cancella ricerca','Effacer la recherche'],
 'Loading…':['Wird geladen…','Cargando…','Laden…','Caricamento…','Chargement…'],
 'SERVICE STATUS':['DIENSTSTATUS','ESTADO DEL SERVICIO','SERVICESTATUS','STATO DEL SERVIZIO','ÉTAT DU SERVICE'],
 'UPDATE REQUIRED':['UPDATE ERFORDERLICH','ACTUALIZACIÓN NECESARIA','UPDATE VEREIST','AGGIORNAMENTO RICHIESTO','MISE À JOUR REQUISE'],
 'Installed':['Installiert','Instalada','Geïnstalleerd','Installata','Installée'],
 'Required':['Erforderlich','Necesaria','Vereist','Richiesta','Requise'],
 'Update VELDRYN':['VELDRYN aktualisieren','Actualizar VELDRYN','VELDRYN bijwerken','Aggiorna VELDRYN','Mettre à jour VELDRYN'],
 'The game will continue normally after the supported version is installed.':['Nach der Installation der unterstützten Version kannst du weiterspielen.','Podrás seguir jugando tras instalar la versión compatible.','Je kunt verder spelen zodra de ondersteunde versie is geïnstalleerd.','Potrai continuare a giocare dopo aver installato la versione supportata.','Tu pourras continuer à jouer après avoir installé la version prise en charge.'],
 'Try again after maintenance has finished.':['Versuche es nach den Wartungsarbeiten erneut.','Inténtalo de nuevo cuando termine el mantenimiento.','Probeer het opnieuw zodra het onderhoud is afgerond.','Riprova al termine della manutenzione.','Réessaie une fois la maintenance terminée.'],
} satisfies Record<string,TranslationRow>;
export const sharedText=createSourceTranslator(SHARED_MESSAGES);
