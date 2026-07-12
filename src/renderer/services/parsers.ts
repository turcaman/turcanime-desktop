import type { Anime, Episode, VideoServer } from '../../types';
import { SOURCE_CONFIG } from '../config/source';

export function cleanTitle(title: string): string {
  return title
    .replace(/^Ver\s+/i, '')
    .replace(/\s*Sub\s*$/i, '')
    .replace(/\s*\|\s*Ver\s+Online.*$/i, '')
    .trim();
}

function toAbsoluteUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${SOURCE_CONFIG.baseUrl}/${url.replace(/^\//, '')}`;
}

export class ParserUtils {
  static sanitizeTitle(title: string): string {
    return title.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim();
  }

  static extractJson(text: string, key: string, sChar: string, eChar: string): string {
    const idx = text.indexOf(key);
    if (idx === -1) return '';
    let depth = 0;
    let capture = false;
    let result = '';
    for (let i = idx + key.length; i < text.length; i++) {
      const ch = text[i];
      if (!capture) {
        if (ch === sChar) {
          capture = true;
          result += ch;
          depth++;
        }
        continue;
      }
      if (ch === sChar) depth++;
      if (ch === eChar) depth--;
      result += ch;
      if (depth === 0) break;
    }
    return result;
  }

  static cleanUrl(url: string): string {
    return url.replace(/^\/+|\/+$/g, '');
  }
}

function createAnimeCard(url: string, image: string, title: string): Anime {
  return {
    title: cleanTitle(ParserUtils.sanitizeTitle(title)),
    image: toAbsoluteUrl(image),
    url: ParserUtils.cleanUrl(url),
    status: '',
  };
}

const CARD_LINK_REGEX = /<a[^>]*class="group block"[^>]*href="\/anime\/([^"]+)"[^>]*>[\s\S]*?<img[^>]*(?:src|data-src)="([^"]*)"[\s\S]*?alt="([^"]*)"/g;

const EPISODE_JSON_REGEX = /"episodes":(\[.*?\])/;
const EPISODE_SCRIPT_REGEX = /<script[^>]*>[\s\S]*?window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});/;
const EPISODE_HTML_REGEX = /<a[^>]*href="\/ver\/([^/]+)\/(\d+)"[^>]*>/gi;

export class HtmlParser {
  parseCards(html: string): Anime[] {
    const seen = new Set<string>();
    const cards: Anime[] = [];
    let match: RegExpExecArray | null;
    while ((match = CARD_LINK_REGEX.exec(html)) !== null) {
      const url = match[1];
      if (!url || seen.has(url)) continue;
      seen.add(url);
      cards.push(createAnimeCard(url, match[2], match[3]));
    }
    return cards;
  }

  parseEpisodes(html: string, slug: string): Episode[] {
    const jsonStr = ParserUtils.extractJson(html, '"episodes":', '[', ']');
    if (jsonStr) {
      try {
        const episodes = JSON.parse(jsonStr);
        return episodes.map((ep: Record<string, unknown>) => ({
          id: String(ep.id ?? ''),
          number: Number(ep.number ?? 0),
          url: String(ep.url ?? ''),
        }));
      } catch {
        // fall through
      }
    }

    const scriptMatch = html.match(EPISODE_SCRIPT_REGEX);
    if (scriptMatch) {
      try {
        const state = JSON.parse(scriptMatch[1]);
        const episodes = state.episodes ?? state.props?.episodes ?? [];
        return episodes.map((ep: Record<string, unknown>) => ({
          id: String(ep.id ?? ''),
          number: Number(ep.number ?? 0),
          url: String(ep.url ?? ''),
        }));
      } catch {
        // fall through
      }
    }

    return this.parseEpisodesFromHtml(html, slug);
  }

  parseEpisodesFromHtml(html: string, slug: string): Episode[] {
    const episodes: Episode[] = [];
    let match: RegExpExecArray | null;
    const regex = new RegExp(EPISODE_HTML_REGEX.source, 'gi');
    const seen = new Set<number>();
    while ((match = regex.exec(html)) !== null) {
      const epSlug = match[1]?.trim() ?? '';
      if (epSlug !== slug) continue;
      const num = parseFloat(match[2]);
      if (!seen.has(num) && !isNaN(num)) {
        seen.add(num);
        episodes.push({ id: `${slug}-${num}`, number: num, url: `/ver/${epSlug}/${num}` });
      }
    }
    return episodes.sort((a, b) => a.number - b.number);
  }

  extractMetaTags(html: string): { title: string; image: string; description: string } {
    const titleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"[^>]*\/?>/i);
    const imageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"[^>]*\/?>/i);
    const descMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"[^>]*\/?>/i);
    return {
      title: titleMatch?.[1] ?? '',
      image: imageMatch?.[1] ?? '',
      description: descMatch?.[1] ?? '',
    };
  }

  extractTitleFromHtml(html: string): string {
    const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    return match ? ParserUtils.sanitizeTitle(match[1]) : '';
  }

  extractStatusFromHtml(html: string): string {
    const match = html.match(/<span[^>]*class="[^"]*(?:status|state)[^"]*"[^>]*>([^<]*)<\/span>/i);
    return match ? match[1].trim() : '';
  }

  extractSynopsisFromDom(html: string): string {
    const match = html.match(/<div[^>]*class="[^"]*page_overview__[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if (match) {
      return ParserUtils.sanitizeTitle(match[1].replace(/<br\s*\/?>/gi, '\n'));
    }
    return '';
  }

  extractSynopsisFromJsonLd(html: string): string {
    const match = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
    if (match) {
      try {
        const data = JSON.parse(match[1]);
        return data.description ?? '';
      } catch {
        // ignore
      }
    }
    return '';
  }

  extractImageFromJsonLd(html: string): string {
    const match = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
    if (match) {
      try {
        const data = JSON.parse(match[1]);
        return data.image ?? '';
      } catch {
        // ignore
      }
    }
    return '';
  }

  extractGenresFromJsonLd(html: string): string[] {
    const match = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
    if (match) {
      try {
        const data = JSON.parse(match[1]);
        if (Array.isArray(data.genre)) return data.genre;
        if (typeof data.genre === 'string') return [data.genre];
      } catch {
        // ignore
      }
    }
    return [];
  }

  private collectRscText(html: string): string {
    const scriptRegex = /<script[^>]*>[\s\S]*?self\.__next_f\.push\(\[[^,]*,\s*"([\s\S]*?)"\s*\]\)/g;
    let match: RegExpExecArray | null;
    const chunks: string[] = [];
    while ((match = scriptRegex.exec(html)) !== null) {
      chunks.push(match[1]);
    }
    return chunks.join('');
  }

  parseAllFromScripts(html: string): { poster: string; synopsis: string | null; relations: import('../../types').AnimeRelations | null } | null {
    const rscText = this.collectRscText(html);
    if (!rscText) return null;

    const poster = this.extractPosterRaw(rscText);
    const relations = this.extractRelations(rscText);

    return { poster, synopsis: null, relations };
  }

  extractPosterFromRsc(html: string): string {
    return this.extractPosterRaw(this.collectRscText(html));
  }

  private extractPosterRaw(rsc: string): string {
    const posterMatch = rsc.match(/"poster"\s*:\s*"([^"]+)"/);
    if (posterMatch) {
      const path = posterMatch[1];
      if (path.startsWith('http')) return path;
      if (path.startsWith('/')) return `https://image.tmdb.org/t/p/w300${path}`;
    }
    const tmdbPattern = 'https://image.tmdb.org/t/p/w300/';
    const idx = rsc.indexOf(tmdbPattern);
    if (idx !== -1) {
      const end = rsc.indexOf('"', idx + tmdbPattern.length);
      return end !== -1 ? rsc.slice(idx, end) : '';
    }
    return '';
  }

  extractRelations(rsc: string): import('../../types').AnimeRelations | null {
    const key = '"relations":{"prequel":';
    const idx = rsc.indexOf(key);
    if (idx === -1) return null;

    const start = rsc.indexOf('{', idx);
    if (start === -1) return null;

    let depth = 1;
    let end = start + 1;
    while (depth > 0 && end < rsc.length) {
      if (rsc[end] === '{') depth++;
      else if (rsc[end] === '}') depth--;
      end++;
    }

    const raw = rsc.slice(start, end);
    try {
      const parsed = JSON.parse(raw) as import('../../types').AnimeRelations;
      const normalize = (item: { poster: string }) => {
        if (item.poster && !item.poster.startsWith('http')) {
          item.poster = `https://image.tmdb.org/t/p/w300${item.poster}`;
        }
      };
      parsed.prequel.forEach(normalize);
      parsed.sequel.forEach(normalize);
      parsed.related.forEach(normalize);
      return parsed;
    } catch {
      return null;
    }
  }

  parseEpisodeServers(html: string): VideoServer[] {
    const languageMap: Record<string, string> = {
      SUB: 'sub',
      LAT: 'latino',
      ESP: 'castellano',
    };

    const scripts = html.matchAll(/<script[^>]*>(.*?)<\/script>/gs);
    for (const match of scripts) {
      const text = match[1];
      if (!text || !text.includes('self.__next_f.push')) continue;

      const s = text.indexOf('([');
      const e = text.lastIndexOf('])');
      if (s === -1 || e === -1 || e <= s) continue;

      try {
        const slice = text.slice(s + 1, e + 1);
        const arr = JSON.parse(slice);
        if (!Array.isArray(arr) || typeof arr[1] !== 'string') continue;
        const payload = arr[1];
        if (!payload.includes('"players":')) continue;

        const playersJson = ParserUtils.extractJson(payload, '"players":', '[', ']');
        if (!playersJson) continue;

        const players = JSON.parse(playersJson) as Array<{
          id: number;
          server_name: string;
          bridge_url: string;
          language?: string;
        }>;

        if (!Array.isArray(players)) continue;

        const deltaServers = players.filter(
          (p) => p.server_name === 'Delta',
        );
        const targetServers = deltaServers.length > 0 ? deltaServers : players;

        return targetServers.map((p, idx) => ({
          id: String(p.id ?? idx + 1),
          title: p.server_name ?? `Server ${idx + 1}`,
          url: p.bridge_url ?? '',
          language: languageMap[p.language ?? ''] ?? 'sub',
        }));
      } catch {
        continue;
      }
    }

    return [];
  }
}
