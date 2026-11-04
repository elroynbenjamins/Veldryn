import type {CoopLoadoutMessageKey} from './coop-loadout';

/** Russian and Turkish server-verified co-op loadout and role-readiness messages. */
export const coopLoadoutEarlyRows={
  "title": [
    "Выбрать сборку",
    "Dizilim seç"
  ],
  "kicker": [
    "ЭКСПЕДИЦИЯ · СБОРКА",
    "SEFER · DİZİLİM"
  ],
  "intro": [
    "Выберите сохранённую сборку. Доступность, роль и фактические характеристики определяет сервер.",
    "Kayıtlı bir dizilim seç. Uygunluk, rol ve etkin istatistikler sunucudan gelir."
  ],
  "back": [
    "Назад к экспедиции",
    "Sefere dön"
  ],
  "ready": [
    "Готово",
    "Hazır"
  ],
  "ineligible": [
    "Не готово",
    "Hazır değil"
  ],
  "stale": [
    "Требуется обновление",
    "Güncelleme gerekli"
  ],
  "failed": [
    "Проверка не удалась",
    "Doğrulama başarısız"
  ],
  "pending": [
    "Проверка…",
    "Doğrulanıyor…"
  ],
  "level": [
    "Уровень",
    "Seviye"
  ],
  "effectiveLevel": [
    "Фактический уровень",
    "Etkin seviye"
  ],
  "before": [
    "Ваши",
    "Sahip olunan"
  ],
  "effective": [
    "Фактические",
    "Etkin"
  ],
  "stats": [
    "Характеристики, проверенные сервером",
    "Sunucu onaylı istatistikler"
  ],
  "hp": [
    "Здоровье",
    "Sağlık"
  ],
  "attack": [
    "Атака",
    "Saldırı"
  ],
  "healing": [
    "Исцеление",
    "İyileştirme"
  ],
  "defense": [
    "Защита",
    "Savunma"
  ],
  "skills": [
    "Навыки",
    "Beceriler"
  ],
  "equipment": [
    "Снаряжение",
    "Ekipman"
  ],
  "empty": [
    "Сохранённые сборки не найдены.",
    "Kayıtlı dizilim bulunamadı."
  ],
  "noSummary": [
    "Сводка недоступна",
    "Özet sağlanmadı"
  ],
  "liveCta": [
    "Найти группу",
    "Grup bul"
  ],
  "liveAuto": [
    "Live Auto",
    "Canlı Otomatik"
  ],
  "qmodeCta": [
    "Найти Эхо-союзников",
    "Yankı müttefikleri bul"
  ],
  "different_character": [
    "Выберите сборку текущего персонажа.",
    "Mevcut karaktere ait bir dizilim seç."
  ],
  "stale_revision": [
    "Сборка изменилась. Обновите снимок с сервера.",
    "Bu dizilim değişti. Sunucu kaydını yenile."
  ],
  "verification_pending": [
    "Проверка сервером ещё не завершена.",
    "Sunucu doğrulaması devam ediyor."
  ],
  "verification_failed": [
    "Сервер не смог проверить эту сборку.",
    "Sunucu bu dizilimi doğrulayamadı."
  ],
  "not_eligible": [
    "Эта сборка не подходит.",
    "Bu dizilim uygun değil."
  ],
  "missing_server_snapshot": [
    "Фактические характеристики недоступны.",
    "Etkin istatistikler kullanılamıyor."
  ],
  "below_role_readiness_floor": [
    "Подготовка роли ниже необходимого уровня.",
    "Rol hazırlığı gerekli eşiğin altında."
  ],
  "missing_tank_capability": [
    "Требуются навыки удержания угрозы и защиты.",
    "Tehdit kontrolü ve savunma yeteneği gerekli."
  ],
  "missing_support_capability": [
    "Требуется исцеление либо сочетание снижения урона и поддержки.",
    "İyileştirme ya da hasar azaltma ve destek yetenekleri gerekli."
  ],
  "missing_damage_capability": [
    "Требуется способность наносить урон.",
    "Hasar verme yeteneği gerekli."
  ],
  "character_below_min_level": [
    "Уровень персонажа ниже минимума экспедиции.",
    "Karakter seviyesi seferin asgari seviyesinin altında."
  ],
  "invalid_loadout_revision": [
    "Сохранённая сборка изменилась.",
    "Kayıtlı dizilim değişti."
  ],
  "intentOnly": [
    "Выбор проверен. Поиск группы будет подключён на следующем этапе.",
    "Seçim doğrulandı. Grup bulma sonraki aşamada bağlanacak."
  ],
  "refresh": [
    "Повторить проверку",
    "Doğrulamayı yenile"
  ]
} as const satisfies Record<CoopLoadoutMessageKey,readonly [string,string]>;

export function coopLoadoutEarlyCatalog(index:0|1):Record<CoopLoadoutMessageKey,string>{
 return Object.fromEntries(Object.entries(coopLoadoutEarlyRows).map(([key,row])=>[key,row[index]])) as Record<CoopLoadoutMessageKey,string>;
}
