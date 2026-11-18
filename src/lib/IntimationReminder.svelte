<script lang="ts">
 import SampleStageDialog from './SampleStageDialog.svelte';
 import {ButtonLoader,SpinnerLoader} from './components/loaders';
 import {api} from './api';
 import {onMount} from 'svelte';

 type Recipient = {id:number;name:string};
 type Result = Recipient & {status:'accepted'|'failed'|'uncertain'};
 let {company,close}:{company:string;close:()=>void}=$props();
 let recipients=$state<Recipient[]>([]), selected=$state<number[]>([]);
 let results=$state<Result[]>([]), loading=$state(true), sending=$state(false), error=$state('');
 let available=$derived(recipients.filter(recipient=>!results.some(result=>result.id===recipient.id&&result.status!=='failed')));
 let selectedAll=$derived(available.length>0&&available.every(recipient=>selected.includes(recipient.id)));
 const query=$derived(company?'?company_id='+encodeURIComponent(company):'');

 async function load(){
  loading=true;error='';
  try {
   const response=await api('/sample-intimations/reminder-recipients'+query);
   recipients=response.recipients;
  } catch(e){error=(e as Error).message}
  finally {loading=false}
 }
 onMount(()=>{void load()});

 async function send(){
  if(sending||!selected.length)return;
  sending=true;error='';
  const recipient_ids=[...selected];
  try {
   const response=await api('/sample-intimations/reminders'+query,{recipient_ids});
   const latest:Result[]=response.results;
   results=[...results.filter(result=>!recipient_ids.includes(result.id)),...latest];
   selected=latest.filter(result=>result.status==='failed').map(result=>result.id);
  } catch(e){error=(e as Error).message}
  finally {sending=false}
 }
</script>

<SampleStageDialog title="Send intimation reminder" {close} busy={sending}>
 {#if error}<p class="form-error" role="alert">{error}</p>{/if}
 {#if loading}
  <SpinnerLoader label="Loading merchandisers…"/>
 {:else if !recipients.length}
  {#if error}<button type="button" class="button secondary" onclick={load}>Retry</button>
  {:else}<p>There are no merchandisers with pending intimations in this company selection.</p>{/if}
 {:else}
  <p>Each selected merchandiser receives an Excel report of the pending intimations they can access.</p>
  <fieldset disabled={sending} class="recipients">
   <legend>Merchandisers</legend>
   <button type="button" class="button secondary" disabled={!available.length} onclick={()=>selected=selectedAll?[]:available.map(recipient=>recipient.id)}>{selectedAll?'Deselect all':'Select all'}</button>
   {#each recipients as recipient (recipient.id)}
    {@const result=results.find(item=>item.id===recipient.id)}
    <label>
     <input type="checkbox" value={recipient.id} bind:group={selected} disabled={!!result&&result.status!=='failed'}/>
     <span>{recipient.name}</span>
     {#if result}
      <small>{result.status==='accepted'?'Accepted by mail server':result.status==='uncertain'?'Delivery unconfirmed':'Could not send'}</small>
     {/if}
    </label>
   {/each}
  </fieldset>
  {#if results.length}
   <p role="status">{results.filter(result=>result.status==='accepted').length} accepted by the mail server, {results.filter(result=>result.status==='failed').length} failed, {results.filter(result=>result.status==='uncertain').length} unconfirmed.</p>
  {/if}
  <div class="actions"><ButtonLoader class="button primary" disabled={!selected.length} loading={sending} label="Send reminder" loadingLabel="Sending…" onclick={send}/></div>
 {/if}
</SampleStageDialog>

<style>
 p{margin:0 0 14px}
 .recipients{border:1px solid #dce3e9;border-radius:10px;margin:0 0 14px;padding:12px;min-inline-size:0}
 legend{padding:0 5px;font-weight:700}
 .recipients>button{margin-bottom:6px}
 label{display:flex;align-items:center;gap:10px;min-height:44px;padding:4px 0;color:#172536}
 input{width:18px;height:18px;accent-color:#0a7a6b;flex:none}
 small{margin-left:auto;color:#405469;text-align:right}
 .actions{display:flex;justify-content:flex-end}
</style>
