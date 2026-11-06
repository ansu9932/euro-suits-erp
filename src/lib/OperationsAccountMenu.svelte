<script lang="ts">
 import {onDestroy} from 'svelte';
 import {LogOut} from '@lucide/svelte';
 import {enter} from './motion';
 let {user,onlogout}:{user:any;onlogout:()=>Promise<void>}=$props();
 let menu:HTMLDivElement|undefined=$state(),content:HTMLDivElement|undefined=$state(),visible=$state(false),busy=$state(false);
 let entrance:ReturnType<typeof enter>|undefined;
 function toggled(e:ToggleEvent){visible=e.newState==='open';entrance?.destroy();entrance=visible&&content?enter(content):undefined}
 onDestroy(()=>entrance?.destroy());
 async function signOut(){if(busy)return;busy=true;try{await onlogout();if(menu?.isConnected&&menu.matches(':popover-open'))menu.hidePopover()}finally{busy=false}}
</script>
<button class="account-trigger" aria-label="Open account menu" aria-expanded={visible} popovertarget="operations-account-menu" title={user.name}><span>{user.name.split(' ').map((s:string)=>s[0]).slice(0,2).join('')}</span></button>
<div id="operations-account-menu" class="account-menu" popover="auto" bind:this={menu} ontoggle={toggled} role="group" aria-label="Account menu">
 <div bind:this={content}><div class="account-menu__identity"><strong>{user.name}</strong><p>{user.role} · {user.scope} access</p><small>{user.username}</small><p class="account-menu__help">Account details are managed by your administrator.</p></div><button class="account-menu__logout" disabled={busy} onclick={signOut}><LogOut size={16}/><span>{busy?'Signing out…':'Sign out'}</span></button></div>
</div>
<style>
 .account-trigger{display:grid;place-items:center;min-width:44px;min-height:44px;padding:4px;border:0;border-radius:50%;background:transparent;cursor:pointer}.account-trigger>span{display:grid;place-items:center;width:36px;height:36px;border-radius:50%;background:#1e293b;color:#fff;font:650 12px/1 system-ui}.account-trigger:hover{background:#edf1f5}.account-trigger:focus-visible{outline:2px solid #0a7a6b;outline-offset:2px}.account-menu{position:fixed;inset:76px 24px auto auto;margin:0;width:min(288px,calc(100vw - 32px));max-height:calc(100dvh - 96px);overflow:auto;padding:0;background:#fff;color:#111827;border:1px solid #e1e6ec;border-radius:16px;box-shadow:0 8px 30px #0f172a1f}.account-menu__identity{padding:16px;border-bottom:1px solid #edf0f3;overflow-wrap:anywhere}.account-menu strong{display:block;font-size:14px;font-weight:700;color:#111827}.account-menu p,.account-menu small{display:block;margin:4px 0 0;font-size:12px;font-weight:500;color:#3f4b5b;line-height:1.5}.account-menu .account-menu__help{margin-top:12px}.account-menu__logout{display:flex;align-items:center;gap:12px;width:100%;min-height:44px;padding:12px 16px;border:0;background:#fff;color:#a12435;font:600 13px/1.4 system-ui;text-align:left;cursor:pointer}.account-menu__logout:hover{background:#fff1f3}.account-menu__logout:focus-visible{outline:2px solid #0a7a6b;outline-offset:-3px}
</style>
