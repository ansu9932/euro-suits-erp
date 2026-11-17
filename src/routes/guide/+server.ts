import guide from '../../../static/guide.html?raw';

export function GET() {
 return new Response(guide, {
  headers: {
   'Content-Type': 'text/html; charset=utf-8',
   'Cache-Control': 'public, max-age=300',
  },
 });
}
