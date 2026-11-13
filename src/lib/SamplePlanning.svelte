<script lang="ts">
 import SamplePlanLedger from './SamplePlanLedger.svelte';
 import {indentReference} from './sampleProcess';
 import {untrack} from 'svelte';
 import {ArrowDown,ArrowUp,Download,X} from '@lucide/svelte';
 import {enter} from './motion';
 import {api} from './api';
 let {company,view,onopen,revision=0,canPlan=false,onfrozen}:{company:string;view:string;onopen:(id:number,indent?:number)=>void;revision:number;canPlan:boolean;onfrozen?:()=>void}=$props();
 let result:any=$state(null),search=$state(''),stage=$state(''),page=$state(1),busy=$state(false),error=$state(''),appliedQuery=$state(''),exporting=$state(false),generation=0;
 let from=$state(''),to=$state(''),group=$state(''),resource=$state(''),brand=$state(''),fit=$state(''),caps:any=$state([]),selection:any[]=$state([]),start=$state(new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'})),target=$state(''),preview:any=$state(null),dragIndex=-1;
 let editPlan:any=$state(null),planRevision=$state(0),notice=$state(''),freezeDeadline=$state('');
 let previewTrigger=$state<HTMLButtonElement>();
 const missingQuantities=$derived(selection.filter(row=>row.profile.source_quantity===''||row.profile.source_quantity===null));
 const stages=['Ready','Pattern ready','Cut','Allocated','Sewing','Sewn','Finishing','Awaiting audit','Audit','Approved','Rework','Rejected','With merchant','Showroom','Handed over'];
 const cols=[['request_date','Issue date'],['product','Product'],['brand','Brand'],['pattern_status','Pattern type'],['sample_type','Sample type'],['buyer_po','PO'],['est','Euro style'],['fit','Block / fit'],['spec_reference','Specification'],['buyer_required_date','Required date'],['plan_date','Plan date']];
 const prodCols=[['file_clearance','File clearance'],['fabric_update_date','Fabric ready'],['trims_update_date','Trims ready'],['pattern_plan_date','Pattern plan'],['pattern_actual','Pattern actual'],['cut_actual','Cut'],['allocation_actual','Allocation'],['sample_maker','Sample tailor'],['sewing_plan_date','Sewing plan'],['sewing','Sewing'],['finishing','Finishing'],['audit','Audit'],['audited_by','Auditor'],['merchant_actual','Merchant / showroom handover'],['handover_actual','Final handover'],['awb','AWB / shipment'],['audit_result','Pass / fail'],['buyer_result','Buyer pass / fail'],['buyer_comments','Buyer comments'],['readiness_note','Remarks']];
 async function load(){
  const n=++generation;
  const query=new URLSearchParams({company,view,search,stage,page:String(page),from,to,resource,group,brand,fit,unplanned:String(view==='plan')}).toString();
  busy=true;error='';
  try{
   const r=await api('/sample-planning?'+query);
   if(n===generation){result=r;appliedQuery=query;caps=(await api('/sample-capacities')).records.filter((c:any)=>String(c.company_id)===company)}
  }catch(e){if(n===generation)error=(e as Error).message}
  finally{if(n===generation)busy=false}
 }
 async function exportRegister(){
  if(exporting||busy||!appliedQuery||!result?.total)return;
  const scope=company;
  const query=new URLSearchParams(appliedQuery);
  query.delete('page');query.set('format','xlsx');
  exporting=true;error='';
  try{
   const response=await fetch('/api/sample-planning?'+query,{cache:'no-store'});
   if(!response.ok||!response.headers.get('content-type')?.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')){
    const problem=await response.json().catch(()=>null);
    throw new Error(problem?.error||'The Excel file could not be downloaded. Try again.');
   }
   const blob=await response.blob();
   if(company!==scope)return;
   const disposition=response.headers.get('content-disposition')??'';
   const filename=disposition.match(/(?:^|;)\s*filename="(SMR \d{2}-\d{2}-\d{2} - \d{1,2}\.\d{2}(?:AM|PM)\.xlsx|SMR_\d{8}_\d{6}_IST\.xlsx)"(?:;|$)/i)?.[1]??'sample-master-register.xlsx';
   const url=URL.createObjectURL(blob);
   const link=document.createElement('a');
   link.href=url;link.download=filename;link.click();
   setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(e){if(company===scope)error=(e as Error).message}
  finally{exporting=false}
 }
 $effect(()=>{company;view;revision;untrack(()=>{appliedQuery='';page=1;search='';stage='';resource='';selection=[];preview=null;editPlan=null;notice='';target='';load()})});
 function stageText(r:any,k:string){const p=r.production;if(['sewing','finishing','audit'].includes(k)){if(p[k+'_actual']&&!(r.status==='Rework'&&k==='sewing'))return (k==='audit'?p.audit_result+' · ':'Completed · ')+day(p[k+'_actual']);if(p[k+'_started'])return 'In progress · '+day(p[k+'_started']);return 'Pending'}return k.endsWith('_actual')||k.endsWith('_started')?day(p[k]):p[k]||'—'}
 function tone(r:any,k:string){const p=r.production;if(r.status==='Handed over')return 'complete';if(k==='file_clearance')return p[k]==='Clear'?'ready':p[k]==='Missing'?'missing':'pending';if(['sewing','finishing','audit'].includes(k)){if(r.status==='Rework'&&k==='sewing')return 'missing';if(p[k+'_actual'])return k==='audit'&&p.audit_result!=='Approved'?'missing':'ready';return p[k+'_started']?'running':'pending'}return p[k]?'ready':''}
 function stageClass(status:string){return status==='Handed over'?'done':['Rework','Rejected'].includes(status)?'attention':['Sewing','Finishing','Audit','Awaiting audit'].includes(status)?'progress':'available'}
 function quantityText(row:any){
  const quantity=row.profile.source_quantity;
  if(quantity===undefined)return '1 piece';
  if(quantity===''||quantity===null)return 'Quantity not recorded';
  return quantity+' '+(Number(quantity)===1?'piece':'pieces');
 }
 function swatch(value:string){return ({NAVY:'#1e3558',BLACK:'#17212f',WHITE:'#fff',BLUE:'#235c9a',RED:'#a52e35',GREEN:'#287053',BEIGE:'#cdbb9b',GREY:'#75808b',GRAY:'#75808b'} as Record<string,string>)[String(value).trim().toUpperCase()]||''}
 function day(value:any){return !value?'—':String(value).includes('T')?new Date(String(value)).toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'}):String(value).slice(0,10)}
 function late(r:any){const due=r.profile.buyer_required_date;if(!due)return null;const actual=r.production.handover_actual?day(r.production.handover_actual):result.today;return Math.round((Date.parse(actual)-Date.parse(due))/86400000)}

 function exportRows(){const values=[['Indent','Old indent no.','Stage','Excel process status','Buyer','Buyer style','Merchant','Size','Colour','Fabric','Plan resource','Frozen plan date',...cols.map(c=>c[1]),...prodCols.map(c=>c[1])],...(result?.rows||[]).map((r:any)=>[indentReference(r),r.profile.legacy_indent_number,r.status,r.profile.source_process_status,r.buyer,r.profile.buyer_style,r.merchant,r.size,r.colour,r.fabric,r.resource,r.frozen_date,...cols.map(([k])=>r.profile[k]),...prodCols.map(([k])=>stageText(r,k))])];const csv='\ufeff'+values.map(row=>row.map((v:any)=>{let s=String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"'}).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='sampling-'+view+'-page-'+page+'.csv';a.click();URL.revokeObjectURL(url)}
 function select(row:any,checked:boolean,serial?:number){
  if(editPlan||busy)return;
  preview=null;
  if(!checked){selection=selection.filter(item=>item.id!==row.id);return}
  if(selection.some(item=>item.id===row.id)||selection.length>=200)return;
  placePriority(row,serial??selection.length+1);
 }
 function setPriority(row:any,value:number){
  if(busy||!Number.isInteger(value)||value<1||value>100000)return;
  placePriority(row,value);
 }
 function placePriority(row:any,value:number){
  const others=selection.filter(item=>item.id!==row.id);
  const occupied=new Set(others.map(item=>item.plan_priority));
  let gap=value;
  while(occupied.has(gap))gap++;
  selection=[
   ...others.map(item=>item.plan_priority>=value&&item.plan_priority<gap?{...item,plan_priority:item.plan_priority+1}:item),
   {...row,plan_priority:value}
  ].sort((a,b)=>a.plan_priority-b.plan_priority);
  preview=null;
 }
 function priorityChanged(row:any,input:HTMLInputElement){
  const value=Number(input.value);
  if(!Number.isInteger(value)||value<1||value>100000){input.value=String(row.plan_priority);return}
  setPriority(row,value);
 }
 function move(from:number,to:number){
  if(busy||to<0||to>=selection.length||from===to)return;
  const priorities=selection.map(item=>item.plan_priority);
  const next=[...selection];
  next.splice(to,0,next.splice(from,1)[0]);
  selection=next.map((item,index)=>({...item,plan_priority:priorities[index]}));
  preview=null;
 }
 function editReserved(rows:any[]){
  editPlan={id:rows[0].plan_id,version:rows[0].plan_version};
  selection=rows.map(row=>({...row,plan_priority:row.position}));
  target=rows[0].resource;
  const today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});
  start=rows[0].requested_start<today?today:rows[0].requested_start;
  preview=null;notice='Editing reserved plan #'+editPlan.id;
  requestAnimationFrame(()=>document.querySelector('.queue')?.scrollIntoView({block:'start',behavior:'instant'}));
 }
 function previewDialog(node:HTMLDialogElement){
  node.showModal();
  const motion=enter(node);
  return{destroy(){motion.destroy();node.close();if(previewTrigger?.isConnected&&!previewTrigger.disabled)previewTrigger.focus({preventScroll:true})}};
 }
 async function schedule(action:string){
  if(busy)return;
  const scope=company;
  busy=true;error='';
  try{
   const result=await api('/sample-schedule',{
    company_id:Number(company),resource:target,start_date:start,
    plan_id:editPlan?.id,plan_version:editPlan?.version,
    indents:selection.map(item=>({id:item.id,version:item.version})),
    action,token:preview?.token,deadline:action==='freeze'?freezeDeadline:undefined
   });
   if(company!==scope)return;
   if(action==='preview'){preview=result;freezeDeadline=result.deadline;return}
   selection=[];preview=null;editPlan=null;planRevision++;
   notice='Plan #'+result.id+' frozen. Its indents are now in Freezing.';
   await load();
  }catch(e){
   if(company===scope){
    error=(e as Error).message;
    if(action==='preview')requestAnimationFrame(()=>document.getElementById('plan-queue-error')?.focus());
   }
  }
  finally{if(company===scope)busy=false}
 }

</script>
{#if view==='plan'}<details class="saved-plans"><summary>Previously saved plans</summary><SamplePlanLedger {company} mode="planning" revision={planRevision+revision} onedit={editReserved} {onopen} onchanged={()=>{selection=[];preview=null;editPlan=null;load()}}/></details>{/if}
{#if notice}<div class="planning-notice" role="status"><p>{notice}</p>{#if onfrozen&&!editPlan}<button class="button secondary" onclick={onfrozen}>View frozen plans</button>{/if}</div>{/if}
<section class="sampling-register" aria-label="Sample garment register">
<div class="register-filters"><label class="filter-search">Search indent, style, buyer or tailor<input bind:value={search} placeholder="Search indent, style, buyer…" onkeydown={e=>{if(e.key==='Enter'){page=1;load()}}}/></label><label>Stage<select bind:value={stage}><option value="">All stages</option>{#each stages as s}<option>{s}</option>{/each}</select></label><label>Required from<input type="date" bind:value={from}/></label><label>Required to<input type="date" bind:value={to}/></label><label>Group<select bind:value={group}><option value="">All products</option><option>General</option><option>Suits</option></select></label><button class="button primary" disabled={busy} onclick={()=>{page=1;load()}}>Apply</button></div>
<details class="extra-filters"><summary>More filters</summary><div><label>Brand<input bind:value={brand}/></label><label>Block / fit<input bind:value={fit}/></label>{#if view!=='plan'}<label>Resource<select bind:value={resource}><option value="">All resources</option>{#each [...new Set(caps.map((c:any)=>c.resource))] as name}<option>{String(name)}</option>{/each}</select></label>{/if}</div></details>
{#if error&&(view!=='plan'||!selection.length)}<p class="form-error" role="alert">{error}</p>{/if}
<div class:register-summary={view==='master'}><p class="chart-note">{view==='plan'?'Select indents, choose a line and preview the dates. Freeze the reviewed plan to lock its capacity.':view==='live'?'Active garments awaiting final handover.':'Every approved garment, including completed and rejected indents.'} Open the detailed planning chart for every field and milestone. Dates follow India time.</p>{#if view==='master'}<button class="button secondary" disabled={busy||exporting||!appliedQuery||!result?.total} onclick={exportRegister}><Download size={16} aria-hidden="true"/>{exporting?'Preparing Excel…':'Export Excel'}</button>{/if}</div>
<p class="legend"><span class="ready">Green: completed / ready</span><span class="running">Pink: in progress</span><span class="missing">Red: missing / rework</span><span class="complete">Yellow: final handover</span></p><div class="summary-scroll" aria-busy={busy}><table class="sample-summary"><thead><tr>{#if view==='plan'&&canPlan}<th class="selection-column">Select</th>{/if}{#if view==='plan'}<th>S.No</th>{/if}<th>Indent details</th><th>Status</th><th>Garment</th><th>Specs</th><th>Logistics</th><th class="action-column">Action</th></tr></thead><tbody>{#each result?.rows||[] as r,n (r.id)}<tr>{#if view==='plan'&&canPlan}<td class="selection-column"><label class="selection-target"><input type="checkbox" aria-label={'Select indent '+(r.indent_number||r.id)} checked={selection.some(i=>i.id===r.id)} disabled={busy||!!editPlan||(!selection.some(i=>i.id===r.id)&&selection.length>=200)} onchange={e=>select(r,e.currentTarget.checked,(page-1)*50+n+1)}/></label></td>{/if}{#if view==='plan'}<td>{(page-1)*50+n+1}</td>{/if}<td><strong>{indentReference(r)}</strong>{#if r.profile.legacy_indent_number}<small>Old indent {r.profile.legacy_indent_number}</small>{/if}</td><td><span class={'garment-status '+stageClass(r.status)}>{r.status}</span>{#if r.profile.source_process_status}<small>Excel: {r.profile.source_process_status}</small>{/if}<small>{r.frozen_date||r.reserved_date||'Unplanned'}{r.plan_state==='Planned'?' · Reserved':''}</small>{#if r.resource}<small>{r.resource}</small>{/if}</td><td><strong class="buyer-name" title={r.buyer}>{r.buyer||'—'}</strong><small>Style: {r.profile.buyer_style||'—'}</small></td><td><span class="garment-colour">{#if swatch(r.colour)}<i aria-hidden="true" style:background={swatch(r.colour)}></i>{/if}{r.colour||'Colour not recorded'}</span><small>{r.size||'Size not recorded'} · {quantityText(r)}</small></td><td><span>{r.merchant||'—'}</span><small>{r.profile.request_date||'—'}</small>{#if r.submitted_by}<small>Submitted: {r.submitted_by}</small>{/if}</td><td class="action-column"><button class="view-indent" aria-label={'View sample indent '+(r.indent_number||r.id)} onclick={()=>onopen(r.request_id,r.id)}>View</button></td></tr>{:else}<tr><td colspan={view==='plan'?(canPlan?8:7):6}>{busy?'Loading sample register…':'No indents match these filters.'}</td></tr>{/each}</tbody></table></div>
<details class="detailed-chart"><summary>Detailed planning chart · all fields and milestones</summary><div class="chart"><table><thead><tr><th class="fixed">{view==='plan'?'Select / indent':'Indent'}</th><th>Frozen plan / resource</th><th>Stage</th><th>Buyer / style</th><th>Created / submitted by</th><th>Size / colour</th><th>Fabric / alternate</th>{#each cols as [,title]}<th>{title}</th>{/each}<th>Early / late days</th>{#each prodCols as [,title]}<th>{title}</th>{/each}</tr></thead><tbody>{#each result?.rows||[] as r}<tr class:handed={r.status==='Handed over'}><td class="fixed"><strong>{indentReference(r)}</strong>{#if r.profile.legacy_indent_number}<small>Old indent {r.profile.legacy_indent_number}</small>{/if}<button class="view-indent" aria-label={'View sample indent '+(r.indent_number||r.id)} onclick={()=>onopen(r.request_id,r.id)}>View</button></td><td>{r.frozen_date||'Unplanned'}<small>{r.resource||''}</small></td><td><strong class:closed={r.status==='Handed over'}>{r.status}</strong></td><td>{r.buyer}<small>{r.profile.buyer_style}</small></td><td>{r.merchant}<small>Submitted: {r.submitted_by||'—'}</small></td><td>{r.size} · {r.colour}<small>{quantityText(r)}</small></td><td>{r.fabric}<small>{r.alternate_fabric?'Alternate: '+r.alternate_fabric:''}</small></td>{#each cols as [key]}<td>{r.profile[key]||'—'}</td>{/each}<td class:late={(late(r)||0)>0}>{late(r)===null?'—':late(r)===0?'On date':late(r)!>0?late(r)+' late':Math.abs(late(r)!)+(r.status==='Handed over'?' early':' days remaining')}</td>{#each prodCols as [key]}<td class={tone(r,key)}>{stageText(r,key)}</td>{/each}</tr>{:else}<tr><td colspan="36">{busy?'Loading planning chart…':'No indents match these filters.'}</td></tr>{/each}</tbody></table></div></details>
<div class="pager">{#if view!=='master'}<button class="button secondary" disabled={busy||!result?.rows.length} onclick={exportRows}>Export this page</button>{/if}<span>{result?.total||0} indents · Page {page}</span><button class="button secondary" disabled={busy||page===1} onclick={()=>{page--;load()}}>Previous</button><button class="button secondary" disabled={busy||page*50>=(result?.total||0)} onclick={()=>{page++;load()}}>Next</button></div>
</section>
{#if view==='plan'&&canPlan}
 {#if selection.length}
 <section class="queue" aria-labelledby="plan-selected-title">
  <div class="queue-heading"><div><h3 id="plan-selected-title">Plan selected indents</h3><p>Edit a serial number or use the arrows to change the order.</p></div><span>{selection.length} selected</span></div>
  {#if error&&!preview}<p id="plan-queue-error" class="form-error" role="alert" tabindex="-1">{error}</p>{/if}
  <ol class="priority-list" aria-label="Selected indents">
   {#each selection as row,i (row.id)}
   <li class="queue-row" draggable={!busy} ondragstart={e=>{if((e.target as HTMLElement).closest('input,button,select'))e.preventDefault();else dragIndex=i}} ondragover={e=>e.preventDefault()} ondrop={e=>{e.preventDefault();if(dragIndex>=0)move(dragIndex,i);dragIndex=-1}}>
    <label class="priority-control"><span>S.No</span><input class="priority-number" type="number" min="1" max="100000" disabled={busy} value={row.plan_priority} aria-label={'Plan serial number for '+indentReference(row)} onchange={e=>priorityChanged(row,e.currentTarget)} onkeydown={e=>{if(e.key==='Enter'){e.preventDefault();priorityChanged(row,e.currentTarget)}}}/></label>
    <div class="queue-garment"><strong>{indentReference(row)} <span>· {row.profile.buyer_style||'Style not recorded'}</span></strong><small>{row.buyer||'Buyer not recorded'} · {row.size||'Size not recorded'} · {row.colour||'Colour not recorded'} · {quantityText(row)}</small></div>
    <div class="queue-row-actions">{#if row.profile.source_quantity===''||row.profile.source_quantity===null}<button class="text-button complete-details" disabled={busy} onclick={()=>onopen(row.request_id,row.id)}>Complete details</button>{/if}<button class="button secondary" aria-label={'Move indent '+indentReference(row)+' up'} disabled={busy||i===0} onclick={()=>move(i,i-1)}><ArrowUp size={16} aria-hidden="true"/></button><button class="button secondary" aria-label={'Move indent '+indentReference(row)+' down'} disabled={busy||i===selection.length-1} onclick={()=>move(i,i+1)}><ArrowDown size={16} aria-hidden="true"/></button><button class="text-button" disabled={busy||!!editPlan} onclick={()=>select(row,false)}>Remove</button></div>
   </li>
   {/each}
  </ol>
  {#if missingQuantities.length}<p class="planning-warning">Enter the missing quantity for {missingQuantities.map(row=>indentReference(row)).join(', ')} before previewing capacity.</p>{/if}
  <div class="queue-toolbar">
   <label>Sample line<select bind:value={target} disabled={busy} onchange={()=>preview=null}><option value="">Choose line</option>{#each [...new Set(caps.map((c:any)=>c.resource))] as name}<option>{String(name)}</option>{/each}</select></label>
   <label>Start date<input type="date" bind:value={start} disabled={busy} onchange={()=>preview=null}/></label>
   <div class="queue-actions">{#if editPlan}<button class="button secondary" disabled={busy} onclick={()=>{editPlan=null;selection=[];preview=null;notice=''}}>Stop editing</button>{/if}<button class="button primary" disabled={busy||!company||!target||!start||!selection.length||missingQuantities.length>0} bind:this={previewTrigger} onclick={()=>schedule('preview')}>{busy?'Preparing dates…':'Preview plan dates'}</button></div>
  </div>
  {#if !caps.length}<p class="planning-warning">Set the line’s capacity in Capacity before preparing this plan.</p>{/if}
 </section>
 {:else}<p class="planning-empty">Select indents above to prepare a plan.</p>{/if}
{/if}
{#if preview}
 <dialog class="plan-preview" use:previewDialog aria-labelledby="plan-preview-title" oncancel={e=>{if(busy)e.preventDefault();else preview=null}}>
  <header class="plan-preview__header"><div><h2 id="plan-preview-title">Review &amp; freeze plan</h2><p>{target} · {selection.length} indents</p></div><button class="preview-close" aria-label="Close plan preview" disabled={busy} onclick={()=>preview=null}><X size={20} aria-hidden="true"/></button></header>
  <div class="plan-preview__body">
   <p class="preview-instruction">Freezing locks this schedule and moves these indents to Freezing.</p>
   {#if error}<p class="form-error" role="alert">{error}</p>{/if}
   <dl class="plan-overview"><div><dt>Sample line</dt><dd>{target}</dd></div><div><dt>Start date</dt><dd>{start}</dd></div><div><dt>Total pieces</dt><dd>{preview.rows.reduce((total:number,row:any)=>total+row.units,0)}</dd></div><div><dt><label for="plan-freeze-deadline">Freeze deadline</label></dt><dd><input id="plan-freeze-deadline" type="date" min={preview.deadline} bind:value={freezeDeadline} disabled={busy}/></dd></div></dl>
   <div class="preview-scroll"><table class="preview-table"><thead><tr><th>S.No</th><th>Indent / buyer</th><th>Pieces</th><th>Reserved from</th><th>Finish date</th><th>Required date</th></tr></thead><tbody>{#each preview.rows as row,index}<tr><td>{selection[index]?.plan_priority}</td><td><strong>{indentReference(selection[index]??row)}</strong><small>{selection[index]?.buyer} · {selection[index]?.profile.buyer_style}</small></td><td>{row.units}</td><td>{row.start_date}</td><td>{row.plan_date}</td><td class:preview-late={row.late}>{row.required_date||'Not recorded'}{#if row.late}<small>After required date</small>{/if}</td></tr>{/each}</tbody></table></div>
   <details class="preview-calendar"><summary>View daily line capacity</summary><div class="preview-scroll"><table class="preview-table"><thead><tr><th>Date</th><th>Reserved pieces</th><th>Daily capacity</th><th>Available pieces</th></tr></thead><tbody>{#each preview.calendar||[] as day}<tr><td>{day.date}</td><td>{day.reserved}</td><td>{day.capacity}</td><td>{Math.max(0,day.capacity-day.reserved)}</td></tr>{/each}</tbody></table></div></details>
  </div>
  <footer class="plan-preview__footer"><button class="button secondary" disabled={busy} onclick={()=>preview=null}>Back to planning</button><button class="button primary" disabled={busy||!freezeDeadline||freezeDeadline<preview.deadline} onclick={()=>schedule('freeze')}>{busy?'Freezing…':'Freeze plan'}</button></footer>
 </dialog>
{/if}

<style>
 .queue .priority-number{width:76px;min-height:44px;flex-shrink:0;text-align:center;font-weight:700}.queue{scroll-margin-top:90px}
 .view-indent{display:block;min-height:44px;margin-top:4px;padding:6px 12px;border:1px solid #b9dcd5;border-radius:8px;background:#effaf6;color:#075e5a;font:inherit;font-weight:600;cursor:pointer}.view-indent:focus-visible{outline:2px solid #087f83;outline-offset:2px}
 .register-filters{display:flex;gap:12px;align-items:end;flex-wrap:wrap;margin:20px 0}.register-filters label{display:grid;gap:7px;color:#142536;font-weight:700}.register-filters input,.register-filters select{padding:10px;border:1px solid #aebfc9;border-radius:7px;background:#eff5fa;min-height:42px;color:#101820}.chart-note{color:#374b5a}.chart{overflow:auto;max-height:65vh;border:1px solid #bdcdd5;border-radius:10px}table{border-collapse:separate;border-spacing:0;width:max-content;min-width:100%;font-size:14px}th,td{text-align:left;padding:12px 14px;border-bottom:1px solid #d2dce0;max-width:260px;min-width:110px;overflow-wrap:anywhere}th{position:sticky;top:0;background:#132b40;color:#fff;z-index:2;font-weight:700}td{background:#fff}tr:nth-child(even) td{background:#f1f6f8}.fixed{position:sticky;left:0;z-index:1;min-width:86px;box-shadow:2px 0 4px #10253510}th.fixed{z-index:3}small{display:block;margin-top:4px}.late{color:#a32026;font-weight:700}.closed{color:#16614c}.pager{display:flex;align-items:center;justify-content:flex-end;gap:10px;margin:16px 0}.pager span{margin-right:auto}
.legend{display:flex;gap:8px;flex-wrap:wrap}.legend span{padding:5px 9px;border-radius:5px}td.ready,.legend .ready{background:#dff1e5!important}td.running,.legend .running{background:#f9e1ee!important}td.missing,.legend .missing{background:#fce1de!important}td.complete,.legend .complete{background:#fff1c2!important}.handed td{background:#fff1c2!important}.queue{padding:20px;border:1px solid #b6cbd3;border-radius:12px;background:#edf4f7;margin:20px 0}.queue-row{display:flex;gap:12px;align-items:center;background:#fff;padding:9px;margin:6px 0;border:1px solid #cedbe2;border-radius:6px}.queue-row span{flex:1}.queue-row button{min-width:40px;min-height:38px}.queue label{display:grid;gap:8px;margin:12px 0;font-weight:700}.queue input,.queue select{padding:10px;background:#eff5fa;color:#101820;border:1px solid #aebfc9;border-radius:7px}.queue-actions{display:flex;flex-wrap:wrap;gap:10px}

 .register-summary{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px 16px;padding:12px 16px 0}
 .sampling-register .register-summary .chart-note{flex:1 1 240px;padding:0}
 .register-summary>.button{flex-shrink:0}

 /* Reference summary groups each garment without hiding the complete chart. */
 .sampling-register{max-width:1300px;margin-inline:auto;border:1px solid #e0e6eb;border-radius:16px;overflow:hidden;background:#fff;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",sans-serif}.sampling-register .register-filters{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:12px;margin:0;padding:16px;background:#fafbfc;border-bottom:1px solid #edf0f3;align-items:end}.filter-search{grid-column:span 2}.sampling-register label{font-size:11px;font-weight:600;color:#526170;min-width:0}.sampling-register :is(input:not([type=checkbox]),select){width:100%;min-width:0;min-height:44px;background:#fff;border:1px solid #d7dfe6;border-radius:12px;padding:9px 10px;font:inherit;font-size:13px;color:#17212f}.sampling-register .register-filters>.button{min-height:44px;border-radius:12px;font-size:13px}.extra-filters{padding:8px 16px;border-bottom:1px solid #edf0f3;font-size:12px;color:#435568}.extra-filters summary{min-height:28px;padding:5px 0;cursor:pointer}.extra-filters>div{display:flex;gap:12px;padding:8px 0}.extra-filters label{display:grid;gap:6px;flex:1;max-width:260px}.sampling-register .chart-note{font-size:12px;color:#526170;margin:0;padding:10px 16px 0;line-height:1.5}.sampling-register .legend{padding:12px 16px;margin:0;border-bottom:1px solid #edf0f3;gap:8px}.sampling-register .legend span{font-size:11px;font-weight:500;padding:4px 8px;border:1px solid #d4e3d9;border-radius:6px;color:#28563c}.sampling-register .legend .running{color:#823156;border-color:#eed0df}.sampling-register .legend .missing{color:#95372f;border-color:#f0c8c2}.sampling-register .legend .complete{color:#805c14;border-color:#ead595}.summary-scroll{overflow:auto;max-height:65vh}.sample-summary{width:100%;min-width:860px;table-layout:auto;border-collapse:collapse;font-size:13px}.sample-summary th{position:sticky;top:0;z-index:1;background:#f8fafb;color:#526170;padding:12px;font-size:10px;font-weight:600;letter-spacing:.055em;text-transform:uppercase!important;min-width:0;border-color:#e4e9ef;white-space:nowrap}.sample-summary td{padding:10px 12px;min-width:100px;max-width:240px;border-color:#edf0f3;vertical-align:middle;color:#203247;line-height:1.45;background:#fff!important;overflow-wrap:anywhere}.sample-summary tr:hover td{background:#f8fafb!important}.sample-summary strong{font-size:14px;font-weight:700;color:#17212f}.sample-summary .buyer-name{font-size:13px;font-weight:600}.sample-summary small{font-size:12px;color:#596675;margin-top:3px;line-height:1.4}.garment-status{display:inline-flex;max-width:100%;padding:3px 8px;border:1px solid #bbdfd1;border-radius:20px;background:#effaf5;color:#126247;font-size:11px;font-weight:500;white-space:nowrap}.garment-status.progress{background:#fcecf4;border-color:#eac8da;color:#813352}.garment-status.attention{background:#fff0ee;border-color:#edc5bd;color:#943c31}.garment-status.done{background:#fff8dc;border-color:#ead38e;color:#78570f}.garment-colour{display:flex;align-items:center;gap:6px;font-weight:500}.garment-colour i{width:8px;height:8px;flex-shrink:0;border-radius:50%;border:1px solid #8b98a6}.sample-summary .selection-column{width:52px;min-width:52px;padding:4px;text-align:center}.selection-target{display:flex;align-items:center;justify-content:center;width:44px;height:44px;cursor:pointer}.selection-target input{width:17px;height:17px;accent-color:#08746f;cursor:pointer}.sample-summary .action-column{text-align:right;min-width:80px}.sample-summary .view-indent{display:inline-flex;margin:0;min-height:44px;min-width:62px;align-items:center;justify-content:center;padding:7px 12px;border-radius:8px;font-size:12px;font-weight:600;background:#effaf7;border-color:#d1e9e1;color:#086b61}.detailed-chart{border-top:1px solid #e5ebf0;padding:10px 16px;font-size:12px;color:#435568}.detailed-chart>summary{padding:6px 0;min-height:32px;cursor:pointer;font-weight:600}.detailed-chart .chart{margin-top:10px}.sampling-register .pager{padding:12px 16px;margin:0;border-top:1px solid #e5ebf0;gap:8px;font-size:12px;flex-wrap:wrap}.sampling-register .pager button{min-height:44px;font-size:12px;border-radius:10px}.sampling-register :is(button,input,select):focus-visible{outline:2px solid #087f83;outline-offset:2px}.queue{background:#fafcfd;border-color:#dce5eb;border-radius:16px}.queue-row button{min-height:44px}@media(prefers-contrast:more){.sample-summary th,.sample-summary small,.sampling-register label{color:#253b4c}.garment-status{border-color:currentColor}}

 /* Planning keeps the original list serials while the chosen order drives dates. */
 .saved-plans{margin-bottom:16px;border-bottom:1px solid #dce3e9;padding-bottom:10px;color:#233447}.saved-plans>summary{min-height:44px;padding:12px 0;cursor:pointer;font-size:13px;font-weight:700}
 .planning-notice{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 16px;padding:12px 16px;border:1px solid #b8d8ca;border-radius:12px;background:#eef9f3;color:#164d37}.planning-notice p{margin:0;font-weight:600}
 .queue{padding:16px;margin:16px 0;background:#fff;border:1px solid #dce3e9;border-radius:16px;color:#17212f}.queue-heading{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:12px}.queue-heading h3{margin:0;font-size:17px;font-weight:750}.queue-heading p{margin:4px 0 0;font-size:13px;font-weight:500;color:#405163}.queue-heading>span{font-size:13px;font-weight:700;white-space:nowrap}
 .priority-list{list-style:none;padding:0;margin:0;display:grid;gap:8px}.queue-row{display:flex;align-items:center;gap:12px;padding:10px 12px;margin:0;border:1px solid #e0e6eb;border-radius:10px;background:#f9fbfc}.queue-row .priority-control{display:grid;gap:3px;flex:0 0 76px;margin:0;font-size:11px;font-weight:700;color:#405163}.queue-row .priority-number{width:76px;min-height:44px;margin:0;background:#fff;color:#17212f;font-size:14px;border-radius:8px}.queue-garment{flex:1;min-width:0}.queue-garment strong{font-size:14px;font-weight:750;overflow-wrap:anywhere}.queue-garment strong span{font-weight:650;color:#2e4355}.queue-garment small{font-size:12px;font-weight:500;color:#405163;line-height:1.5;margin-top:3px}.queue-row-actions{display:flex;align-items:center;gap:6px;flex-shrink:0}.queue-row-actions .button{display:inline-flex;align-items:center;justify-content:center;min-height:44px;min-width:44px;padding:8px;border-radius:8px}.queue-row-actions .text-button{min-height:44px;padding:8px;color:#096b62;font-weight:700}.queue-row-actions .complete-details{text-decoration:underline;text-underline-offset:3px}
 .queue-toolbar{display:grid;grid-template-columns:minmax(180px,1fr) minmax(170px,.7fr) auto;gap:12px;align-items:end;margin-top:12px}.queue-toolbar label{margin:0;display:grid;gap:6px;font-size:13px;font-weight:700;color:#17212f}.queue-toolbar :is(input,select){margin:0;min-height:44px;border-radius:10px;background:#f7f9fb;border:1px solid #bfcbd5;color:#17212f;min-width:0;width:100%}.queue-actions{display:flex;gap:8px;justify-content:flex-end;align-items:center}.queue-actions .button{min-height:44px;white-space:nowrap}.planning-warning{margin:10px 0 0;padding:10px 12px;border:1px solid #e6cc91;border-radius:8px;background:#fff9ec;color:#68480d;font-size:13px;font-weight:600;line-height:1.5}.planning-empty{margin:16px 0;color:#405163;font-size:13px}
 .plan-preview{padding:0;border:0;border-radius:16px;width:min(1000px,calc(100vw - 64px));max-width:none;max-height:calc(100dvh - 64px);overflow:hidden;color:#17212f;background:#fff;box-shadow:0 20px 64px #10263833;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",sans-serif}.plan-preview[open]{display:flex;flex-direction:column}.plan-preview::backdrop{background:#10263873}.plan-preview__header{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-shrink:0;padding:14px 20px;background:#142c40;color:#fff}.plan-preview__header h2{font-size:20px;line-height:1.25;font-weight:750;color:#fff;margin:0}.plan-preview__header p{font-size:13px;font-weight:600;color:#e1edf3;margin:5px 0 0}.preview-close{display:inline-flex;justify-content:center;align-items:center;min-width:44px;min-height:44px;padding:10px;border:1px solid #6e8495;border-radius:10px;color:#fff;background:#ffffff0d;cursor:pointer}.preview-close:hover{background:#ffffff1a}.plan-preview__body{padding:16px 20px;overflow:auto;min-height:0}.preview-instruction{font-size:13px;color:#31495d;line-height:1.5;margin:0 0 14px;font-weight:600}.plan-overview{display:grid;grid-template-columns:1fr 1fr .7fr 1.2fr;gap:16px;margin:0 0 16px}.plan-overview dt,.plan-overview label{font-size:12px;font-weight:700;line-height:1.4;color:#405163;margin:0 0 5px}.plan-overview dd{margin:0;font-size:15px;font-weight:750;color:#17212f;min-height:44px;display:flex;align-items:center}.plan-overview input{width:100%;min-height:44px;border:1px solid #bfcbd5;border-radius:10px;background:#f7f9fb;padding:8px 10px;color:#17212f;font:inherit;font-size:14px}
 .preview-scroll{overflow:auto;border:1px solid #dce3e9;border-radius:10px}.preview-table{width:100%;min-width:760px;border-collapse:collapse;table-layout:auto;font-size:13px}.preview-table th,.preview-table td{position:static;min-width:0;max-width:240px;padding:10px 12px;border-bottom:1px solid #e5ebef;text-align:left;vertical-align:middle;line-height:1.4;font-variant-numeric:tabular-nums;overflow-wrap:anywhere;color:#17212f;background:#fff}.preview-table th{color:#405163;background:#f5f8fa;font-size:12px;font-weight:750;white-space:nowrap}.preview-table tr:last-child td{border-bottom:0}.preview-table strong{font-size:13px;font-weight:750}.preview-table small{display:block;margin-top:4px;color:#405163;font-size:12px;font-weight:500}.preview-table .preview-late,.preview-table .preview-late small{color:#982b20;font-weight:700}.preview-calendar{margin-top:12px}.preview-calendar summary{padding:10px 0;min-height:44px;color:#096b62;font-size:13px;font-weight:700;cursor:pointer}.plan-preview__footer{display:flex;justify-content:flex-end;gap:8px;flex-shrink:0;padding:12px 20px;border-top:1px solid #dce3e9;background:#fff}.plan-preview__footer .button{min-height:44px;font-weight:700}.plan-preview :is(button,input,summary):focus-visible,.queue :is(button,input,select):focus-visible,.saved-plans>summary:focus-visible{outline:3px solid #08776e;outline-offset:3px}.plan-preview__header .preview-close:focus-visible{outline-color:#8edbd1}
 @media(max-width:1000px){.queue-toolbar{grid-template-columns:1fr 1fr}.queue-actions{grid-column:1/-1}.queue-row{flex-wrap:wrap}.queue-row-actions{margin-left:auto}.plan-overview{gap:12px}}
 @media(prefers-contrast:more){.queue-garment small,.queue-heading p,.plan-overview dt,.preview-table th,.preview-table small{color:#17212f}.queue-row,.preview-scroll,.preview-table th,.preview-table td{border-color:#526170}}

 </style>
