<script lang="ts">
 import {onMount,tick} from 'svelte';
 import {beginSignIn,redirectToWorkspace} from './signInTransition';
 import {signInOverviewPath} from './workspaceAccess';
 import LoginFields from './LoginFields.svelte';
 import {ButtonLoader} from './components/loaders';
 import {api} from './api';
 import type {Row} from './types';
 let {portal,initialUsername='',onauthenticated}:{portal:string;initialUsername?:string;onauthenticated:(result:Row)=>void|Promise<void>}=$props();
 let username=$state(''),password=$state(''),botToken=$state(''),verificationReady=$state(false),attempts=$state(0);
 let busy=$state(false),error=$state(''),pending=$state(false),emailHint=$state(''),code=$state('');
 let resendAt=0,resendSeconds=$state(0);
 let otpInput=$state<HTMLInputElement>(),errorMessage=$state<HTMLParagraphElement>();
 onMount(()=>{username=initialUsername;const timer=setInterval(()=>{resendSeconds=Math.max(0,Math.ceil((resendAt-Date.now())/1000))},1000);return()=>clearInterval(timer)});
 async function submit(event:SubmitEvent){
  event.preventDefault();
  if(busy||(!pending&&!verificationReady))return;
  busy=true;
  error='';
  const transition=beginSignIn();
  try {
   const result=await api(pending?'/login/otp':'/login',pending?{code}:{username,password,portal,bot_token:botToken});
   password='';
   code='';
   if(result.otp_required){
    pending=true;
    emailHint=result.email_hint;
    resendAt=Date.now()+60000;
    resendSeconds=60;
   }else{
    transition.authenticated();
    const overview = signInOverviewPath(result.user);
    if (overview && overview !== location.pathname) {
     const destination = new URL(overview, location.origin);
     destination.search = location.search;
     if (destination.searchParams.get('view') === 'test') destination.searchParams.delete('view');
     redirectToWorkspace(destination.pathname + destination.search);
    } else {
     await onauthenticated(result);
    }
   }
  }catch(e){
   error=(e as Error).message;
  }finally{
   busy=false;
   attempts++;
   // Render the destination or verification form before releasing the overlay.
   await tick();
   transition.finish();
   await tick();
   if(error)errorMessage?.focus({preventScroll:true});
   else if(pending)otpInput?.focus({preventScroll:true});
  }
 }
</script>
<form onsubmit={submit}>
 {#if pending}
  <p class="company-notice" role="status">Enter the code sent to {emailHint}. It expires in 5 minutes.</p>
  <label>Email verification code<input bind:this={otpInput} bind:value={code} aria-label="Email verification code" inputmode="numeric" autocomplete="one-time-code" pattern={'[0-9]{6}'} minlength="6" maxlength="6" required placeholder="6-digit code"/></label>
 {:else}
  <LoginFields bind:username bind:password bind:botToken bind:verificationReady resetKey={attempts}/>
 {/if}
 {#if error}<p bind:this={errorMessage} class="form-error" role="alert" tabindex="-1">{error}</p>{/if}
 <ButtonLoader type="submit" class="button primary" loading={busy} disabled={!pending&&!verificationReady} label={pending?'Verify & sign in':'Sign in'} loadingLabel="Signing in…"/>
 {#if pending}<button type="button" class="button secondary" disabled={busy||resendSeconds>0} onclick={()=>{if(busy||resendSeconds>0)return;pending=false;code='';error=''}}>{resendSeconds>0?'Request another code in '+resendSeconds+'s':'Use password again / request a new code'}</button>{/if}
</form>
