import {mount,unmount} from 'svelte';
import SpinnerLoader from './components/loaders/SpinnerLoader.svelte';

type Lock = {
 pending: number;
 ariaDisabled: string | null;
 ariaBusy: string | null;
 styles: Map<string, string>;
 indicator?: HTMLElement;
 spinner?: ReturnType<typeof mount>;
 nativeOwned?: boolean;
 observer?: MutationObserver;
 inputValue?: string;
};

const locks = new Map<HTMLElement, Lock>();
let trigger: {event: Event; nodes: HTMLElement[]} | undefined;

function restore(node: HTMLElement, lock: Lock) {
 lock.observer?.disconnect();
 if (lock.nativeOwned && (node instanceof HTMLButtonElement || node instanceof HTMLInputElement)) {
  node.disabled = false;
 }
 if (lock.spinner) void unmount(lock.spinner);
 lock.indicator?.remove();
 if (lock.inputValue !== undefined && node instanceof HTMLInputElement && node.value === 'Working…') {
  node.value = lock.inputValue;
 }
 for (const [property, value] of lock.styles) {
  if (value) node.style.setProperty(property, value);
  else node.style.removeProperty(property);
 }
 node.removeAttribute('data-request-loading');
 node.removeAttribute('data-action-locked');
 for (const [name, value] of [['aria-disabled', lock.ariaDisabled], ['aria-busy', lock.ariaBusy]] as const) {
  if (value === null) node.removeAttribute(name);
  else node.setAttribute(name, value);
 }
 locks.delete(node);
}

function showLoading(node: HTMLElement, lock: Lock) {
 const {color, position} = getComputedStyle(node);
 node.setAttribute('data-action-locked', '');
 node.setAttribute('aria-disabled', 'true');
 node.setAttribute('aria-busy', 'true');
 if (node instanceof HTMLFormElement) return;

 node.setAttribute('data-request-loading', '');
 if (!node.hasAttribute('data-loader-owned') && (node instanceof HTMLButtonElement || node instanceof HTMLAnchorElement)) {
  const width = node.getBoundingClientRect().width;
  for (const property of ['width', 'min-width', 'max-width', 'position', '--action-loader-ink']) {
   lock.styles.set(property, node.style.getPropertyValue(property));
  }
  if (width > 0) {
   for (const property of ['width', 'min-width', 'max-width']) node.style.setProperty(property, width + 'px');
  }
  if (position === 'static') node.style.position = 'relative';
  node.style.setProperty('--action-loader-ink', color);

  // Keep the existing Svelte-owned content and accessible name in place.
  const indicator = document.createElement('span');
  indicator.className = 'erp-action-loader';
  indicator.setAttribute('aria-hidden', 'true');
  node.append(indicator);
  lock.indicator = indicator;
  lock.spinner = mount(SpinnerLoader, {target: indicator, props: {size: 18, label: ''}});
 } else if (node instanceof HTMLInputElement && ['submit', 'button'].includes(node.type)) {
  lock.inputValue = node.value;
  node.value = 'Working…';
 }

 // Guard activation immediately. Apply native disabled after Svelte updates
 // the component's own disabled state and after native form validation.
 queueMicrotask(() => {
  if (locks.get(node) !== lock || !(node instanceof HTMLButtonElement || node instanceof HTMLInputElement) || node.disabled) return;
  const observer = new MutationObserver(() => { lock.nativeOwned = false; });
  observer.observe(node, {attributes: true, attributeFilter: ['disabled']});
  node.disabled = true;
  observer.takeRecords();
  lock.nativeOwned = true;
  lock.observer = observer;
 });
}

function acquire(node: HTMLElement) {
 const existing = locks.get(node);
 if (existing) {
  existing.pending++;
  return existing;
 }
 const lock: Lock = {
  pending: 1,
  ariaDisabled: node.getAttribute('aria-disabled'),
  ariaBusy: node.getAttribute('aria-busy'),
  styles: new Map()
 };
 locks.set(node, lock);
 showLoading(node, lock);
 return lock;
}

function block(event: Event) {
 event.preventDefault();
 event.stopImmediatePropagation();
}

export function installActionLocks() {
 const click = (event: MouseEvent) => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const target = event.target instanceof Element
   ? event.target.closest<HTMLElement>('button,input[type="submit"],input[type="button"],a.button,a[download],a[href*="/export"],[role="button"]')
   : null;
  if (!target) return;
  if (locks.has(target) || target.matches(':disabled') || target.getAttribute('aria-disabled') === 'true') {
   block(event);
   return;
  }
  trigger = {event, nodes: [target]};
 };
 const submit = (event: SubmitEvent) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  const submitter = event.submitter;
  if (locks.has(form) || (submitter instanceof HTMLElement && locks.has(submitter))) {
   block(event);
   return;
  }
  trigger = {event, nodes: submitter instanceof HTMLElement ? [form, submitter] : [form]};
 };
 const change = (event: Event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || input.type !== 'file') return;
  if (locks.has(input)) {
   block(event);
   return;
  }
  trigger = {event, nodes: [input]};
 };
 document.addEventListener('click', click, true);
 document.addEventListener('submit', submit, true);
 document.addEventListener('change', change, true);
 return () => {
  document.removeEventListener('click', click, true);
  document.removeEventListener('submit', submit, true);
  document.removeEventListener('change', change, true);
  trigger = undefined;
  for (const [node, lock] of locks) restore(node, lock);
 };
}

export function trackAction<T>(request: Promise<T>): Promise<T> {
 // eventPhase is reset when dispatch finishes, so background calls never
 // inherit a prior click. No timer or cooldown is needed.
 if (!trigger?.event.eventPhase) return request;
 const targets = trigger.nodes.map(node => ({node, lock: acquire(node)}));
 return request.finally(() => {
  for (const {node, lock} of targets) {
   if (locks.get(node) === lock && --lock.pending === 0) restore(node, lock);
  }
 });
}
