document.addEventListener('click', event => {
 const trigger = event.target instanceof Element ? event.target.closest('[data-video-src]') : null;
 if (!trigger) return;
 event.preventDefault();
 if (document.querySelector('.erp-video-dialog[open]')) return;

 const dialog = document.createElement('dialog');
 dialog.className = 'erp-video-dialog';
 dialog.setAttribute('aria-label', 'Euro Suits ERP video walkthrough');
 dialog.innerHTML = `
  <header class="erp-video-header">
   <h2>Euro Suits ERP walkthrough</h2>
   <button type="button" aria-label="Close video">✕ <span>Close</span></button>
  </header>
  <div class="erp-video-screen">
   <video controls playsinline preload="auto" aria-label="Euro Suits ERP video walkthrough"></video>
   <div class="erp-video-loading" role="status"><span aria-hidden="true"></span>Loading video…</div>
  </div>
  <p class="erp-video-message" role="status" hidden></p>
 `;
 const video = dialog.querySelector('video');
 const loading = dialog.querySelector('.erp-video-loading');
 const message = dialog.querySelector('.erp-video-message');
 const previousOverflow = document.body.style.overflow;
 let closed = false;

 function close() {
  dialog.close();
  stop();
 }
 function stop() {
  if (closed) return;
  closed = true;
  video.pause();
  video.removeAttribute('src');
  video.load();
  dialog.remove();
  document.body.style.overflow = previousOverflow;
  window.removeEventListener('popstate', close);
  window.removeEventListener('pagehide', close);
  if (trigger.isConnected) trigger.focus({preventScroll: true});
 }
 function showLoading() {
  loading.hidden = false;
 }
 function hideLoading() {
  loading.hidden = true;
 }
 video.addEventListener('waiting', showLoading);
 video.addEventListener('seeking', showLoading);
 video.addEventListener('playing', () => {
  hideLoading();
  message.hidden = true;
 });
 video.addEventListener('canplay', hideLoading);
 video.addEventListener('pause', hideLoading);
 video.addEventListener('error', () => {
  hideLoading();
  message.textContent = 'The video could not load. Check your connection, then close and reopen it to retry.';
  message.hidden = false;
 });
 dialog.querySelector('button').addEventListener('click', close);
 dialog.addEventListener('click', event => {
  if (event.target === dialog) close();
 });
 dialog.addEventListener('cancel', event => {
  event.preventDefault();
  close();
 });
 dialog.addEventListener('close', stop, {once: true});
 window.addEventListener('popstate', close);
 window.addEventListener('pagehide', close);
 document.body.append(dialog);
 document.body.style.overflow = 'hidden';
 video.src = trigger.dataset.videoSrc;
 dialog.showModal();
 video.play().catch(() => {
  if (closed || video.error) return;
  hideLoading();
  message.textContent = 'Press Play to start the video.';
  message.hidden = false;
 });
});
