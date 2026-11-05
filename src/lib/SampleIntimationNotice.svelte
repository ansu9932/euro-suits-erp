<script lang="ts">
 import {onMount} from 'svelte';import {api} from './api';
 let {company,onopen}:{company:string;onopen:()=>void}=$props();let records:any[]=$state([]);
 let pending=$derived(records.filter(r=>!company||String(r.company_id)===company).length);
 onMount(()=>{let active=true;const load=async()=>{try{const result=await api('/sample-intimations');if(active)records=result.records}catch{if(active)records=[]}};load();const timer=setInterval(load,30000);return()=>{active=false;clearInterval(timer)}});
</script>
{#if pending}<button class="intimation-notice" onclick={onopen}><strong>{pending} pending sample {pending===1?'intimation':'intimations'}</strong><span>Open INTIMATION and generate sample indents</span></button>{/if}
<style>.intimation-notice{display:flex;gap:16px;align-items:center;justify-content:space-between;width:100%;padding:14px 18px;margin:0 0 16px;background:#fff0ef;color:#8e1e1a;border:1px solid #dd918a;border-radius:8px;text-align:left;cursor:pointer;font:inherit;min-height:48px}.intimation-notice:focus-visible{outline:3px solid #087f83;outline-offset:3px}span{color:#6d211d;font-size:13px}</style>
