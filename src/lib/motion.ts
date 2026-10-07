import { animate, createScope, stagger } from 'animejs';

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
