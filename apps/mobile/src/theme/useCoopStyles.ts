import {useMemo} from 'react';
import {useGameTheme} from './ThemeContext';
import {coopTheme,type CoopColors} from './coop-ui-theme';

export function useCoopStyles<T>(factory:(colors:CoopColors)=>T){
  const theme=useGameTheme();
  const colors=useMemo(()=>coopTheme(theme),[theme]);
  const styles=useMemo(()=>factory(colors),[factory,colors]);
  return {colors,styles};
}
