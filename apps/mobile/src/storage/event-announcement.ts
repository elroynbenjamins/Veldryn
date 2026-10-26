import AsyncStorage from '@react-native-async-storage/async-storage';
import {createEventAnnouncementStore} from '../core/event-announcement';

export const eventAnnouncementStore=createEventAnnouncementStore(AsyncStorage);
