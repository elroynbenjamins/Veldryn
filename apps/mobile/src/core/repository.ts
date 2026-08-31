import { GameState } from './types';
export interface GameRepository { load():Promise<GameState|null>; save(state:GameState):Promise<void>; reset():Promise<void>; }
export class MemoryGameRepository implements GameRepository {
  private state:GameState|null=null;
  async load(){ return this.state ? JSON.parse(JSON.stringify(this.state)) : null; }
  async save(state:GameState){ this.state=JSON.parse(JSON.stringify(state)); }
  async reset(){ this.state=null; }
}
