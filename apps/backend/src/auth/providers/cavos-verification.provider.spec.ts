import { CavosAuth } from '@cavos/kit';
import { ConfigService } from '@nestjs/config';
import { CavosVerificationProvider } from './cavos-verification.provider';

jest.mock('@cavos/kit', () => ({ CavosAuth: jest.fn() }));

describe('CavosVerificationProvider.handleOAuthCallback', () => {
  const handleCallback = jest.fn(async () => ({
    userId: 'cavos-sub',
    email: 'a@example.com',
  }));

  beforeEach(() => {
    handleCallback.mockClear();
    (CavosAuth as unknown as jest.Mock).mockImplementation(() => ({
      handleCallback,
    }));
  });

  const provider = () =>
    new CavosVerificationProvider({
      get: jest.fn(() => 'app-id'),
    } as unknown as ConfigService);

  it('passes the callback URL minus the auth code as the v2 exchange redirect URI', async () => {
    const identity = await provider().handleOAuthCallback(
      'google',
      ' gekomobile://auth-callback?cavos_auth_code=abc ',
    );

    expect(handleCallback).toHaveBeenCalledWith(
      'gekomobile://auth-callback?cavos_auth_code=abc',
      'gekomobile://auth-callback',
    );
    expect(identity.providerSubject).toBe('cavos-sub');
  });

  it('passes no redirect URI for a raw auth_data payload', async () => {
    await provider().handleOAuthCallback('apple', '{"jwt":"x.y.z"}');

    expect(handleCallback).toHaveBeenCalledWith('{"jwt":"x.y.z"}', undefined);
  });
});
