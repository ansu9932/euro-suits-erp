import {test} from 'node:test';
import assert from 'node:assert/strict';
import {exportPartyKey,exportRegisterQuery,exportInvoiceBody,moneyMinor,minorDecimal,exportWorkflowStatuses,invoiceCompanyChoices,invoiceFileKey,invoiceFileError,invoiceContent,saveInvoiceFiles} from '../src/lib/exportDocumentation.ts';

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

test('invoice company choices deduplicate stored names and preserve a current legacy name',()=>{
 assert.deepEqual(invoiceCompanyChoices([{id:1,name:'  P & C RETAIL UK LTD '},{id:2,name:'p & c   retail uk ltd'},{name:'Other Company'}],'Legacy Buyer'),['P & C RETAIL UK LTD','Other Company','Legacy Buyer']);
 assert.deepEqual(invoiceCompanyChoices([{name:'Saved buyer'}],'Saved buyer'),['Saved buyer']);
});
test('invoice document queue rejects empty, oversized and unsupported documents',()=>{
 const valid=new File(['%PDF-1.4'],'invoice.PDF',{lastModified:12,type:'application/pdf'});
 assert.equal(invoiceFileError(valid),'');
 assert.equal(invoiceFileKey(valid),invoiceFileKey(new File(['%PDF-1.4'],'invoice.PDF',{lastModified:12,type:'application/pdf'})));
 assert.match(invoiceFileError(new File([],'empty.pdf')),/not empty/);
 assert.match(invoiceFileError(new File([new Uint8Array(10*1024*1024+1)],'large.pdf')),/10 MB/);
 assert.match(invoiceFileError(new File(['x'],'script.html')),/Choose a PDF/);
});
const draft=()=>({company_id:null,party_type:'manual',party_name:'Customer',invoice_number:'INV-1',currency:'USD',invoice_amount:'100.00',profile:{},receipts:[],ebrcs:[]});
const queued=(name)=>({file:new File(['%PDF-1.4'],name,{lastModified:1}),key:name,status:'queued'});
test('a partial upload retry keeps one invoice and skips successfully attached files',async()=>{
 const form=draft(),state={savedContent:'',pendingSave:null,files:[queued('a.pdf'),queued('b.pdf')]};
 let saves=0,failed=false;const uploads=[];
 const mutate=async()=>{saves++;return {id:9,version:1}};
 const upload=async(path,file)=>{uploads.push([path,file.name]);if(file.name==='b.pdf'&&!failed){failed=true;throw Object.assign(new Error('Busy'),{status:429})}return {id:file.name==='a.pdf'?11:12,version:file.name==='a.pdf'?2:3}};
 await assert.rejects(saveInvoiceFiles(form,state,mutate,upload),/Busy/);
 assert.equal(form.id,9);assert.equal(form.version,2);assert.equal(state.files[0].status,'uploaded');assert.equal(state.files[1].status,'failed');
 await saveInvoiceFiles(form,state,mutate,upload);
 assert.equal(saves,1);assert.equal(form.version,3);
 assert.deepEqual(uploads.map(x=>x[1]),['a.pdf','b.pdf','b.pdf']);
 assert.equal(uploads[1][0],uploads[2][0]);
});
test('changed fields after a partial upload save against the acknowledged version',async()=>{
 const form=draft(),state={savedContent:'',pendingSave:null,files:[queued('a.pdf'),queued('b.pdf')]},saved=[];let failed=false;
 const mutate=async(path,body)=>{saved.push({path,body});return {id:9,version:body.version?body.version+1:1}};
 const upload=async(path,file)=>{if(file.name==='b.pdf'&&!failed){failed=true;throw Object.assign(new Error('Busy'),{status:429})}return {id:4,version:Number(new URL('https://example.test'+path).searchParams.get('version'))+1}};
 await assert.rejects(saveInvoiceFiles(form,state,mutate,upload));form.invoice_amount='200.00';
 await saveInvoiceFiles(form,state,mutate,upload);
 assert.equal(saved.length,2);assert.equal(saved[1].path,'/exports/9');assert.equal(saved[1].body.version,2);assert.equal(saved[1].body.invoice_amount,'200.00');assert.equal(form.version,4);
});
test('unconfirmed creates retain their exact request even if the form is later edited',async()=>{
 const form=draft(),state={savedContent:'',pendingSave:null,files:[]},requests=[];
 const mutate=async(path,body)=>{requests.push({path,body});throw Object.assign(new Error('Unconfirmed'),requests.length===1?{}:{status:409,code:'action_already_submitted'})};
 await assert.rejects(saveInvoiceFiles(form,state,mutate,async()=>({})));form.invoice_amount='200.00';
 await assert.rejects(saveInvoiceFiles(form,state,mutate,async()=>({})));
 assert.equal(requests.length,2);assert.deepEqual(requests[0],requests[1]);assert.equal(requests[1].body.invoice_amount,'100.00');assert.ok(state.pendingSave);assert.equal(form.id,undefined);
});
test('confirmed validation failures allow correction instead of replaying invalid input',async()=>{
 const form=draft(),state={savedContent:'',pendingSave:null,files:[]};let calls=0;
 const mutate=async(path,body)=>{calls++;if(calls===1)throw Object.assign(new Error('Validation'),{status:400});assert.equal(body.invoice_amount,'200.00');return {id:9,version:1}};
 await assert.rejects(saveInvoiceFiles(form,state,mutate,async()=>({})));assert.equal(state.pendingSave,null);
 form.invoice_amount='200.00';await saveInvoiceFiles(form,state,mutate,async()=>({}));assert.equal(form.id,9);
});
test('unconfirmed file attempts keep their URL and File object and block later writes',async()=>{
 const form={...draft(),id:9,version:5},state={savedContent:'',pendingSave:null,files:[queued('a.pdf')]},uploads=[];state.savedContent=invoiceContent(form);let saves=0;
 const upload=async(path,file)=>{uploads.push({path,file});throw Object.assign(new Error('Unconfirmed'),uploads.length===1?{}:{status:409,code:'action_already_submitted'})};
 const mutate=async()=>{saves++;return {}};
 await assert.rejects(saveInvoiceFiles(form,state,mutate,upload));form.invoice_amount='200.00';
 await assert.rejects(saveInvoiceFiles(form,state,mutate,upload));
 assert.equal(saves,0);assert.equal(uploads[0].path,uploads[1].path);assert.equal(uploads[0].file,uploads[1].file);assert.equal(state.files[0].status,'uncertain');assert.equal(form.version,5);
});
