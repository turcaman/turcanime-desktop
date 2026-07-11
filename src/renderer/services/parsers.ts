import type { Anime, Episode, VideoServer } from '../../types';
import { SOURCE_CONFIG } from '../config/source';

export function cleanTitle(title: string): string {
  return title.replace(/^Ver\s+/i, '').replace(/\s*Sub\s*$/i, '').trim();
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
const EPISODE_HTML_REGEX = /<a[^>]*href="([^"]*)"[^>]*class="[^"]*episode[^"]*"[^>]*>[\s\S]*?(\d+(?:\.\d+)?)[\s\S]*?<\/a>/gi;

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
    const jsonMatch = html.match(EPISODE_JSON_REGEX);
    if (jsonMatch) {
      try {
        const episodes = JSON.parse(jsonMatch[1]);
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
      const url = match[1]?.trim() ?? '';
      const num = parseFloat(match[2]);
      if (!seen.has(num) && !isNaN(num)) {
        seen.add(num);
        episodes.push({ id: `${slug}-${num}`, number: num, url });
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

  parseAllFromScripts(html: string): Record<string, unknown> | null {
    const scriptRegex = /<script[^>]*>[\s\S]*?self\.__next_f\.push\(\[[^,]*,\s*"([\s\S]*?)"\s*\]\)/g;
    let match: RegExpExecArray | null;
    const rscChunks: string[] = [];
    while ((match = scriptRegex.exec(html)) !== null) {
      rscChunks.push(match[1]);
    }
    if (rscChunks.length === 0) return null;
    const combined = rscChunks.join('');
    return this.parseRscPayload(combined);
  }

  parseRscPayload(text: string): Record<string, unknown> | null {
    try {
      const data: Record<string, unknown> = {};
      const lines = text.split('\\n');
      for (const line of lines) {
        if (line.includes('poster') || line.includes('synopsis') || line.includes('genres')) {
          const parts = line.split(':');
          if (parts.length >= 2) {
            const key = parts[0].trim().replace(/^"|"$/g, '');
            const value = parts.slice(1).join(':').trim().replace(/^"|"$/g, '');
            data[key] = value;
          }
        }
      }
      return Object.keys(data).length > 0 ? data : null;
    } catch {
      return null;
    }
  }

  extractPosterFromRsc(html: string): string {
    const parsed = this.parseAllFromScripts(html);
    if (parsed && typeof parsed.poster === 'string') {
      return parsed.poster;
    }
    return '';
  }

  extractRelations(rsc: string): import('../../types').AnimeRelations | null {
    return null; // TODO: port RSC relation extraction from mobile
  }

  parseEpisodeServers(html: string): VideoServer[] {
    const servers: VideoServer[] = [];
    const serverRegex = /<iframe[^>]*src="([^"]*)"[^>]*data-language="([^"]*)"[^>]*>/gi;
    let match: RegExpExecArray | null;
    let id = 0;
    while ((match = serverRegex.exec(html)) !== null) {
      id++;
      servers.push({
        id: String(id),
        title: `Server ${id}`,
        url: match[1],
        language: match[2] || 'sub',
      });
    }
    return servers;
  }
}
