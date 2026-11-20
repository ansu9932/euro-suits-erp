import {read} from '$app/server';
import video from '#lib/assets/euro-suits-erp-walkthrough-v1.mp4?url';
import type {RequestHandler} from './$types';

export const GET: RequestHandler = async ({request}) => {
 const asset = read(video);
 const length = Number(asset.headers.get('Content-Length'));
 const headers = new Headers({
  'Content-Type': 'video/mp4',
  'Content-Length': String(length),
  'Accept-Ranges': 'bytes',
  'Cache-Control': 'public, max-age=86400',
  'ETag': '"erp-walkthrough-v1"',
 });
 if (request.method === 'HEAD') {
  await asset.body?.cancel();
  return new Response(null, {headers});
 }
 const range = request.headers.get('Range');
 const ifRange = request.headers.get('If-Range');
 if (!range || ifRange && ifRange !== headers.get('ETag')) {
  return new Response(asset.body, {headers});
 }

 const match = /^bytes=(\d*)-(\d*)$/i.exec(range.trim());
 const suffix = match && !match[1];
 const requestedStart = Number(match?.[1]);
 const requestedEnd = Number(match?.[2]);
 const start = suffix ? Math.max(0, length - requestedEnd) : requestedStart;
 const end = suffix || !match?.[2] ? length - 1 : Math.min(requestedEnd, length - 1);
 if (!match || !match[1] && !match[2] || !Number.isSafeInteger(start) ||
     !Number.isSafeInteger(end) || start < 0 || start >= length || end < start) {
  await asset.body?.cancel();
  headers.set('Content-Range', 'bytes */' + length);
  headers.set('Content-Length', '0');
  return new Response(null, {status: 416, headers});
 }

 headers.set('Content-Range', `bytes ${start}-${end}/${length}`);
 headers.set('Content-Length', String(end - start + 1));
 let position = 0;
 const body = asset.body!.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
  transform(chunk, controller) {
   const chunkStart = position;
   position += chunk.byteLength;
   if (position <= start) return;
   const from = Math.max(0, start - chunkStart);
   const to = Math.min(chunk.byteLength, end + 1 - chunkStart);
   controller.enqueue(chunk.subarray(from, to));
   if (position > end) controller.terminate();
  },
 }));
 return new Response(body, {status: 206, headers});
};

export const HEAD = GET;
