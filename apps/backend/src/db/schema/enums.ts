import { pgEnum } from 'drizzle-orm/pg-core';

export const userStatusEnum = pgEnum('user_status', [
  'active',
  'suspended',
  'deleted',
]);

export const authProviderEnum = pgEnum('auth_provider', [
  'cavos_otp',
  'google',
  'apple',
]);

export const chainEnum = pgEnum('chain', ['stellar']);

export const custodyTypeEnum = pgEnum('custody_type', [
  'cavos_custodial',
  'non_custodial',
]);

export const walletStatusEnum = pgEnum('wallet_status', [
  'pending',
  'needs_device_approval',
  'ready',
  'disabled',
]);

export const networkEnum = pgEnum('network', ['testnet', 'mainnet']);

export const devicePlatformEnum = pgEnum('device_platform', ['ios', 'android']);
