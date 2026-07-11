export type AppErrorType = 'NETWORK_ERROR' | 'NOT_FOUND' | 'SERVER_ERROR' | 'AUTH_ERROR' | 'UNKNOWN';

export interface AppError {
  type: AppErrorType;
  message: string;
}

export interface Anime {
  title: string;
  image: string;
  url: string;
  status: string;
}

export interface AnimeDetail extends Anime {
  synopsis: string;
  banner: string;
  poster: string;
  genres: string[];
  episodes: Episode[];
  relations: AnimeRelations | null;
}

export interface Episode {
  id: string;
  number: number;
  url: string;
}

export interface RelatedAnime {
  id: string;
  name: string;
  poster: string;
  slug: string;
  type: string;
  vote_average: number;
}

export interface AnimeRelations {
  prequel: RelatedAnime[];
  sequel: RelatedAnime[];
  related: RelatedAnime[];
}

export interface AutocompleteAnime {
  id: string;
  name: string;
  poster: string;
  slug: string;
  type: string;
}

export interface EpisodeRange {
  label: string;
  start: number;
  end: number;
}

export interface HomeData {
  recent: Anime[];
  sections?: { title: string; animes: Anime[] }[];
}

export interface VideoServer {
  id: string;
  title: string;
  url: string;
  language: string;
}

export interface StreamUrlResult {
  url: string;
  headers?: Record<string, string>;
}

export interface HistoryItem {
  title: string;
  image: string;
  url: string;
  number: number;
  progress: number;
  duration: number;
  timestamp: number;
}

export interface ISession {
  cookies: string;
  userAgent: string;
}

export interface CacheEntry<T> {
  payload: T;
  expiration: number;
}
