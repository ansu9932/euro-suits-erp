import type {Handle} from '@sveltejs/kit';
import {proxyApi} from '$lib/server/edge-proxy.mjs';

function allowsWorkspaceMicrophone(path:string){
 return /^\/(?:operations|signin|exports|(?:developer|admin|md|finance|management|accounts|merchandising|planning|cad|sourcing|stores|sampling|cutting|sewing|finishing|quality|warehouse)(?:\/(?:companies|reminders|fields|users|operations))?)\/?$/.test(path);
}

export const handle: Handle = async ({event, resolve}) => {
 if (event.platform?.env && event.url.pathname.startsWith('/api/')) {
  return proxyApi(event.request,event.platform.env,event.getClientAddress());
 }
 const response = await resolve(event);
 response.headers.set('X-Content-Type-Options','nosniff');
 response.headers.set('X-Frame-Options','DENY');
 response.headers.set('Referrer-Policy','same-origin');
 const microphone=allowsWorkspaceMicrophone(event.url.pathname)?'(self)':'()';
 const scanner = /^\/scan\/?$/.test(event.url.pathname);
 const camera = scanner ? '(self)' : '()';
 response.headers.set('Permissions-Policy',`camera=${camera}, microphone=${microphone}, geolocation=()`);
 if (scanner) {
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
 }
 return response;
};
