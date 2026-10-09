import type {Row, User} from './types';

export type ExportField = {
 key: string;
 label: string;
 type?: 'text' | 'date' | 'money' | 'number' | 'currency' | 'textarea' | 'select';
 choices?: string[];
 hint?: string;
 required?: boolean;
 source?: string;
};
export type ExportTab = 'shipment' | 'receipts' | 'ebrc' | 'clearance' | 'documents' | 'history';
export type ExportWorkspaceProps = {user: User; dirty?: boolean};
export type ExportRecord = Row & {id:number;version:number;company_id:number|null;profile:Row;receipts:Row[];ebrcs:Row[]};
export const exportWorkflowStatuses = ['Draft','Submitted','Changes requested','Approved'] as const;
export function exportPartyKey(party:Row):string {
 return party.party_type==='manual'?'manual:'+String(party.party_name??party.name??'').trim().toLowerCase():`${party.party_type}:${party.party_id??party.id??''}`;
}
export function exportRegisterQuery(company:string,filters:Row={}):URLSearchParams {
 const query=new URLSearchParams({scope:company?'company':'standalone'});
 if(company)query.set('company_id',company);
 for(const key of ['fy','currency','search','status'])if(String(filters[key]||'').trim())query.set(key,String(filters[key]).trim());
 if(filters.party){
  query.set('party_type',filters.party.party_type);
  if(filters.party.party_type==='manual')query.set('party_name',String(filters.party.party_name??filters.party.name??'').trim());
  else query.set('party_id',String(filters.party.party_id??filters.party.id));
 }
 return query;
}
export function exportInvoiceBody(form:Row):Row {
 const standalone=!form.company_id;
 return {company_id:standalone?null:Number(form.company_id),party_type:standalone?'manual':form.party_type,
  party_id:standalone?null:Number(form.party_id),order_id:standalone||!form.order_id?null:Number(form.order_id),
  ...(standalone?{party_name:String(form.party_name||'').trim()}:{}),
  invoice_number:form.invoice_number,currency:form.currency,invoice_amount:form.invoice_amount,
  profile:form.profile,receipts:form.receipts,ebrcs:form.ebrcs,version:form.version};
}

export const exportTabs: {key:ExportTab;label:string}[] = [
 {key:'shipment',label:'Shipment & invoice'}, {key:'receipts',label:'Receipts & banking'},
 {key:'ebrc',label:'eBRC'}, {key:'clearance',label:'Scrip & clearance'},
 {key:'documents',label:'Documents'}, {key:'history',label:'Reviews & history'}
];
export const invoiceFields:ExportField[] = [
 {key:'export_reference',label:'Export reference',source:'B'},
 {key:'export_date',label:'Export date',type:'date',source:'C'},
 {key:'invoice_number',label:'Invoice number',required:true,source:'E'},
 {key:'currency',label:'Invoice currency',type:'currency',required:true,source:'F'},
 {key:'invoice_amount',label:'Invoice amount',type:'money',required:true,source:'G'},
 {key:'shipping_bill_number',label:'Shipping bill number',source:'H'},
 {key:'shipping_bill_date',label:'Shipping bill date',type:'date',source:'eBRC G'},
 {key:'eway_bill_number',label:'E-way bill number',source:'K'},
 {key:'shipping_mode',label:'Shipping mode',type:'select',choices:['Sea','Air','Courier','Hand-carried'],source:'L'},
 {key:'transport_document_number',label:'Bill of lading / AWB number',source:'M'},
 {key:'advance_license_number',label:'Advance licence number',source:'N'},
 {key:'port_code',label:'Port code',source:'AN'},
 {key:'shipment_status',label:'Shipment applicability',type:'select',choices:['Commercial shipment','Free-of-charge samples','Hand delivery','Not applicable','Other']},
 {key:'shipment_note',label:'Shipment notes',type:'textarea',hint:'Record FOC, HC, NIL or missing-document explanations here.'},
 {key:'payment_details',label:'Payment details / terms',type:'textarea',source:'23-24 M'},
 {key:'adjustment_note',label:'Debit note / adjustment explanation',type:'textarea',hint:'An explanation alone does not reduce outstanding. Use the shortfall approval request for an adjustment.'}
];
export const incentiveFields:ExportField[] = [
 {key:'drawback_claim_amount',label:'Duty drawback claim',type:'money',source:'I'},
 {key:'drawback_claim_currency',label:'Duty drawback currency',type:'currency'},
 {key:'rosctl_amount',label:'RoSCTL amount',type:'money',source:'J'},
 {key:'rosctl_currency',label:'RoSCTL currency',type:'currency'},
 {key:'incentive_status',label:'Incentive applicability',type:'select',choices:['Applicable','Not applicable','Free-of-charge','Pending confirmation']},
 {key:'incentive_note',label:'Incentive note',type:'textarea'}
];
export const receiptFields:ExportField[] = [
 {key:'reference',label:'Receipt reference'},
 {key:'receipt_date',label:'Receipt date',type:'date'},
 {key:'currency',label:'Receipt currency',type:'currency'},
 {key:'gross_payment_received',label:'Gross payment received',type:'money',source:'24-25 M'},
 {key:'payment_received',label:'Payment applied to invoice',type:'money',source:'P',hint:'The amount to include in settlement, as stated on the payment advice.'},
 {key:'invoice_currency_amount',label:'Payment equivalent in invoice currency',type:'money',hint:'Required when the receipt currency differs from the invoice currency.'},
 {key:'receipt_bank',label:'Bank',source:'Q'},
 {key:'receipt_advice',label:'Receipt advice reference',source:'R'},
 {key:'foreign_bank_charges',label:'Foreign bank charges',type:'money',source:'S'},
 {key:'foreign_bank_charges_currency',label:'Foreign bank charge currency',type:'currency'},
 {key:'foreign_bank_charges_invoice_amount',label:'Foreign charges in invoice currency',type:'money',hint:'Enter the confirmed equivalent when the charge currency differs.'},
 {key:'bank_charges',label:'Bank charges',type:'money',source:'T'},
 {key:'bank_charges_currency',label:'Bank charge currency',type:'currency'},
 {key:'bank_charges_invoice_amount',label:'Bank charges in invoice currency',type:'money',hint:'Enter the confirmed equivalent when the charge currency differs.'},
 {key:'net_payment_received',label:'Net amount credited',type:'money',source:'24-25 O; 25-26 O',hint:'Enter the bank advice figure. Charges are recorded separately.'},
 {key:'receipt_tally_reference',label:'Receipt Tally reference',source:'U'},
 {key:'receipt_note',label:'Receipt / charge note',type:'textarea'}
];
export const conversionFields:ExportField[] = [
 {key:'converted_amount',label:'Converted amount',type:'money',source:'W'},
 {key:'converted_currency',label:'Converted amount currency',type:'currency'},
 {key:'exchange_rate',label:'Exchange rate',type:'number',source:'X'},
 {key:'exchange_rate_note',label:'Exchange rate basis',hint:'State the direction, for example invoice currency into settlement currency.'},
 {key:'conversion_amount',label:'Convert amount',type:'money',source:'Y'},
 {key:'conversion_currency',label:'Convert amount currency',type:'currency'},
 {key:'credit_bank_017',label:'Credit bank 017',source:'Z'},
 {key:'credit_bank_017_amount',label:'Credit bank 017 amount',type:'money'},
 {key:'credit_bank_017_currency',label:'Credit bank 017 currency',type:'currency'},
 {key:'packing_credit',label:'PC / packing credit',source:'AA'},
 {key:'packing_credit_amount',label:'Packing credit amount',type:'money'},
 {key:'packing_credit_currency',label:'Packing credit currency',type:'currency'},
 {key:'bank_advice_reference',label:'Bank advice reference',source:'AB'},
 {key:'bank_advice_date',label:'Bank advice date',type:'date',source:'AC'},
 {key:'receiving_bank',label:'Receiving bank / account',source:'AD; 24-25 Q'},
 {key:'linked_bank',label:'Linked bank',source:'AO'},
 {key:'conversion_note',label:'Conversion / allocation note',type:'textarea',hint:'Manual values from the bank advice; no assumed exchange-rate or allocation formula.'}
];
export const ebrcFields:ExportField[] = [
 {key:'export_reference',label:'eBRC export reference',source:'eBRC C'},
 {key:'ebrc_amount',label:'eBRC amount',type:'money',source:'eBRC E'},
 {key:'currency',label:'eBRC currency',type:'currency'},
 {key:'shipping_bill_number',label:'Shipping bill number',source:'eBRC F'},
 {key:'shipping_bill_date',label:'Shipping bill date',type:'date',source:'eBRC G'},
 {key:'ebrc_file_number',label:'File number',source:'eBRC H'},
 {key:'ebrc_number',label:'eBRC number',source:'AE; eBRC I',hint:'Leave blank while pending or not required; record the status below.'},
 {key:'ebrc_balance_amount',label:'eBRC balance amount',type:'money',source:'eBRC J'},
 {key:'status',label:'eBRC status',type:'select',choices:['Pending','Received','Print pending','Not required']},
 {key:'ebrc_note',label:'eBRC note',type:'textarea',hint:'Keep pending-print or not-required explanations separate from amounts.'}
];
export const scripFields:ExportField[] = [
 {key:'scrip_reference',label:'Scrip reference',source:'AF'},
 {key:'scrip_sale_percentage',label:'Scrip sale percentage',type:'number',source:'AG'},
 {key:'scrip_sale_amount',label:'Scrip sale amount',type:'money',source:'AH'},
 {key:'scrip_sale_currency',label:'Scrip sale currency',type:'currency'},
 {key:'scrip_bank_credit',label:'Scrip bank credit',source:'AI'},
 {key:'scrip_bank_credit_amount',label:'Scrip bank credit amount',type:'money'},
 {key:'scrip_bank_credit_currency',label:'Scrip bank credit currency',type:'currency'},
 {key:'scrip_tally_reference',label:'Scrip Tally reference',source:'AJ'},
 {key:'scrip_note',label:'Scrip / sale note',type:'textarea',hint:'Enter the agreed percentage and amount separately; record the percentage basis here.'}
];
export const clearanceFields:ExportField[] = [
 {key:'customs_house_agent',label:'Customs house agent (CHA)',source:'AK'},
 {key:'freight_forwarder',label:'Freight forwarder',source:'AL'},
 {key:'clearing_invoice',label:'Clearing invoice reference',source:'AM'},
 {key:'clearance_note',label:'Clearance note',type:'textarea'}
];
export const exportDocumentKinds = [
 'Invoice','Packing list','Shipping bill','Delivery challan','E-way bill','Bill of lading / AWB',
 'Advance licence','Payment details','eBRC','Bank advice','Clearing invoice'
];
export function moneyMinor(value:unknown):bigint {
 const match=String(value??'').match(/^(-?)(\d+)(?:\.(\d{1,2}))?$/);
 if(!match)return 0n;
 return (match[1]? -1n:1n)*(BigInt(match[2])*100n+BigInt((match[3]||'').padEnd(2,'0')));
}
export function minorDecimal(value:bigint):string {
 const absolute=value<0n?-value:value;
 return `${value<0n?'-':''}${absolute/100n}.${String(absolute%100n).padStart(2,'0')}`;
}
export function moneyText(value:unknown,currency=''):string {
 if(value===null||value===undefined||value==='')return '—';
 const match=String(value).match(/^(-?)(\d+)(?:\.(\d{1,2}))?$/);
 if(!match)return '—';
 return `${match[1]}${BigInt(match[2]).toLocaleString('en-IN')}.${(match[3]||'').padEnd(2,'0')}${currency?' '+currency:''}`;
}
export const exportDate=(value:unknown)=>value?new Date(String(value).slice(0,10)+'T12:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—';
export const exportReference=(id:number)=>'EX-'+String(id).padStart(6,'0');


export type InvoiceFile = {file:File;key:string;kind:string;status:'queued'|'uploading'|'uploaded'|'failed'|'uncertain';path?:string;error?:string;id?:number};
export type InvoiceSaveAttempt = {path:string;body:Row;content:string};
export type InvoiceSaveState = {savedContent:string;pendingSave:InvoiceSaveAttempt|null;files:InvoiceFile[]};
type Mutation = (path:string,body:Row)=>Promise<Row>;
type Upload = (path:string,file:File)=>Promise<Row>;

export function invoiceCompanyChoices(choices:Row[],current=''):string[]{
 const names:string[]=[];const seen=new Set<string>();
 for(const choice of choices){const name=String(choice.name||'').trim(),key=name.replace(/\s+/g,' ').toLowerCase();if(name&&!seen.has(key)){seen.add(key);names.push(name)}}
 if(current&&!names.includes(current))names.push(current);
 return names;
}
export function invoiceFileKey(file:File):string{return [file.name,file.size,file.lastModified,file.type].join(':')}
export function hasRequiredInvoiceDocument(saved:Row[],queued:InvoiceFile[]):boolean{return saved.some(file=>file.kind==='invoice')||queued.some(file=>file.kind==='invoice')}
export function exportFileCanPreview(file:Row):boolean{return ['application/pdf','image/png','image/jpeg'].includes(String(file.mime||'').toLowerCase())}
export function invoiceFileError(file:File):string{
 if(!file.size)return 'Choose a document that is not empty.';
 if(file.size>10*1024*1024)return 'Each document must be 10 MB or smaller.';
 if(!/\.(pdf|png|jpe?g|docx|xlsx)$/i.test(file.name))return 'Choose a PDF, PNG, JPG, Word (.docx) or Excel (.xlsx) document.';
 return '';
}
export function invoiceContent(form:Row):string{const {version,...content}=exportInvoiceBody(form);return JSON.stringify(content)}
export function uncertainInvoiceWrite(error:unknown):boolean{
 const value=error as {status?:number;code?:string};
 return !value?.status||value.status>=500||value.code==='action_already_submitted';
}

// Keep an interrupted attempt's exact body / upload URL. The API's in-memory
// idempotency key is tied to them, so retrying cannot repeat a completed write.
// The server may ask for manual review instead of returning a cached receipt.
export async function saveInvoiceFiles(form:Row,state:InvoiceSaveState,mutate:Mutation,upload:Upload):Promise<void>{
 const commit=async(attempt:InvoiceSaveAttempt)=>{
  try{const saved=await mutate(attempt.path,attempt.body);form.id=saved.id;form.version=saved.version;state.savedContent=attempt.content;state.pendingSave=null}
  catch(error){if(!uncertainInvoiceWrite(error))state.pendingSave=null;throw error}
 };
 const attach=async(entry:InvoiceFile)=>{
  entry.path??=`/exports/${form.id}/files?version=${form.version}&kind=${encodeURIComponent(entry.kind)}`;
  entry.status='uploading';entry.error='';
  try{const saved=await upload(entry.path,entry.file);entry.id=saved.id;entry.status='uploaded';form.version=saved.version}
  catch(error){entry.status=uncertainInvoiceWrite(error)?'uncertain':'failed';entry.error=(error as Error).message;if(entry.status==='failed')entry.path=undefined;throw error}
 };
 if(state.pendingSave)await commit(state.pendingSave);
 // Resolve an earlier uncertain upload before a new save changes its version.
 for(const entry of state.files)if(entry.path&&entry.status!=='uploaded')await attach(entry);
 const content=invoiceContent(form);
 if(!form.id||content!==state.savedContent){
  const attempt={path:'/exports'+(form.id?'/'+form.id:''),body:JSON.parse(JSON.stringify(exportInvoiceBody(form))),content};
  state.pendingSave=attempt;await commit(attempt);
 }
 for(const entry of state.files)if(entry.status!=='uploaded')await attach(entry);
}
