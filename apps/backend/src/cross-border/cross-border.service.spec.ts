import type { EventEmitter2 } from '@nestjs/event-emitter';
import { CrossBorderService } from './cross-border.service';
import type { CrossBorderRepository } from './cross-border.repository';
import type { AbroadFinanceProvider } from './providers/abroad-finance.provider';
import { CrossBorderOwnershipException } from './exceptions/cross-border-ownership.exception';
import { CrossBorderTransactionNotFoundException } from './exceptions/cross-border-transaction-not-found.exception';

const baseRow = {
  id: 'row-1',
  userId: 'user-1',
  walletId: null,
  abroadTransactionId: 'abroad-tx-1',
  quoteId: 'quote-1',
  transactionReference: 'ref-1',
  status: 'AWAITING_PAYMENT' as const,
  network: 'STELLAR' as const,
  paymentMethod: 'BREB' as const,
  targetCurrency: 'COP' as const,
  accountNumber: '3001234567',
  bankCode: null,
  taxId: null,
  kycLink: null,
  onChainTxHash: null,
  refundOnChainId: null,
  lastWebhookPayload: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const makeService = (overrides?: {
  provider?: Partial<AbroadFinanceProvider>;
  repository?: Partial<CrossBorderRepository>;
}) => {
  const provider = {
    getTransaction: jest.fn(),
    ...overrides?.provider,
  } as unknown as AbroadFinanceProvider;

  const repository = {
    findById: jest.fn(),
    updateFromLiveRefresh: jest.fn(),
    upsertFromWebhook: jest.fn(),
    ...overrides?.repository,
  } as unknown as CrossBorderRepository;

  const eventEmitter = { emit: jest.fn() } as unknown as EventEmitter2;

  const service = new CrossBorderService(provider, repository, eventEmitter);

  return { service, provider, repository, eventEmitter };
};

describe('CrossBorderService.getTransaction', () => {
  it('throws CrossBorderTransactionNotFoundException when the row does not exist', async () => {
    const { service, repository } = makeService();
    (repository.findById as jest.Mock).mockResolvedValue(null);

    await expect(service.getTransaction('user-1', 'row-1')).rejects.toBeInstanceOf(
      CrossBorderTransactionNotFoundException,
    );
  });

  it('throws CrossBorderOwnershipException when the row belongs to another user', async () => {
    const { service, repository } = makeService();
    (repository.findById as jest.Mock).mockResolvedValue(baseRow);

    await expect(service.getTransaction('someone-else', 'row-1')).rejects.toBeInstanceOf(
      CrossBorderOwnershipException,
    );
  });

  it('returns live-refreshed data on a successful upstream call', async () => {
    const { service, repository, provider } = makeService();
    (repository.findById as jest.Mock).mockResolvedValue(baseRow);
    (provider.getTransaction as jest.Mock).mockResolvedValue({
      id: 'abroad-tx-1',
      status: 'PROCESSING_PAYMENT',
      transactionReference: 'ref-1',
      onChainTxHash: 'hash-1',
      kycLink: null,
      userId: 'user-1',
    });

    const result = await service.getTransaction('user-1', 'row-1');

    expect(result.status).toBe('PROCESSING_PAYMENT');
    expect(repository.updateFromLiveRefresh).toHaveBeenCalledWith('row-1', {
      status: 'PROCESSING_PAYMENT',
      onChainTxHash: 'hash-1',
      kycLink: null,
    });
  });

  it('falls back to the last-known local row when the live refresh fails', async () => {
    const { service, repository, provider } = makeService();
    (repository.findById as jest.Mock).mockResolvedValue(baseRow);
    (provider.getTransaction as jest.Mock).mockRejectedValue(new Error('upstream down'));

    const result = await service.getTransaction('user-1', 'row-1');

    expect(result.status).toBe('AWAITING_PAYMENT');
    expect(repository.updateFromLiveRefresh).not.toHaveBeenCalled();
  });
});

describe('CrossBorderService.handleWebhookEvent', () => {
  it('emits cross_border.tx.status_changed on a genuine status transition', async () => {
    const { service, repository, eventEmitter } = makeService();
    (repository.upsertFromWebhook as jest.Mock).mockResolvedValue({
      previous: { ...baseRow, status: 'AWAITING_PAYMENT' },
      current: { ...baseRow, status: 'PROCESSING_PAYMENT' },
    });

    await service.handleWebhookEvent({
      event: 'transaction.updated',
      data: { id: 'abroad-tx-1', status: 'PROCESSING_PAYMENT' },
    });

    expect(eventEmitter.emit).toHaveBeenCalledWith('cross_border.tx.status_changed', {
      userId: baseRow.userId,
      crossBorderTransactionId: baseRow.id,
      abroadTransactionId: baseRow.abroadTransactionId,
      status: 'PROCESSING_PAYMENT',
    });
  });

  it('does not emit when the status did not actually change (duplicate delivery)', async () => {
    const { service, repository, eventEmitter } = makeService();
    (repository.upsertFromWebhook as jest.Mock).mockResolvedValue({
      previous: { ...baseRow, status: 'AWAITING_PAYMENT' },
      current: { ...baseRow, status: 'AWAITING_PAYMENT' },
    });

    await service.handleWebhookEvent({
      event: 'transaction.created',
      data: { id: 'abroad-tx-1', status: 'AWAITING_PAYMENT' },
    });

    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('lets a repository throw (e.g. row not found yet) propagate, so Abroad retries delivery', async () => {
    const { service, repository } = makeService();
    (repository.upsertFromWebhook as jest.Mock).mockRejectedValue(
      new Error('No local cross_border_transactions row yet'),
    );

    await expect(
      service.handleWebhookEvent({
        event: 'transaction.created',
        data: { id: 'unknown-tx', status: 'AWAITING_PAYMENT' },
      }),
    ).rejects.toThrow('No local cross_border_transactions row yet');
  });
});
