import {createContext,useContext,useMemo,type PropsWithChildren} from 'react';
import {DEFAULT_THEME_ID,resolveTheme,type AppTheme,type ThemeId} from './theme';

const ThemeContext=createContext<AppTheme>(resolveTheme(DEFAULT_THEME_ID));

export function ThemeProvider({themeId,children}:PropsWithChildren<{themeId?:ThemeId}>){
  const theme=useMemo(()=>resolveTheme(themeId),[themeId]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(){return useContext(ThemeContext);}
