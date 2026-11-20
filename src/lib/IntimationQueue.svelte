<script lang="ts">
 import {intimationReference} from './intimationReference';
 import {Mail,Paperclip,ArrowRight} from '@lucide/svelte';import {enter} from './motion';import type {Row} from './types';
 let {records,tracked,canEdit,busy,onGenerate,onOpen,onMail,onPreview}:{records:Row[];tracked:Row[];canEdit:boolean;busy:boolean;onGenerate:(r:Row)=>void;onOpen:(id:number)=>void;onMail:(r:Row)=>void;onPreview:(f:Row)=>void}=$props();
 function reveal(node:HTMLElement,index:number){return index<6?enter(node):{destroy(){}}}
 function date(value:string){if(!value)return 'Not entered';const d=new Date(value+'T00:00:00');return Number.isNaN(d.getTime())?value:d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}
 function indentStatus(r:Row){
  if(!r.indent_id)return 'Linked';
  if(r.pieces&&r.finished===r.pieces)return 'Completed';
  if(r.pieces&&r.rejected===r.pieces)return 'Rejected';
  if(r.pieces&&r.finished+r.rejected===r.pieces)return 'Closed';
  return r.indent_status==='Submitted'?'Pending approval':r.indent_status==='Changes requested'?'Rework needed':r.indent_status;
 }
</script>
<section class="intimation-queue" aria-labelledby="pending-intimations-title">
 <div class="queue-heading"><div><h3 id="pending-intimations-title">Pending intimations <span>{records.length}</span></h3><p>Review the buyer’s instructions, then prepare the sample indent.</p></div></div>
 <div class="queue-scroll"><div class="queue-columns" aria-hidden="true"><span>Request details</span><span>Specifications</span><span>Required date</span><span>Status & files</span><span>Action</span></div>
 <div class="queue-list">{#each records as r,i (r.id)}<article class="intimation-row" use:reveal={i} aria-label={'Intimation '+intimationReference(r)}>
  <div class="intimation-row__identity"><span class="buyer">{r.buyer||r.profile.brand}</span><h4>#{r.profile.buyer_style||'Style not entered'}</h4><small>Submitted by {r.created_by_name||'Not recorded'} · {intimationReference(r)}</small></div>
  <div class="intimation-row__specs"><strong>{r.profile.sample_type||'Sample type not entered'}</strong><div>{#each r.variants||[] as v}<span>{v.size||'Size pending'} · {v.colour||'Colour pending'} · × {v.quantity}</span>{/each}</div></div>
  <div class="intimation-row__date"><span class="sr-only">Required date: </span>{date(r.profile.buyer_required_date)}</div>
  <div class="intimation-row__files"><span class="status"><i aria-hidden="true"></i>Pending · {r.status==='Draft'?'Ready to prepare':r.status==='Submitted'?'Awaiting MD approval':r.status}</span><button type="button" class="attachment mail-button" aria-label={'Read buyer mail: '+(r.profile.email_subject||'No subject provided')} disabled={busy||!r.profile.email_message} title={r.profile.email_subject||'No pasted buyer message'} onclick={()=>onMail(r)}><Mail size={15}/><span>{r.profile.email_subject||'No subject provided'}</span></button>{#each r.files||[] as file}<button type="button" class="attachment" disabled={busy} title={file.name} onclick={()=>onPreview(file)}><Paperclip size={15}/><span>Preview {file.name}</span></button>{/each}</div>
  <div class="intimation-row__action">{#if canEdit&&['Draft','Changes requested'].includes(r.status)}<button type="button" class="generate" disabled={busy} onclick={()=>onGenerate(r)}>Generate indent <ArrowRight size={16}/></button>{:else}<button type="button" class="generate secondary" disabled={busy} onclick={()=>onOpen(r.id)}>View request <ArrowRight size={16}/></button>{/if}</div>
 </article>{:else}<div class="queue-empty"><h4>All caught up</h4><p>New intimations will appear here with their sample details and buyer instructions.</p></div>{/each}</div></div>
</section>
<section class="intimation-tracking" aria-labelledby="intimation-tracking-title">
 <h3 id="intimation-tracking-title">Intimation status <span>{tracked.length}</span></h3>
 {#if tracked.length}
  <div class="tracking-scroll"><table>
   <thead><tr><th scope="col">Intimation</th><th scope="col">Buyer / style</th><th scope="col">Indent status</th><th scope="col">Linked indent</th></tr></thead>
   <tbody>{#each tracked as r (r.id)}<tr>
    <td><button class="text-button" disabled={busy} onclick={()=>onOpen(r.id)} aria-label={'View intimation '+intimationReference(r)}>{intimationReference(r)}</button></td>
    <td><strong>{r.buyer}</strong><small>{r.buyer_style||'Style not entered'}</small></td>
    <td><span class="tracking-status" data-status={indentStatus(r)}>{indentStatus(r)}</span></td>
    <td>{#if r.indent_id}
     <button class="text-button" disabled={busy} onclick={()=>onOpen(r.indent_id)}>{r.indent_numbers?.[0]||'View indent'}{#if r.indent_numbers?.length>1} + {r.indent_numbers.length-1} more{/if}</button>
    {:else}<small>Details unavailable</small>{/if}</td>
   </tr>{/each}</tbody>
  </table></div>
 {:else}<p>Intimations appear here when an indent is saved or linked.</p>{/if}
</section>
<style>
 .intimation-tracking{max-width:1200px;margin:24px auto 0;color:#172f40}
 .intimation-tracking h3{font-size:18px;margin:0 0 12px}
 .intimation-tracking h3 span{display:inline-block;margin-left:6px;padding:2px 8px;border-radius:12px;background:#e9f4f2;color:#17584f;font-size:12px}
 .tracking-scroll{overflow:auto;border:1px solid #dce5eb;border-radius:12px}
 .intimation-tracking table{width:100%;min-width:580px;border-collapse:collapse;text-align:left}
 .intimation-tracking th,.intimation-tracking td{padding:10px 14px;border-bottom:1px solid #e8edf2}
 .intimation-tracking th{background:#f5f8fa;font-size:12px;color:#42586c}
 .intimation-tracking tr:last-child td{border-bottom:0}
 .intimation-tracking small{display:block}
 .tracking-status{display:inline-block;padding:4px 8px;border-radius:6px;background:#edf3f8;color:#2b4a65;font-weight:650;font-size:12px;white-space:nowrap}
 .tracking-status[data-status="Pending approval"]{background:#fff4d8;color:#764300}
 .tracking-status:is([data-status="Rework needed"],[data-status="Rejected"]){background:#fff0ef;color:#8c292a}
 .tracking-status:is([data-status="Approved"],[data-status="Completed"]){background:#e7f6ee;color:#166044}
 /* User reference: aligned 12-column desktop list. Text is darker for readable contrast. */
 .intimation-queue{max-width:1200px;margin-inline:auto;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",sans-serif;color:#172f40}.queue-heading{display:flex;align-items:start;justify-content:space-between;gap:16px;margin:4px 0 12px}.queue-heading h3{font-family:inherit;font-size:18px;font-weight:600;line-height:1.4;margin:0 0 4px;color:#172f40}.queue-heading h3 span{font-size:12px;background:#e9f4f2;color:#075e5a;padding:3px 7px;border-radius:6px}.queue-heading p{font-size:12px;line-height:1.5;color:#526170;margin:0}.queue-scroll{overflow-x:auto;padding-bottom:4px}.queue-columns,.intimation-row{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:12px;min-width:1000px;padding:12px 20px;align-items:center}.queue-columns{font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#526170;padding-block:10px}.queue-columns>:nth-child(1),.intimation-row__identity{grid-column:span 3}.queue-columns>:nth-child(2),.intimation-row__specs{grid-column:span 2}.queue-columns>:nth-child(3),.intimation-row__date{grid-column:span 2}.queue-columns>:nth-child(4),.intimation-row__files{grid-column:span 3}.queue-columns>:nth-child(5),.intimation-row__action{grid-column:span 2}.queue-columns>:last-child{text-align:right}.queue-list{display:grid;gap:12px;min-width:1000px}.intimation-row{background:#fff;border:1px solid #e0e6eb;border-radius:16px;box-shadow:0 1px 3px #172f4008;transition:box-shadow 200ms ease,border-color 200ms ease}.intimation-row:hover{border-color:#c9d8dc;box-shadow:0 3px 10px #172f400d}.intimation-row>div{min-width:0}.intimation-row__identity{display:flex;flex-direction:column;gap:3px}.buyer{font-size:11px;font-weight:700;letter-spacing:.04em;color:#526170;text-transform:uppercase;overflow-wrap:anywhere}.intimation-row h4{font-family:inherit;font-size:18px;font-weight:700;line-height:1.3;letter-spacing:-.02em;margin:0;color:#172f40;overflow-wrap:anywhere}.intimation-row small{font-size:11px;color:#526170;line-height:1.4;overflow-wrap:anywhere}.intimation-row__specs strong,.intimation-row__date{font-size:13px;font-weight:500;line-height:1.5}.intimation-row__specs span{display:block;font-size:12px;line-height:1.5;color:#526170;margin-top:3px;overflow-wrap:anywhere}.intimation-row__files{display:flex;flex-direction:column;align-items:flex-start;gap:4px}.status{display:inline-flex;align-items:center;gap:6px;border:1px solid #efd79c;border-radius:16px;background:#fffbeb;color:#8c4b09;font-size:10px;font-weight:600;padding:4px 8px;line-height:1.4;max-width:100%}.status i{width:5px;height:5px;border-radius:50%;background:#b87514;flex-shrink:0}.attachment{display:inline-flex;align-items:center;gap:6px;max-width:100%;min-height:44px;padding:6px 8px;border:1px solid transparent;border-radius:8px;background:#f2f8f6;color:#07645f;font:inherit;font-size:11px;cursor:pointer;text-align:left}.attachment span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}.attachment :global(svg){flex-shrink:0}.attachment:hover{border-color:#c6e3da;background:#e9f5f1}.attachment:disabled{background:#f7f8fa;color:#526170;cursor:default}.intimation-row__action{display:flex;justify-content:flex-end}.generate{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;padding:8px 10px;font:inherit;font-size:12px;font-weight:600;background:#0a7a6b;color:#fff;border:1px solid #0a7a6b;border-radius:12px;white-space:nowrap;cursor:pointer}.generate:hover{background:#086356}.generate.secondary{color:#075e5a;background:#eff8f5;border-color:#c3ded6}.generate:disabled{opacity:.6;cursor:wait}.generate:focus-visible,.attachment:focus-visible{outline:3px solid #087f83;outline-offset:2px}.queue-empty{padding:24px 16px;border:1px dashed #cbd6df;border-radius:16px;background:#f8fafb;text-align:center}.queue-empty h4{margin:0 0 6px;color:#163448}.queue-empty p{margin:0;color:#526170;font-size:13px}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}@media(prefers-reduced-motion:reduce){.intimation-row{transition:none}}@media(prefers-contrast:more){.intimation-row,.attachment,.status{border-color:currentColor}}
</style>
