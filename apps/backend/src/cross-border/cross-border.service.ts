import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AbroadFinanceProvider } from './providers/abroad-finance.provider';
import {
  CrossBorderRepository,
  type CrossBorderTransactionRecord,
} from './cross-border.repository';
import { AbroadWebhookPayloadDto } from './dto/abroad-webhook-payload.dto';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { CreateReverseQuoteDto } from './dto/create-reverse-quote.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto';
import { CrossBorderOwnershipException } from './exceptions/cross-border-ownership.exception';
import { CrossBorderTransactionNotFoundException } from './exceptions/cross-border-transaction-not-found.exception';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

/** `payload.data`'s shape is Abroad's own and only loosely validated (see the DTO) - extract defensively. */
function extractWebhookFields(payload: AbroadWebhookPayloadDto): {
  id: string;
  status: string;
  onChainId: string | null;
  refundOnChainId: string | null;
} {
  const { id, status, onChainId, refundOnChainId } = payload.data;

  if (typeof id !== 'string' || typeof status !== 'string') {
    throw new BadRequestException('Webhook payload is missing data.id or data.status');
  }

  return {
    id,
    status,
    onChainId: typeof onChainId === 'string' ? onChainId : null,
    refundOnChainId: typeof refundOnChainId === 'string' ? refundOnChainId : null,
  };
}

@Injectable()
export class CrossBorderService {
  private readonly logger = new Logger(CrossBorderService.name);

  constructor(
    private readonly abroadFinanceProvider: AbroadFinanceProvider,
    private readonly crossBorderRepository: CrossBorderRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getQuote(dto: CreateQuoteDto) {
    return this.abroadFinanceProvider.createQuote(dto);
  }

  async getReverseQuote(dto: CreateReverseQuoteDto) {
    return this.abroadFinanceProvider.createReverseQuote(dto);
  }

  async createTransaction(userId: string, dto: CreateTransactionDto) {
    const abroadTransaction = await this.abroadFinanceProvider.createTransaction({
      quoteId: dto.quoteId,
      userId,
      accountNumber: dto.accountNumber,
      bankCode: dto.bankCode,
      taxId: dto.taxId,
      redirectUrl: dto.redirectUrl,
      qrCode: dto.qrCode,
    });

    const row = await this.crossBorderRepository.create({
      userId,
      abroadTransactionId: abroadTransaction.id,
      quoteId: dto.quoteId,
      transactionReference: abroadTransaction.transactionReference,
      network: dto.network,
      paymentMethod: dto.paymentMethod,
      targetCurrency: dto.targetCurrency,
      accountNumber: dto.accountNumber,
      bankCode: dto.bankCode,
      taxId: dto.taxId,
      kycLink: abroadTransaction.kycLink,
    });

    return {
      id: row.id,
      transactionReference: row.transactionReference,
      kycLink: row.kycLink,
    };
  }

  /**
   * Loads the local row first (ownership-checked), then best-effort live-refreshes from
   * Abroad - on any failure (provider disabled, Abroad down, timeout) silently falls back to
   * the last-known local row rather than throwing, since the webhook pipeline is already the
   * primary sync path and a live-refresh failure shouldn't break a status read the DB can
   * already answer.
   */
  async getTransaction(userId: string, id: string) {
    const row = await this.requireOwnedTransaction(userId, id);

    try {
      const live = await this.abroadFinanceProvider.getTransaction(row.abroadTransactionId);

      await this.crossBorderRepository.updateFromLiveRefresh(row.id, {
        status: live.status as CrossBorderTransactionRecord['status'],
        onChainTxHash: live.onChainTxHash,
        kycLink: live.kycLink,
      });

      return this.toResponse({
        ...row,
        status: live.status as CrossBorderTransactionRecord['status'],
        onChainTxHash: live.onChainTxHash,
        kycLink: live.kycLink,
      });
    } catch (error) {
      this.logger.warn(
        `Live refresh failed for cross-border transaction ${row.id}, serving last-known state: ${String(error)}`,
      );
      return this.toResponse(row);
    }
  }

  /** Reads local DB only - never calls Abroad live, so history stays available even if Abroad/the API key is unavailable. */
  async listTransactions(userId: string, query: ListTransactionsQueryDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;

    const { transactions, total } = await this.crossBorderRepository.listForUser(userId, {
      page,
      pageSize,
    });

    return {
      page,
      pageSize,
      total,
      transactions: transactions.map((row) => this.toResponse(row)),
    };
  }

  async listBanks(paymentMethod: 'BREB' | 'PIX') {
    return this.abroadFinanceProvider.listBanks(paymentMethod);
  }

  async getLiquidity(paymentMethod: 'BREB' | 'PIX') {
    return this.abroadFinanceProvider.getLiquidity(paymentMethod);
  }

  /**
   * `transaction.created` may fire more than once for the same id per Abroad's own docs, and
   * `upsertFromWebhook` throws if no local row exists yet (a rare create-vs-webhook race - see
   * cross-border.repository.ts) - that throw is intentionally NOT caught here, so it surfaces
   * as a 5xx to Abroad's webhook sender, which should retry delivery until our own
   * `createTransaction` call has finished writing its row.
   */
  async handleWebhookEvent(payload: AbroadWebhookPayloadDto): Promise<void> {
    const fields = extractWebhookFields(payload);

    const { previous, current } = await this.crossBorderRepository.upsertFromWebhook({
      abroadTransactionId: fields.id,
      status: fields.status as CrossBorderTransactionRecord['status'],
      onChainTxHash: fields.onChainId,
      refundOnChainId: fields.refundOnChainId,
      lastWebhookPayload: payload,
    });

    const isGenuineTransition = previous.status !== current.status;

    if (!isGenuineTransition) {
      return;
    }

    this.eventEmitter.emit('cross_border.tx.status_changed', {
      userId: current.userId,
      crossBorderTransactionId: current.id,
      abroadTransactionId: current.abroadTransactionId,
      status: current.status,
    });
  }

  private async requireOwnedTransaction(
    userId: string,
    id: string,
  ): Promise<CrossBorderTransactionRecord> {
    const row = await this.crossBorderRepository.findById(id);

    if (row === null) {
      throw new CrossBorderTransactionNotFoundException(id);
    }

    if (row.userId !== userId) {
      throw new CrossBorderOwnershipException(id);
    }

    return row;
  }

  private toResponse(row: CrossBorderTransactionRecord) {
    return {
      id: row.id,
      status: row.status,
      quoteId: row.quoteId,
      transactionReference: row.transactionReference,
      network: row.network,
      paymentMethod: row.paymentMethod,
      targetCurrency: row.targetCurrency,
      accountNumber: row.accountNumber,
      bankCode: row.bankCode,
      kycLink: row.kycLink,
      onChainTxHash: row.onChainTxHash,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
