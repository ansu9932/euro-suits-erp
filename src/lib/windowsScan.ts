const connector = 'http://127.0.0.1:37841';
const codeKey = 'euro-suits-scanner-code';
export const documentScanPageLimit = 20;
export type ScannerSource = 'feeder' | 'flatbed';

export const getScannerCode = () => localStorage.getItem(codeKey) || sessionStorage.getItem(codeKey) || '';

export function clearScannerCode(code: string) {
 if (localStorage.getItem(codeKey) === code) localStorage.removeItem(codeKey);
 if (sessionStorage.getItem(codeKey) === code) sessionStorage.removeItem(codeKey);
}

async function requestScanner(path: '/pair' | '/scan', code: string, payload: object, signal: AbortSignal) {
 let response: Response;
 try {
  const request: RequestInit & {targetAddressSpace: 'loopback'} = {
   method: 'POST',
   headers: {'Content-Type': 'application/json', 'X-ERP-Scanner-Code': code},
   body: JSON.stringify(payload),
   credentials: 'omit',
   redirect: 'error',
   targetAddressSpace: 'loopback',
   signal
  };
  response = await fetch(connector + path, request);
 } catch (error) {
  if (signal.aborted) throw error;
  throw new Error('Start Euro Suits Scanner v2 on this PC. If Chrome asks to connect to apps on this device, allow it for the ERP and try again.');
 }
 if (!response.ok) {
  const data = await response.json().catch(() => ({}));
  throw Object.assign(new Error(data.error || 'This connector could not complete the request. Open Euro Suits Scanner v2.'), {status: response.status});
 }
 return response;
}

export async function connectScanner(signal: AbortSignal) {
 const code = Array.from(crypto.getRandomValues(new Uint8Array(32)), value => value.toString(16).padStart(2, '0')).join('');
 await requestScanner('/pair', code, {}, signal);
 if (signal.aborted) throw signal.reason;
 localStorage.setItem(codeKey, code);
 return code;
}

export async function scanDocumentPages(
 code: string, source: ScannerSource, count: number, signal: AbortSignal
): Promise<{pages: string[]; warning?: string}> {
 const response = await requestScanner('/scan', code, {source, count}, signal);
 const data = await response.json();
 return {pages: data.pages.map((page: string) => 'data:image/jpeg;base64,' + page), warning: data.warning};
}

export async function createScannedDocument(pages: string[]): Promise<File> {
 const {default: pdf} = await import('pdfmake/build/pdfmake.js');
 pdf.setUrlAccessPolicy(() => false);
 const result = await pdf.createPdf({
  pageSize: 'A4',
  pageMargins: [12, 12, 12, 12],
  content: pages.map((page, index) => ({
   image: page,
   fit: [570, 816],
   alignment: 'center',
   pageBreak: index ? 'before' : undefined
  }))
 }).getBlob();
 return new File([result], 'Scanned document.pdf', {type: 'application/pdf'});
}
