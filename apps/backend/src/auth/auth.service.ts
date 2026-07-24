import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';
import {
  AuthSessionResult,
  OAuthProvider,
  SessionMeta,
} from './auth.types';
import { OAuthCallbackDto } from './dto/oauth-callback.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import {
  AuthIdentitiesRepository,
  type AuthProvider,
} from './repositories/auth-identities.repository';
import { SessionsRepository } from './repositories/sessions.repository';
import {
  CavosVerificationProvider,
  type VerifiedIdentity,
} from './providers/cavos-verification.provider';
import { UserRecord, UsersRepository } from '../users/users.repository';

type FindOrCreateUserOptions = {
  markEmailVerified?: boolean;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly cavosVerificationProvider: CavosVerificationProvider,
    private readonly usersRepository: UsersRepository,
    private readonly authIdentitiesRepository: AuthIdentitiesRepository,
    private readonly sessionsRepository: SessionsRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async sendOtp(dto: SendOtpDto): Promise<{ ok: true }> {
    await this.cavosVerificationProvider.sendOtp(dto.email);
    return { ok: true };
  }

  async verifyOtp(
    dto: VerifyOtpDto,
    meta?: SessionMeta,
  ): Promise<AuthSessionResult> {
    const verified = await this.cavosVerificationProvider.verifyOtp(
      dto.email,
      dto.code,
    );
    const user = await this.findOrCreateUserFromIdentity(
      'cavos_otp',
      verified,
      { markEmailVerified: true },
    );

    const session = await this.issueSession(user.id, meta);

    this.eventEmitter.emit('auth.new_device_login', {
      userId: user.id,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return session;
  }

  async getOAuthUrl(
    provider: OAuthProvider,
    redirectUri: string,
  ): Promise<{ url: string }> {
    const url = await this.cavosVerificationProvider.getOAuthUrl(
      provider,
      redirectUri,
    );

    return { url };
  }

  async handleOAuthCallback(
    provider: OAuthProvider,
    dto: OAuthCallbackDto,
    meta?: SessionMeta,
  ): Promise<AuthSessionResult> {
    const verified = await this.cavosVerificationProvider.handleOAuthCallback(
      provider,
      dto.authData,
    );
    const user = await this.findOrCreateUserFromIdentity(provider, verified, {
      markEmailVerified: true,
    });

    const session = await this.issueSession(user.id, meta);

    this.eventEmitter.emit('auth.new_device_login', {
      userId: user.id,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return session;
  }

  async refresh(
    refreshToken: string,
    meta?: SessionMeta,
  ): Promise<AuthSessionResult> {
    let payload: { sub: string };

    try {
      payload = await this.jwtService.verifyAsync<{ sub: string }>(
        refreshToken,
        {
          secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        },
      );
    } catch {
      throw new UnauthorizedException();
    }

    const hash = this.hashRefreshToken(refreshToken);
    const session = await this.sessionsRepository.findByRefreshTokenHash(hash);

    if (
      !session ||
      session.revokedAt !== null ||
      session.expiresAt < new Date()
    ) {
      await this.sessionsRepository.revokeAllForUser(payload.sub);
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    await this.sessionsRepository.revoke(session.id);

    return this.issueSession(session.userId, meta);
  }

  async logout(userId: string, refreshToken: string): Promise<{ ok: true }> {
    const hash = this.hashRefreshToken(refreshToken);
    const session = await this.sessionsRepository.findByRefreshTokenHash(hash);

    if (
      session &&
      session.userId === userId &&
      session.revokedAt === null &&
      session.expiresAt >= new Date()
    ) {
      await this.sessionsRepository.revoke(session.id);
    }

    return { ok: true };
  }

  private async findOrCreateUserFromIdentity(
    provider: AuthProvider,
    verified: VerifiedIdentity,
    opts: FindOrCreateUserOptions = {},
  ): Promise<UserRecord> {
    const existingIdentity =
      await this.authIdentitiesRepository.findByProviderSubject(
        provider,
        verified.providerSubject,
      );

    if (existingIdentity) {
      const user = await this.usersRepository.findById(existingIdentity.userId);

      if (!user) {
        throw new InternalServerErrorException('Linked user not found');
      }

      return user;
    }

    let user: UserRecord | null = null;

    if (verified.email) {
      user = await this.usersRepository.findByEmail(verified.email);
    }

    if (!user) {
      if (!verified.email) {
        throw new UnauthorizedException('Verified identity missing email');
      }

      user = await this.usersRepository.create({
        email: verified.email,
        emailVerifiedAt: opts.markEmailVerified ? new Date() : undefined,
        displayName: verified.name,
      });
    }

    await this.authIdentitiesRepository.create({
      userId: user.id,
      provider,
      providerSubject: verified.providerSubject,
    });

    return user;
  }

  private async issueSession(
    userId: string,
    meta?: SessionMeta,
  ): Promise<AuthSessionResult> {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new InternalServerErrorException('User not found');
    }

    const accessTtl =
      this.configService.get<string>('JWT_ACCESS_TTL') ?? '15m';
    const refreshTtl =
      this.configService.get<string>('JWT_REFRESH_TTL') ?? '30d';

    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email },
      {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: accessTtl,
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshTtl,
      },
    );

    const decoded = this.jwtService.decode(refreshToken) as { exp: number };
    const expiresAt = new Date(decoded.exp * 1000);

    await this.sessionsRepository.create({
      userId: user.id,
      refreshTokenHash: this.hashRefreshToken(refreshToken),
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
    };
  }

  private hashRefreshToken(refreshToken: string): string {
    return createHash('sha256').update(refreshToken).digest('hex');
  }
}
