import {cp,mkdir} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
await mkdir(new URL('static/pdf-preview/',root),{recursive:true});
for(const directory of ['cmaps','standard_fonts','wasm'])await cp(new URL('node_modules/pdfjs-dist/'+directory,root),new URL('static/pdf-preview/'+directory,root),{recursive:true});
