import { SOURCE_CONFIG } from '../config/source';
import { sessionManager } from './session';
import { HtmlParser, ParserUtils } from './parsers';
import { extractBest } from './extractors';
import { logger } from '../utils/logger';
import type { Anime, AnimeDetail, AutocompleteAnime, Episode, HomeData, VideoServer } from '../../types';

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
    const title = ParserUtils.sanitizeTitle(meta.title || parser.extractTitleFromHtml(html));
    const image = meta.image || '';
    const status = parser.extractStatusFromHtml(html);
    const synopsis = parser.extractSynopsisFromDom(html) || parser.extractSynopsisFromJsonLd(html) || '';
    const genres = parser.extractGenresFromJsonLd(html);
    const poster = parser.extractPosterFromRsc(html) || '';
    const episodes = parser.parseEpisodes(html, slug);

    let banner = meta.image || '';
    let relations = null;

    const scriptsResult = parser.parseAllFromScripts(html);
    if (scriptsResult) {
      const rsc = scriptsResult;
      const posterStr = typeof rsc.poster === 'string' ? rsc.poster : '';
      if (posterStr) {
        const cleanPoster = ParserUtils.sanitizeTitle(posterStr);
        if (cleanPoster) {
          banner = posterStr;
        }
      }
      relations = parser.extractRelations(JSON.stringify(rsc));
    }

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
    const res = await fetchWithSession(`/anime/${slug}/${number}`);
    const html = res.data;
    const parser = new HtmlParser();
    return parser.parseEpisodeServers(html);
  },

  async resolveStreamUrl(videoUrl: string): Promise<{ url: string; headers?: Record<string, string> }> {
    return extractBest(videoUrl);
  },
};
