export const SOURCE_CONFIG = {
  name: 'AnimeLatinoHD',
  baseUrl: 'https://www.animelatinohd.com',
  endpoints: {
    home: '/directorio',
  },
};

export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w300';

// Poster paths arrive as absolute URLs, TMDB paths (/xxx.jpg) or site-relative
// paths; normalize them to a full URL (mirrors the mobile app).
export function posterToUrl(poster: string): string {
  if (!poster) return '';
  if (poster.startsWith('http://') || poster.startsWith('https://')) return poster;
  if (poster.startsWith('/')) return `${TMDB_IMAGE_BASE}${poster}`;
  return `${SOURCE_CONFIG.baseUrl}/${poster}`;
}
