import { describe, expect, it } from 'vitest';
import { checkProductionApiUrl } from './build-env';

describe('checkProductionApiUrl (production build guard)', () => {
  it.each([undefined, '', '   '])('refuses a missing value (%p)', (value) => {
    expect(checkProductionApiUrl(value).ok).toBe(false);
  });

  it.each(['api.example.com', '/api', 'ftp://api.example.com'])('refuses a non-absolute or non-http URL (%p)', (value) => {
    expect(checkProductionApiUrl(value).ok).toBe(false);
  });

  it('accepts a real API URL', () => {
    expect(checkProductionApiUrl('https://api.leadforge.example/api')).toEqual({ ok: true, localhost: false });
  });

  it.each(['http://localhost:5000/api', 'http://127.0.0.1:5000/api'])('flags localhost targets (%p)', (value) => {
    expect(checkProductionApiUrl(value)).toEqual({ ok: true, localhost: true });
  });
});
