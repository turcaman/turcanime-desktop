import { SOURCE_CONFIG } from '../config/source';
import { sessionManager } from './session';
import { HtmlParser, ParserUtils, cleanTitle } from './parsers';
import { extractBest } from './extractors';
import { logger } from '../utils/logger';
import type { Anime, AnimeDetail, AutocompleteAnime, HomeData, VideoServer } from '../../types';

const RETRY_DELAY = 1_000;
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w300';

function posterToUrl(poster: string): string {
  if (!poster) return '';
  if (poster.startsWith('http://') || poster.startsWith('https://')) return poster;
  if (poster.startsWith('/')) return `${TMDB_IMAGE_BASE}${poster}`;
  return `${SOURCE_CONFIG.baseUrl}/${poster}`;
}

async function fetchWithSession(
  url: string,
  options?: Record<string, unknown>,
  retryCount = 0,
): Promise<{ ok: boolean; status: number; data: string }> {
  const hasCookies = await sessionManager.waitForCookies();
  if (!hasCookies) {
    throw { type: 'AUTH_ERROR', message: 'No se pudo obtener sesión después de esperar' };
  }

  const fullUrl = url.startsWith('http') ? url : `${SOURCE_CONFIG.baseUrl}${url}`;
  const res = await window.electronAPI.fetch(fullUrl, options);

  if (!res.ok && !res.data) {
    throw { type: 'NETWORK_ERROR', message: res.error ?? 'Network request failed' };
  }

  if (res.status === 401 || res.status === 403) {
    throw { type: 'AUTH_ERROR', message: `HTTP ${res.status}` };
  }

  if (!res.ok && retryCount < 1) {
    await new Promise((r) => setTimeout(r, RETRY_DELAY));
    return fetchWithSession(url, options, retryCount + 1);
  }

  if (!res.data) {
    throw { type: 'SERVER_ERROR', message: `HTTP ${res.status}` };
  }

  return { ok: res.ok, status: res.status, data: res.data };
}

export const source = {
  async getHomeData(): Promise<HomeData> {
    const res = await fetchWithSession(SOURCE_CONFIG.endpoints.home);
    const html = res.data;
    const parser = new HtmlParser();
    const recent = parser.parseCards(html);
    logger.info('Source', `getHomeData: parsed ${recent.length} cards from ${html.length} bytes`);
    return { recent };
  },

  async search(query: string): Promise<Anime[]> {
    const res = await fetchWithSession(
      `/api/anime/search?q=${encodeURIComponent(query)}`,
    );
    const json: Record<string, unknown> = JSON.parse(res.data);
    const items = (json.data as Record<string, unknown>[]) ?? [];
    return items.map((item) => ({
      title: (item.name as string) ?? '',
      image: posterToUrl(item.poster as string),
      url: (item.slug as string) ?? '',
      status: '',
    }));
  },

  async getSuggestions(query: string): Promise<AutocompleteAnime[]> {
    const res = await fetchWithSession(
      `/api/anime/search?q=${encodeURIComponent(query)}`,
    );
    const json: Record<string, unknown> = JSON.parse(res.data);
    const items = (json.data as Record<string, unknown>[]) ?? [];
    return items.map((item) => ({
      id: String(item.id ?? ''),
      name: (item.name as string) ?? '',
      poster: posterToUrl(item.poster as string),
      slug: (item.slug as string) ?? '',
      type: (item.type as string) ?? 'anime',
    }));
  },

  async getDetails(slug: string, options?: Record<string, unknown>): Promise<AnimeDetail> {
    const res = await fetchWithSession(`/anime/${slug}`, options);
    const html = res.data;
    const parser = new HtmlParser();

    const meta = parser.extractMetaTags(html);
    const title = cleanTitle(ParserUtils.sanitizeTitle(parser.extractTitleFromHtml(html) || meta.title));
    const image = meta.image || '';
    const status = parser.extractStatusFromHtml(html);
    const synopsis = parser.extractSynopsisFromDom(html) || parser.extractSynopsisFromJsonLd(html) || '';
    const genres = parser.extractGenresFromJsonLd(html);
    const poster = parser.extractPosterFromRsc(html) || '';
    const episodes = parser.parseEpisodes(html, slug);

    let banner = meta.image || poster || '';
    let relations = null;

    const scriptsResult = parser.parseAllFromScripts(html);
    if (scriptsResult.poster) banner = scriptsResult.poster;
    relations = scriptsResult.relations;

    return {
      title,
      image,
      url: slug,
      status,
      synopsis,
      banner,
      poster,
      genres,
      episodes,
      relations,
    };
  },

  async getEpisodeServers(slug: string, number: number): Promise<VideoServer[]> {
    const res = await fetchWithSession(`/ver/${slug}/${number}`);
    const html = res.data;
    const parser = new HtmlParser();
    return parser.parseEpisodeServers(html);
  },

  async resolveStreamUrl(videoUrl: string): Promise<{ url: string; headers?: Record<string, string> }> {
    await sessionManager.waitForCookies();
    const session = await sessionManager.getSession();
    const ua = session?.userAgent ?? '';
    const cookies = session?.cookies ?? '';

    logger.info('Source', `resolveStreamUrl: fetching bridge ${videoUrl.slice(0, 80)}`);

    const res = await window.electronAPI.bridgeFetch(videoUrl, {
      'Referer': `${SOURCE_CONFIG.baseUrl}/`,
      'User-Agent': ua,
      'Cookie': cookies,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
    });

    logger.info('Source', `resolveStreamUrl: bridge fetch -> status ${res.status}, ok=${res.ok}, dataLen=${res.data?.length ?? 0}`);

    if (!res.ok) {
      logger.error('Source', `resolveStreamUrl: bridge fetch failed: ${res.error ?? 'unknown error'}`);
      throw { type: 'NETWORK_ERROR', message: `Bridge page HTTP ${res.status}` };
    }

    if (!res.data || res.data.length < 10) {
      logger.error('Source', `resolveStreamUrl: bridge response too short: ${res.data?.length ?? 0} bytes`);
      throw { type: 'NETWORK_ERROR', message: 'Bridge page response too short' };
    }

    const html = res.data;
    const m = html.match(/<iframe[^>]*src="([^"]+)"[^>]*>/);
    if (!m) {
      logger.error('Source', `resolveStreamUrl: no iframe found in bridge HTML (first 300 chars: ${html.slice(0, 300)})`);
      throw { type: 'NETWORK_ERROR', message: 'No iframe found in bridge page' };
    }

    const iframeUrl = m[1];
    logger.info('Source', `resolveStreamUrl: iframe URL: ${iframeUrl.slice(0, 100)}`);

    if (iframeUrl.includes('/e/')) {
      logger.info('Source', 'resolveStreamUrl: /e/ detected, calling extractBest');
      const result = await extractBest(iframeUrl, { userAgent: ua });
      if (result) {
        logger.info('Source', `resolveStreamUrl: extractBest OK: ${result.url.slice(0, 80)}`);
        return result;
      }
      logger.warn('Source', 'resolveStreamUrl: extractBest returned null, falling back to iframe URL');
    } else {
      logger.info('Source', 'resolveStreamUrl: no /e/ in iframe, returning iframe URL directly');
    }

    return { url: iframeUrl };
  },
};
