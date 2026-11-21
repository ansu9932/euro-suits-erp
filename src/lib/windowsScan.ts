const endpoint = 'http://127.0.0.1:37841/scan';
const codeKey = 'euro-suits-scanner-code';
export const documentScanPageLimit = 20;
export type ScannerSource = 'feeder' | 'flatbed';

export const getScannerCode = () => sessionStorage.getItem(codeKey) || '';
export const saveScannerCode = (code: string) => sessionStorage.setItem(codeKey, code);

export async function scanDocumentPages(
 code: string,
 source: ScannerSource,
 count: number,
 signal: AbortSignal
): Promise<{pages: string[]; warning?: string}> {
 let response: Response;
 try {
  const request: RequestInit & {targetAddressSpace: 'loopback'} = {
   method: 'POST',
   headers: {'Content-Type': 'application/json', 'X-ERP-Scanner-Code': code},
   body: JSON.stringify({source, count}),
   credentials: 'omit',
   redirect: 'error',
   targetAddressSpace: 'loopback',
   signal
  };
  response = await fetch(endpoint, request);
 } catch (error) {
  if (signal.aborted) throw error;
  throw new Error('Start Euro Suits Scanner on this PC. If Chrome asks to connect to apps on this device, allow access for the ERP and try again.');
 }
 const data = await response.json();
 if (!response.ok) throw new Error(data.error || 'The scanner could not complete this scan.');
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
