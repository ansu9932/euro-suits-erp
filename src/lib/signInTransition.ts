import { writable } from 'svelte/store';

export type SignInPhase = 'authentication' | 'dashboard';
type Transition = { phase: SignInPhase; pending: number; leaving: boolean };

const phase = writable<SignInPhase | null>(null);
const handoffKey = 'erp.sign-in-destination';
let current: Transition | null = null;
export const signInPhase = { subscribe: phase.subscribe };

function hold(transition: Transition) {
 transition.pending++;
 let released = false;
 return () => {
  if (released) return;
  released = true;
  transition.pending--;
  if (current === transition && transition.pending === 0 && !transition.leaving) {
   current = null;
   phase.set(null);
  }
 };
}

function start(initialPhase: SignInPhase) {
 const transition: Transition = { phase: initialPhase, pending: 0, leaving: false };
 current = transition;
 const finish = hold(transition);
 phase.set(initialPhase);
 return {
  authenticated() {
   if (current !== transition) return;
   transition.phase = 'dashboard';
   phase.set('dashboard');
  },
  finish,
 };
}

export function beginSignIn() {
 return start('authentication');
}

// A newly mounted dashboard can have its own first data request.
export function holdDashboardLoad() {
 return current?.phase === 'dashboard' ? hold(current) : () => {};
}

export function redirectToWorkspace(destination: string) {
 const transition = current;
 if (transition?.phase === 'dashboard') {
  const target = new URL(destination, location.href);
  try {
   // The destination consumes the display marker once. It conveys no identity or access.
   sessionStorage.setItem(handoffKey, target.pathname);
  } catch { /* The destination can still use its initial page loader. */ }
 }
 window.location.replace(destination);
 if (transition?.phase === 'dashboard') transition.leaving = true;
}

export function resumeSignIn() {
 try {
  const destination = sessionStorage.getItem(handoffKey);
  if (destination) {
   sessionStorage.removeItem(handoffKey);
   if (destination === location.pathname) return start('dashboard').finish;
  }
 } catch { /* Storage availability does not affect authentication. */ }
 return () => {};
}
