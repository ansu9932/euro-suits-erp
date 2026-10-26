import { animate, createScope, createTimeline, stagger } from 'animejs';

type ConstructionMotionOptions = { paused: boolean; replay: number };

// A single assembly sequence, with a complete static illustration as its baseline.
// Shared page controls, reduced motion, visibility and unmount all stop the work.
export function constructionAnnouncement(node: HTMLElement, initial: ConstructionMotionOptions) {
 let options = initial, visible = false, played = false;
 let timeline: ReturnType<typeof createTimeline> | undefined;
 const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
 const stop = () => { timeline?.revert(); timeline = undefined; };
 const sync = () => {
  if (!visible || options.paused || reduce.matches || document.hidden) { stop(); return; }
  if (played) return;
  played = true;
  timeline = createTimeline({defaults: {ease: 'out(4)'}, onComplete: () => stop()});
  timeline
   .add(node.querySelectorAll('[data-build-block]'), {
    translateY: [-14, 0], opacity: [.15, 1], duration: 650, delay: stagger(320)
   }, 100)
   .add(node.querySelector('[data-build-thread]')!, {
    strokeDashoffset: [160, 0], duration: 2000, ease: 'inOut(3)'
   }, 250)
   .add(node.querySelector('[data-build-hammer]')!, {
    rotate: [0, -24, 8, -18, 6, 0], duration: 1700, ease: 'inOutSine'
   }, 500)
   .add(node.querySelector('[data-build-spool]')!, {
    translateY: [0, -3, 0], duration: 1700, ease: 'inOutSine'
   }, 550)
   .add(node.querySelector('[data-build-eyes]')!, {
    scaleY: [1, .15, 1], duration: 240, ease: 'inOutSine'
   }, 2500);
 };
 const observer = new IntersectionObserver(entries => {
  visible = entries[0].isIntersecting;
  sync();
 }, {threshold: .25});
 observer.observe(node);
 reduce.addEventListener('change', sync);
 document.addEventListener('visibilitychange', sync);
 return {
  update(next: ConstructionMotionOptions) {
   if (next.replay !== options.replay || (options.paused && !next.paused)) {
    stop(); played = false;
   }
   options = next; sync();
  },
  destroy() { stop(); observer.disconnect(); reduce.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync); }
 };
}

// Spooly's optional Web Component adapter. Gestures are finite and never gate
// a business action; the component owns and calls the returned cleanup.
export function mascotGesture(node: Element, gesture: string) {
 if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
 const frames: Record<string, number[]> = gesture === 'wave' ? {rotate: [0, -7, 6, 0]}
  : gesture === 'celebrate' ? {translateY: [0, -7, 0], rotate: [0, -4, 4, 0]}
  : {translateY: [0, 4, 0]};
 const animation = animate(node, {...frames, duration: 460, ease: 'outCubic',
  onComplete: instance => instance.revert()});
 return () => animation.revert();
}

// Content has no hidden CSS baseline. Finite, interruptible animation only;
// business actions and network requests never wait for these transitions.
export function enter(node: HTMLElement, key: unknown = '') {
 const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
 let animation: ReturnType<typeof animate> | undefined;
 const stop = () => { animation?.revert(); animation = undefined; };
 const play = () => {
  stop();
  if (!preference.matches) animation = animate(node, {
   opacity: [0.7, 1], translateY: [6, 0], duration: 200, ease: 'outCubic',
   // Remove transforms afterwards: fixed dialogs must remain viewport-bound.
   onComplete: instance => { instance.revert(); animation = undefined; }
  });
 };
 const changed = () => { if (preference.matches) stop(); };
 preference.addEventListener('change', changed);
 play();
 return {
  update(next: unknown) { if (next !== key) { key = next; play(); } },
  destroy() { stop(); preference.removeEventListener('change', changed); }
 };
}

// Scope owns media-query listeners and animation cleanup. Only a bounded set
// of surfaces enters on navigation; polling and typing do not replay motion.
// Opacity only: these surfaces may contain fixed-position dialogs.
export function workspaceMotion(node: HTMLElement, key: unknown = '') {
 let scope: ReturnType<typeof createScope> | undefined;
 let frame = 0;
 function play() {
  cancelAnimationFrame(frame);
  scope?.revert();
  frame = requestAnimationFrame(() => {
   scope = createScope({ root: node, mediaQueries: { reduce: '(prefers-reduced-motion: reduce)' } })
    .add(self => {
     if (!self || self.matches.reduce) return;
     const candidates = Array.from(node.querySelectorAll<HTMLElement>(
      '.metric, .company-metrics, .dev-stats, .panel, .samples, .material-workspace, .filters, .chart, .sop, .scroll, .table-scroll'
     ));
     // Avoid nested surfaces animating twice, and never animate modal content.
     const surfaces = candidates.filter(el => !el.closest('[role="dialog"], dialog') &&
      !candidates.some(parent => parent !== el && parent.contains(el))).slice(0, 10);
     if (surfaces.length) animate(surfaces, {
      opacity: [.72, 1], duration: 220, delay: stagger(22), ease: 'outCubic',
      onComplete: instance => instance.revert()
     });
    });
  });
 }
 play();
 return {
  update(next: unknown) { if (next !== key) { key = next; play(); } },
  destroy() { cancelAnimationFrame(frame); scope?.revert(); }
 };
}

// A changed registration origin changes the proposed ESF/ETF prefix. A single
// short surface highlight connects those two facts without moving any fields.
// Initial render/typing do not replay it; text is always visible without motion.
export function referenceFeedback(node: HTMLElement, key: unknown) {
 const preference = window.matchMedia('(prefers-reduced-motion: reduce), (forced-colors: active)');
 let animation: ReturnType<typeof animate> | undefined;
 const stop = () => { animation?.revert(); animation = undefined; };
 const changed = () => { if (preference.matches) stop(); };
 preference.addEventListener('change', changed);
 return {
  update(next: unknown) {
   if (next === key) return;
   key = next;
   stop();
   if (preference.matches) return;
   animation = animate(node, {
    backgroundColor: ['#d9eee8', getComputedStyle(node).backgroundColor],
    duration: 280, ease: 'outCubic',
    onComplete: instance => { instance.revert(); animation = undefined; }
   });
  },
  destroy() { stop(); preference.removeEventListener('change', changed); }
 };
}

// Decorative light only: one frame per pointer update, no layout reads while
// moving, no loop at rest, and no interception of form or keyboard interaction.
export function skyLight(node: HTMLElement, paused = false) {
 const preference = matchMedia('(prefers-reduced-motion: reduce), (forced-colors: active), (pointer: coarse)');
 const light = node.querySelector<HTMLElement>('[data-sky-light]');
 let frame = 0, active = false, x = 0, y = 0;
 let fade: ReturnType<typeof animate> | undefined;
 const stop = () => {
  cancelAnimationFrame(frame); frame = 0; active = false;
  fade?.revert(); fade = undefined;
  if (light) { light.style.opacity = '0'; light.style.removeProperty('transform'); }
 };
 const move = (event: PointerEvent) => {
  if (!light || paused || preference.matches || event.pointerType === 'touch') return;
  x = event.clientX; y = event.clientY;
  if (!active) {
   active = true; fade?.revert();
   fade = animate(light, {opacity: [0, .85], duration: 300, ease: 'outCubic'});
  }
  if (!frame) frame = requestAnimationFrame(() => {
   frame = 0; light.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  });
 };
 const visibility = () => { if (document.hidden) stop(); };
 node.addEventListener('pointermove', move, {passive:true});
 node.addEventListener('pointerleave', stop);
 preference.addEventListener('change', stop);
 document.addEventListener('visibilitychange', visibility);
 return {
  update(next: boolean) { paused = next; if (paused) stop(); },
  destroy() {
   stop(); node.removeEventListener('pointermove', move); node.removeEventListener('pointerleave', stop);
   preference.removeEventListener('change', stop); document.removeEventListener('visibilitychange', visibility);
  }
 };
}
