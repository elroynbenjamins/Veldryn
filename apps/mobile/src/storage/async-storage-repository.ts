import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameRepository } from '../core/repository';
import { GameState } from '../core/types';
import { migrateSave } from '../core/save-migrations';
import {isSupportedLanguage,Language} from '../i18n';

const KEY='veldryn.local.save.v1';
const LANGUAGE_KEY='veldryn.local.language.v1';

export class AsyncStorageGameRepository implements GameRepository {
  async load():Promise<GameState|null>{
    const raw=await AsyncStorage.getItem(KEY);
    return raw ? migrateSave(JSON.parse(raw)) : null;
  }
  async loadLanguage():Promise<Language>{
    const language=await AsyncStorage.getItem(LANGUAGE_KEY);
    return isSupportedLanguage(language)?language:'en';
  }
  async save(state:GameState){ await AsyncStorage.multiSet([[KEY,JSON.stringify(state)],[LANGUAGE_KEY,state.settings.language]]); }
  async reset(){ await AsyncStorage.multiRemove([KEY,LANGUAGE_KEY]); }
}
