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
    const identity = await this.cavosAuth.handleCallback(authData.trim());

    return {
      providerSubject: identity.userId,
      email: identity.email,
      name: identity.name,
    };
  }
}
