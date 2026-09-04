
import {buyXCheapest,legalListingPrice} from '../src/core/market';

const listings=[
 {listingId:'L3',itemId:'ASTER_IRON_INGOT',sellerId:'S3',quantity:50,unitPrice:105,createdAt:3},
 {listingId:'L1',itemId:'ASTER_IRON_INGOT',sellerId:'S1',quantity:100,unitPrice:90,createdAt:1},
 {listingId:'L2',itemId:'ASTER_IRON_INGOT',sellerId:'S2',quantity:80,unitPrice:95,createdAt:2},
 {listingId:'L4',itemId:'ASTER_IRON_INGOT',sellerId:'S4',quantity:100,unitPrice:120,createdAt:4},
];
const r=buyXCheapest(listings,'ASTER_IRON_INGOT',200,110);
if(r.filledQuantity!==200) throw new Error('expected full 200 fill');
if(r.totalCost!==18700) throw new Error(`unexpected total ${r.totalCost}`);
if(r.listingsUsed!==3) throw new Error('expected 3 listings');
if(Math.round(r.averageUnitPrice*10)/10!==93.5) throw new Error('bad average');
if(r.highestUnitPrice!==105) throw new Error('bad highest unit');
if(!legalListingPrice(100,{referencePrice:100,minPrice:40,maxPrice:250})) throw new Error('legal rejected');
if(legalListingPrice(300,{referencePrice:100,minPrice:40,maxPrice:250})) throw new Error('illegal accepted');
console.log(JSON.stringify({status:'PASS',buyX:r},null,2));
