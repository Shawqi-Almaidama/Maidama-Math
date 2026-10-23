/**
 * Resolves API endpoint URLs dynamically for both Web and Capacitor / Android environments.
 * 
 * 1. If VITE_API_BASE_URL is provided at build or runtime, it takes highest precedence.
 * 2. If running inside native Capacitor / Android WebView and no custom URL is specified,
 *    it defaults to the verified live production Cloud Run backend.
 * 3. In standard Web browser mode, it uses relative '/api/...' paths.
 */

export const DEFAULT_PRODUCTION_BACKEND = 'https://ais-pre-namjaksavbwi5o3ufsnimf-234764102414.europe-west2.run.app';

export function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as any)?.Capacitor;
  const isCapNative = Boolean(cap?.isNativePlatform?.() || cap?.getPlatform?.() === 'android');
  const isCapProtocol = window.location.protocol === 'capacitor:' || window.location.protocol === 'ionic:';
  return isCapNative || isCapProtocol;
}

export function getApiUrl(path: string): string {
  const envBase = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  if (envBase) {
    return `${envBase}${cleanPath}`;
  }

  // If running inside Android WebView, default to the verified production backend
  if (isCapacitorNative()) {
    return `${DEFAULT_PRODUCTION_BACKEND}${cleanPath}`;
  }

  // Standard web browser environment: relative path
  return cleanPath;
}
