import {cropResolution, detectPage, flattenPage, improvePaper, validCrop, type Corners} from './documentScanGeometry';

type ScanCanvas = HTMLCanvasElement | OffscreenCanvas;
export type ScanResult = {photo: Blob; thumbnail: Blob};

function canvas(width: number, height: number): ScanCanvas {
 if (typeof document === 'undefined') return new OffscreenCanvas(width, height);
 const element = document.createElement('canvas');
 element.width = width;
 element.height = height;
 return element;
}

async function decode(photo: Blob) {
 if (typeof createImageBitmap === 'function') {
  try {
   const bitmap = await createImageBitmap(photo);
   return {image: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close()};
  } catch (error) {
   if (typeof document === 'undefined') throw error;
  }
 }
 const url = URL.createObjectURL(photo);
 try {
  const image = new Image();
  image.src = url;
  await image.decode();
  return {image, width: image.naturalWidth, height: image.naturalHeight, close: () => URL.revokeObjectURL(url)};
 } catch (error) {
  URL.revokeObjectURL(url);
  throw error;
 }
}

export function jpeg(surface: ScanCanvas, quality: number): Promise<Blob> {
 if ('convertToBlob' in surface) return surface.convertToBlob({type: 'image/jpeg', quality});
 return new Promise((resolve, reject) => {
  surface.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not prepare this photo. Try again.')), 'image/jpeg', quality);
 });
}

function draw(image: CanvasImageSource, width: number, height: number, edge: number) {
 const scale = Math.min(1, edge / Math.max(width, height));
 const surface = canvas(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)));
 const context = surface.getContext('2d', {willReadFrequently: true});
 if (!context) throw new Error('Could not open this photo. Try again.');
 context.fillStyle = '#fff';
 context.fillRect(0, 0, surface.width, surface.height);
 context.imageSmoothingQuality = 'high';
 context.drawImage(image, 0, 0, surface.width, surface.height);
 return {surface, context};
}

export async function reviewPhoto(photo: Blob) {
 const decoded = await decode(photo);
 try {
  const {width, height, image} = decoded;
  const {surface, context} = draw(image, width, height, 320);
  return {width, height, corners: detectPage(context.getImageData(0, 0, surface.width, surface.height))};
 } finally {
  decoded.close();
 }
}

export async function cropPhoto(photo: Blob, corners: Corners): Promise<ScanResult> {
 if (!validCrop(corners)) throw new Error('Move the corners to frame the page.');
 const decoded = await decode(photo);
 const {image, width, height} = decoded;
 let source: ScanCanvas | undefined, output: ScanCanvas | undefined, thumb: ScanCanvas | undefined;
 try {
  const input = draw(image, width, height, 3600);
  source = input.surface;
  const size = cropResolution(corners, source.width, source.height);
  output = canvas(size.width, size.height);
  const context = output.getContext('2d');
  if (!context) throw new Error('Could not prepare this page. Try again.');
  const pixels = input.context.getImageData(0, 0, source.width, source.height);
  const result = context.createImageData(size.width, size.height);
  flattenPage(pixels, result, corners);
  improvePaper(result);
  context.putImageData(result, 0, 0);
  thumb = draw(output, output.width, output.height, 240).surface;
  return {photo: await jpeg(output, 0.93), thumbnail: await jpeg(thumb, 0.83)};
 } finally {
  decoded.close();
  for (const surface of [source, output, thumb]) {
   if (surface) surface.width = surface.height = 0;
  }
 }
}

export async function fitDocumentPhoto(photo: Blob, budget: number) {
 if (photo.size <= budget) return photo;
 const decoded = await decode(photo);
 try {
  const {image, width, height} = decoded;
  let edge = Math.max(width, height);
  for (let attempt = 0; attempt < 7; attempt++) {
   const {surface} = draw(image, width, height, edge);
   try {
    // Try reducing JPEG size while keeping the small print at full resolution.
    for (const quality of attempt === 0 ? [0.88, 0.78, 0.68] : [0.81, 0.68]) {
     const candidate = await jpeg(surface, quality);
     if (candidate.size <= budget) return candidate;
    }
   } finally {
    surface.width = surface.height = 0;
   }
   edge = Math.floor(edge * 0.82);
  }
  throw new Error('The scanned pages are too large. Remove a page and try again.');
 } finally {
  decoded.close();
 }
}

export function pageBudgets(sizes: number[], budget: number) {
 const budgets = sizes.slice();
 let remaining = budget;
 const largest = sizes.map((size, index) => ({size, index})).sort((a, b) => a.size - b.size);
 for (let i = 0; i < largest.length; i++) {
  const {size, index} = largest[i];
  budgets[index] = Math.min(size, Math.floor(remaining / (largest.length - i)));
  remaining -= budgets[index];
 }
 return budgets;
}
