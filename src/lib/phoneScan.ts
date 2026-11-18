export type ScanFormat = 'pdf' | 'jpeg';
export type ScanStatus = {
 state: 'waiting' | 'uploading' | 'submitted';
 expiresAt: number;
 now: number;
 format: ScanFormat;
 maxBytes: number;
};
export const scanFileLimit = 8 * 1024 * 1024;

export function scanHeaders(token: string) {
 return {'X-Phone-Scan': token};
}

export async function scanResponse<T>(response: Response): Promise<T> {
 const data = await response.json().catch(() => ({}));
 if (!response.ok) {
  throw Object.assign(new Error(data.error || 'The connection was interrupted. Try again.'), {status: response.status});
 }
 return data;
}

export function scanCountdown(milliseconds: number) {
 const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
 return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
}
