import type {InventoryFilter,InventorySort} from './inventory-view';
export interface InventoryScreenState{location:'inventory'|'bank';query:string;filter:InventoryFilter;sort:InventorySort;scrollY:number;foodRequest:number;pouchOpen?:boolean}
export function newInventoryScreenState():InventoryScreenState{return {location:'inventory',query:'',filter:'all',sort:'new',scrollY:0,foodRequest:0,pouchOpen:false};}
export function openInventoryFood(view:InventoryScreenState,request:number):InventoryScreenState{return {...view,location:'inventory',query:'',filter:'food',scrollY:0,foodRequest:request,pouchOpen:false};}
