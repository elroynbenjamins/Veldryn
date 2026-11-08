import type {Language} from './languages';

type CombatModifier='thorned'|'volatile'|'warded'|'swift'|'attrition';
interface ModifierCopy{label:string;description:string;}
const COPY:Record<CombatModifier,Record<Language,ModifierCopy>>={
 thorned:{
  en:{label:'Thorned',description:'Enemies spread damaging thorns over time.'},
  de:{label:'Dornen',description:'Gegner verursachen über Zeit Dornenschaden.'},
  es:{label:'Espinoso',description:'Los enemigos aplican daño de espinas periódico.'},
  nl:{label:'Doornig',description:'Vijanden veroorzaken doorlopende doornschade.'},
  it:{label:'Spinoso',description:'I nemici infliggono danni da spine nel tempo.'},
  fr:{label:'Épineux',description:'Les ennemis infligent des dégâts d’épines dans le temps.'},
  ru:{label:'Шипы',description:'Враги наносят периодический урон шипами.'},
  tr:{label:'Dikenli',description:'Düşmanlar zamanla diken hasarı verir.'},
 },
 volatile:{
  en:{label:'Volatile',description:'Lower enemy health, but stronger attacks and an interruptible blast.'},
  de:{label:'Instabil',description:'Weniger Leben, aber härtere Angriffe und unterbrechbare Explosionen.'},
  es:{label:'Inestable',description:'Menos salud, pero ataques más fuertes y explosiones interrumpibles.'},
  nl:{label:'Instabiel',description:'Minder gezondheid, maar zwaardere aanvallen en onderbreekbare explosies.'},
  it:{label:'Instabile',description:'Meno salute, ma attacchi più forti e esplosioni interrompibili.'},
  fr:{label:'Instable',description:'Moins de vie, mais des attaques plus fortes et une explosion interruptible.'},
  ru:{label:'Нестабильный',description:'Меньше здоровья, но сильнее атаки и прерываемый взрыв.'},
  tr:{label:'Dengesiz',description:'Daha az can, ancak daha güçlü saldırılar ve kesilebilir patlama.'},
 },
 warded:{
  en:{label:'Warded',description:'Higher enemy defense and a protective barrier.'},
  de:{label:'Geschützt',description:'Mehr Gegnerverteidigung und ein Schutzschild.'},
  es:{label:'Protegido',description:'Más defensa enemiga y una barrera protectora.'},
  nl:{label:'Beschermd',description:'Meer verdediging en een beschermend schild.'},
  it:{label:'Protetto',description:'Più difesa nemica e una barriera protettiva.'},
  fr:{label:'Protégé',description:'Plus de défense et une barrière de protection.'},
  ru:{label:'Защита',description:'У врагов выше защита и есть защитный барьер.'},
  tr:{label:'Korumalı',description:'Daha yüksek savunma ve koruyucu kalkan.'},
 },
 swift:{
  en:{label:'Swift',description:'Enemies attack faster, but have slightly less health.'},
  de:{label:'Flink',description:'Gegner greifen schneller an, haben aber etwas weniger Leben.'},
  es:{label:'Veloz',description:'Los enemigos atacan más rápido, pero tienen menos salud.'},
  nl:{label:'Snel',description:'Vijanden vallen sneller aan, maar hebben iets minder gezondheid.'},
  it:{label:'Rapido',description:'I nemici attaccano più rapidamente, ma hanno meno salute.'},
  fr:{label:'Rapide',description:'Les ennemis attaquent plus vite, mais ont moins de vie.'},
  ru:{label:'Быстрый',description:'Враги атакуют быстрее, но имеют чуть меньше здоровья.'},
  tr:{label:'Çevik',description:'Düşmanlar daha hızlı saldırır ama daha az cana sahiptir.'},
 },
 attrition:{
  en:{label:'Attrition',description:'Tougher enemies can reduce healing received.'},
  de:{label:'Zermürbung',description:'Zähere Gegner können die erhaltene Heilung verringern.'},
  es:{label:'Desgaste',description:'Enemigos más resistentes reducen la curación recibida.'},
  nl:{label:'Uitputting',description:'Taaiere vijanden verminderen ontvangen genezing.'},
  it:{label:'Logoramento',description:'Nemici più resistenti riducono le cure ricevute.'},
  fr:{label:'Usure',description:'Des ennemis plus résistants réduisent les soins reçus.'},
  ru:{label:'Истощение',description:'Более стойкие враги снижают эффективность лечения.'},
  tr:{label:'Yıpratma',description:'Dayanıklı düşmanlar alınan iyileştirmeyi azaltır.'},
 },
};
export function localizedDungeonRoomModifier(language:Language,id:string|undefined):ModifierCopy|undefined{
 if(!id||!Object.prototype.hasOwnProperty.call(COPY,id))return undefined;
 return COPY[id as CombatModifier][language]??COPY[id as CombatModifier].en;
}
