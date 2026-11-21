<script lang="ts">
 import {SkeletonLoader,SpinnerLoader} from '#lib/components/loaders/index.ts';
 import {ChevronRight} from '@lucide/svelte';
 import SampleStageDialog from './SampleStageDialog.svelte';
 import SampleCommentField from './SampleCommentField.svelte';
 import {untrack} from 'svelte';
 import {api} from './api';
 import {indentReference,processSteps,processLabel,actionLabel,stamp,correctionForStep,correctionStage,planFields,sampleStatusLabel,type ProcessStep} from './sampleProcess';
 let {piece,merchant='',onchange,onaudit,editorOnly=false,initialStep='',onclose}:{piece:any;merchant?:string;onchange:()=>Promise<void>;onaudit:()=>void;editorOnly?:boolean;initialStep?:string;onclose?:()=>void}=$props();
 let data:any=$state(null),busy=$state(false),loading=$state(true),error=$state(''),notice=$state(''),action=$state(''),note=$state(''),reviewNote=$state(''),result=$state(''),stage=$state(''),expected=$state(''),destination=$state('Merchant'),values:any=$state({}),sequence=0;
 let selectedStep=$state<ProcessStep|null>(null);
 let editorError=$state('');
 let updateDictating=$state(false),reviewDictating=$state(false);
 let pending=$derived(data?.updates.find((u:any)=>u.decision==='Pending'));
 let pendingForStep=$derived(selectedStep&&pending?.stage===selectedStep[0]&&selectedStep[3].some(key=>key===pending?.action));
 let corrections=$derived(data?.active_corrections??[]);
 let stepCorrection=$derived(selectedStep?correctionForStep(corrections,selectedStep):undefined);
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
 let commentRequired=$derived(['exception','resolve','buyer_feedback'].includes(action)||action==='file_review'&&result==='Missing'||['fabric','trims'].includes(action)&&result!=='In stock');
 let editorFields=$derived(
  selectedStep?.[2]==='allocation_actual'?planFields.filter(([key])=>key==='sample_maker'||key==='allocation_plan_date'):
  selectedStep?.[2]==='merchant_actual'?planFields.filter(([key])=>key==='handover_dc'):planFields
 );
 $effect(()=>{const id=piece.id,v=piece.version,step=initialStep;untrack(()=>{if(editorOnly&&!selectedStep&&step)selectedStep=processSteps.find(item=>item[2]===step)??null;load(id)});return()=>{sequence++}});
 async function load(id=piece.id){const seq=++sequence;loading=true;try{const d=await api('/sample-indents/'+id+'/process');if(seq===sequence){data=d;error='';if(editorOnly&&selectedStep&&!action)openStage(selectedStep)}}catch(e){if(seq===sequence)error=(e as Error).message}finally{if(seq===sequence)loading=false}}
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
 function closeEditor(){selectedStep=null;action='';editorError='';if(editorOnly)onclose?.()}
 function openStage(step:ProcessStep){
  selectedStep=step;
  const missingDC=step[2]==='merchant_actual'&&!piece.production.handover_dc;
  const preferred=missingDC?'plan':step[3][0];
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
 async function send(review=''){if(busy||loading||(review?!pending||!data?.can_review||reviewDictating:updateDictating||!activeAction||pending))return;busy=true;error='';editorError='';notice='';try{
  const payload:any=review?{action:'review_process',update_id:pending.id,decision:review,note:reviewNote}:{action,note,result,stage,expected_date:result==='In stock'?'':expected,destination};
  if(action==='plan'&&!review)payload.production=Object.fromEntries(editorFields.map(([key])=>[key,String(values[key]||'')]));
  if(action==='handover'&&!review)payload.dispatch=Object.fromEntries(['awb','dispatch_to','dispatch_from','dispatch_contact'].map(key=>[key,values[key]||'']));
  await api('/sample-indents/'+piece.id,{version:piece.version,...payload});reviewNote='';if(editorOnly){await onchange();onclose?.();return}closeEditor();await onchange();await load();notice=review==='Changes requested'?'Rework requested.':review?'Review recorded.':data?.can_record_directly?'Update recorded.':'Update submitted for approval by '+approvalTarget+'.';
 }catch(e){if(selectedStep||action)editorError=(e as Error).message;else error=(e as Error).message}finally{busy=false}}

</script>
{#snippet pendingReview()}
 <section class="sp-pending" aria-label="Update awaiting approval">
  <h4>{actionLabel(pending.action)} · Awaiting approval</h4>
  <p>Submitted by <strong>{pending.submitted_by}</strong> · {stamp(pending.submitted_at)}</p>
  {#if pending.comment}<p class="sp-comment">{pending.comment}</p>{/if}
  {#if data.can_review}
   {#key pending.id}
    <SampleCommentField label="Review comment" hint="(required for correction or rejection)" bind:value={reviewNote} bind:dictating={reviewDictating} disabled={busy||loading} indentId={piece.id} action="review_process" updateId={pending.id}/>
   {/key}
   <div class="sp-actions">
    <button class="button primary" type="button" disabled={busy||loading||reviewDictating} onclick={()=>send('Approved')}>Accept update</button>
    <button class="button secondary" type="button" disabled={busy||loading||reviewDictating||!reviewNote.trim()} onclick={()=>send('Changes requested')}>Request correction</button>
    <button class="button danger" type="button" disabled={busy||loading||reviewDictating||!reviewNote.trim()} onclick={()=>send('Rejected')}>Reject update</button>
   </div>
  {:else}
   <p>Waiting for approval by {pendingTarget}.</p>
  {/if}
 </section>
{/snippet}
<section class="sp-process" aria-label={'Process for indent '+piece.id} aria-busy={loading||busy}>
{#if !editorOnly}
 <div class="sp-process__heading"><div><h4>Department follow-up</h4><p>Responsible merchant: <strong>{merchant||'Not assigned — MD / Super Admin must assign one'}</strong></p></div><span class="sp-status" class:sp-status--issue={!!piece.production.process_exception||!!corrections.length||['Rework','Rejected'].includes(piece.status)}>{piece.production.process_exception?piece.production.process_exception.result:corrections.length?'Rework requested':sampleStatusLabel(piece.status)}</span></div>
 {#if loading&&!data&&!error}<SkeletonLoader variant="list" rows={2} label="Loading department follow-up…"/>{:else}
 {#if loading&&data}<div class="sp-loading"><SpinnerLoader size={16} label=""/><span role="status">Updating department follow-up…</span></div>{/if}
 <ol class="sp-timeline" aria-label="Saved milestones">
  {#each processSteps as step (step[2])}
   <li class:sp-timeline__done={!!piece.production[step[2]]}>
    <button type="button" aria-haspopup="dialog" aria-label={step[1]+': '+milestone(step[0],step[2])} disabled={busy||loading||(!data&&!error)} onclick={()=>openStage(step)}>
     <strong>{step[1]}</strong><span>{milestone(step[0],step[2])}</span>
    </button>
   </li>
  {/each}
 </ol>
 {/if}
 {#if error}<p class="form-error" role="alert">{error} <button class="text-button" onclick={()=>load()}>Refresh</button></p>{/if}{#if notice}<p class="sp-notice" role="status">{notice}</p>{/if}
 {#if piece.production.process_exception}<div class="sp-issue"><strong>{piece.production.process_exception.result} · {processLabel(piece.production.process_exception.stage)}</strong><p>{piece.production.process_exception.comment}</p><span>{piece.production.process_exception.by} · {stamp(piece.production.process_exception.at)}</span></div>{/if}
 {#if data}
  {#if data.late_days!=null}<p class="sp-lateness">{data.late_days} late day{data.late_days===1?'':'s'}{piece.production.handover_actual?' at final handover.':' as of today (IST).'}</p>{/if}
  {#each corrections as correction (correction.id)}
   <section class="sp-issue" aria-label={correctionStage(correction)+' rework requested'}><strong>Rework requested · {correctionStage(correction)}</strong><p class="sp-comment">{correction.review_comment}</p>{#if correction.reviewed_by}<span>{correction.reviewed_by} · {stamp(correction.reviewed_at)}</span>{/if}</section>
  {/each}
  {#if pending&&!selectedStep}{@render pendingReview()}{/if}
  <details class="sp-history">
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
     </article>
    {:else}
     <p>No updates recorded yet.</p>
    {/each}
   </div>
  </details>
 {/if}
{/if}
  {#if selectedStep}
   <SampleStageDialog title={selectedStep[1]+' · Indent '+indentReference(piece)} close={closeEditor} {busy}>
    {#if !pendingForStep}<p class="stage-status">Saved status: <strong>{milestone(selectedStep[0],selectedStep[2])}</strong></p>{/if}
    {#if stepCorrection}<section class="sp-issue"><strong>Rework requested</strong><p class="sp-comment">{stepCorrection.review_comment}</p></section>{/if}
    {#if editorOnly&&error}<p class="form-error" role="alert">{error} <button class="text-button" type="button" onclick={()=>load()}>Retry</button></p>{/if}
    {#if editorError}<p class="form-error" role="alert">{editorError}</p>{/if}
    {#if stageActions.length>1||(!action&&stageActions.length===1)}
     <label class="stage-action">Stage action<select value={action} disabled={busy} onchange={e=>choose(e.currentTarget.value)}>
      <option value="" disabled>Choose a stage action</option>
      {#each stageActions as item}<option value={item.key}>{item.label}</option>{/each}
     </select></label>
    {/if}
    {#if pending}
     {@render pendingReview()}
    {:else if !activeAction}
     {#if !data}{#if error}<p role="status">{error}</p>{:else}<SkeletonLoader variant="detail" rows={2} columns={2} label="Loading available stage actions…"/>{/if}
     {:else if selectedStep?.[2]==='cad_sent_at'&&data.can_send_cad&&piece.status==='Ready'&&!piece.production.cad_sent_at&&!piece.production.process_exception}
      <p>Record fabric and trims availability before sending this indent to CAD.</p>
     {:else if selectedStep[0]==='audit'&&!piece.production.audit_actual&&!data.stages.includes('audit')}
      <p>The Quality team starts the audit and submits the signed report.</p>
     {:else if selectedStep[0]==='audit'&&!piece.production.audit_actual&&!stageActions.some(item=>item.key==='audit_start'||item.key==='audit')}
      <p>Finish the sample before starting the audit.</p>
     {:else if !stageActions.length}
      {#if piece.production[selectedStep[2]]}<p>This milestone is recorded. Its saved date is shown above.</p>
      {:else}<p>No update is available for this stage with your current access.</p>{/if}
     {/if}
    {:else}
     <form class="sp-editor" onsubmit={e=>{e.preventDefault();send()}}>
      <div class="sp-editor__card">
       <h4>{activeAction.label}</h4>
       {#if action==='fabric'||action==='trims'}<div class="sp-form-grid"><label>Availability<select bind:value={result} required><option value="">Choose availability</option><option value="In stock">In house / in stock</option><option>To order</option><option>Ordered</option></select></label>{#if result==='To order'||result==='Ordered'}<label>Expected arrival date<input type="date" bind:value={expected} required={result==='Ordered'}/></label>{/if}</div>
       {:else if action==='send_cad'}<p>Send this indent to Pattern follow-up for CAD to pick up.</p>
       {:else if action==='cut'&&String(piece.production.register_source?.process_status||'').trim().toUpperCase()==='UNDER CUTTING'}<p>Confirm that cutting is complete for this historical indent.</p>
       {:else if action==='cut_start'||action==='cut'}<p>Confirm the pattern and marker are complete, and fabric and trims are ready.</p>
       {:else if action==='allocate'}
        {#if piece.production.sample_maker}<p>Allocate this indent to {piece.production.sample_maker}.</p>
        {:else}<p>You can record allocation now and add the sample tailor later under “Update plan / tailor / handover DC”.</p>{/if}
       {:else if action==='plan'}<div class="sp-form-grid">{#each editorFields as [key,label,type]}<label>{label}<input type={type==='date'?'date':'text'} bind:value={values[key]} maxlength="2000"/></label>{/each}</div>
       {:else if action==='file_review'}<label>Sample file<select bind:value={result}><option>Clear</option><option>Missing</option></select></label>
       {:else if action==='exception'||action==='resolve'}<div class="sp-form-grid"><label>Department / stage<select bind:value={stage} disabled={action==='resolve'} required>{#each data.stages as key}<option value={key}>{processLabel(key)}</option>{/each}</select></label>{#if action==='exception'}<label>Result<select bind:value={result}><option>Rework</option><option>Rejected</option></select></label>{/if}</div>
       {:else if action==='merchant_handover'}{#if piece.production.handover_dc}<p>Handover DC: <strong>{piece.production.handover_dc}</strong></p>{/if}<label>Handover destination<select bind:value={destination}><option>Merchant</option><option>Showroom</option></select></label>
       {:else if action==='handover'}<div class="sp-form-grid"><label>AWB / shipment or delivery reference<input bind:value={values.awb} maxlength="2000" required/></label><label>Contact<input bind:value={values.dispatch_contact} maxlength="2000"/></label><label>To — customer name and address<textarea bind:value={values.dispatch_to} maxlength="2000" required></textarea></label><label>From — sender name and address<textarea bind:value={values.dispatch_from} maxlength="2000" required></textarea></label></div>
       {:else if action==='buyer_feedback'}<label>Buyer result<select bind:value={result} required><option value="">Choose result</option><option>Pass</option><option>Fail</option><option>Comments</option></select></label>{/if}
       {#key action+':'+stage}
        <SampleCommentField label="Update comment" placeholder={action==='pattern'?'Add pattern completion remarks or measurements…':''} bind:value={note} bind:dictating={updateDictating} required={commentRequired} disabled={busy} indentId={piece.id} {action} stage={['exception','resolve'].includes(action)?stage:''}/>
       {/key}
      </div>
      <div class="sp-actions sp-editor__actions"><button class="button secondary" type="button" disabled={busy} onclick={closeEditor}>Cancel</button><button class="button primary" disabled={busy||loading||updateDictating}>{busy?'Saving…':data.can_record_directly?(action==='send_cad'?'Send to CAD':'Record update'):'Submit for approval'}</button></div>
     </form>
    {/if}
   </SampleStageDialog>
  {/if}

</section>
<style>
 .sp-loading{display:flex;align-items:center;gap:8px;padding-block:8px;color:#3f4b5b;font-size:12px}
 .sp-process{color:#172638;font-weight:600}.sp-process__heading{display:flex;justify-content:space-between;align-items:start;gap:12px}.sp-process h4{font-size:15px;margin:0 0 4px}.sp-process p{margin:4px 0 8px;font-size:13px}.sp-status{border:1px solid #d0dedb;background:#f0f7f5;color:#075e54;border-radius:8px;padding:6px 10px;font-size:12px;font-weight:700}.sp-status--issue{color:#a12435;background:#fff0f2;border-color:#ecc7ce}.sp-timeline{list-style:none;display:flex;gap:8px;margin:12px 0;padding:0 0 8px;overflow-x:auto}.sp-timeline li{display:flex;flex:0 0 120px}
 .sp-timeline button{width:100%;min-height:66px;padding:9px;background:#fff;border:1px solid #ced8e3;border-radius:8px;color:#162638;text-align:left;font:inherit;cursor:pointer}
 .sp-timeline button:hover{border-color:#08746f;background:#f0faf8}
 .sp-timeline button:focus-visible{outline:2px solid #08746f;outline-offset:-3px}
 .sp-timeline strong,.sp-timeline span{display:block;font-size:12px;font-weight:750}
 .sp-timeline span{margin-top:4px;color:#324154;font-size:11px;font-weight:650}
 .sp-timeline__done button{background:#e8f5ec;border-color:#b8d9c7;color:#145037}
 .sp-timeline__done span{color:#254d3c}.sp-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:12px}.sp-process label{display:block;font-size:13px;font-weight:700;color:#172536}.sp-process input,.sp-process select,.sp-process textarea{display:block;width:100%;min-width:0;min-height:44px;margin-top:6px;padding:8px 10px;border:1px solid #cbd5df;border-radius:12px;background:#f8fafc;color:#111;font:inherit}.sp-process textarea{resize:vertical}.sp-form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:12px 16px;margin-bottom:12px}
 .sp-process .stage-status{margin:0 0 14px;color:#526174;font-weight:500}
 .stage-status strong{color:#172536;font-weight:700}
 .sp-process .stage-action{margin-bottom:14px}
 .sp-process .stage-action select{background-color:#fff!important}
 .sp-editor{display:grid;gap:16px;margin-top:0}
 .sp-editor__card{display:grid;gap:12px;min-width:0;padding:16px;border:1px solid #dce3e9;border-radius:12px;background:#fff;box-shadow:0 1px 2px #1326390d}
 .sp-editor__card h4,.sp-editor__card p,.sp-editor__card .sp-form-grid{margin:0}
 .sp-editor__actions{margin-top:0}
 .sp-pending{padding:16px;margin-top:12px;border:1px solid #e9d6af;border-radius:12px;background:#fffaf0}
 .sp-issue{padding:12px;border:1px solid #ecc7ce;border-radius:12px;color:#961f30;background:#fff2f4;margin:12px 0}.sp-comment{white-space:pre-wrap;overflow-wrap:anywhere}.sp-notice{color:#075e54}.sp-lateness{color:#3f4b5b}
 .sp-history{margin-top:16px;border-top:1px solid #dce3e9;padding-top:8px}
 .sp-history summary{display:flex;align-items:center;gap:6px;min-height:44px;cursor:pointer;list-style:none;color:#26384a;font-weight:700}
 .sp-history summary::-webkit-details-marker{display:none}
 .sp-history summary:focus-visible{outline:2px solid #08746f;outline-offset:2px;border-radius:5px}
 .sp-history summary :global(svg){flex:none;transition:transform 160ms ease}
 .sp-history[open]>summary :global(svg){transform:rotate(90deg)}
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
 @media(prefers-reduced-motion:reduce){.sp-history summary :global(svg){transition:none}}
</style>
