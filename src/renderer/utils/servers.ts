import type { VideoServer } from '../../types';

// The source names its reliable servers 'Delta...'. Kept in a single place so
// the server modal and the player pick from the same pool.
const PREFERRED_SERVER_MARKERS = ['delta'];

export function isPreferredServer(server: VideoServer): boolean {
  return PREFERRED_SERVER_MARKERS.some((marker) =>
    server.title.toLowerCase().includes(marker),
  );
}

export function pickPreferredServer(
  servers: VideoServer[],
  language?: string,
): VideoServer | null {
  if (servers.length === 0) return null;
  const preferred = servers.filter(isPreferredServer);
  const pool = preferred.length > 0 ? preferred : servers;
  if (language) {
    const byLang = pool.filter(
      (sv) => sv.language.toLowerCase() === language.toLowerCase(),
    );
    if (byLang.length > 0) return byLang[0];
  }
  return pool[0];
}
