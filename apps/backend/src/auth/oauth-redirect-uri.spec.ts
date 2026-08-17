import {
  isAllowedRedirectUri,
  parseAllowedRedirectPrefixes,
} from './oauth-redirect-uri';

describe('parseAllowedRedirectPrefixes', () => {
  it('falls back to the app scheme when unset', () => {
    expect(parseAllowedRedirectPrefixes(undefined)).toEqual(['gekomobile://']);
  });

  it('falls back to the app scheme when the value is blank', () => {
    expect(parseAllowedRedirectPrefixes('   ,  ,')).toEqual(['gekomobile://']);
  });

  it('splits and trims a configured list', () => {
    expect(
      parseAllowedRedirectPrefixes('gekomobile://, exp://192.168.1.20:8081'),
    ).toEqual(['gekomobile://', 'exp://192.168.1.20:8081']);
  });
});

describe('isAllowedRedirectUri', () => {
  const allowed = ['gekomobile://', 'exp://192.168.1.20:8081'];

  it('accepts the app scheme', () => {
    expect(
      isAllowedRedirectUri('gekomobile://auth-callback', allowed),
    ).toBe(true);
  });

  it('accepts a configured dev-client URL', () => {
    expect(
      isAllowedRedirectUri(
        'exp://192.168.1.20:8081/--/auth-callback',
        allowed,
      ),
    ).toBe(true);
  });

  it('rejects an attacker-controlled host', () => {
    expect(isAllowedRedirectUri('https://evil.example/cb', allowed)).toBe(false);
  });

  it('rejects a look-alike scheme', () => {
    expect(
      isAllowedRedirectUri('gekomobile.evil://auth-callback', allowed),
    ).toBe(false);
  });

  it('rejects an empty or whitespace-only value', () => {
    expect(isAllowedRedirectUri('', allowed)).toBe(false);
    expect(isAllowedRedirectUri('   ', allowed)).toBe(false);
  });
});
