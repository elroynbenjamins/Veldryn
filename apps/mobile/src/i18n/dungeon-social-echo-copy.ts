import type {Language} from './languages';

type Key=
 'title'|'subtitle'|'chosen'|'explain'|'all'|'friends'|'guild'|'search'|'checking'
 |'emptyTitle'|'emptyCopy'|'privacy'|'retry'|'friend'|'both'|'guildMember'
 |'you'|'auto'|'tank'|'damage'|'support'|'onePlayer'|'uniqueDamage'|'slotFull'
 |'open'|'searchHint'|'disabled';

const en:Record<Key,string>={
 title:'Dungeon Allies',subtitle:'Recruit friends & guild heroes',chosen:'{count} chosen · others auto-filled',
 explain:'Choose up to three allies. Their class and equipment effects stay; power scales to yours. Empty seats use Echoes or NPCs.',
 all:'All',friends:'Friends',guild:'Guild',search:'Search character or class…',checking:'Checking available allies…',
 emptyTitle:'No eligible allies',emptyCopy:'Dungeon-ready friends and guild members appear automatically. NPCs can fill the team.',
 privacy:'Available to friends and guild automatically. Blocking a player or ending all ties revokes access.',
 retry:'Retry',friend:'Friend',both:'Friend · Guild',guildMember:'Guild member',
 you:'YOU',auto:'AUTO',tank:'TANK',damage:'DAMAGE',support:'SUPPORT',
 onePlayer:'Choose one character per player.',uniqueDamage:'Damage heroes must use different classes.',slotFull:'That role is already filled.',
 open:'Choose friends and guild dungeon allies',searchHint:'Search available dungeon allies',disabled:'This party slot is unavailable',
};
const copy:Record<Language,Record<Key,string>>={
 en,
 de:{
 title:'Dungeon-Verbündete',subtitle:'Freunde und Gildenhelden rekrutieren',chosen:'{count} gewählt · Rest automatisch',
 explain:'Wähle bis zu drei Verbündete. Klassen- und Ausrüstungseffekte bleiben; ihre Stärke wird angepasst. Freie Plätze füllen Echos oder NPCs.',
 all:'Alle',friends:'Freunde',guild:'Gilde',search:'Charakter oder Klasse suchen…',checking:'Verbündete werden geprüft…',
 emptyTitle:'Keine geeigneten Verbündeten',emptyCopy:'Dungeonbereite Freunde und Gildenmitglieder erscheinen automatisch. NPCs können einspringen.',
 privacy:'Für Freunde und Gilde automatisch verfügbar. Blockieren oder alle Verbindungen lösen entzieht den Zugriff.',
 retry:'Erneut',friend:'Freund',both:'Freund · Gilde',guildMember:'Gildenmitglied',
 you:'DU',auto:'AUTO',tank:'TANK',damage:'SCHADEN',support:'SUPPORT',
 onePlayer:'Nur ein Charakter pro Spieler.',uniqueDamage:'Schadensklassen müssen unterschiedlich sein.',slotFull:'Diese Rolle ist bereits besetzt.',
 open:'Dungeon-Verbündete auswählen',searchHint:'Verfügbare Verbündete suchen',disabled:'Dieser Platz ist nicht verfügbar',
 },
 es:{
 title:'Aliados de mazmorra',subtitle:'Recluta amigos y héroes del gremio',chosen:'{count} elegidos · resto automático',
 explain:'Elige hasta tres aliados. Conservan habilidades y efectos de equipo; su poder se ajusta al tuyo. Los huecos se llenan con ecos o PNJ.',
 all:'Todos',friends:'Amigos',guild:'Gremio',search:'Buscar personaje o clase…',checking:'Buscando aliados…',
 emptyTitle:'No hay aliados disponibles',emptyCopy:'Los amigos y miembros del gremio preparados aparecen automáticamente. Los PNJ pueden cubrir huecos.',
 privacy:'Disponible para amigos y gremio. Bloquear o perder ambos vínculos revoca el acceso.',
 retry:'Reintentar',friend:'Amigo',both:'Amigo · Gremio',guildMember:'Miembro del gremio',
 you:'TÚ',auto:'AUTO',tank:'TANQUE',damage:'DAÑO',support:'APOYO',
 onePlayer:'Solo un personaje por jugador.',uniqueDamage:'Los héroes de daño deben usar clases distintas.',slotFull:'Ese rol ya está ocupado.',
 open:'Elegir aliados de amigos y gremio',searchHint:'Buscar aliados disponibles',disabled:'Este puesto no está disponible',
 },
 nl:{
 title:'Kerkermakkers',subtitle:'Kies vrienden en gildehelden',chosen:'{count} gekozen · rest automatisch',
 explain:'Kies maximaal drie bondgenoten. Klasse- en uitrustingseffecten blijven; hun kracht schaalt mee. Open plekken worden gevuld door Echo’s of NPC’s.',
 all:'Alles',friends:'Vrienden',guild:'Gilde',search:'Zoek personage of klasse…',checking:'Bondgenoten controleren…',
 emptyTitle:'Geen geschikte bondgenoten',emptyCopy:'Geschikte vrienden en gildeleden verschijnen automatisch. NPC’s vullen lege plekken.',
 privacy:'Automatisch beschikbaar voor vrienden en gilde. Blokkeren of alle banden verbreken trekt toegang in.',
 retry:'Opnieuw',friend:'Vriend',both:'Vriend · Gilde',guildMember:'Gildelid',
 you:'JIJ',auto:'AUTO',tank:'TANK',damage:'SCHADE',support:'STEUN',
 onePlayer:'Kies één personage per speler.',uniqueDamage:'Schadeklassen moeten verschillen.',slotFull:'Deze rol is al bezet.',
 open:'Kies kerkerbondgenoten',searchHint:'Zoek beschikbare bondgenoten',disabled:'Deze plek is niet beschikbaar',
 },
 it:{
 title:'Alleati del dungeon',subtitle:'Recluta amici e membri della gilda',chosen:'{count} scelti · resto automatico',
 explain:'Scegli fino a tre alleati. Mantengono abilità ed effetti dell’equipaggiamento; la potenza si adatta alla tua. Gli slot liberi usano Echo o PNG.',
 all:'Tutti',friends:'Amici',guild:'Gilda',search:'Cerca personaggio o classe…',checking:'Ricerca alleati…',
 emptyTitle:'Nessun alleato disponibile',emptyCopy:'Amici e membri della gilda pronti compaiono automaticamente. I PNG coprono gli slot vuoti.',
 privacy:'Disponibile per amici e gilda. Il blocco o la fine di tutti i legami revoca l’accesso.',
 retry:'Riprova',friend:'Amico',both:'Amico · Gilda',guildMember:'Membro della gilda',
 you:'TU',auto:'AUTO',tank:'TANK',damage:'DANNI',support:'SUPPORTO',
 onePlayer:'Un solo personaggio per giocatore.',uniqueDamage:'Le classi danno devono essere diverse.',slotFull:'Questo ruolo è già occupato.',
 open:'Scegli alleati per il dungeon',searchHint:'Cerca alleati disponibili',disabled:'Slot non disponibile',
 },
 fr:{
 title:'Alliés de donjon',subtitle:'Recrutez amis et héros de guilde',chosen:'{count} choisis · reste automatique',
 explain:'Choisissez trois alliés maximum. Classes et effets d’équipement sont conservés, la puissance est ajustée. Les places libres utilisent des Échos ou PNJ.',
 all:'Tous',friends:'Amis',guild:'Guilde',search:'Chercher personnage ou classe…',checking:'Recherche des alliés…',
 emptyTitle:'Aucun allié disponible',emptyCopy:'Vos amis et membres de guilde prêts apparaissent automatiquement. Des PNJ peuvent compléter le groupe.',
 privacy:'Disponible pour vos amis et votre guilde. Bloquer ou rompre tous les liens révoque l’accès.',
 retry:'Réessayer',friend:'Ami',both:'Ami · Guilde',guildMember:'Membre de guilde',
 you:'VOUS',auto:'AUTO',tank:'TANK',damage:'DÉGÂTS',support:'SOUTIEN',
 onePlayer:'Un personnage par joueur.',uniqueDamage:'Les classes de dégâts doivent différer.',slotFull:'Ce rôle est déjà occupé.',
 open:'Choisir les alliés du donjon',searchHint:'Chercher des alliés disponibles',disabled:'Cette place est indisponible',
 },
 ru:{
 title:'Союзники подземелья',subtitle:'Наймите друзей и героев гильдии',chosen:'Выбрано: {count} · остальные автоматически',
 explain:'Выберите до трёх союзников. Навыки и эффекты снаряжения сохраняются, сила подстраивается. Пустые места займут эхо или NPC.',
 all:'Все',friends:'Друзья',guild:'Гильдия',search:'Поиск по имени или классу…',checking:'Проверяем союзников…',
 emptyTitle:'Нет доступных союзников',emptyCopy:'Подходящие друзья и участники гильдии появятся автоматически. Группу дополнят NPC.',
 privacy:'Доступно друзьям и гильдии автоматически. Блокировка или потеря всех связей закрывает доступ.',
 retry:'Повторить',friend:'Друг',both:'Друг · Гильдия',guildMember:'Участник гильдии',
 you:'ВЫ',auto:'АВТО',tank:'ТАНК',damage:'УРОН',support:'ПОДДЕРЖКА',
 onePlayer:'Один персонаж на игрока.',uniqueDamage:'Классы урона должны различаться.',slotFull:'Эта роль уже занята.',
 open:'Выбрать союзников подземелья',searchHint:'Найти доступных союзников',disabled:'Это место недоступно',
 },
 tr:{
 title:'Zindan Müttefikleri',subtitle:'Arkadaş ve lonca kahramanlarını seç',chosen:'{count} seçildi · kalanlar otomatik',
 explain:'En fazla üç müttefik seç. Sınıf ve ekipman etkileri korunur, güç sana göre ayarlanır. Boş yerleri Yankılar veya NPC’ler doldurur.',
 all:'Tümü',friends:'Arkadaşlar',guild:'Lonca',search:'Karakter veya sınıf ara…',checking:'Müttefikler kontrol ediliyor…',
 emptyTitle:'Uygun müttefik yok',emptyCopy:'Hazır arkadaşlar ve lonca üyeleri otomatik görünür. NPC’ler ekibi tamamlayabilir.',
 privacy:'Arkadaş ve lonca üyelerine otomatik açıktır. Engellemek veya tüm bağları kesmek erişimi kaldırır.',
 retry:'Tekrar dene',friend:'Arkadaş',both:'Arkadaş · Lonca',guildMember:'Lonca üyesi',
 you:'SEN',auto:'OTOMATİK',tank:'TANK',damage:'HASAR',support:'DESTEK',
 onePlayer:'Her oyuncudan tek karakter seç.',uniqueDamage:'Hasar sınıfları farklı olmalı.',slotFull:'Bu rol zaten dolu.',
 open:'Zindan müttefiklerini seç',searchHint:'Uygun müttefikleri ara',disabled:'Bu yer kullanılamıyor',
 },
};
export function dungeonEchoPickerText(language:Language,key:Key,count?:number):string{
 const value=copy[language]?.[key]??en[key];
 return count===undefined?value:value.replace('{count}',String(count));
}
