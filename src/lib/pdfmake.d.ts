declare module 'pdfmake/build/pdfmake' { const pdfmake:{setUrlAccessPolicy:(policy:(url:string)=>boolean)=>void;addVirtualFileSystem:(vfs:Record<string,string>)=>void;createPdf:(definition:any)=>{getBlob:()=>Promise<Blob>}};export default pdfmake; }
declare module 'pdfmake/build/vfs_fonts' { const fonts:Record<string,string>;export default fonts; }
declare module 'pdfmake/build/pdfmake.js' { export {default} from 'pdfmake/build/pdfmake'; }
