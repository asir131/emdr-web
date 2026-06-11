const DEFAULT_WINDOW_MS = 20;
const MERGE_GAP_MS = 80;
const MIN_HIT_MS = 20;
const MIN_DISTINCT_HIT_GAP_SEC = 0.16;

const median = (values) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

const round = (value, places = 3) =>
  Number.isFinite(value) ? Number(value.toFixed(places)) : undefined;

const getSide = (leftEnergy, rightEnergy) => {
  const total = leftEnergy + rightEnergy;
  if (!total) return "center";

  const balance = (rightEnergy - leftEnergy) / total;
  if (balance > 0.2) return "right";
  if (balance < -0.2) return "left";
  return "center";
};

const getMode = (durationSec, hits, beatIntervalMs) => {
  if (!hits.length) return "unknown";
  if (hits.length <= 1) return "one-shot";
  if (durationSec > 12 || hits.length > 4) return "stereo-track";
  if (hits.length >= 3 && beatIntervalMs) return "stereo-track";
  return "two-hit-stereo";
};

export const analyzeAudioBuffer = (audioBuffer, options = {}) => {
  const windowMs = options.windowMs || DEFAULT_WINDOW_MS;
  const sampleRate = audioBuffer.sampleRate;
  const windowSize = Math.max(1, Math.floor(sampleRate * (windowMs / 1000)));
  const left = audioBuffer.getChannelData(0);
  const right =
    audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : left;
  const frameCount = Math.floor(audioBuffer.length / windowSize);
  const windows = [];

  for (let index = 0; index < frameCount; index += 1) {
    const start = index * windowSize;
    const end = Math.min(start + windowSize, audioBuffer.length);
    let leftSum = 0;
    let rightSum = 0;

    for (let sample = start; sample < end; sample += 1) {
      leftSum += left[sample] * left[sample];
      rightSum += right[sample] * right[sample];
    }

    const count = Math.max(1, end - start);
    const leftRms = Math.sqrt(leftSum / count);
    const rightRms = Math.sqrt(rightSum / count);

    windows.push({
      index,
      startSec: start / sampleRate,
      endSec: end / sampleRate,
      leftRms,
      rightRms,
      energy: (leftRms + rightRms) / 2,
    });
  }

  const energies = windows.map((window) => window.energy);
  const peakEnergy = Math.max(...energies, 0);
  const lowEnergyFloor = median(
    [...energies].sort((a, b) => a - b).slice(0, Math.max(1, Math.floor(energies.length * 0.1)))
  );
  const threshold = Math.max(
    peakEnergy * 0.12,
    Math.min(peakEnergy * 0.45, lowEnergyFloor * 4),
    0.002
  );
  const activeWindows = windows.filter((window) => window.energy >= threshold);
  const segments = [];

  activeWindows.forEach((window) => {
    const previous = segments[segments.length - 1];
    const gapMs = previous ? (window.startSec - previous.endSec) * 1000 : Infinity;

    if (!previous || gapMs > MERGE_GAP_MS) {
      segments.push({
        startSec: window.startSec,
        endSec: window.endSec,
        peakSec: window.startSec,
        peakEnergy: window.energy,
        leftEnergy: window.leftRms,
        rightEnergy: window.rightRms,
      });
      return;
    }

    previous.endSec = window.endSec;
    previous.leftEnergy += window.leftRms;
    previous.rightEnergy += window.rightRms;
    if (window.energy > previous.peakEnergy) {
      previous.peakEnergy = window.energy;
      previous.peakSec = window.startSec;
    }
  });

  const rawHits = segments
    .filter((segment) => (segment.endSec - segment.startSec) * 1000 >= MIN_HIT_MS)
    .map((segment) => ({
      timeSec: round(segment.startSec, 3),
      side: getSide(segment.leftEnergy, segment.rightEnergy),
    }));
  const hits = rawHits.reduce((merged, hit) => {
    const previous = merged[merged.length - 1];
    if (previous && hit.timeSec - previous.timeSec < MIN_DISTINCT_HIT_GAP_SEC) {
      return merged;
    }

    if (previous && previous.side === hit.side && hit.timeSec - previous.timeSec < 0.35) {
      return merged;
    }

    merged.push(hit);
    return merged;
  }, []);

  const intervals = [];
  for (let index = 1; index < hits.length; index += 1) {
    const intervalMs = (hits[index].timeSec - hits[index - 1].timeSec) * 1000;
    if (intervalMs > 80) intervals.push(intervalMs);
  }

  const beatIntervalMs = intervals.length ? Math.round(median(intervals)) : undefined;
  const durationSec = round(audioBuffer.duration, 3);

  return {
    durationSec,
    mode: getMode(durationSec || 0, hits, beatIntervalMs),
    hits: hits.slice(0, 16),
    beatIntervalMs,
    firstBeatSide: hits[0]?.side,
    preserveOriginalPan: audioBuffer.numberOfChannels > 1,
    analysisStatus: "success",
  };
};

export const analyzeAudioArrayBuffer = async (arrayBuffer) => {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error("Web Audio API is not available in this browser.");
  }

  const audioContext = new AudioContextClass();
  try {
    const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    return analyzeAudioBuffer(decoded);
  } finally {
    await audioContext.close?.().catch(() => {});
  }
};

export const analyzeAudioFile = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  return analyzeAudioArrayBuffer(arrayBuffer);
};

export const analyzeAudioUrl = async (url) => {
  const response = await fetch(url, { cache: "force-cache" });
  if (!response.ok) {
    throw new Error(`Audio analysis failed with status ${response.status}.`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return analyzeAudioArrayBuffer(arrayBuffer);
};
