<script lang="ts">
 import {processLabel,stamp} from './sampleProcess';
 let {changes}:{changes:Record<string,any>}=$props();
 const value=(v:any)=>v===null||v===undefined||v===''?'Not recorded':typeof v==='object'?JSON.stringify(v,null,2):typeof v==='string'&&/^\d{4}-\d{2}-\d{2}(T|$)/.test(v)?stamp(v):String(v);
</script>
<div class="sp-changes">{#each Object.entries(changes||{}) as [key,change]}
 <section><h5>{processLabel(key)}</h5>{#if key==='audit_report'}{@const report=change.after}<div class="sp-audit-facts"><b>{report.result} · submission {report.submission_attempt}</b><span>Signed by {report.auditor} · {stamp(report.signed_at)}</span><span>Fabric: {report.fabric_used} · Trims: {report.trims_used} · Style: {report.style_used}</span></div><div class="sp-measurements"><table><thead><tr><th>Measurement</th><th>Required</th><th>Actual</th><th>Tolerance ±</th><th>Remarks</th></tr></thead><tbody>{#each report.measurements||[] as m}<tr><td>{m.point}</td><td>{m.required} {m.unit}</td><td>{m.actual} {m.unit}</td><td>{m.tolerance||'—'}</td><td>{m.remarks||'—'}</td></tr>{/each}</tbody></table></div>{#if report.remarks||report.special_remarks}<p>{report.remarks} {report.special_remarks}</p>{/if}
 {:else}<div class="sp-diff"><span>Before: {value(change.before)}</span><strong>Reported: {value(change.after)}</strong></div>{/if}</section>
{/each}</div>
<style>
 .sp-changes{display:grid;gap:8px;margin:8px 0 12px}.sp-changes section{padding:8px 0;border-bottom:1px solid #e1e6ec;min-width:0}.sp-changes h5{font-size:12px;color:#364659;margin:0 0 4px;text-transform:capitalize}.sp-diff{display:grid;grid-template-columns:1fr 1fr;gap:12px}.sp-diff>*{font-size:12px;line-height:1.5;white-space:pre-wrap!important;overflow-wrap:anywhere}.sp-diff span{color:#4c5869}.sp-diff strong{color:#143d2b}.sp-audit-facts{display:grid;gap:4px;font-size:12px;margin-bottom:8px}.sp-measurements{overflow:auto;max-width:100%;max-height:280px}table{width:100%;min-width:500px;border-collapse:collapse}th,td{text-align:left;border-bottom:1px solid #dce3e9;padding:8px;white-space:normal!important;overflow-wrap:anywhere}p{white-space:pre-wrap;overflow-wrap:anywhere}
</style>
