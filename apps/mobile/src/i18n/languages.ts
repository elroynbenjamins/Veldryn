export const SUPPORTED_LANGUAGES=['en','de','es','nl','it','fr'] as const;

export type Language=typeof SUPPORTED_LANGUAGES[number];

export const LANGUAGE_NAMES:Record<Language,string>={
  en:'English',
  de:'Deutsch',
  es:'Español',
  nl:'Nederlands',
  it:'Italiano',
  fr:'Français',
};

export function isSupportedLanguage(value:unknown):value is Language{
  return typeof value==='string'&&(SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}
