import { Capacitor } from '@capacitor/core';

/**
 * Resolves API endpoint URLs dynamically for both Web and Capacitor / Android environments.
 * 
 * 1. If VITE_API_BASE_URL is provided at build or runtime, it takes highest precedence.
 * 2. If running inside native Capacitor / Android WebView and no custom URL is specified,
 *    it defaults to the verified live production Cloud Run backend.
 * 3. In standard Web browser mode, it uses relative '/api/...' paths.
 */

export const DEFAULT_PRODUCTION_BACKEND = 'https://ais-pre-namjaksavbwi5o3ufsnimf-234764102414.europe-west2.run.app';
export const STORAGE_KEY_CUSTOM_API_URL = 'maidama_custom_api_url';

export function getCustomApiBaseUrl(): string {
  try {
    if (typeof localStorage !== 'undefined') {
      return (localStorage.getItem(STORAGE_KEY_CUSTOM_API_URL) || '').trim().replace(/\/$/, '');
    }
  } catch {}
  return '';
}

export function setCustomApiBaseUrl(url: string | null): void {
  try {
    if (typeof localStorage !== 'undefined') {
      if (url && url.trim()) {
        localStorage.setItem(STORAGE_KEY_CUSTOM_API_URL, url.trim().replace(/\/$/, ''));
      } else {
        localStorage.removeItem(STORAGE_KEY_CUSTOM_API_URL);
      }
    }
  } catch {}
}

export function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    if (typeof Capacitor.isNativePlatform === 'function' && Capacitor.isNativePlatform()) {
      return true;
    }
    const platform = typeof Capacitor.getPlatform === 'function' ? Capacitor.getPlatform() : '';
    if (platform === 'android' || platform === 'ios') {
      return true;
    }
  } catch {}

  const cap = (window as any)?.Capacitor;
  if (cap?.isNativePlatform?.() || cap?.getPlatform?.() === 'android' || cap?.getPlatform?.() === 'ios') {
    return true;
  }

  const isCapProtocol = window.location.protocol === 'capacitor:' || window.location.protocol === 'ionic:';
  return isCapProtocol;
}

export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // 1. User-configured custom API URL from settings
  const customUrl = getCustomApiBaseUrl();
  if (customUrl) {
    return `${customUrl}${cleanPath}`;
  }

  // 2. Standard web browser: strictly relative path to same origin to prevent CORS / auth redirects
  if (!isCapacitorNative()) {
    return cleanPath;
  }

  // 3. Native mobile: environment variable takes precedence if provided
  const envBase = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');
  if (envBase) {
    return `${envBase}${cleanPath}`;
  }

  // 4. Native mobile fallback
  return `${DEFAULT_PRODUCTION_BACKEND}${cleanPath}`;
}

/**
 * Safe diagnostic metadata for troubleshooting connectivity on mobile devices without logging secrets.
 */
export function getApiDiagnostics(): {
  isNative: boolean;
  platform: string;
  protocol: string;
  hostname: string;
  hasEnvBaseUrl: boolean;
  effectiveBaseUrl: string;
} {
  const isNative = isCapacitorNative();
  const platform = typeof window !== 'undefined' ? (Capacitor.getPlatform() || 'unknown') : 'server';
  const protocol = typeof window !== 'undefined' ? window.location.protocol : '';
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const customUrl = getCustomApiBaseUrl();
  const envBase = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');
  const effectiveBaseUrl = customUrl || (!isNative ? '(relative)' : (envBase || DEFAULT_PRODUCTION_BACKEND));

  return {
    isNative,
    platform,
    protocol,
    hostname,
    hasEnvBaseUrl: Boolean(envBase),
    effectiveBaseUrl,
  };
}
