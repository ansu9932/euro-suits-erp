<script lang="ts">
 import {SkeletonLoader,SpinnerLoader} from '#lib/components/loaders/index.ts';
 import {Check,ChevronRight,Clock3,Download,RefreshCw,Search} from '@lucide/svelte';
 import {tick,untrack} from 'svelte';
 import {api} from './api';
 import {downloadReport} from './loading';
 import SampleProcessPanel from './SampleProcessPanel.svelte';
 import {indentReference,processSteps,processViews,processLabel,processTone,correctionForStep,correctionStage,stamp,actionLabel,sampleStatusLabel,type ProcessStep} from './sampleProcess';

 let {company,view='all',revision=0,onopen,progressLayout=false}:{company:string;view?:string;revision?:number;onopen:(id:number,indent:number)=>void;progressLayout?:boolean}=$props();
 let data:any=$state(null),error=$state(''),busy=$state(false),search=$state(''),query=$state(''),page=$state(1),filter=$state('all'),notice=$state('');
 let editor:{row:any;step:string}|null=$state(null);
 let sequence=0,loadedCompany='';
 let exporting=$state(false),exportError=$state('');
 let searchInput:HTMLInputElement;
 let opener:HTMLButtonElement|null=null;
 const activeView=$derived(view==='all'?filter:view);

 $effect(()=>{
  const scope=company,queue=activeView,currentPage=page,term=query,version=revision;
  untrack(()=>{
   if(loadedCompany!==scope){data=null;editor=null;exportError='';loadedCompany=scope}
   load(scope,queue,currentPage,term);
  });
  return()=>{sequence++};
 });
 async function load(scope=company,queue=activeView,currentPage=page,term=query){
  const request=++sequence;busy=true;error='';
  try{
   const result=await api('/sample-process?'+new URLSearchParams({company:scope,view:queue,page:String(currentPage),search:term}));
   if(request===sequence)data=result;
  }catch(problem){if(request===sequence)error=(problem as Error).message}
  finally{if(request===sequence)busy=false}
 }
 async function exportProgress(){
  if(busy||exporting||error||!data?.total)return;
  const scope=company;
  const params=new URLSearchParams({company:scope,view:activeView,search:query,format:'xlsx'});
  exporting=true;exportError='';
  try{await downloadReport('/api/sample-process?'+params,'indent-progress.xlsx')}
  catch(problem){if(company===scope)exportError=(problem as Error).message}
  finally{exporting=false}
 }
 function apply(){
  if(busy)return;
  const term=search.trim(),unchanged=page===1&&query===term;
  page=1;query=term;
  if(unchanged)load();
 }
 function openStage(row:any,step:ProcessStep,event:MouseEvent){
  opener=event.currentTarget as HTMLButtonElement;
  notice='';editor={row,step:step[2]};
 }
 async function closeStage(){
  if(!editor)return;
  const trigger=opener;
  opener=null;
  editor=null;
  await tick();
  if(editor)return;
  if(trigger?.isConnected&&!trigger.disabled)trigger.focus({preventScroll:true});
  else searchInput?.focus({preventScroll:true});
 }
 async function updated(){
  notice='Stage update saved. Approval status appears beside the indent.';
  await load();
 }
 function audit(row:any){
  editor=null;
  onopen(row.request_id,row.id);
 }
 function stageState(row:any,step:ProcessStep){
  if(row.production.process_exception?.stage===step[0])return 'issue';
  if(row.latest_update?.decision==='Pending'&&step[3].some(key=>key===row.latest_update.action))return 'pending';
  if(correctionForStep(row.active_corrections,step))return 'issue';
  if(progressLayout&&step[2]==='audit_actual'&&['Rework','Rejected'].includes(row.production.audit_result))return 'issue';
  if(row.production[step[2]])return 'complete';
  return row.process_stage===step[0]?'active':'waiting';
 }
 function stageText(row:any,step:ProcessStep){
  const production=row.production,actual=production[step[2]];
  const tone=stageState(row,step);
  if(tone==='pending')return 'Awaiting approval';
  if(tone==='issue'){
   if(production.process_exception?.stage===step[0])return production.process_exception.result;
   if(correctionForStep(row.active_corrections,step))return 'Rework requested';
   return production.audit_result||'Stage issue';
  }
  if(actual)return stamp(actual);
  if(progressLayout&&tone==='active'){
   const started=step[2].replace(/_actual$/,'_started');
   if(started!==step[2]&&production[started])return 'In progress · '+stamp(production[started]);
  }
  if(step[0]==='fabric'||step[0]==='trims')return production[step[0]+'_availability']||'Not recorded';
  return 'Not recorded';
 }
 function badgeTone(row:any){
  const tone=processTone(row);
  if(!progressLayout||tone==='issue'||tone==='pending')return tone;
  const chart=String(row.production.register_source?.process_status||'').trim().toUpperCase();
  if(chart==='COMPLETED')return 'complete';
  if(chart==='PENDING')return 'pending';
  if(chart.startsWith('UNDER ')||chart.startsWith('UNDR '))return 'active';
  return tone;
 }
 function statusText(row:any){
  const issue=row.production.process_exception;
  if(issue)return issue.result+' · '+processLabel(issue.stage);
  if(row.active_corrections?.length)return 'Rework requested · '+correctionStage(row.active_corrections[0]);
  return row.production.register_source?.process_status||sampleStatusLabel(row.status);
 }
 function quantity(row:any){
  const value=row.profile.source_quantity;
  if(value===''||value===null)return 'Quantity not recorded';
  const count=value??1;
  return count+' '+(Number(count)===1?'piece':'pieces');
 }
</script>

<section class="sp-board" class:sp-board--progress={progressLayout} aria-label={view==='all'?'Indent progress':processViews[view]||'Sample process'} aria-busy={busy}>
 <header class="sp-board__heading">
  <div><h3>{view==='all'?'Indent progress':processViews[view]||'Sample process'}</h3><p>Choose a stage to update it. Every submission and review keeps its user, date and time.</p></div>
  <div class="sp-heading-actions">
   {#if progressLayout}<button class="button secondary sp-refresh" type="button" disabled={busy||exporting||!!error||!data?.total} onclick={exportProgress}><Download size={16} aria-hidden="true"/>{exporting?'Exporting…':'Export Excel'}</button>{/if}
   <button class="button secondary sp-refresh" type="button" disabled={busy} onclick={()=>load()}><RefreshCw size={16} aria-hidden="true"/>{busy?'Refreshing…':'Refresh'}</button>
  </div>
 </header>
 <form class="sp-filters" onsubmit={event=>{event.preventDefault();apply()}}>
  <label class="sp-search">
   <span class:sp-visually-hidden={progressLayout}>Search indent, buyer or style</span>
   <span class="sp-search-field">
    {#if progressLayout}<Search size={18} class="sp-search-icon" aria-hidden="true"/>{/if}
    <input bind:this={searchInput} bind:value={search} aria-label="Search indent, buyer or style" maxlength="120" placeholder={progressLayout?'Search indent, buyer or style…':'Indent, old Excel number or style'}/>
    {#if busy&&data}<span class="sp-search-spinner"><SpinnerLoader size={16} label="Updating indent progress…"/></span>{/if}
   </span>
  </label>
  {#if view==='all'}<label class="sp-filter-view">Show<select bind:value={filter} onchange={()=>{page=1}}><option value="all">All indents</option>{#each Object.entries(processViews).filter(([key])=>key!=='all') as [key,label]}<option value={key}>{label}</option>{/each}<option value="closed">Completed / rejected</option></select></label>{/if}
  <button class="button primary" disabled={busy}>Search</button>
 </form>
 <div class="sp-legend" aria-label="Recorded stage colours"><span class="sp-key sp-key--complete">Recorded</span><span class="sp-key sp-key--active">Current stage</span><span class="sp-key sp-key--pending">Awaiting approval</span><span class="sp-key sp-key--issue">Rework / rejected</span>{#if progressLayout}<span class="sp-key sp-key--unrecorded">Not recorded</span>{/if}</div>
 {#if error}<p class="form-error" role="alert">{error} <button class="text-button" type="button" onclick={()=>load()}>Retry</button></p>{/if}
 {#if exportError}<p class="form-error" role="alert">{exportError}</p>{/if}
 {#if notice}<p class="sp-notice" role="status">{notice}</p>{/if}
 {#if !data&&!error}<SkeletonLoader variant="list" rows={3} columns={5} label="Loading indent progress…"/>{:else if data}
  <div class="sp-list">
   {#each data.rows as row, index (row.id)}
    {@const serial=(data.page-1)*data.page_size+index+1}
    <article class="sp-indent" aria-label={'Progress for '+indentReference(row)}>
     <div class="sp-indent__heading">
      <div class="sp-indent__identity"><strong>{#if progressLayout}<span class="sp-serial">{serial}.</span>{/if}{indentReference(row)}</strong><span>{row.buyer} · {row.profile.buyer_style||'Style not recorded'}</span>{#if row.profile.legacy_indent_number}<small>Old indent {row.profile.legacy_indent_number}</small>{/if}</div>
      <div class="sp-indent__details"><b>{row.size||'Size not recorded'} · {row.colour||'Colour not recorded'} · {quantity(row)}</b><span>Merchant · {row.merchant_id?row.merchant:'Not assigned'}</span>{#if row.profile.buyer_required_date}<span>Required · {stamp(row.profile.buyer_required_date)}</span>{/if}</div>
      <div class="sp-indent__status"><span class={'sp-chip sp-chip--'+badgeTone(row)}>{statusText(row)}</span>{#if !row.active_corrections?.length&&!row.production.process_exception&&row.production.register_source}<small>{progressLayout?'Chart status':'Chart status · recorded steps below'}</small>{:else if !row.active_corrections?.length&&!row.production.process_exception&&row.process_stage!=='closed'}<small>Next · {processLabel(row.process_stage)}</small>{/if}{#if Number(row.late_days)>0}<small class="sp-issue-text">{row.late_days} late day{row.late_days===1?'':'s'}</small>{/if}</div>
      <button class="button secondary sp-details" type="button" disabled={busy} onclick={()=>onopen(row.request_id,row.id)}>{row.latest_update?.decision==='Pending'&&row.can_review?'Review update':'Details'}<ChevronRight size={15} aria-hidden="true"/></button>
     </div>
     <ol class="sp-stages" aria-label={'Stages for '+indentReference(row)}>
      {#each processSteps as step (step[2])}
       {@const tone=stageState(row,step)}
       {@const saved=stageText(row,step)}
       {@const display=progressLayout&&tone==='active'&&saved==='Not recorded'?'Current stage':saved}
       <li><button class={'sp-stage sp-stage--'+tone} type="button" disabled={busy} aria-haspopup="dialog" aria-label={step[1]+' for '+indentReference(row)+': '+saved} title={saved} onclick={event=>openStage(row,step,event)}><span class="sp-stage__label">{#if tone==='complete'}<Check size={13} aria-hidden="true"/>{:else if tone==='pending'}<Clock3 size={13} aria-hidden="true"/>{/if}{step[1]}</span><span class="sp-stage__value">{display}</span></button></li>
      {/each}
     </ol>
     {#if row.latest_update||row.production.process_exception||Number(row.issue_count)>0||row.production.awb}
      <div class="sp-indent__updates">
       {#if row.latest_update}<span class={'sp-chip sp-chip--'+(row.latest_update.decision==='Approved'?'complete':row.latest_update.decision==='Pending'?'pending':'issue')}>{row.latest_update.decision}</span><span><strong>{actionLabel(row.latest_update.action)}</strong> · {row.latest_update.submitted_by} · {stamp(row.latest_update.submitted_at)}</span>{#if row.latest_update.reviewed_by}<span>Reviewed by {row.latest_update.reviewed_by} · {stamp(row.latest_update.reviewed_at)}</span>{/if}{/if}
       {#if row.production.awb}<span>AWB · {row.production.awb}</span>{/if}
       {#if row.production.process_exception}<p class="sp-issue-text">{row.production.process_exception.comment}</p>{/if}
       {#if row.latest_update?.comment}<p>{row.latest_update.comment}</p>{/if}
       {#if row.latest_update?.review_comment&&!row.active_corrections?.some((item:{id:number})=>item.id===row.latest_update.id)}<p><strong>Review comment</strong> · {row.latest_update.review_comment}</p>{/if}
       {#each row.active_corrections??[] as correction (correction.id)}
        <p class="sp-correction"><strong>{correctionStage(correction)} rework comment</strong><span>{correction.review_comment}</span>{#if correction.reviewed_by}<small>{correction.reviewed_by} · {stamp(correction.reviewed_at)}</small>{/if}</p>
       {/each}
       {#if Number(row.issue_count)>0}<button class="text-button sp-issue-text" type="button" onclick={()=>onopen(row.request_id,row.id)}>Rework / rejection history ({row.issue_count})</button>{/if}
      </div>
     {/if}
    </article>
   {:else}<p class="sp-empty">No indents match these filters. Clear the search or choose another view.</p>{/each}
  </div>
  <footer class="sp-pagination"><span>{data.total} indents · Page {page}</span><div><button class="button secondary" type="button" disabled={busy||page===1} onclick={()=>page--}>Previous</button><button class="button secondary" type="button" disabled={busy||page*50>=data.total} onclick={()=>page++}>Next</button></div></footer>
 {/if}
</section>

{#if editor}
 {#key editor.row.id+':'+editor.step}
  {@const selected=editor}
  <SampleProcessPanel piece={selected.row} merchant={selected.row.merchant_id?selected.row.merchant:''} editorOnly initialStep={selected.step} onclose={closeStage} onchange={updated} onaudit={()=>audit(selected.row)}/>
 {/key}
{/if}

<style>
 .sp-board{min-width:0;border:1px solid #dce4ea;border-radius:16px;background:#fff;color:#18293a;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",sans-serif;font-size:13px;font-weight:600}
 .sp-board__heading{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:16px 20px;border-bottom:1px solid #e7edf1}
 .sp-board__heading h3{margin:0;font-size:18px;font-weight:750;color:#172c40}
 .sp-board__heading p{margin:4px 0 0;color:#425569;font-size:12px;line-height:1.5}
 .sp-heading-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px}
 .sp-refresh,.sp-details{display:inline-flex;align-items:center;justify-content:center;gap:7px;white-space:nowrap;min-height:44px;flex:none}
 .sp-filters{display:flex;align-items:end;gap:12px;margin:0;padding:12px 20px;background:#f8fafb;border-bottom:1px solid #e7edf1}
 .sp-filters label{display:grid;gap:6px;color:#263d52;font-size:12px;font-weight:700;min-width:0}
 .sp-search{flex:1}
 .sp-search-field{position:relative;display:block;min-width:0}
 .sp-filters .sp-search-field input{padding-right:38px}
 .sp-search-spinner{position:absolute;inset:0 12px 0 auto;display:flex;align-items:center;pointer-events:none}
 .sp-filters input,.sp-filters select{width:100%;min-height:44px;padding:8px 12px;border:1px solid #bdcad5;border-radius:10px;background:#fff;color:#152637;font:inherit;font-weight:600;caret-color:#08776d}
 .sp-filters input::placeholder{color:#526273;opacity:1}
 .sp-filters select{max-width:270px}
 .sp-legend{display:flex;flex-wrap:wrap;gap:8px 16px;padding:10px 20px;font-size:11px;color:#34485e;border-bottom:1px solid #e7edf1}
 .sp-key{display:flex;align-items:center;gap:6px}
 .sp-key::before{content:'';width:8px;height:8px;border:1px solid currentColor;border-radius:2px;background:#edf3f7}
 .sp-key--complete::before{background:#d9eee4;color:#5f9a7a}.sp-key--active::before{background:#dceef8;color:#5884a3}.sp-key--pending::before{background:#fff0c9;color:#ac8434}.sp-key--issue::before{background:#f9dce0;color:#b46e77}
 .sp-list{max-height:73vh;overflow:auto;overscroll-behavior:contain;scrollbar-color:#acbac8 #f4f7fa;scrollbar-width:thin}
 .sp-indent{padding:14px 20px;border-bottom:1px solid #e4ebf0;min-width:0}
 .sp-indent:last-child{border-bottom:0}
 .sp-indent__heading{display:grid;grid-template-columns:minmax(180px,1.3fr) minmax(170px,1.3fr) minmax(130px,1fr) auto;align-items:center;gap:12px;margin-bottom:10px}
 .sp-indent__identity,.sp-indent__details,.sp-indent__status{min-width:0}
 .sp-indent__identity strong{display:block;font-size:15px;font-weight:750;color:#142b40;font-variant-numeric:tabular-nums}
 .sp-indent__identity>span,.sp-indent__details>b{display:block;margin-top:2px;font-size:12px;color:#21384b;overflow-wrap:anywhere;font-weight:700}
 .sp-indent small,.sp-indent__details>span{display:block;color:#42566a;font-size:11px;line-height:1.5;margin-top:2px;overflow-wrap:anywhere}
 .sp-stages{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;margin:0;padding:0;list-style:none}
 .sp-stages li{display:flex;min-width:0}
 .sp-stage{display:block;width:100%;min-height:44px;padding:6px 8px;text-align:left;border:1px solid #d5dfe7;border-radius:8px;background:#f8fafb;color:#293f54;font:inherit;cursor:pointer}
 .sp-stage__label{display:flex;align-items:center;gap:4px;font-size:12px;font-weight:750;line-height:1.25}
 .sp-stage__label :global(svg){flex:none}
 .sp-stage__value{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:3px;font-size:11px;line-height:1.3;font-weight:600;color:#43576b}
 .sp-stage:hover{border-color:#177c70;background:#eef8f5}
 .sp-stage--complete{border-color:#a9ceb9;background:#eff8f2;color:#185c3e}.sp-stage--complete .sp-stage__value{color:#2c5e47}
 .sp-stage--active{border-color:#adcbdc;background:#edf5fa;color:#164e70}.sp-stage--active .sp-stage__value{color:#2b5c79}
 .sp-stage--pending{border-color:#e2c884;background:#fff8e6;color:#825413}.sp-stage--pending .sp-stage__value{color:#825413}
 .sp-stage--issue{border-color:#dfb1b9;background:#fff0f2;color:#8d293a}.sp-stage--issue .sp-stage__value{color:#8d293a}
 .sp-stage:disabled{cursor:wait;opacity:.65}
 .sp-chip{display:inline-flex;align-items:center;max-width:100%;width:fit-content;border-radius:7px;padding:4px 7px;border:1px solid #cdd8e3;background:#f1f5f8;color:#354c64;font-size:11px;line-height:1.35;font-weight:750;overflow-wrap:anywhere}
 .sp-chip--waiting{background:#f0f4f8;border-color:#d1dce6;color:#354c64}.sp-chip--active{color:#194d7d;background:#edf5ff;border-color:#b8d2ed}.sp-chip--pending{color:#80500d;background:#fff6df;border-color:#dfc78f}.sp-chip--complete{color:#155a3b;background:#edf8f1;border-color:#b4d4c0}.sp-chip--issue{color:#8f2638;background:#fff0f2;border-color:#dfb6be}
 .sp-indent__updates{display:flex;align-items:center;flex-wrap:wrap;gap:5px 10px;margin-top:10px;font-size:11px;color:#405469;line-height:1.5}
 .sp-indent__updates p{flex-basis:100%;margin:0;color:#273d51;white-space:pre-wrap;overflow-wrap:anywhere}
 .sp-indent__updates .text-button{min-height:32px;padding:2px 0;font-size:11px}
 .sp-issue-text{color:#922c3d!important;font-weight:750}
 .sp-notice,.sp-board>.form-error{margin:10px 20px;font-size:13px}.sp-notice{color:#075e54}
 .sp-empty{padding:28px 20px;margin:0;color:#3d5368;line-height:1.5}
 .sp-pagination{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 20px;border-top:1px solid #e1e8ee;font-size:12px;font-variant-numeric:tabular-nums}
 .sp-pagination>div{display:flex;gap:8px}
 .sp-board :is(button,input,select):focus-visible{outline:2px solid #08796f;outline-offset:2px}
 .sp-board ::selection{background:#c6e8df;color:#102b33}

 .sp-board--progress {
  --progress-muted: #405469;
  --progress-border: #d9e3eb;
  border: 0;
  background: transparent;
 }
 .sp-board--progress .sp-board__heading {
  align-items: start;
  padding: 0 0 16px;
  border: 0;
 }
 .sp-board--progress .sp-board__heading h3 {font-size: 24px !important; line-height: 1.25;}
 .sp-board--progress .sp-board__heading p {font-size: 13px;}
 .sp-board--progress .sp-filters {
  align-items: center;
  gap: 12px;
  padding: 8px;
  border: 1px solid var(--progress-border);
  border-radius: 12px;
  background: #fff;
 }
 .sp-board--progress .sp-search {
  position: relative;
  min-width: 160px;
 }
 .sp-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
 }
 .sp-board--progress .sp-search :global(.sp-search-icon) {
  position: absolute;
  inset: 50% auto auto 12px;
  transform: translateY(-50%);
  color: var(--progress-muted);
  pointer-events: none;
 }
 .sp-board--progress .sp-search input {
  border-color: transparent;
  background: transparent;
  padding-left: 38px;
 }
 .sp-board--progress .sp-filter-view {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  padding-left: 12px;
  border-left: 1px solid var(--progress-border);
 }
 .sp-board--progress .sp-filter-view select {width: min(180px, 21vw); background: #f5f8fa;}
 .sp-board--progress .sp-filters .button {min-height: 44px; padding-inline: 20px;}
 .sp-board--progress .sp-legend {padding: 12px 2px; border: 0;}
 .sp-key--unrecorded::before {background: #fff;}
 .sp-board--progress .sp-list {display: grid; gap: 16px; max-height: none; overflow: visible;}
 .sp-board--progress .sp-indent {
  padding: 0;
  border: 1px solid var(--progress-border);
  border-radius: 16px;
  background: #fff;
  overflow: hidden;
 }
 .sp-board--progress .sp-indent__heading {
  grid-template-columns: minmax(0,1fr) minmax(0,1fr) minmax(0,1.15fr) auto;
  padding: 14px 16px;
  margin: 0;
  background: #f5f8fa;
  border-bottom: 1px solid var(--progress-border);
 }
 .sp-board--progress .sp-indent__identity strong {font-size: 17px; overflow-wrap: anywhere;}
 .sp-serial{display:inline-block;margin-right:.55em;color:var(--progress-muted);font-size:.85em}
 @media(min-width:851px){
  .sp-board--progress .sp-indent:nth-child(4n+1){--card-fill:#f1f7fc;--card-header:#e7f1fa}
  .sp-board--progress .sp-indent:nth-child(4n+2){--card-fill:#f1f8f5;--card-header:#e6f3ed}
  .sp-board--progress .sp-indent:nth-child(4n+3){--card-fill:#f7f4fb;--card-header:#efe9f8}
  .sp-board--progress .sp-indent:nth-child(4n+4){--card-fill:#fcf7ee;--card-header:#f8eedc}
  .sp-board--progress .sp-indent{background:var(--card-fill)}
  .sp-board--progress .sp-indent__heading{background:var(--card-header)}
 }
 .sp-board--progress .sp-indent__status {justify-self: end; text-align: right;}
 .sp-board--progress .sp-chip {border-radius: 999px; padding: 4px 10px;}
 .sp-board--progress .sp-stages {gap: 8px; padding: 14px 16px;}
 .sp-board--progress .sp-stage {
  --stage-fill: #fff;
  --stage-ink: #344a60;
  --stage-border: #cbd7e2;
  min-height: 54px;
  padding: 7px 9px;
  background: var(--stage-fill);
  color: var(--stage-ink);
  border-color: var(--stage-border);
 }
 .sp-board--progress .sp-stage__label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .025em;
 }
 .sp-board--progress .sp-stage__value {
  color: inherit;
  white-space: normal;
  overflow-wrap: anywhere;
 }
 .sp-board--progress .sp-stage--complete {--stage-fill: #e2f5e9; --stage-ink: #145239; --stage-border: #8cc5a4;}
 .sp-board--progress .sp-stage--active {--stage-fill: #e4efff; --stage-ink: #173f79; --stage-border: #7ca6da;}
 .sp-board--progress .sp-stage--pending {--stage-fill: #fff1cd; --stage-ink: #69450d; --stage-border: #d6b46b;}
 .sp-board--progress .sp-stage--issue {--stage-fill: #fde6e9; --stage-ink: #85263b; --stage-border: #d995a1;}
 .sp-board--progress .sp-stage:not(:disabled):hover {border-color: var(--stage-ink);}
 .sp-board--progress .sp-indent__updates {
  margin: 0;
  padding: 10px 16px;
  border-top: 1px solid var(--progress-border);
  background: #fbfcfd;
 }
 .sp-board--progress .sp-pagination {padding-inline: 0; margin-top: 12px;}
 .sp-board--progress :is(.sp-notice,.form-error) {margin-inline: 0;}
 @media(min-width:1024px) and (max-width:1240px){.sp-board__heading,.sp-filters,.sp-indent,.sp-pagination{padding-inline:14px}.sp-indent__heading{grid-template-columns:minmax(140px,1.2fr) minmax(140px,1.2fr) minmax(110px,1fr) auto}.sp-stage{padding-inline:6px}.sp-stage__label{font-size:11px}}
 @media(max-width:850px){.sp-stages{grid-template-columns:repeat(4,minmax(0,1fr))}.sp-indent__heading{grid-template-columns:1fr 1fr}.sp-filters{flex-wrap:wrap}.sp-search{flex-basis:100%}}
 @media(max-width:850px) {
  .sp-board--progress .sp-indent__heading {grid-template-columns: minmax(0,1fr) minmax(0,1fr);}
  .sp-board--progress .sp-indent__status {justify-self: start; text-align: left;}
  .sp-board--progress .sp-details {justify-self: end;}
  .sp-board--progress .sp-filter-view {flex: 1; border: 0;}
  .sp-board--progress .sp-filter-view select {width: 100%;}
 }
 @media(prefers-contrast:more){.sp-board :is(small,.sp-stage__value){color:#1d3348}.sp-stage,.sp-chip{border-color:currentColor}}
 .sp-indent__updates .sp-correction{display:grid;gap:3px;flex:1 0 100%;padding:8px 10px;border-left:3px solid #b12b42;border-radius:4px;background:#fff1f2;color:#792535}
 .sp-correction span{white-space:pre-wrap;overflow-wrap:anywhere}
 .sp-correction small{color:#5c4b55}
</style>
