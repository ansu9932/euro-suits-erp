import {cropPhoto} from './documentScanImage';
import type {Corners} from './documentScanGeometry';

self.onmessage = async ({data}: MessageEvent<{photo: Blob; corners: Corners}>) => {
 try {
  self.postMessage({result: await cropPhoto(data.photo, data.corners)});
 } catch (error) {
  self.postMessage({error: error instanceof Error ? error.message : 'Could not prepare this page.'});
 }
};
