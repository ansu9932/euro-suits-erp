/** Local-only factory forms. PDF values come solely from the scoped saved detail.
 * Plain text nodes prevent HTML execution. Missing data stays blank; actual
 * milestones and signed QA decisions are never inferred from plans or drafts.
 */
import {indentReference} from './sampleProcess';

export type SampleFormKind = 'indent' | 'audit';
const text = (v:unknown):string => v === null || v === undefined ? '' : typeof v === 'object' ? '' : String(v);
export function formDate(v:unknown):string {
 const value=text(v);if(!value)return '';
 if(/^\d{4}-\d{2}-\d{2}$/.test(value)){const [y,m,d]=value.split('-');return `${d}/${m}/${y}`}
 const d=new Date(value);return Number.isNaN(d.getTime())?'':d.toLocaleDateString('en-GB',{timeZone:'Asia/Kolkata'});
}
export function sampleFormDocument(kind:SampleFormKind,detail:any,piece:any,material:(id:any)=>string,logo=''):any {
 if(!piece?.id || !detail?.pieces?.some((p:any)=>p.id===piece.id))throw Error('Choose a registered sample indent.');
 const r=detail.record,p=r.profile||{},s=piece.production||{},reports=s.audit_reports||[],qa=reports.at(-1)||{},navy='#1F3864',border='#9ca3af';
 const name=kind==='indent'?'Sample Indent Form':'Sample Audit Form';
 const indent=indentReference(piece);
 const ref=(id:any)=>id?material(id)||'':'';
 const value=(v:any)=>({text:text(v),fontSize:8,lineHeight:1.1,margin:[0,3,0,1]});
 const field=(label:string,v:any='',span=1,bold=false)=>({stack:[{text:label.toUpperCase(),bold:true,fontSize:6.8,color:'#374151'},{...value(v),bold}],colSpan:span,margin:[4,3,4,3]});
 const layout={hLineWidth:()=>.5,vLineWidth:()=>.5,hLineColor:()=>border,vLineColor:()=>border,paddingLeft:()=>0,paddingRight:()=>0,paddingTop:()=>0,paddingBottom:()=>0};
 const table=(rows:any[],columns:number,headerRows=0)=>({table:{widths:Array(columns).fill('*'),headerRows,dontBreakRows:false,body:rows},layout,margin:[0,0,0,7]});
 const grid=(items:[string,any][],columns:number)=>{const rows:any[]=[];for(let i=0;i<items.length;i+=columns){const row=items.slice(i,i+columns).map(([l,v])=>field(l,v));while(row.length<columns)row.push(field(''));rows.push(row)}return table(rows,columns)};
 const band=(label:string,cols:number)=>[{text:label.toUpperCase(),bold:true,fontSize:7,color:'#374151',fillColor:'#f3f4f6',alignment:'center',colSpan:cols,margin:[4,4,4,4]},...Array.from({length:cols-1},()=>({}))];
 const bom=(group?:string)=>(r.bom||[]).filter((b:any)=>!group||b.group===group).map((b:any)=>[b.component,b.reference,[text(b.quantity),b.unit].filter(Boolean).join(' '),b.colour,b.size,b.remarks].filter(v=>v!==null&&v!==undefined&&v!=='').join(' · ')).join('\n');
 const issues=(detail.issues||[]).filter((i:any)=>i.indent_id===piece.id);
 const dc=issues.map((i:any)=>'SDC-'+String(i.id).padStart(7,'0')).join(', ');
 const content:any[]=[{table:{widths:[118,'*'],body:[[{stack:logo?[{image:logo,fit:[102,45]}]:[{text:'EURO SUITS',color:'#fff',bold:true}],border:[false,false,false,false],margin:[8,5,0,5]},{stack:[{text:name.toUpperCase(),fontSize:16,bold:true,color:'#fff',alignment:'right'},{text:indent,fontSize:9,color:'#e4e9f2',alignment:'right',margin:[0,4,0,0]}],border:[false,false,false,false],margin:[0,9,10,6]}]]},layout:{fillColor:()=>navy,hLineWidth:()=>0,vLineWidth:()=>0},margin:[0,0,0,7]},
 {text:[{text:'Indent '+indent,bold:true},'  ·  Request SR-'+r.id+(p.legacy_indent_number?'  ·  Original Excel indent '+p.legacy_indent_number:'')],fontSize:8,color:'#283d50',margin:[0,0,0,7]}];
 if(kind==='indent'){
 content.push(grid([
 ['Date',formDate(p.request_date)],['Sample Type',p.sample_type],['Smpl Req Dt',formDate(p.buyer_required_date)],
 ['Buyer',r.buyer_name||r.buyer],['Brand',p.brand],['Merchant',r.merchant||r.created_by_name],
 ['Style Ref',p.buyer_style],['Euro Style',p.est],['Product',p.product||p.description],
 ['Fab Req',ref(p.material_id)],['Col Req',piece.colour],['Length Mtr',p.length_metres],
 ['Alt Fab',ref(p.alternate_material_id)],['Alt Ref',p.alternate_reference],['DC No',dc],['Fab Into Dt',formDate(p.fabric_in_date)]
 ],3));
 content.push(table([band('Sizes, colours and registered indent',6),['Col','Size','Indent No','Col','Size','Indent No'].map(l=>({...field(l),fillColor:'#f3f4f6'})),[value(piece.colour),value(piece.size),value(indent),value(''),value(''),value('')],...Array.from({length:2},()=>Array.from({length:6},()=>({text:' ',margin:[4,3]}))),[field('MTR/DC NO',issues.map((i:any)=>[i.metres===null||i.metres===undefined?'':Math.abs(Number(i.metres))+' m',i.code,'SDC-'+String(i.id).padStart(7,'0')].filter(Boolean).join(' · ')).join('\n'),6),{},{},{},{},{}]],6,2));
 content.push(grid([['Sample 2 Copy',[p.copy_sample_id,p.copy_purpose].filter(Boolean).join(' · ')],['CAD Ref',p.cad_reference],['Spec Ref / Dt / Signed',[p.spec_reference,formDate(p.spec_date),p.spec_signed].filter(Boolean).join(' · ')],['Spl Remarks',p.special_remarks]],4));
 content.push(table([[field('Special remark',p.email_message,1,true)]],1));
 content.push(table([band('BOM & Process Checklist',2),[field('BOM Details',bom()),field('Finishing Remarks',p.finishing_remarks)],[field('Pocketing',bom('Pocketing')),field('Value Additions',bom('Value additions'))],[field('Fusing',bom('Fusing')),field('Embroidery',p.embroidery)],[field('Sewing Trims',bom('Sewing trims')),field('Washing',p.washing)]],2));
 content.push(table([band('Tracking & Handover',3),[field('Pattern By',s.pattern_by),field('Cut By',s.cut_by),field('Smpl Maker',s.sample_maker)],[field('Pattern Ready Dt',formDate(s.pattern_actual)),field('Allocated Dt',formDate(s.allocation_actual)),field('Sew Ho Date',formDate(s.sewing_actual))]],3));
 content.push(table([band('Enclosed',4),[field('Pattern - Cut',text(s.enclosures).includes('pattern')?s.enclosures:''),field('Counter Smpl',text(s.enclosures).toLowerCase().includes('counter')?s.enclosures:''),field('Hand Over Date',formDate(s.merchant_actual)),field('Hand Over DC',s.handover_dc)]],4));
 if(s.enclosures)content.push({text:'Enclosures: '+text(s.enclosures),fontSize:8,margin:[0,0,0,6]});
 }else{
 content.push(grid([
 ['Sample Date',formDate(p.request_date)],['Product',p.product||p.description],['Fabric Ref',ref(p.material_id)],['Spec Ref',p.spec_reference],
 ['BLO',p.booking_reference],['Buy Sty Ref',p.buyer_style],['Smpl Mak ID',s.sample_maker],['Sample Type',p.sample_type],
 ['Block',p.fit],['Euro Sty Ref',p.est],['Smpl QA',qa.auditor],['Order No',p.order_id],
 ['PO No',p.buyer_po],['Smpl Audit',qa.signed_at?formDate(qa.signed_at)+' · Revision '+text(qa.revision):''],['Description',p.description],['Colour',piece.colour]
 ],4));
 const measurements=qa.measurements||[],head=(v:string,span=1)=>({text:v,fontSize:7,bold:true,fillColor:'#f3f4f6',alignment:'center',colSpan:span,margin:[3,4]});
 const rows:any[]=[[{...head('Measurement Name'),rowSpan:2},head('Size 1: '+text(piece.size),2),{},head('Size 2:',2),{},head('Size 3:',2),{}],[{},...Array.from({length:3},()=>[head('Req Spec'),head('Smpl Spec')]).flat()]];
 for(let i=0;i<Math.max(10,measurements.length);i++){const m=measurements[i]||{};rows.push([value((m.point?text(m.point)+(m.unit?' ('+text(m.unit)+')':''):'')+(m.tolerance!==undefined&&m.tolerance!==''?' ± '+text(m.tolerance):'')+(m.remarks?' · '+text(m.remarks):'')),value(m.required),value(m.actual),value(''),value(''),value(''),value('')])}
 content.push({...table(rows,7,2),table:{widths:[150,'*','*','*','*','*','*'],headerRows:2,dontBreakRows:false,body:rows}});
 content.push(table([band('Remark 1',5),[field('Actual Fab',qa.fabric_used),field('Actual Trims',qa.trims_used),field('Actual Styl',qa.style_used,3),{},{}],band('Remark 2 · Submission',5),[field('1st Sub',qa.submission_attempt==='1'?qa.remarks:''),field('2nd Sub',qa.submission_attempt==='2'?qa.remarks:''),field('3rd Sub',qa.submission_attempt==='3'?qa.remarks:''),field('4th Sub',qa.submission_attempt==='4'?qa.remarks:'',2),{}],[field('Special Remarks',qa.special_remarks,5),{},{},{},{}]],5));
 const files=(detail.files||[]).filter((f:any)=>!f.indent_id||f.indent_id===piece.id);
 const check=(yes:boolean)=>yes?'[x]':'[ ]';
 content.push(table([band('Attachments',3),[field('Smpl Fab Swatch',check(files.some((f:any)=>f.category==='Fabric swatch'))),field('Smpl Tr Cd',check(files.some((f:any)=>f.category==='Trim card'))),field('Attached',files.map((f:any)=>f.name).join('\n'))],band('Despatch',3),[field('Date of Hover',formDate(s.merchant_actual)),field('Date of Desp',formDate(s.handover_actual)),field('AWB No',s.awb)]],3));
 content.push(table([[field('QA Signature',qa.auditor?text(qa.auditor)+'\nElectronically signed in ERP\n'+text(qa.signed_at):''),field('Approved 2 Snd',qa.result==='Approved'?'[x]':''),field('Re Work / Rejected',qa.result==='Rework'?'[x] Re Work':qa.result==='Rejected'?'[x] Rejected':''),field('Merchant Sign','')], [{text:'Contact: qam@eurosuitsmfg.com  |  bdm@eurosuitsmfg.com',fontSize:7,color:'#374151',alignment:'center',fillColor:'#f3f4f6',colSpan:4,margin:[4,5]}, {},{},{}]],4));
 }
 if(p.historical_registered==='true')content.push({text:'Historical registration · unavailable source fields intentionally blank.',fontSize:7,color:'#526170',margin:[0,4,0,0]});
 return {pageSize:'A4',pageMargins:[18,18,18,28],info:{title:name+' · Indent '+indent,author:'Euro Suits ERP',subject:'Indent '+indent},defaultStyle:{font:'Roboto',fontSize:8,color:'#111827'},content,
 background:()=>({text:'EURO SUITS',fontSize:56,bold:true,color:navy,opacity:.045,absolutePosition:{x:100,y:380}}),
 footer:(current:number,total:number)=>({text:`Indent ${indent} · ${current} / ${total}`,fontSize:7,color:'#526170',alignment:'right',margin:[18,8,18,0]})};
}
let engine:Promise<any>|undefined;
export async function createSampleForm(kind:SampleFormKind,detail:any,piece:any,material:(id:any)=>string):Promise<File>{
 engine||=Promise.all([import('pdfmake/build/pdfmake'),import('pdfmake/build/vfs_fonts')]).then(([pdf,fonts])=>{const make=pdf.default;make.addVirtualFileSystem(fonts.default);make.setUrlAccessPolicy(()=>false);return make}).catch(e=>{engine=undefined;throw e});
 const response=await fetch('/sample-form-logo.jpg',{credentials:'same-origin'});
 if(!response.ok)throw Error('The form logo could not load. Retry preview.');
 const image=await response.blob();
 const logo=await new Promise<string>((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>resolve(String(reader.result));
  reader.onerror=()=>reject(Error('The form logo could not be read. Retry preview.'));
  reader.readAsDataURL(image);
 });

 const make=await engine;const pdf=await make.createPdf(sampleFormDocument(kind,detail,piece,material,logo)).getBlob();
 return new File([pdf],(kind==='indent'?'Sample-Indent-Form':'Sample-Audit-Form')+'-'+(piece.indent_number||piece.id)+'.pdf',{type:'application/pdf'});
}
