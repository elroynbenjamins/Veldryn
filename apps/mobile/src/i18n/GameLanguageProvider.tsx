import {createContext,useContext,type PropsWithChildren} from 'react';
import {isSupportedLanguage,type Language} from './languages';

const GameLanguageContext=createContext<Language>('en');

export function GameLanguageProvider({language,children}:PropsWithChildren<{language:Language}>){
 return <GameLanguageContext.Provider value={isSupportedLanguage(language)?language:'en'}>{children}</GameLanguageContext.Provider>;
}

export function useGameLanguage():Language{return useContext(GameLanguageContext);}
