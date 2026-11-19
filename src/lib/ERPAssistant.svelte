<script lang="ts">
 import {ArrowRight, CheckCircle2, FileSpreadsheet, ListChecks, X} from '@lucide/svelte';
 import {tick} from 'svelte';
 import {api} from './api';
 import {downloadReport} from './loading';
 import {intimationReference} from './intimationReference';
 import {assistantTerms, erpPageRequest, isIntimationRequest, maxIntimationDrafts, prepareIntimations, validIntimationDate, wantsIntimationReport, type AssistantBuyer, type IntimationDraft} from './erpAssistant';

 type Destination = {name:string; aliases?:string[]};
 type CreatedIntimation = {id:number; intimation_seq:number; buyer:string; buyer_style:string};
 type Choices = {buyers:AssistantBuyer[]; sample_types:string[]};

 let {company, companyName, canCreate, canReport, destinations, onnavigate, onopenrecord, oncreated}:{
  company:string; companyName:string; canCreate:boolean; canReport:boolean; destinations:Destination[];
  onnavigate:(name:string)=>void; onopenrecord:(id:number)=>void; oncreated:()=>void;
 } = $props();

 let dialog: HTMLDialogElement;
 let command = $state('');
 let drafts = $state<IntimationDraft[]>([]);
 let result = $state<CreatedIntimation[]>([]);
 let choices = $state<Choices>();
 let error = $state('');
 let status = $state('');
 let busy = $state('');
 let reviewTitle = $state<HTMLHeadingElement>();
 let resultTitle = $state<HTMLHeadingElement>();
 let uncertain = $state(false);
 let example = $derived(canCreate ? 'Create 6 intimations' : 'Open buyer orders');
 const valid = (draft:IntimationDraft) => !!(draft.buyer_id && draft.brand.trim() && draft.buyer_style.trim() && draft.sample_type && validIntimationDate(draft.buyer_required_date) &&
  Number.isInteger(draft.quantity) && draft.quantity >= 1 && draft.quantity <= 100);
 const ready = $derived(drafts.filter(valid).length);

 function open() {
  dialog.showModal();
 }
 function close() {
  if (!busy) dialog.close();
 }
 function editPrompt() {
  drafts = [];
  error = '';
  status = '';
  uncertain = false;
  void tick().then(() => dialog.querySelector('textarea')?.focus());
 }
 function startAgain() {
  command = '';
  result = [];
  editPrompt();
 }
 function chooseBuyer(draft:IntimationDraft, buyerId:number) {
  const previous = choices?.buyers.find(buyer => buyer.id === draft.buyer_id);
  const next = choices?.buyers.find(buyer => buyer.id === buyerId);
  if (!draft.brand || draft.brand === previous?.name) draft.brand = next?.name ?? '';
  draft.buyer_id = buyerId;
 }
 function showIntimationQueue() {
  close();
  onnavigate('Intimation generate');
 }

 async function runPrompt(event:SubmitEvent) {
  event.preventDefault();
  if (busy || !command.trim()) return;
  error = '';
  status = '';
  const page = erpPageRequest(command);
  if (page) {
   const allowed = destinations.find(destination =>
    [destination.name, ...(destination.aliases ?? [])].some(name => assistantTerms(name) === page));
   if (!allowed) {error = 'That workspace section is unavailable for your account. Try a section from your sidebar.'; return;}
   close();
   onnavigate(allowed.name);
   return;
  }
  if (wantsIntimationReport(command)) {
   if (!canReport) {error = 'Your account cannot download the Pending Indent report.'; return;}
   busy = 'Downloading Excel…';
   try {
    await downloadReport('/api/sample-intimations/report.xlsx' + (company ? '?company_id=' + encodeURIComponent(company) : ''), 'pending-intimations.xlsx');
    status = 'Pending Indent Excel report downloaded.';
   } catch (reason) {error = (reason as Error).message;}
   finally {busy = '';}
   return;
  }
  try {
   // Recognize the command locally before asking the ERP for buyer options.
   if (!isIntimationRequest(command)) {error = 'Try a task listed below the prompt.'; return;}
   if (!canCreate) {error = 'Your account cannot create intimations.'; return;}
   if (!company) {error = 'Select a company in the workspace before creating intimations.'; return;}
   busy = 'Preparing preview…';
   choices = await api('/sample-intimations/batch-options?company_id=' + encodeURIComponent(company)) as Choices;
   if (!choices.buyers.length) {error = 'There are no assigned buyers in this company.'; return;}
   drafts = prepareIntimations(command, choices.buyers, choices.sample_types) ?? [];
   await tick();
   reviewTitle?.focus();
  } catch (reason) {error = (reason as Error).message;}
  finally {busy = '';}
 }

 async function confirmCreate(event:SubmitEvent) {
  event.preventDefault();
  if (busy || uncertain || !canCreate || !drafts.length || ready !== drafts.length) return;
  error = '';
  status = '';
  busy = `Creating ${drafts.length} ${drafts.length === 1 ? 'intimation' : 'intimations'}…`;
  try {
   const response = await api('/sample-intimations/batch', {company_id:Number(company), drafts:$state.snapshot(drafts)}) as {records:CreatedIntimation[]};
   result = response.records;
   drafts = [];
   oncreated();
   await tick();
   resultTitle?.focus();
  } catch (cause) {
   const reason = cause as Error & {status?:number; code?:string};
   uncertain = !reason.status || reason.status >= 500 || reason.code === 'action_already_submitted';
   error = uncertain ? 'The save could not be confirmed. Check your Intimation queue for this batch before creating it again.' : reason.message;
  } finally {busy = '';}
 }
</script>

<section class="assistant-entry" aria-label="ERP Assistant">
 <span class="assistant-icon"><ListChecks size={20} aria-hidden="true"/></span>
 <div>
  <h2>ERP Assistant</h2>
  <p>{canCreate ? 'Create intimations in a batch, open a workspace section, or download a report.' : canReport ? 'Open a workspace section or download the Pending Indent report.' : 'Open a workspace section with a short instruction.'}</p>
 </div>
 <button class="button secondary" type="button" onclick={open}>Open assistant <ArrowRight size={16} aria-hidden="true"/></button>
</section>

<dialog bind:this={dialog} class="assistant-dialog" aria-labelledby="erp-assistant-title" oncancel={event=>{if(busy)event.preventDefault()}}>
 <header>
  <div class="assistant-title"><ListChecks size={19} aria-hidden="true"/><h2 id="erp-assistant-title">ERP Assistant</h2></div>
  <button type="button" class="icon-button assistant-close" aria-label="Close assistant" disabled={!!busy} onclick={close}><X size={20} aria-hidden="true"/></button>
 </header>
 {#if result.length}
  <div class="assistant-body">
   <h3 class="success-title" bind:this={resultTitle} tabindex="-1"><CheckCircle2 size={22} aria-hidden="true"/>{result.length} {result.length === 1 ? 'intimation created' : 'intimations created'}</h3>
   <ul class="result-list">{#each result as item (item.id)}
    <li><button type="button" onclick={()=>{close();onopenrecord(item.id);}}>
     <strong>{intimationReference(item)}</strong><span>{item.buyer} · {item.buyer_style}</span><ArrowRight size={16} aria-hidden="true"/>
    </button></li>
   {/each}</ul>
  </div>
  <footer><button class="button secondary" type="button" onclick={startAgain}>New task</button><button class="button primary" type="button" onclick={showIntimationQueue}>Open Intimations</button></footer>
 {:else if drafts.length}
  <form onsubmit={confirmCreate}>
   <div class="assistant-body">
    <h3 bind:this={reviewTitle} tabindex="-1">Review {drafts.length} {drafts.length === 1 ? 'intimation' : 'intimations'}</h3>
    <p class="review-meta">{companyName} · {ready} of {drafts.length} ready. Fill in any missing details before saving.</p>
    {#if error}<p class="form-error" role="alert">{error}</p>{/if}
    <fieldset disabled={!!busy || uncertain} class="drafts">
     <legend class="sr-only">Intimation details</legend>
     {#each drafts as draft, index}
      <details class="draft" open={index === 0 || !valid(draft)}>
       <summary><strong>{index + 1}. {draft.buyer_style || 'Untitled intimation'}</strong><span>{valid(draft) ? 'Ready' : 'Details needed'}</span></summary>
       <div class="draft-fields">
        <label>Buyer
         <select value={draft.buyer_id} onchange={event=>chooseBuyer(draft,Number(event.currentTarget.value))}>
          <option value={0}>Choose buyer</option>
          {#each choices?.buyers ?? [] as buyer (buyer.id)}<option value={buyer.id}>{buyer.name}</option>{/each}
         </select>
        </label>
        <label>Brand<input bind:value={draft.brand} maxlength="2000"/></label>
        <label>Buyer style<input bind:value={draft.buyer_style} maxlength="2000"/></label>
        <label>Sample type<select bind:value={draft.sample_type}><option value="">Choose type</option>{#each choices?.sample_types ?? [] as type}<option value={type}>{type}</option>{/each}</select></label>
        <label>Required date<input type="date" bind:value={draft.buyer_required_date}/></label>
        <label>Pieces<input type="number" min="1" max="100" bind:value={draft.quantity}/></label>
        <label>Size (optional)<input bind:value={draft.size} maxlength="80"/></label>
        <label>Colour (optional)<input bind:value={draft.colour} maxlength="150"/></label>
        <label class="full">Description (optional)<input bind:value={draft.description} maxlength="2000"/></label>
       </div>
      </details>
     {/each}
    </fieldset>
   </div>
   <footer>
    {#if uncertain}<button class="button secondary" type="button" onclick={showIntimationQueue}>Check Intimations</button>
    {:else}
     <button class="button secondary" type="button" disabled={!!busy} onclick={editPrompt}>Edit prompt</button>
     <button class="button primary" type="submit" disabled={!!busy || ready !== drafts.length}>{busy || `Create ${drafts.length} ${drafts.length === 1 ? 'intimation' : 'intimations'}`}</button>
    {/if}
   </footer>
  </form>
 {:else}
  <form onsubmit={runPrompt}>
   <div class="assistant-body">
    <label class="prompt-label">What would you like to do?
     <textarea rows="5" maxlength="6000" bind:value={command} placeholder={example} disabled={!!busy}></textarea>
    </label>
    <div class="examples">
     {#if canCreate}<button type="button" class="task-example" disabled={!!busy} onclick={()=>command='Create 6 intimations\nBuyer: \nSample type: \nRequired date: \nStyles: '}><ListChecks size={15} aria-hidden="true"/>Create intimations</button>{/if}
     {#if canReport}<button type="button" class="task-example" disabled={!!busy} onclick={()=>command='Download pending indent report'}><FileSpreadsheet size={15} aria-hidden="true"/>Download pending report</button>{/if}
     <button type="button" class="task-example" disabled={!!busy} onclick={()=>command='Open buyer orders'}><ArrowRight size={15} aria-hidden="true"/>Open buyer orders</button>
    </div>
    {#if canCreate}<p class="prompt-hint">Include a buyer, sample type, required date and a comma-separated style list. You can review up to {maxIntimationDrafts} at a time.</p>{/if}
    {#if error}<p class="form-error" role="alert">{error}</p>{/if}
    <p role="status" class="status">{status}</p>
   </div>
   <footer><button class="button primary" type="submit" disabled={!!busy || !command.trim()}>{busy || 'Continue'} <ArrowRight size={16} aria-hidden="true"/></button></footer>
  </form>
 {/if}
</dialog>

<style>
 .assistant-entry {display:flex;align-items:center;gap:14px;padding:14px 18px;margin-bottom:16px;background:var(--surface,#fff);border:1px solid var(--border,#d8e0e8);border-radius:14px}
 .assistant-icon {display:grid;place-items:center;flex:0 0 42px;height:42px;background:#e9f5f2;color:#096962;border-radius:10px}
 .assistant-entry h2,.assistant-entry p,.assistant-title h2,.assistant-body h3{margin:0}
 .assistant-entry h2,.assistant-title h2 {font-size:1rem}
 .assistant-entry p,.review-meta,.prompt-hint {font-size:.875rem;color:var(--muted,#435568);margin-top:3px}
 .assistant-entry .button,.assistant-dialog .button{min-height:44px}
 .assistant-entry .button{margin-left:auto;flex-shrink:0}
 .assistant-dialog{width:min(700px,calc(100% - 24px));max-height:calc(100dvh - 24px);margin:auto;padding:0;border:1px solid var(--border,#d8e0e8);border-radius:16px;background:var(--surface,#fff);color:var(--ink,#15283d);overflow:hidden;box-shadow:0 24px 60px #132b4433}
 .assistant-dialog[open]{display:flex;flex-direction:column}
 .assistant-dialog::backdrop{background:#1028398c}
 .assistant-dialog header,.assistant-dialog footer{display:flex;align-items:center;gap:10px;padding:12px 18px;flex:none}
 .assistant-dialog header{justify-content:space-between;border-bottom:1px solid var(--border,#d8e0e8)}
 .assistant-dialog footer{justify-content:flex-end;border-top:1px solid var(--border,#d8e0e8)}
 .assistant-title,.success-title{display:flex;gap:9px;align-items:center}
 .assistant-title :global(svg),.success-title :global(svg){color:#096962}
 .assistant-close{min-width:44px;min-height:44px;color:#344a5d}
 .assistant-dialog form{display:flex;flex-direction:column;min-height:0}
 .assistant-body{padding:18px;overflow:auto;min-height:0}
 .assistant-body h3{font-size:1.2rem}
 .assistant-body label{display:grid;gap:5px;font-size:.875rem;font-weight:650;min-width:0}
 .assistant-body :is(input,select,textarea){width:100%;min-height:44px;padding:9px 10px;background:var(--input,#f5f8fa);border:1px solid var(--border,#cbd6de);border-radius:8px;color:inherit;font:inherit;font-weight:400}
 .assistant-body textarea{font-size:1rem;resize:vertical}
 .examples{display:flex;flex-wrap:wrap;gap:7px;margin:10px 0}
 .task-example{display:inline-flex;align-items:center;gap:5px;min-height:44px;padding:6px 10px;background:var(--surface,#fff);border:1px solid var(--border,#d8e0e8);border-radius:8px;color:inherit;font-size:.8125rem;text-align:left}
 .status{margin:0;color:#096962}
 .status:not(:empty){margin-top:12px}
 .assistant-body .form-error{margin:12px 0}
 .drafts{padding:0;border:0;min-width:0;margin:14px 0 0}
 .draft{border:1px solid var(--border,#d8e0e8);border-radius:10px;margin-bottom:8px}
 .draft summary{padding:12px;min-height:44px;cursor:pointer;overflow-wrap:anywhere}
 .draft summary span{margin-left:10px;color:var(--muted,#435568);font-size:.8125rem}
 .draft-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px;padding:0 12px 12px}
 .draft-fields .full{grid-column:1 / -1}
 .result-list{list-style:none;margin:12px 0 0;padding:0}
 .result-list button{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;min-height:48px;width:100%;text-align:left;color:inherit;background:none;border:0;border-bottom:1px solid var(--border,#d8e0e8);padding:8px 0;font-size:.875rem}
 .result-list button span{overflow-wrap:anywhere}
 .assistant-dialog :focus-visible,.assistant-entry :focus-visible{outline:2px solid #0d766d;outline-offset:2px}
 .assistant-dialog button:disabled{opacity:.58}
 @media(max-width:550px){
  .assistant-entry{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px}
  .assistant-entry .button,.assistant-dialog .button{min-height:44px}
 .assistant-entry .button{grid-column:2;justify-self:start;margin:0}
  .assistant-dialog header,.assistant-dialog footer,.assistant-body{padding:12px}
  .draft-fields{grid-template-columns:repeat(2,minmax(0,1fr))}
  .assistant-body :is(input,select){font-size:1rem}
 }
</style>
