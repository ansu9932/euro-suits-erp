import {test} from 'node:test';
import assert from 'node:assert/strict';
import {exportPartyKey,exportRegisterQuery,exportInvoiceBody,moneyMinor,minorDecimal,exportWorkflowStatuses} from '../src/lib/exportDocumentation.ts';

test('unassigned register omits company ID instead of sending an invalid zero',()=>{
 assert.equal(exportRegisterQuery('').toString(),'scope=standalone');
 assert.equal(exportRegisterQuery('42').toString(),'scope=company&company_id=42');
});
test('manual party filters normalize identity without losing the displayed customer name',()=>{
 assert.equal(exportPartyKey({party_type:'manual',party_name:'  Coast & Co  '}),exportPartyKey({party_type:'manual',name:'coast & co'}));
 assert.equal(exportPartyKey({party_type:'buyer',party_id:42,id:99}),'buyer:42');
 const query=exportRegisterQuery('',{party:{party_type:'manual',name:' Coast & Co '},status:'Submitted',search:'A&B'});
 assert.equal(query.get('party_name'),'Coast & Co');
 assert.equal(query.get('party_id'),null);
 assert.equal(query.get('status'),'Submitted');
 assert.equal(query.get('search'),'A&B');
});
test('standalone payload never includes stale linked company, buyer or PO identifiers',()=>{
 const profile={shipping_bill_number:'SB-12'},receipts=[{payment_received:'990.00',bank_charges:'10.00'}];
 const body=exportInvoiceBody({company_id:null,party_type:'buyer',party_id:44,order_id:55,party_name:' Customer A ',invoice_number:'INV-1',currency:'USD',invoice_amount:'1000.00',profile,receipts,ebrcs:[],version:3});
 assert.equal(body.company_id,null);assert.equal(body.party_id,null);assert.equal(body.order_id,null);
 assert.equal(body.party_type,'manual');assert.equal(body.party_name,'Customer A');
 assert.equal(body.profile,profile);assert.equal(body.receipts,receipts);assert.equal(body.version,3);
});
test('linked invoice payload keeps existing identity and money strings',()=>{
 const body=exportInvoiceBody({company_id:'5',party_type:'buyer',party_id:'8',order_id:'12',party_name:'ignored',invoice_amount:'123456789.90',profile:{},receipts:[],ebrcs:[]});
 assert.equal(body.company_id,5);assert.equal(body.party_id,8);assert.equal(body.order_id,12);
 assert.equal(body.invoice_amount,'123456789.90');assert.equal('party_name' in body,false);
});
test('approval states remain separate from exact settlement arithmetic',()=>{
 assert.deepEqual(exportWorkflowStatuses,['Draft','Submitted','Changes requested','Approved']);
 assert.equal(minorDecimal(moneyMinor('1000.00')-moneyMinor('990.00')-moneyMinor('10.00')),'0.00');
 assert.equal(minorDecimal(moneyMinor('0.30')-moneyMinor('0.10')),'0.20');
});
