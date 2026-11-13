const speechBandEdges = [85, 180, 340, 620, 1000, 1700, 2800, 4800];
const restingLevels = [0.25, 0.4, 0.55, 0.7, 0.55, 0.4, 0.25];

// Visualize the recorder's stream locally. The caller still owns the mic tracks.
export function startDictationMeter(stream: MediaStream, render: (levels: readonly number[]) => void): () => void {
 const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
 const Audio = window.AudioContext ||
  (window as Window & {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
 let context: AudioContext | undefined;
 let source: MediaStreamAudioSourceNode | undefined;
 let frame: number | undefined;
 let draw: FrameRequestCallback | undefined;

 function stopFrames() {
  if (frame !== undefined) window.cancelAnimationFrame(frame);
  frame = undefined;
 }

 function closeAudio() {
  stopFrames();
  source?.disconnect();
  source = undefined;
  if (context && context.state !== 'closed') void context.close().catch(() => {});
  context = undefined;
  draw = undefined;
 }

 function syncMotion() {
  stopFrames();
  render(restingLevels);
  if (preference.matches || !Audio) return;
  if (!draw) {
   try {
    context = new Audio();
    source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    analyser.minDecibels = -66;
    analyser.maxDecibels = -22;
    analyser.smoothingTimeConstant = 0.55;
    // Analyser nodes work without a destination, so recorded speech never plays.
    source.connect(analyser);

    const samples = new Uint8Array(analyser.frequencyBinCount);
    const binsPerHz = analyser.fftSize / context.sampleRate;
    const bands = speechBandEdges.slice(0, -1).map((hz, index) => {
     const start = Math.max(1, Math.round(hz * binsPerHz));
     return {start, end: Math.min(samples.length, Math.max(start + 1, Math.round(speechBandEdges[index + 1] * binsPerHz)))};
    });
    const levels = [...restingLevels];
    let lastFrame = -Infinity;
    draw = now => {
     if (now - lastFrame >= 32) {
      lastFrame = now;
      analyser.getByteFrequencyData(samples);
      for (let index = 0; index < bands.length; index++) {
       const {start, end} = bands[index];
       let peak = 0;
       for (let bin = start; bin < end; bin++) peak = Math.max(peak, samples[bin]);
       levels[index] = 0.2 + 0.8 * peak / 255;
      }
      render(levels);
     }
     if (draw) frame = window.requestAnimationFrame(draw);
    };
   } catch {
    closeAudio();
    return;
   }
  }
  if (context?.state === 'suspended') void context.resume().catch(() => {});
  frame = window.requestAnimationFrame(draw);
 }

 syncMotion();
 preference.addEventListener('change', syncMotion);
 return () => {
  preference.removeEventListener('change', syncMotion);
  closeAudio();
 };
}
