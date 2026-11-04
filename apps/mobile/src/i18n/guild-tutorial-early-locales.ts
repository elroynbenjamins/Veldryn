import type {Language} from './languages';
import {GUILD_TUTORIAL_STEPS} from '../core/guild-tutorial';

/** Seven current guild walkthrough steps, preserving their existing navigation. */
export const guildTutorialEarlySteps=[
  [
    [
      "Добро пожаловать в гильдию",
      "Прочитайте доску объявлений, чтобы узнать планы гильдии. Если она пуста, загляните в чат гильдии.",
      "Изучите разделы. Обучение можно приостановить и продолжить позже.",
      "Показать главную гильдии"
    ],
    [
      "Loncanıza hoş geldiniz",
      "Loncanın planları için Duyuru Panosunu oku. Boşsa Lonca Sohbetine bak.",
      "Bölümleri keşfet. Rehberi duraklatıp sonra devam edebilirsin.",
      "Lonca ana sayfasını göster"
    ]
  ],
  [
    [
      "Познакомьтесь с участниками",
      "Чат гильдии предназначен для участников. Список участников — в Главной гильдии → Участники. Групповой чат отдельный.",
      "Чат гильдии доступен, даже если группы ещё закрыты. Писать сообщение необязательно.",
      "Открыть чат гильдии"
    ],
    [
      "Lonca üyeleriyle tanış",
      "Lonca Sohbeti üyelere özeldir. Üye listesi Lonca Ana Sayfası → Üyeler bölümündedir. Grup sohbeti ayrıdır.",
      "Gruplar kilitli olsa da Lonca Sohbeti kullanılabilir. Mesaj göndermen gerekmez.",
      "Lonca sohbetini aç"
    ]
  ],
  [
    [
      "Ваши ежедневные действия важны",
      "В Активности → Сбор посмотрите ежедневный вклад и прогресс недельного сбора.",
      "Необязательно играть одновременно со всеми. Пропущенный день не стирает засчитанные дни недели.",
      "Показать ежедневный сбор"
    ],
    [
      "Günlük oyunun değerlidir",
      "Etkinlikler → Yoklama bölümünde günlük katkını ve haftalık ilerlemeni gör.",
      "Herkesle aynı anda oynamana gerek yok. Bir günü kaçırmak haftalık geçerli günlerini silmez.",
      "Günlük yoklamayı göster"
    ]
  ],
  [
    [
      "Выберите общую цель",
      "Откройте Активности → Задания, чтобы увидеть общие недельные цели и оставшееся время.",
      "Перед выбором проверьте цель и срок. Не нужно выполнять все задания самостоятельно.",
      "Показать задания гильдии"
    ],
    [
      "Ortak bir hedef seç",
      "Etkinlikler → Görevler bölümünde haftalık ortak hedefleri ve kalan süreyi gör.",
      "Karar vermeden önce hedefi ve süreyi kontrol et. Hepsini tek başına yapmana gerek yok.",
      "Lonca görevlerini göster"
    ]
  ],
  [
    [
      "Стройте вместе",
      "Откройте Развитие → Проекты, чтобы увидеть общий прогресс и требования ко вкладу.",
      "Некоторые действия доступны только руководству. Перед пожертвованием проверьте условия и награды завершённых проектов.",
      "Показать проекты гильдии"
    ],
    [
      "Birlikte inşa edin",
      "İlerleme → Projeler bölümünde ortak ilerlemeyi ve katkı gereksinimlerini gör.",
      "Bazı işlemleri yalnızca yönetim yapabilir. Bağıştan önce koşulları, tamamlanan projelerde ödülleri kontrol et.",
      "Lonca projelerini göster"
    ]
  ],
  [
    [
      "Сражайтесь с боссами гильдии",
      "Откройте PvE и выберите недельного или событийного босса. Проверьте право участия и сроки получения наград.",
      "Новые участники могут не попасть в текущий фиксированный состав. Присоединитесь к следующему бою. Забирайте доступные награды до срока.",
      "Показать боссов гильдии"
    ],
    [
      "Lonca patronlarına katıl",
      "PvE bölümünde Haftalık Patron veya Etkinlik Patronunu seç. Katılım uygunluğunu ve ödül süresini kontrol et.",
      "Yeni üyeler mevcut sabit kadroda olmayabilir. Sonraki karşılaşmaya katıl. Uygun ödülleri süresi dolmadan al.",
      "Lonca patronlarını göster"
    ]
  ],
  [
    [
      "Теперь вы готовы участвовать",
      "Зал показывает здания и постоянные бонусы. Начните с объявлений, полезного занятия и проверки прогресса.",
      "Зал → Магазин использует жетоны гильдии. Строительство открывает бонусы и товары, но не бесплатную косметику. В банк можно жертвовать только на активные проекты. Обучение можно повторить с Главной гильдии.",
      "Изучить зал гильдии"
    ],
    [
      "Artık hazırsın",
      "Salon, tesisleri ve kalıcı bonusları gösterir. Önce duyuruları oku, yararlı bir etkinlik yap ve ilerlemeyi kontrol et.",
      "Salon → Mağaza Lonca Jetonları kullanır. İnşaat avantaj ve mağaza erişimi açar, ücretsiz kozmetik vermez. Banka yalnızca etkin projeler için bağış yapılır. Rehberi Lonca Ana Sayfasından yineleyebilirsin.",
      "Lonca Salonunu keşfet"
    ]
  ]
] as const;
/** Guild guide controls and role-dependent context in Russian and Turkish. */
export const guildTutorialEarlyRows={
  "YOUR GUILD GUIDE": [
    "ВАШ ПУТЕВОДИТЕЛЬ ПО ГИЛЬДИИ",
    "LONCA REHBERİN"
  ],
  "Guild guide progress": [
    "Прогресс обучения гильдии",
    "Lonca rehberi ilerlemesi"
  ],
  "Previous tip": [
    "Предыдущий совет",
    "Önceki ipucu"
  ],
  "More detail": [
    "Подробнее",
    "Daha fazla ayrıntı"
  ],
  "Less detail": [
    "Кратко",
    "Daha az ayrıntı"
  ],
  "Pause guide": [
    "Приостановить обучение",
    "Rehberi duraklat"
  ],
  "Resume guild guide": [
    "Продолжить обучение гильдии",
    "Lonca rehberine devam et"
  ],
  "Replay guild guide": [
    "Пройти обучение заново",
    "Lonca rehberini yeniden başlat"
  ],
  "Continue guide": [
    "Продолжить обучение",
    "Rehbere devam et"
  ],
  "Finish guide": [
    "Завершить обучение",
    "Rehberi bitir"
  ],
  "Read tip again": [
    "Прочитать совет ещё раз",
    "İpucunu tekrar oku"
  ],
  "Return to this section before continuing the guide.": [
    "Вернитесь в этот раздел, прежде чем продолжить обучение.",
    "Rehbere devam etmeden önce bu bölüme dön."
  ],
  "Look around below. No message, contribution or purchase is required.": [
    "Осмотритесь ниже. Писать сообщения, вносить вклад или покупать что-либо не нужно.",
    "Aşağıdaki bölümü incele. Mesaj, katkı veya satın alma gerekmez."
  ],
  "You can read the notice. Leaders and officers manage guild announcements.": [
    "Вы можете читать объявления. Их изменяют лидер и офицеры.",
    "Duyuruyu okuyabilirsin. Lonca duyurularını lider ve subaylar yönetir."
  ],
  "Your role can manage announcements. Start by checking the current guild priority.": [
    "Ваша роль позволяет управлять объявлениями. Сначала проверьте текущую цель гильдии.",
    "Rolün duyuruları yönetebilir. Önce loncanın mevcut önceliğine bak."
  ],
  "Reading is enough for this step. Introduce yourself only when you want to.": [
    "Для этого шага достаточно прочитать чат. Представляться необязательно.",
    "Bu adımda okumak yeterli. İstersen kendini tanıtabilirsin."
  ],
  "Starting at zero is normal. Everyday combat and skilling build your contribution.": [
    "Начать с нуля нормально. Бои и развитие навыков увеличивают ваш вклад.",
    "Sıfırdan başlamak normaldir. Günlük savaşlar ve beceriler katkını artırır."
  ],
  "Pick a goal that fits your level. You do not need to finish a quest to continue this guide.": [
    "Выберите цель по своему уровню. Для продолжения обучения выполнять задание не нужно.",
    "Seviyene uygun bir hedef seç. Rehbere devam etmek için görevi bitirmek zorunda değilsin."
  ],
  "As a member, help with active projects. Leadership manages project selection and upgrades.": [
    "Участники помогают активным проектам. Руководство выбирает проекты и улучшения.",
    "Üye olarak etkin projelere destek ol. Projeleri ve yükseltmeleri yönetim seçer."
  ],
  "Coordinate project choices with your guild. Check costs before committing shared resources.": [
    "Согласуйте выбор проектов с гильдией. Перед тратой общих ресурсов проверьте стоимость.",
    "Proje seçimlerini loncayla koordine et. Ortak kaynak harcamadan önce maliyetleri kontrol et."
  ],
  "Joined recently? If the current boss excludes you, wait for the next encounter. No claim is required now.": [
    "Недавно вступили? Если вы не включены в текущего босса, дождитесь следующего. Сейчас награду забирать не нужно.",
    "Yeni mi katıldın? Mevcut patronda yer alamıyorsan sonraki karşılaşmayı bekle. Şimdi ödül alman gerekmiyor."
  ],
  "You benefit from unlocked facilities without managing them. Guild Token purchases can wait until you earn enough.": [
    "Открытые здания дают бонусы без управления ими. Покупки за жетоны гильдии могут подождать.",
    "Açılmış tesislerin avantajlarından yönetmeden yararlanırsın. Lonca Jetonuyla alışveriş için biriktirebilirsin."
  ],
  "Review facilities and available funds before upgrading. Purchases are not part of this guide.": [
    "Перед улучшением проверьте здания и доступные средства. Покупки в обучение не входят.",
    "Yükseltmeden önce tesisleri ve mevcut kaynakları incele. Satın almalar bu rehberin parçası değil."
  ]
} as const;

export function guildTutorialEarlyText(language:Language,source:string):string|undefined{
 if(language!=='ru'&&language!=='tr')return undefined;
 const column=language==='ru'?0:1;
 const row=Object.prototype.hasOwnProperty.call(guildTutorialEarlyRows,source)
  ? guildTutorialEarlyRows[source as keyof typeof guildTutorialEarlyRows]:undefined;
 if(row)return row[column];
 for(let i=0;i<GUILD_TUTORIAL_STEPS.length;i++){
  const step=GUILD_TUTORIAL_STEPS[i];
  const field=[step.title,step.body,step.tip,step.action].indexOf(source);
  if(field>=0)return guildTutorialEarlySteps[i]?.[column]?.[field]??source;
 }
 return undefined;
}
