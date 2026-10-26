<script lang="ts">
 import type {Snippet} from 'svelte';
 import {enter, skyLight} from './motion';
 import SkyBackdrop from './SkyBackdrop.svelte';
 let {title, description, children}:{title:string;description:string;children:Snippet}=$props();
</script>
<main class="login-layout erp-login" use:skyLight>
 <SkyBackdrop/>
 <header class="erp-login__brand"><img src="/logo.png" alt="Euro Suits logo" width="44" height="44"/><div><strong>EURO SUITS</strong><span>Manufacturing operations</span></div></header>
 <section class="login-panel erp-login__panel" aria-labelledby="signin-title">
  <div class="login-form-wrap" use:enter>
   <h1 id="signin-title">{title}</h1>
   <p class="muted">{description}</p>
   {@render children()}
  </div>
 </section>
 <p class="erp-login__support">Your account and access are managed by your company administrator.</p>
</main>
