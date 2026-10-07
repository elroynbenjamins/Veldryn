import {accountText} from './account';
import type {Language} from './languages';
const rows:Record<string,readonly string[]>={
 'Prepare expedition':['Expedition vorbereiten','Preparar expedición','Expeditie voorbereiden','Prepara spedizione','Préparer l’expédition'],
 'View expedition':['Expedition ansehen','Ver expedición','Expeditie bekijken','Vedi spedizione','Voir l’expédition'],
 'Base completion reward':['Grundbelohnung für den Abschluss','Recompensa base al completar','Basisbeloning voor voltooiing','Ricompensa base al completamento','Récompense de base à la réussite'],
 'Expedition preparation':['Expeditionsvorbereitung','Preparación de expedición','Expeditievoorbereiding','Preparazione spedizione','Préparation de l’expédition'],
 'Mechanics & objectives':['Mechaniken & Ziele','Mecánicas y objetivos','Mechanieken en doelen','Meccaniche e obiettivi','Mécaniques et objectifs'],
 'Rewards & entry rules':['Belohnungen & Zugangsregeln','Recompensas y reglas de entrada','Beloningen en toegangsregels','Ricompense e regole di accesso','Récompenses et conditions d’entrée'],
 'Reward rules':['Belohnungsregeln','Reglas de recompensas','Beloningsregels','Regole ricompense','Règles des récompenses'],
 'Route & encounters':['Route & Begegnungen','Ruta y encuentros','Route en ontmoetingen','Percorso e incontri','Parcours et rencontres'],
 'Expedition Marks':['Expeditionsmarken','Marcas de expedición','Expeditiemerken','Marchi spedizione','Marques d’expédition'],
 'Enhanced rewards · unlimited runs':['Verstärkte Belohnungen · unbegrenzte Durchläufe','Recompensas mejoradas · intentos ilimitados','Verbeterde beloningen · onbeperkte runs','Ricompense potenziate · tentativi illimitati','Récompenses améliorées · tentatives illimitées'],
 'Choose a difficulty to continue.':['Wähle eine Schwierigkeit.','Elige una dificultad para continuar.','Kies een moeilijkheid om door te gaan.','Scegli una difficoltà per continuare.','Choisissez une difficulté pour continuer.'],
 'themed stages + final boss':['thematische Etappen + Endboss','etapas temáticas + jefe final','thematische etappes + eindbaas','tappe a tema + boss finale','étapes thématiques + boss final'],
 'non-boss rooms · final boss follows':['Räume ohne Boss · danach der Endboss','salas sin jefe · después el jefe final','kamers zonder baas · daarna de eindbaas','stanze senza boss · poi il boss finale','salles sans boss · puis le boss final'],
 'Your verified character + three eligible Echo recruits':['Dein verifizierter Charakter + drei geeignete Echo-Rekruten','Tu personaje verificado + tres reclutas Eco aptos','Je geverifieerde personage + drie geschikte Echo-rekruten','Il tuo personaggio verificato + tre reclute Eco idonee','Votre personnage vérifié + trois recrues Écho admissibles'],
};
export function dungeonText(language:Language,text:string){const index=['de','es','nl','it','fr'].indexOf(language);return rows[text]?.[index]??accountText(language,text);}
