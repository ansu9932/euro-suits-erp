<script lang="ts">
 import {indentReference} from './sampleProcess';
 import SampleStageDialog from './SampleStageDialog.svelte';
 import SampleSpecImport from './SampleSpecImport.svelte';
 import {api} from './api';

 let {piece,onclose,onchange,showAttachmentsHint=false,measurementsOptional=false}:{piece:any;onclose:()=>void;onchange:()=>Promise<void>;showAttachmentsHint?:boolean;measurementsOptional?:boolean}=$props();
 let busy=$state(false),error=$state(''),note=$state('');
 const materials=[['fabric_used','Fabric'],['trims_used','Trims'],['style_used','Style']] as const;
 function draftReport(){
  const previous=piece.production.audit_reports?.at(-1);
  return {fabric_used:'Actual',trims_used:'Actual',style_used:'Actual',submission_attempt:String(Math.min(4,(previous?Number(previous.submission_attempt):0)+1)),special_remarks:'',merchant_contact:'',measurements:previous?structuredClone($state.snapshot(previous.measurements)):[]};
 }
 let audit=$state(draftReport());
 let measurements=$derived(measurementsOptional
  ? audit.measurements.filter((row:Record<string,unknown>)=>[row.point,row.required,row.actual,row.tolerance,row.remarks].some(value=>String(value??'').trim()!==''))
  : audit.measurements);

 async function submit(result:string){
  if(busy)return;
  busy=true;
  error='';
  try{
   await api('/sample-indents/'+piece.id,{version:piece.version,action:'audit',result,note,audit:{...audit,measurements}});
   await onchange();
  }catch(problem){
   error=(problem as Error).message;
  }finally{
   busy=false;
  }
 }
</script>
<SampleStageDialog title={'Audit report · Indent '+indentReference(piece)} close={onclose} {busy} wide>
 <section class="editor">
  {#if error}<p class="form-error" role="alert">{error}</p>{/if}
  <p>Compare the required specification with the measured garment. Your account and submission time sign this report. The sample status changes after review.</p>
  <div class="grid">
   {#each materials as [key,label]}
    <label>{label}<select bind:value={audit[key]}><option>Actual</option><option>Alternate</option></select></label>
   {/each}
   <label>Submission attempt<select bind:value={audit.submission_attempt}>{#each ['1','2','3','4'] as n}<option>{n}</option>{/each}</select></label>
   <label>Special remarks<textarea bind:value={audit.special_remarks}></textarea></label>
   <label>Merchant contact<input bind:value={audit.merchant_contact}/></label>
  </div>
  <h4>Measurements</h4>
  <SampleSpecImport indent={piece.id} onsave={rows=>audit.measurements=rows}/>
  {#if measurementsOptional}<p>If historical measurements are unavailable, enter the recorded outcome in QA decision remarks and submit.</p>
  {:else if !audit.measurements.length}<p>Add measurement points from the buyer specification.</p>{/if}
  {#each audit.measurements as row,i}
   <div class="measurement">
    <label>Measurement point<input bind:value={row.point}/></label>
    <label>Required<input type="number" step="any" min="0" bind:value={row.required}/></label>
    <label>Actual<input type="number" step="any" min="0" bind:value={row.actual}/></label>
    <label>Unit<select bind:value={row.unit}><option>cm</option><option>mm</option><option>in</option></select></label>
    <label>Tolerance ± (optional)<input type="number" step="any" min="0" bind:value={row.tolerance}/></label>
    <label>Remarks<input bind:value={row.remarks}/></label>
    <button class="text-button" onclick={()=>audit.measurements.splice(i,1)}>Remove</button>
   </div>
  {/each}
  <button class="button secondary" disabled={audit.measurements.length>=100} onclick={()=>audit.measurements.push({point:'',required:'',actual:'',unit:'cm',tolerance:'',remarks:''})}>Add measurement</button>
  <label class="remarks">QA decision remarks<textarea bind:value={note}></textarea></label>
  {#if showAttachmentsHint}<p>Upload the fabric swatch, trim card or audit attachment under Documents and select indent {indentReference(piece)}.</p>{/if}
  <footer>
   {#each [['Approved','Submit QA approval'],['Rework','Submit rework'],['Rejected','Submit rejection']] as [result,label]}
    <button class="button secondary" disabled={busy||!measurementsOptional&&!measurements.length||(!measurements.length||result!=='Approved')&&!note.trim()} onclick={()=>submit(result)}>{label}</button>
   {/each}
   <button class="text-button" disabled={busy} onclick={onclose}>Cancel</button>
  </footer>
 </section>
</SampleStageDialog>
<style>
 @media(max-width:640px){.editor .grid,.measurement{grid-template-columns:repeat(2,minmax(0,1fr))}.measurement label:last-of-type{grid-column:1/-1}}
 label{display:block;font-weight:700} input,select,textarea{width:100%;min-width:0;min-height:44px;margin-top:6px;padding:8px 10px;border:1px solid #cbd5df;border-radius:12px;background:#f8fafc;color:#111;font:inherit} textarea{resize:vertical}
.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px 16px}.editor{min-width:0}.editor>p:first-of-type{margin-top:0}.measurement{display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr;gap:12px;margin:12px 0;padding-bottom:12px;border-bottom:1px solid #dce3e9}.measurement label:last-of-type{grid-column:1/5}.remarks{margin-top:12px} footer{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
</style>
