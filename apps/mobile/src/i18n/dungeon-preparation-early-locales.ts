import type {Language} from './languages';

/** Dungeon preparation labels for Russian and Turkish, matching the five established locale keys. */
export const dungeonPreparationEarlyRows={
  "NPC or Echo allies fill the missing roles": [
    "Недостающие роли займут NPC или союзники-Эхо",
    "Eksik rolleri NPC veya Yankı müttefikleri doldurur"
  ],
  "Find an eligible party automatically": [
    "Автоматически найти подходящую группу",
    "Uygun grubu otomatik bul"
  ],
  "Group finder & options": [
    "Поиск группы и настройки",
    "Grup arama ve seçenekler"
  ],
  "My Echo & sharing": [
    "Моё Эхо и доступ",
    "Yankım ve paylaşım"
  ],
  "Solo": [
    "Одиночный",
    "Tek başına"
  ],
  "Live": [
    "В реальном времени",
    "Canlı"
  ],
  "Play with three other players": [
    "Играйте с тремя другими игроками",
    "Üç oyuncuyla birlikte oyna"
  ],
  "Play with three Echo allies": [
    "Играйте с тремя союзниками-Эхо",
    "Üç Yankı müttefikiyle oyna"
  ],
  "Locked dungeons": [
    "Закрытые подземелья",
    "Kilitli zindanlar"
  ],
  "Hide locked dungeons": [
    "Скрыть закрытые подземелья",
    "Kilitli zindanları gizle"
  ],
  "Find Party": [
    "Найти группу",
    "Grup bul"
  ],
  "Start Dungeon": [
    "Начать подземелье",
    "Zindanı başlat"
  ],
  "Prepare Loadout": [
    "Подготовить сборку",
    "Dizilimi hazırla"
  ],
  "More information": [
    "Подробнее",
    "Daha fazla bilgi"
  ],
  "Recommended power": [
    "Рекомендуемая сила",
    "Önerilen güç"
  ],
  "rooms before the boss": [
    "комнат до босса",
    "patrondan önceki odalar"
  ],
  "Prepare expedition": [
    "Подготовить экспедицию",
    "Sefere hazırlan"
  ],
  "View expedition": [
    "Посмотреть экспедицию",
    "Seferi görüntüle"
  ],
  "Base completion reward": [
    "Базовая награда за завершение",
    "Temel tamamlama ödülü"
  ],
  "Expedition preparation": [
    "Подготовка экспедиции",
    "Sefer hazırlığı"
  ],
  "Mechanics & objectives": [
    "Механики и цели",
    "Mekanikler ve hedefler"
  ],
  "Rewards & entry rules": [
    "Награды и правила входа",
    "Ödüller ve giriş kuralları"
  ],
  "Reward rules": [
    "Правила наград",
    "Ödül kuralları"
  ],
  "Route & encounters": [
    "Маршрут и встречи",
    "Rota ve karşılaşmalar"
  ],
  "Expedition Marks": [
    "Знаки экспедиции",
    "Sefer Nişanları"
  ],
  "Enhanced rewards · unlimited runs": [
    "Улучшенные награды · число походов не ограничено",
    "Artırılmış ödüller · sınırsız sefer"
  ],
  "Choose a difficulty to continue.": [
    "Для продолжения выберите сложность.",
    "Devam etmek için zorluk seç."
  ],
  "themed stages + final boss": [
    "тематические этапы + финальный босс",
    "temalı aşamalar + son patron"
  ],
  "non-boss rooms · final boss follows": [
    "комнаты без босса · затем финальный босс",
    "patronsuz odalar · ardından son patron"
  ],
  "Your verified character + three eligible Echo recruits": [
    "Ваш проверенный персонаж и три подходящих Эхо-союзника",
    "Doğrulanmış karakterin ve üç uygun Yankı müttefiki"
  ]
} as const;
export function dungeonPreparationEarlyText(language:Language,source:string):string|undefined{
 if(language!=='ru'&&language!=='tr')return undefined;
 const row=Object.prototype.hasOwnProperty.call(dungeonPreparationEarlyRows,source)
  ? dungeonPreparationEarlyRows[source as keyof typeof dungeonPreparationEarlyRows]:undefined;
 return row?.[language==='ru'?0:1];
}
