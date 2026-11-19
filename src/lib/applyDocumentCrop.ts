import type {Corners} from './documentScanGeometry';
import {cropPhoto, type ScanResult} from './documentScanImage';

export async function applyDocumentCrop(photo: Blob, corners: Corners, signal: AbortSignal) {
 signal.throwIfAborted();
 if (typeof Worker === 'function' && typeof OffscreenCanvas === 'function') {
  let worker: Worker | undefined;
  try {
   const processing = new Worker(new URL('./documentScan.worker.ts', import.meta.url), {type: 'module'});
   worker = processing;
   return await new Promise<ScanResult>((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener('abort', abort, {once: true});
    const finish = () => signal.removeEventListener('abort', abort);
    processing.onmessage = (event: MessageEvent<{result: ScanResult} | {error: string}>) => {
     finish();
     if ('result' in event.data) resolve(event.data.result);
     else reject(new Error(event.data.error));
    };
    processing.onerror = () => {finish(); reject(new Error('Could not start document processing.'));};
    try {processing.postMessage({photo, corners});}
    catch (error) {finish(); reject(error);}
   });
  } catch {
   signal.throwIfAborted();
  } finally {
   worker?.terminate();
  }
 }
 return cropPhoto(photo, corners);
}
