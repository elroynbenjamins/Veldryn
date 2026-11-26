import {createContext} from 'react';
import type {GameState} from '../core/types';

// Keep the identity stable across gameplay ticks. The current state is read
// only when the owner opens a profile, not on every root render.
export const ActiveProfileCharacterContext=createContext<{
 id?:string;
 stateRef:Readonly<{current:GameState|null}>;
}|null>(null);
