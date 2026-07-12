import type { Anime, AnimeRelations, Episode, VideoServer } from '../../types';
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
    const rawJsonMatch = ParserUtils.extractJson(html, '"episodes":', '[', ']');
    if (rawJsonMatch) {
      try {
        const episodes = JSON.parse(rawJsonMatch);
        return episodes.map((ep: Record<string, unknown>) => ({
          id: String(ep.id ?? ''),
          number: Number(ep.number ?? 0),
          url: String(ep.url ?? ''),
        }));
      } catch {
        // fall through
      }
    }

    const scripts = html.matchAll(/<script[^>]*>(.*?)<\/script>/gs);
    for (const match of scripts) {
      const text = match[1];
      if (!text) continue;
      const unescaped = text.replace(/\\"/g, '"');
      const scriptJsonMatch = ParserUtils.extractJson(unescaped, '"episodes":', '[', ']');
      if (scriptJsonMatch) {
        try {
          const episodes = JSON.parse(scriptJsonMatch);
          return episodes.map((ep: Record<string, unknown>) => ({
            id: String(ep.id ?? ''),
            number: Number(ep.number ?? 0),
            url: String(ep.url ?? ''),
          }));
        } catch {
          continue;
        }
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

  private parseRscPayload(text: string): string {
    const s = text.indexOf('([');
    const e = text.lastIndexOf('])');
    if (s === -1 || e === -1 || e <= s) return '';
    try {
      const slice = text.slice(s + 1, e + 1);
      const a = JSON.parse(slice);
      if (!Array.isArray(a) || typeof a[1] !== 'string') return '';
      return a[1];
    } catch {
      return '';
    }
  }

  extractPosterFromRsc(html: string): string {
    const scripts = html.matchAll(/<script[^>]*>(.*?)<\/script>/gs);
    for (const match of scripts) {
      const text = match[1];
      if (!text || !text.includes('self.__next_f.push')) continue;

      const posterMatch = text.match(/"poster"\s*:\s*"([^"]+)"/);
      if (posterMatch) {
        const path = posterMatch[1];
        if (path.startsWith('http')) return path;
        if (path.startsWith('/')) return 'https://image.tmdb.org/t/p/w300' + path;
      }
      const tmdbPattern = 'https://image.tmdb.org/t/p/w300/';
      const idx = text.indexOf(tmdbPattern);
      if (idx !== -1) {
        const end = text.indexOf('"', idx + tmdbPattern.length);
        if (end !== -1) return text.slice(idx, end);
      }
    }
    return '';
  }

  private resolveRscReference(html: string, refId: string): string | null {
    try {
      const hexPattern = new RegExp('"' + refId + ':T\\w+,((?:[^"\\\\]|\\\\.)*)"(?:,|$)', '');
      const hexMatch = html.match(hexPattern);
      if (hexMatch) return this.unescapeRscValue(hexMatch[1]);

      const refPattern = new RegExp('"' + refId + '":\\s*T\\d+,"((?:[^"\\\\]|\\\\.)*)"', '');
      const refMatch = html.match(refPattern);
      if (refMatch) return this.unescapeRscValue(refMatch[1]);
    } catch {
      // ignore
    }
    return null;
  }

  private unescapeRscValue(raw: string): string {
    return raw.replace(/\\\\/g, '\\').replace(/\\"/g, '"').replace(/\\n/g, '\n');
  }

  extractSynopsisFromRsc(rsc: string, fullHtml: string): string | null {
    const ovMatch = rsc.match(/page_overview__[^"]*"\s*,\s*"children"\s*:\s*"((?:\\.|[^"\\])*)"/);
    if (ovMatch) {
      const val = ovMatch[1];
      if (val.startsWith('$')) {
        const rid = val.slice(1);
        const resolved = this.resolveRscReference(fullHtml, rid);
        if (resolved != null && resolved.length > 20) return resolved;
      } else {
        try {
          const parsed = JSON.parse('"' + val + '"');
          if (typeof parsed === 'string' && parsed.length > 20) return parsed;
        } catch {
          if (val.length > 20) return val;
        }
      }
    }

    const tMatch = rsc.match(/^\d+:T(?:\w+,)?([\s\S]+)$/);
    if (tMatch) {
      const candidate = tMatch[1];
      if (candidate.length > 30 && !candidate.startsWith('Ver ')) {
        return candidate;
      }
    }
    return null;
  }

  parseAllFromScripts(html: string): { poster: string; synopsis: string | null; relations: AnimeRelations | null } {
    let poster = '';
    let relations: AnimeRelations | null = null;
    let relationsLocked = false;

    const scripts = html.matchAll(/<script[^>]*>(.*?)<\/script>/gs);
    for (const match of scripts) {
      const text = match[1];
      if (!text || !text.includes('self.__next_f.push')) continue;

      if (!poster) {
        const posterMatch = text.match(/"poster"\s*:\s*"([^"]+)"/);
        if (posterMatch) {
          const path = posterMatch[1];
          if (path.startsWith('http')) poster = path;
          else if (path.startsWith('/')) poster = 'https://image.tmdb.org/t/p/w300' + path;
        }
        if (!poster) {
          const tmdbPattern = 'https://image.tmdb.org/t/p/w300/';
          const idx = text.indexOf(tmdbPattern);
          if (idx !== -1) {
            const end = text.indexOf('"', idx + tmdbPattern.length);
            if (end !== -1) poster = text.slice(idx, end);
          }
        }
      }

      const p = this.parseRscPayload(text);
      if (!relationsLocked && p) {
        const result = this.extractRelations(p);
        if (result != null) { relations = result; relationsLocked = true; }
      }
    }

    return { poster, synopsis: null, relations };
  }

  extractRelations(rsc: string): AnimeRelations | null {
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
      const parsed = JSON.parse(raw) as AnimeRelations;
      const normalize = (item: { poster: string }) => {
        if (item.poster && !item.poster.startsWith('http')) {
          item.poster = 'https://image.tmdb.org/t/p/w300' + item.poster;
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
