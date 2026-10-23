/**
 * Resolves API endpoint URLs dynamically for both Web and Capacitor / Android environments.
 * In Web mode, it uses relative paths like '/api/...'.
 * In native Capacitor / Android APK mode, it prepends VITE_API_BASE_URL (if defined).
 */
export function getApiUrl(path: string): string {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return baseUrl ? `${baseUrl}${cleanPath}` : cleanPath;
}
