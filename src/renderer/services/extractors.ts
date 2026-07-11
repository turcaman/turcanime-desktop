import { logger } from '../utils/logger';

interface PlaybackData {
  version: string;
  keys: string[];
  iv: string;
  payload: string;
}

interface VideoSource {
  file: string;
  label?: string;
  type?: string;
}

interface DecryptedData {
  source: VideoSource[];
  source_bk?: VideoSource[];
  tracks?: unknown;
}

interface HlsStream {
  resolution: string;
  uri: string;
}

interface ByseResult {
  url: string;
  headers?: Record<string, string>;
}

function selectIndexes(version: string): number[] {
  const v = parseInt(version, 10);
  if (v >= 2) return [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30];
  return [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31];
}

function selectKeyParts(version: string): [number, number] {
  const v = parseInt(version, 10);
  if (v >= 2) return [0, 32];
  return [32, 64];
}

function b64url(input: string): Uint8Array {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function decrypt(
  payload: string,
  keys: string[],
  iv: string,
  version: string,
): Promise<DecryptedData> {
  let keyString = keys.join('');
  const [start, end] = selectKeyParts(version);
  keyString = keyString.slice(start, end);

  const indexes = selectIndexes(version);
  const keyBytes = new Uint8Array(indexes.length);
  for (let i = 0; i < indexes.length; i++) {
    keyBytes[i] = keyString.charCodeAt(indexes[i]) || 0;
  }

  const ivBytes = b64url(iv);
  const payloadBytes = b64url(payload);

  try {
    const { gcm } = await import('@noble/ciphers/aes.js');
    const aes = gcm(keyBytes, ivBytes);
    const decrypted = aes.decrypt(payloadBytes);
    const text = new TextDecoder().decode(decrypted);
    return JSON.parse(text);
  } catch (err) {
    logger.error('Extractors', 'Decryption failed', err);
    throw err;
  }
}

function parseMaster(m3u8: string): HlsStream[] {
  const streams: HlsStream[] = [];
  const lines = m3u8.split('\n');
  let currentRes = '';
  for (const line of lines) {
    if (line.startsWith('#EXT-X-STREAM-INF:')) {
      const resMatch = line.match(/RESOLUTION=(\d+x\d+)/);
      currentRes = resMatch ? resMatch[1] : '';
    } else if (line.trim() && !line.startsWith('#')) {
      streams.push({ resolution: currentRes, uri: line.trim() });
      currentRes = '';
    }
  }
  return streams;
}

function bestStream(streams: HlsStream[], quality: string): HlsStream | null {
  if (streams.length === 0) return null;
  if (quality === 'default' || quality === 'auto') {
    const sorted = [...streams].sort((a, b) => {
      const aRes = parseInt(a.resolution.split('x')[1] || '0', 10);
      const bRes = parseInt(b.resolution.split('x')[1] || '0', 10);
      return bRes - aRes;
    });
    return sorted[0];
  }
  return streams.find((s) => s.resolution.includes(quality)) ?? streams[0];
}

export async function extractBest(iframeUrl: string): Promise<ByseResult> {
  const apiUrl = iframeUrl.replace('/e/', '/api/');
  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch playback data: ${response.status}`);
  }

  const data: PlaybackData = await response.json();

  const decrypted = await decrypt(data.payload, data.keys, data.iv, data.version);
  const sources = decrypted.source ?? decrypted.source_bk ?? [];

  if (sources.length === 0) {
    throw new Error('No video sources found');
  }

  const selected = sources[0];
  const m3u8Res = await fetch(selected.file);

  if (!m3u8Res.ok) {
    return { url: selected.file };
  }

  const m3u8 = await m3u8Res.text();
  const streams = parseMaster(m3u8);
  const best = bestStream(streams, 'auto');

  if (!best) {
    return { url: selected.file };
  }

  const baseUrl = selected.file.substring(0, selected.file.lastIndexOf('/') + 1);
  const headers: Record<string, string> = {
    Referer: 'https://www.animelatinohd.com/',
    Origin: 'https://www.animelatinohd.com',
  };

  return {
    url: best.uri.startsWith('http') ? best.uri : `${baseUrl}${best.uri}`,
    headers,
  };
}
