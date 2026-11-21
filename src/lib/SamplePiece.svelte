<script lang="ts">
 import {indentReference} from './sampleProcess';
 import SampleStageDialog from './SampleStageDialog.svelte';
 import SampleProcessPanel from './SampleProcessPanel.svelte';
 import SampleSpecImport from './SampleSpecImport.svelte';
 let {piece,data,merchant='',onchange,onprint,onform,onissue}:{piece:any;data:any;merchant?:string;onchange:()=>Promise<void>;onprint:(kind:string,id:number)=>void;onform:(kind:'indent'|'audit',id:number)=>void;onissue:()=>void}=$props();
</script>
<article class="piece"><header><div><h3>{indentReference(piece)}{#if piece.size} · {piece.size}{/if}{#if piece.colour} · {piece.colour}{/if}</h3><strong>{piece.status}</strong></div><div class="actions"><button class="button secondary" onclick={()=>onform('indent',piece.id)}>Sample Indent Form</button><button class="button secondary" onclick={()=>onform('audit',piece.id)}>Sample Audit Form</button>{#if piece.production.audit_reports?.length}<button class="button secondary" onclick={()=>onprint('audit',piece.id)}>Print audit reports</button>{/if}{#if piece.status==='Handed over'}<button class="button secondary" onclick={()=>onprint('dispatch',piece.id)}>Print dispatch label</button>{/if}</div></header>
 <SampleProcessPanel {piece} {merchant} {onchange}/>
 {#if data.can_stock&&!['Handed over','Rejected'].includes(piece.status)}<button class="button secondary" onclick={onissue}>Issue fabric from stock</button>{/if}
 {#if piece.production.audit_reports?.length}<details><summary>Signed audit reports ({piece.production.audit_reports.length})</summary>{#each piece.production.audit_reports as report}<div class="audit-summary"><strong>Revision {report.revision} · {report.result}</strong><p>{report.auditor} · {new Date(report.signed_at).toLocaleString()} · Submission {report.submission_attempt}</p><div class="scroll"><table><thead><tr><th>Measurement</th><th>Required</th><th>Actual</th><th>Tolerance ±</th><th>Remarks</th></tr></thead><tbody>{#each report.measurements as m}<tr><td>{m.point}</td><td>{m.required} {m.unit}</td><td>{m.actual} {m.unit}</td><td>{m.tolerance||'—'}</td><td>{m.remarks}</td></tr>{/each}</tbody></table></div><p>{report.remarks} {report.special_remarks}</p></div>{/each}</details>{/if}
</article>
<style>
 .piece{color:#162638;font-weight:650;border:1px solid #dce3e9;background:#fff;padding:16px;border-radius:16px;margin:12px 0}.piece header{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}h3{margin:4px 0 12px}p{line-height:1.55}.actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:12px 0}summary{cursor:pointer;font-weight:600;margin:12px 0}.scroll{overflow:auto}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:8px;border-bottom:1px solid #dce3e9}.audit-summary{padding:12px;border:1px solid #dce3e9;border-radius:12px;margin:12px 0}
</style>
