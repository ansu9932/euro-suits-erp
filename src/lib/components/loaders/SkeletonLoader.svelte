<script lang="ts">
 /** Mirrors table/list/detail geometry without presenting invented data. */
 let {variant='table',rows=5,columns=5,label='Loading records…',compact=false}:{variant?:'table'|'card'|'list'|'detail';rows?:number;columns?:number;label?:string;compact?:boolean}=$props();
 const rowCount=$derived(Math.max(1,Math.min(12,Math.floor(rows))));
 const columnCount=$derived(Math.max(1,Math.min(12,Math.floor(columns))));
</script>

<div class={`erp-skeleton erp-skeleton--${variant}`} class:erp-skeleton--compact={compact} role="status" aria-busy="true" aria-live="polite" style:--skeleton-columns={columnCount}>
 <span class="erp-skeleton__label">{label}</span>
 <div class="erp-skeleton__content" aria-hidden="true">
  {#if variant==='table'}
   <div class="erp-skeleton__row erp-skeleton__row--head">{#each Array(columnCount) as _,column}<span class="erp-skeleton__block erp-skeleton__block--heading" style:--skeleton-width={column===0?'58%':'66%'}></span>{/each}</div>
   {#each Array(rowCount) as _,row}<div class="erp-skeleton__row">{#each Array(columnCount) as _,column}<div class="erp-skeleton__cell"><span class="erp-skeleton__block" style:--skeleton-width={`${column===0?54:76-(row+column)%3*12}%`}></span>{#if column===0||column===1}<span class="erp-skeleton__block erp-skeleton__block--small" style:--skeleton-width="72%"></span>{/if}</div>{/each}</div>{/each}
  {:else if variant==='detail'}
   <div class="erp-skeleton__detail-heading"><span class="erp-skeleton__block" style:--skeleton-width="42%"></span><span class="erp-skeleton__block erp-skeleton__block--small" style:--skeleton-width="60%"></span></div>
   <div class="erp-skeleton__detail-grid">{#each Array(rowCount) as _}<div class="erp-skeleton__cell"><span class="erp-skeleton__block erp-skeleton__block--small" style:--skeleton-width="40%"></span><span class="erp-skeleton__block erp-skeleton__block--field"></span></div>{/each}</div>
  {:else if variant==='list'}
   {#each Array(rowCount) as _}<div class="erp-skeleton__list-row"><span class="erp-skeleton__block erp-skeleton__block--avatar"></span><div class="erp-skeleton__cell"><span class="erp-skeleton__block" style:--skeleton-width="52%"></span><span class="erp-skeleton__block erp-skeleton__block--small" style:--skeleton-width="74%"></span></div><span class="erp-skeleton__block erp-skeleton__block--action"></span></div>{/each}
  {:else}
   <div class="erp-skeleton__card-grid">{#each Array(rowCount) as _}<div class="erp-skeleton__card"><span class="erp-skeleton__block erp-skeleton__block--small" style:--skeleton-width="45%"></span><span class="erp-skeleton__block erp-skeleton__block--value" style:--skeleton-width="64%"></span><span class="erp-skeleton__block erp-skeleton__block--small" style:--skeleton-width="80%"></span></div>{/each}</div>
  {/if}
 </div>
</div>

<style>
 .erp-skeleton{width:100%;min-width:0;color:var(--hig-secondary,#3f4b5b);font:500 13px/1.45 var(--hig-font,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif)}
 .erp-skeleton__label{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}
 .erp-skeleton__content{width:100%;min-width:0}
 .erp-skeleton__row{display:grid;grid-template-columns:repeat(var(--skeleton-columns),minmax(0,1fr));align-items:center;gap:16px;min-height:64px;padding:12px 16px;border-bottom:1px solid var(--hig-border,#e1e6ec)}
 .erp-skeleton__row--head{min-height:40px;background:var(--hig-field,#f8fafc)}
 .erp-skeleton__row:last-child{border-bottom:0}
 .erp-skeleton__cell{display:flex;flex-direction:column;gap:8px;min-width:0}
 .erp-skeleton__block{display:block;position:relative;isolation:isolate;overflow:hidden;height:14px;width:var(--skeleton-width,100%);max-width:100%;border-radius:5px;background:var(--loader-skeleton,#e5eaee)}
 .erp-skeleton__block::after{content:'';position:absolute;inset:0;width:65%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.85),transparent);animation:erp-skeleton-shimmer 1.45s cubic-bezier(.4,0,.2,1) infinite;transform:translateX(-120%) skewX(-18deg)}
 .erp-skeleton__block--small{height:10px;background:var(--loader-skeleton-muted,#edf0f3)}
 .erp-skeleton__block--heading{height:10px}
 .erp-skeleton__block--field{height:44px;border-radius:10px}
 .erp-skeleton__block--value{height:25px}
 .erp-skeleton__block--avatar{width:36px;height:36px;border-radius:10px}
 .erp-skeleton__block--action{width:88px;height:32px;border-radius:8px}
 .erp-skeleton__detail-heading{display:flex;flex-direction:column;gap:12px;padding-bottom:20px;margin-bottom:16px;border-bottom:1px solid var(--hig-border,#e1e6ec)}
 .erp-skeleton__detail-grid{display:grid;grid-template-columns:repeat(var(--skeleton-columns),minmax(0,1fr));gap:16px}
 .erp-skeleton__list-row{display:grid;grid-template-columns:36px minmax(0,1fr) 88px;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid var(--hig-border,#e1e6ec)}
 .erp-skeleton__list-row:last-child{border-bottom:0}
 .erp-skeleton__card-grid{display:grid;grid-template-columns:repeat(var(--skeleton-columns),minmax(0,1fr));gap:12px}
 .erp-skeleton__card{display:flex;flex-direction:column;gap:12px;min-width:0;padding:16px;border:1px solid var(--hig-border,#e1e6ec);border-radius:16px;background:var(--hig-surface,#fff)}
 .erp-skeleton--compact .erp-skeleton__row{min-height:48px;padding-block:8px}.erp-skeleton--compact .erp-skeleton__row--head{min-height:36px}.erp-skeleton--compact .erp-skeleton__list-row{padding-block:8px}
 @keyframes erp-skeleton-shimmer{to{transform:translateX(220%) skewX(-18deg)}}
 @media(prefers-reduced-motion:reduce){.erp-skeleton__block::after{animation:none;display:none}}
 @media(forced-colors:active){.erp-skeleton__block{background:GrayText;opacity:.22}.erp-skeleton__block::after{display:none}}
 @media print{.erp-skeleton{display:none}}
</style>
