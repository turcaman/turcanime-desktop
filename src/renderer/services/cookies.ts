export function unwrapCookies(rawCookies: string): string {
  try {
    const parsed = JSON.parse(rawCookies);
    if (typeof parsed.raw === 'string') {
      return parsed.raw;
    }
  } catch {
    // not JSON, return as-is
  }
  return rawCookies;
}

export function mergeCookies(
  existing: string,
  setCookieHeaders: string[],
): string {
  const cookieMap = new Map<string, string>();

  existing.split(';').forEach((cookie) => {
    const trimmed = cookie.trim();
    if (!trimmed) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) return;
    const name = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    cookieMap.set(name, value);
  });

  setCookieHeaders.forEach((header) => {
    const eqIdx = header.indexOf('=');
    if (eqIdx === -1) return;
    const name = header.slice(0, eqIdx).trim();
    const semiIdx = header.indexOf(';');
    const value =
      semiIdx === -1
        ? header.slice(eqIdx + 1).trim()
        : header.slice(eqIdx + 1, semiIdx).trim();
    cookieMap.set(name, value);
  });

  return Array.from(cookieMap.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}
