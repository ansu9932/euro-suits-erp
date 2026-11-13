<script lang="ts">
 /** A compact indeterminate arc. An empty label makes it decorative. */
 let {size=18,label='Loading…',inline=true}:{size?:number;label?:string;inline?:boolean}=$props();
 const diameter=$derived(Math.max(12,Math.min(96,size)));
</script>

<span class="erp-spinner" class:erp-spinner--block={!inline} style:--loader-size={`${diameter}px`} role={label?'status':undefined} aria-live={label?'polite':undefined}>
 <svg class="erp-spinner__arc" viewBox="0 0 50 50" fill="none" aria-hidden="true"><circle class="erp-spinner__track" cx="25" cy="25" r="20"/><circle class="erp-spinner__stroke" cx="25" cy="25" r="20"/></svg>
 {#if label}<span class="erp-spinner__label">{label}</span>{/if}
</span>

<style>
 .erp-spinner{display:inline-flex;align-items:center;justify-content:center;flex:none;width:var(--loader-size);height:var(--loader-size);vertical-align:middle;color:var(--loader-color,var(--hig-primary,#0a7a6b))}
 .erp-spinner--block{display:flex;margin-inline:auto}
 .erp-spinner__arc{display:block;flex:none;width:100%;height:100%;overflow:visible;animation:erp-arc-rotate 1.15s linear infinite}
 .erp-spinner__track,.erp-spinner__stroke{stroke:currentColor;stroke-width:4;fill:none}
 .erp-spinner__track{opacity:.16}
 .erp-spinner__stroke{stroke-linecap:round;stroke-dasharray:12 150;animation:erp-arc-dash 1.4s cubic-bezier(.55,.15,.45,.85) infinite}
 .erp-spinner__label{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}
 @keyframes erp-arc-rotate{to{transform:rotate(360deg)}}
 @keyframes erp-arc-dash{0%{stroke-dasharray:12 150;stroke-dashoffset:0}50%{stroke-dasharray:85 150;stroke-dashoffset:-32}100%{stroke-dasharray:12 150;stroke-dashoffset:-118}}
 @media(prefers-reduced-motion:reduce){.erp-spinner__arc,.erp-spinner__stroke{animation:none}.erp-spinner__stroke{stroke-dasharray:80 150}}
 @media(forced-colors:active){.erp-spinner{color:CanvasText}}
</style>
