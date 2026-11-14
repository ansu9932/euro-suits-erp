<script lang="ts">
 import {onMount} from 'svelte';
 import {ChevronRight, MessageCircle, QrCode, RefreshCw} from '@lucide/svelte';
 import {SkeletonLoader, SpinnerLoader} from '$lib/components/loaders';
 import {api} from './api';
 import {enter} from './motion';

 type Recipient = {
  user_id:number; name:string; role:string; phone:string; active:boolean;
  enabled:boolean; consent_note:string; erp_only?:boolean;
 };
 type Delivery = {
  id:number; reference:string; label:string; module:string; status:string;
  error:string; created_at:string; recipient_name:string; decision:string;
 };
 type ReplyData = {
  configured:boolean; connection_error?:string;
  session:{name:string; status:string; me?:{id:string; pushName?:string}};
  settings:{enabled:boolean; version:number; daily_cap:number};
  recipients:Recipient[]; messages:Delivery[];
 };

 let data:ReplyData|null=$state(null);
 let busy=$state(false), error=$state(''), notice=$state(''), password=$state('');
 let enabled=$state(false), dailyCap=$state(100), recipient:Recipient|null=$state(null);
 let qrURL=$state('');
 let qrRequest:AbortController|undefined;
 let disposed=false;
 const connectionNames:Record<string,string>={
  WORKING:'Connected', SCAN_QR_CODE:'Scan the pairing code', STARTING:'Connecting',
  STOPPED:'Disconnected', FAILED:'Connection needs attention', NOT_FOUND:'Ready to link',
  UNAVAILABLE:'Connection unavailable', NOT_CONFIGURED:'Setup needed'
 };
 let connection=$derived.by(()=>data?.session?.status||'STOPPED');

 function clearQR(){
  qrRequest?.abort();
  qrRequest=undefined;
  if(qrURL)URL.revokeObjectURL(qrURL);
  qrURL='';
 }
 async function load(){
  const result=await api('/developer/whatsapp-replies') as ReplyData;
  if(disposed)return;
  data=result;
  enabled=result.settings.enabled;
  dailyCap=result.settings.daily_cap;
  if(result.session?.status==='WORKING')clearQR();
 }
 async function refresh(){
  if(busy)return;
  busy=true;error='';
  try{await load()}catch(problem){error=(problem as Error).message}finally{busy=false}
 }
 async function run(body:Record<string,unknown>){
  if(busy||!password)return;
  busy=true;error='';notice='';
  let saved=false;
  try{
   await api('/developer/whatsapp-replies',{...body,password});
   saved=true;password='';recipient=null;
   if(body.action==='connect'||body.action==='disconnect')clearQR();
   await load();
   notice=body.action==='connect'?'Connection started. Show the pairing code when the connection is ready to scan.':
    body.action==='disconnect'?'WhatsApp disconnected.':
    body.action==='recipient'?'Recipient access saved.':'Reply approval settings saved.';
  }catch(problem){
   error=saved?'The action finished, but the current status could not be loaded. Refresh to check.':(problem as Error).message;
  }finally{busy=false}
 }
 async function showQR(){
  if(busy)return;
  busy=true;error='';notice='';clearQR();
  const controller=new AbortController();
  qrRequest=controller;
  try{
   const response=await fetch('/api/developer/whatsapp-replies/qr',{
    credentials:'same-origin',cache:'no-store',signal:controller.signal
   });
   if(!response.ok){
    if(response.status===401)window.dispatchEvent(new Event('erp:session-expired'));
    const problem=await response.json().catch(()=>({error:'The pairing code is unavailable. Refresh the connection and try again.'}));
    throw new Error(problem.error||'The pairing code is unavailable. Refresh the connection and try again.');
   }
   if(!response.headers.get('Content-Type')?.startsWith('image/png'))throw new Error('The pairing code response could not be read. Refresh and try again.');
   const image=await response.blob();
   if(image.size>2*1024*1024)throw new Error('The pairing image is too large. Refresh and try again.');
   if(!disposed&&!controller.signal.aborted)qrURL=URL.createObjectURL(image);
  }catch(problem){
   if(!controller.signal.aborted)error=(problem as Error).message;
  }finally{
   if(qrRequest===controller)qrRequest=undefined;
   busy=false;
  }
 }
 function stamp(value:string){
  const date=new Date(value);
  return Number.isNaN(date.getTime())?'—':date.toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
 }
 onMount(()=>{
  refresh();
  return()=>{disposed=true;clearQR()};
 });
</script>

<section class="wa-replies" aria-label="WhatsApp reply approvals" aria-busy={busy}>
 <header class="wa-replies__heading">
  <div class="wa-replies__title"><MessageCircle size={20} aria-hidden="true"/><h2>WhatsApp reply approvals</h2></div>
  <div class="wa-replies__heading-actions">
   {#if data}<span class="wa-replies__status" data-state={connection}>{connectionNames[connection]||connection.replaceAll('_',' ')}</span>{/if}
   <button class="button secondary" type="button" disabled={busy} onclick={refresh}><RefreshCw size={16} aria-hidden="true"/>Refresh connection</button>
  </div>
 </header>
 <p class="wa-replies__intro">Review requests from WhatsApp using the reference in each message. Dashboard and WhatsApp decisions use the same ERP approval history.</p>
 {#if error}<p class="form-error" role="alert">{error}</p>{/if}
 {#if notice}<p class="wa-replies__notice" role="status">{notice}</p>{/if}
 {#if busy&&data}<div class="wa-replies__loading"><SpinnerLoader size={16} label=""/><span role="status">Updating reply approvals…</span></div>{/if}
 {#if data}
  <div class="wa-replies__content" use:enter>
   {#if !data.configured}
    <p class="wa-replies__setup" role="status">The private WhatsApp service needs server configuration before a number can be linked.</p>
   {:else if data.connection_error}
    <p class="wa-replies__setup" role="status">{data.connection_error}. Refresh after checking the connection.</p>
   {/if}
   <div class="wa-replies__connection">
    <div>
     <h3>Link a dedicated WhatsApp number</h3>
     <p>On that phone, open WhatsApp → Linked devices → Link a device, then scan the pairing code.</p>
     {#if data.session?.me?.id}<p class="wa-replies__connected">Linked account <strong>{data.session.me.pushName||data.session.me.id.replace(/@.*/,'')}</strong></p>{/if}
     <div class="wa-replies__actions">
      {#if connection!=='WORKING'}
       <button class="button primary" type="button" disabled={busy||!data.configured||!password} onclick={()=>run({action:'connect'})}>Link WhatsApp number</button>
       <button class="button secondary" type="button" disabled={busy||!data.configured||connection==='STOPPED'||connection==='NOT_FOUND'} onclick={showQR}><QrCode size={16} aria-hidden="true"/>Show pairing code</button>
      {:else}
       <button class="button secondary" type="button" disabled={busy||!password} onclick={()=>run({action:'disconnect'})}>Disconnect number</button>
      {/if}
     </div>
    </div>
    <div class="wa-replies__commands">
     <h3>Reply with a decision</h3>
     <p><code>APPROVE 104</code> approves the request identified in the message.</p>
     <p><code>REJECT 104 reason</code> records the available rejection or correction action with your comment.</p>
     <p>If a dashboard decision has already been recorded, the reply reports its current result. Accounts with OTP or IP restrictions use the ERP review link.</p>
    </div>
   </div>
   {#if qrURL}
    <div class="wa-replies__pairing">
     <img src={qrURL} alt="Scan this code with the dedicated WhatsApp number to link ERP reply approvals" width="240" height="240"/>
     <div><h3>Scan to finish linking</h3><p>Keep this code private. After scanning, refresh the connection to confirm that it is connected.</p><button class="button secondary" type="button" disabled={busy} onclick={showQR}>Refresh pairing code</button></div>
    </div>
   {/if}
   <div class="wa-replies__settings">
    <label class="wa-replies__password">Your developer password<input type="password" bind:value={password} autocomplete="current-password" maxlength="128" placeholder="Required to change connection or access"/></label>
    <form onsubmit={event=>{event.preventDefault();run({action:'settings',enabled,daily_cap:dailyCap,version:data!.settings.version})}}>
     <label class="wa-replies__check"><input type="checkbox" bind:checked={enabled} disabled={busy||!data.configured&&!enabled}/>Enable WhatsApp approval notifications</label>
     <label class="wa-replies__cap">Daily message limit<input type="number" min="1" max="1000" required bind:value={dailyCap} disabled={busy}/></label>
     <button class="button primary" disabled={busy||!password||enabled&&!data.configured}>Save reply settings</button>
    </form>
   </div>
   <details class="wa-replies__disclosure">
    <summary><ChevronRight class="wa-replies__chevron" size={17} aria-hidden="true"/>Approval recipients <span>{data.recipients.filter(item=>item.enabled).length} enabled</span></summary>
    <p>Enable Super Admin and MD recipients who agreed to receive requests. Finance Heads can receive the first shortfall review. Each reply uses the recipient’s ERP permissions.</p>
    <div class="table-wrap"><table>
     <thead><tr><th>Administrator</th><th>WhatsApp number</th><th>Access</th><th>Action</th></tr></thead>
     <tbody>{#each data.recipients as item (item.user_id)}
      <tr><td><strong>{item.name}</strong><span class="wa-replies__meta">{item.role}</span></td><td>{item.phone||'Add a number in User access'}</td><td>{!item.active?'Account disabled':item.enabled?'Enabled':'Off'}{#if item.erp_only}<span class="wa-replies__meta">Review in ERP</span>{/if}</td><td><button class="button secondary" type="button" disabled={busy||!item.active} onclick={()=>recipient={...item}}>Manage recipient</button></td></tr>
     {:else}<tr><td colspan="4">No eligible administrators are available.</td></tr>{/each}</tbody>
    </table></div>
    {#if recipient}
     <form class="wa-replies__recipient" onsubmit={event=>{event.preventDefault();if(recipient)run({action:'recipient',user_id:recipient.user_id,enabled:recipient.enabled,consent_note:recipient.consent_note})}}>
      <h3>{recipient.name}</h3>
      <label class="wa-replies__check"><input type="checkbox" bind:checked={recipient.enabled} disabled={busy}/>Enable approval requests for this administrator</label>
      <label>Consent record<textarea bind:value={recipient.consent_note} maxlength="500" rows="2" required={recipient.enabled} disabled={busy} placeholder="When and how this administrator agreed to receive approval requests"></textarea></label>
      <div class="wa-replies__actions"><button class="button secondary" type="button" disabled={busy} onclick={()=>recipient=null}>Cancel</button><button class="button primary" disabled={busy||!password}>Save recipient</button></div>
     </form>
    {/if}
   </details>
   <details class="wa-replies__disclosure">
    <summary><ChevronRight class="wa-replies__chevron" size={17} aria-hidden="true"/>Requests and delivery history <span>{data.messages.length} recent</span></summary>
    <div class="table-wrap"><table>
     <thead><tr><th>Time</th><th>Reference / request</th><th>Recipient</th><th>Delivery</th><th>Decision / details</th></tr></thead>
     <tbody>{#each data.messages as message (message.id)}
      <tr><td class="wa-replies__time">{stamp(message.created_at)}</td><td><strong>{message.reference||message.id}</strong><span class="wa-replies__meta">{message.label||message.module}</span></td><td>{message.recipient_name}</td><td><strong>{message.status}</strong></td><td>{message.decision||message.error||'Waiting for a reply'}</td></tr>
     {:else}<tr><td colspan="5">Approval messages will appear here after a number is linked and notifications are enabled.</td></tr>{/each}</tbody>
    </table></div>
   </details>
  </div>
 {:else if !error}<SkeletonLoader variant="detail" rows={2} columns={2} label="Loading reply approval settings…"/>{/if}
</section>

<style>
 .wa-replies{box-sizing:border-box;margin-bottom:24px;padding:20px;border:1px solid #d6e1e6;border-radius:16px;background:#fff;color:#172638;font-family:var(--hig-font,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif)}
 .wa-replies__heading,.wa-replies__heading-actions,.wa-replies__title,.wa-replies__actions{display:flex;align-items:center;gap:10px}
 .wa-replies__heading{justify-content:space-between;flex-wrap:wrap;gap:12px}
 .wa-replies h2{margin:0;font-size:20px;font-weight:750;color:#172638}
 .wa-replies h3{margin:0 0 6px;font-size:14px;font-weight:750;color:#172638}
 .wa-replies p{margin:0 0 10px;font-size:13px;line-height:1.5;color:#344556;max-width:75ch}
 .wa-replies .wa-replies__intro{margin:8px 0 16px}
 .wa-replies__status{display:inline-flex;padding:5px 9px;border:1px solid #d6e1e6;border-radius:8px;background:#f4f7f9;color:#334657;font-size:12px;font-weight:700}
 .wa-replies__status[data-state="WORKING"]{color:#075e4d;background:#edf8f2;border-color:#bfdecf}
 .wa-replies__status[data-state="SCAN_QR_CODE"],.wa-replies__status[data-state="STARTING"]{color:#835209;background:#fff8e8;border-color:#edd6a5}
 .wa-replies__status[data-state="FAILED"]{color:#a22a32;background:#fff2f3;border-color:#ebc7cd}
 .wa-replies__content{display:grid;gap:16px;min-width:0}
 .wa-replies__connection{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px}
 .wa-replies__commands{border-left:1px solid #e0e7ec;padding-left:24px}
 .wa-replies code{padding:2px 5px;border-radius:4px;background:#edf6f4;color:#075e54;font-size:12px;font-weight:700;white-space:nowrap}
 .wa-replies .wa-replies__setup{padding:10px 12px;margin:0;border:1px solid #ead5ab;border-radius:8px;background:#fff8e9;color:#77500e}
 .wa-replies .wa-replies__notice{padding:10px 12px;margin:0 0 12px;border:1px solid #c7dfd7;border-radius:8px;background:#eff8f4;color:#075e54}
 .wa-replies__loading{display:flex;align-items:center;gap:8px;margin-bottom:12px;color:#344556;font-size:12px}
 .wa-replies__actions{flex-wrap:wrap}
 .wa-replies :global(.button){display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:44px;padding:9px 13px;white-space:nowrap;font-size:13px;font-weight:700}
 .wa-replies label{display:grid;gap:6px;margin:0;color:#172638;font-size:13px;font-weight:700;min-width:0}
 .wa-replies input:not([type="checkbox"]),.wa-replies textarea{box-sizing:border-box;width:100%;min-width:0;min-height:44px;padding:9px 11px;border:1px solid #c6d3dd;border-radius:10px;background:#f7f9fb;color:#111;font:inherit}
 .wa-replies textarea{resize:vertical}
 .wa-replies input::placeholder,.wa-replies textarea::placeholder{color:#4b5968;opacity:1}
 .wa-replies input:focus-visible,.wa-replies textarea:focus-visible,.wa-replies button:focus-visible,.wa-replies summary:focus-visible{outline:2px solid #08746f;outline-offset:3px}
 .wa-replies input[type="checkbox"]{width:20px;height:20px;margin:0;accent-color:#0a7a6b;flex:none}
 .wa-replies .wa-replies__check{display:flex;align-items:center;gap:9px;min-height:44px;line-height:1.4}
 .wa-replies__settings{display:grid;grid-template-columns:minmax(220px,.75fr) minmax(0,1.7fr);gap:20px;padding-top:16px;border-top:1px solid #e0e7ec;align-items:end}
 .wa-replies__settings form{display:flex;align-items:end;gap:12px;flex-wrap:wrap}
 .wa-replies__settings .wa-replies__check{flex:1 1 230px;padding-bottom:0}
 .wa-replies__cap{width:120px;flex:none}
 .wa-replies__pairing{display:flex;align-items:center;gap:20px;padding:12px;background:#f7faf9;border:1px solid #d6e4df;border-radius:12px}
 .wa-replies__pairing img{display:block;width:240px;height:240px;object-fit:contain;background:#fff;border-radius:8px;flex:none}
 .wa-replies__pairing p{max-width:45ch}
 .wa-replies__disclosure{min-width:0;border-top:1px solid #e0e7ec;padding-top:4px}
 .wa-replies__disclosure summary{display:flex;align-items:center;gap:7px;min-height:44px;cursor:pointer;font-size:14px;font-weight:750;color:#172638}
 .wa-replies__disclosure summary span{margin-left:auto;color:#42556a;font-size:12px;font-weight:600}
 .wa-replies__disclosure summary :global(.wa-replies__chevron){flex:none;transition:transform 160ms ease}
 .wa-replies__disclosure[open]>summary :global(.wa-replies__chevron){transform:rotate(90deg)}
 .wa-replies__disclosure>p{margin:4px 0 12px}
 .wa-replies .table-wrap{min-width:0;overflow-x:auto;border:1px solid #dce5eb;border-radius:10px}
 .wa-replies table{width:100%;min-width:650px;border-collapse:collapse;font-size:13px}
 .wa-replies th{padding:10px 12px;background:#f4f7f9;color:#3d5063;text-align:left;font-size:12px;font-weight:700;white-space:nowrap}
 .wa-replies td{padding:10px 12px;border-top:1px solid #e2e9ee;vertical-align:middle;color:#172638;overflow-wrap:anywhere}
 .wa-replies td:last-child{max-width:380px}
 .wa-replies__meta{display:block;margin-top:3px;font-size:12px;color:#42556a}
 .wa-replies__time{font-variant-numeric:tabular-nums;white-space:nowrap}
 .wa-replies__recipient{display:grid;gap:12px;margin-top:12px;padding:14px;background:#f6f9fb;border:1px solid #d7e1e8;border-radius:10px}
 @media(prefers-reduced-motion:reduce){.wa-replies__disclosure summary :global(.wa-replies__chevron){transition:none}}
</style>
