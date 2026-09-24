import AsyncStorage from '@react-native-async-storage/async-storage';
import {createTutorialPreferenceStore} from '../core/tutorial-preferences';
const store=createTutorialPreferenceStore(AsyncStorage);
export const loadFirstSessionTutorialCompleted=store.load;
export const completeFirstSessionTutorialStep=store.complete;
