import test from 'node:test';import assert from 'node:assert/strict';
import {findHelp} from '../src/lib/spoolyHelp.ts';
const guides=[{id:'save',module:'general',title:'Save a draft',keywords:'error save',steps:[]},{id:'invoice',module:'exports',title:'Add an export invoice',keywords:'invoice export add',steps:[]},{id:'bank',module:'exports',title:'Complete Receipts & banking',keywords:'receipt bank advice',steps:[]},{id:'company',module:'company',title:'Add a company',keywords:'company gst',steps:[]}];
test('help ranks the current workspace and tolerates common question spellings',()=>{
 assert.equal(findHelp(guides,'','Warehouse & dispatch')[0].id,'invoice');
 assert.equal(findHelp(guides,'how can i add inovice','')[0].id,'invoice');
 assert.equal(findHelp(guides,'recipt','')[0].id,'bank');
 assert.equal(findHelp(guides,'comany','')[0].id,'company');
});
test('help search cannot introduce topics absent from the authorized catalog',()=>{
 assert.deepEqual(findHelp(guides.slice(0,1),'invoice','exports'),[]);
 assert.deepEqual(findHelp(guides,'unrecognised query',''),[]);
 assert.deepEqual(findHelp([],'','exports'),[]);
 const original=structuredClone(guides);findHelp(guides,'bank','');assert.deepEqual(guides,original);
});
