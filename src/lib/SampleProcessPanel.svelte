<script lang="ts">
 import {ChevronRight} from '@lucide/svelte';
 import SampleStageDialog from './SampleStageDialog.svelte';
 import SampleProcessChanges from './SampleProcessChanges.svelte';
 import {untrack} from 'svelte';
 import {api} from './api';
 import {processSteps,processLabel,actionLabel,stamp,planFields,sampleStatusLabel,type ProcessStep} from './sampleProcess';
 let {piece,merchant='',onchange,onaudit}:{piece:any;merchant?:string;onchange:()=>Promise<void>;onaudit:()=>void}=$props();
 let data:any=$state(null),busy=$state(false),error=$state(''),notice=$state(''),action=$state(''),note=$state(''),reviewNote=$state(''),result=$state(''),stage=$state(''),expected=$state(''),destination=$state('Merchant'),values:any=$state({}),sequence=0;
 let selectedStep=$state<ProcessStep|null>(null);
 let editorError=$state('');
 let pending=$derived(data?.updates.find((u:any)=>u.decision==='Pending'));
 let approvalTarget=$derived(data?.approval_target||'assigned merchant');
 let pendingTarget=$derived(pending?.approval_target||'assigned merchant');
 let actions=$derived((data?.actions??[]) as {key:string;label:string}[]);
 let stageActions=$derived.by(()=>{
  const step=selectedStep;
  if(!step||pending)return [];
  const stage=step[0];
  return actions.filter(item=>
   step[3].some(key=>key===item.key)
   || item.key==='exception'&&data?.stages.includes(stage)
   || item.key==='resolve'&&piece.production.process_exception?.stage===stage
  );
 });
 let activeAction=$derived(stageActions.find(item=>item.key===action));
 let editorFields=$derived(
  selectedStep?.[2]==='allocation_actual'?planFields.filter(([key])=>key==='sample_maker'||key==='allocation_plan_date'):
  selectedStep?.[2]==='merchant_actual'?planFields.filter(([key])=>key==='handover_dc'):planFields
 );
 $effect(()=>{const id=piece.id,v=piece.version;untrack(()=>load(id));return()=>{sequence++}});
 async function load(id=piece.id){const seq=++sequence;try{const d=await api('/sample-indents/'+id+'/process');if(seq===sequence){data=d;error=''}}catch(e){if(seq===sequence)error=(e as Error).message}}
 function choose(key:string){
  if(key==='audit'){closeEditor();onaudit();return}
  action=key;note='';editorError='';
  const material=key==='fabric'||key==='trims';
  result=key==='file_review'?'Clear':key==='exception'?'Rework':material?piece.production[key+'_availability']||(piece.production[key+'_update_date']?'In stock':''):'';
  expected=material?(data?.material_expected?.[key]??piece.production[key+'_expected_date']??''):'';
  values={...piece.production};
  destination=piece.production.handover_destination||'Merchant';
  stage=key==='resolve'?piece.production.process_exception?.stage||'':selectedStep?.[0]||'';
 }
 function closeEditor(){selectedStep=null;action='';editorError=''}
 function openStage(step:ProcessStep){
  selectedStep=step;
  const missingTailor=step[2]==='allocation_actual'&&!piece.production.sample_maker;
  const missingDC=step[2]==='merchant_actual'&&!piece.production.handover_dc;
  const preferred=missingTailor||missingDC?'plan':step[3][0];
  const next=stageActions.find(item=>item.key===preferred)??stageActions.find(item=>item.key!=='exception');
  if(next?.key==='audit'&&stageActions.some(item=>item.key==='audit_start')){choose('audit_start');return}
  choose(next?.key??'');
 }
 function milestone(key:string,field:string){
  const actual=piece.production[field];
  if(actual)return stamp(actual);
  if(key==='fabric'||key==='trims'){
   const availability=piece.production[key+'_availability'];
   if(availability){
    const date=data?.material_expected?.[key]??piece.production[key+'_expected_date'];
    return availability+(date?' · Expected '+stamp(date):'');
   }
  }
  return 'Not recorded';
 }
 async function send(review=''){if(busy||(!review&&(!activeAction||pending)))return;busy=true;error='';editorError='';notice='';try{
  const payload:any=review?{action:'review_process',update_id:pending.id,decision:review,note:reviewNote}:{action,note,result,stage,expected_date:result==='In stock'?'':expected,destination};
  if(action==='plan'&&!review)payload.production=Object.fromEntries(editorFields.map(([key])=>[key,String(values[key]||'')]));
  if(action==='handover'&&!review)payload.dispatch=Object.fromEntries(['awb','dispatch_to','dispatch_from','dispatch_contact'].map(key=>[key,values[key]||'']));
  await api('/sample-indents/'+piece.id,{version:piece.version,...payload});closeEditor();reviewNote='';await onchange();await load();notice=review?'Review recorded.':data?.can_record_directly?'Update recorded.':'Update submitted for approval by '+approvalTarget+'.';
 }catch(e){if(selectedStep||action)editorError=(e as Error).message;else error=(e as Error).message}finally{busy=false}}

</script>
<section class="sp-process" aria-label={'Process for indent '+piece.id}>
 <div class="sp-process__heading"><div><h4>Department follow-up</h4><p>Responsible merchant: <strong>{merchant||'Not assigned — MD / Super Admin must assign one'}</strong></p></div><span class="sp-status" class:sp-status--issue={!!piece.production.process_exception||['Rework','Rejected'].includes(piece.status)}>{piece.production.process_exception?piece.production.process_exception.result:sampleStatusLabel(piece.status)}</span></div>
 <ol class="sp-timeline" aria-label="Saved milestones">
  {#each processSteps as step (step[2])}
   <li class:sp-timeline__done={!!piece.production[step[2]]}>
    <button type="button" aria-haspopup="dialog" aria-label={step[1]+': '+milestone(step[0],step[2])} disabled={busy||(!data&&!error)} onclick={()=>openStage(step)}>
     <strong>{step[1]}</strong><span>{milestone(step[0],step[2])}</span>
    </button>
   </li>
  {/each}
 </ol>
 {#if error}<p class="form-error" role="alert">{error} <button class="text-button" onclick={()=>load()}>Refresh</button></p>{/if}{#if notice}<p class="sp-notice" role="status">{notice}</p>{/if}
 {#if piece.production.process_exception}<div class="sp-issue"><strong>{piece.production.process_exception.result} · {processLabel(piece.production.process_exception.stage)}</strong><p>{piece.production.process_exception.comment}</p><span>{piece.production.process_exception.by} · {stamp(piece.production.process_exception.at)}</span></div>{/if}
 {#if data}
  {#if data.late_days!=null}<p class="sp-lateness">{data.late_days} late day{data.late_days===1?'':'s'}{piece.production.handover_actual?' at final handover.':' as of today (IST).'}</p>{/if}
  {#if pending}<section class="sp-pending"><h4>Awaiting approval · {actionLabel(pending.action)}</h4><p><strong>{pending.submitted_by}</strong> · {stamp(pending.submitted_at)}</p>{#if pending.comment}<p class="sp-comment">{pending.comment}</p>{/if}
   <SampleProcessChanges changes={pending.changes}/>
   {#if data.can_review}<label>Review comment <span>(required for correction or rejection)</span><textarea bind:value={reviewNote} maxlength="2000" rows="2"></textarea></label><div class="sp-actions"><button class="button primary" disabled={busy} onclick={()=>send('Approved')}>Accept update</button><button class="button secondary" disabled={busy||!reviewNote.trim()} onclick={()=>send('Changes requested')}>Request correction</button><button class="button danger" disabled={busy||!reviewNote.trim()} onclick={()=>send('Rejected')}>Reject update</button></div>{:else}<p>Waiting for approval by {pendingTarget}.</p>{/if}
  </section>{/if}
  <details class="sp-history" open={data.updates.length>0}>
   <summary><ChevronRight size={16} aria-hidden="true"/>Update &amp; review history <span>({data.updates.length}{data.updates.length===1000?'+':''})</span></summary>
   <div class="sp-history__records">
    {#each data.updates as update (update.id)}
     <article data-decision={update.decision}>
      <div class="sp-history__title">
       <strong>{actionLabel(update.action)}</strong>
       <span>{update.decision}</span>
      </div>
      <p>Submitted: <strong>{update.submitted_by}</strong> · {stamp(update.submitted_at)}</p>
      {#if update.comment}<p class="sp-comment">{update.comment}</p>{/if}
      {#if update.reviewed_by}<p>Reviewed: <strong>{update.reviewed_by}</strong> · {stamp(update.reviewed_at)}</p>{/if}
      {#if update.review_comment}<p class="sp-comment"><strong>Review:</strong> {update.review_comment}</p>{/if}
      <details class="sp-history__changes">
       <summary><ChevronRight size={14} aria-hidden="true"/>Reported changes</summary>
       <SampleProcessChanges changes={update.changes}/>
      </details>
     </article>
    {:else}
     <p>No updates recorded yet.</p>
    {/each}
   </div>
  </details>
 {/if}
  {#if selectedStep}
   <SampleStageDialog title={selectedStep[1]+' · Indent #'+piece.id} close={closeEditor} {busy}>
    <p class="stage-status"><strong>Saved status:</strong> {milestone(selectedStep[0],selectedStep[2])}</p>
    {#if stageActions.length>1||(!action&&stageActions.length===1)}
     <label>Stage action<select value={action} disabled={busy} onchange={e=>choose(e.currentTarget.value)}>
      <option value="" disabled>Choose a stage action</option>
      {#each stageActions as item}<option value={item.key}>{item.label}</option>{/each}
     </select></label>
    {/if}
    {#if pending}
     <p>An update is awaiting approval by {pendingTarget}. See the review below the stage cards.</p>
    {:else if !activeAction}
     {#if !data}<p role="status">{error||'Loading available stage actions…'}</p>
     {:else if selectedStep?.[2]==='cad_sent_at'&&data.can_send_cad&&piece.status==='Ready'&&!piece.production.cad_sent_at&&!piece.production.process_exception}
      <p>Record fabric and trims availability before sending this indent to CAD.</p>
     {:else if !stageActions.length}
      {#if piece.production[selectedStep[2]]}<p>This milestone is recorded. Its saved date is shown above.</p>
      {:else}<p>No update is available for this stage with your current access.</p>{/if}
     {/if}
    {:else}
     <form class="sp-editor" onsubmit={e=>{e.preventDefault();send()}}>
      {#if editorError}<p class="form-error" role="alert">{editorError}</p>{/if}
      <h4>{activeAction.label}</h4>
   {#if action==='fabric'||action==='trims'}<div class="sp-form-grid"><label>Availability<select bind:value={result} required><option value="">Choose availability</option><option value="In stock">In house / in stock</option><option>To order</option><option>Ordered</option></select></label>{#if result==='To order'||result==='Ordered'}<label>Expected arrival date<input type="date" bind:value={expected} required={result==='Ordered'}/></label>{/if}</div>
   {:else if action==='send_cad'}<p>Send this indent to Pattern follow-up for CAD to pick up.</p>
   {:else if action==='cut_start'||action==='cut'}<p>Confirm the pattern and marker are complete, the sample file is clear, and fabric and trims are ready.</p>
   {:else if action==='allocate'}<p>Allocate this indent to {piece.production.sample_maker||'the sample tailor saved in the plan'}.</p>
   {:else if action==='plan'}<div class="sp-form-grid">{#each editorFields as [key,label,type]}<label>{label}<input type={type==='date'?'date':'text'} bind:value={values[key]} maxlength="2000"/></label>{/each}</div>
   {:else if action==='file_review'}<label>Sample file<select bind:value={result}><option>Clear</option><option>Missing</option></select></label>
   {:else if action==='exception'||action==='resolve'}<div class="sp-form-grid"><label>Department / stage<select bind:value={stage} disabled={action==='resolve'} required>{#each data.stages as key}<option value={key}>{processLabel(key)}</option>{/each}</select></label>{#if action==='exception'}<label>Result<select bind:value={result}><option>Rework</option><option>Rejected</option></select></label>{/if}</div>
   {:else if action==='merchant_handover'}{#if piece.production.handover_dc}<p>Handover DC: <strong>{piece.production.handover_dc}</strong></p>{/if}<label>Handover destination<select bind:value={destination}><option>Merchant</option><option>Showroom</option></select></label>
   {:else if action==='handover'}<div class="sp-form-grid"><label>AWB / shipment or delivery reference<input bind:value={values.awb} maxlength="2000" required/></label><label>Contact<input bind:value={values.dispatch_contact} maxlength="2000"/></label><label>To — customer name and address<textarea bind:value={values.dispatch_to} maxlength="2000" required></textarea></label><label>From — sender name and address<textarea bind:value={values.dispatch_from} maxlength="2000" required></textarea></label></div>
   {:else if action==='buyer_feedback'}<label>Buyer result<select bind:value={result} required><option value="">Choose result</option><option>Pass</option><option>Fail</option><option>Comments</option></select></label>{/if}
   <label>Update comment{#if ['exception','resolve','buyer_feedback'].includes(action)||action==='file_review'&&result==='Missing'||['fabric','trims'].includes(action)&&result!=='In stock'} <b class="sp-required">*</b>{/if}<textarea bind:value={note} rows="2" maxlength="2000" required={['exception','resolve','buyer_feedback'].includes(action)||action==='file_review'&&result==='Missing'||['fabric','trims'].includes(action)&&result!=='In stock'}></textarea></label>
   <div class="sp-actions"><button class="button secondary" type="button" disabled={busy} onclick={closeEditor}>Cancel</button><button class="button primary" disabled={busy}>{busy?'Saving…':data.can_record_directly?(action==='send_cad'?'Send to CAD':'Record update'):'Submit for approval'}</button></div>
     </form>
    {/if}
   </SampleStageDialog>
  {/if}

</section>
<style>
 .sp-process{color:#172638;font-weight:600}.sp-process__heading{display:flex;justify-content:space-between;align-items:start;gap:12px}.sp-process h4{font-size:15px;margin:0 0 4px}.sp-process p{margin:4px 0 8px;font-size:13px}.sp-status{border:1px solid #d0dedb;background:#f0f7f5;color:#075e54;border-radius:8px;padding:6px 10px;font-size:12px;font-weight:700}.sp-status--issue{color:#a12435;background:#fff0f2;border-color:#ecc7ce}.sp-timeline{list-style:none;display:flex;gap:8px;margin:12px 0;padding:0 0 8px;overflow-x:auto}.sp-timeline li{display:flex;flex:0 0 120px}
 .sp-timeline button{width:100%;min-height:66px;padding:9px;background:#fff;border:1px solid #ced8e3;border-radius:8px;color:#162638;text-align:left;font:inherit;cursor:pointer}
 .sp-timeline button:hover{border-color:#08746f;background:#f0faf8}
 .sp-timeline button:focus-visible{outline:2px solid #08746f;outline-offset:-3px}
 .sp-timeline strong,.sp-timeline span{display:block;font-size:12px;font-weight:750}
 .sp-timeline span{margin-top:4px;color:#324154;font-size:11px;font-weight:650}
 .sp-timeline__done button{background:#e8f5ec;border-color:#b8d9c7;color:#145037}
 .sp-timeline__done span{color:#254d3c}.sp-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:12px}.sp-process label{display:block;font-size:13px;font-weight:700;color:#172536}.sp-process input,.sp-process select,.sp-process textarea{display:block;width:100%;min-width:0;min-height:44px;margin-top:6px;padding:8px 10px;border:1px solid #cbd5df;border-radius:12px;background:#f8fafc;color:#111;font:inherit}.sp-process textarea{resize:vertical}.sp-process label>span{font-weight:500;font-size:11px}.sp-form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:12px 16px;margin-bottom:12px}.stage-status{margin-top:0!important;color:#23384b}.sp-editor,.sp-pending{padding:16px;margin-top:12px;border:1px solid #dce3e9;border-radius:12px;background:#fafbfc}.sp-pending{background:#fffaf0;border-color:#e9d6af}.sp-issue{padding:12px;border:1px solid #ecc7ce;border-radius:12px;color:#961f30;background:#fff2f4;margin:12px 0}.sp-comment{white-space:pre-wrap;overflow-wrap:anywhere}.sp-required{color:#a12435}.sp-notice{color:#075e54}.sp-lateness{color:#3f4b5b}
 .sp-history{margin-top:16px;border-top:1px solid #dce3e9;padding-top:8px}
 .sp-history summary{display:flex;align-items:center;gap:6px;min-height:44px;cursor:pointer;list-style:none;color:#26384a;font-weight:700}
 .sp-history summary::-webkit-details-marker{display:none}
 .sp-history summary:focus-visible{outline:2px solid #08746f;outline-offset:2px;border-radius:5px}
 .sp-history summary :global(svg){flex:none;transition:transform 160ms ease}
 .sp-history[open]>summary :global(svg),.sp-history__changes[open]>summary :global(svg){transform:rotate(90deg)}
 .sp-history>summary span{color:#4b5d70}
 .sp-history__records{display:grid;gap:16px;padding-top:8px}
 .sp-history article{min-width:0;padding:16px;border:1px solid #dce3e9;border-radius:12px;background:#f8fafc;box-shadow:0 1px 2px #1326390d;--decision-color:#26384a}
 .sp-history article[data-decision="Approved"]{background:#f4fbf6;border-color:#d1e8d7;--decision-color:#10753b}
 .sp-history article[data-decision="Pending"],.sp-history article[data-decision="Changes requested"]{background:#fff9eb;border-color:#fde4a9;--decision-color:#805700}
 .sp-history article[data-decision="Rejected"]{background:#fef3f3;border-color:#fbd5d5;--decision-color:#ad202a}
 .sp-history__title{display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:4px 12px;margin-bottom:10px}
 .sp-history__title strong{font-size:14px;color:#172536}
 .sp-history__title span{color:var(--decision-color);font-size:13px;font-weight:750}
 .sp-history article p{margin:0 0 9px;color:#26384a;overflow-wrap:anywhere}
 .sp-history article .sp-comment{color:#172536}
 .sp-history__changes{margin-top:12px;border-top:1px solid #26384a24;padding-top:4px}
 @media(prefers-reduced-motion:reduce){.sp-history summary :global(svg){transition:none}}
</style>
