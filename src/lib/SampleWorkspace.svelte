<script lang="ts">
 import PhoneScanButton from './PhoneScanButton.svelte';
 import SpoolyHelp from './SpoolyHelp.svelte';
 let inlineHelp=$state(false);
 import {holdDashboardLoad} from './signInTransition';
 import {ButtonLoader,SkeletonLoader,SpinnerLoader} from '$lib/components/loaders';
 import {downloadReport,withFullScreen} from '$lib/loading';
 import {indentReference} from './sampleProcess';
 import {ChevronDown,ClipboardCheck,Copy,FileText,Pencil,Printer,Search,X} from '@lucide/svelte';
 import SampleProcessBoard from './SampleProcessBoard.svelte';
 import SampleCommentField from './SampleCommentField.svelte';
 import IntimationReminder from './IntimationReminder.svelte';
 import {intimationReference} from './intimationReference';
 import IntimationQueue from './IntimationQueue.svelte';
 import SampleUploads from './SampleUploads.svelte';import SampleFilePreview from './SampleFilePreview.svelte';let previewFile:any=$state(null),mailReader:any=$state(null);
 import {createSampleForm,type SampleFormKind} from './sampleFormPdf';
 import {enter, workspaceMotion} from "./motion";
 import {onMount,tick,untrack} from 'svelte';import SampleCapacity from './SampleCapacity.svelte';import SamplePlanning from './SamplePlanning.svelte';import SamplePlanLedger from './SamplePlanLedger.svelte';import SamplePiece from './SamplePiece.svelte';import SampleReports from './SampleReports.svelte';import {api,uploadTo} from './api';import type {Row} from './types';
 let {companies,company,orders=[],intimationOnly=false,initialView='requests',processView='all',indentProgress=false}:{companies:Row[];company:string;orders:Row[];intimationOnly?:boolean;initialView?:string;processView?:string;indentProgress?:boolean}=$props();
 let reminderOpen=$state(false), downloadingIntimations=$state(false);
 async function downloadIntimations(){
  if(downloadingIntimations)return;
  downloadingIntimations=true;error='';
  try {await downloadReport('/api/sample-intimations/report.xlsx'+(company?'?company_id='+encodeURIComponent(company):''),'pending-intimations.xlsx')}
  catch(e){error=(e as Error).message}
  finally{downloadingIntimations=false}
 }
 let fieldErrors:Record<string,string>=$state({});
 let editor:HTMLDivElement|undefined=$state();
 let assignedMerchant=$state('');
 let opening=$state(false),detailLoad=0;
 function cancelDetailLoad(){detailLoad++;opening=false;}
 let stageSection:HTMLDetailsElement|undefined=$state();
 let remarkDictating=$state(false);
 let uploadingFile=$state<File|null>(null);
 let uploadFailure=$state<{group:string;message:string}|null>(null);
 let intake=$state(false), queued:any=$state({Trims:[],Mail:[],Files:[],'Buyer email':[]});
 let view=$state(untrack(()=>intimationOnly?'intimation':initialView)),revision=$state(0),fileIndent=$state('');
 let data:any=$state(null),detail:any=$state(null),form:any=$state(null),busy=$state(false),error=$state(''),notice=$state(''),review=$state(''),search=$state(''),category=$state('Buyer email'),stockForm:any=$state(null),option:any=$state(null),production:any=$state(null),printMode=$state('indent'),printPiece=$state(0),focusIndent=$state(0),reportBusy=$state(false);let formPreview:File|null=$state(null);
 const fields=[['development_id','Approved EST / style master','style'],['booking_reference','Booking reference (if available)'],['brand','Brand'],['request_date','Request date','date'],['buyer_requested_date','Buyer requested date','date'],['buyer_required_date','Buyer required date','date'],['plan_date','Plan date','date'],['email_date','Buyer email date','date'],['email_subject','Buyer email subject'],['sample_type','Sample type','option'],['est','EST number (numbers only)'],['buyer_style','Buyer style number'],['buyer_spec','Buyer specification number'],['product','Product','option'],['description','Description'],['fit','Block / fit','option'],['factory','Sample production factory','option'],['season','Season','option'],['year','Season year'],['order_id','Linked production PO (optional)','order'],['buyer_po','Buyer PO reference (if available)'],['pattern_status','Pattern type / effort','option'],['material_id','Required ETF / ESF','material'],['fabric_choice','Fabric choice','choice'],['length_metres','Fabric required (metres)'],['alternate_material_id','Alternate ETF / ESF (if required)','material'],['alternate_reference','Alternate reference'],['fabric_in_date','Fabric-in date','date'],['fabric_expected_date','Fabric expected date','date'],['trims_expected_date','Trims expected date','date'],['copy_sample_id','Copy from indent number'],['copy_purpose','Sample to copy — purpose','purpose'],['cad_reference','CAD reference'],['spec_reference','Specification reference'],['spec_date','Specification date','date'],['spec_signed','Specification signed by'],['remake_indent_id','Remake of indent number'],['special_remarks','Special remarks'],['finishing_remarks','Finishing remarks'],['embroidery','Embroidery'],['washing','Washing']];
 const requestSections=[
 {title:'Request and buyer',keys:['brand','request_date','buyer_style','sample_type','description','buyer_requested_date','plan_date','booking_reference','buyer_po','order_id']},
 {title:'Style and production',keys:['development_id','est','buyer_spec','product','fit','factory','season','year']},
 {title:'Fabric and trims',keys:['material_id','fabric_choice','length_metres','alternate_material_id','alternate_reference','fabric_in_date','fabric_expected_date','trims_expected_date']},
 {title:'Pattern and specification',keys:['pattern_status','cad_reference','copy_sample_id','copy_purpose']},
 {title:'Mail and instructions',keys:['email_date','email_subject','special_remarks','finishing_remarks','embroidery','washing']}];
 const productionFields=[['pattern_by','Pattern by'],['cut_by','Cut by'],['sample_maker','Sample maker'],['pattern_plan_date','Pattern ready — plan','date'],['allocation_plan_date','Cutting allocation — plan','date'],['sewing_plan_date','Sewing handover — plan','date'],['fabric_update_date','Fabric ready date','date'],['trims_update_date','Trims ready date','date'],['style_update_date','Style ready date','date'],['readiness_note','Readiness remarks'],['handover_dc','Handover DC'],['enclosures','Enclosures: cut pattern / counter sample / audit sheet']];
 const bomFields=[['component','Component'],['reference','Article / reference'],['quantity','Quantity'],['colour','Colour'],['size','Size'],['ticket','Thread ticket'],['thread_position','Top / bobbin'],['shade','Shade number'],['placement','Placement'],['remarks','Remarks']];
 const groups=['Pocketing','Fusing','Sewing trims','Fabric trims','Labels','Finishing','Value additions'];
 const label=(key:string)=>key==='email_message'?(intimationOnly?'Buyer email message':'Special remark'):key==='legacy_indent_number'?'Old indent no. (Excel)':key==='source_process_status'?'Excel process status':fields.find(f=>f[0]===key)?.[1]||productionFields.find(f=>f[0]===key)?.[1]||key.replaceAll('_',' ');
 function detailEntries(profile:any){const order=['brand','buyer_style','description','request_date','sample_type','legacy_indent_number'];return Object.entries(profile).filter(([key])=>key!=='source_quantity'&&key!=='historical_registered'&&key!=='pending_completion'&&!key.startsWith('import_')).sort(([a],[b])=>{const rank=(k:string)=>['special_remarks','finishing_remarks'].includes(k)?999:order.includes(k)?order.indexOf(k):99;return rank(a)-rank(b)})}
 const material=(id:any)=>data?.materials.find((m:any)=>String(m.id)===String(id))?.code||id;
 let records=$derived((data?.records||[]).filter((r:any)=>!(r.profile.intimation==='true'&&r.status!=='Approved')&&(!company||String(r.company_id)===company)&&(!search||JSON.stringify(r).toLowerCase().includes(search.toLowerCase()))));
 const requestIndentNumbers=(r:Row):string[]=>r.indent_numbers??r.reserved_indent_numbers??[];
 const requestStatus=(r:Row)=>r.profile.pending_completion?'Pending detail approval':
  r.status==='Submitted'?'Pending approval':r.status==='Changes requested'?'Rework needed':
  r.profile.historical_registered==='true'?'Registered · Historical':r.status;
 const requestTone=(r:Row)=>r.profile.pending_completion||r.status==='Submitted'?'pending':
  r.status==='Changes requested'?'rework':r.status==='Draft'?'draft':'approved';
 let reservedIndent=$state(''),expandedIndentRequest=$state(0);
 const reservedPieces=$derived.by(()=>{
  if(!detail||detail.pieces.length)return [];
  const numbers=requestIndentNumbers(detail.record);
  let index=0;
  return detail.record.variants.flatMap((variant:{quantity:number;size:string;colour:string})=>{
   const start=index;
   index+=Number(variant.quantity)||0;
   return numbers.slice(start,index).map(number=>({number,size:variant.size,colour:variant.colour}));
  }) as {number:string;size:string;colour:string}[];
 });
 const reservedPiece=$derived(reservedPieces.find(piece=>piece.number===reservedIndent));
 const queuedFileCount=$derived(Object.values(queued).reduce<number>((count,files)=>count+(files as File[]).length,0));
 const pieceCount=$derived(form?.variants.reduce((total:number,v:any)=>total+(Number.isInteger(Number(v.quantity))&&Number(v.quantity)>0?Number(v.quantity):0),0)??0);
 let approvalRequests=$derived((data?.records||[]).filter((r:any)=>(!company||String(r.company_id)===company)&&(r.status==='Submitted'||r.profile.pending_completion)));
 let printPieces=$derived(detail?.pieces.filter((p:any)=>!printPiece||p.id===printPiece)||[]);
 let layoutPages=$derived.by(()=>{const list=[{group:'Fabric',component:'Primary fabric',reference:material(detail?.record.profile.material_id)},...(detail?.record.bom||[])];const pages=[];for(let i=0;i<Math.max(1,list.length);i+=6)pages.push(list.slice(i,i+6));return pages});
 function showMail(node:HTMLDialogElement){node.showModal()}
 async function load(){data=await api('/sample-requests');revision++}
 async function refreshDetail(){detail=await api('/sample-requests/'+detail.record.id);await load()}
 async function revealErrors(){
  await tick();
  const first=Array.from(editor?.querySelectorAll<HTMLElement>('[data-field]')||[]).find(n=>fieldErrors[n.dataset.field||'']);
  if(!first)return;
  let parent=first.parentElement;
  while(parent){if(parent instanceof HTMLDetailsElement)parent.open=true;parent=parent.parentElement}
  await tick();
  const control=first.querySelector<HTMLElement>('input,select,textarea');
  control?.setAttribute('aria-invalid','true');
  first.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  control?.focus({preventScroll:true});
 }
 function clearField(event:Event){const node=(event.target as HTMLElement).closest<HTMLElement>('[data-field]');const key=node?.dataset.field;if(key&&fieldErrors[key]){delete fieldErrors[key];(event.target as HTMLElement).removeAttribute('aria-invalid')}}
 async function run(work:()=>Promise<void>){if(busy)return;busy=true;error='';notice='';try{await work()}catch(e){error=(e as Error).message;fieldErrors=(e as any).fields||{};await revealErrors()}finally{busy=false}}
 onMount(()=>{
  const finishSignIn=holdDashboardLoad();
  void run(load).finally(finishSignIn);
  return finishSignIn;
 });
 function fresh(){fieldErrors={};uploadFailure=null;intake=false;queued={Trims:[],Mail:[],Files:[],'Buyer email':[]};if(!company&&companies.length>1){error='Select a workspace company before creating a request.';return}form={company_id:Number(company||companies[0]?.id),buyer_id:'',profile:Object.fromEntries(fields.map(f=>[f[0],f[2]==='date'&&f[0]==='request_date'?new Date().toLocaleDateString('en-CA'):''])),variants:[{size:'',colour:'',quantity:1}],bom:[]}}
 async function open(id:number,indent=0,number=''){
  if(busy)return;
  const request=++detailLoad;
  opening=true;
  try{await run(async()=>{
   const loaded=await api('/sample-requests/'+id).catch(error=>{if(request===detailLoad)throw error;return null});
   if(request!==detailLoad)return;
   detail=loaded;assignedMerchant='';
   focusIndent=detail.pieces.find((p:{id:number;indent_number?:string})=>p.id===indent||indentReference(p)===number)?.id??detail.pieces[0]?.id??0;
   reservedIndent=number||requestIndentNumbers(detail.record)[0]||'';
   review='';fileIndent='';production=null;form=null;category=data.can_audit?'Audit sheet':!data.can_edit&&data.can_pattern?'CAD':'Buyer email';
  })}finally{if(request===detailLoad)opening=false}
 }
 async function showStages(){
  if(!stageSection)return;
  if(!focusIndent)focusIndent=detail.pieces[0].id;
  stageSection.open=true;
  await tick();
  stageSection?.querySelector('summary')?.focus();
 }
 function copyRequest(){fieldErrors={};uploadFailure=null;intake=false;queued={Trims:[],Mail:[],Files:[],'Buyer email':[]};const source=structuredClone($state.snapshot(detail.record));form={company_id:source.company_id,buyer_id:source.buyer_id,profile:{...source.profile,historical_registered:'',legacy_indent_number:'',copy_sample_id:String(detail.pieces[0]?.id||''),remake_indent_id:''},variants:source.variants,bom:source.bom};detail=null}
 function edit(){fieldErrors={};uploadFailure=null;queued={Trims:[],Mail:[],Files:[],'Buyer email':[]};intake=false;form={...structuredClone($state.snapshot(detail.record)),files:detail.files};detail=null}
 function completeDetails(){fieldErrors={};uploadFailure=null;queued={Trims:[],Mail:[],Files:[],'Buyer email':[]};intake=false;form={...structuredClone($state.snapshot(detail.record)),indent_numbers:detail.pieces.map((p:any)=>p.indent_number).filter(Boolean),completion:true,variants:detail.pieces.map((p:any)=>({id:p.id,version:p.version,size:p.size,colour:p.colour,quantity:1})),files:detail.files};detail=null}
 async function save(action:string){if(remarkDictating)return;fieldErrors={};uploadFailure=null;await run(async()=>{
 const payload=()=>({company_id:Number(form.company_id),buyer_id:Number(form.buyer_id),profile:form.profile,variants:form.variants,bom:form.bom,version:form.version,action:intake?'intimation':form.completion?'complete':'save'});
 if(!form.id){const result=await api('/sample-requests',payload());const saved=await api('/sample-requests/'+result.id);form={...saved.record,files:saved.files};}
 for(const group of Object.keys(queued)){
  for(const file of [...queued[group]]){
   uploadingFile=file;
   try{
    const uploaded=await uploadTo('/sample-requests/'+form.id+'/files?category='+encodeURIComponent(group),file);
    form.files=[...(form.files||[]),{id:uploaded.id,name:file.name,category:group}];
    queued[group]=queued[group].filter((queuedFile:File)=>queuedFile!==file);
   }catch(cause){
    const message='Could not upload '+file.name+'. '+(cause as Error).message;
    uploadFailure={group,message};
    throw new Error(message,{cause});
   }finally{uploadingFile=null}
  }
 }
 const savedRequest=await api('/sample-requests/'+form.id,{...payload(),version:form.version,action:intake?'save':form.completion?'complete':action})
 const rid=form.id;form=null;await load();if(!intake){detail=await api('/sample-requests/'+rid);focusIndent=detail.pieces[0]?.id??0;reservedIndent=requestIndentNumbers(detail.record)[0]||'';}notice=action==='complete'&&!data.can_approve?'Detail changes sent to MD or Super Admin for approval.':intake?intimationReference(savedRequest)+' submitted. It stays pending until MD approval generates the indents.':action==='complete'?'Registered indent details saved.':action==='submit'?'Sent to MD or Super Admin for approval.':'Draft and files saved.';intake=false;
 })}
 async function generateIntimation(record:any){await run(async()=>{const saved=await api('/sample-requests/'+record.id);form={...structuredClone(saved.record),files:saved.files};queued={Trims:[],Mail:[],Files:[],'Buyer email':[]};intake=false;detail=null})}
 function newIntimation(){fresh();if(form){intake=true;form.variants=[{size:'',colour:'',quantity:1}]}}

 async function decide(action:string){await run(async()=>{await api('/sample-requests/'+detail.record.id,{version:detail.record.version,action,note:review});detail=await api('/sample-requests/'+detail.record.id);if(action==='approve')focusIndent=detail.pieces.find((p:{id:number;indent_number?:string})=>indentReference(p)===reservedIndent)?.id??detail.pieces[0]?.id??0;review='';await load()})}
 async function pieceAction(piece:any,action:string,result=''){await run(async()=>{await api('/sample-indents/'+piece.id,{version:piece.version,action,result,note:review,production:production?.values});detail=await api('/sample-requests/'+detail.record.id);production=null;await load()})}
 function opts(kind:string,cid:any){return [...new Set([...(form?.profile?.[kind]?[form.profile[kind]]:[]),...(data?.defaults[kind]||[]),...(data?.options||[]).filter((o:any)=>o.kind===kind&&o.company_id===Number(cid)).map((o:any)=>o.label)])] as string[]}
 async function addOption(){await run(async()=>{await api('/sample-options',{...option,company_id:Number(form.company_id)});await load();form.profile[option.kind]=option.label;option=null})}
 async function attachFiles(files:File[], scan=false){
  const id=detail?.record.id;
  if(!id||busy||!files.length){if(scan)throw new Error('This request is busy. Try again.');return;}
  let attached=false;
  await run(async()=>{
   const path='/sample-requests/'+id+'/files?category='+encodeURIComponent(category)+(fileIndent?'&indent_id='+fileIndent:'');
   for(const file of files)await uploadTo(path,file);
   attached=true;
   detail=await api('/sample-requests/'+id);
  });
  if(scan&&!attached)throw new Error(error||'The scan could not be attached.');
 }
 async function upload(event:Event){
  const input=event.currentTarget as HTMLInputElement;
  await attachFiles(Array.from(input.files||[]));
  input.value='';
 }
 async function stockSave(){await run(async()=>{await api('/sample-stock',stockForm);stockForm=null;await load();if(detail)detail=await api('/sample-requests/'+detail.record.id);notice='Stock movement recorded.'})}
 async function previewForm(kind:SampleFormKind,id=0){if(reportBusy||!detail)return;const piece=detail.pieces.find((p:any)=>p.id===(id||focusIndent))||(!id&&!focusIndent?detail.pieces[0]:null);if(!piece)return;reportBusy=true;error='';try{formPreview=await withFullScreen('Preparing '+(kind==='audit'?'sample audit':'sample indent')+' PDF…',()=>createSampleForm(kind,$state.snapshot(detail),$state.snapshot(piece),(key:any)=>data.materials.find((m:any)=>String(m.id)===String(key))?.code||''))}catch(e){error=(e as Error).message}finally{reportBusy=false}}
 async function print(kind:string,id=0){printMode=kind;printPiece=id;await tick();window.print()}
</script>
{#snippet indentCell(record:Row)}
 {@const numbers=requestIndentNumbers(record)}
 {#if numbers.length>1}
  <div class="request-indents">
   <button type="button" class="indent-disclosure" aria-expanded={expandedIndentRequest===record.id} aria-controls={'indent-numbers-'+record.id}
    onclick={()=>expandedIndentRequest=expandedIndentRequest===record.id?0:record.id}>
    <strong>{numbers[0]}</strong><span>+ {numbers.length-1} more <ChevronDown size={14} aria-hidden="true"/></span>
   </button>
   <ul id={'indent-numbers-'+record.id} aria-label="Indent numbers" hidden={expandedIndentRequest!==record.id}>
    {#each numbers as number (number)}
     <li><button type="button" class="indent-link" disabled={busy} onclick={()=>open(record.id,0,number)}>{number}</button></li>
    {/each}
   </ul>
  </div>
 {:else if numbers.length}
  <button type="button" class="indent-link" disabled={busy} onclick={()=>open(record.id,0,numbers[0])}>{numbers[0]}</button>
 {:else}
  <strong>{record.profile.intimation==='true'?intimationReference(record):'Awaiting number'}</strong>
 {/if}
 {#if record.profile.legacy_indent_number}<small>Old indent {record.profile.legacy_indent_number}</small>{/if}
{/snippet}
{#snippet statusLabel(record:Row)}
 <span class={'request-status request-status--'+requestTone(record)}>{requestStatus(record)}</span>
{/snippet}
{#if formPreview}{#key formPreview.name}<SampleFilePreview file={formPreview} name={formPreview.name} downloadLabel="Download PDF" onclose={()=>formPreview=null}/>{/key}{/if}
{#if previewFile}{#key previewFile.id}<SampleFilePreview id={previewFile.id} name={previewFile.name} onclose={()=>previewFile=null}/>{/key}{/if}
<section class="samples" use:workspaceMotion={view}>
{#if view!=='process'} <header><div><h2>{intimationOnly?'INTIMATION':view==='process'?'Sample process':'Sample indents'}</h2><p>{intimationOnly?'Buyer instructions waiting for sample indents.':'One indent number per piece, assigned when you first save.'}</p></div><div class="actions"><button class="button secondary" disabled={busy} onclick={()=>run(load)}>Refresh</button>{#if intimationOnly&&(data?.can_edit||data?.can_approve)}<ButtonLoader class="button secondary" label="Download Excel" loadingLabel="Downloading…" loading={downloadingIntimations} disabled={busy} onclick={downloadIntimations}/><button class="button secondary" disabled={busy} onclick={()=>reminderOpen=true}>Send reminder</button>{/if}{#if data?.can_edit}<button class="button primary" disabled={busy} onclick={intimationOnly?newIntimation:fresh}>{intimationOnly?'New intimation':'New sample request'}</button>{/if}{#if data?.can_stock&&!intimationOnly}<button class="button secondary" onclick={()=>stockForm={company_id:Number(company||companies[0]?.id),material_id:'',metres:'',reference:''}}>Receive sample fabric</button>{/if}</div></header>{/if}
 {#if error}<div class="form-error" role="alert">{error}</div>{/if}{#if notice}<p role="status">{notice}</p>{/if}
 {#if !intimationOnly&&view!=='process'}<nav class="sample-tabs" aria-label="Sampling views">{#each [['requests','Requests & approval'],['plan','Planning'],['freezing','Freezing'],['freeze-master','Freeze Master'],['progress','Process progress'],['capacity','Capacity'],['master','Master register'],['sop','How to work']] as [key,title]}<button class="button" aria-current={view===key?'page':undefined} class:primary={view===key} class:secondary={view!==key} onclick={()=>view=key}>{title}</button>{/each}{#if ['capacity','plan','freezing','freeze-master'].includes(view)}<button class="button secondary" data-inline-spooly type="button" aria-label="Open Spooly task help" onclick={()=>inlineHelp=true}>Spooly help</button>{/if}</nav>{/if}
 {#if busy&&data&&!opening}<SpinnerLoader label="Updating samples…"/>{/if}
 {#if !data&&!error}<SkeletonLoader variant={intimationOnly?'list':'table'} rows={5} columns={7} label={intimationOnly?'Loading pending intimations…':'Loading sample requests…'}/>{:else}
 {#if view==='intimation'}<IntimationQueue records={(data?.records||[]).filter((r:any)=>r.profile.intimation==='true'&&r.status!=='Approved'&&(!company||String(r.company_id)===company))} canEdit={!!data?.can_edit} {busy} onGenerate={generateIntimation} onOpen={open} onMail={r=>mailReader={subject:r.profile.email_subject,message:r.profile.email_message}} onPreview={file=>previewFile=file}/>{/if}
 {#if view==='process'||view==='progress'}{#if processView==='approvals'&&data?.can_approve}
 <section class="sample-request-register sample-approval-queue" aria-label="Sample approvals">
  <div class="approval-heading"><h3>Sample requests &amp; detail corrections</h3><p>{approvalRequests.length} awaiting MD or Super Admin review</p></div>
  <div class="table-scroll">
   <table class="request-list">
    <thead><tr><th>Indent / intimation</th><th>Buyer / style</th><th>Submitted by</th><th>Review type</th><th>Action</th></tr></thead>
    <tbody>
     {#each approvalRequests as r (r.id)}
      <tr data-tone={requestTone(r)}>
       <td>{@render indentCell(r)}</td>
       <td><strong>{r.buyer}</strong><small>{r.profile.buyer_style||'Style not recorded'}</small></td>
       <td>{r.profile.pending_completion?.submitter||r.submitted_by||r.created_by_name}</td>
       <td>{r.profile.pending_completion?'Indent detail correction':'New sample request'}</td>
       <td><button class="request-open" disabled={busy} onclick={()=>open(r.id)}>Review request</button></td>
      </tr>
     {:else}
      <tr><td colspan="5">No sample requests or detail corrections are awaiting your review.</td></tr>
     {/each}
    </tbody>
   </table>
  </div>
 </section>{/if}<SampleProcessBoard {company} view={processView} {revision} onopen={open} progressLayout={indentProgress||view==='progress'}/>{:else if view==='sop'}<section class="sop"><h3>Sampling SOP</h3><ol><li><strong>Merchant:</strong> enter buyer, style, fabric, specification, required date, sizes and pieces. Save a draft to assign one indent number per piece and attach supporting files. Then submit the request to MD.</li><li><strong>MD:</strong> review the request. Approval releases the numbered indents to production. Intimations receive their indent numbers at this step.</li><li><strong>Sampling coordinator:</strong> first ask Super Admin to set Capacity (tailors × pieces per day, Sunday off and holidays). In Planning, select indents, set their priority and line, then preview and freeze the plan. Open Freezing to see the locked plan. After their deadline, plans move to Freeze Master; final handover determines delay. Maintain the master register and update live progress daily. Record expected and ready dates for fabric, trims and style, then plan pattern, cutting, tailor allocation, sewing, finishing, audit and handover.</li><li><strong>Departments:</strong> report fabric/trims availability, pattern and marker completion, cutting start/completion, allocation, loading, sewing and finishing. Every report records the submitting account and time; only the request’s assigned merchant accepts it. The assigned merchant can record operational updates directly. QA continues to sign audits.</li><li><strong>CAD / Sampling:</strong> complete patterns and markers. Accept the file or record missing items. Cutting requires a clear file and recorded fabric, trims and style readiness. Allocate a sample tailor and record loading before starting sewing.</li><li><strong>Sampling:</strong> record sewing and finishing progress separately, then send to QA.</li><li><strong>QA:</strong> compare the required specification against the actual garment. Record actual/alternate fabric, trims and style, submission attempt and remarks. Approve, send for rework or reject. Rework returns through sewing, finishing and a new audit; earlier signed reports stay available.</li><li><strong>Sampling / Merchant:</strong> record the DC and handover to merchant or showroom. Enter customer and sender addresses and AWB / delivery reference when completing final handover. Print the dispatch label.</li><li><strong>Traceability:</strong> each garment keeps its indent, plan, audit reports, linked private files and action history. Live planning excludes completed and rejected garments; the master retains them.</li></ol></section>{:else if view==='capacity'}<SampleCapacity {company} onupdated={()=>revision++}/>{:else if ['freezing','freeze-master'].includes(view)}<SamplePlanLedger {company} mode={view} {revision} onopen={open}/>{:else if ['live','master','plan'].includes(view)}<SamplePlanning {company} {view} {revision} canPlan={data?.can_produce} onopen={open} onfrozen={()=>view='freezing'}/>{:else if view==='requests'}
 <div class="sample-request-register">
  <div class="request-list-controls"><label class="request-search"><span class="request-search__label">Search indent number, style or buyer</span><Search size={16} aria-hidden="true"/><input bind:value={search} placeholder="Search indent, style or buyer"/></label></div>
  <div class="table-scroll">
   <table class="request-list">
    <thead><tr><th>Indent number</th><th>Buyer / style</th><th>Plan date</th><th>Submitted by</th><th>Status</th><th>Pieces</th><th>Action</th></tr></thead>
    <tbody>
     {#each records as r (r.id)}
      <tr data-tone={requestTone(r)}>
       <td>{@render indentCell(r)}</td>
       <td><strong>{r.buyer}</strong><small>{[r.profile.buyer_style,r.profile.est&&'EST '+r.profile.est].filter(Boolean).join(' · ')||'Style not recorded'}</small></td>
       <td>{r.profile.plan_date||'—'}</td>
       <td>{r.submitted_by||r.created_by_name||'—'}<small>{r.submitted_by?'Submitted':'Created'}</small></td>
       <td>{@render statusLabel(r)}</td><td>{r.pieces||'—'}</td>
       <td><button class="request-open" disabled={busy} onclick={()=>open(r.id)}>View</button></td>
      </tr>
     {:else}
      <tr><td colspan="7">No sample requests in your current access.</td></tr>
     {/each}
    </tbody>
   </table>
  </div>
 </div>
 {#if data?.stock.length}<details><summary>Sample fabric balances</summary><div class="table-scroll"><table><thead><tr><th>Fabric</th><th>Metres remaining</th></tr></thead><tbody>{#each data.stock.filter((s:any)=>!company||String(s.company_id)===company) as s}<tr><td>{s.code}</td><td>{s.metres}</td></tr>{/each}</tbody></table></div></details>{/if}
{/if}
 {/if}
</section>
{#if opening}<dialog class="sample-detail-loading" use:showMail aria-label="Loading sample request details" oncancel={cancelDetailLoad}><header><h2>Sample request details</h2><button class="button secondary" type="button" onclick={cancelDetailLoad}>Close</button></header><div class="sample-detail-loading__body"><SkeletonLoader variant="detail" rows={6} columns={3} label="Loading sample request details…"/></div></dialog>{/if}
{#if intimationOnly&&reminderOpen}
 {#key company}<IntimationReminder {company} close={()=>reminderOpen=false}/>{/key}
{/if}
{#if form}
 <div class="sample-overlay" class:intimation-overlay={intake}>
 <div role="dialog" aria-modal="true" aria-labelledby="sample-editor-title" tabindex="-1" class="sample-dialog ux-dialog" bind:this={editor} oninput={clearField} onchange={clearField} class:intimation-dialog={intake}>
 <header>
  <div class="editor-heading">{#if intake}<FileText size={19} aria-hidden="true"/>{/if}<h2 id="sample-editor-title">{intake?'New intimation':form.id?(form.profile.intimation==='true'?intimationReference(form):requestIndentNumbers(form)[0]||'Edit sample request'):'Generate sample indent'}</h2></div>
  <button type="button" disabled={busy} class="button secondary" aria-label="Close" onclick={()=>{form=null;option=null}}>{#if intake}<X size={18} aria-hidden="true"/>{:else}Close{/if}</button>
 </header>
 <div class="ux-dialog__body" use:enter>
 {#if error}<div class="form-error" role="alert">{error}</div>{/if}
 <div class="editor-layout">
 <div class="form-grid"><label data-field="buyer_id" class:field-error={!!fieldErrors.buyer_id}>{intake?'Brand / buyer':'Buyer'}<select bind:value={form.buyer_id} onchange={()=>{if(intake)form.profile.brand=data.buyers.find((b:any)=>b.id===Number(form.buyer_id))?.name||''}}><option value="">Choose buyer</option>{#each data.buyers.filter((b:any)=>b.company_id===Number(form.company_id)) as b}<option value={b.id}>{b.name}</option>{/each}</select>{#if fieldErrors.buyer_id}<small class="field-error-message">{fieldErrors.buyer_id}</small>{/if}</label>
 {#if form.profile.legacy_indent_number}<label>Original Excel indent<input value={form.profile.legacy_indent_number} readonly/></label>{/if}
 {#if form.completion&&form.profile.historical_registered==='true'}<label data-field="source_quantity" class:field-error={!!fieldErrors.source_quantity}>Historical number of pieces<input type="number" min="1" max="10000" step="1" value={form.profile.source_quantity??''} oninput={e=>form.profile.source_quantity=e.currentTarget.value}/>{#if fieldErrors.source_quantity}<small class="field-error-message">{fieldErrors.source_quantity}</small>{/if}</label>{/if}
 {#snippet requestFields(keys:string[])}
  {#each fields.filter(f=>keys.includes(f[0])).sort((a,b)=>keys.indexOf(a[0])-keys.indexOf(b[0])) as [key,title,type]}<label data-field={key} class:field-error={!!fieldErrors[key]}>{intake&&key==='email_subject'?'Description':title}{#if type==='option'}<div class="option-line"><select bind:value={form.profile[key]}><option value="">Select…</option>{#each opts(key,form.company_id) as o}<option>{o}</option>{/each}</select><button class="button secondary" title={'Add '+title} onclick={()=>option={kind:key,label:''}}>+</button></div>{:else if type==='style'}<select bind:value={form.profile[key]} onchange={()=>{const m=data.styles.find((m:any)=>String(m.id)===form.profile.development_id);if(m){form.profile.est=m.code.replace('EST-','');form.profile.product=m.profile.product||form.profile.product;form.profile.fit=m.profile.fit||form.profile.fit;form.profile.cad_reference=m.profile.pattern_reference||form.profile.cad_reference}}}><option value="">No linked master / legacy EST</option>{#each data.styles.filter((m:any)=>m.company_id===Number(form.company_id)&&(!m.buyer_id||m.buyer_id===Number(form.buyer_id))) as m}<option value={String(m.id)}>{m.code} · {m.profile.style_name}</option>{/each}</select>{:else if type==='choice'}<select bind:value={form.profile[key]}><option value="">Select…</option><option>Actual</option><option>Alternate</option></select>{:else if type==='order'}<select bind:value={form.profile[key]} onchange={()=>{const o=orders.find(o=>String(o.id)===form.profile.order_id);if(o){form.buyer_id=o.buyer_id;form.profile.buyer_po=o.po}}}><option value="">No production PO</option>{#each orders.filter(o=>o.company_id===Number(form.company_id)&&(!form.buyer_id||o.buyer_id===Number(form.buyer_id))) as o}<option value={String(o.id)}>{o.po}</option>{/each}</select>{:else if type==='material'}<select bind:value={form.profile[key]}><option value="">Select…</option>{#each data.materials.filter((m:any)=>m.company_id===Number(form.company_id)) as m}<option value={String(m.id)}>{m.code}</option>{/each}</select>{:else if type==='pattern'||type==='purpose'}<select bind:value={form.profile[key]}><option value="">Select…</option>{#each (type==='pattern'?['New','Modified','Existing']:['Style only','Specification only','Style and specification','Construction / make only']) as o}<option>{o}</option>{/each}</select>{:else}<input type={type==='date'?'date':'text'} bind:value={form.profile[key]} readonly={key==='request_date'||key==='est'&&!!form.profile.development_id} inputmode={key==='est'?'numeric':'text'}/>{/if}{#if fieldErrors[key]}<small class="field-error-message">{fieldErrors[key]}</small>{/if}</label>{/each}
 {/snippet}
 {#if intake}
  {@render requestFields(['sample_type','buyer_style','buyer_required_date','email_subject'])}
 {:else}
  {#each requestSections as section}
   <details class="request-field-section" open={section.title==='Request and buyer'}>
    <summary>{section.title}</summary>
    <div class="request-section-grid">{@render requestFields(section.keys)}</div>
   </details>
  {/each}
 {/if}
 <div class="wide" class:intimation-variants={intake}><h3>Sizes, colours and pieces</h3>{#if form.completion}<p>Update the existing indents’ size and colour. Each row keeps its current indent number.</p>{:else}<p class="indent-count" aria-live="polite"><strong>{pieceCount} {pieceCount===1?'indent number':'indent numbers'} {intake||form.profile.intimation==='true'?'assigned on approval':'assigned when saved'}.</strong></p>{/if}
 {#each form.variants as v,i}<div class="variant"><label>Size<input bind:value={v.size}/></label><label>Colour<input bind:value={v.colour}/></label><label data-field={'variants.'+i+'.quantity'} class:field-error={!!fieldErrors['variants.'+i+'.quantity']}>Quantity<input type="number" min="1" max="100" step="1" readonly={!!form.completion} bind:value={v.quantity}/>{#if fieldErrors['variants.'+i+'.quantity']}<small class="field-error-message">{fieldErrors['variants.'+i+'.quantity']}</small>{/if}</label><button class="button secondary" disabled={form.variants.length===1||form.completion} onclick={()=>form.variants.splice(i,1)}>Remove</button></div>{/each}{#if !form.completion}<button class="button secondary" onclick={()=>form.variants.push({size:'',colour:'',quantity:1})}>Add size / colour</button>{/if}</div>
 {#if !intake}
  <div class="wide" data-field="email_message" class:field-error={!!fieldErrors.email_message}>
   <SampleCommentField label="Special remark" bind:value={form.profile.email_message} bind:dictating={remarkDictating} disabled={busy} action="special_remark" requestId={form.id} companyId={Number(form.company_id)} buyerId={Number(form.buyer_id)} maxLength={20000}/>
   {#if fieldErrors.email_message}<small class="field-error-message">{fieldErrors.email_message}</small>{/if}
   {#each (form.files||[]).filter((f:any)=>f.category==='Buyer email') as file}<button type="button" class="text-button" onclick={()=>previewFile=file}>Preview {file.name}</button>{/each}
  </div>
 {/if}</div>
 {#snippet uploads()}
 <div class="sample-upload-grid">{#each (intake?['Buyer email']:['Trims','Mail','Files']) as group}<div class="sample-upload-group"><SampleUploads destination={form.id||0} existing={(form.files||[]).filter((f:any)=>(f.category===group||group==='Mail'&&f.category==='EST')).length} title={group==='Buyer email'?'Mail attachment':group}
 files={queued[group]} disabled={busy} canUpload={intake ? data?.can_documents === true : (data?.can_upload_indent_files ?? data?.can_documents) === true} uploading={uploadingFile}
 uploadError={uploadFailure?.group===group?uploadFailure.message:''}
 onfiles={files=>{queued[group]=files;if(uploadFailure?.group===group)uploadFailure=null}}/>{#each (form.files||[]).filter((f:any)=>(f.category===group||group==='Mail'&&f.category==='EST')) as file}<button type="button" class="text-button" onclick={()=>previewFile=file}>Preview {file.name}</button>{/each}</div>{/each}</div>
 {/snippet}
 {#if intake}
  <section class="intimation-communication" aria-label="Buyer email and attachments">
   <label>Buyer email message<textarea rows="5" bind:value={form.profile.email_message} aria-describedby="sample-buyer-message-help"></textarea><small id="sample-buyer-message-help">Paste the buyer’s email here or attach the saved email.</small></label>
   {@render uploads()}
  </section>
 {:else}
  {@render uploads()}
 {/if}
 </div>
 {#if option}<div class="inline-editor"><label>New {label(option.kind)}<input bind:value={option.label} maxlength="100"/></label><button class="button primary" disabled={busy||!option.label.trim()} onclick={addOption}>Add option</button><button class="button secondary" onclick={()=>option=null}>Cancel</button></div>{/if}
 {#if !intake}<h3>Sample BOM</h3>{#if !form.bom.length}<p>No components added. Click Add component to add only what you need.</p>{/if}
 {#each form.bom as b,i}<div class="bom-row"><label data-field={'bom.'+i+'.group'} class:field-error={!!fieldErrors['bom.'+i+'.group']}>Group<select bind:value={b.group}>{#each groups as g}<option>{g}</option>{/each}</select></label>{#each bomFields as [key,title]}<label data-field={'bom.'+i+'.'+key} class:field-error={!!fieldErrors['bom.'+i+'.'+key]}>{title}<input bind:value={b[key]}/>{#if fieldErrors['bom.'+i+'.'+key]}<small class="field-error-message">{fieldErrors['bom.'+i+'.'+key]}</small>{/if}</label>{/each}<button class="text-button" onclick={()=>form.bom.splice(i,1)}>Remove component</button></div>{/each}<button class="button secondary" onclick={()=>form.bom.push({group:'Sewing trims',component:''})}>Add component</button>
 {/if}</div><footer><p class="indent-form-summary">{pieceCount} {pieceCount===1?'piece':'pieces'} · {queuedFileCount} {queuedFileCount===1?'file':'files'} ready to attach</p>{#if form.completion}<button class="button primary" disabled={busy||remarkDictating} onclick={()=>save('complete')}>{data.can_approve?'Save indent details':'Submit detail changes'}</button>{:else if intake}<button type="button" class="button secondary" disabled={busy} onclick={()=>{form=null;option=null}}>Cancel</button><button type="button" class="button primary" disabled={busy} onclick={()=>save('intimation')}>{busy?'Submitting…':'Submit intimation'}</button>{:else}<button class="button secondary" disabled={busy||remarkDictating} onclick={()=>save('save')}>{busy?'Saving…':'Save draft'}</button><button class="button primary" disabled={busy||remarkDictating} onclick={()=>save('submit')}>Submit for approval</button>{/if}</footer></div></div>
{/if}
{#if detail}
 <div class="sample-overlay"><div role="dialog" aria-modal="true" aria-label="Sample request details" tabindex="-1" class="sample-dialog sample-detail-dialog"><header><h2>{#if focusIndent}Indent {indentReference(detail.pieces.find((p:any)=>p.id===focusIndent)??{id:focusIndent})}{:else}{detail.record.profile.intimation==='true'?'Intimation '+intimationReference(detail.record):reservedIndent?'Indent '+reservedIndent:'Sample request'}{/if} · {detail.record.profile.buyer_style||'Sample request'}{#if detail.record.profile.est} · EST {detail.record.profile.est}{/if}</h2><div class="detail-header-actions">{#if data.can_edit}<button class="button secondary" disabled={busy} onclick={copyRequest}><Copy size={14}/>Copy as new request</button>{/if}{#if ['Draft','Changes requested'].includes(detail.record.status)&&data.can_edit}<button class="button primary" disabled={busy} onclick={edit}><Pencil size={14}/>Edit / submit</button>{/if}{#if detail.record.status==='Approved'&&detail.can_complete}<button class="button primary" disabled={busy||!!detail.record.profile.pending_completion} onclick={completeDetails}><Pencil size={14}/>Complete / edit details</button>{/if}<span class="header-divider" aria-hidden="true"></span><button class="button secondary" disabled={busy} onclick={()=>{detail=null;production=null}}><X size={14}/>Close</button></div></header><div class="sample-detail-body" use:enter>
 {#if error}<div class="form-error" role="alert">{error}</div>{/if}
 <div class="sample-detail-toolbar"><p>Created by: <strong>{detail.record.created_by_name||detail.record.merchant||'—'}</strong> · Submitted by: <strong>{detail.record.submitted_by||'Not submitted'}</strong></p>{#if detail.pieces.length}<div class="actions"><button class="button secondary" onclick={()=>print('indent')}><Printer size={15} aria-hidden="true"/>Print all indents</button><button class="button secondary" onclick={()=>print('layout')}><Printer size={15} aria-hidden="true"/>Print swatch layout</button></div>{/if}</div>
 {#if reservedPieces.length}
  <section class="reserved-indent-panel" aria-label="Reserved indents" data-tone={requestTone(detail.record)}>
   {@render statusLabel(detail.record)}
   <label>Indent number<select bind:value={reservedIndent}>
    {#each reservedPieces as piece (piece.number)}<option value={piece.number}>{piece.number}</option>{/each}
   </select></label>
   {#if reservedPiece}<p>Size {reservedPiece.size||'—'} · Colour {reservedPiece.colour||'—'}</p>{/if}
  </section>
 {/if}
 {#if detail.pieces.length}<div class="sample-form-actions"><label>Registered sample<select bind:value={focusIndent}><option value={0}>All {detail.pieces.length} indents</option>{#each detail.pieces as piece}<option value={piece.id}>{indentReference(piece)} · {piece.size||'Size not recorded'} · {piece.colour||'Colour not recorded'}</option>{/each}</select></label><button class="button secondary" onclick={showStages}>Update stages</button><button class="button secondary" disabled={reportBusy||!focusIndent} onclick={()=>previewForm('indent')}><FileText size={15} aria-hidden="true"/>{reportBusy?'Preparing PDF…':'Sample Indent Form'}</button><button class="button secondary" disabled={reportBusy||!focusIndent} onclick={()=>previewForm('audit')}><ClipboardCheck size={15} aria-hidden="true"/>Sample Audit Form</button></div><p class="sample-form-help">Preview and download the selected indent’s saved details. Missing fields stay blank.</p>{/if}
 {#if detail.record.profile.historical_registered==='true'||detail.record.review_note}
  <div class="historical-note">
   {#if detail.record.profile.historical_registered==='true'}<strong>Historical registration · source details retained; unavailable fields are blank.</strong>{/if}
   {#if detail.record.review_note}<p><strong>{detail.record.profile.historical_registered==='true'?'Registration note:':'MD review:'}</strong> {detail.record.review_note}</p>{/if}
  </div>
 {/if}
 <div class="sample-merchant-assignment"><strong>Responsible merchant: {detail.record.merchant_id?detail.record.merchant:'Not assigned'}</strong>{#if data.can_assign_merchant}<label>Assign merchant<select bind:value={assignedMerchant}><option value="">Choose Merchandising user</option>{#each data.merchants.filter((m:any)=>m.companies.includes(detail.record.company_id)) as m}<option value={String(m.id)}>{m.name}</option>{/each}</select></label><button class="button secondary" disabled={busy||!assignedMerchant} onclick={()=>run(async()=>{await api('/sample-requests/'+detail.record.id+'/merchant',{version:detail.record.version,merchant_id:Number(assignedMerchant)});assignedMerchant='';await refreshDetail()})}>Assign merchant</button>{/if}</div>
{#if view==='process'} <details class="sample-support-section" bind:this={stageSection} open={view==='process'}><summary>Individual indents · production and actions</summary>{#each detail.pieces.filter((p:any)=>!focusIndent||p.id===focusIndent) as piece (piece.id)}<SamplePiece {piece} {data} merchant={detail.record.merchant_id?detail.record.merchant:''} onchange={refreshDetail} onprint={print} onform={previewForm} onissue={()=>stockForm={company_id:detail.record.company_id,material_id:detail.record.profile.alternate_material_id||detail.record.profile.material_id,indent_id:piece.id,metres:'',reference:''}}/>{:else}<p>{detail.record.profile.intimation==='true'?'Indent numbers are generated after MD approval.':'Production actions are available after approval.'}</p>{/each}
 </details>{/if}
 <details class="sample-support-section request-details" open={view!=='process'}><summary>Request details</summary><div class="details-grid">{#each detailEntries(detail.record.profile) as [key,value]}{#if value&&!['intimation','historical_registered'].includes(key)}<div class:wide={['email_message','special_remarks','finishing_remarks'].includes(key)}><strong>{label(key)}</strong>{#if key==='email_message'&&!intimationOnly}<span class="saved-special-remark">{String(value)}</span>{:else if key==='email_message'}<button class="button secondary" onclick={()=>mailReader={subject:detail.record.profile.email_subject,message:value}}>Read mail</button>{:else}<span>{key.includes('material_id')?material(value):String(value)}</span>{/if}</div>{/if}{/each}</div></details>
 <details class="sample-support-section" open><summary>Requested sizes and colours</summary><div class="table-scroll"><table><thead><tr><th>Size</th><th>Colour</th><th>Pieces</th></tr></thead><tbody>{#each detail.record.variants as v}<tr><td>{v.size||'—'}</td><td>{v.colour||'—'}</td><td>{v.quantity??'—'}</td></tr>{/each}</tbody></table></div></details>
 <details class="sample-support-section"><summary>Review sample BOM ({detail.record.bom.length} components)</summary><div class="table-scroll"><table><thead><tr><th>Group / component</th><th>Reference</th><th>Quantity / unit</th><th>Details</th></tr></thead><tbody>{#each detail.record.bom as b}<tr><td>{b.group} · {b.component}</td><td>{b.reference||'—'}</td><td>{b.quantity||'—'} {b.unit||''}</td><td>{[b.colour,b.size,b.ticket,b.thread_position,b.shade,b.placement,b.remarks].filter(Boolean).join(' · ')}</td></tr>{/each}</tbody></table></div></details>
 {#if detail.record.profile.pending_completion}{@const correction=detail.record.profile.pending_completion}<section class="review" aria-label="Proposed detail correction"><h3>Detail correction awaiting approval</h3><p>Submitted by {correction.submitter} · {new Date(correction.submitted_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST</p>{#if Number(correction.payload.buyer_id)!==detail.record.buyer_id}<p>Buyer: {detail.record.buyer_name} → <strong>{data.buyers.find((b:any)=>b.id===Number(correction.payload.buyer_id))?.name||correction.payload.buyer_id}</strong></p>{/if}<dl class="detail-grid">{#each [...fields.map(f=>f[0]),'source_quantity','email_message'] as key}{#if (correction.payload.profile[key]??'')!==(detail.record.profile[key]??'')}<div><dt>{key==='source_quantity'?'Historical quantity':label(key)}</dt><dd>{detail.record.profile[key]||'Blank'} → <strong>{correction.payload.profile[key]||'Blank'}</strong></dd></div>{/if}{/each}</dl><div class="table-scroll"><table><thead><tr><th>Existing indent</th><th>Proposed size</th><th>Proposed colour</th></tr></thead><tbody>{#each correction.payload.variants as row}<tr><td>{indentReference(detail.pieces.find((p:any)=>p.id===row.id)??row)}</td><td>{row.size||'Blank'}</td><td>{row.colour||'Blank'}</td></tr>{/each}</tbody></table></div>{#if JSON.stringify(correction.payload.bom)!==JSON.stringify(detail.record.bom)}<details><summary>Proposed BOM</summary><div class="table-scroll"><table><thead><tr><th>Group</th><th>Component / reference</th><th>Quantity</th><th>Colour / size</th><th>Thread / shade / placement</th><th>Remarks</th></tr></thead><tbody>{#each correction.payload.bom as b}<tr><td>{b.group}</td><td>{b.component} · {b.reference||''}</td><td>{b.quantity||''}</td><td>{b.colour||''} · {b.size||''}</td><td>{b.ticket||''} · {b.thread_position||''} · {b.shade||''} · {b.placement||''}</td><td>{b.remarks||''}</td></tr>{/each}</tbody></table></div></details>{/if}{#if data.can_approve}<label>Review comment<textarea bind:value={review}></textarea></label><div class="indent-review-actions"><button class="button indent-approve" disabled={busy} onclick={()=>decide('approve_completion')}>Approve detail changes</button><button class="button indent-return" disabled={busy||!review.trim()} onclick={()=>decide('return_completion')}>Return for rework</button></div>{/if}</section>{/if}
 {#if detail.record.status==='Submitted'&&data.can_approve}<div class="review"><label>MD / Super Admin review note<textarea bind:value={review}></textarea></label><div class="indent-review-actions"><button class="button indent-approve" disabled={busy} onclick={()=>decide('approve')}>{detail.record.profile.intimation==='true'?'Approve and generate indents':'Approve indents'}</button><button class="button indent-return" disabled={busy||!review.trim()} onclick={()=>decide('return')}>Return for rework</button></div></div>{/if}
 <details class="sample-support-section"><summary>Documents and images</summary><p>Files remain private to users with access to this request.</p><ul class="sample-document-list">{#each detail.files as f}<li><button type="button" class="text-button" onclick={()=>previewFile=f}>Preview {f.category}: {f.name}</button></li>{:else}<li>No documents uploaded.</li>{/each}</ul>
 {#if detail.record.status!=='Submitted'&&((data.can_edit&&detail.record.status!=='Approved')||detail.record.status==='Approved'&&(data.can_produce||data.can_audit||data.can_pattern||data.can_handover))}<div class="document-upload-row"><label>Document category<select bind:value={category}>{#each ['Buyer email','Buyer specification','Sample to copy','CAD','Labels','Audit sheet','Fabric swatch','Trim card','Sample images','Dispatch','Buyer feedback','Other'] as c}<option>{c}</option>{/each}</select></label><label>Link to indent<select bind:value={fileIndent}><option value="">Whole request</option>{#each detail.pieces as p}<option value={String(p.id)}>{indentReference(p)} · {p.size} · {p.colour}</option>{/each}</select></label><label>Upload files (10 MB each)<input type="file" multiple disabled={busy||data.can_documents===false} onchange={upload} accept=".eml,.pdf,.docx,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.dxf,.zip"/></label><PhoneScanButton label="sample request documents" destination={detail.record.id+':'+category+':'+fileIndent} disabled={busy||data.can_documents===false} onreceive={file=>attachFiles([file],true)}/></div>{/if}
 </details>
{#if view!=='process'} <details class="sample-support-section" bind:this={stageSection} open={view==='process'}><summary>Individual indents · production and actions</summary>{#each detail.pieces.filter((p:any)=>!focusIndent||p.id===focusIndent) as piece (piece.id)}<SamplePiece {piece} {data} merchant={detail.record.merchant_id?detail.record.merchant:''} onchange={refreshDetail} onprint={print} onform={previewForm} onissue={()=>stockForm={company_id:detail.record.company_id,material_id:detail.record.profile.alternate_material_id||detail.record.profile.material_id,indent_id:piece.id,metres:'',reference:''}}/>{:else}<p>{detail.record.profile.intimation==='true'?'Indent numbers are generated after MD approval.':'Production actions are available after approval.'}</p>{/each}
 </details>{/if}
 <details class="sample-support-section"><summary>Fabric issues</summary>{#each detail.issues as i}<p><strong>SDC-{String(i.id).padStart(7,'0')}</strong> · Indent {indentReference(detail.pieces.find((p:any)=>p.id===i.indent_id)??{id:i.indent_id})} · {i.code} · {Math.abs(Number(i.metres))} m</p>{:else}<p>No fabric issues recorded.</p>{/each}
 </details>
 <details class="sample-support-section"><summary>History</summary>{#each detail.history as h}<p>{new Date(h.created_at).toLocaleString()} · {h.actor} · {h.action}</p>{/each}</details>
 </div></div></div>
{/if}
{#if stockForm}<div class="sample-overlay top"><div role="dialog" aria-modal="true" aria-label="Sample fabric stock" tabindex="-1" class="sample-dialog small" use:enter><h2>{stockForm.indent_id?'Issue fabric · '+indentReference(detail?.pieces.find((p:any)=>p.id===stockForm.indent_id)??{id:stockForm.indent_id}):'Receive sample fabric'}</h2>{#if error}<p class="form-error" role="alert">{error}</p>{/if}<label>Fabric<select bind:value={stockForm.material_id}><option value="">Select…</option>{#each data.materials.filter((m:any)=>m.company_id===Number(stockForm.company_id)) as m}<option value={m.id}>{m.code}</option>{/each}</select></label><label>Metres<input type="number" min="0.001" step="0.001" bind:value={stockForm.metres}/></label>{#if !stockForm.indent_id}<label>Receipt / DC reference<input bind:value={stockForm.reference}/></label>{/if}<footer><button class="button primary" disabled={busy} onclick={stockSave}>Save stock movement</button><button class="button secondary" disabled={busy} onclick={()=>stockForm=null}>Cancel</button></footer></div></div>{/if}
{#if detail}<div class="sample-print" aria-hidden="true">{#if printMode==='indent'}{#each printPieces as piece}<section class="print-sheet"><header><img src="/logo.png" alt="Euro Suits"/><div><h1>EURO SUITS · SAMPLE REQUEST</h1><h2>Indent {indentReference(piece)} · {piece.size} · {piece.colour}</h2><p>SR-{detail.record.id} · {companies.find(c=>c.id===detail.record.company_id)?.name} · {piece.status}</p><p>Buyer: {detail.record.buyer_name} · Merchant: {detail.record.merchant}{#if detail.record.profile.legacy_indent_number} · Original Excel indent: {detail.record.profile.legacy_indent_number}{/if}</p></div></header><div class="print-fields">{#each fields as [key,title]}{#if detail.record.profile[key]}<div><strong>{title}</strong> {key.includes('material_id')?material(detail.record.profile[key]):detail.record.profile[key]}</div>{/if}{/each}</div><h3>Sample BOM</h3><table><thead><tr><th>Group / component</th><th>Reference</th><th>Qty / unit</th><th>Colour / size / thread / remarks</th></tr></thead><tbody>{#each detail.record.bom as b}<tr><td>{b.group} / {b.component}</td><td>{b.reference||''}</td><td>{b.quantity||''} {b.unit||''}</td><td>{[b.colour,b.size,b.ticket,b.thread_position,b.shade,b.placement,b.remarks].filter(Boolean).join(' · ')}</td></tr>{/each}</tbody></table><p>{#each detail.issues.filter((i:any)=>i.indent_id===piece.id) as issue}DC: SDC-{String(issue.id).padStart(7,'0')} · {issue.code} · {Math.abs(Number(issue.metres))} m {/each}</p><h3>Production, audit and handover</h3><div class="print-fields">{#each Object.entries(piece.production) as [k,v]}{#if v&&k!=='audit_reports'}<div><strong>{label(k)}</strong> {String(v)}</div>{/if}{/each}</div></section>{/each}{:else if printMode==='audit'||printMode==='dispatch'}{#each printPieces as piece}<SampleReports {piece} record={detail.record} kind={printMode} {material}/>{/each}{:else}{#each layoutPages as boxes,index}<section class="print-sheet"><h1>EURO SUITS · SAMPLE LAYOUT</h1><p>SR-{detail.record.id} · {detail.record.profile.buyer_style} · EST {detail.record.profile.est} · Page {index+1}</p><div class="swatch-grid">{#each Array.from({length:6}) as _,i}<div><strong>{boxes[i]?.group||''} · {boxes[i]?.component||'Swatch'}</strong><p>Reference: {boxes[i]?.reference||''}</p><p>Colour: {boxes[i]?.colour||''} · Qty: {boxes[i]?.quantity||''}</p><small>Attach swatch here</small></div>{/each}</div></section>{/each}{/if}</div>{/if}
{#if mailReader}<dialog class="mail-reader" aria-labelledby="mail-reader-title" use:showMail onclose={()=>mailReader=null}><header><h2 id="mail-reader-title">{mailReader.subject||'Buyer email'}</h2><button class="button secondary" onclick={()=>mailReader=null}>Close mail</button></header><pre>{mailReader.message}</pre></dialog>{/if}
{#if inlineHelp}<SpoolyHelp context={'Sampling '+view} onclose={()=>{inlineHelp=false;document.querySelector<HTMLButtonElement>('[data-inline-spooly]')?.focus()}}/>{/if}

<style>
 .sample-dialog.ux-dialog>footer .indent-form-summary{margin:0 auto 0 0;align-self:center;font-size:13px;color:#42566a}


 .sample-detail-loading{position:fixed;inset:24px;margin:auto;width:min(1040px,calc(100vw - 48px));max-height:calc(100dvh - 48px);overflow:auto;padding:0;border:1px solid #c9d6df;border-radius:16px;background:#fff;color:#172c40;box-shadow:0 20px 60px #132a3a33}.sample-detail-loading::backdrop{background:#132a3a80;backdrop-filter:blur(3px)}.sample-detail-loading>header{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#162d40;color:#fff;padding:12px 20px}.sample-detail-loading>header h2{color:#fff!important;font-size:18px;margin:0}.sample-detail-loading__body{padding:20px}

 .sample-approval-queue{margin-bottom:20px}.approval-heading{padding:12px 16px}.approval-heading h3{margin:0;font-size:16px}.approval-heading p{margin:6px 0 0;font-size:13px}
 .sample-dialog .detail-grid dd,.sample-dialog .detail-grid dd strong{font-size:14px;font-weight:600;line-height:1.5;color:#111}

 .detail-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:12px 0}.detail-grid div{min-width:0}.detail-grid dt{font-size:12px;font-weight:600;color:#374151}.detail-grid dd{margin:4px 0 0;white-space:pre-wrap;overflow-wrap:anywhere;color:#111}

 .field-error :is(input,select,textarea){border:2px solid #b42318!important;background:#fff5f4!important;outline-color:#b42318!important}
 .field-error-message{color:#a11b13!important;font-size:12px;font-weight:600}

 .sample-dialog.ux-dialog .wide>h3{margin:8px 0 6px}.sample-dialog.ux-dialog .wide>p{margin:4px 0 8px;font-size:12px}.sample-dialog.ux-dialog .form-grid{row-gap:8px}.sample-dialog.ux-dialog :is(input,select,textarea),.sample-dialog.sample-detail-dialog :is(input,select,textarea){background:#f6f8fa;color:#172f40;border-color:#d5dde5;border-radius:8px}.sample-dialog.ux-dialog input[readonly]{background:#eef3f7}

 .sample-dialog.ux-dialog :is(input,select,textarea,button),.sample-dialog.ux-dialog h2,.sample-dialog.sample-detail-dialog :is(h2,h3,input,select,textarea,button){font-family:inherit}

 /* Compact desktop request surfaces, using the system SF face on Apple platforms. */
 .sample-dialog.ux-dialog .request-field-section{grid-column:1/-1;margin:0;padding-top:8px;border-top:1px solid #e2e8ee}.request-field-section>summary{margin:0;min-height:36px;padding:4px 0;font-size:15px;color:#203d50}.request-field-section[open]>.request-section-grid{padding-top:8px}.request-section-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px 16px}.form-grid:has(>.request-field-section){grid-template-columns:repeat(2,minmax(0,1fr))!important}.sample-dialog.ux-dialog{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",sans-serif;border:1px solid #dce3e9;border-radius:16px!important}.sample-dialog.ux-dialog .form-grid{gap:12px 16px}.sample-dialog.ux-dialog .sample-upload-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:12px 0}.sample-dialog.sample-detail-dialog{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",sans-serif;background:#fff;border:1px solid #dce3e9;border-radius:16px;padding:16px;max-width:1400px;max-height:calc(100dvh - 32px)}.sample-dialog.sample-detail-dialog>header{top:-16px;margin:-16px -16px 12px;padding:10px 16px}.sample-dialog.sample-detail-dialog p{margin:6px 0;font-size:13px}.sample-detail-toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:8px 0 12px}.sample-detail-toolbar>p{color:#435568;font-size:12px}.sample-detail-toolbar .actions{justify-content:flex-end;gap:8px;flex-shrink:0}.sample-detail-toolbar button{min-height:44px;padding:8px 12px;font-size:12px;white-space:nowrap}.sample-dialog.sample-detail-dialog .details-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:10px 16px;margin:10px 0}.sample-dialog.sample-detail-dialog .details-grid strong{font-size:11px;line-height:1.4;font-weight:500;letter-spacing:.04em;color:#526170;margin-bottom:3px;text-transform:uppercase}.sample-dialog.sample-detail-dialog .details-grid span{font-size:13px;line-height:1.5;font-weight:600;color:#172f40}.sample-dialog.sample-detail-dialog th,.sample-dialog.sample-detail-dialog td{padding:7px 10px;font-size:13px}.sample-dialog.sample-detail-dialog details{margin:10px 0}.sample-dialog.sample-detail-dialog summary{min-height:36px;padding:7px 0;font-size:13px}.document-upload-row{display:flex;align-items:flex-end;gap:12px;margin:10px 0}.document-upload-row label{flex:1;min-width:0;font-size:12px;gap:5px}.document-upload-row label:last-child{flex:1.4}.document-upload-row input,.document-upload-row select{font:inherit;min-height:44px;padding:8px}.sample-document-list{display:flex;flex-wrap:wrap;gap:6px 12px;list-style:none;padding:0;margin:8px 0}.sample-document-list button{padding:6px 0;min-height:44px}.sample-dialog.sample-detail-dialog .review{margin:12px 0;padding:12px}.sample-dialog.sample-detail-dialog .review button{margin-top:8px}

 .mail-reader{padding:0;border:1px solid #b9c8d1;border-radius:10px;width:min(1100px,calc(100vw - 48px));max-height:calc(100dvh - 48px);background:#fff;color:#111}.mail-reader::backdrop{background:#102636aa}.mail-reader header{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:16px 20px;background:#132b40;color:#fff;position:sticky;top:0}.mail-reader h2{margin:0;color:white;overflow-wrap:anywhere}.mail-reader pre{white-space:pre-wrap;overflow-wrap:anywhere;font-family:inherit;font-size:15px;line-height:1.65;margin:0;padding:20px;min-height:220px}

 .sample-upload-group{min-width:0}.sample-upload-group>button{display:block;margin-top:8px;overflow-wrap:anywhere}.ux-dialog__body small{color:#374151}
 .sample-upload-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin:20px 0}
 @media(min-width:1024px){.sample-overlay:has(.ux-dialog){padding:12px}.sample-dialog.ux-dialog{max-width:none;width:100%;height:calc(100dvh - 24px);max-height:none;padding:0;display:flex;flex-direction:column;overflow:hidden;border-radius:10px;background:#fff}.sample-dialog.ux-dialog>header{position:static;flex-shrink:0;margin:0;padding:14px 20px}.sample-dialog.ux-dialog>.ux-dialog__body{overflow:auto;padding:16px 20px;flex:1;min-height:0}.sample-dialog.ux-dialog>footer{padding:12px 20px;margin:0;border-top:1px solid #ced8de;background:#fff;flex-shrink:0}.sample-dialog.ux-dialog .form-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:12px 16px}}

 .sample-tabs{display:flex;gap:4px;flex-wrap:wrap;width:fit-content;max-width:100%;padding:4px;background:#f1f3f5;border:1px solid #e3e7ec;border-radius:12px;margin:16px 0}.sample-tabs .button{min-height:44px;padding:8px 14px;border:0;border-radius:8px;font-size:13px;font-weight:500;background:transparent;color:#526170;box-shadow:none}.sample-tabs .button:hover{background:#e7ecef;color:#243d4c}.sample-tabs .button.primary{background:#fff;color:#075e5a;box-shadow:0 1px 3px #162c4012}.sop li{margin:14px 0;line-height:1.7}
 .sample-merchant-assignment{display:flex;gap:12px;align-items:end;flex-wrap:wrap;margin:12px 0}.sample-merchant-assignment>strong{flex:1}.sample-merchant-assignment label{min-width:220px}
 .samples{background:#fff;border:1px solid #c5d3da;border-radius:14px;padding:24px}.samples header,.sample-dialog header{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:20px}h2{font-size:22px}h3{margin:24px 0 12px}p{line-height:1.5}.actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.table-scroll{overflow:auto}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:12px;border-bottom:1px solid #ccd8dd}small{display:block}label{display:flex;flex-direction:column;gap:7px;font-size:14px;font-weight:700;color:#10202b}input,select,textarea{width:100%;background:#eff5fa;color:#101820;border:1px solid #aebfc9;border-radius:7px;min-height:42px;padding:10px;font-size:14px;font-weight:600}textarea{resize:vertical}input[readonly]{background:#e4eefc}select{background:#f2eafb}.option-line select{background:#e6f4eb}.sample-overlay{position:fixed;inset:0;z-index:120;background:#10263699;display:grid;place-items:center;padding:22px}.sample-dialog{background:#eaf2ee;color:#14222c;max-width:1180px;width:100%;max-height:92vh;overflow:auto;padding:28px;border-radius:16px;box-shadow:0 20px 80px #0004;font-size:14px}.sample-dialog>header{position:sticky;top:-28px;z-index:5;background:#132b40;color:#fff;margin:-28px -28px 20px;padding:14px 28px;border-bottom:1px solid #bccdc5;align-items:center}.sample-dialog>header h2{color:#fff;font-size:18px;margin:0}.form-grid,.details-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.wide{grid-column:1/-1}.option-line{display:flex;gap:6px}.variant{display:flex;align-items:end;gap:12px;margin:16px 0}.variant label{flex:1}.bom-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;border:1px solid #b9cdc1;border-radius:10px;padding:16px;margin:14px 0;background:#f7faf8}.inline-editor,.review{padding:18px;border:2px solid #36857a;margin:20px 0;background:#f5faf8;border-radius:10px}.inline-editor button,.review button{margin:10px 8px 0 0}footer{display:flex;gap:12px;justify-content:flex-end;padding-top:24px}.details-grid{margin:18px 0}.details-grid strong,.details-grid span{display:block;overflow-wrap:anywhere;white-space:pre-wrap}.details-grid strong{font-size:12px;text-transform:uppercase;margin-bottom:5px}details{margin-top:20px}summary{cursor:pointer;font-weight:700}.small{max-width:540px}.small label{margin:16px 0}.top{z-index:130}.sample-print{display:none}@media(max-width:760px){.sample-overlay{padding:6px}.sample-dialog{padding:18px}.sample-dialog>header{top:-18px;margin:-18px -18px 18px;padding:12px 18px}.form-grid,.details-grid{grid-template-columns:1fr}.bom-row{grid-template-columns:repeat(2,minmax(0,1fr))}.variant{flex-wrap:wrap}.variant label{min-width:120px}.samples header{flex-direction:column}}
 @page{size:A4;margin:8mm}@media print{:global(body *){visibility:hidden!important}:global(.sample-print),:global(.sample-print *){visibility:visible!important}.sample-print{display:block;position:absolute;top:0;left:0;width:100%;background:#fff;color:#000;font-size:10px}.print-sheet{break-after:page;padding:0;min-height:0}.print-sheet:last-child{break-after:auto}.print-sheet header{display:flex;gap:14px;border-bottom:2px solid #000}.print-sheet img{width:55px;height:55px;object-fit:contain}.print-sheet h1{font-size:18px}.print-sheet h2{font-size:15px}.print-fields{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin:12px 0;overflow-wrap:anywhere}.print-sheet th,.print-sheet td{padding:4px;border:1px solid #888;font-size:9px}.print-sheet tr{break-inside:avoid}.swatch-grid{display:grid;grid-template-columns:1fr 1fr;gap:8mm}.swatch-grid>div{height:70mm;border:1px solid #333;padding:6mm}.swatch-grid small{margin-top:20mm;color:#555}}

 /* Draft detail reference: fixed dark action bar, compact five-column facts and scrollable body. */
 .sample-dialog.sample-detail-dialog{width:min(1000px,calc(100vw - 48px));max-width:1000px;max-height:90dvh;padding:0;display:flex;flex-direction:column;overflow:hidden}.sample-dialog.sample-detail-dialog>header{position:static;flex-shrink:0;margin:0;padding:12px 24px;align-items:center;gap:16px;background:#1e293b}.sample-dialog.sample-detail-dialog>header h2{font-size:16px!important;line-height:1.35;letter-spacing:-.02em;min-width:0;overflow-wrap:anywhere}.detail-header-actions{display:flex;align-items:center;gap:8px;flex-shrink:0}.detail-header-actions button{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:6px 10px;font-size:12px;white-space:nowrap;border-radius:8px}.detail-header-actions .secondary{background:#233c50;color:#fff;border-color:#456176}.detail-header-actions .primary{background:#087f83;color:#fff;border-color:#087f83}.header-divider{width:1px;height:20px;background:#456176;margin-inline:2px}.sample-detail-body{overflow-y:auto;min-height:0;flex:1;padding:24px 28px}.sample-detail-toolbar{margin:0 0 12px}.sample-detail-toolbar>p{font-size:12px;color:#526170;margin:0}.sample-detail-toolbar strong{color:#354b5c}.sample-dialog.sample-detail-dialog .details-grid{grid-template-columns:repeat(5,minmax(0,1fr));gap:20px 16px;padding-left:4px;margin:12px 0}.sample-dialog.sample-detail-dialog .details-grid strong{font-size:10px;margin-bottom:3px;font-weight:600}.sample-dialog.sample-detail-dialog .details-grid span{font-size:13px;line-height:1.45}.sample-dialog.sample-detail-dialog .details-grid>.wide{padding:14px 16px;background:#f7f9fb;border:1px solid #e6ecf1;border-radius:12px;margin-top:2px}.sample-dialog.sample-detail-dialog .details-grid>.wide span{font-size:12px;font-weight:400;line-height:1.6}.sample-dialog.sample-detail-dialog .table-scroll{border:1px solid #dce3e9;border-radius:12px}.sample-dialog.sample-detail-dialog th{background:#f7f9fb}.sample-dialog.sample-detail-dialog details{margin:8px 0}.sample-detail-body>details{border-bottom:1px solid #e8edf2;padding-bottom:8px}.sample-dialog.sample-detail-dialog .document-upload-row{padding:12px;background:#f7f9fb;border:1px solid #e3e9ef;border-radius:12px;gap:12px}.sample-dialog.sample-detail-dialog .document-upload-row :is(input,select){background:#fff}.document-upload-row input::file-selector-button{border:0;border-radius:6px;padding:6px 8px;background:#eaf6f2;color:#075e5a;font:inherit;font-size:11px;margin-right:8px;cursor:pointer}
 /* Request register: reference layout with real ERP statuses and source indent provenance. */
 .sample-request-register{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",sans-serif;border:1px solid #e0e5eb;border-radius:16px;overflow:hidden;background:#fff;color:#17212f}.request-list-controls{padding:12px 20px;border-bottom:1px solid #edf0f3}.request-search{position:relative;max-width:448px;margin:0}.request-search__label{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}.request-search :global(svg){position:absolute;left:12px;top:14px;color:#526170;pointer-events:none}.request-search input{height:44px;min-height:44px;padding:8px 12px 8px 36px;background:#f8f9fb;border:1px solid #d7dee5;border-radius:8px;font-size:14px;font-weight:400;color:#17212f}.request-search input::placeholder{color:#596675;opacity:1}.request-search input:focus-visible{outline:2px solid #087f83;outline-offset:2px}.request-list{min-width:900px;table-layout:auto;font-size:14px;font-variant-numeric:tabular-nums}.request-list th{padding:12px 20px;border-bottom:1px solid #e0e5eb;background:#fff;color:#596675;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}.request-list td{padding:10px 20px;border-bottom:1px solid #edf0f3;vertical-align:middle;color:#253343;line-height:1.45}.request-list tbody tr:last-child td{border-bottom:0}.request-list tbody tr{transition:background-color 140ms ease}.request-list tbody tr:hover{background:#f8fafb}.request-list td:first-child,.request-list td:nth-child(3),.request-list td:nth-child(n+5){white-space:nowrap}.request-list strong{font-size:14px;font-weight:600;color:#17212f}.request-list small{font-size:12px;color:#596675;margin-top:2px;line-height:1.4;overflow-wrap:anywhere}.request-list td:nth-child(2){min-width:180px}.request-list td:nth-child(4){min-width:150px}.request-status{display:inline-flex;align-items:center;padding:3px 8px;border:1px solid #e1e5eb;border-radius:6px;font-size:12px;font-weight:600;line-height:1.4;background:#f3f4f6;color:#485566}.request-status--submitted{color:#985000;background:#fffbeb;border-color:#f4d88b}.request-status--approved{color:#096b60;background:#effaf6;border-color:#b9e3d8}.request-open{display:inline-flex;align-items:center;justify-content:center;min-height:44px;min-width:68px;padding:6px 12px;border:1px solid #bfe8e2;border-radius:8px;background:#effbf8;color:#076d65;font:inherit;font-size:13px;font-weight:600;white-space:nowrap;cursor:pointer;transition:background-color 140ms ease}.request-open:hover{background:#d9f5ee}.request-open:focus-visible,.sample-tabs button:focus-visible{outline:2px solid #087f83;outline-offset:2px}.request-open:disabled{opacity:.55;cursor:wait}@media(prefers-reduced-motion:reduce){.request-open,.request-list tbody tr{transition:none}}@media(prefers-contrast:more){.request-list th,.request-list small{color:#253343}.request-status,.request-open{border-color:currentColor}}
 .sample-form-actions{display:flex;gap:12px;align-items:end;flex-wrap:wrap;margin:12px 0 4px}.sample-form-actions label{flex:1;min-width:200px;font-size:12px}.sample-form-actions button{min-height:44px;white-space:nowrap}.sample-dialog.sample-detail-dialog .sample-form-help{font-size:12px;color:#526170;margin:4px 0 12px}.historical-note{padding:8px 12px;border:1px solid #c9ded9;background:#f2f8f6;border-radius:8px;color:#234c45}

 [data-tone="draft"]{--status-fill:#eef6ff;--status-hover:#e5f0fe;--status-ink:#234c7d;--status-line:#bcd3ee}
 [data-tone="pending"]{--status-fill:#fff5d9;--status-hover:#ffefc3;--status-ink:#764300;--status-line:#e9ca7c}
 [data-tone="rework"]{--status-fill:#fff0ef;--status-hover:#fde6e3;--status-ink:#8c292a;--status-line:#edc0bd}
 .request-list tbody tr[data-tone]{background:var(--status-fill,#fff)}
 .request-list tbody tr[data-tone]:hover{background:var(--status-hover,#f8fafb)}
 .request-list tr[data-tone] td{border-bottom-color:var(--status-line,#edf0f3)}
 .request-status--draft,.request-status--pending,.request-status--rework{color:var(--status-ink);background:var(--status-fill);border-color:var(--status-line)}
 .request-indents{margin:0}
 .indent-disclosure{display:flex;align-items:center;gap:8px;min-height:44px;padding:0;border:0;background:transparent;font:inherit;text-align:left;cursor:pointer}
 .indent-disclosure span{display:inline-flex;align-items:center;gap:3px;color:#075e59;font-size:12px;font-weight:650}
 .indent-disclosure[aria-expanded="true"] :global(svg){transform:rotate(180deg)}
 .request-indents ul{list-style:none;display:flex;flex-wrap:wrap;gap:4px;max-width:310px;max-height:156px;overflow-y:auto;padding:0;margin:0 0 4px}
 .request-indents ul[hidden]{display:none}
 .indent-link{min-height:44px;display:inline-flex;align-items:center;padding:0 6px;background:transparent;border:0;border-radius:5px;color:#075e59;font:inherit;font-weight:700;text-decoration:underline;text-underline-offset:3px;cursor:pointer}
 .indent-link:hover{background:#fff}
 .indent-link:focus-visible,.indent-disclosure:focus-visible{outline:2px solid #087f83;outline-offset:2px}
 .reserved-indent-panel{display:flex;align-items:end;flex-wrap:wrap;gap:12px;background:var(--status-fill,#f7f9fb);border:1px solid var(--status-line,#dce3e9);border-radius:12px;padding:12px 16px;margin-bottom:16px}
 .reserved-indent-panel>.request-status{align-self:center}
 .reserved-indent-panel label{flex:0 1 200px}
 .reserved-indent-panel p{margin:0;min-height:42px;display:flex;align-items:center}
 .indent-review-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
 .indent-review-actions .button{min-height:44px;color:#fff}
 .indent-review-actions .indent-approve{background:#166534;border-color:#166534}
 .indent-review-actions .indent-approve:hover:enabled{background:#10542b}
 .indent-review-actions .indent-return{background:#a1242c;border-color:#a1242c}
 .indent-review-actions .indent-return:hover:enabled{background:#881c25}
 .indent-review-actions .indent-return:disabled{background:#f8e1e0!important;color:#8a232a!important;border-color:#edc0bd!important}

 /* Indent detail reference: one stable header, tightly grouped facts and supporting disclosures. */
 .sample-dialog.sample-detail-dialog .sample-detail-toolbar{gap:12px;flex-wrap:wrap;margin:0 0 24px}.sample-dialog.sample-detail-dialog .sample-detail-toolbar>p{font-size:12px;line-height:1.5;flex:1;min-width:250px}.sample-dialog.sample-detail-dialog .sample-detail-toolbar .actions{gap:8px}.sample-dialog.sample-detail-dialog .sample-detail-toolbar button{padding:8px 12px;border-radius:12px}.sample-dialog.sample-detail-dialog .sample-form-actions{margin:0;gap:12px;align-items:end;flex-wrap:wrap}.sample-dialog.sample-detail-dialog .sample-form-actions label{font-size:13px;gap:10px;min-width:0}.sample-dialog.sample-detail-dialog .sample-form-actions :is(select,button){min-height:44px;padding:8px 12px;border:1px solid #ccd5de;border-radius:12px;background:#fff;font-size:12px;color:#203247}.sample-dialog.sample-detail-dialog .sample-form-help{margin:8px 0 24px;line-height:1.5}.sample-dialog.sample-detail-dialog .historical-note{padding:10px 16px;border:1px solid #d3e8df;border-radius:12px;background:#f2faf6;color:#226049;margin:0 0 12px;font-size:13px}.sample-dialog.sample-detail-dialog .details-grid strong{font-weight:600;color:#526170;letter-spacing:.04em}.sample-dialog.sample-detail-dialog .details-grid span{color:#17212f;font-weight:600}.sample-dialog.sample-detail-dialog .details-grid>.wide span{font-weight:400;color:#435568}.sample-dialog.sample-detail-dialog th,.sample-dialog.sample-detail-dialog td{padding:9px 14px;font-size:12px}.sample-dialog.sample-detail-dialog .sample-support-section{margin:14px 0 0;border:0;padding:0}.sample-dialog.sample-detail-dialog summary{font-size:13px;min-height:36px;padding:8px 0;color:#203247}.sample-dialog.sample-detail-dialog .sample-detail-body>details:first-of-type{margin-top:20px}.sample-dialog.sample-detail-dialog .detail-header-actions .secondary{background:#ffffff12;border-color:#ffffff24;color:#fff}.sample-dialog.sample-detail-dialog .detail-header-actions .secondary:hover{background:#ffffff24}.sample-dialog.sample-detail-dialog .header-divider{display:none}
 /* Sample View typography and disclosure spacing follow the supplied reference. */
 .sample-dialog.sample-detail-dialog .sample-detail-body{color:#162638;font-weight:600}
 .sample-dialog.sample-detail-dialog>header{background:#1a2634}
 .sample-dialog.sample-detail-dialog>header h2{font-weight:750}
 .sample-dialog.sample-detail-dialog .sample-detail-toolbar>p,
 .sample-dialog.sample-detail-dialog .sample-form-help{color:#26374a;font-size:13px}
 .sample-dialog.sample-detail-dialog .sample-form-actions label{min-width:min(240px,100%)}
 .sample-dialog.sample-detail-dialog .sample-form-actions :is(select,button),
 .sample-dialog.sample-detail-dialog button{font-weight:700}
 .sample-dialog.sample-detail-dialog .sample-merchant-assignment{padding-top:12px;border-top:1px solid #e5eaf0}
 .sample-dialog.sample-detail-dialog .sample-detail-body>.sample-support-section{padding-bottom:12px;border-bottom:1px solid #e5eaf0}
 .sample-dialog.sample-detail-dialog .sample-detail-body>.sample-support-section:last-child{border-bottom:0}
 .sample-dialog.sample-detail-dialog summary{color:#162638;font-weight:750}
 .sample-dialog.sample-detail-dialog .details-grid{grid-template-columns:repeat(6,minmax(0,1fr));gap:14px 18px}
 .sample-dialog.sample-detail-dialog .details-grid strong{color:#304357;font-weight:750}
 .sample-dialog.sample-detail-dialog .details-grid span{color:#172536;font-weight:650;overflow-wrap:anywhere}
 .sample-dialog.sample-detail-dialog .details-grid>.wide{padding:12px;border:1px solid #e0e7ef;border-radius:12px;background:#f8fafc}
 .sample-dialog.sample-detail-dialog .details-grid>.wide span{color:#25394c;font-weight:600}
 .sample-dialog.sample-detail-dialog .details-grid>.wide .saved-special-remark{font-weight:700;white-space:pre-wrap}
 .sample-dialog.sample-detail-dialog :is(th,td){color:#223649;font-weight:650}
 .sample-dialog.sample-detail-dialog .historical-note p{margin-bottom:0}
 .sample-dialog.sample-detail-dialog .document-upload-row{padding:12px;border:1px solid #e0e7ef;border-radius:12px;background:#f8fafc}
 @media(max-width:880px){.sample-dialog.sample-detail-dialog .details-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
 @media(max-width:620px){.sample-dialog.sample-detail-dialog .details-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.sample-dialog.sample-detail-dialog .document-upload-row{flex-wrap:wrap}}
 /* Selected sampling view must retain contrast through shared primary-button rules. */
 .sample-tabs button[aria-current="page"]{background:#08746f!important;color:#fff!important}
 @media(min-width:1024px){
  .sample-dialog.ux-dialog{width:min(100%,1200px);border-radius:16px}
  .sample-dialog.ux-dialog>header{background:#0c242b}
  .sample-dialog.ux-dialog .sample-upload-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
 }
 @media(min-width:1024px){
  .sample-overlay.intimation-overlay{padding:20px;background:#142b4052;backdrop-filter:blur(3px)}
  .sample-dialog.ux-dialog.intimation-dialog{box-sizing:border-box;width:min(100%,1040px);height:auto;max-height:min(92dvh,calc(100dvh - 40px))}
  .intimation-dialog>header,.intimation-dialog>footer{align-items:center}
  .intimation-dialog>footer{flex-wrap:wrap}
  .intimation-dialog .editor-heading{display:flex;align-items:center;gap:12px}
  .intimation-dialog .editor-heading :global(svg){color:#e0f1ed;flex:none}
  .intimation-dialog .ux-dialog__body{min-width:0;scrollbar-color:#c3ced9 transparent;scrollbar-width:thin}
  .intimation-dialog .editor-layout{display:grid;gap:16px;align-items:start}
  .sample-dialog.ux-dialog.intimation-dialog .form-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
  .intimation-dialog [data-field="email_subject"]{grid-column:1/-1}
  .intimation-dialog label{min-width:0;font-size:13px;gap:6px}
  .intimation-dialog :is(input,select,textarea,button){box-sizing:border-box;min-height:44px}
  .intimation-dialog .option-line select{min-width:0}
  .intimation-dialog .option-line button{flex:none}
  .intimation-dialog .intimation-variants{padding:12px;border:1px solid #dce3eb;border-radius:12px;background:#f7f9fb}
  .sample-dialog.ux-dialog.intimation-dialog .intimation-variants>h3{margin:0 0 4px;font-size:16px}
  .intimation-dialog .variant{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(80px,.65fr) auto;gap:8px;margin:8px 0}
  .intimation-dialog .variant>button{align-self:end}
  .intimation-dialog .intimation-communication{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:16px;align-items:start}
  .sample-dialog.ux-dialog.intimation-dialog .sample-upload-grid{grid-template-columns:minmax(0,1fr);margin:0}
  .intimation-dialog .intimation-communication textarea{min-height:132px}
 }
 @media(max-width:1023px){
  .intimation-dialog .sample-upload-grid{grid-template-columns:minmax(0,1fr)}
  .intimation-dialog .editor-heading{display:flex;gap:8px;align-items:center}
 }
 @media(max-width:650px){
  .sample-dialog.sample-detail-dialog>header{align-items:flex-start;flex-direction:column;gap:8px;padding:12px 16px}
  .detail-header-actions{flex-wrap:wrap}
 }
</style>
