import type {SocialMessageKey} from './social';

/** Player-facing Russian/Turkish Social, Guild and Dungeon copy. Unknown keys retain English fallback. */
export const socialEarlyRows={
  "ROUTE": ["МАРШРУТ","ROTA"],
  "Back to Dungeons": ["Назад к подземельям","Zindanlara dön"],
  "Echo sharing unlocks at character level 10.": ["Публикация Эха открывается на 10-м уровне персонажа.","Yankı paylaşımı 10. karakter seviyesinde açılır."],
  "Echo sharing requires 2,500 Combat Power.": ["Для публикации Эха нужно 2 500 боевой мощи.","Yankı paylaşımı için 2.500 Savaş Gücü gerekir."],
  "{points} shared points left": ["Осталось {points} общих очков","{points} ortak puan kaldı"],
  "No failed-run reward receipt yet. Weekly consolation rewards may be exhausted; refresh to check.": ["Пока нет записи о награде за неудачный поход. Еженедельные утешительные награды могли закончиться — обновите данные.","Başarısız sefer ödül kaydı henüz yok. Haftalık teselli ödülleri bitmiş olabilir; yenileyip kontrol et."],
  "Choose a boon": ["Выберите благословение","Bir lütuf seç"],
  "Select one reward before entering the next room.": ["Выберите одну награду перед переходом в следующую комнату.","Sonraki odaya geçmeden önce bir ödül seç."],
  "Choose your boon above to continue.": ["Для продолжения выберите благословение выше.","Devam etmek için yukarıdan bir lütuf seç."],
  "Continue dungeon": ["Продолжить подземелье","Zindana devam et"],
  "Opening exchange": ["Начало боя","Çatışma başlangıcı"],
  "Your week": [
    "Ваша неделя",
    "Bu hafta"
  ],
  "Boss room": [
    "Комната босса",
    "Boss odası"
  ],
  "Party ready check": [
    "Проверка готовности группы",
    "Grup hazır kontrolü"
  ],
  "Vote ends in {seconds}s": [
    "Голосование завершится через {seconds} с",
    "Oylama {seconds} sn sonra bitiyor"
  ],
  "Enhanced: {charges} charges · {weekly} weekly rewards left": [
    "Усиленные заряды: {charges} · Недельных наград осталось: {weekly}",
    "Güçlendirilmiş: {charges} hak · Bu hafta {weekly} ödül kaldı"
  ],
  "Your vote is saved. Waiting for your party…": [
    "Ваш голос сохранён. Ожидаем группу…",
    "Verdiğin oy kaydedildi. Grubun bekleniyor…"
  ],
  "A verified Live-ready loadout is required.": [
    "Нужен подтверждённый набор снаряжения для живого похода.",
    "Doğrulanmış Canlı sefere hazır dizilim gerekli."
  ],
  "Update Echo from current gear": [
    "Обновить Эхо с текущим снаряжением",
    "Yankıyı mevcut ekipmanla güncelle"
  ],
  "Room cleared": [
    "Комната пройдена",
    "Oda tamamlandı"
  ],
  "Preferred language": [
    "Предпочитаемый язык",
    "Tercih edilen dil"
  ],
  "My Posts": [
    "Мои объявления",
    "İlanlarım"
  ],
  "{count} results": [
    "Результатов: {count}",
    "{count} sonuç"
  ],
  "{count} compatible recruitment adverts": [
    "Подходящих объявлений: {count}",
    "{count} uygun ilan"
  ],
  "{count} open slots": [
    "Свободно мест: {count}",
    "{count} boş yer"
  ],
  "PRIVATE PARTY INVITATIONS": [
    "ЛИЧНЫЕ ПРИГЛАШЕНИЯ В ГРУППУ",
    "ÖZEL GRUP DAVETLERİ"
  ],
  "{current} OF {goal}": [
    "{current} ИЗ {goal}",
    "{current}/{goal}"
  ],
  "Earn 1 Rally Mark at {count} points today.": [
    "Получите 1 знак сбора за {count} очков сегодня.",
    "Bugün {count} puanda 1 Ralli İşareti kazan."
  ],
  "Your combat setup": [
    "Ваша боевая подготовка",
    "Savaş hazırlığın"
  ],
  "Current selection": [
    "Текущий выбор",
    "Mevcut seçim"
  ],
  "Companion": [
    "Спутник",
    "Yoldaş"
  ],
  "Healing potion": [
    "Лечебное зелье",
    "İyileştirme iksiri"
  ],
  "Enhancement tonics": [
    "Усиливающие настойки",
    "Güçlendirme tonikleri"
  ],
  "None equipped": [
    "Ничего не экипировано",
    "Hiçbiri kuşanılmadı"
  ],
  "Equipped": [
    "Экипировано",
    "Kuşanıldı"
  ],
  "None selected": [
    "Ничего не выбрано",
    "Seçilmedi"
  ],
  "Select in HP menu": [
    "Выбрать в меню здоровья",
    "Sağlık menüsünden seç"
  ],
  "No potion is spent while queueing": [
    "Зелья не расходуются во время ожидания",
    "Sırada beklerken iksir harcanmaz"
  ],
  "Healing uses carried potions; food is disabled in dungeons.": [
    "Лечение использует взятые с собой зелья. Еда в подземельях недоступна.",
    "İyileştirme taşınan iksirleri kullanır; zindanlarda yemek devre dışıdır."
  ],
  "Choose your healing potion in the HP menu before queuing.": [
    "Перед поиском группы выберите лечебное зелье в меню здоровья.",
    "Sıraya girmeden önce sağlık menüsünden iyileştirme iksirini seç."
  ],
  "Companion assist": [
    "Помощь спутника",
    "Yoldaş yardımı"
  ],
  "Dungeons": [
    "Подземелья",
    "Zindanlar"
  ],
  "Quick Match": [
    "Быстрый подбор",
    "Hızlı Eşleşme"
  ],
  "Find Party": [
    "Найти группу",
    "Grup bul"
  ],
  "LIVE QUICK MATCH": [
    "БЫСТРЫЙ ПОДБОР LIVE",
    "CANLI HIZLI EŞLEŞME"
  ],
  "Any eligible dungeon": [
    "Любое доступное подземелье",
    "Uygun herhangi bir zindan"
  ],
  "FASTEST POOL": [
    "САМЫЙ БЫСТРЫЙ ПОДБОР",
    "EN HIZLI EŞLEŞME"
  ],
  "LIVE GROUP BOARD": [
    "ДОСКА ГРУПП LIVE",
    "CANLI GRUP PANOSU"
  ],
  "30-minute LFG posts": [
    "Объявления на 30 минут",
    "30 dakikalık grup ilanları"
  ],
  "Refresh": [
    "Обновить",
    "Yenile"
  ],
  "Replace my post": [
    "Заменить объявление",
    "İlanımı değiştir"
  ],
  "Post LFG": [
    "Создать объявление",
    "Grup ilanı yayımla"
  ],
  "DUNGEON": [
    "ПОДЗЕМЕЛЬЕ",
    "ZİNDAN"
  ],
  "OPTIONAL NOTE": [
    "НЕОБЯЗАТЕЛЬНАЯ ЗАМЕТКА",
    "İSTEĞE BAĞLI NOT"
  ],
  "Co-op LFG note": [
    "Заметка для поиска группы",
    "Ortak sefer ilan notu"
  ],
  "Starting now, chill run, learning boss…": [
    "Начинаем сейчас, спокойный поход, учимся боссу…",
    "Hemen başlıyoruz, rahat sefer, patronu öğreniyoruz…"
  ],
  "Remove": [
    "Удалить",
    "Kaldır"
  ],
  "Join this search": [
    "Присоединиться к поиску",
    "Bu aramaya katıl"
  ],
  "No other Live LFG posts right now. Quick Match is still available.": [
    "Сейчас нет других объявлений Live. Быстрый подбор доступен.",
    "Şu an başka Canlı ilan yok. Hızlı Eşleşme kullanılabilir."
  ],
  "Guild": [
    "Гильдия",
    "Lonca"
  ],
  "Guild Hall": [
    "Зал гильдии",
    "Lonca Salonu"
  ],
  "Guild Quests": [
    "Задания гильдии",
    "Lonca Görevleri"
  ],
  "Claim": [
    "Забрать",
    "Al"
  ],
  "Progress": [
    "Прогресс",
    "İlerleme"
  ],
  "Members": [
    "Участники",
    "Üyeler"
  ],
  "Available": [
    "Доступно",
    "Kullanılabilir"
  ],
  "Locked": [
    "Закрыто",
    "Kilitli"
  ],
  "Ready": [
    "Готово",
    "Hazır"
  ],
  "COMBAT INSPECT": [
    "ОСМОТР БОЯ",
    "SAVAŞ İNCELEMESİ"
  ],
  "HP": [
    "ЗД",
    "CAN"
  ],
  "BARRIER": [
    "БАРЬЕР",
    "BARİYER"
  ],
  "PHASE": [
    "ФАЗА",
    "AŞAMA"
  ],
  "COMPANION": [
    "СПУТНИК",
    "YOLDAŞ"
  ],
  "ACTIVE EFFECTS": [
    "АКТИВНЫЕ ЭФФЕКТЫ",
    "ETKİN ETKİLER"
  ],
  "ACTIVE CAST": [
    "ПРИМЕНЕНИЕ УМЕНИЯ",
    "AKTİF BÜYÜ"
  ],
  "INTERRUPTIBLE CAST": [
    "ПРЕРЫВАЕМОЕ УМЕНИЕ",
    "KESİLEBİLİR BÜYÜ"
  ],
  "Vote on a route": [
    "Голосуйте за маршрут",
    "Rotaya oy ver"
  ],
  "Choose a room": [
    "Выберите комнату",
    "Oda seç"
  ],
  "Battle in progress": [
    "Бой идёт",
    "Savaş sürüyor"
  ],
  "Encounter cleared": [
    "Противник побеждён",
    "Karşılaşma tamamlandı"
  ],
  "Party defeated": [
    "Группа побеждена",
    "Grup yenildi"
  ],
  "Battle complete": [
    "Бой завершён",
    "Savaş tamamlandı"
  ],
  "EXPEDITION CLEARED": [
    "ЭКСПЕДИЦИЯ ПРОЙДЕНА",
    "SEFER TAMAMLANDI"
  ],
  "EXPEDITION ENDED": [
    "ЭКСПЕДИЦИЯ ЗАВЕРШЕНА",
    "SEFER SONA ERDİ"
  ],
  "Victory secured!": [
    "Победа!",
    "Zafer kazanıldı!"
  ],
  "Run complete": [
    "Поход завершён",
    "Sefer tamamlandı"
  ],
  "Uses your verified role and sends you to the eligible dungeon where your role helps matchmaking most. The matched party still uses Auto Tier.": [
    "Подбор направит вас в подходящее подземелье, где ваша подтверждённая роль нужнее всего. Уровень группы выбирается автоматически.",
    "Doğrulanmış rolün en çok ihtiyaç duyulan uygun zindana yönlendirilir. Grup otomatik kademe kullanır."
  ],
  "Short-lived dungeon adverts only. Posts disappear after 30 minutes and never create a second Party system.": [
    "Только временные объявления о подземельях. Они исчезают через 30 минут и не создают вторую систему групп.",
    "Yalnızca kısa süreli zindan ilanları. 30 dakika sonra kaybolur; ikinci bir grup sistemi oluşturmaz."
  ],
  "{count} LIVE": [
    "{count} В СЕТИ",
    "{count} CANLI"
  ],
  "{count}/140 · expires 30 minutes after posting": [
    "{count}/140 · исчезнет через 30 минут после публикации",
    "{count}/140 · yayımlandıktan 30 dakika sonra sona erer"
  ],
  "Your post · {name} · {time}": [
    "Ваше объявление · {name} · {time}",
    "İlanın · {name} · {time}"
  ],
  "Auto Tier ≤ {tier}": [
    "Автоуровень ≤ {tier}",
    "Otomatik kademe ≤ {tier}"
  ],
  "Combat details for {name}": [
    "Сведения о бое: {name}",
    "{name} savaş ayrıntıları"
  ],
  "Focus → {name}": [
    "Цель → {name}",
    "Hedef → {name}"
  ],
  "+{count} more active effects": [
    "Ещё активных эффектов: {count}",
    "+{count} ek etkin etki"
  ],
  "Effect Gem": [
    "Камень эффекта",
    "Etki Taşı"
  ],
  "Damage over time": [
    "Периодический урон",
    "Zamanla hasar"
  ],
  "Healing over time": [
    "Периодическое лечение",
    "Zamanla iyileştirme"
  ],
  "Debuff": [
    "Ослабление",
    "Zayıflatma"
  ],
  "Buff": [
    "Усиление",
    "Güçlendirme"
  ],
  "Final Boss": [
    "Финальный босс",
    "Son patron"
  ],
  "Dungeon Enemy": [
    "Противник подземелья",
    "Zindan düşmanı"
  ],
  "Your expedition rewards are secured. Return when you are ready.": [
    "Награды за экспедицию сохранены. Возвращайтесь, когда будете готовы.",
    "Sefer ödüllerin güvence altında. Hazır olduğunda geri dön."
  ],
  "Final encounter cleared. Collect the expedition reward below.": [
    "Последний бой пройден. Заберите награду за экспедицию ниже.",
    "Son karşılaşma tamamlandı. Sefer ödülünü aşağıdan al."
  ],
  "Final encounter cleared. Your reward entitlement is being prepared.": [
    "Последний бой пройден. Награда готовится к выдаче.",
    "Son karşılaşma tamamlandı. Ödülün hazırlanıyor."
  ],
  "This expedition has ended. Review any available rewards before returning.": [
    "Экспедиция завершена. Перед возвращением проверьте доступные награды.",
    "Sefer sona erdi. Dönmeden önce alınabilecek ödülleri kontrol et."
  ],
  "Room in progress": ["Комната проходится","Oda devam ediyor"],
  "Resolving the selected room": ["Выбранная комната завершается","Seçilen oda tamamlanıyor"],
  "Saving room progress": ["Сохранение прогресса комнаты","Oda ilerlemesi kaydediliyor"],
  "Sealed boon": ["Запечатанное благословение","Mühürlü lütuf"],
  "Run artifact": ["Артефакт похода","Sefer eseri"],
  "Restorative salve": ["Целебная мазь","İyileştirici merhem"],
  "Bought {item}": ["Куплено: {item}","{item} satın alındı"],
  "Restored {amount} HP": ["Восстановлено {amount} ОЗ","{amount} Can yenilendi"],
  "Revived {count}": ["Возрождено: {count}","{count} kişi canlandırıldı"],
  "{count} boon gained": ["Получено благословений: {count}","{count} lütuf kazanıldı"],
  "{count} artifact gained": ["Получено артефактов: {count}","{count} eser kazanıldı"],
  "{count} curse gained": ["Получено проклятий: {count}","{count} lanet edinildi"],
  "{amount} resources": ["Ресурсы: {amount}","{amount} kaynak"],
  "Grants a dungeon boon": ["Даёт благословение подземелья","Zindan lütfu verir"],
  "Grants a dungeon artifact": ["Даёт артефакт подземелья","Zindan eseri verir"],
  "Restores 35% HP": ["Восстанавливает 35% ОЗ","%35 Can yeniler"],
  "Merchant offers": ["Товары торговца","Tüccar teklifleri"],
  "Random passive effect for your party. Identity revealed on pickup.": ["Случайный пассивный эффект для группы. Он откроется после получения.","Grubun için rastgele pasif etki. Alındığında ortaya çıkar."],
  "Persistent run item. Effect triggers in combat.": ["Предмет на весь поход. Эффект срабатывает в бою.","Sefer boyunca kalan eşya. Etkisi savaşta tetiklenir."],
  "Instantly heals the chosen ally. No mystery here.": ["Мгновенно исцеляет выбранного союзника. Без сюрпризов.","Seçilen müttefiki anında iyileştirir. Sürpriz yok."],
  "Spend at Expedition Shop": ["Потратить в магазине экспедиций","Sefer Mağazasında harca"],
  "Dungeon resources": ["Ресурсы подземелья","Zindan kaynakları"],
  "Purchased": ["Куплено","Satın alındı"],
  "Buy": ["Купить","Satın al"],
  "DUNGEON COMBAT": ["БОЙ В ПОДЗЕМЕЛЬЕ","ZİNDAN SAVAŞI"],
  "View battle": ["Посмотреть бой","Savaşı izle"],
  "Vote for the next path": ["Голосовать за следующий путь","Sonraki rotaya oy ver"],
  "Choose the next room": ["Выбрать следующую комнату","Sonraki odayı seç"],
  "The route with the most votes will be selected.": ["Будет выбран путь с наибольшим числом голосов.","En çok oy alan rota seçilir."],
  "Party & formation": ["Группа и построение","Grup ve diziliş"],
  "NPC": ["НПС","NPC"],
  "Frozen Echo companion": ["Спутник сохранённого Эха","Kaydedilmiş Yankı yoldaşı"],
  "Party companion": ["Спутник группы","Grup yoldaşı"],
  "Echo companions use the published snapshot.": ["Спутники Эха используют сохранённый снимок.","Yankı yoldaşları paylaşılan kaydı kullanır."],
  "LIVE LINK": ["ЖИВОЕ СОЕДИНЕНИЕ","CANLI BAĞLANTI"],
  "SAFETY AI": ["ЗАЩИТНЫЙ ИИ","KORUMA YZ"],
  "ALL CONNECTED": ["ВСЕ НА СВЯЗИ","HERKES BAĞLI"],
  "Objectives & mechanics": ["Цели и механики","Hedefler ve mekanikler"],
  "Party Chat": ["Чат группы","Grup sohbeti"],
  "View rewards": ["Посмотреть награды","Ödülleri gör"],
  "Preparing expedition rewards. You can retry if they have not appeared yet.": ["Подготавливаются награды за экспедицию. Если они пока не появились, попробуйте снова.","Sefer ödülleri hazırlanıyor. Henüz görünmüyorsa tekrar deneyebilirsin."],
  "Expedition Marks": ["Знаки экспедиции","Sefer Nişanları"],
  "Live Fellowship bonus: +{marks} Marks": ["Бонус боевого товарищества: +{marks} знаков","Canlı Yoldaşlık bonusu: +{marks} Nişan"],
  "Consolation reward · No enhanced charge spent.": ["Утешительная награда · Усиленный заряд не потрачен.","Teselli ödülü · Güçlendirilmiş hak harcanmadı."],
  "CLAIMED": ["ПОЛУЧЕНО","ALINDI"],
  "READY": ["ГОТОВО","HAZIR"],
  "Claim rewards": ["Забрать награды","Ödülleri al"],
  "Seasonal reward collected.": ["Сезонная награда получена.","Sezon ödülü alındı."],
  "Rematch with this party": ["Повторить бой с этой группой","Bu grupla tekrar oyna"],
  "Refresh rewards": ["Обновить награды","Ödülleri yenile"],
  "Return to dungeon list": ["К списку подземелий","Zindan listesine dön"],
  "FINAL BOSS": ["ФИНАЛЬНЫЙ БОСС","SON BOSS"],
  "BOSS OUTLOOK": ["ОБЗОР БОССА","BOSS ÖZETİ"],
  "phase": ["фаза","aşama"],
  "phases": ["фазы","aşamalar"],
  "INTERRUPT": ["ПРЕРВАТЬ","KES"],
  "WATCH": ["СЛЕДИТЬ","İZLE"],
  "Hide boss details": ["Скрыть сведения о боссе","Boss ayrıntılarını gizle"],
  "Boss details": ["Сведения о боссе","Boss ayrıntıları"],
  "PHASES": ["ФАЗЫ","AŞAMALAR"],
  "Objective-sensitive": ["Зависит от цели","Hedefe duyarlı"],
  "ABILITIES": ["СПОСОБНОСТИ","YETENEKLER"],
  "cast": ["применение","hazırlık"],
  "cooldown": ["перезарядка","bekleme"],
  "SUPPRESSED": ["ПОДАВЛЕНО","ENGELLENDİ"],
  "Hide boss recap": ["Скрыть итог боя с боссом","Boss özetini gizle"],
  "Boss recap": ["Итоги боя с боссом","Boss özeti"],
  "BOSS RECAP": ["ИТОГИ БОЯ С БОССОМ","BOSS ÖZETİ"],
  "down": ["нокаут","düşüş"],
  "downs": ["нокаутов","düşüş"],
  "Phases triggered": ["Активированные фазы","Tetiklenen aşamalar"],
  "No threshold phases triggered.": ["Ни одна фаза по порогу здоровья не сработала.","Can eşiğine bağlı aşama tetiklenmedi."],
  "Boss casts seen": ["Применённые умения босса","Görülen boss büyüleri"],
  "No boss casts started before the fight ended.": ["До конца боя босс не начал применять умения.","Savaş bitmeden boss yeteneği başlamadı."],
} as const satisfies Partial<Record<SocialMessageKey,readonly [string,string]>>;

export function socialEarlyText(language:'ru'|'tr',key:string):string|undefined{
 const row=Object.prototype.hasOwnProperty.call(socialEarlyRows,key)
  ? socialEarlyRows[key as keyof typeof socialEarlyRows]:undefined;
 return row?.[language==='ru'?0:1];
}
