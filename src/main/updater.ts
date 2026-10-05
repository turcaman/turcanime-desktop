import { app, net, shell } from 'electron';
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { chmod, copyFile, mkdir, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { logger } from './logger';

const RELEASES_URL = 'https://api.github.com/repos/turcaman/turcanime-desktop/releases/latest';
const CHECK_TIMEOUT_MS = 10_000;
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;
const DOWNLOAD_TIMEOUT_MS = 10 * 60 * 1000;
const STALL_TIMEOUT_MS = 45 * 1000;
const PROGRESS_INTERVAL_MS = 200;

export type InstallMode = 'appimage' | 'installer' | 'browser';

export interface UpdateAsset {
  name: string;
  url: string;
  size: number | null;
}

export interface UpdateProgress {
  receivedBytes: number;
  totalBytes: number | null;
}

export interface CheckResult {
  latest: string | null;
  current: string;
  asset: UpdateAsset | null;
  mode: InstallMode;
  error?: string;
}

interface GithubAsset {
  name?: string;
  browser_download_url?: string;
  size?: number;
}

let lastCheckAt = 0;
let lastAsset: UpdateAsset | null = null;
let activeDownload: AbortController | null = null;
let downloadedPath: string | null = null;

// AppImage self-update is only possible when running from an AppImage; a dev
// or `out/` build has nothing to replace, so it falls back to the browser.
export function installMode(): InstallMode {
  if (process.platform === 'win32') return 'installer';
  if (process.platform === 'linux') return process.env.APPIMAGE ? 'appimage' : 'browser';
  return 'browser';
}

function pickAsset(assets: GithubAsset[]): UpdateAsset | null {
  const match = process.platform === 'win32'
    ? assets.find((a) => /-setup\.exe$/i.test(a.name ?? '')) ?? assets.find((a) => /\.exe$/i.test(a.name ?? ''))
    : assets.find((a) => /\.AppImage$/i.test(a.name ?? ''));
  const url = match?.browser_download_url;
  if (!match?.name || !url?.startsWith('https://')) return null;
  return {
    name: match.name,
    url,
    size: typeof match.size === 'number' ? match.size : null,
  };
}

async function fetchLatestRelease(): Promise<{ tag: string; asset: UpdateAsset | null }> {
  const response = await net.fetch(RELEASES_URL, {
    headers: { Accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Error al consultar GitHub (${response.status})`);
  }
  const data = (await response.json()) as { tag_name?: string; assets?: GithubAsset[] };
  const tag = (data.tag_name ?? '').replace(/^v/, '').trim();
  if (!tag) throw new Error('La release no tiene tag');
  const asset = pickAsset(data.assets ?? []);
  if (asset) lastAsset = asset;
  return { tag, asset };
}

export async function checkForUpdate(force: boolean): Promise<CheckResult> {
  const current = app.getVersion();
  const now = Date.now();
  if (!force && now - lastCheckAt < CHECK_INTERVAL_MS) {
    return { latest: null, current, asset: null, mode: installMode() };
  }
  lastCheckAt = now;
  try {
    const { tag, asset } = await fetchLatestRelease();
    return { latest: tag, current, asset, mode: installMode() };
  } catch (err) {
    return {
      latest: null,
      current,
      asset: null,
      mode: installMode(),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function cancelDownload(): void {
  activeDownload?.abort();
  activeDownload = null;
}

// Removing a half-written or staged file must never mask the real error.
async function removeQuietly(target: string): Promise<void> {
  await unlink(target).catch((): void => undefined);
}


// Streams the asset picked by the last check (never a renderer-provided URL)
// into a temp file, throttling progress events so a 120 MB AppImage doesn't
// flood IPC.
export async function downloadRelease(onProgress: (progress: UpdateProgress) => void): Promise<void> {
  cancelDownload();
  const asset = lastAsset ?? (await fetchLatestRelease()).asset;
  if (!asset) throw new Error('No hay archivo de actualización para esta plataforma.');

  const dir = path.join(app.getPath('temp'), 'turcanime-update');
  await mkdir(dir, { recursive: true });
  const dest = path.join(dir, path.basename(new URL(asset.url).pathname));
  downloadedPath = null;

  const controller = new AbortController();
  activeDownload = controller;
  const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

  try {
    const response = await net.fetch(asset.url, { signal: controller.signal });
    if (!response.ok || !response.body) {
      throw new Error(`No se pudo descargar la actualización (${response.status})`);
    }
    const totalBytes = Number(response.headers.get('content-length')) || null;
    const stream = createWriteStream(dest);
    // The reader API is used instead of async iteration: the body comes from
    // Chromium's network stack, which doesn't guarantee Symbol.asyncIterator.
    const reader = response.body.getReader();
    // Aborting has to interrupt a pending read(): without this the download
    // promise would only settle once the socket times out.
    const onAbort = (): void => {
      void reader.cancel().catch((): void => undefined);
    };
    controller.signal.addEventListener('abort', onAbort);

    let receivedBytes = 0;
    let lastEmitAt = 0;
    let lastChunkAt = Date.now();

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        controller.signal.throwIfAborted();
        if (Date.now() - lastChunkAt > STALL_TIMEOUT_MS) {
          throw new Error('La descarga se detuvo. Revisá tu conexión.');
        }
        lastChunkAt = Date.now();
        receivedBytes += value.byteLength;
        if (!stream.write(value)) {
          await new Promise<void>((resolve) => stream.once('drain', () => resolve()));
        }
        if (Date.now() - lastEmitAt >= PROGRESS_INTERVAL_MS) {
          lastEmitAt = Date.now();
          onProgress({ receivedBytes, totalBytes });
        }
      }
    } finally {
      controller.signal.removeEventListener('abort', onAbort);
      reader.releaseLock();
    }

    await new Promise<void>((resolve, reject) => {
      stream.on('error', reject);
      stream.on('finish', () => resolve());
      stream.end();
    });

    if (totalBytes != null && receivedBytes !== totalBytes) {
      throw new Error('La descarga quedó incompleta.');
    }

    onProgress({ receivedBytes, totalBytes: totalBytes ?? receivedBytes });
    downloadedPath = dest;
    logger.info('Updater', `Downloaded ${asset.name} (${receivedBytes} bytes)`);
  } catch (err) {
    await removeQuietly(dest);
    if (controller.signal.aborted) throw new Error('Descarga cancelada.');
    throw err;
  } finally {
    clearTimeout(timeout);
    activeDownload = null;
  }
}

export async function installRelease(): Promise<{ ok: boolean; error?: string }> {
  if (!downloadedPath) return { ok: false, error: 'No hay ninguna actualización descargada.' };
  const mode = installMode();

  if (mode === 'installer') {
    const error = await shell.openPath(downloadedPath);
    if (error) return { ok: false, error };
    logger.info('Updater', 'Installer launched, quitting app');
    setTimeout(() => app.quit(), 500);
    return { ok: true };
  }

  if (mode !== 'appimage') {
    return { ok: false, error: 'Las actualizaciones automáticas no están disponibles en esta instalación.' };
  }

  // The staged copy has to live next to the running AppImage: rename() is only
  // atomic within the same filesystem, and the running process keeps serving
  // from the old inode after the swap.
  const current = process.env.APPIMAGE;
  if (!current) return { ok: false, error: 'No se encontró la ruta del AppImage.' };
  const staged = path.join(path.dirname(current), `.${path.basename(current)}.new`);
  try {
    await copyFile(downloadedPath, staged);
    await chmod(staged, 0o755);
    await rename(staged, current);
  } catch (err) {
    await removeQuietly(staged);
    logger.error('Updater', 'Failed to replace AppImage', err);
    return { ok: false, error: 'No se pudo reemplazar el AppImage (permisos?).' };
  }

  logger.info('Updater', 'AppImage replaced, relaunching');
  const relaunch = spawn(current, [], { detached: true, stdio: 'ignore' });
  // Without a listener a failed exec (corrupted download, noexec mount) would
  // surface as an unhandled 'error' event and take the app down.
  relaunch.on('error', (err) => logger.error('Updater', 'Relaunch failed', err));
  relaunch.unref();
  setTimeout(() => app.exit(0), 300);
  return { ok: true };
}
