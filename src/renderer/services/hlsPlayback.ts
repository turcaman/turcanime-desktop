/* eslint-disable import/no-named-as-default, import/no-named-as-default-member --
 * hls.js runtime also ships named exports that clash with the default-import
 * class and its statics; the shipped .d.ts only declares the default export. */
import Hls, { ErrorTypes, Events } from 'hls.js';
import type {
  Loader,
  LoaderCallbacks,
  LoaderConfiguration,
  LoaderContext,
  LoaderStats,
} from 'hls.js';
import { logger } from '../utils/logger';
import type { AppError } from '../../types';

export function isHlsUrl(url: string): boolean {
  return /\.m3u8(\?|#|$)/i.test(url);
}

interface ProxyBufferResult {
  ok: boolean;
  status: number;
  data: ArrayBuffer | null;
  error?: string;
}

// Routes every HLS request (playlists, segments, AES keys) through the main
// process via net.fetch, which bypasses CORS and can attach the session UA and
// a Referer so CDNs that validate headers accept the requests. The renderer
// cannot send those headers directly (no cross-origin credentials for media).
class HlsProxyLoader implements Loader<LoaderContext> {
  context: LoaderContext | null = null;
  stats: LoaderStats = {
    aborted: false,
    loaded: 0,
    retry: 0,
    total: 0,
    chunkCount: 0,
    bwEstimate: 0,
    loading: { start: 0, first: 0, end: 0 },
    parsing: { start: 0, end: 0 },
    buffering: { start: 0, first: 0, end: 0 },
  };

  private aborted = false;
  private inFlight: Promise<ProxyBufferResult> | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  destroy(): void {
    this.aborted = true;
    this.inFlight = null;
    this.clearTimeout();
  }

  abort(): void {
    this.aborted = true;
    this.inFlight = null;
    this.clearTimeout();
  }

  private clearTimeout(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  load(context: LoaderContext, config: LoaderConfiguration, callbacks: LoaderCallbacks<LoaderContext>): void {
    this.context = context;
    this.aborted = false;
    const started = performance.now();
    this.stats.loading = { start: started, first: 0, end: 0 };

    // hls.js delegates timeout enforcement to the loader; without one a
    // stalled request (main net.fetch has no timeout) would leave the player
    // buffering forever and the retry machinery would never fire.
    const timeoutMs = config.loadPolicy?.maxLoadTimeMs ?? config.timeout ?? 20000;
    this.timeoutId = setTimeout(() => {
      if (this.aborted) return;
      this.inFlight = null;
      this.stats.loading.end = performance.now();
      logger.warn('HlsPlayback', `timeout after ${timeoutMs}ms: ${context.url.slice(0, 60)}`);
      callbacks.onTimeout(this.stats, context, undefined);
    }, timeoutMs);

    // hls.js initializes rangeStart/rangeEnd to 0 for every request; only
    // byte-range requests (EXT-X-BYTERANGE) carry a real end offset. The
    // native XhrLoader only sends a Range header when context.rangeEnd is
    // truthy -- mirror that, otherwise every fragment would get Range: 0-0.
    const rangeEnd = context.rangeEnd ?? 0;
    const rangeStart = context.rangeStart ?? 0;
    this.inFlight = window.electronAPI.proxyBuffer(
      context.url,
      rangeEnd > 0 ? rangeStart : null,
      rangeEnd > 0 ? rangeEnd : null,
    );

    this.inFlight
      .then((res) => {
        if (this.aborted || this.inFlight === null) return;
        this.clearTimeout();
        const loaded = res.data?.byteLength ?? 0;
        this.stats.loaded = loaded;
        this.stats.total = loaded;
        this.stats.chunkCount = 1;
        this.stats.loading.end = performance.now();

        if (!res.ok || !res.data) {
          callbacks.onError(
            { code: res.status || 0, text: res.error ?? `HTTP ${res.status}` },
            context,
            undefined,
            this.stats,
          );
          return;
        }

        const data = res.data;
        callbacks.onProgress?.(this.stats, context, data, undefined);
        if (context.responseType === 'arraybuffer') {
          callbacks.onSuccess({ url: context.url, data }, this.stats, context, undefined);
        } else {
          callbacks.onSuccess(
            { url: context.url, data: new TextDecoder('utf-8').decode(data) },
            this.stats,
            context,
            undefined,
          );
        }
      })
      .catch((err: unknown) => {
        if (this.aborted) return;
        this.clearTimeout();
        this.stats.loading.end = performance.now();
        const text = err instanceof Error ? err.message : String(err);
        logger.warn('HlsPlayback', `proxyBuffer failed: ${context.url.slice(0, 60)}: ${text}`);
        callbacks.onError({ code: 0, text }, context, undefined, this.stats);
      });
  }
}

// Attaches hls.js to the video for an m3u8 stream. Returns the instance (or
// null when unsupported) so the caller can destroy it on cleanup. Fatal
// errors are mapped to the app error surface via onFatal; MEDIA_ERROR is
// recovered in place.
export function attachHls(
  video: HTMLVideoElement,
  url: string,
  onFatal: (error: AppError) => void,
): Hls | null {
  if (!Hls.isSupported()) {
    logger.warn('HlsPlayback', 'HLS not supported by this Chromium build');
    onFatal({ type: 'SERVER_ERROR', message: 'Este equipo no soporta la reproducción HLS.' });
    return null;
  }

  const hls = new Hls({
    loader: HlsProxyLoader,
    enableWorker: false,
    backBufferLength: 90,
  });

  hls.on(Events.ERROR, (_event, data) => {
    if (!data.fatal) return;
    if (data.type === ErrorTypes.MEDIA_ERROR) {
      logger.info('HlsPlayback', `recovering media error: ${data.details}`);
      hls.recoverMediaError();
      return;
    }
    logger.warn('HlsPlayback', `fatal ${data.type}: ${data.details}`);
    hls.destroy();
    onFatal({
      type: data.type === ErrorTypes.NETWORK_ERROR ? 'NETWORK_ERROR' : 'SERVER_ERROR',
      message: data.type === ErrorTypes.NETWORK_ERROR
        ? 'No se pudo cargar el stream.'
        : 'Ocurrió un error al reproducir el stream.',
    });
  });

  hls.loadSource(url);
  hls.attachMedia(video);
  return hls;
}
