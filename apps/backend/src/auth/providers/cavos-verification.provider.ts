import './cavos-node-polyfill';

import { CavosAuth } from '@cavos/kit';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuthProvider } from '../auth.types';

export type VerifiedIdentity = {
  providerSubject: string;
  email?: string;
  name?: string;
};

@Injectable()
export class CavosVerificationProvider {
  private readonly cavosAuth: CavosAuth;

  constructor(private readonly configService: ConfigService) {
    const appId = this.configService.get<string>('CAVOS_APP_ID');

    if (!appId || appId.trim().length === 0) {
      throw new Error('Fatal: CAVOS_APP_ID is required.');
    }

    this.cavosAuth = new CavosAuth({ appId });
  }

  async sendOtp(email: string): Promise<void> {
    await this.cavosAuth.sendOtp(email.trim());
  }

  async verifyOtp(email: string, code: string): Promise<VerifiedIdentity> {
    const identity = await this.cavosAuth.verifyOtp(email.trim(), code.trim());

    return {
      providerSubject: identity.userId,
      email: identity.email,
      name: identity.name,
    };
  }

  async getOAuthUrl(
    provider: OAuthProvider,
    redirectUri: string,
  ): Promise<string> {
    if (provider === 'google') {
      return this.cavosAuth.getGoogleOAuthUrl(redirectUri);
    }

    return this.cavosAuth.getAppleOAuthUrl(redirectUri);
  }

  async handleOAuthCallback(
    _provider: OAuthProvider,
    authData: string,
  ): Promise<VerifiedIdentity> {
    const callback = authData.trim();
    const identity = await this.cavosAuth.handleCallback(
      callback,
      callbackRedirectUri(callback),
    );

    return {
      providerSubject: identity.userId,
      email: identity.email,
      name: identity.name,
    };
  }
}

const CALLBACK_RESULT_PARAMS = ['cavos_auth_code', 'auth_data', 'zk_auth_data'];

/**
 * Cavos's v2 OAuth returns a one-time `cavos_auth_code` that CavosAuth exchanges
 * together with the redirect URI it was issued for. In a browser the SDK reads that
 * from `window.location`; here the mobile app posts the full callback URL instead,
 * so the redirect URI is that URL minus the result params. Returns undefined for
 * non-URL input (a legacy `auth_data` payload needs no redirect URI).
 */
function callbackRedirectUri(callback: string): string | undefined {
  if (!callback.includes('://')) {
    return undefined;
  }

  try {
    const url = new URL(callback);
    for (const param of CALLBACK_RESULT_PARAMS) {
      url.searchParams.delete(param);
    }
    return url.toString();
  } catch {
    return undefined;
  }
}
