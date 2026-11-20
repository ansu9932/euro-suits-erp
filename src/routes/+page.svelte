<script lang="ts">
 import {onMount} from 'svelte';
 import LandingPage from '#lib/landing/LandingPage.svelte';

 onMount(()=>{
  const chat=new URL(location.href).searchParams.get('chat');
  if(chat&&/^[1-9]\d{0,14}$/.test(chat))location.replace('/signin?chat='+chat);
 });
</script>
<LandingPage/>
