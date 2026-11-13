import type {Handle} from '@sveltejs/kit';
import {proxyApi} from '$lib/server/edge-proxy.mjs';

function allowsWorkspaceMicrophone(path:string){
 return /^\/(?:operations|(?:admin|md|finance)\/operations|(?:management|accounts|merchandising|planning|cad|sourcing|stores|sampling|cutting|sewing|finishing|quality|warehouse)(?:\/(?:companies|reminders|fields|users|operations))?)\/?$/.test(path);
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
 response.headers.set('Permissions-Policy',`camera=(), microphone=${microphone}, geolocation=()`);
 return response;
};
