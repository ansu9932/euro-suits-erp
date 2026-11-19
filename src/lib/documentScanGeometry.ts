export type Point = {x: number; y: number};
export type Corners = [Point, Point, Point, Point];

export const fullPage: Corners = [{x: 0, y: 0}, {x: 1, y: 0}, {x: 1, y: 1}, {x: 0, y: 1}];

function area(corners: Corners) {
 return corners.reduce((sum, point, index) => {
  const next = corners[(index + 1) % 4];
  return sum + point.x * next.y - point.y * next.x;
 }, 0) / 2;
}

export function validCrop(corners: Corners) {
 return area(corners) >= 0.012 && corners.every((point, index) => {
  const next = corners[(index + 1) % 4], after = corners[(index + 2) % 4];
  return (next.x - point.x) * (after.y - next.y) - (next.y - point.y) * (after.x - next.x) > 0.001;
 });
}

const light = (buffer: Uint8ClampedArray, i: number) =>
 (77 * buffer[i] + 150 * buffer[i + 1] + 29 * buffer[i + 2]) >> 8;

export function detectPage({data, width, height}: ImageData): Corners | null {
 if (width < 12 || height < 12) return null;
 const size = width * height, shade = new Uint8Array(size), histogram = new Uint32Array(256);
 let total = 0;
 for (let i = 0; i < size; i++) {
  const value = light(data, i * 4);
  shade[i] = value;
  histogram[value]++;
  total += value;
 }

 // Split foreground from background at the strongest change in luminance.
 let left = 0, sum = 0, separation = 0, cutoff = 0;
 for (let value = 0; value < histogram.length; value++) {
  left += histogram[value];
  sum += value * histogram[value];
  if (left < size * 0.03 || size - left < size * 0.03) continue;
  const difference = (total - sum) / (size - left) - sum / left;
  if (difference < 23) continue;
  const score = left * (size - left) * difference ** 2;
  if (score > separation) {separation = score; cutoff = value;}
 }
 if (!separation) return null;

 const visited = new Uint8Array(size), queue = new Int32Array(size);
 let bestScore = 0, best: Corners | null = null;
 for (let start = 0; start < size; start++) {
  if (visited[start] || shade[start] <= cutoff) continue;
  let count = 1;
  const extremes = [Infinity, -Infinity, -Infinity, Infinity];
  const points = [start, start, start, start];
  visited[start] = 1;
  queue[0] = start;
  const append = (index: number) => {
   if (!visited[index] && shade[index] > cutoff) {
    visited[index] = 1;
    queue[count++] = index;
   }
  };
  for (let head = 0; head < count; head++) {
   const id = queue[head], x = id % width, y = Math.floor(id / width);
   const diagonal = x / width + y / height;
   const cross = x / width - y / height;
   if (diagonal < extremes[0]) {extremes[0] = diagonal; points[0] = id;}
   if (cross > extremes[1]) {extremes[1] = cross; points[1] = id;}
   if (diagonal > extremes[2]) {extremes[2] = diagonal; points[2] = id;}
   if (cross < extremes[3]) {extremes[3] = cross; points[3] = id;}
   if (x > 0) append(id - 1);
   if (x < width - 1) append(id + 1);
   if (y > 0) append(id - width);
   if (y < height - 1) append(id + width);
  }
  if (count < size * 0.16 || count > size * 0.93) continue;
  const corners = points.map(id => ({x: (id % width + 0.5) / width, y: (Math.floor(id / width) + 0.5) / height})) as Corners;
  const surface = area(corners);
  if (surface < 0.18 || !validCrop(corners) || count / (surface * size) < 0.72 || count / (surface * size) > 1.08) continue;
  if (corners.some(({x, y}) => x < 0.012 || y < 0.012 || x > 0.988 || y > 0.988)) continue;

  // Each side needs evidence of a real edge. This avoids snapping to text,
  // glare, or a background region that happens to have four extreme points.
  const sample = (x: number, y: number) =>
   shade[Math.max(0, Math.min(height - 1, Math.round(y))) * width + Math.max(0, Math.min(width - 1, Math.round(x)))];
  let strength = 0;
  for (let side = 0; side < 4; side++) {
   const a = corners[side], b = corners[(side + 1) % 4];
   const dx = (b.x - a.x) * width, dy = (b.y - a.y) * height;
   const length = Math.hypot(dx, dy);
   const nx = -dy / length * 3, ny = dx / length * 3;
   let matches = 0;
   for (let step = 1; step <= 7; step++) {
    const x = a.x * width + dx * step / 8, y = a.y * height + dy * step / 8;
    if (sample(x + nx, y + ny) - sample(x - nx, y - ny) >= 15) matches++;
   }
   if (matches < 4) {strength = 0; break;}
   strength += matches;
  }
  const score = count * strength;
  if (score > bestScore) {bestScore = score; best = corners;}
 }
 if (!best) return null;
 // Give edge text a tiny margin when corners land just inside the paper.
 const centre = best.reduce((p, q) => ({x: p.x + q.x / 4, y: p.y + q.y / 4}), {x: 0, y: 0});
 return best.map(p => ({
  x: Math.max(0, Math.min(1, p.x + (p.x - centre.x) * 0.007)),
  y: Math.max(0, Math.min(1, p.y + (p.y - centre.y) * 0.007))
 })) as Corners;
}

export function cropResolution(corners: Corners, sourceWidth: number, sourceHeight: number) {
 const edge = (a: Point, b: Point) => Math.hypot((a.x - b.x) * sourceWidth, (a.y - b.y) * sourceHeight);
 const [a, b, c, d] = corners;
 const width = Math.max(edge(a, b), edge(d, c));
 const height = Math.max(edge(a, d), edge(b, c));
 const scale = Math.min(1, 2400 / Math.max(width, height));
 return {width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale))};
}

// Map the output rectangle back into the photographed quadrilateral, with
// bilinear sampling so angled edges and fine strokes do not become jagged.
export function flattenPage(source: ImageData, target: ImageData, corners: Corners) {
 const [a, b, c, d] = corners;
 const dx1 = b.x - c.x, dy1 = b.y - c.y;
 const dx2 = d.x - c.x, dy2 = d.y - c.y;
 const dx3 = a.x - b.x + c.x - d.x, dy3 = a.y - b.y + c.y - d.y;
 const determinant = dx1 * dy2 - dx2 * dy1;
 const g = (dx3 * dy2 - dx2 * dy3) / determinant;
 const h = (dx1 * dy3 - dx3 * dy1) / determinant;
 const xU = b.x - a.x + g * b.x, xV = d.x - a.x + h * d.x;
 const yU = b.y - a.y + g * b.y, yV = d.y - a.y + h * d.y;
 const pixels = source.data, result = target.data;
 const right = source.width - 1, bottom = source.height - 1;
 let offset = 0;
 for (let y = 0; y < target.height; y++) {
  const v = (y + 0.5) / target.height;
  const rowX = a.x + xV * v, rowY = a.y + yV * v, rowD = 1 + h * v;
  for (let x = 0; x < target.width; x++) {
   const u = (x + 0.5) / target.width;
   const divisor = rowD + g * u;
   const sx = Math.max(0, Math.min(right, (rowX + xU * u) / divisor * source.width - 0.5));
   const sy = Math.max(0, Math.min(bottom, (rowY + yU * u) / divisor * source.height - 0.5));
   const col = sx | 0, row = sy | 0, fx = sx - col, fy = sy - row;
   const tl = (row * source.width + col) * 4;
   const nextCol = col < right ? 4 : 0, nextRow = row < bottom ? source.width * 4 : 0;
   for (let channel = 0; channel < 3; channel++) {
    const pos = tl + channel;
    const top = pixels[pos] + (pixels[pos + nextCol] - pixels[pos]) * fx;
    const below = pixels[pos + nextRow] + (pixels[pos + nextRow + nextCol] - pixels[pos + nextRow]) * fx;
    result[offset++] = top + (below - top) * fy;
   }
   result[offset++] = 255;
  }
 }
}

export function improvePaper({data}: ImageData) {
 const histogram = new Uint32Array(256);
 for (let i = 0; i < data.length; i += 64) histogram[light(data, i)]++;
 const samples = Math.ceil(data.length / 64);
 const percentile = (p: number) => {
  let count = 0;
  for (let value = 0; value < 255; value++) {
   count += histogram[value];
   if (count >= samples * p) return value;
  }
  return 255;
 };
 const paper = percentile(0.90);
 if (paper < 140 || percentile(0.12) > paper - 14) return;
 // Lift gray paper and strengthen strokes gently, without thresholding away
 // pale ink, colored annotations or watermarks.
 const lift = Math.min(24, Math.max(0, 250 - paper));
 const table = Uint8ClampedArray.from({length: 256}, (_, value) =>
  value + lift * (value / 255) ** 2 - 10 * Math.sin(Math.PI * value / 255));
 for (let i = 0; i < data.length; i += 4) {
  const value = light(data, i);
  const shift = table[value] - value;
  data[i] += shift;
  data[i + 1] += shift;
  data[i + 2] += shift;
 }
}
