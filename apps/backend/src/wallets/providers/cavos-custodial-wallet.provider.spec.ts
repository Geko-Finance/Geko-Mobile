import { CavosStellar } from '@cavos/kit';
import { ConfigService } from '@nestjs/config';
import type { WalletSecretsService } from '../secrets/wallet-secrets.service';
import type { WalletRecord, WalletsRepository } from '../wallets.repository';
import { CavosCustodialWalletProvider } from './cavos-custodial-wallet.provider';

jest.mock('fake-indexeddb/auto', () => ({}));
jest.mock('@cavos/kit', () => ({
  CavosStellar: { connect: jest.fn() },
  LocalDeviceUnwrapKey: { generate: jest.fn(() => ({})) },
  generateRecoveryCode: jest.fn(() => 'fresh-code'),
}));

const connect = CavosStellar.connect as jest.Mock;

function fakeStellarWallet(status: string) {
  const calls: string[] = [];
  const wallet = {
    address: 'GADDRESS',
    status,
    calls,
    setupRecovery: jest.fn(async () => {
      calls.push('setupRecovery');
    }),
    _createAccount: jest.fn(async function (this: { status: string }) {
      calls.push('_createAccount');
      this.status = 'ready';
    }),
  };
  return wallet;
}

function buildProvider() {
  const config = {
    get: jest.fn(
      (name: string) =>
        ({
          CAVOS_APP_ID: 'app-id',
          CAVOS_APP_SALT: 'salt',
          CAVOS_NETWORK: 'testnet',
        })[name],
    ),
  } as unknown as ConfigService;
  const secrets = {
    getRecoveryCode: jest.fn(async () => null),
    saveRecoveryCode: jest.fn(async () => undefined),
  };
  const repository = { updateCustodialRecoverySetAt: jest.fn() };
  const provider = new CavosCustodialWalletProvider(
    config,
    secrets as unknown as WalletSecretsService,
    repository as unknown as WalletsRepository,
  );
  return { provider, secrets };
}

describe('CavosCustodialWalletProvider', () => {
  beforeEach(() => connect.mockReset());

  it('connects with the Cavos stellar-* network name and a Geko-backed registry', async () => {
    connect.mockResolvedValue(fakeStellarWallet('undeployed'));
    const { provider } = buildProvider();

    const provisioned = await provider.provisionWallet({
      custodyType: 'cavos_custodial',
      userId: 'user-1',
    });

    const opts = connect.mock.calls[0][0];
    expect(opts).toMatchObject({
      appId: 'app-id',
      appSalt: 'salt',
      identity: { userId: 'user-1' },
      network: 'stellar-testnet',
    });
    // No wallets row yet: the registry lets the SDK claim its derived address.
    await expect(opts.registry.lookup('user-1')).resolves.toBeNull();
    expect(provisioned).toMatchObject({
      publicAddress: 'GADDRESS',
      status: 'ready',
      providerDetails: { network: 'testnet' },
    });
  });

  it('creates the account on-chain with the recovery signer before storing the code', async () => {
    const stellar = fakeStellarWallet('undeployed');
    connect.mockResolvedValue(stellar);
    const { provider, secrets } = buildProvider();
    secrets.saveRecoveryCode.mockImplementation(async () => {
      stellar.calls.push('saveRecoveryCode');
    });

    const result = await provider.finalizeProvisioning({
      id: 'wallet-1',
      userId: 'user-1',
      publicAddress: 'GADDRESS',
    } as WalletRecord);

    expect(stellar.calls).toEqual([
      'setupRecovery',
      '_createAccount',
      'saveRecoveryCode',
    ]);
    expect(result).toEqual({ revealOnce: { recoveryCode: 'fresh-code' } });
    // Existing row: the registry answers with the stored address.
    await expect(
      connect.mock.calls[0][0].registry.lookup('user-1'),
    ).resolves.toEqual({ address: 'GADDRESS' });
  });
});
