/**
 * Build-time check of NEXT_PUBLIC_API_URL. Next.js inlines NEXT_PUBLIC_* values into the client
 * bundle at BUILD time, so a production build without it would silently call the code's
 * development fallback (http://localhost:5000/api) from every user's browser.
 */
export interface ApiUrlCheck {
  ok: boolean;
  error?: string;
  /** True for localhost/loopback targets: fine for local builds, wrong for a deployed image. */
  localhost?: boolean;
}

export function checkProductionApiUrl(value: string | undefined): ApiUrlCheck {
  const raw = (value ?? '').trim();
  if (!raw) {
    return { ok: false, error: 'NEXT_PUBLIC_API_URL must be set for a production build (e.g. https://api.example.com/api).' };
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, error: 'NEXT_PUBLIC_API_URL must be an absolute http(s) URL.' };
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { ok: false, error: 'NEXT_PUBLIC_API_URL must be an absolute http(s) URL.' };
  }
  const localhost = ['localhost', '127.0.0.1', '[::1]', '0.0.0.0'].includes(url.hostname);
  return { ok: true, localhost };
}
