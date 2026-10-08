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
export type ExportRecord = Row & {id:number;version:number;company_id:number;profile:Row;receipts:Row[];ebrcs:Row[]};

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
