import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameRepository } from '../core/repository';
import { GameState } from '../core/types';
import { migrateSave } from '../core/save-migrations';

const KEY='veldryn.local.save.v1';

export class AsyncStorageGameRepository implements GameRepository {
  async load():Promise<GameState|null>{
    const raw=await AsyncStorage.getItem(KEY);
    return raw ? migrateSave(JSON.parse(raw)) : null;
  }
  async save(state:GameState){ await AsyncStorage.setItem(KEY,JSON.stringify(state)); }
  async reset(){ await AsyncStorage.removeItem(KEY); }
}
