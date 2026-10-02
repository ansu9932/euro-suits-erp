import { animate } from 'animejs';

// Svelte action: no hidden CSS baseline, so content remains usable if an
// animation cannot run. No layout animation or delay on business actions.
export function enter(node: HTMLElement, key: unknown = '') {
 const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
 let animation: ReturnType<typeof animate> | undefined;
 const stop = () => { animation?.revert(); animation = undefined; };
 const play = () => {
  stop();
  if (!preference.matches) animation = animate(node, {
   opacity: [0.5, 1], translateY: [6, 0], duration: 220, ease: 'outQuad'
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
