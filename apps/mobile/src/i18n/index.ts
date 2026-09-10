import {Language} from './languages';
export {LANGUAGE_NAMES,SUPPORTED_LANGUAGES,isSupportedLanguage} from './languages';
export type {Language} from './languages';
export {OPERATIONAL_MESSAGE_COUNT,ot} from './operational';
export type {OperationalKey} from './operational';
export {COOP_MESSAGE_COUNT,coopPolicyText,ct,translatedCoopMessageCount} from './coop';
export type {CoopMessageKey,CoopPolicyCopyKey} from './coop';
export {COOP_LOADOUT_MESSAGE_COUNT,clt,translatedCoopLoadoutMessageCount} from './coop-loadout';
export type {CoopLoadoutMessageKey} from './coop-loadout';

const en={
  'nav.home':'Home','nav.world':'World','nav.character':'Character','nav.inventory':'Inventory','nav.more':'More',
  'common.back':'Back',
  'coopUi.galleryKicker':'DEVELOPMENT COMPONENT LAB','coopUi.galleryTitle':'Co-op visual kit','coopUi.galleryIntro':'Presentation fixtures only. No matchmaking, rewards, or server success is simulated here.',
  'coopUi.actions':'Actions','coopUi.normal':'Normal','coopUi.pressed':'Pressed','coopUi.selected':'Selected','coopUi.disabled':'Disabled','coopUi.loading':'Loading…','coopUi.error':'Error',
  'coopUi.panels':'Panel states','coopUi.panelBody':'Live text reflows inside code-rendered borders.','coopUi.ready':'Ready','coopUi.roles':'Roles and states','coopUi.tank':'Tank','coopUi.damage':'Damage','coopUi.support':'Support','coopUi.searching':'Searching',
  'coopUi.images':'Approved image slots','coopUi.heroArt':'Rootbound expedition artwork','coopUi.nodeArt':'Elite node artwork','coopUi.boonArt':'Rooted boon artwork','coopUi.skillArt':'Guard skill artwork','coopUi.missing':'Missing','coopUi.missingArt':'Missing artwork fallback','coopUi.navigation':'Five-tab integration',
  'onboarding.createFirst':'CREATE YOUR FIRST CHARACTER','onboarding.stepClass':'CLASS','onboarding.stepIdentity':'IDENTITY','onboarding.stepReview':'REVIEW',
  'onboarding.chooseCalling':'Choose your calling','onboarding.callingHelp':'Swipe the emblem or use the arrows. Emblems represent classes, not starting equipment.',
  'onboarding.whoEnters':'Who enters Asterfall?','onboarding.identityHelp':'Choose the male or female version of the shared starting skin used by every class.',
  'onboarding.universalSkin':'UNIVERSAL STARTING SKIN','onboarding.characterName':'CHARACTER NAME','onboarding.nameIdeas':'NAME IDEAS','onboarding.bodyPresentation':'BODY PRESENTATION',
  'onboarding.male':'Male','onboarding.female':'Female','onboarding.chooseIdentity':'Choose identity','onboarding.reviewCharacter':'Review character',
  'onboarding.ready':'Ready to begin?','onboarding.reviewPermanent':'Review the permanent choices saved for this character.',
  'settings.title':'Settings','settings.intro':'Tune your local prototype experience. Changes save automatically.','settings.account':'Account & profile','settings.gameplay':'Gameplay',
  'settings.notifications':'Notifications','settings.accessibility':'Display & accessibility','settings.language':'Language','settings.session':'Session controls','settings.privacy':'Privacy & data',
  'settings.languageStatus':'Core navigation and setup are translated. Untranslated gameplay text falls back to English.',
  'more.intro':'Progression and account destinations that do not need permanent space in the phone navigation bar.',
  'more.quests':'Quests','more.skills':'Skills','more.events':'Events','more.friends':'Friends','more.guild':'Guild','more.settings':'Settings',
  'more.questsDescription':'Objectives, contracts, and claimable rewards','more.skillsDescription':'Gathering, crafting, and novice equipment',
  'more.eventsDescription':'Limited-time activities, milestone rewards, and collections','more.friendsDescription':'Player search, requests, friends, and blocked players','more.guildDescription':'Guild profile, projects, and guild chat',
  'more.settingsDescription':'Account, accessibility, chat, and testing tools',
} as const;

export type MessageKey=keyof typeof en;
type Catalog=Record<MessageKey,string>;

const catalogs:Record<Language,Catalog>={
  en,
  de:{
    'nav.home':'Startseite','nav.world':'Welt','nav.character':'Charakter','nav.inventory':'Inventar','nav.more':'Mehr','common.back':'Zurück',
    'coopUi.galleryKicker':'ENTWICKLUNGS-KOMPONENTENLABOR','coopUi.galleryTitle':'Koop-Designsystem','coopUi.galleryIntro':'Nur Darstellungsbeispiele. Matchmaking, Belohnungen und Servererfolg werden hier nicht simuliert.',
    'coopUi.actions':'Aktionen','coopUi.normal':'Normal','coopUi.pressed':'Gedrückt','coopUi.selected':'Ausgewählt','coopUi.disabled':'Deaktiviert','coopUi.loading':'Wird geladen…','coopUi.error':'Fehler',
    'coopUi.panels':'Panelzustände','coopUi.panelBody':'Live-Text passt sich innerhalb codebasierter Rahmen an.','coopUi.ready':'Bereit','coopUi.roles':'Rollen und Zustände','coopUi.tank':'Tank','coopUi.damage':'Schaden','coopUi.support':'Unterstützung','coopUi.searching':'Suche läuft',
    'coopUi.images':'Freigegebene Bildfelder','coopUi.heroArt':'Rootbound-Expeditionsgrafik','coopUi.nodeArt':'Elite-Knotengrafik','coopUi.boonArt':'Rooted-Segensgrafik','coopUi.skillArt':'Guard-Fertigkeitsgrafik','coopUi.missing':'Fehlt','coopUi.missingArt':'Ersatz für fehlende Grafik','coopUi.navigation':'Fünf-Tab-Integration',
    'onboarding.createFirst':'ERSTELLE DEINEN ERSTEN CHARAKTER','onboarding.stepClass':'KLASSE','onboarding.stepIdentity':'IDENTITÄT','onboarding.stepReview':'PRÜFEN',
    'onboarding.chooseCalling':'Wähle deine Berufung','onboarding.callingHelp':'Wische über das Emblem oder nutze die Pfeile. Embleme stehen für Klassen, nicht für Startausrüstung.',
    'onboarding.whoEnters':'Wer betritt Asterfall?','onboarding.identityHelp':'Wähle die männliche oder weibliche Variante der gemeinsamen Start-Skin aller Klassen.',
    'onboarding.universalSkin':'ALLGEMEINE START-SKIN','onboarding.characterName':'CHARAKTERNAME','onboarding.nameIdeas':'NAMENSIDEEN','onboarding.bodyPresentation':'KÖRPERDARSTELLUNG',
    'onboarding.male':'Männlich','onboarding.female':'Weiblich','onboarding.chooseIdentity':'Identität wählen','onboarding.reviewCharacter':'Charakter prüfen',
    'onboarding.ready':'Bereit für den Anfang?','onboarding.reviewPermanent':'Prüfe die dauerhaften Entscheidungen für diesen Charakter.',
    'settings.title':'Einstellungen','settings.intro':'Passe dein lokales Prototyp-Erlebnis an. Änderungen werden automatisch gespeichert.','settings.account':'Konto & Profil','settings.gameplay':'Gameplay',
    'settings.notifications':'Benachrichtigungen','settings.accessibility':'Anzeige & Barrierefreiheit','settings.language':'Sprache','settings.session':'Sitzungssteuerung','settings.privacy':'Datenschutz & Daten',
    'settings.languageStatus':'Navigation und Einrichtung sind übersetzt. Nicht übersetzte Spieltexte werden auf Englisch angezeigt.',
    'more.intro':'Fortschritts- und Kontobereiche, die keinen festen Platz in der Navigation benötigen.','more.quests':'Quests','more.skills':'Fertigkeiten','more.events':'Events','more.friends':'Freunde','more.guild':'Gilde','more.settings':'Einstellungen',
    'more.questsDescription':'Ziele, Aufträge und abholbare Belohnungen','more.skillsDescription':'Sammeln, Herstellen und Anfängerausrüstung','more.eventsDescription':'Zeitlich begrenzte Aktivitäten, Meilensteine und Sammlungen','more.friendsDescription':'Spielersuche, Anfragen, Freunde und blockierte Spieler','more.guildDescription':'Gildenprofil, Projekte und Gildenchat','more.settingsDescription':'Konto, Barrierefreiheit, Chat und Testwerkzeuge',
  },
  es:{
    'nav.home':'Inicio','nav.world':'Mundo','nav.character':'Personaje','nav.inventory':'Inventario','nav.more':'Más','common.back':'Atrás',
    'coopUi.galleryKicker':'LABORATORIO DE COMPONENTES','coopUi.galleryTitle':'Kit visual cooperativo','coopUi.galleryIntro':'Solo ejemplos de presentación. Aquí no se simulan emparejamiento, recompensas ni éxitos del servidor.',
    'coopUi.actions':'Acciones','coopUi.normal':'Normal','coopUi.pressed':'Pulsado','coopUi.selected':'Seleccionado','coopUi.disabled':'Desactivado','coopUi.loading':'Cargando…','coopUi.error':'Error',
    'coopUi.panels':'Estados de panel','coopUi.panelBody':'El texto dinámico se adapta dentro de bordes dibujados con código.','coopUi.ready':'Listo','coopUi.roles':'Roles y estados','coopUi.tank':'Tanque','coopUi.damage':'Daño','coopUi.support':'Apoyo','coopUi.searching':'Buscando',
    'coopUi.images':'Espacios de imagen aprobados','coopUi.heroArt':'Arte de expedición Rootbound','coopUi.nodeArt':'Arte de nodo de élite','coopUi.boonArt':'Arte de bendición Rooted','coopUi.skillArt':'Arte de habilidad Guard','coopUi.missing':'Falta','coopUi.missingArt':'Alternativa para arte ausente','coopUi.navigation':'Integración de cinco pestañas',
    'onboarding.createFirst':'CREA TU PRIMER PERSONAJE','onboarding.stepClass':'CLASE','onboarding.stepIdentity':'IDENTIDAD','onboarding.stepReview':'REVISIÓN',
    'onboarding.chooseCalling':'Elige tu vocación','onboarding.callingHelp':'Desliza el emblema o usa las flechas. Los emblemas representan clases, no equipo inicial.',
    'onboarding.whoEnters':'¿Quién entra en Asterfall?','onboarding.identityHelp':'Elige la versión masculina o femenina de la apariencia inicial compartida por todas las clases.',
    'onboarding.universalSkin':'APARIENCIA INICIAL UNIVERSAL','onboarding.characterName':'NOMBRE DEL PERSONAJE','onboarding.nameIdeas':'IDEAS DE NOMBRES','onboarding.bodyPresentation':'PRESENTACIÓN CORPORAL',
    'onboarding.male':'Masculina','onboarding.female':'Femenina','onboarding.chooseIdentity':'Elegir identidad','onboarding.reviewCharacter':'Revisar personaje',
    'onboarding.ready':'¿Todo listo?','onboarding.reviewPermanent':'Revisa las decisiones permanentes guardadas para este personaje.',
    'settings.title':'Ajustes','settings.intro':'Personaliza la experiencia del prototipo local. Los cambios se guardan automáticamente.','settings.account':'Cuenta y perfil','settings.gameplay':'Jugabilidad',
    'settings.notifications':'Notificaciones','settings.accessibility':'Pantalla y accesibilidad','settings.language':'Idioma','settings.session':'Controles de sesión','settings.privacy':'Privacidad y datos',
    'settings.languageStatus':'La navegación y la configuración están traducidas. Los textos de juego sin traducir se muestran en inglés.',
    'more.intro':'Destinos de progreso y cuenta que no necesitan un espacio permanente en la navegación.','more.quests':'Misiones','more.skills':'Habilidades','more.events':'Eventos','more.friends':'Amigos','more.guild':'Gremio','more.settings':'Ajustes',
    'more.questsDescription':'Objetivos, contratos y recompensas disponibles','more.skillsDescription':'Recolección, fabricación y equipo de principiante','more.eventsDescription':'Actividades temporales, hitos y colecciones','more.friendsDescription':'Búsqueda, solicitudes, amigos y jugadores bloqueados','more.guildDescription':'Perfil, proyectos y chat del gremio','more.settingsDescription':'Cuenta, accesibilidad, chat y herramientas de prueba',
  },
  nl:{
    'nav.home':'Home','nav.world':'Wereld','nav.character':'Personage','nav.inventory':'Inventaris','nav.more':'Meer','common.back':'Terug',
    'coopUi.galleryKicker':'ONTWIKKELCOMPONENTENLAB','coopUi.galleryTitle':'Coöp-visuele set','coopUi.galleryIntro':'Alleen presentatiefixtures. Matchmaking, beloningen en serversucces worden hier niet gesimuleerd.',
    'coopUi.actions':'Acties','coopUi.normal':'Normaal','coopUi.pressed':'Ingedrukt','coopUi.selected':'Geselecteerd','coopUi.disabled':'Uitgeschakeld','coopUi.loading':'Laden…','coopUi.error':'Fout',
    'coopUi.panels':'Paneelstatussen','coopUi.panelBody':'Live tekst loopt door binnen kaders die met code zijn getekend.','coopUi.ready':'Klaar','coopUi.roles':'Rollen en statussen','coopUi.tank':'Tank','coopUi.damage':'Schade','coopUi.support':'Ondersteuning','coopUi.searching':'Zoeken',
    'coopUi.images':'Goedgekeurde afbeeldingsvakken','coopUi.heroArt':'Rootbound-expeditieafbeelding','coopUi.nodeArt':'Elite-knooppuntafbeelding','coopUi.boonArt':'Rooted-zegenafbeelding','coopUi.skillArt':'Guard-vaardigheidsafbeelding','coopUi.missing':'Ontbreekt','coopUi.missingArt':'Vervanging voor ontbrekende afbeelding','coopUi.navigation':'Integratie met vijf tabbladen',
    'onboarding.createFirst':'MAAK JE EERSTE PERSONAGE','onboarding.stepClass':'KLASSE','onboarding.stepIdentity':'IDENTITEIT','onboarding.stepReview':'CONTROLEREN',
    'onboarding.chooseCalling':'Kies je roeping','onboarding.callingHelp':'Veeg over het embleem of gebruik de pijlen. Emblemen staan voor klassen, niet voor startuitrusting.',
    'onboarding.whoEnters':'Wie betreedt Asterfall?','onboarding.identityHelp':'Kies de mannelijke of vrouwelijke versie van de gedeelde startskin voor alle klassen.',
    'onboarding.universalSkin':'UNIVERSELE STARTSKIN','onboarding.characterName':'PERSONAGENAAM','onboarding.nameIdeas':'NAAMIDEEËN','onboarding.bodyPresentation':'LICHAAMSPRESENTATIE',
    'onboarding.male':'Mannelijk','onboarding.female':'Vrouwelijk','onboarding.chooseIdentity':'Identiteit kiezen','onboarding.reviewCharacter':'Personage controleren',
    'onboarding.ready':'Klaar om te beginnen?','onboarding.reviewPermanent':'Controleer de permanente keuzes voor dit personage.',
    'settings.title':'Instellingen','settings.intro':'Pas je lokale prototype-ervaring aan. Wijzigingen worden automatisch opgeslagen.','settings.account':'Account en profiel','settings.gameplay':'Gameplay',
    'settings.notifications':'Meldingen','settings.accessibility':'Weergave en toegankelijkheid','settings.language':'Taal','settings.session':'Sessiebeheer','settings.privacy':'Privacy en gegevens',
    'settings.languageStatus':'Navigatie en configuratie zijn vertaald. Niet-vertaalde gametekst valt terug op Engels.',
    'more.intro':'Voortgangs- en accountonderdelen die geen vaste plek in de navigatie nodig hebben.','more.quests':'Missies','more.skills':'Vaardigheden','more.events':'Evenementen','more.friends':'Vrienden','more.guild':'Gilde','more.settings':'Instellingen',
    'more.questsDescription':'Doelen, contracten en beschikbare beloningen','more.skillsDescription':'Verzamelen, maken en beginnersuitrusting','more.eventsDescription':'Tijdelijke activiteiten, mijlpalen en verzamelingen','more.friendsDescription':'Spelers zoeken, verzoeken, vrienden en geblokkeerde spelers','more.guildDescription':'Gildeprofiel, projecten en gildechat','more.settingsDescription':'Account, toegankelijkheid, chat en testhulpmiddelen',
  },
  it:{
    'nav.home':'Home','nav.world':'Mondo','nav.character':'Personaggio','nav.inventory':'Inventario','nav.more':'Altro','common.back':'Indietro',
    'coopUi.galleryKicker':'LABORATORIO COMPONENTI','coopUi.galleryTitle':'Kit visivo cooperativo','coopUi.galleryIntro':'Solo esempi di presentazione. Matchmaking, ricompense e successi del server non vengono simulati.',
    'coopUi.actions':'Azioni','coopUi.normal':'Normale','coopUi.pressed':'Premuto','coopUi.selected':'Selezionato','coopUi.disabled':'Disattivato','coopUi.loading':'Caricamento…','coopUi.error':'Errore',
    'coopUi.panels':'Stati dei pannelli','coopUi.panelBody':'Il testo dinamico si adatta nei bordi disegnati tramite codice.','coopUi.ready':'Pronto','coopUi.roles':'Ruoli e stati','coopUi.tank':'Tank','coopUi.damage':'Danno','coopUi.support':'Supporto','coopUi.searching':'Ricerca',
    'coopUi.images':'Spazi immagine approvati','coopUi.heroArt':'Grafica spedizione Rootbound','coopUi.nodeArt':'Grafica nodo élite','coopUi.boonArt':'Grafica beneficio Rooted','coopUi.skillArt':'Grafica abilità Guard','coopUi.missing':'Mancante','coopUi.missingArt':'Alternativa per grafica mancante','coopUi.navigation':'Integrazione a cinque schede',
    'onboarding.createFirst':'CREA IL TUO PRIMO PERSONAGGIO','onboarding.stepClass':'CLASSE','onboarding.stepIdentity':'IDENTITÀ','onboarding.stepReview':'RIEPILOGO',
    'onboarding.chooseCalling':'Scegli la tua vocazione','onboarding.callingHelp':'Scorri sull’emblema o usa le frecce. Gli emblemi rappresentano le classi, non l’equipaggiamento iniziale.',
    'onboarding.whoEnters':'Chi entra ad Asterfall?','onboarding.identityHelp':'Scegli la versione maschile o femminile dell’aspetto iniziale condiviso da tutte le classi.',
    'onboarding.universalSkin':'ASPETTO INIZIALE UNIVERSALE','onboarding.characterName':'NOME DEL PERSONAGGIO','onboarding.nameIdeas':'IDEE PER IL NOME','onboarding.bodyPresentation':'PRESENTAZIONE DEL CORPO',
    'onboarding.male':'Maschile','onboarding.female':'Femminile','onboarding.chooseIdentity':'Scegli identità','onboarding.reviewCharacter':'Rivedi personaggio',
    'onboarding.ready':'Pronto per iniziare?','onboarding.reviewPermanent':'Controlla le scelte permanenti salvate per questo personaggio.',
    'settings.title':'Impostazioni','settings.intro':'Personalizza l’esperienza del prototipo locale. Le modifiche vengono salvate automaticamente.','settings.account':'Account e profilo','settings.gameplay':'Gameplay',
    'settings.notifications':'Notifiche','settings.accessibility':'Schermo e accessibilità','settings.language':'Lingua','settings.session':'Controlli sessione','settings.privacy':'Privacy e dati',
    'settings.languageStatus':'Navigazione e configurazione sono tradotte. I testi di gioco non tradotti vengono mostrati in inglese.',
    'more.intro':'Aree di progressione e account che non richiedono uno spazio fisso nella navigazione.','more.quests':'Missioni','more.skills':'Abilità','more.events':'Eventi','more.friends':'Amici','more.guild':'Gilda','more.settings':'Impostazioni',
    'more.questsDescription':'Obiettivi, contratti e ricompense disponibili','more.skillsDescription':'Raccolta, creazione ed equipaggiamento da principiante','more.eventsDescription':'Attività a tempo, traguardi e collezioni','more.friendsDescription':'Ricerca giocatori, richieste, amici e giocatori bloccati','more.guildDescription':'Profilo, progetti e chat della gilda','more.settingsDescription':'Account, accessibilità, chat e strumenti di test',
  },
  fr:{
    'nav.home':'Accueil','nav.world':'Monde','nav.character':'Personnage','nav.inventory':'Inventaire','nav.more':'Plus','common.back':'Retour',
    'coopUi.galleryKicker':'LABORATOIRE DE COMPOSANTS','coopUi.galleryTitle':'Kit visuel coopératif','coopUi.galleryIntro':'Exemples de présentation uniquement. Aucun matchmaking, gain ou succès serveur n’est simulé ici.',
    'coopUi.actions':'Actions','coopUi.normal':'Normal','coopUi.pressed':'Appuyé','coopUi.selected':'Sélectionné','coopUi.disabled':'Désactivé','coopUi.loading':'Chargement…','coopUi.error':'Erreur',
    'coopUi.panels':'États des panneaux','coopUi.panelBody':'Le texte dynamique se réorganise dans des cadres dessinés en code.','coopUi.ready':'Prêt','coopUi.roles':'Rôles et états','coopUi.tank':'Tank','coopUi.damage':'Dégâts','coopUi.support':'Soutien','coopUi.searching':'Recherche',
    'coopUi.images':'Emplacements d’images approuvés','coopUi.heroArt':'Illustration d’expédition Rootbound','coopUi.nodeArt':'Illustration de nœud élite','coopUi.boonArt':'Illustration de faveur Rooted','coopUi.skillArt':'Illustration de compétence Guard','coopUi.missing':'Manquant','coopUi.missingArt':'Remplacement d’illustration manquante','coopUi.navigation':'Intégration à cinq onglets',
    'onboarding.createFirst':'CRÉEZ VOTRE PREMIER PERSONNAGE','onboarding.stepClass':'CLASSE','onboarding.stepIdentity':'IDENTITÉ','onboarding.stepReview':'VÉRIFIER',
    'onboarding.chooseCalling':'Choisissez votre vocation','onboarding.callingHelp':'Faites glisser l’emblème ou utilisez les flèches. Les emblèmes représentent les classes, pas l’équipement de départ.',
    'onboarding.whoEnters':'Qui entre dans Asterfall ?','onboarding.identityHelp':'Choisissez la version masculine ou féminine de l’apparence de départ commune à toutes les classes.',
    'onboarding.universalSkin':'APPARENCE DE DÉPART UNIVERSELLE','onboarding.characterName':'NOM DU PERSONNAGE','onboarding.nameIdeas':'IDÉES DE NOMS','onboarding.bodyPresentation':'PRÉSENTATION DU CORPS',
    'onboarding.male':'Masculine','onboarding.female':'Féminine','onboarding.chooseIdentity':'Choisir l’identité','onboarding.reviewCharacter':'Vérifier le personnage',
    'onboarding.ready':'Prêt à commencer ?','onboarding.reviewPermanent':'Vérifiez les choix permanents enregistrés pour ce personnage.',
    'settings.title':'Paramètres','settings.intro':'Personnalisez votre prototype local. Les modifications sont enregistrées automatiquement.','settings.account':'Compte et profil','settings.gameplay':'Gameplay',
    'settings.notifications':'Notifications','settings.accessibility':'Affichage et accessibilité','settings.language':'Langue','settings.session':'Contrôles de session','settings.privacy':'Confidentialité et données',
    'settings.languageStatus':'La navigation et la configuration sont traduites. Les textes de jeu non traduits s’affichent en anglais.',
    'more.intro':'Destinations de progression et de compte qui ne nécessitent pas une place permanente dans la navigation.','more.quests':'Quêtes','more.skills':'Compétences','more.events':'Événements','more.friends':'Amis','more.guild':'Guilde','more.settings':'Paramètres',
    'more.questsDescription':'Objectifs, contrats et récompenses à récupérer','more.skillsDescription':'Récolte, fabrication et équipement de novice','more.eventsDescription':'Activités temporaires, jalons et collections','more.friendsDescription':'Recherche, demandes, amis et joueurs bloqués','more.guildDescription':'Profil, projets et chat de guilde','more.settingsDescription':'Compte, accessibilité, chat et outils de test',
  },
};

export function t(language:Language,key:MessageKey):string{
  return catalogs[language]?.[key]??en[key];
}

export function translatedMessageCount(language:Language):number{
  return Object.keys(catalogs[language]).length;
}

export const MESSAGE_COUNT=Object.keys(en).length;
