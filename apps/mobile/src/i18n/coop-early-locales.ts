import type {CoopMessageKey} from './coop';

/** Russian and Turkish expedition browser, detail and room copy. Proper names remain unchanged. */
export const coopEarlyRows={
  "browse.kicker": [
    "МИР · ЭКСПЕДИЦИИ",
    "DÜNYA · SEFERLER"
  ],
  "browse.title": [
    "Совместные экспедиции",
    "Ortak Seferler"
  ],
  "browse.subtitle": [
    "Выберите доступную экспедицию. Состав группы настраивается после выбора режима.",
    "Uygun bir sefer seç. Grup hazırlığı mod seçiminden sonra yapılır."
  ],
  "browse.all": [
    "Все",
    "Tümü"
  ],
  "browse.available": [
    "Доступно",
    "Kullanılabilir"
  ],
  "browse.loading": [
    "Загрузка экспедиций с сервера…",
    "Sunucudan seferler yükleniyor…"
  ],
  "browse.retry": [
    "Повторить",
    "Yeniden dene"
  ],
  "browse.empty": [
    "Сервер не вернул список экспедиций.",
    "Sunucu herhangi bir sefer döndürmedi."
  ],
  "browse.noResults": [
    "По этому фильтру нет доступных экспедиций.",
    "Bu filtreye uygun sefer yok."
  ],
  "browse.levels": [
    "Минимум {min} · Рекомендуется {recommended}",
    "Asgari {min} · Önerilen {recommended}"
  ],
  "browse.requiresLevel": [
    "Требуется уровень {level}",
    "Seviye {level} gerekli"
  ],
  "browse.inDevelopment": [
    "Сражения ещё в разработке",
    "Karşılaşmalar geliştirme aşamasında"
  ],
  "browse.open": [
    "Открыть экспедицию",
    "Seferi aç"
  ],
  "browse.locked": [
    "Заблокировано",
    "Kilitli"
  ],
  "browse.resumeTitle": [
    "Экспедиция продолжается",
    "Devam eden sefer"
  ],
  "browse.resumeBody": [
    "Есть подтверждённый сервером поход, который можно продолжить.",
    "Devam edilebilecek doğrulanmış bir sefer var."
  ],
  "browse.resume": [
    "Продолжить поход",
    "Sefere devam et"
  ],
  "browse.regionProgress": [
    "Открыто: {available}/{total}",
    "Açık: {available}/{total}"
  ],
  "event.section": [
    "Экспедиции событий",
    "Etkinlik seferleri"
  ],
  "event.sectionCopy": [
    "Сезонные маршруты появляются на доске совместных походов во время событий.",
    "Mevsimsel rotalar etkinlikleri sırasında ortak sefer panosunda açılır."
  ],
  "event.seasonal": [
    "Сезонное",
    "Mevsimsel"
  ],
  "event.preview": [
    "Предпросмотр",
    "Ön izleme"
  ],
  "event.route": [
    "Фрагменты маршрута",
    "Rota ön izlemesi"
  ],
  "event.finalBoss": [
    "Финальный босс",
    "Son patron"
  ],
  "event.suncrest": [
    "Suncrest Games",
    "Suncrest Games"
  ],
  "event.starfall": [
    "Starfall Convergence",
    "Starfall Convergence"
  ],
  "event.shatteredDescription": [
    "Островные арены, пиратские лагеря и солнечные святилища образуют летний маршрут.",
    "Ada arenaları, korsan kampları ve güneş tapınakları yaz rotasını oluşturur."
  ],
  "event.astralDescription": [
    "Пройдите через метеоритные поля и небесные руины к разлому, где нарастает нестабильность.",
    "Yarık merkezine yaklaşırken meteor alanlarını ve göksel harabeleri aş."
  ],
  "event.coastalRuins": [
    "Прибрежные руины",
    "Kıyı Harabeleri"
  ],
  "event.sunShrine": [
    "Святилище солнца",
    "Güneş Tapınağı"
  ],
  "event.pirateCamp": [
    "Пиратский лагерь",
    "Korsan Kampı"
  ],
  "event.meteorField": [
    "Метеоритное поле",
    "Meteor Alanı"
  ],
  "event.starShrine": [
    "Звёздное святилище",
    "Yıldız Tapınağı"
  ],
  "event.riftGate": [
    "Врата разлома",
    "Yarık Kapısı"
  ],
  "details.kicker": [
    "СВЕДЕНИЯ ОБ ЭКСПЕДИЦИИ",
    "SEFER AYRINTILARI"
  ],
  "details.party": [
    "Группа",
    "Grup"
  ],
  "details.partyValue": [
    "1 танк · 2 бойца · 1 поддержка",
    "1 Tank · 2 Hasar · 1 Destek"
  ],
  "details.rooms": [
    "Маршрут",
    "Rota"
  ],
  "details.roomsValue": [
    "5 комнат без босса · затем финальный босс",
    "5 patronsuz oda · ardından son patron"
  ],
  "details.difficulty": [
    "Сложность",
    "Zorluk"
  ],
  "details.roomTypes": [
    "Доступные комнаты",
    "Etkin oda türleri"
  ],
  "details.mode": [
    "Выберите режим",
    "Mod seç"
  ],
  "details.live": [
    "В реальном времени",
    "Canlı"
  ],
  "details.liveCopy": [
    "Игра с 3 людьми · общие голосования · групповой чат.",
    "3 oyuncuyla oyna · ortak oylama · grup sohbeti."
  ],
  "details.qmode": [
    "Q-Mode",
    "Q-Mode"
  ],
  "details.qmodeCopy": [
    "3 сохранённых сборки игроков · выбирайте маршрут · без группового чата.",
    "3 kayıtlı oyuncu yapısı · rota seçimi · grup sohbeti yok."
  ],
  "details.selectLoadout": [
    "Выбрать сборку",
    "Dizilim seç"
  ],
  "details.modeSelected": [
    "Выбран {mode} · ступень {tier}",
    "{mode} seçildi · Kademe {tier}"
  ],
  "details.liveAutoSelected": [
    "Выбран Live · автоматическая ступень {tier}",
    "Canlı seçildi · Otomatik Kademe {tier}"
  ],
  "details.liveAutoCopy": [
    "Вам доступна ступень {tier}. Общая очередь запускает поход на самой высокой ступени, доступной всем участникам.",
    "Kademe {tier} için uygunsun. Canlı eşleştirme tek kuyruk kullanır ve tüm oyuncuların girebildiği en yüksek kademeyi başlatır."
  ],
  "details.reward": [
    "Планируемые награды",
    "Ödül bütçesi"
  ],
  "details.rewardUnavailable": [
    "После проверки сервером",
    "Sunucu doğrulamasından sonra sunulur"
  ],
  "details.noDifficulty": [
    "Нет доступных уровней сложности на сервере.",
    "Sunucuda uygun zorluk bulunamadı."
  ],
  "details.noRooms": [
    "Сервер не вернул поддерживаемые комнаты.",
    "Desteklenen oda tanımı dönmedi."
  ],
  "details.artUnavailable": [
    "Изображение недоступно",
    "Görsel kullanılamıyor"
  ],
  "details.nextPhase": [
    "На этом этапе выбор сборки недоступен.",
    "Bu aşamada dizilim seçilemez."
  ],
  "details.resumeLoaded": [
    "Поход восстановлен на сервере. Общий экран станет доступен на следующем этапе.",
    "Doğrulanmış sefer geri yüklendi. Ortak sefer görünümü sonraki aşamada kullanılacak."
  ],
  "details.backList": [
    "К экспедициям",
    "Seferlere dön"
  ],
  "details.backWorld": [
    "К миру",
    "Dünyaya dön"
  ],
  "room.battle": [
    "Бой",
    "Savaş"
  ],
  "room.elite": [
    "Элита",
    "Elit"
  ],
  "room.event": [
    "Событие",
    "Etkinlik"
  ],
  "room.shrine": [
    "Святилище",
    "Tapınak"
  ],
  "room.camp": [
    "Лагерь",
    "Kamp"
  ],
  "room.treasure": [
    "Сокровище",
    "Hazine"
  ],
  "room.merchant": [
    "Торговец",
    "Tüccar"
  ],
  "room.echo": [
    "Эхо",
    "Yankı"
  ],
  "room.risk": [
    "Риск",
    "Risk"
  ],
  "room.boss": [
    "Босс",
    "Patron"
  ],
  "fixture.rootbound": [
    "Спуститесь под Asterfall через живые корни и охраняемые подземные залы.",
    "Canlı kökler ve korunan mahzenler boyunca Asterfall'ın altına in."
  ],
  "fixture.lantern": [
    "Следуйте за старыми сторожевыми фонарями в запечатанные глубины Asterfall.",
    "Eski nöbet fenerlerini izleyerek Asterfall'ın mühürlü derinliklerine gir."
  ],
  "fixture.observatory": [
    "Исследуйте погребённую обсерваторию Sunscar, опалённую жаром и полную забытых приборов.",
    "Sıcaklığın şekillendirdiği, unutulmuş aletlerle dolu Sunscar gözlemevini keşfet."
  ],
  "fixture.mirage": [
    "Войдите в меняющийся колодец Sunscar, где видимому пути не всегда можно верить.",
    "Görünen rotanın güvenilmez olduğu değişken Sunscar kuyusuna gir."
  ],
  "fixture.shiverlake": [
    "Пройдите по замёрзшим залам под Frostmarch и приготовьтесь к лютому холоду.",
    "Frostmarch altındaki donmuş odaları geç ve sert soğuğa hazırlan."
  ],
  "fixture.choir": [
    "Идите по следу ледяного хора через гулкие пещеры Frostmarch.",
    "Frostmarch altındaki yankılı mağaralarda donmuş koroyu takip et."
  ],
  "fixture.blackglass": [
    "Проберитесь через тёмкие болота Ashlands среди хрупких стеклянных побегов.",
    "Ashlands'ın karanlık bataklığını ve kırılgan cam filizlerini aş."
  ],
  "fixture.crucible": [
    "Спуститесь в горнило Ashlands на границе начального пути развития.",
    "Başlangıç ilerlemesinin sınırındaki Ashlands potasına in."
  ]
} as const satisfies Record<CoopMessageKey,readonly [string,string]>;

export function coopEarlyCatalog(index:0|1):Record<CoopMessageKey,string>{
 return Object.fromEntries(Object.entries(coopEarlyRows).map(([key,row])=>[key,row[index]])) as Record<CoopMessageKey,string>;
}
