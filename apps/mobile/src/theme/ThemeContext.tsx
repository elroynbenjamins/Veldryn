import {createContext,useContext,type PropsWithChildren} from 'react';
import {DEFAULT_UI_THEME,resolveTheme,type ThemeColors,type UiThemeId} from './theme';
const ThemeContext=createContext<ThemeColors>(resolveTheme(DEFAULT_UI_THEME));
export function GameThemeProvider({themeId,children}:{themeId?:UiThemeId;children:PropsWithChildren['children']}){return <ThemeContext.Provider value={resolveTheme(themeId)}>{children}</ThemeContext.Provider>;}
export function useGameTheme(){return useContext(ThemeContext);}
