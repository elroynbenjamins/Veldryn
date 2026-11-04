import type {Language} from './languages';

// Starter-only RU/TR copy; missing phrases deliberately fall back to English.
const EARLY_LOCALE_ROWS={
  "Home": [
    "Главная",
    "Ana Sayfa"
  ],
  "World": [
    "Мир",
    "Dünya"
  ],
  "Character": [
    "Персонаж",
    "Karakter"
  ],
  "Skills": [
    "Навыки",
    "Beceriler"
  ],
  "Inventory": [
    "Инвентарь",
    "Envanter"
  ],
  "Account": [
    "Аккаунт",
    "Hesap"
  ],
  "More": [
    "Ещё",
    "Diğer"
  ],
  "Settings": [
    "Настройки",
    "Ayarlar"
  ],
  "Language": [
    "Язык",
    "Dil"
  ],
  "Guild": [
    "Гильдия",
    "Lonca"
  ],
  "Party": [
    "Группа",
    "Grup"
  ],
  "Dungeon": [
    "Подземелье",
    "Zindan"
  ],
  "Quests": [
    "Задания",
    "Görevler"
  ],
  "Events": [
    "События",
    "Etkinlikler"
  ],
  "Friends": [
    "Друзья",
    "Arkadaşlar"
  ],
  "Profile": [
    "Профиль",
    "Profil"
  ],
  "Companions": [
    "Спутники",
    "Yoldaşlar"
  ],
  "Combat": [
    "Бой",
    "Savaş"
  ],
  "Arena": [
    "Арена",
    "Arena"
  ],
  "Rankings": [
    "Рейтинг",
    "Sıralamalar"
  ],
  "Collections": [
    "Коллекции",
    "Koleksiyonlar"
  ],
  "Characters": [
    "Персонажи",
    "Karakterler"
  ],
  "Achievements": [
    "Достижения",
    "Başarılar"
  ],
  "Recruitment": [
    "Набор",
    "Oyuncu Arama"
  ],
  "Bank": [
    "Банк",
    "Banka"
  ],
  "Crafting": [
    "Ремесло",
    "Üretim"
  ],
  "Gathering": [
    "Сбор ресурсов",
    "Toplama"
  ],
  "Alchemy": [
    "Алхимия",
    "Simya"
  ],
  "Forge": [
    "Кузница",
    "Demirhane"
  ],
  "Shop": [
    "Магазин",
    "Mağaza"
  ],
  "Store": [
    "Магазин",
    "Mağaza"
  ],
  "Gold": [
    "Золото",
    "Altın"
  ],
  "GOLD": [
    "ЗОЛОТО",
    "ALTIN"
  ],
  "Back": [
    "Назад",
    "Geri"
  ],
  "Continue": [
    "Продолжить",
    "Devam et"
  ],
  "Next": [
    "Далее",
    "İleri"
  ],
  "Previous": [
    "Назад",
    "Önceki"
  ],
  "Cancel": [
    "Отмена",
    "İptal"
  ],
  "Close": [
    "Закрыть",
    "Kapat"
  ],
  "Close dialog": [
    "Закрыть окно",
    "Pencereyi kapat"
  ],
  "Confirm": [
    "Подтвердить",
    "Onayla"
  ],
  "Done": [
    "Готово",
    "Bitti"
  ],
  "Save": [
    "Сохранить",
    "Kaydet"
  ],
  "Edit": [
    "Изменить",
    "Düzenle"
  ],
  "Delete": [
    "Удалить",
    "Sil"
  ],
  "Retry": [
    "Повторить",
    "Yeniden dene"
  ],
  "Search": [
    "Поиск",
    "Ara"
  ],
  "Clear search": [
    "Очистить поиск",
    "Aramayı temizle"
  ],
  "Loading…": [
    "Загрузка…",
    "Yükleniyor…"
  ],
  "Loading": [
    "Загрузка",
    "Yükleniyor"
  ],
  "Ready": [
    "Готово",
    "Hazır"
  ],
  "Available": [
    "Доступно",
    "Kullanılabilir"
  ],
  "Locked": [
    "Заблокировано",
    "Kilitli"
  ],
  "Claim": [
    "Получить",
    "Al"
  ],
  "Claim all": [
    "Получить всё",
    "Tümünü al"
  ],
  "Reward claimed.": [
    "Награда получена.",
    "Ödül alındı."
  ],
  "Rewards": [
    "Награды",
    "Ödüller"
  ],
  "Send": [
    "Отправить",
    "Gönder"
  ],
  "Refresh": [
    "Обновить",
    "Yenile"
  ],
  "Online": [
    "В сети",
    "Çevrimiçi"
  ],
  "Start": [
    "Начать",
    "Başlat"
  ],
  "Stop": [
    "Остановить",
    "Durdur"
  ],
  "Equip": [
    "Надеть",
    "Kuşan"
  ],
  "Unequip": [
    "Снять",
    "Çıkar"
  ],
  "Compare": [
    "Сравнить",
    "Karşılaştır"
  ],
  "Open": [
    "Открыть",
    "Aç"
  ],
  "Details": [
    "Подробнее",
    "Ayrıntılar"
  ],
  "Active": [
    "Активно",
    "Etkin"
  ],
  "Inactive": [
    "Неактивно",
    "Etkin değil"
  ],
  "Damage": [
    "Урон",
    "Hasar"
  ],
  "Defense": [
    "Защита",
    "Savunma"
  ],
  "Healing": [
    "Исцеление",
    "İyileştirme"
  ],
  "Tank": [
    "Танк",
    "Tank"
  ],
  "Support": [
    "Поддержка",
    "Destek"
  ],
  "Victory": [
    "Победа",
    "Zafer"
  ],
  "Not ready": [
    "Не готово",
    "Hazır değil"
  ],
  "LIVE ENCOUNTER": [
    "БОЙ В РЕАЛЬНОМ ВРЕМЕНИ",
    "CANLI KARŞILAŞMA"
  ],
  "damage": [
    "урон",
    "hasar"
  ],
  "Choose your calling": [
    "Выберите класс",
    "Sınıfını seç"
  ],
  "Choose your character name.": [
    "Выберите имя персонажа.",
    "Karakterinin adını seç."
  ],
  "Your adventure begins here.": [
    "Ваше приключение начинается здесь.",
    "Maceran burada başlıyor."
  ],
  "CREATE YOUR FIRST CHARACTER": [
    "СОЗДАЙТЕ ПЕРВОГО ПЕРСОНАЖА",
    "İLK KARAKTERİNİ OLUŞTUR"
  ],
  "CREATE A CHARACTER": [
    "СОЗДАТЬ ПЕРСОНАЖА",
    "KARAKTER OLUŞTUR"
  ],
  "CHARACTER NAME": [
    "ИМЯ ПЕРСОНАЖА",
    "KARAKTER ADI"
  ],
  "NAME IDEAS": [
    "ВАРИАНТЫ ИМЕНИ",
    "İSİM ÖNERİLERİ"
  ],
  "Character identity": [
    "Данные персонажа",
    "Karakter kimliği"
  ],
  "Choose a name. Your class emblem is your first profile icon.": [
    "Выберите имя. Эмблема класса станет первым значком профиля.",
    "Bir isim seç. Sınıf amblemin ilk profil simgen olacak."
  ],
  "Who enters Asterfall?": [
    "Кто вступит в Астерфолл?",
    "Asterfall'a kim adım atıyor?"
  ],
  "CLASS": [
    "КЛАСС",
    "SINIF"
  ],
  "IDENTITY": [
    "ПЕРСОНАЖ",
    "KİMLİK"
  ],
  "REVIEW": [
    "ПРОВЕРКА",
    "KONTROL"
  ],
  "Choose identity": [
    "Выбрать персонажа",
    "Kimlik seç"
  ],
  "Review character": [
    "Проверить персонажа",
    "Karakteri gözden geçir"
  ],
  "Ready to begin?": [
    "Готовы начать?",
    "Başlamaya hazır mısın?"
  ],
  "Create character": [
    "Создать персонажа",
    "Karakter oluştur"
  ],
  "Character creation": [
    "Создание персонажа",
    "Karakter oluşturma"
  ],
  "Name your adventurer": [
    "Назовите героя",
    "Maceracına ad ver"
  ],
  "Enter character name": [
    "Введите имя персонажа",
    "Karakter adını gir"
  ],
  "Valid name": [
    "Допустимое имя",
    "Geçerli ad"
  ],
  "AVAILABLE CLASSES": [
    "ДОСТУПНЫЕ КЛАССЫ",
    "MEVCUT SINIFLAR"
  ],
  "Your class cannot be changed after creating this character.": [
    "После создания персонажа изменить класс нельзя.",
    "Bu karakter oluşturulduktan sonra sınıfı değiştirilemez."
  ],
  "You can change this anytime in Settings.": [
    "Это можно изменить в настройках в любое время.",
    "Bunu istediğin zaman Ayarlar'dan değiştirebilirsin."
  ],
  "Account roster": [
    "Персонажи аккаунта",
    "Hesap karakterleri"
  ],
  "Account skills": [
    "Навыки аккаунта",
    "Hesap becerileri"
  ],
  "active": [
    "активен",
    "etkin"
  ],
  "Switch": [
    "Переключить",
    "Değiştir"
  ],
  "Notifications": [
    "Уведомления",
    "Bildirimler"
  ],
  "Account & profile": [
    "Аккаунт и профиль",
    "Hesap ve profil"
  ],
  "Gameplay": [
    "Игровой процесс",
    "Oynanış"
  ],
  "Display & accessibility": [
    "Экран и доступность",
    "Görünüm ve erişilebilirlik"
  ],
  "Session controls": [
    "Управление сеансом",
    "Oturum kontrolleri"
  ],
  "Privacy & data": [
    "Конфиденциальность и данные",
    "Gizlilik ve veriler"
  ],
  "Core navigation and setup are translated. Untranslated gameplay text falls back to English.": [
    "Основные разделы и настройка переведены. Остальной текст пока отображается на английском.",
    "Ana menü ve kurulum çevrildi. Henüz çevrilmemiş oyun metinleri İngilizce gösterilir."
  ],
  "Tune your local prototype experience. Changes save automatically.": [
    "Настройте игру. Изменения сохраняются автоматически.",
    "Oyunu özelleştir. Değişiklikler otomatik kaydedilir."
  ],
  "Craft complete": [
    "Предмет создан",
    "Üretim tamamlandı"
  ],
  "Cannot craft": [
    "Не удалось создать предмет",
    "Üretilemiyor"
  ],
  "Skills & Crafting": [
    "Навыки и ремесло",
    "Beceriler ve üretim"
  ],
  "World chat": [
    "Мировой чат",
    "Dünya sohbeti"
  ],
  "Guild chat": [
    "Чат гильдии",
    "Lonca sohbeti"
  ],
  "Open World chat": [
    "Открыть мировой чат",
    "Dünya sohbetini aç"
  ],
  "Close chat": [
    "Закрыть чат",
    "Sohbeti kapat"
  ],
  "Message this world…": [
    "Написать в мировой чат…",
    "Bu dünyaya mesaj yaz…"
  ],
  "No messages yet.": [
    "Сообщений пока нет.",
    "Henüz mesaj yok."
  ],
  "SAVE RECOVERY": [
    "ВОССТАНОВЛЕНИЕ СОХРАНЕНИЯ",
    "KAYIT KURTARMA"
  ],
  "Retry loading": [
    "Повторить загрузку",
    "Yüklemeyi yeniden dene"
  ],
  "Start fresh…": [
    "Начать заново…",
    "Baştan başla…"
  ],
  "Overflow Chest": [
    "Сундук переполнения",
    "Taşan eşya sandığı"
  ],
  "Move {count} items to Bank": [
    "Переместить {count} предметов в банк",
    "{count} eşyayı bankaya taşı"
  ],
  "{count} notifications": [
    "Уведомления: {count}",
    "{count} bildirim"
  ],
  "{amount} gold": [
    "Золото: {amount}",
    "{amount} altın"
  ],
  "{current} of {max} health": [
    "Здоровье: {current} из {max}",
    "{max} candan {current}"
  ],
  "UPDATE REQUIRED": [
    "ТРЕБУЕТСЯ ОБНОВЛЕНИЕ",
    "GÜNCELLEME GEREKLİ"
  ],
  "Update VELDRYN": [
    "Обновить VELDRYN",
    "VELDRYN'i güncelle"
  ]
} satisfies Record<string,readonly [string,string]>;

export function earlyLocaleText(language:Language,source:string):string|undefined{
  if(language!=='ru'&&language!=='tr')return undefined;
  const row=Object.prototype.hasOwnProperty.call(EARLY_LOCALE_ROWS,source)
    ? EARLY_LOCALE_ROWS[source as keyof typeof EARLY_LOCALE_ROWS]:undefined;
  return row?.[language==='ru'?0:1];
}
