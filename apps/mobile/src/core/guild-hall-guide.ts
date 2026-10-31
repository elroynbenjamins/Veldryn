import type {Language} from '../i18n/languages';

export type GuildHallGuideSection='Facilities'|'Skills'|'Trophies'|'Shop';
type Guide={title:string;body:string;detail:string};

/** Each Hall destination has its own first-visit tip, not a compulsory tour.
 * Construction is release-gated; do not suggest players can donate to unreleased tiers.
 */
const guides:Record<Language,Record<GuildHallGuideSection,Guide>>={
 en:{
  Facilities:{title:'Guild Hall & construction',body:'Review facility upgrades and the materials your Guild still needs.',detail:'Only released, active construction can receive donations in the Guild Bank. Completed tiers give shared benefits, not free cosmetics. Only already-unlocked name colors can be selected.'},
  Skills:{title:'Guild Skills',body:'Spend earned Guild skill points on shared progression branches.',detail:'Guild Skills are separate from material-funded Hall construction. Check the current bonus and next cost before upgrading.'},
  Trophies:{title:'Guild Trophies',body:'Review your Guild history and major achievements here.',detail:'Future Guild Legacy records are not claimable rewards yet.'},
  Shop:{title:'Guild Token Shop',body:'Earn Guild Tokens from eligible activity and spend them on account cosmetics.',detail:'Guild Hall tiers can unlock access to higher-quality offers, but never give the items for free. Shop requirements and your balance still apply.'},
 },
 de:{
  Facilities:{title:'Gildenhalle & Bauprojekte',body:'Sieh dir Einrichtungen und die noch benötigten Baumaterialien an.',detail:'Nur freigegebene, aktive Bauprojekte nehmen Spenden in der Gildenbank an. Boni gelten für die Gilde, Kosmetik gibt es nicht gratis. Nur bereits freigeschaltete Namensfarben sind wählbar.'},
  Skills:{title:'Gildenfertigkeiten',body:'Nutze verdiente Fertigkeitspunkte für gemeinsame Fortschrittszweige.',detail:'Fertigkeiten sind getrennt von Bauprojekten. Prüfe Bonus und Kosten der nächsten Stufe.'},
  Trophies:{title:'Gildentrophäen',body:'Sieh dir die Geschichte und Erfolge deiner Gilde an.',detail:'Zukünftige Gildenchronik-Einträge sind noch keine einlösbaren Belohnungen.'},
  Shop:{title:'Gildenmarken-Shop',body:'Verdiene Gildenmarken durch berechtigte Aktivitäten und kaufe Account-Kosmetik.',detail:'Hallenstufen öffnen höherwertige Angebote, geben aber keine Gratisgegenstände. Kosten und Freischaltbedingungen bleiben gültig.'},
 },
 es:{
  Facilities:{title:'Salón y construcción',body:'Consulta las mejoras del salón y los materiales que necesita tu gremio.',detail:'Solo los proyectos activos y publicados aceptan donaciones en el banco. Las mejoras dan beneficios compartidos, no cosméticos gratis. Solo puedes elegir colores de nombre ya desbloqueados.'},
  Skills:{title:'Habilidades del gremio',body:'Gasta puntos obtenidos en las ramas de progreso compartido.',detail:'Las habilidades son independientes de la construcción. Revisa el bono y el coste de cada nivel.'},
  Trophies:{title:'Trofeos del gremio',body:'Consulta la historia y los logros destacados del gremio.',detail:'Los futuros registros del Legado no ofrecen recompensas reclamables todavía.'},
  Shop:{title:'Tienda de fichas del gremio',body:'Gana fichas del gremio jugando y compra cosméticos para tu cuenta.',detail:'Las mejoras del salón permiten comprar ofertas de mayor calidad, pero no regalan artículos. Se mantienen los requisitos y precios.'},
 },
 nl:{
  Facilities:{title:'Gildehal & bouwprojecten',body:'Bekijk de upgrades en welke materialen je gilde nog nodig heeft.',detail:'Alleen vrijgegeven, actieve projecten accepteren donaties via de Gildebank. Upgrades geven gezamenlijke bonussen, geen gratis cosmetica. Alleen eerder ontgrendelde naamkleuren zijn te kiezen.'},
  Skills:{title:'Gildevaardigheden',body:'Besteed verdiende vaardigheidspunten aan gezamenlijke upgrades.',detail:'Vaardigheden staan los van de bouwprojecten. Controleer de bonus en kosten voor de volgende rang.'},
  Trophies:{title:'Gildetrofeeën',body:'Bekijk de geschiedenis en belangrijke prestaties van je gilde.',detail:'Toekomstige Guild Legacy-records zijn nog geen beloningen die je kunt claimen.'},
  Shop:{title:'Gildemuntenwinkel',body:'Verdien gildemunten met geldige activiteiten en koop cosmetica voor je account.',detail:'Gildehal-upgrades openen aanbiedingen van hogere kwaliteit, maar geven geen gratis items. Prijzen en voorwaarden blijven gelden.'},
 },
 it:{
  Facilities:{title:'Sala della gilda e costruzioni',body:'Controlla le migliorie e i materiali ancora necessari alla gilda.',detail:'Solo i progetti attivi e pubblicati accettano donazioni nella banca. Le migliorie danno bonus condivisi, non cosmetici gratis. Puoi scegliere soltanto colori del nome già sbloccati.'},
  Skills:{title:'Abilità della gilda',body:'Spendi i punti ottenuti nei rami di progresso condiviso.',detail:'Le abilità sono separate dalle costruzioni. Controlla il bonus e il costo del prossimo livello.'},
  Trophies:{title:'Trofei della gilda',body:'Consulta storia e traguardi della gilda.',detail:'I futuri registri del retaggio non sono ancora ricompense riscattabili.'},
  Shop:{title:'Negozio gettoni della gilda',body:'Guadagna gettoni tramite attività valide e acquista cosmetici per il tuo account.',detail:'Le migliorie della sala aprono offerte migliori senza regalare oggetti. Restano validi costi e requisiti.'},
 },
 fr:{
  Facilities:{title:'Hall et constructions',body:'Consultez les améliorations et les matériaux nécessaires à votre guilde.',detail:'Seuls les projets actifs et publiés acceptent les dons en banque. Les améliorations donnent des bonus communs, pas de cosmétiques gratuits. Seules les couleurs de nom déjà débloquées sont disponibles.'},
  Skills:{title:'Compétences de guilde',body:'Utilisez les points gagnés dans les branches de progression communes.',detail:'Les compétences sont distinctes des constructions. Vérifiez le bonus et le coût du rang suivant.'},
  Trophies:{title:'Trophées de guilde',body:'Consultez les succès et l’histoire de votre guilde.',detail:'Les futures archives de guilde ne donnent pas encore de récompenses à réclamer.'},
  Shop:{title:'Boutique des jetons de guilde',body:'Gagnez des jetons avec les activités éligibles et achetez des cosmétiques de compte.',detail:'Les niveaux du Hall ouvrent des offres de qualité supérieure, sans donner d’objets gratuits. Les conditions et les prix restent applicables.'},
 },
};
export function guildHallSectionGuide(language:Language,section:GuildHallGuideSection):Guide{
 return guides[language][section];
}
